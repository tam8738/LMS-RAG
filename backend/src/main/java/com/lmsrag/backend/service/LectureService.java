package com.lmsrag.backend.service;

import com.lmsrag.backend.config.CustomUserDetails;
import com.lmsrag.backend.dto.lecture.LectureRequestDTO;
import com.lmsrag.backend.dto.lecture.LectureResponseDTO;
import com.lmsrag.backend.entity.Course;
import com.lmsrag.backend.entity.Lecture;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.mapper.LectureMapper;
import com.lmsrag.backend.repository.CourseMemberRepository;
import com.lmsrag.backend.repository.CourseRepository;
import com.lmsrag.backend.repository.LectureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service xử lý nghiệp vụ Lecture.
 * Sử dụng LectureMapper để chuyển đổi entity → DTO, tránh N+1 và duplicate code.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LectureService {

    private final LectureRepository lectureRepository;
    private final CourseRepository courseRepository;
    private final CourseMemberRepository courseMemberRepository;
    private final LectureMapper lectureMapper;

    private User getCurrentUser() {
        log.info("[LectureService] Lấy current user...");
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails)) {
            log.error("[LectureService] Authentication invalid");
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        log.info("[LectureService] User: id={}, email={}, role={}", user.getId(), user.getEmail(), user.getRole());
        return user;
    }

    private void assertCourseAccess(User user, Course course) {
        log.info("[LectureService] Kiểm tra quyền: userId={}, role={}, courseId={}",
                user.getId(), user.getRole(), course.getId());

        if (user.getRole() == UserRole.STUDENT) {
            boolean isMember = courseMemberRepository.existsByUserIdAndCourseId(user.getId(), course.getId());
            if (!isMember) {
                log.warn("[LectureService] Student chưa join course id={}", course.getId());
                throw new AppException(ErrorCode.COURSE_ACCESS_DENIED);
            }
        } else {
            if (course.getCreatedBy() == null || !course.getCreatedBy().getId().equals(user.getId())) {
                log.warn("[LectureService] Teacher không phải chủ course id={}", course.getId());
                throw new AppException(ErrorCode.COURSE_ACCESS_DENIED);
            }
        }
    }

    @Transactional
    public LectureResponseDTO create(LectureRequestDTO request) {
        log.info("[LectureService] Create lecture: title={}, courseId={}", request.getTitle(), request.getCourseId());
        User currentUser = getCurrentUser();

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        assertCourseAccess(currentUser, course);

        Lecture lecture = new Lecture();
        lecture.setTitle(request.getTitle());
        lecture.setContent(request.getContent());
        lecture.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
        lecture.setCourse(course);

        Lecture saved = lectureRepository.save(lecture);
        log.info("[LectureService] Lecture saved: id={}, courseId={}", saved.getId(), course.getId());

        // Dùng LectureMapper thay vì inline mapToResponse
        return lectureMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<LectureResponseDTO> getByCourseId(Long courseId) {
        log.info("[LectureService] Get lectures by courseId={}", courseId);
        User currentUser = getCurrentUser();

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        assertCourseAccess(currentUser, course);

        // @EntityGraph đã JOIN FETCH course, không bị N+1
        List<Lecture> lectures = lectureRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
        log.info("[LectureService] Found {} lectures", lectures.size());

        return lectures.stream()
                .map(lectureMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LectureResponseDTO getById(Long id) {
        log.info("[LectureService] Get lecture id={}", id);
        User currentUser = getCurrentUser();

        // @EntityGraph đã JOIN FETCH course trong 1 query
        Lecture lecture = lectureRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.URL_NOT_FOUND));

        assertCourseAccess(currentUser, lecture.getCourse());
        return lectureMapper.toResponse(lecture);
    }

    @Transactional
    public LectureResponseDTO update(Long id, LectureRequestDTO request) {
        log.info("[LectureService] Update lecture id={}", id);
        User currentUser = getCurrentUser();

        // @EntityGraph JOIN FETCH course
        Lecture lecture = lectureRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.URL_NOT_FOUND));

        assertCourseAccess(currentUser, lecture.getCourse());

        if (request.getCourseId() != null && !request.getCourseId().equals(lecture.getCourse().getId())) {
            Course newCourse = courseRepository.findById(request.getCourseId())
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
            assertCourseAccess(currentUser, newCourse);
            lecture.setCourse(newCourse);
        }

        lecture.setTitle(request.getTitle());
        lecture.setContent(request.getContent());
        if (request.getOrderIndex() != null) lecture.setOrderIndex(request.getOrderIndex());

        Lecture updated = lectureRepository.save(lecture);
        return lectureMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("[LectureService] Delete lecture id={}", id);
        User currentUser = getCurrentUser();

        // @EntityGraph JOIN FETCH course
        Lecture lecture = lectureRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.URL_NOT_FOUND));

        assertCourseAccess(currentUser, lecture.getCourse());
        lectureRepository.delete(lecture);
        log.info("[LectureService] Deleted lecture id={}", id);
    }
}
