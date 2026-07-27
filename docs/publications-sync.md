# Publications ページ ― SAMURAI 自動同期の仕組み

`publications.html` / `publications-en.html` に表示している業績データは、NIMS SAMURAI の [材料モデリンググループ ページ](https://samurai.nims.go.jp/groups/50c1zz0l44) から **週次で自動スクレイプ**したものです。

- 🌐 SAMURAI 側: https://samurai.nims.go.jp/groups/50c1zz0l44
- 📄 生成データ: `data/publications.json` （日英両方を格納）
- 🔁 自動更新: **毎週月曜 00:00 JST**（`.github/workflows/fetch-publications.yml`）

---

## なぜ iframe で直接埋め込めないのか

もっとも自然な方法は `<iframe src="https://samurai.nims.go.jp/groups/50c1zz0l44">` で SAMURAI 側を丸ごと埋め込むことですが、**SAMURAI 側のレスポンスヘッダで禁止されている**ため不可能です。

```sh
$ curl -sI https://samurai.nims.go.jp/groups/50c1zz0l44 | grep -iE "x-frame|content-security"
x-frame-options: SAMEORIGIN
content-security-policy: ... frame-ancestors 'none'; ...
```

| ヘッダ | 値 | 意味 |
|-------|-----|-----|
| `X-Frame-Options` | `SAMEORIGIN` | 同一オリジンからしか iframe に入れられない（`www.nims.go.jp` は別オリジン扱い） |
| `Content-Security-Policy: frame-ancestors` | `'none'` | **同一オリジンからさえも iframe 禁止**。X-Frame-Options より優先される |

`frame-ancestors 'none'` は完全禁止指定で、これを上書きする方法はクライアント側にはありません。SAMURAI 側で CSP を変更してもらう以外に iframe 化する手段はありません。

また `Access-Control-Allow-Origin` も設定されていないため、`www.nims.go.jp` 側の JavaScript から `fetch()` で SAMURAI の HTML を取得してクライアントで整形する方法も **CORS で弾かれます**。

## 採用した方式：サーバサイド scrape → JSON → クライアント側描画

上記の制約を回避するため、GitHub Actions のサーバ側で SAMURAI をスクレイプして JSON として保存し、それを `publications.html` の JS が読みに行く構成にしています。

```
┌─────────────────────────────┐
│ NIMS SAMURAI                │
│ groups/50c1zz0l44           │
└──────────────┬──────────────┘
               │ HTTPS GET (週1回)
               ▼
┌─────────────────────────────┐
│ GitHub Actions              │
│ fetch-publications.yml      │
│ + scripts/fetch_samurai_    │
│   publications.py           │
└──────────────┬──────────────┘
               │ commit + push
               ▼
┌─────────────────────────────┐
│ data/publications.json      │  ← このリポジトリ
└──────────────┬──────────────┘
               │ fetch (毎回のページ表示時)
               ▼
┌─────────────────────────────┐
│ publications.html           │
│ + js/publications.js        │
└─────────────────────────────┘
```

## 自動同期の詳細

### 頻度

| 項目 | 設定 |
|-----|-----|
| 実行タイミング | 毎週月曜 00:00 JST |
| cron 表記 | `0 15 * * 0`（日曜 15:00 UTC） |
| 手動実行 | GitHub → Actions → *Fetch SAMURAI publications* → **Run workflow** |
| 実行時間 | 通常 30 秒以内 |

### 実行フロー

`.github/workflows/fetch-publications.yml` が cron で発火し、以下を実行：

1. **`python3 scripts/fetch_samurai_publications.py`**
   - `https://samurai.nims.go.jp/groups/50c1zz0l44` （日本語ページ）を GET
   - `?locale=en` を付けて英語ページも GET
   - 5 セクション（論文 / 書籍 / 会議録 / 口頭発表 / その他の文献）ごとに、
     年ごとの `<li>` エントリを抽出
   - 各 `<li>` の中身は **`<a>` タグと `<span class="open_access">` 以外を除去**した
     サニタイズ済み HTML 断片として保存
     （`<a>` の相対URL `/profiles/...` `/publications/...` は絶対URLに書き換え）
   - `data/publications.json` に日英合わせて出力
2. **差分チェック**: `git diff --quiet data/publications.json`
3. **差分があれば** `git add / commit / push` して "SAMURAIから業績を自動更新" として反映

### 出力 JSON の構造

```json
{
  "source_ja": "https://samurai.nims.go.jp/groups/50c1zz0l44",
  "source_en": "https://samurai.nims.go.jp/groups/50c1zz0l44?locale=en",
  "fetched_at": "2026-07-27T15:17:00+09:00",
  "ja": {
    "sections": [
      {
        "id": "article",
        "label": "論文",
        "years": [
          {
            "year": "2026",
            "entries": [
              "Cheng-Ju Tsai, <a href=\"https://samurai.nims.go.jp/profiles/...\" ...>Hideyuki Murakami</a>, ... <a href=\"https://samurai.nims.go.jp/publications/...\" ...>Entropy-engineered spinel oxide coatings ...</a>. Applied Surface Science Advances. 32 100956-100956-13. 2026. <span class=\"open_access\">Open Access</span>"
            ]
          }
        ]
      }
    ]
  },
  "en": { /* 同じ構造 */ }
}
```

各 `entry` は **`<li>` の中身を丸ごと HTML 断片で保存**しているため、フロント側 `js/publications.js` は各エントリを `<li>` に `innerHTML` で流し込むだけで SAMURAI と同じ体裁になります。

### クライアント側での表示

`js/publications.js` は既存の `js/news.js` と同じく **`raw.githubusercontent.com/main/data/publications.json` を fetch** します。これにより：

- 本番の NIMS サーバに JS ファイルを FTP アップロードした後は、`data/publications.json` の更新は FTP 経由の再アップロード不要（GitHub raw が常に最新を返す）
- GitHub Pages ミラー側は push で即反映

## 手動更新の方法

### GitHub Actions から

1. https://github.com/materials-modeling-group/homepage/actions/workflows/fetch-publications.yml を開く
2. **Run workflow** ボタン → **Run workflow**
3. 数十秒待って完了すれば、`data/publications.json` が最新化される

### ローカルから

```bash
cd homepage
python3 scripts/fetch_samurai_publications.py
git add data/publications.json
git commit -m "SAMURAIから業績を手動更新"
git push
```

依存パッケージ不要（Python 3 標準ライブラリのみ）。

## ファイル一覧

| ファイル | 役割 |
|---------|-----|
| `scripts/fetch_samurai_publications.py` | SAMURAI のスクレイパ本体 |
| `.github/workflows/fetch-publications.yml` | 週次 cron workflow |
| `data/publications.json` | 生成された業績データ（自動更新） |
| `publications.html` / `publications-en.html` | Publications ページ本体 |
| `js/publications.js` | クライアント側の描画スクリプト |
| `css/style.css` | `.pub-*` 系スタイル |

## 障害時の切り分け

| 症状 | 確認先 | 原因の可能性 |
|-----|-------|-------------|
| ページが「業績の読み込みに失敗しました」 | ブラウザの DevTools Network | GitHub raw の一時的不調 / `publications.json` が未 push |
| 業績が更新されていない | Actions タブの *Fetch SAMURAI publications* | cron 失敗（SAMURAI 側の HTML 構造変更等） |
| セクションが空 | ワークフローログ | `parse_page()` の正規表現がマッチしなくなった可能性 → SAMURAI の HTML 構造をチェック |
| 見た目が崩れた | `css/style.css` の `.pub-*` | CSS 変更後は FTP アップロード必須（`data/*.json` は自動同期だが CSS/HTML/JS は手動） |

## 将来 SAMURAI が公式 iframe 埋め込みを許可した場合

SAMURAI 側で以下いずれかの対応がされれば、iframe に切り替え可能：

- `Content-Security-Policy: frame-ancestors https://www.nims.go.jp` に緩和
- または SAMURAI が `?embed=1` のようなクエリで CSP を外した iframe 用ページを提供

その場合はこのスクレイプ経路（このリポジトリの scraper / workflow / JSON / JS）を廃止し、`publications.html` を単なる `<iframe>` に置き換えることを検討してよい。
