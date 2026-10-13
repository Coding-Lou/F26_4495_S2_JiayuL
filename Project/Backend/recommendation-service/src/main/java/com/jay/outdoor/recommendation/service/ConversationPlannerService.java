package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.dto.PlannerStatus;
import com.jay.outdoor.recommendation.dto.PlannerTurnRequest;
import com.jay.outdoor.recommendation.dto.PlannerTurnResponse;
import com.jay.outdoor.recommendation.dto.PlanningContext;
import com.jay.outdoor.recommendation.dto.PlanningContextDelta;
import com.jay.outdoor.recommendation.dto.RecommendationResponse;
import org.springframework.stereotype.Service;

import java.util.List;

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
        PlanningContextDelta delta =
                intentService.extractDelta(request.message());

        PlanningContext context = merge(
                request.context(),
                delta
        );

        if (!isReady(context)) {
            return new PlannerTurnResponse(
                    PlannerStatus.NEEDS_CLARIFICATION,
                    clarificationFor(context),
                    context,
                    List.of()
            );
        }

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
                readyMessage(count),
                context,
                recommendationResponse.recommendations()
        );
    }

    private PlanningContext merge(
            PlanningContext existingContext,
            PlanningContextDelta delta
    ) {
        PlanningContext current = existingContext == null
                ? PlanningContext.empty()
                : existingContext;

        return new PlanningContext(
                delta.difficulty() != null
                        ? delta.difficulty()
                        : current.difficulty(),
                delta.maxDistanceKm() != null
                        ? delta.maxDistanceKm()
                        : current.maxDistanceKm(),
                delta.maxElevationGainM() != null
                        ? delta.maxElevationGainM()
                        : current.maxElevationGainM(),
                delta.maxDurationMin() != null
                        ? delta.maxDurationMin()
                        : current.maxDurationMin(),
                delta.preferredScenery() != null
                        ? delta.preferredScenery()
                        : current.preferredScenery()
        );
    }

    /**
     * The planner is ready once difficulty and at least one useful trip
     * constraint or preference are known. It intentionally does not require
     * every supported preference.
     */
    private boolean isReady(PlanningContext context) {
        return context.difficulty() != null
                && (context.maxDurationMin() != null
                || context.maxDistanceKm() != null
                || context.maxElevationGainM() != null
                || !context.preferredScenery().isEmpty());
    }

    private String clarificationFor(PlanningContext context) {
        if (context.difficulty() == null) {
            return "How difficult would you like the hike to be?";
        }

        return "How long would you like to spend hiking?";
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
