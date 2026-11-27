package com.jay.outdoor.activity.redis;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

@ExtendWith(OutputCaptureExtension.class)
class GroupEventRegistrationPollerTests {

    @Test
    void logsOnlyFailureClassWithoutLeakingTheParticipant(CapturedOutput output) {
        GroupEventRegistrationConsumer consumer = mock(GroupEventRegistrationConsumer.class);
        doThrow(new IllegalStateException("user-a"))
                .when(consumer).pollOnce();

        new GroupEventRegistrationPoller(consumer).poll();

        assertThat(output.getOut()).contains("IllegalStateException").doesNotContain("user-a");
    }
}
