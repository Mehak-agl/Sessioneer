package com.sessioneer.controller;

import com.sessioneer.dto.TutorReportProfileDto;
import com.sessioneer.dto.TutorSummaryDto;
import com.sessioneer.service.TutorReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Coordinator-facing "Tutor Reports" endpoints: a list of every sessional
 * staff member with their teaching load, and a full per-tutor breakdown.
 */
@RestController
@RequestMapping("/api/tutors")
public class TutorReportController {

    private final TutorReportService tutorReportService;

    public TutorReportController(TutorReportService tutorReportService) {
        this.tutorReportService = tutorReportService;
    }

    @GetMapping
    public ResponseEntity<List<TutorSummaryDto>> getAllTutors() {
        return ResponseEntity.ok(tutorReportService.getAllTutors());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TutorReportProfileDto> getTutorProfile(@PathVariable Long id) {
        return ResponseEntity.ok(tutorReportService.getTutorProfile(id));
    }
}
