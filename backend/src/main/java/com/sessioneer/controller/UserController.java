package com.sessioneer.controller;

import com.sessioneer.dto.CreateTutorRequest;
import com.sessioneer.model.Role;
import com.sessioneer.model.User;
import com.sessioneer.repository.UserRepository;
import com.sessioneer.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;

    public UserController(UserRepository userRepository, AuthService authService) {
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @GetMapping("/staff")
    public ResponseEntity<List<User>> getAllStaff() {
        return ResponseEntity.ok(userRepository.findByRole(Role.STAFF));
    }

    @PostMapping("/create-tutor")
    public ResponseEntity<User> createTutor(@RequestBody CreateTutorRequest request) {
        return ResponseEntity.ok(authService.createTutorAccount(request));
    }

    @GetMapping("/created-tutors")
    public ResponseEntity<List<User>> getCreatedTutors() {
        return ResponseEntity.ok(userRepository.findByCoordinatorCreatedTrue());
    }
}