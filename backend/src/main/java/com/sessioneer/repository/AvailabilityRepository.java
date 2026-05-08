package com.sessioneer.repository;

import com.sessioneer.model.Availability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AvailabilityRepository extends JpaRepository<Availability, Long> {
    List<Availability> findByUnitId(Long unitId);
    List<Availability> findByStaffId(Long staffId);
}