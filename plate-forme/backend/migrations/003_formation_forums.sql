INSERT INTO forum (id_formation, nom, description)
SELECT f.id_formation,
       'Forum ' || f.titre,
       'Espace de discussion pour la formation ' || f.titre || '.'
FROM formation f
WHERE NOT EXISTS (
    SELECT 1
    FROM forum fo
    WHERE fo.id_formation = f.id_formation
)
ON CONFLICT (id_formation) DO NOTHING;
