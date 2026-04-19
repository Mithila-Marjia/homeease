/**
 * Shared provider helpers: formatting, sign-out.
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
    var btn = document.querySelector("[data-provider-signout]");
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        signOut();
      });
    }
  });

  window.homeEaseProvider = {
    escapeHtml: escapeHtml,
    moneyCents: moneyCents,
    signOut: signOut,
  };
})();
