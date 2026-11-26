package com.jay.outdoor.activity.service;

import com.jay.outdoor.activity.entity.EventRegistration;
import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.entity.RegistrationStatus;
import com.jay.outdoor.activity.redis.AdmissionResult;
import com.jay.outdoor.activity.redis.GroupEventSeatStore;
import com.jay.outdoor.activity.repository.EventRegistrationRepository;
import com.jay.outdoor.activity.repository.GroupEventRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class EventRegistrationGateTests {
    private final UUID eventId = UUID.randomUUID();
    private final String subject = "user-a";
    private EventRegistrationRepository registrations;
    private GroupEventRepository events;
    private GroupEventSeatStore seats;
    private PlatformTransactionManager transactionManager;
    private EventRegistrationService service;

    @BeforeEach
    void setUp() {
        registrations = mock(EventRegistrationRepository.class);
        events = mock(GroupEventRepository.class);
        seats = mock(GroupEventSeatStore.class);
        transactionManager = mock(PlatformTransactionManager.class);
        service = new EventRegistrationService(registrations, Clock.systemUTC(), events,
                transactionManager, seats);
    }

    @Test
    void admittedAndCreatedKeepsTheRedisSeat() {
        when(seats.admit(eventId, subject)).thenReturn(AdmissionResult.ADMITTED);
        transactionCanCommit();
        when(registrations.findByEventIdAndParticipantSubjectAndStatusIn(
                eventId, subject, RegistrationStatus.ACTIVE_STATUSES)).thenReturn(Optional.empty());
        when(registrations.saveAndFlush(any(EventRegistration.class))).thenAnswer(call -> call.getArgument(0));
        when(events.tryReserveSeat(eq(eventId), any(Instant.class))).thenReturn(1);

        JoinEventResult result = service.join(eventId, subject);

        assertTrue(result.created());
        assertEquals(subject, result.registration().getParticipantSubject());
        verify(seats, never()).release(eventId, subject);
    }

    @Test
    void fullDoesNotAccessPostgres() {
        when(seats.admit(eventId, subject)).thenReturn(AdmissionResult.FULL);

        EventRegistrationException failure = assertThrows(EventRegistrationException.class,
                () -> service.join(eventId, subject));

        assertEquals(EventJoinReason.FULL, failure.getReason());
        verifyNoInteractions(events, registrations);
    }

    @Test
    void missingCounterForUnknownEventIsNotFound() {
        when(seats.admit(eventId, subject)).thenReturn(AdmissionResult.NOT_READY);

        assertThrows(EventNotFoundException.class, () -> service.join(eventId, subject));
        verify(events).existsById(eventId);
        verifyNoInteractions(registrations);
    }

    @Test
    void missingCounterForExistingEventIsUnavailable() {
        when(seats.admit(eventId, subject)).thenReturn(AdmissionResult.NOT_READY);
        when(events.existsById(eventId)).thenReturn(true);

        assertThrows(SeatCounterNotReadyException.class, () -> service.join(eventId, subject));
        verifyNoInteractions(registrations);
    }

    @Test
    void duplicateWithRegistrationReturnsExistingWithoutReleasingSeat() {
        EventRegistration existing = mock(EventRegistration.class);
        when(seats.admit(eventId, subject)).thenReturn(AdmissionResult.DUPLICATE);
        when(registrations.findByEventIdAndParticipantSubjectAndStatusIn(
                eventId, subject, RegistrationStatus.ACTIVE_STATUSES)).thenReturn(Optional.of(existing));

        JoinEventResult result = service.join(eventId, subject);

        assertSame(existing, result.registration());
        assertFalse(result.created());
        verify(seats, never()).release(eventId, subject);
        verifyNoInteractions(events);
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
    void failedReleaseDoesNotReplaceExistingRegistrationResult() {
        EventRegistration existing = mock(EventRegistration.class);
        when(seats.admit(eventId, subject)).thenReturn(AdmissionResult.ADMITTED);
        when(registrations.findByEventIdAndParticipantSubjectAndStatusIn(
                eventId, subject, RegistrationStatus.ACTIVE_STATUSES)).thenReturn(Optional.of(existing));
        when(seats.release(eventId, subject)).thenThrow(new RedisConnectionFailureException("Redis down"));

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

    @Test
    void cancellationReleasesRedisOnlyAfterPostgresCommit() {
        transactionCanCommit();
        when(events.findById(eventId)).thenReturn(Optional.of(mock(GroupEvent.class)));
        when(registrations.tryCancelRegistration(eq(eventId), eq(subject), any(Instant.class))).thenReturn(1);
        when(events.tryReleaseSeat(eq(eventId), any(Instant.class))).thenReturn(1);
        when(seats.release(eventId, subject)).thenReturn(true);

        assertTrue(service.cancel(eventId, subject));
        var order = inOrder(transactionManager, seats);
        order.verify(transactionManager).commit(any(TransactionStatus.class));
        order.verify(seats).release(eventId, subject);
    }

    @Test
    void cancellingNothingDoesNotReleaseRedis() {
        transactionCanCommit();
        when(events.findById(eventId)).thenReturn(Optional.of(mock(GroupEvent.class)));

        assertFalse(service.cancel(eventId, subject));
        verify(seats, never()).release(eventId, subject);
    }

    @Test
    void redisFailureAfterCancelDoesNotChangeCommittedResult() {
        transactionCanCommit();
        when(events.findById(eventId)).thenReturn(Optional.of(mock(GroupEvent.class)));
        when(registrations.tryCancelRegistration(eq(eventId), eq(subject), any(Instant.class))).thenReturn(1);
        when(events.tryReleaseSeat(eq(eventId), any(Instant.class))).thenReturn(1);
        when(seats.release(eventId, subject)).thenThrow(new RedisConnectionFailureException("Redis down"));

        assertTrue(service.cancel(eventId, subject));
        verify(transactionManager).commit(any(TransactionStatus.class));
    }

    private void transactionCanCommit() {
        when(transactionManager.getTransaction(any(TransactionDefinition.class)))
                .thenReturn(mock(TransactionStatus.class));
    }
}
