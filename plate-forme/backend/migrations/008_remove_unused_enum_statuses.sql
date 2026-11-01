BEGIN;

-- Pending certifications are treated as undecided/non-certified records.
UPDATE public.certification
SET statut = 'NON_CERTIFIE'::public.statut_certification
WHERE statut::text = 'EN_ATTENTE';

ALTER TABLE public.certification
    ALTER COLUMN statut DROP DEFAULT;

-- Late attendances are migrated to PRESENT because this platform does not manage
-- the RETARD status separately.
UPDATE public.presence
SET statut = 'PRESENT'::public.statut_presence
WHERE statut::text = 'RETARD';

ALTER TABLE public.certification
    ALTER COLUMN statut TYPE text USING statut::text;
ALTER TYPE public.statut_certification RENAME TO statut_certification_old;
CREATE TYPE public.statut_certification AS ENUM ('CERTIFIE', 'NON_CERTIFIE');
ALTER TABLE public.certification
    ALTER COLUMN statut TYPE public.statut_certification
    USING statut::public.statut_certification;
DROP TYPE public.statut_certification_old;
ALTER TABLE public.certification
    ALTER COLUMN statut SET DEFAULT 'NON_CERTIFIE'::public.statut_certification;

ALTER TABLE public.presence
    ALTER COLUMN statut TYPE text USING statut::text;
ALTER TYPE public.statut_presence RENAME TO statut_presence_old;
CREATE TYPE public.statut_presence AS ENUM ('PRESENT', 'ABSENT');
ALTER TABLE public.presence
    ALTER COLUMN statut TYPE public.statut_presence
    USING statut::public.statut_presence;
DROP TYPE public.statut_presence_old;

COMMIT;
