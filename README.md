# Screw The Auto Pause

**English description:** Completely prevent video and audio from auto-pausing when switching tabs, switching browsers (minimizing, or leaving the current browser, etc.) on selected domains.

**中文描述：** 彻底阻止选中域名的网页因网页切换、浏览器切换（最小化，或者离开了当前浏览器等）所导致的音视频自动暂停

Screw The Auto Pause is a minimalist Manifest V3 Chrome extension for people who want selected media sites to keep treating the page as visible and focused while they switch tabs, minimize the browser, or work in another browser.

Screw The Auto Pause 是一个极简的 Manifest V3 Chrome 扩展，用于让选中的媒体网站在你切换网页、最小化浏览器或离开当前浏览器时，仍然将页面播放中的音频、视频视为可见且处于聚焦与持续播放状态。

## Features

- Manifest V3 architecture with only `storage` and `activeTab` in the permissions array.
- `<all_urls>` content-script coverage at `document_start`, `world: "MAIN"`, and `all_frames: true` so nested media frames are covered.
- Rule-based activation: only domains that match your saved wildcard rules are neutralized.
- Wildcard matching supports full URL, hostname, root-domain, and subdomain candidates such as `*example.com*`.
- MAIN-world guards lock visibility/focus states, mediate focus and visibility listeners, and use best-effort lifecycle and requestAnimationFrame mitigations.
- Native English and Simplified Chinese localization for the manifest, popup, prompts, and console messages.
- No telemetry, counters, version checks, paywalls, remote code, or tracking.

## 功能亮点

- 基于 Manifest V3，权限数组仅包含 `storage` 与 `activeTab`。
- 内容脚本以 `<all_urls>`、`document_start`、`world: "MAIN"`、`all_frames: true` 注入，覆盖嵌套媒体 iframe。
- 基于规则启用：只有匹配已保存通配符规则的域名才会被处理。
- 通配符匹配会同时评估完整 URL、主机名、根域名与子域名，例如 `*example.com*`。
- MAIN world 防护会锁定可见性与聚焦状态，拦截焦点/可见性监听，并对 Page Lifecycle 与 requestAnimationFrame 检测进行尽力缓解。
- 原生支持 English 与简体中文，覆盖 manifest、弹窗、提示与控制台消息。
- 不包含遥测、计数器、版本检查、付费墙、远程代码或追踪。

## Install locally

1. Open Chrome or a Chromium-based browser.
2. Go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose this project folder.
6. Open the extension popup and click **添加当前域名 (Add current domain)** or add a wildcard rule manually.

## 本地安装

1. 打开 Chrome 或 Chromium 内核浏览器。
2. 进入 `chrome://extensions`。
3. 启用 **Developer mode（开发者模式）**。
4. 点击 **Load unpacked（加载已解压的扩展程序）**。
5. 选择本项目文件夹。
6. 打开扩展弹窗，点击 **添加当前域名 (Add current domain)**，或手动添加通配符规则。

## Rule examples

| Rule | Matches |
| --- | --- |
| `*example.com*` | `example.com`, `www.example.com`, and full paths under that domain |
| `*video.example.co.uk*` | exact fuzzy matches for that multi-level host |
| `*domain.co.uk*` | root-domain capture from subdomains like `player.sub.domain.co.uk` |

## 规则示例

| 规则 | 匹配范围 |
| --- | --- |
| `*example.com*` | `example.com`、`www.example.com` 以及该域名下的完整路径 |
| `*video.example.co.uk*` | 对该多级主机名进行模糊匹配 |
| `*domain.co.uk*` | 从 `player.sub.domain.co.uk` 等子域名归并到根域名 |

## Edge-case behavior

The extension is intentionally scoped by your saved rules. A lightweight isolated router reads saved rules from `chrome.storage.local`, evaluates the current frame URL, and signals the MAIN-world payload only when the frame matches. The MAIN-world payload is installed at `document_start` so early page listeners for visibility and focus changes are mediated before most site scripts run.

Browser-level background throttling cannot be completely disabled by an extension, but the payload masks the common JavaScript-level signals that media players use to auto-pause: `document.hidden`, `document.visibilityState`, `document.hasFocus()`, focus/blur listeners, visibility listeners, selected lifecycle events, and simple requestAnimationFrame timing checks.

## 边界行为

扩展会严格按照已保存规则启用。隔离世界路由脚本从 `chrome.storage.local` 读取规则，评估当前 frame URL，并且只在 frame 匹配时通知 MAIN world 载荷。MAIN world 载荷在 `document_start` 安装，因此多数网站脚本注册可见性与聚焦监听前就会被接管。

扩展无法彻底关闭浏览器内核级的后台节流，但会屏蔽媒体播放器常用的 JavaScript 层自动暂停信号：`document.hidden`、`document.visibilityState`、`document.hasFocus()`、focus/blur 监听、visibility 监听、部分生命周期事件，以及简单的 requestAnimationFrame 计时检测。

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

本项目基于 The Unlicense 开源。

## Notify
This program is co-developed with github copilot 

本项目使用 copilot 辅助开发。
