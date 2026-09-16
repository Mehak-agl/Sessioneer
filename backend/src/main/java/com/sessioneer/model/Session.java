package com.sessioneer.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sessions")
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private LocalDateTime startTime;
    private String location;

    @Enumerated(EnumType.STRING)
    private SessionStatus status;

    @ManyToOne
    @JoinColumn(name = "unit_id")
    private Unit unit;

    @ElementCollection
    @CollectionTable(name = "session_unavailable_staff", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "staff_id")
    private java.util.Set<Long> unavailableStaffIds = new java.util.HashSet<>();

    public java.util.Set<Long> getUnavailableStaffIds() { return unavailableStaffIds; }
    public void setUnavailableStaffIds(java.util.Set<Long> unavailableStaffIds) { this.unavailableStaffIds = unavailableStaffIds; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public SessionStatus getStatus() { return status; }
    public void setStatus(SessionStatus status) { this.status = status; }
    public Unit getUnit() { return unit; }
    public void setUnit(Unit unit) { this.unit = unit; }
    private LocalDateTime endTime;

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
}