package com.jay.outdoor.recommendation.dto;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class PlanningContextTest {

    @Test
    void contextDurationWithoutModeIsReadAsMaximum() {
        PlanningContext context = new PlanningContext(
                null, null, null, 180, null, null, null, null
        );

        assertEquals(DurationMode.MAXIMUM, context.durationMode());
        assertEquals(
                DurationMode.MAXIMUM,
                context.toRecommendationIntent().durationMode()
        );
    }

    @Test
    void contextModeWithoutDurationIsDropped() {
        PlanningContext context = new PlanningContext(
                null, null, null, null, DurationMode.MINIMUM,
                List.of(), List.of(), null
        );

        assertNull(context.durationMode());
        assertNull(context.toRecommendationIntent().durationMode());
    }

    @Test
    void contextKeepsAGivenMode() {
        PlanningContext context = new PlanningContext(
                null, null, null, 240, DurationMode.APPROXIMATE,
                List.of(), List.of(), null
        );

        RecommendationIntent intent = context.toRecommendationIntent();

        assertEquals(240, intent.maxDurationMin());
        assertEquals(DurationMode.APPROXIMATE, intent.durationMode());
    }

    @Test
    void deltaDurationWithoutModeIsReadAsApproximate() {
        PlanningContextDelta delta = new PlanningContextDelta(
                null, null, null, 240, null
        );

        assertEquals(DurationMode.APPROXIMATE, delta.durationMode());
    }

    @Test
    void deltaModeWithoutDurationIsDropped() {
        PlanningContextDelta delta = new PlanningContextDelta(
                null, null, null, null, DurationMode.MAXIMUM,
                null, List.of(), false
        );

        assertNull(delta.durationMode());
    }

    @Test
    void intentDurationWithoutModeIsReadAsMaximum() {
        RecommendationIntent intent = new RecommendationIntent(
                null, null, null, 180, null, List.of()
        );

        assertEquals(DurationMode.MAXIMUM, intent.durationMode());
    }
}
