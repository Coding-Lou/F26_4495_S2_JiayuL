package com.jay.outdoor.recommendation.dto;

/**
 * How a planning duration ({@code maxDurationMin}, in minutes) is read.
 *
 * <ul>
 *     <li>{@code APPROXIMATE}: a target length ("around four hours",
 *     "half-day", a bare "four hours"). Scored by closeness; never excludes
 *     a trail.</li>
 *     <li>{@code MAXIMUM}: an upper limit ("up to four hours"). Trails longer
 *     than the value are excluded.</li>
 *     <li>{@code MINIMUM}: a lower limit ("at least four hours"). Trails
 *     shorter than the value are excluded.</li>
 * </ul>
 *
 * A context without a mode but with a duration comes from a client older than
 * this field and is read as {@code MAXIMUM}, its earlier meaning.
 */
public enum DurationMode {
    APPROXIMATE,
    MAXIMUM,
    MINIMUM
}
