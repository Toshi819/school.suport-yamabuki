(function () {
  const { loginWithEmail, loginWithGoogle } = window.studyhubAuth || {};
  if (!loginWithEmail || !loginWithGoogle) return;

  const loginBtn = document.getElementById("loginBtn");
  const googleLoginBtn = document.getElementById("googleLoginBtn");

  function redirectAfterLogin(user) {
    const uid = user?.uid;
    const scheduleFixed = uid ? localStorage.getItem(`studyhub_schedule_fixed_${uid}`) === "true" : false;
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
        redirectAfterLogin(result?.user || result?.profile || window.studyhubAuth?.getCurrentUser?.());
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
        redirectAfterLogin(result?.user || result?.profile || window.studyhubAuth?.getCurrentUser?.());
      } catch (error) {
        console.error(error);
        alert("Googleログインに失敗しました。");
      }
    });
  }
})();
