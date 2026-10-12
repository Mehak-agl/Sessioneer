package com.sessioneer.dto;

public class TutorUnitAssignmentDto {
    private Long unitId;
    private String code;
    private String name;
    private String semester;
    private String invitationStatus;
    private long sessionsAllocated;

    public TutorUnitAssignmentDto(Long unitId, String code, String name, String semester,
                                   String invitationStatus, long sessionsAllocated) {
        this.unitId = unitId;
        this.code = code;
        this.name = name;
        this.semester = semester;
        this.invitationStatus = invitationStatus;
        this.sessionsAllocated = sessionsAllocated;
    }

    public Long getUnitId() { return unitId; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getSemester() { return semester; }
    public String getInvitationStatus() { return invitationStatus; }
    public long getSessionsAllocated() { return sessionsAllocated; }
}
