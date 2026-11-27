package com.jay.outdoor.activity.controller;

import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.repository.EventRegistrationRepository;
import com.jay.outdoor.activity.repository.GroupEventRepository;
import com.jay.outdoor.activity.redis.AdmissionResult;
import com.jay.outdoor.activity.redis.GroupEventRegistrationConsumer;
import com.jay.outdoor.activity.redis.GroupEventSeatStore;
import com.jay.outdoor.activity.redis.RegistrationStreamTestSupport;
import com.jay.outdoor.activity.service.GroupEventService;
import com.jay.outdoor.activity.support.AbstractIntegrationTest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static com.jay.outdoor.activity.support.GroupEventTestRequests.command;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GroupEventRegistrationStatusControllerTests extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GroupEventService eventService;

    @Autowired
    private GroupEventSeatStore seatStore;

    @Autowired
    private GroupEventRegistrationConsumer consumer;

    @Autowired
    private StringRedisTemplate redis;

    @Autowired
    private EventRegistrationRepository registrations;

    @Autowired
    private GroupEventRepository events;

    @BeforeEach
    void clearState() {
        registrations.deleteAll();
        events.deleteAll();
        RegistrationStreamTestSupport.clearAndEnsureGroup(redis, seatStore, consumer);
    }

    @Test
    void statusShowsOnlyTheCurrentUsersQueuedAdmissionThenConfirmedRegistration() throws Exception {
        GroupEvent event = eventService.create("organizer-a",
                command(Instant.now().plus(2, ChronoUnit.DAYS), 12, 24));
        UUID eventId = event.getId();
        assertEquals(AdmissionResult.ADMITTED, seatStore.admit(eventId, "user-a"));

        mockMvc.perform(get("/api/group-events/{eventId}/registrations/me", eventId)
                        .with(jwt().jwt(token -> token.subject("user-b"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NOT_REGISTERED"))
                .andExpect(jsonPath("$.registration").value(nullValue()));
        mockMvc.perform(get("/api/group-events/{eventId}/registrations/me", eventId)
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.registration").value(nullValue()));

        RegistrationStreamTestSupport.pollOnce(consumer);

        mockMvc.perform(get("/api/group-events/{eventId}/registrations/me", eventId)
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.registration.id").isNotEmpty())
                .andExpect(jsonPath("$.registration.eventId").value(eventId.toString()))
                .andExpect(jsonPath("$.registration.status").value("CONFIRMED"));
        assertEquals(1, registrations.count());
    }
}
