/**
 * Customer site: categories, approved providers, header auth (guest vs signed-in customer).
 * Requires config.js, supabase-js, supabase-init.js.
 */
(function () {
  "use strict";

  var COVERAGE_AREA_STORAGE_KEY = "homeease_coverage_area_id";

  function getStoredCoverageAreaId() {
    try {
      return localStorage.getItem(COVERAGE_AREA_STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  window.homeEaseGetCoverageAreaId = getStoredCoverageAreaId;

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function currentPageFile() {
    var path = window.location.pathname;
    var i = path.lastIndexOf("/");
    return i >= 0 ? path.slice(i + 1) : path;
  }

  function authRedirectParam() {
    return encodeURIComponent(currentPageFile() + window.location.search + window.location.hash);
  }

  function iconSvgForSlug(slug) {
    var s = String(slug || "").toLowerCase();
    if (s === "cleaning") {
      return '<path d="M4 22h16M6 18v-1a2 2 0 012-2h8a2 2 0 012 2v1M10 15V9M8 9h8M9 5h6l-1 4H10L9 5z" />';
    }
    if (s === "plumbing") {
      return '<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />';
    }
    if (s === "electrical") {
      return '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />';
    }
    if (s === "hvac") {
      return '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />';
    }
    if (s === "landscape") {
      return '<path d="M12 22c4-4 8-8 8-12a8 8 0 10-16 0c0 4 4 8 8 12z" /><circle cx="12" cy="10" r="3" />';
    }
    return '<path d="M4 6h16M4 12h16M4 18h10" />';
  }

  function shouldEnhanceAuthLinks() {
    return !document.body.classList.contains("auth-page");
  }

  function enhanceAuthLinks(root) {
    if (!shouldEnhanceAuthLinks()) return;
    var r = root || document;
    var redir = authRedirectParam();
    r.querySelectorAll('a[href="signin.html"]').forEach(function (a) {
      if (a.href.indexOf("redirect=") !== -1) return;
      a.setAttribute("href", "signin.html?redirect=" + redir);
    });
    r.querySelectorAll('a[href="signup.html"]').forEach(function (a) {
      if (a.href.indexOf("redirect=") !== -1) return;
      a.setAttribute("href", "signup.html?redirect=" + redir);
    });
  }

  async function fetchCategories(sb) {
    var res = await sb
      .from("categories")
      .select("id, slug, name, description, sort_order")
      .order("sort_order", { ascending: true });
    if (res.error) {
      console.warn("[HomeEase] categories:", res.error.message);
      return [];
    }
    return res.data || [];
  }

  async function fetchCoverageAreas(sb) {
    var res = await sb
      .from("coverage_areas")
      .select("id, slug, name, sort_order")
      .order("sort_order", { ascending: true });
    if (res.error) {
      console.warn("[HomeEase] coverage_areas:", res.error.message);
      return [];
    }
    return res.data || [];
  }

  function populateAndWireAreaSelects(selects, areas) {
    if (!selects || !selects.length) return "";
    var stored = getStoredCoverageAreaId();
    selects.forEach(function (sel) {
      sel.innerHTML = "";
      var optAll = document.createElement("option");
      optAll.value = "";
      optAll.textContent = "All areas";
      sel.appendChild(optAll);
      areas.forEach(function (a) {
        var opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = a.name;
        sel.appendChild(opt);
      });
      sel.value = stored;
    });

    function sync(val) {
      try {
        localStorage.setItem(COVERAGE_AREA_STORAGE_KEY, val);
      } catch (e) {}
      selects.forEach(function (s) {
        s.value = val;
      });
    }

    selects.forEach(function (sel) {
      sel.addEventListener("change", function () {
        sync(sel.value);
        if (typeof window.homeEaseRefreshCustomerArea === "function") {
          window.homeEaseRefreshCustomerArea();
        }
        try {
          window.dispatchEvent(new CustomEvent("homeease-coverage-area-change"));
        } catch (e) {}
      });
    });

    return stored;
  }

  function coverageAreaNameFromProvider(p) {
    if (!p || !p.coverage_areas) return "";
    var ca = p.coverage_areas;
    if (ca && typeof ca === "object" && !Array.isArray(ca) && ca.name) {
      return String(ca.name).trim();
    }
    return "";
  }

  async function fetchApprovedProviders(sb, areaId) {
    var q = sb
      .from("profiles")
      .select("id, full_name, avatar_url, experience_years, primary_category_id, coverage_area_id, coverage_areas(name)")
      .eq("role", "provider")
      .eq("provider_status", "approved")
      .order("full_name", { ascending: true })
      .limit(12);
    if (areaId) {
      q = q.eq("coverage_area_id", areaId);
    }
    var res = await q;
    if (res.error) {
      console.warn("[HomeEase] providers:", res.error.message);
      return [];
    }
    return res.data || [];
  }

  function categoryMapById(categories) {
    var m = {};
    categories.forEach(function (c) {
      m[c.id] = c;
    });
    return m;
  }

  function renderProviderGrid(gridEl, providers, catById) {
    if (!gridEl) return;
    gridEl.innerHTML = "";
    if (!providers.length) {
      var empty = document.createElement("p");
      empty.style.color = "var(--color-text-muted)";
      empty.style.gridColumn = "1 / -1";
      empty.textContent =
        "No approved providers yet. Pros appear here once an admin approves their application.";
      gridEl.appendChild(empty);
      return;
    }

    providers.forEach(function (p, i) {
      var cat = p.primary_category_id && catById[p.primary_category_id];
      var catName = cat ? cat.name : "Home services";
      var catSlug = cat && cat.slug ? cat.slug : "electrical";
      var areaName = coverageAreaNameFromProvider(p);
      var exp =
        p.experience_years != null && p.experience_years !== ""
          ? String(p.experience_years) + "+ years"
          : "Verified pro";
      var fallbackAvatar = "../assets/images/avatar-" + (i % 3 + 1) + ".svg";
      var imgSrc = (p.avatar_url && String(p.avatar_url).trim()) || fallbackAvatar;

      var art = document.createElement("article");
      art.className =
        "guild-card card-lift" + (i === 0 ? " guild-card--popular" : "");
      if (i === 0) {
        var badge = document.createElement("span");
        badge.className = "guild-popular-badge";
        badge.textContent = "Featured";
        art.appendChild(badge);
      }

      var head = document.createElement("div");
      head.className = "guild-card__head";
      var img = document.createElement("img");
      img.className = "guild-avatar";
      img.width = 56;
      img.height = 56;
      img.alt = "";
      img.src = imgSrc;
      img.onerror = function () {
        img.onerror = null;
        img.src = fallbackAvatar;
      };
      var meta = document.createElement("div");
      meta.innerHTML =
        '<h3 class="guild-card__name">' +
        escapeHtml(p.full_name || "HomeEase Pro") +
        "</h3>" +
        '<p class="guild-card__role">' +
        escapeHtml(catName) +
        (areaName ? " · " + escapeHtml(areaName) : "") +
        "</p>" +
        '<p class="guild-vetted">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        '<path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />' +
        "</svg> HomeEase verified" +
        "</p>";
      head.appendChild(img);
      head.appendChild(meta);
      art.appendChild(head);

      var stats = document.createElement("div");
      stats.className = "guild-stats";
      stats.innerHTML =
        '<div class="guild-stat-row"><span>Experience</span><span>' +
        escapeHtml(exp) +
        "</span></div>" +
        '<div class="guild-stat-row"><span>Focus</span><span>' +
        escapeHtml(catName) +
        "</span></div>" +
        '<div class="guild-stat-row"><span>Area</span><span>' +
        escapeHtml(areaName || "—") +
        "</span></div>";
      art.appendChild(stats);

      var hr = document.createElement("hr");
      hr.className = "guild-divider";
      art.appendChild(hr);

      var covLabel = document.createElement("p");
      covLabel.className = "guild-coverage-label";
      covLabel.textContent = "Book services";
      art.appendChild(covLabel);

      var tags = document.createElement("div");
      tags.className = "guild-tags";
      var t = document.createElement("span");
      t.textContent = catName;
      tags.appendChild(t);
      art.appendChild(tags);

      var btn = document.createElement("a");
      btn.className =
        "btn btn--block " + (i === 0 ? "btn--guild-primary" : "btn--guild-secondary");
      btn.href = "category.html?c=" + encodeURIComponent(catSlug);
      btn.textContent = "Browse in " + catName;
      art.appendChild(btn);

      gridEl.appendChild(art);
    });
  }

  function renderCatNav(listEl, categories, opts) {
    opts = opts || {};
    if (!listEl || !categories.length) return;
    listEl.innerHTML = "";
    categories.forEach(function (cat) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "cat-nav__link";
      a.href = "category.html?c=" + encodeURIComponent(cat.slug);
      a.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        iconSvgForSlug(cat.slug) +
        "</svg>";
      a.appendChild(document.createTextNode(cat.name));
      if (opts.currentSlug && cat.slug === opts.currentSlug) {
        a.setAttribute("aria-current", "page");
      }
      li.appendChild(a);
      listEl.appendChild(li);
    });
  }

  function shortMeta(desc, name) {
    if (desc && String(desc).trim()) {
      return String(desc).trim();
    }
    return "Book vetted pros for " + String(name).toLowerCase() + " on HomeEase.";
  }

  function renderDomainGrid(gridEl, categories) {
    if (!gridEl || !categories.length) return;
    gridEl.innerHTML = "";
    categories.forEach(function (cat) {
      var a = document.createElement("a");
      a.className = "domain-card card-lift";
      a.href = "category.html?c=" + encodeURIComponent(cat.slug);
      a.innerHTML =
        '<div class="domain-card__icon" aria-hidden="true">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        iconSvgForSlug(cat.slug) +
        "</svg></div>" +
        "<h3 class=\"domain-card__title\">" +
        escapeHtml(cat.name) +
        "</h3>" +
        '<p class="domain-card__meta">' +
        escapeHtml(shortMeta(cat.description, cat.name)) +
        "</p>";
      gridEl.appendChild(a);
    });
  }

  function truncateText(str, max) {
    var s = String(str || "").trim();
    if (s.length <= max) return s;
    return s.slice(0, Math.max(0, max - 1)) + "…";
  }

  function formatPriceFromCents(cents) {
    if (window.homeEaseMoney && window.homeEaseMoney.fromCents) {
      return window.homeEaseMoney.fromCents(cents);
    }
    var taka = (Number(cents) || 0) / 100;
    return (
      "৳\u00A0" +
      taka.toLocaleString("en-BD", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  }

  function formatProviderRatingLine(avg, count) {
    var n = Number(count) || 0;
    if (n === 0) {
      return "No ratings yet";
    }
    var a = Number(avg);
    if (isNaN(a)) a = 0;
    return (
      "\u2605 " +
      a.toFixed(1) +
      " · " +
      n +
      " review" +
      (n === 1 ? "" : "s")
    );
  }

  async function fetchPopularServices(sb, areaId) {
    var params = { p_limit: 3 };
    if (areaId) {
      params.p_coverage_area_id = areaId;
    }
    var res = await sb.rpc("popular_home_services", params);
    if (res.error) {
      console.warn("[HomeEase] popular_home_services:", res.error.message);
      return [];
    }
    return res.data || [];
  }

  function renderPopularServices(container, rows) {
    if (!container) return;
    container.innerHTML = "";
    if (!rows || !rows.length) {
      var empty = document.createElement("p");
      empty.style.color = "var(--color-text-muted)";
      empty.style.margin = "0";
      empty.textContent =
        "No live services yet. Providers can publish listings from their dashboard—check back soon.";
      container.appendChild(empty);
      return;
    }

    var hero = rows[0];
    var minis = rows.slice(1, 3);

    var heroImg = hero.image_url || "../assets/images/hero-placeholder.svg";
    var heroDesc = truncateText(hero.description, 220);
    var heroRating = formatProviderRatingLine(hero.rating_avg, hero.rating_count);
    var heroTag = (hero.tag && String(hero.tag).trim()) || "Popular";
    var detailHref =
      "service-detail.html?id=" + encodeURIComponent(hero.service_id);
    var providerLabel = hero.provider_name ? String(hero.provider_name).trim() : "Verified pro";
    var heroArea =
      hero.coverage_area_name && String(hero.coverage_area_name).trim()
        ? String(hero.coverage_area_name).trim()
        : "";

    var art = document.createElement("article");
    art.className = "featured-hero card-lift";
    art.innerHTML =
      '<img class="featured-hero__img" width="900" height="600" alt="" loading="lazy" />' +
      '<div class="featured-hero__overlay" aria-hidden="true"></div>' +
      '<div class="featured-hero__inner">' +
      '<div class="featured-hero__badges">' +
      '<span class="badge badge--tier">' +
      escapeHtml(heroTag) +
      "</span>" +
      '<span class="featured-hero__rating">' +
      escapeHtml(heroRating) +
      "</span>" +
      "</div>" +
      '<p class="featured-hero__provider" style="margin:0.4rem 0 0;font-size:0.875rem;opacity:0.95">' +
      "Provider: " +
      escapeHtml(providerLabel) +
      (heroArea ? " · " + escapeHtml(heroArea) : "") +
      "</p>" +
      '<h3 class="featured-hero__title">' +
      escapeHtml(hero.title || "Service") +
      "</h3>" +
      '<p class="featured-hero__desc">' +
      escapeHtml(heroDesc || "Book this service on HomeEase.") +
      "</p>" +
      '<div class="featured-hero__footer">' +
      '<span class="featured-hero__price">From ' +
      escapeHtml(formatPriceFromCents(hero.price_cents)) +
      "</span>" +
      '<a class="btn btn--reserve" href="' +
      escapeAttr(detailHref) +
      '">View &amp; book</a>' +
      "</div></div>";
    var hi = art.querySelector(".featured-hero__img");
    if (hi) {
      hi.src = heroImg;
      hi.alt = hero.title || "Service";
      hi.onerror = function () {
        hi.onerror = null;
        hi.src = "../assets/images/hero-placeholder.svg";
      };
    }
    container.appendChild(art);

    if (!minis.length) return;

    var stack = document.createElement("div");
    stack.className = "featured-ops__stack";

    var miniIcons = [
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" /></svg>',
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>',
    ];
    var miniPriceClass = ["mini-ops__price--blue", "mini-ops__price--amber"];

    minis.forEach(function (svc, i) {
      var imgSrc = svc.image_url || "../assets/images/hero-placeholder.svg";
      var href = "service-detail.html?id=" + encodeURIComponent(svc.service_id);
      var ratingText = formatProviderRatingLine(svc.rating_avg, svc.rating_count);
      var miniArea =
        svc.coverage_area_name && String(svc.coverage_area_name).trim()
          ? String(svc.coverage_area_name).trim()
          : "";
      var prov = svc.provider_name ? String(svc.provider_name).trim() : "Pro";
      if (miniArea) {
        prov = prov + " · " + miniArea;
      }
      var desc = truncateText(svc.description, 120);
      var iconClass =
        i % 2 === 0 ? "mini-ops__icon mini-ops__icon--blue" : "mini-ops__icon mini-ops__icon--amber";

      var mini = document.createElement("article");
      mini.className = "mini-ops card-lift";
      mini.innerHTML =
        '<a class="mini-ops__media" href="' +
        escapeAttr(href) +
        '" aria-hidden="true" tabindex="-1">' +
        '<img width="400" height="200" alt="" loading="lazy" /></a>' +
        '<div class="mini-ops__body">' +
        '<div class="mini-ops__top">' +
        '<span class="' +
        iconClass +
        '" aria-hidden="true">' +
        miniIcons[i % 2] +
        "</span>" +
        '<span class="mini-ops__rating">' +
        escapeHtml(ratingText) +
        "</span>" +
        "</div>" +
        '<p class="mini-ops__provider" style="margin:0.15rem 0 0;font-size:0.75rem;color:var(--color-text-muted)">' +
        escapeHtml(prov) +
        "</p>" +
        '<h3 class="mini-ops__title">' +
        escapeHtml(svc.title || "Service") +
        "</h3>" +
        '<p class="mini-ops__desc">' +
        escapeHtml(desc || "Verified HomeEase listing.") +
        "</p>" +
        '<div class="mini-ops__bottom">' +
        '<span class="mini-ops__price ' +
        miniPriceClass[i % 2] +
        '">' +
        escapeHtml(formatPriceFromCents(svc.price_cents)) +
        "</span>" +
        '<a class="mini-ops__add" href="' +
        escapeAttr(href) +
        '" aria-label="View service">+</a>' +
        "</div></div>";
      var im = mini.querySelector(".mini-ops__media img");
      if (im) {
        im.src = imgSrc;
        im.onerror = function () {
          im.onerror = null;
          im.src = "../assets/images/hero-placeholder.svg";
        };
      }
      stack.appendChild(mini);
    });

    container.appendChild(stack);
  }

  function renderCategoriesPageGrid(gridEl, categories) {
    if (!gridEl || !categories.length) return;
    gridEl.innerHTML = "";
    categories.forEach(function (cat) {
      var a = document.createElement("a");
      a.className = "category-tile card-lift";
      a.href = "category.html?c=" + encodeURIComponent(cat.slug);
      var meta = shortMeta(cat.description, cat.name);
      if (meta.length > 72) meta = meta.slice(0, 69) + "…";
      a.innerHTML =
        '<div class="category-tile__icon" aria-hidden="true">' +
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        iconSvgForSlug(cat.slug) +
        "</svg></div>" +
        '<h2 class="category-tile__title">' +
        escapeHtml(cat.name) +
        "</h2>" +
        '<p class="category-tile__meta">' +
        escapeHtml(meta) +
        '</p><span class="category-tile__link">View services →</span>';
      gridEl.appendChild(a);
    });
  }

  function applyCustomerHeaderMode(guest, user, mode) {
    if (mode === "customer") {
      guest.style.display = "none";
      guest.setAttribute("aria-hidden", "true");
      user.style.display = "flex";
      user.removeAttribute("hidden");
      user.setAttribute("aria-hidden", "false");
    } else {
      guest.style.display = "flex";
      guest.setAttribute("aria-hidden", "false");
      user.style.display = "none";
      user.setAttribute("hidden", "");
      user.setAttribute("aria-hidden", "true");
    }
  }

  async function initCustomerHeader(sb) {
    var guest = qs("[data-customer-auth-guest]");
    var user = qs("[data-customer-auth-user]");
    var greet = qs("[data-customer-greeting]");
    var signOut = qs("[data-customer-signout]");
    if (!guest || !user) return;

    var sessionRes = await sb.auth.getSession();
    var sess = sessionRes.data && sessionRes.data.session;

    if (!sess) {
      applyCustomerHeaderMode(guest, user, "guest");
      enhanceAuthLinks(document.body);
      if (signOut) signOut.onclick = null;
      return;
    }

    var prof = await sb.from("profiles").select("full_name, role").eq("id", sess.user.id).maybeSingle();
    if (prof.error || !prof.data || prof.data.role !== "customer") {
      applyCustomerHeaderMode(guest, user, "guest");
      enhanceAuthLinks(document.body);
      return;
    }

    applyCustomerHeaderMode(guest, user, "customer");
    if (greet) {
      var n = (prof.data.full_name || "").trim();
      greet.textContent = n ? "Hi, " + n.split(" ")[0] : "Signed in";
    }
    if (signOut) {
      signOut.onclick = async function () {
        await sb.auth.signOut();
        window.location.reload();
      };
    }
  }

  window.homeEaseRefreshCustomerArea = async function () {
    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (!sb) return;
    var areaRaw = getStoredCoverageAreaId();
    var areaFilter = areaRaw || null;
    var providerGrid = qs("[data-customer-provider-grid]");
    var popularGrid = qs("[data-customer-popular-services]");
    var categories = await fetchCategories(sb);
    var catById = categoryMapById(categories);
    if (providerGrid) {
      var providers = await fetchApprovedProviders(sb, areaFilter);
      renderProviderGrid(providerGrid, providers, catById);
    }
    if (popularGrid) {
      var popular = await fetchPopularServices(sb, areaFilter);
      renderPopularServices(popularGrid, popular);
    }
  };

  async function run() {
    var sb = window.homeEaseSupabase && window.homeEaseSupabase();
    if (sb) await initCustomerHeader(sb);
    else if (shouldEnhanceAuthLinks()) enhanceAuthLinks(document.body);

    var areaSelects = document.querySelectorAll("[data-customer-area-select]");
    var nav = qs("[data-customer-cat-nav]");
    var domain = qs("[data-customer-domain-grid]");
    var catPage = qs("[data-customer-categories-grid]");
    var providerGrid = qs("[data-customer-provider-grid]");
    var popularGrid = qs("[data-customer-popular-services]");

    var areaId = "";
    if (sb && areaSelects.length) {
      var coverageAreas = await fetchCoverageAreas(sb);
      areaId = populateAndWireAreaSelects(areaSelects, coverageAreas);
    } else {
      areaId = getStoredCoverageAreaId();
    }
    var areaFilter = areaId || null;

    if (sb && (nav || domain || catPage || providerGrid)) {
      var categories = await fetchCategories(sb);
      var catById = categoryMapById(categories);
      if (categories.length) {
        var cur = new URLSearchParams(window.location.search).get("c");
        if (nav) renderCatNav(nav, categories, { currentSlug: cur });
        if (domain) renderDomainGrid(domain, categories);
        if (catPage) renderCategoriesPageGrid(catPage, categories);
      } else if (catPage || domain) {
        var empty = document.createElement("p");
        empty.style.color = "var(--color-text-muted)";
        empty.textContent =
          "No categories yet. An admin can add them in the dashboard, or check your Supabase connection in config.js.";
        if (catPage) catPage.appendChild(empty);
      }

      if (providerGrid) {
        var providers = await fetchApprovedProviders(sb, areaFilter);
        renderProviderGrid(providerGrid, providers, catById);
      }
    }

    if (sb && popularGrid) {
      var popular = await fetchPopularServices(sb, areaFilter);
      renderPopularServices(popularGrid, popular);
    }
  }

  document.addEventListener("DOMContentLoaded", run);
})();
