-- Bổ sung thông tin hồ sơ giảng viên để hỗ trợ Admin Teacher Management API.
-- Các cột đều nullable để tương thích với user đã có trước đó.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS teacher_code VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS department VARCHAR(255),
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS hire_date DATE;

CREATE INDEX IF NOT EXISTS idx_users_teacher_code
    ON users(teacher_code);
