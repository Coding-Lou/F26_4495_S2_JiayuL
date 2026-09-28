package com.jay.outdoor.user.controller;

import com.jay.outdoor.user.dto.CreateGearItemRequest;
import com.jay.outdoor.user.dto.GearItemResponse;
import com.jay.outdoor.user.dto.UpdateGearItemRequest;
import com.jay.outdoor.user.service.GearService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/me/gear")
public class GearController {

    private final GearService gearService;

    public GearController(GearService gearService) {
        this.gearService = gearService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GearItemResponse createGearItem(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateGearItemRequest request
    ) {
        return gearService.createGearItem(jwt, request);
    }

    @GetMapping
    public List<GearItemResponse> getCurrentUserGear(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return gearService.getCurrentUserGear(jwt);
    }

    @DeleteMapping("/{gearId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGearItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID gearId
    ) {
        gearService.deleteGearItem(jwt, gearId);
    }

    @PutMapping("/{gearId}")
    public GearItemResponse updateGearItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID gearId,
            @Valid @RequestBody UpdateGearItemRequest request
    ) {
        return gearService.updateGearItem(jwt, gearId, request);
    }
}