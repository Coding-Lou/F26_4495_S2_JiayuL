package com.jay.outdoor.trail.repository;

import com.jay.outdoor.trail.entity.Trail;
import com.jay.outdoor.trail.service.TrailActivityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Catalog visibility against the migrated database (V7, V8), read only, like
 * {@code TrailServiceApplicationTests}: the curated catalog excludes the
 * synthetic planner candidates, while nearby search and lookup by id include
 * them.
 */
@SpringBootTest
class TrailCatalogVisibilityTest {

    private static final Set<UUID> CURATED_IDS = Set.of(
            "11111111-1111-1111-1111-111111111111",
            "22222222-2222-2222-2222-222222222222",
            "33333333-3333-3333-3333-333333333333",
            "44444444-4444-4444-4444-444444444444",
            "55555555-5555-5555-5555-555555555555",
            "66666666-6666-6666-6666-666666666666",
            "77777777-7777-7777-7777-777777777777",
            "88888888-8888-8888-8888-888888888888"
    ).stream().map(UUID::fromString).collect(Collectors.toSet());

    private static final double VANCOUVER_LAT = 49.2827;
    private static final double VANCOUVER_LON = -123.1207;

    @Autowired TrailRepository trailRepository;
    @Autowired TrailActivityService trailActivityService;

    @Test
    void catalogReturnsOnlyDiscoverVisibleTrails() {
        List<Trail> catalog = trailRepository.searchTrails(null, null, null, null);

        assertTrue(catalog.stream().allMatch(Trail::isDiscoverVisible));
        assertTrue(catalog.stream()
                .noneMatch(trail -> "SYNTHETIC_DEMO".equals(trail.getSource())));
        assertTrue(catalog.stream().map(Trail::getId).collect(Collectors.toSet())
                .containsAll(CURATED_IDS));
    }

    @Test
    void dailyActivityFollowsTheCatalog() {
        int catalogSize = trailRepository.searchTrails(null, null, null, null).size();

        assertEquals(
                catalogSize,
                trailActivityService.getActivity(LocalDate.now()).trails().size()
        );
    }

    @Test
    void nearbySearchIncludesSyntheticPlannerCandidates() {
        List<NearbyTrailProjection> nearby = trailRepository.findNearbyTrails(
                VANCOUVER_LAT, VANCOUVER_LON, 50_000);

        assertTrue(nearby.stream()
                .anyMatch(trail -> "SYNTHETIC_DEMO".equals(trail.getSource())));
        assertTrue(nearby.stream()
                .anyMatch(trail -> CURATED_IDS.contains(trail.getId())));
    }

    @Test
    void lookupByIdFindsASyntheticTrailOutsideTheCatalog() {
        UUID firstSyntheticId = md5Uuid("synthetic-demo-trail:1");

        TrailDetailProjection detail = trailRepository
                .findTrailDetailById(firstSyntheticId)
                .orElseThrow();
        assertEquals("SYNTHETIC_DEMO", detail.getSource());

        Trail trail = trailRepository.findByIdAndDeletedFalse(firstSyntheticId)
                .orElseThrow();
        assertFalse(trail.isDiscoverVisible());
    }

    /** The id V8 gives row n: {@code md5('synthetic-demo-trail:' || n)::uuid}. */
    private static UUID md5Uuid(String key) {
        try {
            String hex = HexFormat.of().formatHex(MessageDigest.getInstance("MD5")
                    .digest(key.getBytes(StandardCharsets.UTF_8)));
            return UUID.fromString(hex.replaceFirst(
                    "(.{8})(.{4})(.{4})(.{4})(.{12})", "$1-$2-$3-$4-$5"));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
