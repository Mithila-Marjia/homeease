/**
 * Customer account: profile, bookings list, booking detail (Supabase).
 * Page: <body data-customer-account="profile|bookings|booking-detail">
 */
(function () {
  "use strict";

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function returnUrl() {
    var path = window.location.pathname;
    var i = path.lastIndexOf("/");
    return (i >= 0 ? path.slice(i + 1) : path) + window.location.search + window.location.hash;
  }

  function formatMoneyCents(cents) {
    if (window.homeEaseMoney && window.homeEaseMoney.fromCents) {
      return window.homeEaseMoney.fromCents(cents);
    }
    var taka = (Number(cents) || 0) / 100;
    return "৳\u00A0" + taka.toLocaleString("en-BD", { maximumFractionDigits: 0 });
  }

  function statusLabel(status) {
    var s = String(status || "").toLowerCase();
    if (s === "pending") return "Pending";
    if (s === "confirmed") return "Confirmed";
    if (s === "completed") return "Completed";
    if (s === "cancelled") return "Cancelled";
    return status || "—";
  }

  function statusBadgeClass(status) {
    var s = String(status || "").toLowerCase();
    if (s === "completed") return "badge--verified";
    if (s === "cancelled") return "badge--pending";
    return "badge--tier";
  }

  var PLACEHOLDER_IMG = "../assets/images/hero-placeholder.svg";

  function truncateSummary(text, max) {
    max = max || 260;
    var s = String(text || "").trim();
    if (!s) return "";
    if (s.length <= max) return s;
    return s.slice(0, Math.max(0, max - 1)) + "…";
  }

  function showAccountShell(showContent) {
    var loadEl = qs("[data-customer-account-loading]");
    var mainEl = qs("[data-customer-account-content]");
    if (loadEl) loadEl.hidden = !!showContent;
    if (mainEl) mainEl.hidden = !showContent;
  }

  async function requireCustomer() {
    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) {
      window.location.href = "signin.html?redirect=" + encodeURIComponent(returnUrl());
      return null;
    }
    var sessionRes = await sb.auth.getSession();
    if (!sessionRes.data || !sessionRes.data.session) {
      window.location.href = "signin.html?redirect=" + encodeURIComponent(returnUrl());
      return null;
    }
    var uid = sessionRes.data.session.user.id;
    var prof = await sb
      .from("profiles")
      .select("id, email, full_name, phone, role")
      .eq("id", uid)
      .maybeSingle();
    if (prof.error || !prof.data || prof.data.role !== "customer") {
      window.location.href = "signin.html";
      return null;
    }
    return { sb: sb, uid: uid, profile: prof.data };
  }

  async function initProfile() {
    var ctx = await requireCustomer();
    if (!ctx) return;

    var errEl = qs("[data-customer-profile-error]");
    var okEl = qs("[data-customer-profile-success]");
    var form = qs("[data-customer-profile-form]");

    var res = await ctx.sb
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", ctx.uid)
      .maybeSingle();

    showAccountShell(true);

    if (res.error || !res.data) {
      if (errEl) {
        errEl.textContent = res.error ? res.error.message : "Could not load profile.";
        errEl.hidden = false;
      }
      return;
    }

    var p = res.data;
    var nameInput = qs("#profileFullName");
    var phoneInput = qs("#profilePhone");
    var emailEl = qs("#profileEmail");
    if (nameInput) nameInput.value = p.full_name || "";
    if (phoneInput) phoneInput.value = p.phone || "";
    if (emailEl) emailEl.textContent = p.email || "—";

    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (errEl) {
          errEl.hidden = true;
          errEl.textContent = "";
        }
        if (okEl) okEl.hidden = true;

        var fullName = (nameInput && nameInput.value) || "";
        var phone = (phoneInput && phoneInput.value) || "";

        var upd = await ctx.sb
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            phone: phone.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", ctx.uid);

        if (upd.error) {
          if (errEl) {
            errEl.textContent = upd.error.message;
            errEl.hidden = false;
          }
          return;
        }
        if (okEl) {
          okEl.textContent = "Profile saved.";
          okEl.hidden = false;
        }
      });
    }
  }

  async function initBookingsList() {
    var ctx = await requireCustomer();
    if (!ctx) return;

    var grid = qs("[data-customer-bookings-grid]");
    var emptyEl = qs("[data-customer-bookings-empty]");
    var errEl = qs("[data-customer-bookings-error]");

    var res = await ctx.sb
      .from("bookings")
      .select(
        "id, status, scheduled_date, scheduled_time, total_cents, created_at, service_id, provider_id"
      )
      .eq("customer_id", ctx.uid)
      .order("created_at", { ascending: false });

    showAccountShell(true);

    if (res.error) {
      if (errEl) {
        errEl.textContent = res.error.message;
        errEl.hidden = false;
      }
      return;
    }

    if (!grid) return;
    grid.innerHTML = "";

    var rows = res.data || [];
    if (!rows.length) {
      if (emptyEl) emptyEl.hidden = false;
      if (grid) grid.hidden = true;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    if (grid) grid.hidden = false;

    var serviceIds = [];
    var providerIds = [];
    rows.forEach(function (b) {
      if (b.service_id) serviceIds.push(b.service_id);
      if (b.provider_id) providerIds.push(b.provider_id);
    });
    var uniq = function (arr) {
      return Array.from(new Set(arr));
    };
    serviceIds = uniq(serviceIds);
    providerIds = uniq(providerIds);

    var svcMap = {};
    var provMap = {};
    if (serviceIds.length) {
      var sr = await ctx.sb
        .from("services")
        .select("id, title, slug, image_url")
        .in("id", serviceIds);
      if (!sr.error && sr.data) {
        sr.data.forEach(function (s) {
          svcMap[s.id] = s;
        });
      }
    }
    if (providerIds.length) {
      var pr = await ctx.sb.from("profiles").select("id, full_name").in("id", providerIds);
      if (!pr.error && pr.data) {
        pr.data.forEach(function (p) {
          provMap[p.id] = p;
        });
      }
    }

    rows.forEach(function (b) {
      var svc = (b.service_id && svcMap[b.service_id]) || {};
      var prov = (b.provider_id && provMap[b.provider_id]) || {};
      var title = svc.title || "Service";
      var imgSrc = (svc.image_url && String(svc.image_url).trim()) || PLACEHOLDER_IMG;
      var detailHref = "booking-detail.html?id=" + encodeURIComponent(b.id);
      var when =
        escapeHtml(String(b.scheduled_date || "—")) +
        (b.scheduled_time ? " · " + escapeHtml(String(b.scheduled_time)) : "");
      var art = document.createElement("article");
      art.className = "booking-list-card card-lift";
      art.innerHTML =
        '<a class="booking-list-card__media" href="' +
        detailHref +
        '"><img src="' +
        imgSrc.replace(/"/g, "&quot;") +
        '" alt="" loading="lazy" width="640" height="400" /></a>' +
        '<div class="booking-list-card__body">' +
        '<span class="badge ' +
        statusBadgeClass(b.status) +
        ' booking-list-card__badge">' +
        escapeHtml(statusLabel(b.status)) +
        "</span>" +
        '<h2 class="booking-list-card__title"><a href="' +
        detailHref +
        '">' +
        escapeHtml(title) +
        "</a></h2>" +
        '<p class="booking-list-card__meta">' +
        escapeHtml(prov.full_name || "Provider") +
        " · " +
        when +
        "</p>" +
        '<div class="booking-list-card__foot">' +
        '<span class="booking-list-card__price">' +
        escapeHtml(formatMoneyCents(b.total_cents)) +
        "</span>" +
        '<a class="btn btn--primary btn--sm" href="' +
        detailHref +
        '">View details</a>' +
        "</div></div>";
      var im = art.querySelector(".booking-list-card__media img");
      if (im) {
        im.onerror = function () {
          im.onerror = null;
          im.src = PLACEHOLDER_IMG;
        };
      }
      grid.appendChild(art);
    });
  }

  async function initBookingDetail() {
    var ctx = await requireCustomer();
    if (!ctx) return;

    var id = new URLSearchParams(window.location.search).get("id");
    var errEl = qs("[data-customer-booking-error]");
    var root = qs("[data-customer-booking-detail]");

    if (!id) {
      showAccountShell(true);
      if (errEl) {
        errEl.textContent = "Missing booking.";
        errEl.hidden = false;
      }
      return;
    }

    var res = await ctx.sb
      .from("bookings")
      .select(
        "id, status, scheduled_date, scheduled_time, address, notes, total_cents, created_at, service_id, provider_id"
      )
      .eq("id", id)
      .eq("customer_id", ctx.uid)
      .maybeSingle();

    showAccountShell(true);

    if (res.error || !res.data) {
      if (errEl) {
        errEl.textContent = res.error
          ? res.error.message
          : "Booking not found or you do not have access.";
        errEl.hidden = false;
      }
      return;
    }

    var b = res.data;
    var svc = {};
    var prov = {};

    if (b.service_id) {
      var sres = await ctx.sb
        .from("services")
        .select("id, title, slug, description, image_url, categories ( slug, name )")
        .eq("id", b.service_id)
        .maybeSingle();
      if (!sres.error && sres.data) svc = sres.data;
    }
    if (b.provider_id) {
      var pres = await ctx.sb
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("id", b.provider_id)
        .maybeSingle();
      if (!pres.error && pres.data) prov = pres.data;
    }

    var title = svc.title || "Booking";
    document.title = title + " — Booking — HomeEase";

    var hero = qs("#bookingDetailHero");
    var imgUrl = (svc.image_url && String(svc.image_url).trim()) || PLACEHOLDER_IMG;
    if (hero) {
      hero.style.backgroundImage = "url('" + imgUrl.replace(/'/g, "\\'") + "')";
    }

    var crumb = qs("#bookingBreadcrumbCurrent");
    if (crumb) crumb.textContent = title;

    var st = statusLabel(b.status);
    var badgeEl = qs("#bookingDetailStatusBadge");
    if (badgeEl) {
      badgeEl.textContent = st;
      badgeEl.className =
        "badge service-detail-badge booking-detail-status-badge " + statusBadgeClass(b.status);
    }

    if (qs("#bookingDetailTitle")) qs("#bookingDetailTitle").textContent = title;

    var summaryEl = qs("#bookingDetailSummary");
    if (summaryEl) {
      var desc = truncateSummary(svc.description, 280);
      summaryEl.textContent =
        desc ||
        "Your scheduled HomeEase visit. Review the details below and keep your service address handy for the pro.";
    }

    if (qs("#bookingDetailWhen")) {
      qs("#bookingDetailWhen").textContent =
        String(b.scheduled_date || "—") + " · " + String(b.scheduled_time || "—");
    }
    if (qs("#bookingDetailTotal")) qs("#bookingDetailTotal").textContent = formatMoneyCents(b.total_cents);
    if (qs("#bookingDetailStatusText")) qs("#bookingDetailStatusText").textContent = st;

    if (qs("#bookingDetailAddress")) {
      qs("#bookingDetailAddress").textContent = b.address || "—";
    }
    if (qs("#bookingDetailNotes")) {
      qs("#bookingDetailNotes").textContent = b.notes && String(b.notes).trim() ? b.notes : "No notes added.";
    }

    var createdLine = qs("#bookingDetailCreatedLine");
    if (createdLine) {
      var d = b.created_at ? new Date(b.created_at) : null;
      createdLine.textContent = d
        ? "This booking was placed on " + d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) + "."
        : "—";
    }

    var provName = qs("#bookingDetailProvider");
    if (provName) provName.textContent = prov.full_name || "—";

    var provPhone = qs("#bookingDetailProviderPhone");
    if (provPhone) {
      provPhone.textContent = prov.phone && String(prov.phone).trim() ? prov.phone : "Phone on file with HomeEase";
    }

    var av = qs("#bookingDetailProviderAvatar");
    if (av) {
      var avSrc = (prov.avatar_url && String(prov.avatar_url).trim()) || "../assets/images/avatar-1.svg";
      av.src = avSrc;
      av.alt = prov.full_name ? prov.full_name : "";
      av.onerror = function () {
        av.onerror = null;
        av.src = "../assets/images/avatar-1.svg";
      };
    }

    var svcLink = qs("#bookingDetailServiceLink");
    if (svcLink && svc.id) {
      svcLink.href = "service-detail.html?id=" + encodeURIComponent(svc.id);
      svcLink.hidden = false;
    } else if (svcLink) {
      svcLink.hidden = true;
    }

    if (root) root.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var page = document.body.getAttribute("data-customer-account");
    if (!page) return;

    if (page === "profile") await initProfile();
    else if (page === "bookings") await initBookingsList();
    else if (page === "booking-detail") await initBookingDetail();
  });
})();
