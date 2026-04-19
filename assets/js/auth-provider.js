/**
 * Provider registration (pending until admin approves) and provider sign-in.
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
    var exp = (qs("#experience") && qs("#experience").value) || "";
    var pw = (qs("#password") && qs("#password").value) || "";
    var pw2 = (qs("#password2") && qs("#password2").value) || "";

    if (pw !== pw2) {
      showError(errEl, "Passwords do not match.");
      return;
    }

    var meta = {
      full_name: name.trim(),
      phone: phone.trim(),
      role: "provider",
      experience_years: exp ? String(parseInt(exp, 10)) : "",
    };

    var res = await sb.auth.signUp({
      email: email.trim(),
      password: pw,
      options: { data: meta },
    });

    if (res.error) {
      showError(errEl, res.error.message);
      return;
    }

    showError(
      errEl,
      "Account created. An admin must approve your provider profile before you can sign in. Admins receive an in-app notification when you register."
    );
    if (errEl) errEl.style.color = "var(--color-primary, #2563eb)";
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
      showError(errEl, res.error.message);
      return;
    }

    var uid = res.data.user && res.data.user.id;
    var prof = await sb
      .from("profiles")
      .select("role, provider_status")
      .eq("id", uid)
      .maybeSingle();

    if (prof.error) {
      showError(errEl, prof.error.message);
      return;
    }

    if (!prof.data || prof.data.role !== "provider") {
      await sb.auth.signOut();
      showError(errEl, "This email is not registered as a provider.");
      return;
    }

    if (prof.data.provider_status === "pending") {
      await sb.auth.signOut();
      showError(errEl, "Your provider account is still pending admin approval.");
      return;
    }

    if (prof.data.provider_status === "rejected") {
      await sb.auth.signOut();
      showError(errEl, "Your provider application was not approved. Contact support.");
      return;
    }

    window.location.href = "dashboard.html";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var signupForm = qs("[data-auth-signup-provider]");
    var signinForm = qs("[data-auth-signin-provider]");
    if (signupForm) signupForm.addEventListener("submit", onSignupSubmit);
    if (signinForm) signinForm.addEventListener("submit", onSigninSubmit);
  });
})();
