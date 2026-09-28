package com.sessioneer.dto;

public class GroupMessageRequest {
    private String content;

    private String fileName;
    private String fileType;
    private String fileData;

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }
    public String getFileData() { return fileData; }
    public void setFileData(String fileData) { this.fileData = fileData; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}