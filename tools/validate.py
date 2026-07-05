from __future__ import annotations

import json
import re
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EN_DESCRIPTION = "Completely prevent video and audio from auto-pausing when switching tabs, switching browsers (minimizing, or leaving the current browser, etc.) on selected domains."
ZH_DESCRIPTION = "彻底阻止选中域名的网页因网页切换、浏览器切换（最小化，或者离开了当前浏览器等）所导致的视音频自动暂停"


def read_json(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def wildcard_to_re(rule: str) -> re.Pattern[str]:
    pattern = "".join(".*" if char == "*" else "." if char == "?" else re.escape(char) for char in rule.lower())
    return re.compile("^" + pattern + "$", re.I)


def base_domain(hostname: str) -> str:
    host = hostname.strip(".").lower()
    parts = [part for part in host.split(".") if part]
    if len(parts) <= 2 or host == "localhost":
        return host
    if len(parts[-1]) == 2 and parts[-2] in {"ac", "co", "com", "edu", "gov", "net", "org"} and len(parts) >= 3:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def validate_manifest() -> None:
    manifest = read_json("manifest.json")
    assert_true(manifest["manifest_version"] == 3, "Manifest must use MV3")
    assert_true(manifest["permissions"] == ["storage", "activeTab"], "Manifest permissions must remain minimal")
    main_script = manifest["content_scripts"][0]
    assert_true(main_script["matches"] == ["<all_urls>"], "MAIN-world script must match all URLs")
    assert_true(main_script["run_at"] == "document_start", "MAIN-world script must run at document_start")
    assert_true(main_script["all_frames"] is True, "MAIN-world script must run in all frames")
    assert_true(main_script["world"] == "MAIN", "MAIN-world script must declare world MAIN")
    router_script = manifest["content_scripts"][1]
    assert_true(router_script["matches"] == ["<all_urls>"], "Router must match all URLs")
    assert_true(router_script["run_at"] == "document_start", "Router must run at document_start")
    assert_true(router_script["all_frames"] is True, "Router must run in all frames")


def validate_i18n_and_docs() -> None:
    en = read_json("_locales/en/messages.json")
    zh = read_json("_locales/zh_CN/messages.json")
    assert_true(en["extensionDescription"]["message"] == EN_DESCRIPTION, "English description mismatch")
    assert_true(zh["extensionDescription"]["message"] == ZH_DESCRIPTION, "Chinese description mismatch")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    main_world = (ROOT / "src/main-world.js").read_text(encoding="utf-8")
    assert_true(EN_DESCRIPTION in readme and ZH_DESCRIPTION in readme, "README must mirror both descriptions")
    assert_true(EN_DESCRIPTION in main_world and ZH_DESCRIPTION in main_world, "Console log payload must mirror both descriptions")


def validate_rule_behavior() -> None:
    examples = {
        "*example*": ["https://sub.example.com/watch?v=1", "example.com", "*.example.com"],
        "*domain.co.uk*": ["https://video.sub.domain.co.uk/player", "domain.co.uk"],
        "localhost": ["localhost"],
    }
    for rule, candidates in examples.items():
        expression = wildcard_to_re(rule)
        assert_true(any(expression.match(candidate.lower()) for candidate in candidates), f"Rule did not match expected candidate: {rule}")
    assert_true(base_domain("sub.domain.com") == "domain.com", "Base domain should strip simple subdomains")
    assert_true(base_domain("deep.video.domain.co.uk") == "domain.co.uk", "Base domain should preserve common two-level public suffixes")


def validate_png(path: Path, size: int) -> None:
    data = path.read_bytes()
    assert_true(data.startswith(b"\x89PNG\r\n\x1a\n"), f"{path.name} must be a PNG")
    width, height = struct.unpack(">II", data[16:24])
    assert_true(width == size and height == size, f"{path.name} must be {size}x{size}")


def validate_assets() -> None:
    required = [
        "manifest.json",
        "popup.html",
        "popup.css",
        "popup.js",
        "src/rules.js",
        "src/content-router.js",
        "src/main-world.js",
        "icons/icon.svg",
        "README.md",
        "LICENSE",
    ]
    for relative in required:
        assert_true((ROOT / relative).is_file(), f"Missing {relative}")
    for size in (16, 48, 128):
        validate_png(ROOT / "icons" / f"icon{size}.png", size)


def main() -> None:
    validate_manifest()
    validate_i18n_and_docs()
    validate_rule_behavior()
    validate_assets()
    print("Extension validation passed")


if __name__ == "__main__":
    main()
