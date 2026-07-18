-- RAG conversation history: persisted chat per user per document.
-- Backend owns the conversation state; AI Service remains stateless.

CREATE TABLE IF NOT EXISTS rag_conversations (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    document_id BIGINT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,

    title VARCHAR(255),
    message_count INTEGER NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT uk_rag_conversation_user_document
        UNIQUE (user_id, document_id),
    CONSTRAINT ck_rag_conversation_message_count
        CHECK (message_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_rag_conversations_user_document
    ON rag_conversations(user_id, document_id);

CREATE INDEX IF NOT EXISTS idx_rag_conversations_document
    ON rag_conversations(document_id);

CREATE INDEX IF NOT EXISTS idx_rag_conversations_last_message
    ON rag_conversations(user_id, last_message_at DESC)
    WHERE deleted_at IS NULL;

-- RAG messages: individual user/assistant messages within a conversation.
CREATE TABLE IF NOT EXISTS rag_messages (
    id BIGSERIAL PRIMARY KEY,

    conversation_id BIGINT NOT NULL
        REFERENCES rag_conversations(id) ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,

    not_found BOOLEAN NOT NULL DEFAULT FALSE,
    citations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    error_code VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_rag_message_role
        CHECK (role IN ('user', 'assistant')),
    CONSTRAINT ck_rag_messages_tokens_used
        CHECK (tokens_used >= 0),
    CONSTRAINT ck_rag_messages_citations_array
        CHECK (jsonb_typeof(citations_json) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_rag_messages_conversation_created
    ON rag_messages(conversation_id, created_at, id);

CREATE INDEX IF NOT EXISTS idx_rag_messages_conversation_role
    ON rag_messages(conversation_id, role, created_at);
