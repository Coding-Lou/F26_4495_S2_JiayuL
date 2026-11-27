package com.jay.outdoor.activity.controller;

import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.exception.TrailServiceUnavailableException;
import com.jay.outdoor.activity.repository.EventRegistrationRepository;
import com.jay.outdoor.activity.repository.GroupEventRepository;
import com.jay.outdoor.activity.support.AbstractIntegrationTest;
import com.jayway.jsonpath.JsonPath;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
    private MeterRegistry metrics;

    @BeforeEach
    void clearEvents() {
        eventRegistrationRepository.deleteAll();
        repository.deleteAll();
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
    void firstJoinReturnsCreatedAndConfirmedRegistration() throws Exception {
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
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.eventId").value(event.getId().toString()))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.participantSubject").doesNotExist());
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
        MvcResult first =  mockMvc.perform(post("/api/group-events/{eventId}/registrations", event.getId())
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.eventId").value(event.getId().toString()))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.participantSubject").doesNotExist()).andReturn();

        String firstId = JsonPath.read(first.getResponse().getContentAsString(), "$.id") ;

        mockMvc.perform(post("/api/group-events/{eventId}/registrations", event.getId())
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(firstId));
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
                .andExpect(status().isCreated());

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
    void ghostAdmissionReturnsPendingWithoutCreatingRegistration() throws Exception {
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
        double pendingBefore = metrics.get("groupevent.registration.pending").counter().count();

        mockMvc.perform(post("/api/group-events/{eventId}/registrations", eventId)
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("REGISTRATION_PENDING"));
        assertEquals(0, eventRegistrationRepository.count());
        assertEquals(pendingBefore + 1, metrics.get("groupevent.registration.pending").counter().count());
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
                .andExpect(status().isCreated());

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
