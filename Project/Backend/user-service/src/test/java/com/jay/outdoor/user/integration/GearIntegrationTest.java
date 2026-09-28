package com.jay.outdoor.user.integration;

import com.jay.outdoor.user.repository.GearItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class GearIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("user_db")
                    .withUsername("test_user")
                    .withPassword("test_password");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GearItemRepository gearItemRepository;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void cleanDatabase() {
        gearItemRepository.deleteAll();
    }

    @Test
    void shouldCreateGearItemAndPersistToDatabase() throws Exception {

        mockMvc.perform(post("/api/users/me/gear")
                        .with(jwt().jwt(token -> token
                                .subject("integration-test-user")
                                .claim("email", "jay@example.com")
                                .claim("preferred_username", "jay")
                                .claim("name", "Jay")
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
                .andExpect(jsonPath("$.name").value("Hiking Boots"))
                .andExpect(jsonPath("$.category").value("FOOTWEAR"));

        var gearItems = gearItemRepository.findAll();

        assertEquals(1, gearItems.size());
        assertEquals("Hiking Boots", gearItems.getFirst().getName());
        assertEquals("FOOTWEAR", gearItems.getFirst().getCategory());
        assertEquals(false, gearItems.getFirst().isDeleted());
    }

    @Test
    void shouldCreateAndReturnCurrentUserGear() throws Exception {

        var auth = jwt().jwt(token -> token
                .subject("integration-test-user")
                .claim("email", "jay@example.com")
                .claim("preferred_username", "jay")
                .claim("name", "Jay")
        );

        mockMvc.perform(post("/api/users/me/gear")
                        .with(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                          "name": "Rain Jacket",
                          "category": "CLOTHING",
                          "description": "Waterproof shell jacket"
                        }
                        """))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/users/me/gear")
                        .with(jwt().jwt(token -> token
                                .subject("integration-test-user")
                                .claim("email", "jay@example.com")
                                .claim("preferred_username", "jay")
                                .claim("name", "Jay")
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Rain Jacket"))
                .andExpect(jsonPath("$[0].category").value("CLOTHING"))
                .andExpect(jsonPath("$[0].description")
                        .value("Waterproof shell jacket"));
    }

    @Test
    void shouldUpdateGearItem() throws Exception {

        var auth = jwt().jwt(token -> token
                .subject("integration-test-user")
                .claim("email", "jay@example.com")
                .claim("preferred_username", "jay")
                .claim("name", "Jay")
        );

        String createResponse = mockMvc.perform(post("/api/users/me/gear")
                        .with(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                          "name": "Old Boots",
                          "category": "FOOTWEAR",
                          "description": "Old description"
                        }
                        """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String gearId = tools.jackson.databind.json.JsonMapper.builder()
                .build()
                .readTree(createResponse)
                .get("id")
                .asText();

        mockMvc.perform(put("/api/users/me/gear/{gearId}", gearId)
                        .with(jwt().jwt(token -> token
                                .subject("integration-test-user")
                                .claim("email", "jay@example.com")
                                .claim("preferred_username", "jay")
                                .claim("name", "Jay")
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
                .andExpect(jsonPath("$.name")
                        .value("Updated Hiking Boots"))
                .andExpect(jsonPath("$.description")
                        .value("Updated description"));
    }

    @Test
    void shouldSoftDeleteGearItem() throws Exception {

        var auth = jwt().jwt(token -> token
                .subject("integration-test-user")
                .claim("email", "jay@example.com")
                .claim("preferred_username", "jay")
                .claim("name", "Jay")
        );

        // 1. Create gear
        String createResponse = mockMvc.perform(post("/api/users/me/gear")
                        .with(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                          "name": "Hiking Boots",
                          "category": "FOOTWEAR",
                          "description": "Waterproof hiking boots"
                        }
                        """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String gearId = tools.jackson.databind.json.JsonMapper.builder()
                .build()
                .readTree(createResponse)
                .get("id")
                .asText();

        // 2. Soft delete
        mockMvc.perform(delete("/api/users/me/gear/{gearId}", gearId)
                        .with(jwt().jwt(token -> token
                                .subject("integration-test-user")
                                .claim("email", "jay@example.com")
                                .claim("preferred_username", "jay")
                                .claim("name", "Jay")
                        )))
                .andExpect(status().isNoContent());

        // 3. Normal GET should no longer return it
        mockMvc.perform(get("/api/users/me/gear")
                        .with(jwt().jwt(token -> token
                                .subject("integration-test-user")
                                .claim("email", "jay@example.com")
                                .claim("preferred_username", "jay")
                                .claim("name", "Jay")
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // 4. But database row should still exist
        var deletedGear = gearItemRepository
                .findById(UUID.fromString(gearId))
                .orElseThrow();

        assertTrue(deletedGear.isDeleted());
    }


    @Test
    void shouldNotAllowUserToUpdateAnotherUsersGear() throws Exception {

        // User A creates gear
        String createResponse = mockMvc.perform(post("/api/users/me/gear")
                        .with(jwt().jwt(token -> token
                                .subject("user-a")
                                .claim("email", "usera@example.com")
                                .claim("preferred_username", "user-a")
                                .claim("name", "User A")
                        ))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                          "name": "Hiking Boots",
                          "category": "FOOTWEAR",
                          "description": "User A boots"
                        }
                        """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String gearId = tools.jackson.databind.json.JsonMapper.builder()
                .build()
                .readTree(createResponse)
                .get("id")
                .asText();

        // User B tries to update User A's gear
        mockMvc.perform(put("/api/users/me/gear/{gearId}", gearId)
                        .with(jwt().jwt(token -> token
                                .subject("user-b")
                                .claim("email", "userb@example.com")
                                .claim("preferred_username", "user-b")
                                .claim("name", "User B")
                        ))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                          "name": "Stolen Boots",
                          "category": "FOOTWEAR",
                          "description": "User B tries to modify it"
                        }
                        """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code")
                        .value("GEAR_NOT_FOUND"));
    }
}