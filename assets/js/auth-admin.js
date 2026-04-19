/**
 * Admin sign-in: only users whose profile.role = 'admin' (set in SQL, not by clients).
 */
(function () {
  "use strict";

  function showError(el, msg) {
    if (!el) {
      window.alert(msg);
      return;
    }
    el.textContent = msg;
    el.hidden = false;
    el.style.color = "#b91c1c";
  }

  function mapAuthErr(raw) {
    return window.homeEaseFriendlyAuthError ? window.homeEaseFriendlyAuthError(raw) : raw;
  }

  function qs(sel) {
    return document.querySelector(sel);
  }

  async function onSigninSubmit(e) {
    e.preventDefault();
    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var errEl = qs("[data-auth-error]");
    if (errEl) errEl.hidden = true;

    var email = (qs("#email") && qs("#email").value) || "";
    var pw = (qs("#password") && qs("#password").value) || "";

    var res = await sb.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    });

    if (res.error) {
      showError(errEl, mapAuthErr(res.error.message));
      return;
    }

    var uid = res.data.user && res.data.user.id;
    var prof = await sb.from("profiles").select("role").eq("id", uid).maybeSingle();

    if (prof.error) {
      showError(errEl, mapAuthErr(prof.error.message));
      return;
    }

    if (!prof.data || prof.data.role !== "admin") {
      await sb.auth.signOut();
      showError(errEl, "This account does not have administrator access.");
      return;
    }

    window.location.href = "dashboard.html";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = qs("[data-auth-signin-admin]");
    if (form) form.addEventListener("submit", onSigninSubmit);
  });
})();
