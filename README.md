# FocusGuard

A Chrome extension that blocks Reels, algorithmic feeds, and video tabs on Instagram and X/Twitter.

## Features

- **Block Instagram Reels** — replaces the `/reels` page with a blocking screen and hides Reel posts injected into the main feed
- **Block X/Twitter Feed** — blocks the Home timeline (`/home`), Explore/trending (`/explore`), and video tabs (`/*/video`)
- **Live toggle** — flip blocking on or off from the popup without reloading the page
- **SPA-aware** — detects client-side navigations via history API intercepts and MutationObservers
- **Minimal footprint** — no frameworks, no build step, no background service worker, no network requests

## Install (unpacked)

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `focus-guard` directory
5. The FocusGuard icon appears in the toolbar — click it to toggle blocking

## Permissions

| Permission | Why |
|------------|-----|
| `storage`  | Persist toggle state across sessions via `chrome.storage.sync` |

No host permissions are requested beyond the content script match patterns (`instagram.com`, `x.com`, `twitter.com`), which are required to inject the blocking logic.
