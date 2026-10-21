package com.jay.outdoor.trail.service;

import com.jay.outdoor.trail.dto.ActivitySource;
import com.jay.outdoor.trail.dto.TrailActivityItemResponse;
import com.jay.outdoor.trail.dto.TrailActivityResponse;
import com.jay.outdoor.trail.entity.Trail;
import com.jay.outdoor.trail.repository.TrailRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrailActivityServiceTest {

    private static final LocalDate SERVER_DATE = LocalDate.of(2026, 10, 14);
    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-10-14T12:00:00Z"), ZoneId.of("America/Vancouver"));

    @Test
    void acceptsExactlyTheServerLocalDateWindow() {
        TrailActivityService service = service(List.of());

        for (int offset = -1; offset <= 1; offset++) {
            assertEquals(SERVER_DATE.plusDays(offset),
                    service.getActivity(SERVER_DATE.plusDays(offset)).date());
        }
        for (LocalDate date : List.of(SERVER_DATE.minusDays(2),
                SERVER_DATE.plusDays(2))) {
            ResponseStatusException error = assertThrows(
                    ResponseStatusException.class, () -> service.getActivity(date));
            assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        }
    }

    @Test
    void returnsEveryVisibleTrailIncludingZerosAndStableRepresentativeCounts() {
        List<Trail> visibleTrails = IntStream.rangeClosed(1, 8)
                .mapToObj(this::seedTrail)
                .toList();
        TrailActivityService service = service(visibleTrails);
        TrailActivityService anotherInvocation = service(visibleTrails);

        List<TrailActivityResponse> responses = IntStream.rangeClosed(-1, 1)
                .mapToObj(offset -> service.getActivity(SERVER_DATE.plusDays(offset)))
                .toList();
        for (TrailActivityResponse response : responses) {
            assertEquals(ActivitySource.SIMULATED, response.source());
            assertEquals(visibleTrails.size(), response.trails().size());
            assertEquals(visibleTrails.stream().map(Trail::getId).toList(),
                    response.trails().stream().map(TrailActivityItemResponse::trailId).toList());
            assertTrue(response.trails().stream().allMatch(item -> item.activityCount() >= 0));
            assertEquals(response, service.getActivity(response.date()));
            assertEquals(response, anotherInvocation.getActivity(response.date()));
        }

        Set<Integer> counts = responses.stream()
                .flatMap(response -> response.trails().stream())
                .map(TrailActivityItemResponse::activityCount)
                .collect(Collectors.toSet());
        assertTrue(counts.contains(0));
        assertTrue(counts.stream().anyMatch(count -> count >= 1 && count <= 9));
        assertTrue(counts.stream().anyMatch(count -> count >= 10));
        assertFalse(responses.getFirst().trails().stream()
                .map(TrailActivityItemResponse::activityCount).toList()
                .equals(responses.getLast().trails().stream()
                        .map(TrailActivityItemResponse::activityCount).toList()));
    }

    @Test
    void seedTrailsSpreadRoughlyAThirdPerLevelOverEveryWeekAndEveryDay() {
        // The eight V2 DEMO_SEED ids, 11111111-... through 88888888-...
        List<UUID> seedIds = IntStream.rangeClosed(1, 8)
                .mapToObj(index -> seedTrail(index).getId())
                .toList();

        for (int start = 0; start < 365; start++) {
            int[] weekLevels = new int[3];
            for (int day = 0; day < 7; day++) {
                LocalDate date = SERVER_DATE.plusDays(start + day);
                int[] dayLevels = new int[3];
                for (UUID id : seedIds) {
                    int count = TrailActivityService.simulatedCount(id, date);
                    assertTrue(count >= 0 && count <= 20, "count out of range: " + count);
                    weekLevels[level(count)]++;
                    dayLevels[level(count)]++;
                }
                for (int level = 0; level < 3; level++) {
                    assertTrue(dayLevels[level] > 0,
                            "level " + level + " missing on " + date);
                }
            }
            // 56 values per week: each level gets 16-24, i.e. between 2/7 and 3/7.
            for (int level = 0; level < 3; level++) {
                assertTrue(weekLevels[level] >= 16 && weekLevels[level] <= 24,
                        "week from " + SERVER_DATE.plusDays(start) + " level "
                                + level + " has " + weekLevels[level]);
            }
        }
    }

    private static int level(int count) {
        return count == 0 ? 0 : count <= 9 ? 1 : 2;
    }

    private TrailActivityService service(List<Trail> visibleTrails) {
        TrailRepository repository = (TrailRepository) Proxy.newProxyInstance(
                TrailRepository.class.getClassLoader(),
                new Class<?>[]{TrailRepository.class},
                (proxy, method, arguments) -> switch (method.getName()) {
                    case "searchTrails" -> {
                        assertEquals(4, arguments.length);
                        for (Object argument : arguments) assertNull(argument);
                        yield visibleTrails;
                    }
                    case "toString" -> "TrailRepositoryStub";
                    default -> throw new UnsupportedOperationException(method.getName());
                }
        );
        return new TrailActivityService(repository, CLOCK);
    }

    private Trail seedTrail(int index) {
        Trail trail = new Trail();
        String digit = Integer.toString(index);
        trail.setId(UUID.fromString((digit.repeat(8) + "-" + digit.repeat(4)
                + "-" + digit.repeat(4) + "-" + digit.repeat(4) + "-" + digit.repeat(12))));
        return trail;
    }
}
