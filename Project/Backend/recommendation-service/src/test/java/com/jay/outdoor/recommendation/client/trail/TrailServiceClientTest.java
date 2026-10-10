package com.jay.outdoor.recommendation.client.trail;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TrailServiceClientTest {

    private MockRestServiceServer mockServer;
    private TrailServiceClient trailServiceClient;

    @BeforeEach
    void setUp() {

        RestClient.Builder builder = RestClient.builder();

        mockServer = MockRestServiceServer
                .bindTo(builder)
                .build();

        trailServiceClient = new TrailServiceClient(
                builder,
                "http://localhost:8082"
        );
    }

    @Test
    void shouldGetNearbyTrails() {

        mockServer.expect(
                        once(),
                        requestTo(
                                "http://localhost:8082/api/trails/nearby" +
                                        "?lat=49.2827" +
                                        "&lon=-123.1207" +
                                        "&radiusKm=30.0"
                        )
                )
                .andExpect(method(GET))
                .andExpect(
                        header(
                                HttpHeaders.AUTHORIZATION,
                                "Bearer test-token"
                        )
                )
                .andRespond(
                        withSuccess(
                                """
                                [
                                  {
                                    "id": "11111111-1111-1111-1111-111111111111",
                                    "name": "Quarry Rock",
                                    "description": "Forest trail",
                                    "difficulty": "MODERATE",
                                    "distanceKm": 5.8,
                                    "elevationGainM": 220,
                                    "estimatedDurationMin": 120,
                                    "latitude": 49.3265,
                                    "longitude": -122.9368,
                                    "source": "DEMO_SEED",
                                    "distanceFromUserKm": 18.5
                                  }
                                ]
                                """,
                                MediaType.APPLICATION_JSON
                        )
                );

        List<NearbyTrailResponse> result =
                trailServiceClient.getNearbyTrails(
                        49.2827,
                        -123.1207,
                        30.0,
                        "test-token"
                );

        assertEquals(1, result.size());
        assertEquals("Quarry Rock", result.getFirst().name());
        assertEquals("MODERATE", result.getFirst().difficulty());
        assertEquals(18.5, result.getFirst().distanceFromUserKm());

        mockServer.verify();
    }
}