/**
 * Provider registration (pending until admin approves) and provider sign-in.
 * Face photo → bucket `provider-avatars`; license uploads → `provider-documents` (after sign-up, requires session).
 */
(function () {
  "use strict";

  var LICENSE_BUCKET = "provider-documents";
  var MAX_LICENSE_FILES = 5;
  var MAX_LICENSE_BYTES = 10485760;
  var MAX_FACE_BYTES = 2097152;
  var ALLOWED_LICENSE_TYPES = {
    "application/pdf": true,
    "image/jpeg": true,
    "image/png": true,
    "image/webp": true,
  };

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

  function sanitizeFilename(name) {
    return String(name || "file")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);
  }

  function validateFacePhotoFile(file) {
    if (!file) {
      return "Please upload a profile photo showing your face.";
    }
    if (file.size > MAX_FACE_BYTES) {
      return "Profile photo must be 2 MB or smaller.";
    }
    var ok =
      ALLOWED_LICENSE_TYPES[file.type] && /^image\/(jpeg|png|webp)$/.test(file.type);
    if (!ok && file.type === "") {
      ok = /\.(jpe?g|png|webp)$/i.test(file.name);
    }
    if (!ok) {
      return "Profile photo must be JPEG, PNG, or WebP.";
    }
    return "";
  }

  function validateFaceAttest() {
    var el = qs("#providerFaceAttest");
    if (!el || !el.checked) {
      return "Please confirm that the photo is of your own face.";
    }
    return "";
  }

  /** When supported (e.g. Chromium), require at least one detected face. */
  function validateFaceDetectionIfAvailable(file) {
    return new Promise(function (resolve) {
      if (typeof FaceDetector === "undefined") {
        resolve("");
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          var ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve("");
            return;
          }
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          var detector;
          try {
            detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 4 });
          } catch (e) {
            resolve("");
            return;
          }
          detector
            .detect(canvas)
            .then(function (faces) {
              if (!faces || faces.length < 1) {
                resolve(
                  "We could not detect a face in this image. Use a clear, front-facing photo with good lighting."
                );
                return;
              }
              if (faces.length > 1) {
                resolve("Please use a photo with only your face visible (one person in the frame).");
                return;
              }
              resolve("");
            })
            .catch(function () {
              resolve("");
            });
        } catch (e) {
          URL.revokeObjectURL(url);
          resolve("");
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve("Could not read this image. Try another JPEG or PNG.");
      };
      img.src = url;
    });
  }

  function wireFacePhotoPreview() {
    var input = qs("#providerFacePhoto");
    var preview = qs("[data-face-preview]");
    if (!input || !preview) return;
    input.addEventListener("change", function () {
      preview.innerHTML = "";
      preview.style.display = "none";
      var f = input.files && input.files[0];
      if (!f || !/^image\//.test(f.type)) return;
      var url = URL.createObjectURL(f);
      var im = document.createElement("img");
      im.alt = "Preview";
      im.style.maxWidth = "120px";
      im.style.maxHeight = "120px";
      im.style.borderRadius = "8px";
      im.style.objectFit = "cover";
      im.onload = function () {
        URL.revokeObjectURL(url);
      };
      im.src = url;
      preview.appendChild(im);
      preview.style.display = "block";
    });
  }

  async function uploadAvatarAfterSignup(sb, userId, file) {
    if (!window.homeEaseUploadProviderAvatar) {
      return { error: "Avatar upload helper missing." };
    }
    var up = await window.homeEaseUploadProviderAvatar(sb, userId, file);
    if (up.error) {
      return { error: up.error.message || "Avatar upload failed." };
    }
    var res = await sb
      .from("profiles")
      .update({
        avatar_url: up.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (res.error) {
      return { error: res.error.message };
    }
    return { error: null };
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

  async function loadCoverageAreasForSignup() {
    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    var sel = qs("#coverageArea");
    if (!sb || !sel) return;
    var res = await sb
      .from("coverage_areas")
      .select("id, slug, name, sort_order")
      .order("sort_order", { ascending: true });
    sel.innerHTML = "";
    if (res.error) {
      var o = document.createElement("option");
      o.value = "";
      o.textContent = "Could not load areas";
      sel.appendChild(o);
      return;
    }
    var rows = res.data || [];
    if (!rows.length) {
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "No areas configured yet";
      sel.appendChild(empty);
      return;
    }
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select your area";
    sel.appendChild(placeholder);
    rows.forEach(function (a) {
      var opt = document.createElement("option");
      opt.value = a.slug;
      opt.textContent = a.name;
      sel.appendChild(opt);
    });
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
    var faceInput = qs("#providerFacePhoto");
    var faceFile = faceInput && faceInput.files && faceInput.files[0];

    if (pw !== pw2) {
      showError(errEl, "Passwords do not match.");
      return;
    }

    var faceErr = validateFacePhotoFile(faceFile);
    if (faceErr) {
      showError(errEl, faceErr);
      return;
    }
    var attestErr = validateFaceAttest();
    if (attestErr) {
      showError(errEl, attestErr);
      return;
    }

    var detectErr = await validateFaceDetectionIfAvailable(faceFile);
    if (detectErr) {
      showError(errEl, detectErr);
      return;
    }

    var fileErr = validateLicenseFiles(files);
    if (fileErr) {
      showError(errEl, fileErr);
      return;
    }

    var areaSel = qs("#coverageArea");
    var areaSlug = areaSel && areaSel.value ? String(areaSel.value).trim() : "";
    if (!areaSlug) {
      showError(errEl, "Please select a coverage area.");
      return;
    }

    var meta = {
      full_name: name.trim(),
      phone: phone.trim(),
      role: "provider",
      experience_years: exp ? String(parseInt(exp, 10)) : "",
      coverage_area_slug: areaSlug,
    };

    var res = await sb.auth.signUp({
      email: email.trim(),
      password: pw,
      options: { data: meta },
    });

    if (res.error) {
      showError(errEl, mapAuthErr(res.error.message));
      return;
    }

    var user = res.data.user;
    var session = res.data.session;
    var successParts = [
      "Account created. An admin must approve your provider profile before you can sign in. Admins receive an in-app notification when you register.",
    ];

    if (user && session && faceFile) {
      var avRes = await uploadAvatarAfterSignup(sb, user.id, faceFile);
      if (avRes.error) {
        successParts.push(" Profile photo upload failed: " + avRes.error);
      } else {
        successParts.push(" Profile photo saved.");
      }
    } else if (user && !session && faceFile) {
      successParts.push(
        " Profile photo was not uploaded (no active session—often when email confirmation is on). Disable confirmation in Supabase Auth for testing, then sign in and update your photo from Profile."
      );
    }

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

    showError(errEl, successParts.join(""), { success: true });
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
    var prof = await sb
      .from("profiles")
      .select("role, provider_status")
      .eq("id", uid)
      .maybeSingle();

    if (prof.error) {
      showError(errEl, mapAuthErr(prof.error.message));
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
    wireFacePhotoPreview();

    var signupForm = qs("[data-auth-signup-provider]");
    var signinForm = qs("[data-auth-signin-provider]");
    if (signupForm) {
      loadCoverageAreasForSignup();
      signupForm.addEventListener("submit", onSignupSubmit);
    }
    if (signinForm) signinForm.addEventListener("submit", onSigninSubmit);
  });
})();
