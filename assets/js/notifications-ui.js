/**
 * Load unread notification count and optional realtime updates for dashboard bell badges.
 * Expects elements: [data-homeease-notifications-badge]
 */
(function () {
  "use strict";

  function qs(sel) {
    return document.querySelector(sel);
  }

  function qsa(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  async function refresh(sb, userId) {
    var badges = qsa("[data-homeease-notifications-badge]");
    if (!badges.length || !userId) return;

    var res = await sb
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);

    if (res.error) {
      return;
    }

    var n = typeof res.count === "number" ? res.count : 0;
    badges.forEach(function (el) {
      el.textContent = n > 0 ? String(n) : "";
      el.style.display = n > 0 ? "inline-flex" : "none";
    });
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var sessionRes = await sb.auth.getSession();
    if (!sessionRes.data || !sessionRes.data.session) return;

    var uid = sessionRes.data.session.user.id;
    await refresh(sb, uid);

    sb.channel("homeease-notifications-" + uid)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq." + uid },
        function () {
          refresh(sb, uid);
        }
      )
      .subscribe();
  });
})();
