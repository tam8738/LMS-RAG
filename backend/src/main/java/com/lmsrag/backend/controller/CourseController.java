package com.lmsrag.backend.controller;

import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.course.CourseRequestDTO;
import com.lmsrag.backend.dto.course.CourseResponseDTO;
import com.lmsrag.backend.service.CourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller cho Course API.
 */
@Slf4j  // Thêm logger từ Lombok
@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @PostMapping
    public ApiResponse<CourseResponseDTO> create(@RequestBody CourseRequestDTO request) {
        log.info("[CourseController] Nhận request tạo course: name={}", request.getName());
        try {
            CourseResponseDTO response = courseService.create(request);
            log.info("[CourseController] Tạo course thành công, id={}", response.getId());
            return ApiResponse.success(response, "Tạo khóa học thành công");
        } catch (Exception e) {
            log.error("[CourseController] Lỗi khi tạo course: {}", e.getMessage(), e);
            throw e; // Ném lại để GlobalExceptionHandler bắt
        }
    }

    @GetMapping
    public ApiResponse<List<CourseResponseDTO>> getMyCourses() {
        log.info("[CourseController] Nhận request lấy danh sách course của user hiện tại");
        try {
            List<CourseResponseDTO> courses = courseService.getMyCourses();
            log.info("[CourseController] Trả về {} course", courses.size());
            return ApiResponse.success(courses);
        } catch (Exception e) {
            log.error("[CourseController] Lỗi khi lấy danh sách course: {}", e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/{id}")
    public ApiResponse<CourseResponseDTO> getById(@PathVariable Long id) {
        log.info("[CourseController] Nhận request xem course id={}", id);
        try {
            CourseResponseDTO response = courseService.getById(id);
            log.info("[CourseController] Tìm thấy course id={}", id);
            return ApiResponse.success(response);
        } catch (Exception e) {
            log.error("[CourseController] Lỗi khi xem course id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @PutMapping("/{id}")
    public ApiResponse<CourseResponseDTO> update(
            @PathVariable Long id,
            @RequestBody CourseRequestDTO request) {
        log.info("[CourseController] Nhận request cập nhật course id={}", id);
        try {
            CourseResponseDTO response = courseService.update(id, request);
            log.info("[CourseController] Cập nhật course id={} thành công", id);
            return ApiResponse.success(response, "Cập nhật khóa học thành công");
        } catch (Exception e) {
            log.error("[CourseController] Lỗi khi cập nhật course id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        log.info("[CourseController] Nhận request xóa course id={}", id);
        try {
            courseService.delete(id);
            log.info("[CourseController] Xóa course id={} thành công", id);
            return ApiResponse.success(null, "Xóa khóa học thành công");
        } catch (Exception e) {
            log.error("[CourseController] Lỗi khi xóa course id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/join/{courseCode}")
    public ApiResponse<CourseResponseDTO> joinCourse(@PathVariable String courseCode) {
        log.info("[CourseController] Nhận request join course, code={}", courseCode);
        try {
            CourseResponseDTO response = courseService.joinCourse(courseCode);
            log.info("[CourseController] Join course code={} thành công, courseId={}", courseCode, response.getId());
            return ApiResponse.success(response, "Tham gia khóa học thành công");
        } catch (Exception e) {
            log.error("[CourseController] Lỗi khi join course code={}: {}", courseCode, e.getMessage(), e);
            throw e;
        }
    }
}
