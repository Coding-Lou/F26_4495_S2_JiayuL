package com.jay.outdoor.memory.support;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

/** Photo fixtures from src/test/resources/fixtures (see generate_fixtures.py) and generated images. */
public final class Fixtures {

    /** The value every metadata-carrying fixture holds in its GPS, XMP, and text metadata. */
    public static final String GPS_MARKER = "OTC-GPS-MARKER-49.3265";

    public static final String JPEG_GPS = "jpeg-gps.jpg";
    public static final String PNG_TEXT_EXIF = "png-text-exif.png";
    public static final String WEBP_EXIF = "webp-exif.webp";
    public static final String WEBP_ALPHA_EXIF = "webp-alpha-exif.webp";
    public static final String WEBP_ANIMATED = "webp-animated.webp";
    public static final String GIF = "sample.gif";
    public static final String SVG = "sample.svg";
    public static final String HEIC = "heic-header.heic";
    public static final String TEXT_AS_JPG = "not-an-image.jpg";

    private Fixtures() {
    }

    public static byte[] read(String name) {
        try (InputStream in = Fixtures.class.getResourceAsStream("/fixtures/" + name)) {
            if (in == null) {
                throw new IllegalArgumentException("Missing fixture " + name);
            }
            return in.readAllBytes();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    public static byte[] jpeg(int width, int height) {
        return encode(solid(width, height, BufferedImage.TYPE_INT_RGB), "jpeg");
    }

    public static byte[] png(int width, int height) {
        return encode(solid(width, height, BufferedImage.TYPE_INT_RGB), "png");
    }

    /** A 1-bit PNG: tiny on disk even when its header reports a huge size. */
    public static byte[] binaryPng(int width, int height) {
        return encode(new BufferedImage(width, height, BufferedImage.TYPE_BYTE_BINARY), "png");
    }

    public static boolean containsAscii(byte[] haystack, String needle) {
        byte[] n = needle.getBytes(StandardCharsets.ISO_8859_1);
        outer:
        for (int i = 0; i <= haystack.length - n.length; i++) {
            for (int j = 0; j < n.length; j++) {
                if (haystack[i + j] != n[j]) {
                    continue outer;
                }
            }
            return true;
        }
        return false;
    }

    private static BufferedImage solid(int width, int height, int type) {
        BufferedImage image = new BufferedImage(width, height, type);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(new Color(40, 120, 80));
        graphics.fillRect(0, 0, width, height);
        graphics.dispose();
        return image;
    }

    private static byte[] encode(BufferedImage image, String format) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            if (!ImageIO.write(image, format, out)) {
                throw new IllegalStateException("No writer for " + format);
            }
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }
}
