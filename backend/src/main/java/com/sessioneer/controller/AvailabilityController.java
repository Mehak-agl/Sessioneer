package com.sessioneer.controller;

import com.sessioneer.dto.AvailabilityRequest;
import com.sessioneer.model.Availability;
import com.sessioneer.service.AvailabilityService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/availability")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    @PostMapping
    public ResponseEntity<Availability> submitAvailability(@RequestBody AvailabilityRequest request) {
        return ResponseEntity.ok(availabilityService.submitAvailability(request));
    }

    @GetMapping("/unit/{unitId}")
    public ResponseEntity<List<Availability>> getAvailabilityForUnit(@PathVariable Long unitId) {
        return ResponseEntity.ok(availabilityService.getAvailabilityForUnit(unitId));
    }

    @GetMapping("/me")
    public ResponseEntity<List<Availability>> getMyAvailability() {
        return ResponseEntity.ok(availabilityService.getMyAvailability());
    }
}