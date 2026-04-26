/**
 * Admin: list all services — edit, toggle active, delete (when no bookings).
 */
(function () {
  "use strict";

  var A = window.homeEaseAdmin;

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

  function takaToCents(takaStr) {
    var n = parseInt(String(takaStr || "").trim(), 10);
    if (isNaN(n) || n < 0) return null;
    return n * 100;
  }

  function centsToWholeTaka(c) {
    return String(Math.round((Number(c) || 0) / 100));
  }

  function fillSelectOptions(selectEl, items, getValue, getLabel, selectedValue) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    items.forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = getValue(item);
      opt.textContent = getLabel(item);
      if (selectedValue && getValue(item) === selectedValue) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);
    });
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-admin-services]");
    if (!root || !A) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var tbody = root.querySelector("tbody");
    if (!tbody) return;

    var editWrap = qs("[data-admin-service-edit-wrap]");
    var editForm = qs("[data-admin-service-edit]");
    var editErr = qs("[data-admin-service-edit-error]");
    var editCancel = qs("[data-admin-service-edit-cancel]");
    var fillSlugBtn = qs("[data-fill-service-slug-from-title]");

    var serviceEditId = qs("#serviceEditId");
    var serviceEditTitle = qs("#serviceEditTitle");
    var serviceEditSlug = qs("#serviceEditSlug");
    var serviceEditProvider = qs("#serviceEditProvider");
    var serviceEditCategory = qs("#serviceEditCategory");
    var serviceEditDesc = qs("#serviceEditDesc");
    var serviceEditDuration = qs("#serviceEditDuration");
    var serviceEditPriceTaka = qs("#serviceEditPriceTaka");
    var serviceEditImageUrl = qs("#serviceEditImageUrl");
    var serviceEditActive = qs("#serviceEditActive");

    var serviceList = [];
    var categoryRows = [];
    var providerRows = [];

    function hideEditPanel() {
      if (editWrap) editWrap.hidden = true;
      if (editErr) {
        editErr.hidden = true;
        editErr.textContent = "";
      }
      if (editForm) editForm.reset();
      if (serviceEditId) serviceEditId.value = "";
    }

    async function loadLookups() {
      var catRes = await sb
        .from("categories")
        .select("id, name")
        .order("sort_order", { ascending: true });
      categoryRows = !catRes.error && catRes.data ? catRes.data : [];

      var provRes = await sb
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "provider")
        .order("full_name", { ascending: true });
      providerRows = !provRes.error && provRes.data ? provRes.data : [];
    }

    async function load() {
      await loadLookups();

      var res = await sb
        .from("services")
        .select(
          "id, title, slug, is_active, price_cents, image_url, provider_id, category_id, description, duration_text, categories ( name )"
        )
        .order("created_at", { ascending: false })
        .limit(500);

      tbody.innerHTML = "";
      serviceList = res.data || [];

      if (res.error) {
        tbody.innerHTML =
          '<tr><td colspan="7">' + A.escapeHtml(res.error.message) + "</td></tr>";
        return;
      }

      if (!serviceList.length) {
        tbody.innerHTML =
          '<tr><td colspan="7" style="color:var(--color-text-muted)">No services yet.</td></tr>';
        return;
      }

      var provIds = [];
      serviceList.forEach(function (s) {
        if (s.provider_id) provIds.push(s.provider_id);
      });
      var uniqProv = Array.from(new Set(provIds));
      var profMap = {};
      if (uniqProv.length) {
        var pr = await sb.from("profiles").select("id, full_name, email").in("id", uniqProv);
        if (!pr.error && pr.data) {
          pr.data.forEach(function (p) {
            profMap[p.id] = p;
          });
        }
      }

      serviceList.forEach(function (s) {
        var prof = s.provider_id && profMap[s.provider_id];
        var provName = prof ? prof.full_name || prof.email || "—" : "—";
        var catName =
          s.categories && s.categories.name ? s.categories.name : "—";
        var tr = document.createElement("tr");
        tr.dataset.serviceId = s.id;
        tr.innerHTML =
          "<td>" +
          (s.image_url
            ? '<img src="' +
              A.escapeHtml(s.image_url) +
              '" alt="" width="40" height="40" style="object-fit:cover;border-radius:8px" />'
            : "—") +
          "</td><td>" +
          A.escapeHtml(s.title) +
          "</td><td>" +
          A.escapeHtml(provName) +
          "</td><td>" +
          A.escapeHtml(catName) +
          "</td><td>" +
          A.moneyCents(s.price_cents) +
          '</td><td><span class="badge ' +
          (s.is_active ? "badge--verified" : "badge--pending") +
          '">' +
          (s.is_active ? "Visible" : "Hidden") +
          '</span></td><td style="white-space:nowrap;display:flex;flex-wrap:wrap;gap:0.35rem">' +
          '<button type="button" class="btn btn--secondary btn--sm js-admin-service-edit">Edit</button>' +
          '<button type="button" class="btn btn--secondary btn--sm js-admin-service-toggle">' +
          (s.is_active ? "Hide" : "Show") +
          '</button><button type="button" class="btn btn--outline btn--sm js-admin-service-remove" style="color:#b91c1c;border-color:rgba(185,28,28,0.45)">Remove</button></td>';
        tbody.appendChild(tr);
      });
    }

    await load();

    if (fillSlugBtn && serviceEditTitle && serviceEditSlug) {
      fillSlugBtn.addEventListener("click", function () {
        serviceEditSlug.value = slugify(serviceEditTitle.value);
      });
    }

    if (editCancel) {
      editCancel.addEventListener("click", hideEditPanel);
    }

    if (editForm) {
      editForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (editErr) {
          editErr.hidden = true;
          editErr.textContent = "";
        }

        var id = (serviceEditId && serviceEditId.value) || "";
        var title = (serviceEditTitle && serviceEditTitle.value) || "";
        var slug = slugify((serviceEditSlug && serviceEditSlug.value) || title);
        var providerId =
          (serviceEditProvider && serviceEditProvider.value) || "";
        var categoryId =
          (serviceEditCategory && serviceEditCategory.value) || "";
        var desc = (serviceEditDesc && serviceEditDesc.value) || "";
        var durationText =
          (serviceEditDuration && serviceEditDuration.value) || "";
        var priceCents = takaToCents(
          serviceEditPriceTaka && serviceEditPriceTaka.value
        );
        var imageUrl = (serviceEditImageUrl && serviceEditImageUrl.value) || "";
        var isActive = serviceEditActive && serviceEditActive.checked;

        if (!id || !title.trim() || !slug || !providerId || !categoryId) {
          if (editErr) {
            editErr.textContent =
              "Title, slug, provider, and category are required.";
            editErr.hidden = false;
          }
          return;
        }

        if (priceCents == null) {
          if (editErr) {
            editErr.textContent = "Enter a valid whole-taka amount for price.";
            editErr.hidden = false;
          }
          return;
        }

        var upd = await sb
          .from("services")
          .update({
            title: title.trim(),
            slug: slug,
            provider_id: providerId,
            category_id: categoryId,
            description: desc.trim() || null,
            duration_text: durationText.trim() || null,
            price_cents: priceCents,
            fee_cents: 0,
            image_url: imageUrl.trim() || null,
            is_active: isActive,
          })
          .eq("id", id);

        if (upd.error) {
          if (editErr) {
            editErr.textContent = upd.error.message;
            editErr.hidden = false;
          }
          return;
        }

        hideEditPanel();
        await load();
      });
    }

    tbody.addEventListener("click", async function (e) {
      var editBtn = e.target.closest(".js-admin-service-edit");
      var toggleBtn = e.target.closest(".js-admin-service-toggle");
      var removeBtn = e.target.closest(".js-admin-service-remove");
      var tr =
        (editBtn || toggleBtn || removeBtn) &&
        (editBtn || toggleBtn || removeBtn).closest("tr");
      if (!tr || !tr.dataset.serviceId) return;
      var sid = tr.dataset.serviceId;

      if (editBtn) {
        var s = serviceList.filter(function (x) {
          return x.id === sid;
        })[0];
        if (!s) return;

        fillSelectOptions(
          serviceEditCategory,
          categoryRows,
          function (c) {
            return c.id;
          },
          function (c) {
            return c.name;
          },
          s.category_id
        );
        fillSelectOptions(
          serviceEditProvider,
          providerRows,
          function (p) {
            return p.id;
          },
          function (p) {
            return (p.full_name && p.full_name.trim()) || p.email || p.id;
          },
          s.provider_id
        );

        if (serviceEditId) serviceEditId.value = s.id;
        if (serviceEditTitle) serviceEditTitle.value = s.title || "";
        if (serviceEditSlug) serviceEditSlug.value = s.slug || "";
        if (serviceEditDesc) serviceEditDesc.value = s.description || "";
        if (serviceEditDuration) serviceEditDuration.value = s.duration_text || "";
        if (serviceEditPriceTaka) {
          serviceEditPriceTaka.value = centsToWholeTaka(s.price_cents);
        }
        if (serviceEditImageUrl) serviceEditImageUrl.value = s.image_url || "";
        if (serviceEditActive) serviceEditActive.checked = !!s.is_active;

        if (editWrap) {
          editWrap.hidden = false;
          editWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        if (editErr) {
          editErr.hidden = true;
          editErr.textContent = "";
        }
        return;
      }

      if (toggleBtn) {
        var cur = await sb
          .from("services")
          .select("is_active")
          .eq("id", sid)
          .maybeSingle();
        if (cur.error || !cur.data) return;
        var up = await sb
          .from("services")
          .update({ is_active: !cur.data.is_active })
          .eq("id", sid);
        if (up.error) {
          window.alert(up.error.message);
          return;
        }
        await load();
        return;
      }

      if (removeBtn) {
        if (
          !window.confirm(
            "Remove this service permanently? This cannot be undone if there are no bookings blocking delete."
          )
        ) {
          return;
        }
        var cnt = await sb
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("service_id", sid);
        var n = cnt.count != null ? cnt.count : 0;
        if (n > 0) {
          window.alert(
            "This service has " +
              n +
              " booking(s). Hide it instead, or resolve bookings before removal."
          );
          return;
        }
        var del = await sb.from("services").delete().eq("id", sid);
        if (del.error) {
          window.alert(del.error.message);
          return;
        }
        hideEditPanel();
        await load();
      }
    });
  });
})();
