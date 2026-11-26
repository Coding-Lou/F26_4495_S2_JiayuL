package com.jay.outdoor.activity.client;

import com.jay.outdoor.activity.exception.TrailServiceUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class TrailCatalogClientTests {

    private static final UUID TRAIL_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final String URL = "http://localhost:8082/api/trails/" + TRAIL_ID;

    private MockRestServiceServer server;
    private TrailCatalogClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new TrailCatalogClient(builder, "http://localhost:8082");
    }

    @Test
    void distinguishesExistingAndMissingTrails() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.OK));
        assertTrue(client.trailExists(TRAIL_ID));
        server.verify();
        server.reset();

        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.NOT_FOUND));
        assertFalse(client.trailExists(TRAIL_ID));
        server.verify();
    }

    @Test
    void treatsServerErrorsAsUnavailable() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        assertThrows(TrailServiceUnavailableException.class,
                () -> client.trailExists(TRAIL_ID));
        server.verify();
    }
}
