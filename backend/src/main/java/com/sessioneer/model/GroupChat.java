package com.sessioneer.model;

import jakarta.persistence.*;

@Entity
@Table(name = "group_chats")
public class GroupChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String unitCode;

    @ManyToOne
    @JoinColumn(name = "creator_id")
    private User creator;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUnitCode() { return unitCode; }
    public void setUnitCode(String unitCode) { this.unitCode = unitCode; }
    public User getCreator() { return creator; }
    public void setCreator(User creator) { this.creator = creator; }

    @Column(name = "perm_send_text", columnDefinition = "boolean default true")
    private boolean permSendText = true;

    @Column(name = "perm_share_photo", columnDefinition = "boolean default true")
    private boolean permSharePhoto = true;

    @Column(name = "perm_share_file", columnDefinition = "boolean default true")
    private boolean permShareFile = true;

    @Column(name = "perm_share_document", columnDefinition = "boolean default true")
    private boolean permShareDocument = true;

    @Column(name = "perm_add_members", columnDefinition = "boolean default false")
    private boolean permAddMembers = false;

    public boolean isPermSendText() { return permSendText; }
    public void setPermSendText(boolean permSendText) { this.permSendText = permSendText; }
    public boolean isPermSharePhoto() { return permSharePhoto; }
    public void setPermSharePhoto(boolean permSharePhoto) { this.permSharePhoto = permSharePhoto; }
    public boolean isPermShareFile() { return permShareFile; }
    public void setPermShareFile(boolean permShareFile) { this.permShareFile = permShareFile; }
    public boolean isPermShareDocument() { return permShareDocument; }
    public void setPermShareDocument(boolean permShareDocument) { this.permShareDocument = permShareDocument; }
    public boolean isPermAddMembers() { return permAddMembers; }
    public void setPermAddMembers(boolean permAddMembers) { this.permAddMembers = permAddMembers; }
}