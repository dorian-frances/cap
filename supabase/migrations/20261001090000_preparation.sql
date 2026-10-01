-- Préparation des démarrages (P12) : vérifications cochées par item, délais par projet.
-- prep : { "business"?: { "on": "AAAA-MM-JJ", "by": email }, "tech"?: { ... } }
--   business = conception métier + BPMN faite, tech = conception technique + découpe en tickets faite.
alter table public.items add column prep jsonb not null default '{}'::jsonb;
-- Jours ouvrés avant le démarrage d'une tâche à partir desquels chaque vérification est due.
alter table public.projects add column business_lead_days int not null default 5 check (business_lead_days between 0 and 60);
alter table public.projects add column tech_lead_days int not null default 3 check (tech_lead_days between 0 and 60);
