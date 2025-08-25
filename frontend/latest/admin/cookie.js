(function () {
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  }

  const secret = getCookie("secret_key");
  if (!secret) {
    const currentUrl = encodeURIComponent(window.location.href);
    window.location.href = `auth.html?redirect=${currentUrl}`;
  }
})();
