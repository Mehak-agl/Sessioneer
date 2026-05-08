package com.sessioneer.controller;

import com.sessioneer.entity.Availability;
import com.sessioneer.entity.Tutor;
import com.sessioneer.repository.AvailabilityRepository;
import com.sessioneer.repository.TutorRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/availability")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class AvailabilityController {

    private final AvailabilityRepository availabilityRepository;
    private final TutorRepository tutorRepository;

    public AvailabilityController(
            AvailabilityRepository availabilityRepository,
            TutorRepository tutorRepository
    ) {
        this.availabilityRepository = availabilityRepository;
        this.tutorRepository = tutorRepository;
    }

    @GetMapping
    public List<Availability> getAllAvailability() {
        return availabilityRepository.findAll();
    }

    @PostMapping
    public Availability createAvailability(@RequestBody Map<String, String> request) {
        Long tutorId = Long.parseLong(request.get("tutorId"));

        Tutor tutor = tutorRepository.findById(tutorId)
                .orElseThrow(() -> new RuntimeException("Tutor not found"));

        Availability availability = new Availability();
        availability.setDayOfWeek(request.get("dayOfWeek"));
        availability.setStartTime(java.time.LocalTime.parse(request.get("startTime")));
        availability.setEndTime(java.time.LocalTime.parse(request.get("endTime")));
        availability.setTutor(tutor);

        return availabilityRepository.save(availability);
    }
}