(function () {
  const auth = window.studyhubFirebase?.auth;
  const getCurrentUser = window.studyhubAuth?.getCurrentUser;

  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const publicPages = ["index.html", "register.html"];

  function hasFixedSchedule(user) {
    if (!user || !user.uid) return false;
    return localStorage.getItem(`studyhub_schedule_fixed_${user.uid}`) === "true";
  }

  async function evaluateAccess(user) {
    const isLoggedIn = !!user;

    if (!isLoggedIn && !publicPages.includes(currentPage)) {
      window.location.href = "./index.html";
      return;
    }

    const registrationInProgress = sessionStorage.getItem("studyhub_registration_in_progress") === "true";
    const scheduleFixed = hasFixedSchedule(user);

    if (isLoggedIn && window.studyhubAuth?.getUserProfile) {
      try {
        const profile = await window.studyhubAuth.getUserProfile(user.uid);
        if (profile?.role === "admin" && currentPage !== "admin.html") {
          window.location.replace("./admin.html");
          return;
        }
      } catch (error) {
        console.warn("Admin role lookup failed:", error);
      }
    }

    if (isLoggedIn && publicPages.includes(currentPage)) {
      window.studyhubAuth?.getUserProfile?.(user.uid).then((profile) => {
        if (profile?.role === "admin") {
          window.location.href = "./admin.html";
        } else if (registrationInProgress || !scheduleFixed) {
          window.location.href = "./schedule-plan.html";
        } else {
          window.location.href = "./home.html";
        }
      }).catch((error) => {
        console.warn("Role lookup failed:", error);
        window.location.href = scheduleFixed ? "./home.html" : "./schedule-plan.html";
      });
      return;
    }

    if (isLoggedIn && !scheduleFixed && currentPage === "home.html") {
      window.location.href = "./schedule-plan.html";
      return;
    }

    if (!isLoggedIn && currentPage === "schedule-plan.html") {
      window.location.href = "./index.html";
    }
  }

  const authReady = window.studyhubFirebase?.authReady;
  if (authReady) {
    authReady.then((user) => evaluateAccess(user));
    return;
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
