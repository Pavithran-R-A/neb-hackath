-- Versioned, additive audit trail for a source-pinned successor plan.
-- The existing budget row and snapshot remain the authoritative shared ledger.
-- A prepared event cannot admit requests; activation requires separate owner gates.
CREATE TABLE IF NOT EXISTS receiptlab_judge_budget_migrations (
  namespace text NOT NULL REFERENCES receiptlab_judge_budget(namespace) ON DELETE RESTRICT,
  migration_id text NOT NULL CHECK (migration_id ~ '^[a-z0-9-]{8,80}$'),
  version integer NOT NULL CHECK (version = 1),
  from_plan_hash text NOT NULL CHECK (from_plan_hash ~ '^[a-f0-9]{64}$'),
  to_plan_hash text NOT NULL CHECK (to_plan_hash ~ '^[a-f0-9]{64}$'),
  from_history_hash text NOT NULL CHECK (from_history_hash ~ '^[a-f0-9]{64}$'),
  to_history_hash text NOT NULL CHECK (to_history_hash ~ '^[a-f0-9]{64}$'),
  snapshot_hash_at_prepare text NOT NULL CHECK (snapshot_hash_at_prepare ~ '^[a-f0-9]{64}$'),
  from_plan_json text NOT NULL,
  to_plan_json text NOT NULL,
  unknown_reservation_nano_usd bigint NOT NULL CHECK (unknown_reservation_nano_usd >= 0),
  status text NOT NULL CHECK (status IN ('prepared', 'active', 'halted')),
  activation_evidence jsonb,
  prepared_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  halted_at timestamptz,
  PRIMARY KEY (namespace, migration_id),
  UNIQUE (namespace, to_plan_hash),
  CHECK ((status = 'prepared' AND activated_at IS NULL AND halted_at IS NULL)
      OR (status = 'active' AND activated_at IS NOT NULL AND halted_at IS NULL)
      OR (status = 'halted' AND activated_at IS NOT NULL AND halted_at IS NOT NULL))
);

-- Immutable transition evidence is appended separately from the current state row.
CREATE TABLE IF NOT EXISTS receiptlab_judge_budget_migration_events (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  namespace text NOT NULL,
  migration_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('prepared', 'activated', 'halted')),
  event_json jsonb NOT NULL CHECK (jsonb_typeof(event_json) = 'object'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (namespace, migration_id, event_type),
  FOREIGN KEY (namespace, migration_id)
    REFERENCES receiptlab_judge_budget_migrations(namespace, migration_id) ON DELETE RESTRICT
);
