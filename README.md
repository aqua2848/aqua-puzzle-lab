# AQUA Puzzle Lab

ブラウザだけで遊べる小さなパズルゲーム集です。HTML / CSS / JavaScript だけで動きます。

## Games

### Water Sort Puzzle

試験管の色水を移し替えて、1本1色にそろえるパズルです。

- PC / スマホ対応
- 同じ色、または空の試験管にだけ注げるルール
- 連続した同色をまとめて移動
- Undo / Restart
- クリア判定
- 複数レベル

### Cat Doku

猫を盤面に配置するロジックパズルです。

- 各行に猫は1匹
- 各列に猫は1匹
- 各色エリアに猫は1匹
- 猫同士は隣接不可
- 空白 → 🐱 → × の入力切り替え
- ルール違反チェック
- 複数レベル

## Run locally

`index.html` をブラウザで開くだけでも遊べます。

ローカルHTTPサーバーを使う場合:

```bash
python -m http.server 8000
```

その後 `http://localhost:8000` を開いてください。

## GitHub Pages

GitHub Pages を `main` / `/ (root)` から公開すれば、そのまま静的サイトとして遊べます。

公開URL:

`https://aqua2848.github.io/aqua-puzzle-lab/`

## Structure

```text
aqua-puzzle-lab/
├── index.html
├── water-sort.html
├── style.css
├── game.js
├── cat-doku.html
├── cat-doku.css
├── cat-doku.js
└── README.md
```
