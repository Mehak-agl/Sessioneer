package com.sessioneer.controller;

import com.sessioneer.dto.MessageRequest;
import com.sessioneer.model.Message;
import com.sessioneer.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping
    public ResponseEntity<Message> sendMessage(@RequestBody MessageRequest request) {
        return ResponseEntity.ok(messageService.sendMessage(request));
    }

    @GetMapping("/with/{userId}")
    public ResponseEntity<List<Message>> getConversation(@PathVariable Long userId) {
        return ResponseEntity.ok(messageService.getConversation(userId));
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<com.sessioneer.model.User>> getConversations() {
        return ResponseEntity.ok(messageService.getConversationPartners());
    }
}