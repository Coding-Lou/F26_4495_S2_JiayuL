package com.jay.outdoor.activity.controller;

import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.exception.TrailServiceUnavailableException;
import com.jay.outdoor.activity.repository.EventRegistrationRepository;
import com.jay.outdoor.activity.repository.GroupEventRepository;
import com.jay.outdoor.activity.redis.GroupEventRegistrationConsumer;
import com.jay.outdoor.activity.redis.GroupEventSeatStore;
import com.jay.outdoor.activity.redis.RegistrationStreamTestSupport;
import com.jay.outdoor.activity.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GroupEventControllerTests extends AbstractIntegrationTest {

    private static final UUID TRAIL_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GroupEventRepository repository;

    @Autowired
    private EventRegistrationRepository eventRegistrationRepository;

    @Autowired
    private StringRedisTemplate redis;

    @Autowired
    private GroupEventSeatStore seatStore;

    @Autowired
    private GroupEventRegistrationConsumer consumer;


    @BeforeEach
    void clearEvents() {
        eventRegistrationRepository.deleteAll();
        repository.deleteAll();
        RegistrationStreamTestSupport.clearAndEnsureGroup(redis, seatStore, consumer);
    }

    @Test
    void statusForUnknownEventReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/group-events/{eventId}/registrations/me", UUID.randomUUID())
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EVENT_NOT_FOUND"));
    }

    @Test
    void statusWithoutAuthenticationReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/group-events/{eventId}/registrations/me", UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createsAnEventForTheAuthenticatedUser() throws Exception {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);

        mockMvc.perform(post("/api/group-events")
                        .with(jwt().jwt(token -> token.subject("user-a")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(start.minus(72, ChronoUnit.HOURS), start.minus(48, ChronoUnit.HOURS),  start, start.plus(4, ChronoUnit.HOURS), 12)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.capacity").value(12));

        GroupEvent stored = repository.findAll().getFirst();
        assertEquals("user-a", stored.getOrganizerSubject());
        assertEquals(TRAIL_ID, stored.getTrailId());
        assertEquals(1, repository.count());
    }

    @Test
    void firstJoinReturnsAcceptedThenConsumerConfirmsRegistration() throws Exception {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);

        mockMvc.perform(post("/api/group-events")
                        .with(jwt().jwt(token -> token.subject("organizer-a")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(start.minus(72, ChronoUnit.HOURS),
                                start.minus(24, ChronoUnit.HOURS), start,
                                start.plus(4, ChronoUnit.HOURS), 12)))
                .andExpect(status().isCreated());

        GroupEvent event = repository.findAll().getFirst();
        mockMvc.perform(post("/api/group-events/{eventId}/registrations", event.getId())
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.registration").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.participantSubject").doesNotExist());
        assertEquals(0, eventRegistrationRepository.count());
        RegistrationStreamTestSupport.pollOnce(consumer);
        assertEquals(1, eventRegistrationRepository.count());
    }

    @Test
    void sameUserRegisterForTheSameEventTwice() throws Exception {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);

        mockMvc.perform(post("/api/group-events")
                        .with(jwt().jwt(token -> token.subject("organizer-a")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(start.minus(72, ChronoUnit.HOURS),
                                start.minus(24, ChronoUnit.HOURS), start,
                                start.plus(4, ChronoUnit.HOURS), 12)))
                .andExpect(status().isCreated());

        GroupEvent event = repository.findAll().getFirst();
        mockMvc.perform(post("/api/group-events/{eventId}/registrations", event.getId())
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("QUEUED"));

        mockMvc.perform(post("/api/group-events/{eventId}/registrations", event.getId())
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("QUEUED"));
        RegistrationStreamTestSupport.pollOnce(consumer);
        UUID firstId = eventRegistrationRepository.findAll().getFirst().getId();

        mockMvc.perform(post("/api/group-events/{eventId}/registrations", event.getId())
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.registration.id").value(firstId.toString()));
    }

    @Test
    void joiningAFullEventReturnsConflict() throws Exception {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);

        mockMvc.perform(post("/api/group-events")
                        .with(jwt().jwt(token -> token.subject("organizer-a")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(start.minus(72, ChronoUnit.HOURS),
                                start.minus(24, ChronoUnit.HOURS), start,
                                start.plus(4, ChronoUnit.HOURS), 1)))
                .andExpect(status().isCreated());

        GroupEvent event = repository.findAll().getFirst();
        mockMvc.perform(post("/api/group-events/{eventId}/registrations", event.getId())
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isAccepted());

        mockMvc.perform(post("/api/group-events/{eventId}/registrations", event.getId())
                        .with(jwt().jwt(token -> token.subject("user-b"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FULL"));
    }

    @Test
    void userRegisterForTheNonExistEvent() throws Exception {

        UUID eventId = UUID.randomUUID();
        mockMvc.perform(post("/api/group-events/{eventId}/registrations", eventId)
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EVENT_NOT_FOUND"));
    }

    @Test
    void missingCounterForExistingEventReturnsUnavailable() throws Exception {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        mockMvc.perform(post("/api/group-events")
                        .with(jwt().jwt(token -> token.subject("organizer-a")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(start.minus(72, ChronoUnit.HOURS),
                                start.minus(24, ChronoUnit.HOURS), start,
                                start.plus(4, ChronoUnit.HOURS), 12)))
                .andExpect(status().isCreated());
        UUID eventId = repository.findAll().getFirst().getId();
        redis.delete("groupevent:" + eventId + ":seats");

        mockMvc.perform(post("/api/group-events/{eventId}/registrations", eventId)
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("SEAT_COUNTER_NOT_READY"));
        assertEquals(0, eventRegistrationRepository.count());
    }

    @Test
    void duplicateWithoutVisibleRegistrationReturnsQueuedWithoutCreatingRegistration() throws Exception {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        mockMvc.perform(post("/api/group-events")
                        .with(jwt().jwt(token -> token.subject("organizer-a")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(start.minus(72, ChronoUnit.HOURS),
                                start.minus(24, ChronoUnit.HOURS), start,
                                start.plus(4, ChronoUnit.HOURS), 12)))
                .andExpect(status().isCreated());
        UUID eventId = repository.findAll().getFirst().getId();
        redis.opsForValue().decrement("groupevent:" + eventId + ":seats");
        redis.opsForSet().add("groupevent:" + eventId + ":admitted", "user-a");

        mockMvc.perform(post("/api/group-events/{eventId}/registrations", eventId)
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("QUEUED"));
        assertEquals(0, eventRegistrationRepository.count());
    }

    @Test
    void cancellingRegistrationReturnsNoContentAndCanBeRepeated() throws Exception {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        mockMvc.perform(post("/api/group-events")
                        .with(jwt().jwt(token -> token.subject("organizer-a")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(start.minus(72, ChronoUnit.HOURS),
                                start.minus(24, ChronoUnit.HOURS), start,
                                start.plus(4, ChronoUnit.HOURS), 12)))
                .andExpect(status().isCreated());
        UUID eventId = repository.findAll().getFirst().getId();
        mockMvc.perform(post("/api/group-events/{eventId}/registrations", eventId)
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isAccepted());
        RegistrationStreamTestSupport.pollOnce(consumer);

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(delete("/api/group-events/{eventId}/registrations", eventId)
                            .with(jwt().jwt(token -> token.subject("user-a"))))
                    .andExpect(status().isNoContent())
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().string(""));
        }
        mockMvc.perform(delete("/api/group-events/{eventId}/registrations", eventId)
                        .with(jwt().jwt(token -> token.subject("user-b"))))
                .andExpect(status().isNoContent());
    }

    @Test
    void cancellingUnknownEventReturnsNotFound() throws Exception {
        mockMvc.perform(delete("/api/group-events/{eventId}/registrations", UUID.randomUUID())
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EVENT_NOT_FOUND"));
    }

    @Test
    void cancellingWithoutAuthenticationReturnsUnauthorized() throws Exception {
        mockMvc.perform(delete("/api/group-events/{eventId}/registrations", UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsAnUnauthenticatedCreate() throws Exception {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);

        mockMvc.perform(post("/api/group-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(start.minus(72, ChronoUnit.HOURS), start.minus(48, ChronoUnit.HOURS), start, start.plus(4, ChronoUnit.HOURS), 12)))
                .andExpect(status().isUnauthorized());

        assertEquals(0, repository.count());
    }

    @Test
    void rejectsAnEventThatAlreadyStarted() throws Exception {
        Instant start = Instant.now().minus(1, ChronoUnit.HOURS);

        mockMvc.perform(post("/api/group-events")
                        .with(jwt().jwt(token -> token.subject("user-a")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(start.minus(72, ChronoUnit.HOURS), start.minus(48, ChronoUnit.HOURS), start, start.plus(4, ChronoUnit.HOURS), 12)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("startsAt"));

        assertEquals(0, repository.count());
    }

    @Test
    void returnsNotFoundForAnUnknownTrail() throws Exception {
        when(trailCatalogClient.trailExists(TRAIL_ID)).thenReturn(false);
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);

        mockMvc.perform(post("/api/group-events")
                        .with(jwt().jwt(token -> token.subject("user-a")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(start.minus(72, ChronoUnit.HOURS), start.minus(48, ChronoUnit.HOURS), start, start.plus(4, ChronoUnit.HOURS), 12)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRAIL_NOT_FOUND"));

        assertEquals(0, repository.count());
    }

    @Test
    void returnsUnavailableWhenTrailServiceFails() throws Exception {
        when(trailCatalogClient.trailExists(TRAIL_ID))
                .thenThrow(new TrailServiceUnavailableException());
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);

        mockMvc.perform(post("/api/group-events")
                        .with(jwt().jwt(token -> token.subject("user-a")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(start.minus(72, ChronoUnit.HOURS), start.minus(48, ChronoUnit.HOURS), start, start.plus(4, ChronoUnit.HOURS), 12)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("TRAIL_SERVICE_UNAVAILABLE"));

        assertEquals(0, repository.count());
    }

    private static String request(Instant opensAt, Instant closesAt, Instant start, Instant end, int capacity) {
        return """
                {
                  "trailId": "%s",
                  "title": "Weekend hike",
                  "description": "Meet at the trailhead",
                  "capacity": %d,
                  "registrationOpensAt": "%s",
                  "registrationClosesAt": "%s",
                  "startsAt": "%s",
                  "endsAt": "%s",
                  "organizerSubject": "attacker-supplied-value"
                }
                """.formatted(TRAIL_ID, capacity, opensAt, closesAt, start, end);
    }
}
