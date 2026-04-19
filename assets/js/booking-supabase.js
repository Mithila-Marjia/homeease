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
    return "$" + (n / 100).toFixed(0);
  }

  window.homeEaseAfterBookingSubmit = async function (payload) {
    var idEl = qs("#bookingServiceId");
    var sb = window.homeEaseSupabase && window.homeEaseSupabase();

    if (!idEl || !idEl.value || !sb) {
      var params = new URLSearchParams();
      params.set("service", payload.slug);
      params.set("date", payload.date);
      params.set("time", payload.time);
      if (payload.duration) params.set("duration", payload.duration);
      if (payload.address) params.set("address", payload.address);
      if (payload.notes) params.set("notes", payload.notes);
      window.location.href = "signup.html?" + params.toString();
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
      .select("id, provider_id, price_cents, fee_cents")
      .eq("id", idEl.value)
      .maybeSingle();

    if (svcRes.error || !svcRes.data) {
      window.alert("Could not load this service. Try refreshing the page.");
      return;
    }

    var svc = svcRes.data;
    var total = svc.price_cents + svc.fee_cents;

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
