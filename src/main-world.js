(function installScrewTheAutoPauseMainWorld() {
  "use strict";

  if (window.__screwTheAutoPauseMainWorldInstalled) {
    return;
  }
  window.__screwTheAutoPauseMainWorldInstalled = true;

  var CHANNEL = "screw-the-auto-pause";
  var ROUTE_EVENT = "screw-the-auto-pause:route";
  var EN_DESCRIPTION = "Completely prevent video and audio from auto-pausing when switching tabs, switching browsers (minimizing, or leaving the current browser, etc.) on selected domains.";
  var ZH_DESCRIPTION = "彻底阻止选中域名的网页因网页切换、浏览器切换（最小化，或者离开了当前浏览器等）所导致的视音频自动暂停";
  var state = {
    enabled: false,
    decisionKnown: false,
    visibilityLocked: false,
    lastMatchingRule: "",
    loggedActivation: false
  };

  var alwaysSuppressedEventTypes = {
    visibilitychange: true,
    webkitvisibilitychange: true,
    mozvisibilitychange: true,
    msvisibilitychange: true,
    freeze: true,
    resume: true,
    pagehide: true
  };

  var targetScopedEventTypes = {
    blur: true,
    focusout: true,
    mouseleave: true,
    mouseout: true,
    pointerleave: true
  };

  var handlerProperties = [
    "onblur",
    "onfocusout",
    "onvisibilitychange",
    "onwebkitvisibilitychange",
    "onmozvisibilitychange",
    "onmsvisibilitychange",
    "onfreeze",
    "onresume",
    "onpagehide"
  ];

  var nativeAddEventListener = EventTarget.prototype.addEventListener;
  var nativeRemoveEventListener = EventTarget.prototype.removeEventListener;
  var nativeDispatchEvent = EventTarget.prototype.dispatchEvent;
  var nativeRequestAnimationFrame = window.requestAnimationFrame;
  var nativeCancelAnimationFrame = window.cancelAnimationFrame;
  var listenerRecords = [];
  var rafRecords = {};
  var rafNextId = 1;

  function normalizeType(type) {
    return String(type || "").toLowerCase();
  }

  function getCapture(options) {
    if (typeof options === "boolean") {
      return options;
    }
    return Boolean(options && options.capture);
  }

  function getOnce(options) {
    return Boolean(options && typeof options === "object" && options.once);
  }

  function cloneOptionsWithoutOnce(options) {
    if (!options || typeof options === "boolean") {
      return options;
    }

    var clone = {};
    Object.keys(options).forEach(function copyOption(key) {
      if (key !== "once") {
        clone[key] = options[key];
      }
    });
    clone.once = false;
    return clone;
  }

  function isCallableListener(listener) {
    return typeof listener === "function" || Boolean(listener && typeof listener.handleEvent === "function");
  }

  function isPageScopeTarget(target) {
    try {
      return target === window ||
        target === document ||
        target === document.documentElement ||
        target === document.body;
    } catch (error) {
      return false;
    }
  }

  function isRelatedTargetInsideDocument(relatedTarget) {
    try {
      return Boolean(relatedTarget && document.documentElement && document.documentElement.contains(relatedTarget));
    } catch (error) {
      return false;
    }
  }

  function isElementInteractionEvent(event) {
    if (!event) {
      return false;
    }

    if (event.target && !isPageScopeTarget(event.target)) {
      return true;
    }

    return isRelatedTargetInsideDocument(event.relatedTarget);
  }

  function shouldManageType(type, listenerTarget) {
    var normalizedType = normalizeType(type);
    return Boolean(alwaysSuppressedEventTypes[normalizedType]) ||
      Boolean(targetScopedEventTypes[normalizedType] && isPageScopeTarget(listenerTarget));
  }

  function canDropListenerImmediately(type) {
    return Boolean(alwaysSuppressedEventTypes[normalizeType(type)]);
  }

  function shouldSuppressEvent(event, listenerTarget) {
    if (!event || !shouldManageType(event.type, listenerTarget)) {
      return false;
    }

    if (event.type === "pagehide" && event.persisted !== true && document.visibilityState === "visible") {
      return false;
    }

    if (targetScopedEventTypes[normalizeType(event.type)] && isElementInteractionEvent(event)) {
      return false;
    }

    return state.enabled || !state.decisionKnown;
  }

  function invokeListener(listener, target, event) {
    if (typeof listener === "function") {
      return listener.call(target, event);
    }
    return listener.handleEvent.call(listener, event);
  }

  function removeRecord(record) {
    var index = listenerRecords.indexOf(record);
    if (index !== -1) {
      listenerRecords.splice(index, 1);
    }
  }

  function findRecord(target, type, listener, capture) {
    var normalizedType = normalizeType(type);
    for (var index = listenerRecords.length - 1; index >= 0; index -= 1) {
      var record = listenerRecords[index];
      if (record.target === target && record.type === normalizedType && record.listener === listener && record.capture === capture) {
        return record;
      }
    }
    return null;
  }

  function wrappedAddEventListener(type, listener, options) {
    try {
      if (shouldManageType(type, this)) {
        if (state.enabled && canDropListenerImmediately(type)) {
          return undefined;
        }

        if (!isCallableListener(listener)) {
          return nativeAddEventListener.apply(this, arguments);
        }

        var capture = getCapture(options);
        var existing = findRecord(this, type, listener, capture);
        if (existing) {
          return undefined;
        }

        var target = this;
        var once = getOnce(options);
        var nativeOptions = cloneOptionsWithoutOnce(options);
        var record = {
          target: target,
          type: normalizeType(type),
          listener: listener,
          capture: capture,
          wrapped: null
        };

        record.wrapped = function guardedPresenceListener(event) {
          if (shouldSuppressEvent(event, target)) {
            return undefined;
          }

          if (once) {
            try {
              nativeRemoveEventListener.call(target, type, record.wrapped, nativeOptions);
            } catch (error) {
              nativeRemoveEventListener.call(target, type, record.wrapped, capture);
            }
            removeRecord(record);
          }

          return invokeListener(listener, target, event);
        };

        listenerRecords.push(record);
        return nativeAddEventListener.call(target, type, record.wrapped, nativeOptions);
      }
    } catch (error) {
      return nativeAddEventListener.apply(this, arguments);
    }

    return nativeAddEventListener.apply(this, arguments);
  }

  function wrappedRemoveEventListener(type, listener, options) {
    try {
      if (shouldManageType(type, this)) {
        var capture = getCapture(options);
        var record = findRecord(this, type, listener, capture);
        if (record) {
          removeRecord(record);
          return nativeRemoveEventListener.call(this, type, record.wrapped, options);
        }
      }
    } catch (error) {
      return nativeRemoveEventListener.apply(this, arguments);
    }

    return nativeRemoveEventListener.apply(this, arguments);
  }

  function wrappedDispatchEvent(event) {
    try {
      if (shouldSuppressEvent(event, this)) {
        return true;
      }
    } catch (error) {
      return nativeDispatchEvent.apply(this, arguments);
    }

    return nativeDispatchEvent.apply(this, arguments);
  }

  function defineLockedValue(target, property, value) {
    try {
      Object.defineProperty(target, property, {
        value: value,
        writable: false,
        enumerable: true,
        configurable: false
      });
    } catch (error) {
      try {
        Object.defineProperty(Object.getPrototypeOf(target), property, {
          get: function lockedGetter() {
            return value;
          },
          enumerable: true,
          configurable: true
        });
      } catch (prototypeError) {
        // Some browser-provided descriptors are intentionally non-configurable.
      }
    }
  }

  function installVisibilityLocks() {
    if (state.visibilityLocked) {
      return;
    }
    state.visibilityLocked = true;

    defineLockedValue(document, "hidden", false);
    defineLockedValue(document, "webkitHidden", false);
    defineLockedValue(document, "mozHidden", false);
    defineLockedValue(document, "msHidden", false);
    defineLockedValue(document, "visibilityState", "visible");
    defineLockedValue(document, "webkitVisibilityState", "visible");
    defineLockedValue(document, "mozVisibilityState", "visible");
    defineLockedValue(document, "msVisibilityState", "visible");
    defineLockedValue(document, "prerendering", false);
    defineLockedValue(document, "wasDiscarded", false);
    defineLockedValue(document, "hasFocus", function hasFocus() {
      return true;
    });
  }

  function getPropertyDescriptor(target, property) {
    var cursor = target;
    while (cursor) {
      var descriptor = Object.getOwnPropertyDescriptor(cursor, property);
      if (descriptor) {
        return descriptor;
      }
      cursor = Object.getPrototypeOf(cursor);
    }
    return null;
  }

  function installHandlerProperty(target, property) {
    try {
      var originalDescriptor = getPropertyDescriptor(target, property);
      if (originalDescriptor && originalDescriptor.configurable === false) {
        return;
      }

      var originalValue = null;
      var wrappedValue = null;
      Object.defineProperty(target, property, {
        configurable: true,
        enumerable: originalDescriptor ? Boolean(originalDescriptor.enumerable) : true,
        get: function getPresenceHandler() {
          if (state.enabled) {
            return null;
          }
          return originalValue;
        },
        set: function setPresenceHandler(value) {
          originalValue = value;

          if (!isCallableListener(value)) {
            wrappedValue = value;
          } else {
            wrappedValue = function guardedPresencePropertyHandler(event) {
              if (shouldSuppressEvent(event, this)) {
                return undefined;
              }
              return invokeListener(value, this, event);
            };
          }

          try {
            if (originalDescriptor && typeof originalDescriptor.set === "function") {
              originalDescriptor.set.call(target, wrappedValue);
            }
          } catch (error) {
            // The local accessor above still preserves the public property contract.
          }
        }
      });
    } catch (error) {
      // Handler properties vary by browser and frame type; listener wrapping remains active.
    }
  }

  function installHandlerPropertyGuards() {
    handlerProperties.forEach(function install(property) {
      installHandlerProperty(window, property);
      installHandlerProperty(document, property);
    });
  }

  function installAnimationFrameGuard() {
    if (typeof nativeRequestAnimationFrame !== "function" || typeof nativeCancelAnimationFrame !== "function") {
      return;
    }

    try {
      Object.defineProperty(window, "requestAnimationFrame", {
        configurable: true,
        writable: true,
        value: function guardedRequestAnimationFrame(callback) {
          if (!state.enabled) {
            return nativeRequestAnimationFrame.apply(this, arguments);
          }

          var id = rafNextId++;
          var settled = false;
          function run(timestamp) {
            if (settled || !rafRecords[id]) {
              return;
            }
            settled = true;
            delete rafRecords[id];
            callback(Number.isFinite(timestamp) ? timestamp : performance.now());
          }

          var nativeId = nativeRequestAnimationFrame.call(window, run);
          var timeoutId = window.setTimeout(function fallbackFrame() {
            run(performance.now());
          }, 17);

          rafRecords[id] = {
            nativeId: nativeId,
            timeoutId: timeoutId
          };
          return id;
        }
      });

      Object.defineProperty(window, "cancelAnimationFrame", {
        configurable: true,
        writable: true,
        value: function guardedCancelAnimationFrame(id) {
          var record = rafRecords[id];
          if (!record) {
            return nativeCancelAnimationFrame.apply(this, arguments);
          }
          delete rafRecords[id];
          window.clearTimeout(record.timeoutId);
          return nativeCancelAnimationFrame.call(window, record.nativeId);
        }
      });
    } catch (error) {
      // If the page has locked these APIs first, leave the browser implementation untouched.
    }
  }

  function installGlobalGuards() {
    try {
      Object.defineProperty(EventTarget.prototype, "addEventListener", {
        configurable: true,
        writable: true,
        value: wrappedAddEventListener
      });
      Object.defineProperty(EventTarget.prototype, "removeEventListener", {
        configurable: true,
        writable: true,
        value: wrappedRemoveEventListener
      });
      Object.defineProperty(EventTarget.prototype, "dispatchEvent", {
        configurable: true,
        writable: true,
        value: wrappedDispatchEvent
      });
    } catch (error) {
      // Native event APIs may be locked by the page; the rest of the payload is still safe.
    }

    installHandlerPropertyGuards();
    installAnimationFrameGuard();
  }

  function applyRoute(payload) {
    if (!payload || payload.source !== CHANNEL || payload.target !== "main-world") {
      return;
    }

    state.decisionKnown = true;
    state.enabled = Boolean(payload.enabled);
    state.lastMatchingRule = String(payload.matchingRule || "");

    if (state.enabled) {
      installVisibilityLocks();
      if (!state.loggedActivation) {
        state.loggedActivation = true;
        console.info(
          "[Screw The Auto Pause] " + (payload.logActivated || "Active.") + "\n" +
          "[Screw The Auto Pause] " + EN_DESCRIPTION + "\n" +
          "[Screw The Auto Pause] " + ZH_DESCRIPTION + "\n" +
          "[Screw The Auto Pause] Rule: " + state.lastMatchingRule
        );
      }
    }
  }

  nativeAddEventListener.call(window, "message", function receiveRouteMessage(event) {
    try {
      if (event && event.source === window) {
        applyRoute(event.data);
      }
    } catch (error) {
      // Ignore unrelated page messages.
    }
  }, true);

  nativeAddEventListener.call(document.documentElement, ROUTE_EVENT, function receiveRouteEvent(event) {
    try {
      applyRoute(JSON.parse(event.detail));
    } catch (error) {
      // Ignore malformed route events.
    }
  }, true);

  window.setTimeout(function releaseUndecidedEventGuards() {
    if (!state.decisionKnown) {
      state.decisionKnown = true;
    }
  }, 2000);

  installGlobalGuards();
})();
