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
        sessionStorage.clear();
        localStorage.removeItem("studyhub_current_user_v1");
        if (window.studyhubAuth?.setCurrentUser) {
          window.studyhubAuth.setCurrentUser(null);
        }
        sessionStorage.setItem("studyhub_registration_in_progress", "true");
        await registerWithEmail(username, password);
        const currentUser = window.studyhubAuth?.getCurrentUser?.();
        if (!currentUser) {
          throw new Error("ユーザー情報の保存に失敗しました");
        }
        alert("登録が完了しました");
        window.location.href = "./schedule-plan.html";
      } catch (error) {
        sessionStorage.removeItem("studyhub_registration_in_progress");
        console.error(error);
        alert("登録に失敗しました。入力内容を確認してください。");
      }
    });
  }

  if (googleRegisterBtn) {
    googleRegisterBtn.addEventListener("click", async () => {
      try {
        sessionStorage.setItem("studyhub_registration_in_progress", "true");
        await loginWithGoogle();
        window.location.href = "./schedule-plan.html";
      } catch (error) {
        sessionStorage.removeItem("studyhub_registration_in_progress");
        console.error(error);
        alert("Googleアカウントでの登録に失敗しました。");
      }
    });
  }
})();
