package com.jay.outdoor.activity.service;

import com.jay.outdoor.activity.dto.MyRegistrationStatusResponse;
import com.jay.outdoor.activity.entity.EventRegistration;
import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.entity.GroupEventStatus;
import com.jay.outdoor.activity.entity.RegistrationStatus;
import com.jay.outdoor.activity.redis.AdmissionResult;
import com.jay.outdoor.activity.redis.GroupEventSeatStore;
import com.jay.outdoor.activity.repository.EventRegistrationRepository;
import com.jay.outdoor.activity.repository.GroupEventRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
public class EventRegistrationService {
    private static final Logger log = LoggerFactory.getLogger(EventRegistrationService.class);

    private final EventRegistrationRepository eventRegistrationRepository;
    private final Clock clock;
    private final GroupEventRepository groupEventRepository;
    private final TransactionTemplate transactionTemplate;
    private final GroupEventSeatStore groupEventSeatStore;
    private final Counter redisReleaseFailed;

    public EventRegistrationService(EventRegistrationRepository eventRegistrationRepository,
                                    Clock clock,
                                    GroupEventRepository groupEventRepository,
                                    PlatformTransactionManager transactionManager,
                                    GroupEventSeatStore groupEventSeatStore,
                                    MeterRegistry meterRegistry) {
        this.eventRegistrationRepository = eventRegistrationRepository;
        this.clock = clock;
        this.groupEventRepository = groupEventRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.groupEventSeatStore = groupEventSeatStore;
        this.redisReleaseFailed = meterRegistry.counter("groupevent.redis.release.failed");
    }

    public MyRegistrationStatusResponse join(UUID eventId, String participantSubject) {
        if (eventId == null) {
            throw new EventRegistrationValidationException("eventId", "Event id is null");
        }

        if (participantSubject == null || participantSubject.isBlank()) {
            throw new EventRegistrationValidationException("participantSubject", "Participant subject is required");
        }

        AdmissionResult admissionResult;
        try {
            admissionResult = groupEventSeatStore.admit(eventId, participantSubject);
        } catch (RedisConnectionFailureException | QueryTimeoutException e) {
            throw new RedisAdmissionUnavailableException(eventId, e);
        }

        return switch (admissionResult) {
            case NOT_READY -> {
                if (!groupEventRepository.existsById(eventId)) {
                    throw new EventNotFoundException();
                }
                throw new SeatCounterNotReadyException(eventId);
            }
            case FULL -> throw new EventRegistrationException(EventJoinReason.FULL, "Event is full");
            case DUPLICATE -> {
                Optional<EventRegistration> check = eventRegistrationRepository
                        .findByEventIdAndParticipantSubjectAndStatusIn(
                                eventId, participantSubject, RegistrationStatus.ACTIVE_STATUSES);
                if (check.isPresent()) {
                    yield MyRegistrationStatusResponse.fromRegistration(check.get());
                }
                yield MyRegistrationStatusResponse.queued();
            }
            case ADMITTED -> MyRegistrationStatusResponse.queued();
        };
    }

    private void releaseRedisSeat(UUID eventId, String participantSubject) {
        try {
            if (!groupEventSeatStore.release(eventId, participantSubject)) {
                redisReleaseFailed.increment();
                log.error("Redis seat release removed no user for event {} and subject fingerprint {}",
                        eventId, subjectFingerprint(participantSubject));
            }
        } catch (RuntimeException e) {
            redisReleaseFailed.increment();
            log.error("Redis seat release failed for event {} and subject fingerprint {} (cause: {})",
                    eventId, subjectFingerprint(participantSubject), e.getClass().getSimpleName());
        }
    }

    private static String subjectFingerprint(String subject) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(subject.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest, 0, 6);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    public JoinEventResult joinAfterAdmission(UUID eventId, String subject) {
        return joinInPostgres(eventId, subject);
    }


    private JoinEventResult joinInPostgres(UUID eventId, String participantSubject) {
        Optional<EventRegistration> check = eventRegistrationRepository.findByEventIdAndParticipantSubjectAndStatusIn( eventId, participantSubject, RegistrationStatus.ACTIVE_STATUSES );
        if (check.isPresent()) {
            return new JoinEventResult(check.get(), false);
        }

        Instant now = clock.instant();
        JoinEventResult result;
        try {
            result = transactionTemplate.execute( status -> {
                EventRegistration eventRegistration = new EventRegistration(participantSubject, eventId, now);
                eventRegistration = eventRegistrationRepository.saveAndFlush(eventRegistration);

                int updatedRows = groupEventRepository.tryReserveSeat(eventId, now);

                if (updatedRows == 1) {
                    eventRegistration.confirm(now);
                    return new JoinEventResult(eventRegistration, true);
                }
                status.setRollbackOnly();
                return null;

            });
        } catch (DataIntegrityViolationException e) {
            check = transactionTemplate.execute(status ->
                    eventRegistrationRepository.findByEventIdAndParticipantSubjectAndStatusIn(
                            eventId, participantSubject, RegistrationStatus.ACTIVE_STATUSES
                    )
            );

            if (check != null && check.isPresent()) {
                return new JoinEventResult(check.get(), false);
            }
            groupEventRepository.findById(eventId).orElseThrow(EventNotFoundException::new);
            throw e;
        }

        if (result == null) {
            GroupEvent groupEvent = groupEventRepository.findById(eventId).orElseThrow(EventNotFoundException::new);
            if (groupEvent.getStatus() == GroupEventStatus.CANCELLED) {
                throw new EventRegistrationException(EventJoinReason.CANCELLED, "Event was cancelled");
            }
            if (groupEvent.getStatus() == GroupEventStatus.COMPLETED) {
                throw new EventRegistrationException(EventJoinReason.CLOSED, "Event has completed");
            }
            if (now.isBefore( groupEvent.getRegistrationOpensAt() )) {
                throw new EventRegistrationException(EventJoinReason.NOT_OPEN, "Event not open for registration");
            }
            if (!now.isBefore( groupEvent.getRegistrationClosesAt() )) {
                throw new EventRegistrationException(EventJoinReason.CLOSED, "Event has been closed for registration");
            }
            if (groupEvent.getSeatsTaken() < groupEvent.getCapacity()) {
                throw new EventRegistrationException(EventJoinReason.FULL, "Could not reserve a seat; please try again");
            }
            throw new EventRegistrationException(EventJoinReason.FULL, "Event is full");
        }

        return result;
    }

    public boolean cancel(UUID eventId, String participantSubject) {
        if (eventId == null) {
            throw new EventRegistrationValidationException("eventId", "Event id is null");
        }
        if (participantSubject == null || participantSubject.isBlank()) {
            throw new EventRegistrationValidationException("participantSubject", "Participant subject is required");
        }

        Boolean result = transactionTemplate.execute(status -> {
            groupEventRepository.findById(eventId).orElseThrow(EventNotFoundException::new);
            Instant now = clock.instant();
            int cancelled = eventRegistrationRepository.tryCancelRegistration(eventId, participantSubject, now);
            if (cancelled == 0) {
                return false;
            }
            if (cancelled != 1 || groupEventRepository.tryReleaseSeat(eventId, now) != 1) {
                throw new IllegalStateException("Cancelled registration could not release its seat");
            }
            return true;
        });

        if (Boolean.TRUE.equals(result)) {
            releaseRedisSeat(eventId, participantSubject);
        }

        return Boolean.TRUE.equals(result);
    }

    public MyRegistrationStatusResponse getMyRegistrationStatus(UUID eventId, String participantSubject) {
        if (eventId == null) {
            throw new EventRegistrationValidationException("eventId", "Event id is null");
        }
        if (participantSubject == null || participantSubject.isBlank()) {
            throw new EventRegistrationValidationException("participantSubject", "Participant subject is required");
        }
        if (!groupEventRepository.existsById(eventId)) {
            throw new EventNotFoundException();
        }

        Optional<EventRegistration> registration = eventRegistrationRepository
                .findByEventIdAndParticipantSubjectAndStatusIn(
                        eventId, participantSubject, RegistrationStatus.ACTIVE_STATUSES);
        if (registration.isPresent()) {
            return MyRegistrationStatusResponse.fromRegistration(registration.get());
        }

        try {
            if (groupEventSeatStore.isAdmitted(eventId, participantSubject)) {
                return MyRegistrationStatusResponse.queued();
            }
        } catch (RedisConnectionFailureException | QueryTimeoutException e) {
            throw new RedisAdmissionUnavailableException(eventId, e);
        }

        return MyRegistrationStatusResponse.notRegistered();
    }


}
