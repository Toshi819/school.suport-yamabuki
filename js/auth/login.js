import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { auth, db } from "../../firebase.js";

const loginBtn = document.getElementById("loginBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");

function getUserIdFromDoc(docSnap) {
  return docSnap.exists() ? docSnap.data().userId || "SH-000001" : "SH-000001";
}

async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const newUserId = `SH-${String(Date.now()).slice(-6)}`;

    await setDoc(userRef, {
      uid: user.uid,
      userId: newUserId,
      username: user.displayName || "ユーザー",
      email: user.email || "",
      role: "student",
      provider: user.providerData[0]?.providerId || "password",
      createdAt: new Date(),
      lastLogin: new Date(),
    });
  } else {
    await setDoc(userRef, {
      ...userSnap.data(),
      lastLogin: new Date(),
    }, { merge: true });
  }
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
      const email = `${username}@schoolapp.local`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await ensureUserProfile(userCredential.user);
      window.location.href = "./home.html";
    } catch (error) {
      console.error(error);
      alert("ログインに失敗しました。ユーザー名とパスワードを確認してください。");
    }
  });
}

if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      await ensureUserProfile(result.user);
      window.location.href = "./home.html";
    } catch (error) {
      console.error(error);
      alert("Googleログインに失敗しました。");
    }
  });
}
