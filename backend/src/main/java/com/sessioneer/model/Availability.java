package com.sessioneer.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "availability")
public class Availability {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "staff_id")
    private User staff;

    @ManyToOne
    @JoinColumn(name = "unit_id")
    private Unit unit;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getStaff() { return staff; }
    public void setStaff(User staff) { this.staff = staff; }
    public Unit getUnit() { return unit; }
    public void setUnit(Unit unit) { this.unit = unit; }
    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
}