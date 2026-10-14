package com.sessioneer.repository;

import com.sessioneer.model.SwapRequest;
import com.sessioneer.model.SwapRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SwapRequestRepository extends JpaRepository<SwapRequest, Long> {
    List<SwapRequest> findByRequestingStaffId(Long staffId);
    List<SwapRequest> findByTargetStaffId(Long staffId);
    List<SwapRequest> findByRequestingStaffIdAndStatus(Long staffId, SwapRequestStatus status);
}