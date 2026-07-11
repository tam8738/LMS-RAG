-- Seed demo users for local development and MVP demo.
-- Password for all demo accounts: 123456
-- WARNING: These accounts are for demo/local use only.

INSERT INTO users (email, password, name, role, status)
VALUES
    ('admin@example.com', '$2b$10$VWWkkl.VSL6GL.sX7VGYGeTRbw2vMT80WJArUPDpSRRIapxROc8DW', 'Admin', 'ADMIN', 'ACTIVE'),
    ('teacher.a@example.com', '$2b$10$VWWkkl.VSL6GL.sX7VGYGeTRbw2vMT80WJArUPDpSRRIapxROc8DW', 'Teacher A', 'TEACHER', 'ACTIVE'),
    ('teacher.b@example.com', '$2b$10$VWWkkl.VSL6GL.sX7VGYGeTRbw2vMT80WJArUPDpSRRIapxROc8DW', 'Teacher B', 'TEACHER', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;
