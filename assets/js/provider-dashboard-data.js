/**
 * Provider dashboard: list this provider's services and recent bookings from Supabase.
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

  document.addEventListener("DOMContentLoaded", async function () {
    var svcRoot = qs("[data-provider-services]");
    var bookRoot = qs("[data-provider-bookings]");
    if (!svcRoot && !bookRoot) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var sessionRes = await sb.auth.getSession();
    if (!sessionRes.data || !sessionRes.data.session) return;
    var uid = sessionRes.data.session.user.id;

    if (svcRoot) {
      var svcTbody = svcRoot.querySelector("tbody");
      var res = await sb
        .from("services")
        .select("id, title, slug, price_cents, fee_cents, is_active, categories ( name )")
        .eq("provider_id", uid)
        .order("created_at", { ascending: false });

      if (svcTbody) {
        svcTbody.innerHTML = "";
        if (res.error) {
          svcTbody.innerHTML =
            '<tr><td colspan="4">' + escapeHtml(res.error.message) + "</td></tr>";
        } else if (!res.data || !res.data.length) {
          svcTbody.innerHTML =
            '<tr><td colspan="4" style="color: var(--color-text-muted)">No services yet. Add one below.</td></tr>';
        } else {
          res.data.forEach(function (s) {
            var catName =
              s.categories && s.categories.name ? s.categories.name : "—";
            var price = (s.price_cents / 100).toFixed(0);
            var tr = document.createElement("tr");
            tr.innerHTML =
              "<td>" +
              escapeHtml(s.title) +
              "</td><td>" +
              escapeHtml(catName) +
              "</td><td>$" +
              escapeHtml(price) +
              '</td><td><span class="badge ' +
              (s.is_active ? "badge--verified" : "badge--pending") +
              '">' +
              (s.is_active ? "Active" : "Hidden") +
              "</span></td>";
            svcTbody.appendChild(tr);
          });
        }
      }
    }

    if (bookRoot) {
      var bookTbody = bookRoot.querySelector("tbody");
      var bres = await sb
        .from("bookings")
        .select(
          "scheduled_date, scheduled_time, status, services ( title ), customer:profiles!customer_id ( full_name )"
        )
        .eq("provider_id", uid)
        .order("scheduled_date", { ascending: false })
        .limit(12);

      if (bookTbody) {
        bookTbody.innerHTML = "";
        if (bres.error) {
          bookTbody.innerHTML =
            '<tr><td colspan="4">' + escapeHtml(bres.error.message) + "</td></tr>";
        } else if (!bres.data || !bres.data.length) {
          bookTbody.innerHTML =
            '<tr><td colspan="4" style="color: var(--color-text-muted)">No bookings yet.</td></tr>';
        } else {
          bres.data.forEach(function (b) {
            var cust =
              b.customer && b.customer.full_name ? b.customer.full_name : "Customer";
            var svc =
              b.services && b.services.title ? b.services.title : "Service";
            var st = String(b.status || "");
            var badge =
              st === "completed"
                ? "badge--verified"
                : st === "pending"
                  ? "badge--pending"
                  : "badge--active";
            var tr = document.createElement("tr");
            tr.innerHTML =
              '<td><div class="cell-flex"><img class="avatar avatar--sm" src="../assets/images/avatar-1.svg" alt="" /> ' +
              escapeHtml(cust) +
              "</div></td>" +
              "<td>" +
              escapeHtml(svc) +
              "</td>" +
              "<td>" +
              escapeHtml(String(b.scheduled_date)) +
              " · " +
              escapeHtml(String(b.scheduled_time)) +
              "</td>" +
              '<td><span class="badge ' +
              badge +
              '" style="text-transform:capitalize">' +
              escapeHtml(st) +
              "</span></td>";
            bookTbody.appendChild(tr);
          });
        }
      }
    }
  });
})();
