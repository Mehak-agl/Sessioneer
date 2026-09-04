package com.sessioneer.service;

import com.sessioneer.dto.SessionRequest;
import com.sessioneer.model.Session;
import com.sessioneer.model.SessionStatus;
import com.sessioneer.model.Unit;
import com.sessioneer.repository.SessionRepository;
import com.sessioneer.repository.UnitRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SessionService {

    private final SessionRepository sessionRepository;
    private final UnitRepository unitRepository;

    public SessionService(SessionRepository sessionRepository, UnitRepository unitRepository) {
        this.sessionRepository = sessionRepository;
        this.unitRepository = unitRepository;
    }

    public Session createSession(Long unitId, SessionRequest request) {
        Unit unit = unitRepository.findById(unitId)
                .orElseThrow(() -> new RuntimeException("Unit not found"));

        Session session = new Session();
        session.setTitle(request.getTitle());
        session.setStartTime(request.getStartTime());
        session.setEndTime(request.getEndTime());
        session.setLocation(request.getLocation());
        session.setStatus(SessionStatus.PENDING);
        session.setUnit(unit);

        return sessionRepository.save(session);
    }

    public List<Session> getSessionsByUnit(Long unitId) {
        return sessionRepository.findByUnitId(unitId);
    }

    public Session setStaffUnavailable(Long sessionId, Long staffId, boolean unavailable) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (unavailable) {
            session.getUnavailableStaffIds().add(staffId);
        } else {
            session.getUnavailableStaffIds().remove(staffId);
        }

        return sessionRepository.save(session);
    }
}