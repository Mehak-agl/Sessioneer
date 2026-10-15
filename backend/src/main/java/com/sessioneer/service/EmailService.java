package com.sessioneer.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Value("${spring.mail.username}")
    private String fromAddress;

    // When set, emails go through Brevo's HTTPS API instead of SMTP.
    // Needed on Render's free plan, which blocks outbound SMTP.
    @Value("${brevo.api-key:}")
    private String brevoApiKey;

    @Value("${brevo.sender-name:Sessioneer}")
    private String senderName;

    public EmailService(JavaMailSender mailSender, ObjectMapper objectMapper) {
        this.mailSender = mailSender;
        this.objectMapper = objectMapper;
    }

    // Failures here are logged, never thrown — a bad/missing mail config
    // should never break the actual action (invite, allocate, swap...)
    // that triggered the notification. Returns whether it actually sent,
    // so callers that need to know (e.g. "has the tutor's welcome email
    // been sent yet?") can record it truthfully.
    public boolean send(String to, String subject, String body) {
        try {
            if (brevoApiKey != null && !brevoApiKey.isBlank()) {
                return sendViaBrevo(to, subject, body);
            }
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            return true;
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            return false;
        }
    }

    private boolean sendViaBrevo(String to, String subject, String body) throws Exception {
        String json = objectMapper.writeValueAsString(Map.of(
                "sender", Map.of("name", senderName, "email", fromAddress),
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "textContent", body
        ));
        HttpRequest request = HttpRequest.newBuilder(URI.create(BREVO_URL))
                .timeout(Duration.ofSeconds(10))
                .header("api-key", brevoApiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 == 2) {
            return true;
        }
        log.error("Brevo rejected email to {}: HTTP {} {}", to, response.statusCode(), response.body());
        return false;
    }
}
