(function () {
  const auth = window.studyhubFirebase?.auth;
  if (!auth) return;

  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const publicPages = ["index.html", "register.html"];

  auth.onAuthStateChanged((user) => {
    const isLoggedIn = !!user;

    if (!isLoggedIn && !publicPages.includes(currentPage)) {
      window.location.href = "./index.html";
      return;
    }

    if (isLoggedIn && publicPages.includes(currentPage)) {
      window.location.href = "./home.html";
    }
  });
})();
