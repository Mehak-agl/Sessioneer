package com.sessioneer.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "units")
public class Unit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String code;
    private String semester;

    @ManyToOne
    @JoinColumn(name = "coordinator_id")
    private User coordinator;

    @JsonIgnore
    @OneToMany(mappedBy = "unit", cascade = CascadeType.ALL)
    private List<Session> sessions;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getSemester() { return semester; }
    public void setSemester(String semester) { this.semester = semester; }
    public User getCoordinator() { return coordinator; }
    public void setCoordinator(User coordinator) { this.coordinator = coordinator; }
    public List<Session> getSessions() { return sessions; }
    public void setSessions(List<Session> sessions) { this.sessions = sessions; }

    private java.time.LocalDateTime availabilityDeadline;

    public java.time.LocalDateTime getAvailabilityDeadline() { return availabilityDeadline; }
    public void setAvailabilityDeadline(java.time.LocalDateTime availabilityDeadline) { this.availabilityDeadline = availabilityDeadline; }
}