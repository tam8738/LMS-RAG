package com.lmsrag.backend.service.admin.notification;

import com.lmsrag.backend.config.AsyncConfig;
import com.lmsrag.backend.service.admin.event.TeacherAccountCreatedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
public class TeacherAccountNotificationListener {

    private final JavaMailSender mailSender;
    private final String sender;

    public TeacherAccountNotificationListener(
            JavaMailSender mailSender,
            @Value("${app.mail.from}") String sender
    ) {
        this.mailSender = mailSender;
        this.sender = sender;
    }

    @Async(AsyncConfig.MAIL_TASK_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendAccountCreatedEmail(TeacherAccountCreatedEvent event) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(sender);
            message.setTo(event.email());
            message.setSubject("Thông tin tài khoản LMS");
            message.setText(buildMessage(event));

            mailSender.send(message);
            log.info("[ACCOUNT_MAIL] Sent account notification | teacherId={}", event.teacherId());
        } catch (Exception exception) {
            log.error("[ACCOUNT_MAIL] Failed to send account notification | teacherId={}",
                    event.teacherId(), exception);
        }
    }

    private String buildMessage(TeacherAccountCreatedEvent event) {
        return """
                Xin chào %s,

                Tài khoản LMS của bạn đã được tạo thành công.

                Email đăng nhập: %s
                Mật khẩu tạm: %s

                Vui lòng đăng nhập và đổi mật khẩu sau lần đăng nhập đầu tiên.
                """.formatted(event.name(), event.email(), event.initialPassword());
    }
}
