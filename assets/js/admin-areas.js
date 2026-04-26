/**
 * Admin: list, create, and edit coverage areas (customer marketplace filter + provider assignment).
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

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-admin-areas]");
    if (!root || !A) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var tbody = root.querySelector("[data-admin-areas-list]");
    var form = qs("[data-admin-area-create]");
    var errEl = qs("[data-admin-area-error]");
    var slugInput = qs("#areaSlug");
    var nameInput = qs("#areaName");
    var sortInput = qs("#areaSort");

    var editWrap = qs("[data-admin-area-edit-wrap]");
    var editForm = qs("[data-admin-area-edit]");
    var editErr = qs("[data-admin-area-edit-error]");
    var areaEditId = qs("#areaEditId");
    var areaEditName = qs("#areaEditName");
    var areaEditSlug = qs("#areaEditSlug");
    var areaEditSort = qs("#areaEditSort");
    var editCancel = qs("[data-admin-area-edit-cancel]");
    var fillSlugEdit = qs("[data-fill-area-slug-edit-from-name]");

    if (!tbody) return;

    var areaList = [];

    function hideEditPanel() {
      if (editWrap) editWrap.hidden = true;
      if (editErr) {
        editErr.hidden = true;
        editErr.textContent = "";
      }
      if (editForm) editForm.reset();
      if (areaEditId) areaEditId.value = "";
    }

    async function load() {
      var res = await sb
        .from("coverage_areas")
        .select("id, slug, name, sort_order, created_at")
        .order("sort_order", { ascending: true });

      tbody.innerHTML = "";
      areaList = res.data || [];

      if (res.error) {
        tbody.innerHTML =
          '<tr><td colspan="5">' + A.escapeHtml(res.error.message) + "</td></tr>";
        return;
      }

      if (!areaList.length) {
        tbody.innerHTML =
          '<tr><td colspan="5" style="color:var(--color-text-muted)">No coverage areas yet. Add one below.</td></tr>';
        if (sortInput && !sortInput.value) sortInput.value = "1";
        return;
      }

      var maxSort = 0;
      areaList.forEach(function (a) {
        if (typeof a.sort_order === "number" && a.sort_order > maxSort) {
          maxSort = a.sort_order;
        }
        var tr = document.createElement("tr");
        tr.dataset.areaId = a.id;
        tr.innerHTML =
          "<td>" +
          A.escapeHtml(a.slug) +
          "</td><td><strong>" +
          A.escapeHtml(a.name) +
          "</strong></td><td>" +
          A.escapeHtml(String(a.sort_order)) +
          "</td><td style=\"font-size:0.75rem;color:var(--color-text-muted)\">" +
          A.escapeHtml(String(a.created_at || "").slice(0, 10)) +
          '</td><td><button type="button" class="btn btn--secondary btn--sm js-admin-area-edit">Edit</button></td>';
        tbody.appendChild(tr);
      });

      if (sortInput && !sortInput.value) {
        sortInput.value = String(maxSort + 1);
      }
    }

    await load();

    var fillSlugBtn = qs("[data-fill-area-slug-from-name]");
    if (fillSlugBtn && nameInput && slugInput) {
      fillSlugBtn.addEventListener("click", function () {
        slugInput.value = slugify(nameInput.value);
      });
    }

    if (fillSlugEdit && areaEditName && areaEditSlug) {
      fillSlugEdit.addEventListener("click", function () {
        areaEditSlug.value = slugify(areaEditName.value);
      });
    }

    if (editCancel) {
      editCancel.addEventListener("click", hideEditPanel);
    }

    tbody.addEventListener("click", function (e) {
      var btn = e.target.closest(".js-admin-area-edit");
      if (!btn) return;
      var tr = btn.closest("tr");
      if (!tr || !tr.dataset.areaId) return;
      var id = tr.dataset.areaId;
      var a = areaList.filter(function (x) {
        return x.id === id;
      })[0];
      if (!a) return;

      if (areaEditId) areaEditId.value = a.id;
      if (areaEditName) areaEditName.value = a.name || "";
      if (areaEditSlug) areaEditSlug.value = a.slug || "";
      if (areaEditSort) areaEditSort.value = String(a.sort_order != null ? a.sort_order : 0);
      if (editWrap) {
        editWrap.hidden = false;
        editWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      if (editErr) {
        editErr.hidden = true;
        editErr.textContent = "";
      }
    });

    if (editForm) {
      editForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (editErr) {
          editErr.hidden = true;
          editErr.textContent = "";
        }

        var id = (areaEditId && areaEditId.value) || "";
        var name = (areaEditName && areaEditName.value) || "";
        var slug = slugify((areaEditSlug && areaEditSlug.value) || name);
        var sortStr = (areaEditSort && areaEditSort.value) || "0";
        var sortOrder = parseInt(sortStr, 10);
        if (isNaN(sortOrder)) sortOrder = 0;

        if (!id || !name.trim() || !slug) {
          if (editErr) {
            editErr.textContent = "Name and URL slug are required.";
            editErr.hidden = false;
          }
          return;
        }

        var upd = await sb
          .from("coverage_areas")
          .update({
            slug: slug,
            name: name.trim(),
            sort_order: sortOrder,
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

    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (errEl) {
          errEl.hidden = true;
          errEl.textContent = "";
        }

        var name = (nameInput && nameInput.value) || "";
        var slugRaw = (slugInput && slugInput.value) || "";
        var slug = slugify(slugRaw || name);
        var sortStr = (sortInput && sortInput.value) || "0";
        var sortOrder = parseInt(sortStr, 10);
        if (isNaN(sortOrder)) sortOrder = 0;

        if (!name.trim() || !slug) {
          if (errEl) {
            errEl.textContent = "Name and URL slug are required.";
            errEl.hidden = false;
          }
          return;
        }

        var ins = await sb.from("coverage_areas").insert({
          slug: slug,
          name: name.trim(),
          sort_order: sortOrder,
        });

        if (ins.error) {
          if (errEl) {
            errEl.textContent = ins.error.message;
            errEl.hidden = false;
          }
          return;
        }

        if (nameInput) nameInput.value = "";
        if (slugInput) slugInput.value = "";
        if (sortInput) sortInput.value = "";
        await load();
      });
    }
  });
})();
