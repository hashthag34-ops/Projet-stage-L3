BEGIN;

-- Keep learner profiles after their user accounts are deleted.
ALTER TABLE public.apprenant
    ALTER COLUMN id_utilisateur DROP NOT NULL;

ALTER TABLE public.apprenant
    DROP CONSTRAINT fk_apprenant_utilisateur;

ALTER TABLE public.apprenant
    ADD CONSTRAINT fk_apprenant_utilisateur
    FOREIGN KEY (id_utilisateur)
    REFERENCES public.utilisateur(id_utilisateur)
    ON DELETE SET NULL;

-- Preserve the names displayed for messages whose author account is deleted.
ALTER TABLE public.message
    ADD COLUMN IF NOT EXISTS auteur_nom_archive VARCHAR(100),
    ADD COLUMN IF NOT EXISTS auteur_prenom_archive VARCHAR(100);

UPDATE public.message AS m
SET auteur_nom_archive = u.nom,
    auteur_prenom_archive = u.prenom
FROM public.utilisateur AS u
WHERE m.id_utilisateur = u.id_utilisateur
  AND (
      m.auteur_nom_archive IS NULL
      OR m.auteur_prenom_archive IS NULL
  );

ALTER TABLE public.message
    ALTER COLUMN id_utilisateur DROP NOT NULL;

ALTER TABLE public.message
    DROP CONSTRAINT fk_message_utilisateur;

ALTER TABLE public.message
    ADD CONSTRAINT fk_message_utilisateur
    FOREIGN KEY (id_utilisateur)
    REFERENCES public.utilisateur(id_utilisateur)
    ON DELETE SET NULL;

COMMIT;
