package com.sessioneer.model;

import jakarta.persistence.*;

@Entity
@Table(name = "group_memberships")
public class GroupMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "group_id")
    private GroupChat group;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private boolean admin;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public GroupChat getGroup() { return group; }
    public void setGroup(GroupChat group) { this.group = group; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public boolean isAdmin() { return admin; }
    public void setAdmin(boolean admin) { this.admin = admin; }

    @Column(name = "admin_manage_members", columnDefinition = "boolean default true")
    private boolean adminManageMembers = true;

    @Column(name = "admin_edit_group_info", columnDefinition = "boolean default true")
    private boolean adminEditGroupInfo = true;

    @Column(name = "admin_manage_permissions", columnDefinition = "boolean default true")
    private boolean adminManagePermissions = true;

    public boolean isAdminManageMembers() { return adminManageMembers; }
    public void setAdminManageMembers(boolean adminManageMembers) { this.adminManageMembers = adminManageMembers; }
    public boolean isAdminEditGroupInfo() { return adminEditGroupInfo; }
    public void setAdminEditGroupInfo(boolean adminEditGroupInfo) { this.adminEditGroupInfo = adminEditGroupInfo; }
    public boolean isAdminManagePermissions() { return adminManagePermissions; }
    public void setAdminManagePermissions(boolean adminManagePermissions) { this.adminManagePermissions = adminManagePermissions; }
}