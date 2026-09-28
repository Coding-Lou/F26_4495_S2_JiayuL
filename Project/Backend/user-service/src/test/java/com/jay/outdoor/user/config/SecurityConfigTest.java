package com.jay.outdoor.user.config;

import com.jay.outdoor.user.security.RestAccessDeniedHandler;
import com.jay.outdoor.user.security.RestAuthenticationEntryPoint;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SecurityConfigTest.TestAdminController.class)
@Import({
        SecurityConfig.class,
        RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class
})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void shouldReturn403WhenAuthenticatedUserDoesNotHaveAdminRole()
            throws Exception {

        mockMvc.perform(get("/api/admin/test")
                        .with(jwt().jwt(token ->
                                token.subject("keycloak-user-123")
                        )))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(
                        "application/problem+json"
                ))
                .andExpect(jsonPath("$.title")
                        .value("Forbidden"))
                .andExpect(jsonPath("$.status")
                        .value(403))
                .andExpect(jsonPath("$.detail")
                        .value("You do not have permission to access this resource"))
                .andExpect(jsonPath("$.code")
                        .value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.instance")
                        .value("/api/admin/test"));
    }

    @RestController
    static class TestAdminController {

        @GetMapping("/api/admin/test")
        String adminTest() {
            return "admin";
        }
    }
}