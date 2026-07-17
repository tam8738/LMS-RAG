package com.lmsrag.backend.service;

import com.lmsrag.backend.config.StorageProperties;
import com.lmsrag.backend.enums.DocumentFileType;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageService {

    private final StorageProperties storageProperties;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "txt");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "text/plain"
    );

    /**
     * Lưu file upload vào storage theo cấu trúc documents/{documentId}/{version}/source.{extension}
     *
     * @return storage_key dạng relative path
     */
    public String store(MultipartFile file, Long documentId, int version) {
        String extension = getFileExtension(file.getOriginalFilename());
        String storageKey = String.format("documents/%d/v%d/source.%s", documentId, version, extension);
        Path targetPath = resolvePath(storageKey);

        log.info("[STORAGE] Bắt đầu lưu file | documentId={} | version={} | storageKey={} | targetPath={}",
                documentId, version, storageKey, targetPath);

        try {
            Path parentDir = targetPath.getParent();
            log.info("[STORAGE] Tạo thư mục cha | parentDir={}", parentDir);
            Files.createDirectories(parentDir);

            log.info("[STORAGE] Transfer file | originalFilename={} | targetPath={}",
                    file.getOriginalFilename(), targetPath);
            file.transferTo(targetPath);

            log.info("[STORAGE] Lưu file thành công | storageKey={} | absolutePath={} | size={}",
                    storageKey, targetPath, Files.size(targetPath));
            return storageKey;
        } catch (IOException e) {
            log.error("[STORAGE] Lỗi lưu file | storageKey={} | targetPath={} | error={}",
                    storageKey, targetPath, e.getMessage(), e);
            throw new AppException(ErrorCode.FILE_STORE_FAILED);
        }
    }

    /**
     * Xóa file theo storage_key.
     */
    public void delete(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }
        try {
            Path path = resolvePath(storageKey);
            boolean deleted = Files.deleteIfExists(path);
            if (deleted) {
                log.info("Deleted file at storage_key={}", storageKey);
            }
        } catch (IOException e) {
            log.error("Failed to delete file storage_key={}", storageKey, e);
        }
    }

    /**
     * Đọc file từ storage_key dướI dạng Resource để stream về client.
     *
     * @throws AppException nếu file không tồn tại hoặc không đọc được
     */
    public Resource loadFileAsResource(String storageKey) {
        Path path = resolvePath(storageKey);
        if (!Files.exists(path)) {
            log.error("[STORAGE] File not found | storageKey={} | path={}", storageKey, path);
            throw new AppException(ErrorCode.FILE_STORE_FAILED);
        }
        try {
            InputStream inputStream = Files.newInputStream(path);
            return new InputStreamResource(inputStream);
        } catch (IOException e) {
            log.error("[STORAGE] Failed to read file | storageKey={} | error={}", storageKey, e.getMessage(), e);
            throw new AppException(ErrorCode.FILE_STORE_FAILED);
        }
    }

    /**
     * Chuyển storage_key thành absolute path.
     */
    public Path resolvePath(String storageKey) {
        return Paths.get(storageProperties.getUploadRoot(), storageKey).toAbsolutePath().normalize();
    }

    /**
     * Validate loại file và dung lượng cơ bản.
     */
    public void validateFile(MultipartFile file) {
        log.info("[STORAGE] Validate file | name={} | size={} | contentType={}",
                file.getOriginalFilename(), file.getSize(), file.getContentType());

        if (file == null || file.isEmpty()) {
            log.warn("[STORAGE] File validation failed: file is null or empty");
            throw new AppException(ErrorCode.FILE_EMPTY);
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            log.warn("[STORAGE] File validation failed: original filename is blank");
            throw new AppException(ErrorCode.FILE_INVALID_TYPE);
        }

        String extension = getFileExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            log.warn("[STORAGE] File validation failed: extension '{}' not allowed", extension);
            throw new AppException(ErrorCode.FILE_INVALID_TYPE);
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            log.warn("[STORAGE] File validation failed: content type '{}' not allowed", contentType);
            throw new AppException(ErrorCode.FILE_INVALID_TYPE);
        }

        log.info("[STORAGE] File validation passed | extension={} | contentType={}", extension, contentType);
    }

    /**
     * Lấy phần mở rộng file và chuyển về chữ thường.
     */
    public String getFileExtension(String filename) {
        if (filename == null || filename.isBlank()) {
            return "";
        }
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1 || lastDotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDotIndex + 1).toLowerCase(Locale.ROOT);
    }

    /**
     * Xác định DocumentFileType từ extension.
     */
    public DocumentFileType resolveFileType(String filename) {
        String extension = getFileExtension(filename);
        return switch (extension) {
            case "pdf" -> DocumentFileType.PDF;
            case "txt" -> DocumentFileType.TXT;
            default -> throw new AppException(ErrorCode.FILE_INVALID_TYPE);
        };
    }
}
