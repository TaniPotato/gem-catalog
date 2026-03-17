## 1. Googleスプレッドシートのセットアップ（手動）

- [ ] 1.1 新規Googleスプレッドシートを作成し、シート名を「Gems」に変更する
- [ ] 1.2 1行目にヘッダー行を設定する（ID, Gem名, 説明, URL, タグ, 作成者, 登録日, 👍数）
- [ ] 1.3 スプレッドシートのIDをメモしておく（src/server/Code.ts の定数に使用）

## 2. プロジェクト初期セットアップ

- [x] 2.1 package.json を作成する（vite, vite-plugin-singlefile, @google/clasp, typescript, @types/google-apps-script）
- [x] 2.2 vite.config.ts を作成する（vite-plugin-singlefile でindex.htmlを単一ファイルにインライン化、rootDir: src/client, outDir: ../../dist）
- [x] 2.3 tsconfig.json を作成する（クライアント用、Vite との整合性確保）
- [x] 2.4 tsconfig.server.json を作成する（GASサーバー用、target: ES2019, types: google-apps-script, outDir: dist）
- [x] 2.5 appsscript.json を作成する（GASマニフェスト、V8ランタイム、timeZone設定）
- [x] 2.6 .clasp.json を作成する（rootDir: "dist" のテンプレート、scriptId はプレースホルダー）
- [x] 2.7 .gitignore を作成する（node_modules, dist, .clasp.json のscriptId保護）
- [x] 2.8 npm install を実行する

## 3. GASバックエンド実装（src/server/Code.ts）

- [x] 3.1 SHEET_ID 定数とシート取得ヘルパーを定義する
- [x] 3.2 `doGet()` 関数を実装する（HtmlService.createHtmlOutputFromFile('index') でサーブ）
- [x] 3.3 `getGems()` 関数を実装する（Gemsシートの全行をオブジェクト配列で返却、ヘッダー行除外）
- [x] 3.4 ID自動採番ロジックを実装する（`gem_` + ゼロ埋め3桁連番）
- [x] 3.5 `addGem(data)` 関数を実装する（LockServiceでシリアライズ、ID採番、登録日自動設定、👍数=0で追加）
- [x] 3.6 `incrementVote(gemId)` 関数を実装する（LockServiceでシリアライズ、対象行H列を+1して更新後の値を返却）

## 4. フロントエンドHTML（src/client/index.html）

- [x] 4.1 HTMLの基本構造を作成する（ヘッダー・検索・タグ・並び替えエリア・カードグリッド・モーダル）

## 5. フロントエンドCSS（src/client/style.css）

- [x] 5.1 ベーススタイルとCSS変数（カラーパレット）を定義する
- [x] 5.2 ヘッダー・検索・タグ・並び替えエリアのスタイルを実装する
- [x] 5.3 Gemカードのスタイルを実装する（グリッドレイアウト・ホバー効果・投票済みスタイル）
- [x] 5.4 登録モーダルのスタイルを実装する（オーバーレイ・フォーム・バリデーションエラー）
- [x] 5.5 ボタンスタイル・レスポンシブ対応を実装する

## 6. フロントエンドTypeScript（src/client/main.ts）

- [x] 6.1 型定義（Gem インターフェース）とグローバル状態変数を定義する
- [x] 6.2 ページロード時に `google.script.run.getGems()` を呼び出してデータを取得する処理を実装する
- [x] 6.3 Gemカードの描画関数を実装する（Gem名・説明・タグ・登録者・👍数・ボタン・開くリンク）
- [x] 6.4 LocalStorageを確認して投票済みGemの👍ボタンをdisable化する処理を実装する
- [x] 6.5 キーワード検索ボックスのinputイベントハンドラを実装する（リアルタイム絞り込み）
- [x] 6.6 登録済みタグを動的収集してタグ絞り込みボタンを生成する処理を実装する
- [x] 6.7 タグボタンのクリックハンドラを実装する（選択状態の切り替え＋絞り込み）
- [x] 6.8 並び替えボタン（新着順/人気順）のクリックハンドラを実装する
- [x] 6.9 キーワード・タグ・並び替えを組み合わせたフィルタリング＆ソート関数を実装する
- [x] 6.10 「+ 登録」ボタン・「キャンセル」ボタンのクリックハンドラを実装する
- [x] 6.11 フォームのバリデーション処理を実装する（Gem名・URL・作成者が必須）
- [x] 6.12 「登録する」ボタンクリック時に `google.script.run.addGem()` を呼び出す処理を実装する
- [x] 6.13 登録成功後にモーダルを閉じ、一覧を再取得して表示を更新する処理を実装する
- [x] 6.14 「👍便利！」ボタンクリック時に `google.script.run.incrementVote()` を呼び出す処理を実装する
- [x] 6.15 投票処理中はボタンをdisable化し、成功後にLocalStorage保存・表示更新する処理を実装する

## 7. ビルドとデプロイ（手動）

- [x] 7.1 `npm run build` を実行して dist/ を生成する（Vite + tsc + appsscript.jsonコピー）
- [ ] 7.2 `clasp login` を実行してGoogleアカウントを認証する
- [ ] 7.3 `clasp create` または `clasp clone` でGASプロジェクトと紐付ける（.clasp.json の scriptId を設定）
- [ ] 7.4 `clasp push` でdist/の内容をGASにデプロイする
- [ ] 7.5 GASエディタでWebアプリとして公開する（アクセス:全員、実行:自分）
- [ ] 7.6 公開URLで初期表示・Gem登録・検索・👍機能を動作確認する
- [ ] 7.7 公開URLをチームに共有する
