# FocusGuard — Manual Test Plan

Load the extension as unpacked in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

## Instagram Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Reels page blocked | Navigate to `instagram.com/reels` | Full-page overlay: "Reels blocked by FocusGuard" |
| 2 | Feed Reels hidden | Scroll `instagram.com/` feed until a Reel appears | Reel `<article>` elements are hidden (`display:none`); stories tray and regular posts remain visible |
| 3 | Allowed pages unblocked | Navigate to `/direct/inbox`, a `/p/` post, and a profile page | All render normally, no overlay, no hidden content |
| 4 | SPA navigation: feed → reels → DMs → back | From feed, click Reels tab → overlay shows. Press browser back → page reloads and feed restores. Navigate to DMs → DMs render normally |
| 5 | Toggle off live | Open popup, turn off "Block Instagram Reels". Return to `instagram.com/reels` | Reels page renders normally. Feed Reels are visible |
| 6 | Toggle on after refresh | Turn toggle back on in popup. Hard-refresh (`Cmd+Shift+R`) `instagram.com/` | Blocking re-activates: reels page blocked, in-feed Reels hidden |

## X/Twitter Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7 | Home feed blocked | Navigate to `x.com/home` | Primary column shows "Feed blocked by FocusGuard". Sidebar navigation remains usable |
| 8 | Explore blocked | Navigate to `x.com/explore` | Primary column shows "Explore blocked by FocusGuard" |
| 9 | Allowed pages unblocked | Navigate to `/messages`, `/notifications`, `/search`, `/<username>`, `/<username>/status/<id>` | All render normally, no overlay |
| 10 | SPA navigation: home → messages → home → profile → explore | Click through each route via sidebar/links | Blocked routes show overlay, allowed routes restore content. No stale overlays remain |
| 11 | Toggle off live | Open popup, turn off "Block X/Twitter Feed". Navigate to `x.com/home` | Feed renders normally, no overlay |
| 12 | Toggle on after refresh | Turn toggle back on in popup. Hard-refresh `x.com/home` | Home feed overlay reappears immediately |

## Console Verification

For every test above, open DevTools Console and confirm:
- `[FocusGuard]` prefixed log messages appear for navigation events, blocking/unblocking, and storage changes.
- No errors or warnings from FocusGuard code.
- No duplicate MutationObserver warnings (check via Performance tab → check "Observer" count stays stable across navigations).
