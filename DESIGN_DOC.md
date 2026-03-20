# チームGemカタログ — 設計ドキュメント

> このドキュメントはプロジェクトを再現するための完全な技術仕様書です。

---

## 1. 背景・課題

チーム内でGemを作成・活用する動きが始まっているが、各自のGemが個人の履歴・記憶の中にしか存在しない。

| 課題 | 影響 |
|------|------|
| チーム全体でどんなGemが存在するか把握できない | 車輪の再発明が起きる |
| 困ったタスクがあってもGemの存在に気づかない | AI活用機会の損失 |
| 良いGemを作っても他のメンバーに広まらない | チーム全体のレベルが上がらない |

---

## 2. 解決コンセプト

**「チームのGem資産を、発見・共有・評価できるカタログにする」**

個人に閉じていたGemの知識をチームの共有資産に変える。

---

## 3. 技術スタック

| レイヤー | 技術 | 理由 |
|----------|------|------|
| 実行環境 | Google Apps Script (V8ランタイム) | 追加インフラ不要・Googleアカウントで即使える |
| UI配信 | GAS HTML Service (`doGet`) | GAS標準のWebアプリ公開 |
| データ永続化 | Google スプレッドシート | チームで閲覧・管理しやすい |
| フロントエンドビルド | Vite + vite-plugin-singlefile | 全リソースを1つのHTMLにインライン化 |
| フロントエンド言語 | TypeScript | 型安全性 |
| GASコード管理 | clasp | バージョン管理・ローカル開発 |
| ローカル開発 | Vite Dev Server + GASモック | デプロイなしで動作確認 |
| テスト | Vitest | 高速ユニットテスト |
| 重複投票防止 | ブラウザ LocalStorage | `voted_<gemId>` キーで管理 |

---

## 4. ディレクトリ構成

```
gem-catalog/
├── src/
│   ├── client/                  # フロントエンド (Viteでビルド)
│   │   ├── index.html           # エントリーHTML
│   │   ├── main.ts              # アプリロジック全体
│   │   ├── style.css            # デザイントークン + スタイル
│   │   └── mock-gas.ts          # ローカル開発用 google.script.run モック
│   └── server/                  # GASバックエンド (tscでビルド)
│       └── Code.ts              # サーバーサイド関数
├── dist/                        # ビルド成果物 (clasp pushのrootDir)
│   ├── index.html               # Viteビルド済み (全資産インライン)
│   ├── Code.js                  # tsc コンパイル済み
│   └── appsscript.json          # ビルド時にコピー
├── appsscript.json              # GASマニフェスト
├── .clasp.json                  # clasp設定 (rootDir: "dist")
├── package.json
├── vite.config.ts
├── tsconfig.json                # クライアント用
└── tsconfig.server.json         # GASサーバー用
```

---

## 5. データ設計

### スプレッドシート: `Gems` シート

ヘッダー行なし。1行目からデータ行として扱う。

| 列 | 内容 | 型 | 例 |
|----|------|----|----|
| A (1) | ID | 文字列 | `gem_001` |
| B (2) | Gem名 | 文字列 | `議事録作成くん` |
| C (3) | 説明 | 文字列 | `会議メモから議事録を自動整形` |
| D (4) | URL | 文字列 | `https://gemini.google.com/...` |
| E (5) | タグ | カンマ区切り文字列 | `会議,文書作成` |
| F (6) | 作成者 | 文字列 | `田中` |
| G (7) | 登録日 | 日付文字列 | `2026/03/17` |
| H (8) | 👍数 | 数値 | `12` |

**ID採番ルール:** `gem_` + 現在行数+1 をゼロ埋め3桁
例: 登録済み5件 → 次のID = `gem_006`

---

## 6. アーキテクチャ

```
ブラウザ
  │
  │  google.script.run.*()    ←→   GAS関数 (Code.ts)
  │                                      │
  │                                      │  SpreadsheetApp
  │                                      ↓
  │                              Google スプレッドシート
  │
  │  (dev時のみ) mock-gas.ts が
  │  google.script.run を上書きして
  │  localStorage でデータを模倣
```

### フロントエンド↔GAS通信

GAS HTML Service の `google.script.run` 非同期APIを使用。

```typescript
google.script.run
  .withSuccessHandler((result) => { /* 成功処理 */ })
  .withFailureHandler((err) => { /* エラー処理 */ })
  .getGems()  // GAS側の関数名と1対1対応
```

### 競合制御

`addGem` / `updateGem` / `incrementVote` はすべて `LockService.getScriptLock()` で排他制御。

---

## 7. GAS バックエンド API

| 関数 | 引数 | 戻り値 | 説明 |
|------|------|--------|------|
| `doGet()` | なし | HtmlOutput | index.html をサーブ |
| `getGems()` | なし | `Gem[]` | 全件取得 |
| `addGem(data)` | `{name, description, url, tags, author}` | `{success, id}` | 新規登録 |
| `updateGem(gemId, data)` | `string, {name, description, url, tags, author}` | `{success}` | 編集保存 |
| `incrementVote(gemId)` | `string` | `{success, votes}` | 👍カウントアップ |

---

## 8. フロントエンド機能

| 機能 | 実装 |
|------|------|
| Gem一覧表示 | カードグリッド、ページ起動時に `getGems()` |
| キーワード検索 | Gem名・説明をリアルタイム絞り込み (input イベント) |
| タグ絞り込み | 登録済みタグを動的収集してボタン生成 |
| 並び替え | 新着順 (登録日降順) / 人気順 (👍数降順) |
| 新規登録 | モーダルフォーム → `addGem()` |
| 編集 | カードクリック → 既存データ入力済みモーダル → `updateGem()` |
| 👍投票 | `incrementVote()` → LocalStorageに `voted_<id>` 保存 → カウント即時更新 |
| タグ入力UI | Enter/カンマで確定チップ表示、Backspaceで最後のタグ削除 |

---

## 9. UIデザインシステム

Material Design 3 のカラーシステムをベースに Apple的な余白・タイポグラフィを組み合わせた独自トーン。

### カラートークン

```css
--primary:           #5E5CE6;   /* 洗練されたインディゴ */
--primary-container: #EDEDFF;
--bg:                #F5F5F7;   /* Apple のライトグレー */
--surface:           #FFFFFF;
--text:              #1D1D1F;   /* Apple のほぼブラック */
--text-secondary:    #48484A;
--text-tertiary:     #8E8E93;
--error:             #FF3B30;   /* Apple レッド */
--success:           #34C759;   /* Apple グリーン */
```

### タイポグラフィ

フォント: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Hiragino Sans', sans-serif`

### 角丸・余白スケール

```css
--r-sm: 10px;   --r-md: 16px;   --r-lg: 20px;   --r-full: 100px;
--sp-2: 8px;    --sp-4: 16px;   --sp-6: 24px;   --sp-10: 40px;
```

---

## 10. ビルド設定

### Vite (クライアント)

```typescript
// vite.config.ts
export default defineConfig({
  root: 'src/client',
  build: { outDir: '../../dist', emptyOutDir: false },
  plugins: [viteSingleFile()],   // JS・CSSをHTMLにインライン化
})
```

`vite-plugin-singlefile` により、GAS HTML Service が単一ファイルしか扱えない制約を回避。

### TypeScript (GASサーバー)

```json
// tsconfig.server.json
{
  "compilerOptions": {
    "target": "ES2019",
    "lib": ["ES2019"],
    "module": "CommonJS",
    "outDir": "dist",
    "rootDir": "src/server",
    "types": ["google-apps-script"]
  }
}
```

### ビルドコマンド

```bash
npm run build:client  # Vite → dist/index.html
npm run build:server  # tsc  → dist/Code.js
npm run build         # 両方 + appsscript.json コピー
npm run deploy        # build + clasp push
```

---

## 11. clasp 設定

```json
// .clasp.json
{
  "scriptId": "<GASプロジェクトのスクリプトID>",
  "rootDir": "dist"
}
```

`rootDir: "dist"` により、ビルド成果物のみをGASにプッシュする。

### GASマニフェスト

```json
// appsscript.json
{
  "timeZone": "Asia/Tokyo",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

`ANYONE_ANONYMOUS` で認証なし・誰でもアクセス可能。

---

## 12. ローカル開発

```bash
npm run dev   # http://localhost:5173 で起動
```

`import.meta.env.DEV` が `true` のとき `mock-gas.ts` を動的インポートし、`window.google.script.run` を上書き。モックデータは localStorage に永続化。

---

## 13. 再現手順

### 前提

- Node.js 18+
- Google アカウント

### 手順

```bash
# 1. リポジトリクローン
git clone <repo-url>
cd gem-catalog
npm install

# 2. clasp ログイン
npx clasp login

# 3. GASプロジェクト作成（または既存をclone）
npx clasp create --type webapp --title "チームGemカタログ"
# → .clasp.json が生成される

# 4. スプレッドシート作成
#    Google Drive で新規スプレッドシートを作成
#    シート名を「Gems」に変更
#    URLのIDをメモ

# 5. スプレッドシートIDを設定
# src/server/Code.ts の SHEET_ID を書き換える
const SHEET_ID = '<スプレッドシートのID>'

# 6. ローカル動作確認
npm run dev

# 7. ビルド＆デプロイ
npm run deploy

# 8. GAS管理画面でWebアプリとして公開
#    デプロイ → 新しいデプロイ → 種類: ウェブアプリ
#    → URLをチームに共有
```

---

## 14. 非機能要件・設計上の決定

| 項目 | 決定 | 理由 |
|------|------|------|
| 認証 | なし | 気軽に使えることを優先 |
| 重複投票防止 | LocalStorage | 厳密な1人1回より導入コストを優先 |
| データ保存 | スプレッドシート | 管理者が直接データを触れる |
| バックエンドフレームワーク | GAS素のまま | 追加依存ゼロ |
| フロント状態管理 | フレームワークなし (Vanilla TS) | GAS HTML Serviceとの相性・シンプルさ |
| ビルド | Vite + vite-plugin-singlefile | GASの単一ファイル制約への対応 |

---

## 15. 今後の拡張候補

- Gem削除機能
- 自分が👍したGem一覧 (LocalStorage + フィルター)
- Slack通知連携（新規登録時）
- タグマスタ管理
- Gem利用実績コメント機能
