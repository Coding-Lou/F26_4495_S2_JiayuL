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
    private static final DefaultRedisScript<Long> RELEASE_SCRIPT = releaseScript();
    private static final String STREAM_KEY = "groupevent:registrations";

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

    public boolean isAdmitted(UUID eventId, String participantSubject) {
        Boolean admitted = redis.opsForSet().isMember(admittedKey(eventId), participantSubject);
        if (admitted == null) {
            throw new IllegalStateException("Redis did not return an admission membership result");
        }
        return admitted;
    }

    public AdmissionResult admit(UUID eventId, String participantSubject) {
        Long result = redis.execute(ADMIT_SCRIPT,
                List.of(seatKey(eventId), admittedKey(eventId),STREAM_KEY),
                participantSubject,
                eventId.toString()
        );
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


    public boolean release(UUID eventId, String participantSubject) {
        Long result = redis.execute(
                RELEASE_SCRIPT,
                List.of(seatKey(eventId), admittedKey(eventId)),
                participantSubject
        );

        if (result == null) {
            throw new IllegalStateException("Redis did not return a release result");
        }
        if (result == 1L) {
            return true;  // 用户被移除，座位加回去了
        }
        if (result == 0L) {
            return false; // 用户原本不在 set，counter 未变化
        }
        if (result == 2L) {
            throw new IllegalStateException("Seat counter is missing for event " + eventId);
        }
        throw new IllegalStateException("Unknown Redis release result: " + result);
    }

    private static DefaultRedisScript<Long> releaseScript() {
        DefaultRedisScript<Long> script = new DefaultRedisScript<>();
        script.setLocation(new ClassPathResource("redis/release-group-event.lua"));
        script.setResultType(Long.class);
        return script;
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

    String streamKey() {return STREAM_KEY;}
}
