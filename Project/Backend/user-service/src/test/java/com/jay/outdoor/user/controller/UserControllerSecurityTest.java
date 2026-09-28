package com.jay.outdoor.user.controller;

import com.jay.outdoor.user.config.SecurityConfig;
import com.jay.outdoor.user.dto.UserResponse;
import com.jay.outdoor.user.security.RestAccessDeniedHandler;
import com.jay.outdoor.user.security.RestAuthenticationEntryPoint;
import com.jay.outdoor.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@Import({
        SecurityConfig.class,
        RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class
})
class UserControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private UserService userService;

    @Test
    void shouldReturn401WhenTokenIsMissing() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturnCurrentUserWhenJwtIsValid() throws Exception {
        UUID userId = UUID.fromString("5f5df17c-3653-4c00-9256-721e5e8bb499");
        OffsetDateTime createdAt = OffsetDateTime.parse("2026-09-28T10:00:01Z");

        when(userService.getOrCreateUser(any(Jwt.class)))
                .thenReturn(new UserResponse(
                        userId,
                        "jay@example.com",
                        "Jay",
                        createdAt
                ));

        mockMvc.perform(
                        get("/api/users/me")
                                .with(jwt().jwt(token -> token
                                        .subject("keycloak-user-123")
                                        .claim("preferred_username", "jay")
                                        .claim("email", "jay@example.com")
                                ))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.email").value("jay@example.com"))
                .andExpect(jsonPath("$.displayName").value("Jay"))
                .andExpect(jsonPath("$.createdAt").value(createdAt.toString()));
    }
}
