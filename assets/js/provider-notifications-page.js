/**
 * Provider: own notifications + mark read (RLS).
 */
(function () {
  "use strict";

  var P = window.homeEaseProvider;

  function qs(sel) {
    return document.querySelector(sel);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-provider-notifications-list]");
    if (!root || !P) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var tbody = root.querySelector("tbody");
    if (!tbody) return;

    async function load() {
      var res = await sb
        .from("notifications")
        .select("id, type, title, body, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      tbody.innerHTML = "";
      if (res.error) {
        tbody.innerHTML =
          '<tr><td colspan="4">' + P.escapeHtml(res.error.message) + "</td></tr>";
        return;
      }
      if (!res.data || !res.data.length) {
        tbody.innerHTML =
          '<tr><td colspan="4" style="color:var(--color-text-muted)">No notifications.</td></tr>';
        return;
      }

      res.data.forEach(function (n) {
        var tr = document.createElement("tr");
        tr.dataset.id = n.id;
        tr.innerHTML =
          "<td>" +
          P.escapeHtml(String(n.created_at || "").replace("T", " ").slice(0, 19)) +
          "</td>" +
          "<td>" +
          P.escapeHtml(n.type || "") +
          "</td>" +
          "<td><strong>" +
          P.escapeHtml(n.title || "") +
          "</strong><br /><small style=\"color:var(--color-text-muted)\">" +
          P.escapeHtml(n.body || "") +
          "</small></td>" +
          "<td>" +
          (n.read_at
            ? '<span class="badge badge--verified">Read</span>'
            : '<button type="button" class="btn btn--secondary btn--sm js-provider-mark-read" style="padding:0.35rem 0.65rem;font-size:0.75rem">Mark read</button>') +
          "</td>";
        tbody.appendChild(tr);
      });
    }

    await load();

    tbody.addEventListener("click", async function (e) {
      var btn = e.target.closest(".js-provider-mark-read");
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
