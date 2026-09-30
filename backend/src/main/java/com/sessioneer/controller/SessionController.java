package com.sessioneer.controller;

import com.sessioneer.dto.SessionRequest;
import com.sessioneer.model.Session;
import com.sessioneer.service.SessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Void> deleteSession(@PathVariable Long sessionId) {
        sessionService.deleteSession(sessionId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{sessionId}")
    public ResponseEntity<Session> updateSession(@PathVariable Long sessionId,
                                                @RequestBody SessionRequest request) {
        return ResponseEntity.ok(sessionService.updateSession(sessionId, request));
    }

    @PutMapping("/{sessionId}/status")
    public ResponseEntity<Session> updateStatus(@PathVariable Long sessionId,
                                                @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(sessionService.updateStatus(sessionId, body.get("status")));
    }
}