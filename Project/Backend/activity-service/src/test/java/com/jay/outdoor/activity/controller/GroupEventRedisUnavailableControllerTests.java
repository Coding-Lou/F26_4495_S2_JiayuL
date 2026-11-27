package com.jay.outdoor.activity.controller;

import com.jay.outdoor.activity.redis.GroupEventSeatStore;
import com.jay.outdoor.activity.redis.GroupEventRegistrationConsumer;
import com.jay.outdoor.activity.redis.RegistrationStreamTestSupport;
import com.jay.outdoor.activity.service.GroupEventService;
import com.jay.outdoor.activity.support.AbstractIntegrationTest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.doThrow;
import static com.jay.outdoor.activity.support.GroupEventTestRequests.command;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GroupEventRedisUnavailableControllerTests extends AbstractIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoSpyBean
    private GroupEventSeatStore seatStore;

    @Autowired
    private GroupEventService eventService;

    @Autowired
    private GroupEventRegistrationConsumer consumer;

    @Autowired
    private StringRedisTemplate redis;

    @BeforeEach
    void clearStream() {
        RegistrationStreamTestSupport.clearAndEnsureGroup(redis, seatStore, consumer);
    }

    @Test
    void redisConnectionFailureReturns503WithDistinctCode() throws Exception {
        UUID eventId = UUID.randomUUID();
        doThrow(new RedisConnectionFailureException("Redis down"))
                .when(seatStore).admit(eventId, "user-a");

        mockMvc.perform(post("/api/group-events/{eventId}/registrations", eventId)
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("REDIS_ADMISSION_UNAVAILABLE"));
    }

    @Test
    void statusWithoutRegistrationReturns503WhenRedisIsUnavailable() throws Exception {
        UUID eventId = eventService.create("organizer-a",
                command(Instant.now().plus(2, ChronoUnit.DAYS), 12, 24)).getId();
        doThrow(new RedisConnectionFailureException("Redis down"))
                .when(seatStore).isAdmitted(eventId, "user-a");

        mockMvc.perform(get("/api/group-events/{eventId}/registrations/me", eventId)
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("REDIS_ADMISSION_UNAVAILABLE"));
    }

    @Test
    void statusWithConfirmedRegistrationReturns200WhenRedisIsUnavailable() throws Exception {
        UUID eventId = eventService.create("organizer-a",
                command(Instant.now().plus(2, ChronoUnit.DAYS), 12, 24)).getId();
        mockMvc.perform(post("/api/group-events/{eventId}/registrations", eventId)
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isAccepted());
        RegistrationStreamTestSupport.pollOnce(consumer);
        doThrow(new RedisConnectionFailureException("Redis down"))
                .when(seatStore).isAdmitted(eventId, "user-a");

        mockMvc.perform(get("/api/group-events/{eventId}/registrations/me", eventId)
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.registration.id").isNotEmpty());
    }
}
