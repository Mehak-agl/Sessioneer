package com.sessioneer.controller;

import com.sessioneer.dto.SessionRequest;
import com.sessioneer.model.Session;
import com.sessioneer.service.SessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/units/{unitId}/sessions")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping
    public ResponseEntity<Session> createSession(@PathVariable Long unitId,
                                                  @RequestBody SessionRequest request) {
        return ResponseEntity.ok(sessionService.createSession(unitId, request));
    }

    @GetMapping
    public ResponseEntity<List<Session>> getSessions(@PathVariable Long unitId) {
        return ResponseEntity.ok(sessionService.getSessionsByUnit(unitId));
    }
}