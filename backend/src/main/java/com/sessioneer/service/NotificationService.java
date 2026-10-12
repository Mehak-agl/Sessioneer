package com.sessioneer.service;

import com.sessioneer.dto.NotificationDto;
import com.sessioneer.model.Notification;
import com.sessioneer.model.Unit;
import com.sessioneer.model.User;
import com.sessioneer.repository.NotificationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    public NotificationService(NotificationRepository notificationRepository, EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.emailService = emailService;
    }

    // The single entry point every other service calls. Saves the
    // in-app notification AND emails the recipient — the two are meant
    // to always travel together per the brief ("sends a notification
    // and an email of the notification").
    public void notify(User recipient, Unit unit, String type, String title, String message) {
        Notification n = new Notification();
        n.setRecipient(recipient);
        n.setUnit(unit);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setRead(false);
        n.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(n);

        if (recipient.getEmail() != null && !recipient.getEmail().isBlank()) {
            emailService.send(recipient.getEmail(), title, message);
        }
    }

    public List<NotificationDto> getMyNotifications(Long userId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId).stream()
                .map(n -> new NotificationDto(
                        n.getId(), n.getType(), n.getTitle(), n.getMessage(),
                        n.getUnit() != null ? n.getUnit().getCode() : null,
                        n.isRead(), n.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    public void markRead(Long id, Long userId) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (!n.getRecipient().getId().equals(userId)) {
            throw new RuntimeException("Not your notification");
        }
        n.setRead(true);
        notificationRepository.save(n);
    }

    public void markAllRead(Long userId) {
        List<Notification> mine = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);
        mine.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(mine);
    }
}