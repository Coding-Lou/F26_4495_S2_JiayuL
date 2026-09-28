package com.jay.outdoor.user.repository;

import com.jay.outdoor.user.entity.GearItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GearItemRepository extends JpaRepository<GearItem, UUID> {

    List<GearItem> findAllByUserIdAndDeletedFalseOrderByCreatedAtDesc(UUID userId);

    Optional<GearItem> findByIdAndUserIdAndDeletedFalse(UUID id, UUID userId);

}