BEGIN;

ALTER TABLE public.candidat
    ADD COLUMN IF NOT EXISTS id_utilisateur INTEGER;

ALTER TABLE public.candidat
    DROP CONSTRAINT IF EXISTS candidat_email_key;

UPDATE public.candidat AS c
SET id_utilisateur = a.id_utilisateur
FROM public.apprenant AS a
WHERE a.id_candidat = c.id_candidat
  AND a.id_utilisateur IS NOT NULL;

ALTER TABLE public.candidat
    DROP CONSTRAINT IF EXISTS fk_candidat_utilisateur;

ALTER TABLE public.candidat
    ADD CONSTRAINT fk_candidat_utilisateur
    FOREIGN KEY (id_utilisateur)
    REFERENCES public.utilisateur(id_utilisateur)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidat_id_utilisateur
    ON public.candidat(id_utilisateur);

CREATE INDEX IF NOT EXISTS idx_candidat_email_lower
    ON public.candidat(LOWER(email));

COMMIT;
