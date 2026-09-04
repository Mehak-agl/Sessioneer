package com.sessioneer.service;

import com.sessioneer.model.*;
import com.sessioneer.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class UnitInvitationService {

    private final UnitInvitationRepository invitationRepository;
    private final UnitRepository unitRepository;
    private final UserRepository userRepository;

    public UnitInvitationService(UnitInvitationRepository invitationRepository,
                                  UnitRepository unitRepository,
                                  UserRepository userRepository) {
        this.invitationRepository = invitationRepository;
        this.unitRepository = unitRepository;
        this.userRepository = userRepository;
    }

    public UnitInvitation inviteStaff(Long unitId, Long staffId) {
        if (invitationRepository.findByUnitIdAndStaffId(unitId, staffId).isPresent()) {
            throw new RuntimeException("Already invited");
        }

        Unit unit = unitRepository.findById(unitId)
                .orElseThrow(() -> new RuntimeException("Unit not found"));
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Staff not found"));

        UnitInvitation invitation = new UnitInvitation();
        invitation.setUnit(unit);
        invitation.setStaff(staff);
        invitation.setStatus(InvitationStatus.PENDING);

        return invitationRepository.save(invitation);
    }

    public List<UnitInvitation> getInvitationsForUnit(Long unitId) {
        return invitationRepository.findByUnitId(unitId);
    }

    public List<UnitInvitation> getMyInvitations() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User staff = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return invitationRepository.findByStaffId(staff.getId());
    }

    public void removeInvitation(Long unitId, Long staffId) {
        invitationRepository.findByUnitIdAndStaffId(unitId, staffId)
                .ifPresent(invitationRepository::delete);
    }

    public UnitInvitation respondToInvitation(Long unitId, Long staffId) {
        UnitInvitation invitation = invitationRepository.findByUnitIdAndStaffId(unitId, staffId)
                .orElseThrow(() -> new RuntimeException("Invitation not found"));
        invitation.setStatus(InvitationStatus.RESPONDED);
        return invitationRepository.save(invitation);
    }

    public UnitInvitation acceptInvitation(Long unitId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User staff = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return respondToInvitation(unitId, staff.getId());
    }
}