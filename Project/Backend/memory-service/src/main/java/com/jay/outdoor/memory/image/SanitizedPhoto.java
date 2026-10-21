package com.jay.outdoor.memory.image;

/** A freshly encoded image: the only bytes that are ever stored. */
public record SanitizedPhoto(byte[] content, String mediaType, String extension) {
}
