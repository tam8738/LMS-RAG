package com.lmsrag.backend.dto.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class DocumentCreateRequest {

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    private String title;

    @Size(max = 5000, message = "Mô tả tối đa 5000 ký tự")
    private String description;

    @Size(max = 150, message = "Subject tối đa 150 ký tự")
    private String subject;

    @Size(max = 255, message = "Topic tối đa 255 ký tự")
    private String topic;

    @Size(max = 100, message = "Chapter tối đa 100 ký tự")
    private String chapter;

    @Size(max = 20, message = "Tài liệu chỉ được có tối đa 20 tags")
    private List<
            @NotBlank(message = "Tag không được để trống")
            @Size(max = 100, message = "Mỗi tag tối đa 100 ký tự") String> tags = new ArrayList<>();
}
