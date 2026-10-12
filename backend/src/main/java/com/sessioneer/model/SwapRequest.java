package com.sessioneer.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * A tutor handing off an allocated class (or a whole recurring series) to
 * another tutor on the same unit. No coordinator approval is needed — the
 * allocation moves over the moment the target tutor accepts.
 */
@Entity
@Table(name = "swap_requests")
public class SwapRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "unit_id")
    private Unit unit;

    @Enumerated(EnumType.STRING)
    private SwapScope scope;

    // The frontend already expands "whole series" into every individual
    // session id before sending this — backend just stores and reassigns
    // whichever ids it's given, regardless of scope.
    @ElementCollection
    @CollectionTable(name = "swap_request_sessions", joinColumns = @JoinColumn(name = "swap_request_id"))
    @Column(name = "session_id")
    private List<Long> sessionIds;

    @ManyToOne
    @JoinColumn(name = "requesting_staff_id")
    private User requestingStaff;

    @ManyToOne
    @JoinColumn(name = "target_staff_id")
    private User targetStaff;

    @Column(length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    private SwapRequestStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Unit getUnit() { return unit; }
    public void setUnit(Unit unit) { this.unit = unit; }
    public SwapScope getScope() { return scope; }
    public void setScope(SwapScope scope) { this.scope = scope; }
    public List<Long> getSessionIds() { return sessionIds; }
    public void setSessionIds(List<Long> sessionIds) { this.sessionIds = sessionIds; }
    public User getRequestingStaff() { return requestingStaff; }
    public void setRequestingStaff(User requestingStaff) { this.requestingStaff = requestingStaff; }
    public User getTargetStaff() { return targetStaff; }
    public void setTargetStaff(User targetStaff) { this.targetStaff = targetStaff; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public SwapRequestStatus getStatus() { return status; }
    public void setStatus(SwapRequestStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getRespondedAt() { return respondedAt; }
    public void setRespondedAt(LocalDateTime respondedAt) { this.respondedAt = respondedAt; }
}