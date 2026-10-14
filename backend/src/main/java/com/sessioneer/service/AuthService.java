package com.sessioneer.service;

import com.sessioneer.dto.AuthRequest;
import com.sessioneer.dto.AuthResponse;
import com.sessioneer.dto.CreateTutorRequest;
import com.sessioneer.model.Role;
import com.sessioneer.model.User;
import com.sessioneer.repository.UserRepository;
import com.sessioneer.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    // Coordinator-initiated account creation: unlike signup(), the coordinator
    // supplies the temporary password themselves, and a real welcome email is
    // sent with the login details (not just a claim that one was sent).
    public User createTutorAccount(CreateTutorRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getTemporaryPassword()));
        user.setRole(Role.STAFF);
        user.setCoordinatorCreated(true);
        user.setCreatedAt(java.time.LocalDateTime.now());

        String sendTo = (request.getSendEmailTo() == null || request.getSendEmailTo().isBlank())
                ? request.getEmail()
                : request.getSendEmailTo();

        boolean sent = emailService.send(
                sendTo,
                "Your Sessioneer tutor account",
                "Hi " + request.getFullName() + ",\n\n" +
                "A tutor account has been created for you on Sessioneer.\n\n" +
                "Login email: " + request.getEmail() + "\n" +
                "Temporary password: " + request.getTemporaryPassword() + "\n\n" +
                "Please log in and change your password as soon as possible.\n\n" +
                "— Sessioneer"
        );
        user.setCredentialsEmailSent(sent);

        return userRepository.save(user);
    }

    public AuthResponse signup(AuthRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.valueOf(request.getRole().toUpperCase()));

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(user.getId(), token, user.getRole().name(), user.getFullName());
    }

    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(user.getId(), token, user.getRole().name(), user.getFullName());
    }
}