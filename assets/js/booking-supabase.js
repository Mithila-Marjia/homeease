/**
 * When #bookingServiceId is set (dynamic service from Supabase), create a booking row instead of redirecting to signup.
 * If the customer is not signed in, redirect to sign-in with a return URL.
 */
(function () {
  "use strict";

  function qs(sel) {
    return document.querySelector(sel);
  }

  function money(n) {
    var taka = (Number(n) || 0) / 100;
    if (window.homeEaseMoney && window.homeEaseMoney.fromTakaAmount) {
      return window.homeEaseMoney.fromTakaAmount(taka);
    }
    return "৳\u00A0" + taka.toLocaleString("en-BD", { maximumFractionDigits: 0 });
  }

  window.homeEaseAfterBookingSubmit = async function (payload) {
    var idEl = qs("#bookingServiceId");
    var sb = window.homeEaseSupabase && window.homeEaseSupabase();

    if (!idEl || !idEl.value) {
      if (sb) {
        var sessionTry = await sb.auth.getSession();
        var s = sessionTry.data && sessionTry.data.session;
        if (s) {
          var p = await sb.from("profiles").select("role").eq("id", s.user.id).maybeSingle();
          if (p.data && p.data.role === "customer") {
            window.alert(
              "Sample listings on this page cannot be booked online. Open a service from the marketplace that has a live provider listing (use Browse categories), then book from there."
            );
            return;
          }
          window.alert("Please sign in with a customer account to book.");
          return;
        }
      }
      if (!sb) {
        var params0 = new URLSearchParams();
        params0.set("service", payload.slug);
        params0.set("date", payload.date);
        params0.set("time", payload.time);
        if (payload.address) params0.set("address", payload.address);
        if (payload.notes) params0.set("notes", payload.notes);
        window.location.href = "signup.html?" + params0.toString();
        return;
      }
      var path = window.location.pathname;
      var last = path.lastIndexOf("/");
      var file = last >= 0 ? path.slice(last + 1) : path;
      var ret = file + window.location.search + window.location.hash;
      window.location.href = "signin.html?redirect=" + encodeURIComponent(ret);
      return;
    }

    var sessionRes = await sb.auth.getSession();
    if (!sessionRes.data || !sessionRes.data.session) {
      var ret =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      window.location.href = "signin.html?redirect=" + encodeURIComponent(ret);
      return;
    }

    var uid = sessionRes.data.session.user.id;
    var prof = await sb.from("profiles").select("role").eq("id", uid).maybeSingle();
    if (prof.error || !prof.data || prof.data.role !== "customer") {
      window.alert("Please sign in with a customer account to book.");
      return;
    }

    var svcRes = await sb
      .from("services")
      .select("id, provider_id, price_cents")
      .eq("id", idEl.value)
      .maybeSingle();

    if (svcRes.error || !svcRes.data) {
      window.alert("Could not load this service. Try refreshing the page.");
      return;
    }

    var svc = svcRes.data;
    var total = svc.price_cents;

    var ins = await sb.from("bookings").insert({
      customer_id: uid,
      service_id: svc.id,
      provider_id: svc.provider_id,
      scheduled_date: payload.date,
      scheduled_time: payload.time,
      duration_hours: null,
      address: payload.address || null,
      notes: payload.notes || null,
      status: "pending",
      total_cents: total,
    });

    if (ins.error) {
      window.alert(ins.error.message);
      return;
    }

    window.alert(
      "Booking requested. Your provider has been notified in their HomeEase dashboard."
    );
    window.location.href = "index.html";
  };
})();
