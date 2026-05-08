package com.sessioneer.controller;

import com.sessioneer.entity.CoordinatorAccount;
import com.sessioneer.repository.CoordinatorAccountRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/coordinators")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class CoordinatorAccountController {

    private final CoordinatorAccountRepository coordinatorAccountRepository;

    public CoordinatorAccountController(CoordinatorAccountRepository coordinatorAccountRepository) {
        this.coordinatorAccountRepository = coordinatorAccountRepository;
    }

    @GetMapping
    public List<CoordinatorAccount> getAllCoordinators() {
        return coordinatorAccountRepository.findAll();
    }

    @PostMapping("/register")
    public Map<String, Object> registerCoordinator(@RequestBody CoordinatorAccount coordinatorAccount) {
        Optional<CoordinatorAccount> existingUser =
                coordinatorAccountRepository.findByEmail(coordinatorAccount.getEmail());

        if (existingUser.isPresent()) {
            return Map.of(
                    "success", false,
                    "message", "Email already exists"
            );
        }

        coordinatorAccount.setRole("COORDINATOR");
        CoordinatorAccount savedCoordinator = coordinatorAccountRepository.save(coordinatorAccount);

        return Map.of(
                "success", true,
                "message", "Coordinator registered successfully",
                "coordinator", savedCoordinator
        );
    }

    @PostMapping("/login")
    public Map<String, Object> loginCoordinator(@RequestBody CoordinatorAccount loginRequest) {
        Optional<CoordinatorAccount> existingUser =
                coordinatorAccountRepository.findByEmail(loginRequest.getEmail());

        if (existingUser.isEmpty()) {
            return Map.of(
                    "success", false,
                    "message", "No account found with this email"
            );
        }

        CoordinatorAccount coordinator = existingUser.get();

        if (!coordinator.getPassword().equals(loginRequest.getPassword())) {
            return Map.of(
                    "success", false,
                    "message", "Incorrect password"
            );
        }

        return Map.of(
                "success", true,
                "message", "Login successful",
                "coordinator", coordinator
        );
    }
}