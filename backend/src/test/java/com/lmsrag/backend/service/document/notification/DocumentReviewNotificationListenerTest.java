package com.lmsrag.backend.service.document.notification;

import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.event.DocumentReviewCompletedEvent;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.thymeleaf.spring6.SpringTemplateEngine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentReviewNotificationListenerTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private SpringTemplateEngine templateEngine;

    private DocumentReviewNotificationListener listener;

    @BeforeEach
    void setUp() {
        listener = new DocumentReviewNotificationListener(mailSender, templateEngine, "no-reply@lms.edu.vn");
    }

    @Test
    void sendDocumentReviewNotification_whenPublished_shouldSendApprovalEmail() throws MessagingException {
        DocumentReviewCompletedEvent event = createEvent(PublicationStatus.PUBLISHED, null);
        when(templateEngine.process(eq("mail/document-approved"), any(org.thymeleaf.context.Context.class)))
                .thenReturn("<html>Approved</html>");
        when(mailSender.createMimeMessage()).thenReturn(mock(MimeMessage.class));

        listener.sendDocumentReviewNotification(event);

        verify(templateEngine).process(eq("mail/document-approved"), any(org.thymeleaf.context.Context.class));
        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        assertThat(messageCaptor.getValue()).isNotNull();
    }

    @Test
    void sendDocumentReviewNotification_whenRejected_shouldSendRejectionEmail() throws MessagingException {
        DocumentReviewCompletedEvent event = createEvent(
                PublicationStatus.REJECTED,
                "Tài liệu thiếu trích dẫn nguồn"
        );
        when(templateEngine.process(eq("mail/document-rejected"), any(org.thymeleaf.context.Context.class)))
                .thenReturn("<html>Rejected</html>");
        when(mailSender.createMimeMessage()).thenReturn(mock(MimeMessage.class));

        listener.sendDocumentReviewNotification(event);

        verify(templateEngine).process(eq("mail/document-rejected"), any(org.thymeleaf.context.Context.class));
        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        assertThat(messageCaptor.getValue()).isNotNull();
    }

    @Test
    void sendDocumentReviewNotification_whenSmtpFails_shouldNotPropagateError() throws MessagingException {
        DocumentReviewCompletedEvent event = createEvent(PublicationStatus.PUBLISHED, null);
        when(templateEngine.process(eq("mail/document-approved"), any(org.thymeleaf.context.Context.class)))
                .thenReturn("<html>Approved</html>");
        when(mailSender.createMimeMessage()).thenReturn(mock(MimeMessage.class));
        doThrow(new MailSendException("SMTP unavailable"))
                .when(mailSender).send(any(MimeMessage.class));

        assertThatCode(() -> listener.sendDocumentReviewNotification(event))
                .doesNotThrowAnyException();
    }

    private DocumentReviewCompletedEvent createEvent(PublicationStatus status, String rejectionReason) {
        return new DocumentReviewCompletedEvent(
                1L,
                "Giáo trình CSDL",
                "teacher@lms.edu.vn",
                "Nguyễn Văn A",
                status,
                rejectionReason,
                "Admin A"
        );
    }
}
