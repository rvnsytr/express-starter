CREATE TABLE [user] (
    id NVARCHAR(255) NOT NULL PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    email_verified BIT NOT NULL DEFAULT 0,
    image NVARCHAR(MAX),
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    role NVARCHAR(255) NOT NULL DEFAULT 'user',
    banned BIT DEFAULT 0,
    ban_reason NVARCHAR(MAX),
    ban_expires DATETIME2,
    CONSTRAINT user_email_unique UNIQUE (email)
);

CREATE TABLE account (
    id NVARCHAR(255) NOT NULL PRIMARY KEY,
    account_id NVARCHAR(255) NOT NULL,
    provider_id NVARCHAR(255) NOT NULL,
    user_id NVARCHAR(255) NOT NULL,
    access_token NVARCHAR(MAX),
    refresh_token NVARCHAR(MAX),
    id_token NVARCHAR(MAX),
    access_token_expires_at DATETIME2,
    refresh_token_expires_at DATETIME2,
    scope NVARCHAR(MAX),
    password NVARCHAR(MAX),
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIME2 NOT NULL
);

CREATE TABLE session (
    id NVARCHAR(255) NOT NULL PRIMARY KEY,
    expires_at DATETIME2 NOT NULL,
    token NVARCHAR(255) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIME2 NOT NULL,
    ip_address NVARCHAR(255),
    user_agent NVARCHAR(MAX),
    user_id NVARCHAR(255) NOT NULL,
    impersonated_by NVARCHAR(255),
    CONSTRAINT session_token_unique UNIQUE (token)
);

CREATE TABLE verification (
    id NVARCHAR(255) NOT NULL PRIMARY KEY,
    identifier NVARCHAR(255) NOT NULL,
    value NVARCHAR(255) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

ALTER TABLE account
ADD CONSTRAINT account_user_id_user_id_fk
FOREIGN KEY (user_id) REFERENCES [user](id) ON DELETE CASCADE;

ALTER TABLE session
ADD CONSTRAINT session_user_id_user_id_fk
FOREIGN KEY (user_id) REFERENCES [user](id) ON DELETE CASCADE;
