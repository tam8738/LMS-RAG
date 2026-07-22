-- New accounts receive their login email from the request.
-- citizen_id remains as optional legacy data; personal_email is no longer part of the model.
ALTER TABLE users
    ALTER COLUMN email SET NOT NULL,
    ALTER COLUMN citizen_id DROP NOT NULL;

ALTER TABLE users
    DROP COLUMN personal_email;
