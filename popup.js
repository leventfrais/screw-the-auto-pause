(function initializePopup() {
  "use strict";

  var rulesApi = globalThis.ScrewTheAutoPauseRules;
  var state = {
    rules: [],
    activeUrl: "",
    activePattern: ""
  };

  var elements = {
    html: document.documentElement,
    addCurrentDomain: document.getElementById("add-current-domain"),
    currentDomainPreview: document.getElementById("current-domain-preview"),
    form: document.getElementById("rule-form"),
    input: document.getElementById("rule-input"),
    list: document.getElementById("rules-list"),
    empty: document.getElementById("empty-rules"),
    status: document.getElementById("status")
  };

  function i18n(key) {
    try {
      return chrome.i18n.getMessage(key) || "";
    } catch (error) {
      return "";
    }
  }

  function localize() {
    elements.html.lang = chrome.i18n.getUILanguage().replace("_", "-");
    document.querySelectorAll("[data-i18n]").forEach(function setText(node) {
      var value = i18n(node.getAttribute("data-i18n"));
      if (value) {
        node.textContent = value;
      }
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function setPlaceholder(node) {
      var value = i18n(node.getAttribute("data-i18n-placeholder"));
      if (value) {
        node.setAttribute("placeholder", value);
      }
    });
    document.querySelectorAll("[data-i18n-label]").forEach(function setLabel(node) {
      var value = i18n(node.getAttribute("data-i18n-label"));
      if (value) {
        node.setAttribute("aria-label", value);
      }
    });
  }

  function setStatus(messageKey) {
    elements.status.textContent = messageKey ? i18n(messageKey) : "";
  }

  function storageGet() {
    return new Promise(function resolveStorage(resolve, reject) {
      chrome.storage.local.get({ [rulesApi.STORAGE_KEY]: [] }, function handleGet(items) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(rulesApi.normalizeRules(items[rulesApi.STORAGE_KEY]));
      });
    });
  }

  function storageSet(rules) {
    return new Promise(function resolveStorage(resolve, reject) {
      chrome.storage.local.set({ [rulesApi.STORAGE_KEY]: rules }, function handleSet() {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  function renderRules(focusElement) {
    elements.list.textContent = "";
    elements.empty.classList.toggle("visible", state.rules.length === 0);

    state.rules.forEach(function renderRule(rule) {
      var item = document.createElement("li");
      var text = document.createElement("span");
      var remove = document.createElement("button");

      item.className = "rule-item";
      text.className = "rule-text";
      text.textContent = rule;
      remove.className = "rule-remove";
      remove.type = "button";
      remove.textContent = i18n("removeRuleButton") || "-";
      remove.setAttribute("aria-label", (i18n("removeRuleButton") || "-") + " " + rule);
      remove.addEventListener("click", function removeRule() {
        persistRules(state.rules.filter(function keepRule(candidate) {
          return candidate !== rule;
        }), "ruleRemoved", elements.input);
      });

      item.append(text, remove);
      elements.list.append(item);
    });

    if (focusElement && typeof focusElement.focus === "function") {
      focusElement.focus({ preventScroll: true });
    }
  }

  function persistRules(nextRules, successMessage, focusElement) {
    var previousRules = state.rules.slice();
    state.rules = rulesApi.normalizeRules(nextRules);
    renderRules(focusElement);
    setStatus(successMessage);

    storageSet(state.rules).catch(function handleError() {
      state.rules = previousRules;
      renderRules(focusElement);
      setStatus("storageError");
    });
  }

  function addRule(rule, focusElement) {
    var normalized = rulesApi.normalizeRule(rule);
    if (!normalized || !rulesApi.wildcardToRegExp(normalized)) {
      setStatus("ruleInvalid");
      return;
    }

    if (state.rules.indexOf(normalized) !== -1) {
      setStatus("ruleAlreadyExists");
      if (focusElement && typeof focusElement.focus === "function") {
        focusElement.focus({ preventScroll: true });
      }
      return;
    }

    persistRules(state.rules.concat(normalized), "ruleAdded", focusElement);
  }

  function updateCurrentDomainPreview() {
    state.activePattern = rulesApi.suggestDomainPatternFromUrl(state.activeUrl);
    elements.addCurrentDomain.disabled = !state.activePattern;
    elements.currentDomainPreview.textContent = state.activePattern || i18n("activeDomainUnavailable");
  }

  function loadActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function handleTabs(tabs) {
      var tab = tabs && tabs[0];
      state.activeUrl = tab && tab.url ? tab.url : "";
      updateCurrentDomainPreview();
    });
  }

  function wireEvents() {
    elements.form.addEventListener("submit", function handleManualRule(event) {
      event.preventDefault();
      addRule(elements.input.value, elements.input);
      elements.input.value = "";
    });

    elements.addCurrentDomain.addEventListener("click", function handleCurrentDomain() {
      if (!state.activePattern) {
        setStatus("activeDomainUnavailable");
        return;
      }
      addRule(state.activePattern, elements.addCurrentDomain);
    });

    chrome.storage.onChanged.addListener(function handleStorageChange(changes, areaName) {
      if (areaName === "local" && changes[rulesApi.STORAGE_KEY]) {
        state.rules = rulesApi.normalizeRules(changes[rulesApi.STORAGE_KEY].newValue);
        renderRules();
      }
    });
  }

  function initialize() {
    localize();
    wireEvents();
    loadActiveTab();
    storageGet()
      .then(function setRules(rules) {
        state.rules = rules;
        renderRules();
      })
      .catch(function handleError() {
        setStatus("storageError");
        renderRules();
      });
  }

  initialize();
})();
