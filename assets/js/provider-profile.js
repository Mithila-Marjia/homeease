/**
 * Provider: update own profile (full_name, phone).
 */
(function () {
  "use strict";

  var P = window.homeEaseProvider;

  function qs(sel) {
    return document.querySelector(sel);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var form = qs("[data-provider-profile-form]");
    if (!form || !P) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var sessionRes = await sb.auth.getSession();
    if (!sessionRes.data || !sessionRes.data.session) return;
    var uid = sessionRes.data.session.user.id;

    var errEl = qs("[data-provider-profile-error]");
    var okEl = qs("[data-provider-profile-success]");

    var prof = await sb
      .from("profiles")
      .select("full_name, phone, email, experience_years, primary_category_id")
      .eq("id", uid)
      .maybeSingle();

    if (prof.error || !prof.data) {
      if (errEl) {
        errEl.textContent = prof.error ? prof.error.message : "Profile not found";
        errEl.hidden = false;
      }
      return;
    }

    var nameInput = qs("#providerFullName");
    var phoneInput = qs("#providerPhone");
    if (nameInput) nameInput.value = prof.data.full_name || "";
    if (phoneInput) phoneInput.value = prof.data.phone || "";

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (errEl) {
        errEl.hidden = true;
        errEl.textContent = "";
      }
      if (okEl) okEl.hidden = true;

      var fullName = (nameInput && nameInput.value) || "";
      var phone = (phoneInput && phoneInput.value) || "";

      var res = await sb
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", uid);

      if (res.error) {
        if (errEl) {
          errEl.textContent = res.error.message;
          errEl.hidden = false;
        }
        return;
      }

      var nameEl = qs("[data-homeease-profile-name]");
      if (nameEl) nameEl.textContent = fullName.trim() || nameEl.textContent;
      if (okEl) {
        okEl.textContent = "Profile saved.";
        okEl.hidden = false;
      }
    });
  });
})();
