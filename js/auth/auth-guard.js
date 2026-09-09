import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { auth } from "../../firebase.js";

const currentPage = window.location.pathname.split("/").pop() || "index.html";
const publicPages = ["index.html", "register.html"];

onAuthStateChanged(auth, (user) => {
  const isLoggedIn = !!user;

  if (!isLoggedIn && !publicPages.includes(currentPage)) {
    window.location.href = "./index.html";
    return;
  }

  if (isLoggedIn && publicPages.includes(currentPage)) {
    window.location.href = "./home.html";
  }
});
