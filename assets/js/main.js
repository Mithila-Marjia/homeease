/**
 * Minimal UI helpers: mobile sidebar, optional nav current state.
 */
(function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function initDashboardSidebar() {
    var toggle = qs("[data-sidebar-toggle]");
    var sidebar = qs("[data-sidebar]");
    var backdrop = qs("[data-sidebar-backdrop]");
    if (!toggle || !sidebar) return;

    function close() {
      sidebar.classList.remove("is-open");
      if (backdrop) backdrop.classList.remove("is-visible");
      document.body.style.overflow = "";
    }

    function open() {
      sidebar.classList.add("is-open");
      if (backdrop) backdrop.classList.add("is-visible");
      document.body.style.overflow = "hidden";
    }

    toggle.addEventListener("click", function () {
      if (sidebar.classList.contains("is-open")) close();
      else open();
    });

    if (backdrop) {
      backdrop.addEventListener("click", close);
    }

    window.addEventListener(
      "resize",
      function () {
        if (window.matchMedia("(min-width: 900px)").matches) close();
      },
      { passive: true }
    );
  }

  function initHeroSlider() {
    var root = qs("[data-hero-slider]");
    if (!root) return;

    var slides = qsa(".hero__slide", root);
    var btnPrev = qs("[data-hero-prev]", root);
    var btnNext = qs("[data-hero-next]", root);
    if (!slides.length) return;

    var i = 0;
    var timer = null;

    function show(idx) {
      slides[i].classList.remove("is-active");
      i = (idx + slides.length) % slides.length;
      slides[i].classList.add("is-active");
    }

    function next() {
      show(i + 1);
    }

    function prev() {
      show(i - 1);
    }

    function startAuto() {
      stopAuto();
      timer = window.setInterval(next, 7000);
    }

    function stopAuto() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    if (btnNext) btnNext.addEventListener("click", next);
    if (btnPrev) btnPrev.addEventListener("click", prev);

    root.addEventListener("mouseenter", stopAuto);
    root.addEventListener("mouseleave", startAuto);
    root.addEventListener("focusin", stopAuto);
    root.addEventListener("focusout", startAuto);

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) startAuto();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initDashboardSidebar();
    initHeroSlider();
  });
})();
