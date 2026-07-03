package com.lmsrag.backend.service;

import com.lmsrag.backend.config.CustomUserDetails;
import com.lmsrag.backend.dto.course.CourseRequestDTO;
import com.lmsrag.backend.dto.course.CourseResponseDTO;
import com.lmsrag.backend.entity.Course;
import com.lmsrag.backend.entity.CourseMember;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.CourseMemberStatus;
import com.lmsrag.backend.enums.CourseStatus;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.mapper.CourseMapper;
import com.lmsrag.backend.repository.CourseMemberRepository;
import com.lmsrag.backend.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service xử lý nghiệp vụ Course.
 * Sử dụng CourseMapper để chuyển đổi entity → DTO, tránh N+1 và duplicate code.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;
    private final CourseMemberRepository courseMemberRepository;
    private final CourseMapper courseMapper;

    private User getCurrentUser() {
        log.info("[CourseService] Lấy current user...");
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails)) {
            log.error("[CourseService] Authentication invalid");
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        log.info("[CourseService] User: id={}, email={}, role={}", user.getId(), user.getEmail(), user.getRole());
        return user;
    }

    @Transactional
    public CourseResponseDTO create(CourseRequestDTO request) {
        log.info("[CourseService] Create course: name={}", request.getName());
        User currentUser = getCurrentUser();

        Course course = new Course();
        course.setName(request.getName());
        course.setDescription(request.getDescription());
        course.setStatus(CourseStatus.PRIVATE);
        course.setCreatedBy(currentUser);
        course.setCourseCode(generateUniqueCourseCode());

        Course saved = courseRepository.save(course);
        log.info("[CourseService] Course saved: id={}, code={}", saved.getId(), saved.getCourseCode());

        // Dùng CourseMapper thay vì inline mapToResponse
        return courseMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CourseResponseDTO> getMyCourses() {
        log.info("[CourseService] Get my courses");
        User currentUser = getCurrentUser();

        if (currentUser.getRole() == UserRole.STUDENT) {
            List<CourseMember> memberships = courseMemberRepository.findByUserId(currentUser.getId());
            log.info("[CourseService] Student has {} memberships", memberships.size());
            return memberships.stream()
                    .map(cm -> courseMapper.toResponse(cm.getCourse()))
                    .toList();
        } else {
            // @EntityGraph đã JOIN FETCH createdBy, không bị N+1
            List<Course> courses = courseRepository.findByCreatedById(currentUser.getId());
            log.info("[CourseService] Teacher/Admin has {} courses", courses.size());
            return courses.stream()
                    .map(courseMapper::toResponse)
                    .toList();
        }
    }

    @Transactional(readOnly = true)
    public CourseResponseDTO getById(Long id) {
        log.info("[CourseService] Get course id={}", id);
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        User currentUser = getCurrentUser();
        if (currentUser.getRole() == UserRole.STUDENT) {
            boolean isMember = courseMemberRepository.existsByUserIdAndCourseId(currentUser.getId(), id);
            if (!isMember) throw new AppException(ErrorCode.COURSE_ACCESS_DENIED);
        } else {
            if (course.getCreatedBy() == null || !course.getCreatedBy().getId().equals(currentUser.getId())) {
                throw new AppException(ErrorCode.COURSE_ACCESS_DENIED);
            }
        }

        return courseMapper.toResponse(course);
    }

    @Transactional
    public CourseResponseDTO update(Long id, CourseRequestDTO request) {
        log.info("[CourseService] Update course id={}", id);
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        User currentUser = getCurrentUser();
        if (course.getCreatedBy() == null || !course.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new AppException(ErrorCode.COURSE_ACCESS_DENIED);
        }

        course.setName(request.getName());
        course.setDescription(request.getDescription());
        if (request.getStatus() != null) course.setStatus(request.getStatus());

        Course updated = courseRepository.save(course);
        return courseMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("[CourseService] Delete course id={}", id);
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        User currentUser = getCurrentUser();
        if (course.getCreatedBy() == null || !course.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new AppException(ErrorCode.COURSE_ACCESS_DENIED);
        }

        courseRepository.delete(course);
        log.info("[CourseService] Deleted course id={}", id);
    }

    @Transactional
    public CourseResponseDTO joinCourse(String courseCode) {
        log.info("[CourseService] Join course: code={}", courseCode);
        User currentUser = getCurrentUser();

        if (currentUser.getRole() != UserRole.STUDENT) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        Course course = courseRepository.findByCourseCode(courseCode)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        if (courseMemberRepository.existsByUserIdAndCourseId(currentUser.getId(), course.getId())) {
            throw new AppException(ErrorCode.COURSE_MEMBER_ALREADY_JOINED);
        }

        CourseMember member = new CourseMember();
        member.setCourse(course);
        member.setUser(currentUser);
        member.setStatus(CourseMemberStatus.ACTIVE);
        courseMemberRepository.save(member);

        log.info("[CourseService] User {} joined course {}", currentUser.getId(), course.getId());
        return courseMapper.toResponse(course);
    }

    private String generateUniqueCourseCode() {
        for (int i = 0; i < 10; i++) {
            String code = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            if (!courseRepository.existsByCourseCode(code)) return code;
        }
        return UUID.randomUUID().toString().substring(0, 6).toUpperCase() + System.currentTimeMillis();
    }
}
