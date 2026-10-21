package com.jay.outdoor.trail.service;

import com.jay.outdoor.trail.dto.ActivitySource;
import com.jay.outdoor.trail.dto.TrailActivityItemResponse;
import com.jay.outdoor.trail.dto.TrailActivityResponse;
import com.jay.outdoor.trail.repository.TrailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;
import java.util.zip.CRC32;

@Service
public class TrailActivityService {

    private final TrailRepository trailRepository;
    private final Clock clock;

    @Autowired
    public TrailActivityService(TrailRepository trailRepository) {
        this(trailRepository, Clock.systemDefaultZone());
    }

    TrailActivityService(TrailRepository trailRepository, Clock clock) {
        this.trailRepository = trailRepository;
        this.clock = clock;
    }

    public TrailActivityResponse getActivity(LocalDate date) {
        LocalDate serverDate = LocalDate.now(clock);
        if (date == null || date.isBefore(serverDate.minusDays(1))
                || date.isAfter(serverDate.plusDays(1))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "date must be within one day of the server's local date"
            );
        }

        // Reuse the list endpoint's query for visibility and name ordering.
        return new TrailActivityResponse(
                date,
                ActivitySource.SIMULATED,
                trailRepository.searchTrails(null, null, null, null).stream()
                        .map(trail -> new TrailActivityItemResponse(
                                trail.getId(), simulatedCount(trail.getId(), date)))
                        .toList()
        );
    }

    /**
     * SIMULATED Daily Trail Activity: a sample number, not a recorded count.
     *
     * <p>The value depends only on the trail id and the date. It uses no random
     * source, no stored state, and no clock, so repeated calls and every server
     * instance return the same number. CRC32 over the lower-case UUID string and
     * the ISO date gives the same result on every JVM.
     *
     * <ol>
     *   <li>Level: {@code (crc32(trailId) + date.toEpochDay()) mod 3}, so each trail
     *       moves to the next level every day: 0 is zero, 1 is "some" (1-9), and
     *       2 is "many" (10-20).</li>
     *   <li>Value within the level: {@code crc32(trailId + ":" + date)}, giving
     *       {@code 1 + h mod 9} for "some" and {@code 10 + h mod 11} for "many".</li>
     * </ol>
     *
     * <p>Because every trail visits each level two or three times in any seven
     * consecutive days, each level receives between 2/7 and 3/7 of the values
     * over a week, for any set of trails.
     */
    static int simulatedCount(UUID trailId, LocalDate date) {
        int level = (int) Math.floorMod(
                crc32(trailId.toString()) + date.toEpochDay(), 3L);
        long value = crc32(trailId + ":" + date);
        return switch (level) {
            case 0 -> 0;
            case 1 -> 1 + (int) (value % 9);
            default -> 10 + (int) (value % 11);
        };
    }

    private static long crc32(String key) {
        CRC32 hash = new CRC32();
        hash.update(key.getBytes(StandardCharsets.UTF_8));
        return hash.getValue();
    }
}
