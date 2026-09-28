package com.sessioneer.service;

import com.sessioneer.dto.AllocationRequest;
import com.sessioneer.model.Allocation;
import com.sessioneer.model.AllocationStatus;
import com.sessioneer.model.Session;
import com.sessioneer.model.SessionStatus;
import com.sessioneer.model.User;
import com.sessioneer.repository.AllocationRepository;
import com.sessioneer.repository.SessionRepository;
import com.sessioneer.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AllocationService {

    private final AllocationRepository allocationRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;

    public AllocationService(AllocationRepository allocationRepository,
                             SessionRepository sessionRepository,
                             UserRepository userRepository) {
        this.allocationRepository = allocationRepository;
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
    }

    public Allocation allocate(AllocationRequest request) {
        Session session = sessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new RuntimeException("Session not found"));

        User staff = userRepository.findById(request.getStaffId())
                .orElseThrow(() -> new RuntimeException("Staff not found"));

        session.setStatus(SessionStatus.ALLOCATED);
        sessionRepository.save(session);

        List<Allocation> existing = allocationRepository.findBySessionId(session.getId());
        Allocation allocation = existing.isEmpty() ? new Allocation() : existing.get(0);
        // Clean up any leftover duplicate rows from before this was an upsert.
        for (int i = 1; i < existing.size(); i++) {
            allocationRepository.delete(existing.get(i));
        };
        allocation.setSession(session);
        allocation.setStaff(staff);
        allocation.setStatus(AllocationStatus.PROPOSED);

        return allocationRepository.save(allocation);
    }

    public List<Allocation> getAllocationsByUnit(Long unitId) {
        return allocationRepository.findBySessionUnitId(unitId);
    }

    public List<Allocation> getAllocationsByStaff(Long staffId) {
        return allocationRepository.findByStaffId(staffId);
    }

    public Allocation selfAssign(Long sessionId, String coordinatorName) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        
        String email = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        User coordinator = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        session.setStatus(SessionStatus.ALLOCATED);
        sessionRepository.save(session);
        
        List<Allocation> existing = allocationRepository.findBySessionId(session.getId());
        Allocation allocation = existing.isEmpty() ? new Allocation() : existing.get(0);
        for (int i = 1; i < existing.size(); i++) {
            allocationRepository.delete(existing.get(i));
        }
        allocation.setSession(session);
        allocation.setStaff(coordinator);
        allocation.setStatus(AllocationStatus.CONFIRMED);
        return allocationRepository.save(allocation);
    }
}