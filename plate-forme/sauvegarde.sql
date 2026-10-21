--
-- PostgreSQL database dump
--

\restrict v0BobTHfqahPo1Ngi1RNw19iOl1NjQYuyxyMZoUblepQn6LaOqIZVf3RtJKYhWy

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
    date_derniere_deconnexion timestamp without time zone,
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
3	6	2	2026-10-01 15:05:48.503126	ACTIF
2	5	1	2026-09-19 09:59:04.428199	ACTIF
6	8	136	2026-05-16 16:14:55.971	ACTIF
7	9	137	2026-05-21 16:14:55.971	ACTIF
8	10	138	2026-09-28 16:14:55.971	ACTIF
9	11	139	2026-05-10 16:14:55.971	ACTIF
10	12	140	2026-05-22 16:14:55.971	ACTIF
11	13	141	2026-06-05 16:14:55.971	ACTIF
12	14	142	2026-08-23 16:14:55.971	ACTIF
13	15	143	2026-08-21 16:14:55.971	ACTIF
14	16	144	2026-06-06 16:14:55.971	ACTIF
15	17	145	2026-08-24 16:14:55.971	ACTIF
16	18	216	2026-08-17 16:17:31.29	ACTIF
17	19	217	2026-07-15 16:17:31.29	ACTIF
18	20	218	2026-09-15 16:17:31.29	ACTIF
19	21	219	2026-07-16 16:17:31.29	ACTIF
20	22	220	2026-08-08 16:17:31.29	ACTIF
21	23	221	2026-05-18 16:17:31.29	ACTIF
22	24	222	2026-06-18 16:17:31.29	ACTIF
23	25	223	2026-06-06 16:17:31.29	ACTIF
24	26	224	2026-06-22 16:17:31.29	ACTIF
25	27	225	2026-04-26 16:17:31.29	ACTIF
26	28	226	2026-04-29 16:17:31.29	ACTIF
27	29	227	2026-07-12 16:17:31.29	ACTIF
28	30	228	2026-06-19 16:17:31.29	ACTIF
29	31	229	2026-08-01 16:17:31.29	ACTIF
30	32	230	2026-05-03 16:17:31.29	ACTIF
31	33	231	2026-07-30 16:17:31.29	ACTIF
32	34	232	2026-05-24 16:17:31.29	ACTIF
33	35	233	2026-08-02 16:17:31.29	ACTIF
34	36	234	2026-10-08 16:17:31.29	ACTIF
35	37	235	2026-07-24 16:17:31.29	ACTIF
36	38	236	2026-05-13 16:17:31.29	ACTIF
37	39	237	2026-10-05 16:17:31.29	ACTIF
38	40	238	2026-05-01 16:17:31.29	ACTIF
39	41	239	2026-06-06 16:17:31.29	ACTIF
40	42	240	2026-09-17 16:17:31.29	ACTIF
41	43	241	2026-09-18 16:17:31.29	ACTIF
42	44	242	2026-08-04 16:17:31.29	ACTIF
43	45	243	2026-06-11 16:17:31.29	ACTIF
44	46	244	2026-06-02 16:18:04.531	ACTIF
45	47	245	2026-08-11 16:18:04.531	ACTIF
46	48	246	2026-05-27 16:18:04.531	ACTIF
47	49	247	2026-07-26 16:18:04.531	ACTIF
48	50	248	2026-08-20 16:18:04.531	ACTIF
49	51	249	2026-07-06 16:18:04.531	ACTIF
50	52	250	2026-08-29 16:18:04.531	ACTIF
51	53	251	2026-10-14 16:18:04.531	ACTIF
52	54	252	2026-07-30 16:18:04.531	ACTIF
53	55	253	2026-07-10 16:18:04.531	ACTIF
54	56	254	2026-09-03 16:18:04.531	ACTIF
55	57	255	2026-07-05 16:18:04.531	ACTIF
56	58	256	2026-10-01 16:18:04.531	ACTIF
57	59	257	2026-09-19 16:18:26.505	ACTIF
58	60	258	2026-07-18 16:18:26.505	ACTIF
59	61	259	2026-07-23 16:18:26.505	ACTIF
60	62	260	2026-07-05 16:18:26.505	ACTIF
61	63	261	2026-05-12 16:18:26.505	ACTIF
62	64	262	2026-10-16 16:18:26.505	ACTIF
63	65	263	2026-07-09 16:18:26.505	ACTIF
64	66	264	2026-09-25 16:18:26.505	ACTIF
65	67	405	2026-08-28 16:19:20.463	ACTIF
66	68	406	2026-05-20 16:19:20.463	ACTIF
67	69	407	2026-09-20 16:19:20.463	ACTIF
68	70	408	2026-06-01 16:19:20.463	ACTIF
69	71	409	2026-05-04 16:19:20.463	ACTIF
70	72	410	2026-07-18 16:19:20.463	ACTIF
71	73	411	2026-07-23 16:19:20.463	ACTIF
72	74	412	2026-06-27 16:19:20.463	ACTIF
73	75	413	2026-08-15 16:19:20.463	ACTIF
74	76	414	2026-04-29 16:19:20.463	ACTIF
75	77	415	2026-06-13 16:19:20.463	ACTIF
76	78	416	2026-10-18 16:19:20.463	ACTIF
77	79	417	2026-10-20 16:19:20.463	ACTIF
78	80	418	2026-05-17 16:19:20.463	ACTIF
79	81	419	2026-10-13 16:19:20.463	ACTIF
80	82	420	2026-08-09 16:19:20.463	ACTIF
81	83	421	2026-09-06 16:19:20.463	ACTIF
82	84	422	2026-08-05 16:19:20.463	ACTIF
83	85	423	2026-07-20 16:19:20.463	ACTIF
84	86	424	2026-05-22 16:19:20.463	ACTIF
85	87	425	2026-09-10 16:19:47.584	ACTIF
86	88	426	2026-09-25 16:19:47.584	ACTIF
87	89	427	2026-07-30 16:19:47.584	ACTIF
88	90	428	2026-09-13 16:19:47.584	ACTIF
89	91	429	2026-07-14 16:19:47.584	ACTIF
90	92	430	2026-09-06 16:19:47.584	ACTIF
91	93	431	2026-07-06 16:19:47.584	ACTIF
92	94	432	2026-09-03 16:19:47.584	ACTIF
93	95	433	2026-09-10 16:19:47.584	ACTIF
94	96	434	2026-04-27 16:19:47.584	ACTIF
95	97	435	2026-08-08 16:19:47.584	ACTIF
96	98	436	2026-10-07 16:19:47.584	ACTIF
97	99	437	2026-06-28 16:19:47.584	ACTIF
98	100	438	2026-05-15 16:19:47.584	ACTIF
99	101	439	2026-05-31 16:19:47.584	ACTIF
100	102	440	2026-05-31 16:19:47.584	ACTIF
101	103	441	2026-07-29 16:19:47.584	ACTIF
\.


--
-- Data for Name: candidat; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidat (id_candidat, email, nom, prenom, age, genre, telephone, niveau_etude, situation_professionnelle, etablissement, filiere, date_creation) FROM stdin;
3	hashthag071@gmail.com	George	Lucas	17	Homme	0327364739	L3	Etudiant	ENI	informatique	2026-10-21 04:44:16.254095
2	bebemartiora@gmail.com	Cristiano	Ronaldo	19	Homme	0322818826	Licence	Etudiant	ENS	SV	2026-10-01 15:02:23.649478
1	hashthag10@gmail.com	Sarah	Cameroon	19	Femme	0322818826	Licence	Etudiant	EMIT	DA2I	2026-09-19 08:17:34.585532
4	synthetic-88b57c1f-0009-47b5-a648-1555104222a7@example.invalid	Rabe	Nomena	31	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Centre de formation fictif	Informatique	2026-06-08 16:13:24.32
5	synthetic-8f14c47e-f210-475c-a5ab-d722a1f3c66d@example.invalid	Rabe	Fara	40	Femme	000000000	Baccalauréat	Salarié	Établissement de test A	Marketing	2026-08-02 16:13:24.32
6	synthetic-30af8862-5d94-44d0-b464-90dab9a70c44@example.invalid	Randria	Tiana	37	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test B	Gestion	2026-05-11 16:13:24.32
7	synthetic-b12e8080-988b-4a5e-b2ed-b8823fbeff6d@example.invalid	Randria	Soa	22	Homme	000000000	Formation professionnelle	Salarié	Établissement de test A	Communication	2026-08-19 16:13:24.32
8	synthetic-7d6ca3a9-ad2c-45af-85a5-834463c339e5@example.invalid	Rabe	Tahina	40	Non renseigné	000000000	Licence	En recherche d’emploi	Établissement de test A	Gestion	2026-04-26 16:13:24.32
9	synthetic-7c1af8f4-709f-4cd8-b2e0-6b7ce18214da@example.invalid	Andria	Tahina	25	Femme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Gestion	2026-05-03 16:13:24.32
10	synthetic-9bcbf0da-4ace-411c-965d-eda3684c88a9@example.invalid	Rakoto	Soa	40	Non renseigné	000000000	Licence	En recherche d’emploi	Établissement de test B	Informatique	2026-05-10 16:13:24.32
11	synthetic-01445511-aea9-424c-a167-5bfe3c54e4dd@example.invalid	Andria	Miora	39	Non renseigné	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Communication	2026-06-22 16:13:24.32
12	synthetic-6831f895-68e9-4261-8fdf-9ed61f05e024@example.invalid	Raveloson	Tiana	26	Homme	000000000	Baccalauréat	Étudiant	Établissement de test A	Informatique	2026-04-24 16:13:24.32
13	synthetic-e470cd9f-c275-44a3-a3f4-83168b0c5c0d@example.invalid	Raveloson	Nomena	31	Non renseigné	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Marketing	2026-08-14 16:13:24.32
14	synthetic-738991e4-fd7e-4c45-a19c-3d551689274b@example.invalid	Rakoto	Mialy	29	Femme	000000000	Formation professionnelle	En recherche d’emploi	Centre de formation fictif	Gestion	2026-06-22 16:13:24.32
15	synthetic-1c328d43-8043-4b35-991b-4c63aa66758f@example.invalid	Raveloson	Tiana	34	Homme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Marketing	2026-07-20 16:13:24.32
16	synthetic-b85a6cec-1d5c-41fb-b7dc-5dd116914303@example.invalid	Rakoto	Tiana	21	Non renseigné	000000000	Baccalauréat	Salarié	Centre de formation fictif	Informatique	2026-07-21 16:13:24.32
17	synthetic-4fb15120-d817-4164-ae65-8bcc25df5534@example.invalid	Rasoanaivo	Fara	29	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Établissement de test B	Communication	2026-07-03 16:13:24.32
18	synthetic-b184665e-66bd-4a62-a43f-e4afe5d07fdb@example.invalid	Raveloson	Hery	28	Homme	000000000	Master	En recherche d’emploi	Établissement de test A	Informatique	2026-05-09 16:13:24.32
19	synthetic-10a5f5e7-ac2c-469c-97e1-2697c6fad515@example.invalid	Ramanantsoa	Aina	19	Non renseigné	000000000	Licence	Étudiant	Centre de formation fictif	Informatique	2026-05-21 16:13:24.32
20	synthetic-658ce639-e337-40dc-a746-4bcb07d10420@example.invalid	Andria	Tahina	33	Homme	000000000	Licence	En recherche d’emploi	Établissement de test A	Informatique	2026-07-16 16:13:24.32
21	synthetic-1fd2c63d-f910-4e53-86c1-0dca32a31d63@example.invalid	Andria	Lova	21	Homme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Communication	2026-09-22 16:13:24.32
22	synthetic-b7b15b07-62f0-46db-a1bf-550329c0919b@example.invalid	Razafy	Nomena	34	Femme	000000000	Master	Étudiant	Centre de formation fictif	Réseaux	2026-04-25 16:13:24.32
23	synthetic-53d63562-19a0-4fe2-9cae-9992666351c8@example.invalid	Rabe	Tiana	28	Femme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test B	Réseaux	2026-10-05 16:13:24.32
24	synthetic-604ab14f-f109-4d37-8298-1a48fb2dfb96@example.invalid	Razafy	Miora	33	Homme	000000000	Master	Salarié	Centre de formation fictif	Communication	2026-05-10 16:13:24.32
25	synthetic-0abb8693-28a4-449a-b8d1-3b34e6283e1f@example.invalid	Randria	Aina	26	Femme	000000000	Licence	Étudiant	Établissement de test B	Communication	2026-09-08 16:13:24.32
26	synthetic-21bd21bd-b310-48a8-acee-0184007a6e02@example.invalid	Ramanantsoa	Tahina	19	Femme	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Informatique	2026-07-20 16:13:24.32
27	synthetic-b931ab75-c968-4737-a1f0-440d1aa914db@example.invalid	Rabe	Nomena	28	Femme	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Marketing	2026-04-26 16:13:24.32
28	synthetic-9d848d9b-5e49-4d98-b645-1c8b3c109e8a@example.invalid	Razafy	Mialy	19	Homme	000000000	Formation professionnelle	Salarié	Établissement de test B	Réseaux	2026-09-10 16:13:24.32
29	synthetic-58c67d58-d162-4779-a17e-e4419ee863d1@example.invalid	Ramanantsoa	Miora	18	Femme	000000000	Licence	Salarié	Centre de formation fictif	Communication	2026-08-15 16:13:24.32
30	synthetic-9ceafbe4-c332-4839-a899-c2efa1158d75@example.invalid	Rakoto	Tahina	38	Homme	000000000	Master	Étudiant	Centre de formation fictif	Réseaux	2026-05-27 16:13:24.32
31	synthetic-69408878-a006-44e5-9d52-e3708c10c7c7@example.invalid	Andria	Aina	24	Non renseigné	000000000	Baccalauréat	Salarié	Établissement de test B	Marketing	2026-09-22 16:13:24.32
32	synthetic-7f042f0b-cb71-4a26-8fba-71c4cb3b9de8@example.invalid	Ramanantsoa	Aina	22	Femme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Informatique	2026-09-19 16:13:24.32
33	synthetic-55098bc3-e993-4886-9eb1-4e05bf9a1895@example.invalid	Rasoanaivo	Tahina	30	Femme	000000000	Master	En recherche d’emploi	Établissement de test A	Communication	2026-06-07 16:13:24.32
34	synthetic-b7835b12-c926-41dc-9509-0ceff64d8af4@example.invalid	Randria	Aina	19	Femme	000000000	Formation professionnelle	Salarié	Établissement de test B	Gestion	2026-09-18 16:13:24.32
35	synthetic-2a37c3f3-b38c-4d51-beae-86848218b0ee@example.invalid	Rakoto	Miora	33	Non renseigné	000000000	Licence	Salarié	Centre de formation fictif	Informatique	2026-10-03 16:13:24.32
36	synthetic-0aec6711-ba78-493a-b7e8-540b0f1640b2@example.invalid	Randria	Tiana	35	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Réseaux	2026-10-03 16:13:24.32
37	synthetic-8d79d44e-dd4d-4904-bb98-0d0ec84af939@example.invalid	Rakoto	Fara	22	Femme	000000000	Formation professionnelle	Étudiant	Établissement de test A	Gestion	2026-09-15 16:13:24.32
38	synthetic-86b130ef-4952-4a76-ab01-b440ac9274b7@example.invalid	Rabe	Nomena	31	Non renseigné	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Gestion	2026-09-24 16:13:24.32
39	synthetic-fc88444d-65e2-48e0-9691-ce2f2466dc7d@example.invalid	Rabe	Lova	18	Femme	000000000	Master	En recherche d’emploi	Établissement de test A	Réseaux	2026-09-19 16:13:24.32
40	synthetic-a0cce7cf-e4f9-448d-848c-c410782941fd@example.invalid	Randria	Soa	22	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test B	Communication	2026-09-04 16:13:24.32
41	synthetic-7b9b77ca-f7a8-4c7b-844b-c7809c61942b@example.invalid	Andria	Miora	39	Homme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Marketing	2026-06-21 16:13:24.32
42	synthetic-a2dd6bcb-550d-4394-bb61-c390a97146d8@example.invalid	Rabe	Tiana	39	Non renseigné	000000000	Master	En recherche d’emploi	Centre de formation fictif	Informatique	2026-04-29 16:13:24.32
43	synthetic-bd014f41-8e3e-4678-a7a1-c35a691330e2@example.invalid	Raveloson	Mialy	22	Femme	000000000	Licence	Étudiant	Centre de formation fictif	Marketing	2026-09-02 16:13:24.32
44	synthetic-9f63c76b-a7f8-411e-bf9c-253c74cba0e4@example.invalid	Rasoanaivo	Hery	36	Non renseigné	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Communication	2026-05-07 16:13:24.32
45	synthetic-6a8a48be-765b-45a4-95d7-29fd33b3c288@example.invalid	Rabe	Nomena	28	Non renseigné	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Marketing	2026-09-30 16:13:24.32
46	synthetic-a2d4e898-a4de-4dd2-ae5a-833add0c9156@example.invalid	Andria	Soa	28	Homme	000000000	Formation professionnelle	Salarié	Établissement de test B	Communication	2026-05-03 16:13:24.32
47	synthetic-779ce60f-14f7-472b-bd88-c581d91926eb@example.invalid	Rasoanaivo	Aina	24	Femme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test B	Communication	2026-07-11 16:13:24.32
48	synthetic-7a3bfa21-13ca-4e4a-b053-6acd5ff4b913@example.invalid	Andria	Soa	32	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test A	Informatique	2026-07-13 16:13:24.32
49	synthetic-e9c2c4ff-7f24-49b5-a6a3-9107b59f8f66@example.invalid	Ramanantsoa	Aina	39	Femme	000000000	Master	Salarié	Établissement de test A	Communication	2026-06-25 16:13:24.32
50	synthetic-23ebfef5-2f26-450b-86e6-baadc75bbe2a@example.invalid	Rakoto	Tiana	36	Homme	000000000	Formation professionnelle	En recherche d’emploi	Centre de formation fictif	Marketing	2026-10-03 16:13:24.32
51	synthetic-54700994-3838-4f31-b3ba-b0c70b79abc1@example.invalid	Razafy	Tiana	18	Non renseigné	000000000	Licence	Salarié	Centre de formation fictif	Informatique	2026-06-21 16:13:24.32
52	synthetic-bcf81106-8824-42ac-8a0a-794992eb48d4@example.invalid	Rakoto	Tahina	28	Femme	000000000	Master	Étudiant	Établissement de test A	Gestion	2026-04-27 16:13:24.32
53	synthetic-15a1d87d-94c5-4659-bcf4-eba448ea23e5@example.invalid	Razafy	Soa	24	Homme	000000000	Formation professionnelle	Salarié	Établissement de test A	Informatique	2026-07-05 16:13:24.32
54	synthetic-f8111404-5b46-4523-8c94-3a03b114170c@example.invalid	Rabe	Tiana	27	Non renseigné	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Communication	2026-05-02 16:13:24.32
55	synthetic-f81519c0-e5d3-4a82-9ac4-2b3cf7de47f4@example.invalid	Rasoanaivo	Fara	38	Homme	000000000	Licence	Étudiant	Établissement de test A	Marketing	2026-06-17 16:13:24.32
56	synthetic-9b2faa9c-55fe-4b49-9fe9-2c14b1c1f4e3@example.invalid	Rakoto	Tiana	29	Homme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Communication	2026-04-25 16:13:24.32
57	synthetic-c8871847-35ba-438b-bf8b-1b1718f743c0@example.invalid	Randria	Nomena	27	Non renseigné	000000000	Master	En recherche d’emploi	Établissement de test A	Informatique	2026-07-18 16:13:24.32
58	synthetic-b1670b17-b29b-4c75-8556-7171a4463c81@example.invalid	Ramanantsoa	Mialy	33	Homme	000000000	Licence	Salarié	Établissement de test B	Marketing	2026-05-23 16:13:24.32
59	synthetic-e512e7db-5a12-4e46-a9c4-27cd8b4d5a17@example.invalid	Rakoto	Fara	18	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test A	Gestion	2026-07-19 16:13:24.32
60	synthetic-2bbbaf23-c63b-473f-a1bc-49f79409697f@example.invalid	Raveloson	Aina	28	Non renseigné	000000000	Licence	En recherche d’emploi	Établissement de test B	Gestion	2026-09-06 16:13:24.32
61	synthetic-3befda85-52b0-4a70-aba9-2def49d02814@example.invalid	Ramanantsoa	Lova	30	Femme	000000000	Licence	Étudiant	Centre de formation fictif	Gestion	2026-06-06 16:13:24.32
62	synthetic-306bfc4b-1d6e-4ec2-9933-43ebd495c77a@example.invalid	Rakoto	Aina	27	Homme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Marketing	2026-06-07 16:13:24.32
63	synthetic-32c5900d-3f19-413f-bd19-aac63419ea67@example.invalid	Randria	Tahina	38	Homme	000000000	Licence	Salarié	Établissement de test A	Réseaux	2026-10-06 16:13:24.32
64	synthetic-99850d20-831a-467a-81b3-490917fca9ae@example.invalid	Andria	Tiana	19	Femme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test B	Gestion	2026-05-24 16:13:24.32
65	synthetic-f86bb10a-ee15-45f0-93e7-a9f6e7c0880a@example.invalid	Ramanantsoa	Tiana	38	Femme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test B	Marketing	2026-09-14 16:13:24.32
66	synthetic-9add26e0-c31f-4aad-ad08-5711ac1903cb@example.invalid	Andria	Tiana	19	Non renseigné	000000000	Master	Étudiant	Centre de formation fictif	Communication	2026-07-21 16:13:24.32
67	synthetic-1654c875-89aa-4f0f-9671-c71339a961d3@example.invalid	Rasoanaivo	Miora	32	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test B	Gestion	2026-08-18 16:13:24.32
68	synthetic-73e307fc-a94a-4805-9343-5d10a8ec33b9@example.invalid	Ramanantsoa	Hery	20	Homme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Marketing	2026-05-17 16:13:24.32
69	synthetic-1264ea37-801d-40ba-b3f0-33d3f463926a@example.invalid	Razafy	Fara	31	Femme	000000000	Master	Salarié	Établissement de test A	Gestion	2026-07-19 16:13:24.32
70	synthetic-15c4f4f3-a768-4f32-b937-5bcdd4f5683d@example.invalid	Andria	Mialy	21	Non renseigné	000000000	Formation professionnelle	Salarié	Établissement de test B	Informatique	2026-06-01 16:13:24.32
71	synthetic-ece3eb09-be04-4909-ad31-acf908fd8491@example.invalid	Rakoto	Nomena	38	Homme	000000000	Baccalauréat	Salarié	Établissement de test B	Gestion	2026-07-10 16:14:02.556
72	synthetic-46adb8d7-fb8d-4970-bc5e-2d5ae409b988@example.invalid	Randria	Tiana	32	Non renseigné	000000000	Baccalauréat	Salarié	Centre de formation fictif	Gestion	2026-08-24 16:14:02.556
73	synthetic-25b78f05-85a2-4e47-b963-c0fcfa9589da@example.invalid	Razafy	Tahina	27	Femme	000000000	Master	Étudiant	Établissement de test B	Gestion	2026-05-10 16:14:02.556
74	synthetic-34afe07b-e92b-4375-a053-100c6941ca0f@example.invalid	Rakoto	Lova	34	Non renseigné	000000000	Licence	Étudiant	Centre de formation fictif	Communication	2026-05-30 16:14:02.556
75	synthetic-7d6ce5a5-9c3f-45a3-b617-e4c0c897e956@example.invalid	Raveloson	Miora	22	Homme	000000000	Master	Salarié	Établissement de test A	Communication	2026-07-05 16:14:02.556
76	synthetic-fd7dac26-8cfa-407b-be27-69f228017cba@example.invalid	Rasoanaivo	Soa	25	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test A	Communication	2026-09-09 16:14:02.556
77	synthetic-6b12a1fd-ba5a-414c-8b56-1323ad780703@example.invalid	Randria	Miora	33	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test A	Réseaux	2026-05-19 16:14:02.556
78	synthetic-dab6601a-3c5e-4d58-b168-dec978da9234@example.invalid	Rasoanaivo	Mialy	23	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Informatique	2026-07-03 16:14:02.556
79	synthetic-c6aaea43-9bf4-4f04-b020-33a2071077ff@example.invalid	Andria	Tahina	34	Femme	000000000	Baccalauréat	Salarié	Établissement de test B	Communication	2026-05-15 16:14:02.556
80	synthetic-5280c4d1-d72b-4c90-ac65-d85c7d942e66@example.invalid	Ramanantsoa	Lova	38	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Marketing	2026-09-23 16:14:02.556
81	synthetic-2a632083-f0fa-48ef-a3ba-be77fc0d2761@example.invalid	Andria	Tiana	33	Homme	000000000	Formation professionnelle	Salarié	Établissement de test A	Gestion	2026-08-24 16:14:02.556
82	synthetic-2ea9b408-5bde-494b-bd1a-539c8705d5af@example.invalid	Raveloson	Hery	28	Non renseigné	000000000	Master	Salarié	Établissement de test A	Marketing	2026-05-21 16:14:02.556
83	synthetic-bb766245-d701-4e4d-8a1c-37bbbc61df46@example.invalid	Randria	Aina	28	Femme	000000000	Licence	Salarié	Centre de formation fictif	Gestion	2026-06-05 16:14:02.556
84	synthetic-a5307612-f3b4-4291-b41d-6bea4292f107@example.invalid	Andria	Tahina	29	Femme	000000000	Master	Salarié	Établissement de test A	Informatique	2026-06-13 16:14:02.556
85	synthetic-386bc110-3a6f-4b9a-8692-99b05b2e556b@example.invalid	Randria	Tiana	25	Homme	000000000	Master	Étudiant	Centre de formation fictif	Marketing	2026-05-21 16:14:02.556
86	synthetic-f20136b8-bf3c-48f9-ab51-5476d0d2d7ed@example.invalid	Randria	Hery	28	Homme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Marketing	2026-09-20 16:14:02.556
87	synthetic-6f430abc-95b4-493c-a2b8-040089ccd102@example.invalid	Razafy	Nomena	19	Homme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test B	Marketing	2026-05-05 16:14:02.556
88	synthetic-11c4bf5f-2d1f-4a4a-8f3a-7505b638a53f@example.invalid	Rakoto	Tiana	24	Non renseigné	000000000	Licence	Salarié	Établissement de test A	Gestion	2026-08-04 16:14:02.556
89	synthetic-0c5a981c-6060-44a2-b771-5e6f4284aa29@example.invalid	Razafy	Nomena	26	Homme	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Marketing	2026-09-03 16:14:02.556
90	synthetic-832e9992-482a-4b89-ac59-6b67822c4db8@example.invalid	Rasoanaivo	Hery	39	Homme	000000000	Master	Salarié	Établissement de test B	Communication	2026-09-14 16:14:02.556
91	synthetic-56e7ab4d-50c7-4e36-ba65-01c34ea87501@example.invalid	Randria	Nomena	25	Femme	000000000	Licence	Étudiant	Centre de formation fictif	Communication	2026-09-23 16:14:02.556
92	synthetic-e76c6a97-58c6-4a65-af47-7ee7ed9f0bbd@example.invalid	Rasoanaivo	Lova	28	Non renseigné	000000000	Master	Salarié	Centre de formation fictif	Gestion	2026-10-14 16:14:02.556
93	synthetic-16d74948-b810-487a-a844-958743dfbc89@example.invalid	Rakoto	Nomena	27	Homme	000000000	Licence	Étudiant	Centre de formation fictif	Communication	2026-10-11 16:14:02.556
94	synthetic-5f4eb6bd-2816-440e-9901-ca31012218dd@example.invalid	Randria	Lova	19	Femme	000000000	Licence	Salarié	Centre de formation fictif	Communication	2026-08-25 16:14:02.556
95	synthetic-a7df2ba9-1efe-43e5-9b72-368b674ab020@example.invalid	Randria	Aina	19	Homme	000000000	Licence	Salarié	Centre de formation fictif	Informatique	2026-05-31 16:14:02.556
96	synthetic-6af9f05f-c070-4c9d-b068-35559086f41b@example.invalid	Andria	Fara	35	Femme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Réseaux	2026-07-25 16:14:02.556
97	synthetic-86bc8f7f-737c-424b-85e3-f34334b20b18@example.invalid	Raveloson	Fara	18	Femme	000000000	Master	Étudiant	Établissement de test B	Informatique	2026-09-11 16:14:02.556
98	synthetic-2d733b2e-4777-4009-93c2-c31b235b9501@example.invalid	Rasoanaivo	Mialy	28	Femme	000000000	Baccalauréat	Étudiant	Établissement de test A	Gestion	2026-05-08 16:14:02.556
99	synthetic-30b1a3a6-493b-4452-ac9c-277d92e27582@example.invalid	Ramanantsoa	Fara	31	Non renseigné	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Communication	2026-06-04 16:14:02.556
100	synthetic-c59cae93-9298-46c1-8947-0e114928b2e3@example.invalid	Rasoanaivo	Nomena	23	Homme	000000000	Master	En recherche d’emploi	Établissement de test A	Communication	2026-07-05 16:14:02.556
101	synthetic-3bdc1856-9136-465a-9106-463c5d717822@example.invalid	Rakoto	Miora	23	Non renseigné	000000000	Baccalauréat	Salarié	Centre de formation fictif	Réseaux	2026-10-16 16:14:02.556
102	synthetic-04f4ae00-7fee-4a5f-92fa-79755406172d@example.invalid	Rabe	Nomena	22	Non renseigné	000000000	Master	En recherche d’emploi	Centre de formation fictif	Réseaux	2026-09-09 16:14:02.556
103	synthetic-d1681df1-c90b-44db-adbf-732d8cb771a7@example.invalid	Andria	Miora	25	Homme	000000000	Master	Étudiant	Établissement de test A	Marketing	2026-07-31 16:14:02.556
104	synthetic-901fa7c7-a18d-47f7-beea-b30363fa7915@example.invalid	Andria	Lova	34	Femme	000000000	Licence	Étudiant	Établissement de test A	Réseaux	2026-05-14 16:14:02.556
105	synthetic-e6cfe6ad-b39c-462b-8c2d-031a03e76208@example.invalid	Rakoto	Miora	39	Femme	000000000	Licence	Étudiant	Établissement de test B	Réseaux	2026-05-31 16:14:02.556
106	synthetic-21776055-6f97-47bf-bc72-152ba066b6b0@example.invalid	Rasoanaivo	Lova	37	Homme	000000000	Licence	En recherche d’emploi	Établissement de test A	Marketing	2026-06-02 16:14:02.556
107	synthetic-0010dc53-57f9-4eff-b681-80760f422edf@example.invalid	Razafy	Miora	23	Homme	000000000	Licence	Salarié	Établissement de test A	Marketing	2026-05-25 16:14:02.556
108	synthetic-682db058-1286-413d-9502-9e0c59bf07d8@example.invalid	Rabe	Hery	40	Homme	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Réseaux	2026-09-01 16:14:02.556
109	synthetic-308d1e95-e94d-4ed7-aab5-b8ce294f1f1d@example.invalid	Ramanantsoa	Mialy	38	Non renseigné	000000000	Formation professionnelle	Salarié	Établissement de test B	Gestion	2026-06-27 16:14:02.556
110	synthetic-bd2f2193-835f-41fc-aed2-44114dbd334b@example.invalid	Andria	Tiana	31	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test A	Gestion	2026-09-02 16:14:02.556
111	synthetic-4d526ab6-5263-4277-bdaa-02302a248ebc@example.invalid	Andria	Lova	38	Non renseigné	000000000	Master	Salarié	Établissement de test B	Gestion	2026-06-15 16:14:02.556
112	synthetic-59135261-e17a-42f0-84f5-9247e61b83d0@example.invalid	Rakoto	Mialy	26	Non renseigné	000000000	Master	En recherche d’emploi	Centre de formation fictif	Gestion	2026-08-12 16:14:02.556
113	synthetic-5aab1e63-ccd9-432e-8ae4-7ba94788ac50@example.invalid	Rakoto	Hery	37	Femme	000000000	Master	En recherche d’emploi	Établissement de test B	Réseaux	2026-10-14 16:14:02.556
114	synthetic-4e9825fb-0778-4699-8800-846303e67e31@example.invalid	Raveloson	Tahina	23	Non renseigné	000000000	Master	Salarié	Établissement de test B	Gestion	2026-06-02 16:14:02.556
115	synthetic-079fd259-123a-4c1e-8602-8b6e792241dc@example.invalid	Rabe	Mialy	38	Homme	000000000	Formation professionnelle	Salarié	Établissement de test B	Informatique	2026-09-28 16:14:02.556
116	synthetic-a6087f38-cdc2-4a46-afa0-6e8e89e788ec@example.invalid	Ramanantsoa	Mialy	20	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Gestion	2026-05-13 16:14:02.556
117	synthetic-fea8043c-3616-479e-8f20-3c2eacbd6eaf@example.invalid	Rakoto	Soa	25	Homme	000000000	Licence	En recherche d’emploi	Établissement de test B	Gestion	2026-09-28 16:14:02.556
118	synthetic-0b2a2260-f547-4eba-a00b-7fa8a1a25903@example.invalid	Rakoto	Soa	26	Non renseigné	000000000	Licence	Salarié	Établissement de test B	Gestion	2026-06-19 16:14:02.556
119	synthetic-b2bb3001-6fbd-4cf4-afff-7770e94d46c7@example.invalid	Rasoanaivo	Miora	19	Non renseigné	000000000	Licence	Salarié	Établissement de test B	Marketing	2026-06-28 16:14:02.556
120	synthetic-e442828c-351c-4aa4-8b12-6dadc7da4425@example.invalid	Randria	Miora	34	Non renseigné	000000000	Licence	En recherche d’emploi	Établissement de test A	Communication	2026-09-06 16:14:02.556
121	synthetic-ddb681f9-d52b-4f6c-9cb2-44f3b7d28c3f@example.invalid	Andria	Miora	22	Femme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Communication	2026-08-13 16:14:02.556
122	synthetic-590ae7a9-9663-42c0-89de-80f91da3cbc7@example.invalid	Raveloson	Mialy	33	Homme	000000000	Baccalauréat	Étudiant	Établissement de test A	Communication	2026-07-15 16:14:02.556
123	synthetic-8ff47b3c-c8aa-4ee2-b938-94b6d0f2fc6f@example.invalid	Andria	Tahina	27	Non renseigné	000000000	Licence	En recherche d’emploi	Établissement de test B	Communication	2026-09-26 16:14:02.556
124	synthetic-0574959f-5412-44f2-8285-f956a6da0df5@example.invalid	Rakoto	Miora	35	Homme	000000000	Master	Salarié	Établissement de test B	Informatique	2026-08-05 16:14:02.556
125	synthetic-cbd735b2-25f8-4d29-b2f3-61ef2383ab0a@example.invalid	Rabe	Aina	22	Non renseigné	000000000	Master	Salarié	Établissement de test B	Informatique	2026-06-29 16:14:02.556
126	synthetic-c3307125-b07d-4e95-8ec2-d8cf761f483b@example.invalid	Ramanantsoa	Hery	31	Non renseigné	000000000	Formation professionnelle	Salarié	Établissement de test A	Marketing	2026-04-28 16:14:02.556
127	synthetic-8418b8ce-22e9-4eb4-a0e9-4905a8e692be@example.invalid	Razafy	Tahina	31	Femme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Gestion	2026-10-18 16:14:02.556
128	synthetic-1d1989bf-f4aa-46f0-88e1-1b3c7ff4b8cb@example.invalid	Razafy	Lova	37	Femme	000000000	Licence	Étudiant	Établissement de test A	Gestion	2026-07-11 16:14:02.556
129	synthetic-ed723e28-a188-440b-9b84-2a556d1b9e30@example.invalid	Rabe	Lova	27	Non renseigné	000000000	Master	En recherche d’emploi	Centre de formation fictif	Marketing	2026-07-09 16:14:02.556
130	synthetic-846ee6b4-8841-4aba-acb2-f6e8469fa43d@example.invalid	Raveloson	Mialy	30	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test A	Réseaux	2026-08-13 16:14:02.556
131	synthetic-3b3cfd70-b2a5-484c-9bda-8c1eb3beac06@example.invalid	Rasoanaivo	Lova	29	Non renseigné	000000000	Licence	En recherche d’emploi	Établissement de test A	Informatique	2026-04-28 16:14:02.556
132	synthetic-497da1d2-89a0-4170-9df7-0169145a99d9@example.invalid	Raveloson	Aina	40	Homme	000000000	Baccalauréat	Étudiant	Établissement de test B	Informatique	2026-10-12 16:14:02.556
133	synthetic-8ad0b5de-977a-4d50-bc6e-05ba4025360f@example.invalid	Andria	Tahina	25	Homme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Gestion	2026-07-05 16:14:02.556
134	synthetic-6fbcaf5b-9de4-43af-bc1a-c0a55370d558@example.invalid	Andria	Nomena	26	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Gestion	2026-07-10 16:14:02.556
135	synthetic-87c7ee4f-aa26-4999-8d50-2bdc343bdc10@example.invalid	Raveloson	Hery	28	Non renseigné	000000000	Licence	En recherche d’emploi	Établissement de test A	Réseaux	2026-08-09 16:14:02.556
136	synthetic-7bc07316-ef38-4222-876f-9c38d6eb636e@example.invalid	Rakoto	Aina	29	Femme	000000000	Licence	Étudiant	Centre de formation fictif	Réseaux	2026-05-16 16:14:55.971
137	synthetic-a644d2c6-f8c5-40b9-80a4-996f1d095e16@example.invalid	Rasoanaivo	Fara	20	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test B	Communication	2026-05-21 16:14:55.971
138	synthetic-6c07b065-43bf-4c55-bbcc-8e54a0165bc9@example.invalid	Randria	Nomena	30	Femme	000000000	Master	Étudiant	Centre de formation fictif	Gestion	2026-09-28 16:14:55.971
139	synthetic-8b5b6f1a-16da-49a8-901c-456cca7a4472@example.invalid	Raveloson	Tahina	31	Non renseigné	000000000	Licence	Étudiant	Centre de formation fictif	Marketing	2026-05-10 16:14:55.971
140	synthetic-8cf09b75-3fc3-4ea4-9926-c569ce45c7cd@example.invalid	Rasoanaivo	Miora	25	Femme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Informatique	2026-05-22 16:14:55.971
141	synthetic-4a317a0a-03c8-4f93-8a43-66f344c060c7@example.invalid	Rasoanaivo	Lova	18	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Réseaux	2026-06-05 16:14:55.971
142	synthetic-f341eafd-4a0e-4d32-9584-982f7aaea7ba@example.invalid	Randria	Hery	39	Femme	000000000	Formation professionnelle	Salarié	Établissement de test B	Informatique	2026-08-23 16:14:55.971
143	synthetic-5c289326-4c0d-486b-8182-90555e568990@example.invalid	Razafy	Lova	30	Homme	000000000	Master	Salarié	Centre de formation fictif	Réseaux	2026-08-21 16:14:55.971
144	synthetic-b3ec4b16-2015-4b97-8451-5d2fee2ed731@example.invalid	Razafy	Mialy	32	Femme	000000000	Baccalauréat	Salarié	Établissement de test B	Communication	2026-06-06 16:14:55.971
145	synthetic-336fef65-8599-41a3-b4cf-ccd9d52ce9b0@example.invalid	Raveloson	Hery	18	Non renseigné	000000000	Master	Salarié	Centre de formation fictif	Communication	2026-08-24 16:14:55.971
146	synthetic-87ce1316-767d-427c-be06-8e4fd9b02088@example.invalid	Randria	Hery	18	Non renseigné	000000000	Licence	Salarié	Centre de formation fictif	Communication	2026-08-15 16:15:58.823
147	synthetic-4811ddf3-bd50-4788-8687-a70aaf530a42@example.invalid	Rabe	Lova	39	Non renseigné	000000000	Licence	Salarié	Centre de formation fictif	Communication	2026-07-28 16:15:58.823
148	synthetic-4523c8c9-f9e4-4c8d-85b5-6223131de9bc@example.invalid	Raveloson	Miora	35	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Établissement de test B	Réseaux	2026-10-02 16:15:58.823
149	synthetic-b537bde1-87bc-4dbe-9dba-0a78f895dd69@example.invalid	Ramanantsoa	Nomena	40	Homme	000000000	Licence	En recherche d’emploi	Établissement de test A	Communication	2026-08-03 16:15:58.823
150	synthetic-955bd53c-21db-4c4c-be2d-e94d826487c6@example.invalid	Rabe	Tahina	35	Femme	000000000	Licence	Salarié	Établissement de test A	Communication	2026-10-09 16:15:58.823
151	synthetic-4b42965f-010a-4b8a-91bd-cea61e387a3b@example.invalid	Rabe	Tahina	32	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Communication	2026-07-16 16:15:58.823
152	synthetic-4c6ca8d2-c5fc-47c5-bf68-a4a138d37cc2@example.invalid	Rasoanaivo	Aina	26	Non renseigné	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Marketing	2026-06-26 16:15:58.823
153	synthetic-11355c18-0d34-47d9-9c2b-53b7c9172cd4@example.invalid	Raveloson	Tahina	34	Femme	000000000	Master	En recherche d’emploi	Établissement de test B	Informatique	2026-05-25 16:15:58.823
154	synthetic-49c9b2bf-6573-43d5-b109-1030e8e892e6@example.invalid	Rakoto	Tiana	37	Homme	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Marketing	2026-08-18 16:15:58.823
155	synthetic-bde894c0-a562-492e-967e-5d9e411ffbca@example.invalid	Ramanantsoa	Tahina	25	Femme	000000000	Formation professionnelle	Étudiant	Établissement de test A	Informatique	2026-04-27 16:15:58.823
156	synthetic-f3e7113c-67cb-475a-890f-1f27d3b59cae@example.invalid	Raveloson	Lova	31	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test B	Réseaux	2026-10-11 16:15:58.823
157	synthetic-63d1afce-606f-4184-8bef-975c97d14183@example.invalid	Raveloson	Lova	19	Femme	000000000	Formation professionnelle	Salarié	Établissement de test B	Réseaux	2026-04-25 16:15:58.823
158	synthetic-77896888-d472-48c6-b927-0fde4ee502f8@example.invalid	Rasoanaivo	Hery	38	Non renseigné	000000000	Baccalauréat	Salarié	Centre de formation fictif	Réseaux	2026-06-24 16:15:58.823
159	synthetic-7962a67c-b62d-450e-8471-a00d2301fa02@example.invalid	Rabe	Tiana	34	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test B	Réseaux	2026-08-27 16:15:58.823
160	synthetic-ce717b3c-77cb-4de0-a362-ba668b7e238f@example.invalid	Rasoanaivo	Lova	38	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test B	Communication	2026-06-12 16:15:58.823
161	synthetic-61d65f43-94b7-478e-b392-447b06bdaabb@example.invalid	Rabe	Miora	33	Femme	000000000	Baccalauréat	Salarié	Établissement de test A	Marketing	2026-05-31 16:15:58.823
162	synthetic-e7ecede3-249b-43a4-8734-abad350b670a@example.invalid	Razafy	Aina	38	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Gestion	2026-10-14 16:15:58.823
163	synthetic-5ca63409-a8dc-411c-95f8-338b99dd6a81@example.invalid	Randria	Nomena	19	Femme	000000000	Licence	Salarié	Établissement de test A	Marketing	2026-08-07 16:15:58.823
164	synthetic-5dc595c9-7bae-479b-ae23-f02dd9f520b1@example.invalid	Rabe	Hery	35	Femme	000000000	Master	Étudiant	Établissement de test B	Réseaux	2026-08-08 16:15:58.823
165	synthetic-dae9416f-0d17-47c5-bdee-4d1e49415dcf@example.invalid	Andria	Hery	21	Homme	000000000	Licence	Salarié	Établissement de test A	Marketing	2026-09-07 16:15:58.823
166	synthetic-f34ddaa8-227d-4084-970f-cc51f2582301@example.invalid	Rabe	Miora	29	Homme	000000000	Licence	En recherche d’emploi	Établissement de test A	Réseaux	2026-09-10 16:15:58.823
167	synthetic-b617abf9-0790-4b29-a9b7-1e22b723a95b@example.invalid	Rakoto	Miora	31	Femme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test B	Gestion	2026-10-08 16:15:58.823
168	synthetic-2c3de1f8-224d-43b9-beb1-625e6739def3@example.invalid	Andria	Mialy	32	Homme	000000000	Baccalauréat	Étudiant	Établissement de test A	Informatique	2026-10-19 16:15:58.823
169	synthetic-5a2f9425-e951-4734-b093-52d65c6a1479@example.invalid	Rabe	Mialy	27	Homme	000000000	Licence	En recherche d’emploi	Établissement de test A	Marketing	2026-09-19 16:15:58.823
170	synthetic-ba47d6c6-7a72-4f07-a10e-46291b3fca49@example.invalid	Andria	Tahina	34	Non renseigné	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Marketing	2026-09-03 16:15:58.823
171	synthetic-12b634c4-a3aa-45cf-bebb-03a119528d95@example.invalid	Andria	Aina	36	Femme	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Réseaux	2026-06-20 16:15:58.823
172	synthetic-9711f81f-8220-4aed-a3d7-f3abd5a6e003@example.invalid	Andria	Mialy	27	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Centre de formation fictif	Communication	2026-06-04 16:15:58.823
173	synthetic-3b7853f6-d687-4bda-a2e5-2fbf8af173d6@example.invalid	Andria	Hery	36	Non renseigné	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Informatique	2026-07-27 16:15:58.823
174	synthetic-cc61aa44-82a0-48a7-b73b-c7fc02e4c076@example.invalid	Randria	Aina	34	Non renseigné	000000000	Formation professionnelle	Salarié	Établissement de test A	Communication	2026-07-17 16:15:58.823
175	synthetic-12f7255b-2edf-4556-82ee-9eadb3b445c9@example.invalid	Rasoanaivo	Tiana	25	Non renseigné	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Gestion	2026-10-16 16:15:58.823
176	synthetic-dbc50a3b-77f2-461b-8b06-b4d7baa965e2@example.invalid	Rakoto	Mialy	31	Homme	000000000	Licence	Étudiant	Établissement de test A	Marketing	2026-05-04 16:15:58.823
177	synthetic-526e5e79-7cf2-4188-9514-821fd0884e39@example.invalid	Raveloson	Hery	26	Homme	000000000	Master	En recherche d’emploi	Établissement de test A	Informatique	2026-09-13 16:15:58.823
178	synthetic-139ea73e-e0d5-4e10-bbf1-2f7c1f1313df@example.invalid	Razafy	Miora	23	Non renseigné	000000000	Licence	Étudiant	Établissement de test B	Gestion	2026-09-11 16:15:58.823
179	synthetic-ccc4b7f0-e5a8-4db4-9a42-5b34aa8bd9a8@example.invalid	Rabe	Lova	20	Femme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Gestion	2026-05-05 16:15:58.823
180	synthetic-935b50c0-18b6-4f6f-a5b9-1d30795b1421@example.invalid	Rakoto	Nomena	35	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test A	Informatique	2026-06-15 16:15:58.823
181	synthetic-d1825ab9-006b-4d57-bc42-e1af2e3500e0@example.invalid	Andria	Fara	23	Femme	000000000	Licence	Étudiant	Centre de formation fictif	Gestion	2026-06-21 16:15:58.823
182	synthetic-b2da8448-32fa-4d39-a0a7-d3c24e6ec262@example.invalid	Rasoanaivo	Hery	28	Non renseigné	000000000	Master	En recherche d’emploi	Établissement de test A	Marketing	2026-09-09 16:15:58.823
183	synthetic-231a8ad2-00ef-48d6-a60c-e416d8c7cfd0@example.invalid	Rakoto	Fara	38	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test B	Informatique	2026-09-21 16:15:58.823
184	synthetic-7bc42b2e-a952-400e-a8c9-a8dd22d99da5@example.invalid	Rasoanaivo	Nomena	33	Non renseigné	000000000	Master	En recherche d’emploi	Établissement de test A	Marketing	2026-06-27 16:15:58.823
185	synthetic-da534767-578b-42fe-ba64-1d717ea82e64@example.invalid	Andria	Soa	23	Non renseigné	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Informatique	2026-08-13 16:15:58.823
186	synthetic-caf1d2b3-fceb-4345-a30b-6b94ec431ba2@example.invalid	Andria	Lova	24	Homme	000000000	Baccalauréat	Salarié	Établissement de test A	Gestion	2026-08-20 16:15:58.823
187	synthetic-482dcf36-20b9-4677-9c83-5282300e53b4@example.invalid	Raveloson	Aina	25	Non renseigné	000000000	Licence	Salarié	Établissement de test B	Réseaux	2026-08-25 16:15:58.823
188	synthetic-464573d2-230f-4d08-bb85-40b06f2d7c5d@example.invalid	Raveloson	Tahina	26	Non renseigné	000000000	Master	Salarié	Établissement de test A	Gestion	2026-06-14 16:15:58.823
189	synthetic-cf072f6d-6a93-4ea3-938e-61bae988bc50@example.invalid	Randria	Fara	23	Femme	000000000	Master	En recherche d’emploi	Établissement de test A	Communication	2026-04-25 16:15:58.823
190	synthetic-02fef7c0-9789-4912-84f7-4943cd250bee@example.invalid	Rabe	Aina	18	Non renseigné	000000000	Licence	Salarié	Établissement de test B	Communication	2026-10-19 16:15:58.823
191	synthetic-2fe0e242-086d-44cf-8402-1f88fe74bf53@example.invalid	Ramanantsoa	Fara	38	Femme	000000000	Formation professionnelle	Étudiant	Établissement de test A	Informatique	2026-07-20 16:15:58.823
192	synthetic-9245a98f-bf67-4d01-ad54-e765603e2f90@example.invalid	Rabe	Mialy	28	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Centre de formation fictif	Informatique	2026-08-29 16:15:58.823
193	synthetic-c82e692a-f39a-42d8-9261-95d43c6f5229@example.invalid	Andria	Nomena	38	Non renseigné	000000000	Master	En recherche d’emploi	Établissement de test B	Réseaux	2026-07-31 16:15:58.823
194	synthetic-e30c6ee0-8097-4fc9-a470-00ebda6be372@example.invalid	Andria	Soa	39	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test B	Informatique	2026-08-28 16:15:58.823
195	synthetic-511b06b6-bf3f-421e-8faf-96649c1169c3@example.invalid	Rasoanaivo	Lova	20	Femme	000000000	Master	En recherche d’emploi	Centre de formation fictif	Réseaux	2026-06-07 16:15:58.823
196	synthetic-46b0dbee-405c-4d80-9ff0-caaed93c4348@example.invalid	Rakoto	Soa	33	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test B	Communication	2026-10-19 16:15:58.823
197	synthetic-fc8ac6b1-ce99-438b-8288-cca3ff4c834f@example.invalid	Rakoto	Fara	39	Femme	000000000	Baccalauréat	Salarié	Établissement de test B	Réseaux	2026-04-28 16:15:58.823
198	synthetic-28340fb5-3ef3-498e-9a8f-b0926e0df31e@example.invalid	Randria	Fara	40	Femme	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Communication	2026-07-31 16:15:58.823
199	synthetic-f81be44e-6f28-455d-bab7-4cc02dc995ae@example.invalid	Raveloson	Lova	28	Femme	000000000	Formation professionnelle	Salarié	Établissement de test B	Informatique	2026-10-01 16:15:58.823
200	synthetic-78ac7d5b-526a-4911-a27b-03a0c7c2f738@example.invalid	Ramanantsoa	Fara	22	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Marketing	2026-08-03 16:15:58.823
201	synthetic-0406c195-1bd9-4e59-a996-023068e51ae1@example.invalid	Rasoanaivo	Nomena	35	Femme	000000000	Master	Salarié	Établissement de test A	Réseaux	2026-08-11 16:15:58.823
202	synthetic-ecbf1b49-bc26-4b48-b120-5c05d877dbb7@example.invalid	Randria	Lova	26	Homme	000000000	Master	Salarié	Établissement de test A	Réseaux	2026-08-06 16:15:58.823
203	synthetic-46b07b2b-25eb-4f2d-b749-457abb474a4f@example.invalid	Raveloson	Fara	19	Femme	000000000	Master	En recherche d’emploi	Établissement de test A	Communication	2026-05-21 16:15:58.823
204	synthetic-e32a98f3-c9f9-46bd-b812-251301bc5e04@example.invalid	Rasoanaivo	Nomena	24	Non renseigné	000000000	Licence	Salarié	Établissement de test B	Marketing	2026-05-03 16:15:58.823
205	synthetic-a3528b99-e010-4652-92eb-2898adf2109e@example.invalid	Raveloson	Aina	24	Femme	000000000	Master	En recherche d’emploi	Centre de formation fictif	Réseaux	2026-09-11 16:15:58.823
206	synthetic-2336ead8-1ec8-43b4-abd1-1ab01395847d@example.invalid	Rabe	Aina	22	Homme	000000000	Master	En recherche d’emploi	Établissement de test B	Réseaux	2026-09-25 16:15:58.823
207	synthetic-bbc991ec-0b4d-424c-bb59-ddf6028186b3@example.invalid	Rakoto	Nomena	33	Femme	000000000	Master	Étudiant	Centre de formation fictif	Marketing	2026-07-04 16:15:58.823
208	synthetic-b768291f-6664-4371-943c-170e57ebb17a@example.invalid	Rakoto	Soa	25	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Marketing	2026-07-28 16:15:58.823
209	synthetic-cf0e4139-ff63-409a-a4ec-b2e10532269e@example.invalid	Raveloson	Soa	38	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test B	Communication	2026-05-02 16:15:58.823
210	synthetic-c2fdeffc-7624-4118-a6a0-c3e3cadc16f5@example.invalid	Rabe	Fara	29	Non renseigné	000000000	Master	En recherche d’emploi	Établissement de test B	Communication	2026-06-19 16:15:58.823
211	synthetic-316e05a9-c628-4aff-8c3c-eec0a3ba825a@example.invalid	Rakoto	Nomena	34	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Réseaux	2026-09-02 16:15:58.823
212	synthetic-7ea80361-526f-42a4-b897-753d14405996@example.invalid	Raveloson	Miora	25	Femme	000000000	Licence	En recherche d’emploi	Établissement de test A	Réseaux	2026-06-09 16:15:58.823
213	synthetic-cb716d1a-df7c-4f3c-b24b-0d0225cdd3eb@example.invalid	Rakoto	Miora	32	Homme	000000000	Licence	En recherche d’emploi	Établissement de test A	Informatique	2026-08-14 16:15:58.823
214	synthetic-e6b35279-1026-45be-a4aa-fa486f845fc7@example.invalid	Andria	Mialy	35	Non renseigné	000000000	Master	Salarié	Établissement de test A	Gestion	2026-09-25 16:15:58.823
215	synthetic-02fb1939-625a-4135-a88d-0e498e29fcf8@example.invalid	Rasoanaivo	Mialy	33	Non renseigné	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Communication	2026-09-03 16:15:58.823
216	synthetic-9a9afc0e-8f5d-4382-8a9b-d7c020b0389f@example.invalid	Raveloson	Tahina	24	Homme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test B	Communication	2026-08-17 16:17:31.29
217	synthetic-f869283a-e6b2-4f7d-a56c-1385e6847a44@example.invalid	Razafy	Miora	37	Femme	000000000	Licence	Salarié	Établissement de test B	Gestion	2026-07-15 16:17:31.29
218	synthetic-015710e3-e865-413f-8bc0-f10ca5b94c68@example.invalid	Rasoanaivo	Fara	31	Femme	000000000	Master	Salarié	Centre de formation fictif	Réseaux	2026-09-15 16:17:31.29
219	synthetic-9adfe0b8-1817-4045-a089-cbef65384c13@example.invalid	Razafy	Soa	24	Homme	000000000	Licence	En recherche d’emploi	Établissement de test B	Réseaux	2026-07-16 16:17:31.29
220	synthetic-98669a86-d9bd-40bf-a9f9-a4f8c8969176@example.invalid	Randria	Miora	18	Homme	000000000	Master	Étudiant	Centre de formation fictif	Informatique	2026-08-08 16:17:31.29
221	synthetic-9945ff7d-6f2c-4e80-98ac-9af48604dd78@example.invalid	Razafy	Tiana	22	Homme	000000000	Master	Étudiant	Établissement de test B	Communication	2026-05-18 16:17:31.29
222	synthetic-e394fb08-9af9-4e75-883b-9ea5d37f694b@example.invalid	Rabe	Miora	39	Femme	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Gestion	2026-06-18 16:17:31.29
223	synthetic-fac99716-61b6-436a-9f63-5fc414c4c135@example.invalid	Raveloson	Tahina	23	Homme	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Communication	2026-06-06 16:17:31.29
224	synthetic-514d5b17-36f2-4175-a578-b972b1bf7df9@example.invalid	Rasoanaivo	Tiana	32	Femme	000000000	Licence	Étudiant	Établissement de test A	Gestion	2026-06-22 16:17:31.29
225	synthetic-b8d8cc05-31a4-46b3-868d-9835e25d7388@example.invalid	Ramanantsoa	Miora	24	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Communication	2026-04-26 16:17:31.29
226	synthetic-852c04b9-cee3-4597-80de-410c3c269f96@example.invalid	Rasoanaivo	Hery	21	Homme	000000000	Licence	Étudiant	Établissement de test A	Communication	2026-04-29 16:17:31.29
227	synthetic-8f8f967c-f81e-4c73-839c-814b5b2eaa95@example.invalid	Ramanantsoa	Miora	22	Homme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Gestion	2026-07-12 16:17:31.29
228	synthetic-8bcbd661-3573-4491-ba68-770fd32362c4@example.invalid	Raveloson	Aina	36	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test A	Informatique	2026-06-19 16:17:31.29
229	synthetic-018fbf99-9f92-431f-8a18-8496ba72036e@example.invalid	Raveloson	Tiana	31	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test A	Informatique	2026-08-01 16:17:31.29
230	synthetic-b3ac0521-3785-4961-bf77-aca09ce45742@example.invalid	Ramanantsoa	Fara	23	Non renseigné	000000000	Licence	En recherche d’emploi	Établissement de test B	Communication	2026-05-03 16:17:31.29
231	synthetic-93f1833f-e851-4bc4-9076-872a90009fa6@example.invalid	Andria	Mialy	28	Femme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Gestion	2026-07-30 16:17:31.29
232	synthetic-9c32258b-dcb4-4de8-bdbc-d0edf07dd4f2@example.invalid	Rasoanaivo	Hery	36	Femme	000000000	Formation professionnelle	En recherche d’emploi	Centre de formation fictif	Réseaux	2026-05-24 16:17:31.29
233	synthetic-05fd9b2c-0848-4314-952a-483ac3bae98b@example.invalid	Raveloson	Aina	30	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Centre de formation fictif	Informatique	2026-08-02 16:17:31.29
234	synthetic-f310c886-3de2-46f0-a7bd-19dc5f41f689@example.invalid	Rakoto	Hery	24	Non renseigné	000000000	Licence	Salarié	Établissement de test B	Réseaux	2026-10-08 16:17:31.29
235	synthetic-dbcfd2c0-80e6-4b16-908b-6898ae7252e1@example.invalid	Ramanantsoa	Hery	26	Homme	000000000	Licence	Salarié	Centre de formation fictif	Marketing	2026-07-24 16:17:31.29
236	synthetic-1522ff31-5374-47f5-8bc2-e5feadd2189d@example.invalid	Randria	Tahina	37	Non renseigné	000000000	Master	Salarié	Établissement de test A	Communication	2026-05-13 16:17:31.29
237	synthetic-d5d3fcc9-4a9e-4747-b1de-6880efd6f377@example.invalid	Rakoto	Mialy	32	Femme	000000000	Master	Étudiant	Établissement de test A	Réseaux	2026-10-05 16:17:31.29
238	synthetic-4b097dc2-e88a-4088-be38-938222bfc964@example.invalid	Ramanantsoa	Tahina	28	Femme	000000000	Licence	Salarié	Établissement de test B	Marketing	2026-05-01 16:17:31.29
239	synthetic-30575bfa-8921-4cbe-8bbb-5a0c42f3fc60@example.invalid	Razafy	Hery	36	Femme	000000000	Baccalauréat	Salarié	Établissement de test A	Communication	2026-06-06 16:17:31.29
240	synthetic-ed80bb4f-78ed-45fd-b76e-e30372b864e9@example.invalid	Raveloson	Miora	27	Femme	000000000	Master	Étudiant	Centre de formation fictif	Communication	2026-09-17 16:17:31.29
241	synthetic-907a72b5-cd89-4252-869a-c935b8a9d0ea@example.invalid	Rabe	Nomena	23	Femme	000000000	Baccalauréat	Salarié	Établissement de test B	Marketing	2026-09-18 16:17:31.29
242	synthetic-578c0b9a-1270-4bea-898b-768935843406@example.invalid	Rasoanaivo	Tahina	29	Non renseigné	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Marketing	2026-08-04 16:17:31.29
243	synthetic-39ba5533-2c5e-44ed-a60f-57bdfed48c5c@example.invalid	Rasoanaivo	Lova	25	Non renseigné	000000000	Licence	Salarié	Établissement de test B	Informatique	2026-06-11 16:17:31.29
244	synthetic-c73ffafa-68de-40b1-b2a1-74f1651789c1@example.invalid	Andria	Soa	22	Non renseigné	000000000	Master	En recherche d’emploi	Centre de formation fictif	Communication	2026-06-02 16:18:04.531
245	synthetic-56d5f5d0-c49e-40cd-aa15-b56f12ca9a05@example.invalid	Raveloson	Miora	23	Homme	000000000	Master	Salarié	Établissement de test B	Informatique	2026-08-11 16:18:04.531
246	synthetic-b5fe14d6-6615-43e9-b3e9-10af1fa01918@example.invalid	Rasoanaivo	Aina	36	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Communication	2026-05-27 16:18:04.531
247	synthetic-d3d9967e-1a37-49ec-93be-6a52bc5c5f63@example.invalid	Rasoanaivo	Tiana	30	Homme	000000000	Master	Salarié	Établissement de test B	Réseaux	2026-07-26 16:18:04.531
248	synthetic-16066f2a-9146-4ecf-ae28-86ddda0dcb90@example.invalid	Andria	Mialy	39	Femme	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Communication	2026-08-20 16:18:04.531
249	synthetic-cd67d3f1-c0c8-4b27-ae59-3e2849439564@example.invalid	Rasoanaivo	Nomena	29	Non renseigné	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Marketing	2026-07-06 16:18:04.531
250	synthetic-848ed68c-37c7-41e7-8dda-fb7d2118f8e0@example.invalid	Rabe	Lova	34	Non renseigné	000000000	Licence	Étudiant	Établissement de test A	Réseaux	2026-08-29 16:18:04.531
251	synthetic-71921398-e22d-47e0-b0d8-347d3294462f@example.invalid	Rakoto	Tiana	36	Homme	000000000	Master	Étudiant	Établissement de test A	Marketing	2026-10-14 16:18:04.531
252	synthetic-f46cc6ac-bf5d-4755-a57e-b93fc550226d@example.invalid	Ramanantsoa	Tahina	18	Non renseigné	000000000	Master	Étudiant	Centre de formation fictif	Gestion	2026-07-30 16:18:04.531
253	synthetic-da9d9d6a-e497-4d15-84f8-ac66e416dcb0@example.invalid	Rakoto	Nomena	23	Homme	000000000	Formation professionnelle	Salarié	Établissement de test A	Gestion	2026-07-10 16:18:04.531
254	synthetic-28d42104-cb78-4ed5-9a19-b799f56d7e01@example.invalid	Andria	Fara	18	Homme	000000000	Master	Étudiant	Établissement de test B	Gestion	2026-09-03 16:18:04.531
255	synthetic-c0b157c6-fca6-4579-8b0f-b5b18ab31781@example.invalid	Razafy	Tahina	36	Femme	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Communication	2026-07-05 16:18:04.531
256	synthetic-d31f1a82-8d4f-44d8-a687-52a77cfde6b8@example.invalid	Randria	Miora	33	Homme	000000000	Master	En recherche d’emploi	Établissement de test B	Communication	2026-10-01 16:18:04.531
257	synthetic-8a6c8470-328e-4d1b-8104-6be1cf620e72@example.invalid	Raveloson	Aina	38	Homme	000000000	Baccalauréat	Étudiant	Établissement de test B	Communication	2026-09-19 16:18:26.505
258	synthetic-cc1f7b58-dc96-4ef5-977e-2a96ffcfdc8d@example.invalid	Ramanantsoa	Soa	21	Femme	000000000	Licence	En recherche d’emploi	Établissement de test B	Informatique	2026-07-18 16:18:26.505
259	synthetic-bd27ae42-0c8d-4688-aa49-4b8417791587@example.invalid	Rakoto	Miora	31	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Communication	2026-07-23 16:18:26.505
260	synthetic-8a31970a-d31c-4f55-b139-88f16f55b368@example.invalid	Rasoanaivo	Soa	40	Femme	000000000	Licence	Salarié	Établissement de test A	Gestion	2026-07-05 16:18:26.505
261	synthetic-50ab7eb3-99d5-42c4-96bb-ce8f4075f250@example.invalid	Rabe	Lova	25	Non renseigné	000000000	Master	Étudiant	Établissement de test B	Informatique	2026-05-12 16:18:26.505
262	synthetic-5db9022b-3199-4dd7-98dc-5b38ed182327@example.invalid	Rabe	Aina	33	Femme	000000000	Licence	Salarié	Centre de formation fictif	Marketing	2026-10-16 16:18:26.505
263	synthetic-354fd17b-02f6-440a-be4a-7adf05e23ff6@example.invalid	Andria	Aina	19	Femme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Communication	2026-07-09 16:18:26.505
264	synthetic-ce682c75-c250-4024-9170-ce31f6a73f39@example.invalid	Rabe	Fara	30	Femme	000000000	Formation professionnelle	Étudiant	Établissement de test A	Communication	2026-09-25 16:18:26.505
265	synthetic-5ee5c397-adc2-442c-9761-af4539e6ce95@example.invalid	Rasoanaivo	Lova	20	Femme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Réseaux	2026-10-12 16:18:33.965
266	synthetic-aef01d94-d3d8-439c-8b56-3513d8daf564@example.invalid	Rasoanaivo	Aina	25	Homme	000000000	Master	Salarié	Établissement de test A	Gestion	2026-05-01 16:18:33.965
267	synthetic-7cea4e4d-22fa-4433-8540-8974580bb549@example.invalid	Randria	Soa	22	Homme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Réseaux	2026-09-19 16:18:33.965
268	synthetic-4ca27fec-613f-4c3f-9b70-2dbdf01336e8@example.invalid	Andria	Tiana	36	Homme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Communication	2026-05-01 16:18:33.965
269	synthetic-93ef558e-08c9-4f3d-9b94-1a3b8c030b62@example.invalid	Andria	Tahina	26	Non renseigné	000000000	Licence	Étudiant	Établissement de test A	Réseaux	2026-07-21 16:18:33.965
270	synthetic-d37bc4a0-94d1-4e53-9a73-32536ec91094@example.invalid	Rasoanaivo	Tiana	28	Homme	000000000	Baccalauréat	Salarié	Établissement de test A	Gestion	2026-05-30 16:18:33.965
271	synthetic-acdbace7-6489-4b83-aea6-f7de6a55affa@example.invalid	Rabe	Nomena	37	Non renseigné	000000000	Master	Salarié	Centre de formation fictif	Communication	2026-08-09 16:18:33.965
272	synthetic-75f35d92-d691-4759-a689-912517a79280@example.invalid	Ramanantsoa	Hery	28	Non renseigné	000000000	Formation professionnelle	Salarié	Établissement de test A	Gestion	2026-07-22 16:18:33.965
273	synthetic-610dcb14-23ee-458a-a5eb-a09448628adc@example.invalid	Raveloson	Mialy	19	Non renseigné	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Communication	2026-09-08 16:18:33.965
274	synthetic-7d6330e9-5987-45cb-a3fb-a17735a6ac00@example.invalid	Rasoanaivo	Soa	39	Femme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Marketing	2026-09-22 16:18:33.965
275	synthetic-a1b6cabb-3d51-483a-b4f4-aba40ef7b85d@example.invalid	Razafy	Lova	21	Homme	000000000	Baccalauréat	Étudiant	Établissement de test B	Réseaux	2026-06-27 16:18:33.965
276	synthetic-48963212-26fa-46e6-a2b4-f890d9820405@example.invalid	Rasoanaivo	Hery	29	Homme	000000000	Master	Étudiant	Centre de formation fictif	Informatique	2026-10-09 16:18:33.965
277	synthetic-7b3aff5c-9927-4140-ab00-1f91806d6834@example.invalid	Andria	Lova	23	Homme	000000000	Licence	Étudiant	Établissement de test B	Communication	2026-09-21 16:18:33.965
278	synthetic-6cb81af4-9006-4080-9144-a1380cb61c2c@example.invalid	Rasoanaivo	Soa	20	Femme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test B	Communication	2026-05-23 16:18:33.965
279	synthetic-ce42a933-aa3c-4a1a-a7cb-076286c2ff83@example.invalid	Rabe	Mialy	26	Femme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Marketing	2026-10-13 16:18:33.965
280	synthetic-2754d42f-b470-4a07-8c06-6786e1cc4f35@example.invalid	Rasoanaivo	Mialy	26	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test A	Réseaux	2026-07-05 16:18:33.965
281	synthetic-d4a9672d-6b75-4ecb-b8cb-fe909ff078e2@example.invalid	Andria	Lova	28	Homme	000000000	Licence	Salarié	Établissement de test A	Communication	2026-07-18 16:18:33.965
282	synthetic-d9c5c21f-d89d-41d4-bf03-26d3f81ea847@example.invalid	Rabe	Soa	24	Homme	000000000	Baccalauréat	Salarié	Établissement de test B	Informatique	2026-06-10 16:18:33.965
283	synthetic-94690de1-3c4f-4d61-b1dc-f9d55cbb469e@example.invalid	Razafy	Soa	21	Homme	000000000	Licence	Étudiant	Établissement de test B	Gestion	2026-06-29 16:18:33.965
284	synthetic-d0cfa36d-850e-422a-b7bb-627623d75383@example.invalid	Randria	Soa	18	Homme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Informatique	2026-09-16 16:18:33.965
285	synthetic-04b0a6ef-e049-4883-bb49-7ebc7843c1eb@example.invalid	Razafy	Lova	30	Non renseigné	000000000	Master	En recherche d’emploi	Établissement de test A	Réseaux	2026-09-26 16:18:33.965
286	synthetic-4cf2eb53-75e5-49ba-9bdb-91c0fb3593c4@example.invalid	Rabe	Tahina	31	Femme	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Gestion	2026-07-13 16:18:33.965
287	synthetic-51cec9b8-1640-4900-af4a-f08bfc66670f@example.invalid	Andria	Nomena	40	Homme	000000000	Baccalauréat	Étudiant	Établissement de test B	Communication	2026-06-22 16:18:33.965
288	synthetic-a9f953e8-c8a0-47f3-8c49-4d6e6a89570d@example.invalid	Rasoanaivo	Miora	29	Homme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Informatique	2026-05-22 16:18:33.965
289	synthetic-451ccca8-f851-4049-aff1-ba1f8a8ff5b7@example.invalid	Ramanantsoa	Tahina	35	Homme	000000000	Licence	Salarié	Établissement de test A	Informatique	2026-05-10 16:18:33.965
290	synthetic-56236777-f1dc-48be-93ec-42bad6c08ab4@example.invalid	Ramanantsoa	Tiana	32	Femme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Réseaux	2026-04-29 16:18:33.965
291	synthetic-37079aa4-c8b6-4d76-83aa-308f81249b97@example.invalid	Andria	Tiana	19	Homme	000000000	Baccalauréat	Salarié	Établissement de test A	Réseaux	2026-10-19 16:18:33.965
292	synthetic-f5c13440-5c69-422f-8b66-bbe709c7154f@example.invalid	Andria	Fara	31	Homme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Informatique	2026-05-27 16:18:33.965
293	synthetic-c7b9b018-0c69-4446-a198-a39491bd5a3b@example.invalid	Razafy	Fara	40	Non renseigné	000000000	Licence	Salarié	Centre de formation fictif	Informatique	2026-06-28 16:18:33.965
294	synthetic-7b1bdaaf-8c14-4832-bf23-47fc8c0f60d1@example.invalid	Rabe	Lova	36	Femme	000000000	Baccalauréat	Salarié	Établissement de test B	Marketing	2026-10-11 16:18:33.965
295	synthetic-e9dc6ed4-4e84-442c-baa8-02a29e9dad46@example.invalid	Ramanantsoa	Soa	20	Non renseigné	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Marketing	2026-07-30 16:18:33.965
296	synthetic-d50eaed4-b2db-4506-a945-1ee952f2e30e@example.invalid	Rakoto	Mialy	24	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test A	Réseaux	2026-06-18 16:18:33.965
297	synthetic-c0381485-7275-41e0-95b5-0af32a5ca3f9@example.invalid	Razafy	Fara	21	Femme	000000000	Master	En recherche d’emploi	Établissement de test A	Marketing	2026-09-27 16:18:33.965
298	synthetic-091d2d17-91f3-41a5-9ab6-cc7d2a848726@example.invalid	Razafy	Tiana	40	Non renseigné	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Marketing	2026-05-10 16:18:33.965
299	synthetic-508a7cdc-7286-4d38-b8ea-c88760076ce4@example.invalid	Ramanantsoa	Nomena	29	Non renseigné	000000000	Master	Étudiant	Centre de formation fictif	Marketing	2026-09-16 16:18:33.965
300	synthetic-44c85564-c8c1-4f9b-91f9-7f01d2d5662c@example.invalid	Rakoto	Lova	32	Femme	000000000	Master	En recherche d’emploi	Établissement de test A	Gestion	2026-06-18 16:18:33.965
301	synthetic-047cc6b1-fd35-4063-9e06-97ce3190d999@example.invalid	Razafy	Tiana	38	Femme	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Gestion	2026-10-11 16:18:33.965
302	synthetic-90450c74-9265-4c2d-82bf-436863ba28ad@example.invalid	Razafy	Tahina	39	Non renseigné	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Informatique	2026-06-26 16:18:33.965
303	synthetic-4216d5bd-ad62-44c1-bcd3-bc74caafc7ae@example.invalid	Rasoanaivo	Hery	35	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test B	Réseaux	2026-09-06 16:18:33.965
304	synthetic-0aeefac5-30ab-4783-ae91-9f14bab8883e@example.invalid	Rakoto	Miora	20	Non renseigné	000000000	Licence	En recherche d’emploi	Établissement de test B	Réseaux	2026-09-04 16:18:33.965
305	synthetic-d92880c3-c26a-4508-90e4-0c102c0a46e6@example.invalid	Ramanantsoa	Nomena	21	Homme	000000000	Formation professionnelle	Salarié	Établissement de test B	Gestion	2026-09-06 16:18:33.965
306	synthetic-3087198a-4f11-4525-b643-543a9f0c243c@example.invalid	Randria	Tahina	21	Homme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Gestion	2026-09-04 16:18:33.965
307	synthetic-700429c7-5283-44c3-95b8-8cb8bd0cca7d@example.invalid	Andria	Soa	37	Femme	000000000	Baccalauréat	Salarié	Établissement de test A	Gestion	2026-07-12 16:18:33.965
308	synthetic-32037d5b-2166-4b4d-8230-85771d35a0b3@example.invalid	Rabe	Aina	32	Femme	000000000	Licence	Étudiant	Centre de formation fictif	Marketing	2026-05-25 16:18:33.965
309	synthetic-c958c8d7-5fca-4ae5-8b16-5dd5e2f26caf@example.invalid	Rabe	Soa	18	Non renseigné	000000000	Master	Salarié	Centre de formation fictif	Communication	2026-08-28 16:18:33.965
310	synthetic-688e688f-f18d-44d8-9560-787633f3f592@example.invalid	Rabe	Fara	34	Femme	000000000	Formation professionnelle	En recherche d’emploi	Centre de formation fictif	Gestion	2026-10-19 16:18:33.965
311	synthetic-2d5642a6-61c5-4fcb-a688-ceda33ea91bd@example.invalid	Ramanantsoa	Nomena	26	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Marketing	2026-06-09 16:18:33.965
312	synthetic-d22bb437-a9dc-4aa4-b4bd-895619835dad@example.invalid	Andria	Aina	25	Homme	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Réseaux	2026-10-03 16:18:33.965
313	synthetic-88fd4be1-7ac0-49ff-83ba-3985c52d10e9@example.invalid	Raveloson	Lova	18	Non renseigné	000000000	Baccalauréat	Salarié	Centre de formation fictif	Réseaux	2026-05-10 16:18:33.965
314	synthetic-1a158a57-a574-4077-8a45-2a99c799ee46@example.invalid	Rasoanaivo	Nomena	39	Non renseigné	000000000	Master	En recherche d’emploi	Établissement de test A	Réseaux	2026-06-30 16:18:33.965
315	synthetic-997ec10b-c475-4992-8eb3-d2e147fd3ad9@example.invalid	Rabe	Hery	36	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test A	Communication	2026-08-01 16:18:33.965
316	synthetic-16176632-29d9-48b3-b87c-8f5fb93c1a1f@example.invalid	Raveloson	Lova	39	Non renseigné	000000000	Baccalauréat	Salarié	Centre de formation fictif	Gestion	2026-06-17 16:18:33.965
317	synthetic-f9559664-be98-440f-93e2-ed32dd7f6cf8@example.invalid	Ramanantsoa	Hery	25	Femme	000000000	Baccalauréat	Étudiant	Établissement de test A	Réseaux	2026-09-19 16:18:33.965
318	synthetic-f95016ff-cf36-4d61-b73c-039aed1a32b4@example.invalid	Randria	Mialy	18	Non renseigné	000000000	Master	Salarié	Établissement de test A	Réseaux	2026-09-15 16:18:33.965
319	synthetic-a89fa25a-7184-4b18-ba36-ea1c2939daa5@example.invalid	Randria	Hery	32	Non renseigné	000000000	Baccalauréat	Salarié	Établissement de test B	Réseaux	2026-06-03 16:18:33.965
320	synthetic-f6042572-a457-4808-8d49-d313cf717469@example.invalid	Rasoanaivo	Tahina	39	Homme	000000000	Licence	En recherche d’emploi	Établissement de test A	Communication	2026-06-13 16:18:33.965
321	synthetic-b414ff72-34ba-463c-bd78-49ff7cbf6c0e@example.invalid	Rabe	Miora	20	Non renseigné	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Informatique	2026-08-16 16:18:33.965
322	synthetic-4f537b71-573f-489a-a807-647539e332e1@example.invalid	Razafy	Mialy	39	Non renseigné	000000000	Master	Étudiant	Centre de formation fictif	Communication	2026-07-18 16:18:33.965
323	synthetic-f776f8f0-a345-4153-92cc-b206bd7b88ec@example.invalid	Razafy	Miora	26	Homme	000000000	Master	En recherche d’emploi	Établissement de test B	Gestion	2026-04-27 16:18:33.965
324	synthetic-a90d8c6e-69a9-4b01-a346-716c9a8859c8@example.invalid	Rasoanaivo	Lova	30	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test A	Informatique	2026-09-27 16:18:33.965
325	synthetic-d34a652f-2a65-491f-a5c0-5af35e685df1@example.invalid	Andria	Hery	18	Non renseigné	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Réseaux	2026-06-14 16:18:33.965
326	synthetic-086190f9-8db4-447d-817f-90a8943482a8@example.invalid	Razafy	Soa	20	Homme	000000000	Baccalauréat	Salarié	Établissement de test A	Gestion	2026-05-01 16:18:33.965
327	synthetic-123a6700-e29e-479d-b08e-04297c69462f@example.invalid	Rakoto	Miora	35	Homme	000000000	Master	Étudiant	Centre de formation fictif	Gestion	2026-10-05 16:18:33.965
328	synthetic-10b748b3-977b-4e61-a46a-64373be537ee@example.invalid	Randria	Tiana	32	Homme	000000000	Master	Étudiant	Établissement de test A	Informatique	2026-08-12 16:18:33.965
329	synthetic-129c8755-1e6e-4011-9516-f14ceee66060@example.invalid	Rakoto	Tiana	36	Femme	000000000	Licence	Étudiant	Centre de formation fictif	Communication	2026-05-31 16:18:33.965
330	synthetic-d0b7b67c-477b-4e85-8465-a5b35f85d60c@example.invalid	Rasoanaivo	Soa	39	Homme	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Communication	2026-08-10 16:18:33.965
331	synthetic-be0d2743-fcc7-47bc-a7e3-ce658c727337@example.invalid	Raveloson	Tahina	22	Femme	000000000	Master	Salarié	Établissement de test B	Informatique	2026-06-08 16:18:33.965
332	synthetic-dd5c2a35-e4ed-4f9c-9603-4a272a88812b@example.invalid	Randria	Tiana	36	Homme	000000000	Master	En recherche d’emploi	Établissement de test B	Informatique	2026-08-19 16:18:33.965
333	synthetic-8873005c-652a-4d9b-aedf-8e6379e2335f@example.invalid	Rabe	Lova	29	Non renseigné	000000000	Master	Salarié	Centre de formation fictif	Réseaux	2026-06-27 16:18:33.965
334	synthetic-ea3796f8-2fdc-4aad-9b62-2dbd67ece40e@example.invalid	Razafy	Tiana	31	Homme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Marketing	2026-10-09 16:18:33.965
335	synthetic-1f60ebd6-4ee1-4016-ac3a-4a6360c5ec10@example.invalid	Raveloson	Nomena	36	Homme	000000000	Master	Étudiant	Établissement de test B	Réseaux	2026-10-12 16:19:07.121
336	synthetic-7ace045b-a17b-422c-b1e7-a1a35802df32@example.invalid	Rabe	Mialy	37	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test A	Informatique	2026-06-04 16:19:07.121
337	synthetic-9a2d834f-ef1d-4701-b5ee-b3b2be79f8ea@example.invalid	Raveloson	Nomena	30	Femme	000000000	Formation professionnelle	Salarié	Établissement de test A	Informatique	2026-09-25 16:19:07.121
338	synthetic-937a5cb6-d2b7-494a-b170-e73dfb5c6efd@example.invalid	Randria	Soa	23	Homme	000000000	Master	En recherche d’emploi	Centre de formation fictif	Marketing	2026-05-18 16:19:07.121
339	synthetic-59edf35d-2afd-4797-8dad-69975fdb5a6c@example.invalid	Andria	Miora	30	Homme	000000000	Licence	Étudiant	Centre de formation fictif	Réseaux	2026-07-01 16:19:07.121
340	synthetic-90cc9958-5003-470c-843c-80597e7f6e89@example.invalid	Raveloson	Nomena	21	Femme	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Communication	2026-05-31 16:19:07.121
341	synthetic-90f605eb-e66f-47ce-b845-536e40979f0c@example.invalid	Rabe	Tiana	24	Femme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Gestion	2026-08-23 16:19:07.121
342	synthetic-37857fb4-88df-41b5-8a33-d41fb4f37672@example.invalid	Rabe	Tahina	18	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test A	Gestion	2026-05-18 16:19:07.121
343	synthetic-7eb2628b-4da9-48c1-88e2-a962052b9177@example.invalid	Ramanantsoa	Lova	20	Femme	000000000	Baccalauréat	Étudiant	Établissement de test A	Communication	2026-07-19 16:19:07.121
344	synthetic-a5e6f2d9-c075-4743-978a-b50883154fc7@example.invalid	Rasoanaivo	Miora	29	Femme	000000000	Master	En recherche d’emploi	Établissement de test A	Informatique	2026-05-31 16:19:07.121
345	synthetic-a4bfad7c-6ca9-4aa7-86cf-d8ee08df437d@example.invalid	Andria	Fara	36	Femme	000000000	Licence	Étudiant	Établissement de test B	Marketing	2026-09-11 16:19:07.121
346	synthetic-f4b86291-43f2-49be-ad7a-06079f973559@example.invalid	Andria	Fara	18	Homme	000000000	Licence	Salarié	Centre de formation fictif	Communication	2026-05-02 16:19:07.121
347	synthetic-22c6949b-ee9f-40b2-a42c-95608800d7dd@example.invalid	Rasoanaivo	Miora	19	Femme	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Communication	2026-10-12 16:19:07.121
348	synthetic-8d4f4055-30f3-49c0-bfa1-8b5638e71467@example.invalid	Ramanantsoa	Aina	27	Femme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Réseaux	2026-06-11 16:19:07.121
349	synthetic-1b3a928d-9ac4-4e8b-abe3-a1d297b547cd@example.invalid	Rakoto	Fara	35	Homme	000000000	Baccalauréat	Étudiant	Établissement de test A	Marketing	2026-10-01 16:19:07.121
350	synthetic-5740e330-517d-4154-b0e8-4747fa884900@example.invalid	Rabe	Fara	27	Homme	000000000	Master	Étudiant	Établissement de test B	Réseaux	2026-06-03 16:19:07.121
351	synthetic-810cb4fc-24ff-415a-a56e-52d73ac942bb@example.invalid	Andria	Mialy	40	Non renseigné	000000000	Master	Salarié	Établissement de test A	Informatique	2026-09-16 16:19:07.121
352	synthetic-0f756ebc-bed2-4991-844a-d47237ea9d77@example.invalid	Rabe	Mialy	31	Femme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Informatique	2026-04-26 16:19:07.121
353	synthetic-eca65da0-ff0b-4bf5-a34e-e0f8c9e1a2fa@example.invalid	Rakoto	Lova	35	Femme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Réseaux	2026-06-04 16:19:07.121
354	synthetic-f9f27c6a-858d-4eed-891a-247ec891365a@example.invalid	Randria	Lova	18	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test A	Gestion	2026-05-16 16:19:07.121
355	synthetic-08c3ee02-f8cf-4d9f-a340-1e53e3d7fce0@example.invalid	Raveloson	Fara	34	Non renseigné	000000000	Master	En recherche d’emploi	Centre de formation fictif	Communication	2026-09-07 16:19:07.121
356	synthetic-f8d374fc-acb4-4e1b-b0ce-32e270751291@example.invalid	Randria	Mialy	20	Non renseigné	000000000	Licence	Étudiant	Établissement de test A	Réseaux	2026-09-11 16:19:07.121
357	synthetic-1cb81eb2-fc89-439e-9c7b-d5841f77635d@example.invalid	Raveloson	Miora	21	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test A	Réseaux	2026-09-13 16:19:07.121
358	synthetic-964b1a3a-d6b4-4e91-bb25-18946691ca4f@example.invalid	Raveloson	Nomena	29	Non renseigné	000000000	Master	En recherche d’emploi	Centre de formation fictif	Gestion	2026-10-11 16:19:07.121
359	synthetic-ed7553c2-0ec3-48ff-8f2c-e9dece630fbf@example.invalid	Rabe	Hery	27	Femme	000000000	Formation professionnelle	Salarié	Établissement de test B	Communication	2026-08-14 16:19:07.121
360	synthetic-6be6b7ca-dfb0-4207-9f2c-ad738aa0be17@example.invalid	Raveloson	Miora	34	Non renseigné	000000000	Licence	Salarié	Établissement de test B	Gestion	2026-07-18 16:19:07.121
361	synthetic-3c7d65b6-9ea8-4232-a102-86f20d1be47e@example.invalid	Rasoanaivo	Nomena	31	Femme	000000000	Licence	En recherche d’emploi	Établissement de test B	Réseaux	2026-06-24 16:19:07.121
362	synthetic-40f0bf4c-3819-4133-84b1-de43c93921f5@example.invalid	Raveloson	Tiana	18	Femme	000000000	Master	Étudiant	Centre de formation fictif	Communication	2026-07-30 16:19:07.121
363	synthetic-abeb6949-43eb-4437-b5e3-b2cdf57801af@example.invalid	Randria	Soa	38	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test B	Réseaux	2026-09-02 16:19:07.121
364	synthetic-e39c2ee9-da86-4e1d-beb2-d185e478418e@example.invalid	Rakoto	Tahina	40	Homme	000000000	Master	En recherche d’emploi	Établissement de test B	Gestion	2026-07-11 16:19:07.121
365	synthetic-fbfedb8e-7c6f-47e6-9a08-9f6ef44ac994@example.invalid	Rakoto	Mialy	29	Femme	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Informatique	2026-09-15 16:19:07.121
366	synthetic-8cd5c21f-8b98-4e86-9c43-541709749cc2@example.invalid	Razafy	Soa	39	Femme	000000000	Licence	Étudiant	Centre de formation fictif	Réseaux	2026-06-02 16:19:07.121
367	synthetic-1f5988f6-b4e9-4053-969e-ad6805956552@example.invalid	Rabe	Soa	20	Femme	000000000	Licence	Salarié	Centre de formation fictif	Réseaux	2026-10-08 16:19:07.121
368	synthetic-32680f68-86cf-4304-84c0-b2f7f727d9d8@example.invalid	Rakoto	Mialy	36	Non renseigné	000000000	Master	En recherche d’emploi	Centre de formation fictif	Gestion	2026-09-10 16:19:07.121
369	synthetic-3a1c8da0-b5f5-44ac-b4dd-9890392ed836@example.invalid	Rakoto	Mialy	39	Femme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Gestion	2026-10-21 16:19:07.121
370	synthetic-61da09f2-d7a0-47ea-bbe7-21f8d34efc9b@example.invalid	Rakoto	Tiana	20	Non renseigné	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Informatique	2026-05-31 16:19:07.121
371	synthetic-e84ca446-d428-4be0-90e5-b13ec81dc5a8@example.invalid	Rakoto	Soa	20	Femme	000000000	Baccalauréat	Salarié	Établissement de test B	Marketing	2026-08-23 16:19:07.121
372	synthetic-e7d44245-7012-4230-876b-1464a724e393@example.invalid	Rakoto	Tahina	37	Homme	000000000	Licence	Salarié	Centre de formation fictif	Informatique	2026-04-25 16:19:07.121
373	synthetic-436b8399-96e5-4cd8-a1af-65b8e11bd33c@example.invalid	Rabe	Soa	18	Homme	000000000	Baccalauréat	Étudiant	Établissement de test B	Informatique	2026-04-30 16:19:07.121
374	synthetic-6567395e-cf2a-44f5-a8fc-2ec6644e9e34@example.invalid	Rasoanaivo	Tiana	27	Non renseigné	000000000	Licence	En recherche d’emploi	Établissement de test B	Marketing	2026-06-05 16:19:07.121
375	synthetic-76b38548-7163-4615-b9a6-f27d1f9b1d34@example.invalid	Rabe	Mialy	19	Femme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test B	Informatique	2026-08-24 16:19:07.121
376	synthetic-0f1ce5ef-c948-4855-b246-45c97cdcfbb7@example.invalid	Ramanantsoa	Aina	39	Non renseigné	000000000	Master	Étudiant	Centre de formation fictif	Communication	2026-08-14 16:19:07.121
377	synthetic-429396aa-125c-436d-8b97-f7230da72b37@example.invalid	Razafy	Mialy	23	Non renseigné	000000000	Master	Étudiant	Centre de formation fictif	Informatique	2026-09-23 16:19:07.121
378	synthetic-b17df618-fe92-415e-8b20-1e087f6dac96@example.invalid	Rasoanaivo	Hery	30	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Informatique	2026-08-11 16:19:07.121
379	synthetic-52e4b318-b075-400c-af2d-9747cdfb9c8f@example.invalid	Razafy	Fara	29	Femme	000000000	Baccalauréat	Étudiant	Établissement de test B	Gestion	2026-09-02 16:19:07.121
380	synthetic-de53ac01-4a00-42c4-a6ff-301ced56208d@example.invalid	Ramanantsoa	Aina	32	Femme	000000000	Baccalauréat	Salarié	Établissement de test A	Gestion	2026-04-30 16:19:07.121
381	synthetic-36800a76-c167-48b0-8281-051ae9940495@example.invalid	Randria	Miora	34	Femme	000000000	Licence	Étudiant	Établissement de test A	Communication	2026-08-11 16:19:07.121
382	synthetic-df45351a-fea6-48d9-a1d6-f10076e19900@example.invalid	Ramanantsoa	Mialy	27	Homme	000000000	Baccalauréat	Étudiant	Établissement de test B	Marketing	2026-10-18 16:19:07.121
383	synthetic-f67010c2-54f6-4a97-a4a5-598d026171df@example.invalid	Randria	Soa	29	Homme	000000000	Baccalauréat	Salarié	Établissement de test B	Marketing	2026-07-10 16:19:07.121
384	synthetic-e065e234-bb79-4aac-8c7a-41994448902a@example.invalid	Rakoto	Aina	39	Homme	000000000	Baccalauréat	Étudiant	Établissement de test A	Communication	2026-07-19 16:19:07.121
385	synthetic-b8c9cb2c-1f79-432b-999c-34f7de2a3621@example.invalid	Rabe	Nomena	18	Homme	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Marketing	2026-06-05 16:19:07.121
386	synthetic-0bbb923a-49ed-43b3-acea-b86cb2403c1a@example.invalid	Ramanantsoa	Miora	25	Femme	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Marketing	2026-08-04 16:19:07.121
387	synthetic-070f4ae2-a333-49e4-a9f8-69beed05427f@example.invalid	Andria	Aina	39	Femme	000000000	Master	Étudiant	Établissement de test A	Marketing	2026-10-16 16:19:07.121
388	synthetic-b65f2e9d-8dfe-4700-bbd3-a57db93d5187@example.invalid	Rakoto	Soa	24	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test A	Informatique	2026-09-07 16:19:07.121
389	synthetic-ce4a75ac-37fc-4b79-9b54-8c198d3b28c5@example.invalid	Andria	Miora	39	Non renseigné	000000000	Master	Étudiant	Centre de formation fictif	Réseaux	2026-05-12 16:19:07.121
390	synthetic-6c7e7038-0074-43cc-9694-a17e8bc9ce5c@example.invalid	Rakoto	Lova	32	Homme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Marketing	2026-05-01 16:19:07.121
391	synthetic-e58bae22-1665-4dda-99c3-d9800196fa33@example.invalid	Rasoanaivo	Soa	30	Non renseigné	000000000	Master	En recherche d’emploi	Établissement de test A	Informatique	2026-05-28 16:19:07.121
392	synthetic-714e80ff-b3b8-4f0d-86e9-4278102e2d21@example.invalid	Ramanantsoa	Hery	22	Femme	000000000	Master	En recherche d’emploi	Établissement de test B	Gestion	2026-05-20 16:19:07.121
393	synthetic-83a2f22f-4ce1-44e1-82a1-14aaff73c6f5@example.invalid	Razafy	Hery	24	Femme	000000000	Licence	Salarié	Centre de formation fictif	Informatique	2026-07-22 16:19:07.121
394	synthetic-33c2def4-b405-4b7d-8d3c-d843568c012b@example.invalid	Ramanantsoa	Miora	21	Femme	000000000	Formation professionnelle	Étudiant	Établissement de test A	Gestion	2026-08-28 16:19:07.121
395	synthetic-dc757ceb-612f-40cc-a4d7-df09d66aeba7@example.invalid	Rabe	Mialy	39	Femme	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Communication	2026-08-26 16:19:07.121
396	synthetic-bd3c1d39-3b4d-4713-986f-9b59c07f0cf3@example.invalid	Andria	Lova	34	Femme	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Marketing	2026-06-26 16:19:07.121
397	synthetic-00564551-9e8c-4fb1-acf4-9a44f53120d0@example.invalid	Andria	Hery	34	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Communication	2026-07-05 16:19:07.121
398	synthetic-20d1ddbb-ff72-4524-81be-b29317ce3d9a@example.invalid	Rasoanaivo	Soa	36	Femme	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Réseaux	2026-06-15 16:19:07.121
399	synthetic-ff2b5ae3-02d9-4c87-9884-6821de92f5bc@example.invalid	Rakoto	Soa	35	Non renseigné	000000000	Licence	Salarié	Établissement de test B	Informatique	2026-05-28 16:19:07.121
400	synthetic-5a5ab404-401c-4d2d-8bd0-382e26bbf813@example.invalid	Razafy	Tahina	20	Homme	000000000	Formation professionnelle	Salarié	Établissement de test B	Informatique	2026-08-11 16:19:07.121
401	synthetic-cf867f17-1572-4a2a-a1a7-05e5ff222cf6@example.invalid	Randria	Nomena	38	Homme	000000000	Baccalauréat	Salarié	Établissement de test A	Informatique	2026-06-02 16:19:07.121
402	synthetic-8bd0a950-abda-4756-90a3-a75c0bdd8a14@example.invalid	Rabe	Aina	20	Homme	000000000	Licence	En recherche d’emploi	Établissement de test A	Gestion	2026-05-31 16:19:07.121
403	synthetic-61504f45-89e8-47f3-a5a9-0ba649748e48@example.invalid	Ramanantsoa	Mialy	34	Femme	000000000	Baccalauréat	Étudiant	Établissement de test A	Gestion	2026-07-15 16:19:07.121
404	synthetic-efa2424a-0d00-4768-99d4-2649631d5c92@example.invalid	Randria	Hery	25	Femme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Informatique	2026-07-06 16:19:07.121
405	synthetic-1b28996a-7402-44fd-9840-2e5802b103df@example.invalid	Andria	Soa	25	Femme	000000000	Licence	Salarié	Établissement de test A	Réseaux	2026-08-28 16:19:20.463
406	synthetic-27a966f0-d5ee-43fe-a54a-9339c6f7ecc9@example.invalid	Rasoanaivo	Lova	35	Non renseigné	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Marketing	2026-05-20 16:19:20.463
407	synthetic-a77cfcef-8681-4feb-8ee5-e63ad8836159@example.invalid	Rakoto	Mialy	38	Femme	000000000	Formation professionnelle	En recherche d’emploi	Centre de formation fictif	Informatique	2026-09-20 16:19:20.463
408	synthetic-b4466fc6-bd27-4acb-a78b-e882f9c6720c@example.invalid	Rakoto	Miora	23	Non renseigné	000000000	Master	Salarié	Établissement de test B	Communication	2026-06-01 16:19:20.463
409	synthetic-67729bac-d2bf-4204-8abc-6945316016f5@example.invalid	Andria	Fara	19	Femme	000000000	Master	Étudiant	Établissement de test B	Marketing	2026-05-04 16:19:20.463
410	synthetic-098bfdd1-0b91-40a4-94ce-9f38802ab6e6@example.invalid	Rasoanaivo	Mialy	25	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test A	Informatique	2026-07-18 16:19:20.463
411	synthetic-90756004-4b45-4dfc-b707-a2cb8c6c53c1@example.invalid	Randria	Lova	36	Femme	000000000	Licence	Salarié	Centre de formation fictif	Communication	2026-07-23 16:19:20.463
412	synthetic-c9362a6f-9ca8-40a9-8655-257221167613@example.invalid	Rakoto	Miora	36	Femme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Marketing	2026-06-27 16:19:20.463
413	synthetic-f524b163-2916-4454-b14d-14b120bbb9f2@example.invalid	Rasoanaivo	Aina	27	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Réseaux	2026-08-15 16:19:20.463
414	synthetic-3285e278-a67d-4557-9a3d-24e4902684b1@example.invalid	Ramanantsoa	Tahina	40	Homme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Gestion	2026-04-29 16:19:20.463
415	synthetic-5f518ca1-2a2a-4013-ab63-92042134b6e7@example.invalid	Raveloson	Mialy	38	Femme	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Marketing	2026-06-13 16:19:20.463
416	synthetic-c32c91de-7531-420c-af69-266a99e73c74@example.invalid	Andria	Tiana	29	Homme	000000000	Formation professionnelle	En recherche d’emploi	Centre de formation fictif	Marketing	2026-10-18 16:19:20.463
417	synthetic-bb845778-8117-4116-9baf-ea54fb674288@example.invalid	Randria	Lova	38	Femme	000000000	Master	Étudiant	Centre de formation fictif	Gestion	2026-10-20 16:19:20.463
418	synthetic-89f9c127-4562-4ce1-8551-a3a71b157487@example.invalid	Rakoto	Tahina	22	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test B	Réseaux	2026-05-17 16:19:20.463
419	synthetic-dcc8b19e-95e1-4260-aacb-2a8e25104a24@example.invalid	Andria	Soa	34	Non renseigné	000000000	Licence	Étudiant	Établissement de test B	Marketing	2026-10-13 16:19:20.463
420	synthetic-ee23d326-cf1b-4ffe-8faf-67d8f3283e69@example.invalid	Randria	Tiana	20	Femme	000000000	Master	Étudiant	Établissement de test B	Gestion	2026-08-09 16:19:20.463
421	synthetic-6a9e2a4e-2977-4c3b-a017-ad15276bfc84@example.invalid	Ramanantsoa	Nomena	22	Homme	000000000	Licence	Étudiant	Centre de formation fictif	Informatique	2026-09-06 16:19:20.463
422	synthetic-0b764eb8-4a9e-464c-b736-59ebc8e0719a@example.invalid	Rasoanaivo	Miora	30	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Gestion	2026-08-05 16:19:20.463
423	synthetic-f5008c77-9382-409d-9bd7-4ab1ca3f5fbe@example.invalid	Razafy	Soa	35	Non renseigné	000000000	Licence	Salarié	Centre de formation fictif	Informatique	2026-07-20 16:19:20.463
424	synthetic-26c33563-3cc6-4150-9e69-8dbf179e2542@example.invalid	Andria	Mialy	22	Non renseigné	000000000	Licence	Salarié	Établissement de test A	Marketing	2026-05-22 16:19:20.463
425	synthetic-67d7728b-f598-4437-9748-5f45a3864e74@example.invalid	Rakoto	Aina	33	Femme	000000000	Master	Étudiant	Centre de formation fictif	Marketing	2026-09-10 16:19:47.584
426	synthetic-0b9c6254-c6ac-4e18-a2f6-879c66251dec@example.invalid	Rasoanaivo	Tiana	31	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Réseaux	2026-09-25 16:19:47.584
427	synthetic-8405366e-8aa2-4275-9a40-968aa1c14bc8@example.invalid	Raveloson	Aina	30	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Gestion	2026-07-30 16:19:47.584
428	synthetic-31d77133-7670-4755-92f6-29c2431f686f@example.invalid	Ramanantsoa	Mialy	20	Homme	000000000	Master	Salarié	Établissement de test B	Réseaux	2026-09-13 16:19:47.584
429	synthetic-a626f55d-87cb-419d-af85-b1c4ab728a97@example.invalid	Randria	Miora	39	Femme	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Marketing	2026-07-14 16:19:47.584
430	synthetic-28035a1c-7008-43c4-9d1d-71face76bc37@example.invalid	Rakoto	Nomena	21	Homme	000000000	Baccalauréat	Étudiant	Établissement de test A	Marketing	2026-09-06 16:19:47.584
431	synthetic-05d97dd9-5e8b-4eb8-a4db-5dc4e3fb2e09@example.invalid	Rabe	Tiana	27	Non renseigné	000000000	Master	En recherche d’emploi	Centre de formation fictif	Marketing	2026-07-06 16:19:47.584
432	synthetic-0622dcda-a540-4946-a0c0-2308f302a71c@example.invalid	Razafy	Aina	36	Femme	000000000	Formation professionnelle	Salarié	Établissement de test B	Communication	2026-09-03 16:19:47.584
433	synthetic-917b606d-4bac-4887-a6c9-fd435d824055@example.invalid	Andria	Hery	28	Femme	000000000	Licence	Étudiant	Centre de formation fictif	Réseaux	2026-09-10 16:19:47.584
434	synthetic-244e647f-fdcc-4c6b-abbe-86206bdf5d79@example.invalid	Rakoto	Nomena	24	Non renseigné	000000000	Master	Salarié	Établissement de test B	Gestion	2026-04-27 16:19:47.584
435	synthetic-5c29205b-148c-409b-9af6-f49959f16549@example.invalid	Randria	Soa	26	Homme	000000000	Licence	Salarié	Établissement de test B	Marketing	2026-08-08 16:19:47.584
436	synthetic-1f1b381a-a026-4d63-8125-9e94c588c651@example.invalid	Randria	Nomena	31	Non renseigné	000000000	Licence	Salarié	Établissement de test A	Gestion	2026-10-07 16:19:47.584
437	synthetic-fd75b613-cd00-4920-8250-6ae92233f04b@example.invalid	Rakoto	Aina	38	Non renseigné	000000000	Master	Salarié	Établissement de test B	Gestion	2026-06-28 16:19:47.584
438	synthetic-61861e00-0060-40c5-b8f9-15817163d78a@example.invalid	Andria	Tiana	25	Femme	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Marketing	2026-05-15 16:19:47.584
439	synthetic-df0b3124-73d6-43c6-aae4-e7e6ea89e34e@example.invalid	Razafy	Aina	19	Non renseigné	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Gestion	2026-05-31 16:19:47.584
440	synthetic-d550040f-a9c6-4b4c-83c9-aed5cde469ec@example.invalid	Raveloson	Fara	19	Homme	000000000	Master	Étudiant	Établissement de test B	Réseaux	2026-05-31 16:19:47.584
441	synthetic-7f25e9d3-b8f2-45b9-8bbb-37f41dcb800d@example.invalid	Rabe	Tiana	24	Non renseigné	000000000	Master	Étudiant	Établissement de test A	Marketing	2026-07-29 16:19:47.584
442	synthetic-15d2a1c3-152d-412c-afde-aa4f23b5e10f@example.invalid	Raveloson	Tiana	29	Homme	000000000	Master	Étudiant	Établissement de test A	Communication	2026-07-18 16:19:55.754
443	synthetic-19e12e4c-9601-433b-9987-f86c5ca16289@example.invalid	Raveloson	Fara	31	Homme	000000000	Licence	En recherche d’emploi	Établissement de test B	Communication	2026-10-15 16:19:55.754
444	synthetic-5cc864cb-faf1-473a-b181-c77b3c6927f0@example.invalid	Rabe	Lova	20	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test A	Réseaux	2026-07-03 16:19:55.754
445	synthetic-cbfd2435-68c6-4f54-bf73-1554b72da567@example.invalid	Rakoto	Aina	20	Femme	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Gestion	2026-05-04 16:19:55.754
446	synthetic-0ef4677b-7e52-49d6-946c-cbe73f751e1b@example.invalid	Randria	Tahina	27	Homme	000000000	Master	Étudiant	Établissement de test B	Communication	2026-05-23 16:19:55.754
447	synthetic-5d01f417-2168-4b46-9962-6d23bd191d66@example.invalid	Randria	Aina	20	Femme	000000000	Master	Salarié	Établissement de test B	Gestion	2026-06-17 16:19:55.754
448	synthetic-3ea2caeb-748e-4379-a37d-e857cdf5221a@example.invalid	Raveloson	Tiana	38	Homme	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Marketing	2026-10-14 16:19:55.754
449	synthetic-feb89802-0f5d-4751-85fe-6ec45985d927@example.invalid	Rasoanaivo	Hery	34	Non renseigné	000000000	Master	Étudiant	Établissement de test A	Réseaux	2026-05-09 16:19:55.754
450	synthetic-90a737b8-15fa-4e87-8abe-e12496ffe997@example.invalid	Ramanantsoa	Hery	36	Non renseigné	000000000	Licence	En recherche d’emploi	Centre de formation fictif	Communication	2026-10-15 16:19:55.754
451	synthetic-1f766adb-4ff4-4491-925a-6c73cca0a5c5@example.invalid	Rasoanaivo	Miora	38	Homme	000000000	Licence	Étudiant	Centre de formation fictif	Marketing	2026-07-04 16:19:55.754
452	synthetic-c6c24d01-3e74-494a-8610-e1655f142afe@example.invalid	Rasoanaivo	Nomena	37	Homme	000000000	Licence	Étudiant	Établissement de test B	Réseaux	2026-07-11 16:19:55.754
453	synthetic-49ddb6b0-153d-4410-b93b-930d8a650d7b@example.invalid	Rabe	Tiana	27	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test B	Communication	2026-05-27 16:19:55.754
454	synthetic-088fbd6d-b759-4e62-9d69-094e2d571d3a@example.invalid	Rakoto	Hery	27	Homme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Réseaux	2026-08-23 16:19:55.754
455	synthetic-b3865207-6bc9-4ef6-9ac8-69071c9dcf6e@example.invalid	Rasoanaivo	Fara	21	Femme	000000000	Master	Étudiant	Centre de formation fictif	Marketing	2026-10-13 16:19:55.754
456	synthetic-9d833e4e-280a-4ff0-9fba-40c8963b0bda@example.invalid	Andria	Aina	29	Femme	000000000	Master	En recherche d’emploi	Établissement de test B	Gestion	2026-09-18 16:19:55.754
457	synthetic-ddd99e4b-b9c5-419f-8def-c0e1dd46f613@example.invalid	Rasoanaivo	Soa	29	Non renseigné	000000000	Baccalauréat	Salarié	Établissement de test A	Réseaux	2026-08-10 16:19:55.754
458	synthetic-cb18f7ab-851e-4107-a81c-eef7e22aca46@example.invalid	Rabe	Lova	38	Non renseigné	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Marketing	2026-08-06 16:19:55.754
459	synthetic-099934f6-1dc3-4494-9b5c-b485c153ff8b@example.invalid	Razafy	Hery	39	Femme	000000000	Formation professionnelle	Salarié	Établissement de test B	Communication	2026-09-20 16:19:55.754
460	synthetic-da0c7521-21de-40a9-a6fb-8b3d945e5c46@example.invalid	Randria	Tiana	26	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Communication	2026-05-24 16:19:55.754
461	synthetic-7734fd5f-65ab-4087-a5b4-7b86aaad1133@example.invalid	Raveloson	Nomena	20	Homme	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Réseaux	2026-05-12 16:19:55.754
462	synthetic-420a2d56-2ef2-490a-900b-1f507af4fd02@example.invalid	Rakoto	Nomena	36	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test A	Gestion	2026-06-21 16:19:55.754
463	synthetic-72fe7410-918c-45b2-bfe6-0073ac87ca7c@example.invalid	Randria	Tiana	31	Non renseigné	000000000	Licence	Salarié	Établissement de test B	Réseaux	2026-09-06 16:19:55.754
464	synthetic-5a644783-eec6-4e4b-9657-e0c560d190c6@example.invalid	Andria	Soa	37	Femme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Informatique	2026-05-02 16:19:55.754
465	synthetic-3696575d-364d-424c-9e98-dbf79947e09b@example.invalid	Rasoanaivo	Lova	32	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test A	Gestion	2026-09-23 16:19:55.754
466	synthetic-eca49c55-85a7-49dc-91b3-c8f4e49fe0d9@example.invalid	Rakoto	Tahina	23	Femme	000000000	Licence	En recherche d’emploi	Établissement de test A	Gestion	2026-05-12 16:19:55.754
467	synthetic-add2181c-caf8-4695-bf1b-0a85b8cc3a5e@example.invalid	Razafy	Aina	39	Homme	000000000	Master	En recherche d’emploi	Établissement de test A	Informatique	2026-08-14 16:19:55.754
468	synthetic-8688a950-8f5a-4fb0-ac84-e29d84319677@example.invalid	Andria	Hery	18	Femme	000000000	Master	Salarié	Établissement de test A	Communication	2026-09-19 16:19:55.754
469	synthetic-581edd58-2574-4ea4-b01d-34121a2774fc@example.invalid	Ramanantsoa	Hery	27	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Informatique	2026-08-08 16:19:55.754
470	synthetic-bf6e9741-bb3d-40c9-8ca8-1ca7c1313745@example.invalid	Raveloson	Mialy	36	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Communication	2026-06-02 16:19:55.754
471	synthetic-dca99d0f-81d3-4c7b-be80-683779902f47@example.invalid	Rabe	Nomena	26	Femme	000000000	Master	Étudiant	Établissement de test B	Marketing	2026-10-06 16:19:55.754
472	synthetic-6a50041e-969e-4438-bbb8-a40ff13f3718@example.invalid	Rasoanaivo	Hery	23	Homme	000000000	Licence	En recherche d’emploi	Établissement de test B	Marketing	2026-06-21 16:19:55.754
473	synthetic-85a6ebc9-02ee-46ab-8a2c-f27e748d88a4@example.invalid	Razafy	Tahina	31	Homme	000000000	Master	En recherche d’emploi	Établissement de test B	Informatique	2026-05-16 16:19:55.754
474	synthetic-5989a58c-432a-47b4-a93f-f024055018e9@example.invalid	Andria	Nomena	23	Homme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Communication	2026-06-26 16:19:55.754
475	synthetic-1958dbe0-d9ea-41fe-8388-04be04ae6416@example.invalid	Rasoanaivo	Fara	22	Non renseigné	000000000	Baccalauréat	Salarié	Centre de formation fictif	Gestion	2026-05-08 16:19:55.754
476	synthetic-f33c5010-4bfb-4857-a75d-ce4b34c19b22@example.invalid	Andria	Hery	34	Homme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Communication	2026-05-01 16:19:55.754
477	synthetic-ab964f0c-79a4-4e6d-bd73-86612b0e63af@example.invalid	Randria	Miora	36	Femme	000000000	Master	Étudiant	Établissement de test A	Informatique	2026-06-05 16:19:55.754
478	synthetic-76e1fe9d-0a64-4e20-8e15-70c912a2f329@example.invalid	Randria	Mialy	39	Non renseigné	000000000	Formation professionnelle	Salarié	Établissement de test B	Informatique	2026-05-16 16:19:55.754
479	synthetic-80114a47-b2bd-4365-9ddf-700c89cb3836@example.invalid	Rakoto	Lova	35	Homme	000000000	Baccalauréat	Étudiant	Établissement de test A	Gestion	2026-07-29 16:19:55.754
480	synthetic-679ed734-5a81-4915-bf53-824c0e83e217@example.invalid	Andria	Mialy	19	Non renseigné	000000000	Formation professionnelle	Salarié	Établissement de test A	Gestion	2026-09-25 16:19:55.754
481	synthetic-0b810357-31f5-461f-a1b2-daeb0b434f93@example.invalid	Rabe	Soa	33	Homme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Marketing	2026-06-07 16:19:55.754
482	synthetic-dfe10615-4965-4c7f-be0a-31541d491041@example.invalid	Rakoto	Miora	39	Homme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Réseaux	2026-05-13 16:19:55.754
483	synthetic-ecdaef8e-01af-4b8d-9017-b52162cabcd0@example.invalid	Andria	Aina	21	Femme	000000000	Master	Salarié	Établissement de test B	Gestion	2026-10-19 16:19:55.754
484	synthetic-8bc09a80-998f-4ae6-997d-e88e1aed9d06@example.invalid	Raveloson	Nomena	30	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Gestion	2026-05-31 16:19:55.754
485	synthetic-2b524cca-1796-41e0-be5f-3e8c9a38363c@example.invalid	Randria	Hery	20	Femme	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Communication	2026-08-10 16:19:55.754
486	synthetic-0fccea00-b29e-4a1a-a4cc-8387e2ed4b8e@example.invalid	Rabe	Miora	32	Homme	000000000	Master	Salarié	Établissement de test A	Marketing	2026-08-21 16:19:55.754
487	synthetic-24bdc4d3-f2d3-427c-a229-049632635fe8@example.invalid	Rabe	Hery	29	Homme	000000000	Master	Salarié	Établissement de test B	Marketing	2026-09-29 16:19:55.754
488	synthetic-d1d2d845-ecab-4eb1-9c50-eff5cc67edc9@example.invalid	Andria	Fara	38	Femme	000000000	Licence	Salarié	Établissement de test A	Gestion	2026-09-02 16:19:55.754
489	synthetic-4c84046e-e1a3-4568-b095-1231c5814a6f@example.invalid	Razafy	Mialy	28	Non renseigné	000000000	Formation professionnelle	Étudiant	Établissement de test B	Marketing	2026-05-27 16:19:55.754
490	synthetic-05e3fe76-6925-4bef-9323-f9b55c86c90c@example.invalid	Rakoto	Miora	20	Homme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test B	Gestion	2026-05-12 16:19:55.754
491	synthetic-34d6ac08-f7fa-46f9-bcab-73d321edda86@example.invalid	Razafy	Miora	25	Homme	000000000	Licence	En recherche d’emploi	Établissement de test A	Informatique	2026-04-26 16:19:55.754
492	synthetic-23a7ee57-d308-4304-80c1-a87c763281f9@example.invalid	Rabe	Mialy	18	Homme	000000000	Master	En recherche d’emploi	Établissement de test B	Marketing	2026-05-07 16:19:55.754
493	synthetic-42c326d8-0c64-46f2-9f20-b4e43612e387@example.invalid	Rabe	Tiana	20	Femme	000000000	Formation professionnelle	Salarié	Établissement de test B	Marketing	2026-09-09 16:19:55.754
494	synthetic-c88882ca-0a3f-4f82-9d05-d3cc6a54f77f@example.invalid	Raveloson	Tahina	31	Non renseigné	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Réseaux	2026-05-25 16:19:55.754
495	synthetic-de0fe80a-24e5-44a7-9fe3-b6a3e8b2a76f@example.invalid	Razafy	Tiana	19	Femme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Informatique	2026-06-22 16:19:55.754
496	synthetic-1967ca72-1aa5-44dc-9637-7fa8275a38b3@example.invalid	Razafy	Aina	20	Homme	000000000	Licence	En recherche d’emploi	Établissement de test B	Communication	2026-04-28 16:19:55.754
497	synthetic-c308138f-1a6c-47e1-a6e7-144033eec105@example.invalid	Raveloson	Nomena	28	Non renseigné	000000000	Master	Salarié	Centre de formation fictif	Communication	2026-06-13 16:19:55.754
498	synthetic-d3efd266-ec27-45fe-9495-bb3793449c7b@example.invalid	Ramanantsoa	Tiana	40	Femme	000000000	Baccalauréat	Étudiant	Centre de formation fictif	Réseaux	2026-08-12 16:20:00.678
499	synthetic-d2ba4870-4628-44c0-906e-99685ba2731a@example.invalid	Rabe	Nomena	35	Non renseigné	000000000	Licence	Étudiant	Établissement de test B	Gestion	2026-06-30 16:20:00.678
500	synthetic-15d5c6c3-cedd-492d-bd6d-d7f3a72e418f@example.invalid	Andria	Tahina	18	Femme	000000000	Master	En recherche d’emploi	Centre de formation fictif	Réseaux	2026-08-22 16:20:00.678
501	synthetic-4c48b103-09e6-46e0-ae9c-8d406e4b3209@example.invalid	Rakoto	Nomena	26	Femme	000000000	Licence	Salarié	Établissement de test B	Communication	2026-09-26 16:20:00.678
502	synthetic-496385d6-eaa6-49dc-b92c-9e13574bf72d@example.invalid	Ramanantsoa	Aina	23	Femme	000000000	Licence	Salarié	Établissement de test B	Informatique	2026-08-21 16:20:00.678
503	synthetic-af82aa9c-501a-4006-b8f2-e3fa95fb8fea@example.invalid	Razafy	Nomena	27	Femme	000000000	Master	Étudiant	Centre de formation fictif	Communication	2026-09-06 16:20:00.678
504	synthetic-9f51caf9-f9b7-427c-ae74-1b56a06364bb@example.invalid	Rakoto	Tiana	33	Femme	000000000	Master	En recherche d’emploi	Centre de formation fictif	Informatique	2026-10-08 16:20:00.678
505	synthetic-22615968-ef10-4bd4-8523-c17bf6fd3948@example.invalid	Ramanantsoa	Fara	33	Femme	000000000	Licence	Salarié	Établissement de test A	Gestion	2026-09-06 16:20:00.678
506	synthetic-6f6a9c69-f5cb-42ab-b9b6-95271a3e33d5@example.invalid	Andria	Tiana	21	Femme	000000000	Licence	Salarié	Centre de formation fictif	Marketing	2026-09-03 16:20:00.678
507	synthetic-39358145-30e2-4bc8-b8ad-3d1b483e2a2f@example.invalid	Randria	Tahina	19	Femme	000000000	Licence	Étudiant	Établissement de test A	Réseaux	2026-10-02 16:20:00.678
508	synthetic-8ad40020-d710-4c64-ad97-3b785869b6f8@example.invalid	Rasoanaivo	Hery	19	Homme	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Communication	2026-06-07 16:20:00.678
509	synthetic-ebded4d0-b810-4ca5-bf0d-ac952b8db6a5@example.invalid	Rabe	Tiana	21	Non renseigné	000000000	Baccalauréat	Étudiant	Établissement de test B	Gestion	2026-07-30 16:20:00.678
510	synthetic-2cac7f8d-3132-414d-8213-f12af9194b16@example.invalid	Rakoto	Soa	29	Homme	000000000	Formation professionnelle	Salarié	Établissement de test B	Communication	2026-05-04 16:20:00.678
511	synthetic-74e70606-c913-4256-aa3d-c90388c9cd85@example.invalid	Rasoanaivo	Tahina	37	Homme	000000000	Master	Étudiant	Centre de formation fictif	Gestion	2026-07-08 16:20:00.678
512	synthetic-f5eca236-ba59-4b58-9b0b-d2f5c319dd81@example.invalid	Andria	Soa	25	Femme	000000000	Licence	Salarié	Établissement de test B	Communication	2026-09-22 16:20:00.678
513	synthetic-005772f1-c8de-4d0d-a7fb-514b0cdcb05a@example.invalid	Randria	Lova	19	Femme	000000000	Master	Salarié	Établissement de test B	Marketing	2026-05-14 16:20:00.678
514	synthetic-de018324-8441-4ec3-aa78-29e4066fec9a@example.invalid	Rasoanaivo	Soa	18	Homme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Marketing	2026-05-01 16:20:00.678
515	synthetic-f82853b4-62d7-458f-8d59-fbb0204837c2@example.invalid	Ramanantsoa	Nomena	40	Homme	000000000	Baccalauréat	Étudiant	Établissement de test B	Réseaux	2026-07-25 16:20:00.678
516	synthetic-d8141bd0-3331-4608-abdc-bb401f85ac4d@example.invalid	Ramanantsoa	Fara	40	Femme	000000000	Formation professionnelle	Étudiant	Centre de formation fictif	Marketing	2026-10-08 16:20:00.678
517	synthetic-bbe667a7-7335-4dfe-a060-156345ab9b8f@example.invalid	Andria	Tahina	20	Homme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Informatique	2026-08-29 16:20:00.678
518	synthetic-13e119b2-d522-407f-ad35-b19397b5fc3c@example.invalid	Rakoto	Tiana	39	Homme	000000000	Master	Étudiant	Établissement de test A	Informatique	2026-09-19 16:20:00.678
519	synthetic-2feba66c-8583-49b4-a4c3-1fae5ecec1fb@example.invalid	Andria	Hery	18	Non renseigné	000000000	Master	Étudiant	Établissement de test A	Marketing	2026-04-28 16:20:00.678
520	synthetic-ece50be8-9e35-4e68-a2be-5fbb9cff82fb@example.invalid	Rabe	Hery	27	Homme	000000000	Baccalauréat	Étudiant	Établissement de test B	Informatique	2026-07-22 16:20:00.678
521	synthetic-706adb1f-68a6-4151-b081-fdd07413f227@example.invalid	Andria	Tahina	27	Femme	000000000	Master	Étudiant	Établissement de test A	Marketing	2026-05-09 16:20:00.678
522	synthetic-759b10b5-3935-4dcd-958f-730b83d3532a@example.invalid	Ramanantsoa	Soa	22	Homme	000000000	Formation professionnelle	En recherche d’emploi	Centre de formation fictif	Informatique	2026-05-25 16:20:00.678
523	synthetic-06876291-6229-42e2-a22c-b747e58d1d82@example.invalid	Razafy	Aina	25	Femme	000000000	Licence	Étudiant	Établissement de test B	Réseaux	2026-07-15 16:20:00.678
524	synthetic-68dbdd07-1f72-419e-ae47-a1ab92b542ad@example.invalid	Randria	Mialy	29	Homme	000000000	Formation professionnelle	Salarié	Établissement de test B	Gestion	2026-09-04 16:20:00.678
525	synthetic-1fa3478e-f963-465e-be26-a04c74c262f0@example.invalid	Rabe	Miora	34	Femme	000000000	Baccalauréat	Étudiant	Établissement de test B	Informatique	2026-06-08 16:20:00.678
526	synthetic-eea0ad06-c16b-45ea-8081-82b2ff5022d1@example.invalid	Ramanantsoa	Mialy	19	Non renseigné	000000000	Baccalauréat	Salarié	Centre de formation fictif	Gestion	2026-10-13 16:20:00.678
527	synthetic-e39d1138-87d7-4553-8168-230a313777de@example.invalid	Rabe	Fara	19	Femme	000000000	Master	Étudiant	Établissement de test A	Marketing	2026-05-31 16:20:00.678
528	synthetic-4f163f01-ac0c-4b73-9b12-92a1a2a5f91b@example.invalid	Raveloson	Hery	32	Non renseigné	000000000	Licence	En recherche d’emploi	Établissement de test A	Marketing	2026-08-28 16:20:00.678
529	synthetic-40d2cdbd-1971-4ce2-a1bd-1fb8431232c1@example.invalid	Randria	Hery	26	Non renseigné	000000000	Licence	Étudiant	Centre de formation fictif	Gestion	2026-05-21 16:20:00.678
530	synthetic-370240ee-6276-4022-ac28-52f5b2b72f99@example.invalid	Rakoto	Tiana	20	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Gestion	2026-05-23 16:20:00.678
531	synthetic-094bbf26-360c-4ddd-85fb-2fef1e8f075a@example.invalid	Rakoto	Tahina	29	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Marketing	2026-06-30 16:20:00.678
532	synthetic-a039d1c8-eb5b-4fa5-9eb8-940b5b0b3871@example.invalid	Rakoto	Aina	38	Non renseigné	000000000	Licence	Salarié	Établissement de test A	Réseaux	2026-09-08 16:20:00.678
533	synthetic-e7df9d25-8ca0-40fa-b43c-2202870a159f@example.invalid	Rakoto	Tiana	26	Femme	000000000	Formation professionnelle	Salarié	Établissement de test B	Marketing	2026-07-23 16:20:00.678
534	synthetic-1720262e-629b-4363-8dc4-2acb072d4d48@example.invalid	Razafy	Tiana	34	Femme	000000000	Formation professionnelle	Étudiant	Établissement de test B	Gestion	2026-06-06 16:20:00.678
535	synthetic-f1e1f7d4-f553-4848-b0ea-17b399a65e9c@example.invalid	Rabe	Aina	18	Homme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test A	Gestion	2026-04-26 16:20:00.678
536	synthetic-141b8a58-68e0-408f-bfcb-eaa310bc1690@example.invalid	Rabe	Tahina	35	Femme	000000000	Master	Étudiant	Centre de formation fictif	Communication	2026-08-24 16:20:00.678
537	synthetic-ab56523b-5ffe-4ae3-be64-c83f4c99f4e6@example.invalid	Rabe	Lova	34	Homme	000000000	Formation professionnelle	Étudiant	Établissement de test A	Marketing	2026-06-12 16:20:00.678
538	synthetic-37646acc-b865-4448-b213-ee122898c8eb@example.invalid	Rabe	Tahina	39	Non renseigné	000000000	Formation professionnelle	Salarié	Établissement de test B	Communication	2026-05-21 16:20:00.678
539	synthetic-e5969945-1152-4ad9-a29e-4cc229c881d1@example.invalid	Ramanantsoa	Aina	18	Homme	000000000	Licence	Salarié	Établissement de test B	Réseaux	2026-07-27 16:20:00.678
540	synthetic-6e9bd7b6-61f8-4872-b09a-a19304e8d4e2@example.invalid	Razafy	Miora	32	Homme	000000000	Baccalauréat	Salarié	Établissement de test A	Communication	2026-05-07 16:20:00.678
541	synthetic-eed26d9d-b517-4f33-8f77-42358e89b231@example.invalid	Randria	Lova	39	Non renseigné	000000000	Master	Salarié	Établissement de test A	Gestion	2026-06-26 16:20:00.678
542	synthetic-e3ac2254-83e1-4216-9bda-13735ecc4f85@example.invalid	Razafy	Mialy	19	Non renseigné	000000000	Formation professionnelle	Salarié	Établissement de test B	Gestion	2026-06-18 16:20:00.678
543	synthetic-3b1816e9-5787-4eca-b010-0163e4bcaa2f@example.invalid	Razafy	Miora	24	Homme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Communication	2026-06-19 16:20:00.678
544	synthetic-80c2e36a-2e0b-4633-952d-4ac69abc0348@example.invalid	Rabe	Nomena	21	Non renseigné	000000000	Master	En recherche d’emploi	Centre de formation fictif	Marketing	2026-07-26 16:20:00.678
545	synthetic-4ed15c15-0953-4587-824d-0e3b7cb65f92@example.invalid	Rasoanaivo	Hery	35	Non renseigné	000000000	Master	Étudiant	Établissement de test A	Réseaux	2026-09-07 16:20:00.678
546	synthetic-86487077-4677-4c5d-87f5-0c218d382220@example.invalid	Ramanantsoa	Aina	28	Homme	000000000	Licence	En recherche d’emploi	Établissement de test B	Communication	2026-09-10 16:20:00.678
547	synthetic-3df28626-856d-423f-9e84-88db9a4d3bec@example.invalid	Ramanantsoa	Hery	33	Femme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test B	Gestion	2026-07-25 16:20:00.678
548	synthetic-3a0ba44e-6021-495e-b915-dd0d3072cff9@example.invalid	Rasoanaivo	Hery	18	Non renseigné	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test B	Gestion	2026-07-09 16:20:00.678
549	synthetic-3696e799-81f7-44fb-94fb-94978c5dc3db@example.invalid	Andria	Mialy	22	Femme	000000000	Baccalauréat	Salarié	Établissement de test A	Marketing	2026-04-25 16:20:00.678
550	synthetic-236e05dc-88da-498a-9717-f043b4a3c10c@example.invalid	Rasoanaivo	Tiana	31	Non renseigné	000000000	Licence	Étudiant	Centre de formation fictif	Informatique	2026-05-01 16:20:00.678
551	synthetic-097f73f3-15aa-4b77-b5c7-aafe6e6b031b@example.invalid	Randria	Fara	30	Homme	000000000	Baccalauréat	Salarié	Établissement de test B	Communication	2026-06-27 16:20:00.678
552	synthetic-e7c63725-6ee7-49e2-a2ba-90d6a3a8f382@example.invalid	Rasoanaivo	Soa	29	Homme	000000000	Formation professionnelle	Salarié	Établissement de test A	Informatique	2026-05-16 16:20:00.678
553	synthetic-d0e6aa6f-07f6-478d-9967-c61ea0a79a65@example.invalid	Rasoanaivo	Soa	21	Homme	000000000	Master	Salarié	Établissement de test B	Réseaux	2026-05-15 16:20:00.678
554	synthetic-1d16d802-7db4-4a30-90d3-25d178141f1c@example.invalid	Raveloson	Hery	21	Femme	000000000	Formation professionnelle	Salarié	Centre de formation fictif	Marketing	2026-06-26 16:20:16.281
555	synthetic-ac2a841c-d77c-4abf-971a-e1f620f6d0c3@example.invalid	Rabe	Fara	29	Non renseigné	000000000	Licence	Étudiant	Établissement de test A	Gestion	2026-10-14 16:20:16.281
556	synthetic-014650ec-61b1-4c09-969c-fc54f409860b@example.invalid	Andria	Nomena	25	Homme	000000000	Licence	Salarié	Établissement de test B	Informatique	2026-08-30 16:20:16.281
557	synthetic-c98bcc06-2800-4f75-8554-8db91d8529d7@example.invalid	Raveloson	Tiana	35	Femme	000000000	Licence	Étudiant	Établissement de test A	Réseaux	2026-08-09 16:20:16.281
558	synthetic-ca56c202-565f-4c55-a620-d77324fc87ef@example.invalid	Rasoanaivo	Aina	18	Non renseigné	000000000	Master	Étudiant	Établissement de test A	Communication	2026-07-26 16:20:16.281
559	synthetic-52a56f9a-39cd-4a3e-8e2a-f29fc030773c@example.invalid	Raveloson	Tiana	22	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Centre de formation fictif	Communication	2026-08-26 16:20:16.281
560	synthetic-b26c1f0f-b241-45dc-9654-4e63d568193b@example.invalid	Rakoto	Tiana	26	Femme	000000000	Baccalauréat	Étudiant	Établissement de test A	Communication	2026-07-17 16:20:16.281
561	synthetic-67a9aa38-a1d0-4885-90dd-8d1c105a1cbd@example.invalid	Rabe	Hery	35	Non renseigné	000000000	Baccalauréat	En recherche d’emploi	Établissement de test B	Informatique	2026-08-06 16:20:16.281
562	synthetic-cda415aa-7de0-4e41-864b-1e981fa7e3fe@example.invalid	Raveloson	Tiana	31	Femme	000000000	Baccalauréat	Étudiant	Établissement de test A	Informatique	2026-05-17 16:20:16.281
563	synthetic-5afb091c-cb91-4654-9b19-c64de0051a9b@example.invalid	Razafy	Aina	32	Homme	000000000	Baccalauréat	Étudiant	Établissement de test A	Marketing	2026-07-05 16:20:16.281
564	synthetic-2d7a8798-8448-431d-85d3-4b0f3b8ba021@example.invalid	Razafy	Fara	33	Homme	000000000	Baccalauréat	Étudiant	Établissement de test A	Réseaux	2026-07-19 16:20:16.281
565	synthetic-2f9e3084-b592-4fe8-8eb9-d2558076663e@example.invalid	Randria	Mialy	25	Homme	000000000	Baccalauréat	Étudiant	Établissement de test B	Communication	2026-07-26 16:20:16.281
566	synthetic-623764aa-8167-47b8-a4fb-78bfbecbf33c@example.invalid	Andria	Nomena	40	Homme	000000000	Licence	En recherche d’emploi	Établissement de test B	Communication	2026-05-12 16:20:16.281
567	synthetic-3b878011-75a6-497e-9430-d1c285e3bbd9@example.invalid	Rasoanaivo	Tiana	34	Femme	000000000	Baccalauréat	En recherche d’emploi	Établissement de test A	Marketing	2026-05-18 16:20:16.281
568	synthetic-42c8a685-7707-4d7a-a32c-cde41b6265af@example.invalid	Andria	Lova	26	Femme	000000000	Licence	Étudiant	Établissement de test A	Réseaux	2026-09-26 16:20:16.281
569	synthetic-a51c3d63-c3c5-47bf-ba7b-ca2c32a1cb6f@example.invalid	Rabe	Mialy	27	Femme	000000000	Formation professionnelle	En recherche d’emploi	Établissement de test B	Marketing	2026-05-26 16:20:16.281
570	synthetic-bfd2ede6-ec29-4493-a61e-c17a1915d68b@example.invalid	Raveloson	Hery	38	Femme	000000000	Baccalauréat	Salarié	Centre de formation fictif	Communication	2026-08-04 16:20:16.281
571	synthetic-6c8993fb-6f18-4d86-b66a-36732381dd2a@example.invalid	Rabe	Lova	28	Femme	000000000	Master	En recherche d’emploi	Établissement de test A	Marketing	2026-07-16 16:20:16.281
572	synthetic-bce01b8d-fdda-46e8-9277-23dc1b8bbe8a@example.invalid	Rasoanaivo	Aina	34	Non renseigné	000000000	Licence	Étudiant	Établissement de test A	Marketing	2026-10-12 16:20:16.281
573	synthetic-e78ca55e-a04f-42fa-9636-169778b68dc9@example.invalid	Rabe	Mialy	37	Femme	000000000	Licence	Étudiant	Établissement de test A	Communication	2026-08-23 16:20:16.281
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
1	3	3	1	\N	Travaux pratiques	15.00	2026-10-12	tres bien joué
2	54	11	2	\N	Travaux pratiques	11.00	2026-10-21	\N
3	54	11	2	\N	Travaux pratiques	2.00	2026-10-21	\N
4	54	11	2	\N	Travaux pratiques	12.00	2026-10-21	\N
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
34	13	ca va bien	f	1
35	13	poffffff	t	2
36	14	Mort de rire	t	1
37	14	mon doux roudodo	f	2
38	15	uzumaki	f	1
39	15	uchiha	f	2
40	15	hatake	t	3
41	16	sasuke	f	1
42	16	naruto	t	2
43	16	lee	f	3
44	17	fgd	t	1
45	17	gfd	f	2
46	17	gfd	f	3
47	18	gfd	f	1
48	18	fgd	t	2
49	19	cjv	t	1
50	19	da	f	2
51	20	asdsa	t	1
52	20	adsa	f	2
53	21	blade	f	1
54	21	rakoto	t	2
55	22	10	f	1
56	22	12	t	2
57	22	3	f	3
58	23	ad	t	1
59	23	ad	f	2
60	24	ef	t	1
61	24	ad	f	2
62	25	perso d'anime	t	1
63	25	un ecrivain	f	2
64	26	une psychopathe sociopate	f	1
65	26	une waifu incroyable	t	2
66	27	kakashi	f	1
67	27	naruto	t	2
68	27	jiraya	f	3
69	27	sasuke	f	4
70	28	Abraham	f	1
71	28	Jean paul	t	2
72	28	Cristiano	f	3
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
13	3	1	comment ca va ?	5.00	2026-10-07 08:36:43.111953
14	3	2	mdr	5.00	2026-10-07 08:37:11.132037
15	3	3	nom de famille de kakashi	5.00	2026-10-07 08:38:11.857464
16	3	4	qui est le pere de boruto	5.00	2026-10-07 08:38:43.095461
17	4	1	gfxhchg	5.00	2026-10-12 08:06:32.550241
18	4	2	fgdhgdf	5.00	2026-10-12 08:06:43.396717
19	4	3	gfdhg	5.00	2026-10-12 08:06:51.825618
20	4	4	dadsad	5.00	2026-10-12 08:06:58.046246
21	5	1	iza i nyandry	5.00	2026-10-14 08:17:53.417697
22	5	2	amifiry zao	5.00	2026-10-14 08:18:19.87573
23	5	3	dodo	5.00	2026-10-14 08:18:39.43493
24	5	4	fs	5.00	2026-10-14 08:18:49.78274
25	6	1	qui est denji ?	5.00	2026-10-21 12:00:53.646299
26	6	2	qui est makima	5.00	2026-10-21 12:01:42.851393
27	6	3	qui est le père de boruto ?	5.00	2026-10-21 12:02:40.613038
28	6	4	comment s'appele le fils du père d'abraham ?	5.00	2026-10-21 12:03:32.272027
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
9	3	1	1	0.00
10	3	2	3	5.00
11	3	3	6	2.00
12	3	4	7	2.00
13	3	5	10	3.00
14	3	6	12	2.00
15	3	7	16	1.00
16	4	13	35	5.00
17	4	14	37	0.00
18	4	15	40	5.00
19	4	16	42	5.00
20	5	1	2	5.00
21	5	2	3	5.00
22	5	3	6	2.00
23	5	5	10	3.00
24	5	4	8	0.00
25	5	6	13	0.00
26	5	7	14	0.00
27	6	17	46	0.00
28	6	18	48	5.00
29	6	19	49	5.00
30	6	20	52	0.00
31	7	21	53	0.00
32	7	22	56	5.00
33	7	23	58	5.00
34	7	24	61	0.00
35	8	21	54	5.00
36	8	22	55	0.00
37	8	24	60	5.00
38	9	17	44	5.00
39	9	18	47	0.00
40	9	19	50	0.00
41	9	20	52	0.00
42	10	25	62	5.00
43	10	26	65	5.00
44	10	27	67	5.00
45	10	28	70	0.00
\.


--
-- Data for Name: evaluation_sujet; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluation_sujet (id_evaluation_sujet, id_formation, id_formateur, titre, description, duree_minutes, obligatoire, statut, total_points, date_creation, date_modification, date_publication) FROM stdin;
2	3	1	Q	Quiz Bleach	20	t	PUBLIEE	20.00	2026-10-01 15:15:27.008985	2026-10-01 15:24:24.528683	2026-10-01 15:24:24.528683
1	1	1	exam	bla	20	t	PUBLIEE	20.00	2026-09-19 07:50:04.889609	2026-10-07 08:31:04.359483	2026-10-07 08:31:04.359483
3	3	1	question au piff	bla bla	2	t	PUBLIEE	20.00	2026-10-07 08:36:05.756265	2026-10-07 08:39:04.671957	2026-10-07 08:39:04.671957
4	1	1	fc	\N	10	t	PUBLIEE	20.00	2026-10-12 08:06:07.625201	2026-10-12 08:09:07.156098	2026-10-12 08:09:07.156098
5	1	1	EXAM 2	bla bla	1	t	PUBLIEE	20.00	2026-10-14 08:17:21.235841	2026-10-14 08:20:07.060289	2026-10-14 08:20:07.060289
6	1	1	miam	\N	2	t	PUBLIEE	20.00	2026-10-20 05:25:28.76247	2026-10-21 12:05:09.569456	2026-10-21 12:05:09.569456
\.


--
-- Data for Name: evaluation_tentative; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluation_tentative (id_tentative, id_evaluation_sujet, id_apprenant, date_debut, date_fin, note, statut) FROM stdin;
1	2	3	2026-10-01 16:40:25.189662	2026-10-01 16:40:44.960525	7.00	TERMINEE
2	2	3	2026-10-02 06:09:24.840535	2026-10-02 06:09:46.783371	20.00	TERMINEE
3	1	2	2026-10-07 08:32:17.566196	2026-10-07 08:34:27.825069	15.00	TERMINEE
4	3	3	2026-10-07 08:39:51.392889	2026-10-07 08:41:51.392	15.00	TERMINEE
5	1	3	2026-10-07 08:42:07.023061	2026-10-07 08:42:26.988505	15.00	TERMINEE
6	4	3	2026-10-12 08:10:29.521859	2026-10-12 08:10:39.596064	10.00	TERMINEE
7	5	3	2026-10-14 08:20:12.558718	2026-10-14 08:21:12.558	10.00	TERMINEE
8	5	2	2026-10-16 08:15:20.964729	2026-10-16 08:15:26.57848	10.00	TERMINEE
9	4	2	2026-10-21 11:57:45.105451	2026-10-21 11:57:53.158256	5.00	TERMINEE
10	6	2	2026-10-21 12:05:14.863837	2026-10-21 12:05:28.14658	15.00	TERMINEE
\.


--
-- Data for Name: formateur; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formateur (id_formateur, id_utilisateur, specialite, biographie, date_creation) FROM stdin;
1	3	psychologie 	\N	2026-09-19 07:38:34.017289
2	7	N'import quoi	\N	2026-10-21 12:11:36.449635
\.


--
-- Data for Name: formation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formation (id_formation, titre, description, image_url, date_debut, date_fin, date_limite_inscription, capacite_max, statut, date_creation, date_modification) FROM stdin;
11	Devenir un Leader d'Impact	formation sur le leadership	/uploads/formations/37785536d924444c9894d52366da750a.jpg	2026-11-21	2026-11-24	2026-11-18	15	OUVERTE	2026-10-12 07:33:03.164727	2026-10-21 14:27:40.421478
10	Reseaux nouvelle generation	automatiser, programmer et securisez vos infrastructures	/uploads/formations/4f6cd8f26a94b0ed55d2be5946d53fb5.jpg	2026-11-14	2026-11-17	2026-11-11	10	OUVERTE	2026-10-12 07:30:41.73863	2026-10-21 14:28:58.885804
9	SwiftUI et IOs	Construire des application moderne, rapides et connectés	/uploads/formations/5cf65831a7f35c47f0d642dbe25b69d4.jpg	2026-11-06	2026-11-09	2026-11-03	10	OUVERTE	2026-10-12 07:28:41.963612	2026-10-21 15:03:54.708993
8	Marketing Digital et Reseaux Sociaux	De la strategie de visibilité a la performance digitale mesurable	/uploads/formations/f93c93f6f6b340023d605eb59293008d.jpg	2026-10-24	2026-10-26	2026-10-21	10	OUVERTE	2026-10-12 07:25:34.372538	2026-10-21 15:05:30.324067
4	De l'idée à l'insistant intelligent	mettrisez l'IA generative et le Prompt Engineering 	/uploads/formations/7c3ac61aac90be2bd47bc00c766a0ac1.jpg	2026-07-29	2026-08-02	2026-07-25	20	TERMINEE	2026-10-01 16:46:18.181844	2026-10-21 15:08:34.82837
3	API mastery avec Spring Boot	Concevez des backends rapides, sécurisé et prêt pour la production	/uploads/formations/778eb388939531f61c97eb470bef029c.jpg	2026-09-27	2026-09-30	2026-09-27	20	TERMINEE	2026-10-01 14:56:12.050024	2026-10-21 15:10:59.241701
1	Intelligence émotionnel	Mieux se connaître, mieux vivre, mieux réussir 	/uploads/formations/9ad92ea1782ef33c12235432999b1fd8.jpg	2026-12-16	2026-12-20	2026-11-26	40	OUVERTE	2026-09-19 07:31:18.251346	2026-10-21 15:12:12.213439
\.


--
-- Data for Name: formation_avis; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formation_avis (id_avis, id_formation, id_apprenant, note, commentaire, date_creation) FROM stdin;
1	3	3	4	un tres bon suivie de formation, j'ai bien aimé, de plus les responsables sont très accueillants	2026-10-12 07:14:18.968157
\.


--
-- Data for Name: formation_formateur; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formation_formateur (id_formation, id_formateur, date_affectation, role_formateur) FROM stdin;
1	1	2026-09-19 07:39:14.692916	Formateur Principal
3	1	2026-10-01 15:13:06.653162	Formateur Principal
4	1	2026-10-04 17:00:39.844206	Formateur Principal
11	2	2026-10-21 12:14:22.344879	Formateur Principal
10	2	2026-10-21 12:14:45.062984	Formateur Principal
9	2	2026-10-21 12:14:53.378676	Formateur Principal
8	2	2026-10-21 12:15:00.832995	Formateur Principal
\.


--
-- Data for Name: forum; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.forum (id_forum, id_formation, nom, description, date_creation) FROM stdin;
1	1	Forum dev peronnel	Espace de discussion pour la formation dev peronnel.	2026-10-02 06:20:52.765007
2	3	Forum Bleach	Espace de discussion pour la formation Bleach.	2026-10-02 06:20:52.765007
3	4	Forum BG	Espace de discussion pour la formation BG.	2026-10-02 06:20:52.765007
5	8	Forum Miaou	Espace de discussion pour la formation Miaou.	2026-10-12 07:25:34.372538
6	9	Forum BDG	Espace de discussion pour la formation BDG.	2026-10-12 07:28:41.963612
7	10	Forum Sigma boy	Espace de discussion pour la formation Sigma boy.	2026-10-12 07:30:41.73863
8	11	Forum Le fer aiguise le fer	Espace de discussion pour la formation Le fer aiguise le fer.	2026-10-12 07:33:03.164727
\.


--
-- Data for Name: inscription; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inscription (id_inscription, id_candidat, id_formation, date_inscription, statut, motivation, objectif, projet_apres_formation, source_information, a_deja_suivi_formation, formation_precedente, retour_suggestion, conditions_acceptees, date_decision, motif_decision, date_modification) FROM stdin;
1	1	1	2026-09-19 08:17:34.585532	ACCEPTEE	je veut metriser mes émotions pour les moments difficile et opressants	controller mon stress, mon courage, mes pulsions	mettre en valeur les ompetence que j'aurais acquis lors de la formation		f			t	2026-09-19 09:59:04.428199	\N	2026-09-19 09:59:04.428199
2	2	3	2026-10-01 15:02:23.649478	ACCEPTEE	j'aime bleach 	maitriser bleach	pouvoirs tenir une conversation sur bleach		f			t	2026-10-01 15:05:48.503126	\N	2026-10-01 15:05:48.503126
3	2	1	2026-10-02 09:40:28.93796	ACCEPTEE	pareil, blabla	tous mes skill	me faire un packet de frick		f			t	2026-10-02 09:50:10.014635	\N	2026-10-02 09:50:10.014635
4	3	1	2026-10-21 04:44:16.254095	EN_ATTENTE	j'aime étudier 	etre capable de me metriser	reussir a appliquer ces concepte		f			t	\N	\N	\N
5	2	11	2026-10-21 06:38:01.742249	EN_ATTENTE	miam miam	je sais pas trop	rien pour le moment		f			t	\N	\N	\N
6	1	11	2026-10-21 06:39:07.538615	ACCEPTEE	que dall	pareil	nothing to say		f			t	2026-10-21 06:40:39.39736	\N	2026-10-21 06:40:39.39736
7	4	11	2026-06-08 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
8	5	11	2026-08-02 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
9	6	11	2026-05-11 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
10	7	11	2026-08-19 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
11	8	11	2026-04-26 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
12	9	11	2026-05-03 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
13	10	11	2026-05-10 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
14	11	11	2026-06-22 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
15	12	11	2026-04-24 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
16	13	11	2026-08-14 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
17	14	11	2026-06-22 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
18	15	11	2026-07-20 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
19	16	11	2026-07-21 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
20	17	11	2026-07-03 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
21	18	11	2026-05-09 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
22	19	11	2026-05-21 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
23	20	11	2026-07-16 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
24	21	11	2026-09-22 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
25	22	11	2026-04-25 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
26	23	11	2026-10-05 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
27	24	11	2026-05-10 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
28	25	11	2026-09-08 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
29	26	11	2026-07-20 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
30	27	11	2026-04-26 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
31	28	11	2026-09-10 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
32	29	11	2026-08-15 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
33	30	11	2026-05-27 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
34	31	11	2026-09-22 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
35	32	11	2026-09-19 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
36	33	11	2026-06-07 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
37	34	11	2026-09-18 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
38	35	11	2026-10-03 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
39	36	11	2026-10-03 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
40	37	11	2026-09-15 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
41	38	11	2026-09-24 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
42	39	11	2026-09-19 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
43	40	11	2026-09-04 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
44	41	11	2026-06-21 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
45	42	11	2026-04-29 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
46	43	11	2026-09-02 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
47	44	11	2026-05-07 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
48	45	11	2026-09-30 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
49	46	11	2026-05-03 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
50	47	11	2026-07-11 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
51	48	11	2026-07-13 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
52	49	11	2026-06-25 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
53	50	11	2026-10-03 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
54	51	11	2026-06-21 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
55	52	11	2026-04-27 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
56	53	11	2026-07-05 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
57	54	11	2026-05-02 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
58	55	11	2026-06-17 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
59	56	11	2026-04-25 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
60	57	11	2026-07-18 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
61	58	11	2026-05-23 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
62	59	11	2026-07-19 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
63	60	11	2026-09-06 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
64	61	11	2026-06-06 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
65	62	11	2026-06-07 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
66	63	11	2026-10-06 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
67	64	11	2026-05-24 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
68	65	11	2026-09-14 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
69	66	11	2026-07-21 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
70	67	11	2026-08-18 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
71	68	11	2026-05-17 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
72	69	11	2026-07-19 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
73	70	11	2026-06-01 16:13:24.32	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
74	71	8	2026-07-10 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
75	72	8	2026-08-24 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
76	73	8	2026-05-10 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
77	74	8	2026-05-30 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
78	75	8	2026-07-05 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
79	76	8	2026-09-09 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
80	77	8	2026-05-19 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
81	78	8	2026-07-03 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
82	79	8	2026-05-15 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
83	80	8	2026-09-23 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
84	81	8	2026-08-24 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
85	82	8	2026-05-21 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
86	83	8	2026-06-05 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
87	84	8	2026-06-13 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
88	85	8	2026-05-21 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
89	86	8	2026-09-20 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
90	87	8	2026-05-05 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
91	88	8	2026-08-04 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
92	89	8	2026-09-03 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
93	90	8	2026-09-14 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
94	91	8	2026-09-23 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
95	92	8	2026-10-14 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
96	93	8	2026-10-11 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
97	94	8	2026-08-25 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
98	95	8	2026-05-31 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
99	96	8	2026-07-25 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
100	97	8	2026-09-11 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
101	98	8	2026-05-08 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
102	99	8	2026-06-04 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
103	100	8	2026-07-05 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
104	101	8	2026-10-16 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
105	102	8	2026-09-09 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
106	103	8	2026-07-31 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
107	104	8	2026-05-14 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
108	105	8	2026-05-31 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
109	106	8	2026-06-02 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
110	107	8	2026-05-25 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
111	108	8	2026-09-01 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
112	109	8	2026-06-27 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
113	110	8	2026-09-02 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
114	111	8	2026-06-15 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
115	112	8	2026-08-12 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
116	113	8	2026-10-14 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
117	114	8	2026-06-02 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
118	115	8	2026-09-28 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
119	116	8	2026-05-13 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
120	117	8	2026-09-28 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
121	118	8	2026-06-19 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
122	119	8	2026-06-28 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
123	120	8	2026-09-06 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
124	121	8	2026-08-13 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
125	122	8	2026-07-15 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
126	123	8	2026-09-26 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
127	124	8	2026-08-05 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
128	125	8	2026-06-29 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
129	126	8	2026-04-28 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
130	127	8	2026-10-18 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
131	128	8	2026-07-11 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
132	129	8	2026-07-09 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
133	130	8	2026-08-13 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
134	131	8	2026-04-28 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
135	132	8	2026-10-12 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
136	133	8	2026-07-05 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
137	134	8	2026-07-10 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
138	135	8	2026-08-09 16:14:02.556	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
139	136	1	2026-05-16 16:14:55.971	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-16 16:14:55.971	\N	\N
140	137	1	2026-05-21 16:14:55.971	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-21 16:14:55.971	\N	\N
141	138	1	2026-09-28 16:14:55.971	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-28 16:14:55.971	\N	\N
142	139	1	2026-05-10 16:14:55.971	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-10 16:14:55.971	\N	\N
143	140	1	2026-05-22 16:14:55.971	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-22 16:14:55.971	\N	\N
144	141	1	2026-06-05 16:14:55.971	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-05 16:14:55.971	\N	\N
145	142	1	2026-08-23 16:14:55.971	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-23 16:14:55.971	\N	\N
146	143	1	2026-08-21 16:14:55.971	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-21 16:14:55.971	\N	\N
147	144	1	2026-06-06 16:14:55.971	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-06 16:14:55.971	\N	\N
148	145	1	2026-08-24 16:14:55.971	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-24 16:14:55.971	\N	\N
150	147	9	2026-07-28 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
151	148	9	2026-10-02 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
152	149	1	2026-08-03 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
153	150	9	2026-10-09 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
154	151	9	2026-07-16 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
155	152	9	2026-06-26 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
156	153	9	2026-05-25 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
157	154	9	2026-08-18 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
158	155	1	2026-04-27 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
159	156	9	2026-10-11 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
160	157	9	2026-04-25 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
161	158	9	2026-06-24 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
162	159	1	2026-08-27 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
163	160	1	2026-06-12 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
164	161	1	2026-05-31 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
165	162	1	2026-10-14 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
167	164	9	2026-08-08 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
168	165	1	2026-09-07 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
169	166	9	2026-09-10 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
170	167	1	2026-10-08 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
171	168	9	2026-10-19 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
172	169	9	2026-09-19 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
173	170	9	2026-09-03 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
174	171	1	2026-06-20 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
175	172	1	2026-06-04 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
176	173	9	2026-07-27 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
177	174	9	2026-07-17 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
178	175	9	2026-10-16 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
179	176	1	2026-05-04 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
180	177	9	2026-09-13 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
181	178	1	2026-09-11 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
182	179	1	2026-05-05 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
183	180	1	2026-06-15 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
184	181	9	2026-06-21 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
185	182	9	2026-09-09 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
186	183	9	2026-09-21 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
187	184	9	2026-06-27 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
189	186	1	2026-08-20 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
190	187	9	2026-08-25 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
191	188	9	2026-06-14 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
192	189	9	2026-04-25 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
193	190	9	2026-10-19 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
194	191	9	2026-07-20 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
195	192	9	2026-08-29 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
196	193	9	2026-07-31 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
197	194	1	2026-08-28 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
198	195	9	2026-06-07 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
199	196	9	2026-10-19 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
200	197	1	2026-04-28 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
201	198	1	2026-07-31 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
202	199	9	2026-10-01 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
203	200	9	2026-08-03 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
205	202	1	2026-08-06 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
206	203	1	2026-05-21 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
207	204	1	2026-05-03 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
208	205	1	2026-09-11 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
209	206	1	2026-09-25 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
210	207	1	2026-07-04 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
211	208	1	2026-07-28 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
212	209	9	2026-05-02 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
213	210	1	2026-06-19 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
204	201	1	2026-08-11 16:15:58.823	REFUSEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	2026-10-21 14:24:42.512172
214	211	1	2026-09-02 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
215	212	1	2026-06-09 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
217	214	9	2026-09-25 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
218	215	1	2026-09-03 16:15:58.823	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
219	216	1	2026-08-17 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-17 16:17:31.29	\N	\N
220	217	1	2026-07-15 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-15 16:17:31.29	\N	\N
221	218	1	2026-09-15 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-15 16:17:31.29	\N	\N
222	219	1	2026-07-16 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-16 16:17:31.29	\N	\N
223	220	1	2026-08-08 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-08 16:17:31.29	\N	\N
224	221	1	2026-05-18 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-18 16:17:31.29	\N	\N
225	222	1	2026-06-18 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-18 16:17:31.29	\N	\N
226	223	1	2026-06-06 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-06 16:17:31.29	\N	\N
227	224	1	2026-06-22 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-22 16:17:31.29	\N	\N
228	225	1	2026-04-26 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-04-26 16:17:31.29	\N	\N
229	226	1	2026-04-29 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-04-29 16:17:31.29	\N	\N
230	227	1	2026-07-12 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-12 16:17:31.29	\N	\N
231	228	1	2026-06-19 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-19 16:17:31.29	\N	\N
232	229	1	2026-08-01 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-01 16:17:31.29	\N	\N
233	230	1	2026-05-03 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-03 16:17:31.29	\N	\N
234	231	1	2026-07-30 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-30 16:17:31.29	\N	\N
235	232	1	2026-05-24 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-24 16:17:31.29	\N	\N
236	233	1	2026-08-02 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-02 16:17:31.29	\N	\N
237	234	1	2026-10-08 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-10-08 16:17:31.29	\N	\N
238	235	1	2026-07-24 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-24 16:17:31.29	\N	\N
239	236	1	2026-05-13 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-13 16:17:31.29	\N	\N
240	237	1	2026-10-05 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-10-05 16:17:31.29	\N	\N
241	238	1	2026-05-01 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-01 16:17:31.29	\N	\N
242	239	1	2026-06-06 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-06 16:17:31.29	\N	\N
243	240	1	2026-09-17 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-17 16:17:31.29	\N	\N
244	241	1	2026-09-18 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-18 16:17:31.29	\N	\N
245	242	1	2026-08-04 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-04 16:17:31.29	\N	\N
246	243	1	2026-06-11 16:17:31.29	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-11 16:17:31.29	\N	\N
247	244	11	2026-06-02 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-02 16:18:04.531	\N	\N
248	245	11	2026-08-11 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-11 16:18:04.531	\N	\N
249	246	11	2026-05-27 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-27 16:18:04.531	\N	\N
250	247	11	2026-07-26 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-26 16:18:04.531	\N	\N
251	248	11	2026-08-20 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-20 16:18:04.531	\N	\N
252	249	11	2026-07-06 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-06 16:18:04.531	\N	\N
253	250	11	2026-08-29 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-29 16:18:04.531	\N	\N
254	251	11	2026-10-14 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-10-14 16:18:04.531	\N	\N
255	252	11	2026-07-30 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-30 16:18:04.531	\N	\N
256	253	11	2026-07-10 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-10 16:18:04.531	\N	\N
257	254	11	2026-09-03 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-03 16:18:04.531	\N	\N
258	255	11	2026-07-05 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-05 16:18:04.531	\N	\N
259	256	11	2026-10-01 16:18:04.531	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-10-01 16:18:04.531	\N	\N
260	257	10	2026-09-19 16:18:26.505	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-19 16:18:26.505	\N	\N
261	258	10	2026-07-18 16:18:26.505	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-18 16:18:26.505	\N	\N
262	259	10	2026-07-23 16:18:26.505	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-23 16:18:26.505	\N	\N
263	260	10	2026-07-05 16:18:26.505	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-05 16:18:26.505	\N	\N
264	261	10	2026-05-12 16:18:26.505	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-12 16:18:26.505	\N	\N
265	262	10	2026-10-16 16:18:26.505	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-10-16 16:18:26.505	\N	\N
266	263	10	2026-07-09 16:18:26.505	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-09 16:18:26.505	\N	\N
267	264	10	2026-09-25 16:18:26.505	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-25 16:18:26.505	\N	\N
268	265	10	2026-10-12 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
269	266	10	2026-05-01 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
270	267	10	2026-09-19 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
271	268	10	2026-05-01 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
272	269	10	2026-07-21 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
273	270	10	2026-05-30 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
274	271	10	2026-08-09 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
275	272	10	2026-07-22 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
276	273	10	2026-09-08 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
277	274	10	2026-09-22 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
278	275	10	2026-06-27 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
279	276	10	2026-10-09 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
280	277	10	2026-09-21 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
281	278	10	2026-05-23 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
282	279	10	2026-10-13 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
283	280	10	2026-07-05 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
284	281	10	2026-07-18 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
285	282	10	2026-06-10 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
286	283	10	2026-06-29 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
287	284	10	2026-09-16 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
288	285	10	2026-09-26 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
289	286	10	2026-07-13 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
290	287	10	2026-06-22 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
291	288	10	2026-05-22 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
292	289	10	2026-05-10 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
293	290	10	2026-04-29 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
294	291	10	2026-10-19 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
295	292	10	2026-05-27 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
296	293	10	2026-06-28 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
297	294	10	2026-10-11 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
298	295	10	2026-07-30 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
299	296	10	2026-06-18 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
300	297	10	2026-09-27 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
301	298	10	2026-05-10 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
302	299	10	2026-09-16 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
303	300	10	2026-06-18 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
304	301	10	2026-10-11 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
305	302	10	2026-06-26 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
306	303	10	2026-09-06 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
307	304	10	2026-09-04 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
308	305	10	2026-09-06 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
309	306	10	2026-09-04 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
310	307	10	2026-07-12 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
311	308	10	2026-05-25 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
312	309	10	2026-08-28 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
313	310	10	2026-10-19 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
314	311	10	2026-06-09 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
315	312	10	2026-10-03 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
316	313	10	2026-05-10 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
317	314	10	2026-06-30 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
318	315	10	2026-08-01 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
319	316	10	2026-06-17 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
320	317	10	2026-09-19 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
321	318	10	2026-09-15 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
322	319	10	2026-06-03 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
323	320	10	2026-06-13 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
324	321	10	2026-08-16 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
325	322	10	2026-07-18 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
326	323	10	2026-04-27 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
327	324	10	2026-09-27 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
328	325	10	2026-06-14 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
329	326	10	2026-05-01 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
330	327	10	2026-10-05 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
331	328	10	2026-08-12 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
332	329	10	2026-05-31 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
333	330	10	2026-08-10 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
334	331	10	2026-06-08 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
335	332	10	2026-08-19 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
336	333	10	2026-06-27 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
337	334	10	2026-10-09 16:18:33.965	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
338	335	4	2026-10-12 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
339	336	4	2026-06-04 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
340	337	4	2026-09-25 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
341	338	4	2026-05-18 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
342	339	4	2026-07-01 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
343	340	4	2026-05-31 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
344	341	4	2026-08-23 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
345	342	4	2026-05-18 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
346	343	4	2026-07-19 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
347	344	4	2026-05-31 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
348	345	4	2026-09-11 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
349	346	4	2026-05-02 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
350	347	4	2026-10-12 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
351	348	4	2026-06-11 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
352	349	4	2026-10-01 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
353	350	4	2026-06-03 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
354	351	4	2026-09-16 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
355	352	4	2026-04-26 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
356	353	4	2026-06-04 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
357	354	4	2026-05-16 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
358	355	4	2026-09-07 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
359	356	4	2026-09-11 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
360	357	4	2026-09-13 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
361	358	4	2026-10-11 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
362	359	4	2026-08-14 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
363	360	4	2026-07-18 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
364	361	4	2026-06-24 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
365	362	4	2026-07-30 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
366	363	4	2026-09-02 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
367	364	4	2026-07-11 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
368	365	4	2026-09-15 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
369	366	4	2026-06-02 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
370	367	4	2026-10-08 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
371	368	4	2026-09-10 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
372	369	4	2026-10-21 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
373	370	4	2026-05-31 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
374	371	4	2026-08-23 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
375	372	4	2026-04-25 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
376	373	4	2026-04-30 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
377	374	4	2026-06-05 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
378	375	4	2026-08-24 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
379	376	4	2026-08-14 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
380	377	4	2026-09-23 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
381	378	4	2026-08-11 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
382	379	4	2026-09-02 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
383	380	4	2026-04-30 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
384	381	4	2026-08-11 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
385	382	4	2026-10-18 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
386	383	4	2026-07-10 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
387	384	4	2026-07-19 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
388	385	4	2026-06-05 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
389	386	4	2026-08-04 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
390	387	4	2026-10-16 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
391	388	4	2026-09-07 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
392	389	4	2026-05-12 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
393	390	4	2026-05-01 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
394	391	4	2026-05-28 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
395	392	4	2026-05-20 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
396	393	4	2026-07-22 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
397	394	4	2026-08-28 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
398	395	4	2026-08-26 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
399	396	4	2026-06-26 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
400	397	4	2026-07-05 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
401	398	4	2026-06-15 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
402	399	4	2026-05-28 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
403	400	4	2026-08-11 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
404	401	4	2026-06-02 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
405	402	4	2026-05-31 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
406	403	4	2026-07-15 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
407	404	4	2026-07-06 16:19:07.121	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
408	405	4	2026-08-28 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-28 16:19:20.463	\N	\N
409	406	4	2026-05-20 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-20 16:19:20.463	\N	\N
410	407	4	2026-09-20 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-20 16:19:20.463	\N	\N
411	408	4	2026-06-01 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-01 16:19:20.463	\N	\N
412	409	4	2026-05-04 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-04 16:19:20.463	\N	\N
413	410	4	2026-07-18 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-18 16:19:20.463	\N	\N
414	411	4	2026-07-23 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-23 16:19:20.463	\N	\N
415	412	4	2026-06-27 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-27 16:19:20.463	\N	\N
416	413	4	2026-08-15 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-15 16:19:20.463	\N	\N
417	414	4	2026-04-29 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-04-29 16:19:20.463	\N	\N
418	415	4	2026-06-13 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-13 16:19:20.463	\N	\N
419	416	4	2026-10-18 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-10-18 16:19:20.463	\N	\N
420	417	4	2026-10-20 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-10-20 16:19:20.463	\N	\N
421	418	4	2026-05-17 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-17 16:19:20.463	\N	\N
422	419	4	2026-10-13 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-10-13 16:19:20.463	\N	\N
423	420	4	2026-08-09 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-09 16:19:20.463	\N	\N
424	421	4	2026-09-06 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-06 16:19:20.463	\N	\N
425	422	4	2026-08-05 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-05 16:19:20.463	\N	\N
426	423	4	2026-07-20 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-20 16:19:20.463	\N	\N
427	424	4	2026-05-22 16:19:20.463	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-22 16:19:20.463	\N	\N
428	425	3	2026-09-10 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-10 16:19:47.584	\N	\N
429	426	3	2026-09-25 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-25 16:19:47.584	\N	\N
430	427	3	2026-07-30 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-30 16:19:47.584	\N	\N
431	428	3	2026-09-13 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-13 16:19:47.584	\N	\N
432	429	3	2026-07-14 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-14 16:19:47.584	\N	\N
433	430	3	2026-09-06 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-06 16:19:47.584	\N	\N
434	431	3	2026-07-06 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-06 16:19:47.584	\N	\N
435	432	3	2026-09-03 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-03 16:19:47.584	\N	\N
436	433	3	2026-09-10 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-09-10 16:19:47.584	\N	\N
437	434	3	2026-04-27 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-04-27 16:19:47.584	\N	\N
438	435	3	2026-08-08 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-08-08 16:19:47.584	\N	\N
439	436	3	2026-10-07 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-10-07 16:19:47.584	\N	\N
440	437	3	2026-06-28 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-06-28 16:19:47.584	\N	\N
441	438	3	2026-05-15 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-15 16:19:47.584	\N	\N
442	439	3	2026-05-31 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-31 16:19:47.584	\N	\N
443	440	3	2026-05-31 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-05-31 16:19:47.584	\N	\N
444	441	3	2026-07-29 16:19:47.584	ACCEPTEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	2026-07-29 16:19:47.584	\N	\N
445	442	3	2026-07-18 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
446	443	3	2026-10-15 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
447	444	3	2026-07-03 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
448	445	3	2026-05-04 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
449	446	3	2026-05-23 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
450	447	3	2026-06-17 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
451	448	3	2026-10-14 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
452	449	3	2026-05-09 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
453	450	3	2026-10-15 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
454	451	3	2026-07-04 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
455	452	3	2026-07-11 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
456	453	3	2026-05-27 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
457	454	3	2026-08-23 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
458	455	3	2026-10-13 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
459	456	3	2026-09-18 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
460	457	3	2026-08-10 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
461	458	3	2026-08-06 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
462	459	3	2026-09-20 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
463	460	3	2026-05-24 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
464	461	3	2026-05-12 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
465	462	3	2026-06-21 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
466	463	3	2026-09-06 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
467	464	3	2026-05-02 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
468	465	3	2026-09-23 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
469	466	3	2026-05-12 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
470	467	3	2026-08-14 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
471	468	3	2026-09-19 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
472	469	3	2026-08-08 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
473	470	3	2026-06-02 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
474	471	3	2026-10-06 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
475	472	3	2026-06-21 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
476	473	3	2026-05-16 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
477	474	3	2026-06-26 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
478	475	3	2026-05-08 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
479	476	3	2026-05-01 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
480	477	3	2026-06-05 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
481	478	3	2026-05-16 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
482	479	3	2026-07-29 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
483	480	3	2026-09-25 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
484	481	3	2026-06-07 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
485	482	3	2026-05-13 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
486	483	3	2026-10-19 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
487	484	3	2026-05-31 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
488	485	3	2026-08-10 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
489	486	3	2026-08-21 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
490	487	3	2026-09-29 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
491	488	3	2026-09-02 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
492	489	3	2026-05-27 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
493	490	3	2026-05-12 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
494	491	3	2026-04-26 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
495	492	3	2026-05-07 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
496	493	3	2026-09-09 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
497	494	3	2026-05-25 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
498	495	3	2026-06-22 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
499	496	3	2026-04-28 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
500	497	3	2026-06-13 16:19:55.754	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
501	498	9	2026-08-12 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
502	499	9	2026-06-30 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
503	500	9	2026-08-22 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
504	501	9	2026-09-26 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
505	502	9	2026-08-21 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
506	503	9	2026-09-06 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
507	504	9	2026-10-08 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
508	505	9	2026-09-06 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
509	506	9	2026-09-03 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
510	507	9	2026-10-02 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
511	508	9	2026-06-07 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
512	509	9	2026-07-30 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
513	510	9	2026-05-04 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
514	511	9	2026-07-08 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
515	512	9	2026-09-22 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
516	513	9	2026-05-14 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
517	514	9	2026-05-01 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
518	515	9	2026-07-25 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
519	516	9	2026-10-08 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
520	517	9	2026-08-29 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
521	518	9	2026-09-19 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
522	519	9	2026-04-28 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
523	520	9	2026-07-22 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
524	521	9	2026-05-09 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
525	522	9	2026-05-25 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
526	523	9	2026-07-15 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
527	524	9	2026-09-04 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
528	525	9	2026-06-08 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
529	526	9	2026-10-13 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
530	527	9	2026-05-31 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
531	528	9	2026-08-28 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
532	529	9	2026-05-21 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
533	530	9	2026-05-23 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
534	531	9	2026-06-30 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
535	532	9	2026-09-08 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
536	533	9	2026-07-23 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
537	534	9	2026-06-06 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
538	535	9	2026-04-26 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
539	536	9	2026-08-24 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
540	537	9	2026-06-12 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
541	538	9	2026-05-21 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
542	539	9	2026-07-27 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
543	540	9	2026-05-07 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
544	541	9	2026-06-26 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
545	542	9	2026-06-18 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
546	543	9	2026-06-19 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
547	544	9	2026-07-26 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
548	545	9	2026-09-07 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
549	546	9	2026-09-10 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
550	547	9	2026-07-25 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
551	548	9	2026-07-09 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
552	549	9	2026-04-25 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
553	550	9	2026-05-01 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
554	551	9	2026-06-27 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
555	552	9	2026-05-16 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
556	553	9	2026-05-15 16:20:00.678	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
557	554	10	2026-06-26 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
558	555	9	2026-10-14 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
559	556	8	2026-08-30 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
560	557	3	2026-08-09 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
561	558	3	2026-07-26 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
562	559	10	2026-08-26 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
563	560	10	2026-07-17 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
565	562	3	2026-05-17 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
566	563	11	2026-07-05 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
567	564	3	2026-07-19 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
568	565	8	2026-07-26 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
569	566	1	2026-05-12 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
570	567	11	2026-05-18 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
571	568	11	2026-09-26 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
572	569	10	2026-05-26 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
573	570	11	2026-08-04 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
574	571	8	2026-07-16 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
575	572	11	2026-10-12 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
576	573	10	2026-08-23 16:20:16.281	EN_ATTENTE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	\N
149	146	1	2026-08-15 16:15:58.823	REFUSEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	2026-10-21 14:24:40.081178
216	213	1	2026-08-14 16:15:58.823	REFUSEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	2026-10-21 14:24:41.955454
188	185	1	2026-08-13 16:15:58.823	REFUSEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	2026-10-21 14:24:42.214249
166	163	1	2026-08-07 16:15:58.823	REFUSEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	2026-10-21 14:24:43.150945
564	561	1	2026-08-06 16:20:16.281	REFUSEE	Candidature de démonstration générée par l’administration.	Développer des compétences dans cette formation.	Mettre en pratique les compétences acquises.	Jeu de données synthétique	f	\N	\N	t	\N	\N	2026-10-21 14:24:44.13354
\.


--
-- Data for Name: message; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message (id_message, id_forum, id_utilisateur, contenu, date_envoi, date_modification, message_parent) FROM stdin;
1	2	3	Kaiza doll	2026-10-02 06:22:34.200513	\N	\N
2	2	6	Kaiza bro	2026-10-02 06:23:16.439669	\N	\N
3	2	3	__FORUM_ATTACHMENT_V1__:{"contenu":"ito de ianaro le note","nom_fichier":"Princess Mononoke - Main Theme [Fingerstyle].pdf","chemin_fichier":"ba743650-06a5-4a39-aca9-f64edc6c4b72.pdf","type_fichier":"application/pdf","taille_fichier":70466}	2026-10-02 06:29:53.523401	\N	\N
4	2	6	Ok	2026-10-02 06:30:21.106933	\N	\N
5	2	3	gg	2026-10-12 07:11:38.23131	\N	\N
6	1	6	salut a tous	2026-10-12 16:40:59.438678	\N	\N
7	1	5	salut a toi aussi	2026-10-21 11:58:41.018331	\N	\N
\.


--
-- Data for Name: presence; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.presence (id_presence, id_apprenant, id_seance, date_scan, statut, commentaire) FROM stdin;
1	3	4	2026-10-02 06:26:03.594912	PRESENT	\N
2	3	5	2026-10-02 09:10:40.222211	PRESENT	\N
5	3	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
7287	3	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
7288	3	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
7289	3	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16392	65	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16393	65	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16394	65	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16395	65	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16396	65	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16397	66	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16398	66	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16399	66	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16400	66	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16401	66	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16402	67	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16403	67	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16404	67	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16405	67	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16406	67	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16407	68	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16408	68	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16409	68	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16410	68	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16411	68	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16412	69	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16413	69	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16414	69	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16415	69	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16416	69	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16417	70	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16418	70	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16419	70	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16420	70	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16421	70	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16422	71	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16423	71	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16424	71	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16425	71	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16426	71	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16427	72	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16428	72	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16429	72	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16430	72	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16431	72	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16432	73	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16433	73	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16434	73	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16435	73	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16436	73	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16437	74	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16438	74	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16439	74	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16440	74	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16441	74	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16442	75	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16443	75	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16444	75	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16445	75	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16446	75	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16447	76	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16448	76	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16449	76	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16450	76	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16451	76	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16452	77	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16453	77	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16454	77	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16455	77	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16456	77	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16457	78	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16458	78	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16459	78	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16460	78	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16461	78	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16462	79	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16463	79	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16464	79	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16465	79	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16466	79	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16467	80	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16468	80	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16469	80	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16470	80	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16471	80	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16472	81	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16473	81	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16474	81	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16475	81	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16476	81	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16477	82	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16478	82	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16479	82	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16480	82	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16481	82	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16482	83	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16483	83	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16484	83	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16485	83	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16486	83	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16487	84	33	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16488	84	34	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16489	84	35	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16490	84	36	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16491	84	37	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16704	85	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16705	85	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16706	85	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16707	85	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16708	85	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16709	85	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16710	86	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16711	86	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16712	86	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16713	86	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16714	86	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16715	86	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16716	87	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16717	87	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16718	87	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16719	87	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16720	87	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16721	87	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16722	88	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16723	88	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16724	88	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16725	88	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16726	88	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16727	88	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16728	89	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16729	89	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16730	89	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16731	89	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16732	89	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16733	89	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16734	90	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16735	90	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16736	90	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16737	90	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16738	90	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16739	90	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16740	91	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16741	91	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16742	91	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16743	91	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16744	91	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16745	91	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16746	92	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16747	92	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16748	92	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16749	92	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16750	92	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16751	92	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16752	93	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16753	93	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16754	93	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16755	93	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16756	93	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16757	93	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16758	94	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16759	94	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16760	94	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16761	94	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16762	94	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16763	94	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16764	95	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16765	95	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16766	95	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16767	95	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16768	95	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16769	95	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16770	96	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16771	96	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16772	96	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16773	96	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16774	96	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16775	96	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16776	97	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16777	97	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16778	97	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16779	97	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16780	97	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16781	97	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16782	98	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16783	98	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16784	98	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16785	98	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16786	98	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16787	98	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16788	99	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16789	99	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16790	99	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16791	99	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16792	99	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16793	99	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16794	100	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16795	100	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16796	100	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16797	100	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16798	100	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16799	100	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16800	101	4	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16801	101	5	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16802	101	6	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16803	101	40	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16804	101	41	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
16805	101	42	\N	ABSENT	Absence automatique : aucun scan enregistré après la séance.
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
7	1	Travaux Pratiques (TP) - dev peronnel		2026-12-22	17:02:00	18:00:00	Travaux Pratiques (TP)	salle odc
8	1	Travaux Pratiques (TP) - dev peronnel		2026-12-22	13:00:00	16:00:00	Travaux Pratiques (TP)	salle odc
10	1	Cours Magistral - dev peronnel		2026-12-19	08:00:00	10:00:00	Cours Magistral	odc
11	1	Cours Magistral - dev peronnel		2026-12-20	08:00:00	12:00:00	Cours Magistral	salle odc
15	11	Cours Magistral - Le fer aiguise le fer	citation d'obito	2026-11-25	08:00:00	10:00:00	Cours Magistral	salle odc
16	11	Cours Magistral - Le fer aiguise le fer	bkj	2026-11-26	08:00:00	10:00:00	Cours Magistral	
18	11	Cours Magistral - Le fer aiguise le fer	citation itachi	2026-11-23	08:00:00	10:00:00	Cours Magistral	odc club
19	9	Cours Magistral - BDG		2026-11-08	08:00:00	12:00:00	Cours Magistral	salle odc
20	9	Cours Magistral - BDG		2026-11-08	14:00:00	16:00:00	Cours Magistral	salle odc
21	9	Cours Magistral - BDG		2026-11-09	09:00:00	12:00:00	Cours Magistral	salle odc
22	9	Cours Magistral - BDG		2026-11-09	14:00:00	16:00:00	Cours Magistral	salle odc
23	9	Cours Magistral - BDG		2026-11-10	10:00:00	12:00:00	Cours Magistral	salle odc
24	9	Cours Magistral - BDG		2026-11-10	14:00:00	16:00:00	Cours Magistral	salle odc
25	10	Cours Magistral - Sigma boy		2026-11-15	08:00:00	10:00:00	Cours Magistral	salle odc
26	10	Cours Magistral - Sigma boy		2026-11-16	08:00:00	10:00:00	Cours Magistral	salle odc
27	10	Cours Magistral - Sigma boy		2026-11-17	08:00:00	10:00:00	Cours Magistral	salle odc
28	10	Cours Magistral - Sigma boy		2026-11-18	08:00:00	10:00:00	Cours Magistral	salle odc
29	9	Cours Magistral - BDG		2026-11-11	08:00:00	10:00:00	Cours Magistral	salle odc
30	8	Cours Magistral - Miaou		2026-10-25	08:00:00	10:00:00	Cours Magistral	salle odc
31	8	Cours Magistral - Miaou		2026-10-26	08:00:00	10:00:00	Cours Magistral	salle odc
32	8	Cours Magistral - Miaou		2026-10-27	08:00:00	10:00:00	Cours Magistral	salle odc
33	4	Cours Magistral - BG		2026-07-30	08:00:00	10:00:00	Cours Magistral	salle odc
34	4	Cours Magistral - BG		2026-07-31	08:00:00	10:00:00	Cours Magistral	salle odc
35	4	Cours Magistral - BG		2026-08-01	08:00:00	10:00:00	Cours Magistral	salle odc
36	4	Cours Magistral - BG		2026-08-02	08:00:00	10:00:00	Cours Magistral	salle odc
37	4	Cours Magistral - BG		2026-08-03	08:00:00	10:00:00	Cours Magistral	salle odc
38	1	Cours Magistral - dev peronnel		2026-12-17	08:00:00	10:00:00	Cours Magistral	salle odc
39	1	Cours Magistral - dev peronnel		2026-12-18	08:00:00	10:00:00	Cours Magistral	salle odc
40	3	Cours Magistral - Bleach		2026-09-29	08:00:00	10:00:00	Cours Magistral	salle odc
41	3	Cours Magistral - Bleach		2026-09-30	08:00:00	10:00:00	Cours Magistral	salle odc
42	3	Cours Magistral - Bleach		2026-10-01	08:00:00	10:00:00	Cours Magistral	salle odc
43	11	Cours Magistral - Le fer aiguise le fer		2026-11-24	08:00:00	10:00:00	Cours Magistral	salle odc
44	11	Cours Magistral - Le fer aiguise le fer		2026-11-22	08:00:00	10:00:00	Cours Magistral	salle odc
45	8	Cours Magistral - Marketing Digital et Reseaux Sociaux		2026-10-24	08:00:00	10:00:00	Cours Magistral	salle odc
46	9	Cours Magistral - SwiftUI et IOs		2026-11-06	08:00:00	12:00:00	Cours Magistral	salle odc
47	9	Cours Magistral - SwiftUI et IOs		2026-11-07	09:00:00	12:00:00	Cours Magistral	salle odc
48	11	Cours Magistral - Devenir un Leader d'Impact		2026-11-21	08:00:00	11:00:00	Cours Magistral	salle odc
49	10	Cours Magistral - Reseaux nouvelle generation		2026-11-14	08:00:00	10:00:00	Cours Magistral	salle odc
\.


--
-- Data for Name: support_cours; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_cours (id_support, id_formation, id_formateur, nom_fichier, type_fichier, chemin_fichier, date_publication, description) FROM stdin;
\.


--
-- Data for Name: utilisateur; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utilisateur (id_utilisateur, email, mot_de_passe, username, nom, prenom, telephone, age, photo_profil, qr_code, statut_compte, date_creation, date_derniere_connexion, date_derniere_deconnexion) FROM stdin;
7	papanaoformation@gmail.com	$2b$10$c4pefLTQ/yAh8yGULQYdwODf.JMa9j2uvriVCmtwE9gkO9mWueXoS	\N	Ultime	Charo	0323546786	23	avatar-7-1792581216125-761018945.jpg	\N	ACTIF	2026-10-21 12:11:36.449635	2026-10-21 15:22:32.043515	2026-10-21 15:29:01.481696
3	formateur@gmail.com	$2b$10$rIkm30SEGO1t.3sNxd5zw.RXp/kqLByDCDOvmQPmgUAQd2ObVg/W6	\N	RAZAFIMANDIMBY	Santatra	032 28 188 29	34	avatar-3-1791130143606-550573786.jpg	\N	ACTIF	2026-09-19 07:38:34.017289	2026-10-21 14:21:27.504889	2026-10-21 14:22:20.550895
6	bebemartiora@gmail.com	$2b$10$ZroDXZmDumueCBnYq12NQOGle.iS7q/Ta5cVAGT2Is7hPWVK4IYpy	CR7	Cristiano	Ronaldo	032 28 188 26	19	avatar-anon-1790863751300-648994721.jpg	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAklEQVR4AewaftIAAAlISURBVO3BUW5kuZYEwXAi979ln/okDkQwdZFSdb0JM/wjVfWllao6Wqmqo5WqOlqpqqNXvgDkb1OzA/IONZ8AZFLzBJBJzQ7Ip6i5AfKEmgnITs0TQP42NbuVqjpaqaqjlao6Wqmqo1fepOanALlR8wSQSc0E5AbIjZp3APkENROQGzU3QN6hZgdkUvOEmp8C5Galqo5WqupopaqOXnkIyBNqfhKQGyCTmieA7IA8oeYGyATkRs0EZFKzUzMBuVHzk4A8oea7VqrqaKWqjlaq6milqo5e+UcAmdRManZAJjUTkCfU7IBMaiYgN0B2aiYgk5obNTdAPgXIpOa/bqWqjlaq6milqo5Wqurolf8xQHZqJiA3an6Smhs1TwCpz1ipqqOVqjpaqaqjVx5S81+kZgdkUjMB2QGZ1HwKkJ2aCciNmgnIjZobIJOaGyA/Sc1vWamqo5WqOlqpqqOVqjp65U1A/gVAdmomIJOaHZB3ANmpmYBManZAJjU7IE+omYBMap4AslMzAXkCyN+0UlVHK1V1tFJVRytVdfTKF9T8fwNkp+YJIJ8C5Ak1TwDZqZmATGp2QCY1N2r+a1aq6milqo5WqurolS8AmdQ8AWSnZgLyBJBJzY2aJ4A8oWYCslMzAdmpmYBMam7UTEA+Qc0E5DepuQEyqdmtVNXRSlUdrVTV0UpVHb3yEJBPUXMD5FOAPKFmAnID5Ak1TwC5UXMDZFIzAdmpmdQ8AeSnqLlZqaqjlao6Wqmqo5WqOsI/8iFAfpOaCciNmgnITs0TQN6h5ruAvEPNE0Bu1DwB5Ak1N0DeoWYHZFKzW6mqo5WqOlqpqqNX3gRkp+ZT1ExAdmomIDdqJiA3QCY1E5BPAPKEmieA3KiZgNyomdRMQG6ATGp2at4B5LtWqupopaqOVqrqaKWqjl75ApBJzRNqboBMam7UTEB2QN6h5gbIpGYHZFIzAfkEIJOaGzU3QD4FyI2aJ4BMam7U3KxU1dFKVR2tVNXRSlUdvfIQkHcA2amZ1PzXAJnU3KiZgNyomYDs1LwDyE7NBOSnAJnUTEBugDwBZFKzAzKp2a1U1dFKVR2tVNXRK19Q8ylqboBManZAJjWTmh2QSc2Nmk9RMwH5LiD/RWpugExqbtQ8AeQTVqrqaKWqjlaq6milqo5eeROQnZp3ANmpmdRMQJ4AcgNkUnMDZFKzAzKpuQFyo2YCMql5Qs0OyDuA3Kh5AsikZgdkUjMB+a6Vqjpaqaqjlao6Wqmqo1ceAjKpmdTsgPwmNZ+i5kbNO9TcANkBmdT8FDUTkEnNDsgE5EbNO4B8gpqblao6Wqmqo5WqOnrll6l5B5C/Ccg71OyAvEPNDsikZgdkAjKpeQLIE0B2at4BZAfkNwGZ1OxWqupopaqOVqrqaKWqjl75ApAbNROQSc0OyDvUPKHmE9Q8oWYCcqNmAvIJQJ5Q8w4gN0AmNTdAJjU7IO9QswNys1JVRytVdbRSVUcrVXX0yi9T85uATGomIDs17wCyUzOpmYDs1Nyo+RQ1N0DeoeYJIDs1k5pPAfJdK1V1tFJVRytVdfTKm9T8FCA3aiYgk5obIJ+i5hOATGr+JjWfomYCcgPkU9R810pVHa1U1dFKVR2tVNUR/pE3ANmpmYBMap4AslPzm4BMap4AMqm5AfIvUjMB+SlqJiBPqNmtVNXRSlUdrVTV0StfADKpuVEzAdmpmYBMam6ATGqeALJTMwF5Qs0nqJmATGpugNyomYBMam7UTEBu1ExAdkDeoWYH5Galqo5WqupopaqOVqrq6JUPAjKpuVEzAdmpmdRMQJ5QswMyqZmA3AC5UXMDZFLztwG5UfOb1ExAdmpuVqrqaKWqjlaq6milqo7wjwxAbtS8A8gTanZAJjUTkBs1N0AmNTdAJjUTkO9S85uAvEPNDsgTap4A8ilqditVdbRSVUcrVXWEf2QA8oSaTwFyo+YJIJOafxGQGzXvAPKEmk8A8pPUfNdKVR2tVNXRSlUdrVTV0StvUrMD8g4gOzUTkBs1E5BJzRNAbtRMQG7U3ACZ1OyAvEPNJ6iZgExAdmreAeQT1ExAboBManYrVXW0UlVHK1V1tFJVR688pOYJIJOaGyCTmgnIjZongExqdkAmIJOanZoJyI2aJ4DcAHmHmhsgN2omIJOaHZBJzSesVNXRSlUdrVTVEf6RDwEyqdkBeYeaGyCTmhsgv0nNE0Bu1ExAdmo+BcgTaiYgOzVPAJnUfMJKVR2tVNXRSlUdrVTV0StfAPKb1HwKkJ+iZgKyU/MOIDdqnlCzA/KEmp+k5gbIjZoJyBNqditVdbRSVUcrVXW0UlVHr3xBzQ2QSc0E5AbIjZpPUTMB2amZgHyKmh2QCciNmifUTEA+Qc0EZFKzA/IEkEnNDZCblao6Wqmqo5WqOnrlh6n5KWomIDs171Bzo+YGyKTmRs0E5AkgOzU/Sc1PUTMBeQLITs3NSlUdrVTV0UpVHa1U1RH+kQHIp6jZAXmHmhsgk5odkCfUTEAmNU8A+S1qJiCTmhsg/wI1n7BSVUcrVXW0UlVHK1V1hH/kHwDkCTUTkJ+iZgIyqdkBuVEzAflNaiYgT6h5AshOzTuA3KjZrVTV0UpVHa1U1dErXwDyt6m5UXMDZFIzAblRMwHZAZnUPKHmCTVPAHlCzQ7IE0AmNTdA3qFmB+RmpaqOVqrqaKWqjlaq6uiVN6n5KUBu1LwDyA2QSc0TanZAJiCTmu8C8g4gOzUTkEnNDZCfouZT1ExAvmulqo5WqupopaqOVqrqCP/IAGRSswPyhJoJyKRmB+QJNROQGzUTkEnNDZAn1OyA/CY1TwD5TWp+ykpVHa1U1dFKVR298o9QMwF5Qs1PATKp+QQ1E5An1ExAdkAmNROQnZp3ANmp+RQgN2puVqrqaKWqjlaq6milqo5e+R+jZgfkHWpu1ExAdmomIJOaHZBJzQ7IO9TsgPwkNTsgk5pJzScAmdTcAJnU7Faq6milqo5WqupopaqOXnlIzd+m5lOA7NRMQJ5Q8wSQJ4Ds1LxDzQ7IBORGzQRkUrMDMqn5FCDftVJVRytVdbRSVUevvAnI3wRkUvOEmgnIDsik5gkg/zVAJjU7NROQSc0OyBNqnlAzAblRc7NSVUcrVXW0UlVHK1V1hH+kqr60UlVHK1V1tFJVR/8HfeC+ttqHS9cAAAAASUVORK5CYII=	ACTIF	2026-10-01 15:05:48.503126	2026-10-21 11:58:19.415597	2026-10-21 11:59:16.447308
2	nyandry245@gmail.com	$2b$10$kFIo..o3jQT70hpFLNLoGupNKaqpXjegUzHhScI06ZK6sYs4rW51C	\N	RAKEMBA	Ny Andry Anao	032 28 188 26	12	avatar-2-1791130048181-183261829.jpg	\N	ACTIF	2026-09-19 06:58:23.190465	2026-10-21 15:02:36.740097	2026-10-21 15:19:05.188162
5	hashthag10@gmail.com	$2b$10$Fjw6ktwCOcRpayJgMBRXbuO86tGzeaF53uIJ4Z6hsVIngG50w4zIa	SARAH34	Sarah	Cameroon	0322818826	19	avatar-5-1792582100001-995129409.jpg	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAklEQVR4AewaftIAAAl4SURBVO3BUY5bOxYEwUpC+99yTn8SByYoX0j2+KEi8Eeq6pdWqupopaqOVqrqaKWqjl75BSB/m5obIJOaJ4Ds1ExAbtRMQCY1OyCTmhsgk5o/CciNmhsgf5ua3UpVHa1U1dFKVR2tVNXRK29S8y1APgXIn6TmE9TcAJnUTEB2at4BZKdmAnKj5lPUfAuQm5WqOlqpqqOVqjp65SEgT6h5Asg71OyATGqeUDMB2amZ1ExAdmpu1HwKkEnNjZongExqngDyhJrftVJVRytVdbRSVUcrVXX0yn8MkG8BMqm5ATKp2QF5Qs0TaiYgOzVPAPmvWKmqo5WqOlqpqqOVqjp65R+mZgLyLWomIDdqJiC/S80E5Akgk5odkE9R8y9aqaqjlao6Wqmqo1ceUvMvUPMOIDs1E5BJzQ7IO9TcANkBmdRMQJ4AcqPmb1Pzp6xU1dFKVR2tVNXRSlUdvfImIP8VQCY1OyCTmgnITs0EZFKzAzKp2QH5JjU7IO8AslMzAZnU3AD5m1aq6milqo5WqupopaqOXvkFNf9laiYgOzXvUHOj5kbNBOQGyKcA+QQgk5obNf9vVqrqaKWqjlaq6uiVXwAyqdkB+SY1OzVPAJnUfAqQGzUTkBs1N0AmNTsg71BzA2RSswPyBJBvUvO7VqrqaKWqjlaq6milqo5e+QU1E5CdmieATGomIE+o+ZPU3ACZ1OyATEB2at4BZKdmAnIDZFIzAbkB8i1qJiCfsFJVRytVdbRSVUcrVXWEPzIAmdR8ApB3qHkCyE7NE0Deoeb/DZCdmncA2amZgNyomYBMam6ATGp2QN6h5netVNXRSlUdrVTVEf7IG4Ds1ExAJjVPANmp+RQgn6LmBsikZgfkRs0E5EbNBOQJNROQnZpPAXKj5ltWqupopaqOVqrqaKWqjvBHBiCTmh2Qb1KzAzKpeQLIjZongExqPgHIO9TsgDyhZgLyhJo/Ccik5netVNXRSlUdrVTV0UpVHb3yQWomIDdqJiA7NROQbwEyqblRMwGZ1OyA3Kh5B5AbNROQHZAn1ExAJjU3QG7UTGpugExqditVdbRSVUcrVXWEPzIA+RY1E5BJzQ7IE2qeADKpeQLIjZoJyI2aJ4BMam6ATGo+AcgTaiYgN2puVqrqaKWqjlaq6milqo7wRx4A8g41TwDZqZmATGq+Bcik5gkgn6BmArJT8wSQSc0E5Ak1OyCTmgnIjZobIJOa3UpVHa1U1dFKVR2tVNXRK78AZFLzCUDeoWYHZFIzAblRMwHZqfmT1HyKmh2QSc2NmgnIpGYHZFJzo2YCcqNmAjKp2am5Wamqo5WqOlqpqqNX3gTkW9RMQHZq3qFmB+QJIE8AeYeaHZAbNROQSc23qJmA3ACZ1OyAfIqaGyCTmt1KVR2tVNXRSlUdrVTVEf7IAGRSswPyhJoJyBNqboC8Q80OyKeoeQLITs0TQD5FzRNAJjU7IJOaCciNmk9Yqaqjlao6Wqmqo5WqOsIfGYA8oeYGyKRmAvIJaiYgN2qeAPKEmgnIjZoJyI2aCciNmk8B8glq3gFkp+ZmpaqOVqrqaKWqjl55k5obIDdqJiA3aiYgk5on1NwAuVHzLWomIJOaGyCTmhsgn6LmCSA7IN+yUlVHK1V1tFJVRytVdfTKL6iZgNyomYDcqJmAfAKQSc0EZKdmUvMEkCfU7IC8A8hOzaTmBsinqLkB8k1qdkAmNbuVqjpaqaqjlao6euUXgPxJQJ5QMwHZqXmHmh2Qd6h5Qs0OyATkRs0E5AbIE2omIDs1n6LmBsgTam5WqupopaqOVqrqaKWqjl55k5odkCeATGpugHwKkEnNTs0E5Ak1E5CdmgnITs0E5G9TswMyqblR8w4gN2omIDs1NytVdbRSVUcrVXW0UlVH+CNvALJTMwGZ1NwAmdTcAPkUNTsgk5obIJOavwnIN6n5m4BMam6ATGp2K1V1tFJVRytVdfTKLwCZ1OyAPAFkUvMpam6ATEB2ar4JyI2aGyCfomYH5Akgf5KadwDZqblZqaqjlao6Wqmqo5WqOsIfGYDcqJmA3KiZgNyoeQeQnZoJyKTmBsik5gbIpGYH5EbNO4Ds1LwDyI2aTwGyU/MOIDs1E5BJze9aqaqjlao6Wqmqo5WqOnrlTWp2QN6hZgdkUjMBeULNDsg7gOzUvAPITs0TaiYgN0CeAHKj5h1AdmomIJOaHZBJzQ2QSc0NkEnNbqWqjlaq6milqo7wR/4gIO9QswPyKWomIN+iZgJyo2YHZFIzAfkENROQGzV/G5BJze9aqaqjlao6Wqmqo5WqOsIfGYA8oWYCslPzKUAmNTsg71CzA/KEmgnIpOYGyE7NNwHZqXkHkJ2aCciNmgnIE2omIDdqditVdbRSVUcrVXW0UlVHr7xJzQ7IBOQJIN+iZgJyo+ZT1NwAmdTcAHlCzQ2Qb1Jzo+YGyDvU/K6Vqjpaqaqjlao6euUhNZ+iZgJyo+YGyKRmArJT8w4gOzUTkEnNTs0EZKfmHWq+Rc2fBGRS86esVNXRSlUdrVTV0UpVHb3yEJBJzQTkE9S8A8gTar5FzRNqPgHIO9TcAJnUPAHkCSA7NROQGzU3K1V1tFJVRytVdbRSVUev/IKaGzXvUPMJQCY1N2omIJOaJ9TcALlRcwPkCTUTkBsgk5oJyE7NO9Q8AeRGzQ2QSc1upaqOVqrqaKWqjl75BSB/m5qdmgnIDZBJzQ2QSc0EZKfmHWo+Qc0EZKdmUjMBuQFyA+QJIJOab1Fzs1JVRytVdbRSVUcrVXX0ypvUfAuQGyCTmhsgf5uaCchOzY2ad6i5ATKp2QGZ1ExAPkHNE0AmNROQnZqblao6Wqmqo5WqOlqpqqNXHgLyhJpvAnIDZFKzU/MpQG6APKFmArJTM6m5UTMBmdTcAJmAfIKab1mpqqOVqjpaqaqjV/5hQCY1OyBPAJnUTGpu1ExAfpeaCcgTQCY1OyCTmhsgk5q/Tc3vWqmqo5WqOlqpqqOVqjp65R+mZgLyBJAbIE+omdTsgExqbtRMQHZAJjUTkJ2aCciNmieAPKHmW1aq6milqo5WqupopaqO8EcGIJOabwEyqbkBMql5AsgTar4FyE7NvwrIpOYGyBNqJiA7NTcrVXW0UlVHK1V1hD8yAPnb1OyATGpugHyKmgnIE2p+F5BPUTMB2amZgExqngCyU/MEkEnNJ6xU1dFKVR2tVNXRSlUd4Y9U1S+tVNXRSlUdrVTV0f8AVgoIgXf4dNEAAAAASUVORK5CYII=	ACTIF	2026-09-19 09:59:04.428199	2026-10-21 12:27:17.255988	2026-10-21 12:28:23.433217
1	admin@plateforme.com	$2b$10$TZhK/cGGoSOh7P3HBwbuduktxXqm4Vr4mTQ.sPdgdMASTFp9Qu00O	THAG34	ANDRIATSARANIARIVO	Joseph Aimé	0340643598	20	avatar-1-1791130104838-35049754.jpg	\N	ACTIF	2026-09-19 06:37:06.503891	2026-10-21 15:20:01.951293	2026-10-21 15:22:25.868682
8	synthetic-7bc07316-ef38-4222-876f-9c38d6eb636e@example.invalid	\N	\N	Rakoto	Aina	000000000	29	\N	\N	ACTIF	2026-05-16 16:14:55.971	\N	\N
9	synthetic-a644d2c6-f8c5-40b9-80a4-996f1d095e16@example.invalid	\N	\N	Rasoanaivo	Fara	000000000	20	\N	\N	ACTIF	2026-05-21 16:14:55.971	\N	\N
10	synthetic-6c07b065-43bf-4c55-bbcc-8e54a0165bc9@example.invalid	\N	\N	Randria	Nomena	000000000	30	\N	\N	ACTIF	2026-09-28 16:14:55.971	\N	\N
11	synthetic-8b5b6f1a-16da-49a8-901c-456cca7a4472@example.invalid	\N	\N	Raveloson	Tahina	000000000	31	\N	\N	ACTIF	2026-05-10 16:14:55.971	\N	\N
12	synthetic-8cf09b75-3fc3-4ea4-9926-c569ce45c7cd@example.invalid	\N	\N	Rasoanaivo	Miora	000000000	25	\N	\N	ACTIF	2026-05-22 16:14:55.971	\N	\N
13	synthetic-4a317a0a-03c8-4f93-8a43-66f344c060c7@example.invalid	\N	\N	Rasoanaivo	Lova	000000000	18	\N	\N	ACTIF	2026-06-05 16:14:55.971	\N	\N
14	synthetic-f341eafd-4a0e-4d32-9584-982f7aaea7ba@example.invalid	\N	\N	Randria	Hery	000000000	39	\N	\N	ACTIF	2026-08-23 16:14:55.971	\N	\N
15	synthetic-5c289326-4c0d-486b-8182-90555e568990@example.invalid	\N	\N	Razafy	Lova	000000000	30	\N	\N	ACTIF	2026-08-21 16:14:55.971	\N	\N
16	synthetic-b3ec4b16-2015-4b97-8451-5d2fee2ed731@example.invalid	\N	\N	Razafy	Mialy	000000000	32	\N	\N	ACTIF	2026-06-06 16:14:55.971	\N	\N
17	synthetic-336fef65-8599-41a3-b4cf-ccd9d52ce9b0@example.invalid	\N	\N	Raveloson	Hery	000000000	18	\N	\N	ACTIF	2026-08-24 16:14:55.971	\N	\N
18	synthetic-9a9afc0e-8f5d-4382-8a9b-d7c020b0389f@example.invalid	\N	\N	Raveloson	Tahina	000000000	24	\N	\N	ACTIF	2026-08-17 16:17:31.29	\N	\N
19	synthetic-f869283a-e6b2-4f7d-a56c-1385e6847a44@example.invalid	\N	\N	Razafy	Miora	000000000	37	\N	\N	ACTIF	2026-07-15 16:17:31.29	\N	\N
20	synthetic-015710e3-e865-413f-8bc0-f10ca5b94c68@example.invalid	\N	\N	Rasoanaivo	Fara	000000000	31	\N	\N	ACTIF	2026-09-15 16:17:31.29	\N	\N
21	synthetic-9adfe0b8-1817-4045-a089-cbef65384c13@example.invalid	\N	\N	Razafy	Soa	000000000	24	\N	\N	ACTIF	2026-07-16 16:17:31.29	\N	\N
22	synthetic-98669a86-d9bd-40bf-a9f9-a4f8c8969176@example.invalid	\N	\N	Randria	Miora	000000000	18	\N	\N	ACTIF	2026-08-08 16:17:31.29	\N	\N
23	synthetic-9945ff7d-6f2c-4e80-98ac-9af48604dd78@example.invalid	\N	\N	Razafy	Tiana	000000000	22	\N	\N	ACTIF	2026-05-18 16:17:31.29	\N	\N
24	synthetic-e394fb08-9af9-4e75-883b-9ea5d37f694b@example.invalid	\N	\N	Rabe	Miora	000000000	39	\N	\N	ACTIF	2026-06-18 16:17:31.29	\N	\N
25	synthetic-fac99716-61b6-436a-9f63-5fc414c4c135@example.invalid	\N	\N	Raveloson	Tahina	000000000	23	\N	\N	ACTIF	2026-06-06 16:17:31.29	\N	\N
26	synthetic-514d5b17-36f2-4175-a578-b972b1bf7df9@example.invalid	\N	\N	Rasoanaivo	Tiana	000000000	32	\N	\N	ACTIF	2026-06-22 16:17:31.29	\N	\N
27	synthetic-b8d8cc05-31a4-46b3-868d-9835e25d7388@example.invalid	\N	\N	Ramanantsoa	Miora	000000000	24	\N	\N	ACTIF	2026-04-26 16:17:31.29	\N	\N
28	synthetic-852c04b9-cee3-4597-80de-410c3c269f96@example.invalid	\N	\N	Rasoanaivo	Hery	000000000	21	\N	\N	ACTIF	2026-04-29 16:17:31.29	\N	\N
29	synthetic-8f8f967c-f81e-4c73-839c-814b5b2eaa95@example.invalid	\N	\N	Ramanantsoa	Miora	000000000	22	\N	\N	ACTIF	2026-07-12 16:17:31.29	\N	\N
30	synthetic-8bcbd661-3573-4491-ba68-770fd32362c4@example.invalid	\N	\N	Raveloson	Aina	000000000	36	\N	\N	ACTIF	2026-06-19 16:17:31.29	\N	\N
31	synthetic-018fbf99-9f92-431f-8a18-8496ba72036e@example.invalid	\N	\N	Raveloson	Tiana	000000000	31	\N	\N	ACTIF	2026-08-01 16:17:31.29	\N	\N
32	synthetic-b3ac0521-3785-4961-bf77-aca09ce45742@example.invalid	\N	\N	Ramanantsoa	Fara	000000000	23	\N	\N	ACTIF	2026-05-03 16:17:31.29	\N	\N
33	synthetic-93f1833f-e851-4bc4-9076-872a90009fa6@example.invalid	\N	\N	Andria	Mialy	000000000	28	\N	\N	ACTIF	2026-07-30 16:17:31.29	\N	\N
34	synthetic-9c32258b-dcb4-4de8-bdbc-d0edf07dd4f2@example.invalid	\N	\N	Rasoanaivo	Hery	000000000	36	\N	\N	ACTIF	2026-05-24 16:17:31.29	\N	\N
35	synthetic-05fd9b2c-0848-4314-952a-483ac3bae98b@example.invalid	\N	\N	Raveloson	Aina	000000000	30	\N	\N	ACTIF	2026-08-02 16:17:31.29	\N	\N
36	synthetic-f310c886-3de2-46f0-a7bd-19dc5f41f689@example.invalid	\N	\N	Rakoto	Hery	000000000	24	\N	\N	ACTIF	2026-10-08 16:17:31.29	\N	\N
37	synthetic-dbcfd2c0-80e6-4b16-908b-6898ae7252e1@example.invalid	\N	\N	Ramanantsoa	Hery	000000000	26	\N	\N	ACTIF	2026-07-24 16:17:31.29	\N	\N
38	synthetic-1522ff31-5374-47f5-8bc2-e5feadd2189d@example.invalid	\N	\N	Randria	Tahina	000000000	37	\N	\N	ACTIF	2026-05-13 16:17:31.29	\N	\N
39	synthetic-d5d3fcc9-4a9e-4747-b1de-6880efd6f377@example.invalid	\N	\N	Rakoto	Mialy	000000000	32	\N	\N	ACTIF	2026-10-05 16:17:31.29	\N	\N
40	synthetic-4b097dc2-e88a-4088-be38-938222bfc964@example.invalid	\N	\N	Ramanantsoa	Tahina	000000000	28	\N	\N	ACTIF	2026-05-01 16:17:31.29	\N	\N
41	synthetic-30575bfa-8921-4cbe-8bbb-5a0c42f3fc60@example.invalid	\N	\N	Razafy	Hery	000000000	36	\N	\N	ACTIF	2026-06-06 16:17:31.29	\N	\N
42	synthetic-ed80bb4f-78ed-45fd-b76e-e30372b864e9@example.invalid	\N	\N	Raveloson	Miora	000000000	27	\N	\N	ACTIF	2026-09-17 16:17:31.29	\N	\N
43	synthetic-907a72b5-cd89-4252-869a-c935b8a9d0ea@example.invalid	\N	\N	Rabe	Nomena	000000000	23	\N	\N	ACTIF	2026-09-18 16:17:31.29	\N	\N
44	synthetic-578c0b9a-1270-4bea-898b-768935843406@example.invalid	\N	\N	Rasoanaivo	Tahina	000000000	29	\N	\N	ACTIF	2026-08-04 16:17:31.29	\N	\N
45	synthetic-39ba5533-2c5e-44ed-a60f-57bdfed48c5c@example.invalid	\N	\N	Rasoanaivo	Lova	000000000	25	\N	\N	ACTIF	2026-06-11 16:17:31.29	\N	\N
46	synthetic-c73ffafa-68de-40b1-b2a1-74f1651789c1@example.invalid	\N	\N	Andria	Soa	000000000	22	\N	\N	ACTIF	2026-06-02 16:18:04.531	\N	\N
47	synthetic-56d5f5d0-c49e-40cd-aa15-b56f12ca9a05@example.invalid	\N	\N	Raveloson	Miora	000000000	23	\N	\N	ACTIF	2026-08-11 16:18:04.531	\N	\N
48	synthetic-b5fe14d6-6615-43e9-b3e9-10af1fa01918@example.invalid	\N	\N	Rasoanaivo	Aina	000000000	36	\N	\N	ACTIF	2026-05-27 16:18:04.531	\N	\N
49	synthetic-d3d9967e-1a37-49ec-93be-6a52bc5c5f63@example.invalid	\N	\N	Rasoanaivo	Tiana	000000000	30	\N	\N	ACTIF	2026-07-26 16:18:04.531	\N	\N
50	synthetic-16066f2a-9146-4ecf-ae28-86ddda0dcb90@example.invalid	\N	\N	Andria	Mialy	000000000	39	\N	\N	ACTIF	2026-08-20 16:18:04.531	\N	\N
51	synthetic-cd67d3f1-c0c8-4b27-ae59-3e2849439564@example.invalid	\N	\N	Rasoanaivo	Nomena	000000000	29	\N	\N	ACTIF	2026-07-06 16:18:04.531	\N	\N
52	synthetic-848ed68c-37c7-41e7-8dda-fb7d2118f8e0@example.invalid	\N	\N	Rabe	Lova	000000000	34	\N	\N	ACTIF	2026-08-29 16:18:04.531	\N	\N
53	synthetic-71921398-e22d-47e0-b0d8-347d3294462f@example.invalid	\N	\N	Rakoto	Tiana	000000000	36	\N	\N	ACTIF	2026-10-14 16:18:04.531	\N	\N
54	synthetic-f46cc6ac-bf5d-4755-a57e-b93fc550226d@example.invalid	\N	\N	Ramanantsoa	Tahina	000000000	18	\N	\N	ACTIF	2026-07-30 16:18:04.531	\N	\N
55	synthetic-da9d9d6a-e497-4d15-84f8-ac66e416dcb0@example.invalid	\N	\N	Rakoto	Nomena	000000000	23	\N	\N	ACTIF	2026-07-10 16:18:04.531	\N	\N
56	synthetic-28d42104-cb78-4ed5-9a19-b799f56d7e01@example.invalid	\N	\N	Andria	Fara	000000000	18	\N	\N	ACTIF	2026-09-03 16:18:04.531	\N	\N
57	synthetic-c0b157c6-fca6-4579-8b0f-b5b18ab31781@example.invalid	\N	\N	Razafy	Tahina	000000000	36	\N	\N	ACTIF	2026-07-05 16:18:04.531	\N	\N
58	synthetic-d31f1a82-8d4f-44d8-a687-52a77cfde6b8@example.invalid	\N	\N	Randria	Miora	000000000	33	\N	\N	ACTIF	2026-10-01 16:18:04.531	\N	\N
59	synthetic-8a6c8470-328e-4d1b-8104-6be1cf620e72@example.invalid	\N	\N	Raveloson	Aina	000000000	38	\N	\N	ACTIF	2026-09-19 16:18:26.505	\N	\N
60	synthetic-cc1f7b58-dc96-4ef5-977e-2a96ffcfdc8d@example.invalid	\N	\N	Ramanantsoa	Soa	000000000	21	\N	\N	ACTIF	2026-07-18 16:18:26.505	\N	\N
61	synthetic-bd27ae42-0c8d-4688-aa49-4b8417791587@example.invalid	\N	\N	Rakoto	Miora	000000000	31	\N	\N	ACTIF	2026-07-23 16:18:26.505	\N	\N
62	synthetic-8a31970a-d31c-4f55-b139-88f16f55b368@example.invalid	\N	\N	Rasoanaivo	Soa	000000000	40	\N	\N	ACTIF	2026-07-05 16:18:26.505	\N	\N
63	synthetic-50ab7eb3-99d5-42c4-96bb-ce8f4075f250@example.invalid	\N	\N	Rabe	Lova	000000000	25	\N	\N	ACTIF	2026-05-12 16:18:26.505	\N	\N
64	synthetic-5db9022b-3199-4dd7-98dc-5b38ed182327@example.invalid	\N	\N	Rabe	Aina	000000000	33	\N	\N	ACTIF	2026-10-16 16:18:26.505	\N	\N
65	synthetic-354fd17b-02f6-440a-be4a-7adf05e23ff6@example.invalid	\N	\N	Andria	Aina	000000000	19	\N	\N	ACTIF	2026-07-09 16:18:26.505	\N	\N
66	synthetic-ce682c75-c250-4024-9170-ce31f6a73f39@example.invalid	\N	\N	Rabe	Fara	000000000	30	\N	\N	ACTIF	2026-09-25 16:18:26.505	\N	\N
67	synthetic-1b28996a-7402-44fd-9840-2e5802b103df@example.invalid	\N	\N	Andria	Soa	000000000	25	\N	\N	ACTIF	2026-08-28 16:19:20.463	\N	\N
68	synthetic-27a966f0-d5ee-43fe-a54a-9339c6f7ecc9@example.invalid	\N	\N	Rasoanaivo	Lova	000000000	35	\N	\N	ACTIF	2026-05-20 16:19:20.463	\N	\N
69	synthetic-a77cfcef-8681-4feb-8ee5-e63ad8836159@example.invalid	\N	\N	Rakoto	Mialy	000000000	38	\N	\N	ACTIF	2026-09-20 16:19:20.463	\N	\N
70	synthetic-b4466fc6-bd27-4acb-a78b-e882f9c6720c@example.invalid	\N	\N	Rakoto	Miora	000000000	23	\N	\N	ACTIF	2026-06-01 16:19:20.463	\N	\N
71	synthetic-67729bac-d2bf-4204-8abc-6945316016f5@example.invalid	\N	\N	Andria	Fara	000000000	19	\N	\N	ACTIF	2026-05-04 16:19:20.463	\N	\N
72	synthetic-098bfdd1-0b91-40a4-94ce-9f38802ab6e6@example.invalid	\N	\N	Rasoanaivo	Mialy	000000000	25	\N	\N	ACTIF	2026-07-18 16:19:20.463	\N	\N
73	synthetic-90756004-4b45-4dfc-b707-a2cb8c6c53c1@example.invalid	\N	\N	Randria	Lova	000000000	36	\N	\N	ACTIF	2026-07-23 16:19:20.463	\N	\N
74	synthetic-c9362a6f-9ca8-40a9-8655-257221167613@example.invalid	\N	\N	Rakoto	Miora	000000000	36	\N	\N	ACTIF	2026-06-27 16:19:20.463	\N	\N
75	synthetic-f524b163-2916-4454-b14d-14b120bbb9f2@example.invalid	\N	\N	Rasoanaivo	Aina	000000000	27	\N	\N	ACTIF	2026-08-15 16:19:20.463	\N	\N
76	synthetic-3285e278-a67d-4557-9a3d-24e4902684b1@example.invalid	\N	\N	Ramanantsoa	Tahina	000000000	40	\N	\N	ACTIF	2026-04-29 16:19:20.463	\N	\N
77	synthetic-5f518ca1-2a2a-4013-ab63-92042134b6e7@example.invalid	\N	\N	Raveloson	Mialy	000000000	38	\N	\N	ACTIF	2026-06-13 16:19:20.463	\N	\N
78	synthetic-c32c91de-7531-420c-af69-266a99e73c74@example.invalid	\N	\N	Andria	Tiana	000000000	29	\N	\N	ACTIF	2026-10-18 16:19:20.463	\N	\N
79	synthetic-bb845778-8117-4116-9baf-ea54fb674288@example.invalid	\N	\N	Randria	Lova	000000000	38	\N	\N	ACTIF	2026-10-20 16:19:20.463	\N	\N
80	synthetic-89f9c127-4562-4ce1-8551-a3a71b157487@example.invalid	\N	\N	Rakoto	Tahina	000000000	22	\N	\N	ACTIF	2026-05-17 16:19:20.463	\N	\N
81	synthetic-dcc8b19e-95e1-4260-aacb-2a8e25104a24@example.invalid	\N	\N	Andria	Soa	000000000	34	\N	\N	ACTIF	2026-10-13 16:19:20.463	\N	\N
82	synthetic-ee23d326-cf1b-4ffe-8faf-67d8f3283e69@example.invalid	\N	\N	Randria	Tiana	000000000	20	\N	\N	ACTIF	2026-08-09 16:19:20.463	\N	\N
83	synthetic-6a9e2a4e-2977-4c3b-a017-ad15276bfc84@example.invalid	\N	\N	Ramanantsoa	Nomena	000000000	22	\N	\N	ACTIF	2026-09-06 16:19:20.463	\N	\N
84	synthetic-0b764eb8-4a9e-464c-b736-59ebc8e0719a@example.invalid	\N	\N	Rasoanaivo	Miora	000000000	30	\N	\N	ACTIF	2026-08-05 16:19:20.463	\N	\N
85	synthetic-f5008c77-9382-409d-9bd7-4ab1ca3f5fbe@example.invalid	\N	\N	Razafy	Soa	000000000	35	\N	\N	ACTIF	2026-07-20 16:19:20.463	\N	\N
86	synthetic-26c33563-3cc6-4150-9e69-8dbf179e2542@example.invalid	\N	\N	Andria	Mialy	000000000	22	\N	\N	ACTIF	2026-05-22 16:19:20.463	\N	\N
87	synthetic-67d7728b-f598-4437-9748-5f45a3864e74@example.invalid	\N	\N	Rakoto	Aina	000000000	33	\N	\N	ACTIF	2026-09-10 16:19:47.584	\N	\N
88	synthetic-0b9c6254-c6ac-4e18-a2f6-879c66251dec@example.invalid	\N	\N	Rasoanaivo	Tiana	000000000	31	\N	\N	ACTIF	2026-09-25 16:19:47.584	\N	\N
89	synthetic-8405366e-8aa2-4275-9a40-968aa1c14bc8@example.invalid	\N	\N	Raveloson	Aina	000000000	30	\N	\N	ACTIF	2026-07-30 16:19:47.584	\N	\N
90	synthetic-31d77133-7670-4755-92f6-29c2431f686f@example.invalid	\N	\N	Ramanantsoa	Mialy	000000000	20	\N	\N	ACTIF	2026-09-13 16:19:47.584	\N	\N
91	synthetic-a626f55d-87cb-419d-af85-b1c4ab728a97@example.invalid	\N	\N	Randria	Miora	000000000	39	\N	\N	ACTIF	2026-07-14 16:19:47.584	\N	\N
92	synthetic-28035a1c-7008-43c4-9d1d-71face76bc37@example.invalid	\N	\N	Rakoto	Nomena	000000000	21	\N	\N	ACTIF	2026-09-06 16:19:47.584	\N	\N
93	synthetic-05d97dd9-5e8b-4eb8-a4db-5dc4e3fb2e09@example.invalid	\N	\N	Rabe	Tiana	000000000	27	\N	\N	ACTIF	2026-07-06 16:19:47.584	\N	\N
94	synthetic-0622dcda-a540-4946-a0c0-2308f302a71c@example.invalid	\N	\N	Razafy	Aina	000000000	36	\N	\N	ACTIF	2026-09-03 16:19:47.584	\N	\N
95	synthetic-917b606d-4bac-4887-a6c9-fd435d824055@example.invalid	\N	\N	Andria	Hery	000000000	28	\N	\N	ACTIF	2026-09-10 16:19:47.584	\N	\N
96	synthetic-244e647f-fdcc-4c6b-abbe-86206bdf5d79@example.invalid	\N	\N	Rakoto	Nomena	000000000	24	\N	\N	ACTIF	2026-04-27 16:19:47.584	\N	\N
97	synthetic-5c29205b-148c-409b-9af6-f49959f16549@example.invalid	\N	\N	Randria	Soa	000000000	26	\N	\N	ACTIF	2026-08-08 16:19:47.584	\N	\N
98	synthetic-1f1b381a-a026-4d63-8125-9e94c588c651@example.invalid	\N	\N	Randria	Nomena	000000000	31	\N	\N	ACTIF	2026-10-07 16:19:47.584	\N	\N
99	synthetic-fd75b613-cd00-4920-8250-6ae92233f04b@example.invalid	\N	\N	Rakoto	Aina	000000000	38	\N	\N	ACTIF	2026-06-28 16:19:47.584	\N	\N
100	synthetic-61861e00-0060-40c5-b8f9-15817163d78a@example.invalid	\N	\N	Andria	Tiana	000000000	25	\N	\N	ACTIF	2026-05-15 16:19:47.584	\N	\N
101	synthetic-df0b3124-73d6-43c6-aae4-e7e6ea89e34e@example.invalid	\N	\N	Razafy	Aina	000000000	19	\N	\N	ACTIF	2026-05-31 16:19:47.584	\N	\N
102	synthetic-d550040f-a9c6-4b4c-83c9-aed5cde469ec@example.invalid	\N	\N	Raveloson	Fara	000000000	19	\N	\N	ACTIF	2026-05-31 16:19:47.584	\N	\N
103	synthetic-7f25e9d3-b8f2-45b9-8bbb-37f41dcb800d@example.invalid	\N	\N	Rabe	Tiana	000000000	24	\N	\N	ACTIF	2026-07-29 16:19:47.584	\N	\N
\.


--
-- Name: administrateur_id_administrateur_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.administrateur_id_administrateur_seq', 1, true);


--
-- Name: apprenant_id_apprenant_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.apprenant_id_apprenant_seq', 101, true);


--
-- Name: candidat_id_candidat_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.candidat_id_candidat_seq', 573, true);


--
-- Name: certification_id_certification_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certification_id_certification_seq', 1, false);


--
-- Name: evaluation_choix_id_choix_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_choix_id_choix_seq', 72, true);


--
-- Name: evaluation_id_evaluation_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_id_evaluation_seq', 4, true);


--
-- Name: evaluation_question_id_question_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_question_id_question_seq', 30, true);


--
-- Name: evaluation_reponse_id_reponse_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_reponse_id_reponse_seq', 45, true);


--
-- Name: evaluation_sujet_id_evaluation_sujet_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_sujet_id_evaluation_sujet_seq', 6, true);


--
-- Name: evaluation_tentative_id_tentative_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluation_tentative_id_tentative_seq', 10, true);


--
-- Name: formateur_id_formateur_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formateur_id_formateur_seq', 2, true);


--
-- Name: formation_avis_id_avis_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formation_avis_id_avis_seq', 1, true);


--
-- Name: formation_id_formation_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formation_id_formation_seq', 11, true);


--
-- Name: forum_id_forum_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.forum_id_forum_seq', 8, true);


--
-- Name: inscription_id_inscription_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inscription_id_inscription_seq', 576, true);


--
-- Name: message_id_message_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.message_id_message_seq', 7, true);


--
-- Name: presence_id_presence_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.presence_id_presence_seq', 74421, true);


--
-- Name: responsable_id_responsable_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.responsable_id_responsable_seq', 1, true);


--
-- Name: seance_id_seance_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.seance_id_seance_seq', 49, true);


--
-- Name: support_cours_id_support_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.support_cours_id_support_seq', 1, false);


--
-- Name: utilisateur_id_utilisateur_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.utilisateur_id_utilisateur_seq', 103, true);


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

\unrestrict v0BobTHfqahPo1Ngi1RNw19iOl1NjQYuyxyMZoUblepQn6LaOqIZVf3RtJKYhWy

