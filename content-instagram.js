// FocusGuard — Instagram Reels blocker

(function () {
  "use strict";

  const STORAGE_KEY = "instagramReelsBlocked";
  const OVERLAY_ID = "focusguard-reels-overlay";
  const HIDDEN_ATTR = "data-focusguard-hidden";

  let enabled = false;
  let feedObserver = null;
  let navObserver = null;
  let historyIntercepted = false;

  // --- Helpers ---

  function isReelsPage() {
    return /^\/reels(\/|$)/.test(location.pathname);
  }

  function isFeedPage() {
    return location.pathname === "/";
  }

  // --- Reels page overlay ---

  function showOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;
    console.log("[FocusGuard] Blocking Reels page");

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "focusguard-overlay";
    overlay.textContent = "Reels blocked by FocusGuard";

    // Replace body content with overlay
    document.body.replaceChildren(overlay);
  }

  function removeOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      console.log("[FocusGuard] Removing Reels overlay (navigated away or disabled)");
      // Can't restore original content after replaceChildren — reload is needed
      location.reload();
    }
  }

  // --- In-feed Reel hiding ---

  function hideReelArticle(article) {
    if (article.hasAttribute(HIDDEN_ATTR)) return;
    article.setAttribute(HIDDEN_ATTR, "true");
    article.style.display = "none";
    console.log("[FocusGuard] Hid in-feed Reel");
  }

  function showReelArticle(article) {
    if (!article.hasAttribute(HIDDEN_ATTR)) return;
    article.removeAttribute(HIDDEN_ATTR);
    article.style.display = "";
    console.log("[FocusGuard] Restored in-feed Reel");
  }

  function scanAndHideFeedReels(root) {
    const links = (root || document.body).querySelectorAll('a[href*="/reel/"]');
    links.forEach(function (link) {
      const article = link.closest("article");
      if (article) hideReelArticle(article);
    });
  }

  function restoreAllFeedReels() {
    document.querySelectorAll("[" + HIDDEN_ATTR + "]").forEach(showReelArticle);
  }

  function startFeedObserver() {
    if (feedObserver) return;
    console.log("[FocusGuard] Starting feed observer");

    // Initial scan
    scanAndHideFeedReels();

    feedObserver = new MutationObserver(function (mutations) {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          // Check if the added node itself or its descendants contain reel links
          if (node.matches && node.matches('a[href*="/reel/"]')) {
            const article = node.closest("article");
            if (article) hideReelArticle(article);
          }
          if (node.querySelectorAll) {
            scanAndHideFeedReels(node);
          }
        }
      }
    });

    feedObserver.observe(document.body, { childList: true, subtree: true });
  }

  function stopFeedObserver() {
    if (feedObserver) {
      console.log("[FocusGuard] Stopping feed observer");
      feedObserver.disconnect();
      feedObserver = null;
    }
    restoreAllFeedReels();
  }

  // --- Route evaluation ---

  function evaluateRoute() {
    if (!enabled) return;

    if (isReelsPage()) {
      showOverlay();
    } else if (isFeedPage()) {
      startFeedObserver();
    }
  }

  // --- Navigation detection ---

  function onNavigate() {
    console.log("[FocusGuard] Navigation detected:", location.pathname);

    // If the reels overlay replaced the body, reload to restore the page
    if (document.getElementById(OVERLAY_ID) && !isReelsPage()) {
      console.log("[FocusGuard] Left Reels page, reloading to restore content");
      location.reload();
      return;
    }

    // Stop feed observer if we left the feed
    if (!isFeedPage() && feedObserver) {
      stopFeedObserver();
    }

    evaluateRoute();
  }

  function interceptHistoryMethod(method) {
    const original = history[method];
    history[method] = function () {
      const result = original.apply(this, arguments);
      onNavigate();
      return result;
    };
  }

  function startNavObserver() {
    // History intercepts and popstate are one-time, permanent setup
    if (!historyIntercepted) {
      interceptHistoryMethod("pushState");
      interceptHistoryMethod("replaceState");
      window.addEventListener("popstate", onNavigate);
      historyIntercepted = true;
    }

    if (navObserver) return;

    // MutationObserver on <body> to catch SPA navigations that don't use history API
    navObserver = new MutationObserver(function () {
      // Debounce by checking if pathname actually changed
      if (navObserver._lastPath !== location.pathname) {
        navObserver._lastPath = location.pathname;
        onNavigate();
      }
    });
    navObserver._lastPath = location.pathname;
    navObserver.observe(document.body, { childList: true, subtree: true });
  }

  function stopNavObserver() {
    if (navObserver) {
      navObserver.disconnect();
      navObserver = null;
    }
  }

  // --- Enable / Disable ---

  function enable() {
    if (enabled) return;
    enabled = true;
    console.log("[FocusGuard] Reels blocking enabled");
    startNavObserver();
    evaluateRoute();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    console.log("[FocusGuard] Reels blocking disabled");

    stopFeedObserver();
    stopNavObserver();

    // Remove overlay if present (triggers reload to restore page)
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      removeOverlay();
    }
  }

  // --- Storage ---

  function init() {
    chrome.storage.sync.get({ [STORAGE_KEY]: true }, function (data) {
      console.log("[FocusGuard] Initial state:", STORAGE_KEY, "=", data[STORAGE_KEY]);
      if (data[STORAGE_KEY]) {
        enable();
      }
    });

    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "sync") return;
      if (!(STORAGE_KEY in changes)) return;

      const newValue = changes[STORAGE_KEY].newValue;
      console.log("[FocusGuard] Storage changed:", STORAGE_KEY, "=", newValue);

      if (newValue) {
        enable();
      } else {
        disable();
      }
    });
  }

  init();
})();
