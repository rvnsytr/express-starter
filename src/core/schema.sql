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

    CONSTRAINT account_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES [user](id) ON DELETE CASCADE;
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

    CONSTRAINT session_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES [user](id) ON DELETE CASCADE;
);

CREATE TABLE verification (
    id NVARCHAR(255) NOT NULL PRIMARY KEY,
    identifier NVARCHAR(255) NOT NULL,
    value NVARCHAR(255) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE TABLE storage (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,

    file_name NVARCHAR(255) NOT NULL,
    category NVARCHAR(50) NOT NULL, -- e.g. 'image', 'id_card'
    file_path NVARCHAR(500) NULL,
    mime_type NVARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,

    deleted_by NVARCHAR(255) NULL,
    deleted_at DATETIME2 NULL DEFAULT NULL,
    updated_by NVARCHAR(255) NULL,
    updated_at DATETIME2 NULL DEFAULT NULL,
    created_by NVARCHAR(255) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT FK_files_deleted_by FOREIGN KEY (deleted_by) REFERENCES [user](id),
    CONSTRAINT FK_files_updated_by FOREIGN KEY (updated_by) REFERENCES [user](id),
    CONSTRAINT FK_files_created_by FOREIGN KEY (created_by) REFERENCES [user](id)
);