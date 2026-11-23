package com.jay.outdoor.activity.service;

import com.jay.outdoor.activity.entity.EventRegistration;
import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.entity.GroupEventStatus;
import com.jay.outdoor.activity.entity.RegistrationStatus;
import com.jay.outdoor.activity.repository.EventRegistrationRepository;
import com.jay.outdoor.activity.repository.GroupEventRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class EventRegistrationService {

    private final EventRegistrationRepository eventRegistrationRepository;
    private final Clock clock;
    private final GroupEventRepository groupEventRepository;
    private final TransactionTemplate transactionTemplate;

    public EventRegistrationService(EventRegistrationRepository eventRegistrationRepository,
                                    Clock clock,
                                    GroupEventRepository groupEventRepository,
                                    PlatformTransactionManager transactionManager) {
        this.eventRegistrationRepository = eventRegistrationRepository;
        this.clock = clock;
        this.groupEventRepository = groupEventRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public JoinEventResult join(UUID eventId, String participantSubject) {

        if (eventId == null) {
            throw new EventRegistrationValidationException("eventId", "Event id is null");
        }

        if (participantSubject == null) {
            throw new EventRegistrationValidationException("participantSubject", "Participant subject is null");
        }

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
            if (!groupEvent.getStatus().equals(GroupEventStatus.OPEN)) {
                throw new EventRegistrationException(EventJoinReason.CANCELLED, "Event not open");
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


}
