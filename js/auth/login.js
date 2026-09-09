import { loginWithEmail, loginWithGoogle } from "../../auth.js";

const loginBtn = document.getElementById("loginBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      alert("ユーザー名とパスワードを入力してください");
      return;
    }

    try {
      await loginWithEmail(username, password);
      window.location.href = "./home.html";
    } catch (error) {
      console.error(error);
      alert("ログインに失敗しました。ユーザー名とパスワードを確認してください。");
    }
  });
}

if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    try {
      await loginWithGoogle();
      window.location.href = "./home.html";
    } catch (error) {
      console.error(error);
      alert("Googleログインに失敗しました。");
    }
  });
}
