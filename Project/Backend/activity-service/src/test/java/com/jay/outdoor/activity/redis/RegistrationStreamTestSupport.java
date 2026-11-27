package com.jay.outdoor.activity.redis;

import org.springframework.data.redis.core.StringRedisTemplate;

/** Allows controller tests to drive the consumer without exposing its internal methods in production. */
public final class RegistrationStreamTestSupport {

    private RegistrationStreamTestSupport() {
    }

    public static void clearAndEnsureGroup(StringRedisTemplate redis, GroupEventSeatStore seatStore,
                                           GroupEventRegistrationConsumer consumer) {
        redis.delete(seatStore.streamKey());
        consumer.ensureGroup();
    }

    public static void pollOnce(GroupEventRegistrationConsumer consumer) {
        consumer.pollOnce();
    }
}
