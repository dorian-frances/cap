# Cap

Macro-plan d'équipe : les barres ne sont pas dessinées, elles sont calculées à partir des JH, des owners et de leur disponibilité.
Le pourquoi de chaque fonctionnalité : [PROBLEMS.md](PROBLEMS.md).

Stack : Next.js (tout en client components) + Supabase (Postgres, Auth, RLS). Déploiement : Vercel.

## Code

| Fichier | Rôle |
|---|---|
| `src/lib/plan.ts` | Domaine : types + calcul du planning (fonctions pures, testées) |
| `src/lib/axis.ts`, `calendar.ts` | Échelle de temps, grille du sélecteur de dates (testée) |
| `src/lib/store.ts` | État d'un projet : chargement, écritures optimistes, annulation |
| `src/lib/useStored.ts` | `useState` mémorisé dans le localStorage (préférences d'affichage) |
| `src/app/p/[id]/page.tsx` | Page projet : assemblage, clavier, sélection, ⌘K |
| `src/app/share/[token]/page.tsx` | Vue client en lecture seule (sans compte) |
| `supabase/migrations/` | Schéma, RLS, `create_project`, `get_shared_project`, `project_editors` |

### Design system (`src/components/`, atomic design)

| Niveau | Contenu | Règle |
|---|---|---|
| `tokens.ts` + `globals.css` (`@theme`) | Couleurs (neutres stone, accent unique), statuts, ombres, courbes et animations | Aucune couleur ou ombre en dur ailleurs |
| `atoms/` | Button, Input, Kbd, Avatar, StatusIcon, Diamond, Chip, Switch, Chevron, Logo, Swatch | Aucune logique métier, aucun import d'un niveau supérieur |
| `molecules/` | Menu, Popover, Dialog/ConfirmDialog, Tooltip, IconButton, Select, SegmentedControl, Calendar, DatePicker/DateRangePicker, SidePanel, GanttBar, TimeAxis, Toast, Field… | Composent des atomes, génériques (reçoivent des données, pas le store) |
| `organisms/` | Timeline, DashboardView, ItemPanel, PersonPanel, TeamView, vues Jalons/Absences/Paramètres, ItemPicker, CommandPalette, Sidebar, barres d'outils | Connaissent le domaine et le store |
| `templates/` | AppShell, ContentPage | Mise en page, sans données |

Mouvement : popups et dialogues en fondu + échelle depuis leur ancre, panneaux latéraux qui glissent (entrée et sortie via `usePresence`), barres qui glissent vers leurs nouvelles dates quand le plan est recalculé. Tout est coupé si le système demande moins d'animations (`prefers-reduced-motion`).

Thèmes : clair, sombre « cendré » (gris bleutés doux) ou système, au choix dans le menu du compte (ou la palette). Le sombre redéfinit les échelles Tailwind sous `[data-theme="dark"]` dans `globals.css` : les composants gardent leurs classes (`bg-surface`, `text-stone-500`…) et les couleurs calculées (statuts, hachures, palette des personnes) passent par des variables CSS. Un script dans `<head>` applique le thème avant le premier rendu.

UI : Tailwind v4, `@base-ui/react` (primitives accessibles), `lucide-react` (icônes).

## Raccourcis

| Touche | Action |
|---|---|
| `⌘K` | Palette de commandes |
| `C` | Nouvel item |
| `J` / `K` ou `↑` / `↓` | Item suivant / précédent (`⇧` pour étendre la sélection) |
| `Entrée` / `Espace` | Ouvrir le panneau |
| `S` `A` `E` `M` | Statut, owners, estimation, jalon cible |
| `S` puis `2` / `3` | Démarrer / terminer (date du jour par défaut, flèches + `Entrée` pour une autre date) |
| `R` | Renommer |
| `Tab` / `⇧Tab` | Imbriquer / désimbriquer |
| `⌥↑` / `⌥↓` | Monter / descendre en priorité |
| `←` / `→` | Replier / déplier |
| `X` | Ajouter à la sélection |
| `⌫` puis `⌘Z` | Supprimer, annuler |
| `1` `2` `3` | Zoom semaine / mois / trimestre |
| `T` | Revenir à aujourd'hui |
| `[` | Réduire / déplier la barre latérale |
| `G` puis `D` `T` `E` `J` `A` | Aller à Dashboard, Timeline, Équipe, Jalons, Absences |

## Dev local

```bash
npm install
supabase start          # Docker requis ; applique les migrations
cp .env.example .env.local   # URL http://127.0.0.1:54321 + clé "Publishable" affichée par supabase start
npm run dev
```

Google n'est pas configuré en local : la page de connexion propose « Connexion locale (dev) » (email + mot de passe), visible uniquement en `npm run dev`.
Compte de test local : `pm@cap.test` / `password123`.

Tests :

```bash
npm test          # calcul du planning, calendrier
npm run test:db   # droits d'accès (RLS), nécessite supabase start
```

## Déploiement

1. **Supabase** : créer un projet sur supabase.com, puis depuis ce dossier :
   ```bash
   supabase login
   supabase link
   supabase db push
   ```
2. **Google Cloud Console** (APIs & Services > Credentials) : créer un « OAuth client ID » de type *Web application*.
   - Authorized redirect URI : `https://<ref>.supabase.co/auth/v1/callback`
   - Écran de consentement : type *Internal* si tout le monde est sur le même Google Workspace, sinon *External*.
3. **Supabase > Authentication > Sign In / Providers > Google** : activer, coller le Client ID et le Client Secret.
4. **Supabase > Authentication > URL Configuration** : `Site URL` = l'URL Vercel, et ajouter l'URL Vercel dans *Redirect URLs*.
5. **Vercel** : variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (type Config), puis redéployer.
