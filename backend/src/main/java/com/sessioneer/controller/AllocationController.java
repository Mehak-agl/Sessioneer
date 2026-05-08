package com.sessioneer.controller;

import com.sessioneer.entity.Allocation;
import com.sessioneer.entity.Session;
import com.sessioneer.entity.Tutor;
import com.sessioneer.repository.AllocationRepository;
import com.sessioneer.repository.SessionRepository;
import com.sessioneer.repository.TutorRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/allocations")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class AllocationController {

    private final AllocationRepository allocationRepository;
    private final TutorRepository tutorRepository;
    private final SessionRepository sessionRepository;

    public AllocationController(
            AllocationRepository allocationRepository,
            TutorRepository tutorRepository,
            SessionRepository sessionRepository
    ) {
        this.allocationRepository = allocationRepository;
        this.tutorRepository = tutorRepository;
        this.sessionRepository = sessionRepository;
    }

    @GetMapping
    public List<Allocation> getAllAllocations() {
        return allocationRepository.findAll();
    }

    @PostMapping
    public Allocation createAllocation(@RequestBody Map<String, String> request) {
        Long tutorId = Long.parseLong(request.get("tutorId"));
        Long sessionId = Long.parseLong(request.get("sessionId"));

        Tutor tutor = tutorRepository.findById(tutorId)
                .orElseThrow(() -> new RuntimeException("Tutor not found"));

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        Allocation allocation = new Allocation();
        allocation.setTutor(tutor);
        allocation.setSession(session);
        allocation.setStatus(request.getOrDefault("status", "ALLOCATED"));

        return allocationRepository.save(allocation);
    }
}