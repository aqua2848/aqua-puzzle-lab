# Water Sort Puzzle

HTML / CSS / JavaScript だけで動く、シンプルなウォーターソートパズルです。

## Features

- PC / スマホ対応
- 試験管クリックで水を移動
- 同じ色、または空の試験管にだけ注げるルール
- 連続した同色をまとめて移動
- Undo
- Restart
- クリア判定
- 4レベル
- クリア時の紙吹雪アニメーション

## Run locally

`index.html` をブラウザで開くだけで遊べます。

より実運用に近い確認をしたい場合は、任意のローカルHTTPサーバーでも配信できます。

```bash
python -m http.server 8000
```

その後 `http://localhost:8000` を開いてください。

## GitHub Pages

リポジトリを Public にして GitHub Pages を有効化すれば、そのまま静的サイトとして公開できます。

## Structure

```text
water-sort-puzzle/
├── index.html
├── style.css
├── game.js
└── README.md
```
