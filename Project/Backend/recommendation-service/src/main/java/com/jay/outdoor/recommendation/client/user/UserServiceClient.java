package com.jay.outdoor.recommendation.client.user;

import com.jay.outdoor.recommendation.exception.UserServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;

@Component
public class UserServiceClient {

    private final RestClient restClient;

    public UserServiceClient(
            RestClient.Builder builder,
            @Value("${services.user.base-url}") String baseUrl
    ) {
        this.restClient = builder
                .baseUrl(baseUrl)
                .build();
    }

    public List<GearResponse> getCurrentUserGear(
            String accessToken
    ) {
        try {
            return restClient.get()
                    .uri("/api/users/me/gear")
                    .headers(headers ->
                            headers.setBearerAuth(accessToken)
                    )
                    .retrieve()
                    .body(
                            new ParameterizedTypeReference<List<GearResponse>>() {}
                    );

        } catch (RestClientException ex) {
            throw new UserServiceUnavailableException(
                    "User service is unavailable",
                    ex
            );
        }
    }
}