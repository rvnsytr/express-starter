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

CREATE UNIQUE INDEX IDX_user_email ON [user](email);
CREATE INDEX IDX_user_role ON [user](role);
CREATE INDEX IDX_user_banned ON [user](banned);


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

CREATE INDEX IDX_account_user_id ON [account](user_id);
CREATE UNIQUE INDEX IDX_account_provider_account ON [account](provider_id, account_id);


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

CREATE INDEX IDX_session_user_id ON [session](user_id);
CREATE INDEX IDX_session_expires_at ON [session](expires_at);


CREATE TABLE [verification] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    identifier NVARCHAR(2048) NOT NULL,
    value NVARCHAR(2048) NOT NULL,
    expires_at DATETIMEOFFSET NOT NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX IDX_verification_identifier_value ON [verification](identifier, value);
CREATE INDEX IDX_verification_expires ON [verification](expires_at);


CREATE TABLE [storage] (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,

    file_name NVARCHAR(255) NOT NULL,
    category NVARCHAR(36) NOT NULL, -- e.g. 'image', 'id_card'
    file_path NVARCHAR(500) NULL,
    mime_type NVARCHAR(100) NOT NULL,
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

CREATE INDEX IDX_storage_category ON [storage](category);
CREATE INDEX IDX_storage_created_by ON [storage](created_by);
CREATE INDEX IDX_storage_updated_by ON [storage](updated_by);
CREATE INDEX IDX_storage_deleted_by ON [storage](deleted_by);


CREATE TABLE [event_log] (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL REFERENCES [user](id) ON DELETE CASCADE,
    entity_id NVARCHAR(64) NULL,

    type NVARCHAR(36) NOT NULL, -- 'user_created' | 'user_loaded' | 'user_verified' | 'user_deleted' | 'profile_updated' | 'report_{status}'
    data NVARCHAR(MAX) NULL,

    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX IDX_event_log_user_id_created_at ON [event_log](user_id, created_at DESC);
