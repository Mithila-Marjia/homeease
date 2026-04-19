/**
 * HomeEase browse flow: category services list + service detail + booking UI.
 */
(function () {
  "use strict";

  var BROWSE = {
    categories: {
      electrical: {
        title: "Electrical services",
        lead:
          "Licensed electricians for panels, lighting, outlets, and smart-home installs—book a verified pro in your area.",
        services: [
          {
            slug: "elec-panel",
            title: "Panel & safety inspection",
            desc: "Breaker testing, grounding check, and load review for peace of mind.",
            price: "From $249",
            tag: "Popular",
          },
          {
            slug: "elec-outlet",
            title: "Outlets & switches",
            desc: "Replace worn outlets, add USB ports, dimmers, and three-way switches.",
            price: "From $89",
          },
          {
            slug: "elec-lighting",
            title: "Lighting installation",
            desc: "Fixtures, recessed cans, under-cabinet, and exterior security lighting.",
            price: "From $125",
          },
        ],
      },
      plumbing: {
        title: "Plumbing services",
        lead:
          "Leak fixes, drain clearing, fixture installs, and water-heater help from insured plumbers on HomeEase.",
        services: [
          {
            slug: "plumb-leak",
            title: "Leak detection & repair",
            desc: "Pinpoint hidden leaks, repair supply lines, and protect cabinets & floors.",
            price: "From $149",
            tag: "Same-day",
          },
          {
            slug: "plumb-drain",
            title: "Drain cleaning",
            desc: "Kitchen, bath, and main line clearing with camera options.",
            price: "From $129",
          },
          {
            slug: "plumb-heater",
            title: "Water heater service",
            desc: "Flush, element & thermostat checks, and replacement quotes.",
            price: "From $199",
          },
        ],
      },
      hvac: {
        title: "HVAC services",
        lead:
          "Heating and cooling tune-ups, repairs, and filter changes—keep every room comfortable year-round.",
        services: [
          {
            slug: "hvac-tune",
            title: "Seasonal tune-up",
            desc: "Full system check, refrigerant & electrical inspection, safety controls.",
            price: "From $159",
            tag: "Popular",
          },
          {
            slug: "hvac-ac",
            title: "AC repair & diagnostics",
            desc: "No cold air, odd noises, or short cycling—priority summer dispatch.",
            price: "From $189",
          },
          {
            slug: "hvac-furnace",
            title: "Furnace repair",
            desc: "Ignition, blower, and limit-switch issues for gas & electric units.",
            price: "From $199",
          },
        ],
      },
      landscape: {
        title: "Landscaping & outdoor care",
        lead:
          "Lawn maintenance, planting, mulch, and irrigation checks from crews rated on HomeEase.",
        services: [
          {
            slug: "land-lawn",
            title: "Lawn mowing & edging",
            desc: "Weekly or bi-weekly cuts, trim, and bag or mulch clippings.",
            price: "From $55",
          },
          {
            slug: "land-garden",
            title: "Mulch & garden beds",
            desc: "Refresh beds, weed barrier, seasonal color, and shrub shaping.",
            price: "From $175",
          },
          {
            slug: "land-sprinkler",
            title: "Sprinkler & irrigation check",
            desc: "Zone tests, head adjustments, leak detection, and timer setup.",
            price: "From $95",
          },
        ],
      },
      cleaning: {
        title: "Deep cleaning & housekeeping",
        lead:
          "Move-in/out deep cleans, recurring housekeeping, and sanitizing packages sized to your home.",
        services: [
          {
            slug: "clean-deep",
            title: "Deep home clean",
            desc: "Kitchen, baths, floors, baseboards, and interior glass—top-to-bottom.",
            price: "From $189",
            tag: "Popular",
          },
          {
            slug: "clean-move",
            title: "Move-in / move-out clean",
            desc: "Empty-home pass for landlords, sellers, and new homeowners.",
            price: "From $249",
          },
          {
            slug: "clean-recurring",
            title: "Recurring housekeeping",
            desc: "Weekly, bi-weekly, or monthly visits with the same vetted crew when possible.",
            price: "From $99/visit",
          },
        ],
      },
    },
    services: {
      "elec-panel": {
        title: "Electrical panel & safety inspection",
        category: "electrical",
        categoryLabel: "Electrical",
        price: 249,
        fee: 12,
        duration: "2–3 hours",
        hero: "../assets/images/featured-electrician.jpg",
        summary:
          "A licensed electrician reviews your main panel, breakers, grounding, and visible wiring so you know your home is safe—especially after storms, renovations, or flickering lights.",
        includes: [
          "Visual inspection of panel, breakers, and service entrance",
          "Grounding & bonding check (where accessible)",
          "Thermal spot-check on hot breakers",
          "Written summary with photos via HomeEase",
        ],
        addons: ["Whole-home GFCI/AFCI assessment (+$75)", "Label & map circuits (+$45)"],
        warranty: "90-day workmanship warranty on labor booked through HomeEase.",
      },
      "elec-outlet": {
        title: "Outlet & switch installation",
        category: "electrical",
        categoryLabel: "Electrical",
        price: 89,
        fee: 9,
        duration: "1–2 hours",
        hero: "../assets/images/svc-outlets.jpg",
        summary:
          "Replace outdated outlets, add USB receptacles, install dimmers, or fix dead plugs—priced per device with clear arrival windows.",
        includes: [
          "Up to 2 devices per booking (request more in notes)",
          "Code-compliant materials or use your supplied devices",
          "Patch-friendly trim and testing before we leave",
        ],
        addons: ["AFCI/GFCI upgrade per circuit (+$65)", "Smart switch pairing (+$35 each)"],
        warranty: "90-day workmanship warranty on labor booked through HomeEase.",
      },
      "elec-lighting": {
        title: "Lighting fixture installation",
        category: "electrical",
        categoryLabel: "Electrical",
        price: 125,
        fee: 10,
        duration: "1–3 hours",
        hero: "../assets/images/svc-lighting.jpg",
        summary:
          "Hang pendants, chandeliers, recessed retrofits, and exterior fixtures. Ceiling height and weight may adjust final quote on site.",
        includes: [
          "Mounting & wiring for customer-supplied fixture",
          "Bulb-ready testing and switch verification",
          "Basic ceiling patch recommendations if box upgrade needed",
        ],
        addons: ["Heavy fixture brace & support (+$85)", "Dimmer compatibility check (+$25)"],
        warranty: "90-day workmanship warranty on labor booked through HomeEase.",
      },
      "plumb-leak": {
        title: "Leak detection & repair",
        category: "plumbing",
        categoryLabel: "Plumbing",
        price: 149,
        fee: 10,
        duration: "1–3 hours",
        hero: "../assets/images/svc-plumbing.jpg",
        summary:
          "Stop water damage early. Pros trace supply lines, angle stops, slab signs, and fixture leaks; repairs quoted before work where possible.",
        includes: [
          "Pressure test & visual inspection",
          "Minor seal and packing repairs included in base window",
          "Moisture guidance and dry-out tips",
        ],
        addons: ["Electronic leak locate (+$120)", "Drywall access patch (+ quoted)"],
        warranty: "30-day leak-free guarantee on repaired joints booked through HomeEase.",
      },
      "plumb-drain": {
        title: "Drain cleaning",
        category: "plumbing",
        categoryLabel: "Plumbing",
        price: 129,
        fee: 9,
        duration: "1–2 hours",
        hero: "../assets/images/hero-slide-2.jpg",
        summary:
          "Clear slow kitchen, bath, laundry, and main drains using augers and safe cleaners—camera available for recurring clogs.",
        includes: [
          "One branch line clearing up to 75 ft reach",
          "Clean-out access assessment",
          "Post-flow test at fixtures",
        ],
        addons: ["Camera inspection (+$175)", "Hydro-jet (quoted on site)"],
        warranty: "14-day re-clear on same line if blockage returns (terms apply).",
      },
      "plumb-heater": {
        title: "Water heater service",
        category: "plumbing",
        categoryLabel: "Plumbing",
        price: 199,
        fee: 11,
        duration: "1–2 hours",
        hero: "../assets/images/hero-slide-1.jpg",
        summary:
          "Flush sediment, test T&P valve and anode, check gas or electrical connections, and advise on replacement if efficiency is poor.",
        includes: [
          "Tank flush & basic efficiency check",
          "Element/thermostat test on electric units",
          "Combustion & venting visual on gas units",
        ],
        addons: ["Anode rod replacement (+$95 + parts)", "Expansion tank install (+ quoted)"],
        warranty: "30-day labor warranty on adjustments made during visit.",
      },
      "hvac-tune": {
        title: "HVAC seasonal tune-up",
        category: "hvac",
        categoryLabel: "HVAC",
        price: 159,
        fee: 10,
        duration: "1–2 hours",
        hero: "../assets/images/svc-hvac-unit.jpg",
        summary:
          "Keep efficiency high and catch small issues before peak season. Includes filter check, coil visual, drain line flush, and safety controls.",
        includes: [
          "Inspect indoor & outdoor units",
          "Refrigerant pressure spot-check (no recharge included)",
          "Thermostat calibration & filter replacement if you supply filter",
        ],
        addons: ["UV light install (+ quoted)", "Duct leakage consult (+$85)"],
        warranty: "Satisfaction revisit on tune scope within 14 days.",
      },
      "hvac-ac": {
        title: "AC repair & diagnostics",
        category: "hvac",
        categoryLabel: "HVAC",
        price: 189,
        fee: 11,
        duration: "1–3 hours",
        hero: "../assets/images/hero-slide-2.jpg",
        summary:
          "No cool air, ice on lines, or tripping breakers—technicians diagnose capacitors, contactors, fans, and charge levels with upfront repair options.",
        includes: [
          "Full system diagnostic",
          "Small parts commonly stocked on truck",
          "Written options before major component swaps",
        ],
        addons: ["After-hours emergency (+$95)", "Refrigerant top-off per lb (EPA rules apply)"],
        warranty: "90-day labor on repairs completed during visit.",
      },
      "hvac-furnace": {
        title: "Furnace repair",
        category: "hvac",
        categoryLabel: "HVAC",
        price: 199,
        fee: 11,
        duration: "1–3 hours",
        hero: "../assets/images/featured-electrician.jpg",
        summary:
          "Ignition failures, limit switches, blower noise, and short cycling—winter-priority routing in supported metros.",
        includes: [
          "Heat exchanger visual where accessible",
          "Safety limit & rollout testing",
          "Combustion analysis on supported models",
        ],
        addons: ["Carbon monoxide spot test (+$45)", "Humidifier service (+$75)"],
        warranty: "90-day labor on repairs completed during visit.",
      },
      "land-lawn": {
        title: "Lawn mowing & edging",
        category: "landscape",
        categoryLabel: "Landscaping",
        price: 55,
        fee: 6,
        duration: "1 hour",
        hero: "../assets/images/svc-landscape.jpg",
        summary:
          "Clean stripes, crisp edges, and clippings handled per your preference—ideal for weekly or bi-weekly routes.",
        includes: [
          "Mow up to 8,000 sq ft lot (home footprint typical)",
          "Line trim & hard-edge sidewalks",
          "Bag or mulch clippings—specify in notes",
        ],
        addons: ["Hedge trim front shrubs (+$45)", "Leaf blow patios (+$25)"],
        warranty: "Revisit for missed strips reported within 24 hours.",
      },
      "land-garden": {
        title: "Mulch & garden bed refresh",
        category: "landscape",
        categoryLabel: "Landscaping",
        price: 175,
        fee: 12,
        duration: "2–4 hours",
        hero: "../assets/images/hero-slide-3.jpg",
        summary:
          "Weed, edge, install premium mulch, and shape small shrubs—materials billed pass-through or use your delivery.",
        includes: [
          "Up to 120 sq ft beds prepped",
          "2″ mulch depth standard",
          "Light shrub hand-pruning",
        ],
        addons: ["Additional yards of mulch (+ material)", "Seasonal color plantings (+ quoted)"],
        warranty: "7-day plant establishment watering guide included.",
      },
      "land-sprinkler": {
        title: "Sprinkler & irrigation check",
        category: "landscape",
        categoryLabel: "Landscaping",
        price: 95,
        fee: 8,
        duration: "1–2 hours",
        hero: "../assets/images/svc-sprinkler.jpg",
        summary:
          "Zone-by-zone activation, head adjustment, leak listen, and controller programming for seasonal schedules.",
        includes: [
          "Verify all zones activate",
          "Adjust spray patterns away from hardscape",
          "Battery & backup check on controller",
        ],
        addons: ["Solenoid replacement (+ parts)", "Rain sensor install (+$120)"],
        warranty: "14-day callback on adjustments made during visit.",
      },
      "clean-deep": {
        title: "Deep home clean",
        category: "cleaning",
        categoryLabel: "Cleaning",
        price: 189,
        fee: 12,
        duration: "3–5 hours",
        hero: "../assets/images/hero-slide-3.jpg",
        summary:
          "Top-to-bottom clean for kitchens, baths, living areas, and floors—perfect before guests or after projects.",
        includes: [
          "Kitchen fronts, appliances exterior, and sink detail",
          "Bath disinfect & glass polish",
          "Vacuum, mop, and baseboard dust",
        ],
        addons: ["Inside oven & fridge (+$45 each)", "Interior windows (+$8/pane avg)"],
        warranty: "Re-clean touch-up for missed areas reported within 24 hours.",
      },
      "clean-move": {
        title: "Move-in / move-out clean",
        category: "cleaning",
        categoryLabel: "Cleaning",
        price: 249,
        fee: 14,
        duration: "4–6 hours",
        hero: "../assets/images/svc-landscape.jpg",
        summary:
          "Empty-home pass for turnovers: cabinets in/out, closets, garages optional, and photo-ready handoff for landlords.",
        includes: [
          "All rooms including inside cabinets & drawers",
          "Bath descale & fixture polish",
          "Garage sweep (1-car) if selected in notes",
        ],
        addons: ["Carpet spot treatment (+$75)", "Wall wash (+ quoted)"],
        warranty: "48-hour punch-list window for rental inspections.",
      },
      "clean-recurring": {
        title: "Recurring housekeeping",
        category: "cleaning",
        categoryLabel: "Cleaning",
        price: 99,
        fee: 8,
        duration: "2–3 hours",
        hero: "../assets/images/svc-lighting.jpg",
        summary:
          "Maintain a baseline clean on a cadence you choose—same crew matching is prioritized in supported ZIPs.",
        includes: [
          "Kitchen & bath refresh each visit",
          "Dust living areas & vacuum traffic lanes",
          "One rotating deep task per visit (e.g., blinds)",
        ],
        addons: ["Laundry fold (+$25/load)", "Change bed linens (+$15/bed)"],
        warranty: "Skip/credit policy per HomeEase membership terms.",
      },
    },
  };

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function formatMoney(n) {
    return "$" + n.toFixed(0);
  }

  function getServiceHero(slug) {
    var s = BROWSE.services[slug];
    return s && s.hero ? s.hero : "../assets/images/hero-placeholder.svg";
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  function initCategoryPage() {
    if (document.body.getAttribute("data-marketplace") === "remote") {
      return;
    }
    var slug = getParam("c") || "electrical";
    var data = BROWSE.categories[slug];
    if (!data) {
      slug = "electrical";
      data = BROWSE.categories[slug];
    }

    var h1 = qs("#browseCategoryTitle");
    var lead = qs("#browseCategoryLead");
    var grid = qs("#browseServiceGrid");
    var crumb = qs("#browseBreadcrumbCurrent");
    if (!h1 || !lead || !grid) return;

    h1.textContent = data.title;
    lead.textContent = data.lead;
    if (crumb) crumb.textContent = data.title;

    document.title = data.title + " — HomeEase";

    grid.innerHTML = "";
    data.services.forEach(function (svc) {
      var detailUrl = "service-detail.html?s=" + encodeURIComponent(svc.slug);
      var imgSrc = getServiceHero(svc.slug);
      var card = document.createElement("article");
      card.className = "service-card card-lift";
      card.innerHTML =
        '<a class="service-card__media" href="' +
        detailUrl +
        '"><img src="' +
        imgSrc +
        '" alt="' +
        escapeAttr(svc.title) +
        '" loading="lazy" width="640" height="360" /></a>' +
        '<div class="service-card__body">' +
        (svc.tag ? '<span class="service-card__tag">' + svc.tag + "</span>" : "") +
        '<h2 class="service-card__title"><a href="' +
        detailUrl +
        '">' +
        svc.title +
        "</a></h2>" +
        '<p class="service-card__desc">' +
        svc.desc +
        "</p>" +
        '<div class="service-card__foot">' +
        '<span class="service-card__price">' +
        svc.price +
        "</span>" +
        '<a class="btn btn--primary" href="' +
        detailUrl +
        '">View &amp; book</a>' +
        "</div></div>";
      grid.appendChild(card);
    });
  }

  function setText(id, text) {
    var el = qs(id);
    if (el) el.textContent = text;
  }

  function setHtml(id, html) {
    var el = qs(id);
    if (el) el.innerHTML = html;
  }

  function initServicePage() {
    if (getParam("id")) {
      return;
    }
    var slug = getParam("s") || "elec-panel";
    var svc = BROWSE.services[slug];
    if (!svc) {
      slug = "elec-panel";
      svc = BROWSE.services[slug];
    }

    document.title = svc.title + " — HomeEase";

    setText("#svcBreadcrumbCat", svc.categoryLabel);
    var catLink = qs("#svcBreadcrumbCatLink");
    if (catLink) catLink.setAttribute("href", "category.html?c=" + encodeURIComponent(svc.category));
    setText("#svcBreadcrumbService", svc.title);

    var hero = qs("#svcHero");
    if (hero) {
      hero.style.backgroundImage = "url('" + svc.hero + "')";
    }

    setText("#svcTitle", svc.title);
    setText("#svcSummary", svc.summary);
    setText("#svcDuration", svc.duration);
    setText("#svcPriceDisplay", formatMoney(svc.price));
    setText("#svcPriceLine", formatMoney(svc.price));
    setText("#svcFeeLine", formatMoney(svc.fee));
    setText("#svcTotalLine", formatMoney(svc.price + svc.fee));
    setText("#svcWarranty", svc.warranty);

    var inc = qs("#svcIncludes");
    if (inc) {
      inc.innerHTML = svc.includes.map(function (i) {
        return "<li>" + i + "</li>";
      }).join("");
    }
    var addons = qs("#svcAddons");
    if (addons) {
      addons.innerHTML = svc.addons.map(function (i) {
        return "<li>" + i + "</li>";
      }).join("");
    }

    qs("#bookingServiceSlug").value = slug;
    qs("#bookingPriceBase").value = String(svc.price);
    qs("#bookingFee").value = String(svc.fee);

    initBookingWidget();
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function initBookingWidget() {
    var daysRow = qs("[data-booking-days]");
    var timesRow = qs("[data-booking-times]");
    if (!daysRow || !timesRow) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var selectedDateInput = qs("#bookingDate");
    var selectedTimeInput = qs("#bookingTime");

    daysRow.innerHTML = "";
    for (var i = 0; i < 14; i++) {
      var d = new Date(today);
      d.setDate(today.getDate() + i);
      var iso = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "booking-day" + (i === 0 ? " is-selected" : "");
      btn.setAttribute("data-date", iso);
      btn.innerHTML =
        '<span class="booking-day__dow">' +
        d.toLocaleDateString(undefined, { weekday: "short" }) +
        '</span><span class="booking-day__num">' +
        d.getDate() +
        "</span>";
      (function (btnEl, dateIso) {
        btnEl.addEventListener("click", function () {
          qsa(".booking-day", daysRow).forEach(function (b) {
            b.classList.remove("is-selected");
          });
          btnEl.classList.add("is-selected");
          if (selectedDateInput) selectedDateInput.value = dateIso;
        });
      })(btn, iso);
      daysRow.appendChild(btn);
    }

    if (selectedDateInput) {
      selectedDateInput.value =
        today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
      selectedDateInput.min = selectedDateInput.value;
    }

    var slots = [
      "8:00 AM",
      "9:00 AM",
      "10:00 AM",
      "12:00 PM",
      "2:00 PM",
      "4:00 PM",
      "6:00 PM",
    ];
    timesRow.innerHTML = "";
    slots.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "booking-slot";
      b.textContent = t;
      b.setAttribute("data-time", t);
      (function (slotBtn, timeLabel) {
        slotBtn.addEventListener("click", function () {
          qsa(".booking-slot", timesRow).forEach(function (x) {
            x.classList.remove("is-selected");
          });
          slotBtn.classList.add("is-selected");
          if (selectedTimeInput) selectedTimeInput.value = timeLabel;
        });
      })(b, t);
      timesRow.appendChild(b);
    });

    var form = qs("[data-booking-form]");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var date = selectedDateInput && selectedDateInput.value;
        var time = selectedTimeInput && selectedTimeInput.value;
        if (!date || !time) {
          window.alert("Please choose a date and time slot to continue.");
          return;
        }
        var dur = qs("#bookingDuration", form);
        var addr = qs("#bookingAddress", form);
        var notes = qs("#bookingNotes", form);
        var payload = {
          slug: slugFromForm(),
          date: date,
          time: time,
          duration: dur && dur.value ? dur.value : "",
          address: addr && addr.value ? addr.value : "",
          notes: notes && notes.value ? notes.value : "",
          form: form,
        };
        if (typeof window.homeEaseAfterBookingSubmit === "function") {
          window.homeEaseAfterBookingSubmit(payload);
          return;
        }
        var params = new URLSearchParams();
        params.set("service", payload.slug);
        params.set("date", payload.date);
        params.set("time", payload.time);
        if (payload.duration) params.set("duration", payload.duration);
        if (payload.address) params.set("address", payload.address);
        if (payload.notes) params.set("notes", payload.notes);
        window.location.href = "signup.html?" + params.toString();
      });
    }

    var fb = qs("#bookingDateFallback");
    if (fb && selectedDateInput) {
      fb.min = selectedDateInput.min || "";
      fb.value = selectedDateInput.value;
      fb.addEventListener("change", function () {
        selectedDateInput.value = fb.value;
        qsa(".booking-day", daysRow).forEach(function (b) {
          b.classList.toggle("is-selected", b.getAttribute("data-date") === fb.value);
        });
      });
    }
  }

  function slugFromForm() {
    var el = qs("#bookingServiceSlug");
    return el ? el.value : "";
  }

  function initBrowse() {
    var page = document.body.getAttribute("data-browse-page");
    if (page === "category") initCategoryPage();
    else if (page === "service") initServicePage();
  }

  window.homeEaseInitBookingWidget = initBookingWidget;

  document.addEventListener("DOMContentLoaded", initBrowse);
})();
