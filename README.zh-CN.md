# Screw The Auto Pause

> For the English version, see [README.md](README.md)

Screw The Auto Pause 是一个极简的 Manifest V3 Chrome 扩展，用于让选中的媒体网站在你切换网页、最小化浏览器或离开当前浏览器时，仍然将页面播放中的音频、视频视为可见且处于聚焦与持续播放状态。

## 功能亮点

- 基于 Manifest V3，权限数组仅包含 `storage` 与 `activeTab`。
- 内容脚本以 `<all_urls>`、`document_start`、`world: "MAIN"`、`all_frames: true` 注入，覆盖嵌套媒体 iframe。
- 基于规则启用：只有匹配已保存通配符规则的域名才会被处理。
- 通配符匹配会同时评估完整 URL、主机名、根域名与子域名，例如 `*example.com*`。
- MAIN world 防护会锁定可见性与聚焦状态，拦截焦点/可见性监听，并对 Page Lifecycle 与 requestAnimationFrame 检测进行尽力缓解。
- 原生支持 English 与简体中文，覆盖 manifest、弹窗、提示与控制台消息。
- 不包含遥测、计数器、版本检查、付费墙、远程代码或追踪。

## 本地安装

1. 打开 Chrome 或 Chromium 内核浏览器。
2. 进入 `chrome://extensions`。
3. 启用 **Developer mode（开发者模式）**。
4. 点击 **Load unpacked（加载已解压的扩展程序）**。
5. 选择本项目文件夹。
6. 打开扩展弹窗，点击 **添加当前域名**，或手动添加通配符规则。

## 规则示例

| 规则 | 匹配范围 |
| --- | --- |
| `*example.com*` | `example.com`、`www.example.com` 以及该域名下的完整路径 |
| `*video.example.co.uk*` | 对该多级主机名进行模糊匹配 |
| `*domain.co.uk*` | 从 `player.sub.domain.co.uk` 等子域名归并到根域名 |

## 边界行为

扩展会严格按照已保存规则启用。隔离世界路由脚本从 `chrome.storage.local` 读取规则，评估当前 frame URL，并且只在 frame 匹配时通知 MAIN world 载荷。MAIN world 载荷在 `document_start` 安装，因此多数网站脚本注册可见性与聚焦监听前就会被接管。

扩展无法彻底关闭浏览器内核级的后台节流，但会屏蔽媒体播放器常用的 JavaScript 层自动暂停信号：`document.hidden`、`document.visibilityState`、`document.hasFocus()`、focus/blur 监听、visibility 监听、部分生命周期事件，以及简单的 requestAnimationFrame 计时检测。

## 开发工具

生成图标：

```powershell
python tools\render-icons.py
```

验证工作区：

```powershell
python tools\validate.py
```

## 许可证

本项目基于 The Unlicense 开源。

## 说明

本项目使用 GitHub Copilot 辅助开发。
