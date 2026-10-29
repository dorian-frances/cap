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
- **Disponibilité** : 100 % par défaut, moins les week-ends, les temps partiels et les absences saisies. Pas de part réservée aux défauts.
- **Pas de charge par tâche** : un owner donne toute sa disponibilité à chaque tâche démarrée. Deux tâches en cours en parallèle avancent chacune comme si elle était seule (pas de ralentissement, pas de surcharge).
- **Jours fériés** : non gérés automatiquement (des freelances travaillent certains fériés). On saisit une absence, éventuellement pour toute l'équipe d'un coup.
- **Dates réelles, pas de barre dessinée** : une tâche passe par quatre états.
  - *À faire* : pas de date ; enchaînée par priorité, jamais avant aujourd'hui, dès que ses owners sont libres.
  - *En cours* : date de début réelle (aujourd'hui par défaut, modifiable, antérieure possible pour paralléliser). Fin prévue = début + JH sur la disponibilité des owners.
  - *Dev terminé* : date de fin du dev, saisissable a posteriori ; plus rien à faire en dev (owners libérés) mais pas en production (dépendance, recette…). Barre violette.
  - *Fait* : en production. Depuis « Dev terminé », la date de fin du dev est gardée ; sinon, date de fin saisie.
- **Tant qu'une tâche n'est pas terminée, elle est en cours** : si sa fin prévue est passée, elle se prolonge jusqu'à aujourd'hui (retard sur l'estimation, en ambre) et les tâches suivantes de ses owners glissent.
- **Fin prévue = engagement** : date de début + JH sur la disponibilité des owners. La fin de tâche sert de jalon : finir (ou prévoir de finir) après, c'est glisser.
- **Avenant** : JH ajoutés après l'estimation. Si la tâche est déjà en retard, l'avenant s'ajoute **après aujourd'hui**, en plus du retard (retard de 2 j + avenant de 1 JH = retard de 3 j).
- **Faits avant priorités** : les tâches au dev terminé puis en cours sont placées d'abord, les tâches à faire remplissent le temps libre restant.
- **Jalon client** : Item de type jalon (un Item peut en cibler plusieurs), avec une date fixe saisie, affiché comme repère sur la timeline. Il ne pilote pas le calcul.
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
- Résolu quand : un Item peut être rattaché à plusieurs jalons (touche M, cases à cocher) ; s'il finit après l'un d'eux, il est signalé (⚠, hachures rouges dès le plus proche jalon dépassé) et chaque jalon est jugé sur sa propre date.

### Équipe, temps partiel, absences
- Problème : P2
- Pour qui : PM, tech lead
- Résolu quand : la vue Équipe montre qui fait quoi et quand, absences comprises ; une absence peut être posée pour toute l'équipe (jour férié).

### Lien de consultation
- Problème : P7
- Pour qui : devs, manager, client
- Résolu quand : n'importe qui avec le lien voit le plan à jour, sans compte et sans pouvoir le modifier ; le lien est régénérable.

### Export Excel du macro-plan
- Problème : P7
- Pour qui : PM (macro-plan Excel envoyé au client ou à la direction, aujourd'hui recopié à la main)
- Résolu quand : « Copier pour Excel » (en-tête, ou la palette) copie le macro-plan, que la PM colle dans un onglet de son fichier Excel existant (SharePoint compris), sans remise en forme : une ligne par item dans l'ordre de priorité, titre indenté selon l'imbrication (parents en gras), JH (« 3+2 » avec avenant), owners, pastille de statut (grise à faire, orange en cours, verte terminé, rouge en retard : après un jalon ciblé ou après la fin prévue), début, fin, jalons ciblés, raison s'il n'est pas planifiable ; puis une colonne par semaine où la barre s'écrit en tirets, sans couleur (├ début, ─ en cours, ○ livraison prévue, ● livré, △ retard prévu, ▲ livré en retard) ; les tirets sont plus larges que la date d'en-tête, pour qu'ajuster la largeur des colonnes ne laisse pas de blancs. Au-dessus : la légende, les jalons (fond jaune, à partir de leur semaine, en escalier quand ils se chevauchent, en cellules fusionnées pour ne pas élargir les colonnes) et l'en-tête en bleu ; la semaine en cours est bordée de rouge.

### Éditeurs par email
- Problème : P7
- Pour qui : PM, tech lead
- Résolu quand : seuls les emails ajoutés au projet peuvent le modifier ; les Paramètres listent les éditeurs avec leur statut (« Invité·e », jamais connecté·e, ou « Connecté·e le … ») et permettent de retirer l'accès (après confirmation, sauf à soi-même).

### Dates réelles et retard sur l'estimation
- Problème : P10
- Pour qui : PM, tech lead, client (vue partagée)
- Résolu quand : « Démarrer », « Dev terminé » et « Terminer » enregistrent une date (modifiable, a posteriori) ; une tâche en cours dont la fin prévue est passée affiche « +n j » en ambre, se prolonge jusqu'à aujourd'hui et décale la suite de ses owners ; le filtre « En retard » les isole ; le panneau explique le glissement.

### Avenant (retard anticipé)
- Problème : P10, P2
- Pour qui : PM, tech lead
- Résolu quand : on ajoute « +2 JH, motif » à une tâche sans toucher à son estimation ; la tâche occupe ses owners d'autant plus longtemps et les tâches suivantes démarrent après ; déjà en retard, l'avenant s'ajoute au retard au lieu de s'y fondre ; la fin prévue reste celle de l'estimation, le surplus apparaît en hachures ambre avec « +n j », la colonne JH affiche « 3+2 j » et le panneau donne le motif.

### Couleur par personne
- Problème : P2
- Pour qui : toute l'équipe
- Résolu quand : chacun choisit sa couleur dans une palette de 12 depuis sa fiche ; une couleur déjà prise est grisée ; une nouvelle personne reçoit la première couleur libre ; en « Couleur : owner », on reconnaît chaque personne sans ambiguïté.

### Guide
- Problème : P7 (faire comprendre l'outil à qui arrive, sans présentation)
- Pour qui : tout nouvel utilisateur
- Résolu quand : une page « Guide » (barre latérale, palette) donne, en phrases courtes et factuelles, la mentalité (barres calculées, faits avant priorités, fin prévue = engagement), les questions P1, P2, P7, P10, P11, P12 avec un lien vers la vue qui y répond, la vie d'une tâche, la lecture de la timeline et les raccourcis.

### Lisibilité des barres en retard
- Problème : P10, P7
- Pour qui : toute l'équipe, client
- Résolu quand : le nom d'une tâche reste lisible sur sa barre même sur les hachures de retard ou de jalon dépassé (il passe au-dessus, sur un fond de la couleur de la barre).

### Thème sombre
- Problème : transverse (confort de lecture, usage prolongé)
- Pour qui : toute l'équipe
- Résolu quand : on choisit Clair, Sombre ou Système dans le menu du compte ; le sombre est cendré (pas noir), en clair comme en sombre, tous les textes, discrets compris (numéros de semaine, raccourcis, placeholders), atteignent l'AA (≥ 4,5:1) sur leur fond réel, survols et ligne sélectionnée compris, et toutes les vues, barres et hachures restent lisibles.

### Barre latérale réductible
- Problème : transverse (place pour la timeline et les vues)
- Pour qui : toute l'équipe
- Résolu quand : un bouton en haut de la barre latérale (ou `[`, ou la palette) la réduit à ses icônes, libellés en info-bulle et alertes en point rouge ; le choix est mémorisé sur le navigateur.

### Groupe « À planifier »
- Problème : P11
- Pour qui : PM
- Résolu quand : les tâches sans owner ou sans estimation sont regroupées en bas de la timeline avec leur raison ; un item tout juste créé reste à sa place tant qu'on le saisit ; il rejoint la liste dès qu'il est planifiable.

### Vue par date de début (escalier) et par owner
- Problème : P1, P7
- Pour qui : PM, client
- Résolu quand : une bascule « Priorité / Date de début / Owner » sur la timeline affiche les tâches à plat, triées par date de début (chemin du parent en préfixe) pour lire l'enchaînement en escalier ; « Owner » les regroupe en plus sous chaque personne (un item à plusieurs owners apparaît sous chacun) pour lire la file de chacun ; dans ces vues on ne peut ni réordonner ni imbriquer (glisser, ⌥↑/⌥↓, Tab désactivés). La vue choisie, la couleur des barres et les statuts affichés (« Affichage » : masquer par exemple les items au dev terminé ou faits) sont mémorisés sur le navigateur.

### Dashboard
- Problème : P12, P10, P6, P2
- Pour qui : PM, tech lead
- Résolu quand : une page « Dashboard » (barre latérale, `G` puis `D`) réunit ce qui demande une action, par ordre d'importance :
  - **Passe-t-on nos prochains jalons ?** (carte principale, à gauche des trois autres) : le prochain jalon en grand avec son verdict, puis les trois suivants. Vert : ça passe, avec la marge du dernier item rattaché. Ambre : marge d'une semaine ouvrée ou moins (ou un item rattaché non planifié). Rouge : un item finit après, avec le retard à rattraper pour lever l'alerte et les items en cause (+n j chacun).
  - **À vérifier avant démarrage** : les tâches qui démarrent dans les N jours ouvrés, avec deux vérifications cochables (conception métier + BPMN, conception technique + découpe en tickets). Chaque vérification est due à partir de son délai avant le démarrage, réglé dans les Paramètres (par défaut 5 et 3 jours ouvrés) ; due et pas cochée, elle est signalée. Cochée, elle garde la date et l'auteur (aussi dans le panneau de l'item).
  - **Dépendances et blocages à lever** : les tags actifs « Dépendance » et « Bloqué » des items non terminés, par date de début, avec leur raison, leur ancienneté et un bouton « Lever ».
  - **Dérives** : tâches en retard ou en glissement (+n j).
  - Chaque carte de synthèse a un point de la couleur de son état (vert : rien à faire, ambre : action à mener, rouge : problème aujourd'hui) et un texte factuel (« Marge de 6 j ouvrés », « 3 j ouvrés de retard à rattraper »), sans commentaire.
  - Chaque item ouvre son panneau ; une section vide le dit (« Rien à lever »).
