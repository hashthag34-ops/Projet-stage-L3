ALTER TABLE utilisateur
ADD COLUMN IF NOT EXISTS password_reset_code_hash VARCHAR(60),
ADD COLUMN IF NOT EXISTS password_reset_code_expiration TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS password_reset_code_requested_at TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS password_reset_code_attempts INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'utilisateur_password_reset_code_attempts_check'
      AND conrelid = 'utilisateur'::regclass
  ) THEN
    ALTER TABLE utilisateur
    ADD CONSTRAINT utilisateur_password_reset_code_attempts_check
    CHECK (password_reset_code_attempts BETWEEN 0 AND 5);
  END IF;
END;
$$;
