CREATE TABLE [user] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    email_verified BIT NOT NULL,
    image NVARCHAR(MAX),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    role NVARCHAR(36) NOT NULL,
    banned BIT,
    ban_reason NVARCHAR(MAX),
    ban_expires DATETIMEOFFSET
);

CREATE INDEX idx_user_role ON [user](role);
CREATE INDEX idx_user_banned ON [user](banned);


CREATE TABLE [account] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    account_id NVARCHAR(2048) NOT NULL,
    provider_id NVARCHAR(2048) NOT NULL,
    user_id NVARCHAR(36) NOT NULL REFERENCES [user](id) ON DELETE CASCADE,
    access_token NVARCHAR(2048),
    refresh_token NVARCHAR(2048),
    id_token NVARCHAR(2048),
    access_token_expires_at DATETIMEOFFSET,
    refresh_token_expires_at DATETIMEOFFSET,
    scope NVARCHAR(2048),
    password NVARCHAR(2048),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_account_user_id ON [account](user_id);


CREATE TABLE [session] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    expires_at DATETIMEOFFSET NOT NULL,
    token NVARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    ip_address NVARCHAR(2048),
    user_agent NVARCHAR(2048),
    user_id NVARCHAR(36) NOT NULL REFERENCES [user](id) ON DELETE CASCADE,
    impersonatedBy NVARCHAR(2048)
);

CREATE INDEX idx_session_user_id ON [session](user_id);


CREATE TABLE [verification] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    identifier NVARCHAR(2048) NOT NULL,
    value NVARCHAR(2048) NOT NULL,
    expires_at DATETIMEOFFSET NOT NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_verification_identifier_value ON [verification](identifier, value);


CREATE TABLE [files] (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,

    category NVARCHAR(36) NOT NULL, -- e.g. 'image', 'id_card'
    file_path NVARCHAR(500) NULL,
    file_name NVARCHAR(255) NOT NULL,
    file_type NVARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,

    deleted_by NVARCHAR(36) NULL REFERENCES [user](id),
    deleted_at DATETIMEOFFSET NULL,
    updated_by NVARCHAR(36) NULL REFERENCES [user](id),
    updated_at DATETIMEOFFSET NULL,
    created_by NVARCHAR(36) NOT NULL REFERENCES [user](id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT FK_files_deleted_by FOREIGN KEY (deleted_by) REFERENCES [user](id),
    CONSTRAINT FK_files_updated_by FOREIGN KEY (updated_by) REFERENCES [user](id),
    CONSTRAINT FK_files_created_by FOREIGN KEY (created_by) REFERENCES [user](id)
);

CREATE INDEX idx_storage_category ON [storage](category);
CREATE INDEX idx_storage_created_by ON [storage](created_by);
CREATE INDEX idx_storage_updated_by ON [storage](updated_by);
CREATE INDEX idx_storage_deleted_by ON [storage](deleted_by);


CREATE TABLE [activity] (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL REFERENCES [user](id) ON DELETE CASCADE,

    type NVARCHAR(36) NOT NULL, -- 'user-created' | 'user-loaded' | 'user-verified' | 'user-deleted' | 'profile-updated' | 'report-{status}'
    entity_id NVARCHAR(64) NULL,
    data NVARCHAR(MAX) NULL,

    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_activity_user_id_created_at ON [activity](user_id, created_at DESC);
