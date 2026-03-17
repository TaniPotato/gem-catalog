## ADDED Requirements

### Requirement: 👍便利ボタンによる評価
システムはGemカード上に「👍便利！」ボタンを表示しなければならない（SHALL）。
ボタンクリック時にスプレッドシートの該当Gemの👍数を1増加させなければならない（SHALL）。
増加後の👍数をカード上でリアルタイムに反映しなければならない（SHALL）。

#### Scenario: 👍ボタンのクリック
- **WHEN** ユーザーが未投票のGemの「👍便利！」ボタンをクリックする
- **THEN** システムはスプレッドシートの👍数を1増加させ、カード上の表示数を更新する

#### Scenario: 👍処理中の二重クリック防止
- **WHEN** 👍処理が完了する前にユーザーが再度ボタンをクリックする
- **THEN** システムは処理中のリクエストを無視する（ボタンは一時的にdisable）

### Requirement: 👍重複防止（LocalStorage）
システムは同一ブラウザから同一Gemへの重複投票をLocalStorageで防止しなければならない（SHALL）。
投票済みGemのカードには「投票済み」状態を視覚的に示し、ボタンをdisable化しなければならない（SHALL）。
LocalStorageキーは `voted_<gemId>` 形式としなければならない（SHALL）。

#### Scenario: 投票済みGemの表示
- **WHEN** ユーザーが過去に👍したGemのカードを表示する
- **THEN** システムはそのGemの「👍便利！」ボタンをdisable化して投票済み状態を表示する

#### Scenario: 投票後のLocalStorage保存
- **WHEN** ユーザーが👍ボタンをクリックしてサーバー側の更新が成功する
- **THEN** システムはLocalStorageに `voted_<gemId>` キーを保存し、ボタンをdisable化する

#### Scenario: 異なるブラウザからの投票
- **WHEN** ユーザーが別のブラウザやデバイスから同一Gemを開く
- **THEN** システムは投票済み状態を引き継がず、投票可能な状態で表示する（LocalStorageはブラウザローカルのため）

### Requirement: 人気ランキング表示
システムは👍数の累計で人気順に並び替えた際にランキングを正確に反映しなければならない（SHALL）。
👍数はカード上に常時表示しなければならない（SHALL）。

#### Scenario: 👍数のカード表示
- **WHEN** Gemカードが表示される
- **THEN** システムはそのGemの現在の👍数をカード上に表示する
