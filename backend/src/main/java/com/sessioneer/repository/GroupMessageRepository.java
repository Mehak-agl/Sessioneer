package com.sessioneer.repository;

import com.sessioneer.model.GroupMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GroupMessageRepository extends JpaRepository<GroupMessage, Long> {
    List<GroupMessage> findByGroupIdOrderBySentAtAsc(Long groupId);
}