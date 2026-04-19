/**
 * Customer sign-up and sign-in (role: customer).
 */
(function () {
  "use strict";

  function showError(el, msg, opts) {
    opts = opts || {};
    if (!el) {
      window.alert(msg);
      return;
    }
    el.textContent = msg;
    el.hidden = false;
    if (opts.success) {
      el.style.color = "var(--color-primary, #2563eb)";
    } else {
      el.style.color = "#b91c1c";
    }
  }

  function mapAuthErr(raw) {
    return window.homeEaseFriendlyAuthError ? window.homeEaseFriendlyAuthError(raw) : raw;
  }

  function qs(sel) {
    return document.querySelector(sel);
  }

  async function onSignupSubmit(e) {
    e.preventDefault();
    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var errEl = qs("[data-auth-error]");
    if (errEl) errEl.hidden = true;

    var name = (qs("#name") && qs("#name").value) || "";
    var email = (qs("#email") && qs("#email").value) || "";
    var phone = (qs("#phone") && qs("#phone").value) || "";
    var pw = (qs("#password") && qs("#password").value) || "";
    var pw2 = (qs("#password2") && qs("#password2").value) || "";

    if (pw !== pw2) {
      showError(errEl, "Passwords do not match.");
      return;
    }

    var meta = {
      full_name: name.trim(),
      phone: phone.trim(),
      role: "customer",
    };

    var redirect =
      new URLSearchParams(window.location.search).get("redirect") || "index.html";

    var res = await sb.auth.signUp({
      email: email.trim(),
      password: pw,
      options: { data: meta },
    });

    if (res.error) {
      showError(errEl, mapAuthErr(res.error.message));
      return;
    }

    // If email confirmation is ON in Supabase, session may be null until user clicks the link.
    if (res.data.session) {
      window.location.href = redirect;
    } else {
      showError(
        errEl,
        "Check your email to confirm your account, then sign in. (You can disable email confirmation in Supabase Auth settings while developing.)",
        { success: true }
      );
    }
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

    if (prof.data && prof.data.role !== "customer") {
      await sb.auth.signOut();
      showError(
        errEl,
        "This account is not a customer account. Use the provider or admin portal instead."
      );
      return;
    }

    var redirect =
      new URLSearchParams(window.location.search).get("redirect") || "index.html";
    window.location.href = redirect;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var signupForm = qs("[data-auth-signup-customer]");
    var signinForm = qs("[data-auth-signin-customer]");
    if (signupForm) signupForm.addEventListener("submit", onSignupSubmit);
    if (signinForm) signinForm.addEventListener("submit", onSigninSubmit);
  });
})();
