package com.lmsrag.backend.controller;

import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.lecture.LectureRequestDTO;
import com.lmsrag.backend.dto.lecture.LectureResponseDTO;
import com.lmsrag.backend.service.LectureService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller cho Lecture API.
 * Base path: /api/v1/lectures
 *
 * Quyền hạn:
 * - Teacher/Admin: CRUD lecture trong course của mình.
 * - Student: chỉ xem lecture thuộc course đã join.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/lectures")
@RequiredArgsConstructor
public class LectureController {

    private final LectureService lectureService;

    /**
     * Tạo lecture mới trong một course.
     * Chỉ Teacher/Admin mới được tạo.
     * LectureService sẽ kiểm tra course có thuộc về user hiện tại không.
     */
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @PostMapping
    public ApiResponse<LectureResponseDTO> create(@RequestBody LectureRequestDTO request) {
        log.info("[LectureController] Request tạo lecture: title={}, courseId={}", request.getTitle(), request.getCourseId());
        try {
            LectureResponseDTO response = lectureService.create(request);
            log.info("[LectureController] Tạo lecture thành công, id={}", response.getId());
            return ApiResponse.success(response, "Tạo bài giảng thành công");
        } catch (Exception e) {
            log.error("[LectureController] Lỗi tạo lecture: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Lấy danh sách lecture theo course.
     * Student chỉ xem được nếu đã join course.
     * Teacher/Admin chỉ xem được course do mình tạo.
     */
    @GetMapping("/course/{courseId}")
    public ApiResponse<List<LectureResponseDTO>> getByCourseId(@PathVariable Long courseId) {
        log.info("[LectureController] Request lấy lecture theo courseId={}", courseId);
        try {
            List<LectureResponseDTO> lectures = lectureService.getByCourseId(courseId);
            log.info("[LectureController] Trả về {} lecture cho courseId={}", lectures.size(), courseId);
            return ApiResponse.success(lectures);
        } catch (Exception e) {
            log.error("[LectureController] Lỗi lấy lecture theo course: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Xem chi tiết một lecture.
     * Kiểm tra quyền xem course chứa lecture này.
     */
    @GetMapping("/{id}")
    public ApiResponse<LectureResponseDTO> getById(@PathVariable Long id) {
        log.info("[LectureController] Request xem lecture id={}", id);
        try {
            LectureResponseDTO response = lectureService.getById(id);
            log.info("[LectureController] Xem lecture id={} thành công", id);
            return ApiResponse.success(response);
        } catch (Exception e) {
            log.error("[LectureController] Lỗi xem lecture id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Cập nhật lecture.
     * Chỉ Teacher/Admin chủ course mới được sửa.
     */
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @PutMapping("/{id}")
    public ApiResponse<LectureResponseDTO> update(
            @PathVariable Long id,
            @RequestBody LectureRequestDTO request) {
        log.info("[LectureController] Request cập nhật lecture id={}", id);
        try {
            LectureResponseDTO response = lectureService.update(id, request);
            log.info("[LectureController] Cập nhật lecture id={} thành công", id);
            return ApiResponse.success(response, "Cập nhật bài giảng thành công");
        } catch (Exception e) {
            log.error("[LectureController] Lỗi cập nhật lecture id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Xóa lecture.
     * Chỉ Teacher/Admin chủ course mới được xóa.
     */
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        log.info("[LectureController] Request xóa lecture id={}", id);
        try {
            lectureService.delete(id);
            log.info("[LectureController] Xóa lecture id={} thành công", id);
            return ApiResponse.success(null, "Xóa bài giảng thành công");
        } catch (Exception e) {
            log.error("[LectureController] Lỗi xóa lecture id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }
}
