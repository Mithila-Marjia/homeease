/**
 * Admin: global commission % (platform_settings).
 */
(function () {
  "use strict";

  var A = window.homeEaseAdmin;

  function qs(sel) {
    return document.querySelector(sel);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var form = qs("[data-admin-commission-form]");
    if (!form || !A) return;

    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var input = qs("#commissionPercent");
    var saved = qs("[data-commission-saved]");

    var cur = await sb.from("platform_settings").select("*").eq("id", 1).maybeSingle();
    if (cur.error) {
      if (saved) saved.textContent = cur.error.message;
      return;
    }
    if (cur.data && input) {
      input.value = String(cur.data.commission_percent);
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!input) return;
      var v = parseFloat(String(input.value), 10);
      if (isNaN(v) || v < 0 || v > 100) {
        window.alert("Enter a percentage between 0 and 100.");
        return;
      }

      var res = await sb
        .from("platform_settings")
        .update({
          commission_percent: v,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (res.error) {
        window.alert(res.error.message);
        return;
      }

      if (saved) {
        saved.textContent = "Saved. New bookings will use " + v + "%. Existing rows are unchanged unless you recalc in SQL.";
        saved.hidden = false;
      }
    });
  });
})();
