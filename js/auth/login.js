(function () {
  const { loginWithEmail, loginWithGoogle, requestPasswordReset } = window.studyhubAuth || {};
  if (!loginWithEmail || !loginWithGoogle) return;

  const loginBtn = document.getElementById("loginBtn");
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const passwordResetBtn = document.getElementById("passwordResetBtn");

  async function redirectAfterLogin(user) {
    const uid = user?.uid;
    const profile = uid && window.studyhubAuth?.getUserProfile
      ? await window.studyhubAuth.getUserProfile(uid)
      : null;
    if (profile?.role === "admin") {
      window.location.replace("./admin.html");
      return;
    }
    const scheduleFixed = uid
      ? localStorage.getItem(`studyhub_schedule_fixed_${uid}`) === "true" || profile?.scheduleFixed === true
      : false;
    window.location.href = scheduleFixed ? "./home.html" : "./schedule-plan.html";
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;

      if (!username || !password) {
        alert("ユーザー名とパスワードを入力してください");
        return;
      }

      try {
        const result = await loginWithEmail(username, password);
        await redirectAfterLogin(result?.user || result?.profile || window.studyhubAuth?.getCurrentUser?.());
      } catch (error) {
        console.error(error);
        alert("ログインに失敗しました。ユーザー名とパスワードを確認してください。");
      }
    });
  }

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", async () => {
      try {
        const result = await loginWithGoogle();
        await redirectAfterLogin(result?.user || result?.profile || window.studyhubAuth?.getCurrentUser?.());
      } catch (error) {
        console.error(error);
        alert(error.message || "Googleログインに失敗しました。");
      }
    });
  }

  passwordResetBtn?.addEventListener("click", async () => {
    const email = document.getElementById("resetEmail")?.value.trim();
    if (!email) {
      alert("再設定用の学校メールアドレスを入力してください");
      return;
    }
    try {
      const targetEmail = await requestPasswordReset(email);
      alert(`${targetEmail} に再設定メールを送信しました。`);
    } catch (error) {
      console.error(error);
      alert(error.message || "再設定メールの送信に失敗しました。");
    }
  });
})();
