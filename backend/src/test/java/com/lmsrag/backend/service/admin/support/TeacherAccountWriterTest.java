package com.lmsrag.backend.service.admin.support;

import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.enums.UserStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.UserRepository;
import com.lmsrag.backend.event.TeacherAccountCreatedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeacherAccountWriterTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private TeacherAccountWriter accountWriter;

    @BeforeEach
    void setUp() {
        accountWriter = new TeacherAccountWriter(
                userRepository,
                eventPublisher
        );
    }

    @Test
    void save_shouldPersistRequestedEmailAndPublishNotificationAfterIdIsAssigned() {
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User teacher = invocation.getArgument(0);
            if (teacher.getId() == null) {
                teacher.setId(18L);
            }
            return teacher;
        });

        User savedTeacher = accountWriter.save(createTeacher(), "Temporary#1");

        assertThat(savedTeacher.getId()).isEqualTo(18L);
        assertThat(savedTeacher.getEmail()).isEqualTo("tam.truong@lms.edu.vn");
        verify(userRepository).saveAndFlush(any(User.class));

        ArgumentCaptor<TeacherAccountCreatedEvent> eventCaptor =
                ArgumentCaptor.forClass(TeacherAccountCreatedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().email()).isEqualTo("tam.truong@lms.edu.vn");
        assertThat(eventCaptor.getValue().initialPassword()).isEqualTo("Temporary#1");
    }

    @Test
    void save_whenConcurrentRequestUsesSameEmail_shouldReturnDuplicateEmailError() {
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("users_email_key"));

        assertThatThrownBy(() -> accountWriter.save(createTeacher(), "Temporary#1"))
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getErrorCode())
                        .isEqualTo(ErrorCode.TEACHER_EMAIL_ALREADY_EXISTS));
    }

    private User createTeacher() {
        return User.builder()
                .name("Trương Mỹ Tâm")
                .email("tam.truong@lms.edu.vn")
                .password("encoded-password")
                .role(UserRole.TEACHER)
                .status(UserStatus.ACTIVE)
                .build();
    }
}
