package com.sessioneer.repository;

import com.sessioneer.entity.Allocation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AllocationRepository extends JpaRepository<Allocation, Long> {
}