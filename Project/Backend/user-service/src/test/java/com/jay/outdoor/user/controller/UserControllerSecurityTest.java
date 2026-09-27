package com.jay.outdoor.user.controller;

import com.jay.outdoor.user.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@Import(SecurityConfig.class)
class UserControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void shouldReturn401WhenTokenIsMissing() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturnCurrentUserWhenJwtIsValid() throws Exception {
        mockMvc.perform(
                        get("/api/users/me")
                                .with(jwt().jwt(token -> token
                                        .subject("keycloak-user-123")
                                        .claim("preferred_username", "jay")
                                        .claim("email", "jay@example.com")
                                ))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subject").value("keycloak-user-123"))
                .andExpect(jsonPath("$.username").value("jay"))
                .andExpect(jsonPath("$.email").value("jay@example.com"));
    }
}