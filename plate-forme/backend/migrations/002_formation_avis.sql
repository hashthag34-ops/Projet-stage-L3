CREATE TABLE IF NOT EXISTS formation_avis (
    id_avis SERIAL PRIMARY KEY,
    id_formation INTEGER NOT NULL,
    id_apprenant INTEGER NOT NULL,
    note SMALLINT NOT NULL CHECK (note BETWEEN 1 AND 5),
    commentaire TEXT NOT NULL CHECK (char_length(btrim(commentaire)) BETWEEN 1 AND 2000),
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_formation_avis_formation
        FOREIGN KEY (id_formation)
        REFERENCES formation(id_formation)
        ON DELETE CASCADE,
    CONSTRAINT fk_formation_avis_apprenant
        FOREIGN KEY (id_apprenant)
        REFERENCES apprenant(id_apprenant)
        ON DELETE CASCADE,
    CONSTRAINT uq_formation_avis_apprenant
        UNIQUE (id_formation, id_apprenant)
);

CREATE INDEX IF NOT EXISTS idx_formation_avis_formation
    ON formation_avis(id_formation);
