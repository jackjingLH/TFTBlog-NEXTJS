-- Batch insert newly imported guides to local SQLite
-- Run with: sqlite3 data/tftblog.sqlite < scripts/batch-insert-guides.sql

-- Note: These are placeholders. You need to run the actual publish script for each guide
-- to properly parse markdown and calculate reading time.

-- For now, let's verify the database is ready
SELECT 'Database ready. Guide count: ' || COUNT(*) as status FROM guides;

-- Show current guides
SELECT slug, title, source FROM guides ORDER BY publishedAt DESC LIMIT 5;
