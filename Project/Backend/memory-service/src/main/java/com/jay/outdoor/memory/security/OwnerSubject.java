package com.jay.outdoor.memory.security;

import com.jay.outdoor.memory.exception.AuthenticationRequiredException;
import org.springframework.security.oauth2.jwt.Jwt;

/** The Memory owner is the Keycloak subject of the validated token (D5). */
public final class OwnerSubject {

    private OwnerSubject() {
    }

    public static String of(Jwt jwt) {
        String subject = jwt == null ? null : jwt.getSubject();

        if (!isUsable(subject)) {
            throw new AuthenticationRequiredException();
        }

        return subject;
    }

    static boolean isUsable(String subject) {
        return subject != null && !subject.isBlank();
    }
}
