from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"E:\game")
SOURCE = ROOT / "frontend" / "public" / "songjian-logo-symbol-v2.png"
OUTPUT = ROOT / "frontend" / "public" / "songjian-logo-v2.png"
MARK_OUTPUT = ROOT / "frontend" / "public" / "songjian-mark.png"
FONT = Path(r"C:\Windows\Fonts\STXINGKA.TTF")


def remove_magenta(image: Image.Image) -> Image.Image:
    source = image.convert("RGBA")

    def clean_pixel(pixel: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
        red, green, blue, source_alpha = pixel
        chroma = min(red, blue) - green
        balance = abs(red - blue)
        chroma_score = max(0.0, min(1.0, (chroma - 8.0) / 247.0))
        magenta = chroma_score if balance < 170 else 0.0
        alpha = 0.0 if magenta > 0.94 else 1.0 - magenta
        alpha *= source_alpha / 255.0
        if alpha <= 0.01:
            return 0, 0, 0, 0

        # Undo the magenta matte on partially transparent edge pixels.
        matte = 1.0 - alpha
        safe_alpha = max(alpha, 0.04)
        clean_red = max(0, min(255, round((red - matte * 255.0) / safe_alpha)))
        clean_green = max(0, min(255, round(green / safe_alpha)))
        clean_blue = max(0, min(255, round((blue - matte * 255.0) / safe_alpha)))
        return clean_red, clean_green, clean_blue, round(alpha * 255.0)

    source.putdata([clean_pixel(pixel) for pixel in source.getdata()])
    draw = ImageDraw.Draw(source)
    draw.rectangle((0, 0, source.width - 1, 3), fill=(0, 0, 0, 0))
    draw.rectangle((0, source.height - 4, source.width - 1, source.height - 1), fill=(0, 0, 0, 0))
    draw.rectangle((0, 0, 3, source.height - 1), fill=(0, 0, 0, 0))
    draw.rectangle((source.width - 4, 0, source.width - 1, source.height - 1), fill=(0, 0, 0, 0))
    return source


def fit_font(text: str, max_width: int, initial_size: int) -> ImageFont.FreeTypeFont:
    size = initial_size
    while size > 80:
        font = ImageFont.truetype(str(FONT), size)
        box = font.getbbox(text, stroke_width=3)
        if box[2] - box[0] <= max_width:
            return font
        size -= 4
    return ImageFont.truetype(str(FONT), size)


def main() -> None:
    symbol = remove_magenta(Image.open(SOURCE))
    alpha_box = symbol.getchannel("A").getbbox()
    if alpha_box is None:
        raise RuntimeError("Generated symbol is empty after chroma removal")

    symbol = symbol.crop(alpha_box)
    symbol.thumbnail((1580, 1480), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
    symbol_x = (canvas.width - symbol.width) // 2
    symbol_y = 35
    canvas.alpha_composite(symbol, (symbol_x, symbol_y))

    mark = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    mark_symbol = symbol.copy()
    mark_symbol.thumbnail((480, 480), Image.Resampling.LANCZOS)
    mark.alpha_composite(
        mark_symbol,
        ((mark.width - mark_symbol.width) // 2, (mark.height - mark_symbol.height) // 2),
    )
    mark.save(MARK_OUTPUT, "PNG", optimize=True)

    title = "松间叩仙"
    font = fit_font(title, 1540, 300)
    draw = ImageDraw.Draw(canvas)
    box = draw.textbbox((0, 0), title, font=font, stroke_width=3)
    text_width = box[2] - box[0]
    text_height = box[3] - box[1]
    text_x = (canvas.width - text_width) // 2 - box[0]
    text_y = 1605 - box[1]

    draw.text(
        (text_x + 7, text_y + 9),
        title,
        font=font,
        fill=(181, 139, 69, 150),
        stroke_width=2,
        stroke_fill=(181, 139, 69, 90),
    )
    draw.text(
        (text_x, text_y),
        title,
        font=font,
        fill=(22, 63, 45, 255),
        stroke_width=3,
        stroke_fill=(11, 26, 20, 255),
    )

    # Keep enough transparent breathing room below the wordmark.
    if text_y + box[1] + text_height > 1980:
        raise RuntimeError("Wordmark exceeds the logo canvas")

    canvas.save(OUTPUT, "PNG", optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
