package com.lmsrag.backend.service.admin.notification;

import com.lmsrag.backend.config.AsyncConfig;
import com.lmsrag.backend.event.TeacherPasswordResetEvent;
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
public class TeacherPasswordResetNotificationListener {

    private final JavaMailSender mailSender;
    private final String sender;

    public TeacherPasswordResetNotificationListener(
            JavaMailSender mailSender,
            @Value("${app.mail.from}") String sender
    ) {
        this.mailSender = mailSender;
        this.sender = sender;
    }

    @Async(AsyncConfig.MAIL_TASK_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendPasswordResetEmail(TeacherPasswordResetEvent event) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(sender);
            message.setTo(event.email());
            message.setSubject("Đặt lại mật khẩu LMS");
            message.setText(buildMessage(event));

            mailSender.send(message);
            log.info("[PASSWORD_RESET_MAIL] Sent password reset notification | teacherId={}", event.teacherId());
        } catch (Exception exception) {
            log.error("[PASSWORD_RESET_MAIL] Failed to send password reset notification | teacherId={}",
                    event.teacherId(), exception);
        }
    }

    private String buildMessage(TeacherPasswordResetEvent event) {
        return """
                Xin chào %s,

                Mật khẩu tài khoản LMS của bạn đã được quản trị viên đặt lại.

                Email đăng nhập: %s
                Mật khẩu mới: %s

                Vui lòng đăng nhập và đổi mật khẩu ngay sau khi đăng nhập.
                """.formatted(event.name(), event.email(), event.newPassword());
    }
}
