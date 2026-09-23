(function () {
  const { requestPasswordReset } = window.studyhubAuth || {};
  const form = document.getElementById("passwordResetForm");
  const emailInput = document.getElementById("resetEmail");
  const status = document.getElementById("resetStatus");

  if (!form || !requestPasswordReset) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;
    status.textContent = "送信しています。";
    try {
      const targetEmail = await requestPasswordReset(email);
      status.textContent = `${targetEmail} への送信処理を受け付けました。届かない場合は、入力アドレスの綴り、迷惑メールフォルダー、Google登録ではないかを確認してください。`;
      form.reset();
    } catch (error) {
      console.error(error);
      const messages = {
        "auth/user-not-found": "このメールアドレスのメールログインアカウントがありません。Googleで登録した場合はGoogleでログインしてください。",
        "auth/invalid-email": "メールアドレスの形式を確認してください。",
        "auth/operation-not-allowed": "メール／パスワードログインがFirebaseで有効になっていません。",
        "auth/too-many-requests": "短時間に送信しすぎました。しばらく待ってから再試行してください。",
      };
      status.textContent = messages[error.code] || error.message || "再設定メールの送信に失敗しました。迷惑メールフォルダーも確認してください。";
    }
  });
})();