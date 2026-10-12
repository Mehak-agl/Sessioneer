package com.sessioneer.dto;

import java.util.List;

public class SwapRequestCreateDto {
    private Long unitId;
    private String scope;
    private List<Long> sessionIds;
    private Long targetStaffId;
    private String reason;

    public Long getUnitId() { return unitId; }
    public void setUnitId(Long unitId) { this.unitId = unitId; }
    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }
    public List<Long> getSessionIds() { return sessionIds; }
    public void setSessionIds(List<Long> sessionIds) { this.sessionIds = sessionIds; }
    public Long getTargetStaffId() { return targetStaffId; }
    public void setTargetStaffId(Long targetStaffId) { this.targetStaffId = targetStaffId; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}