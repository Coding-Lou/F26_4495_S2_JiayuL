package com.jay.outdoor.activity.redis;

import com.jay.outdoor.activity.service.EventRegistrationService;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class GroupEventRegistrationConsumer {

    private static final String GROUP = "group-event-registration";
    private final String consumerName = "activity-" + UUID.randomUUID();

    private final StringRedisTemplate redisTemplate;
    private final EventRegistrationService eventRegistrationService;
    private final GroupEventSeatStore seatStore;


    public GroupEventRegistrationConsumer(StringRedisTemplate redisTemplate,
                                          EventRegistrationService eventRegistrationService,
                                          GroupEventSeatStore seatStore)
    {
        this.redisTemplate = redisTemplate;
        this.eventRegistrationService = eventRegistrationService;
        this.seatStore = seatStore;
    }

    void ensureGroup() {
        String key = seatStore.streamKey();
        try {
            redisTemplate.opsForStream().createGroup(key, ReadOffset.from("0"), GROUP);
        } catch (RedisSystemException e) {
            String reason = e.getMostSpecificCause().getMessage();
            if (reason == null || !reason.contains("BUSYGROUP")) {
                throw e;
            }
        }
    }

    void pollOnce() {
        var records = redisTemplate.opsForStream().read(
                Consumer.from(GROUP, consumerName),
                StreamReadOptions.empty().count(10),
                StreamOffset.create(
                        seatStore.streamKey(),
                        ReadOffset.lastConsumed()));

        if (records == null || records.isEmpty()) {
            return;
        }

        for (var record : records) {
            var fields = record.getValue();
            UUID eventId = UUID.fromString((String) fields.get("eventId"));
            String subject = (String) fields.get("participantSubject");

            eventRegistrationService.joinAfterAdmission(eventId, subject);

            redisTemplate.opsForStream().acknowledge(
                    seatStore.streamKey(), GROUP, record.getId());
        }
    }



}
