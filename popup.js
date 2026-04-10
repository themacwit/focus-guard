// FocusGuard popup

const TOGGLES = [
  { id: "instagramReels", key: "instagramReelsBlocked" },
  { id: "twitterFeed",    key: "twitterFeedBlocked" },
];

// Read current state and set checkboxes
chrome.storage.sync.get(
  Object.fromEntries(TOGGLES.map(function (t) { return [t.key, true]; })),
  function (data) {
    TOGGLES.forEach(function (t) {
      var checkbox = document.getElementById(t.id);
      checkbox.checked = !!data[t.key];

      checkbox.addEventListener("change", function () {
        chrome.storage.sync.set({ [t.key]: checkbox.checked });
      });
    });
  }
);
