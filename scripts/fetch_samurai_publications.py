#!/usr/bin/env python3
"""
SAMURAI の材料モデリンググループページから業績（論文/書籍/会議録/口頭発表/その他）を
スクレイプして data/publications.json に保存する。GitHub Actions の cron で定期実行される。

日英両方のページを取得して同一JSONに格納する。各エントリは SAMURAI 側の <li> の innerHTML を
サニタイズ（<a> と <span class="open_access"> のみ許可、相対URLは絶対URL化）した形で保存し、
フロント側 (js/publications.js) がそのまま挿入する。
"""

import html
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data"
OUTPUT_PATH = DATA_DIR / "publications.json"

GROUP_ID = "50c1zz0l44"
SAMURAI_BASE = "https://samurai.nims.go.jp"
GROUP_URL_JA = f"{SAMURAI_BASE}/groups/{GROUP_ID}"
GROUP_URL_EN = f"{SAMURAI_BASE}/groups/{GROUP_ID}?locale=en"

USER_AGENT = (
    "MaterialsModelingGroupHomepageBot/1.0 "
    "(+https://www.nims.go.jp/group/materials_modeling/; "
    "contact: DEMURA.Masahiko@nims.go.jp)"
)

SECTION_ORDER = ["article", "book", "proceeding", "presentation", "misc_report"]

JST = timezone(timedelta(hours=9))


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
    return raw.decode("utf-8", errors="replace")


# ── HTML サニタイザ ──────────────────────────────────────────
class LiSanitizer(HTMLParser):
    """<li> の innerHTML を「<a>（絶対URL化, target=_blank）」「<span class='open_access'>」
    のみ残して他タグを除去し、テキストは HTML エスケープした形で出力する。"""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._a_depth = 0  # ネストしたaタグを潰さないためのカウンタ
        self._span_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if tag == "a":
            href = (a.get("href") or "").strip()
            if href.startswith("/"):
                href = SAMURAI_BASE + href
            elif not href:
                return
            self.parts.append(
                f'<a href="{html.escape(href, quote=True)}" '
                'target="_blank" rel="noopener">'
            )
            self._a_depth += 1
        elif tag == "span" and (a.get("class") or "").strip() == "open_access":
            self.parts.append('<span class="open_access">')
            self._span_depth += 1
        # それ以外の開始タグは無視（テキストは通す）

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._a_depth > 0:
            self.parts.append("</a>")
            self._a_depth -= 1
        elif tag == "span" and self._span_depth > 0:
            self.parts.append("</span>")
            self._span_depth -= 1

    def handle_data(self, data: str) -> None:
        # 連続する空白は1つに畳む（見た目のガタツキ防止）が、行頭/末の空白は保持
        self.parts.append(html.escape(data))

    def result(self) -> str:
        # 開いたままのタグを閉じる（安全策）
        while self._a_depth > 0:
            self.parts.append("</a>")
            self._a_depth -= 1
        while self._span_depth > 0:
            self.parts.append("</span>")
            self._span_depth -= 1
        out = "".join(self.parts)
        # 複数連続空白/改行を1スペースに圧縮
        out = re.sub(r"\s+", " ", out).strip()
        return out


def sanitize_li_inner(inner_html: str) -> str:
    parser = LiSanitizer()
    parser.feed(inner_html)
    parser.close()
    return parser.result()


# ── セクション/年/エントリ抽出 ────────────────────────────────
# 「<div class="box"> ... <a name="{id}"> ... <h4 class="subject">{label}</h4> ... </div>」
# を1セクションとして切り出す
BOX_RE = re.compile(
    r'<div class="box">\s*<a name="([^"]+)">\s*<h4 class="subject">([^<]+)</h4>(.*?)</div>',
    re.DOTALL,
)
YEAR_BLOCK_RE = re.compile(
    r'<h5 class="small_subject[^"]*">\s*(\d{4})\s*</h5>\s*'
    r'<ul class="gray_list">(.*?)</ul>',
    re.DOTALL,
)
LI_RE = re.compile(
    r'<li class="glay_list">(.*?)</li>',
    re.DOTALL,
)


def parse_page(html_text: str) -> dict:
    """1ページ分の HTML から {section_id: {label, years: [{year, entries: [html]}]}} を返す。"""
    result: dict = {}
    for m in BOX_RE.finditer(html_text):
        section_id = m.group(1).strip()
        label = m.group(2).strip()
        body = m.group(3)

        years: list[dict] = []
        for ym in YEAR_BLOCK_RE.finditer(body):
            year = ym.group(1)
            ul_body = ym.group(2)
            entries = [sanitize_li_inner(li.group(1)) for li in LI_RE.finditer(ul_body)]
            entries = [e for e in entries if e]
            if entries:
                years.append({"year": year, "entries": entries})

        if years:
            result[section_id] = {"label": label, "years": years}
    return result


def build_output(ja_pages: dict, en_pages: dict) -> dict:
    """JA/EN の各セクションを SECTION_ORDER の順にまとめる。年は降順にソート。"""
    now = datetime.now(JST).isoformat(timespec="seconds")

    def build_lang(data: dict) -> dict:
        sections = []
        for sid in SECTION_ORDER:
            if sid not in data:
                continue
            s = data[sid]
            s["years"].sort(key=lambda x: x["year"], reverse=True)
            sections.append({
                "id": sid,
                "label": s["label"],
                "years": s["years"],
            })
        return {"sections": sections}

    return {
        "source_ja": GROUP_URL_JA,
        "source_en": GROUP_URL_EN,
        "fetched_at": now,
        "ja": build_lang(ja_pages),
        "en": build_lang(en_pages),
    }


def summarize(out: dict) -> None:
    for lang in ("ja", "en"):
        print(f"\n[{lang.upper()}]")
        for s in out[lang]["sections"]:
            total = sum(len(y["entries"]) for y in s["years"])
            years = ", ".join(f"{y['year']}({len(y['entries'])})" for y in s["years"])
            print(f"  {s['id']:12s} {s['label']:20s} total={total:4d}  {years}")


def main() -> int:
    print(f"Fetching JA: {GROUP_URL_JA}")
    ja_html = fetch(GROUP_URL_JA)
    print(f"Fetching EN: {GROUP_URL_EN}")
    en_html = fetch(GROUP_URL_EN)

    ja_pages = parse_page(ja_html)
    en_pages = parse_page(en_html)

    if not ja_pages or not en_pages:
        print("ERROR: sections not found in one of the pages", file=sys.stderr)
        return 1

    output = build_output(ja_pages, en_pages)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    summarize(output)
    print(f"\nWrote {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
