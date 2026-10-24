package com.jay.outdoor.recommendation.client.weather;

import com.jay.outdoor.recommendation.dto.TrailWeather;
import com.jay.outdoor.recommendation.exception.WeatherServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

import java.time.LocalDate;

@Component
public class WeatherServiceClient {

    private final RestClient restClient;

    public WeatherServiceClient(
            RestClient.Builder builder,
            @Value("${weather.base-url}") String weatherBaseUrl
    ) {
        this.restClient = builder
                .baseUrl(weatherBaseUrl)
                .build();
    }

    public TrailWeather getWeather(
            double latitude,
            double longitude,
            LocalDate tripDate
    ) {

        try {
            JsonNode response =
                    restClient.get()
                            .uri(uriBuilder ->
                                    uriBuilder
                                            .path("/v1/forecast")
                                            .queryParam("latitude", latitude)
                                            .queryParam("longitude", longitude)
                                            .queryParam(
                                                    "daily",
                                                    "temperature_2m_max," +
                                                            "temperature_2m_min," +
                                                            "precipitation_probability_max," +
                                                            "wind_speed_10m_max"
                                            )
                                            .queryParam("timezone", "auto")
                                            .queryParam("start_date", tripDate)
                                            .queryParam("end_date", tripDate)
                                            .build()
                            )
                            .retrieve()
                            .body(JsonNode.class);

            if (response == null) {
                throw new WeatherServiceUnavailableException(
                        "Weather service returned an empty response"
                );
            }

            JsonNode daily = response.get("daily");

            if (daily == null) {
                throw new WeatherServiceUnavailableException(
                        "Weather response does not contain daily forecast data"
                );
            }

            JsonNode dates =
                    daily.get("time");

            JsonNode maxTemperatures =
                    daily.get("temperature_2m_max");

            JsonNode minTemperatures =
                    daily.get("temperature_2m_min");

            JsonNode precipitationProbabilities =
                    daily.get("precipitation_probability_max");

            JsonNode windSpeeds =
                    daily.get("wind_speed_10m_max");

            if (dates == null
                    || maxTemperatures == null
                    || minTemperatures == null
                    || precipitationProbabilities == null
                    || windSpeeds == null) {

                throw new WeatherServiceUnavailableException(
                        "Weather response is missing required forecast fields"
                );
            }

            String requestedDate =
                    tripDate.toString();

            for (int i = 0; i < dates.size(); i++) {

                if (requestedDate.equals(
                        dates.get(i).asText()
                )) {

                    double maxTemp =
                            maxTemperatures
                                    .get(i)
                                    .asDouble();

                    double minTemp =
                            minTemperatures
                                    .get(i)
                                    .asDouble();

                    double averageTemp =
                            (maxTemp + minTemp) / 2.0;

                    double precipitationProbability =
                            precipitationProbabilities
                                    .get(i)
                                    .asDouble();

                    double windSpeed =
                            windSpeeds
                                    .get(i)
                                    .asDouble();

                    return new TrailWeather(
                            averageTemp,
                            precipitationProbability,
                            windSpeed
                    );
                }
            }

            throw new WeatherServiceUnavailableException(
                    "Weather forecast is not available for date: "
                            + tripDate
            );

        } catch (RestClientException ex) {

            throw new WeatherServiceUnavailableException(
                    "Weather service is unavailable",
                    ex
            );
        }
    }

}
