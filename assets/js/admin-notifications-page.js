/**
 * Admin: view all notifications (RLS allows admin) + mark read.
 */
(function () {
  "use strict";

  var A = window.homeEaseAdmin;

  function qs(sel) {
    return document.querySelector(sel);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-admin-notifications-list]");
    if (!root || !A) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var tbody = root.querySelector("tbody");
    if (!tbody) return;

    async function load() {
      var res = await sb
        .from("notifications")
        .select("id, type, title, body, read_at, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(300);

      tbody.innerHTML = "";
      if (res.error) {
        tbody.innerHTML =
          '<tr><td colspan="5">' + A.escapeHtml(res.error.message) + "</td></tr>";
        return;
      }

      if (!res.data || !res.data.length) {
        tbody.innerHTML =
          '<tr><td colspan="5" style="color:var(--color-text-muted)">No notifications.</td></tr>';
        return;
      }

      res.data.forEach(function (n) {
        var who = n.user_id ? String(n.user_id).slice(0, 8) + "…" : "—";
        var tr = document.createElement("tr");
        tr.dataset.id = n.id;
        tr.innerHTML =
          "<td>" +
          A.escapeHtml(String(n.created_at || "").replace("T", " ").slice(0, 19)) +
          "</td>" +
          "<td>" +
          A.escapeHtml(n.type || "") +
          "</td>" +
          "<td><strong>" +
          A.escapeHtml(n.title || "") +
          "</strong><br /><small style=\"color:var(--color-text-muted)\">" +
          A.escapeHtml(n.body || "") +
          "</small></td>" +
          "<td>" +
          A.escapeHtml(String(who)) +
          "</td>" +
          "<td>" +
          (n.read_at
            ? '<span class="badge badge--verified">Read</span>'
            : '<button type="button" class="btn btn--secondary btn--sm js-mark-read" style="padding:0.35rem 0.65rem;font-size:0.75rem">Mark read</button>') +
          "</td>";
        tbody.appendChild(tr);
      });
    }

    await load();

    tbody.addEventListener("click", async function (e) {
      var btn = e.target.closest(".js-mark-read");
      if (!btn) return;
      var tr = btn.closest("tr");
      if (!tr || !tr.dataset.id) return;
      var res = await sb
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", tr.dataset.id);
      if (res.error) {
        window.alert(res.error.message);
        return;
      }
      await load();
    });
  });
})();
