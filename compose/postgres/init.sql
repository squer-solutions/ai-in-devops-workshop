CREATE TABLE IF NOT EXISTS claims (
  id            UUID PRIMARY KEY,
  customer_id   TEXT NOT NULL,
  amount_cents  INTEGER NOT NULL,
  description   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
