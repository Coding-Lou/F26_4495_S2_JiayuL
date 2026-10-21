package com.jay.outdoor.user.service;

import com.jay.outdoor.user.dto.CreateGearItemRequest;
import com.jay.outdoor.user.dto.GearItemResponse;
import com.jay.outdoor.user.dto.UpdateGearItemRequest;
import com.jay.outdoor.user.dto.UserResponse;
import com.jay.outdoor.user.entity.Gear;
import com.jay.outdoor.user.entity.GearCategory;
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
                GearCategory.FOOTWEAR,
                "Waterproof hiking boots"
        );

        when(userService.getOrCreateUser(jwt))
                .thenReturn(currentUser);

        when(gearItemRepository.save(any(Gear.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        gearService.createGearItem(jwt, request);

        ArgumentCaptor<Gear> captor =
                ArgumentCaptor.forClass(Gear.class);

        org.mockito.Mockito.verify(gearItemRepository)
                .save(captor.capture());

        Gear savedGear = captor.getValue();

        assertEquals(userId, savedGear.getUserId());
        assertEquals("Hiking Boots", savedGear.getName());
        assertEquals(GearCategory.FOOTWEAR, savedGear.getCategory());
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

        Gear boots = new Gear();
        boots.setUserId(userId);
        boots.setName("Hiking Boots");
        boots.setCategory(GearCategory.FOOTWEAR);

        Gear jacket = new Gear();
        jacket.setUserId(userId);
        jacket.setName("Rain Jacket");
        jacket.setCategory(GearCategory.RAIN_GEAR);

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

        Gear gear = new Gear();
        gear.setUserId(userId);
        gear.setName("Hiking Boots");
        gear.setCategory(GearCategory.FOOTWEAR);
        gear.setDeleted(false);

        when(userService.getOrCreateUser(jwt))
                .thenReturn(currentUser);

        when(gearItemRepository.findByIdAndUserIdAndDeletedFalse(
                gearId,
                userId
        )).thenReturn(java.util.Optional.of(gear));

        gearService.deleteGearItem(jwt, gearId);

        assertEquals(true, gear.isDeleted());

        org.mockito.Mockito.verify(gearItemRepository)
                .save(gear);
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

        Gear gear = new Gear();
        gear.setUserId(userId);
        gear.setName("Old Hiking Boots");
        gear.setCategory(GearCategory.FOOTWEAR);
        gear.setDescription("Old description");
        gear.setDeleted(false);

        UpdateGearItemRequest request = new UpdateGearItemRequest(
                "Updated Hiking Boots",
                GearCategory.FOOTWEAR,
                "Updated description"
        );

        when(userService.getOrCreateUser(jwt))
                .thenReturn(currentUser);

        when(gearItemRepository.findByIdAndUserIdAndDeletedFalse(
                gearId,
                userId
        )).thenReturn(java.util.Optional.of(gear));

        when(gearItemRepository.save(any(Gear.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        GearItemResponse result =
                gearService.updateGearItem(jwt, gearId, request);

        assertEquals("Updated Hiking Boots", gear.getName());
        assertEquals(GearCategory.FOOTWEAR, gear.getCategory());
        assertEquals("Updated description", gear.getDescription());

        assertEquals("Updated Hiking Boots", result.name());
        assertEquals("Updated description", result.description());

        org.mockito.Mockito.verify(gearItemRepository)
                .findByIdAndUserIdAndDeletedFalse(gearId, userId);

        org.mockito.Mockito.verify(gearItemRepository)
                .save(gear);
    }
}
