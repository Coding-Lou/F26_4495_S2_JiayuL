package com.jay.outdoor.trail.controller;

import com.jay.outdoor.trail.repository.TrailRepository;
import com.jay.outdoor.trail.service.TrailService;
import com.jay.outdoor.trail.service.TrailActivityService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tools.jackson.databind.json.JsonMapper;

import java.lang.reflect.Proxy;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class TrailControllerTest {

    @Test
    void shouldKeepMissingTrailResponseAsEmptyNotFound() {
        TrailRepository repository = (TrailRepository) Proxy.newProxyInstance(
                TrailRepository.class.getClassLoader(),
                new Class<?>[]{TrailRepository.class},
                (proxy, method, arguments) -> switch (method.getName()) {
                    case "findTrailDetailById" -> Optional.empty();
                    case "toString" -> "TrailRepositoryStub";
                    default -> throw new UnsupportedOperationException(
                            method.getName()
                    );
                }
        );
        TrailService trailService = new TrailService(
                repository,
                JsonMapper.builder().build()
        );
        TrailController controller = new TrailController(
                trailService, new TrailActivityService(repository));
        UUID trailId = UUID.randomUUID();

        ResponseEntity<?> response = controller.getTrailById(trailId);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody());
    }
}
