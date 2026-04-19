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
    // Admin pages do not need avatar_url; selecting a missing column breaks the query and causes a login loop.
    var profileSelect =
      mode === "provider"
        ? "role, provider_status, full_name, email, avatar_url"
        : "role, provider_status, full_name, email";

    var profRes = await sb.from("profiles").select(profileSelect).eq("id", uid).maybeSingle();

    if (profRes.error && mode === "provider" && /avatar_url|column/i.test(String(profRes.error.message || ""))) {
      profRes = await sb
        .from("profiles")
        .select("role, provider_status, full_name, email")
        .eq("id", uid)
        .maybeSingle();
    }

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

    var avatarEl = qs("[data-homeease-profile-avatar]");
    if (avatarEl && p.avatar_url) {
      avatarEl.src = p.avatar_url;
      avatarEl.referrerPolicy = "no-referrer";
    }
  });
})();
