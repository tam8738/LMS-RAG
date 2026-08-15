package com.lmsrag.backend.service.admin.support;

import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.UserRepository;
import com.lmsrag.backend.event.TeacherAccountCreatedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Đóng gói thao tác ghi tài khoản giảng viên để bảo đảm ranh giới giao dịch.
 */
@Component
@RequiredArgsConstructor
public class TeacherAccountWriter {

    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public User save(User teacher, String initialPassword) {
        User savedTeacher = insertTeacher(teacher);

        eventPublisher.publishEvent(new TeacherAccountCreatedEvent(
                savedTeacher.getId(),
                savedTeacher.getName(),
                savedTeacher.getEmail(),
                initialPassword
        ));

        return savedTeacher;
    }

    private User insertTeacher(User teacher) {
        try {
            return userRepository.saveAndFlush(teacher);
        } catch (DataIntegrityViolationException exception) {
            if (containsEmailConstraint(exception)) {
                throw new AppException(ErrorCode.TEACHER_EMAIL_ALREADY_EXISTS);
            }
            throw exception;
        }
    }

    private boolean containsEmailConstraint(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String message = current.getMessage();
            if (message != null && message.toLowerCase(Locale.ROOT).contains("email")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
