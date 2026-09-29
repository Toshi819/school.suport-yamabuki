(function () {
  const APP_VERSION = "v0.1.0";
  function appendVersion() {
    if (!document.body || document.querySelector(".app-version")) return;
    const footer = document.createElement("div");
    footer.className = "app-version";
    footer.textContent = `StudyHub ${APP_VERSION}`;
    document.body.appendChild(footer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", appendVersion, { once: true });
  } else {
    appendVersion();
  }
})();
