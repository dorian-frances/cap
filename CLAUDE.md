# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Projet

Cap : macro-plan d'équipe où les barres de Gantt ne sont pas dessinées mais **calculées** (JH, owners, disponibilité, absences, allocations). Code, commentaires, commits et UI en français.

`PROBLEMS.md` fait foi : chaque fonctionnalité se rattache à un problème `P#`, et les règles de calcul du planning y sont décrites. Un besoin qui change → mettre à jour `PROBLEMS.md` d'abord, le code ensuite. `README.md` contient la table des fichiers, le design system et les raccourcis clavier (à tenir à jour).

## Commandes

```bash
npm run dev                              # nécessite `supabase start` (Docker) et .env.local
npm run build
npm run lint
npm test                                 # node --test src/lib/*.test.ts (TS exécuté nativement par Node 22, pas de framework)
node --test src/lib/plan.test.ts         # un seul fichier
node --test --test-name-pattern="owners" src/lib/plan.test.ts   # un seul test
npm run test:db                          # RLS contre le Supabase local (supabase start requis)
supabase db push                         # appliquer les migrations sur le projet lié
```

Local : connexion « Connexion locale (dev) » avec `pm@cap.test` / `password123`.

## Architecture

- **Tout est client** : pas de server components ni d'API routes. Le navigateur parle directement à Supabase (`src/lib/supabase.ts`, clé publishable) ; la sécurité repose entièrement sur les RLS (`is_editor(project_id)`) dans `supabase/migrations/`.
- **Domaine pur** : `src/lib/plan.ts` contient les types (`Item`, `Person`, `Absence`, `Allocation`, `TagEntry`…) et `schedule(items, people, absences, start, today?)` qui produit le `Plan` (spans, attentes, charge, surcharges). Sans dépendance, testé dans `plan.test.ts` (les tests fixent `today` pour ne pas dépendre de la date d'exécution). Toute règle de calcul va ici, pas dans les composants.
- **Store** : `src/lib/store.ts` (`useProject`) charge un projet, applique les écritures de façon optimiste (`local` puis `write`), recharge l'état serveur en cas d'erreur et gère l'annulation. Les composants de niveau organism passent par lui, jamais par Supabase directement.
- **Pages** : `src/app/p/[id]/page.tsx` assemble tout (plan recalculé via `useMemo`, clavier, sélection, ⌘K). `src/app/share/[token]/page.tsx` est la vue client en lecture seule via la RPC `get_shared_project` (sans compte).
- **Item** unique et imbricable (`parent_id`, `position`, `type: feature | milestone`). Les champs souples (`allocations`, `tag_log`) sont en `jsonb` : on étend l'`Item` plutôt que de créer de nouvelles tables.
- **Schéma** : une nouvelle migration par changement dans `supabase/migrations/` (horodatée, commentée en tête), puis mettre à jour le type dans `plan.ts`, le défaut dans `store.addItem` si besoin, et `supabase/tests/rls.test.ts` si les droits changent.

## Design system (`src/components/`, atomic design)

- Dépendances à sens unique : `atoms` → `molecules` → `organisms` → `templates`. Atoms et molecules sont génériques (props, pas de store ni de logique métier) ; seuls les organisms connaissent le domaine et le store.
- Aucune couleur ni ombre en dur : tout passe par `tokens.ts` et `@theme` dans `globals.css`. Le thème sombre redéfinit les échelles Tailwind sous `[data-theme="dark"]` ; les couleurs calculées (statuts, hachures, couleurs des personnes) passent par des variables CSS.
- Primitives accessibles : `@base-ui/react` ; icônes : `lucide-react` ; Tailwind v4 ; `cx` (`src/lib/cx.ts`) pour les classes.
- Animations d'entrée/sortie via `usePresence`, toujours coupées sous `prefers-reduced-motion`.
- Nouveau raccourci clavier → l’ajouter au tableau du README.

## Conventions

- Style laconique : fonctions courtes, pas d'abstraction spéculative. Les simplifications volontaires sont marquées `ponytail:` avec leur limite (ex. `HORIZON` dans `plan.ts`).
- Dates en chaînes ISO `AAAA-MM-JJ`, calculs en jours UTC entiers via `toDay` / `toIso`.
