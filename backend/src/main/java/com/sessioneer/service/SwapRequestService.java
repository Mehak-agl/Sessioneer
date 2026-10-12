package com.sessioneer.service;

import com.sessioneer.dto.*;
import com.sessioneer.model.*;
import com.sessioneer.repository.AllocationRepository;
import com.sessioneer.repository.SessionRepository;
import com.sessioneer.repository.SwapRequestRepository;
import com.sessioneer.repository.UnitRepository;
import com.sessioneer.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SwapRequestService {

    private final SwapRequestRepository swapRequestRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final AllocationRepository allocationRepository;
    private final UnitRepository unitRepository;
    private final NotificationService notificationService;

    public SwapRequestService(SwapRequestRepository swapRequestRepository,
                               SessionRepository sessionRepository,
                               UserRepository userRepository,
                               AllocationRepository allocationRepository,
                               UnitRepository unitRepository,
                               NotificationService notificationService) {
        this.swapRequestRepository = swapRequestRepository;
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.allocationRepository = allocationRepository;
        this.unitRepository = unitRepository;
        this.notificationService = notificationService;
    }

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public SwapMySwapsDto getMySwaps() {
        Long myId = currentUser().getId();
        Comparator<SwapRequest> byRecentDesc = Comparator.comparing(SwapRequest::getCreatedAt).reversed();

        List<SwapRequestResponseDto> outgoing = swapRequestRepository.findByRequestingStaffId(myId)
                .stream().sorted(byRecentDesc).map(this::toDto).collect(Collectors.toList());
        List<SwapRequestResponseDto> incoming = swapRequestRepository.findByTargetStaffId(myId)
                .stream().sorted(byRecentDesc).map(this::toDto).collect(Collectors.toList());

        return new SwapMySwapsDto(outgoing, incoming);
    }

    public SwapRequestResponseDto createSwapRequest(SwapRequestCreateDto dto) {
        User requester = currentUser();

        if (dto.getSessionIds() == null || dto.getSessionIds().isEmpty()) {
            throw new RuntimeException("No classes selected for this swap.");
        }
        Unit unit = unitRepository.findById(dto.getUnitId())
                .orElseThrow(() -> new RuntimeException("Unit not found"));

        if (dto.getTargetStaffId() == null || dto.getTargetStaffId().equals(requester.getId())) {
            throw new RuntimeException("You cannot swap with yourself.");
        }
        User target = userRepository.findById(dto.getTargetStaffId())
                .filter(u -> u.getRole() == Role.STAFF)
                .orElseThrow(() -> new RuntimeException("Selected tutor not found."));

        // Every session must currently be allocated to the requesting tutor.
        boolean notMine = dto.getSessionIds().stream().anyMatch(
                sid -> allocationRepository.findBySessionIdAndStaffId(sid, requester.getId()).isEmpty()
        );
        if (notMine) {
            throw new RuntimeException("One or more of these classes are not currently allocated to you.");
        }

        boolean alreadyPending = swapRequestRepository
                .findByRequestingStaffIdAndStatus(requester.getId(), SwapRequestStatus.PENDING)
                .stream()
                .anyMatch(r -> r.getSessionIds().stream().anyMatch(dto.getSessionIds()::contains));
        if (alreadyPending) {
            throw new RuntimeException("You already have a pending swap request covering one of these classes.");
        }

        SwapRequest swapRequest = new SwapRequest();
        swapRequest.setUnit(unit);
        swapRequest.setScope("SERIES".equals(dto.getScope()) ? SwapScope.SERIES : SwapScope.SESSION);
        swapRequest.setSessionIds(dto.getSessionIds());
        swapRequest.setRequestingStaff(requester);
        swapRequest.setTargetStaff(target);
        swapRequest.setReason(dto.getReason());
        swapRequest.setStatus(SwapRequestStatus.PENDING);
        swapRequest.setCreatedAt(LocalDateTime.now());

        swapRequestRepository.save(swapRequest);

        notificationService.notify(target, unit, "SWAP_REQUEST", "Emergency Swap Request",
                requester.getFullName() + " is asking you to cover " +
                (swapRequest.getScope() == SwapScope.SERIES ? "a whole recurring session" : "a class") +
                " in " + unit.getCode() + (dto.getReason() != null && !dto.getReason().isBlank() ? " (reason: " + dto.getReason() + ")" : "") + ".");

        return toDto(swapRequest);
    }

    public SwapRequestResponseDto respondToSwapRequest(Long requestId, boolean accept) {
        User responder = currentUser();
        SwapRequest req = swapRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Swap request not found"));

        if (!req.getTargetStaff().getId().equals(responder.getId())) {
            throw new RuntimeException("Only the tutor asked to cover this can respond.");
        }
        if (req.getStatus() != SwapRequestStatus.PENDING) {
            throw new RuntimeException("This request has already been responded to.");
        }

        req.setStatus(accept ? SwapRequestStatus.ACCEPTED : SwapRequestStatus.DECLINED);
        req.setRespondedAt(LocalDateTime.now());

        if (accept) {
            for (Long sessionId : req.getSessionIds()) {
                allocationRepository.findBySessionIdAndStaffId(sessionId, req.getRequestingStaff().getId())
                        .ifPresent(allocation -> {
                            allocation.setStaff(req.getTargetStaff());
                            allocation.setStatus(AllocationStatus.CONFIRMED);
                            allocationRepository.save(allocation);
                        });
                // If a session was already reassigned elsewhere (e.g. by the
                // coordinator) since this request was raised, it's simply
                // skipped — this swap no longer applies to it.
            }
        }

        swapRequestRepository.save(req);

        notificationService.notify(req.getRequestingStaff(), req.getUnit(),
                "SWAP_RESPONSE",
                accept ? "Swap Request Accepted" : "Swap Request Declined",
                req.getTargetStaff().getFullName() + " " + (accept ? "accepted" : "declined") +
                " your swap request for " + req.getUnit().getCode() + ".");

        if (accept && req.getUnit().getCoordinator() != null) {
            notificationService.notify(req.getUnit().getCoordinator(), req.getUnit(),
                    "SWAP_FYI", "Emergency Swap Completed",
                    req.getRequestingStaff().getFullName() + " handed off a class in " +
                    req.getUnit().getCode() + " to " + req.getTargetStaff().getFullName() +
                    ". This is for your information only — no action needed.");
        }

        return toDto(req);
    }

    private SwapRequestResponseDto toDto(SwapRequest r) {
        List<Session> sessions = sessionRepository.findAllById(r.getSessionIds());
        List<SwapSessionDto> sessionDtos = sessions.stream()
                .map(s -> new SwapSessionDto(s.getId(), s.getTitle(), s.getStartTime(), s.getEndTime(), s.getLocation()))
                .collect(Collectors.toList());

        SwapUnitDto unitDto = new SwapUnitDto(r.getUnit().getId(), r.getUnit().getCode(), r.getUnit().getName());
        SwapStaffDto requestingDto = new SwapStaffDto(r.getRequestingStaff().getId(), r.getRequestingStaff().getFullName(), r.getRequestingStaff().getEmail());
        SwapStaffDto targetDto = new SwapStaffDto(r.getTargetStaff().getId(), r.getTargetStaff().getFullName(), r.getTargetStaff().getEmail());

        return new SwapRequestResponseDto(
                r.getId(), unitDto, r.getScope().name(), sessionDtos,
                requestingDto, targetDto, r.getReason(), r.getStatus().name(),
                r.getCreatedAt(), r.getRespondedAt()
        );
    }
}