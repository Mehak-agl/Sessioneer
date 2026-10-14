package com.sessioneer.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fullName;

    @Column(unique = true)
    private String email;

    @JsonIgnore
    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    // Set true only for accounts created via the Coordinator "Create Account"
    // flow (CoordinatorTutors.tsx) — lets us list just those, separately from
    // tutors who signed themselves up the old way.
    private boolean coordinatorCreated = false;

    // Whether the welcome email with login credentials actually sent
    // successfully (EmailService.send() reports this back honestly).
    private boolean credentialsEmailSent = false;

    private java.time.LocalDateTime createdAt;

    public boolean isCoordinatorCreated() { return coordinatorCreated; }
    public void setCoordinatorCreated(boolean coordinatorCreated) { this.coordinatorCreated = coordinatorCreated; }
    public boolean isCredentialsEmailSent() { return credentialsEmailSent; }
    public void setCredentialsEmailSent(boolean credentialsEmailSent) { this.credentialsEmailSent = credentialsEmailSent; }
    public java.time.LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(java.time.LocalDateTime createdAt) { this.createdAt = createdAt; }

    
    private String notificationEmail;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public String getNotificationEmail() { return notificationEmail; }
    public void setNotificationEmail(String notificationEmail) { this.notificationEmail = notificationEmail; }

    @Column(columnDefinition = "TEXT")
    private String photo;

    private String resumeName;

    @Column(columnDefinition = "TEXT")
    private String resumeData;

    private String resumeType;

    public String getPhoto() { return photo; }
    public void setPhoto(String photo) { this.photo = photo; }
    public String getResumeName() { return resumeName; }
    public void setResumeName(String resumeName) { this.resumeName = resumeName; }
    public String getResumeData() { return resumeData; }
    public void setResumeData(String resumeData) { this.resumeData = resumeData; }
    public String getResumeType() { return resumeType; }
    public void setResumeType(String resumeType) { this.resumeType = resumeType; }
}