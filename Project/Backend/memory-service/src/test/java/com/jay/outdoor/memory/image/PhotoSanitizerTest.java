package com.jay.outdoor.memory.image;

import com.jay.outdoor.memory.exception.ImageTooLargeException;
import com.jay.outdoor.memory.exception.UnsupportedImageException;
import com.jay.outdoor.memory.support.Fixtures;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.w3c.dom.Node;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Sanitization by decode and re-encode (section 10.2, AC-21): the output is a
 * valid JPEG or PNG of the same size with no EXIF, XMP, IPTC, or text metadata.
 * Metadata absence is checked with ImageIO's metadata trees and a byte search.
 */
class PhotoSanitizerTest {

    private final PhotoSanitizer sanitizer = new PhotoSanitizer();

    @ParameterizedTest
    @CsvSource({
            Fixtures.JPEG_GPS + ",        64, 48, image/jpeg, jpg",
            Fixtures.PNG_TEXT_EXIF + ",   40, 30, image/png,  png",
            Fixtures.WEBP_EXIF + ",       48, 32, image/jpeg, jpg",
            Fixtures.WEBP_ALPHA_EXIF + ", 48, 32, image/png,  png",
    })
    void reencodesWithoutAnyMetadata(
            String fixture,
            int width,
            int height,
            String mediaType,
            String extension
    ) throws Exception {
        byte[] input = Fixtures.read(fixture);
        assertTrue(Fixtures.containsAscii(input, Fixtures.GPS_MARKER),
                "fixture must carry the GPS marker for the test to mean anything");

        SanitizedPhoto output = sanitizer.sanitize(input);

        assertEquals(mediaType, output.mediaType());
        assertEquals(extension, output.extension());
        assertFalse(java.util.Arrays.equals(input, output.content()));

        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(output.content()));
        assertNotNull(decoded, "output must be a valid image");
        assertEquals(width, decoded.getWidth());
        assertEquals(height, decoded.getHeight());

        byte[] bytes = output.content();
        if (mediaType.equals("image/jpeg")) {
            assertArrayEquals(new byte[]{(byte) 0xFF, (byte) 0xD8}, java.util.Arrays.copyOf(bytes, 2));
            assertFalse(jpegMarkers(bytes).contains(0xE1), "no APP1 (EXIF / XMP) segment");
            assertFalse(jpegMarkers(bytes).contains(0xED), "no APP13 (IPTC) segment");
        } else {
            assertArrayEquals(new byte[]{(byte) 0x89, 'P', 'N', 'G'}, java.util.Arrays.copyOf(bytes, 4));
            List<String> nodes = pngMetadataNodes(bytes);
            assertFalse(nodes.contains("tEXt"));
            assertFalse(nodes.contains("iTXt"));
            assertFalse(nodes.contains("zTXt"));
            for (String chunk : List.of("tEXt", "iTXt", "zTXt", "eXIf")) {
                assertFalse(Fixtures.containsAscii(bytes, chunk), "no " + chunk + " chunk");
            }
        }

        for (String trace : List.of(Fixtures.GPS_MARKER, "Exif", "http://ns.adobe.com", "xmpmeta")) {
            assertFalse(Fixtures.containsAscii(bytes, trace), "output contains " + trace);
        }
    }

    @Test
    void keepsTransparencyOfAWebpWithAlpha() {
        SanitizedPhoto output = sanitizer.sanitize(Fixtures.read(Fixtures.WEBP_ALPHA_EXIF));

        BufferedImage decoded = read(output.content());
        assertTrue(decoded.getColorModel().hasAlpha());
        // Right half of the fixture is semi-transparent.
        assertTrue((decoded.getRGB(40, 10) >>> 24) < 255);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            Fixtures.GIF, Fixtures.SVG, Fixtures.HEIC, Fixtures.TEXT_AS_JPG, Fixtures.WEBP_ANIMATED
    })
    void refusesEverythingButStillJpegPngAndWebp(String fixture) {
        assertThrows(UnsupportedImageException.class,
                () -> sanitizer.sanitize(Fixtures.read(fixture)));
    }

    @Test
    void refusesEmptyAndTruncatedInput() {
        assertThrows(UnsupportedImageException.class, () -> sanitizer.sanitize(new byte[0]));

        byte[] jpeg = Fixtures.read(Fixtures.JPEG_GPS);
        byte[] truncated = java.util.Arrays.copyOf(jpeg, 40);
        assertThrows(UnsupportedImageException.class, () -> sanitizer.sanitize(truncated));
    }

    @Test
    void refusesImagesOverTheDimensionLimitsBeforeDecoding() {
        assertThrows(ImageTooLargeException.class,
                () -> sanitizer.sanitize(Fixtures.binaryPng(12_001, 1)));
        assertThrows(ImageTooLargeException.class,
                () -> sanitizer.sanitize(Fixtures.binaryPng(1, 12_001)));
        // 6400 x 6400 = 40.96 MP
        assertThrows(ImageTooLargeException.class,
                () -> sanitizer.sanitize(Fixtures.binaryPng(6_400, 6_400)));
    }

    @Test
    void acceptsImagesAtTheSideLimit() {
        SanitizedPhoto output = sanitizer.sanitize(Fixtures.binaryPng(12_000, 1));
        assertEquals("image/png", output.mediaType());
        assertEquals(12_000, read(output.content()).getWidth());
    }

    private static BufferedImage read(byte[] bytes) {
        try {
            return ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (Exception ex) {
            throw new AssertionError(ex);
        }
    }

    /** JPEG marker codes from ImageIO's native metadata tree (APPn markers appear as "unknown" or app0JFIF). */
    private static List<Integer> jpegMarkers(byte[] jpeg) throws Exception {
        List<Integer> markers = new ArrayList<>();
        Node root = imageMetadata(jpeg, "javax_imageio_jpeg_image_1.0");
        Node sequence = child(root, "markerSequence");
        for (Node n = sequence.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (n.getNodeName().equals("unknown")) {
                markers.add(Integer.parseInt(
                        n.getAttributes().getNamedItem("MarkerTag").getNodeValue()));
            } else if (n.getNodeName().equals("app14Adobe")) {
                markers.add(0xEE);
            }
        }
        Node jpegVariety = child(root, "JPEGvariety");
        for (Node n = jpegVariety.getFirstChild(); n != null; n = n.getNextSibling()) {
            for (Node c = n.getFirstChild(); c != null; c = c.getNextSibling()) {
                if (c.getNodeName().equals("app2ICC")) {
                    markers.add(0xE2);
                }
            }
        }
        return markers;
    }

    private static List<String> pngMetadataNodes(byte[] png) throws Exception {
        List<String> names = new ArrayList<>();
        Node root = imageMetadata(png, "javax_imageio_png_1.0");
        for (Node n = root.getFirstChild(); n != null; n = n.getNextSibling()) {
            names.add(n.getNodeName());
        }
        return names;
    }

    private static Node imageMetadata(byte[] bytes, String format) throws Exception {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, false);
                IIOMetadata metadata = reader.getImageMetadata(0);
                return metadata.getAsTree(format);
            } finally {
                reader.dispose();
            }
        }
    }

    private static Node child(Node parent, String name) {
        for (Node n = parent.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (n.getNodeName().equals(name)) {
                return n;
            }
        }
        throw new AssertionError("no " + name + " node");
    }
}
