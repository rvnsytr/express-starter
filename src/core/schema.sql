CREATE TABLE [user] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    email_verified BIT NOT NULL,
    image NVARCHAR(MAX),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    role NVARCHAR(64) NOT NULL,
    banned BIT,
    ban_reason NVARCHAR(MAX),
    ban_expires DATETIMEOFFSET
);

CREATE TABLE [session] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    expires_at DATETIMEOFFSET NOT NULL,
    token NVARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    ip_address NVARCHAR(2048),
    user_agent NVARCHAR(2048),
    user_id NVARCHAR(36) NOT NULL REFERENCES [user] (id) ON DELETE CASCADE,
    impersonatedBy NVARCHAR(2048)
);

CREATE TABLE [account] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    account_id NVARCHAR(2048) NOT NULL,
    provider_id NVARCHAR(2048) NOT NULL,
    user_id NVARCHAR(36) NOT NULL REFERENCES [user] (id) ON DELETE CASCADE,
    access_token NVARCHAR(2048),
    refresh_token NVARCHAR(2048),
    id_token NVARCHAR(2048),
    access_token_expires_at DATETIMEOFFSET,
    refresh_token_expires_at DATETIMEOFFSET,
    scope NVARCHAR(2048),
    password NVARCHAR(2048),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
);

CREATE TABLE [verification] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    identifier NVARCHAR(2048) NOT NULL,
    value NVARCHAR(2048) NOT NULL,
    expires_at DATETIMEOFFSET NOT NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
);

CREATE INDEX session_user_id_idx ON [session] (user_id);
CREATE INDEX account_user_id_idx ON [account] (user_id);
CREATE INDEX verification_identifier_idx ON [verification] (identifier);

CREATE TABLE [storage] (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,

    file_name NVARCHAR(255) NOT NULL,
    category NVARCHAR(50) NOT NULL, -- e.g. 'image', 'id_card'
    file_path NVARCHAR(500) NULL,
    mime_type NVARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,

    deleted_by NVARCHAR(36) NULL,
    deleted_at DATETIMEOFFSET NULL DEFAULT NULL,
    updated_by NVARCHAR(36) NULL,
    updated_at DATETIMEOFFSET NULL DEFAULT NULL,
    created_by NVARCHAR(36) NOT NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT FK_files_deleted_by FOREIGN KEY (deleted_by) REFERENCES [user](id),
    CONSTRAINT FK_files_updated_by FOREIGN KEY (updated_by) REFERENCES [user](id),
    CONSTRAINT FK_files_created_by FOREIGN KEY (created_by) REFERENCES [user](id)
);