package com.sessioneer.controller;

import com.sessioneer.dto.SwapStaffDto;
import com.sessioneer.model.InvitationStatus;
import com.sessioneer.model.UnitInvitation;
import com.sessioneer.model.User;
import com.sessioneer.repository.UnitInvitationRepository;
import com.sessioneer.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/units")
public class UnitTutorsController {

    private final UnitInvitationRepository unitInvitationRepository;
    private final UserRepository userRepository;

    public UnitTutorsController(UnitInvitationRepository unitInvitationRepository, UserRepository userRepository) {
        this.unitInvitationRepository = unitInvitationRepository;
        this.userRepository = userRepository;
    }

    // Other tutors already teaching this unit — the pool a tutor can hand
    // a class off to on the Emergency Swap page.
    @GetMapping("/{unitId}/tutors")
    public ResponseEntity<List<SwapStaffDto>> getUnitTutors(@PathVariable Long unitId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User me = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));

        List<SwapStaffDto> tutors = unitInvitationRepository.findByUnitId(unitId).stream()
                .filter(inv -> inv.getStatus() == InvitationStatus.RESPONDED)
                .map(UnitInvitation::getStaff)
                .filter(staff -> !staff.getId().equals(me.getId()))
                .map(staff -> new SwapStaffDto(staff.getId(), staff.getFullName(), staff.getEmail()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(tutors);
    }
}