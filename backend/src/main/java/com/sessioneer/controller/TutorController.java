package com.sessioneer.controller;

import com.sessioneer.entity.Tutor;
import com.sessioneer.repository.TutorRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tutors")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class TutorController {

    private final TutorRepository tutorRepository;

    public TutorController(TutorRepository tutorRepository) {
        this.tutorRepository = tutorRepository;
    }

    @GetMapping
    public List<Tutor> getAllTutors() {
        return tutorRepository.findAll();
    }

    @PostMapping
    public Tutor createTutor(@RequestBody Tutor tutor) {
        return tutorRepository.save(tutor);
    }
}