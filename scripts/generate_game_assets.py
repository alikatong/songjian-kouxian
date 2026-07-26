from __future__ import annotations

import hashlib
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"E:\game")
PUBLIC = ROOT / "frontend" / "public" / "assets"
FONT_PATH = Path(r"C:\Windows\Fonts\simkai.ttf")
RARITY = {
    "common": (142, 151, 142),
    "uncommon": (125, 163, 105),
    "rare": (87, 145, 183),
    "epic": (157, 105, 175),
    "legendary": (210, 157, 64),
}


def stable_color(key: str, offset: int = 0) -> tuple[int, int, int]:
    digest = hashlib.sha256(f"{key}:{offset}".encode()).digest()
    return 55 + digest[0] % 95, 65 + digest[1] % 90, 55 + digest[2] % 95


def icon_canvas(rarity: str, key: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    accent = RARITY[rarity]
    draw.ellipse((18, 18, 238, 238), fill=(*stable_color(key), 44), outline=(*accent, 210), width=7)
    draw.ellipse((32, 32, 224, 224), outline=(230, 218, 179, 45), width=2)
    return image, draw


def draw_weapon(code: str, rarity: str, weapon_type: str, output: Path) -> None:
    image, draw = icon_canvas(rarity, code)
    steel = (218, 220, 207, 255)
    ink = (23, 30, 25, 255)
    gold = (*RARITY[rarity], 255)
    if weapon_type == "sword":
        draw.polygon([(129, 38), (145, 72), (137, 179), (119, 179), (112, 72)], fill=steel, outline=ink)
        draw.line((128, 55, 128, 171), fill=(255, 255, 245, 170), width=3)
        draw.rounded_rectangle((83, 174, 173, 190), 5, fill=gold, outline=ink, width=3)
        draw.polygon([(119, 189), (137, 189), (144, 224), (128, 237), (112, 224)], fill=ink, outline=gold)
    elif weapon_type == "saber":
        draw.polygon([(142, 35), (164, 66), (146, 173), (120, 190), (104, 179), (123, 160)], fill=steel, outline=ink)
        draw.arc((91, 153, 155, 215), 185, 350, fill=gold, width=9)
        draw.line((112, 194, 91, 226), fill=ink, width=15)
    elif weapon_type == "spear":
        draw.polygon([(128, 28), (151, 67), (128, 91), (105, 67)], fill=steel, outline=ink)
        draw.line((128, 82, 128, 230), fill=(91, 55, 38, 255), width=14)
        draw.line((129, 91, 129, 224), fill=gold, width=3)
        draw.polygon([(105, 71), (89, 88), (117, 82)], fill=(157, 45, 38, 255))
    elif weapon_type == "fan":
        center = (128, 202)
        points = [center]
        for angle in range(205, 336, 16):
            rad = math.radians(angle)
            points.append((128 + int(math.cos(rad) * 100), 202 + int(math.sin(rad) * 100)))
        draw.polygon(points, fill=(*stable_color(code, 2), 255), outline=gold)
        for point in points[1:]:
            draw.line((center, point), fill=(224, 208, 168, 180), width=3)
        draw.ellipse((115, 189, 141, 215), fill=gold, outline=ink)
    else:
        draw.line((112, 218, 139, 45), fill=(75, 49, 34, 255), width=18)
        draw.line((117, 211, 138, 63), fill=gold, width=4)
        draw.ellipse((111, 27, 162, 78), fill=(*stable_color(code, 3), 255), outline=gold, width=5)
        draw.ellipse((127, 42, 147, 62), fill=(225, 228, 203, 230))
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, "PNG", optimize=True)


def draw_pill(code: str, rarity: str, index: int, output: Path) -> None:
    image, draw = icon_canvas(rarity, code)
    accent = RARITY[rarity]
    liquid = stable_color(code, 4)
    form = index % 5
    if form == 0:
        draw.ellipse((62, 75, 194, 207), fill=(*liquid, 255), outline=(25, 31, 26, 255), width=8)
        draw.ellipse((91, 105, 120, 134), fill=(246, 232, 188, 165))
        draw.arc((75, 89, 181, 193), 195, 345, fill=accent, width=7)
    elif form == 1:
        draw.rounded_rectangle((70, 65, 186, 210), 28, fill=(*liquid, 245), outline=(25, 31, 26, 255), width=8)
        draw.rectangle((86, 41, 170, 76), fill=(*accent, 255), outline=(25, 31, 26, 255), width=6)
        draw.ellipse((100, 104, 156, 160), fill=(238, 222, 173, 195))
    elif form == 2:
        draw.polygon([(75, 82), (181, 82), (197, 210), (59, 210)], fill=(*liquid, 245), outline=(25, 31, 26, 255))
        draw.rectangle((70, 62, 186, 92), fill=(*accent, 255), outline=(25, 31, 26, 255), width=6)
        draw.line((86, 120, 166, 180), fill=(238, 222, 173, 155), width=9)
    elif form == 3:
        draw.rounded_rectangle((77, 74, 179, 213), 17, fill=(*liquid, 220), outline=(226, 218, 189, 220), width=7)
        draw.rectangle((91, 45, 165, 83), fill=(68, 45, 31, 255), outline=accent, width=5)
        draw.ellipse((103, 108, 153, 158), fill=(*accent, 230))
    else:
        draw.ellipse((50, 102, 206, 213), fill=(35, 43, 36, 255), outline=(*accent, 255), width=8)
        draw.arc((59, 84, 197, 185), 0, 180, fill=(232, 221, 190, 220), width=6)
        draw.ellipse((77, 94, 179, 176), fill=(*liquid, 255))
        draw.ellipse((105, 103, 132, 129), fill=(250, 238, 198, 160))
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, "PNG", optimize=True)


def draw_portrait(code: str, title: str, index: int, output: Path) -> None:
    image = Image.new("RGBA", (512, 640), (15, 23, 18, 255))
    draw = ImageDraw.Draw(image)
    accent = stable_color(code, 7)
    draw.ellipse((-90, 40, 600, 720), fill=(*accent, 55), outline=(187, 156, 91, 125), width=6)
    draw.polygon([(0, 420), (135, 290), (225, 390), (340, 245), (512, 410), (512, 640), (0, 640)], fill=(28, 46, 36, 255))
    skin = (202, 169, 132, 255)
    draw.ellipse((180, 125, 332, 292), fill=skin, outline=(25, 28, 24, 255), width=7)
    draw.pieslice((170, 103, 342, 268), 180, 360, fill=(26, 28, 24, 255))
    draw.ellipse((219, 200, 232, 212), fill=(23, 24, 22, 255))
    draw.ellipse((280, 200, 293, 212), fill=(23, 24, 22, 255))
    draw.arc((231, 205, 281, 253), 20, 160, fill=(103, 62, 49, 255), width=3)
    robe = stable_color(code, 9)
    draw.polygon([(165, 294), (347, 294), (437, 612), (75, 612)], fill=(*robe, 255), outline=(15, 20, 16, 255))
    draw.polygon([(190, 294), (256, 390), (322, 294), (285, 465), (227, 465)], fill=(218, 205, 164, 190))
    if index == 0:
        draw.arc((130, 75, 382, 190), 180, 360, fill=(163, 126, 65, 255), width=18)
    elif index == 1:
        draw.line((365, 250, 425, 520), fill=(116, 78, 43, 255), width=13)
        draw.polygon([(330, 205), (403, 176), (430, 230), (363, 260)], fill=(78, 83, 75, 255))
    elif index == 2:
        draw.ellipse((330, 350, 430, 485), outline=(171, 128, 64, 255), width=12)
        for y in range(370, 460, 25):
            draw.line((345, y, 415, y), fill=(102, 146, 86, 255), width=7)
    elif index == 3:
        draw.line((95, 330, 65, 555), fill=(118, 76, 43, 255), width=12)
        draw.arc((35, 270, 150, 385), 190, 340, fill=(194, 169, 119, 255), width=8)
    elif index == 4:
        draw.rectangle((335, 365, 435, 460), outline=(147, 111, 66, 255), width=10)
    elif index == 5:
        draw.arc((335, 330, 445, 485), 55, 305, fill=(151, 180, 176, 255), width=9)
    elif index == 6:
        draw.rectangle((344, 345, 430, 475), fill=(190, 176, 128, 255), outline=(45, 35, 25, 255), width=7)
        draw.line((360, 378, 412, 378), fill=(70, 52, 35, 255), width=5)
    else:
        draw.ellipse((348, 365, 417, 434), fill=(180, 77, 57, 255), outline=(223, 191, 125, 255), width=5)
    font = ImageFont.truetype(str(FONT_PATH), 40)
    box = draw.textbbox((0, 0), title, font=font)
    draw.rectangle((0, 560, 512, 640), fill=(10, 16, 12, 220))
    draw.text(((512 - (box[2] - box[0])) // 2, 579), title, font=font, fill=(229, 214, 172, 255))
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, "PNG", optimize=True)


def main() -> None:
    rarities = ["common"] * 8 + ["uncommon"] * 5 + ["rare"] * 4 + ["epic"] * 2 + ["legendary"]
    weapon_types = ["sword", "saber", "spear", "fan", "staff"]
    realm_keys = ["mortal", "lianpi", "lianggu", "yijin", "xisui", "huanxue", "tianren", "lianqi", "zhujia", "jindan", "yuanying", "huashen", "dacheng"]
    for realm in realm_keys:
        for index in range(20):
            code = f"weapon_{realm}_{index + 1:02d}"
            draw_weapon(code, rarities[index], weapon_types[index // 4], PUBLIC / "equipment" / f"{code}.png")
        for index in range(50):
            rarity_index = index * 2
            rarity = "common" if rarity_index < 50 else "uncommon" if rarity_index < 75 else "rare" if rarity_index < 90 else "epic" if rarity_index < 98 else "legendary"
            code = f"pill_{realm}_{index + 1:02d}"
            draw_pill(code, rarity, index, PUBLIC / "pills" / f"{code}.png")

    origins = [
        ("tenant_family", "佃农之家"), ("woodcutter_family", "樵户之家"),
        ("herbalist_family", "药农之家"), ("hunter_family", "猎户之家"),
        ("artisan_family", "匠户之家"), ("fisher_family", "渔户之家"),
        ("village_teacher", "村塾之家"), ("poor_household", "清贫人家"),
    ]
    for index, (code, title) in enumerate(origins):
        draw_portrait(code, title, index, PUBLIC / "portraits" / f"{code}.png")
    print("Generated 260 equipment icons, 650 pill icons, and 8 origin portraits")


if __name__ == "__main__":
    main()
