# 🏗️ Architecture SuperOAuth

## Vue d'ensemble

SuperOAuth est construit selon les principes du **Domain-Driven Design (DDD)** et de l'**Architecture Hexagonale** (Ports & Adapters), garantissant une séparation claire des préoccupations et une maintenabilité optimale.

## 📐 Principes Architecturaux

### 1. Domain-Driven Design (DDD)
- **Domain Layer**: Logique métier pure, indépendante de toute infrastructure
- **Application Layer**: Orchestration des use cases
- **Infrastructure Layer**: Implémentations concrètes (database, OAuth, services externes)
- **Presentation Layer**: Contrôleurs HTTP, routes, middlewares

### 2. Clean Architecture
```
┌─────────────────────────────────────────────┐
│          Presentation Layer                  │
│  (Controllers, Routes, Middleware)           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Application Layer                    │
│  (Use Cases, Services, DTOs)                 │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│            Domain Layer                      │
│  (Entities, Value Objects, Repositories)     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│        Infrastructure Layer                  │
│  (Database, OAuth, External Services)        │
└─────────────────────────────────────────────┘
```

### 3. SOLID Principles
- **S**ingle Responsibility: Chaque classe a une seule raison de changer
- **O**pen/Closed: Ouvert à l'extension, fermé à la modification
- **L**iskov Substitution: Les sous-types doivent être substituables
- **I**nterface Segregation: Interfaces spécifiques plutôt que génériques
- **D**ependency Inversion: Dépendre des abstractions, pas des implémentations

## 📁 Structure des Dossiers

```
src/
├── domain/                      # Couche métier (cœur du système)
│   ├── entities/               # Entités métier (User, Session, LinkedAccount)
│   ├── value-objects/          # Objets valeur immuables (Email, Nickname)
│   ├── repositories/           # Interfaces des repositories
│   └── errors/                 # Erreurs métier customisées
│
├── application/                 # Couche application (orchestration)
│   ├── use-cases/              # Cas d'utilisation métier
│   │   ├── register-classic.use-case.ts
│   │   ├── login-classic.use-case.ts
│   │   ├── start-oauth.use-case.ts
│   │   ├── complete-oauth.use-case.ts
│   │   ├── refresh-token.use-case.ts
│   │   └── logout.use-case.ts
│   ├── services/               # Services applicatifs
│   ├── dto/                    # Data Transfer Objects
│   └── interfaces/             # Interfaces de repositories
│
├── infrastructure/              # Couche infrastructure (implémentations)
│   ├── database/               # Configuration TypeORM et migrations
│   │   ├── config/
│   │   ├── repositories/       # Implémentations concrètes des repositories
│   │   └── migrations/
│   ├── oauth/                  # Providers OAuth (Discord, Google, etc.)
│   ├── services/               # Services externes (Email, Redis, etc.)
│   └── di/                     # Dependency Injection container
│
├── presentation/                # Couche présentation (HTTP/REST)
│   ├── controllers/            # Contrôleurs REST
│   ├── routes/                 # Définition des routes Express
│   ├── middleware/             # Middlewares HTTP
│   ├── validators/             # Validation des requêtes
│   └── types/                  # Types TypeScript pour les requêtes/réponses
│
└── shared/                      # Code partagé entre toutes les couches
    ├── config/                 # Configuration centralisée
    ├── constants/              # Constantes globales
    ├── types/                  # Types partagés
    ├── utils/                  # Utilitaires (logger, crypto, etc.)
    └── middleware/             # Middlewares partagés
```

## 🔄 Flux de Données

### Exemple: Inscription d'un utilisateur

```
1. HTTP Request
   │
   ▼
2. Presentation Layer
   ├─ Route (/api/v1/auth/register)
   ├─ Middleware (validation, rate-limiting)
   └─ Controller (AuthController.register)
   │
   ▼
3. Application Layer
   ├─ Use Case (RegisterClassicUseCase)
   ├─ DTO (RegisterDto)
   └─ Service (AuthService)
   │
   ▼
4. Domain Layer
   ├─ Entity (User)
   ├─ Value Objects (Email, Nickname)
   └─ Repository Interface (IUserRepository)
   │
   ▼
5. Infrastructure Layer
   ├─ Repository Implementation (UserRepository)
   ├─ Database (TypeORM)
   └─ External Services (Email, Redis)
   │
   ▼
6. Response remonte la chaîne inversée
```

## 🗄️ Modèle de Données

### Entités Principales

#### User (Utilisateur)
```typescript
{
  id: string (UUID)
  email: Email (Value Object)
  nickname: Nickname (Value Object)
  password: string (hashed)
  isEmailVerified: boolean
  createdAt: Date
  updatedAt: Date
  // Relations
  sessions: Session[]
  linkedAccounts: LinkedAccount[]
}
```

#### Session (Token JWT)
```typescript
{
  id: string (UUID)
  userId: string
  refreshToken: string
  accessToken: string
  expiresAt: Date
  isRevoked: boolean
  ipAddress: string
  userAgent: string
  createdAt: Date
  // Relations
  user: User
}
```

#### LinkedAccount (Compte OAuth lié)
```typescript
{
  id: string (UUID)
  userId: string
  provider: 'discord' | 'google' | 'github' | 'twitch'
  providerUserId: string
  providerEmail: string
  providerUsername: string
  accessToken: string (encrypted)
  refreshToken: string (encrypted)
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  // Relations
  user: User
}
```

### Relations entre Entités

```
User (1) ──────< (N) Session
  │
  └──────< (N) LinkedAccount
```

## 🔐 Sécurité

### Authentification

1. **Classique (Email/Password)**
   - Hachage bcrypt (10 rounds)
   - Validation stricte du mot de passe
   - Protection contre le timing attack

2. **OAuth 2.0**
   - PKCE (Proof Key for Code Exchange)
   - State parameter pour CSRF protection
   - Tokens chiffrés en base de données

### Tokens JWT

```typescript
{
  // Access Token (15 minutes)
  payload: {
    userId: string,
    email: string,
    type: 'access'
  }

  // Refresh Token (7 jours)
  payload: {
    userId: string,
    sessionId: string,
    type: 'refresh'
  }
}
```

### Middlewares de Sécurité

1. **Helmet**: Headers HTTP sécurisés
2. **CORS**: Configuration stricte des origines
3. **Rate Limiting**: Protection DDoS
4. **Request Validation**: Joi schemas
5. **Error Handling**: Pas de leak d'informations sensibles

## 🔌 Intégrations OAuth

### Providers Supportés

| Provider | Statut | Scopes |
|----------|--------|--------|
| Discord  | ✅     | identify, email |
| Google   | ✅     | email, profile |
| GitHub   | ✅     | user:email |
| Twitch   | ✅     | user:read:email |

### Flux OAuth

```
1. User clique sur "Se connecter avec Discord"
   │
   ▼
2. StartOAuthUseCase génère l'URL d'autorisation
   - Crée un state token (CSRF protection)
   - Redirige vers Discord
   │
   ▼
3. User autorise l'application sur Discord
   │
   ▼
4. Discord redirige vers /callback avec code
   │
   ▼
5. CompleteOAuthUseCase
   - Vérifie le state token
   - Échange le code contre un access token
   - Récupère les infos utilisateur
   - Crée ou lie le compte
   - Génère les JWT tokens
   │
   ▼
6. Redirige vers le dashboard avec tokens
```

## 🧪 Stratégie de Tests

### Types de Tests

1. **Unit Tests** (Jest)
   - Use Cases
   - Services
   - Value Objects
   - Repositories

2. **Integration Tests** (Jest + Supertest)
   - Routes API
   - Database interactions
   - OAuth flow complet

3. **Frontend Tests** (Vitest)
   - Composants UI
   - Système de Toast
   - Validations formulaires

### Structure des Tests

```
tests/
├── unit/                       # Tests unitaires
│   ├── use-cases/
│   ├── services/
│   └── value-objects/
│
├── integration/                # Tests d'intégration
│   ├── api/
│   └── database/
│
└── frontend/                   # Tests frontend
    ├── unit/
    └── mocks/
```

## 📊 Logging et Monitoring

### Winston Logger

Niveaux de log:
- **error**: Erreurs critiques
- **warn**: Avertissements
- **info**: Informations générales
- **debug**: Debugging détaillé

Format de log:
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "message": "User registered successfully",
  "context": {
    "userId": "uuid",
    "email": "user@example.com"
  }
}
```

## 🚀 Déploiement

### Variables d'Environnement

**Obligatoires:**
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `NODE_ENV` (development, production, test)

**OAuth Providers (optionnels):**
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`

### Build et Start

```bash
# Build TypeScript
npm run build

# Start production
npm start

# Development avec hot-reload
npm run dev
```

## 🔧 Extensibilité

### Ajouter un nouveau Provider OAuth

1. Créer `src/infrastructure/oauth/providers/{provider}.provider.ts`
2. Implémenter l'interface `IOAuthProvider`
3. Ajouter les credentials dans `.env`
4. Enregistrer dans `OAuthProviderFactory`

### Ajouter un nouveau Use Case

1. Créer `src/application/use-cases/{feature}.use-case.ts`
2. Définir le DTO dans `src/application/dto/`
3. Ajouter le controller dans `src/presentation/controllers/`
4. Créer la route dans `src/presentation/routes/`

### Ajouter une nouvelle Entité

1. Créer l'entité dans `src/domain/entities/`
2. Créer l'interface repository dans `src/domain/repositories/`
3. Implémenter le repository dans `src/infrastructure/database/repositories/`
4. Générer la migration: `npm run migration:generate`

## 📚 Références

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design - Eric Evans](https://www.domainlanguage.com/ddd/)
- [TypeORM Documentation](https://typeorm.io/)
- [OAuth 2.0 RFC](https://oauth.net/2/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Note pour les agents IA:** Cette architecture est conçue pour être modulaire et extensible. Respectez toujours les couches et les dépendances pour maintenir la qualité du code.
