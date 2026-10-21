package com.jay.outdoor.memory.service;

/** The public list's story excerpt (section 14.4), computed at read time. */
public record StoryExcerpt(String text, boolean truncated) {

    public static final int MAX_LENGTH = 240;

    public static StoryExcerpt of(String story) {
        if (story == null) {
            return new StoryExcerpt(null, false);
        }
        if (story.length() <= MAX_LENGTH) {
            return new StoryExcerpt(story, false);
        }

        int end = MAX_LENGTH;
        // Never split a surrogate pair.
        if (Character.isHighSurrogate(story.charAt(end - 1))
                && Character.isLowSurrogate(story.charAt(end))) {
            end--;
        }

        String head = story.substring(0, end);

        int lastWhitespace = -1;
        for (int i = head.length() - 1; i >= 0; i--) {
            if (Character.isWhitespace(head.charAt(i))) {
                lastWhitespace = i;
                break;
            }
        }

        String cut = lastWhitespace > 0 ? head.substring(0, lastWhitespace) : head;
        String text = cut.stripTrailing();
        if (text.isEmpty()) {
            text = head.stripTrailing();
        }

        return new StoryExcerpt(text, true);
    }
}
