package com.jay.outdoor.activity.controller;

import com.jay.outdoor.activity.redis.GroupEventSeatStore;
import com.jay.outdoor.activity.support.AbstractIntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GroupEventRedisUnavailableControllerTests extends AbstractIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GroupEventSeatStore seatStore;

    @Test
    void redisConnectionFailureReturns503WithDistinctCode() throws Exception {
        UUID eventId = UUID.randomUUID();
        when(seatStore.admit(eventId, "user-a"))
                .thenThrow(new RedisConnectionFailureException("Redis down"));

        mockMvc.perform(post("/api/group-events/{eventId}/registrations", eventId)
                        .with(jwt().jwt(token -> token.subject("user-a"))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("REDIS_ADMISSION_UNAVAILABLE"));
    }
}
