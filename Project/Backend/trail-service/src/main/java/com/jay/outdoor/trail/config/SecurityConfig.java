package com.jay.outdoor.trail.config;

import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.RegexRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

@EnableWebSecurity
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())

                .cors(Customizer.withDefaults())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth
                        // The container forwards sendError() responses (400 for a bad
                        // activity date, for example) to /error. Without this, an
                        // anonymous caller of a public read would get 401 instead of
                        // the real status. A direct request to /error stays protected.
                        .dispatcherTypeMatchers(DispatcherType.ERROR)
                        .permitAll()
                        // Nearby returns only trail data that is already public by
                        // id. Its lat/lon are a point the caller supplies, not an
                        // authenticated user's location; radiusKm is bounded in
                        // TrailController.
                        .requestMatchers(HttpMethod.GET,
                                "/api/trails", "/api/trails/activity",
                                "/api/trails/nearby")
                        .permitAll()
                        // RegexRequestMatcher sees the query string, so allow one.
                        .requestMatchers(new RegexRequestMatcher(
                                "^/api/trails/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\\?.*)?$",
                                "GET"
                        ))
                        .permitAll()
                        .anyRequest().authenticated()
                )

                .oauth2ResourceServer(oauth2 ->
                        oauth2.jwt(Customizer.withDefaults())
                );

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(
                List.of("http://localhost:5173")
        );

        config.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "DELETE",
                        "OPTIONS"
                )
        );

        config.setAllowedHeaders(
                List.of(
                        "Authorization",
                        "Content-Type"
                )
        );

        CorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        ((UrlBasedCorsConfigurationSource) source)
                .registerCorsConfiguration("/**", config);

        return source;
    }
}
