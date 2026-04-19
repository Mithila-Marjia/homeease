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

  async function loadPending(sb) {
    var res = await sb
      .from("profiles")
      .select("id, email, full_name, phone, experience_years, primary_category_id, provider_status")
      .eq("role", "provider")
      .eq("provider_status", "pending")
      .order("created_at", { ascending: true });

    if (res.error) {
      console.error(res.error);
      return { error: res.error.message, rows: [] };
    }

    return { error: null, rows: res.data || [] };
  }

  function render(tbody, rows, catMap) {
    tbody.innerHTML = "";
    if (!rows.length) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td colspan="5" style="padding:1rem; color: var(--color-text-muted)">No pending provider applications.</td>';
      tbody.appendChild(tr);
      return;
    }

    rows.forEach(function (p) {
      var cat = p.primary_category_id && catMap[p.primary_category_id];
      var catLabel = cat ? cat.name : "—";
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td><div class="cell-flex"><img class="avatar avatar--sm" src="../assets/images/avatar-2.svg" alt="" /><span><strong>' +
        escapeHtml(p.full_name || p.email) +
        "</strong><br /><small style=\"color: var(--color-text-muted)\">" +
        escapeHtml(catLabel) +
        "</small></span></div></td>" +
        '<td><span class="badge badge--pending">Pending</span></td>' +
        "<td>—</td>" +
        "<td>—</td>" +
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
        '<tr><td colspan="5">' + escapeHtml(first.error) + "</td></tr>";
      return;
    }
    render(tbody, first.rows, catMap);

    root.addEventListener("click", async function (e) {
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
