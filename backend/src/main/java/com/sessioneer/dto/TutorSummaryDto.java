package com.sessioneer.dto;

public class TutorSummaryDto {
    private Long id;
    private String fullName;
    private String email;
    private int unitCount;
    private long totalSessionsAllocated;
    private boolean hasResume;

    public TutorSummaryDto(Long id, String fullName, String email, int unitCount,
                            long totalSessionsAllocated, boolean hasResume) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.unitCount = unitCount;
        this.totalSessionsAllocated = totalSessionsAllocated;
        this.hasResume = hasResume;
    }

    public Long getId() { return id; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public int getUnitCount() { return unitCount; }
    public long getTotalSessionsAllocated() { return totalSessionsAllocated; }
    public boolean isHasResume() { return hasResume; }
}
