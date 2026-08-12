package com.sessioneer.dto;

import java.time.LocalDateTime;

public class AvailabilityRequest {
    private Long unitId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    public Long getUnitId() { return unitId; }
    public void setUnitId(Long unitId) { this.unitId = unitId; }
    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
}