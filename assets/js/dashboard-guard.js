/**
 * Protect dashboard pages: require session + correct role (+ approved provider).
 * Set on <body>: data-homeease-guard="admin" | data-homeease-guard="provider"
 */
(function () {
  "use strict";

  function qs(sel) {
    return document.querySelector(sel);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var mode = document.body.getAttribute("data-homeease-guard");
    if (!mode) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var signin =
      mode === "admin" ? "signin.html" : mode === "provider" ? "signin.html" : "signin.html";

    var sessionRes = await sb.auth.getSession();
    if (!sessionRes.data || !sessionRes.data.session) {
      window.location.href = signin;
      return;
    }

    var uid = sessionRes.data.session.user.id;
    var profRes = await sb
      .from("profiles")
      .select("role, provider_status, full_name, email")
      .eq("id", uid)
      .maybeSingle();

    if (profRes.error || !profRes.data) {
      await sb.auth.signOut();
      window.location.href = signin;
      return;
    }

    var p = profRes.data;

    if (mode === "admin" && p.role !== "admin") {
      await sb.auth.signOut();
      window.location.href = signin;
      return;
    }

    if (mode === "provider") {
      if (p.role !== "provider") {
        await sb.auth.signOut();
        window.location.href = signin;
        return;
      }
      if (p.provider_status !== "approved") {
        await sb.auth.signOut();
        window.location.href = signin;
        return;
      }
    }

    var nameEl = qs("[data-homeease-profile-name]");
    if (nameEl && p.full_name) {
      nameEl.textContent = p.full_name;
    }
  });
})();
