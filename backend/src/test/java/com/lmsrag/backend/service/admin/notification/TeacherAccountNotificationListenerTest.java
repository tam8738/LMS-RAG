package com.lmsrag.backend.service.admin.notification;

import com.lmsrag.backend.event.TeacherAccountCreatedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class TeacherAccountNotificationListenerTest {

    @Mock
    private JavaMailSender mailSender;

    private TeacherAccountNotificationListener listener;

    @BeforeEach
    void setUp() {
        listener = new TeacherAccountNotificationListener(mailSender, "no-reply@lms.edu.vn");
    }

    @Test
    void sendAccountCreatedEmail_shouldSendAccountInformationToLoginEmail() {
        TeacherAccountCreatedEvent event = createEvent();

        listener.sendAccountCreatedEmail(event);

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        SimpleMailMessage message = messageCaptor.getValue();
        assertThat(message.getFrom()).isEqualTo("no-reply@lms.edu.vn");
        assertThat(message.getTo()).containsExactly("tam.truong@lms.edu.vn");
        assertThat(message.getText())
                .contains("tam.truong@lms.edu.vn", "Temporary#1");
    }

    @Test
    void sendAccountCreatedEmail_whenSmtpFails_shouldNotPropagateError() {
        doThrow(new MailSendException("SMTP unavailable"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        assertThatCode(() -> listener.sendAccountCreatedEmail(createEvent()))
                .doesNotThrowAnyException();
    }

    private TeacherAccountCreatedEvent createEvent() {
        return new TeacherAccountCreatedEvent(
                18L,
                "Trương Mỹ Tâm",
                "tam.truong@lms.edu.vn",
                "Temporary#1"
        );
    }
}
