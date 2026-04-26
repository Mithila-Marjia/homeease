/**
 * Provider services page: list + toggle active (add form uses provider-add-service.js).
 */
(function () {
  "use strict";

  var P = window.homeEaseProvider;

  function qs(sel) {
    return document.querySelector(sel);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = qs("[data-provider-services-page]");
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
        .from("services")
        .select("id, title, slug, price_cents, is_active, image_url, categories ( name )")
        .eq("provider_id", uid)
        .order("created_at", { ascending: false });

      tbody.innerHTML = "";
      if (res.error) {
        tbody.innerHTML =
          '<tr><td colspan="6">' + P.escapeHtml(res.error.message) + "</td></tr>";
        return;
      }
      if (!res.data || !res.data.length) {
        tbody.innerHTML =
          '<tr><td colspan="6" style="color:var(--color-text-muted)">No services yet. Add one below.</td></tr>';
        return;
      }

      res.data.forEach(function (s) {
        var catName =
          s.categories && s.categories.name ? s.categories.name : "—";
        var tr = document.createElement("tr");
        tr.dataset.serviceId = s.id;
        tr.innerHTML =
          "<td>" +
          (s.image_url
            ? '<img src="' +
              P.escapeHtml(s.image_url) +
              '" alt="" width="44" height="44" style="object-fit:cover;border-radius:8px" />'
            : "—") +
          "</td><td>" +
          P.escapeHtml(s.title) +
          "</td><td>" +
          P.escapeHtml(catName) +
          "</td><td>" +
          P.moneyCents(s.price_cents) +
          '</td><td><span class="badge ' +
          (s.is_active ? "badge--verified" : "badge--pending") +
          '">' +
          (s.is_active ? "Active" : "Hidden") +
          '</span></td><td style="white-space:nowrap;display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center">' +
          '<a class="btn btn--secondary btn--sm" href="edit-service.html?id=' +
          encodeURIComponent(s.id) +
          '" style="padding:0.35rem 0.65rem;font-size:0.75rem;text-decoration:none">Edit</a>' +
          '<button type="button" class="btn btn--secondary btn--sm js-service-toggle" style="padding:0.35rem 0.65rem;font-size:0.75rem">' +
          (s.is_active ? "Hide listing" : "Show listing") +
          "</button></td>";
        tbody.appendChild(tr);
      });
    }

    await load();

    root.addEventListener("click", async function (e) {
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
      var up = await sb
        .from("services")
        .update({ is_active: !row.data.is_active })
        .eq("id", tr.dataset.serviceId)
        .eq("provider_id", uid);
      if (up.error) {
        window.alert(up.error.message);
        return;
      }
      await load();
    });
  });
})();
