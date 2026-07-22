package com.lmsrag.backend.service.admin.impl;

import com.lmsrag.backend.dto.request.admin.teacher.TeacherBatchCreateRequest;
import com.lmsrag.backend.dto.request.admin.teacher.TeacherCreateRequest;
import com.lmsrag.backend.dto.request.admin.teacher.TeacherSearchRequest;
import com.lmsrag.backend.dto.request.admin.teacher.TeacherUpdateRequest;
import com.lmsrag.backend.dto.response.admin.teacher.PageResponse;
import com.lmsrag.backend.dto.response.admin.teacher.TeacherBatchCreateResponse;
import com.lmsrag.backend.dto.response.admin.teacher.TeacherResetPasswordResponse;
import com.lmsrag.backend.dto.response.admin.teacher.TeacherResponse;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.enums.UserStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.mapper.TeacherMapper;
import com.lmsrag.backend.repository.UserRepository;
import com.lmsrag.backend.service.admin.TeacherAdminService;
import com.lmsrag.backend.service.admin.support.TeacherAccountWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class TeacherAdminServiceImpl implements TeacherAdminService {

    private static final int BATCH_SIZE_LIMIT = 200;
    private static final int PASSWORD_LENGTH = 12;
    private static final String PASSWORD_CHARACTERS =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final TeacherAccountWriter teacherAccountWriter;

    @Override
    public PageResponse<TeacherResponse> searchTeachers(TeacherSearchRequest request) {
        Pageable pageable = buildPageable(request);
        UserStatus status = request.isActive() == null
                ? null
                : (request.isActive() ? UserStatus.ACTIVE : UserStatus.INACTIVE);

        Page<User> page = userRepository.searchByRole(
                UserRole.TEACHER,
                status,
                request.keyword() != null ? request.keyword().trim() : null,
                request.department() != null ? request.department().trim() : null,
                pageable
        );

        return PageResponse.<TeacherResponse>builder()
                .items(page.getContent().stream().map(TeacherMapper::toResponse).toList())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }

    @Override
    public TeacherResponse createTeacher(TeacherCreateRequest request) {
        validateCreateRequest(request);

        User user = TeacherMapper.toEntity(request);
        String initialPassword = generateRandomPassword();
        user.setPassword(passwordEncoder.encode(initialPassword));

        User persistedTeacher = teacherAccountWriter.save(user, initialPassword);
        User saved = findTeacherByIdOrThrow(persistedTeacher.getId());
        log.info("[ADMIN_TEACHER] Created teacher account | teacherId={}", saved.getId());

        return TeacherMapper.toResponse(saved);
    }

    @Override
    public TeacherBatchCreateResponse createTeachersBatch(TeacherBatchCreateRequest request) {
        if (request.teachers() == null || request.teachers().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }
        if (request.teachers().size() > BATCH_SIZE_LIMIT) {
            throw new AppException(ErrorCode.TEACHER_BATCH_LIMIT_EXCEEDED);
        }

        List<TeacherResponse> created = new ArrayList<>();
        List<TeacherBatchCreateResponse.BatchItemError> errors = new ArrayList<>();

        int index = 0;
        for (TeacherCreateRequest item : request.teachers()) {
            try {
                created.add(createTeacher(item));
            } catch (AppException e) {
                errors.add(TeacherBatchCreateResponse.BatchItemError.builder()
                        .index(index)
                        .name(item.name())
                        .email(item.email())
                        .errorCode(e.getErrorCode().getCode())
                        .message(e.getMessage())
                        .build());
                log.warn("[ADMIN_TEACHER] Batch item rejected | index={} | errorCode={}",
                        index, e.getErrorCode().getCode());
            } catch (Exception e) {
                errors.add(TeacherBatchCreateResponse.BatchItemError.builder()
                        .index(index)
                        .name(item.name())
                        .email(item.email())
                        .errorCode(ErrorCode.INTERNAL_ERROR.getCode())
                        .message(ErrorCode.INTERNAL_ERROR.getMessage())
                        .build());
                log.error("[ADMIN_TEACHER] Batch item failed unexpectedly | index={}", index, e);
            }
            index++;
        }

        return TeacherBatchCreateResponse.builder()
                .totalRequested(request.teachers().size())
                .successCount(created.size())
                .failureCount(errors.size())
                .created(created)
                .errors(errors)
                .build();
    }

    @Override
    @Transactional
    public TeacherResponse updateTeacher(Long teacherId, TeacherUpdateRequest request) {
        User teacher = findTeacherByIdOrThrow(teacherId);
        validateUpdatedEmail(teacher, request);
        TeacherMapper.updateEntityFromRequest(request, teacher);

        User saved = userRepository.save(teacher);
        log.info("[ADMIN] Updated teacher id={}", saved.getId());

        return TeacherMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public TeacherResponse activateTeacher(Long teacherId) {
        User teacher = findTeacherByIdOrThrow(teacherId);

        if (teacher.getStatus() == UserStatus.ACTIVE) {
            throw new AppException(ErrorCode.TEACHER_ALREADY_ACTIVE);
        }

        teacher.setStatus(UserStatus.ACTIVE);
        User saved = userRepository.save(teacher);
        log.info("[ADMIN] Activated teacher id={}", saved.getId());

        return TeacherMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public TeacherResponse deactivateTeacher(Long teacherId) {
        User teacher = findTeacherByIdOrThrow(teacherId);

        if (teacher.getStatus() == UserStatus.INACTIVE) {
            throw new AppException(ErrorCode.TEACHER_ALREADY_INACTIVE);
        }

        teacher.setStatus(UserStatus.INACTIVE);
        User saved = userRepository.save(teacher);
        log.info("[ADMIN] Deactivated teacher id={}", saved.getId());

        return TeacherMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public TeacherResetPasswordResponse resetPassword(Long teacherId) {
        User teacher = findTeacherByIdOrThrow(teacherId);

        String newPassword = generateRandomPassword();
        teacher.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(teacher);

        // Hệ thống hiện tại chưa tích hợp email service; đặt emailSent=false.
        // Mật khẩu mới không được trả về trong response theo quy tắc bảo mật.
        log.info("[ADMIN] Reset password for teacher id={} emailSent=false", teacher.getId());

        return TeacherResetPasswordResponse.builder()
                .teacherId(teacher.getId())
                .emailSent(false)
                .resetAt(Instant.now())
                .build();
    }

    private User findTeacherByIdOrThrow(Long teacherId) {
        return userRepository.findByIdAndRole(teacherId, UserRole.TEACHER)
                .orElseThrow(() -> new AppException(ErrorCode.TEACHER_NOT_FOUND));
    }

    private void validateCreateRequest(TeacherCreateRequest request) {
        if (request.role() != UserRole.TEACHER) {
            throw new AppException(ErrorCode.INVALID_TEACHER_ROLE);
        }
        String normalizedEmail = normalizeEmail(request.email());
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new AppException(ErrorCode.TEACHER_EMAIL_ALREADY_EXISTS);
        }
    }

    private void validateUpdatedEmail(User teacher, TeacherUpdateRequest request) {
        if (request.email() == null) {
            return;
        }

        String normalizedEmail = normalizeEmail(request.email());
        if (normalizedEmail.isEmpty()) {
            throw new AppException(ErrorCode.EMAIL_REQUIRED);
        }
        if (!teacher.getEmail().equalsIgnoreCase(normalizedEmail)
                && userRepository.existsByEmail(normalizedEmail)) {
            throw new AppException(ErrorCode.TEACHER_EMAIL_ALREADY_EXISTS);
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private Pageable buildPageable(TeacherSearchRequest request) {
        Sort sort = Sort.by(
                "DESC".equalsIgnoreCase(request.sortDirection()) ? Sort.Direction.DESC : Sort.Direction.ASC,
                request.sortBy()
        );
        return PageRequest.of(request.page(), request.size(), sort);
    }

    private String generateRandomPassword() {
        StringBuilder password = new StringBuilder(PASSWORD_LENGTH);
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            password.append(PASSWORD_CHARACTERS.charAt(SECURE_RANDOM.nextInt(PASSWORD_CHARACTERS.length())));
        }
        return password.toString();
    }
}
