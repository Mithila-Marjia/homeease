/**
 * Shared admin helpers: formatting, sign-out, escape HTML.
 */
(function () {
  "use strict";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function moneyCents(c) {
    if (window.homeEaseMoney && typeof window.homeEaseMoney.fromCents === "function") {
      return window.homeEaseMoney.fromCents(c);
    }
    var n = Number(c) || 0;
    return "৳\u00A0" + (n / 100).toFixed(2);
  }

  async function signOut() {
    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (sb) await sb.auth.signOut();
    window.location.href = "signin.html";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.querySelector("[data-admin-signout]");
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        signOut();
      });
    }
  });

  window.homeEaseAdmin = {
    escapeHtml: escapeHtml,
    moneyCents: moneyCents,
    signOut: signOut,
  };
})();
