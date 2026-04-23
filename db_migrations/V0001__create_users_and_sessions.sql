
CREATE TABLE IF NOT EXISTS t_p55563781_forum_crmp_project_2.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT DEFAULT '',
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user', 'banned')),
    avatar_letter VARCHAR(1) NOT NULL,
    posts_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p55563781_forum_crmp_project_2.sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p55563781_forum_crmp_project_2.users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON t_p55563781_forum_crmp_project_2.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON t_p55563781_forum_crmp_project_2.sessions(user_id);
