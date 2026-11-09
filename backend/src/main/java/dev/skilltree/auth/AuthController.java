package dev.skilltree.auth;

import java.time.Instant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.skilltree.common.ApiException;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public record RegisterRequest(@NotBlank @Email String email, @NotBlank @Size(min = 10, max = 128) String password,
            @Size(max = 100) String displayName) {
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    public record TokenResponse(String accessToken, Instant expiresAt, UserResponse user) {
    }

    public record UserResponse(Long id, String email, String displayName, Role role) {
        static UserResponse of(UserAccount u) {
            return new UserResponse(u.getId(), u.getEmail(), u.getDisplayName(), u.getRole());
        }
    }

    /** Public registration always creates a plain USER; CMS roles are granted by an ADMIN. */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public TokenResponse register(@Valid @RequestBody RegisterRequest req) {
        if (users.existsByEmailIgnoreCase(req.email())) {
            throw ApiException.conflict("email_taken", "An account with this email already exists");
        }
        UserAccount user = users.save(new UserAccount(req.email().toLowerCase(), passwordEncoder.encode(req.password()),
                req.displayName(), Role.USER));
        return tokenFor(user);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        UserAccount user = users.findByEmailIgnoreCase(req.email())
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "invalid_credentials",
                        "Invalid email or password"));
        return tokenFor(user);
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return users.findById(CurrentUser.from(authentication).id()).map(UserResponse::of)
                .orElseThrow(() -> ApiException.notFound("User"));
    }

    private TokenResponse tokenFor(UserAccount user) {
        JwtService.IssuedToken token = jwtService.issue(user);
        return new TokenResponse(token.token(), token.expiresAt(), UserResponse.of(user));
    }
}
