CREATE TABLE [user] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    name NVARCHAR(256) NOT NULL,
    email NVARCHAR(256) NOT NULL UNIQUE,
    email_verified BIT NOT NULL,
    image NVARCHAR(512),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    role NVARCHAR(50) NOT NULL,
    banned BIT NOT NULL DEFAULT 0,
    ban_reason NVARCHAR(MAX),
    ban_expires DATETIMEOFFSET
);

CREATE INDEX IDX_user_role ON [user](role);
CREATE INDEX IDX_user_banned ON [user](banned);


CREATE TABLE [account] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    account_id NVARCHAR(256) NOT NULL,
    provider_id NVARCHAR(256) NOT NULL,
    user_id NVARCHAR(36) NOT NULL REFERENCES [user](id) ON DELETE CASCADE,
    access_token NVARCHAR(MAX),
    refresh_token NVARCHAR(MAX),
    id_token NVARCHAR(MAX),
    access_token_expires_at DATETIMEOFFSET,
    refresh_token_expires_at DATETIMEOFFSET,
    scope NVARCHAR(512),
    password NVARCHAR(256),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT UQ_account_provider_id_account_id UNIQUE (provider_id, account_id)
);

CREATE INDEX IDX_account_user_id ON [account](user_id);


CREATE TABLE [session] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    expires_at DATETIMEOFFSET NOT NULL,
    token NVARCHAR(512) NOT NULL UNIQUE,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    ip_address NVARCHAR(50),
    user_agent NVARCHAR(1000),
    user_id NVARCHAR(36) NOT NULL REFERENCES [user](id) ON DELETE CASCADE,
    impersonatedBy NVARCHAR(36),
);

CREATE INDEX IDX_session_user_id ON [session](user_id);


CREATE TABLE [verification] (
    id NVARCHAR(36) NOT NULL PRIMARY KEY,
    identifier NVARCHAR(256) NOT NULL,
    value NVARCHAR(512) NOT NULL,
    expires_at DATETIMEOFFSET NOT NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT UQ_verification_identifier_value UNIQUE(identifier, value)
);


CREATE TABLE [activity] (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL REFERENCES [user](id) ON DELETE CASCADE,

    type NVARCHAR(50) NOT NULL, -- 'user-created' | 'user-loaded' | 'user-verified' | 'user-deleted' | 'profile-updated' | 'report-{status}'
    entity_id NVARCHAR(256) NULL,
    data NVARCHAR(MAX) NULL,

    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX IDX_activity_type ON [activity](type);
CREATE INDEX IDX_activity_user_id_created_at ON [activity](user_id, created_at);


CREATE TABLE [file] (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,

    category NVARCHAR(50) NOT NULL, -- e.g. 'image', 'id_card'
    file_path NVARCHAR(512) NULL,
    file_name NVARCHAR(256) NOT NULL,
    mime_type NVARCHAR(256) NOT NULL,
    file_size BIGINT NOT NULL,

    deleted_by NVARCHAR(36) NULL REFERENCES [user](id),
    deleted_at DATETIMEOFFSET NULL,
    updated_by NVARCHAR(36) NULL REFERENCES [user](id),
    updated_at DATETIMEOFFSET NULL,
    created_by NVARCHAR(36) NOT NULL REFERENCES [user](id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
);

CREATE INDEX IDX_file_category ON [file](category);
CREATE INDEX IDX_file_file_path ON [file](file_path);
CREATE INDEX IDX_file_created_by ON [file](created_by);
CREATE INDEX IDX_file_updated_by ON [file](updated_by);
CREATE INDEX IDX_file_deleted_by ON [file](deleted_by);
