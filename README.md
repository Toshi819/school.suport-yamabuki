# StudyHub

学校向けの時間割・授業マスタ・問題報告のブラウザアプリです。

## 起動

```powershell
python -m http.server 8000
```

ブラウザで `http://localhost:8000/index.html` を開きます。

## 主な画面

- `index.html`: ログイン
- `register.html`: 新規登録
- `home.html`: 一般ユーザーの時間割
- `schedule-plan.html`: 時間割の新規登録・変更
- `verification.html`: 本人確認情報
- `report.html`: 問題報告
- `admin.html`: 管理者機能

## Firebaseデータ

- `users/{uid}`: プロフィール、権限、本人確認状態、容量情報
- `subjects/{subjectId}`: 管理者が登録する授業マスタ
- `classes/{uid_day_period}`: ユーザーごとの時間割
- `reports/{reportId}`: 問題報告
- `classes/{classId}/files/{fileId}`: 授業資料のメタデータ
- `counters/userCounter`: `SH-000001`形式のID採番

パスワード本体はFirestoreに保存せず、Firebase Authenticationで管理します。

## 管理者

Firestoreの `users/{Firebase Auth UID}` に次を設定します。

```text
role: "admin"
```

管理者画面では授業マスタ、ユーザー一覧、問題報告を管理できます。

## Firestoreルール

`firestore.rules`をFirebaseコンソールへ反映して公開してください。ルールを変更した場合は、ブラウザ側のコードだけでは反映されません。

資料保存を使う場合は、Firebase Storageを有効化し、`storage.rules`もStorageのRulesへ反映してください。実ファイルは `classes/{classId}/files/{fileId}` に保存します。

## レガシー画面

`class.html`、`subjects.html`、`subject-register.html`は旧画面です。現在の主導線は `schedule-plan.html` と `admin.html` です。削除は互換性確認後に行います。
