"""Regenerates the photo fixtures used by memory-service tests.

Run from this directory with Pillow (WebP support required):  python3 generate_fixtures.py
Every image carries metadata that sanitization must remove: EXIF with a GPS IFD,
and the marker string below, which the tests search for in the stored bytes.
"""
from PIL import Image, PngImagePlugin

MARKER = "OTC-GPS-MARKER-49.3265"
XMP = ('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF '
       'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description '
       'xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:GPSMapDatum="' + MARKER +
       '"/></rdf:RDF></x:xmpmeta>')


def exif_with_gps():
    exif = Image.Exif()
    exif[0x010E] = MARKER                 # ImageDescription
    gps = exif.get_ifd(0x8825)            # GPS IFD
    gps[1] = "N"
    gps[2] = (49.0, 19.0, 35.4)
    gps[3] = "W"
    gps[4] = (122.0, 56.0, 12.5)
    gps[18] = MARKER                      # GPSMapDatum
    return exif.tobytes()


def gradient(size, mode):
    w, h = size
    img = Image.new(mode, size)
    for x in range(w):
        for y in range(h):
            r, g, b = (x * 255 // w, y * 255 // h, 128)
            img.putpixel((x, y), (r, g, b, 255 if x < w // 2 else 96) if mode == "RGBA" else (r, g, b))
    return img


exif = exif_with_gps()

gradient((64, 48), "RGB").save("jpeg-gps.jpg", "JPEG", quality=85, exif=exif, xmp=XMP.encode())

info = PngImagePlugin.PngInfo()
info.add_text("Comment", MARKER)
info.add_itxt("XML:com.adobe.xmp", XMP)
gradient((40, 30), "RGBA").save("png-text-exif.png", "PNG", pnginfo=info, exif=exif)

gradient((48, 32), "RGB").save("webp-exif.webp", "WEBP", quality=80, exif=exif, xmp=XMP.encode())
gradient((48, 32), "RGBA").save("webp-alpha-exif.webp", "WEBP", quality=80, exif=exif, xmp=XMP.encode())

frames = [Image.new("RGB", (32, 32), c) for c in ((200, 40, 40), (40, 200, 40))]
frames[0].save("webp-animated.webp", "WEBP", save_all=True, append_images=frames[1:], duration=100, loop=0)

Image.new("P", (16, 16), 3).save("sample.gif", "GIF")

with open("sample.svg", "w") as f:
    f.write('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">'
            '<rect width="10" height="10" fill="green"/></svg>\n')

with open("heic-header.heic", "wb") as f:
    f.write(b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00mif1heic" + b"\x00" * 64)

with open("not-an-image.jpg", "w") as f:
    f.write("This is a text file with a .jpg name, not an image.\n")
