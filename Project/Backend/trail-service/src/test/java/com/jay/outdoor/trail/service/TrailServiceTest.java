package com.jay.outdoor.trail.service;

import com.jay.outdoor.trail.dto.NearbyTrailResponse;
import com.jay.outdoor.trail.dto.TrailDetailResponse;
import com.jay.outdoor.trail.dto.TrailSummaryResponse;
import com.jay.outdoor.trail.entity.GearCategory;
import com.jay.outdoor.trail.entity.Trail;
import com.jay.outdoor.trail.entity.TrailDifficulty;
import com.jay.outdoor.trail.repository.NearbyTrailProjection;
import com.jay.outdoor.trail.repository.TrailDetailProjection;
import com.jay.outdoor.trail.repository.TrailGearRequirementProjection;
import com.jay.outdoor.trail.repository.TrailRepository;
import com.jay.outdoor.trail.repository.TrailSceneryProjection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import tools.jackson.databind.json.JsonMapper;

import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrailServiceTest {

    private RepositoryStub repositoryStub;
    private TrailService trailService;

    @BeforeEach
    void setUp() {
        repositoryStub = new RepositoryStub();
        trailService = new TrailService(
                repositoryStub.repository(),
                JsonMapper.builder().build()
        );
    }

    @Test
    void shouldMapSearchResultsToCanonicalSummaryWithCoverImage() {
        UUID trailId = UUID.randomUUID();
        Trail trail = createTrail(trailId);
        TrailSceneryProjection scenery = scenery(trailId, "FOREST");

        repositoryStub.searchResults = List.of(trail);
        repositoryStub.sceneryResults = List.of(scenery);

        List<TrailSummaryResponse> result =
                trailService.searchTrails(
                        null,
                        null,
                        null,
                        null
                );

        TrailSummaryResponse summary = result.getFirst();
        assertEquals("Quarry Rock", summary.name());
        assertEquals(Set.of("FOREST"), summary.scenery());
        assertEquals(
                "https://example.com/quarry-rock.jpg",
                summary.coverImageUrl()
        );
    }

    @Test
    void shouldMapNearbyResultsAndBatchSceneryLookup() {
        UUID trailId = UUID.randomUUID();
        NearbyTrailProjection nearby = nearbyTrail(trailId);
        TrailSceneryProjection forest = scenery(trailId, "FOREST");
        TrailSceneryProjection viewpoint = scenery(trailId, "VIEWPOINT");

        repositoryStub.nearbyResults = List.of(nearby);
        repositoryStub.sceneryResults = List.of(forest, viewpoint);

        List<NearbyTrailResponse> result =
                trailService.getNearbyTrails(
                        49.2827,
                        -123.1207,
                        50.0
                );

        NearbyTrailResponse response = result.getFirst();
        assertEquals("Quarry Rock", response.trail().name());
        assertEquals(
                Set.of("FOREST", "VIEWPOINT"),
                response.trail().scenery()
        );
        assertEquals(
                "https://example.com/quarry-rock.jpg",
                response.trail().coverImageUrl()
        );
        assertEquals(18.5, response.distanceFromUserKm());

        assertEquals(1, repositoryStub.sceneryQueryCount);
        assertEquals(
                List.of(trailId),
                repositoryStub.lastSceneryTrailIds
        );
    }

    @Test
    void shouldMapTrailDetailWithSceneryAndBaselineGear() {
        UUID trailId = UUID.randomUUID();

        repositoryStub.detailResult =
                Optional.of(trailDetail(trailId));
        repositoryStub.sceneryResults = List.of(
                scenery(trailId, "FOREST"),
                scenery(trailId, "VIEWPOINT")
        );
        repositoryStub.gearRequirementResults = List.of(
                gearRequirement(trailId, GearCategory.FOOTWEAR),
                gearRequirement(trailId, GearCategory.WATER),
                gearRequirement(trailId, GearCategory.TREKKING_POLES)
        );

        TrailDetailResponse detail =
                trailService.getTrailDetail(trailId).orElseThrow();

        assertEquals(trailId, detail.id());
        assertEquals("Quarry Rock", detail.name());
        assertEquals("Forest trail", detail.description());
        assertEquals("MODERATE", detail.difficulty());
        assertEquals(5.8, detail.distanceKm());
        assertEquals(220, detail.elevationGainM());
        assertEquals(120, detail.estimatedDurationMin());
        assertEquals(49.3265, detail.latitude());
        assertEquals(-122.9368, detail.longitude());
        assertEquals("DEMO_SEED", detail.source());
        assertEquals(
                Set.of("FOREST", "VIEWPOINT"),
                detail.scenery()
        );
        assertEquals(
                Set.of(
                        GearCategory.FOOTWEAR,
                        GearCategory.WATER,
                        GearCategory.TREKKING_POLES
                ),
                detail.baselineGearRequirements()
        );
        assertNull(detail.route());
        assertNull(detail.coverImageUrl());
        assertEquals(1, repositoryStub.sceneryQueryCount);
        assertEquals(1, repositoryStub.gearRequirementQueryCount);
        assertEquals(List.of(trailId), repositoryStub.lastSceneryTrailIds);
        assertEquals(List.of(trailId), repositoryStub.lastGearTrailIds);
    }

    @Test
    void shouldKeepMissingTrailBehaviorWithoutLoadingEnrichments() {
        UUID trailId = UUID.randomUUID();

        assertTrue(trailService.getTrailDetail(trailId).isEmpty());
        assertEquals(0, repositoryStub.sceneryQueryCount);
        assertEquals(0, repositoryStub.gearRequirementQueryCount);
    }

    private Trail createTrail(
            UUID trailId
    ) {
        Trail trail = new Trail();
        trail.setId(trailId);
        trail.setName("Quarry Rock");
        trail.setDescription("Forest trail");
        trail.setDifficulty(TrailDifficulty.MODERATE);
        trail.setDistanceKm(5.8);
        trail.setElevationGainM(220);
        trail.setEstimatedDurationMin(120);
        trail.setTrailhead(point(-122.9368, 49.3265));
        trail.setSource("DEMO_SEED");
        trail.setCoverImageUrl(
                "https://example.com/quarry-rock.jpg"
        );
        return trail;
    }

    private Point point(
            double longitude,
            double latitude
    ) {
        GeometryFactory geometryFactory =
                new GeometryFactory(
                        new PrecisionModel(),
                        4326
                );
        return geometryFactory.createPoint(
                new Coordinate(longitude, latitude)
        );
    }

    private NearbyTrailProjection nearbyTrail(
            UUID trailId
    ) {
        return new NearbyTrailProjection() {
            public UUID getId() { return trailId; }
            public String getName() { return "Quarry Rock"; }
            public String getDescription() { return "Forest trail"; }
            public String getDifficulty() { return "MODERATE"; }
            public Double getDistanceKm() { return 5.8; }
            public Integer getElevationGainM() { return 220; }
            public Integer getEstimatedDurationMin() { return 120; }
            public Double getLatitude() { return 49.3265; }
            public Double getLongitude() { return -122.9368; }
            public String getSource() { return "DEMO_SEED"; }
            public String getCoverImageUrl() {
                return "https://example.com/quarry-rock.jpg";
            }
            public Double getDistanceFromUserKm() { return 18.5; }
        };
    }

    private TrailSceneryProjection scenery(
            UUID trailId,
            String value
    ) {
        return new TrailSceneryProjection() {
            public UUID getTrailId() { return trailId; }
            public String getScenery() { return value; }
        };
    }

    private TrailGearRequirementProjection gearRequirement(
            UUID trailId,
            GearCategory category
    ) {
        return new TrailGearRequirementProjection() {
            public UUID getTrailId() { return trailId; }
            public String getGearCategory() { return category.name(); }
        };
    }

    private TrailDetailProjection trailDetail(
            UUID trailId
    ) {
        return new TrailDetailProjection() {
            public UUID getId() { return trailId; }
            public String getName() { return "Quarry Rock"; }
            public String getDescription() { return "Forest trail"; }
            public String getDifficulty() { return "MODERATE"; }
            public Double getDistanceKm() { return 5.8; }
            public Integer getElevationGainM() { return 220; }
            public Integer getEstimatedDurationMin() { return 120; }
            public Double getLatitude() { return 49.3265; }
            public Double getLongitude() { return -122.9368; }
            public String getRouteGeoJson() { return null; }
            public String getSource() { return "DEMO_SEED"; }
            public String getCoverImageUrl() { return null; }
        };
    }

    private static final class RepositoryStub {

        private List<Trail> searchResults = List.of();
        private List<NearbyTrailProjection> nearbyResults = List.of();
        private Optional<TrailDetailProjection> detailResult = Optional.empty();
        private List<TrailSceneryProjection> sceneryResults = List.of();
        private List<TrailGearRequirementProjection> gearRequirementResults =
                List.of();
        private int sceneryQueryCount;
        private int gearRequirementQueryCount;
        private Object lastSceneryTrailIds;
        private Object lastGearTrailIds;

        private TrailRepository repository() {
            return (TrailRepository) Proxy.newProxyInstance(
                    TrailRepository.class.getClassLoader(),
                    new Class<?>[]{TrailRepository.class},
                    (proxy, method, arguments) -> switch (method.getName()) {
                        case "searchTrails" -> searchResults;
                        case "findNearbyTrails" -> nearbyResults;
                        case "findTrailDetailById" -> detailResult;
                        case "findSceneryByTrailIds" -> {
                            sceneryQueryCount++;
                            lastSceneryTrailIds = arguments[0];
                            yield sceneryResults;
                        }
                        case "findGearRequirementsByTrailIds" -> {
                            gearRequirementQueryCount++;
                            lastGearTrailIds = arguments[0];
                            yield gearRequirementResults;
                        }
                        case "toString" -> "TrailRepositoryStub";
                        default -> throw new UnsupportedOperationException(
                                method.getName()
                        );
                    }
            );
        }
    }
}
