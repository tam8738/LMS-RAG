package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.repository.DocumentProcessingJobRepository;
import com.lmsrag.backend.repository.DocumentRepository;
import com.lmsrag.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private DocumentProcessingJobRepository documentProcessingJobRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private StorageService storageService;
    @Mock
    private AiValidationService aiValidationService;
    @Mock
    private AiIndexService aiIndexService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private DocumentService documentService;

    @Test
    void getLibraryDocuments_shouldLoadRelatedUsersOnceForTheWholePage() {
        User uploader = org.mockito.Mockito.mock(User.class);
        User reviewer = org.mockito.Mockito.mock(User.class);
        when(uploader.getId()).thenReturn(1L);
        when(uploader.getName()).thenReturn("Teacher");
        when(reviewer.getId()).thenReturn(2L);
        when(reviewer.getName()).thenReturn("Admin");

        Document first = Document.builder().id(10L).uploadedBy(uploader).reviewedBy(reviewer).build();
        Document second = Document.builder().id(11L).uploadedBy(uploader).reviewedBy(reviewer).build();
        Pageable pageable = PageRequest.of(0, 20);
        Page<Document> documentPage = new PageImpl<>(List.of(first, second), pageable, 2);

        when(documentRepository.findByPublicationStatusOrderByPublishedAtDesc(
                PublicationStatus.PUBLISHED,
                pageable
        )).thenReturn(documentPage);
        when(userRepository.findAllById(any())).thenReturn(List.of(uploader, reviewer));

        Page<DocumentResponse> response = documentService.getLibraryDocuments(
                null, null, null, null, null, null, pageable
        );

        assertThat(response.getContent()).extracting(DocumentResponse::getUploaderName)
                .containsExactly("Teacher", "Teacher");
        assertThat(response.getContent()).extracting(DocumentResponse::getReviewerName)
                .containsExactly("Admin", "Admin");
        verify(userRepository).findAllById(any());
        verify(uploader, times(1)).getName();
        verify(reviewer, times(1)).getName();
    }
}
