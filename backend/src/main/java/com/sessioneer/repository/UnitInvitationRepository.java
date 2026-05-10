package com.sessioneer.repository;

import com.sessioneer.model.UnitInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UnitInvitationRepository extends JpaRepository<UnitInvitation, Long> {
    List<UnitInvitation> findByUnitId(Long unitId);
    List<UnitInvitation> findByStaffId(Long staffId);
    Optional<UnitInvitation> findByUnitIdAndStaffId(Long unitId, Long staffId);
}