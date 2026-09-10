package com.sessioneer.repository;

import com.sessioneer.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE (m.sender.id = :userId AND m.receiver.id = :otherId) OR (m.sender.id = :otherId AND m.receiver.id = :userId) ORDER BY m.sentAt ASC")
    List<Message> findConversation(@Param("userId") Long userId, @Param("otherId") Long otherId);

    @Query("SELECT DISTINCT u FROM User u WHERE u.id IN (SELECT m.receiver.id FROM Message m WHERE m.sender.id = :userId) OR u.id IN (SELECT m.sender.id FROM Message m WHERE m.receiver.id = :userId AND m.sender.id != :userId)")
    List<com.sessioneer.model.User> findConversationPartners(@Param("userId") Long userId);
}