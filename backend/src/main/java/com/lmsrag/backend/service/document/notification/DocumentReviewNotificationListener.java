package com.lmsrag.backend.service.document.notification;

import com.lmsrag.backend.config.AsyncConfig;
import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.event.DocumentReviewCompletedEvent;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;

@Slf4j
@Component
public class DocumentReviewNotificationListener {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;
    private final String sender;

    public DocumentReviewNotificationListener(
            JavaMailSender mailSender,
            SpringTemplateEngine templateEngine,
            @Value("${app.mail.from}") String sender
    ) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.sender = sender;
    }

    @Async(AsyncConfig.MAIL_TASK_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendDocumentReviewNotification(DocumentReviewCompletedEvent event) {
        try {
            boolean isApproved = event.status() == PublicationStatus.PUBLISHED;
            String templateName = isApproved
                    ? "mail/document-approved"
                    : "mail/document-rejected";
            String subject = isApproved
                    ? "[LMS] Tài liệu của bạn đã được duyệt và công bố"
                    : "[LMS] Tài liệu của bạn bị từ chối";

            String htmlContent = buildHtmlContent(templateName, event);
            sendHtmlEmail(event.teacherEmail(), subject, htmlContent);

            log.info("[DOC_REVIEW_MAIL] Sent review notification | documentId={} | status={} | teacherEmail={}",
                    event.documentId(), event.status(), event.teacherEmail());
        } catch (Exception exception) {
            log.error("[DOC_REVIEW_MAIL] Failed to send review notification | documentId={} | status={} | teacherEmail={}",
                    event.documentId(), event.status(), event.teacherEmail(), exception);
        }
    }

    private String buildHtmlContent(String templateName, DocumentReviewCompletedEvent event) {
        Context context = new Context();
        context.setVariable("teacherName", event.teacherName());
        context.setVariable("documentTitle", event.documentTitle());
        context.setVariable("reviewerName", event.reviewerName());
        context.setVariable("rejectionReason", event.rejectionReason());
        return templateEngine.process(templateName, context);
    }

    private void sendHtmlEmail(String to, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(
                message,
                MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                StandardCharsets.UTF_8.name()
        );
        helper.setFrom(sender);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        mailSender.send(message);
    }
}
