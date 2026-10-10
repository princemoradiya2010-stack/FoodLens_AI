/**
 * FoodLens AI - animations.js
 * Scroll reveal (IntersectionObserver), navbar scroll shadow,
 * button ripple effect, and progress bar trigger.
 */
(function () {
  "use strict";

  /* --------------------------------------------------------
     1. SCROLL REVEAL via IntersectionObserver
     Watches elements with class fl-animate-* and adds
     fl-reveal when they enter the viewport.
  -------------------------------------------------------- */
  function initScrollReveal() {
    if (!("IntersectionObserver" in window)) {
      // Fallback: just reveal everything immediately
      document.querySelectorAll(
        ".fl-animate-up,.fl-animate-left,.fl-animate-right,.fl-animate-scale,.fl-animate-fade"
      ).forEach(function (el) { el.classList.add("fl-reveal"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("fl-reveal");
            // Also trigger progress bars inside revealed element
            entry.target.querySelectorAll(".progress-bar").forEach(function (bar) {
              bar.classList.add("fl-reveal");
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(
      ".fl-animate-up,.fl-animate-left,.fl-animate-right,.fl-animate-scale,.fl-animate-fade"
    ).forEach(function (el) { observer.observe(el); });

    // Also observe progress bars directly
    var barObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("fl-reveal");
            barObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    document.querySelectorAll(".progress-bar").forEach(function (bar) {
      barObserver.observe(bar);
    });
  }

  /* --------------------------------------------------------
     2. NAVBAR SCROLL SHADOW
  -------------------------------------------------------- */
  function initNavbarScroll() {
    var topbar = document.querySelector(".topbar");
    if (!topbar) return;

    function onScroll() {
      if (window.scrollY > 12) {
        topbar.classList.add("scrolled");
      } else {
        topbar.classList.remove("scrolled");
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* --------------------------------------------------------
     3. BUTTON RIPPLE
  -------------------------------------------------------- */
  function initRipple() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".primary-btn, .secondary-btn");
      if (!btn) return;

      var wave = document.createElement("span");
      wave.className = "ripple-wave";

      var rect = btn.getBoundingClientRect();
      wave.style.left = (e.clientX - rect.left) + "px";
      wave.style.top  = (e.clientY - rect.top)  + "px";

      btn.appendChild(wave);
      setTimeout(function () { wave.remove(); }, 600);
    });
  }

  /* --------------------------------------------------------
     4. AUTO-ANNOTATE SECTIONS with scroll-reveal classes
     Adds fl-animate-up to section headings, cards etc
     so you don't have to manually add classes to HTML.
  -------------------------------------------------------- */
  function autoAnnotate() {
    // Section headings
    document.querySelectorAll(".section-heading:not(.fl-animate-up)").forEach(function (el) {
      el.classList.add("fl-animate-up");
    });

    // Nutrition cards — stagger
    document.querySelectorAll(".nutrition-card:not(.fl-animate-up)").forEach(function (el, i) {
      el.classList.add("fl-animate-up", "fl-delay-" + Math.min(i + 1, 5));
    });

    // Detection cards
    document.querySelectorAll(".detection-card:not(.fl-animate-up)").forEach(function (el, i) {
      el.classList.add("fl-animate-scale", "fl-delay-" + Math.min(i + 1, 5));
    });

    // Quick action cards
    document.querySelectorAll(".quick-action-card:not(.fl-animate-up)").forEach(function (el, i) {
      el.classList.add("fl-animate-up", "fl-delay-" + Math.min(i + 1, 3));
    });

    // History cards
    document.querySelectorAll(".history-card-button:not(.fl-animate-up)").forEach(function (el, i) {
      el.classList.add("fl-animate-up", "fl-delay-" + Math.min(i + 1, 4));
    });

    // Suggestion cards
    document.querySelectorAll(".suggestion-card:not(.fl-animate-up)").forEach(function (el, i) {
      el.classList.add("fl-animate-up", "fl-delay-" + Math.min(i + 1, 4));
    });

    // Daily progress cards
    document.querySelectorAll(".daily-card:not(.fl-animate-up)").forEach(function (el, i) {
      el.classList.add("fl-animate-up", "fl-delay-" + Math.min(i + 1, 4));
    });

    // Mini stats
    document.querySelectorAll(".mini-stat:not(.fl-animate-up)").forEach(function (el, i) {
      el.classList.add("fl-animate-up", "fl-delay-" + Math.min(i + 1, 4));
    });

    // Upload card
    document.querySelectorAll(".upload-card:not(.fl-animate-up)").forEach(function (el) {
      el.classList.add("fl-animate-scale");
    });

    // Meal summary
    document.querySelectorAll(".meal-summary:not(.fl-animate-up)").forEach(function (el) {
      el.classList.add("fl-animate-up");
    });

    // Reinit observer after annotation
    initScrollReveal();
  }

  /* --------------------------------------------------------
     5. RE-RUN on dynamic DOM changes (for SPA-like pages)
  -------------------------------------------------------- */
  function watchDomChanges() {
    if (!("MutationObserver" in window)) return;

    var mut = new MutationObserver(function (mutations) {
      var needsRefresh = mutations.some(function (m) {
        return m.addedNodes.length > 0;
      });
      if (needsRefresh) {
        autoAnnotate();
      }
    });

    mut.observe(document.body, { childList: true, subtree: true });
  }

  /* --------------------------------------------------------
     INIT
  -------------------------------------------------------- */
  function init() {
    initNavbarScroll();
    initRipple();
    autoAnnotate();   // annotates + starts scroll observer
    watchDomChanges();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
