package com.sessioneer.controller;

import com.sessioneer.dto.UnavailabilityRequest;
import com.sessioneer.model.Session;
import com.sessioneer.service.SessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sessions")
public class SessionAvailabilityController {

    private final SessionService sessionService;

    public SessionAvailabilityController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping("/{sessionId}/unavailable/{staffId}")
    public ResponseEntity<Session> setStaffUnavailable(@PathVariable Long sessionId,
                                                         @PathVariable Long staffId,
                                                         @RequestBody UnavailabilityRequest request) {
        return ResponseEntity.ok(sessionService.setStaffUnavailable(sessionId, staffId, request.isUnavailable()));
    }
}
