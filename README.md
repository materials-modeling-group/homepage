# Materials Modeling Group — Homepage

NIMS マテリアル基盤研究センター 材料モデリンググループの公式ホームページ。

🌐 **公開URL**: https://materials-modeling-group.github.io/homepage/

## 概要

グループ紹介、研究内容、メンバー、ニュース、連絡先を掲載する静的サイト。GitHub Pagesでホストされています。

## ディレクトリ構成

```
homepage/
├── index.html / index-en.html          Home（日英）
├── research.html / research-en.html    Research
├── members.html / members-en.html      Members
├── members2.html / members2-en.html    Members（旧メンバー）
├── news.html / news-en.html            News
├── contact.html / contact-en.html      Contact
├── css/style.css                       スタイルシート
├── js/
│   ├── main.js                         共通（ハンバーガーメニュー等）
│   ├── news.js                         Newsページのレンダリング
│   └── contact.js                      Contactページ
├── images/                             ロゴ・メンバー写真
├── data/
│   ├── news.json                       ニュースデータ（News Admin経由で更新）
│   ├── researchers.json                研究者のORCID・SAMURAI ID・researchmap ID
│   └── known_*.json                    自動検出用の追跡データ
├── scripts/                            自動検出スクリプト（参考コピー）
└── .github/workflows/                  GitHub Actions
```

## ニュースの編集

ニュースはAdmin画面から投稿・編集・削除できます：

🔐 **News Admin**: https://materials-modeling-group.github.io/news_admin/admin/

ログインすると投稿一覧を表示でき、年別・カテゴリ別のフィルタで絞り込み可能です。

### Newsエントリのフィールド

| フィールド | 説明 |
|-----------|------|
| 日付 | `YYYY-MM-DD` |
| カテゴリ | お知らせ / プレスリリース / 受賞 / メディア / イベント |
| タイトル（日本語・英語） | 見出し |
| 関連URL | 指定するとタイトルがリンクになる（受賞・プレスリリース等） |
| 論文/講演タイトル | 指定すると本文先頭に太字で表示 |
| DOI | 指定すると論文タイトルがDOIリンクになる |
| 学会名・発表者 | 招待講演用。指定すると本文が自動構成 |
| 本文（日本語・英語） | HTMLリンク可 `<a href="URL" target="_blank">テキスト</a>` |

## 自動Newsシステム

以下の情報は毎週月曜に自動検出され、Adminページ経由でNewsに投稿されます。

| ソース | 内容 | 頻度 |
|-------|------|------|
| [CrossRef API](https://api.crossref.org/) | 論文（ORCID経由） | 毎週月曜 09:00 JST |
| [NIMS SAMURAI](https://samurai.nims.go.jp/) | 招待講演 | 毎週月曜 10:00 JST |
| [KAKEN](https://kaken.nii.ac.jp/) | 科研費採択 | 毎週月曜 11:00 JST |

自動投稿されたエントリもAdmin画面から加筆修正・削除可能です。

## 関連リポジトリ

- **[materials-modeling-group/news_admin](https://github.com/materials-modeling-group/news_admin)** — News管理画面、自動検出スクリプト、Google Apps Script バックエンド

## ローカル編集

HTML/CSS/JSの変更は通常のGitフローで：

```bash
git clone https://github.com/materials-modeling-group/homepage.git
cd homepage
# ファイル編集
git add .
git commit -m "..."
git push
```

`main`ブランチへのpushで自動的にGitHub Pagesが再ビルドされます。

## データフロー

```
┌─────────────────┐      ┌─────────────────┐
│ News Admin      │      │ Automation      │
│ (Web UI)        │      │ (GitHub Actions)│
└────────┬────────┘      └────────┬────────┘
         │                        │
         └────────┬───────────────┘
                  │ POST
                  ▼
         ┌─────────────────┐
         │ Google Apps     │
         │ Script Endpoint │
         └────────┬────────┘
                  │ GitHub API
                  ▼
         ┌─────────────────┐
         │ data/news.json  │ ← このリポジトリ
         └────────┬────────┘
                  │ fetch
                  ▼
         ┌─────────────────┐
         │ news.html       │
         │ (GitHub Pages)  │
         └─────────────────┘
```

## ライセンス

© Materials Modeling Group, NIMS. All rights reserved.
