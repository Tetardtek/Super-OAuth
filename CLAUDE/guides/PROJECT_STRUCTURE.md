# 📂 Structure du Projet SuperOAuth

## Vue d'Ensemble Rapide

```
SuperOAuth/
├── 📄 Configuration         # Fichiers de config à la racine
├── 📁 src/                  # Code source principal
├── 📁 tests/                # Tests unitaires et d'intégration
├── 📁 public/               # Fichiers statiques (frontend)
├── 📁 scripts/              # Scripts utilitaires
└── 📁 node_modules/         # Dépendances (ignoré par git)
```

## 📁 Structure Détaillée

### Racine du Projet

**Pour la structure complète du dossier CLAUDE**, voir [../README.md](../README.md).

```
SuperOAuth/
├── .env, .env.example       # Variables d'environnement
├── .gitignore               # Fichiers ignorés par Git
├── package.json             # Dépendances et scripts npm
├── tsconfig.json            # Configuration TypeScript
├── jest.config.js           # Configuration Jest (tests backend)
├── vitest.config.js         # Configuration Vitest (tests frontend)
│
├── 📚 CLAUDE/               # Documentation pour agents IA
└── ...                      # (voir ../README.md)
```

### 📁 src/ - Code Source Principal

#### Organisation en Couches DDD

```
src/
│
├── 📁 domain/                      # Couche métier (logique pure)
│   ├── 📁 entities/               # Entités du domaine
│   │   ├── user.entity.ts         # Entité User (utilisateur)
│   │   ├── session.ts             # Entité Session (JWT tokens)
│   │   ├── linked-account.entity.ts # Comptes OAuth liés
│   │   └── index.ts               # Exports centralisés
│   │
│   ├── 📁 value-objects/          # Objets valeur immuables
│   │   ├── email.vo.ts            # Email (validation + logique)
│   │   ├── nickname.vo.ts         # Nickname (validation)
│   │   ├── linked-account-id.ts   # ID de compte lié
│   │   └── index.ts
│   │
│   ├── 📁 repositories/           # Interfaces des repositories
│   │   ├── user.repository.interface.ts
│   │   ├── session.repository.interface.ts
│   │   ├── linked-account.repository.interface.ts
│   │   └── index.ts
│   │
│   └── 📁 errors/                 # Erreurs métier
│       ├── domain-error.ts        # Classe de base
│       ├── user-errors.ts         # Erreurs liées aux users
│       └── index.ts
│
├── 📁 application/                 # Couche application (orchestration)
│   ├── 📁 use-cases/              # Cas d'utilisation métier
│   │   ├── register-classic.use-case.ts    # Inscription email/password
│   │   ├── login-classic.use-case.ts       # Connexion classique
│   │   ├── start-oauth.use-case.ts         # Démarrer OAuth flow
│   │   ├── complete-oauth.use-case.ts      # Terminer OAuth flow
│   │   ├── refresh-token.use-case.ts       # Rafraîchir access token
│   │   ├── logout.use-case.ts              # Déconnexion
│   │   └── index.ts
│   │
│   ├── 📁 dto/                    # Data Transfer Objects
│   │   └── auth.dto.ts            # DTOs pour l'authentification
│   │
│   ├── 📁 services/               # Services applicatifs
│   │   ├── auth.service.ts        # Service d'authentification
│   │   ├── user.service.ts        # Service utilisateur
│   │   └── index.ts
│   │
│   ├── 📁 interfaces/             # Interfaces de contrats
│   │   └── repositories.interface.ts
│   │
│   └── index.ts
│
├── 📁 infrastructure/              # Couche infrastructure (implémentations)
│   ├── 📁 database/               # Configuration base de données
│   │   ├── 📁 config/
│   │   │   └── database.config.ts # Configuration TypeORM
│   │   │
│   │   ├── 📁 repositories/       # Implémentations concrètes
│   │   │   ├── user.repository.ts
│   │   │   ├── session.repository.ts
│   │   │   └── linked-account.repository.ts
│   │   │
│   │   └── 📁 migrations/         # Migrations de schéma DB
│   │       └── (migrations générées)
│   │
│   ├── 📁 oauth/                  # Providers OAuth
│   │   ├── 📁 providers/
│   │   │   ├── discord.provider.ts    # Provider Discord
│   │   │   ├── google.provider.ts     # Provider Google
│   │   │   ├── github.provider.ts     # Provider GitHub
│   │   │   └── twitch.provider.ts     # Provider Twitch
│   │   │
│   │   └── oauth-provider.factory.ts  # Factory pour créer les providers
│   │
│   ├── 📁 services/               # Services externes
│   │   ├── email.service.ts       # Service d'envoi d'emails
│   │   ├── redis.service.ts       # Service de cache Redis
│   │   └── encryption.service.ts  # Service de chiffrement
│   │
│   └── 📁 di/                     # Dependency Injection
│       └── container.ts           # Container d'injection
│
├── 📁 presentation/                # Couche présentation (HTTP/REST)
│   ├── 📁 controllers/            # Contrôleurs Express
│   │   ├── auth.controller.ts     # Endpoints d'authentification
│   │   └── oauth.controller.ts    # Endpoints OAuth
│   │
│   ├── 📁 routes/                 # Définition des routes
│   │   ├── auth.routes.ts         # Routes /api/v1/auth/*
│   │   ├── oauth.routes.ts        # Routes /api/v1/oauth/*
│   │   └── index.ts
│   │
│   ├── 📁 middleware/             # Middlewares HTTP
│   │   ├── auth.middleware.ts     # Vérification JWT
│   │   ├── error-handler.middleware.ts # Gestion globale des erreurs
│   │   ├── not-found.middleware.ts     # 404 handler
│   │   ├── request-logger.middleware.ts # Logging des requêtes
│   │   ├── rate-limit.middleware.ts    # Protection DDoS
│   │   └── index.ts
│   │
│   ├── 📁 validators/             # Validation des requêtes
│   │   ├── auth.validator.ts      # Schémas Joi pour auth
│   │   └── index.ts
│   │
│   └── 📁 types/                  # Types TypeScript pour HTTP
│       └── express.types.ts       # Extensions Express
│
├── 📁 shared/                      # Code partagé entre toutes les couches
│   ├── 📁 config/                 # Configuration centralisée
│   │   ├── app.config.ts          # Configuration de l'app
│   │   └── index.ts
│   │
│   ├── 📁 constants/              # Constantes globales
│   │   ├── http-status.constants.ts
│   │   ├── error-codes.constants.ts
│   │   └── index.ts
│   │
│   ├── 📁 types/                  # Types partagés
│   │   ├── oauth.types.ts         # Types OAuth
│   │   ├── jwt.types.ts           # Types JWT
│   │   └── index.ts
│   │
│   ├── 📁 utils/                  # Utilitaires
│   │   ├── logger.util.ts         # Logger Winston
│   │   ├── crypto.util.ts         # Fonctions crypto
│   │   ├── validation.util.ts     # Helpers de validation
│   │   └── index.ts
│   │
│   └── 📁 middleware/             # Middlewares partagés
│       └── index.ts
│
└── main.ts                         # Point d'entrée de l'application
```

### 📁 tests/ - Tests

```
tests/
│
├── 📁 unit/                        # Tests unitaires
│   ├── 📁 use-cases/
│   │   ├── register-classic.use-case.spec.ts
│   │   ├── login-classic.use-case.spec.ts
│   │   ├── start-oauth.use-case.spec.ts
│   │   └── complete-oauth.use-case.spec.ts
│   │
│   └── 📁 services/
│       ├── auth.service.spec.ts
│       └── user.service.spec.ts
│
├── 📁 integration/                 # Tests d'intégration (à créer)
│   ├── 📁 api/
│   └── 📁 database/
│
└── 📁 frontend/                    # Tests frontend (Vitest)
    ├── 📁 unit/
    │   ├── toast.spec.ts
    │   └── validators.spec.ts
    │
    └── 📁 mocks/
        └── api.mock.ts
```

### 📁 public/ - Fichiers Statiques (Frontend)

```
public/
│
├── 📁 css/                         # Styles CSS
│   ├── main.css                   # Styles principaux
│   ├── toast.css                  # Système de notifications
│   └── dashboard.css              # Dashboard utilisateur
│
├── 📁 js/                          # JavaScript frontend
│   ├── main.js                    # Point d'entrée JS
│   ├── toast.js                   # Système de toast
│   ├── api.js                     # Client API
│   ├── validators.js              # Validation frontend
│   └── dashboard.js               # Logique du dashboard
│
├── 📁 docs/                        # Documentation web
│   ├── docs.html                  # Page de documentation
│   ├── 📁 styles/
│   ├── 📁 js/
│   └── 📁 content/
│
├── index.html                      # Page d'accueil
├── login.html                      # Page de connexion
├── register.html                   # Page d'inscription
└── dashboard.html                  # Dashboard utilisateur
```

### 📁 scripts/ - Scripts Utilitaires

```
scripts/
│
├── optimize-bundles.js             # Optimisation des bundles
├── analyze-bundle-size.js          # Analyse de la taille
├── generate-test-report.js         # Génération de rapports de tests
├── reset-database.js               # Réinitialisation de la DB
│
└── 📁 __tests__/                   # Tests des scripts
```

## 🗺️ Carte de Navigation Rapide

### Je veux modifier...

| Objectif | Fichier à Modifier |
|----------|-------------------|
| **Ajouter un endpoint API** | `src/presentation/routes/*.routes.ts` |
| **Ajouter une logique métier** | `src/application/use-cases/*.use-case.ts` |
| **Modifier une entité** | `src/domain/entities/*.entity.ts` |
| **Ajouter un provider OAuth** | `src/infrastructure/oauth/providers/` |
| **Modifier la validation** | `src/presentation/validators/*.validator.ts` |
| **Gérer les erreurs** | `src/presentation/middleware/error-handler.middleware.ts` |
| **Ajouter une migration DB** | Générer via `npm run migration:generate` |
| **Modifier la config** | `src/shared/config/app.config.ts` ou `.env` |
| **Ajouter un middleware** | `src/presentation/middleware/` |
| **Modifier le frontend** | `public/js/*.js` ou `public/css/*.css` |

### Je cherche...

| Recherche | Emplacement |
|-----------|-------------|
| **Point d'entrée de l'app** | `src/main.ts` |
| **Configuration DB** | `src/infrastructure/database/config/database.config.ts` |
| **Définition des routes** | `src/presentation/routes/` |
| **Logique d'authentification** | `src/application/use-cases/` |
| **Modèles de données** | `src/domain/entities/` |
| **Gestion des tokens JWT** | `src/application/services/auth.service.ts` |
| **Providers OAuth** | `src/infrastructure/oauth/providers/` |
| **Validation des entrées** | `src/presentation/validators/` |
| **Logger** | `src/shared/utils/logger.util.ts` |
| **Types TypeScript** | `src/shared/types/` ou `src/presentation/types/` |

## 📊 Flux de Données par Fichier

### Exemple: Requête POST /api/v1/auth/register

```
1. Client HTTP
   │
   ▼
2. src/main.ts (Express app)
   │
   ▼
3. src/presentation/routes/auth.routes.ts
   │ Route: POST /register
   │
   ▼
4. src/presentation/middleware/
   ├─ request-logger.middleware.ts (log la requête)
   ├─ rate-limit.middleware.ts (protection DDoS)
   └─ auth.validator.ts (validation Joi)
   │
   ▼
5. src/presentation/controllers/auth.controller.ts
   │ Méthode: register()
   │
   ▼
6. src/application/use-cases/register-classic.use-case.ts
   │ Logique métier:
   │ - Vérifier si l'email existe
   │ - Hasher le mot de passe
   │ - Créer l'utilisateur
   │
   ▼
7. src/domain/repositories/user.repository.interface.ts
   │ Interface du repository
   │
   ▼
8. src/infrastructure/database/repositories/user.repository.ts
   │ Implémentation TypeORM
   │
   ▼
9. Base de données MySQL
   │
   ▼
10. Réponse remonte la chaîne inversée
    │
    ▼
11. src/presentation/middleware/error-handler.middleware.ts
    │ Gestion des erreurs si nécessaire
    │
    ▼
12. Client HTTP reçoit la réponse JSON
```

## 🔍 Localisation des Fonctionnalités

### Authentification Classique

| Fonctionnalité | Fichiers Concernés |
|----------------|-------------------|
| **Inscription** | `register-classic.use-case.ts`, `auth.controller.ts`, `auth.routes.ts` |
| **Connexion** | `login-classic.use-case.ts`, `auth.controller.ts`, `auth.routes.ts` |
| **Refresh Token** | `refresh-token.use-case.ts`, `auth.controller.ts`, `auth.routes.ts` |
| **Déconnexion** | `logout.use-case.ts`, `auth.controller.ts`, `auth.routes.ts` |
| **Profil utilisateur** | `auth.controller.ts`, `user.service.ts` |

### Authentification OAuth

| Fonctionnalité | Fichiers Concernés |
|----------------|-------------------|
| **Démarrer OAuth** | `start-oauth.use-case.ts`, `oauth.controller.ts`, `oauth.routes.ts` |
| **Callback OAuth** | `complete-oauth.use-case.ts`, `oauth.controller.ts`, `oauth.routes.ts` |
| **Provider Discord** | `infrastructure/oauth/providers/discord.provider.ts` |
| **Provider Google** | `infrastructure/oauth/providers/google.provider.ts` |
| **Provider GitHub** | `infrastructure/oauth/providers/github.provider.ts` |
| **Provider Twitch** | `infrastructure/oauth/providers/twitch.provider.ts` |
| **Factory** | `infrastructure/oauth/oauth-provider.factory.ts` |

### Sécurité

| Fonctionnalité | Fichiers Concernés |
|----------------|-------------------|
| **Middleware Auth** | `presentation/middleware/auth.middleware.ts` |
| **Rate Limiting** | `presentation/middleware/rate-limit.middleware.ts` |
| **Error Handler** | `presentation/middleware/error-handler.middleware.ts` |
| **Validation** | `presentation/validators/auth.validator.ts` |
| **Logging** | `shared/utils/logger.util.ts` |
| **Encryption** | `infrastructure/services/encryption.service.ts` |

## 📝 Conventions de Nommage des Fichiers

### Pattern par Type

```
{nom}.{type}.{extension}
```

**Exemples:**
- `user.entity.ts` - Entité User
- `auth.service.ts` - Service d'authentification
- `register-classic.use-case.ts` - Use case d'inscription
- `user.repository.ts` - Repository User
- `auth.controller.ts` - Controller d'authentification
- `email.vo.ts` - Value Object Email
- `user-errors.ts` - Erreurs liées aux users
- `auth.middleware.ts` - Middleware d'authentification
- `logger.util.ts` - Utilitaire de logging

### Types de Fichiers

| Suffixe | Description | Exemple |
|---------|-------------|---------|
| `.entity.ts` | Entité du domaine | `user.entity.ts` |
| `.use-case.ts` | Cas d'utilisation | `login-classic.use-case.ts` |
| `.service.ts` | Service | `auth.service.ts` |
| `.repository.ts` | Repository | `user.repository.ts` |
| `.interface.ts` | Interface | `repositories.interface.ts` |
| `.controller.ts` | Contrôleur HTTP | `auth.controller.ts` |
| `.routes.ts` | Définition de routes | `auth.routes.ts` |
| `.middleware.ts` | Middleware | `auth.middleware.ts` |
| `.validator.ts` | Validateur | `auth.validator.ts` |
| `.dto.ts` | Data Transfer Object | `auth.dto.ts` |
| `.vo.ts` | Value Object | `email.vo.ts` |
| `.util.ts` | Utilitaire | `crypto.util.ts` |
| `.types.ts` | Types TypeScript | `oauth.types.ts` |
| `.config.ts` | Configuration | `database.config.ts` |
| `.spec.ts` | Test | `login-classic.use-case.spec.ts` |

## 🎯 Checklist pour Ajouter un Fichier

Avant de créer un nouveau fichier, vérifier:

- [ ] Le nom suit la convention `{nom}.{type}.ts`
- [ ] Le fichier est dans la bonne couche (domain/application/infrastructure/presentation)
- [ ] Un fichier `index.ts` existe pour exporter le nouveau module
- [ ] Le fichier respecte la responsabilité unique
- [ ] Les imports utilisent les alias (`@domain/`, `@application/`, etc.)
- [ ] Le fichier est accompagné d'un test (`.spec.ts`)
- [ ] La documentation est mise à jour si nécessaire

## 📚 Index des Fichiers Principaux

### Fichiers de Configuration

| Fichier | Description |
|---------|-------------|
| `.env` | Variables d'environnement (secret) |
| `.env.example` | Template des variables d'environnement |
| `tsconfig.json` | Configuration TypeScript |
| `package.json` | Dépendances et scripts npm |
| `jest.config.js` | Configuration des tests backend |
| `vitest.config.js` | Configuration des tests frontend |
| `.gitignore` | Fichiers ignorés par Git |
| `.cursorrules` | Règles pour agents IA |

### Points d'Entrée

| Fichier | Description |
|---------|-------------|
| `src/main.ts` | Point d'entrée de l'application backend |
| `public/index.html` | Page d'accueil frontend |
| `public/js/main.js` | Point d'entrée JavaScript frontend |

### Documentation

| Fichier | Description |
|---------|-------------|
| `README.md` | Documentation principale |
| `ARCHITECTURE.md` | Architecture détaillée |
| `CONTRIBUTING.md` | Guide de contribution |
| `AI_AGENT_GUIDE.md` | Guide pour agents IA |
| `PROJECT_STRUCTURE.md` | Structure du projet (ce fichier) |

## 🔗 Dépendances entre Modules

```
Domain (aucune dépendance)
   ▲
   │
Application (dépend de Domain)
   ▲
   │
   ├── Infrastructure (dépend de Domain + Application)
   │
   └── Presentation (dépend de Application)
```

**Règle:** Les dépendances pointent toujours vers le Domain (centre de l'architecture).

---

**Pour naviguer efficacement dans le projet:**
1. Commencer par `README.md` pour une vue d'ensemble
2. Consulter `ARCHITECTURE.md` pour comprendre la structure
3. Utiliser ce fichier pour localiser rapidement les fichiers
4. Lire `AI_AGENT_GUIDE.md` pour les patterns de développement
