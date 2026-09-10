package com.sessioneer.dto;

public class AuthResponse {
    private Long userId;
    private String token;
    private String role;
    private String fullName;

    public AuthResponse(Long userId, String token, String role, String fullName) {
        this.userId = userId;
        this.token = token;
        this.role = role;
        this.fullName = fullName;
    }

    public Long getUserId() { return userId; }
    public String getToken() { return token; }
    public String getRole() { return role; }
    public String getFullName() { return fullName; }
}