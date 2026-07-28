# Screw The Auto Pause

> 中文版说明请见 [README.zh-CN.md](README.zh-CN.md)

Screw The Auto Pause is a minimalist Manifest V3 Chrome extension for people who want selected media sites to keep treating the page as visible and focused while they switch tabs, minimize the browser, or work in another browser.

## Features

- Manifest V3 architecture with only `storage` and `activeTab` in the permissions array.
- `<all_urls>` content-script coverage at `document_start`, `world: "MAIN"`, and `all_frames: true` so nested media frames are covered.
- Rule-based activation: only domains that match your saved wildcard rules are neutralized.
- Wildcard matching supports full URL, hostname, root-domain, and subdomain candidates such as `*example.com*`.
- MAIN-world guards lock visibility/focus states, mediate focus and visibility listeners, and use best-effort lifecycle and requestAnimationFrame mitigations.
- Native English and Simplified Chinese localization for the manifest, popup, prompts, and console messages.
- No telemetry, counters, version checks, paywalls, remote code, or tracking.

## Install locally

1. Open Chrome or a Chromium-based browser.
2. Go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose this project folder.
6. Open the extension popup and click **Add current domain** or add a wildcard rule manually.

## Rule examples

| Rule | Matches |
| --- | --- |
| `*example.com*` | `example.com`, `www.example.com`, and full paths under that domain |
| `*video.example.co.uk*` | exact fuzzy matches for that multi-level host |
| `*domain.co.uk*` | root-domain capture from subdomains like `player.sub.domain.co.uk` |

## Edge-case behavior

The extension is intentionally scoped by your saved rules. A lightweight isolated router reads saved rules from `chrome.storage.local`, evaluates the current frame URL, and signals the MAIN-world payload only when the frame matches. The MAIN-world payload is installed at `document_start` so early page listeners for visibility and focus changes are mediated before most site scripts run.

Browser-level background throttling cannot be completely disabled by an extension, but the payload masks the common JavaScript-level signals that media players use to auto-pause: `document.hidden`, `document.visibilityState`, `document.hasFocus()`, focus/blur listeners, visibility listeners, selected lifecycle events, and simple requestAnimationFrame timing checks.

## Development checks

Generate icons:

```powershell
python tools\render-icons.py
```

Validate the workspace:

```powershell
python tools\validate.py
```

## License

This project is open-source based on The Unlicense.

## Notice

This project is co-developed with GitHub Copilot.
