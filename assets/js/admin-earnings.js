/**
 * Admin: pending platform commission per provider + mark received (settles bookings for that provider).
 */
(function () {
  "use strict";

  var A = window.homeEaseAdmin;

  function qs(sel) {
    return document.querySelector(sel);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-admin-earnings]");
    if (!root || !A) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var tbody = root.querySelector("tbody");
    var totalEl = qs("[data-admin-earnings-total]");

    async function load() {
      var res = await sb
        .from("bookings")
        .select("id, provider_id, admin_commission_cents")
        .eq("admin_settled", false);

      tbody.innerHTML = "";

      if (res.error) {
        tbody.innerHTML =
          '<tr><td colspan="4">' + A.escapeHtml(res.error.message) + "</td></tr>";
        return;
      }

      var rows = res.data || [];
      var by = {};
      var total = 0;

      rows.forEach(function (b) {
        var pid = b.provider_id;
        if (!pid) return;
        if (!by[pid]) {
          by[pid] = { cents: 0, count: 0 };
        }
        by[pid].cents += Number(b.admin_commission_cents) || 0;
        by[pid].count += 1;
        total += Number(b.admin_commission_cents) || 0;
      });

      var ids = Object.keys(by);
      var profMap = {};
      if (ids.length) {
        var pr = await sb.from("profiles").select("id, full_name, email").in("id", ids);
        if (!pr.error && pr.data) {
          pr.data.forEach(function (p) {
            profMap[p.id] = p;
          });
        }
      }

      if (totalEl) totalEl.textContent = A.moneyCents(total);

      var keys = Object.keys(by).sort();
      if (!keys.length) {
        tbody.innerHTML =
          '<tr><td colspan="4" style="color:var(--color-text-muted)">No pending admin commission. Great job settling up!</td></tr>';
        return;
      }

      keys.forEach(function (pid) {
        var pack = by[pid];
        var p = profMap[pid] || {};
        var label = p.full_name || p.email || pid;
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td><strong>" +
          A.escapeHtml(String(label)) +
          "</strong><br /><small style=\"color:var(--color-text-muted)\">" +
          A.escapeHtml(p.email || "") +
          "</small></td>" +
          "<td>" +
          A.moneyCents(pack.cents) +
          "</td>" +
          "<td>" +
          pack.count +
          " booking(s)</td>" +
          '<td><button type="button" class="btn btn--primary btn--sm js-received" data-provider-id="' +
          A.escapeHtml(pid) +
          '" style="padding:0.4rem 0.75rem;font-size:0.8rem">Received from provider</button></td>';
        tbody.appendChild(tr);
      });
    }

    await load();

    root.addEventListener("click", async function (e) {
      var btn = e.target.closest(".js-received");
      if (!btn) return;
      var pid = btn.getAttribute("data-provider-id");
      if (!pid) return;
      if (
        !window.confirm(
          "Mark all unsettled admin commission from this provider as received? This resets pending totals for them."
        )
      ) {
        return;
      }

      var res = await sb
        .from("bookings")
        .update({ admin_settled: true })
        .eq("provider_id", pid)
        .eq("admin_settled", false);

      if (res.error) {
        window.alert(res.error.message);
        return;
      }

      await load();
    });
  });
})();
