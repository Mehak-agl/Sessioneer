package com.sessioneer.service;

import com.sessioneer.dto.UnitRequest;
import com.sessioneer.model.Unit;
import com.sessioneer.model.User;
import com.sessioneer.repository.UnitRepository;
import com.sessioneer.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UnitService {

    private final UnitRepository unitRepository;
    private final UserRepository userRepository;

    public UnitService(UnitRepository unitRepository, UserRepository userRepository) {
        this.unitRepository = unitRepository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public Unit createUnit(UnitRequest request) {
        User coordinator = getCurrentUser();
        Unit unit = new Unit();
        unit.setName(request.getName());
        unit.setCode(request.getCode());
        unit.setSemester(request.getSemester());
        unit.setCoordinator(coordinator);
        return unitRepository.save(unit);
    }

    public List<Unit> getMyUnits() {
        User coordinator = getCurrentUser();
        return unitRepository.findByCoordinatorId(coordinator.getId());
    }
}