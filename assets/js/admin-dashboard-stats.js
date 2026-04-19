/**
 * Admin overview: counts + pending provider requests preview.
 */
(function () {
  "use strict";

  var A = window.homeEaseAdmin;

  function qs(sel) {
    return document.querySelector(sel);
  }

  function setText(sel, text) {
    var el = typeof sel === "string" ? qs(sel) : sel;
    if (el) el.textContent = text;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    if (!qs("[data-admin-dashboard-stats]")) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb || !A) return;

    var customers = await sb.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer");
    var providers = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "provider")
      .eq("provider_status", "approved");
    var pendingProv = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "provider")
      .eq("provider_status", "pending");
    var bookings = await sb.from("bookings").select("id", { count: "exact", head: true });

    var pendingCentsRes = await sb
      .from("bookings")
      .select("admin_commission_cents")
      .eq("admin_settled", false);

    var pendingAdmin = 0;
    var pendingLabel = "—";
    if (pendingCentsRes.error) {
      pendingLabel = "Run DB migration";
    } else if (pendingCentsRes.data) {
      pendingCentsRes.data.forEach(function (r) {
        pendingAdmin += Number(r.admin_commission_cents) || 0;
      });
      pendingLabel = A.moneyCents(pendingAdmin);
    }

    setText("[data-stat-customers]", String(customers.count || 0));
    setText("[data-stat-providers]", String(providers.count || 0));
    setText("[data-stat-bookings]", String(bookings.count || 0));
    setText("[data-stat-pending-providers]", String(pendingProv.count || 0));
    setText("[data-stat-pending-admin]", pendingLabel);

    var tbody = qs("[data-admin-dashboard-pending-preview] tbody");
    if (tbody) {
      var list = await sb
        .from("profiles")
        .select("id, email, full_name, primary_category_id, created_at")
        .eq("role", "provider")
        .eq("provider_status", "pending")
        .order("created_at", { ascending: true })
        .limit(5);

      tbody.innerHTML = "";
      if (list.error) {
        tbody.innerHTML =
          '<tr><td colspan="3">' + A.escapeHtml(list.error.message) + "</td></tr>";
      } else if (!list.data || !list.data.length) {
        tbody.innerHTML =
          '<tr><td colspan="3" style="color:var(--color-text-muted)">No pending applications.</td></tr>';
      } else {
        list.data.forEach(function (p) {
          var tr = document.createElement("tr");
          tr.innerHTML =
            "<td><strong>" +
            A.escapeHtml(p.full_name || p.email) +
            "</strong><br /><small style=\"color:var(--color-text-muted)\">" +
            A.escapeHtml(p.email) +
            "</small></td>" +
            '<td><span class="badge badge--pending">Pending</span></td>' +
            '<td><a class="btn btn--secondary" style="padding:0.35rem 0.65rem;font-size:0.75rem" href="provider-requests.html">Review</a></td>';
          tbody.appendChild(tr);
        });
      }
    }
  });
})();
