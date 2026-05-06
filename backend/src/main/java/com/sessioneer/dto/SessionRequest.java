package com.sessioneer.dto;

import java.time.LocalDateTime;

public class SessionRequest {
    private String title;
    private LocalDateTime startTime;
    private String location;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
}