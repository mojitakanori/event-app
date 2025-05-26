# イベント管理アプリケーション 仕様書

## 1. 概要
本アプリケーションは、HTML、CSS、JavaScriptのみで構築された静的なWebアプリケーションです。バックエンド処理はSupabaseを利用し、データベース、認証、ストレージ機能を提供します。開催者はイベントを作成・編集・管理でき、一般ユーザーはイベント情報を閲覧し、参加登録を行うことができます。

## 2. 主な機能

### 2.1 イベント一覧表示 (index.html)
- 開催中および開催予定のイベントを一覧表示
- 表示項目：イベント名、画像、主催者名、日時、場所、費用、参加状況
- 開催者による絞り込みフィルター

### 2.2 イベント詳細表示・参加登録 (detail.html)
- イベント詳細表示：名前、メディア、日時、費用、説明など
- 参加者一覧表示・CSVダウンロード
- 参加フォーム入力（氏名＋カスタム項目＋同意）
- 満員時の参加不可表示

### 2.3 開催者向け機能（ログイン必要）

#### 認証
- Supabase Auth によるログイン／ログアウト（メール＋パスワード）

#### プロフィール編集（profile.html）
- コミュニティ名と自己紹介の編集

#### イベント作成（create.html）
- イベント情報入力：名前、日時、費用、場所など
- メディア（画像／動画）最大10枚ずつ
- カスタム入力項目（form_schema）

#### イベント管理（dashboard.html）
- 自身のイベント一覧、編集、削除、参加者確認など

#### イベント編集（edit_event.html）
- イベント情報編集／メディア削除追加／form_schema再設定

## 3. ファイル構成

```
│  create.html
│  dashboard.html
│  detail.html
│  edit_event.html
│  index.html
│  login.html
│  logout.html
│  profile.html
│  README.md
│
├─assets
│      logo.png
│
├─css
│      style.css
│
└─js
        auth.js
        create.js
        dashboard.js
        detail.js
        edit_event.js
        index.js
        login.js
        logout.js
        profile.js
        supabaseClient.js
```

## 4. JavaScript関数とシーケンス概要

各HTMLに対応するJSファイルで処理を担当。共通の `supabaseClient.js` や `auth.js` を通じて、認証やDBアクセスを行います。

### 4.1 認証関連 (auth.js)
- `getCurrentUser()`: Supabaseから現在のユーザー取得
- `redirectToLoginIfNotAuthenticated()`: 未ログインならリダイレクト
- `redirectToDashboardIfAuthenticated()`: ログイン済みならdashboardへ
- `updateNav()`: ナビゲーション切り替え
- `handleLogout()`: サインアウトとUI更新（旧実装）

### 4.2 ホーム画面 (index.js)
- `fetchAndDisplayInitialEvents()`: イベント一覧＋主催者＋参加数取得表示
- `displayEvents(events)`: イベントDOM描画
- `populateOrganizerFilter()`: 主催者フィルター生成

### 4.3 イベント詳細／参加登録 (detail.js)
- `fetchEventDetailsAndParticipants()`: イベント詳細＋参加者取得
- `generateDynamicFormFields()`: カスタムフォーム描画
- `displayParticipants()`: 参加者リスト表示
- `generateAndDownloadCsv()`: CSV生成とDL

### 4.4 イベント作成画面 (create.js)
- `handleFileSelection()`: ファイル選択・プレビュー管理
- `createFormFieldConfigElement()`: 入力項目生成
- `uploadSingleFile()`: Supabase Storageにアップロード
- `createEventForm submit`: バリデーション＋Storage＋DB保存＋リダイレクト

### 4.5 イベント編集画面 (edit_event.js)
- `loadEventData()`: 編集対象イベント読み込み
- `displayCurrentMedia()`: 既存メディア表示／削除UI
- `editEventForm submit`: データ更新処理

### 4.6 ダッシュボード (dashboard.js)
- `fetchMyEvents()`: 自作イベント一覧取得
- `deleteEvent(id)`: イベント削除（ON DELETE CASCADE）
- `addEventListenersToButtons()`: 各ボタンにイベント追加

### 4.7 プロフィール編集 (profile.js)
- `loadProfile()`: 自身のプロフィール取得と表示
- `profileForm submit`: 編集データ保存（upsert）

### 4.8 ログイン画面 (login.js)
- `loginForm submit`: メール・PWでログイン＋リダイレクト

### 4.9 ログアウト画面 (logout.js)
- `DOMContentLoaded`: 自動サインアウト＋トップへ遷移

## 5. データベース構成（Supabase）

- `auth.users`: Supabase Authのユーザー管理
- `profiles`: コミュニティ名、紹介文など（usersと1対1）
- `events`: イベント情報、form_schema、media URL、作成者user_id
- `participants`: 出欠登録情報、form_data（JSONB）

## 6. ストレージ

Supabase Storageの `event-media` バケットに、画像・動画を保存。

```
[image|video]/[user_id]/[timestamp]_[sanitized_filename]
```

---

この仕様書は、本アプリケーションの全体構成と機能実装の把握に役立ちます。
