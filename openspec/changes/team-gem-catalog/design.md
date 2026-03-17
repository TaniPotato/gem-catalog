## Context

チームメンバーが作成したGemは各自のGemini/Claude等のツール内にのみ存在し、チーム共有の仕組みがない。
新規Webアプリとして Google Apps Script (GAS) + HTML Service で構築し、データストアに Google スプレッドシートを使用する。
認証不要・ゼロインフラ・既存のGoogleワークスペース資産を活用することが前提制約。

## Goals / Non-Goals

**Goals:**
- GAS doGet() でHTMLをサーブするシングルページアプリ構築
- スプレッドシートをデータベースとして Gem の CRUD（登録・読取）
- フロントエンドからの非同期通信に `google.script.run` を使用
- LocalStorage でブラウザ単位の👍重複防止
- キーワード検索・タグ絞り込み・並び替えはクライアントサイドで処理

**Non-Goals:**
- ユーザー認証・アクセス制御
- Gem の編集・削除機能
- Slack通知連携
- タグマスタ管理
- サーバーサイド検索（パフォーマンスよりシンプルさを優先）

## Decisions

### 1. アーキテクチャ：Vite + clasp（ローカルビルド・型安全構成）

**決定**: Vite でフロントエンドをビルドし、clasp で GAS プロジェクトを管理する。

```
src/
├── client/          ← Vite がビルド (TypeScript + CSS)
│   ├── index.html
│   ├── main.ts
│   └── style.css
└── server/          ← tsc がコンパイル
    └── Code.ts
dist/                ← clasp の rootDir（ここから push）
├── appsscript.json
├── Code.js          ← tsc 出力
└── index.html       ← Vite 出力（全資産インライン）
```

- `vite-plugin-singlefile` ですべての JS/CSS を単一 HTML にインライン化 → GAS HTML Service が1ファイルで配信
- `tsconfig.server.json` で GAS 用に別コンパイル（`@types/google-apps-script`）
- `.clasp.json` で `rootDir: "dist"` を指定
- `npm run build` → `npm run deploy` でデプロイ

**代替案**: GAS Script Editor での直接編集 → バージョン管理・型安全性なしで却下。

### 2. データアクセス：google.script.run（非同期RPC）

**決定**: フロントエンドから `google.script.run.withSuccessHandler().withFailureHandler()` でGAS関数を呼び出す。

**理由**: GAS HTML ServiceではfetchによるREST APIが使えない。google.script.runがGASのネイティブIPC機構。

### 3. データモデル：スプレッドシート（Gemsシート）

| 列 | 内容 | 型 |
|---|---|---|
| A | ID | 文字列（gem_001形式） |
| B | Gem名 | 文字列 |
| C | 説明 | 文字列 |
| D | URL | 文字列 |
| E | タグ | カンマ区切り文字列 |
| F | 作成者 | 文字列 |
| G | 登録日 | 日付文字列（YYYY/MM/DD） |
| H | 👍数 | 数値 |

1行目はヘッダー行。IDは登録時にGAS側で自動採番（`gem_` + ゼロ埋め3桁連番）。

### 4. 👍重複防止：LocalStorage

**決定**: `voted_<gemId>` キーをLocalStorageに保存し、投票済みならボタンをdisable化。

**理由**: 認証なしの前提で完全な重複防止は不要。同一ブラウザからの連打防止で十分。

**代替案**: セッションIDをCookieで管理 → GASではCookieの制御が難しく却下。

### 5. 検索・絞り込み：クライアントサイド処理

**決定**: ページロード時に全件取得し、検索・タグ絞り込み・並び替えはJavaScriptで実施。

**理由**: データ量が小規模（チーム内のGemは数十〜数百件）のためサーバー往復不要。UX向上（即時反応）。

## Risks / Trade-offs

- **スケーラビリティ**: データ量が増えると全件取得が遅くなる → チーム利用規模では問題なし。数百件を超えたらサーバーサイド検索を検討
- **👍の信頼性**: LocalStorageクリアで再投票可能 → 設計上の許容範囲（厳密な1人1回は非要件）
- **GAS実行制限**: 1日あたりの実行クォータ制限あり → チーム内利用規模では問題なし
- **スプレッドシート同時書き込み**: 複数ユーザーが同時登録・👍した場合にレース条件が発生しうる → LockService で書き込みをシリアライズして対処

## Migration Plan

1. Google スプレッドシートを新規作成し「Gems」シートを用意（ヘッダー行設定）
2. GASプロジェクトを新規作成しスクリプトをコピー
3. スプレッドシートIDを `Code.gs` の定数に設定
4. GASをWebアプリとして公開（アクセス: 全員、実行: 自分）
5. 公開URLをチームに共有

ロールバック: スプレッドシートのデータはそのままにGASの公開を停止するだけで即時無効化可能。

## Open Questions

- スプレッドシートのIDはどこで管理するか（`Code.gs` のハードコード vs PropertiesService） → 初期リリースはハードコードで十分、後から移行容易
- タグの表示はどこまで自動収集するか → 登録済みGemのタグを動的に収集して絞り込みボタンを生成する方式を採用
