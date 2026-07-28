package com.lmsrag.backend.service;

import com.lmsrag.backend.config.StorageProperties;
import com.lmsrag.backend.enums.DocumentFileType;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class StorageServiceTest {

    @Mock
    private StorageProperties storageProperties;

    private StorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new StorageService(storageProperties);
    }

    @Test
    void validateFile_shouldAcceptPdfFile() {
        MultipartFile file = new MockMultipartFile(
                "file",
                "document.pdf",
                "application/pdf",
                "PDF content".getBytes()
        );

        assertThatCode(() -> storageService.validateFile(file)).doesNotThrowAnyException();
    }

    @Test
    void validateFile_shouldAcceptTxtFile() {
        MultipartFile file = new MockMultipartFile(
                "file",
                "document.txt",
                "text/plain",
                "Plain text content".getBytes()
        );

        assertThatCode(() -> storageService.validateFile(file)).doesNotThrowAnyException();
    }

    @Test
    void validateFile_shouldAcceptDocxFile() {
        MultipartFile file = new MockMultipartFile(
                "file",
                "document.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "DOCX content".getBytes()
        );

        assertThatCode(() -> storageService.validateFile(file)).doesNotThrowAnyException();
    }

    @Test
    void validateFile_shouldRejectUnsupportedExtension() {
        MultipartFile file = new MockMultipartFile(
                "file",
                "document.jpg",
                "image/jpeg",
                "image content".getBytes()
        );

        assertThatThrownBy(() -> storageService.validateFile(file))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getErrorCode()).isEqualTo(ErrorCode.FILE_INVALID_TYPE));
    }

    @Test
    void resolveFileType_shouldReturnDocxForDocxExtension() {
        DocumentFileType fileType = storageService.resolveFileType("document.docx");
        assertThat(fileType).isEqualTo(DocumentFileType.DOCX);
    }

    @Test
    void getFileExtension_shouldReturnLowerCaseExtension() {
        assertThat(storageService.getFileExtension("document.DOCX")).isEqualTo("docx");
    }
}
