package com.jay.outdoor.activity.service;

import com.jay.outdoor.activity.entity.EventRegistration;
import com.jay.outdoor.activity.entity.RegistrationStatus;
import com.jay.outdoor.activity.redis.AdmissionResult;
import com.jay.outdoor.activity.redis.GroupEventSeatStore;
import com.jay.outdoor.activity.repository.EventRegistrationRepository;
import com.jay.outdoor.activity.repository.GroupEventRepository;
import java.time.Clock;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.transaction.PlatformTransactionManager;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class EventRegistrationGateTests {
    private final UUID eventId = UUID.randomUUID();
    private final String subject = "user-a";
    private EventRegistrationRepository registrations;
    private GroupEventRepository events;
    private GroupEventSeatStore seats;
    private EventRegistrationService service;

    @BeforeEach
    void setUp() {
        registrations = mock(EventRegistrationRepository.class);
        events = mock(GroupEventRepository.class);
        seats = mock(GroupEventSeatStore.class);
        service = new EventRegistrationService(registrations, Clock.systemUTC(), events,
                mock(PlatformTransactionManager.class), seats);
    }

    @Test
    void admittedButAlreadyRegisteredReleasesSeatAndReturnsExistingRegistration() {
        EventRegistration existing = mock(EventRegistration.class);
        when(seats.admit(eventId, subject)).thenReturn(AdmissionResult.ADMITTED);
        when(registrations.findByEventIdAndParticipantSubjectAndStatusIn(
                eventId, subject, RegistrationStatus.ACTIVE_STATUSES)).thenReturn(Optional.of(existing));
        when(seats.release(eventId, subject)).thenReturn(true);

        JoinEventResult result = service.join(eventId, subject);

        assertSame(existing, result.registration());
        assertFalse(result.created());
        verify(seats).release(eventId, subject);
    }

    @Test
    void postgresFailureReleasesSeatAndPreservesOriginalException() {
        EventRegistrationException failure = new EventRegistrationException(EventJoinReason.CLOSED, "Closed");
        when(seats.admit(eventId, subject)).thenReturn(AdmissionResult.ADMITTED);
        when(registrations.findByEventIdAndParticipantSubjectAndStatusIn(
                eventId, subject, RegistrationStatus.ACTIVE_STATUSES)).thenThrow(failure);
        when(seats.release(eventId, subject)).thenReturn(true);

        assertSame(failure, assertThrows(EventRegistrationException.class,
                () -> service.join(eventId, subject)));
        verify(seats).release(eventId, subject);
    }

    @Test
    void failedUndoDoesNotReplacePostgresFailure() {
        EventRegistrationException failure = new EventRegistrationException(EventJoinReason.CLOSED, "Closed");
        when(seats.admit(eventId, subject)).thenReturn(AdmissionResult.ADMITTED);
        when(registrations.findByEventIdAndParticipantSubjectAndStatusIn(
                eventId, subject, RegistrationStatus.ACTIVE_STATUSES)).thenThrow(failure);
        when(seats.release(eventId, subject)).thenThrow(new RedisConnectionFailureException("Redis down"));

        assertSame(failure, assertThrows(EventRegistrationException.class,
                () -> service.join(eventId, subject)));
        verify(seats).release(eventId, subject);
    }

    @Test
    void duplicateWithoutActiveRegistrationIsPendingWithoutCreatingOne() {
        when(seats.admit(eventId, subject)).thenReturn(AdmissionResult.DUPLICATE);
        when(registrations.findByEventIdAndParticipantSubjectAndStatusIn(
                eventId, subject, RegistrationStatus.ACTIVE_STATUSES)).thenReturn(Optional.empty());

        assertThrows(RegistrationPendingException.class, () -> service.join(eventId, subject));
        verifyNoInteractions(events);
    }

    @Test
    void redisConnectionFailureBecomesUnavailableBeforePostgresIsCalled() {
        when(seats.admit(eventId, subject)).thenThrow(new RedisConnectionFailureException("Redis down"));

        assertThrows(RedisAdmissionUnavailableException.class, () -> service.join(eventId, subject));
        verifyNoInteractions(registrations, events);
    }

    @Test
    void redisTimeoutBecomesUnavailableBeforePostgresIsCalled() {
        when(seats.admit(eventId, subject)).thenThrow(new QueryTimeoutException("Redis timed out"));

        assertThrows(RedisAdmissionUnavailableException.class, () -> service.join(eventId, subject));
        verifyNoInteractions(registrations, events);
    }
}
