ALTER TABLE users
    ADD COLUMN personal_email VARCHAR(255);

UPDATE users
SET personal_email = email
WHERE personal_email IS NULL;

-- Code and institutional email are populated immediately after the IDENTITY insert,
-- before the account-creation transaction commits.
ALTER TABLE users
    ALTER COLUMN personal_email SET NOT NULL,
    ALTER COLUMN email DROP NOT NULL,
    ALTER COLUMN code DROP NOT NULL;
