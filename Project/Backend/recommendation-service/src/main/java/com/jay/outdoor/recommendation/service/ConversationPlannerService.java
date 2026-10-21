package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.dto.DurationMode;
import com.jay.outdoor.recommendation.dto.PlannerStatus;
import com.jay.outdoor.recommendation.dto.PlannerTurnRequest;
import com.jay.outdoor.recommendation.dto.PlannerTurnResponse;
import com.jay.outdoor.recommendation.dto.PlanningContext;
import com.jay.outdoor.recommendation.dto.PlanningContextDelta;
import com.jay.outdoor.recommendation.dto.PlanningPreference;
import com.jay.outdoor.recommendation.dto.RecommendationResponse;
import com.jay.outdoor.recommendation.dto.SceneryType;
import com.jay.outdoor.recommendation.dto.TrailDifficulty;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import static com.jay.outdoor.recommendation.dto.PlanningPreference.DIFFICULTY;
import static com.jay.outdoor.recommendation.dto.PlanningPreference.SCENERY;
import static com.jay.outdoor.recommendation.dto.PlanningPreference.TRIP_LENGTH;

@Service
public class ConversationPlannerService {

    private final RecommendationIntentService intentService;
    private final RecommendationService recommendationService;

    public ConversationPlannerService(
            RecommendationIntentService intentService,
            RecommendationService recommendationService
    ) {
        this.intentService = intentService;
        this.recommendationService = recommendationService;
    }

    public PlannerTurnResponse handleTurn(
            PlannerTurnRequest request,
            String accessToken
    ) {
        PlanningContext current = request.context() == null
                ? PlanningContext.empty()
                : request.context();

        PlanningContextDelta delta = intentService.extractDelta(
                request.message(),
                current.lastAsked()
        );

        MergeResult mergeResult = merge(current, delta);
        PlanningContext merged = mergeResult.context();
        PlanningPreference openedByFallback = mergeResult.openedByFallback();

        Set<PlanningPreference> newlyOpen =
                EnumSet.noneOf(PlanningPreference.class);
        newlyOpen.addAll(merged.openPreferences());
        newlyOpen.removeAll(current.openPreferences());

        if (openedByFallback != null) {
            newlyOpen.remove(openedByFallback);
        }

        String acknowledgement = acknowledgementFor(newlyOpen)
                + fallbackAcknowledgementFor(openedByFallback);

        PlanningPreference nextQuestion = nextQuestion(merged);

        if (nextQuestion != null) {
            PlanningContext context = withLastAsked(merged, nextQuestion);

            return new PlannerTurnResponse(
                    PlannerStatus.NEEDS_CLARIFICATION,
                    acknowledgement + questionFor(nextQuestion, context),
                    context,
                    List.of()
            );
        }

        PlanningContext context = withLastAsked(merged, null);

        RecommendationResponse recommendationResponse =
                recommendationService.recommend(
                        context.toRecommendationIntent(),
                        request.latitude(),
                        request.longitude(),
                        request.tripDate(),
                        request.radiusKm(),
                        accessToken
                );

        int count = recommendationResponse.recommendations().size();

        return new PlannerTurnResponse(
                PlannerStatus.READY_TO_RECOMMEND,
                acknowledgement + readyMessage(count),
                context,
                recommendationResponse.recommendations()
        );
    }

    /**
     * Merges one message's delta into the context, in this order:
     * <ol>
     *     <li>Explicit values overwrite earlier values; unmentioned fields
     *     are kept. A duration's value and mode travel together: a later
     *     duration replaces both.</li>
     *     <li>Dimensions the message explicitly named as "no preference"
     *     (the delta's {@code openPreferences}, plus SCENERY for an explicit
     *     empty scenery list) become open and lose their earlier value,
     *     unless the same message also gave a value for them.</li>
     *     <li>A general "I'm flexible" ({@code generallyFlexible}) opens only
     *     dimensions that still have no value, so it never discards
     *     anything the user already said.</li>
     *     <li>A dimension that has a value is never open: an explicit value
     *     overrides an earlier open choice.</li>
     *     <li>Ask once: if the previous clarification's dimension is still
     *     unresolved after this reply, it becomes open, so the same question
     *     is never asked twice in a row.</li>
     * </ol>
     * The returned context's {@code lastAsked} is still the request's; the
     * caller sets the new one. The result also names the dimension the
     * ask-once rule opened, if any, so that it is acknowledged differently
     * from an explicit "no preference".
     */
    private MergeResult merge(
            PlanningContext current,
            PlanningContextDelta delta
    ) {
        TrailDifficulty difficulty = delta.difficulty() != null
                ? delta.difficulty()
                : current.difficulty();
        Double maxDistanceKm = delta.maxDistanceKm() != null
                ? delta.maxDistanceKm()
                : current.maxDistanceKm();
        Integer maxElevationGainM = delta.maxElevationGainM() != null
                ? delta.maxElevationGainM()
                : current.maxElevationGainM();
        Integer maxDurationMin = current.maxDurationMin();
        DurationMode durationMode = current.durationMode();

        if (delta.maxDurationMin() != null) {
            maxDurationMin = delta.maxDurationMin();
            durationMode = delta.durationMode();
        }

        List<SceneryType> preferredScenery = delta.preferredScenery() != null
                ? delta.preferredScenery()
                : current.preferredScenery();

        Set<PlanningPreference> open =
                EnumSet.noneOf(PlanningPreference.class);
        open.addAll(current.openPreferences());

        Set<PlanningPreference> named =
                EnumSet.noneOf(PlanningPreference.class);
        named.addAll(delta.openPreferences());

        if (delta.preferredScenery() != null
                && delta.preferredScenery().isEmpty()) {
            named.add(SCENERY);
        }

        for (PlanningPreference preference : named) {
            if (deltaHasValue(delta, preference)) {
                continue;
            }

            open.add(preference);

            switch (preference) {
                case DIFFICULTY -> difficulty = null;
                case SCENERY -> preferredScenery = List.of();
                case TRIP_LENGTH -> {
                    maxDistanceKm = null;
                    maxElevationGainM = null;
                    maxDurationMin = null;
                    durationMode = null;
                }
            }
        }

        PlanningContext merged = new PlanningContext(
                difficulty,
                maxDistanceKm,
                maxElevationGainM,
                maxDurationMin,
                durationMode,
                preferredScenery,
                List.copyOf(open),
                current.lastAsked()
        );

        if (delta.generallyFlexible()) {
            for (PlanningPreference preference : PlanningPreference.values()) {
                if (!hasValue(merged, preference)) {
                    open.add(preference);
                }
            }
        }

        open.removeIf(preference -> hasValue(merged, preference));

        PlanningContext withOpen = withOpenPreferences(merged, open);

        PlanningPreference lastAsked = current.lastAsked();

        if (lastAsked != null && !isResolved(withOpen, lastAsked)) {
            open.add(lastAsked);
            return new MergeResult(
                    withOpenPreferences(merged, open),
                    lastAsked
            );
        }

        return new MergeResult(withOpen, null);
    }

    /**
     * @param openedByFallback the dimension the ask-once rule opened because
     *                         the reply did not answer it, or null
     */
    private record MergeResult(
            PlanningContext context,
            PlanningPreference openedByFallback
    ) {
    }

    /**
     * DIFFICULTY is resolved by a value or by being open. TRIP_LENGTH and
     * SCENERY form one group, resolved by any duration, distance, or
     * elevation value, a non-empty scenery list, or either being open.
     */
    private boolean isResolved(
            PlanningContext context,
            PlanningPreference preference
    ) {
        if (preference == DIFFICULTY) {
            return hasValue(context, DIFFICULTY)
                    || context.openPreferences().contains(DIFFICULTY);
        }

        return hasValue(context, TRIP_LENGTH)
                || hasValue(context, SCENERY)
                || context.openPreferences().contains(TRIP_LENGTH)
                || context.openPreferences().contains(SCENERY);
    }

    /**
     * Difficulty is asked first, then trip length; null when ready.
     */
    private PlanningPreference nextQuestion(PlanningContext context) {
        if (!isResolved(context, DIFFICULTY)) {
            return DIFFICULTY;
        }

        if (!isResolved(context, TRIP_LENGTH)) {
            return TRIP_LENGTH;
        }

        return null;
    }

    private static boolean hasValue(
            PlanningContext context,
            PlanningPreference preference
    ) {
        return switch (preference) {
            case DIFFICULTY -> context.difficulty() != null;
            case SCENERY -> !context.preferredScenery().isEmpty();
            case TRIP_LENGTH -> context.maxDurationMin() != null
                    || context.maxDistanceKm() != null
                    || context.maxElevationGainM() != null;
        };
    }

    private static boolean deltaHasValue(
            PlanningContextDelta delta,
            PlanningPreference preference
    ) {
        return switch (preference) {
            case DIFFICULTY -> delta.difficulty() != null;
            case SCENERY -> delta.preferredScenery() != null
                    && !delta.preferredScenery().isEmpty();
            case TRIP_LENGTH -> delta.maxDurationMin() != null
                    || delta.maxDistanceKm() != null
                    || delta.maxElevationGainM() != null;
        };
    }

    private static PlanningContext withOpenPreferences(
            PlanningContext context,
            Set<PlanningPreference> openPreferences
    ) {
        return new PlanningContext(
                context.difficulty(),
                context.maxDistanceKm(),
                context.maxElevationGainM(),
                context.maxDurationMin(),
                context.durationMode(),
                context.preferredScenery(),
                List.copyOf(openPreferences),
                context.lastAsked()
        );
    }

    private static PlanningContext withLastAsked(
            PlanningContext context,
            PlanningPreference lastAsked
    ) {
        return new PlanningContext(
                context.difficulty(),
                context.maxDistanceKm(),
                context.maxElevationGainM(),
                context.maxDurationMin(),
                context.durationMode(),
                context.preferredScenery(),
                context.openPreferences(),
                lastAsked
        );
    }

    /**
     * A short prefix, with a trailing space, when the message explicitly
     * opened a dimension this turn; otherwise empty.
     */
    private String acknowledgementFor(Set<PlanningPreference> newlyOpen) {
        if (newlyOpen.isEmpty()) {
            return "";
        }

        if (newlyOpen.size() > 1) {
            return "Sounds good. I'll keep that flexible. ";
        }

        return switch (newlyOpen.iterator().next()) {
            case DIFFICULTY -> "Got it — I'll keep the difficulty open. ";
            case TRIP_LENGTH -> "Got it — I'll keep the trip length open. ";
            case SCENERY -> "Got it — I'll keep the scenery open. ";
        };
    }

    /**
     * A short prefix, with a trailing space, when the ask-once rule opened a
     * dimension because the reply did not answer it; otherwise empty. Unlike
     * {@link #acknowledgementFor}, it does not claim the user chose this.
     */
    private String fallbackAcknowledgementFor(
            PlanningPreference openedByFallback
    ) {
        if (openedByFallback == null) {
            return "";
        }

        return switch (openedByFallback) {
            case DIFFICULTY -> "I'll leave the difficulty open for now. ";
            case TRIP_LENGTH -> "I'll leave the trip length open for now. ";
            case SCENERY -> "I'll leave the scenery open for now. ";
        };
    }

    private String questionFor(
            PlanningPreference question,
            PlanningContext context
    ) {
        String base = question == DIFFICULTY
                ? "How difficult would you like the hike to be"
                : "How long would you like to spend hiking";

        return context.openPreferences().isEmpty()
                ? base + "?"
                : base + ", or should I keep that open too?";
    }

    private String readyMessage(int recommendationCount) {
        if (recommendationCount == 0) {
            return "I couldn't find a trail that fits those preferences.";
        }

        String trailLabel = recommendationCount == 1
                ? "trail"
                : "trails";

        return "I found %d %s that fit what you're looking for."
                .formatted(recommendationCount, trailLabel);
    }
}
