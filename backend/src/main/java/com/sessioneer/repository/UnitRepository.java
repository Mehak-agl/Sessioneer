package com.sessioneer.repository;

import com.sessioneer.model.Unit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UnitRepository extends JpaRepository<Unit, Long> {
    List<Unit> findByCoordinatorId(Long coordinatorId);
}