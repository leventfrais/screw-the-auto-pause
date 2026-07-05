(function routeScrewTheAutoPauseRules() {
  "use strict";

  var rulesApi = globalThis.ScrewTheAutoPauseRules;
  var CHANNEL = "screw-the-auto-pause";
  var ROUTE_EVENT = "screw-the-auto-pause:route";
  var EN_DESCRIPTION = "Completely prevent video and audio from auto-pausing when switching tabs, switching browsers (minimizing, or leaving the current browser, etc.) on selected domains.";
  var ZH_DESCRIPTION = "彻底阻止选中域名的网页因网页切换、浏览器切换（最小化，或者离开了当前浏览器等）所导致的视音频自动暂停";

  if (!rulesApi || typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
    return;
  }

  function message(key) {
    try {
      return chrome.i18n.getMessage(key) || "";
    } catch (error) {
      return "";
    }
  }

  function sendRoute(enabled, matchingRule) {
    var payload = {
      source: CHANNEL,
      target: "main-world",
      type: "route-state",
      enabled: Boolean(enabled),
      matchingRule: matchingRule || "",
      url: location.href,
      locale: chrome.i18n.getUILanguage(),
      logActivated: message("logActivated"),
      logInactive: message("logInactive"),
      description: message("extensionDescription"),
      descriptionEn: EN_DESCRIPTION,
      descriptionZh: ZH_DESCRIPTION
    };

    deliverRoute(payload);
    window.setTimeout(function repeatRouteSoon() {
      deliverRoute(payload);
    }, 50);
    window.setTimeout(function repeatRouteAfterEarlyPageScripts() {
      deliverRoute(payload);
    }, 250);
  }

  function deliverRoute(payload) {
    try {
      window.postMessage(payload, "*");
    } catch (error) {
      // MAIN-world postMessage is best-effort; the CustomEvent path below is a fallback.
    }

    try {
      document.documentElement.dispatchEvent(new CustomEvent(ROUTE_EVENT, {
        detail: JSON.stringify(payload)
      }));
    } catch (error) {
      // The message path above already carries the same payload.
    }
  }

  function readRules(callback) {
    try {
      chrome.storage.local.get({ [rulesApi.STORAGE_KEY]: [] }, function handleStorage(items) {
        if (chrome.runtime.lastError) {
          console.warn("[Screw The Auto Pause] " + (message("logStorageError") || chrome.runtime.lastError.message));
          callback([]);
          return;
        }

        callback(rulesApi.normalizeRules(items[rulesApi.STORAGE_KEY]));
      });
    } catch (error) {
      console.warn("[Screw The Auto Pause] " + (message("logStorageError") || error.message));
      callback([]);
    }
  }

  function evaluate() {
    readRules(function route(rules) {
      var matchingRule = rulesApi.findMatchingRule(rules, location.href);
      sendRoute(Boolean(matchingRule), matchingRule);
    });
  }

  evaluate();

  try {
    chrome.storage.onChanged.addListener(function handleStorageChange(changes, areaName) {
      if (areaName === "local" && changes[rulesApi.STORAGE_KEY]) {
        evaluate();
      }
    });
  } catch (error) {
    // Storage change observation is optional; the initial route still runs.
  }
})();
