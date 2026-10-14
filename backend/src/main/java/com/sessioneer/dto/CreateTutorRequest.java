package com.sessioneer.dto;

public class CreateTutorRequest {
    private String fullName;
    private String email;
    private String temporaryPassword;
    // Optional — where to send the welcome email. If blank, falls back to `email`.
    private String sendEmailTo;

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTemporaryPassword() { return temporaryPassword; }
    public void setTemporaryPassword(String temporaryPassword) { this.temporaryPassword = temporaryPassword; }
    public String getSendEmailTo() { return sendEmailTo; }
    public void setSendEmailTo(String sendEmailTo) { this.sendEmailTo = sendEmailTo; }
}