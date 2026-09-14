package com.sessioneer.model;

import jakarta.persistence.*;

@Entity
@Table(name = "unit_invitations")
public class UnitInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "unit_id")
    private Unit unit;

    @ManyToOne
    @JoinColumn(name = "staff_id")
    private User staff;

    @Enumerated(EnumType.STRING)
    private InvitationStatus status;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Unit getUnit() { return unit; }
    public void setUnit(Unit unit) { this.unit = unit; }
    public User getStaff() { return staff; }
    public void setStaff(User staff) { this.staff = staff; }
    public InvitationStatus getStatus() { return status; }
    public void setStatus(InvitationStatus status) { this.status = status; }
}