package com.sessioneer.dto;

import java.time.LocalDateTime;
import java.util.List;

public class SwapRequestResponseDto {
    private Long id;
    private SwapUnitDto unit;
    private String scope;
    private List<SwapSessionDto> sessions;
    private SwapStaffDto requestingStaff;
    private SwapStaffDto targetStaff;
    private String reason;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;

    public SwapRequestResponseDto(Long id, SwapUnitDto unit, String scope, List<SwapSessionDto> sessions,
                                   SwapStaffDto requestingStaff, SwapStaffDto targetStaff, String reason,
                                   String status, LocalDateTime createdAt, LocalDateTime respondedAt) {
        this.id = id;
        this.unit = unit;
        this.scope = scope;
        this.sessions = sessions;
        this.requestingStaff = requestingStaff;
        this.targetStaff = targetStaff;
        this.reason = reason;
        this.status = status;
        this.createdAt = createdAt;
        this.respondedAt = respondedAt;
    }

    public Long getId() { return id; }
    public SwapUnitDto getUnit() { return unit; }
    public String getScope() { return scope; }
    public List<SwapSessionDto> getSessions() { return sessions; }
    public SwapStaffDto getRequestingStaff() { return requestingStaff; }
    public SwapStaffDto getTargetStaff() { return targetStaff; }
    public String getReason() { return reason; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getRespondedAt() { return respondedAt; }
}