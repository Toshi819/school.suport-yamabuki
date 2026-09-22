# StudyHub

学校向けの時間割・授業資料・学習機能をまとめたブラウザアプリです。

## 起動

```powershell
python -m http.server 8000
```

ブラウザで `http://localhost:8000/index.html` を開きます。

## 主な画面

- `index.html`: ログイン
- `register.html`: 新規登録
- `home.html`: 時間割とホームメニュー
- `announcements.html`: 現在のバージョンのおしらせ
- `schedule-plan.html`: 時間割の登録・変更
- `class-menu.html`: 授業メニュー
- `files.html`: 授業資料
- `memo.html`: 授業ごとのメモ
- `cards.html`: 単語カードメニュー
- `cards-create.html`: 単語カードの作成
- `cards-solve.html`: 単語カード学習
- `class-problem.html`: 授業カードから作る4択問題
- `problem.html`: LEAP問題のモード選択
- `problem-self.html`: LEAP自己学習
- `problem-ranking.html`: LEAPランキングメニュー
- `problem-stages.html`: LEAPステージ選択
- `problem-quiz.html`: LEAP出題
- `problem-ranking-view.html`: LEAPランキング表示
- `verification.html`: 本人確認情報
- `report.html`: 問題報告
- `admin.html`: 管理者機能

## Firebaseデータ

- `users/{uid}`: プロフィール、権限、本人確認状態、容量情報
- `subjects/{subjectId}`: 管理者が登録する授業マスタ
- `classes/{uid_day_period}`: ユーザーごとの時間割
- `classMemos/{classId}_{uid}`: 授業ごとの本人専用メモ
- `classCards/{classId}_{uid}_{timestamp}`: 授業ごとの本人専用単語カード
- `leapScores/{uid}_{stage}`: LEAPステージ別ハイスコア
- `reports/{reportId}`: 問題報告
- `subjects/{subjectId}/files/{fileId}`: 授業資料のメタデータ
- `subjects/{subjectId}/folders/{folderId}`: 教材フォルダー
- `subjects/{subjectId}/folders/{folderId}/files/{fileId}`: フォルダー内資料
- `counters/userCounter`: `SH-000001`形式のID採番

管理者画面のアカウント管理では、授業資料のメタデータからアカウント別の使用量を再集計し、使用量・上限・使用率を表示します。

パスワード本体はFirestoreに保存せず、Firebase Authenticationで管理します。

## 管理者

Firestoreの `users/{Firebase Auth UID}` に次を設定します。

```text
role: "admin"
```

管理者画面では授業マスタ、ユーザー一覧、問題報告を管理できます。
ユーザー管理では、資料の使用量・使用率・上限の変更、StudyHub内のアカウントデータ削除ができます。Firebase Authenticationのログインアカウント自体を削除する場合は、Firebase Admin SDKまたはCloud Functionsが必要です。

## Firebaseルール

`firestore.rules`をFirebaseコンソールへ反映して公開してください。単語カードと授業メモを使う場合も、更新したFirestoreルールの公開が必要です。

資料保存を使う場合は、Firebase Storageを有効化し、`storage.rules`もStorageのRulesへ反映してください。実ファイルは次のパスに保存します。

- `subjects/{subjectId}/files/{fileId}`
- `subjects/{subjectId}/folders/{folderId}/files/{fileId}`

## レガシー画面

`class.html`、`subjects.html`、`subject-register.html`は旧画面です。現在の主導線は `schedule-plan.html` と `admin.html` です。削除は互換性確認後に行います。
