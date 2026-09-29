package com.sessioneer.service;

import com.sessioneer.dto.GroupChatRequest;
import com.sessioneer.dto.GroupMessageRequest;
import com.sessioneer.model.*;
import com.sessioneer.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class GroupChatService {

    private final GroupChatRepository groupChatRepository;
    private final GroupMembershipRepository membershipRepository;
    private final GroupMessageRepository messageRepository;
    private final UserRepository userRepository;

    public GroupChatService(GroupChatRepository groupChatRepository,
                            GroupMembershipRepository membershipRepository,
                            GroupMessageRepository messageRepository,
                            UserRepository userRepository) {
        this.groupChatRepository = groupChatRepository;
        this.membershipRepository = membershipRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public GroupChat createGroup(GroupChatRequest request) {
        User creator = getCurrentUser();

        GroupChat group = new GroupChat();
        group.setName(request.getName());
        group.setUnitCode(request.getUnitCode());
        group.setCreator(creator);
        groupChatRepository.save(group);

        GroupMembership creatorMembership = new GroupMembership();
        creatorMembership.setGroup(group);
        creatorMembership.setUser(creator);
        creatorMembership.setAdmin(true);
        membershipRepository.save(creatorMembership);

        if (request.getMemberIds() != null) {
            for (Long memberId : request.getMemberIds()) {
                User member = userRepository.findById(memberId).orElse(null);
                if (member != null) {
                    GroupMembership membership = new GroupMembership();
                    membership.setGroup(group);
                    membership.setUser(member);
                    membership.setAdmin(false);
                    membershipRepository.save(membership);
                }
            }
        }

        return group;
    }

    public List<GroupChat> getMyGroups() {
        User me = getCurrentUser();
        return groupChatRepository.findGroupsByUserId(me.getId());
    }

    public List<GroupMembership> getGroupMembers(Long groupId) {
        return membershipRepository.findByGroupId(groupId);
    }

    public GroupMessage sendMessage(Long groupId, GroupMessageRequest request) {
        User sender = getCurrentUser();
        GroupChat group = groupChatRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        GroupMessage message = new GroupMessage();
        message.setGroup(group);
        message.setSender(sender);
        message.setContent(request.getContent());
        message.setSentAt(LocalDateTime.now());
        message.setFileName(request.getFileName());
        message.setFileType(request.getFileType());
        message.setFileData(request.getFileData()); 

        return messageRepository.save(message);
    }

    public List<GroupMessage> getMessages(Long groupId) {
        return messageRepository.findByGroupIdOrderBySentAtAsc(groupId);
    }

    @Transactional
    public void addMember(Long groupId, Long userId) {
        GroupChat group = groupChatRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (membershipRepository.findByGroupIdAndUserId(groupId, userId).isEmpty()) {
            GroupMembership membership = new GroupMembership();
            membership.setGroup(group);
            membership.setUser(user);
            membership.setAdmin(false);
            membershipRepository.save(membership);
        }
    }

    @Transactional
    public void removeMember(Long groupId, Long userId) {
        membershipRepository.deleteByGroupIdAndUserId(groupId, userId);
    }

    public GroupChat renameGroup(Long groupId, String name) {
        GroupChat group = groupChatRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        group.setName(name);
        return groupChatRepository.save(group);
    }

    public GroupChat updatePermissions(Long groupId, Map<String, Boolean> permissions) {
        GroupChat group = groupChatRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        if (permissions.containsKey("sendText")) group.setPermSendText(permissions.get("sendText"));
        if (permissions.containsKey("sharePhoto")) group.setPermSharePhoto(permissions.get("sharePhoto"));
        if (permissions.containsKey("shareFile")) group.setPermShareFile(permissions.get("shareFile"));
        if (permissions.containsKey("shareDocument")) group.setPermShareDocument(permissions.get("shareDocument"));
        if (permissions.containsKey("addMembers")) group.setPermAddMembers(permissions.get("addMembers"));
        return groupChatRepository.save(group);
    }

    public void setAdmin(Long groupId, Long userId, boolean isAdmin) {
        GroupMembership membership = membershipRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new RuntimeException("Member not found"));
        membership.setAdmin(isAdmin);
        membershipRepository.save(membership);
    }

    public void updateAdminPermissions(Long groupId, Long userId, Map<String, Boolean> permissions) {
        GroupMembership membership = membershipRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new RuntimeException("Member not found"));
        if (permissions.containsKey("manageMembers")) membership.setAdminManageMembers(permissions.get("manageMembers"));
        if (permissions.containsKey("editGroupInfo")) membership.setAdminEditGroupInfo(permissions.get("editGroupInfo"));
        if (permissions.containsKey("manageMemberPermissions")) membership.setAdminManagePermissions(permissions.get("manageMemberPermissions"));
        membershipRepository.save(membership);
    }
}