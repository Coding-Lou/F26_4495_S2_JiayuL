package com.jay.outdoor.recommendation.client.weather;

import com.jay.outdoor.recommendation.dto.TrailWeather;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;

@Component
public class WeatherServiceClient {

    private final RestClient restClient;

    public WeatherServiceClient(
            RestClient.Builder builder
    ) {
        this.restClient = builder
                .baseUrl("https://api.open-meteo.com")
                .build();
    }

    public TrailWeather getWeather(
            double latitude,
            double longitude,
            LocalDate tripDate
    ) {

        OpenMeteoResponse response =
                restClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/v1/forecast")
                                .queryParam("latitude", latitude)
                                .queryParam("longitude", longitude)
                                .queryParam(
                                        "daily",
                                        "temperature_2m_max,"
                                                + "temperature_2m_min,"
                                                + "precipitation_probability_max,"
                                                + "wind_speed_10m_max"
                                )
                                .queryParam(
                                        "timezone",
                                        "auto"
                                )
                                .build()
                        )
                        .retrieve()
                        .body(OpenMeteoResponse.class);

        if (response == null
                || response.daily() == null) {
            throw new IllegalStateException(
                    "Open-Meteo returned no weather data"
            );
        }

        return findWeatherForDate(
                response.daily(),
                tripDate
        );
    }

    private TrailWeather findWeatherForDate(
            OpenMeteoDaily daily,
            LocalDate tripDate
    ) {

        for (int i = 0; i < daily.time().size(); i++) {

            LocalDate date =
                    LocalDate.parse(
                            daily.time().get(i)
                    );

            if (!date.equals(tripDate)) {
                continue;
            }

            double maxTemperature =
                    daily.temperature2mMax().get(i);

            double minTemperature =
                    daily.temperature2mMin().get(i);

            double averageTemperature =
                    (maxTemperature + minTemperature) / 2.0;

            return new TrailWeather(
                    averageTemperature,
                    daily.precipitationProbabilityMax()
                            .get(i),
                    daily.windSpeed10mMax()
                            .get(i)
            );
        }

        throw new IllegalArgumentException(
                "Weather forecast is unavailable for "
                        + tripDate
        );
    }
}