CREATE TABLE IF NOT EXISTS quizzes (
    id              BIGSERIAL PRIMARY KEY,
    document_id     BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_by      BIGINT NOT NULL REFERENCES users(id),
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    question_count  INTEGER NOT NULL DEFAULT 0,
    language        VARCHAR(10) NOT NULL DEFAULT 'vi',
    tokens_used     INTEGER NOT NULL DEFAULT 0,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_quiz_status CHECK (status IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT ck_quiz_qcount CHECK (question_count >= 0),
    CONSTRAINT ck_quiz_tokens CHECK (tokens_used >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_document ON quizzes(document_id);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id                 BIGSERIAL PRIMARY KEY,
    quiz_id            BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_index     INTEGER NOT NULL,
    question_text      TEXT NOT NULL,
    question_type      VARCHAR(30) NOT NULL DEFAULT 'single_choice',
    options_json       JSONB NOT NULL,
    correct_option_ids JSONB NOT NULL,
    explanation        TEXT,
    citations_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_quiz_question_index UNIQUE (quiz_id, question_index),
    CONSTRAINT ck_qtype CHECK (question_type IN ('single_choice')),
    CONSTRAINT ck_options_array CHECK (jsonb_typeof(options_json) = 'array'),
    CONSTRAINT ck_correct_ids_array CHECK (jsonb_typeof(correct_option_ids) = 'array'),
    CONSTRAINT ck_citations_array CHECK (jsonb_typeof(citations_json) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id, question_index);
