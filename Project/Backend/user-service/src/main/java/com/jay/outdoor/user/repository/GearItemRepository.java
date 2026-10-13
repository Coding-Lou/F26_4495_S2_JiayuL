package com.jay.outdoor.user.repository;

import com.jay.outdoor.user.entity.Gear;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GearItemRepository extends JpaRepository<Gear, UUID> {

    List<Gear> findAllByUserIdAndDeletedFalseOrderByCreatedAtDesc(UUID userId);

    Optional<Gear> findByIdAndUserIdAndDeletedFalse(UUID id, UUID userId);

}