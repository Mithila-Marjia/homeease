/**
 * Admin: list, create, and edit marketplace categories.
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
    var root = qs("[data-admin-categories]");
    if (!root || !A) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var tbody = root.querySelector("[data-admin-categories-list]");
    var form = qs("[data-admin-category-create]");
    var errEl = qs("[data-admin-category-error]");
    var slugInput = qs("#catSlug");
    var nameInput = qs("#catName");
    var sortInput = qs("#catSort");

    var editWrap = qs("[data-admin-category-edit-wrap]");
    var editForm = qs("[data-admin-category-edit]");
    var editErr = qs("[data-admin-category-edit-error]");
    var catEditId = qs("#catEditId");
    var catEditName = qs("#catEditName");
    var catEditSlug = qs("#catEditSlug");
    var catEditDesc = qs("#catEditDesc");
    var catEditSort = qs("#catEditSort");
    var editCancel = qs("[data-admin-category-edit-cancel]");
    var fillSlugEdit = qs("[data-fill-slug-edit-from-name]");

    if (!tbody) return;

    var categoryList = [];

    function hideEditPanel() {
      if (editWrap) editWrap.hidden = true;
      if (editErr) {
        editErr.hidden = true;
        editErr.textContent = "";
      }
      if (editForm) editForm.reset();
      if (catEditId) catEditId.value = "";
    }

    async function load() {
      var res = await sb
        .from("categories")
        .select("id, slug, name, description, sort_order, created_at")
        .order("sort_order", { ascending: true });

      tbody.innerHTML = "";
      categoryList = res.data || [];

      if (res.error) {
        tbody.innerHTML =
          '<tr><td colspan="6">' + A.escapeHtml(res.error.message) + "</td></tr>";
        return;
      }

      if (!categoryList.length) {
        tbody.innerHTML =
          '<tr><td colspan="6" style="color:var(--color-text-muted)">No categories yet. Add one below.</td></tr>';
        if (sortInput && !sortInput.value) sortInput.value = "1";
        return;
      }

      var maxSort = 0;
      categoryList.forEach(function (c) {
        if (typeof c.sort_order === "number" && c.sort_order > maxSort) {
          maxSort = c.sort_order;
        }
        var tr = document.createElement("tr");
        tr.dataset.categoryId = c.id;
        tr.innerHTML =
          "<td>" +
          A.escapeHtml(c.slug) +
          "</td><td><strong>" +
          A.escapeHtml(c.name) +
          "</strong></td><td style=\"max-width:14rem;font-size:0.8125rem;color:var(--color-text-muted)\">" +
          A.escapeHtml(c.description || "—") +
          "</td><td>" +
          A.escapeHtml(String(c.sort_order)) +
          "</td><td style=\"font-size:0.75rem;color:var(--color-text-muted)\">" +
          A.escapeHtml(String(c.created_at || "").slice(0, 10)) +
          '</td><td><button type="button" class="btn btn--secondary btn--sm js-admin-cat-edit">Edit</button></td>';
        tbody.appendChild(tr);
      });

      if (sortInput && !sortInput.value) {
        sortInput.value = String(maxSort + 1);
      }
    }

    await load();

    var fillSlugBtn = qs("[data-fill-slug-from-name]");
    if (fillSlugBtn && nameInput && slugInput) {
      fillSlugBtn.addEventListener("click", function () {
        slugInput.value = slugify(nameInput.value);
      });
    }

    if (fillSlugEdit && catEditName && catEditSlug) {
      fillSlugEdit.addEventListener("click", function () {
        catEditSlug.value = slugify(catEditName.value);
      });
    }

    if (editCancel) {
      editCancel.addEventListener("click", hideEditPanel);
    }

    tbody.addEventListener("click", function (e) {
      var btn = e.target.closest(".js-admin-cat-edit");
      if (!btn) return;
      var tr = btn.closest("tr");
      if (!tr || !tr.dataset.categoryId) return;
      var id = tr.dataset.categoryId;
      var c = categoryList.filter(function (x) {
        return x.id === id;
      })[0];
      if (!c) return;

      if (catEditId) catEditId.value = c.id;
      if (catEditName) catEditName.value = c.name || "";
      if (catEditSlug) catEditSlug.value = c.slug || "";
      if (catEditDesc) catEditDesc.value = c.description || "";
      if (catEditSort) catEditSort.value = String(c.sort_order != null ? c.sort_order : 0);
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

        var id = (catEditId && catEditId.value) || "";
        var name = (catEditName && catEditName.value) || "";
        var slug = slugify((catEditSlug && catEditSlug.value) || name);
        var desc = (catEditDesc && catEditDesc.value) || "";
        var sortStr = (catEditSort && catEditSort.value) || "0";
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
          .from("categories")
          .update({
            slug: slug,
            name: name.trim(),
            description: desc.trim() || null,
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
        var desc = qs("#catDesc") && qs("#catDesc").value;
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

        var ins = await sb.from("categories").insert({
          slug: slug,
          name: name.trim(),
          description: (desc && desc.trim()) || null,
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
        if (qs("#catDesc")) qs("#catDesc").value = "";
        if (sortInput) sortInput.value = "";
        await load();
      });
    }
  });
})();
