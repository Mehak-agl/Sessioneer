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

        Allocation allocation = new Allocation();
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
}