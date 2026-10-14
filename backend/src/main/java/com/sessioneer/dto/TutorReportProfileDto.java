package com.sessioneer.dto;

import java.util.List;

public class TutorReportProfileDto {
    private Long id;
    private String fullName;
    private String email;
    private String photo;
    private List<TutorUnitAssignmentDto> units;
    private long totalSessionsAllocated;
    private long pendingInvitations;
    private boolean hasResume;
    private String resumeFileName;
    private String resumeData;

    public TutorReportProfileDto(Long id, String fullName, String email, String photo, List<TutorUnitAssignmentDto> units,
                                  long totalSessionsAllocated, long pendingInvitations, boolean hasResume,
                                  String resumeFileName, String resumeData) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.photo = photo;
        this.units = units;
        this.totalSessionsAllocated = totalSessionsAllocated;
        this.pendingInvitations = pendingInvitations;
        this.hasResume = hasResume;
        this.resumeFileName = resumeFileName;
        this.resumeData = resumeData;
    }

    public Long getId() { return id; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public String getPhoto() { return photo; }
    public List<TutorUnitAssignmentDto> getUnits() { return units; }
    public long getTotalSessionsAllocated() { return totalSessionsAllocated; }
    public long getPendingInvitations() { return pendingInvitations; }
    public boolean isHasResume() { return hasResume; }
    public String getResumeFileName() { return resumeFileName; }
    public String getResumeData() { return resumeData; }
}
