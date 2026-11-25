package com.jay.outdoor.activity.redis;

import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class GroupEventSeatStore {
    private final StringRedisTemplate redis;

    public GroupEventSeatStore(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void setRemainingSeats(UUID eventId, long seats) {
        redis.opsForValue().set(key(eventId), Long.toString(seats));
    }

    public Long getRemainingSeats(UUID eventId) {
        String value = redis.opsForValue().get(key(eventId));
        return value == null ? null : Long.valueOf(value);
    }

    public long takeOneSeat(UUID eventId) {
        Long remaining = redis.opsForValue().decrement(key(eventId));
        if (remaining == null) {
            throw new IllegalStateException("Redis did not return a seat count");
        }
        return remaining;
    }

    private String key(UUID eventId) {
        return "groupevent:" + eventId + ":seats";
    }
}