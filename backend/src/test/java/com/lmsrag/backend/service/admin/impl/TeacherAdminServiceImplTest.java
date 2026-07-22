package com.lmsrag.backend.service.admin.impl;

import com.lmsrag.backend.dto.request.admin.teacher.TeacherCreateRequest;
import com.lmsrag.backend.dto.response.admin.teacher.TeacherResponse;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.enums.UserStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.UserRepository;
import com.lmsrag.backend.service.admin.support.TeacherAccountWriter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeacherAdminServiceImplTest {

    private static final String EMAIL = "tam.truong@lms.edu.vn";

    @Mock
    private UserRepository userRepository;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @Mock
    private TeacherAccountWriter accountWriter;

    private TeacherAdminServiceImpl teacherAdminService;

    @BeforeEach
    void setUp() {
        teacherAdminService = new TeacherAdminServiceImpl(
                userRepository,
                passwordEncoder,
                accountWriter
        );
    }

    @Test
    void createTeacher_shouldUseRequestedEmailAndGeneratedTemporaryPassword() {
        TeacherCreateRequest request = createRequest(UserRole.TEACHER);
        when(userRepository.existsByEmail(EMAIL)).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-temporary-password");
        User savedUser = User.builder()
                .id(18L)
                .email(EMAIL)
                .name("Trương Mỹ Tâm")
                .role(UserRole.TEACHER)
                .status(UserStatus.ACTIVE)
                .build();
        when(accountWriter.save(any(User.class), anyString())).thenReturn(savedUser);
        when(userRepository.findByIdAndRole(18L, UserRole.TEACHER)).thenReturn(Optional.of(savedUser));

        TeacherResponse response = teacherAdminService.createTeacher(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        ArgumentCaptor<String> passwordCaptor = ArgumentCaptor.forClass(String.class);
        verify(accountWriter).save(userCaptor.capture(), passwordCaptor.capture());
        User user = userCaptor.getValue();
        assertThat(passwordCaptor.getValue()).hasSize(12);
        verify(passwordEncoder).encode(passwordCaptor.getValue());
        assertThat(user.getPassword()).isEqualTo("encoded-temporary-password");
        assertThat(user.getEmail()).isEqualTo(EMAIL);
        assertThat(user.getCitizenId()).isNull();
        assertThat(user.getRole()).isEqualTo(UserRole.TEACHER);
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(response.email()).isEqualTo(EMAIL);
    }

    @Test
    void createTeacher_shouldRejectNonTeacherRole() {
        TeacherCreateRequest request = createRequest(UserRole.STUDENT);

        assertThatThrownBy(() -> teacherAdminService.createTeacher(request))
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getErrorCode())
                        .isEqualTo(ErrorCode.INVALID_TEACHER_ROLE));

        verify(accountWriter, never()).save(any(User.class), anyString());
    }

    @Test
    void createTeacher_shouldRejectDuplicatedEmail() {
        TeacherCreateRequest request = createRequest(UserRole.TEACHER);
        when(userRepository.existsByEmail(EMAIL)).thenReturn(true);

        assertThatThrownBy(() -> teacherAdminService.createTeacher(request))
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getErrorCode())
                        .isEqualTo(ErrorCode.TEACHER_EMAIL_ALREADY_EXISTS));

        verify(passwordEncoder, never()).encode(anyString());
        verify(accountWriter, never()).save(any(User.class), anyString());
    }

    private TeacherCreateRequest createRequest(UserRole role) {
        return new TeacherCreateRequest(
                "Trương Mỹ Tâm",
                role,
                EMAIL,
                null,
                null,
                null,
                null,
                null
        );
    }
}
