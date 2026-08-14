package com.lmsrag.backend.controller;

import com.lmsrag.backend.service.DocumentService;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class DocumentControllerRangeTest {

    private static final long DOCUMENT_ID = 42L;
    private static final byte[] FILE_CONTENT = "0123456789".getBytes();

    @Mock
    private DocumentService documentService;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private Validator validator;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        DocumentController controller = new DocumentController(documentService, objectMapper, validator);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void contentWithoutRange_shouldReturnCompleteFileAndRangeHeaders() throws Exception {
        stubDocumentContent();

        mockMvc.perform(get("/api/v1/documents/{documentId}/content", DOCUMENT_ID))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
                .andExpect(header().longValue(HttpHeaders.CONTENT_LENGTH, FILE_CONTENT.length))
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "application/pdf"))
                .andExpect(content().bytes(FILE_CONTENT));
    }

    @Test
    void contentWithRange_shouldReturnOnlyRequestedBytes() throws Exception {
        stubDocumentContent();

        mockMvc.perform(get("/api/v1/documents/{documentId}/content", DOCUMENT_ID)
                        .header(HttpHeaders.RANGE, "bytes=2-5"))
                .andExpect(status().isPartialContent())
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes 2-5/10"))
                .andExpect(header().longValue(HttpHeaders.CONTENT_LENGTH, 4))
                .andExpect(content().bytes("2345".getBytes()));
    }

    @Test
    void contentWithUnsatisfiableRange_shouldReturn416() throws Exception {
        stubDocumentContent();

        mockMvc.perform(get("/api/v1/documents/{documentId}/content", DOCUMENT_ID)
                        .header(HttpHeaders.RANGE, "bytes=20-30"))
                .andExpect(status().isRequestedRangeNotSatisfiable())
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes */10"))
                .andExpect(header().longValue(HttpHeaders.CONTENT_LENGTH, 0));
    }

    @Test
    void headContent_shouldExposeLengthWithoutWritingBody() throws Exception {
        stubDocumentContent();

        mockMvc.perform(head("/api/v1/documents/{documentId}/content", DOCUMENT_ID))
                .andExpect(status().isOk())
                .andExpect(header().longValue(HttpHeaders.CONTENT_LENGTH, FILE_CONTENT.length))
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"));
    }

    private void stubDocumentContent() {
        when(documentService.getDocumentContent(DOCUMENT_ID, null)).thenReturn(
                new DocumentService.DocumentContent(
                        new ByteArrayResource(FILE_CONTENT),
                        "sample.pdf",
                        "application/pdf",
                        FILE_CONTENT.length
                )
        );
    }
}
