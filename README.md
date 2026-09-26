# Cap

Macro-plan d'équipe : les barres ne sont pas dessinées, elles sont calculées à partir des JH, des owners et de leur disponibilité.
Le pourquoi de chaque fonctionnalité : [PROBLEMS.md](PROBLEMS.md).

Stack : Next.js (tout en client components) + Supabase (Postgres, Auth, RLS). Déploiement : Vercel.

## Code

| Fichier | Rôle |
|---|---|
| `src/lib/plan.ts` | Domaine : types + calcul du planning (fonctions pures) |
| `src/components/Timeline.tsx` | Timeline (vues Items / Équipe), partagée édition + consultation |
| `src/app/page.tsx` | Connexion + liste des projets |
| `src/app/p/[id]/page.tsx` | Édition d'un projet |
| `src/app/share/[token]/page.tsx` | Consultation publique (lecture seule, sans compte) |
| `supabase/migrations/` | Schéma, RLS, fonctions `create_project` et `get_shared_project` |

## Dev local

```bash
npm install
supabase start          # Docker requis ; applique les migrations
cp .env.example .env.local   # URL http://127.0.0.1:54321 + clé "Publishable" affichée par supabase start
npm run dev
```

Tests :

```bash
npm test          # calcul du planning
npm run test:db   # droits d'accès (RLS), nécessite supabase start
```

Compte de test local (créé via « Créer un compte ») : `pm@cap.test` / `password123`.

## Déploiement

1. **Supabase** : créer un projet sur supabase.com, puis depuis ce dossier :
   ```bash
   supabase login
   supabase link --project-ref <ref-du-projet>
   supabase db push
   ```
2. **Auth Supabase** (Authentication > URL Configuration) : mettre `Site URL` = l'URL Vercel.
   Par défaut la confirmation d'email est activée : soit la garder (le SMTP intégré est limité à quelques emails/heure), soit la désactiver dans Authentication > Providers > Email.
3. **Vercel** : importer le repo GitHub, puis ajouter les variables d'environnement
   `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase > Project Settings > API Keys). Déployer.
