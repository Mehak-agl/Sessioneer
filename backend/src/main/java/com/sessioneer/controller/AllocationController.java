package com.sessioneer.controller;

import com.sessioneer.dto.AllocationRequest;
import com.sessioneer.model.Allocation;
import com.sessioneer.service.AllocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/allocations")
public class AllocationController {

    private final AllocationService allocationService;

    public AllocationController(AllocationService allocationService) {
        this.allocationService = allocationService;
    }

    @PostMapping
    public ResponseEntity<Allocation> allocate(@RequestBody AllocationRequest request) {
        return ResponseEntity.ok(allocationService.allocate(request));
    }

    @GetMapping("/unit/{unitId}")
    public ResponseEntity<List<Allocation>> getAllocationsByUnit(@PathVariable Long unitId) {
        return ResponseEntity.ok(allocationService.getAllocationsByUnit(unitId));
    }

    @GetMapping("/staff/{staffId}")
    public ResponseEntity<List<Allocation>> getAllocationsByStaff(@PathVariable Long staffId) {
        return ResponseEntity.ok(allocationService.getAllocationsByStaff(staffId));
    }

    @PostMapping("/self-assign")
    public ResponseEntity<Allocation> selfAssign(@RequestBody Map<String, Object> body) {
        Long sessionId = Long.valueOf(body.get("sessionId").toString());
        String coordinatorName = body.get("coordinatorName").toString();
        return ResponseEntity.ok(allocationService.selfAssign(sessionId, coordinatorName));
    }
}