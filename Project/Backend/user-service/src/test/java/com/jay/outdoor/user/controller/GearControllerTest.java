package com.jay.outdoor.user.controller;

import com.jay.outdoor.user.config.SecurityConfig;
import com.jay.outdoor.user.dto.GearItemResponse;
import com.jay.outdoor.user.exception.ErrorCode;
import com.jay.outdoor.user.exception.GlobalExceptionHandler;
import com.jay.outdoor.user.exception.ResourceNotFoundException;
import com.jay.outdoor.user.security.RestAccessDeniedHandler;
import com.jay.outdoor.user.security.RestAuthenticationEntryPoint;
import com.jay.outdoor.user.service.GearService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;


@WebMvcTest(GearController.class)
@Import({
        SecurityConfig.class,
        GlobalExceptionHandler.class,
        RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class
})
class GearControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GearService gearService;

    @Test
    void shouldReturn401WhenCreatingGearWithoutAuthentication() throws Exception {

        mockMvc.perform(post("/api/users/me/gear")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                          "name": "Hiking Boots",
                          "category": "FOOTWEAR",
                          "description": "Waterproof hiking boots"
                        }
                        """))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_PROBLEM_JSON
                ))
                .andExpect(jsonPath("$.title")
                        .value("Unauthorized"))
                .andExpect(jsonPath("$.status")
                        .value(401))
                .andExpect(jsonPath("$.detail")
                        .value("Authentication is required to access this resource"))
                .andExpect(jsonPath("$.code")
                        .value("AUTHENTICATION_REQUIRED"))
                .andExpect(jsonPath("$.instance")
                        .value("/api/users/me/gear"));
    }

    @Test
    void shouldCreateGearItemWhenAuthenticated() throws Exception {

        UUID gearId = UUID.randomUUID();

        GearItemResponse response = new GearItemResponse(
                gearId,
                "Hiking Boots",
                "FOOTWEAR",
                "Waterproof hiking boots",
                OffsetDateTime.now()
        );

        when(gearService.createGearItem(any(), any()))
                .thenReturn(response);

        mockMvc.perform(post("/api/users/me/gear")
                        .with(jwt().jwt(token ->
                                token.subject("keycloak-user-123")
                        ))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "name": "Hiking Boots",
                              "category": "FOOTWEAR",
                              "description": "Waterproof hiking boots"
                            }
                            """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(gearId.toString()))
                .andExpect(jsonPath("$.name").value("Hiking Boots"))
                .andExpect(jsonPath("$.category").value("FOOTWEAR"))
                .andExpect(jsonPath("$.description")
                        .value("Waterproof hiking boots"));
    }

    @Test
    void shouldReturnCurrentUserGearWhenAuthenticated() throws Exception {

        GearItemResponse item1 = new GearItemResponse(
                UUID.randomUUID(),
                "Hiking Boots",
                "FOOTWEAR",
                "Waterproof hiking boots",
                OffsetDateTime.now()
        );

        GearItemResponse item2 = new GearItemResponse(
                UUID.randomUUID(),
                "Rain Jacket",
                "CLOTHING",
                "Waterproof shell jacket",
                OffsetDateTime.now()
        );

        when(gearService.getCurrentUserGear(any()))
                .thenReturn(List.of(item1, item2));

        mockMvc.perform(get("/api/users/me/gear")
                        .with(jwt().jwt(token ->
                                token.subject("keycloak-user-123")
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Hiking Boots"))
                .andExpect(jsonPath("$[0].category").value("FOOTWEAR"))
                .andExpect(jsonPath("$[1].name").value("Rain Jacket"))
                .andExpect(jsonPath("$[1].category").value("CLOTHING"));
    }

    @Test
    void shouldDeleteGearItemWhenAuthenticated() throws Exception {

        UUID gearId = UUID.randomUUID();

        mockMvc.perform(delete("/api/users/me/gear/{gearId}", gearId)
                        .with(jwt().jwt(token ->
                                token.subject("keycloak-user-123")
                        )))
                .andExpect(status().isNoContent());

        org.mockito.Mockito.verify(gearService)
                .deleteGearItem(any(), eq(gearId));
    }

    @Test
    void shouldUpdateGearItemWhenAuthenticated() throws Exception {

        UUID gearId = UUID.randomUUID();

        GearItemResponse response = new GearItemResponse(
                gearId,
                "Updated Hiking Boots",
                "FOOTWEAR",
                "Updated description",
                OffsetDateTime.now()
        );

        when(gearService.updateGearItem(any(), eq(gearId), any()))
                .thenReturn(response);

        mockMvc.perform(put("/api/users/me/gear/{gearId}", gearId)
                        .with(jwt().jwt(token ->
                                token.subject("keycloak-user-123")
                        ))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                          "name": "Updated Hiking Boots",
                          "category": "FOOTWEAR",
                          "description": "Updated description"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(gearId.toString()))
                .andExpect(jsonPath("$.name").value("Updated Hiking Boots"))
                .andExpect(jsonPath("$.category").value("FOOTWEAR"))
                .andExpect(jsonPath("$.description").value("Updated description"));

        org.mockito.Mockito.verify(gearService)
                .updateGearItem(any(), eq(gearId), any());
    }

    @Test
    void shouldReturn404WhenGearItemNotFound() throws Exception {

        UUID gearId = UUID.randomUUID();

        doThrow(new ResourceNotFoundException(
                ErrorCode.GEAR_NOT_FOUND,
                "Gear item not found"
        ))
                .when(gearService)
                .deleteGearItem(any(), eq(gearId));

        mockMvc.perform(delete("/api/users/me/gear/{gearId}", gearId)
                        .with(jwt().jwt(token ->
                                token.subject("keycloak-user-123")
                        )))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_PROBLEM_JSON
                ))
                .andExpect(jsonPath("$.title")
                        .value("Resource Not Found"))
                .andExpect(jsonPath("$.status")
                        .value(404))
                .andExpect(jsonPath("$.detail")
                        .value("Gear item not found"))
                .andExpect(jsonPath("$.code")
                        .value("GEAR_NOT_FOUND"))
                .andExpect(jsonPath("$.instance")
                        .value("/api/users/me/gear/" + gearId));
    }

    @Test
    void shouldReturn400WhenGearRequestIsInvalid() throws Exception {

        mockMvc.perform(post("/api/users/me/gear")
                        .with(jwt().jwt(token ->
                                token.subject("keycloak-user-123")
                        ))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                          "name": "",
                          "category": "FOOTWEAR",
                          "description": "Test gear"
                        }
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_PROBLEM_JSON
                ))
                .andExpect(jsonPath("$.title")
                        .value("Validation Failed"))
                .andExpect(jsonPath("$.status")
                        .value(400))
                .andExpect(jsonPath("$.detail")
                        .value("Request validation failed"))
                .andExpect(jsonPath("$.code")
                        .value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field")
                        .value("name"));
    }
}

