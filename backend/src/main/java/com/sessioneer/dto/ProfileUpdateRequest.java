package com.sessioneer.dto;

public class ProfileUpdateRequest {
    private String photo;
    private String resumeName;
    private String resumeData;
    private String resumeType;
    private String currentPassword;
    private String newPassword;

    public String getPhoto() { return photo; }
    public void setPhoto(String photo) { this.photo = photo; }
    public String getResumeName() { return resumeName; }
    public void setResumeName(String resumeName) { this.resumeName = resumeName; }
    public String getResumeData() { return resumeData; }
    public void setResumeData(String resumeData) { this.resumeData = resumeData; }
    public String getResumeType() { return resumeType; }
    public void setResumeType(String resumeType) { this.resumeType = resumeType; }
    public String getCurrentPassword() { return currentPassword; }
    public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}