-- Idempotent durable per-campaign judge budget row. Mutations use SELECT ... FOR UPDATE.
CREATE TABLE IF NOT EXISTS receiptlab_judge_budget (
  namespace text PRIMARY KEY CHECK (namespace ~ '^[a-z0-9-]{1,80}$'),
  plan_hash text NOT NULL CHECK (plan_hash ~ '^[a-f0-9]{64}$'),
  history_hash text NOT NULL CHECK (history_hash ~ '^[a-f0-9]{64}$'),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
