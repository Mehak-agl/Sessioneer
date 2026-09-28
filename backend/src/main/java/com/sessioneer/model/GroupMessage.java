package com.sessioneer.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "group_messages")
public class GroupMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "group_id")
    private GroupChat group;

    @ManyToOne
    @JoinColumn(name = "sender_id")
    private User sender;

    private String content;
    private LocalDateTime sentAt;

    private String fileName;
    private String fileType;

    @Column(columnDefinition = "TEXT")
    private String fileData;

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }
    public String getFileData() { return fileData; }
    public void setFileData(String fileData) { this.fileData = fileData; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public GroupChat getGroup() { return group; }
    public void setGroup(GroupChat group) { this.group = group; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }
}