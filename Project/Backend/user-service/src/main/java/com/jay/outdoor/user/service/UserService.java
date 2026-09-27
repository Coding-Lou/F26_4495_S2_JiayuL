package com.jay.outdoor.user.service;

import com.jay.outdoor.user.dto.UserResponse;
import com.jay.outdoor.user.entity.User;
import com.jay.outdoor.user.repository.UserRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserResponse getOrCreateUser(Jwt jwt) {

        String identitySubject = jwt.getSubject();

        return userRepository
                .findByIdentitySubject(identitySubject)
                .map(this::toResponse)
                .orElseGet(() -> createUserFromJwt(jwt));
    }

    private UserResponse createUserFromJwt(Jwt jwt) {

        User user = new User();

        user.setIdentitySubject(jwt.getSubject());
        user.setEmail(jwt.getClaimAsString("email"));

        String displayName = jwt.getClaimAsString("name");

        if (displayName == null || displayName.isBlank()) {
            displayName = jwt.getClaimAsString("preferred_username");
        }

        user.setDisplayName(displayName);

        User savedUser = userRepository.save(user);

        return toResponse(savedUser);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getCreatedAt()
        );
    }
}