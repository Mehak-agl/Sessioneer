package com.sessioneer.service;

import com.sessioneer.dto.MessageRequest;
import com.sessioneer.model.Message;
import com.sessioneer.model.User;
import com.sessioneer.repository.MessageRepository;
import com.sessioneer.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public MessageService(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public Message sendMessage(MessageRequest request) {
        User sender = getCurrentUser();
        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(request.getContent());
        message.setSentAt(LocalDateTime.now());
        message.setFileName(request.getFileName());
        message.setFileType(request.getFileType());
        message.setFileData(request.getFileData());

        return messageRepository.save(message);
    }

    public List<Message> getConversation(Long otherId) {
        User me = getCurrentUser();
        return messageRepository.findConversation(me.getId(), otherId);
    }

    public List<com.sessioneer.model.User> getConversationPartners() {
        User me = getCurrentUser();
        return messageRepository.findConversationPartners(me.getId());
    }
}