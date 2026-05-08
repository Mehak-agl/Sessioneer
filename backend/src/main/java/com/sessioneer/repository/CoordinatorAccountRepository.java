package com.sessioneer.repository;

import com.sessioneer.entity.CoordinatorAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CoordinatorAccountRepository extends JpaRepository<CoordinatorAccount, Long> {
    Optional<CoordinatorAccount> findByEmail(String email);
}