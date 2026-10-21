package com.jay.outdoor.plan.client;

import com.jay.outdoor.plan.exception.TrailServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.UUID;

/**
 * Checks that a trail exists with one tokenless call to trail-service's public
 * {@code GET /api/trails/{id}}. Only the status is used; the body is not parsed.
 * Never called inside a database transaction. No retry.
 */
@Component
public class TrailCatalogClient {

    private static final Logger log = LoggerFactory.getLogger(TrailCatalogClient.class);

    private final RestClient restClient;

    public TrailCatalogClient(
            @Qualifier("trailRestClientBuilder") RestClient.Builder restClientBuilder,
            @Value("${services.trail.base-url}") String trailServiceBaseUrl
    ) {
        this.restClient = restClientBuilder
                .baseUrl(trailServiceBaseUrl)
                .build();
    }

    /**
     * @return true for 200, false for 404 (missing or soft-deleted)
     * @throws TrailServiceUnavailableException on a timeout, connection error, or any other status
     */
    public boolean trailExists(UUID trailId) {
        long started = System.nanoTime();
        int status;

        try {
            status = restClient.get()
                    .uri("/api/trails/{id}", trailId)
                    .exchange((request, response) -> response.getStatusCode().value());
        } catch (RestClientException ex) {
            log.warn("Trail lookup for {} failed after {} ms: {}",
                    trailId, elapsedMillis(started), ex.getClass().getSimpleName());
            throw new TrailServiceUnavailableException();
        }

        if (status == 200) {
            return true;
        }
        if (status == 404) {
            return false;
        }

        log.warn("Trail lookup for {} returned status {} after {} ms",
                trailId, status, elapsedMillis(started));
        throw new TrailServiceUnavailableException();
    }

    private static long elapsedMillis(long started) {
        return (System.nanoTime() - started) / 1_000_000;
    }
}
