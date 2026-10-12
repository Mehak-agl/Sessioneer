package com.sessioneer.dto;

import java.time.LocalDateTime;

public class NotificationDto {
    private Long id;
    private String type;
    private String title;
    private String message;
    private String unitCode;
    private boolean read;
    private LocalDateTime createdAt;

    public NotificationDto(Long id, String type, String title, String message, String unitCode,
                            boolean read, LocalDateTime createdAt) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.message = message;
        this.unitCode = unitCode;
        this.read = read;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public String getType() { return type; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public String getUnitCode() { return unitCode; }
    public boolean isRead() { return read; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}