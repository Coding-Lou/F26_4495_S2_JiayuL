package com.jay.outdoor.memory.service;

import com.jay.outdoor.memory.exception.RequestValidationException;
import com.jay.outdoor.memory.exception.RequestValidationException.FieldError;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** The editable-field rules of section 7.1, applied after Bean Validation. */
@Component
public class MemoryFieldRules {

    public static final int TITLE_MAX_LENGTH = 120;
    public static final int STORY_MAX_LENGTH = 5000;

    /**
     * Future trip Memories are not supported (D10). One day past the server's
     * local date is tolerated only because the author's calendar day may already
     * be ahead of the server's; it is a time-zone boundary allowance, not a
     * supported future date.
     */
    static final int TIME_ZONE_ALLOWANCE_DAYS = 1;

    public record Fields(LocalDate tripDate, String title, String story) {
    }

    private final Clock clock;

    public MemoryFieldRules(Clock clock) {
        this.clock = clock;
    }

    public Fields validate(LocalDate tripDate, String title, String story) {
        List<FieldError> errors = new ArrayList<>();

        if (tripDate == null) {
            errors.add(new FieldError("tripDate", "must not be null"));
        } else if (tripDate.isAfter(latestAcceptedTripDate())) {
            errors.add(new FieldError("tripDate", "must not be in the future"));
        }

        String trimmedTitle = title == null ? "" : title.trim();
        if (trimmedTitle.isEmpty()) {
            errors.add(new FieldError("title", "must not be blank"));
        } else if (trimmedTitle.length() > TITLE_MAX_LENGTH) {
            errors.add(new FieldError("title",
                    "size must be between 1 and " + TITLE_MAX_LENGTH));
        }

        String normalizedStory = story == null || story.isBlank() ? null : story;
        if (normalizedStory != null && normalizedStory.length() > STORY_MAX_LENGTH) {
            errors.add(new FieldError("story",
                    "size must be between 0 and " + STORY_MAX_LENGTH));
        }

        if (!errors.isEmpty()) {
            throw new RequestValidationException(errors);
        }

        return new Fields(tripDate, trimmedTitle, normalizedStory);
    }

    private LocalDate latestAcceptedTripDate() {
        return LocalDate.now(clock).plusDays(TIME_ZONE_ALLOWANCE_DAYS);
    }
}
