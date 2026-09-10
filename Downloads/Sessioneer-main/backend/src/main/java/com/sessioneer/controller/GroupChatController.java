package com.sessioneer.controller;

import com.sessioneer.dto.GroupChatRequest;
import com.sessioneer.dto.GroupMessageRequest;
import com.sessioneer.model.*;
import com.sessioneer.service.GroupChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
public class GroupChatController {

    private final GroupChatService groupChatService;

    public GroupChatController(GroupChatService groupChatService) {
        this.groupChatService = groupChatService;
    }

    @PostMapping
    public ResponseEntity<GroupChat> createGroup(@RequestBody GroupChatRequest request) {
        return ResponseEntity.ok(groupChatService.createGroup(request));
    }

    @GetMapping
    public ResponseEntity<List<GroupChat>> getMyGroups() {
        return ResponseEntity.ok(groupChatService.getMyGroups());
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<List<GroupMembership>> getMembers(@PathVariable Long groupId) {
        return ResponseEntity.ok(groupChatService.getGroupMembers(groupId));
    }

    @PostMapping("/{groupId}/messages")
    public ResponseEntity<GroupMessage> sendMessage(@PathVariable Long groupId,
                                                     @RequestBody GroupMessageRequest request) {
        return ResponseEntity.ok(groupChatService.sendMessage(groupId, request));
    }

    @GetMapping("/{groupId}/messages")
    public ResponseEntity<List<GroupMessage>> getMessages(@PathVariable Long groupId) {
        return ResponseEntity.ok(groupChatService.getMessages(groupId));
    }

    @PostMapping("/{groupId}/members/{userId}")
    public ResponseEntity<Void> addMember(@PathVariable Long groupId, @PathVariable Long userId) {
        groupChatService.addMember(groupId, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long groupId, @PathVariable Long userId) {
        groupChatService.removeMember(groupId, userId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{groupId}/name")
    public ResponseEntity<GroupChat> renameGroup(@PathVariable Long groupId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(groupChatService.renameGroup(groupId, body.get("name")));
    }

    @PutMapping("/{groupId}/permissions")
    public ResponseEntity<GroupChat> updatePermissions(@PathVariable Long groupId, @RequestBody Map<String, Boolean> permissions) {
        return ResponseEntity.ok(groupChatService.updatePermissions(groupId, permissions));
    }

    @PutMapping("/{groupId}/members/{userId}/admin")
    public ResponseEntity<Void> setAdmin(@PathVariable Long groupId, @PathVariable Long userId, @RequestBody Map<String, Boolean> body) {
        groupChatService.setAdmin(groupId, userId, body.get("isAdmin"));
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{groupId}/members/{userId}/admin-permissions")
    public ResponseEntity<Void> updateAdminPermissions(@PathVariable Long groupId, @PathVariable Long userId, @RequestBody Map<String, Boolean> permissions) {
        groupChatService.updateAdminPermissions(groupId, userId, permissions);
        return ResponseEntity.ok().build();
    }
}