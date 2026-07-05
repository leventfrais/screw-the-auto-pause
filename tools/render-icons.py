from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "icons"


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = hex_color.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16), alpha


class Canvas:
    def __init__(self, width: int, height: int, scale: int = 4) -> None:
        self.scale = scale
        self.width = width * scale
        self.height = height * scale
        self.pixels = [(0, 0, 0, 0)] * (self.width * self.height)

    def _blend_pixel(self, x: int, y: int, color: tuple[int, int, int, int]) -> None:
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        source_r, source_g, source_b, source_a = color
        index = y * self.width + x
        dest_r, dest_g, dest_b, dest_a = self.pixels[index]
        alpha = source_a / 255
        inv_alpha = 1 - alpha
        out_a = source_a + dest_a * inv_alpha
        if out_a <= 0:
            self.pixels[index] = (0, 0, 0, 0)
            return
        out_r = int((source_r * source_a + dest_r * dest_a * inv_alpha) / out_a)
        out_g = int((source_g * source_a + dest_g * dest_a * inv_alpha) / out_a)
        out_b = int((source_b * source_a + dest_b * dest_a * inv_alpha) / out_a)
        self.pixels[index] = (out_r, out_g, out_b, int(out_a))

    def rounded_rect(self, x: float, y: float, width: float, height: float, radius: float, color: tuple[int, int, int, int]) -> None:
        s = self.scale
        x0, y0 = int(x * s), int(y * s)
        x1, y1 = int((x + width) * s), int((y + height) * s)
        r = radius * s
        for py in range(y0, y1):
            for px in range(x0, x1):
                cx = min(max(px + 0.5, x0 + r), x1 - r)
                cy = min(max(py + 0.5, y0 + r), y1 - r)
                if math.hypot(px + 0.5 - cx, py + 0.5 - cy) <= r:
                    self._blend_pixel(px, py, color)

    def circle_stroke(self, cx: float, cy: float, radius: float, width: float, color: tuple[int, int, int, int]) -> None:
        s = self.scale
        center_x, center_y = cx * s, cy * s
        outer = (radius + width / 2) * s
        inner = max(0, (radius - width / 2) * s)
        for py in range(int(center_y - outer - 1), int(center_y + outer + 2)):
            for px in range(int(center_x - outer - 1), int(center_x + outer + 2)):
                distance = math.hypot(px + 0.5 - center_x, py + 0.5 - center_y)
                if inner <= distance <= outer:
                    self._blend_pixel(px, py, color)

    def line(self, x1: float, y1: float, x2: float, y2: float, width: float, color: tuple[int, int, int, int]) -> None:
        s = self.scale
        ax, ay, bx, by = x1 * s, y1 * s, x2 * s, y2 * s
        half = width * s / 2
        min_x, max_x = int(min(ax, bx) - half - 1), int(max(ax, bx) + half + 2)
        min_y, max_y = int(min(ay, by) - half - 1), int(max(ay, by) + half + 2)
        dx, dy = bx - ax, by - ay
        length_sq = dx * dx + dy * dy
        for py in range(min_y, max_y):
            for px in range(min_x, max_x):
                if length_sq == 0:
                    distance = math.hypot(px + 0.5 - ax, py + 0.5 - ay)
                else:
                    t = max(0, min(1, ((px + 0.5 - ax) * dx + (py + 0.5 - ay) * dy) / length_sq))
                    nearest_x = ax + t * dx
                    nearest_y = ay + t * dy
                    distance = math.hypot(px + 0.5 - nearest_x, py + 0.5 - nearest_y)
                if distance <= half:
                    self._blend_pixel(px, py, color)

    def polygon(self, points: list[tuple[float, float]], color: tuple[int, int, int, int]) -> None:
        s = self.scale
        scaled = [(x * s, y * s) for x, y in points]
        min_x = int(min(x for x, _ in scaled)) - 1
        max_x = int(max(x for x, _ in scaled)) + 2
        min_y = int(min(y for _, y in scaled)) - 1
        max_y = int(max(y for _, y in scaled)) + 2
        for py in range(min_y, max_y):
            for px in range(min_x, max_x):
                if self._inside_polygon(px + 0.5, py + 0.5, scaled):
                    self._blend_pixel(px, py, color)

    @staticmethod
    def _inside_polygon(x: float, y: float, points: list[tuple[float, float]]) -> bool:
        inside = False
        previous_x, previous_y = points[-1]
        for current_x, current_y in points:
            crosses = (current_y > y) != (previous_y > y)
            if crosses:
                slope_x = (previous_x - current_x) * (y - current_y) / (previous_y - current_y) + current_x
                if x < slope_x:
                    inside = not inside
            previous_x, previous_y = current_x, current_y
        return inside

    def _downsample(self) -> tuple[int, int, list[tuple[int, int, int, int]]]:
        out_width = self.width // self.scale
        out_height = self.height // self.scale
        output: list[tuple[int, int, int, int]] = []
        area = self.scale * self.scale
        for y in range(out_height):
            for x in range(out_width):
                totals = [0, 0, 0, 0]
                for sy in range(self.scale):
                    for sx in range(self.scale):
                        pixel = self.pixels[(y * self.scale + sy) * self.width + (x * self.scale + sx)]
                        for channel in range(4):
                            totals[channel] += pixel[channel]
                output.append(tuple(round(total / area) for total in totals))
        return out_width, out_height, output

    def save_png(self, path: Path) -> None:
        width, height, pixels = self._downsample()
        raw = bytearray()
        for y in range(height):
            raw.append(0)
            for x in range(width):
                raw.extend(pixels[y * width + x])

        def chunk(kind: bytes, payload: bytes) -> bytes:
            return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)

        png = b"\x89PNG\r\n\x1a\n"
        png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        png += chunk(b"IEND", b"")
        path.write_bytes(png)


def draw_icon(size: int) -> Canvas:
    canvas = Canvas(size, size)
    unit = size / 128
    canvas.rounded_rect(8 * unit, 8 * unit, 112 * unit, 112 * unit, 28 * unit, rgba("#FDFBF7"))
    canvas.circle_stroke(64 * unit, 64 * unit, 43 * unit, 8 * unit, rgba("#2F2A24"))
    canvas.polygon([(91 * unit, 27 * unit), (102 * unit, 34 * unit), (91 * unit, 41 * unit)], rgba("#2F2A24"))
    canvas.rounded_rect(39 * unit, 43 * unit, 9 * unit, 43 * unit, 4.5 * unit, rgba("#D8C8B3"))
    canvas.rounded_rect(55 * unit, 43 * unit, 9 * unit, 43 * unit, 4.5 * unit, rgba("#D8C8B3"))
    canvas.polygon([(54 * unit, 42 * unit), (54 * unit, 86 * unit), (90 * unit, 64 * unit)], rgba("#2F2A24"))
    canvas.line(35 * unit, 94 * unit, 94 * unit, 35 * unit, 9 * unit, rgba("#8A653C"))
    return canvas


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    for size in (16, 48, 128):
      draw_icon(size).save_png(ICON_DIR / f"icon{size}.png")
    print("Generated icon16.png, icon48.png, and icon128.png")


if __name__ == "__main__":
    main()
