package com.sessioneer.controller;

import com.sessioneer.model.UnitInvitation;
import com.sessioneer.service.UnitInvitationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class UnitInvitationController {

    private final UnitInvitationService invitationService;

    public UnitInvitationController(UnitInvitationService invitationService) {
        this.invitationService = invitationService;
    }

    @PostMapping("/units/{unitId}/invite/{staffId}")
    public ResponseEntity<UnitInvitation> invite(@PathVariable Long unitId,
                                                  @PathVariable Long staffId) {
        return ResponseEntity.ok(invitationService.inviteStaff(unitId, staffId));
    }

    @GetMapping("/units/{unitId}/invitations")
    public ResponseEntity<List<UnitInvitation>> getInvitationsForUnit(@PathVariable Long unitId) {
        return ResponseEntity.ok(invitationService.getInvitationsForUnit(unitId));
    }

    @GetMapping("/invitations/me")
    public ResponseEntity<List<UnitInvitation>> getMyInvitations() {
        return ResponseEntity.ok(invitationService.getMyInvitations());
    }

    @DeleteMapping("/units/{unitId}/invite/{staffId}")
    public ResponseEntity<Void> removeInvitation(@PathVariable Long unitId,
                                                  @PathVariable Long staffId) {
        invitationService.removeInvitation(unitId, staffId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/units/{unitId}/invite/{staffId}/respond")
    public ResponseEntity<UnitInvitation> respond(@PathVariable Long unitId, @PathVariable Long staffId) {
        return ResponseEntity.ok(invitationService.respondToInvitation(unitId, staffId));
    }
}