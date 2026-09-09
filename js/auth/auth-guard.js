(function () {
  const auth = window.studyhubFirebase?.auth;
  const getCurrentUser = window.studyhubAuth?.getCurrentUser;

  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const publicPages = ["index.html", "register.html"];

  function evaluateAccess(user) {
    const isLoggedIn = !!user;

    if (!isLoggedIn && !publicPages.includes(currentPage)) {
      window.location.href = "./index.html";
      return;
    }

    if (isLoggedIn && publicPages.includes(currentPage)) {
      window.location.href = "./home.html";
    }
  }

  const localUser = getCurrentUser ? getCurrentUser() : null;
  if (localUser) {
    evaluateAccess(localUser);
    return;
  }

  if (auth) {
    auth.onAuthStateChanged((user) => evaluateAccess(user));
  }
})();
