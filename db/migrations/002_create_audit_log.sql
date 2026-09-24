-- Migration: Create audit_log table for immutable correction history
-- This table stores every human override of an extracted field.
-- It is append-only: no UPDATE or DELETE policies are granted.

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doc_id TEXT NOT NULL,
    field_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    previous_value TEXT,
    corrected_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS so users can only see their own audit entries
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own audit log"
    ON audit_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit log"
    ON audit_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies: audit log is immutable by design.

-- Index for fast lookups by document
CREATE INDEX IF NOT EXISTS idx_audit_log_doc_id ON audit_log(doc_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
