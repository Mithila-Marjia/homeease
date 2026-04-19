/**
 * Admin: list all services — toggle active, delete (when no bookings).
 */
(function () {
  "use strict";

  var A = window.homeEaseAdmin;

  function qs(sel) {
    return document.querySelector(sel);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-admin-services]");
    if (!root || !A) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var tbody = root.querySelector("tbody");
    if (!tbody) return;

    async function load() {
      var res = await sb
        .from("services")
        .select("id, title, slug, is_active, price_cents, fee_cents, image_url, provider_id, categories ( name )")
        .order("created_at", { ascending: false })
        .limit(500);

      tbody.innerHTML = "";
      if (res.error) {
        tbody.innerHTML =
          '<tr><td colspan="8">' + A.escapeHtml(res.error.message) + "</td></tr>";
        return;
      }

      if (!res.data || !res.data.length) {
        tbody.innerHTML =
          '<tr><td colspan="8" style="color:var(--color-text-muted)">No services yet.</td></tr>';
        return;
      }

      var provIds = [];
      res.data.forEach(function (s) {
        if (s.provider_id) provIds.push(s.provider_id);
      });
      var uniqProv = Array.from(new Set(provIds));
      var profMap = {};
      if (uniqProv.length) {
        var pr = await sb.from("profiles").select("id, full_name, email").in("id", uniqProv);
        if (!pr.error && pr.data) {
          pr.data.forEach(function (p) {
            profMap[p.id] = p;
          });
        }
      }

      res.data.forEach(function (s) {
        var prof = s.provider_id && profMap[s.provider_id];
        var provName = prof ? prof.full_name || prof.email || "—" : "—";
        var catName =
          s.categories && s.categories.name ? s.categories.name : "—";
        var tr = document.createElement("tr");
        tr.dataset.serviceId = s.id;
        tr.innerHTML =
          "<td>" +
          (s.image_url
            ? '<img src="' +
              A.escapeHtml(s.image_url) +
              '" alt="" width="40" height="40" style="object-fit:cover;border-radius:8px" />'
            : "—") +
          "</td><td>" +
          A.escapeHtml(s.title) +
          "</td><td>" +
          A.escapeHtml(provName) +
          "</td><td>" +
          A.escapeHtml(catName) +
          "</td><td>" +
          A.moneyCents(s.price_cents) +
          "</td><td>" +
          A.moneyCents(s.fee_cents) +
          '</td><td><span class="badge ' +
          (s.is_active ? "badge--verified" : "badge--pending") +
          '">' +
          (s.is_active ? "Visible" : "Hidden") +
          '</span></td><td style="white-space:nowrap;display:flex;flex-wrap:wrap;gap:0.35rem">' +
          '<button type="button" class="btn btn--secondary btn--sm js-admin-service-toggle">' +
          (s.is_active ? "Hide" : "Show") +
          '</button><button type="button" class="btn btn--outline btn--sm js-admin-service-remove" style="color:#b91c1c;border-color:rgba(185,28,28,0.45)">Remove</button></td>';
        tbody.appendChild(tr);
      });
    }

    await load();

    tbody.addEventListener("click", async function (e) {
      var toggleBtn = e.target.closest(".js-admin-service-toggle");
      var removeBtn = e.target.closest(".js-admin-service-remove");
      var tr = (toggleBtn || removeBtn) && (toggleBtn || removeBtn).closest("tr");
      if (!tr || !tr.dataset.serviceId) return;
      var sid = tr.dataset.serviceId;

      if (toggleBtn) {
        var cur = await sb
          .from("services")
          .select("is_active")
          .eq("id", sid)
          .maybeSingle();
        if (cur.error || !cur.data) return;
        var up = await sb
          .from("services")
          .update({ is_active: !cur.data.is_active })
          .eq("id", sid);
        if (up.error) {
          window.alert(up.error.message);
          return;
        }
        await load();
        return;
      }

      if (removeBtn) {
        if (!window.confirm("Remove this service permanently? This cannot be undone if there are no bookings blocking delete.")) {
          return;
        }
        var cnt = await sb
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("service_id", sid);
        var n = cnt.count != null ? cnt.count : 0;
        if (n > 0) {
          window.alert(
            "This service has " +
              n +
              " booking(s). Hide it instead, or resolve bookings before removal."
          );
          return;
        }
        var del = await sb.from("services").delete().eq("id", sid);
        if (del.error) {
          window.alert(del.error.message);
          return;
        }
        await load();
      }
    });
  });
})();
