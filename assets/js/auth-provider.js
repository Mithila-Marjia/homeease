/**
 * Provider registration (pending until admin approves) and provider sign-in.
 * License uploads use Supabase Storage bucket `provider-documents` after sign-up (requires session).
 */
(function () {
  "use strict";

  var LICENSE_BUCKET = "provider-documents";
  var MAX_LICENSE_FILES = 5;
  var MAX_LICENSE_BYTES = 10485760;
  var ALLOWED_LICENSE_TYPES = {
    "application/pdf": true,
    "image/jpeg": true,
    "image/png": true,
    "image/webp": true,
  };

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

  function sanitizeFilename(name) {
    return String(name || "file")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);
  }

  function validateLicenseFiles(files) {
    if (!files || !files.length) return "";
    if (files.length > MAX_LICENSE_FILES) {
      return "You can upload at most " + MAX_LICENSE_FILES + " files.";
    }
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (f.size > MAX_LICENSE_BYTES) {
        return "Each file must be 10 MB or smaller: " + f.name;
      }
      var ok =
        ALLOWED_LICENSE_TYPES[f.type] ||
        (f.type === "" && /\.pdf$/i.test(f.name)) ||
        (f.type === "" && /\.(jpe?g|png|webp)$/i.test(f.name));
      if (!ok) {
        return "Allowed types: PDF, JPEG, PNG, WebP. Problem file: " + f.name;
      }
    }
    return "";
  }

  function renderLicenseFileList(fileInput, listEl) {
    if (!listEl) return;
    if (!fileInput || !fileInput.files || !fileInput.files.length) {
      listEl.textContent = "";
      return;
    }
    var parts = [];
    for (var i = 0; i < fileInput.files.length; i++) {
      parts.push(fileInput.files[i].name + " (" + Math.round(fileInput.files[i].size / 1024) + " KB)");
    }
    listEl.textContent = parts.join(" · ");
  }

  function wireLicenseUploadUI() {
    var fileInput = qs("#providerLicenseFiles");
    var zone = qs("[data-license-upload-zone]");
    var listEl = qs("[data-license-file-list]");
    if (!fileInput || !zone) return;

    zone.addEventListener("click", function () {
      fileInput.click();
    });
    zone.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener("change", function () {
      renderLicenseFileList(fileInput, listEl);
    });

    ["dragover", "dragenter"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add("upload-zone--drag");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove("upload-zone--drag");
      });
    });

    zone.addEventListener("drop", function (e) {
      var dt = e.dataTransfer;
      if (!dt || !dt.files || !dt.files.length) return;
      var incoming = Array.from(dt.files).filter(function (f) {
        return (
          ALLOWED_LICENSE_TYPES[f.type] ||
          (f.type === "" && /\.(pdf|jpe?g|png|webp)$/i.test(f.name))
        );
      });
      var err = validateLicenseFiles(incoming);
      if (err) {
        window.alert(err);
        return;
      }
      var merged = new window.DataTransfer();
      var existing = Array.from(fileInput.files || []);
      var all = existing.concat(incoming).slice(0, MAX_LICENSE_FILES);
      all.forEach(function (f) {
        merged.items.add(f);
      });
      fileInput.files = merged.files;
      renderLicenseFileList(fileInput, listEl);
    });
  }

  async function uploadLicensesAfterSignup(sb, userId, files) {
    var uploaded = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var safe = sanitizeFilename(f.name);
      var path = userId + "/" + Date.now() + "_" + i + "_" + safe;
      var up = await sb.storage.from(LICENSE_BUCKET).upload(path, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type || "application/octet-stream",
      });
      if (up.error) {
        return { error: up.error.message, uploaded: uploaded };
      }
      uploaded.push({ path: path, name: f.name });
    }
    var upd = await sb
      .from("profiles")
      .update({
        provider_license_files: uploaded,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (upd.error) {
      return { error: upd.error.message, uploaded: uploaded };
    }
    return { error: null, uploaded: uploaded };
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
    var fileInput = qs("#providerLicenseFiles");
    var files = fileInput && fileInput.files ? Array.prototype.slice.call(fileInput.files) : [];

    if (pw !== pw2) {
      showError(errEl, "Passwords do not match.");
      return;
    }

    var fileErr = validateLicenseFiles(files);
    if (fileErr) {
      showError(errEl, fileErr);
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

    var user = res.data.user;
    var session = res.data.session;
    var successParts = [
      "Account created. An admin must approve your provider profile before you can sign in. Admins receive an in-app notification when you register.",
    ];

    if (files.length && user) {
      if (!session) {
        successParts.push(
          " Your documents were not uploaded because there was no active session (Supabase often does this when “Confirm email” is enabled). Disable email confirmation for testing, or send licenses to support."
        );
      } else {
        var upRes = await uploadLicensesAfterSignup(sb, user.id, files);
        if (upRes.error) {
          successParts.push(" License upload failed: " + upRes.error);
        } else if (upRes.uploaded && upRes.uploaded.length) {
          successParts.push(" Uploaded " + upRes.uploaded.length + " document(s).");
        }
      }
    }

    showError(errEl, successParts.join(""));
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
    wireLicenseUploadUI();

    var signupForm = qs("[data-auth-signup-provider]");
    var signinForm = qs("[data-auth-signin-provider]");
    if (signupForm) signupForm.addEventListener("submit", onSignupSubmit);
    if (signinForm) signinForm.addEventListener("submit", onSigninSubmit);
  });
})();
