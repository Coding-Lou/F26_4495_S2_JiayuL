package com.jay.outdoor.user.service;

import com.jay.outdoor.user.dto.CreateGearItemRequest;
import com.jay.outdoor.user.dto.GearItemResponse;
import com.jay.outdoor.user.dto.UpdateGearItemRequest;
import com.jay.outdoor.user.dto.UserResponse;
import com.jay.outdoor.user.entity.GearItem;
import com.jay.outdoor.user.exception.ErrorCode;
import com.jay.outdoor.user.exception.ResourceNotFoundException;
import com.jay.outdoor.user.repository.GearItemRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class GearService {

    private final GearItemRepository gearItemRepository;
    private final UserService userService;

    public GearService(
            GearItemRepository gearItemRepository,
            UserService userService
    ) {
        this.gearItemRepository = gearItemRepository;
        this.userService = userService;
    }

    public GearItemResponse createGearItem(
            Jwt jwt,
            CreateGearItemRequest request
    ) {
        UserResponse currentUser = userService.getOrCreateUser(jwt);

        GearItem gearItem = new GearItem();
        gearItem.setUserId(currentUser.id());
        gearItem.setName(request.name());
        gearItem.setCategory(request.category());
        gearItem.setDescription(request.description());

        GearItem savedGearItem = gearItemRepository.save(gearItem);

        return toResponse(savedGearItem);
    }

    public List<GearItemResponse> getCurrentUserGear(Jwt jwt) {
        UserResponse currentUser = userService.getOrCreateUser(jwt);

        return gearItemRepository
                .findAllByUserIdAndDeletedFalseOrderByCreatedAtDesc(currentUser.id())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private GearItemResponse toResponse(GearItem gearItem) {
        return new GearItemResponse(
                gearItem.getId(),
                gearItem.getName(),
                gearItem.getCategory(),
                gearItem.getDescription(),
                gearItem.getCreatedAt()
        );
    }

    public void deleteGearItem(Jwt jwt, UUID gearId) {
        UserResponse currentUser = userService.getOrCreateUser(jwt);

        GearItem gearItem = gearItemRepository
                .findByIdAndUserIdAndDeletedFalse(
                        gearId,
                        currentUser.id()
                )
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                ErrorCode.GEAR_NOT_FOUND,
                                "Gear item not found"
                        )
                );

        gearItem.setDeleted(true);

        gearItemRepository.save(gearItem);
    }

    public GearItemResponse updateGearItem(
            Jwt jwt,
            UUID gearId,
            UpdateGearItemRequest request
    ) {
        UserResponse currentUser = userService.getOrCreateUser(jwt);

        GearItem gearItem = gearItemRepository
                .findByIdAndUserIdAndDeletedFalse(
                        gearId,
                        currentUser.id()
                )
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                ErrorCode.GEAR_NOT_FOUND,
                                "Gear item not found"
                        )
                );

        gearItem.setName(request.name());
        gearItem.setCategory(request.category());
        gearItem.setDescription(request.description());

        GearItem savedGearItem = gearItemRepository.save(gearItem);

        return toResponse(savedGearItem);
    }
}