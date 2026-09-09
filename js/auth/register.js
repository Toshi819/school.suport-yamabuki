import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { auth, db } from "../../firebase.js";

const registerBtn = document.getElementById("registerBtn");
const googleRegisterBtn = document.getElementById("googleRegisterBtn");

async function generateUserId() {
  const counterRef = doc(db, "counters", "userCounter");
  const counterSnap = await getDoc(counterRef);

  let nextNumber = 1;

  if (counterSnap.exists()) {
    nextNumber = Number(counterSnap.data().count || 0) + 1;
  }

  await setDoc(counterRef, { count: nextNumber }, { merge: true });
  return `SH-${String(nextNumber).padStart(6, "0")}`;
}

async function createProfile(uid, username, email, provider) {
  const userId = await generateUserId();

  await setDoc(doc(db, "users", uid), {
    uid,
    userId,
    username,
    email,
    role: "student",
    provider,
    createdAt: new Date(),
    lastLogin: new Date(),
  });
}

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
      const email = `${username}@schoolapp.local`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createProfile(userCredential.user.uid, username, email, "password");
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
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      await createProfile(result.user.uid, result.user.displayName || "ユーザー", result.user.email || "", "google");
      window.location.href = "./home.html";
    } catch (error) {
      console.error(error);
      alert("Googleアカウントでの登録に失敗しました。");
    }
  });
}
