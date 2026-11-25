package com.jay.outdoor.activity.redis;

import java.util.List;
import java.util.UUID;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

@Component
public class GroupEventSeatStore {
    private static final DefaultRedisScript<Long> ADMIT_SCRIPT = admissionScript();
    private final StringRedisTemplate redis;

    public GroupEventSeatStore(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void setRemainingSeats(UUID eventId, long seats) {
        if (seats < 0) {
            throw new IllegalArgumentException("Remaining seats cannot be negative");
        }
        redis.opsForValue().set(seatKey(eventId), Long.toString(seats));
    }

    public Long getRemainingSeats(UUID eventId) {
        String value = redis.opsForValue().get(seatKey(eventId));
        return value == null ? null : Long.valueOf(value);
    }

    public AdmissionResult admit(UUID eventId, String participantSubject) {
        Long result = redis.execute(ADMIT_SCRIPT,
                List.of(seatKey(eventId), admittedKey(eventId)), participantSubject);
        if (result == null) {
            throw new IllegalStateException("Redis did not return an admission result");
        }
        if (result == 0L) {
            return AdmissionResult.ADMITTED;
        }
        if (result == 1L) {
            return AdmissionResult.FULL;
        }
        if (result == 2L) {
            return AdmissionResult.DUPLICATE;
        }
        if (result == 3L) {
            return AdmissionResult.NOT_READY;
        }
        throw new IllegalStateException("Unknown Redis admission result: " + result);
    }

    private static DefaultRedisScript<Long> admissionScript() {
        DefaultRedisScript<Long> script = new DefaultRedisScript<>();
        script.setLocation(new ClassPathResource("redis/admit-group-event.lua"));
        script.setResultType(Long.class);
        return script;
    }

    private String seatKey(UUID eventId) {
        return eventKey(eventId, "seats");
    }

    String admittedKey(UUID eventId) {
        return eventKey(eventId, "admitted");
    }

    private String eventKey(UUID eventId, String suffix) {
        return "groupevent:" + eventId + ":" + suffix;
    }
}
