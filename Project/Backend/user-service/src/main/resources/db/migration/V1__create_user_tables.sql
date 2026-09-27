CREATE TABLE users (
                       id UUID PRIMARY KEY,
                       email VARCHAR(255) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       display_name VARCHAR(100) NOT NULL,
                       created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gear_items (
                            id UUID PRIMARY KEY,
                            user_id UUID NOT NULL,
                            name VARCHAR(100) NOT NULL,
                            category VARCHAR(50),
                            description VARCHAR(255),
                            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT fk_gear_user
                                FOREIGN KEY (user_id)
                                    REFERENCES users(id)
                                    ON DELETE CASCADE
);

CREATE INDEX idx_gear_items_user_id
    ON gear_items(user_id);