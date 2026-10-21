package com.jay.outdoor.memory.controller;

import com.jay.outdoor.memory.dto.MemoryPage;
import com.jay.outdoor.memory.dto.PublicMemoryDetail;
import com.jay.outdoor.memory.dto.PublicMemorySummary;
import com.jay.outdoor.memory.service.MemoryPaging;
import com.jay.outdoor.memory.service.PublicMemoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Public API (section 14). No token is needed; no author identity is returned. */
@RestController
@RequestMapping("/api/memories/public")
public class PublicMemoryController {

    private final PublicMemoryService publicMemoryService;

    public PublicMemoryController(PublicMemoryService publicMemoryService) {
        this.publicMemoryService = publicMemoryService;
    }

    @GetMapping
    public MemoryPage<PublicMemorySummary> listTrailMemories(
            @RequestParam UUID trailId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + MemoryPaging.DEFAULT_SIZE) int size
    ) {
        return publicMemoryService.listForTrail(trailId, page, size);
    }

    @GetMapping("/{memoryId}")
    public PublicMemoryDetail getPublicMemory(@PathVariable UUID memoryId) {
        return publicMemoryService.get(memoryId);
    }
}
