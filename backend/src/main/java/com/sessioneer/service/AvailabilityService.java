package com.sessioneer.service;

import com.sessioneer.dto.AvailabilityRequest;
import com.sessioneer.model.Availability;
import com.sessioneer.model.Unit;
import com.sessioneer.model.User;
import com.sessioneer.repository.AvailabilityRepository;
import com.sessioneer.repository.UnitRepository;
import com.sessioneer.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AvailabilityService {

    private final AvailabilityRepository availabilityRepository;
    private final UnitRepository unitRepository;
    private final UserRepository userRepository;

    public AvailabilityService(AvailabilityRepository availabilityRepository,
                                UnitRepository unitRepository,
                                UserRepository userRepository) {
        this.availabilityRepository = availabilityRepository;
        this.unitRepository = unitRepository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public Availability submitAvailability(AvailabilityRequest request) {
        User staff = getCurrentUser();
        Unit unit = unitRepository.findById(request.getUnitId())
                .orElseThrow(() -> new RuntimeException("Unit not found"));

        Availability availability = new Availability();
        availability.setStaff(staff);
        availability.setUnit(unit);
        availability.setStartTime(request.getStartTime());
        availability.setEndTime(request.getEndTime());

        return availabilityRepository.save(availability);
    }

    public List<Availability> getAvailabilityForUnit(Long unitId) {
        return availabilityRepository.findByUnitId(unitId);
    }

    public List<Availability> getMyAvailability() {
        User staff = getCurrentUser();
        return availabilityRepository.findByStaffId(staff.getId());
    }
}