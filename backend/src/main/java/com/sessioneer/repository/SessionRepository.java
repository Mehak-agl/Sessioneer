package com.sessioneer.repository;

import com.sessioneer.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SessionRepository extends JpaRepository<Session, Long> {
    List<Session> findByUnitId(Long unitId);
}