package dev.skilltree.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

/** Identity extracted from a validated JWT. */
public record CurrentUser(Long id, String email, Role role) {

    public static CurrentUser from(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return new CurrentUser(Long.valueOf(jwt.getSubject()), jwt.getClaimAsString("email"),
                Role.valueOf(jwt.getClaimAsStringList("roles").get(0)));
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
