package com.jay.outdoor.plan.config;

import com.jay.outdoor.plan.security.RestAccessDeniedHandler;
import com.jay.outdoor.plan.security.RestAuthenticationEntryPoint;
import com.jay.outdoor.plan.security.SubjectRequiredFilter;
import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

/** Every Plan endpoint is authenticated; there is no public path (spec section 9, D7). */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            RestAuthenticationEntryPoint authenticationEntryPoint,
            RestAccessDeniedHandler accessDeniedHandler
    ) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> {
                    // Error forwards of a request already authorised or refused on
                    // its REQUEST dispatch keep their real status (as memory-service
                    // and trail-service). A direct /error request stays protected.
                    auth.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll();
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
