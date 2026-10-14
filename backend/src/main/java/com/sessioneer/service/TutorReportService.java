package com.sessioneer.service;

import com.sessioneer.dto.TutorReportProfileDto;
import com.sessioneer.dto.TutorSummaryDto;
import com.sessioneer.dto.TutorUnitAssignmentDto;
import com.sessioneer.model.Allocation;
import com.sessioneer.model.AllocationStatus;
import com.sessioneer.model.InvitationStatus;
import com.sessioneer.model.Role;
import com.sessioneer.model.Unit;
import com.sessioneer.model.UnitInvitation;
import com.sessioneer.model.User;
import com.sessioneer.repository.AllocationRepository;
import com.sessioneer.repository.UnitInvitationRepository;
import com.sessioneer.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Read-only reporting over sessional staff: their unit invitations and how
 * many sessions they've been confirmed for in each. Used by the
 * Coordinator's "Tutor Reports" screens.
 */
@Service
public class TutorReportService {

    private final UserRepository userRepository;
    private final UnitInvitationRepository unitInvitationRepository;
    private final AllocationRepository allocationRepository;

    public TutorReportService(UserRepository userRepository,
                               UnitInvitationRepository unitInvitationRepository,
                               AllocationRepository allocationRepository) {
        this.userRepository = userRepository;
        this.unitInvitationRepository = unitInvitationRepository;
        this.allocationRepository = allocationRepository;
    }

    public List<TutorSummaryDto> getAllTutors() {
        return userRepository.findByRole(Role.STAFF).stream()
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    public TutorReportProfileDto getTutorProfile(Long tutorId) {
        User tutor = userRepository.findById(tutorId)
                .orElseThrow(() -> new RuntimeException("Tutor not found"));

        List<UnitInvitation> invitations = unitInvitationRepository.findByStaffId(tutorId);
        List<Allocation> allocations = allocationRepository.findByStaffId(tutorId);

        List<TutorUnitAssignmentDto> units = invitations.stream()
                .map(inv -> {
                    Unit unit = inv.getUnit();
                    long sessionsInUnit = allocations.stream()
                            .filter(a -> a.getStatus() == AllocationStatus.CONFIRMED)
                            .filter(a -> a.getSession() != null && a.getSession().getUnit() != null
                                    && a.getSession().getUnit().getId().equals(unit.getId()))
                            .count();
                    return new TutorUnitAssignmentDto(
                            unit.getId(),
                            unit.getCode(),
                            unit.getName(),
                            unit.getSemester(),
                            inv.getStatus().name(),
                            sessionsInUnit
                    );
                })
                .collect(Collectors.toList());

        long totalSessionsAllocated = allocations.stream()
                .filter(a -> a.getStatus() == AllocationStatus.CONFIRMED)
                .count();

        long pendingInvitations = invitations.stream()
                .filter(inv -> inv.getStatus() == InvitationStatus.PENDING)
                .count();

        boolean hasResume = tutor.getResumeData() != null && !tutor.getResumeData().isEmpty();
        String resumeDataUrl = hasResume
                ? "data:" + safeType(tutor.getResumeType()) + ";base64," + tutor.getResumeData()
                : null;

        return new TutorReportProfileDto(
                tutor.getId(),
                tutor.getFullName(),
                tutor.getEmail(),
                tutor.getPhoto(),
                units,
                totalSessionsAllocated,
                pendingInvitations,
                hasResume,
                tutor.getResumeName(),
                resumeDataUrl
        );
    }

    private TutorSummaryDto toSummary(User tutor) {
        List<UnitInvitation> invitations = unitInvitationRepository.findByStaffId(tutor.getId());
        List<Allocation> allocations = allocationRepository.findByStaffId(tutor.getId());

        long totalSessionsAllocated = allocations.stream()
                .filter(a -> a.getStatus() == AllocationStatus.CONFIRMED)
                .count();

        boolean hasResume = tutor.getResumeData() != null && !tutor.getResumeData().isEmpty();

        return new TutorSummaryDto(
                tutor.getId(),
                tutor.getFullName(),
                tutor.getEmail(),
                invitations.size(),
                totalSessionsAllocated,
                hasResume
        );
    }

    private String safeType(String resumeType) {
        return resumeType != null && !resumeType.isEmpty() ? resumeType : "application/octet-stream";
    }
}
