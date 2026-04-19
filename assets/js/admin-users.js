/**
 * Admin: browse / edit profiles (optional role filter via body[data-admin-users-role]).
 */
(function () {
  "use strict";

  var A = window.homeEaseAdmin;

  function qs(sel) {
    return document.querySelector(sel);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-admin-users]");
    if (!root || !A) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var tbody = root.querySelector("tbody");
    var filterRole = document.body.getAttribute("data-admin-users-role") || "";

    async function load() {
      var q = sb
        .from("profiles")
        .select("id, email, full_name, phone, role, provider_status, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filterRole) {
        q = q.eq("role", filterRole);
      }

      var res = await q;

      tbody.innerHTML = "";
      if (res.error) {
        tbody.innerHTML =
          '<tr><td colspan="6">' + A.escapeHtml(res.error.message) + "</td></tr>";
        return;
      }

      if (!res.data || !res.data.length) {
        tbody.innerHTML =
          '<tr><td colspan="6" style="color:var(--color-text-muted)">No users found.</td></tr>';
        return;
      }

      res.data.forEach(function (p) {
        var tr = document.createElement("tr");
        tr.dataset.id = p.id;
        var ps =
          p.role === "provider" && p.provider_status
            ? '<span class="badge badge--pending">' + A.escapeHtml(p.provider_status) + "</span>"
            : "—";
        tr.innerHTML =
          "<td>" +
          A.escapeHtml(p.full_name || "—") +
          "</td>" +
          "<td>" +
          A.escapeHtml(p.email) +
          "</td>" +
          "<td>" +
          A.escapeHtml(p.phone || "—") +
          "</td>" +
          '<td><span style="text-transform:capitalize">' +
          A.escapeHtml(p.role) +
          "</span></td>" +
          "<td>" +
          ps +
          "</td>" +
          '<td><button type="button" class="btn btn--secondary btn--sm js-edit-user" style="padding:0.35rem 0.65rem;font-size:0.75rem">Edit</button></td>';
        tbody.appendChild(tr);
      });
    }

    await load();

    root.addEventListener("click", async function (e) {
      var btn = e.target.closest(".js-edit-user");
      if (!btn) return;
      var tr = btn.closest("tr");
      if (!tr || !tr.dataset.id) return;

      var id = tr.dataset.id;
      var row = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
      if (row.error || !row.data) {
        window.alert(row.error ? row.error.message : "Not found");
        return;
      }

      var p = row.data;
      var name = window.prompt("Full name", p.full_name || "");
      if (name === null) return;
      var phone = window.prompt("Phone", p.phone || "");
      if (phone === null) return;

      var nextRole = p.role;
      if (p.role !== "admin") {
        var r = window.prompt("Role: customer, provider, or admin (careful)", p.role);
        if (r === null) return;
        r = String(r).trim().toLowerCase();
        if (["customer", "provider", "admin"].indexOf(r) >= 0) nextRole = r;
      }

      var upd = {
        full_name: name,
        phone: phone,
        role: nextRole,
      };

      if (nextRole === "provider" && !p.provider_status) {
        upd.provider_status = "pending";
      }
      if (nextRole !== "provider") {
        upd.provider_status = null;
      }

      var res = await sb.from("profiles").update(upd).eq("id", id);
      if (res.error) {
        window.alert(res.error.message);
        return;
      }
      await load();
    });
  });
})();
