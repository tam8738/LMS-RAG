package com.lmsrag.backend.service.admin;

import com.lmsrag.backend.dto.request.admin.teacher.TeacherBatchCreateRequest;
import com.lmsrag.backend.dto.request.admin.teacher.TeacherCreateRequest;
import com.lmsrag.backend.dto.request.admin.teacher.TeacherSearchRequest;
import com.lmsrag.backend.dto.request.admin.teacher.TeacherUpdateRequest;
import com.lmsrag.backend.dto.response.admin.teacher.PageResponse;
import com.lmsrag.backend.dto.response.admin.teacher.TeacherBatchCreateResponse;
import com.lmsrag.backend.dto.response.admin.teacher.TeacherResetPasswordResponse;
import com.lmsrag.backend.dto.response.admin.teacher.TeacherResponse;

public interface TeacherAdminService {

    PageResponse<TeacherResponse> searchTeachers(TeacherSearchRequest request);

    TeacherResponse createTeacher(TeacherCreateRequest request);

    TeacherBatchCreateResponse createTeachersBatch(TeacherBatchCreateRequest request);

    TeacherResponse updateTeacher(Long teacherId, TeacherUpdateRequest request);

    TeacherResponse activateTeacher(Long teacherId);

    TeacherResponse deactivateTeacher(Long teacherId);

    TeacherResetPasswordResponse resetPassword(Long teacherId);
}
