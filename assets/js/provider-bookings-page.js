/**
 * Provider: all bookings for this provider with status updates.
 */
(function () {
  "use strict";

  var P = window.homeEaseProvider;

  function qs(sel) {
    return document.querySelector(sel);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-provider-bookings-page]");
    if (!root || !P) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var sessionRes = await sb.auth.getSession();
    if (!sessionRes.data || !sessionRes.data.session) return;
    var uid = sessionRes.data.session.user.id;

    var tbody = root.querySelector("tbody");
    if (!tbody) return;

    async function load() {
      var res = await sb
        .from("bookings")
        .select(
          "id, customer_id, scheduled_date, scheduled_time, status, address, notes, total_cents, admin_commission_cents, services ( title )"
        )
        .eq("provider_id", uid)
        .order("created_at", { ascending: false })
        .limit(300);

      tbody.innerHTML = "";
      if (res.error) {
        tbody.innerHTML =
          '<tr><td colspan="7">' + P.escapeHtml(res.error.message) + "</td></tr>";
        return;
      }
      if (!res.data || !res.data.length) {
        tbody.innerHTML =
          '<tr><td colspan="7" style="color:var(--color-text-muted)">No bookings yet.</td></tr>';
        return;
      }

      var ids = [];
      res.data.forEach(function (b) {
        if (b.customer_id) ids.push(b.customer_id);
      });
      var uniq = Array.from(new Set(ids));
      var profMap = {};
      if (uniq.length) {
        var pr = await sb.from("profiles").select("id, full_name, phone").in("id", uniq);
        if (!pr.error && pr.data) {
          pr.data.forEach(function (p) {
            profMap[p.id] = p;
          });
        }
      }

      res.data.forEach(function (b) {
        var c = b.customer_id && profMap[b.customer_id];
        var cust = c ? c.full_name || "Customer" : "—";
        var svc = b.services && b.services.title ? b.services.title : "—";
        var tr = document.createElement("tr");
        tr.dataset.bookingId = b.id;
        tr.innerHTML =
          "<td>" +
          P.escapeHtml(String(b.scheduled_date)) +
          " · " +
          P.escapeHtml(String(b.scheduled_time)) +
          "</td>" +
          "<td>" +
          P.escapeHtml(svc) +
          "</td>" +
          "<td>" +
          P.escapeHtml(cust) +
          "</td>" +
          "<td>" +
          P.moneyCents(b.total_cents) +
          "</td>" +
          "<td>" +
          P.moneyCents(b.admin_commission_cents) +
          "</td>" +
          '<td><select class="select select--pill js-provider-booking-status" style="min-width:7rem;text-transform:capitalize">' +
          ["pending", "confirmed", "completed", "cancelled"]
            .map(function (sopt) {
              return (
                '<option value="' +
                sopt +
                '"' +
                (b.status === sopt ? " selected" : "") +
                ">" +
                sopt +
                "</option>"
              );
            })
            .join("") +
          "</select></td>" +
          "<td><small style=\"color:var(--color-text-muted)\">" +
          P.escapeHtml((b.notes || "").slice(0, 80)) +
          (b.notes && b.notes.length > 80 ? "…" : "") +
          "</small></td>";
        tbody.appendChild(tr);
      });
    }

    await load();

    tbody.addEventListener("change", async function (e) {
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
        await load();
      }
    });
  });
})();
