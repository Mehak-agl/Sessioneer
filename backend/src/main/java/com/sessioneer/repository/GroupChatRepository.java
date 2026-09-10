package com.sessioneer.repository;

import com.sessioneer.model.GroupChat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface GroupChatRepository extends JpaRepository<GroupChat, Long> {
    @Query("SELECT gm.group FROM GroupMembership gm WHERE gm.user.id = :userId")
    List<GroupChat> findGroupsByUserId(@Param("userId") Long userId);
}