package com.sessioneer.controller;

import com.sessioneer.service.SessionService;
import com.sessioneer.model.Session;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
public class SessionStatusController {

    private final SessionService sessionService;

    public SessionStatusController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PutMapping("/{sessionId}/status")
    public ResponseEntity<Session> updateStatus(@PathVariable Long sessionId,
                                                 @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(sessionService.updateStatus(sessionId, body.get("status")));
    }

    /***@DeleteMapping("/{sessionId}")
    public ResponseEntity<Void> deleteSession(@PathVariable Long sessionId) {
        sessionService.deleteSession(sessionId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{sessionId}")
    public ResponseEntity<Session> updateSession(@PathVariable Long sessionId,
                                                  @RequestBody com.sessioneer.dto.SessionRequest request) {
        return ResponseEntity.ok(sessionService.updateSession(sessionId, request));
    }***/

    @PostMapping("/{sessionId}/unavailable/{staffId}")
    public ResponseEntity<Session> markUnavailable(@PathVariable Long sessionId,
                                                    @PathVariable Long staffId,
                                                    @RequestBody Map<String, Boolean> body) {
        return ResponseEntity.ok(sessionService.markStaffUnavailable(sessionId, staffId, body.get("unavailable")));
    }
}