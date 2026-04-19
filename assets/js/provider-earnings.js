/**
 * Provider: per-booking gross, platform fee, net; totals and pending to platform.
 */
(function () {
  "use strict";

  var P = window.homeEaseProvider;

  function qs(sel) {
    return document.querySelector(sel);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-provider-earnings]");
    if (!root || !P) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var sessionRes = await sb.auth.getSession();
    if (!sessionRes.data || !sessionRes.data.session) return;
    var uid = sessionRes.data.session.user.id;

    var tbody = root.querySelector("tbody");
    var sumEl = qs("[data-provider-earnings-net-total]");
    var pendingEl = qs("[data-provider-earnings-pending-fee]");

    if (!tbody) return;

    async function load() {
      var res = await sb
        .from("bookings")
        .select(
          "id, scheduled_date, status, total_cents, admin_commission_cents, admin_settled, services ( title )"
        )
        .eq("provider_id", uid)
        .order("created_at", { ascending: false })
        .limit(500);

      tbody.innerHTML = "";
      var netAll = 0;
      var pendingFee = 0;

      if (res.error) {
        tbody.innerHTML =
          '<tr><td colspan="6">' + P.escapeHtml(res.error.message) + "</td></tr>";
        return;
      }
      if (!res.data || !res.data.length) {
        tbody.innerHTML =
          '<tr><td colspan="6" style="color:var(--color-text-muted)">No bookings yet.</td></tr>';
        if (sumEl) sumEl.textContent = P.moneyCents(0);
        if (pendingEl) pendingEl.textContent = P.moneyCents(0);
        return;
      }

      res.data.forEach(function (b) {
        var total = Number(b.total_cents) || 0;
        var admin = Number(b.admin_commission_cents) || 0;
        var net = Math.max(0, total - admin);
        if (String(b.status) === "completed") {
          netAll += net;
        }
        if (!b.admin_settled) {
          pendingFee += admin;
        }
        var svc = b.services && b.services.title ? b.services.title : "—";
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          P.escapeHtml(String(b.scheduled_date)) +
          "</td>" +
          "<td>" +
          P.escapeHtml(svc) +
          "</td>" +
          "<td>" +
          P.moneyCents(total) +
          "</td>" +
          "<td>" +
          P.moneyCents(admin) +
          "</td>" +
          "<td><strong>" +
          P.moneyCents(net) +
          "</strong></td>" +
          "<td>" +
          (b.admin_settled
            ? '<span class="badge badge--verified">Paid to platform</span>'
            : '<span class="badge badge--pending">Owed to platform</span>') +
          "</td>";
        tbody.appendChild(tr);
      });

      if (sumEl) sumEl.textContent = P.moneyCents(netAll);
      if (pendingEl) pendingEl.textContent = P.moneyCents(pendingFee);
    }

    await load();
  });
})();
