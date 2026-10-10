package com.jay.outdoor.recommendation.client.trail;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

@Component
public class TrailServiceClient {

    private final RestClient restClient;

    public TrailServiceClient(
            RestClient.Builder restClientBuilder,
            @Value("${services.trail.base-url}") String trailServiceBaseUrl
    ) {
        this.restClient = createRestClient(
                restClientBuilder,
                trailServiceBaseUrl
        );
    }

    public List<TrailResponse> getTrails(String accessToken) {

        ParameterizedTypeReference<List<TrailResponse>> responseType =
                new ParameterizedTypeReference<>() {};

        return restClient
                .get()
                .uri("/api/trails")
                .headers(headers ->
                        headers.setBearerAuth(accessToken)
                )
                .retrieve()
                .body(responseType);
    }

    private RestClient createRestClient(
            RestClient.Builder builder,
            String baseUrl
    ) {
        return builder
                .baseUrl(baseUrl)
                .build();
    }

    public List<NearbyTrailResponse> getNearbyTrails(
            double latitude,
            double longitude,
            double radiusKm,
            String accessToken
    ) {
        var responseType =
                new ParameterizedTypeReference<List<NearbyTrailResponse>>() {};

        return restClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/trails/nearby")
                        .queryParam("lat", latitude)
                        .queryParam("lon", longitude)
                        .queryParam("radiusKm", radiusKm)
                        .build()
                )
                .headers(headers ->
                        headers.setBearerAuth(accessToken)
                )
                .retrieve()
                .body(responseType);
    }
}