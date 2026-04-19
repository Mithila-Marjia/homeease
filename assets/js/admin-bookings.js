/**
 * Admin: all bookings, edit status.
 */
(function () {
  "use strict";

  var A = window.homeEaseAdmin;

  function qs(sel) {
    return document.querySelector(sel);
  }

  function qsa(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-admin-bookings]");
    if (!root || !A) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var tbody = root.querySelector("tbody");
    if (!tbody) return;

    async function load() {
      var res = await sb
        .from("bookings")
        .select(
          "id, customer_id, provider_id, scheduled_date, scheduled_time, status, total_cents, admin_commission_cents, commission_percent_applied, admin_settled, services ( title )"
        )
        .order("created_at", { ascending: false })
        .limit(200);

      tbody.innerHTML = "";
      if (res.error) {
        tbody.innerHTML =
          '<tr><td colspan="8">' + A.escapeHtml(res.error.message) + "</td></tr>";
        return;
      }

      if (!res.data || !res.data.length) {
        tbody.innerHTML =
          '<tr><td colspan="8" style="color:var(--color-text-muted)">No bookings yet.</td></tr>';
        return;
      }

      var ids = [];
      res.data.forEach(function (b) {
        if (b.customer_id) ids.push(b.customer_id);
        if (b.provider_id) ids.push(b.provider_id);
      });
      var uniq = Array.from(new Set(ids));
      var profMap = {};
      if (uniq.length) {
        var pr = await sb.from("profiles").select("id, full_name, email").in("id", uniq);
        if (!pr.error && pr.data) {
          pr.data.forEach(function (p) {
            profMap[p.id] = p;
          });
        }
      }

      res.data.forEach(function (b) {
        var svc = b.services && b.services.title ? b.services.title : "—";
        var cProf = b.customer_id && profMap[b.customer_id];
        var pProf = b.provider_id && profMap[b.provider_id];
        var cust = cProf ? cProf.full_name || cProf.email || "—" : "—";
        var prov = pProf ? pProf.full_name || pProf.email || "—" : "—";
        var tr = document.createElement("tr");
        tr.dataset.id = b.id;
        tr.innerHTML =
          "<td>" +
          A.escapeHtml(String(b.scheduled_date)) +
          " " +
          A.escapeHtml(String(b.scheduled_time)) +
          "</td>" +
          "<td>" +
          A.escapeHtml(svc) +
          "</td>" +
          "<td>" +
          A.escapeHtml(cust) +
          "</td>" +
          "<td>" +
          A.escapeHtml(prov) +
          "</td>" +
          "<td>" +
          A.moneyCents(b.total_cents) +
          "</td>" +
          "<td>" +
          A.moneyCents(b.admin_commission_cents) +
          " <small style=\"color:var(--color-text-muted)\">(" +
          A.escapeHtml(String(b.commission_percent_applied != null ? b.commission_percent_applied : "—")) +
          "%)</small></td>" +
          '<td><select class="select select--pill js-booking-status" style="min-width:8rem">' +
          ["pending", "confirmed", "completed", "cancelled"]
            .map(function (s) {
              return (
                '<option value="' +
                s +
                '"' +
                (b.status === s ? " selected" : "") +
                ">" +
                s +
                "</option>"
              );
            })
            .join("") +
          "</select></td>" +
          "<td>" +
          (b.admin_settled ? '<span class="badge badge--verified">Settled</span>' : '<span class="badge badge--pending">Due</span>') +
          "</td>";
        tbody.appendChild(tr);
      });
    }

    await load();

    tbody.addEventListener("change", async function (e) {
      var t = e.target;
      if (!t || !t.classList || !t.classList.contains("js-booking-status")) return;
      var tr = t.closest("tr");
      if (!tr || !tr.dataset.id) return;
      var id = tr.dataset.id;
      var res = await sb.from("bookings").update({ status: t.value }).eq("id", id);
      if (res.error) window.alert(res.error.message);
    });
  });
})();
