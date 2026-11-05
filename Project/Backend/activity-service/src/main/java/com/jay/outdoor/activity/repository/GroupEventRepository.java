package com.jay.outdoor.activity.repository;

import com.jay.outdoor.activity.entity.GroupEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GroupEventRepository extends JpaRepository<GroupEvent, UUID> {
}
