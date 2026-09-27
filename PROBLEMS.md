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
- **Disponibilité** : 100 % par défaut, moins les week-ends, les temps partiels et les absences saisies.
- **Jours fériés** : non gérés automatiquement (des freelances travaillent certains fériés). On saisit une absence, éventuellement pour toute l'équipe d'un coup.
- **Dates réelles, pas de barre dessinée** : une tâche passe par trois états qui enregistrent chacun une date.
  - *À faire* : pas de date ; enchaînée par priorité, jamais avant aujourd'hui.
  - *En cours* : date de début réelle (aujourd'hui par défaut, modifiable). Fin prévue = début + JH sur la disponibilité des owners.
  - *Terminée* : date de fin réelle, saisissable a posteriori.
- **Tant qu'une tâche n'est pas terminée, elle est en cours** : si sa fin prévue est passée, elle se prolonge jusqu'à aujourd'hui (retard sur l'estimation, en ambre) et les tâches suivantes de ses owners glissent.
- **Part du temps pendant un retard** : 100 % par défaut ; 50 %, 20 % ou « En attente » (0 %) quand on attend quelque chose. Le reste du temps va aux tâches suivantes, qui avancent en parallèle.
- **Faits avant priorités** : les tâches démarrées ou terminées sont placées d'abord, les tâches à faire remplissent le temps libre restant.
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
- Résolu quand : seuls les emails ajoutés au projet peuvent le modifier.

### Dates réelles et retard sur l'estimation
- Problème : P10
- Pour qui : PM, tech lead, client (vue partagée)
- Résolu quand : « Démarrer » et « Terminer » enregistrent une date (modifiable, a posteriori) ; une tâche en cours dont la fin prévue est passée affiche « +n j » en ambre, se prolonge jusqu'à aujourd'hui et décale la suite de ses owners ; le filtre « En retard » les isole ; le panneau explique le glissement.

### Retard en attente
- Problème : P10
- Pour qui : PM, tech lead
- Résolu quand : on indique la part du temps qu'une tâche en retard garde (100 %, 50 %, 20 %, en attente) et les tâches suivantes avancent en parallèle.

### Groupe « À planifier »
- Problème : P11
- Pour qui : PM
- Résolu quand : les tâches sans owner ou sans estimation sont regroupées en bas de la timeline avec leur raison ; un item tout juste créé reste à sa place tant qu'on le saisit ; il rejoint la liste dès qu'il est planifiable.
