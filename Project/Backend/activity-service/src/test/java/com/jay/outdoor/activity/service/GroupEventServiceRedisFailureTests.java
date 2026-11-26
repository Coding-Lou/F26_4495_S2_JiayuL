package com.jay.outdoor.activity.service;

import com.jay.outdoor.activity.client.TrailCatalogClient;
import com.jay.outdoor.activity.dto.CreateGroupEventRequest;
import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.redis.GroupEventSeatStore;
import com.jay.outdoor.activity.repository.GroupEventRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;

import static com.jay.outdoor.activity.support.GroupEventTestRequests.command;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GroupEventServiceRedisFailureTests {
    @Test
    void redisLoadFailureDoesNotHideTheSavedEvent() {
        GroupEventRepository repository = mock(GroupEventRepository.class);
        TrailCatalogClient trails = mock(TrailCatalogClient.class);
        GroupEventSeatStore seats = mock(GroupEventSeatStore.class);
        CreateGroupEventRequest request = command(Instant.now().plus(2, ChronoUnit.DAYS));
        when(trails.trailExists(request.trailId())).thenReturn(true);
        when(repository.save(any(GroupEvent.class))).thenAnswer(call -> call.getArgument(0));
        doThrow(new RedisConnectionFailureException("Redis down"))
                .when(seats).setRemainingSeats(any(), eq((long) request.capacity()));

        GroupEvent saved = new GroupEventService(repository, Clock.systemUTC(), trails, seats)
                .create("organizer-a", request);

        assertNotNull(saved.getId());
        verify(repository).save(saved);
        verify(seats).setRemainingSeats(eq(saved.getId()), eq((long) request.capacity()));
    }
}
