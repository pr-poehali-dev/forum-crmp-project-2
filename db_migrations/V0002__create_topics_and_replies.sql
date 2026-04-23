
CREATE TABLE IF NOT EXISTS t_p55563781_forum_crmp_project_2.topics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p55563781_forum_crmp_project_2.users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    views INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p55563781_forum_crmp_project_2.replies (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES t_p55563781_forum_crmp_project_2.topics(id),
    user_id INTEGER REFERENCES t_p55563781_forum_crmp_project_2.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_status ON t_p55563781_forum_crmp_project_2.topics(status);
CREATE INDEX IF NOT EXISTS idx_topics_category ON t_p55563781_forum_crmp_project_2.topics(category);
CREATE INDEX IF NOT EXISTS idx_replies_topic_id ON t_p55563781_forum_crmp_project_2.replies(topic_id);
