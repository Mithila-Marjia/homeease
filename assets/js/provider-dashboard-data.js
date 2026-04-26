/**
 * Provider dashboard: services table (toggle active), bookings with status updates.
 */
(function () {
  "use strict";

  var P = window.homeEaseProvider;

  function qs(sel) {
    return document.querySelector(sel);
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

    async function loadServices() {
      if (!svcRoot) return;
      var svcTbody = svcRoot.querySelector("tbody");
      if (!svcTbody) return;

      var res = await sb
        .from("services")
        .select("id, title, slug, price_cents, is_active, image_url, categories ( name )")
        .eq("provider_id", uid)
        .order("created_at", { ascending: false });

      svcTbody.innerHTML = "";
      if (res.error) {
        svcTbody.innerHTML =
          '<tr><td colspan="6">' + (P ? P.escapeHtml(res.error.message) : res.error.message) + "</td></tr>";
        return;
      }
      if (!res.data || !res.data.length) {
        svcTbody.innerHTML =
          '<tr><td colspan="6" style="color: var(--color-text-muted)">No services yet. Add one below.</td></tr>';
        return;
      }

      res.data.forEach(function (s) {
        var catName =
          s.categories && s.categories.name ? s.categories.name : "—";
        var priceLabel = P ? P.moneyCents(s.price_cents) : "৳ " + (s.price_cents / 100).toFixed(2);
        var tr = document.createElement("tr");
        tr.dataset.serviceId = s.id;
        tr.innerHTML =
          "<td>" +
          (s.image_url
            ? '<img src="' +
              (P ? P.escapeHtml(s.image_url) : s.image_url) +
              '" alt="" width="44" height="44" style="object-fit:cover;border-radius:8px" />'
            : "—") +
          "</td><td>" +
          (P ? P.escapeHtml(s.title) : s.title) +
          "</td><td>" +
          (P ? P.escapeHtml(catName) : catName) +
          "</td><td>" +
          priceLabel +
          '</td><td><span class="badge ' +
          (s.is_active ? "badge--verified" : "badge--pending") +
          '">' +
          (s.is_active ? "Active" : "Hidden") +
          '</span></td><td style="white-space:nowrap;display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center">' +
          '<a class="btn btn--secondary btn--sm" href="edit-service.html?id=' +
          encodeURIComponent(s.id) +
          '" style="padding:0.35rem 0.65rem;font-size:0.75rem;text-decoration:none">Edit</a>' +
          '<button type="button" class="btn btn--secondary btn--sm js-service-toggle" style="padding:0.35rem 0.65rem;font-size:0.75rem">' +
          (s.is_active ? "Hide" : "Show") +
          "</button></td>";
        svcTbody.appendChild(tr);
      });
    }

    async function loadBookings() {
      if (!bookRoot) return;
      var bookTbody = bookRoot.querySelector("tbody");
      if (!bookTbody) return;

      var bres = await sb
        .from("bookings")
        .select(
          "id, customer_id, scheduled_date, scheduled_time, status, total_cents, admin_commission_cents, services ( title )"
        )
        .eq("provider_id", uid)
        .order("scheduled_date", { ascending: false })
        .limit(12);

      bookTbody.innerHTML = "";
      if (bres.error) {
        bookTbody.innerHTML =
          '<tr><td colspan="4">' + (P ? P.escapeHtml(bres.error.message) : bres.error.message) + "</td></tr>";
        return;
      }
      if (!bres.data || !bres.data.length) {
        bookTbody.innerHTML =
          '<tr><td colspan="4" style="color: var(--color-text-muted)">No bookings yet.</td></tr>';
        return;
      }

      var custIds = [];
      bres.data.forEach(function (b) {
        if (b.customer_id) custIds.push(b.customer_id);
      });
      var uniq = Array.from(new Set(custIds));
      var profMap = {};
      if (uniq.length) {
        var pr = await sb.from("profiles").select("id, full_name").in("id", uniq);
        if (!pr.error && pr.data) {
          pr.data.forEach(function (p) {
            profMap[p.id] = p;
          });
        }
      }

      bres.data.forEach(function (b) {
        var cust =
          b.customer_id && profMap[b.customer_id] && profMap[b.customer_id].full_name
            ? profMap[b.customer_id].full_name
            : "Customer";
        var svc =
          b.services && b.services.title ? b.services.title : "Service";
        var st = String(b.status || "");
        var tr = document.createElement("tr");
        tr.dataset.bookingId = b.id;
        tr.innerHTML =
          '<td><div class="cell-flex"><img class="avatar avatar--sm" src="../assets/images/avatar-1.svg" alt="" /> ' +
          (P ? P.escapeHtml(cust) : cust) +
          "</div></td>" +
          "<td>" +
          (P ? P.escapeHtml(svc) : svc) +
          "</td>" +
          "<td>" +
          (P ? P.escapeHtml(String(b.scheduled_date)) : b.scheduled_date) +
          " · " +
          (P ? P.escapeHtml(String(b.scheduled_time)) : b.scheduled_time) +
          "</td>" +
          '<td><select class="select select--pill js-provider-booking-status" style="min-width:6.5rem;text-transform:capitalize">' +
          ["pending", "confirmed", "completed", "cancelled"]
            .map(function (sopt) {
              return (
                '<option value="' +
                sopt +
                '"' +
                (st === sopt ? " selected" : "") +
                ">" +
                sopt +
                "</option>"
              );
            })
            .join("") +
          "</select></td>";
        bookTbody.appendChild(tr);
      });
    }

    await loadServices();
    await loadBookings();

    var svcRootEl = svcRoot;
    if (svcRootEl) {
      svcRootEl.addEventListener("click", async function (e) {
        var btn = e.target.closest(".js-service-toggle");
        if (!btn) return;
        var tr = btn.closest("tr");
        if (!tr || !tr.dataset.serviceId) return;
        var row = await sb
          .from("services")
          .select("is_active")
          .eq("id", tr.dataset.serviceId)
          .eq("provider_id", uid)
          .maybeSingle();
        if (row.error || !row.data) return;
        var next = !row.data.is_active;
        var up = await sb
          .from("services")
          .update({ is_active: next })
          .eq("id", tr.dataset.serviceId)
          .eq("provider_id", uid);
        if (up.error) {
          window.alert(up.error.message);
          return;
        }
        await loadServices();
      });
    }

    if (bookRoot) {
      bookRoot.addEventListener("change", async function (e) {
        var sel = e.target.closest(".js-provider-booking-status");
        if (!sel) return;
        var tr = sel.closest("tr");
        if (!tr || !tr.dataset.bookingId) return;
        var res = await sb
          .from("bookings")
          .update({ status: sel.value })
          .eq("id", tr.dataset.bookingId)
          .eq("provider_id", uid);
        if (res.error) {
          window.alert(res.error.message);
          await loadBookings();
          return;
        }
        await loadBookings();
      });
    }
  });
})();
