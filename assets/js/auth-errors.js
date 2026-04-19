/**
 * Map Supabase Auth API errors to clearer copy for end users.
 * Load before auth-provider.js / auth-customer.js / auth-admin.js
 */
(function () {
  "use strict";

  function friendlyAuthError(raw) {
    var s = String(raw == null ? "" : raw);
    var low = s.toLowerCase();

    if (
      low.indexOf("rate limit") !== -1 ||
      low.indexOf("over_email_send_rate") !== -1 ||
      low.indexOf("email rate limit") !== -1 ||
      (low.indexOf("429") !== -1 && low.indexOf("email") !== -1)
    ) {
      return (
        "Too many sign-up attempts or auth emails from this network. Wait 5–10 minutes and try again. " +
        "In Supabase: Authentication → Rate limits; for production, add custom SMTP (Auth → SMTP) so limits are higher."
      );
    }

    if (low.indexOf("user already registered") !== -1 || low.indexOf("already been registered") !== -1) {
      return "This email is already registered. Try signing in instead.";
    }

    return s;
  }

  window.homeEaseFriendlyAuthError = friendlyAuthError;
})();
