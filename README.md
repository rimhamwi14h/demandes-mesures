# Demandes de mesure

Projet de développement web ISMIN 3A — Sujet 3.

Auteurs : Rim El Hamwi et Hussein Sayed Ahmad.

Application permettant de déposer des demandes de mesure, d’organiser leur traitement et de récupérer leurs résultats.

## Technologies

- Backend : NestJS et TypeScript.
- Base de données : PostgreSQL avec Prisma.
- Frontend : React, TypeScript et Vite.
- Authentification : JWT.
- Tests : Vitest et Testing Library.
- Exécution : Docker Compose et Nginx.

## Démarrage

Prérequis : Git et Docker avec Docker Compose.
Sous Windows, Docker Desktop doit être démarré avec les conteneurs Linux.

```bash
git clone https://github.com/rimhamwi14h/demandes-mesures.git
cd demandes-mesures
docker compose up
```

Le premier démarrage construit les images, applique les migrations et initialise les six équipes ainsi que le compte du technicien.

Aucun fichier `.env` n’est nécessaire pour démarrer la démonstration avec Docker Compose.

Les ports 3000, 5433 et 8080 doivent être disponibles.

## Adresses

- Application : http://localhost:8080
- Santé de l’API : http://localhost:3000/health
- Santé via Nginx : http://localhost:8080/api/health

La route de santé doit répondre HTTP 200 avec :

```json
{
  "status": "ok",
  "database": "connected"
}
```

## Compte initial

| Rôle | Email | Mot de passe |
|---|---|---|
| Technicien — Julien | julien@example.test | JulienDemo2026! |

Les identifiants et le secret JWT par défaut sont destinés à la démonstration locale.

Sur une nouvelle base, les autres comptes sont créés depuis l’application :

- Un utilisateur interne s’inscrit avec une adresse se terminant par `@ecole.example` et choisit son équipe.
- Julien désigne les responsables depuis la page Administration.
- Julien crée les entreprises et leurs comptes de contact depuis cette même page.

Le domaine `ecole.example` et les noms « Équipe 1 » à « Équipe 6 » sont des valeurs de démonstration.

Les comptes créés pendant le développement ne sont pas automatiquement présents sur une nouvelle base.

## Fonctionnalités

### 1. Déposer et gérer une demande

Le demandeur choisit une mesure, renseigne une date souhaitée et identifie un ou plusieurs échantillons.

Les cinq mesures proposées sont :

- Épaisseur.
- Résistance électrique.
- Observation au microscope.
- Rugosité de surface.
- Comportement en flexion.

Une demande peut être modifiée ou annulée par son propriétaire tant qu’elle est en attente.

### 2. Organiser et traiter les demandes

Julien consulte la file d’attente, initialement ordonnée par origine entreprise puis par date souhaitée.

Il peut modifier et enregistrer l’ordre manuellement, ou rétablir les priorités par défaut.

Après un classement manuel, les nouvelles demandes sont placées après les demandes déjà classées.

Julien peut démarrer une mesure ou déclarer une demande non mesurable avec une raison obligatoire.

Une demande non mesurable reste conservée. Un nouvel échantillon nécessite une nouvelle demande.

### 3. Publier et récupérer les résultats

Pour une demande en cours, Julien publie un commentaire et de un à cinq fichiers, de 10 Mo maximum chacun.

La publication réussie marque la demande comme terminée.

Les utilisateurs autorisés peuvent consulter le commentaire et télécharger les fichiers.

## Droits d’accès

| Rôle | Accès |
|---|---|
| Demandeur interne | Ses propres demandes et résultats |
| Responsable d’équipe | Ses propres demandes et celles de son équipe |
| Contact d’entreprise | Ses propres demandes et résultats |
| Technicien | Toutes les demandes, le traitement et l’administration |

Un responsable ne peut modifier ou annuler que ses propres demandes en attente.

Les contrôles d’accès sont effectués par le backend, y compris pour les téléchargements.

## Exemple de vérification

1. Se connecter avec Julien et créer un compte d’entreprise dans Administration.
2. Se connecter avec ce contact et déposer une demande.
3. Reconnecter Julien et ouvrir la file d’attente.
4. Démarrer la demande.
5. Publier un fichier de résultat avec un commentaire.
6. Reconnecter le contact et télécharger son résultat.

Pour vérifier les responsables, inscrire deux utilisateurs dans la même équipe, puis désigner l’un d’eux responsable avec Julien.

## Tests automatisés

Pour les commandes locales suivantes, installer Node.js 26 et npm.

Depuis un clone neuf, préparer et tester le backend dans PowerShell :

```powershell
cd api
npm ci
Copy-Item .env.example .env
npx prisma generate --config prisma7.config.ts
npm test
npm run build
```

La copie de `.env.example` est destinée à un clone neuf.
Si un fichier `.env` existe déjà, conserver sa configuration.

Tester ensuite le frontend :

```powershell
cd ../web
npm ci
npm test
npm run build
```

Les tests automatisés utilisent des simulations pour les appels à la base ou à l’API selon les composants testés. Le parcours complet doit également être vérifié dans le navigateur.

## Données persistantes

- PostgreSQL conserve ses données dans le volume `postgres_data`.
- Les fichiers de résultats sont conservés dans le dossier local `api/uploads`.

Pour arrêter les services sans effacer les données :

```bash
docker compose down
```

Pour les redémarrer :

```bash
docker compose up -d
```

L’option `docker compose down -v` supprime le volume PostgreSQL.

## Commandes utiles

Afficher les services :

```bash
docker compose ps
```

Afficher les journaux :

```bash
docker compose logs --tail 100 api web
```

Reconstruire après une modification du code :

```bash
docker compose up --build -d
```

## Organisation du dépôt

- `api/src` : modules du backend.
- `api/prisma` : schéma, migrations et initialisation.
- `web/src` : pages et composants React.
- `web/nginx.conf` : serveur web et transmission des appels API.
- `compose.yaml` : démarrage des trois services.

## Hors périmètre

L’application ne gère pas l’import des mails ou de Teams, les notifications automatiques, la réservation des appareils, la facturation ni l’analyse automatique des résultats.