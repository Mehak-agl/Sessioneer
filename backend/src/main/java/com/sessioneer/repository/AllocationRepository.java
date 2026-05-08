package com.sessioneer.repository;

import com.sessioneer.model.Allocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AllocationRepository extends JpaRepository<Allocation, Long> {
    List<Allocation> findBySessionUnitId(Long unitId);
    List<Allocation> findByStaffId(Long staffId);
}