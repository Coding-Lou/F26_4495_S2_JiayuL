ALTER TABLE users
    ADD COLUMN identity_subject VARCHAR(255);

ALTER TABLE users
DROP COLUMN password_hash;

ALTER TABLE users
    ADD CONSTRAINT uk_users_identity_subject
        UNIQUE (identity_subject);