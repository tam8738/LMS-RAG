package com.lmsrag.backend.service;

import com.lmsrag.backend.client.ai.AiServiceClient;
import com.lmsrag.backend.client.ai.AiServiceException;
import com.lmsrag.backend.dto.ai.AiGenerateQuizRequest;
import com.lmsrag.backend.dto.ai.AiGenerateQuizResult;
import com.lmsrag.backend.dto.ai.AiQuizCitation;
import com.lmsrag.backend.dto.ai.AiQuizOption;
import com.lmsrag.backend.dto.ai.AiQuizQuestion;
import com.lmsrag.backend.dto.quiz.QuizGenerateRequest;
import com.lmsrag.backend.dto.quiz.QuizOptionDto;
import com.lmsrag.backend.dto.quiz.QuizQuestionUpdateRequest;
import com.lmsrag.backend.dto.quiz.QuizResponse;
import com.lmsrag.backend.dto.quiz.QuizUpdateRequest;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.Quiz;
import com.lmsrag.backend.entity.QuizQuestion;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.AiProcessingStatus;
import com.lmsrag.backend.enums.DocumentFileType;
import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.enums.QuizStatus;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.enums.UserStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.DocumentRepository;
import com.lmsrag.backend.repository.QuizQuestionRepository;
import com.lmsrag.backend.repository.QuizRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuizServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private QuizQuestionRepository quizQuestionRepository;

    @Mock
    private AiServiceClient aiServiceClient;

    @Mock
    private TransactionTemplate transactionTemplate;

    @Mock
    private AiRequestGuard aiRequestGuard;

    private QuizService quizService;
    private User teacher;
    private User otherTeacher;
    private Document eligibleDocument;
    private Quiz draftQuiz;
    private QuizQuestion storedQuestion;
    private AtomicBoolean transactionTemplateActive;

    @BeforeEach
    void setUp() {
        transactionTemplateActive = new AtomicBoolean(false);
        lenient().when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> callback = invocation.getArgument(0);
            assertThat(transactionTemplateActive.compareAndSet(false, true)).isTrue();
            try {
                return callback.doInTransaction(null);
            } finally {
                transactionTemplateActive.set(false);
            }
        });
        lenient().when(aiRequestGuard.execute(any(), any(), any())).thenAnswer(invocation -> {
            Supplier<?> action = invocation.getArgument(2);
            return action.get();
        });

        quizService = new QuizService(
                documentRepository,
                quizRepository,
                quizQuestionRepository,
                aiServiceClient,
                transactionTemplate,
                aiRequestGuard
        );
        teacher = createUser(1L, "teacher.a@example.com");
        otherTeacher = createUser(2L, "teacher.b@example.com");
        eligibleDocument = createDocument(PublicationStatus.PUBLISHED, AiProcessingStatus.PROCESSED);
        eligibleDocument.setUploadedBy(otherTeacher);
        draftQuiz = createQuiz(100L, QuizStatus.DRAFT, teacher);
        storedQuestion = createStoredQuestion(501L, draftQuiz);
    }

    @Test
    void generateQuiz_shouldAllowNonDocumentOwnerAndPersistAiDraft() {
        QuizGenerateRequest request = generateRequest();
        AiGenerateQuizResult aiResult = createAiResult();

        when(documentRepository.findById(10L)).thenReturn(Optional.of(eligibleDocument));
        when(aiServiceClient.generateQuizSync(any(AiGenerateQuizRequest.class))).thenAnswer(invocation -> {
            assertThat(transactionTemplateActive).isFalse();
            return aiResult;
        });
        when(quizRepository.save(any(Quiz.class))).thenAnswer(invocation -> {
            Quiz quiz = invocation.getArgument(0);
            quiz.setId(100L);
            return quiz;
        });
        when(quizQuestionRepository.saveAll(anyList())).thenAnswer(invocation -> {
            List<QuizQuestion> questions = invocation.getArgument(0);
            for (int index = 0; index < questions.size(); index++) {
                questions.get(index).setId(501L + index);
            }
            return questions;
        });

        QuizResponse response = quizService.generateQuiz(teacher, request);

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getDocumentId()).isEqualTo(10L);
        assertThat(response.getCreatedById()).isEqualTo(1L);
        assertThat(response.getStatus()).isEqualTo(QuizStatus.DRAFT);
        assertThat(response.getQuestionCount()).isEqualTo(1);
        assertThat(response.getQuestions()).hasSize(1);
        assertThat(response.getQuestions().getFirst().getCorrectOptionIds()).containsExactly("B");
        assertThat(response.getQuestions().getFirst().getCitations()).hasSize(1);

        ArgumentCaptor<AiGenerateQuizRequest> aiRequestCaptor = ArgumentCaptor.forClass(AiGenerateQuizRequest.class);
        verify(aiServiceClient).generateQuizSync(aiRequestCaptor.capture());
        assertThat(aiRequestCaptor.getValue().documentIds()).containsExactly(10L);
        assertThat(aiRequestCaptor.getValue().questionCount()).isEqualTo(1);
        assertThat(aiRequestCaptor.getValue().language()).isEqualTo("vi");

        ArgumentCaptor<Quiz> quizCaptor = ArgumentCaptor.forClass(Quiz.class);
        verify(quizRepository).save(quizCaptor.capture());
        assertThat(quizCaptor.getValue().getCreatedBy().getId()).isEqualTo(1L);
        assertThat(quizCaptor.getValue().getDocument().getUploadedBy().getId()).isEqualTo(2L);
        verify(transactionTemplate, times(2)).execute(any());
    }

    @Test
    void generateQuiz_whenDocumentMissing_shouldStopBeforeCallingAi() {
        when(documentRepository.findById(10L)).thenReturn(Optional.empty());

        assertError(() -> quizService.generateQuiz(teacher, generateRequest()), ErrorCode.DOCUMENT_NOT_FOUND);

        verify(aiServiceClient, never()).generateQuizSync(any());
        verify(quizRepository, never()).save(any());
    }

    @Test
    void generateQuiz_whenDocumentNotPublished_shouldStopBeforeCallingAi() {
        eligibleDocument.setPublicationStatus(PublicationStatus.DRAFT);
        when(documentRepository.findById(10L)).thenReturn(Optional.of(eligibleDocument));

        assertError(() -> quizService.generateQuiz(teacher, generateRequest()), ErrorCode.DOCUMENT_NOT_PUBLISHED);

        verify(aiServiceClient, never()).generateQuizSync(any());
    }

    @Test
    void generateQuiz_whenDocumentNotProcessed_shouldStopBeforeCallingAi() {
        eligibleDocument.setProcessingStatus(AiProcessingStatus.ANALYZED);
        when(documentRepository.findById(10L)).thenReturn(Optional.of(eligibleDocument));

        assertError(() -> quizService.generateQuiz(teacher, generateRequest()), ErrorCode.DOCUMENT_NOT_PROCESSED);

        verify(aiServiceClient, never()).generateQuizSync(any());
    }

    @Test
    void generateQuiz_whenAiFails_shouldReturnQuizGenerateFailedAndPersistNothing() {
        when(documentRepository.findById(10L)).thenReturn(Optional.of(eligibleDocument));
        when(aiServiceClient.generateQuizSync(any()))
                .thenThrow(new AiServiceException("NO_CHUNKS_FOUND", "No chunks"));

        assertError(() -> quizService.generateQuiz(teacher, generateRequest()), ErrorCode.QUIZ_GENERATE_FAILED);

        verify(quizRepository, never()).save(any());
        verify(quizQuestionRepository, never()).saveAll(anyList());
    }

    @Test
    void getQuiz_whenOwner_shouldReturnFullQuestions() {
        when(quizRepository.findById(100L)).thenReturn(Optional.of(draftQuiz));
        when(quizQuestionRepository.findByQuizIdOrderByQuestionIndex(100L))
                .thenReturn(List.of(storedQuestion));

        QuizResponse response = quizService.getQuiz(teacher, 100L);

        assertThat(response.getQuestions()).hasSize(1);
        assertThat(response.getQuestions().getFirst().getExplanation()).isEqualTo("Giải thích");
    }

    @Test
    void listMyQuizzes_shouldLoadOnePageAndBatchAllQuestions() {
        Quiz secondQuiz = createQuiz(101L, QuizStatus.PUBLISHED, teacher);
        QuizQuestion secondQuestion = createStoredQuestion(502L, secondQuiz);
        Pageable pageable = PageRequest.of(0, 12);
        Page<Quiz> quizPage = new PageImpl<>(List.of(draftQuiz, secondQuiz), pageable, 2);

        when(quizRepository.searchByCreatedBy(1L, null, null, pageable)).thenReturn(quizPage);
        when(quizQuestionRepository.findAllByQuizIds(List.of(100L, 101L)))
                .thenReturn(List.of(storedQuestion, secondQuestion));

        Page<QuizResponse> response = quizService.listMyQuizzes(teacher, null, null, pageable);

        assertThat(response.getTotalElements()).isEqualTo(2);
        assertThat(response.getContent()).hasSize(2);
        assertThat(response.getContent().get(0).getQuestions()).hasSize(1);
        assertThat(response.getContent().get(1).getQuestions()).hasSize(1);
        verify(quizQuestionRepository).findAllByQuizIds(List.of(100L, 101L));
        verify(quizQuestionRepository, never()).findByQuizIdOrderByQuestionIndex(any());
    }

    @Test
    void getQuiz_whenNotOwner_shouldRejectWithoutLoadingQuestions() {
        when(quizRepository.findById(100L)).thenReturn(Optional.of(draftQuiz));

        assertError(() -> quizService.getQuiz(otherTeacher, 100L), ErrorCode.QUIZ_ACCESS_DENIED);

        verify(quizQuestionRepository, never()).findByQuizIdOrderByQuestionIndex(100L);
    }

    @Test
    void updateQuiz_whenPublished_shouldReject() {
        draftQuiz.setStatus(QuizStatus.PUBLISHED);
        when(quizRepository.findById(100L)).thenReturn(Optional.of(draftQuiz));

        assertError(() -> quizService.updateQuiz(teacher, 100L, new QuizUpdateRequest()), ErrorCode.QUIZ_NOT_DRAFT);

        verify(quizRepository, never()).save(any());
    }

    @Test
    void updateQuiz_shouldPatchOwnedQuestionAndKeepCitations() {
        QuizUpdateRequest request = new QuizUpdateRequest();
        request.setTitle("Tiêu đề mới");
        QuizQuestionUpdateRequest questionUpdate = new QuizQuestionUpdateRequest();
        questionUpdate.setId(501L);
        questionUpdate.setQuestion("Câu hỏi đã sửa?");
        questionUpdate.setOptions(List.of(
                new QuizOptionDto("A", "Sai"),
                new QuizOptionDto("B", "Đúng")
        ));
        questionUpdate.setCorrectOptionIds(List.of("B"));
        questionUpdate.setExplanation("Giải thích mới");
        request.setQuestions(List.of(questionUpdate));

        when(quizRepository.findById(100L)).thenReturn(Optional.of(draftQuiz));
        when(quizQuestionRepository.findByQuizIdOrderByQuestionIndex(100L))
                .thenReturn(new ArrayList<>(List.of(storedQuestion)));
        when(quizRepository.save(draftQuiz)).thenReturn(draftQuiz);
        when(quizQuestionRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        QuizResponse response = quizService.updateQuiz(teacher, 100L, request);

        assertThat(response.getTitle()).isEqualTo("Tiêu đề mới");
        assertThat(response.getQuestions().getFirst().getQuestion()).isEqualTo("Câu hỏi đã sửa?");
        assertThat(response.getQuestions().getFirst().getCorrectOptionIds()).containsExactly("B");
        assertThat(response.getQuestions().getFirst().getCitations()).hasSize(1);
        verify(quizQuestionRepository).saveAll(anyList());
    }

    @Test
    void updateQuiz_whenQuestionDoesNotBelongToQuiz_shouldReject() {
        QuizUpdateRequest request = new QuizUpdateRequest();
        QuizQuestionUpdateRequest questionUpdate = new QuizQuestionUpdateRequest();
        questionUpdate.setId(999L);
        request.setQuestions(List.of(questionUpdate));

        when(quizRepository.findById(100L)).thenReturn(Optional.of(draftQuiz));
        when(quizQuestionRepository.findByQuizIdOrderByQuestionIndex(100L))
                .thenReturn(List.of(storedQuestion));

        assertError(() -> quizService.updateQuiz(teacher, 100L, request), ErrorCode.INVALID_INPUT);

        verify(quizQuestionRepository, never()).saveAll(anyList());
    }

    @Test
    void updateQuiz_whenCorrectOptionDoesNotExist_shouldReject() {
        QuizUpdateRequest request = new QuizUpdateRequest();
        QuizQuestionUpdateRequest questionUpdate = new QuizQuestionUpdateRequest();
        questionUpdate.setId(501L);
        questionUpdate.setOptions(List.of(
                new QuizOptionDto("A", "Một"),
                new QuizOptionDto("B", "Hai")
        ));
        questionUpdate.setCorrectOptionIds(List.of("C"));
        request.setQuestions(List.of(questionUpdate));

        when(quizRepository.findById(100L)).thenReturn(Optional.of(draftQuiz));
        when(quizQuestionRepository.findByQuizIdOrderByQuestionIndex(100L))
                .thenReturn(List.of(storedQuestion));

        assertError(() -> quizService.updateQuiz(teacher, 100L, request), ErrorCode.INVALID_INPUT);
    }

    @Test
    void publishQuiz_shouldTransitionDraftToPublished() {
        when(quizRepository.findById(100L)).thenReturn(Optional.of(draftQuiz));
        when(quizRepository.save(draftQuiz)).thenReturn(draftQuiz);
        when(quizQuestionRepository.findByQuizIdOrderByQuestionIndex(100L))
                .thenReturn(List.of(storedQuestion));

        QuizResponse response = quizService.publishQuiz(teacher, 100L);

        assertThat(response.getStatus()).isEqualTo(QuizStatus.PUBLISHED);
        assertThat(response.getPublishedAt()).isNotNull();
    }

    @Test
    void publishQuiz_whenAlreadyPublished_shouldReject() {
        draftQuiz.setStatus(QuizStatus.PUBLISHED);
        when(quizRepository.findById(100L)).thenReturn(Optional.of(draftQuiz));

        assertError(() -> quizService.publishQuiz(teacher, 100L), ErrorCode.QUIZ_NOT_DRAFT);

        verify(quizRepository, never()).save(any());
    }

    private QuizGenerateRequest generateRequest() {
        QuizGenerateRequest request = new QuizGenerateRequest();
        request.setDocumentId(10L);
        request.setQuestionCount(1);
        return request;
    }

    private AiGenerateQuizResult createAiResult() {
        return new AiGenerateQuizResult(
                "Quiz chuẩn hóa",
                "Ôn tập chương chuẩn hóa",
                List.of(new AiQuizQuestion(
                        "Mục tiêu chuẩn hóa là gì?",
                        "single_choice",
                        List.of(
                                new AiQuizOption("A", "Tăng dư thừa"),
                                new AiQuizOption("B", "Giảm dư thừa")
                        ),
                        List.of("B"),
                        "Chuẩn hóa giúp giảm dư thừa.",
                        List.of(new AiQuizCitation(30L, 10L, 5, 7, "Giảm dư thừa dữ liệu"))
                )),
                200
        );
    }

    private User createUser(Long id, String email) {
        return User.builder()
                .id(id)
                .email(email)
                .password("encoded")
                .name(email)
                .role(UserRole.TEACHER)
                .status(UserStatus.ACTIVE)
                .build();
    }

    private Document createDocument(PublicationStatus publicationStatus, AiProcessingStatus processingStatus) {
        return Document.builder()
                .id(10L)
                .uploadedBy(teacher)
                .title("Cơ sở dữ liệu")
                .tags(List.of())
                .originalFilename("source.pdf")
                .storedFilename("source.pdf")
                .storageKey("documents/10/v1/source.pdf")
                .fileVersion(1)
                .fileType(DocumentFileType.PDF)
                .fileSize(1000L)
                .processingStatus(processingStatus)
                .publicationStatus(publicationStatus)
                .build();
    }

    private Quiz createQuiz(Long id, QuizStatus status, User owner) {
        return Quiz.builder()
                .id(id)
                .document(eligibleDocument)
                .createdBy(owner)
                .title("Quiz cũ")
                .description("Mô tả")
                .status(status)
                .questionCount(1)
                .language("vi")
                .tokensUsed(200)
                .build();
    }

    private QuizQuestion createStoredQuestion(Long id, Quiz quiz) {
        return QuizQuestion.builder()
                .id(id)
                .quiz(quiz)
                .questionIndex(0)
                .questionText("Câu hỏi cũ?")
                .questionType("single_choice")
                .optionsJson(List.of(
                        new QuizOptionDto("A", "Sai"),
                        new QuizOptionDto("B", "Đúng")
                ))
                .correctOptionIds(List.of("B"))
                .explanation("Giải thích")
                .citationsJson(List.of(new com.lmsrag.backend.dto.quiz.QuizCitationDto(
                        30L, 10L, 5, 7, "Nguồn thật"
                )))
                .build();
    }

    private void assertError(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getErrorCode()).isEqualTo(errorCode));
    }
}
