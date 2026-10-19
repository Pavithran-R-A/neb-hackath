CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS diagnoses(id TEXT PRIMARY KEY, run_id TEXT NOT NULL, session_id TEXT NOT NULL, digest TEXT NOT NULL, result TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY, diagnosis_id TEXT NOT NULL UNIQUE, run_id TEXT NOT NULL, session_id TEXT NOT NULL, digest TEXT NOT NULL, version INTEGER NOT NULL, consumed TEXT);
CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY CHECK(id='nebius'), imported_digest TEXT NOT NULL, imported_history TEXT NOT NULL, limit_nano INTEGER NOT NULL, committed_nano INTEGER NOT NULL, active TEXT);
CREATE TRIGGER IF NOT EXISTS immutable_import BEFORE UPDATE OF imported_digest, imported_history ON accounts BEGIN SELECT RAISE(ABORT,'immutable account import'); END;
CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY, approved INTEGER NOT NULL, source_digest TEXT NOT NULL, max_posts INTEGER NOT NULL, max_nano INTEGER NOT NULL, model TEXT NOT NULL, catalog_digest TEXT NOT NULL, input_nano INTEGER NOT NULL, output_nano INTEGER NOT NULL, max_tokens INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS ledger(id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, reservation_id TEXT NOT NULL, kind TEXT NOT NULL, nano INTEGER NOT NULL, created INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS immutable_ledger_update BEFORE UPDATE ON ledger BEGIN SELECT RAISE(ABORT,'immutable ledger'); END;
CREATE TRIGGER IF NOT EXISTS immutable_ledger_delete BEFORE DELETE ON ledger BEGIN SELECT RAISE(ABORT,'immutable ledger'); END;

CREATE TRIGGER IF NOT EXISTS immutable_account_delete BEFORE DELETE ON accounts BEGIN SELECT RAISE(ABORT,'immutable account import'); END;
CREATE TABLE IF NOT EXISTS quotas(id TEXT PRIMARY KEY, count INTEGER NOT NULL);
