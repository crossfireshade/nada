# إذاعة المنستير — Radio Monastir Digital Program Management Platform

A full-stack web application for **Radio Monastir** (إذاعة المنستير) that digitalizes program management previously done on paper/Excel. It replaces the **Guide/Conducteur radio** (program runsheet) and guest entry authorizations.

---

## Architecture

**Client-Serveur 3-Tiers** :

```
┌──────────────────────┐
│  TIER 1 — Frontend   │  React 18 SPA (Vite — port 4173)
│     Présentation     │  Tailwind CSS, i18next, Socket.io-client
└──────────┬───────────┘
           │ HTTP REST + WebSocket
           ▼
┌──────────────────────┐
│  TIER 2 — Backend    │  Node.js + Express 4.18 (port 5000)
│   Logique Métier     │  JWT Auth, RBAC, Socket.io, Multer
└──────────┬───────────┘
           │ Mongoose ODM
           ▼
┌──────────────────────┐
│  TIER 3 — Données    │  MongoDB
└──────────────────────┘
```

---

## Tech Stack

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 18 + Vite, React Router v6, Tailwind CSS, Headless UI, Heroicons |
| **Internationalisation** | react-i18next (Arabe RTL + Français LTR) |
| **Formulaires** | react-hook-form |
| **Temps réel** | Socket.io-client |
| **Backend** | Node.js + Express 4.18 (routes → controllers → services → models) |
| **Base de données** | MongoDB + Mongoose 8 |
| **Authentification** | JWT (accessToken 15min + refreshToken 7j) + RBAC (6 rôles) |
| **Temps réel serveur** | Socket.io 4 |
| **Upload fichiers** | Multer (photos invités, 5 MB max) |
| **Email** | Nodemailer (SMTP) |
| **Tâches planifiées** | node-cron |
| **Sécurité** | express-rate-limit, express-validator, bcryptjs |
| **Classification musicale** | Last.fm API (tags communautaires) + MusicBrainz (pays) + Spotify (enrichissement) |

---

## Fonctionnalités

- **Guide/Conducteur éditeur** — Runsheet complet avec segments, invités (studio/téléphone), chansons, notes, gagnants
- **Workflow guide** — Machine à états : DRAFT → SUBMITTED → FINAL_PUBLISHED → LIVE_IN_PROGRESS → LIVE_STOPPED → ARCHIVED (+ REJECTED)
- **Checklist live** — Suivi en temps réel de l'émission pour le technicien coordinateur
- **Classification automatique des chansons** — Cascade 4 niveaux (heuristique locale → Last.fm → MusicBrainz → Spotify) → TUNISIEN / ORIENTAL / OCCIDENTAL
- **Statistiques droits d'auteur** — Page SACEM/copyright avec répartition par genre et export PDF
- **Guides récurrents** — Création et gestion de guides périodiques avec occurrences
- **Autorisations d'entrée** — Généré automatiquement lors de la validation du guide pour les invités présents en studio ; réception et check-in par le réceptionniste
- **Historique** — Archives des guides, chansons diffusées, et entrées
- **Messagerie interne** — Chat temps réel entre utilisateurs (Socket.io + rooms)
- **Gagnants** — Saisie et envoi par email à la publicité
- **Notifications/Alertes** — Alertes intelligentes (cron) + notifications temps réel
- **Mode sombre** — Thème dark/light persistant
- **Bilingue** — Arabe (RTL) + Français (LTR) complets
- **Journal d'audit** — Historique de toutes les actions pour les administrateurs
- **Suivi producteurs** — Tableau de bord de suivi de l'activité par producteur

---

## Rôles & Contrôle d'accès (RBAC)

| Rôle | Permissions principales |
|------|------------------------|
| `PRODUCTEUR` | Créer/éditer ses guides, saisir segments, invités, chansons |
| `RESPONSABLE_PRODUCTION` | Valider/publier les guides, gérer les utilisateurs |
| `TECHNICIEN_COORDINATEUR` | Checklist live, valider chansons, saisir gagnants |
| `RESPONSABLE_ADMINISTRATIF` | Journal d'audit, gestion utilisateurs, vue globale |
| `RESPONSABLE_PUBLICITE` | Recevoir email gagnants, consulter guides et statistiques |
| `RECEPTIONNISTE_POLICIER` | Autorisations d'entrée uniquement, check-in invités |

---

## Structure du projet

```
radio_monastir/
├── server/
│   ├── src/
│   │   ├── server.js                    # Point d'entrée HTTP + Socket.io
│   │   ├── app.js                       # Express app (CORS, routes, middlewares)
│   │   ├── socket.js                    # Socket.io (auth JWT, rooms)
│   │   │
│   │   ├── config/
│   │   │   ├── db.js                    # Connexion MongoDB
│   │   │   ├── email.js                 # Config Nodemailer
│   │   │   └── env.js                   # Variables d'environnement
│   │   │
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Guide.js                 # Guide + machine à états
│   │   │   ├── Segment.js               # Lignes du guide (invités)
│   │   │   ├── Song.js                  # Chansons (genre, spotifyId)
│   │   │   ├── Note.js
│   │   │   ├── Winner.js
│   │   │   ├── RecurringGuide.js        # Guides récurrents
│   │   │   ├── GuideOccurrence.js
│   │   │   ├── EntryPermission.js       # Autorisation d'entrée
│   │   │   ├── EntryPermissionGuest.js  # Invités de l'autorisation
│   │   │   ├── Guest.js
│   │   │   ├── Alert.js                 # Notifications/alertes
│   │   │   ├── AuditLog.js              # Journal d'audit
│   │   │   ├── Conversation.js          # Chat
│   │   │   └── Message.js              # Chat
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.js                  # Vérification JWT
│   │   │   ├── rbac.js                  # Contrôle rôles
│   │   │   ├── upload.js                # Multer (photos invités)
│   │   │   ├── uploadChat.js            # Multer (fichiers chat)
│   │   │   └── errorHandler.js
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── user.routes.js
│   │   │   ├── admin.routes.js
│   │   │   ├── guide.routes.js
│   │   │   ├── segment.routes.js
│   │   │   ├── song.routes.js
│   │   │   ├── songHistory.routes.js
│   │   │   ├── note.routes.js
│   │   │   ├── winner.routes.js
│   │   │   ├── guest.routes.js
│   │   │   ├── recurringGuide.routes.js
│   │   │   ├── entryPermission.routes.js
│   │   │   ├── alert.routes.js
│   │   │   ├── auditLog.routes.js
│   │   │   └── chat.routes.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── user.controller.js
│   │   │   ├── guide.controller.js
│   │   │   ├── segment.controller.js
│   │   │   ├── song.controller.js
│   │   │   ├── note.controller.js
│   │   │   ├── winner.controller.js
│   │   │   ├── guest.controller.js
│   │   │   ├── entryPermission.controller.js
│   │   │   ├── alert.controller.js
│   │   │   ├── auditLog.controller.js
│   │   │   └── chat.controller.js
│   │   │
│   │   ├── services/
│   │   │   ├── guide.service.js              # Lifecycle guide, auto-création EP
│   │   │   ├── musicClassifier.service.js    # Classification automatique chansons
│   │   │   ├── entryPermission.service.js
│   │   │   ├── recurringGuide.service.js
│   │   │   ├── alert.service.js
│   │   │   ├── auditLog.service.js
│   │   │   ├── chat.service.js
│   │   │   ├── email.service.js
│   │   │   ├── winner.service.js
│   │   │   └── auth.service.js
│   │   │
│   │   ├── jobs/
│   │   │   └── alertCron.js                  # node-cron alertes automatiques
│   │   │
│   │   ├── seeds/
│   │   │   └── seed.js
│   │   │
│   │   └── utils/
│   │       ├── helpers.js                    # successResponse / errorResponse
│   │       └── constants.js
│   │
│   ├── uploads/                              # Photos invités (stockage local)
│   └── .env.example
│
├── client/
│   ├── src/
│   │   ├── App.jsx                           # Router + Providers globaux
│   │   ├── main.jsx
│   │   ├── i18n.js                           # Config i18next
│   │   │
│   │   ├── api/
│   │   │   └── axios.js                      # Instance Axios + interceptors JWT
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx               # Utilisateur connecté, tokens
│   │   │   ├── ChatContext.jsx               # État messagerie temps réel
│   │   │   ├── LanguageContext.jsx           # FR / AR + direction RTL/LTR
│   │   │   └── NotificationContext.jsx       # Toasts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useLanguage.js
│   │   │   ├── useNotifications.js
│   │   │   └── useDarkMode.js
│   │   │
│   │   ├── components/
│   │   │   ├── common/                       # Modal, Toast, StatusBadge, DataTable,
│   │   │   │                                 # KPICard, Calendar, LoadingSpinner...
│   │   │   ├── layout/                       # Sidebar, Header, Footer, MainLayout
│   │   │   ├── logo/                         # LogoMain.jsx, LogoCompact.jsx
│   │   │   └── guards/                       # ProtectedRoute, RoleGuard
│   │   │
│   │   ├── features/
│   │   │   ├── auth/                         # LoginPage
│   │   │   ├── dashboard/                    # Dashboards par rôle (6 vues)
│   │   │   ├── guides/                       # GuideEditorPage, GuideListPage,
│   │   │   │                                 # GuideViewPage, LiveChecklistPage,
│   │   │   │                                 # GuideValidationPage
│   │   │   ├── history/                      # GuideHistoryPage, SongHistoryPage,
│   │   │   │                                 # EntryHistoryPage, CopyrightPage
│   │   │   ├── entryPermissions/             # EntryPermissionListPage,
│   │   │   │                                 # ReceptionInboxPage, CheckInPage
│   │   │   ├── admin/                        # RecurringGuidesPage,
│   │   │   │                                 # ProducerTrackingPage
│   │   │   ├── winners/                      # WinnersInboxPage
│   │   │   ├── users/                        # UserListPage
│   │   │   ├── chat/                         # FloatingChat (widget temps réel)
│   │   │   ├── notifications/                # NotificationsPage
│   │   │   └── audit/                        # AuditLogPage
│   │   │
│   │   └── utils/
│   │       └── roles.js
│   │
│   └── public/
│       ├── assets/                           # Logos SVG, favicon
│       └── locales/
│           ├── fr/translation.json           # Français
│           └── ar/translation.json           # Arabe
│
└── README.md
```

---

## Workflow du Guide (machine à états)

```
DRAFT → SUBMITTED → FINAL_PUBLISHED → LIVE_IN_PROGRESS → LIVE_STOPPED → ARCHIVED
                  ↘ REJECTED → DRAFT
```

1. **PRODUCTEUR** crée le guide (DRAFT) : segments, invités, chansons, notes
2. **PRODUCTEUR** soumet → notification au RESPONSABLE_PRODUCTION
3. **RESPONSABLE_PRODUCTION** valide → FINAL_PUBLISHED ; autorisation d'entrée auto-créée pour les invités studio ; notification au TECHNICIEN
4. **TECHNICIEN** gère le direct : checklist, validation chansons, saisie gagnants → LIVE_STOPPED → ARCHIVED

---

## Classification automatique des chansons

Pipeline en cascade à 4 niveaux (tous gratuits) :

```
[Titre + Artiste]
       │
       ▼
Heuristique locale (0ms)     → regex Unicode + listes artistes tunisiens
       │ null
       ▼
Last.fm API (~200ms)         → tags communautaires (arabic, tunisian, lebanese...)
       │ null
       ▼
MusicBrainz API (~500ms)     → pays d'origine (score ≥ 70)
       │ (parallèle)
       ▼
Spotify API                  → spotifyId uniquement (enrichissement)
```

Résultat : `TUNISIEN` / `ORIENTAL` / `OCCIDENTAL`

---

## Démarrage

### Prérequis
- Node.js >= 16
- MongoDB (local ou Atlas)

### 1. Installation

```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 2. Configuration

```bash
cd server
cp .env.example .env
# Remplir .env avec vos valeurs
```

### 3. Seed de la base de données

```bash
cd server
npm run seed
```

### 4. Lancement

```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 4173)
cd client && npm run dev
```

Ouvrir http://localhost:4173

---

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | `5000` |
| `MONGODB_URI` | URI MongoDB | `mongodb://localhost:27017/radio_monastir` |
| `JWT_SECRET` | Secret access token | — |
| `JWT_REFRESH_SECRET` | Secret refresh token | — |
| `JWT_EXPIRE` | Durée access token | `15m` |
| `JWT_REFRESH_EXPIRE` | Durée refresh token | `7d` |
| `SMTP_HOST` | Serveur SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_USER` | Email SMTP | — |
| `SMTP_PASS` | Mot de passe SMTP | — |
| `SMTP_FROM` | Adresse expéditeur | `noreply@radio-monastir.tn` |
| `CLIENT_URL` | Origine CORS autorisée | `http://localhost:4173` |
| `UPLOAD_DIR` | Dossier uploads | `uploads` |
| `MAX_FILE_SIZE` | Taille max upload (bytes) | `5242880` (5 MB) |
| `LASTFM_API_KEY` | Clé API Last.fm (classification musicale) | — |
| `SPOTIFY_CLIENT_ID` | Client ID Spotify (enrichissement) | — |
| `SPOTIFY_CLIENT_SECRET` | Client Secret Spotify | — |

---

## Comptes de test (après seed)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Producteur | producteur@radio-monastir.tn | Pass123! |
| Responsable Production | production@radio-monastir.tn | Pass123! |
| Technicien Coordinateur | technicien@radio-monastir.tn | Pass123! |
| Responsable Administratif | admin@radio-monastir.tn | Pass123! |
| Responsable Publicité | publicite@radio-monastir.tn | Pass123! |
| Réceptionniste | reception@radio-monastir.tn | Pass123! |

---

## API — Format des réponses

```json
{ "success": true,  "data": { ... } }
{ "success": false, "message": "Description de l'erreur" }
```

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion → access + refresh tokens |
| POST | `/api/auth/refresh` | Renouveler l'access token |
| GET | `/api/guides` | Liste des guides |
| POST | `/api/guides` | Créer un guide |
| PATCH | `/api/guides/:id/submit` | Soumettre le guide |
| PATCH | `/api/guides/:id/validate` | Valider/publier le guide |
| PATCH | `/api/guides/:id/reject` | Rejeter le guide |
| PATCH | `/api/guides/:id/start-live` | Démarrer le direct |
| PATCH | `/api/guides/:id/stop-live` | Arrêter le direct |
| PATCH | `/api/guides/:id/archive` | Archiver le guide |
| GET | `/api/guides/:id/segments` | Segments du guide |
| GET | `/api/guides/:id/songs` | Chansons du guide |
| POST | `/api/guides/:guideId/songs/:id/classify` | Classifier une chanson auto |
| GET | `/api/entry-permissions` | Liste autorisations d'entrée |
| GET | `/api/entry-permissions/inbox` | Inbox réception (aujourd'hui) |
| GET | `/api/alerts` | Alertes de l'utilisateur connecté |
| GET | `/api/audit-logs` | Journal d'audit (admin) |
| GET | `/api/chat/conversations` | Conversations de l'utilisateur |
| POST | `/api/chat/conversations` | Démarrer une conversation |

---

## Palette de couleurs

Dérivée du logo Radio Monastir :

| Usage | Classe Tailwind |
|-------|----------------|
| Primaire (boutons, liens) | `teal-500` / `emerald-600` |
| Gradients | `from-teal-500 to-emerald-600` |
| Succès | `green-500` / `emerald-500` |
| Avertissement | `amber-500` |
| Erreur / Live | `red-500` |
| Info | `cyan-500` |

---

## License

Ce projet est développé dans le cadre d'un **Projet de Fin d'Études (PFE)**.

*Plateforme de gestion numérique des programmes pour إذاعة المنستير*
