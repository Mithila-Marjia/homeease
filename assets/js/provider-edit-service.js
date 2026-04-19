/**
 * Edit an existing service (same fields as create; ?id=uuid required).
 */
(function () {
  "use strict";

  function qs(sel) {
    return document.querySelector(sel);
  }

  function slugify(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var form = qs("[data-provider-edit-service]");
    if (!form) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var errEl = qs("[data-provider-service-error]");
    var id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      if (errEl) {
        errEl.textContent = "Missing service id.";
        errEl.hidden = false;
      }
      return;
    }

    var sessionRes = await sb.auth.getSession();
    if (!sessionRes.data || !sessionRes.data.session) return;
    var uid = sessionRes.data.session.user.id;

    var catSelect = qs("#svcCategory");
    if (catSelect) {
      var cres = await sb.from("categories").select("id, name").order("sort_order");
      if (!cres.error && cres.data) {
        catSelect.innerHTML = '<option value="">Select category</option>';
        cres.data.forEach(function (c) {
          var opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = c.name;
          catSelect.appendChild(opt);
        });
      }
    }

    var svcRes = await sb
      .from("services")
      .select("id, title, slug, category_id, description, price_cents, fee_cents, duration_text, image_url")
      .eq("id", id)
      .eq("provider_id", uid)
      .maybeSingle();

    if (svcRes.error || !svcRes.data) {
      if (errEl) {
        errEl.textContent = svcRes.error ? svcRes.error.message : "Service not found.";
        errEl.hidden = false;
      }
      return;
    }

    var svc = svcRes.data;
    if (qs("#svcTitle")) qs("#svcTitle").value = svc.title || "";
    if (qs("#svcSlug")) qs("#svcSlug").value = svc.slug || "";
    if (catSelect && svc.category_id) catSelect.value = svc.category_id;
    if (qs("#svcPrice")) qs("#svcPrice").value = String((svc.price_cents || 0) / 100);
    if (qs("#svcFee")) qs("#svcFee").value = String((svc.fee_cents || 0) / 100);
    if (qs("#svcDuration")) qs("#svcDuration").value = svc.duration_text || "";
    if (qs("#svcDesc")) qs("#svcDesc").value = svc.description || "";

    var preview = qs("[data-service-image-preview]");
    if (preview && svc.image_url) {
      var safeUrl = window.homeEaseProvider
        ? window.homeEaseProvider.escapeHtml(svc.image_url)
        : String(svc.image_url).replace(/"/g, "&quot;");
      preview.innerHTML =
        '<p style="margin:0 0 0.35rem;font-size:0.8125rem;color:var(--color-text-muted)">Current image</p>' +
        '<img src="' +
        safeUrl +
        '" alt="" style="max-width:120px;max-height:120px;border-radius:8px;object-fit:cover" />';
      preview.hidden = false;
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (errEl) {
        errEl.textContent = "";
        errEl.hidden = true;
      }

      var title = (qs("#svcTitle") && qs("#svcTitle").value) || "";
      var slugInput = qs("#svcSlug") && qs("#svcSlug").value;
      var slug = slugify(slugInput || title);
      var catId = catSelect && catSelect.value;
      var price = parseFloat((qs("#svcPrice") && qs("#svcPrice").value) || "0", 10);
      var fee = parseFloat((qs("#svcFee") && qs("#svcFee").value) || "0", 10);
      var duration = (qs("#svcDuration") && qs("#svcDuration").value) || "";
      var desc = (qs("#svcDesc") && qs("#svcDesc").value) || "";

      if (!title || !slug || !catId) {
        if (errEl) {
          errEl.textContent = "Title, slug, and category are required.";
          errEl.hidden = false;
        }
        return;
      }

      var row = {
        category_id: catId,
        title: title.trim(),
        slug: slug,
        description: desc.trim() || null,
        price_cents: Math.round(price * 100),
        fee_cents: Math.round(fee * 100),
        duration_text: duration.trim() || null,
      };

      var res = await sb.from("services").update(row).eq("id", id).eq("provider_id", uid);
      if (res.error) {
        if (errEl) {
          errEl.textContent = res.error.message;
          errEl.hidden = false;
        }
        return;
      }

      var fileInput = qs("#svcImage");
      var file = fileInput && fileInput.files && fileInput.files[0];
      if (file && window.homeEaseUploadServiceCover) {
        var up = await window.homeEaseUploadServiceCover(sb, uid, id, file);
        if (up.error) {
          if (errEl) {
            errEl.textContent = "Saved, but image upload failed: " + up.error.message;
            errEl.hidden = false;
          }
          return;
        }
        var upd = await sb
          .from("services")
          .update({ image_url: up.publicUrl })
          .eq("id", id)
          .eq("provider_id", uid);
        if (upd.error && errEl) {
          errEl.textContent = "Saved, but storing image URL failed: " + upd.error.message;
          errEl.hidden = false;
          return;
        }
      }

      window.location.href = "services.html";
    });
  });
})();
