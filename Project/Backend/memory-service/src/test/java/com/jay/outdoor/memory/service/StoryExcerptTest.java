package com.jay.outdoor.memory.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Section 14.4 (AC-29). */
class StoryExcerptTest {

    @Test
    void nullStoryHasNoExcerpt() {
        StoryExcerpt excerpt = StoryExcerpt.of(null);
        assertNull(excerpt.text());
        assertFalse(excerpt.truncated());
    }

    @Test
    void storiesUpTo240CharactersAreReturnedWhole() {
        String story = "x".repeat(239) + " ";
        assertEquals(story, StoryExcerpt.of(story).text());
        assertFalse(StoryExcerpt.of(story).truncated());
        assertEquals("y".repeat(240), StoryExcerpt.of("y".repeat(240)).text());
    }

    @Test
    void longerStoriesAreCutBackToTheLastWhitespaceAndTrimmed() {
        String story = "a".repeat(200) + "   " + "b".repeat(30) + " " + "c".repeat(50);
        StoryExcerpt excerpt = StoryExcerpt.of(story);

        assertEquals("a".repeat(200) + "   " + "b".repeat(30), excerpt.text());
        assertTrue(excerpt.truncated());

        String spaced = "a".repeat(100) + "  \n  " + "b".repeat(200);
        assertEquals("a".repeat(100), StoryExcerpt.of(spaced).text());
    }

    @Test
    void longerStoriesWithoutWhitespaceAreCutHardAt240() {
        StoryExcerpt excerpt = StoryExcerpt.of("z".repeat(500));
        assertEquals("z".repeat(240), excerpt.text());
        assertTrue(excerpt.truncated());

        // Only a leading space: the cut would be empty, so the hard cut applies.
        String leading = " " + "q".repeat(400);
        assertEquals(" " + "q".repeat(239), StoryExcerpt.of(leading).text());
    }

    @Test
    void theCutNeverSplitsASurrogatePair() {
        String mountain = "🏔";          // one code point, two UTF-16 units
        String story = "m".repeat(239) + mountain + "tail";
        StoryExcerpt excerpt = StoryExcerpt.of(story);

        assertEquals("m".repeat(239), excerpt.text());
        assertTrue(excerpt.truncated());
        assertFalse(Character.isHighSurrogate(excerpt.text().charAt(excerpt.text().length() - 1)));
    }
}
