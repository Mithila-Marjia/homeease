/**
 * Provider overview: net earnings, active jobs, pending platform fee, 7-day chart bars.
 */
(function () {
  "use strict";

  var P = window.homeEaseProvider;

  function qs(sel) {
    return document.querySelector(sel);
  }

  function setText(sel, text) {
    var el = typeof sel === "string" ? qs(sel) : sel;
    if (el) el.textContent = text;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    if (!qs("[data-provider-dashboard-stats]") || !P) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var sessionRes = await sb.auth.getSession();
    if (!sessionRes.data || !sessionRes.data.session) return;
    var uid = sessionRes.data.session.user.id;

    var bookRes = await sb
      .from("bookings")
      .select(
        "status, total_cents, admin_commission_cents, admin_settled, created_at"
      )
      .eq("provider_id", uid);

    var svcRes = await sb
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", uid);

    var servicesCountLabel =
      svcRes.error || svcRes.count == null ? "—" : String(svcRes.count);

    var netCompleted = 0;
    var activeJobs = 0;
    var pendingPlatform = 0;
    var dayTotals = [0, 0, 0, 0, 0, 0, 0];

    if (!bookRes.error && bookRes.data) {
      var now = new Date();
      now.setHours(0, 0, 0, 0);
      for (var i = 0; i < 7; i++) {
        dayTotals[i] = 0;
      }

      bookRes.data.forEach(function (b) {
        var total = Number(b.total_cents) || 0;
        var adminCut = Number(b.admin_commission_cents) || 0;
        var net = Math.max(0, total - adminCut);
        var st = String(b.status || "");

        if (st === "completed") {
          netCompleted += net;
        }
        if (st === "pending" || st === "confirmed") {
          activeJobs += 1;
        }
        if (!b.admin_settled) {
          pendingPlatform += adminCut;
        }

        if (st === "completed" && b.created_at) {
          var d = new Date(b.created_at);
          d.setHours(0, 0, 0, 0);
          var diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
          if (diff >= 0 && diff < 7) {
            var idx = 6 - diff;
            if (idx >= 0 && idx < 7) {
              dayTotals[idx] += net;
            }
          }
        }
      });
    }

    setText("[data-stat-provider-net]", P.moneyCents(netCompleted));
    setText("[data-stat-active-jobs]", String(activeJobs));
    setText("[data-stat-services-count]", servicesCountLabel);
    setText(
      "[data-stat-pending-platform]",
      bookRes.error ? "Run migration" : P.moneyCents(pendingPlatform)
    );

    var chart = qs("[data-provider-earnings-chart]");
    if (chart && !bookRes.error) {
      var max = Math.max.apply(null, dayTotals.concat([1]));
      var bars = chart.querySelectorAll(".bar");
      for (var j = 0; j < Math.min(bars.length, 7); j++) {
        var h = Math.round((dayTotals[j] / max) * 100);
        bars[j].style.height = Math.max(8, h) + "%";
      }
    }

    var welcome = qs("[data-provider-welcome-name]");
    var profName = qs("[data-homeease-profile-name]");
    if (welcome && profName && profName.textContent) {
      var parts = profName.textContent.trim().split(/\s+/);
      welcome.textContent = "Welcome back, " + (parts[0] || "there") + ".";
    }

    var pill = qs("[data-provider-pill-earnings]");
    if (pill) {
      pill.textContent = P.moneyCents(netCompleted) + " net (completed)";
    }
  });
})();
