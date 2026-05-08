package com.sessioneer.controller;

import com.sessioneer.model.Role;
import com.sessioneer.model.User;
import com.sessioneer.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/staff")
    public ResponseEntity<List<User>> getAllStaff() {
        return ResponseEntity.ok(userRepository.findByRole(Role.STAFF));
    }
}