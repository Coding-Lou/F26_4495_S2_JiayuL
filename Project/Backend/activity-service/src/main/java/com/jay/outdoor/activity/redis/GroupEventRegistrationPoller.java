package com.jay.outdoor.activity.redis;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(
        prefix = "activity.registration.poller",
        name = "enabled",
        havingValue = "true")
class GroupEventRegistrationPoller {
    private static final Logger log = LoggerFactory.getLogger(GroupEventRegistrationPoller.class);

    private final GroupEventRegistrationConsumer consumer;

    GroupEventRegistrationPoller(GroupEventRegistrationConsumer consumer) {
        this.consumer = consumer;
    }

    @Scheduled(fixedDelayString = "${activity.registration.poller.delay-ms:1000}")
    void poll() {
        try {
            consumer.pollOnce();
        } catch (RuntimeException e) {
            // Exception messages can contain participant subjects or JDBC parameters.
            log.error("Group event registration poll failed: {}", e.getClass().getSimpleName());
        }
    }
}
