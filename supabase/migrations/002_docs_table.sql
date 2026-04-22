-- Docs table: saved links and custom documents
CREATE TABLE docs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('link', 'note')),
  url TEXT,           -- for type='link' (Google Docs, Sheets, etc.)
  content TEXT,       -- for type='note' (custom written docs)
  icon TEXT,          -- optional icon hint: 'doc', 'sheet', 'slide', 'form', 'drive', 'other'
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_docs_type ON docs(type);
CREATE INDEX idx_docs_pinned ON docs(pinned);

CREATE TRIGGER trigger_docs_updated_at
BEFORE UPDATE ON docs
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
