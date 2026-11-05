package com.jay.outdoor.activity.client;

import com.jay.outdoor.activity.exception.TrailServiceUnavailableException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.UUID;

@Component
public class TrailCatalogClient {

    private final RestClient restClient;

    public TrailCatalogClient(
            @Qualifier("trailRestClientBuilder") RestClient.Builder builder,
            @Value("${services.trail.base-url}") String baseUrl
    ) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    public boolean trailExists(UUID trailId) {
        int status;
        try {
            status = restClient.get()
                    .uri("/api/trails/{id}", trailId)
                    .exchange((request, response) -> response.getStatusCode().value());
        } catch (RestClientException ex) {
            throw new TrailServiceUnavailableException();
        }

        if (status == 200) {
            return true;
        }
        if (status == 404) {
            return false;
        }
        throw new TrailServiceUnavailableException();
    }
}
