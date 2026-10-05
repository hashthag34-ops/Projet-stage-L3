--
-- PostgreSQL database dump
--

\restrict Bj0yacNcvHYsr2aYcVYT5GOgti3vp15PWyIkQKbfPuLPRwozbS9fa7vLJbz82rv

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: statut_certification; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statut_certification AS ENUM (
    'EN_ATTENTE',
    'CERTIFIE',
    'NON_CERTIFIE'
);


ALTER TYPE public.statut_certification OWNER TO postgres;

--
-- Name: statut_compte; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statut_compte AS ENUM (
    'ACTIF',
    'DESACTIVE',
    'SUSPENDU'
);


ALTER TYPE public.statut_compte OWNER TO postgres;

--
-- Name: statut_evaluation; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statut_evaluation AS ENUM (
    'BROUILLON',
    'PUBLIEE',
    'FERMEE',
    'ARCHIVEE'
);


ALTER TYPE public.statut_evaluation OWNER TO postgres;

--
-- Name: statut_formation; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statut_formation AS ENUM (
    'BROUILLON',
    'OUVERTE',
    'EN_COURS',
    'TERMINEE',
    'ARCHIVEE'
);


ALTER TYPE public.statut_formation OWNER TO postgres;

--
-- Name: statut_inscription; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statut_inscription AS ENUM (
    'EN_ATTENTE',
    'ACCEPTEE',
    'REFUSEE',
    'ANNULEE',
    'PRESELECTIONNEE'
);


ALTER TYPE public.statut_inscription OWNER TO postgres;

--
-- Name: statut_presence; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statut_presence AS ENUM (
    'PRESENT',
    'ABSENT',
    'RETARD'
);


ALTER TYPE public.statut_presence OWNER TO postgres;

--
-- Name: statut_tentative; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.statut_tentative AS ENUM (
    'EN_COURS',
    'TERMINEE',
    'ABANDONNEE'
);


ALTER TYPE public.statut_tentative OWNER TO postgres;

--
-- Name: mettre_a_jour_total_evaluation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.mettre_a_jour_total_evaluation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    sujet_id INTEGER;
BEGIN

    IF TG_OP = 'DELETE' THEN
        sujet_id := OLD.id_evaluation_sujet;
    ELSE
        sujet_id := NEW.id_evaluation_sujet;
    END IF;

    UPDATE evaluation_sujet
    SET
        total_points = (
            SELECT COALESCE(SUM(points), 0)
            FROM evaluation_question
            WHERE id_evaluation_sujet = sujet_id
        ),
        date_modification = CURRENT_TIMESTAMP
    WHERE id_evaluation_sujet = sujet_id;

    RETURN COALESCE(NEW, OLD);

END;
$$;


ALTER FUNCTION public.mettre_a_jour_total_evaluation() OWNER TO postgres;

--
-- Name: update_date_modification(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_date_modification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN

    NEW.date_modification = CURRENT_TIMESTAMP;

    RETURN NEW;

END;
$$;


ALTER FUNCTION public.update_date_modification() OWNER TO postgres;

--
-- Name: verifier_publication_evaluation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verifier_publication_evaluation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    nombre_questions INTEGER;
    total_points NUMERIC(5,2);
BEGIN

    IF NEW.statut = 'PUBLIEE' THEN

        SELECT
            COUNT(*),
            COALESCE(SUM(points), 0)
        INTO
            nombre_questions,
            total_points
        FROM evaluation_question
        WHERE id_evaluation_sujet = NEW.id_evaluation_sujet;

        IF nombre_questions = 0 THEN

            RAISE EXCEPTION
                'Impossible de publier l''‚valuation : elle ne contient aucune question.';

        END IF;

        IF total_points <> 20 THEN

            RAISE EXCEPTION
                'Impossible de publier l''‚valuation : le total doit ˆtre exactement de 20 points. Total actuel : %.',
                total_points;

        END IF;

        NEW.date_publication = CURRENT_TIMESTAMP;

    END IF;

    RETURN NEW;

END;
$$;


ALTER FUNCTION public.verifier_publication_evaluation() OWNER TO postgres;

--
-- Name: verifier_total_points_evaluation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verifier_total_points_evaluation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    total_points NUMERIC(5,2);
BEGIN

    SELECT COALESCE(SUM(points), 0)
    INTO total_points
    FROM evaluation_question
    WHERE id_evaluation_sujet = NEW.id_evaluation_sujet;

    IF total_points > 20 THEN

        RAISE EXCEPTION
            'Impossible d''ajouter ou de modifier cette question : le total de l''‚valuation d‚passerait 20 points.';

    END IF;

    RETURN NEW;

END;
$$;


ALTER FUNCTION public.verifier_total_points_evaluation() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: administrateur; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.administrateur (
    id_administrateur integer NOT NULL,
    id_utilisateur integer NOT NULL,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.administrateur OWNER TO postgres;

--
-- Name: administrateur_id_administrateur_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.administrateur_id_administrateur_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.administrateur_id_administrateur_seq OWNER TO postgres;

--
-- Name: administrateur_id_administrateur_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.administrateur_id_administrateur_seq OWNED BY public.administrateur.id_administrateur;


--
-- Name: apprenant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.apprenant (
    id_apprenant integer NOT NULL,
    id_utilisateur integer NOT NULL,
    id_candidat integer NOT NULL,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    statut character varying(50) DEFAULT 'ACTIF'::character varying NOT NULL
);


ALTER TABLE public.apprenant OWNER TO postgres;

--
-- Name: apprenant_id_apprenant_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.apprenant_id_apprenant_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.apprenant_id_apprenant_seq OWNER TO postgres;

--
-- Name: apprenant_id_apprenant_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.apprenant_id_apprenant_seq OWNED BY public.apprenant.id_apprenant;


--
-- Name: candidat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidat (
    id_candidat integer NOT NULL,
    email character varying(255) NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    age integer,
    genre character varying(50),
    telephone character varying(30),
    niveau_etude character varying(150),
    situation_professionnelle character varying(150),
    etablissement character varying(255),
    filiere character varying(150),
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT candidat_age_check CHECK ((age >= 0))
);


ALTER TABLE public.candidat OWNER TO postgres;

--
-- Name: candidat_id_candidat_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.candidat_id_candidat_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.candidat_id_candidat_seq OWNER TO postgres;

--
-- Name: candidat_id_candidat_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.candidat_id_candidat_seq OWNED BY public.candidat.id_candidat;


--
-- Name: certification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certification (
    id_certification integer NOT NULL,
    id_apprenant integer NOT NULL,
    id_formation integer NOT NULL,
    date_certification date,
    statut public.statut_certification DEFAULT 'EN_ATTENTE'::public.statut_certification NOT NULL,
    fichier_certification character varying(500),
    numero_certification character varying(100),
    commentaire text
);


ALTER TABLE public.certification OWNER TO postgres;

--
-- Name: certification_id_certification_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certification_id_certification_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certification_id_certification_seq OWNER TO postgres;

--
-- Name: certification_id_certification_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certification_id_certification_seq OWNED BY public.certification.id_certification;


--
-- Name: evaluation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation (
    id_evaluation integer NOT NULL,
    id_apprenant integer NOT NULL,
    id_formation integer NOT NULL,
    id_formateur integer NOT NULL,
    id_evaluation_sujet integer,
    type_evaluation character varying(150) NOT NULL,
    note numeric(5,2),
    date_evaluation date DEFAULT CURRENT_DATE NOT NULL,
    commentaire text,
    CONSTRAINT chk_note CHECK (((note IS NULL) OR ((note >= (0)::numeric) AND (note <= (20)::numeric))))
);


ALTER TABLE public.evaluation OWNER TO postgres;

--
-- Name: evaluation_choix; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_choix (
    id_choix integer NOT NULL,
    id_question integer NOT NULL,
    libelle text NOT NULL,
    est_correct boolean DEFAULT false NOT NULL,
    ordre integer DEFAULT 1 NOT NULL,
    CONSTRAINT chk_ordre_choix CHECK ((ordre > 0))
);


ALTER TABLE public.evaluation_choix OWNER TO postgres;

--
-- Name: evaluation_choix_id_choix_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluation_choix_id_choix_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_choix_id_choix_seq OWNER TO postgres;

--
-- Name: evaluation_choix_id_choix_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluation_choix_id_choix_seq OWNED BY public.evaluation_choix.id_choix;


--
-- Name: evaluation_id_evaluation_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluation_id_evaluation_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_id_evaluation_seq OWNER TO postgres;

--
-- Name: evaluation_id_evaluation_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluation_id_evaluation_seq OWNED BY public.evaluation.id_evaluation;


--
-- Name: evaluation_question; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_question (
    id_question integer NOT NULL,
    id_evaluation_sujet integer NOT NULL,
    numero_question integer NOT NULL,
    enonce text NOT NULL,
    points numeric(5,2) NOT NULL,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_question_numero CHECK ((numero_question > 0)),
    CONSTRAINT chk_question_points CHECK (((points > (0)::numeric) AND (points <= (20)::numeric)))
);


ALTER TABLE public.evaluation_question OWNER TO postgres;

--
-- Name: evaluation_question_id_question_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluation_question_id_question_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_question_id_question_seq OWNER TO postgres;

--
-- Name: evaluation_question_id_question_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluation_question_id_question_seq OWNED BY public.evaluation_question.id_question;


--
-- Name: evaluation_reponse; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_reponse (
    id_reponse integer NOT NULL,
    id_tentative integer NOT NULL,
    id_question integer NOT NULL,
    id_choix integer NOT NULL,
    points_obtenus numeric(5,2) DEFAULT 0 NOT NULL,
    CONSTRAINT chk_points_obtenus CHECK (((points_obtenus >= (0)::numeric) AND (points_obtenus <= (20)::numeric)))
);


ALTER TABLE public.evaluation_reponse OWNER TO postgres;

--
-- Name: evaluation_reponse_id_reponse_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluation_reponse_id_reponse_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_reponse_id_reponse_seq OWNER TO postgres;

--
-- Name: evaluation_reponse_id_reponse_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluation_reponse_id_reponse_seq OWNED BY public.evaluation_reponse.id_reponse;


--
-- Name: evaluation_sujet; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_sujet (
    id_evaluation_sujet integer NOT NULL,
    id_formation integer NOT NULL,
    id_formateur integer NOT NULL,
    titre character varying(255) NOT NULL,
    description text,
    duree_minutes integer,
    obligatoire boolean DEFAULT true NOT NULL,
    statut public.statut_evaluation DEFAULT 'BROUILLON'::public.statut_evaluation NOT NULL,
    total_points numeric(5,2) DEFAULT 0 NOT NULL,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    date_modification timestamp without time zone,
    date_publication timestamp without time zone,
    CONSTRAINT chk_sujet_duree CHECK (((duree_minutes IS NULL) OR (duree_minutes > 0))),
    CONSTRAINT chk_sujet_total_points CHECK (((total_points >= (0)::numeric) AND (total_points <= (20)::numeric)))
);


ALTER TABLE public.evaluation_sujet OWNER TO postgres;

--
-- Name: evaluation_sujet_id_evaluation_sujet_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluation_sujet_id_evaluation_sujet_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_sujet_id_evaluation_sujet_seq OWNER TO postgres;

--
-- Name: evaluation_sujet_id_evaluation_sujet_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluation_sujet_id_evaluation_sujet_seq OWNED BY public.evaluation_sujet.id_evaluation_sujet;


--
-- Name: evaluation_tentative; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_tentative (
    id_tentative integer NOT NULL,
    id_evaluation_sujet integer NOT NULL,
    id_apprenant integer NOT NULL,
    date_debut timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    date_fin timestamp without time zone,
    note numeric(5,2),
    statut public.statut_tentative DEFAULT 'EN_COURS'::public.statut_tentative NOT NULL,
    CONSTRAINT chk_date_tentative CHECK (((date_fin IS NULL) OR (date_fin >= date_debut))),
    CONSTRAINT chk_note_tentative CHECK (((note IS NULL) OR ((note >= (0)::numeric) AND (note <= (20)::numeric))))
);


ALTER TABLE public.evaluation_tentative OWNER TO postgres;

--
-- Name: evaluation_tentative_id_tentative_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluation_tentative_id_tentative_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_tentative_id_tentative_seq OWNER TO postgres;

--
-- Name: evaluation_tentative_id_tentative_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluation_tentative_id_tentative_seq OWNED BY public.evaluation_tentative.id_tentative;


--
-- Name: formateur; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formateur (
    id_formateur integer NOT NULL,
    id_utilisateur integer NOT NULL,
    specialite character varying(255),
    biographie text,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.formateur OWNER TO postgres;

--
-- Name: formateur_id_formateur_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.formateur_id_formateur_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.formateur_id_formateur_seq OWNER TO postgres;

--
-- Name: formateur_id_formateur_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.formateur_id_formateur_seq OWNED BY public.formateur.id_formateur;


--
-- Name: formation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formation (
    id_formation integer NOT NULL,
    titre character varying(255) NOT NULL,
    description text NOT NULL,
    image_url character varying(500),
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    date_limite_inscription date NOT NULL,
    capacite_max integer NOT NULL,
    statut public.statut_formation DEFAULT 'BROUILLON'::public.statut_formation NOT NULL,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    date_modification timestamp without time zone,
    CONSTRAINT chk_date_limite CHECK ((date_limite_inscription <= date_debut)),
    CONSTRAINT chk_dates_formation CHECK ((date_fin >= date_debut)),
    CONSTRAINT formation_capacite_max_check CHECK ((capacite_max > 0))
);


ALTER TABLE public.formation OWNER TO postgres;

--
-- Name: formation_avis; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formation_avis (
    id_avis integer NOT NULL,
    id_formation integer NOT NULL,
    id_apprenant integer NOT NULL,
    note smallint NOT NULL,
    commentaire text NOT NULL,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT formation_avis_commentaire_check CHECK (((char_length(btrim(commentaire)) >= 1) AND (char_length(btrim(commentaire)) <= 2000))),
    CONSTRAINT formation_avis_note_check CHECK (((note >= 1) AND (note <= 5)))
);


ALTER TABLE public.formation_avis OWNER TO postgres;

--
-- Name: formation_avis_id_avis_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.formation_avis_id_avis_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.formation_avis_id_avis_seq OWNER TO postgres;

--
-- Name: formation_avis_id_avis_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.formation_avis_id_avis_seq OWNED BY public.formation_avis.id_avis;


--
-- Name: formation_formateur; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formation_formateur (
    id_formation integer NOT NULL,
    id_formateur integer NOT NULL,
    date_affectation timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role_formateur character varying(100)
);


ALTER TABLE public.formation_formateur OWNER TO postgres;

--
-- Name: formation_id_formation_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.formation_id_formation_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.formation_id_formation_seq OWNER TO postgres;

--
-- Name: formation_id_formation_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.formation_id_formation_seq OWNED BY public.formation.id_formation;


--
-- Name: forum; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.forum (
    id_forum integer NOT NULL,
    id_formation integer NOT NULL,
    nom character varying(255) NOT NULL,
    description text,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.forum OWNER TO postgres;

--
-- Name: forum_id_forum_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.forum_id_forum_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.forum_id_forum_seq OWNER TO postgres;

--
-- Name: forum_id_forum_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.forum_id_forum_seq OWNED BY public.forum.id_forum;


--
-- Name: inscription; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inscription (
    id_inscription integer NOT NULL,
    id_candidat integer NOT NULL,
    id_formation integer NOT NULL,
    date_inscription timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    statut public.statut_inscription DEFAULT 'EN_ATTENTE'::public.statut_inscription NOT NULL,
    motivation text,
    objectif text,
    projet_apres_formation text,
    source_information character varying(255),
    a_deja_suivi_formation boolean,
    formation_precedente character varying(255),
    retour_suggestion text,
    conditions_acceptees boolean DEFAULT false NOT NULL,
    date_decision timestamp without time zone,
    motif_decision text,
    date_modification timestamp without time zone
);


ALTER TABLE public.inscription OWNER TO postgres;

--
-- Name: inscription_id_inscription_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inscription_id_inscription_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inscription_id_inscription_seq OWNER TO postgres;

--
-- Name: inscription_id_inscription_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inscription_id_inscription_seq OWNED BY public.inscription.id_inscription;


--
-- Name: message; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message (
    id_message integer NOT NULL,
    id_forum integer NOT NULL,
    id_utilisateur integer NOT NULL,
    contenu text NOT NULL,
    date_envoi timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    date_modification timestamp without time zone,
    message_parent integer
);


ALTER TABLE public.message OWNER TO postgres;

--
-- Name: message_id_message_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.message_id_message_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.message_id_message_seq OWNER TO postgres;

--
-- Name: message_id_message_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.message_id_message_seq OWNED BY public.message.id_message;


--
-- Name: presence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.presence (
    id_presence integer NOT NULL,
    id_apprenant integer NOT NULL,
    id_seance integer NOT NULL,
    date_scan timestamp without time zone,
    statut public.statut_presence NOT NULL,
    commentaire text
);


ALTER TABLE public.presence OWNER TO postgres;

--
-- Name: presence_id_presence_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.presence_id_presence_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.presence_id_presence_seq OWNER TO postgres;

--
-- Name: presence_id_presence_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.presence_id_presence_seq OWNED BY public.presence.id_presence;


--
-- Name: responsable; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.responsable (
    id_responsable integer NOT NULL,
    id_utilisateur integer NOT NULL,
    fonction character varying(150),
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.responsable OWNER TO postgres;

--
-- Name: responsable_id_responsable_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.responsable_id_responsable_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.responsable_id_responsable_seq OWNER TO postgres;

--
-- Name: responsable_id_responsable_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.responsable_id_responsable_seq OWNED BY public.responsable.id_responsable;


--
-- Name: seance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seance (
    id_seance integer NOT NULL,
    id_formation integer NOT NULL,
    titre character varying(255),
    description text,
    date_seance date NOT NULL,
    heure_debut time without time zone NOT NULL,
    heure_fin time without time zone NOT NULL,
    type_seance character varying(100),
    salle character varying(150),
    CONSTRAINT chk_heure_seance CHECK ((heure_fin > heure_debut))
);


ALTER TABLE public.seance OWNER TO postgres;

--
-- Name: seance_id_seance_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seance_id_seance_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seance_id_seance_seq OWNER TO postgres;

--
-- Name: seance_id_seance_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.seance_id_seance_seq OWNED BY public.seance.id_seance;


--
-- Name: support_cours; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_cours (
    id_support integer NOT NULL,
    id_formation integer NOT NULL,
    id_formateur integer NOT NULL,
    nom_fichier character varying(255) NOT NULL,
    type_fichier character varying(100),
    chemin_fichier character varying(500) NOT NULL,
    date_publication timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text
);


ALTER TABLE public.support_cours OWNER TO postgres;

--
-- Name: support_cours_id_support_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_cours_id_support_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_cours_id_support_seq OWNER TO postgres;

--
-- Name: support_cours_id_support_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_cours_id_support_seq OWNED BY public.support_cours.id_support;


--
-- Name: utilisateur; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utilisateur (
    id_utilisateur integer NOT NULL,
    email character varying(255) NOT NULL,
    mot_de_passe character varying(255),
    username character varying(100),
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    telephone character varying(30),
    age integer,
    photo_profil character varying(500),
    qr_code text,
    statut_compte public.statut_compte DEFAULT 'ACTIF'::public.statut_compte NOT NULL,
    date_creation timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    date_derniere_connexion timestamp without time zone,
    CONSTRAINT utilisateur_age_check CHECK ((age >= 0))
);


ALTER TABLE public.utilisateur OWNER TO postgres;

--
-- Name: utilisateur_id_utilisateur_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.utilisateur_id_utilisateur_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.utilisateur_id_utilisateur_seq OWNER TO postgres;

--
-- Name: utilisateur_id_utilisateur_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.utilisateur_id_utilisateur_seq OWNED BY public.utilisateur.id_utilisateur;


--
-- Name: administrateur id_administrateur; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrateur ALTER COLUMN id_administrateur SET DEFAULT nextval('public.administrateur_id_administrateur_seq'::regclass);


--
-- Name: apprenant id_apprenant; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apprenant ALTER COLUMN id_apprenant SET DEFAULT nextval('public.apprenant_id_apprenant_seq'::regclass);


--
-- Name: candidat id_candidat; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidat ALTER COLUMN id_candidat SET DEFAULT nextval('public.candidat_id_candidat_seq'::regclass);


--
-- Name: certification id_certification; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certification ALTER COLUMN id_certification SET DEFAULT nextval('public.certification_id_certification_seq'::regclass);


--
-- Name: evaluation id_evaluation; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation ALTER COLUMN id_evaluation SET DEFAULT nextval('public.evaluation_id_evaluation_seq'::regclass);


--
-- Name: evaluation_choix id_choix; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_choix ALTER COLUMN id_choix SET DEFAULT nextval('public.evaluation_choix_id_choix_seq'::regclass);


--
-- Name: evaluation_question id_question; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_question ALTER COLUMN id_question SET DEFAULT nextval('public.evaluation_question_id_question_seq'::regclass);


--
-- Name: evaluation_reponse id_reponse; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_reponse ALTER COLUMN id_reponse SET DEFAULT nextval('public.evaluation_reponse_id_reponse_seq'::regclass);


--
-- Name: evaluation_sujet id_evaluation_sujet; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_sujet ALTER COLUMN id_evaluation_sujet SET DEFAULT nextval('public.evaluation_sujet_id_evaluation_sujet_seq'::regclass);


--
-- Name: evaluation_tentative id_tentative; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_tentative ALTER COLUMN id_tentative SET DEFAULT nextval('public.evaluation_tentative_id_tentative_seq'::regclass);


--
-- Name: formateur id_formateur; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formateur ALTER COLUMN id_formateur SET DEFAULT nextval('public.formateur_id_formateur_seq'::regclass);


--
-- Name: formation id_formation; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formation ALTER COLUMN id_formation SET DEFAULT nextval('public.formation_id_formation_seq'::regclass);


--
-- Name: formation_avis id_avis; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formation_avis ALTER COLUMN id_avis SET DEFAULT nextval('public.formation_avis_id_avis_seq'::regclass);


--
-- Name: forum id_forum; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum ALTER COLUMN id_forum SET DEFAULT nextval('public.forum_id_forum_seq'::regclass);


--
-- Name: inscription id_inscription; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inscription ALTER COLUMN id_inscription SET DEFAULT nextval('public.inscription_id_inscription_seq'::regclass);


--
-- Name: message id_message; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message ALTER COLUMN id_message SET DEFAULT nextval('public.message_id_message_seq'::regclass);


--
-- Name: presence id_presence; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.presence ALTER COLUMN id_presence SET DEFAULT nextval('public.presence_id_presence_seq'::regclass);


--
-- Name: responsable id_responsable; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsable ALTER COLUMN id_responsable SET DEFAULT nextval('public.responsable_id_responsable_seq'::regclass);


--
-- Name: seance id_seance; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seance ALTER COLUMN id_seance SET DEFAULT nextval('public.seance_id_seance_seq'::regclass);


--
-- Name: support_cours id_support; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_cours ALTER COLUMN id_support SET DEFAULT nextval('public.support_cours_id_support_seq'::regclass);


--
-- Name: utilisateur id_utilisateur; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateur ALTER COLUMN id_utilisateur SET DEFAULT nextval('public.utilisateur_id_utilisateur_seq'::regclass);


--
-- Data for Name: administrateur; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.administrateur (id_administrateur, id_utilisateur, date_creation) FROM stdin;
1	1	2026-09-19 06:37:46.190953
\.


--
-- Data for Name: apprenant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.apprenant (id_apprenant, id_utilisateur, id_candidat, date_creation, statut) FROM stdin;
2	5	1	2026-09-19 09:59:04.428199	ACTIF
3	6	2	2026-10-01 15:05:48.503126	ACTIF
\.


--
-- Data for Name: candidat; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidat (id_candidat, email, nom, prenom, age, genre, telephone, niveau_etude, situation_professionnelle, etablissement, filiere, date_creation) FROM stdin;
1	hashthag10@gmail.com	Sarah	Cameroon	19	Femme	032 28 188 26	Licence	Etudiant	EMIT	DA2I	2026-09-19 08:17:34.585532
2	bebemartiora@gmail.com	Cristiano	Ronaldo	19	Homme	032 28 188 26	Licence	Etudiant	ENS	SV	2026-10-01 15:02:23.649478
\.


--
-- Data for Name: certification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certification (id_certification, id_apprenant, id_formation, date_certification, statut, fichier_certification, numero_certification, commentaire) FROM stdin;
\.


--
-- Data for Name: evaluation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluation (id_evaluation, id_apprenant, id_formation, id_formateur, id_evaluation_sujet, type_evaluation, note, date_evaluation, commentaire) FROM stdin;
\.


--
-- Data for Name: evaluation_choix; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluation_choix (id_choix, id_question, libelle, est_correct, ordre) FROM stdin;
1	1	Aimé	f	1
2	1	Arcade	t	2
3	2	C'est une réponse automatique du corps et de l'esprit face à une situation	t	1
4	2	c'est une sensation vertigineuse indescriptible 	f	2
5	3	La formulation d’un argument logique	f	1
6	3	Les larmes qui apparaissent lors d’une émotion	t	2
7	4	Servir de signaux d’alarme qui indiquent qu’il faut agir	t	1
8	4	Remplacer complètement les pensées	f	2
9	5	À la sécurité et à la protection	f	1
10	5	Au soutien et au réconfort	t	2
11	6	Exprimer ses émotions de manière accusatrice	f	1
12	6	Identifier ce qui nous touche ou nous blesse pour en prendre soin	t	2
13	6	Éviter toute émotion désagréable	f	3
14	7	Pour empêcher toute expression émotionnelle	f	1
15	7	Pour supprimer toute forme de désaccord	f	2
16	7	Pour éviter des conflits inutiles	t	3
17	7	Pour rendre les émotions plus intenses	f	4
18	8	Naruto	f	1
19	8	Ishigo	t	2
20	8	Luffy	f	3
21	8	Kazuma	f	4
22	9	shinigami	t	1
23	9	Hollow	f	2
27	9	humain	f	3
28	11	Rukia	f	1
29	11	orihime	t	2
30	12	rasengan	f	1
31	12	mille oiseaux	f	2
32	12	Bankai	t	3
33	12	maduken	f	4
\.


--
-- Data for Name: evaluation_question; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluation_question (id_question, id_evaluation_sujet, numero_question, enonce, points, date_creation) FROM stdin;
1	1	1	quel est mon nom ?	5.00	2026-09-19 07:54:04.481072
2	1	2	Qu'est-ce qu'une émotion ?	5.00	2026-09-19 08:01:32.17618
3	1	3	Quel exemple correspond à une manifestation physiologique d’une émotion ?	2.00	2026-09-19 08:03:13.220175
4	1	4	Quel est le rôle principal des émotions dans cette approche ?	2.00	2026-09-19 08:03:54.17079
5	1	5	À quel besoin l’émotion de tristesse est-elle associée ?	3.00	2026-09-19 08:04:37.376588
6	1	6	Que signifie mieux se connaître dans le cadre de la compréhension des émotions ?	2.00	2026-09-19 08:06:40.751405
7	1	7	Pourquoi comprendre sa colère peut-il être utile ?	1.00	2026-09-19 08:13:03.574565
8	2	1	Quel est le nom du perso principal dans bleach ?	2.00	2026-10-01 15:16:50.715422
9	2	2	a quel espece appartient Rukia ?	5.00	2026-10-01 15:17:53.293241
11	2	3	comment s'appele la copine du perso principale ?	5.00	2026-10-01 15:21:22.70281
12	2	4	quel est la techinque iconique dans bleach ?	8.00	2026-10-01 15:22:42.907328
\.


--
-- Data for Name: evaluation_reponse; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluation_reponse (id_reponse, id_tentative, id_question, id_choix, points_obtenus) FROM stdin;
1	1	8	19	2.00
2	1	9	27	0.00
3	1	11	29	5.00
4	1	12	30	0.00
5	2	8	19	2.00
6	2	9	22	5.00
7	2	11	29	5.00
8	2	12	32	8.00
\.


--
-- Data for Name: evaluation_sujet; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluation_sujet (id_evaluation_sujet, id_formation, id_formateur, titre, description, duree_minutes, obligatoire, statut, total_points, date_creation, date_modification, date_publication) FROM stdin;
1	1	1	exam	bla	20	t	BROUILLON	20.00	2026-09-19 07:50:04.889609	2026-09-19 08:13:03.574565	\N
2	3	1	Q	Quiz Bleach	20	t	PUBLIEE	20.00	2026-10-01 15:15:27.008985	2026-10-01 15:24:24.528683	2026-10-01 15:24:24.528683
\.


--
-- Data for Name: evaluation_tentative; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluation_tentative (id_tentative, id_evaluation_sujet, id_apprenant, date_debut, date_fin, note, statut) FROM stdin;
1	2	3	2026-10-01 16:40:25.189662	2026-10-01 16:40:44.960525	7.00	TERMINEE
2	2	3	2026-10-02 06:09:24.840535	2026-10-02 06:09:46.783371	20.00	TERMINEE
\.


--
-- Data for Name: formateur; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formateur (id_formateur, id_utilisateur, specialite, biographie, date_creation) FROM stdin;
1	3	psychologie 	\N	2026-09-19 07:38:34.017289
\.


--
-- Data for Name: formation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formation (id_formation, titre, description, image_url, date_debut, date_fin, date_limite_inscription, capacite_max, statut, date_creation, date_modification) FROM stdin;
1	dev peronnel	formation sur le développement personnel et la metrise de ses emotions	\N	2026-12-21	2026-12-25	2026-12-01	40	OUVERTE	2026-09-19 07:31:18.251346	\N
4	BG	test	https://www.image2url.com/r2/default/images/1790869531856-58644133-4d23-4ec9-8346-888a40073654.png	2026-08-01	2026-08-05	2026-07-28	20	TERMINEE	2026-10-01 16:46:18.181844	2026-10-01 16:49:35.687782
3	Bleach	formation special sur bleach	https://www.image2url.com/r2/default/images/1790862885121-c7a24334-5f16-468b-bed9-3a4f570c7835.jpg	2026-10-01	2026-10-04	2026-10-01	20	OUVERTE	2026-10-01 14:56:12.050024	2026-10-04 17:01:44.850066
\.


--
-- Data for Name: formation_avis; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formation_avis (id_avis, id_formation, id_apprenant, note, commentaire, date_creation) FROM stdin;
\.


--
-- Data for Name: formation_formateur; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formation_formateur (id_formation, id_formateur, date_affectation, role_formateur) FROM stdin;
1	1	2026-09-19 07:39:14.692916	Formateur Principal
3	1	2026-10-01 15:13:06.653162	Formateur Principal
4	1	2026-10-04 17:00:39.844206	Formateur Principal
\.


--
-- Data for Name: forum; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.forum (id_forum, id_formation, nom, description, date_creation) FROM stdin;
1	1	Forum dev peronnel	Espace de discussion pour la formation dev peronnel.	2026-10-02 06:20:52.765007
2	3	Forum Bleach	Espace de discussion pour la formation Bleach.	2026-10-02 06:20:52.765007
3	4	Forum BG	Espace de discussion pour la formation BG.	2026-10-02 06:20:52.765007
\.


--
-- Data for Name: inscription; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inscription (id_inscription, id_candidat, id_formation, date_inscription, statut, motivation, objectif, projet_apres_formation, source_information, a_deja_suivi_formation, formation_precedente, retour_suggestion, conditions_acceptees, date_decision, motif_decision, date_modification) FROM stdin;
1	1	1	2026-09-19 08:17:34.585532	ACCEPTEE	je veut metriser mes émotions pour les moments difficile et opressants	controller mon stress, mon courage, mes pulsions	mettre en valeur les ompetence que j'aurais acquis lors de la formation		f			t	2026-09-19 09:59:04.428199	\N	2026-09-19 09:59:04.428199
2	2	3	2026-10-01 15:02:23.649478	ACCEPTEE	j'aime bleach 	maitriser bleach	pouvoirs tenir une conversation sur bleach		f			t	2026-10-01 15:05:48.503126	\N	2026-10-01 15:05:48.503126
3	2	1	2026-10-02 09:40:28.93796	ACCEPTEE	pareil, blabla	tous mes skill	me faire un packet de frick		f			t	2026-10-02 09:50:10.014635	\N	2026-10-02 09:50:10.014635
\.


--
-- Data for Name: message; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message (id_message, id_forum, id_utilisateur, contenu, date_envoi, date_modification, message_parent) FROM stdin;
1	2	3	Kaiza doll	2026-10-02 06:22:34.200513	\N	\N
2	2	6	Kaiza bro	2026-10-02 06:23:16.439669	\N	\N
3	2	3	__FORUM_ATTACHMENT_V1__:{"contenu":"ito de ianaro le note","nom_fichier":"Princess Mononoke - Main Theme [Fingerstyle].pdf","chemin_fichier":"ba743650-06a5-4a39-aca9-f64edc6c4b72.pdf","type_fichier":"application/pdf","taille_fichier":70466}	2026-10-02 06:29:53.523401	\N	\N
4	2	6	Ok	2026-10-02 06:30:21.106933	\N	\N
\.


--
-- Data for Name: presence; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.presence (id_presence, id_apprenant, id_seance, date_scan, statut, commentaire) FROM stdin;
1	3	4	2026-10-02 06:26:03.594912	PRESENT	\N
2	3	5	2026-10-02 09:10:40.222211	PRESENT	\N
\.


--
-- Data for Name: responsable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.responsable (id_responsable, id_utilisateur, fonction, date_creation) FROM stdin;
1	2	Mandede	2026-09-19 06:58:23.190465
\.


--
-- Data for Name: seance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seance (id_seance, id_formation, titre, description, date_seance, heure_debut, heure_fin, type_seance, salle) FROM stdin;
1	1	Introduction		2026-12-21	08:00:00	11:00:00	Cours Magistral	salle odc
2	1	l'amour de soi		2026-12-21	14:00:00	16:00:00	Cours Magistral	salle odc
3	1	Travaux Pratiques (TP) - dev peronnel		2026-12-22	08:00:00	12:00:00	Travaux Pratiques (TP)	salle odc
4	3	Cours Magistral - Bleach		2026-10-02	08:00:00	12:00:00	Cours Magistral	odc
5	3	Cours Magistral - Bleach		2026-10-02	13:00:00	15:00:00	Cours Magistral	odc
6	3	Cours Magistral - Bleach		2026-10-03	08:00:00	10:00:00	Cours Magistral	salle odc
\.


--
-- Data for Name: support_cours; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_cours (id_support, id_formation, id_formateur, nom_fichier, type_fichier, chemin_fichier, date_publication, description) FROM stdin;
\.


--
-- Data for Name: utilisateur; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utilisateur (id_utilisateur, email, mot_de_passe, username, nom, prenom, telephone, age, photo_profil, qr_code, statut_compte, date_creation, date_derniere_connexion) FROM stdin;
3	formateur@gmail.com	$2b$10$rIkm30SEGO1t.3sNxd5zw.RXp/kqLByDCDOvmQPmgUAQd2ObVg/W6	\N	RAZAFIMANDIMBY	Santatra	032 28 188 29	34	avatar-3-1791130143606-550573786.jpg	\N	ACTIF	2026-09-19 07:38:34.017289	2026-10-04 17:08:44.312471
2	nyandry245@gmail.com	$2b$10$kFIo..o3jQT70hpFLNLoGupNKaqpXjegUzHhScI06ZK6sYs4rW51C	\N	RAKEMBA	Ny Andry	032 28 188 26	12	avatar-2-1791130048181-183261829.jpg	\N	ACTIF	2026-09-19 06:58:23.190465	2026-10-04 17:10:57.076369
1	admin@plateforme.com	$2b$10$TZhK/cGGoSOh7P3HBwbuduktxXqm4Vr4mTQ.sPdgdMASTFp9Qu00O	THAG34	ANDRIATSARANIARIVO	Joseph Aimé	0340643598	20	avatar-1-1791130104838-35049754.jpg	\N	ACTIF	2026-09-19 06:37:06.503891	2026-10-04 17:12:18.111562
5	hashthag10@gmail.com	$2b$10$Fjw6ktwCOcRpayJgMBRXbuO86tGzeaF53uIJ4Z6hsVIngG50w4zIa	SARAH34	Sarah	Cameroon	032 28 188 26	19	avatar-anon-1789808617351-96626445.jpg	data:image/png;base64,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	ACTIF	2026-09-19 09:59:04.428199	2026-09-25 04:31:06.751228
6	bebemartiora@gmail.com	$2b$10$ZroDXZmDumueCBnYq12NQOGle.iS7q/Ta5cVAGT2Is7hPWVK4IYpy	CR7	Cristiano	Ronaldo	032 28 188 26	19	avatar-anon-1790863751300-648994721.jpg	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAklEQVR4AewaftIAAAlISURBVO3BUW5kuZYEwXAi979ln/okDkQwdZFSdb0JM/wjVfWllao6Wqmqo5WqOlqpqqNXvgDkb1OzA/IONZ8AZFLzBJBJzQ7Ip6i5AfKEmgnITs0TQP42NbuVqjpaqaqjlao6Wqmqo1fepOanALlR8wSQSc0E5AbIjZp3APkENROQGzU3QN6hZgdkUvOEmp8C5Galqo5WqupopaqOXnkIyBNqfhKQGyCTmieA7IA8oeYGyATkRs0EZFKzUzMBuVHzk4A8oea7VqrqaKWqjlaq6milqo5e+UcAmdRManZAJjUTkCfU7IBMaiYgN0B2aiYgk5obNTdAPgXIpOa/bqWqjlaq6milqo5Wqurolf8xQHZqJiA3an6Smhs1TwCpz1ipqqOVqjpaqaqjVx5S81+kZgdkUjMB2QGZ1HwKkJ2aCciNmgnIjZobIJOaGyA/Sc1vWamqo5WqOlqpqqOVqjp65U1A/gVAdmomIJOaHZB3ANmpmYBManZAJjU7IE+omYBMap4AslMzAXkCyN+0UlVHK1V1tFJVRytVdfTKF9T8fwNkp+YJIJ8C5Ak1TwDZqZmATGp2QCY1N2r+a1aq6milqo5WqurolS8AmdQ8AWSnZgLyBJBJzY2aJ4A8oWYCslMzAdmpmYBMam7UTEA+Qc0E5DepuQEyqdmtVNXRSlUdrVTV0UpVHb3yEJBPUXMD5FOAPKFmAnID5Ak1TwC5UXMDZFIzAdmpmdQ8AeSnqLlZqaqjlao6Wqmqo5WqOsI/8iFAfpOaCciNmgnITs0TQN6h5ruAvEPNE0Bu1DwB5Ak1N0DeoWYHZFKzW6mqo5WqOlqpqqNX3gRkp+ZT1ExAdmomIDdqJiA3QCY1E5BPAPKEmieA3KiZgNyomdRMQG6ATGp2at4B5LtWqupopaqOVqrqaKWqjl75ApBJzRNqboBMam7UTEB2QN6h5gbIpGYHZFIzAfkEIJOaGzU3QD4FyI2aJ4BMam7U3KxU1dFKVR2tVNXRSlUdvfIQkHcA2amZ1PzXAJnU3KiZgNyomYDs1LwDyE7NBOSnAJnUTEBugDwBZFKzAzKp2a1U1dFKVR2tVNXRK19Q8ylqboBManZAJjWTmh2QSc2Nmk9RMwH5LiD/RWpugExqbtQ8AeQTVqrqaKWqjlaq6milqo5eeROQnZp3ANmpmdRMQJ4AcgNkUnMDZFKzAzKpuQFyo2YCMql5Qs0OyDuA3Kh5AsikZgdkUjMB+a6Vqjpaqaqjlao6Wqmqo1ceAjKpmdTsgPwmNZ+i5kbNO9TcANkBmdT8FDUTkEnNDsgE5EbNO4B8gpqblao6Wqmqo5WqOnrll6l5B5C/Ccg71OyAvEPNDsikZgdkAjKpeQLIE0B2at4BZAfkNwGZ1OxWqupopaqOVqrqaKWqjl75ApAbNROQSc0OyDvUPKHmE9Q8oWYCcqNmAvIJQJ5Q8w4gN0AmNTdAJjU7IO9QswNys1JVRytVdbRSVUcrVXX0yi9T85uATGomIDs17wCyUzOpmYDs1Nyo+RQ1N0DeoeYJIDs1k5pPAfJdK1V1tFJVRytVdfTKm9T8FCA3aiYgk5obIJ+i5hOATGr+JjWfomYCcgPkU9R810pVHa1U1dFKVR2tVNUR/pE3ANmpmYBMap4AslPzm4BMap4AMqm5AfIvUjMB+SlqJiBPqNmtVNXRSlUdrVTV0StfADKpuVEzAdmpmYBMam6ATGqeALJTMwF5Qs0nqJmATGpugNyomYBMam7UTEBu1ExAdkDeoWYH5Galqo5WqupopaqOVqrq6JUPAjKpuVEzAdmpmdRMQJ5QswMyqZmA3AC5UXMDZFLztwG5UfOb1ExAdmpuVqrqaKWqjlaq6milqo7wjwxAbtS8A8gTanZAJjUTkBs1N0AmNTdAJjUTkO9S85uAvEPNDsgTap4A8ilqditVdbRSVUcrVXWEf2QA8oSaTwFyo+YJIJOafxGQGzXvAPKEmk8A8pPUfNdKVR2tVNXRSlUdrVTV0StvUrMD8g4gOzUTkBs1E5BJzRNAbtRMQG7U3ACZ1OyAvEPNJ6iZgExAdmreAeQT1ExAboBManYrVXW0UlVHK1V1tFJVR688pOYJIJOaGyCTmgnIjZongExqdkAmIJOanZoJyI2aJ4DcAHmHmhsgN2omIJOaHZBJzSesVNXRSlUdrVTVEf6RDwEyqdkBeYeaGyCTmhsgv0nNE0Bu1ExAdmo+BcgTaiYgOzVPAJnUfMJKVR2tVNXRSlUdrVTV0StfAPKb1HwKkJ+iZgKyU/MOIDdqnlCzA/KEmp+k5gbIjZoJyBNqditVdbRSVUcrVXW0UlVHr3xBzQ2QSc0E5AbIjZpPUTMB2amZgHyKmh2QCciNmifUTEA+Qc0EZFKzA/IEkEnNDZCblao6Wqmqo5WqOnrlh6n5KWomIDs171Bzo+YGyKTmRs0E5AkgOzU/Sc1PUTMBeQLITs3NSlUdrVTV0UpVHa1U1RH+kQHIp6jZAXmHmhsgk5odkCfUTEAmNU8A+S1qJiCTmhsg/wI1n7BSVUcrVXW0UlVHK1V1hH/kHwDkCTUTkJ+iZgIyqdkBuVEzAflNaiYgT6h5AshOzTuA3KjZrVTV0UpVHa1U1dErXwDyt6m5UXMDZFIzAblRMwHZAZnUPKHmCTVPAHlCzQ7IE0AmNTdA3qFmB+RmpaqOVqrqaKWqjlaq6uiVN6n5KUBu1LwDyA2QSc0TanZAJiCTmu8C8g4gOzUTkEnNDZCfouZT1ExAvmulqo5WqupopaqOVqrqCP/IAGRSswPyhJoJyKRmB+QJNROQGzUTkEnNDZAn1OyA/CY1TwD5TWp+ykpVHa1U1dFKVR298o9QMwF5Qs1PATKp+QQ1E5An1ExAdkAmNROQnZp3ANmp+RQgN2puVqrqaKWqjlaq6milqo5e+R+jZgfkHWpu1ExAdmomIJOaHZBJzQ7IO9TsgPwkNTsgk5pJzScAmdTcAJnU7Faq6milqo5WqupopaqOXnlIzd+m5lOA7NRMQJ5Q8wSQJ4Ds1LxDzQ7IBORGzQRkUrMDMqn5FCDftVJVRytVdbRSVUevvAnI3wRkUvOEmgnIDsik5gkg/zVAJjU7NROQSc0OyBNqnlAzAblRc7NSVUcrVXW0UlVHK1V1hH+kqr60UlVHK1V1tFJVR/8HfeC+ttqHS9cAAAAASUVORK5CYII=	ACTIF	2026-10-01 15:05:48.503126	2026-10-04 15:14:19.185919
\.


--
-- Name: administrateur_id_administrateur_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.administrateur_id_administrateur_seq', 1, true);


--
-- Name: apprenant_id_apprenant_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.apprenant_id_apprenant_seq', 4, true);


--
-- Name: candidat_id_candidat_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.candidat_id_candidat_seq', 2, true);


--
-- Name: certification_id_certification_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certification_id_certification_seq', 1, false);


--
-- Name: evaluation_choix_id_choix_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_choix_id_choix_seq', 33, true);


--
-- Name: evaluation_id_evaluation_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_id_evaluation_seq', 1, false);


--
-- Name: evaluation_question_id_question_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_question_id_question_seq', 12, true);


--
-- Name: evaluation_reponse_id_reponse_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_reponse_id_reponse_seq', 8, true);


--
-- Name: evaluation_sujet_id_evaluation_sujet_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_sujet_id_evaluation_sujet_seq', 2, true);


--
-- Name: evaluation_tentative_id_tentative_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_tentative_id_tentative_seq', 2, true);


--
-- Name: formateur_id_formateur_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formateur_id_formateur_seq', 1, true);


--
-- Name: formation_avis_id_avis_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formation_avis_id_avis_seq', 1, false);


--
-- Name: formation_id_formation_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formation_id_formation_seq', 4, true);


--
-- Name: forum_id_forum_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.forum_id_forum_seq', 3, true);


--
-- Name: inscription_id_inscription_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inscription_id_inscription_seq', 3, true);


--
-- Name: message_id_message_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.message_id_message_seq', 4, true);


--
-- Name: presence_id_presence_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.presence_id_presence_seq', 2, true);


--
-- Name: responsable_id_responsable_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.responsable_id_responsable_seq', 1, true);


--
-- Name: seance_id_seance_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.seance_id_seance_seq', 6, true);


--
-- Name: support_cours_id_support_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.support_cours_id_support_seq', 1, false);


--
-- Name: utilisateur_id_utilisateur_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.utilisateur_id_utilisateur_seq', 6, true);


--
-- Name: administrateur administrateur_id_utilisateur_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrateur
    ADD CONSTRAINT administrateur_id_utilisateur_key UNIQUE (id_utilisateur);


--
-- Name: administrateur administrateur_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrateur
    ADD CONSTRAINT administrateur_pkey PRIMARY KEY (id_administrateur);


--
-- Name: apprenant apprenant_id_candidat_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apprenant
    ADD CONSTRAINT apprenant_id_candidat_key UNIQUE (id_candidat);


--
-- Name: apprenant apprenant_id_utilisateur_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apprenant
    ADD CONSTRAINT apprenant_id_utilisateur_key UNIQUE (id_utilisateur);


--
-- Name: apprenant apprenant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apprenant
    ADD CONSTRAINT apprenant_pkey PRIMARY KEY (id_apprenant);


--
-- Name: candidat candidat_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidat
    ADD CONSTRAINT candidat_email_key UNIQUE (email);


--
-- Name: candidat candidat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidat
    ADD CONSTRAINT candidat_pkey PRIMARY KEY (id_candidat);


--
-- Name: certification certification_numero_certification_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certification
    ADD CONSTRAINT certification_numero_certification_key UNIQUE (numero_certification);


--
-- Name: certification certification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certification
    ADD CONSTRAINT certification_pkey PRIMARY KEY (id_certification);


--
-- Name: evaluation_choix evaluation_choix_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_choix
    ADD CONSTRAINT evaluation_choix_pkey PRIMARY KEY (id_choix);


--
-- Name: evaluation evaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation
    ADD CONSTRAINT evaluation_pkey PRIMARY KEY (id_evaluation);


--
-- Name: evaluation_question evaluation_question_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_question
    ADD CONSTRAINT evaluation_question_pkey PRIMARY KEY (id_question);


--
-- Name: evaluation_reponse evaluation_reponse_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_reponse
    ADD CONSTRAINT evaluation_reponse_pkey PRIMARY KEY (id_reponse);


--
-- Name: evaluation_sujet evaluation_sujet_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_sujet
    ADD CONSTRAINT evaluation_sujet_pkey PRIMARY KEY (id_evaluation_sujet);


--
-- Name: evaluation_tentative evaluation_tentative_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_tentative
    ADD CONSTRAINT evaluation_tentative_pkey PRIMARY KEY (id_tentative);


--
-- Name: formateur formateur_id_utilisateur_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formateur
    ADD CONSTRAINT formateur_id_utilisateur_key UNIQUE (id_utilisateur);


--
-- Name: formateur formateur_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formateur
    ADD CONSTRAINT formateur_pkey PRIMARY KEY (id_formateur);


--
-- Name: formation_avis formation_avis_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formation_avis
    ADD CONSTRAINT formation_avis_pkey PRIMARY KEY (id_avis);


--
-- Name: formation_formateur formation_formateur_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formation_formateur
    ADD CONSTRAINT formation_formateur_pkey PRIMARY KEY (id_formation, id_formateur);


--
-- Name: formation formation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formation
    ADD CONSTRAINT formation_pkey PRIMARY KEY (id_formation);


--
-- Name: forum forum_id_formation_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum
    ADD CONSTRAINT forum_id_formation_key UNIQUE (id_formation);


--
-- Name: forum forum_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum
    ADD CONSTRAINT forum_pkey PRIMARY KEY (id_forum);


--
-- Name: inscription inscription_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inscription
    ADD CONSTRAINT inscription_pkey PRIMARY KEY (id_inscription);


--
-- Name: message message_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_pkey PRIMARY KEY (id_message);


--
-- Name: presence presence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.presence
    ADD CONSTRAINT presence_pkey PRIMARY KEY (id_presence);


--
-- Name: responsable responsable_id_utilisateur_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsable
    ADD CONSTRAINT responsable_id_utilisateur_key UNIQUE (id_utilisateur);


--
-- Name: responsable responsable_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsable
    ADD CONSTRAINT responsable_pkey PRIMARY KEY (id_responsable);


--
-- Name: seance seance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seance
    ADD CONSTRAINT seance_pkey PRIMARY KEY (id_seance);


--
-- Name: support_cours support_cours_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_cours
    ADD CONSTRAINT support_cours_pkey PRIMARY KEY (id_support);


--
-- Name: inscription uq_candidat_formation; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inscription
    ADD CONSTRAINT uq_candidat_formation UNIQUE (id_candidat, id_formation);


--
-- Name: certification uq_certification_apprenant_formation; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certification
    ADD CONSTRAINT uq_certification_apprenant_formation UNIQUE (id_apprenant, id_formation);


--
-- Name: evaluation_choix uq_choix_question; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_choix
    ADD CONSTRAINT uq_choix_question UNIQUE (id_question, id_choix);


--
-- Name: formation_avis uq_formation_avis_apprenant; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formation_avis
    ADD CONSTRAINT uq_formation_avis_apprenant UNIQUE (id_formation, id_apprenant);


--
-- Name: presence uq_presence_apprenant_seance; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.presence
    ADD CONSTRAINT uq_presence_apprenant_seance UNIQUE (id_apprenant, id_seance);


--
-- Name: evaluation_question uq_question_numero; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_question
    ADD CONSTRAINT uq_question_numero UNIQUE (id_evaluation_sujet, numero_question);


--
-- Name: evaluation_reponse uq_reponse_question; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_reponse
    ADD CONSTRAINT uq_reponse_question UNIQUE (id_tentative, id_question);


--
-- Name: utilisateur utilisateur_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT utilisateur_email_key UNIQUE (email);


--
-- Name: utilisateur utilisateur_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT utilisateur_pkey PRIMARY KEY (id_utilisateur);


--
-- Name: utilisateur utilisateur_qr_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT utilisateur_qr_code_key UNIQUE (qr_code);


--
-- Name: utilisateur utilisateur_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT utilisateur_username_key UNIQUE (username);


--
-- Name: idx_candidat_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_candidat_email ON public.candidat USING btree (email);


--
-- Name: idx_choix_question; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_choix_question ON public.evaluation_choix USING btree (id_question);


--
-- Name: idx_evaluation_apprenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_apprenant ON public.evaluation USING btree (id_apprenant);


--
-- Name: idx_evaluation_formateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_formateur ON public.evaluation USING btree (id_formateur);


--
-- Name: idx_evaluation_formation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_formation ON public.evaluation USING btree (id_formation);


--
-- Name: idx_evaluation_sujet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_sujet ON public.evaluation USING btree (id_evaluation_sujet);


--
-- Name: idx_formation_avis_formation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_formation_avis_formation ON public.formation_avis USING btree (id_formation);


--
-- Name: idx_formation_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_formation_statut ON public.formation USING btree (statut);


--
-- Name: idx_inscription_candidat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inscription_candidat ON public.inscription USING btree (id_candidat);


--
-- Name: idx_inscription_formation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inscription_formation ON public.inscription USING btree (id_formation);


--
-- Name: idx_inscription_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inscription_statut ON public.inscription USING btree (statut);


--
-- Name: idx_message_forum; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_forum ON public.message USING btree (id_forum);


--
-- Name: idx_presence_apprenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_presence_apprenant ON public.presence USING btree (id_apprenant);


--
-- Name: idx_question_sujet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_sujet ON public.evaluation_question USING btree (id_evaluation_sujet);


--
-- Name: idx_reponse_question; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reponse_question ON public.evaluation_reponse USING btree (id_question);


--
-- Name: idx_reponse_tentative; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reponse_tentative ON public.evaluation_reponse USING btree (id_tentative);


--
-- Name: idx_seance_formation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seance_formation ON public.seance USING btree (id_formation);


--
-- Name: idx_sujet_formateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sujet_formateur ON public.evaluation_sujet USING btree (id_formateur);


--
-- Name: idx_sujet_formation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sujet_formation ON public.evaluation_sujet USING btree (id_formation);


--
-- Name: idx_sujet_obligatoire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sujet_obligatoire ON public.evaluation_sujet USING btree (obligatoire);


--
-- Name: idx_sujet_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sujet_statut ON public.evaluation_sujet USING btree (statut);


--
-- Name: idx_tentative_apprenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tentative_apprenant ON public.evaluation_tentative USING btree (id_apprenant);


--
-- Name: idx_tentative_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tentative_statut ON public.evaluation_tentative USING btree (statut);


--
-- Name: idx_tentative_sujet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tentative_sujet ON public.evaluation_tentative USING btree (id_evaluation_sujet);


--
-- Name: idx_utilisateur_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_utilisateur_email ON public.utilisateur USING btree (email);


--
-- Name: uq_une_seule_bonne_reponse; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_une_seule_bonne_reponse ON public.evaluation_choix USING btree (id_question) WHERE (est_correct = true);


--
-- Name: evaluation_sujet trg_evaluation_sujet_modification; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_evaluation_sujet_modification BEFORE UPDATE ON public.evaluation_sujet FOR EACH ROW EXECUTE FUNCTION public.update_date_modification();


--
-- Name: formation trg_formation_modification; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_formation_modification BEFORE UPDATE ON public.formation FOR EACH ROW EXECUTE FUNCTION public.update_date_modification();


--
-- Name: inscription trg_inscription_modification; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_inscription_modification BEFORE UPDATE ON public.inscription FOR EACH ROW EXECUTE FUNCTION public.update_date_modification();


--
-- Name: evaluation_question trg_maj_total_evaluation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_maj_total_evaluation AFTER INSERT OR DELETE OR UPDATE ON public.evaluation_question FOR EACH ROW EXECUTE FUNCTION public.mettre_a_jour_total_evaluation();


--
-- Name: evaluation_sujet trg_verifier_publication_evaluation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_verifier_publication_evaluation BEFORE UPDATE OF statut ON public.evaluation_sujet FOR EACH ROW EXECUTE FUNCTION public.verifier_publication_evaluation();


--
-- Name: evaluation_question trg_verifier_total_points; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_verifier_total_points BEFORE INSERT OR UPDATE OF points ON public.evaluation_question FOR EACH ROW EXECUTE FUNCTION public.verifier_total_points_evaluation();


--
-- Name: administrateur fk_administrateur_utilisateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrateur
    ADD CONSTRAINT fk_administrateur_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateur(id_utilisateur) ON DELETE RESTRICT;


--
-- Name: apprenant fk_apprenant_candidat; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apprenant
    ADD CONSTRAINT fk_apprenant_candidat FOREIGN KEY (id_candidat) REFERENCES public.candidat(id_candidat) ON DELETE RESTRICT;


--
-- Name: apprenant fk_apprenant_utilisateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apprenant
    ADD CONSTRAINT fk_apprenant_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateur(id_utilisateur) ON DELETE RESTRICT;


--
-- Name: certification fk_certification_apprenant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certification
    ADD CONSTRAINT fk_certification_apprenant FOREIGN KEY (id_apprenant) REFERENCES public.apprenant(id_apprenant) ON DELETE CASCADE;


--
-- Name: certification fk_certification_formation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certification
    ADD CONSTRAINT fk_certification_formation FOREIGN KEY (id_formation) REFERENCES public.formation(id_formation) ON DELETE CASCADE;


--
-- Name: evaluation_choix fk_choix_question; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_choix
    ADD CONSTRAINT fk_choix_question FOREIGN KEY (id_question) REFERENCES public.evaluation_question(id_question) ON DELETE CASCADE;


--
-- Name: evaluation fk_evaluation_apprenant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation
    ADD CONSTRAINT fk_evaluation_apprenant FOREIGN KEY (id_apprenant) REFERENCES public.apprenant(id_apprenant) ON DELETE CASCADE;


--
-- Name: evaluation fk_evaluation_formateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation
    ADD CONSTRAINT fk_evaluation_formateur FOREIGN KEY (id_formateur) REFERENCES public.formateur(id_formateur) ON DELETE RESTRICT;


--
-- Name: evaluation fk_evaluation_formation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation
    ADD CONSTRAINT fk_evaluation_formation FOREIGN KEY (id_formation) REFERENCES public.formation(id_formation) ON DELETE CASCADE;


--
-- Name: formation_formateur fk_ff_formateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formation_formateur
    ADD CONSTRAINT fk_ff_formateur FOREIGN KEY (id_formateur) REFERENCES public.formateur(id_formateur) ON DELETE RESTRICT;


--
-- Name: formation_formateur fk_ff_formation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formation_formateur
    ADD CONSTRAINT fk_ff_formation FOREIGN KEY (id_formation) REFERENCES public.formation(id_formation) ON DELETE CASCADE;


--
-- Name: formateur fk_formateur_utilisateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formateur
    ADD CONSTRAINT fk_formateur_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateur(id_utilisateur) ON DELETE RESTRICT;


--
-- Name: formation_avis fk_formation_avis_apprenant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formation_avis
    ADD CONSTRAINT fk_formation_avis_apprenant FOREIGN KEY (id_apprenant) REFERENCES public.apprenant(id_apprenant) ON DELETE CASCADE;


--
-- Name: formation_avis fk_formation_avis_formation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formation_avis
    ADD CONSTRAINT fk_formation_avis_formation FOREIGN KEY (id_formation) REFERENCES public.formation(id_formation) ON DELETE CASCADE;


--
-- Name: forum fk_forum_formation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum
    ADD CONSTRAINT fk_forum_formation FOREIGN KEY (id_formation) REFERENCES public.formation(id_formation) ON DELETE CASCADE;


--
-- Name: inscription fk_inscription_candidat; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inscription
    ADD CONSTRAINT fk_inscription_candidat FOREIGN KEY (id_candidat) REFERENCES public.candidat(id_candidat) ON DELETE RESTRICT;


--
-- Name: inscription fk_inscription_formation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inscription
    ADD CONSTRAINT fk_inscription_formation FOREIGN KEY (id_formation) REFERENCES public.formation(id_formation) ON DELETE RESTRICT;


--
-- Name: message fk_message_forum; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT fk_message_forum FOREIGN KEY (id_forum) REFERENCES public.forum(id_forum) ON DELETE CASCADE;


--
-- Name: message fk_message_parent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT fk_message_parent FOREIGN KEY (message_parent) REFERENCES public.message(id_message) ON DELETE CASCADE;


--
-- Name: message fk_message_utilisateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT fk_message_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateur(id_utilisateur) ON DELETE RESTRICT;


--
-- Name: presence fk_presence_apprenant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.presence
    ADD CONSTRAINT fk_presence_apprenant FOREIGN KEY (id_apprenant) REFERENCES public.apprenant(id_apprenant) ON DELETE CASCADE;


--
-- Name: presence fk_presence_seance; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.presence
    ADD CONSTRAINT fk_presence_seance FOREIGN KEY (id_seance) REFERENCES public.seance(id_seance) ON DELETE CASCADE;


--
-- Name: evaluation_question fk_question_sujet; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_question
    ADD CONSTRAINT fk_question_sujet FOREIGN KEY (id_evaluation_sujet) REFERENCES public.evaluation_sujet(id_evaluation_sujet) ON DELETE CASCADE;


--
-- Name: evaluation_reponse fk_reponse_choix; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_reponse
    ADD CONSTRAINT fk_reponse_choix FOREIGN KEY (id_choix) REFERENCES public.evaluation_choix(id_choix) ON DELETE RESTRICT;


--
-- Name: evaluation_reponse fk_reponse_question; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_reponse
    ADD CONSTRAINT fk_reponse_question FOREIGN KEY (id_question) REFERENCES public.evaluation_question(id_question) ON DELETE CASCADE;


--
-- Name: evaluation_reponse fk_reponse_question_choix; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_reponse
    ADD CONSTRAINT fk_reponse_question_choix FOREIGN KEY (id_question, id_choix) REFERENCES public.evaluation_choix(id_question, id_choix);


--
-- Name: evaluation_reponse fk_reponse_tentative; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_reponse
    ADD CONSTRAINT fk_reponse_tentative FOREIGN KEY (id_tentative) REFERENCES public.evaluation_tentative(id_tentative) ON DELETE CASCADE;


--
-- Name: responsable fk_responsable_utilisateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsable
    ADD CONSTRAINT fk_responsable_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateur(id_utilisateur) ON DELETE RESTRICT;


--
-- Name: seance fk_seance_formation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seance
    ADD CONSTRAINT fk_seance_formation FOREIGN KEY (id_formation) REFERENCES public.formation(id_formation) ON DELETE CASCADE;


--
-- Name: evaluation_sujet fk_sujet_formateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_sujet
    ADD CONSTRAINT fk_sujet_formateur FOREIGN KEY (id_formateur) REFERENCES public.formateur(id_formateur) ON DELETE RESTRICT;


--
-- Name: evaluation_sujet fk_sujet_formation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_sujet
    ADD CONSTRAINT fk_sujet_formation FOREIGN KEY (id_formation) REFERENCES public.formation(id_formation) ON DELETE CASCADE;


--
-- Name: support_cours fk_support_formateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_cours
    ADD CONSTRAINT fk_support_formateur FOREIGN KEY (id_formateur) REFERENCES public.formateur(id_formateur) ON DELETE RESTRICT;


--
-- Name: support_cours fk_support_formation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_cours
    ADD CONSTRAINT fk_support_formation FOREIGN KEY (id_formation) REFERENCES public.formation(id_formation) ON DELETE CASCADE;


--
-- Name: evaluation_tentative fk_tentative_apprenant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_tentative
    ADD CONSTRAINT fk_tentative_apprenant FOREIGN KEY (id_apprenant) REFERENCES public.apprenant(id_apprenant) ON DELETE CASCADE;


--
-- Name: evaluation_tentative fk_tentative_sujet; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_tentative
    ADD CONSTRAINT fk_tentative_sujet FOREIGN KEY (id_evaluation_sujet) REFERENCES public.evaluation_sujet(id_evaluation_sujet) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Bj0yacNcvHYsr2aYcVYT5GOgti3vp15PWyIkQKbfPuLPRwozbS9fa7vLJbz82rv

