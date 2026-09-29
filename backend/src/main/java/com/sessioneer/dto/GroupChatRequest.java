package com.sessioneer.dto;

import java.util.List;

public class GroupChatRequest {
    private String name;
    private String unitCode;
    private List<Long> memberIds;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUnitCode() { return unitCode; }
    public void setUnitCode(String unitCode) { this.unitCode = unitCode; }
    public List<Long> getMemberIds() { return memberIds; }
    public void setMemberIds(List<Long> memberIds) { this.memberIds = memberIds; }
}