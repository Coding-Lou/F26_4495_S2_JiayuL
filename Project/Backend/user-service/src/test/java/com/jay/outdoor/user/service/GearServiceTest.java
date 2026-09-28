package com.jay.outdoor.user.service;

import com.jay.outdoor.user.dto.CreateGearItemRequest;
import com.jay.outdoor.user.dto.GearItemResponse;
import com.jay.outdoor.user.dto.UpdateGearItemRequest;
import com.jay.outdoor.user.dto.UserResponse;
import com.jay.outdoor.user.entity.GearItem;
import com.jay.outdoor.user.repository.GearItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GearServiceTest {

    @Mock
    private GearItemRepository gearItemRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private GearService gearService;

    @Test
    void shouldCreateGearForCurrentUser() {

        UUID userId = UUID.randomUUID();

        Jwt jwt = org.mockito.Mockito.mock(Jwt.class);

        UserResponse currentUser = new UserResponse(
                userId,
                "jay@example.com",
                "Jay",
                OffsetDateTime.now()
        );

        CreateGearItemRequest request = new CreateGearItemRequest(
                "Hiking Boots",
                "FOOTWEAR",
                "Waterproof hiking boots"
        );

        when(userService.getOrCreateUser(jwt))
                .thenReturn(currentUser);

        when(gearItemRepository.save(any(GearItem.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        gearService.createGearItem(jwt, request);

        ArgumentCaptor<GearItem> captor =
                ArgumentCaptor.forClass(GearItem.class);

        org.mockito.Mockito.verify(gearItemRepository)
                .save(captor.capture());

        GearItem savedGear = captor.getValue();

        assertEquals(userId, savedGear.getUserId());
        assertEquals("Hiking Boots", savedGear.getName());
        assertEquals("FOOTWEAR", savedGear.getCategory());
        assertEquals(
                "Waterproof hiking boots",
                savedGear.getDescription()
        );
    }

    @Test
    void shouldReturnOnlyCurrentUserGear() {

        UUID userId = UUID.randomUUID();

        Jwt jwt = org.mockito.Mockito.mock(Jwt.class);

        UserResponse currentUser = new UserResponse(
                userId,
                "jay@example.com",
                "Jay",
                OffsetDateTime.now()
        );

        GearItem boots = new GearItem();
        boots.setUserId(userId);
        boots.setName("Hiking Boots");
        boots.setCategory("FOOTWEAR");

        GearItem jacket = new GearItem();
        jacket.setUserId(userId);
        jacket.setName("Rain Jacket");
        jacket.setCategory("CLOTHING");

        when(userService.getOrCreateUser(jwt))
                .thenReturn(currentUser);

        when(gearItemRepository.findAllByUserIdAndDeletedFalseOrderByCreatedAtDesc(userId))
                .thenReturn(java.util.List.of(boots, jacket));

        var result = gearService.getCurrentUserGear(jwt);

        assertEquals(2, result.size());
        assertEquals("Hiking Boots", result.get(0).name());
        assertEquals("Rain Jacket", result.get(1).name());

        org.mockito.Mockito.verify(gearItemRepository)
                .findAllByUserIdAndDeletedFalseOrderByCreatedAtDesc(userId);
    }

    @Test
    void shouldSoftDeleteGearItem() {

        UUID userId = UUID.randomUUID();
        UUID gearId = UUID.randomUUID();

        Jwt jwt = org.mockito.Mockito.mock(Jwt.class);

        UserResponse currentUser = new UserResponse(
                userId,
                "jay@example.com",
                "Jay",
                OffsetDateTime.now()
        );

        GearItem gearItem = new GearItem();
        gearItem.setUserId(userId);
        gearItem.setName("Hiking Boots");
        gearItem.setCategory("FOOTWEAR");
        gearItem.setDeleted(false);

        when(userService.getOrCreateUser(jwt))
                .thenReturn(currentUser);

        when(gearItemRepository.findByIdAndUserIdAndDeletedFalse(
                gearId,
                userId
        )).thenReturn(java.util.Optional.of(gearItem));

        gearService.deleteGearItem(jwt, gearId);

        assertEquals(true, gearItem.isDeleted());

        org.mockito.Mockito.verify(gearItemRepository)
                .save(gearItem);
    }

    @Test
    void shouldUpdateGearItemForCurrentUser() {

        UUID userId = UUID.randomUUID();
        UUID gearId = UUID.randomUUID();

        Jwt jwt = org.mockito.Mockito.mock(Jwt.class);

        UserResponse currentUser = new UserResponse(
                userId,
                "jay@example.com",
                "Jay",
                OffsetDateTime.now()
        );

        GearItem gearItem = new GearItem();
        gearItem.setUserId(userId);
        gearItem.setName("Old Hiking Boots");
        gearItem.setCategory("FOOTWEAR");
        gearItem.setDescription("Old description");
        gearItem.setDeleted(false);

        UpdateGearItemRequest request = new UpdateGearItemRequest(
                "Updated Hiking Boots",
                "FOOTWEAR",
                "Updated description"
        );

        when(userService.getOrCreateUser(jwt))
                .thenReturn(currentUser);

        when(gearItemRepository.findByIdAndUserIdAndDeletedFalse(
                gearId,
                userId
        )).thenReturn(java.util.Optional.of(gearItem));

        when(gearItemRepository.save(any(GearItem.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        GearItemResponse result =
                gearService.updateGearItem(jwt, gearId, request);

        assertEquals("Updated Hiking Boots", gearItem.getName());
        assertEquals("FOOTWEAR", gearItem.getCategory());
        assertEquals("Updated description", gearItem.getDescription());

        assertEquals("Updated Hiking Boots", result.name());
        assertEquals("Updated description", result.description());

        org.mockito.Mockito.verify(gearItemRepository)
                .findByIdAndUserIdAndDeletedFalse(gearId, userId);

        org.mockito.Mockito.verify(gearItemRepository)
                .save(gearItem);
    }
}