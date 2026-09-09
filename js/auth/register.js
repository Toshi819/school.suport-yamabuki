(function () {
  const { loginWithGoogle, registerWithEmail } = window.studyhubAuth || {};
  if (!loginWithGoogle || !registerWithEmail) return;

  const registerBtn = document.getElementById("registerBtn");
  const googleRegisterBtn = document.getElementById("googleRegisterBtn");

  if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;
      const passwordConfirm = document.getElementById("passwordConfirm").value;

      if (!username || !password) {
        alert("ユーザー名とパスワードを入力してください");
        return;
      }

      if (password !== passwordConfirm) {
        alert("パスワードが一致しません");
        return;
      }

      try {
        await registerWithEmail(username, password);
        alert("登録が完了しました");
        window.location.href = "./home.html";
      } catch (error) {
        console.error(error);
        alert("登録に失敗しました。入力内容を確認してください。");
      }
    });
  }

  if (googleRegisterBtn) {
    googleRegisterBtn.addEventListener("click", async () => {
      try {
        await loginWithGoogle();
        window.location.href = "./home.html";
      } catch (error) {
        console.error(error);
        alert("Googleアカウントでの登録に失敗しました。");
      }
    });
  }
})();
