/**
 * Create a new service for the signed-in approved provider.
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
    var form = qs("[data-provider-add-service]");
    if (!form) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

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

    var errEl = qs("[data-provider-service-error]");

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (errEl) {
        errEl.textContent = "";
        errEl.hidden = true;
      }

      var sessionRes = await sb.auth.getSession();
      if (!sessionRes.data || !sessionRes.data.session) return;
      var uid = sessionRes.data.session.user.id;

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
        provider_id: uid,
        category_id: catId,
        title: title.trim(),
        slug: slug,
        description: desc.trim() || null,
        price_cents: Math.round(price * 100),
        fee_cents: Math.round(fee * 100),
        duration_text: duration.trim() || null,
        is_active: true,
      };

      var res = await sb.from("services").insert(row).select("id").maybeSingle();
      if (res.error) {
        if (errEl) {
          errEl.textContent = res.error.message;
          errEl.hidden = false;
        }
        return;
      }

      window.location.reload();
    });
  });
})();
