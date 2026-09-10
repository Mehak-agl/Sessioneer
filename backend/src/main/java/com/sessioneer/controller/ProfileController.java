package com.sessioneer.controller;

import com.sessioneer.model.User;
import com.sessioneer.service.ProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ResponseEntity<User> getProfile() {
        return ResponseEntity.ok(profileService.getProfile());
    }

    @PutMapping("/photo")
    public ResponseEntity<User> updatePhoto(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(profileService.updatePhoto(body.get("photo")));
    }

    @PutMapping("/resume")
    public ResponseEntity<User> updateResume(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(profileService.updateResume(
            body.get("resumeName"),
            body.get("resumeData"),
            body.get("resumeType")
        ));
    }

    @PutMapping("/password")
    public ResponseEntity<String> changePassword(@RequestBody Map<String, String> body) {
        try {
            String result = profileService.changePassword(
                body.get("currentPassword"),
                body.get("newPassword")
            );
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}