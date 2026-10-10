package com.jay.outdoor.recommendation.client.weather;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record OpenMeteoDaily(

        List<String> time,

        @JsonProperty("temperature_2m_max")
        List<Double> temperature2mMax,

        @JsonProperty("temperature_2m_min")
        List<Double> temperature2mMin,

        @JsonProperty("precipitation_probability_max")
        List<Double> precipitationProbabilityMax,

        @JsonProperty("wind_speed_10m_max")
        List<Double> windSpeed10mMax

) {
}