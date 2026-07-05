(function attachScrewTheAutoPauseRules(global) {
  "use strict";

  var STORAGE_KEY = "screwTheAutoPause.rules";
  var COMMON_SECOND_LEVEL_TLDS = {
    ac: true,
    co: true,
    com: true,
    edu: true,
    gov: true,
    net: true,
    org: true
  };

  function normalizeRule(rule) {
    return String(rule || "").trim().toLowerCase();
  }

  function escapeRegExp(character) {
    return character.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }

  function wildcardToRegExp(rule) {
    var normalized = normalizeRule(rule);
    if (!normalized) {
      return null;
    }

    var pattern = "";
    for (var index = 0; index < normalized.length; index += 1) {
      var character = normalized[index];
      if (character === "*") {
        pattern += ".*";
      } else if (character === "?") {
        pattern += ".";
      } else {
        pattern += escapeRegExp(character);
      }
    }

    return new RegExp("^" + pattern + "$", "i");
  }

  function isIPv4(hostname) {
    return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  }

  function isIPv6(hostname) {
    return hostname.indexOf(":") !== -1;
  }

  function getHostnameFromUrl(url) {
    try {
      return new URL(url).hostname.replace(/^\[|\]$/g, "").toLowerCase();
    } catch (error) {
      return "";
    }
  }

  function getBaseDomain(hostname) {
    var host = String(hostname || "").replace(/^\.+|\.+$/g, "").toLowerCase();
    var parts = host.split(".").filter(Boolean);

    if (!host || host === "localhost" || isIPv4(host) || isIPv6(host) || parts.length <= 2) {
      return host;
    }

    var tld = parts[parts.length - 1];
    var secondLevel = parts[parts.length - 2];
    if (tld.length === 2 && COMMON_SECOND_LEVEL_TLDS[secondLevel] && parts.length >= 3) {
      return parts.slice(-3).join(".");
    }

    return parts.slice(-2).join(".");
  }

  function getUrlParts(url) {
    try {
      var parsed = new URL(url);
      var hostname = parsed.hostname.toLowerCase();
      var baseDomain = getBaseDomain(hostname);
      return {
        href: parsed.href.toLowerCase(),
        host: parsed.host.toLowerCase(),
        hostname: hostname,
        baseDomain: baseDomain,
        path: (parsed.hostname + parsed.pathname + parsed.search + parsed.hash).toLowerCase()
      };
    } catch (error) {
      return {
        href: String(url || "").toLowerCase(),
        host: "",
        hostname: "",
        baseDomain: "",
        path: String(url || "").toLowerCase()
      };
    }
  }

  function unique(values) {
    var seen = {};
    var output = [];
    values.forEach(function addValue(value) {
      if (value && !seen[value]) {
        seen[value] = true;
        output.push(value);
      }
    });
    return output;
  }

  function getMatchCandidates(url) {
    var parts = getUrlParts(url);
    return unique([
      parts.href,
      parts.host,
      parts.hostname,
      parts.baseDomain,
      parts.path,
      parts.baseDomain ? "*." + parts.baseDomain : "",
      parts.baseDomain ? "*" + parts.baseDomain + "*" : "",
      parts.hostname ? "*" + parts.hostname + "*" : ""
    ]);
  }

  function matchesUrl(rule, url) {
    var expression = wildcardToRegExp(rule);
    if (!expression) {
      return false;
    }

    return getMatchCandidates(url).some(function testCandidate(candidate) {
      return expression.test(candidate);
    });
  }

  function findMatchingRule(rules, url) {
    if (!Array.isArray(rules)) {
      return "";
    }

    for (var index = 0; index < rules.length; index += 1) {
      var normalized = normalizeRule(rules[index]);
      if (normalized && matchesUrl(normalized, url)) {
        return normalized;
      }
    }

    return "";
  }

  function normalizeRules(rules) {
    if (!Array.isArray(rules)) {
      return [];
    }

    return unique(rules.map(normalizeRule).filter(Boolean));
  }

  function suggestDomainPatternFromUrl(url) {
    var hostname = getHostnameFromUrl(url);
    var baseDomain = getBaseDomain(hostname);
    if (!baseDomain) {
      return "";
    }

    return "*" + baseDomain + "*";
  }

  global.ScrewTheAutoPauseRules = {
    STORAGE_KEY: STORAGE_KEY,
    normalizeRule: normalizeRule,
    wildcardToRegExp: wildcardToRegExp,
    getHostnameFromUrl: getHostnameFromUrl,
    getBaseDomain: getBaseDomain,
    getMatchCandidates: getMatchCandidates,
    matchesUrl: matchesUrl,
    findMatchingRule: findMatchingRule,
    normalizeRules: normalizeRules,
    suggestDomainPatternFromUrl: suggestDomainPatternFromUrl
  };
})(globalThis);
