/**
 * Optional: load categories + services from Supabase so the marketplace reflects real provider listings.
 * Requires config.js + supabase-init.js before browse.js.
 *
 * - category.html: lists active services in the selected category (query ?c=slug).
 * - service-detail.html: if ?id=<service uuid> is present, loads that row and wires booking.
 */
(function () {
  "use strict";

  function qs(sel) {
    return document.querySelector(sel);
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  async function loadCategoryPage(sb) {
    var slug = getParam("c") || "electrical";
    var catRes = await sb
      .from("categories")
      .select("id, name, description")
      .eq("slug", slug)
      .maybeSingle();

    if (catRes.error || !catRes.data) {
      return;
    }

    var cat = catRes.data;
    var h1 = qs("#browseCategoryTitle");
    var lead = qs("#browseCategoryLead");
    var grid = qs("#browseServiceGrid");
    var crumb = qs("#browseBreadcrumbCurrent");
    if (!h1 || !lead || !grid) return;

    h1.textContent = cat.name + " services";
    lead.textContent =
      cat.description ||
      "Book vetted pros for " + cat.name.toLowerCase() + " on HomeEase.";
    if (crumb) crumb.textContent = cat.name + " services";
    document.title = cat.name + " services — HomeEase";

    var svcRes = await sb
      .from("services")
      .select("id, title, slug, price_cents, fee_cents, image_url, tag")
      .eq("category_id", cat.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (svcRes.error || !svcRes.data || !svcRes.data.length) {
      grid.innerHTML =
        '<p style="color: var(--color-text-muted)">No live listings in this category yet. Check back soon.</p>';
      return;
    }

    grid.innerHTML = "";
    svcRes.data.forEach(function (svc) {
      var detailUrl = "service-detail.html?id=" + encodeURIComponent(svc.id);
      var imgSrc =
        svc.image_url ||
        "../assets/images/hero-placeholder.svg";
      var priceNum = svc.price_cents / 100;
      var price =
        window.homeEaseMoney && window.homeEaseMoney.fromTakaAmount
          ? window.homeEaseMoney.fromTakaAmount(priceNum) + "+"
          : "৳\u00A0" + priceNum.toLocaleString("en-BD", { maximumFractionDigits: 0 }) + "+";
      var card = document.createElement("article");
      card.className = "service-card card-lift";
      card.innerHTML =
        '<a class="service-card__media" href="' +
        detailUrl +
        '"><img src="' +
        escapeAttr(imgSrc) +
        '" alt="' +
        escapeAttr(svc.title) +
        '" loading="lazy" width="640" height="360" /></a>' +
        '<div class="service-card__body">' +
        (svc.tag
          ? '<span class="service-card__tag">' + escapeAttr(svc.tag) + "</span>"
          : "") +
        '<h2 class="service-card__title"><a href="' +
        detailUrl +
        '">' +
        escapeAttr(svc.title) +
        "</a></h2>" +
        '<p class="service-card__desc">Book a verified HomeEase provider.</p>' +
        '<div class="service-card__foot">' +
        '<span class="service-card__price">From ' +
        escapeAttr(price) +
        "</span>" +
        '<a class="btn btn--primary" href="' +
        detailUrl +
        '">View &amp; book</a>' +
        "</div></div>";
      grid.appendChild(card);
    });
  }

  async function loadServiceDetail(sb) {
    var id = getParam("id");
    if (!id) return;

    var res = await sb
      .from("services")
      .select(
        "id, title, slug, description, price_cents, fee_cents, duration_text, image_url, includes, addons, warranty, tag, categories ( slug, name )"
      )
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (res.error || !res.data) {
      return;
    }

    var svc = res.data;
    var cat = svc.categories || {};
    var catSlug = cat.slug || "electrical";
    var catName = cat.name || "Category";

    document.title = svc.title + " — HomeEase";

    var catLink = qs("#svcBreadcrumbCatLink");
    if (catLink) catLink.setAttribute("href", "category.html?c=" + encodeURIComponent(catSlug));
    var catCrumb = qs("#svcBreadcrumbCat");
    if (catCrumb) catCrumb.textContent = catName;

    var svcCrumb = qs("#svcBreadcrumbService");
    if (svcCrumb) svcCrumb.textContent = svc.title;

    var hero = qs("#svcHero");
    if (hero) {
      var img = svc.image_url || "../assets/images/hero-placeholder.svg";
      hero.style.backgroundImage = "url('" + img.replace(/'/g, "\\'") + "')";
    }

    var titleEl = qs("#svcTitle");
    if (titleEl) titleEl.textContent = svc.title;
    var sumEl = qs("#svcSummary");
    if (sumEl) sumEl.textContent = svc.description || "";

    var durEl = qs("#svcDuration");
    if (durEl) durEl.textContent = svc.duration_text || "—";

    var price = svc.price_cents / 100;
    var fee = svc.fee_cents / 100;

    var pd = qs("#svcPriceDisplay");
    if (pd) pd.textContent = money(price);
    var pl = qs("#svcPriceLine");
    if (pl) pl.textContent = money(price);
    var fl = qs("#svcFeeLine");
    if (fl) fl.textContent = money(fee);
    var tl = qs("#svcTotalLine");
    if (tl) tl.textContent = money(price + fee);

    var w = qs("#svcWarranty");
    if (w) w.textContent = svc.warranty || "Backed by HomeEase booking protections.";

    function listFromJsonb(v) {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      return [];
    }

    var inc = qs("#svcIncludes");
    if (inc) {
      var incList = listFromJsonb(svc.includes);
      inc.innerHTML = incList.length
        ? incList
            .map(function (i) {
              return "<li>" + String(i) + "</li>";
            })
            .join("")
        : "<li>Details provided after booking confirmation.</li>";
    }

    var addons = qs("#svcAddons");
    if (addons) {
      var addList = listFromJsonb(svc.addons);
      addons.innerHTML = addList.length
        ? addList
            .map(function (i) {
              return "<li>" + String(i) + "</li>";
            })
            .join("")
        : "<li>Add-ons can be quoted on site.</li>";
    }

    var slugInput = qs("#bookingServiceSlug");
    if (slugInput) slugInput.value = svc.slug || "";

    var priceBase = qs("#bookingPriceBase");
    if (priceBase) priceBase.value = String(price);
    var feeInput = qs("#bookingFee");
    if (feeInput) feeInput.value = String(fee);

    var form = qs("[data-booking-form]");
    if (form) {
      var hid = document.getElementById("bookingServiceId");
      if (!hid) {
        hid = document.createElement("input");
        hid.type = "hidden";
        hid.id = "bookingServiceId";
        form.insertBefore(hid, form.firstChild);
      }
      hid.value = svc.id;
    }

    if (typeof window.homeEaseInitBookingWidget === "function") {
      window.homeEaseInitBookingWidget();
    }
  }

  function money(n) {
    if (window.homeEaseMoney && window.homeEaseMoney.fromTakaAmount) {
      return window.homeEaseMoney.fromTakaAmount(n);
    }
    return "৳\u00A0" + Number(n).toLocaleString("en-BD", { maximumFractionDigits: 0 });
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;

    var page = document.body.getAttribute("data-browse-page");
    if (page === "category") {
      await loadCategoryPage(sb);
    } else if (page === "service") {
      await loadServiceDetail(sb);
    }
  });
})();
