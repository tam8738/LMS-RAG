ALTER TABLE users
    RENAME COLUMN teacher_code TO code;

ALTER INDEX IF EXISTS idx_users_teacher_code
    RENAME TO idx_users_code;

ALTER TABLE users
    ADD COLUMN citizen_id VARCHAR(12),
    ADD COLUMN date_of_birth DATE,
    ADD COLUMN gender VARCHAR(20);

UPDATE users
SET code = CASE role
    WHEN 'STUDENT' THEN 'SV'
    WHEN 'TEACHER' THEN 'GV'
    WHEN 'ADMIN' THEN 'AD'
END || CASE
    WHEN LENGTH(id::text) < 4 THEN LPAD(id::text, 4, '0')
    ELSE id::text
END;

-- Existing demo accounts need deterministic placeholders before the NOT NULL constraint is applied.
UPDATE users
SET citizen_id = LPAD(id::text, 12, '0')
WHERE citizen_id IS NULL;

ALTER TABLE users
    ALTER COLUMN code SET NOT NULL,
    ALTER COLUMN citizen_id SET NOT NULL,
    ADD CONSTRAINT uq_users_citizen_id UNIQUE (citizen_id),
    ADD CONSTRAINT ck_users_citizen_id CHECK (citizen_id ~ '^[0-9]{12}$'),
    ADD CONSTRAINT ck_users_gender CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE', 'OTHER'));
