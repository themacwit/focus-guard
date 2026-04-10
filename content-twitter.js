// FocusGuard — X/Twitter feed & video blocker

(function () {
  "use strict";

  const STORAGE_KEY = "twitterFeedBlocked";
  const OVERLAY_ID = "focusguard-twitter-overlay";
  const HIDDEN_ATTR = "data-focusguard-hidden";

  let enabled = false;
  let contentObserver = null;
  let navObserver = null;
  let currentBlockedRoute = null;
  let pollTimer = null;
  let historyIntercepted = false;

  // --- Route detection ---

  function getBlockedRoute() {
    const path = location.pathname;

    if (path === "/home") return "home";
    if (/^\/explore(\/|$)/.test(path)) return "explore";
    // Match /username/video but not system routes we want to allow
    if (/^\/[^/]+\/video(\/|$)/.test(path)) return "video";

    return null;
  }

  function getBlockMessage(route) {
    switch (route) {
      case "home":    return "Feed blocked by FocusGuard";
      case "explore": return "Explore blocked by FocusGuard";
      case "video":   return "Video feed blocked by FocusGuard";
      default:        return "Blocked by FocusGuard";
    }
  }

  // --- Primary column blocking ---

  function getPrimaryColumn() {
    return document.querySelector('[data-testid="primaryColumn"]');
  }

  function blockPrimaryColumn(message) {
    const col = getPrimaryColumn();
    if (!col) return false;
    if (document.getElementById(OVERLAY_ID)) return true;

    console.log("[FocusGuard] Blocking:", message);

    // Hide existing children of the primary column
    for (const child of col.children) {
      child.setAttribute(HIDDEN_ATTR, "true");
      child.style.display = "none";
    }

    // Insert overlay inside the column
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "focusguard-overlay focusguard-overlay--column";
    overlay.textContent = message;
    col.appendChild(overlay);

    return true;
  }

  function unblockPrimaryColumn() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      console.log("[FocusGuard] Removing block overlay");
      overlay.remove();
    }

    // Restore hidden children
    document.querySelectorAll("[" + HIDDEN_ATTR + "]").forEach(function (el) {
      el.removeAttribute(HIDDEN_ATTR);
      el.style.display = "";
    });
  }

  // --- Content observer (re-applies block after React re-renders) ---

  function startContentObserver(message) {
    stopContentObserver();

    if (!blockPrimaryColumn(message)) {
      // Primary column not in DOM yet — poll until it appears
      console.log("[FocusGuard] Waiting for primary column...");
      let attempts = 0;
      pollTimer = setInterval(function () {
        attempts++;
        if (blockPrimaryColumn(message)) {
          clearInterval(pollTimer);
          pollTimer = null;
          attachColumnObserver(message);
        } else if (attempts > 50) {
          console.log("[FocusGuard] Gave up waiting for primary column");
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 100);
      return;
    }

    attachColumnObserver(message);
  }

  function attachColumnObserver(message) {
    const col = getPrimaryColumn();
    if (!col) return;

    contentObserver = new MutationObserver(function () {
      let needsOverlay = !document.getElementById(OVERLAY_ID);

      // Hide any new children React injected
      for (const child of col.children) {
        if (child.id === OVERLAY_ID) continue;
        if (!child.hasAttribute(HIDDEN_ATTR)) {
          child.setAttribute(HIDDEN_ATTR, "true");
          child.style.display = "none";
        }
      }

      // Re-add overlay if React removed it
      if (needsOverlay) {
        console.log("[FocusGuard] Re-applying block after re-render");
        const overlay = document.createElement("div");
        overlay.id = OVERLAY_ID;
        overlay.className = "focusguard-overlay focusguard-overlay--column";
        overlay.textContent = message;
        col.appendChild(overlay);
      }
    });

    contentObserver.observe(col, { childList: true });
    console.log("[FocusGuard] Content observer attached to primary column");
  }

  function stopContentObserver() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (contentObserver) {
      contentObserver.disconnect();
      contentObserver = null;
    }
    unblockPrimaryColumn();
  }

  // --- Route evaluation ---

  function evaluateRoute() {
    const route = getBlockedRoute();

    if (!enabled || !route) {
      if (currentBlockedRoute) {
        console.log("[FocusGuard] Unblocking (navigated to allowed page)");
        stopContentObserver();
        currentBlockedRoute = null;
      }
      return;
    }

    // Different blocked route — tear down and re-apply with new message
    if (route !== currentBlockedRoute) {
      if (currentBlockedRoute) {
        stopContentObserver();
      }
      currentBlockedRoute = route;
      startContentObserver(getBlockMessage(route));
    }
  }

  // --- Navigation detection ---

  function onNavigate() {
    console.log("[FocusGuard] Navigation detected:", location.pathname);
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

    // Fallback: MutationObserver on body for navigations that bypass history API
    navObserver = new MutationObserver(function () {
      if (navObserver._lastPath !== location.pathname) {
        navObserver._lastPath = location.pathname;
        onNavigate();
      } else if (currentBlockedRoute && !document.getElementById(OVERLAY_ID) && !pollTimer) {
        // React may have remounted the primary column — re-apply block
        console.log("[FocusGuard] Overlay lost, re-applying block");
        startContentObserver(getBlockMessage(currentBlockedRoute));
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
    console.log("[FocusGuard] Twitter feed blocking enabled");
    startNavObserver();
    evaluateRoute();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    console.log("[FocusGuard] Twitter feed blocking disabled");
    stopContentObserver();
    stopNavObserver();
    currentBlockedRoute = null;
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
