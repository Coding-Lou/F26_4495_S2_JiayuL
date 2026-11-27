package com.jay.outdoor.activity.redis;

import com.jay.outdoor.activity.service.EventRegistrationService;
import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class GroupEventRegistrationConsumer {

    private static final Logger log = LoggerFactory.getLogger(GroupEventRegistrationConsumer.class);
    static final String GROUP = "group-event-registration";
    private final String consumerName = "activity-" + UUID.randomUUID();

    @Value("${activity.registration.poller.enabled}")
    private boolean pollerEnabled;

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

    @PostConstruct
    void initialize() {
        log.info("Group event registration poller enabled: {}", pollerEnabled);
        ensureGroup();
    }

    void ensureGroup() {
        String key = seatStore.streamKey();
        try {
            redisTemplate.opsForStream().createGroup(key, ReadOffset.from("0"), GROUP);
        } catch (RedisSystemException e) {
            if (!hasRedisErrorCode(e, "BUSYGROUP")) {
                throw e;
            }
        }
    }

    void pollOnce() {
        List<MapRecord<String, String, String>> records;
        try {
            records = readNewMessages();
        } catch (RedisSystemException e) {
            if (!hasRedisErrorCode(e, "NOGROUP")) {
                throw e;
            }
            ensureGroup();
            records = readNewMessages();
        }

        if (records == null || records.isEmpty()) {
            return;
        }

        for (var record : records) {
            var fields = record.getValue();
            UUID eventId = UUID.fromString(fields.get("eventId"));
            String subject = fields.get("participantSubject");

            eventRegistrationService.joinAfterAdmission(eventId, subject);

            redisTemplate.opsForStream().acknowledge(
                    seatStore.streamKey(), GROUP, record.getId());
        }
    }

    private List<MapRecord<String, String, String>> readNewMessages() {
        return redisTemplate.<String, String>opsForStream().read(
                Consumer.from(GROUP, consumerName),
                StreamReadOptions.empty().count(10),
                StreamOffset.create(
                        seatStore.streamKey(),
                        ReadOffset.lastConsumed()));
    }

    private static boolean hasRedisErrorCode(RedisSystemException exception, String code) {
        String reason = exception.getMostSpecificCause().getMessage();
        return reason != null && reason.startsWith(code + " ");
    }
}
