package com.sessioneer.controller;

import com.sessioneer.dto.UnitRequest;
import com.sessioneer.model.Unit;
import com.sessioneer.service.UnitService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/units")
public class UnitController {

    private final UnitService unitService;

    public UnitController(UnitService unitService) {
        this.unitService = unitService;
    }

    @PostMapping
    public ResponseEntity<Unit> createUnit(@RequestBody UnitRequest request) {
        return ResponseEntity.ok(unitService.createUnit(request));
    }

    @GetMapping
    public ResponseEntity<List<Unit>> getMyUnits() {
        return ResponseEntity.ok(unitService.getMyUnits());
    }
}