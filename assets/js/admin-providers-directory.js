/**
 * Admin: approved providers directory.
 */
(function () {
  "use strict";

  var A = window.homeEaseAdmin;

  function qs(sel) {
    return document.querySelector(sel);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-admin-providers-directory]");
    if (!root || !A) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var tbody = root.querySelector("tbody");
    if (!tbody) return;

    var res = await sb
      .from("profiles")
      .select("id, email, full_name, phone, experience_years, primary_category_id, created_at")
      .eq("role", "provider")
      .eq("provider_status", "approved")
      .order("full_name", { ascending: true });

    var cats = await sb.from("categories").select("id, name");
    var catMap = {};
    if (!cats.error && cats.data) {
      cats.data.forEach(function (c) {
        catMap[c.id] = c.name;
      });
    }

    tbody.innerHTML = "";
    if (res.error) {
      tbody.innerHTML =
        '<tr><td colspan="5">' + A.escapeHtml(res.error.message) + "</td></tr>";
      return;
    }

    if (!res.data || !res.data.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="color:var(--color-text-muted)">No approved providers yet.</td></tr>';
      return;
    }

    res.data.forEach(function (p) {
      var cat = p.primary_category_id && catMap[p.primary_category_id] ? catMap[p.primary_category_id] : "—";
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><strong>" +
        A.escapeHtml(p.full_name || p.email) +
        "</strong></td>" +
        "<td>" +
        A.escapeHtml(p.email) +
        "</td>" +
        "<td>" +
        A.escapeHtml(cat) +
        "</td>" +
        "<td>" +
        (p.experience_years != null ? A.escapeHtml(String(p.experience_years)) : "—") +
        "</td>" +
        '<td><span class="badge badge--verified">Approved</span></td>';
      tbody.appendChild(tr);
    });
  });
})();
