/**
 * Admin dashboard: list pending provider applications and approve / reject.
 */
(function () {
  "use strict";

  function qs(sel) {
    return document.querySelector(sel);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function loadCategories(sb) {
    var res = await sb.from("categories").select("id, name, slug").order("sort_order");
    if (res.error || !res.data) return {};
    var map = {};
    res.data.forEach(function (c) {
      map[c.id] = c;
    });
    return map;
  }

  function missingLicenseColumn(err) {
    if (!err || !err.message) return false;
    var m = String(err.message).toLowerCase();
    return m.indexOf("provider_license_files") !== -1 && m.indexOf("does not exist") !== -1;
  }

  async function loadPending(sb) {
    var full =
      "id, email, full_name, phone, experience_years, primary_category_id, provider_status, provider_license_files";
    var minimal =
      "id, email, full_name, phone, experience_years, primary_category_id, provider_status";

    var migrationPending = false;
    var res = await sb
      .from("profiles")
      .select(full)
      .eq("role", "provider")
      .eq("provider_status", "pending")
      .order("created_at", { ascending: true });

    if (res.error && missingLicenseColumn(res.error)) {
      migrationPending = true;
      res = await sb
        .from("profiles")
        .select(minimal)
        .eq("role", "provider")
        .eq("provider_status", "pending")
        .order("created_at", { ascending: true });
    }

    if (res.error) {
      console.error(res.error);
      return { error: res.error.message, rows: [] };
    }

    var rows = res.data || [];
    rows.forEach(function (p) {
      if (p.provider_license_files === undefined) {
        p.provider_license_files = [];
      }
    });

    return { error: null, rows: rows, migrationPending: migrationPending };
  }

  function render(tbody, rows, catMap) {
    tbody.innerHTML = "";
    if (!rows.length) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td colspan="4" style="padding:1rem; color: var(--color-text-muted)">No pending provider applications.</td>';
      tbody.appendChild(tr);
      return;
    }

    rows.forEach(function (p) {
      var cat = p.primary_category_id && catMap[p.primary_category_id];
      var catLabel = cat ? cat.name : "—";
      var files = p.provider_license_files;
      var docButtons = "";
      if (Array.isArray(files) && files.length) {
        files.forEach(function (f, idx) {
          var path = typeof f === "string" ? f : f && f.path;
          var lbl =
            typeof f === "object" && f && f.name
              ? String(f.name).slice(0, 28)
              : "Document " + (idx + 1);
          if (!path) return;
          docButtons +=
            '<button type="button" class="btn btn--ghost js-license-doc" data-path="' +
            escapeHtml(path) +
            '" style="padding:0.2rem 0.45rem;font-size:0.7rem;margin:0.1rem;display:inline-block">' +
            escapeHtml(lbl) +
            "</button> ";
        });
      }
      if (!docButtons) {
        docButtons = '<span style="color:var(--color-text-muted)">None</span>';
      }
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td><div class="cell-flex"><img class="avatar avatar--sm" src="../assets/images/avatar-2.svg" alt="" /><span><strong>' +
        escapeHtml(p.full_name || p.email) +
        "</strong><br /><small style=\"color: var(--color-text-muted)\">" +
        escapeHtml(catLabel) +
        "</small></span></div></td>" +
        '<td><span class="badge badge--pending">Pending</span></td>' +
        "<td>" +
        docButtons +
        "</td>" +
        '<td><button type="button" class="btn btn--secondary js-approve" data-id="' +
        escapeHtml(p.id) +
        '" style="padding: 0.35rem 0.65rem; font-size: 0.75rem">Approve</button> ' +
        '<button type="button" class="btn btn--ghost js-reject" data-id="' +
        escapeHtml(p.id) +
        '" style="padding: 0.35rem 0.65rem; font-size: 0.75rem">Reject</button></td>';
      tbody.appendChild(tr);
    });
  }

  async function setStatus(sb, id, status) {
    var res = await sb.from("profiles").update({ provider_status: status }).eq("id", id);
    if (res.error) {
      window.alert(res.error.message);
      return false;
    }
    return true;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-admin-pending-providers]");
    if (!root) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var tbody = root.querySelector("tbody");
    if (!tbody) return;

    var catMap = await loadCategories(sb);
    var first = await loadPending(sb);
    if (first.error) {
      tbody.innerHTML =
        '<tr><td colspan="4">' + escapeHtml(first.error) + "</td></tr>";
      return;
    }

    if (first.migrationPending) {
      var existing = root.querySelector("[data-migration-hint]");
      if (!existing) {
        var hint = document.createElement("p");
        hint.setAttribute("data-migration-hint", "");
        hint.style.cssText =
          "margin:0 0 0.75rem;font-size:0.8125rem;color:#b45309;max-width:52rem";
        hint.textContent =
          "Database migration not applied: license files column is missing. Approve/reject works below. Run supabase/migrations/20260423120000_provider_license_storage.sql in the Supabase SQL Editor to enable document links.";
        root.insertBefore(hint, root.firstChild);
      }
    }

    render(tbody, first.rows, catMap);

    root.addEventListener("click", async function (e) {
      var docBtn = e.target && e.target.closest && e.target.closest(".js-license-doc");
      if (docBtn && docBtn.getAttribute) {
        e.preventDefault();
        var path = docBtn.getAttribute("data-path");
        if (!path) return;
        var signed = await sb.storage.from("provider-documents").createSignedUrl(path, 600);
        if (signed.error) {
          window.alert(signed.error.message);
          return;
        }
        if (signed.data && signed.data.signedUrl) {
          window.open(signed.data.signedUrl, "_blank", "noopener,noreferrer");
        }
        return;
      }

      var t = e.target;
      if (!t || !t.getAttribute) return;
      var id = t.getAttribute("data-id");
      if (!id) return;

      if (t.classList.contains("js-approve")) {
        var ok = await setStatus(sb, id, "approved");
        if (!ok) return;
      } else if (t.classList.contains("js-reject")) {
        if (!window.confirm("Reject this provider application?")) return;
        var ok2 = await setStatus(sb, id, "rejected");
        if (!ok2) return;
      } else {
        return;
      }

      var again = await loadPending(sb);
      render(tbody, again.rows, catMap);
    });
  });
})();
