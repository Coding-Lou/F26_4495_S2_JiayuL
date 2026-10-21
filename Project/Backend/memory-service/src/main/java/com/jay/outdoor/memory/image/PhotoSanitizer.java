package com.jay.outdoor.memory.image;

import com.jay.outdoor.memory.exception.ApplicationException;
import com.jay.outdoor.memory.exception.ImageTooLargeException;
import com.jay.outdoor.memory.exception.UnsupportedImageException;
import org.springframework.stereotype.Component;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;

/**
 * Privacy boundary for photos (section 10.2): the type is recognised by the
 * registered ImageIO readers (JPEG and PNG from the JDK, WebP from TwelveMonkeys),
 * the header dimensions are checked before decoding, and the pixels are then
 * written to a brand-new JPEG or PNG. Metadata is never read or written, so the
 * stored file carries no EXIF, GPS, XMP, IPTC, or text chunks. No binary format
 * is parsed by project code.
 */
@Component
public class PhotoSanitizer {

    public static final int MAX_SIDE_PX = 12_000;
    public static final long MAX_PIXELS = 40_000_000L;
    public static final float JPEG_QUALITY = 0.90f;

    public static final String JPEG = "image/jpeg";
    public static final String PNG = "image/png";

    private enum InputFormat { JPEG, PNG, WEBP }

    public PhotoSanitizer() {
        // No temporary files; and pick up the WebP plugin under any class loader.
        ImageIO.setUseCache(false);
        ImageIO.scanForPlugins();
    }

    /**
     * @throws UnsupportedImageException (415) when the bytes are not a still JPEG,
     *         PNG, or WebP that can be decoded
     * @throws ImageTooLargeException (413) when the header reports too many pixels
     */
    public SanitizedPhoto sanitize(byte[] upload) {
        InputFormat format;
        BufferedImage pixels;

        try (ImageInputStream input =
                     ImageIO.createImageInputStream(new ByteArrayInputStream(upload))) {

            if (input == null) {
                throw new UnsupportedImageException();
            }

            ImageReader reader = acceptedReader(input);

            try {
                format = formatOf(reader);
                // seekForwardOnly = false (frame count), ignoreMetadata = true.
                reader.setInput(input, false, true);

                if (format == InputFormat.WEBP && reader.getNumImages(true) != 1) {
                    throw new UnsupportedImageException();
                }

                int width = reader.getWidth(0);
                int height = reader.getHeight(0);

                if (width <= 0 || height <= 0) {
                    throw new UnsupportedImageException();
                }
                if (width > MAX_SIDE_PX || height > MAX_SIDE_PX
                        || (long) width * height > MAX_PIXELS) {
                    throw new ImageTooLargeException();
                }

                pixels = reader.read(0, reader.getDefaultReadParam());
            } finally {
                reader.dispose();
            }
        } catch (ApplicationException ex) {
            throw ex;
        } catch (IOException | RuntimeException ex) {
            throw new UnsupportedImageException();
        }

        try {
            boolean png = format == InputFormat.PNG
                    || (format == InputFormat.WEBP && pixels.getColorModel().hasAlpha());

            return png
                    ? new SanitizedPhoto(writePng(pixels), PNG, "png")
                    : new SanitizedPhoto(writeJpeg(pixels), JPEG, "jpg");
        } catch (IOException | RuntimeException ex) {
            throw new UnsupportedImageException();
        }
    }

    private static ImageReader acceptedReader(ImageInputStream input) {
        Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
        ImageReader chosen = null;

        while (readers.hasNext()) {
            ImageReader reader = readers.next();
            if (chosen == null && formatOrNull(reader) != null) {
                chosen = reader;
            } else {
                reader.dispose();
            }
        }

        if (chosen == null) {
            // GIF, BMP, TIFF, and anything without a reader (SVG, HEIC, AVIF, text).
            throw new UnsupportedImageException();
        }

        return chosen;
    }

    private static InputFormat formatOf(ImageReader reader) {
        InputFormat format = formatOrNull(reader);
        if (format == null) {
            throw new UnsupportedImageException();
        }
        return format;
    }

    private static InputFormat formatOrNull(ImageReader reader) {
        String name;
        try {
            name = reader.getFormatName().toLowerCase(Locale.ROOT);
        } catch (IOException ex) {
            return null;
        }

        return switch (name) {
            case "jpeg", "jpg" -> InputFormat.JPEG;
            case "png" -> InputFormat.PNG;
            case "webp" -> InputFormat.WEBP;
            default -> null;
        };
    }

    private static byte[] writeJpeg(BufferedImage image) throws IOException {
        BufferedImage opaque = switch (image.getType()) {
            case BufferedImage.TYPE_3BYTE_BGR,
                 BufferedImage.TYPE_INT_RGB,
                 BufferedImage.TYPE_BYTE_GRAY -> image;
            default -> redraw(image, BufferedImage.TYPE_INT_RGB);
        };

        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try {
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            return write(writer, opaque, param);
        } finally {
            writer.dispose();
        }
    }

    private static byte[] writePng(BufferedImage image) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("png").next();
        try {
            BufferedImage encodable = writer.getOriginatingProvider().canEncodeImage(image)
                    ? image
                    : redraw(image, image.getColorModel().hasAlpha()
                    ? BufferedImage.TYPE_INT_ARGB
                    : BufferedImage.TYPE_INT_RGB);
            return write(writer, encodable, writer.getDefaultWriteParam());
        } finally {
            writer.dispose();
        }
    }

    /** Writes pixels only: no stream or image metadata is passed to the writer. */
    private static byte[] write(
            ImageWriter writer,
            BufferedImage image,
            ImageWriteParam param
    ) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();

        try (ImageOutputStream output = ImageIO.createImageOutputStream(bytes)) {
            writer.setOutput(output);
            writer.write(null, new IIOImage(image, null, null), param);
        }

        return bytes.toByteArray();
    }

    private static BufferedImage redraw(BufferedImage source, int type) {
        BufferedImage target = new BufferedImage(source.getWidth(), source.getHeight(), type);
        Graphics2D graphics = target.createGraphics();
        try {
            graphics.drawImage(source, 0, 0, null);
        } finally {
            graphics.dispose();
        }
        return target;
    }
}
