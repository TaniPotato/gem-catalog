## Why

チーム内で作成されたGemが個人の履歴にしか存在せず、チーム全体で発見・共有・評価できる仕組みがない。チームのAI活用レベルを底上げするため、Gemの知識を共有資産化するカタログが必要。

## What Changes

- **新規アプリケーション**: Google Apps Script + HTML Service によるWebアプリを新規構築
- Gem登録機能（名前・説明・URL・タグ・作成者）
- カード形式のGem一覧表示
- キーワード検索・タグ絞り込み・並び替え（新着順/人気順）
- 👍便利ボタン（LocalStorageによる重複防止）
- データ永続化：Google スプレッドシート（Gemsシート）

## Capabilities

### New Capabilities

- `gem-registry`: Gemの登録・保存・取得（スプレッドシートCRUD）
- `gem-discovery`: 一覧表示、キーワード検索、タグ絞り込み、並び替え
- `gem-voting`: 👍便利ボタンによる評価・カウントアップ（LocalStorage重複防止）

### Modified Capabilities

<!-- なし（新規アプリのため既存スペックへの変更なし） -->

## Impact

- 新規ファイル: `Code.gs`（GAS バックエンド）、`index.html`（フロントエンド）
- 依存: Google スプレッドシート（データストア）、ブラウザ LocalStorage（重複投票防止）
- 認証なし・アクセス権限なし（誰でも登録・閲覧・評価可能）
