package com.lmsrag.backend.service;

import com.lmsrag.backend.client.ai.AiServiceClient;
import com.lmsrag.backend.client.ai.AiServiceException;
import com.lmsrag.backend.dto.ai.AiGenerateQuizRequest;
import com.lmsrag.backend.dto.ai.AiGenerateQuizResult;
import com.lmsrag.backend.dto.ai.AiQuizCitation;
import com.lmsrag.backend.dto.ai.AiQuizOption;
import com.lmsrag.backend.dto.ai.AiQuizQuestion;
import com.lmsrag.backend.dto.quiz.QuizCitationDto;
import com.lmsrag.backend.dto.quiz.QuizGenerateRequest;
import com.lmsrag.backend.dto.quiz.QuizOptionDto;
import com.lmsrag.backend.dto.quiz.QuizQuestionResponse;
import com.lmsrag.backend.dto.quiz.QuizQuestionUpdateRequest;
import com.lmsrag.backend.dto.quiz.QuizResponse;
import com.lmsrag.backend.dto.quiz.QuizUpdateRequest;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.Quiz;
import com.lmsrag.backend.entity.QuizQuestion;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.AiProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.enums.QuizStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.DocumentRepository;
import com.lmsrag.backend.repository.QuizQuestionRepository;
import com.lmsrag.backend.repository.QuizRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Nghiệp vụ sinh, xem, sửa và công bố quiz của Teacher. */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuizService {

    private static final String SINGLE_CHOICE = "single_choice";

    private final DocumentRepository documentRepository;
    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final AiServiceClient aiServiceClient;

    /** Sinh quiz từ một document PUBLISHED + PROCESSED và lưu toàn bộ draft. */
    @Transactional
    public QuizResponse generateQuiz(User currentUser, QuizGenerateRequest request) {
        Long documentId = request.getDocumentId();
        log.info("[QUIZ] Bắt đầu sinh quiz | userId={} | documentId={} | questionCount={} | language={}",
                currentUser.getId(), documentId, request.getQuestionCount(), request.getLanguage());

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> {
                    log.warn("[QUIZ] Document không tồn tại | userId={} | documentId={}",
                            currentUser.getId(), documentId);
                    return new AppException(ErrorCode.DOCUMENT_NOT_FOUND);
                });
        requireQuizEligibleDocument(currentUser, document);

        AiGenerateQuizResult aiResult;
        try {
            aiResult = aiServiceClient.generateQuizSync(AiGenerateQuizRequest.from(
                    documentId,
                    request.getQuestionCount(),
                    request.getLanguage()
            ));
        } catch (AiServiceException exception) {
            log.error("[QUIZ] AI không thể sinh quiz | userId={} | documentId={} | aiCode={}",
                    currentUser.getId(), documentId, exception.getErrorCode());
            throw new AppException(ErrorCode.QUIZ_GENERATE_FAILED);
        }

        Quiz quiz = Quiz.builder()
                .document(document)
                .createdBy(currentUser)
                .title(aiResult.title().trim())
                .description(aiResult.description())
                .status(QuizStatus.DRAFT)
                .questionCount(aiResult.questions().size())
                .language(request.getLanguage())
                .tokensUsed(aiResult.tokensUsed() != null ? aiResult.tokensUsed() : 0)
                .build();
        Quiz savedQuiz = quizRepository.save(quiz);

        List<QuizQuestion> questions = new ArrayList<>();
        for (int index = 0; index < aiResult.questions().size(); index++) {
            questions.add(toEntity(savedQuiz, index, aiResult.questions().get(index)));
        }
        List<QuizQuestion> savedQuestions = quizQuestionRepository.saveAll(questions);

        log.info("[QUIZ] Sinh quiz thành công | userId={} | quizId={} | documentId={} | questions={}",
                currentUser.getId(), savedQuiz.getId(), documentId, savedQuestions.size());
        return toResponse(savedQuiz, savedQuestions);
    }

    /** Lấy full quiz; chỉ Teacher owner được truy cập. */
    @Transactional(readOnly = true)
    public QuizResponse getQuiz(User currentUser, Long quizId) {
        Quiz quiz = findQuiz(quizId);
        requireOwner(quiz, currentUser);
        List<QuizQuestion> questions = quizQuestionRepository.findByQuizIdOrderByQuestionIndex(quizId);
        return toResponse(quiz, questions);
    }

    /** Cập nhật metadata/câu hỏi của một quiz DRAFT. */
    @Transactional
    public QuizResponse updateQuiz(User currentUser, Long quizId, QuizUpdateRequest request) {
        log.info("[QUIZ] Bắt đầu cập nhật quiz | userId={} | quizId={}", currentUser.getId(), quizId);
        Quiz quiz = findQuiz(quizId);
        requireOwner(quiz, currentUser);
        requireDraft(quiz, currentUser);

        if (request.getTitle() != null) {
            quiz.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            quiz.setDescription(request.getDescription().trim());
        }

        List<QuizQuestion> questions = quizQuestionRepository.findByQuizIdOrderByQuestionIndex(quizId);
        if (request.getQuestions() != null) {
            applyQuestionUpdates(quizId, questions, request.getQuestions());
            quizQuestionRepository.saveAll(questions);
        }

        Quiz savedQuiz = quizRepository.save(quiz);
        log.info("[QUIZ] Cập nhật quiz thành công | userId={} | quizId={} | status={}",
                currentUser.getId(), quizId, savedQuiz.getStatus());
        return toResponse(savedQuiz, questions);
    }

    /** Chuyển quiz từ DRAFT sang PUBLISHED; không hỗ trợ chuyển ngược. */
    @Transactional
    public QuizResponse publishQuiz(User currentUser, Long quizId) {
        log.info("[QUIZ] Bắt đầu publish quiz | userId={} | quizId={}", currentUser.getId(), quizId);
        Quiz quiz = findQuiz(quizId);
        requireOwner(quiz, currentUser);
        requireDraft(quiz, currentUser);

        quiz.setStatus(QuizStatus.PUBLISHED);
        quiz.setPublishedAt(Instant.now());
        Quiz savedQuiz = quizRepository.save(quiz);
        List<QuizQuestion> questions = quizQuestionRepository.findByQuizIdOrderByQuestionIndex(quizId);

        log.info("[QUIZ] Publish quiz thành công | userId={} | quizId={} | documentId={}",
                currentUser.getId(), quizId, quiz.getDocument().getId());
        return toResponse(savedQuiz, questions);
    }

    private Quiz findQuiz(Long quizId) {
        return quizRepository.findById(quizId)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_FOUND));
    }

    private void requireQuizEligibleDocument(User currentUser, Document document) {
        if (document.getPublicationStatus() != PublicationStatus.PUBLISHED) {
            log.warn("[QUIZ] Document chưa PUBLISHED | userId={} | documentId={} | status={}",
                    currentUser.getId(), document.getId(), document.getPublicationStatus());
            throw new AppException(ErrorCode.DOCUMENT_NOT_PUBLISHED);
        }
        if (document.getProcessingStatus() != AiProcessingStatus.PROCESSED) {
            log.warn("[QUIZ] Document chưa PROCESSED | userId={} | documentId={} | status={}",
                    currentUser.getId(), document.getId(), document.getProcessingStatus());
            throw new AppException(ErrorCode.DOCUMENT_NOT_PROCESSED);
        }
    }

    private void requireOwner(Quiz quiz, User currentUser) {
        Long ownerId = quiz.getCreatedBy() != null ? quiz.getCreatedBy().getId() : null;
        Long userId = currentUser != null ? currentUser.getId() : null;
        if (!Objects.equals(ownerId, userId)) {
            log.warn("[QUIZ] Truy cập quiz không được phép | userId={} | quizId={} | ownerId={}",
                    userId, quiz.getId(), ownerId);
            throw new AppException(ErrorCode.QUIZ_ACCESS_DENIED);
        }
    }

    private void requireDraft(Quiz quiz, User currentUser) {
        if (quiz.getStatus() != QuizStatus.DRAFT) {
            log.warn("[QUIZ] Quiz không còn là DRAFT | userId={} | quizId={} | status={}",
                    currentUser.getId(), quiz.getId(), quiz.getStatus());
            throw new AppException(ErrorCode.QUIZ_NOT_DRAFT);
        }
    }

    private void applyQuestionUpdates(
            Long quizId,
            List<QuizQuestion> questions,
            List<QuizQuestionUpdateRequest> updates
    ) {
        Map<Long, QuizQuestion> questionsById = new HashMap<>();
        for (QuizQuestion question : questions) {
            questionsById.put(question.getId(), question);
        }

        Set<Long> updatedIds = new HashSet<>();
        for (QuizQuestionUpdateRequest update : updates) {
            if (!updatedIds.add(update.getId())) {
                log.warn("[QUIZ] Question ID bị lặp trong PATCH | quizId={} | questionId={}",
                        quizId, update.getId());
                throw new AppException(ErrorCode.INVALID_INPUT);
            }

            QuizQuestion question = questionsById.get(update.getId());
            if (question == null) {
                log.warn("[QUIZ] Question không thuộc quiz | quizId={} | questionId={}",
                        quizId, update.getId());
                throw new AppException(ErrorCode.INVALID_INPUT);
            }
            applyQuestionUpdate(question, update);
            validateQuestionState(question);
        }
    }

    private void applyQuestionUpdate(QuizQuestion question, QuizQuestionUpdateRequest update) {
        if (update.getQuestion() != null) {
            question.setQuestionText(update.getQuestion().trim());
        }
        if (update.getType() != null) {
            question.setQuestionType(update.getType());
        }
        if (update.getOptions() != null) {
            question.setOptionsJson(update.getOptions().stream()
                    .map(option -> new QuizOptionDto(option.id(), option.text().trim()))
                    .toList());
        }
        if (update.getCorrectOptionIds() != null) {
            question.setCorrectOptionIds(List.copyOf(update.getCorrectOptionIds()));
        }
        if (update.getExplanation() != null) {
            question.setExplanation(update.getExplanation().trim());
        }
    }

    private void validateQuestionState(QuizQuestion question) {
        if (!SINGLE_CHOICE.equals(question.getQuestionType())
                || question.getOptionsJson() == null
                || question.getOptionsJson().size() < 2
                || question.getOptionsJson().size() > 4
                || question.getCorrectOptionIds() == null
                || question.getCorrectOptionIds().size() != 1) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }

        Set<String> optionIds = new HashSet<>();
        for (QuizOptionDto option : question.getOptionsJson()) {
            if (!optionIds.add(option.id())) {
                throw new AppException(ErrorCode.INVALID_INPUT);
            }
        }
        if (!optionIds.contains(question.getCorrectOptionIds().getFirst())) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }
    }

    private QuizQuestion toEntity(Quiz quiz, int questionIndex, AiQuizQuestion aiQuestion) {
        return QuizQuestion.builder()
                .quiz(quiz)
                .questionIndex(questionIndex)
                .questionText(aiQuestion.question())
                .questionType(aiQuestion.type())
                .optionsJson(mapOptions(aiQuestion.options()))
                .correctOptionIds(List.copyOf(aiQuestion.correctOptionIds()))
                .explanation(aiQuestion.explanation())
                .citationsJson(mapCitations(aiQuestion.citations()))
                .build();
    }

    private List<QuizOptionDto> mapOptions(List<AiQuizOption> options) {
        if (options == null) {
            return List.of();
        }
        return options.stream()
                .map(option -> new QuizOptionDto(option.id(), option.text()))
                .toList();
    }

    private List<QuizCitationDto> mapCitations(List<AiQuizCitation> citations) {
        if (citations == null) {
            return List.of();
        }
        return citations.stream()
                .map(citation -> new QuizCitationDto(
                        citation.chunkId(),
                        citation.documentId(),
                        citation.pageNumber(),
                        citation.chunkIndex(),
                        citation.excerpt()
                ))
                .toList();
    }

    private QuizResponse toResponse(Quiz quiz, List<QuizQuestion> questions) {
        return QuizResponse.builder()
                .id(quiz.getId())
                .documentId(quiz.getDocument().getId())
                .createdById(quiz.getCreatedBy().getId())
                .title(quiz.getTitle())
                .description(quiz.getDescription())
                .status(quiz.getStatus())
                .questionCount(quiz.getQuestionCount())
                .language(quiz.getLanguage())
                .tokensUsed(quiz.getTokensUsed())
                .publishedAt(quiz.getPublishedAt())
                .createdAt(quiz.getCreatedAt())
                .updatedAt(quiz.getUpdatedAt())
                .questions(questions.stream().map(this::toQuestionResponse).toList())
                .build();
    }

    private QuizQuestionResponse toQuestionResponse(QuizQuestion question) {
        return QuizQuestionResponse.builder()
                .id(question.getId())
                .questionIndex(question.getQuestionIndex())
                .question(question.getQuestionText())
                .type(question.getQuestionType())
                .options(question.getOptionsJson())
                .correctOptionIds(question.getCorrectOptionIds())
                .explanation(question.getExplanation())
                .citations(question.getCitationsJson())
                .build();
    }
}
