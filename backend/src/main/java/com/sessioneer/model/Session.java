package com.sessioneer.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "sessions")
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String location;

    @Enumerated(EnumType.STRING)
    private SessionStatus status;

    @ManyToOne
    @JoinColumn(name = "unit_id")
    private Unit unit;

    // Staff flagged as unable to teach this specific dated occurrence
    // (see CoordinatorUnitDetailView's "Mark Unavailable" action).
    @ElementCollection
    @CollectionTable(name = "session_unavailable_staff", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "staff_id")
    private Set<Long> unavailableStaffIds = new HashSet<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public SessionStatus getStatus() { return status; }
    public void setStatus(SessionStatus status) { this.status = status; }
    public Unit getUnit() { return unit; }
    public void setUnit(Unit unit) { this.unit = unit; }
    public Set<Long> getUnavailableStaffIds() { return unavailableStaffIds; }
    public void setUnavailableStaffIds(Set<Long> unavailableStaffIds) { this.unavailableStaffIds = unavailableStaffIds; }
}