package com.jay.outdoor.memory.config;

import com.jay.outdoor.memory.security.RestAccessDeniedHandler;
import com.jay.outdoor.memory.security.RestAuthenticationEntryPoint;
import com.jay.outdoor.memory.security.SubjectRequiredFilter;
import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.RegexRequestMatcher;

@Configuration
public class SecurityConfig {

    private static final String PUBLIC_DETAIL_PATTERN =
            "^/api/memories/public/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}"
                    + "-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\\?.*)?$";

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            RestAuthenticationEntryPoint authenticationEntryPoint,
            RestAccessDeniedHandler accessDeniedHandler,
            @Value("${memory.storage.type:local}") String storageType
    ) throws Exception {

        boolean localStorage = "local".equalsIgnoreCase(storageType.trim());

        http
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> {
                    // Error forwards keep their real status for anonymous public
                    // callers (as on trail-service). A direct /error request stays
                    // protected.
                    auth.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll();
                    auth.requestMatchers(HttpMethod.GET, "/api/memories/public")
                            .permitAll();
                    // RegexRequestMatcher sees the query string, so allow one.
                    auth.requestMatchers(
                                    new RegexRequestMatcher(PUBLIC_DETAIL_PATTERN, "GET"))
                            .permitAll();
                    if (localStorage) {
                        // Local development photo bytes: the signature is the
                        // authorization, because an <img> cannot send a token.
                        auth.requestMatchers(HttpMethod.GET,
                                        "/api/memories/local-photos/**")
                                .permitAll();
                    }
                    auth.anyRequest().authenticated();
                })

                .exceptionHandling(exception ->
                        exception
                                .authenticationEntryPoint(authenticationEntryPoint)
                                .accessDeniedHandler(accessDeniedHandler)
                )

                .oauth2ResourceServer(oauth2 ->
                        oauth2
                                .jwt(Customizer.withDefaults())
                                .authenticationEntryPoint(authenticationEntryPoint)
                )

                .addFilterAfter(
                        new SubjectRequiredFilter(authenticationEntryPoint),
                        BearerTokenAuthenticationFilter.class
                );

        return http.build();
    }
}
