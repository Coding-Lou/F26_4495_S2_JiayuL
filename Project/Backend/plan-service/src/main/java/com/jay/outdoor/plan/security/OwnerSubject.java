package com.jay.outdoor.plan.security;

import com.jay.outdoor.plan.exception.AuthenticationRequiredException;
import org.springframework.security.oauth2.jwt.Jwt;

/** The Plan owner is the Keycloak subject of the validated token (spec section 9). */
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
