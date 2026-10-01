# Cap — Problèmes à résoudre

Cap est l'outil de macro-plan d'une équipe projet. Il remplace le Google Sheet où l'on dessine des barres à la main.

## Règle de construction

Chaque fonctionnalité se rattache à un problème `P#` de ce fichier. Pas de `P#`, pas de fonctionnalité.
Un problème qui disparaît ou change → on met à jour ce fichier d'abord, le code ensuite.

## Notion centrale : l'Item

Tout ce qu'on planifie est un **Item** (comme la Page dans Notion).

- **Imbricable** : un Item peut contenir des Items (epic → feature → …), sans niveau imposé.
- **Typé** : feature, jalon, risque… Le type décide des propriétés affichées.
- **Propriétés** : estimation (JH), owners, statut, dates… Extensibles sans migration.
- **Vues** : timeline, tableau, burn-up, vue client. Une fonctionnalité = une vue ou un calcul sur les Items, rarement un nouvel objet.

Deux axes autour des Items, qui ne sont pas des Items :

- **Temps** : périodes / sprints.
- **Équipe** : personnes et leur disponibilité.

Principe clé : **la barre n'est pas dessinée, elle est calculée** à partir des JH, des owners et de leur disponibilité.

## Règles de calcul

- **Durée** d'un Item = JH ÷ somme des disponibilités de ses owners. Les JH sont répartis entre les owners.
- **Enchaînement** : chaque owner traite ses Items dans l'ordre de priorité ; un Item démarre quand tous ses owners sont libres.
- **Disponibilité** : 100 % par défaut, moins les week-ends, les temps partiels, les absences saisies et la **part consacrée aux défauts** (réglée par personne, ex. 20 %). La part défauts est réservée en premier ; les allocations sur les tâches sont des parts du temps **total** (Hugues à 20 % de défauts : 80 % sur sa tâche = tout son temps restant) ; l'occupation affichée inclut les défauts.
- **Jours fériés** : non gérés automatiquement (des freelances travaillent certains fériés). On saisit une absence, éventuellement pour toute l'équipe d'un coup.
- **Dates réelles, pas de barre dessinée** : une tâche passe par trois états qui enregistrent chacun une date.
  - *À faire* : pas de date ; enchaînée par priorité, jamais avant aujourd'hui.
  - *En cours* : date de début réelle (aujourd'hui par défaut, modifiable). Fin prévue = début + JH sur la disponibilité des owners.
  - *Terminée* : date de fin réelle, saisissable a posteriori.
- **Tant qu'une tâche n'est pas terminée, elle est en cours** : si sa fin prévue est passée, elle se prolonge jusqu'à aujourd'hui (retard sur l'estimation, en ambre) et les tâches suivantes de ses owners glissent.
- **Allocation par personne** : chaque owner consacre une part de son temps à la tâche (« Alice 100 %, Bob 20 % en aide »), datée pour une tâche en cours (« 50 % à partir du 14 sept. », 0 % = en pause, visible sur la barre en rayures grises et « En pause » dans la liste). 100 % par défaut : on vise le one-piece flow. Le reste du temps va aux autres tâches, en parallèle.
- **Personne en aide** : une tâche attend ses owners à 100 % ; une personne à moins de 100 % donne ce qu'elle peut sans retarder le démarrage ni bloquer ses propres tâches.
- **Fin prévue = engagement** : date de début + JH à l'allocation du jour de démarrage, sur la disponibilité des owners. La fin de tâche sert de jalon : finir (ou prévoir de finir) après, c'est glisser.
- **Surcharge** : si les allocations d'une personne **plus sa part défauts** dépassent 100 % un jour donné (ex. 100 % sur une tâche + 20 % de défauts = 120 %), ses tâches n'avancent qu'avec le temps qui reste, et elle est signalée.
- **Faits avant priorités** : les tâches terminées puis en cours sont placées d'abord, les tâches à faire remplissent le temps libre restant.
- **Jalon client** : Item de type jalon, avec une date fixe saisie, affiché comme repère sur la timeline. Il ne pilote pas le calcul.
- **Pas de fin de projet** : le projet est continu, on raisonne en date de livraison par Item.

## Contexte

| | |
|---|---|
| Qui édite | La PM, le tech lead |
| Qui consulte | PM, devs, tech lead, manager projet, client |
| Périmètre | Un projet par équipe |
| Unité | Jours-Homme (JH) |
| Backlog | Créé dans Cap, pas de synchro |

## Problèmes

| # | Problème | Question | Priorité |
|---|---|---|---|
| P1 | Prévoir les livraisons | « Quand chaque Item sera-t-il livré, et avant ou après le jalon client ? » | **V1** |
| P2 | Charge vs capacité | « Avec les congés et temps partiels, qui fait quoi et ça tient ? » | **V1** |
| P7 | Communiquer | « Comment montrer l'état à tous, client compris, sans slide ? » | **V1** |
| P3 | Dérive de périmètre | « Qu'a-t-on ajouté/retiré, et combien ça a coûté en date ? » | Ensuite |
| P8 | Historique | « Pourquoi la date a bougé depuis le mois dernier ? » (nécessite des dates de référence figées ; couvre aussi « elle devait démarrer il y a une semaine ») | Ensuite |
| P10 | Suivre le réel | « Qu'est-ce qui est en retard aujourd'hui, de combien, et qu'est-ce que ça décale derrière ? » | **V1** |
| P11 | À planifier | « Qu'est-ce qui n'est pas encore planifiable, et pourquoi ? » | **V1** |
| P12 | Préparer les démarrages | « Ce qui démarre bientôt est-il prêt : conception métier, conception technique, dépendances levées ? » | **V1** |
| P4 | Estimé vs réel | « Nos estimations sont-elles fiables ? » (les dates réelles sont désormais enregistrées) | Ensuite |
| P5 | Arbitrer | « Pour tenir la date X, que coupe-t-on ? » | Ensuite |
| P6 | Jalons et dépendances | « Quels jalons sont à risque, qu'est-ce qui bloque quoi ? » | Ensuite |
| P9 | Double saisie | « Pourquoi maintenir le backlog à deux endroits ? » | Hors scope |

## Fiche fonctionnalité (modèle)

```
### <Nom>
- Problème : P#
- Pour qui : …
- Résolu quand : <critère observable>
```

## Fonctionnalités V1

### Timeline calculée
- Problème : P1
- Pour qui : PM, tech lead
- Résolu quand : modifier des JH, un owner ou une absence recale les dates sans rien redessiner.

### Items imbriqués et priorisés
- Problème : P1
- Pour qui : PM
- Résolu quand : on range features et sous-features ; l'ordre de la liste est l'ordre de priorité ; un parent affiche la somme des JH et l'enveloppe de ses enfants.

### Jalon client et retard
- Problème : P1
- Pour qui : PM, client
- Résolu quand : un Item rattaché à un jalon et qui finit après est signalé (⚠, contour rouge).

### Équipe, temps partiel, absences
- Problème : P2
- Pour qui : PM, tech lead
- Résolu quand : la vue Équipe montre qui fait quoi et quand, absences comprises ; une absence peut être posée pour toute l'équipe (jour férié).

### Lien de consultation
- Problème : P7
- Pour qui : devs, manager, client
- Résolu quand : n'importe qui avec le lien voit le plan à jour, sans compte et sans pouvoir le modifier ; le lien est régénérable.

### Éditeurs par email
- Problème : P7
- Pour qui : PM, tech lead
- Résolu quand : seuls les emails ajoutés au projet peuvent le modifier ; les Paramètres listent les éditeurs avec leur statut (« Invité·e », jamais connecté·e, ou « Connecté·e le … ») et permettent de retirer l'accès (après confirmation, sauf à soi-même).

### Dates réelles et retard sur l'estimation
- Problème : P10
- Pour qui : PM, tech lead, client (vue partagée)
- Résolu quand : « Démarrer » et « Terminer » enregistrent une date (modifiable, a posteriori) ; une tâche en cours dont la fin prévue est passée affiche « +n j » en ambre, se prolonge jusqu'à aujourd'hui et décale la suite de ses owners ; le filtre « En retard » les isole ; le panneau explique le glissement.

### Allocation datée et glissement
- Problème : P10, P2
- Pour qui : PM, tech lead
- Résolu quand : on déclare « X à 50 % sur cette tâche à partir du … » ; la tâche ralentit, les suivantes avancent en parallèle ; si elle finira après sa fin prévue, « Glissement prévu de n j » avec la cause (allocation réduite, surcharge partagée avec telle tâche).

### Alerte de surcharge
- Problème : P2
- Pour qui : PM, tech lead
- Résolu quand : une personne dont les allocations cumulées, défauts compris, dépassent 100 % est signalée (compteur sur « Équipe », badge « Surcharge », semaines en rouge avec les tâches en cause, détail dans sa fiche) ; sur la timeline, la tâche porte un badge « 120 % » ; son panneau détaille l'addition (« 100 % ici + 20 % défauts »), explique l'allongement et propose « Passer Hugues à 80 % ». Seule la surcharge d'aujourd'hui et à venir alerte : une surcharge passée est actée (elle se lit dans le glissement).

### Avenant (retard anticipé)
- Problème : P10, P2
- Pour qui : PM, tech lead
- Résolu quand : on ajoute « +2 JH, motif » à une tâche sans toucher à son estimation ; la tâche occupe ses owners d'autant plus longtemps et les tâches suivantes démarrent après ; la fin prévue reste celle de l'estimation, le surplus apparaît en hachures ambre avec « +n j », la colonne JH affiche « 3+2 j » et le panneau donne le motif.

### Couleur par personne
- Problème : P2
- Pour qui : toute l'équipe
- Résolu quand : chacun choisit sa couleur dans une palette de 12 depuis sa fiche ; une couleur déjà prise est grisée ; une nouvelle personne reçoit la première couleur libre ; en « Couleur : owner », on reconnaît chaque personne sans ambiguïté.

### Guide
- Problème : P7 (faire comprendre l'outil à qui arrive, sans présentation)
- Pour qui : tout nouvel utilisateur
- Résolu quand : une page « Guide » (barre latérale, palette) explique la mentalité (barres calculées, faits avant priorités, fin de tâche = engagement), les questions P1, P2, P7, P10, P11 avec un lien vers la vue qui y répond, la vie d'une tâche, la lecture de la timeline et les raccourcis.

### Thème sombre
- Problème : transverse (confort de lecture, usage prolongé)
- Pour qui : toute l'équipe
- Résolu quand : on choisit Clair, Sombre ou Système dans le menu du compte ; le sombre est cendré (pas noir), les contrastes de texte restent au niveau AA (texte secondaire ≥ 4,5:1), et toutes les vues, barres et hachures restent lisibles.

### Groupe « À planifier »
- Problème : P11
- Pour qui : PM
- Résolu quand : les tâches sans owner ou sans estimation sont regroupées en bas de la timeline avec leur raison ; un item tout juste créé reste à sa place tant qu'on le saisit ; il rejoint la liste dès qu'il est planifiable.

### Vue par date de début (escalier)
- Problème : P1, P7
- Pour qui : PM, client
- Résolu quand : une bascule « Priorité / Date de début » sur la timeline affiche les tâches à plat, triées par date de début (chemin du parent en préfixe) pour lire l'enchaînement en escalier ; dans cette vue on ne peut ni réordonner ni imbriquer (glisser, ⌥↑/⌥↓, Tab désactivés). La vue choisie, la couleur des barres et « Afficher les items faits » sont mémorisées sur le navigateur.

### Dashboard
- Problème : P12, P10, P6, P2
- Pour qui : PM, tech lead
- Résolu quand : une page « Dashboard » (barre latérale, `G` puis `D`) réunit ce qui demande une action, par ordre d'importance :
  - **Passe-t-on nos prochains jalons ?** (carte principale, à gauche des trois autres) : le prochain jalon en grand avec son verdict, puis les trois suivants. Vert : ça passe, avec la marge du dernier item rattaché. Ambre : marge d'une semaine ouvrée ou moins (ou un item rattaché non planifié). Rouge : un item finit après, avec le retard à rattraper pour lever l'alerte et les items en cause (+n j chacun).
  - **À vérifier avant démarrage** : les tâches qui démarrent dans les N jours ouvrés, avec deux vérifications cochables (conception métier + BPMN, conception technique + découpe en tickets). Chaque vérification est due à partir de son délai avant le démarrage, réglé dans les Paramètres (par défaut 5 et 3 jours ouvrés) ; due et pas cochée, elle est signalée. Cochée, elle garde la date et l'auteur (aussi dans le panneau de l'item).
  - **Dépendances et blocages à lever** : les tags actifs « Dépendance » et « Bloqué » des items non terminés, par date de début, avec leur raison, leur ancienneté et un bouton « Lever ».
  - **Dérives** : tâches en retard ou en glissement (+n j), personnes en surcharge.
  - Chaque item ouvre son panneau ; une section vide le dit (« Rien à lever »).
