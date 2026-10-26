CREATE TABLE IF NOT EXISTS receiptlab_runtime_state (
  namespace text PRIMARY KEY,
  revision bigint NOT NULL CHECK (revision >= 0),
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
