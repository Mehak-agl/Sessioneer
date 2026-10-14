package com.sessioneer.service;

//import com.sessioneer.dto.ProfileUpdateRequest;
import com.sessioneer.model.User;
import com.sessioneer.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public ProfileService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User getProfile() {
        return getCurrentUser();
    }

    public User updatePhoto(String photo) {
        User user = getCurrentUser();
        user.setPhoto(photo);
        return userRepository.save(user);
    }

    public User updateNotificationEmail(String notificationEmail) {
        User user = getCurrentUser();
        user.setNotificationEmail(notificationEmail == null || notificationEmail.isBlank() ? null : notificationEmail.trim());
        return userRepository.save(user);
    }

    public User updateResume(String resumeName, String resumeData, String resumeType) {
        User user = getCurrentUser();
        user.setResumeName(resumeName);
        user.setResumeData(resumeData);
        user.setResumeType(resumeType);
        return userRepository.save(user);
    }

    public String changePassword(String currentPassword, String newPassword) {
        User user = getCurrentUser();
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return "Password changed successfully";
    }
}