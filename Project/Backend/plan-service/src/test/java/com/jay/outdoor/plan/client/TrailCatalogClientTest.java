package com.jay.outdoor.plan.client;

import com.jay.outdoor.plan.config.TrailClientConfig;
import com.jay.outdoor.plan.exception.TrailServiceUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.headerDoesNotExist;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** Tokenless trail validation (spec section 11). */
class TrailCatalogClientTest {

    private static final UUID TRAIL = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final String URL = "http://localhost:8082/api/trails/" + TRAIL;

    private MockRestServiceServer server;
    private TrailCatalogClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new TrailCatalogClient(builder, "http://localhost:8082");
    }

    @Test
    void okMeansTheTrailExistsAndNoAuthorizationHeaderIsSent() {
        server.expect(once(), requestTo(URL))
                .andExpect(method(GET))
                .andExpect(headerDoesNotExist(HttpHeaders.AUTHORIZATION))
                .andRespond(withSuccess("{\"id\":\"" + TRAIL + "\"}", org.springframework.http.MediaType.APPLICATION_JSON));

        assertTrue(client.trailExists(TRAIL));
        server.verify();
    }

    @Test
    void notFoundMeansMissingOrDeleted() {
        server.expect(once(), requestTo(URL))
                .andExpect(headerDoesNotExist(HttpHeaders.AUTHORIZATION))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertFalse(client.trailExists(TRAIL));
        server.verify();
    }

    @Test
    void serverErrorsAndOtherStatusesAreUnavailable() {
        server.expect(once(), requestTo(URL)).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        assertThrows(TrailServiceUnavailableException.class, () -> client.trailExists(TRAIL));
        server.verify();
        server.reset();

        server.expect(once(), requestTo(URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED));
        assertThrows(TrailServiceUnavailableException.class, () -> client.trailExists(TRAIL));
        server.verify();
        server.reset();

        server.expect(once(), requestTo(URL)).andRespond(withStatus(HttpStatus.FORBIDDEN));
        assertThrows(TrailServiceUnavailableException.class, () -> client.trailExists(TRAIL));
        server.verify();
        server.reset();

        server.expect(once(), requestTo(URL)).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        assertThrows(TrailServiceUnavailableException.class, () -> client.trailExists(TRAIL));
        server.verify();
    }

    @Test
    void aConnectionErrorIsUnavailable() throws Exception {
        int closedPort;
        try (ServerSocket socket = new ServerSocket(0)) {
            closedPort = socket.getLocalPort();
        }

        TrailCatalogClient real = new TrailCatalogClient(
                new TrailClientConfig().trailRestClientBuilder(),
                "http://localhost:" + closedPort);

        assertThrows(TrailServiceUnavailableException.class, () -> real.trailExists(TRAIL));
    }

    @Test
    void aTimeoutIsUnavailable() {
        server.expect(once(), requestTo(URL)).andRespond(withException(new SocketTimeoutException("Read timed out")));

        assertThrows(TrailServiceUnavailableException.class, () -> client.trailExists(TRAIL));
        server.verify();
    }

    @Test
    void theConfiguredReadTimeoutStopsASilentServer() throws Exception {
        try (ServerSocket silent = new ServerSocket(0)) {
            Thread acceptor = Thread.ofVirtual().start(() -> {
                try (Socket ignored = silent.accept()) {
                    Thread.sleep(10_000);
                } catch (Exception ignored) {
                    // closed by the test
                }
            });

            TrailCatalogClient real = new TrailCatalogClient(
                    new TrailClientConfig().trailRestClientBuilder(),
                    "http://localhost:" + silent.getLocalPort());

            long started = System.nanoTime();
            assertThrows(TrailServiceUnavailableException.class, () -> real.trailExists(TRAIL));
            long elapsedMs = (System.nanoTime() - started) / 1_000_000;

            assertTrue(elapsedMs >= 2_500 && elapsedMs < 6_000, "elapsed " + elapsedMs + " ms");
            acceptor.interrupt();
        }
    }
}
