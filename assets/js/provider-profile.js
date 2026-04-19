/**
 * Provider: update own profile (full_name, phone, face photo).
 */
(function () {
  "use strict";

  var P = window.homeEaseProvider;
  var MAX_AVATAR_BYTES = 2097152;

  function qs(sel) {
    return document.querySelector(sel);
  }

  function validateAvatarFile(file) {
    if (!file) return "";
    if (file.size > MAX_AVATAR_BYTES) {
      return "Profile photo must be 2 MB or smaller.";
    }
    var ok = /^image\/(jpeg|png|webp)$/.test(file.type);
    if (!ok && file.type === "") {
      ok = /\.(jpe?g|png|webp)$/i.test(file.name);
    }
    if (!ok) {
      return "Use JPEG, PNG, or WebP for your profile photo.";
    }
    return "";
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
      .select("full_name, phone, email, experience_years, primary_category_id, avatar_url")
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
    var photoEl = qs("[data-provider-profile-photo]");
    var avatarInput = qs("#providerAvatarReplace");

    if (nameInput) nameInput.value = prof.data.full_name || "";
    if (phoneInput) phoneInput.value = prof.data.phone || "";
    if (photoEl && prof.data.avatar_url) {
      photoEl.src = prof.data.avatar_url;
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (errEl) {
        errEl.hidden = true;
        errEl.textContent = "";
      }
      if (okEl) okEl.hidden = true;

      var fullName = (nameInput && nameInput.value) || "";
      var phone = (phoneInput && phoneInput.value) || "";
      var file = avatarInput && avatarInput.files && avatarInput.files[0];

      if (file) {
        var v = validateAvatarFile(file);
        if (v) {
          if (errEl) {
            errEl.textContent = v;
            errEl.hidden = false;
          }
          return;
        }
      }

      var upd = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        updated_at: new Date().toISOString(),
      };

      if (file && window.homeEaseUploadProviderAvatar) {
        var up = await window.homeEaseUploadProviderAvatar(sb, uid, file);
        if (up.error) {
          if (errEl) {
            errEl.textContent = up.error.message || "Photo upload failed.";
            errEl.hidden = false;
          }
          return;
        }
        upd.avatar_url = up.publicUrl;
      }

      var res = await sb.from("profiles").update(upd).eq("id", uid);

      if (res.error) {
        if (errEl) {
          errEl.textContent = res.error.message;
          errEl.hidden = false;
        }
        return;
      }

      if (upd.avatar_url && photoEl) {
        photoEl.src = upd.avatar_url;
      }
      var sideAvatar = qs("[data-homeease-profile-avatar]");
      if (sideAvatar && upd.avatar_url) {
        sideAvatar.src = upd.avatar_url;
      }

      var nameEl = qs("[data-homeease-profile-name]");
      if (nameEl) nameEl.textContent = fullName.trim() || nameEl.textContent;
      if (avatarInput) avatarInput.value = "";
      if (okEl) {
        okEl.textContent = "Profile saved.";
        okEl.hidden = false;
      }
    });
  });
})();
