# 🧪 Tests SuperOAuth - Documentation Complète

**Version:** 1.0.0 | **Date:** 2025-11-19 | **Coverage Actuelle:** 18% Backend, 60%+ Frontend

---

## 📊 Situation Actuelle

### Résumé Exécutif

| Métrique | Backend (Jest) | Frontend (Vitest) | Total |
|----------|----------------|-------------------|-------|
| **Tests** | 41 | 249 | 290 |
| **Fichiers** | 5 | 13 | 18 |
| **Coverage** | ~18% 🔴 | ~60%+ 🟢 | ~35% 🟠 |
| **Statut** | INSUFFISANT | EXCELLENT | INCOMPLET |

**🚨 ALERTE SÉCURITÉ:** 71% des use-cases auth NON testés, middleware JWT non testé

### Chiffres Clés

- ✅ **Frontend:** 249 tests, 60%+ coverage, qualité A+
- ⚠️ **Backend:** 41 tests, 18% coverage, qualité inégale
- 🔴 **Use Cases:** 1/7 testés (14%)
- 🔴 **Middleware:** 0/4 testés (0%)
- 🔴 **Repositories:** 0/3 testés (0%)
- 🔴 **Mappers:** 0/3 testés (0%)

---

## 🚀 Quick Start

### Installation

```bash
# Dépendances (déjà installées)
npm install

# Vérifier configuration
npm run test -- --version  # Jest
npx vitest --version        # Vitest
```

### Commandes Principales

```bash
# ══════════════════════════════════════════════════════════════
#  TESTS BACKEND (Jest + TypeScript)
# ══════════════════════════════════════════════════════════════

npm run test                    # Tous les tests backend (41 tests)
npm run test:watch              # Mode watch (développement)
npm run test:coverage           # Coverage + rapport HTML
npm run test -- <pattern>       # Tests spécifiques (ex: login-classic)
npm run test -- --verbose       # Mode verbose

# ══════════════════════════════════════════════════════════════
#  TESTS FRONTEND (Vitest + Happy-DOM)
# ══════════════════════════════════════════════════════════════

npm run test:frontend           # Tous les tests frontend (249 tests)
npm run test:frontend:watch     # Mode watch (développement)
npm run test:frontend:ui        # Interface graphique Vitest
npm run test:frontend:coverage  # Coverage + rapport HTML
npx vitest -- <pattern>         # Tests spécifiques (ex: auth-service)
npx vitest -- --reporter=verbose # Mode verbose

# ══════════════════════════════════════════════════════════════
#  TESTS GLOBAUX
# ══════════════════════════════════════════════════════════════

npm run test:all                # Backend + Frontend (290 tests)
npm run test:all:coverage       # Coverage complet
npm run report:tests            # Génération rapport markdown

# ══════════════════════════════════════════════════════════════
#  DEBUG
# ══════════════════════════════════════════════════════════════

# Backend (Jest)
node --inspect-brk ./node_modules/.bin/jest --runInBand

# Frontend (Vitest)
npx vitest --inspect-brk <fichier>
```

### Résultats Attendus

```bash
# Backend (Jest)
Test Suites: 5 passed, 5 total
Tests:       41 passed, 41 total
Time:        ~5s

# Frontend (Vitest)
Test Files: 13 passed (13)
Tests:      249 passed (249)
Duration:   ~4.8s

# Total
Tests:      290 passed
Duration:   ~10s
```

---

## 🏗️ Structure des Tests

### Structure Actuelle (À Améliorer)

```
tests/
├── unit/                              # Tests backend (41 tests)
│   ├── analyze-bundle-size.util.test.js  ❌ À déplacer vers scripts/
│   ├── optimize-bundles.utils.test.js    ❌ À déplacer vers scripts/
│   ├── value-objects.test.ts             ✅ 18 tests - Excellent
│   ├── services/
│   │   └── token.service.test.ts         ✅ 14 tests - Bon
│   └── use-cases/
│       └── register-classic.test.ts      ✅ 6 tests - Incomplet
│
├── frontend/                          # Tests frontend (249 tests) ✅
│   ├── setup.js                       # Configuration Vitest
│   ├── mocks/
│   │   └── api.js                     # Mocks API (fetch, localStorage)
│   └── unit/
│       ├── auth-service.test.js       ✅ 15 tests
│       ├── dashboard-component.test.js ✅ 15 tests
│       ├── server-monitor.test.js     ✅ 15 tests
│       ├── shared-utils.test.js       ✅ 18 tests
│       ├── managers/
│       │   ├── toast-manager.test.js  ✅ 35 tests
│       │   └── token-manager.test.js  ✅ 36 tests
│       └── utils/
│           ├── error-handler.test.js  ✅ 7 tests
│           ├── format.test.js         ✅ 14 tests
│           ├── http.test.js           ✅ 22 tests
│           ├── logger.test.js         ✅ 9 tests
│           ├── storage.test.js        ✅ 21 tests
│           ├── ui.test.js             ✅ 14 tests
│           └── validation.test.js     ✅ 28 tests
│
└── README.md                          # Documentation
```

### Structure Cible (Clean Architecture)

```
tests/
├── unit/                              # Tests unitaires purs
│   ├── domain/                        # Domain Layer (DDD)
│   │   ├── value-objects/
│   │   │   ├── email.test.ts          🔴 À créer (4 tests)
│   │   │   ├── password.test.ts       🔴 À créer (6 tests)
│   │   │   ├── nickname.test.ts       🔴 À créer (4 tests)
│   │   │   └── user-id.test.ts        🔴 À créer (4 tests)
│   │   └── entities/
│   │       ├── user.entity.test.ts    🔴 À créer (12 tests)
│   │       └── linked-account.entity.test.ts 🔴 À créer (8 tests)
│   │
│   ├── application/                   # Application Layer
│   │   ├── use-cases/
│   │   │   ├── register-classic.test.ts      ✅ EXISTE (6 tests)
│   │   │   ├── login-classic.test.ts         🔴 URGENT (15 tests)
│   │   │   ├── refresh-token.test.ts         🔴 URGENT (10 tests)
│   │   │   ├── complete-oauth.test.ts        🔴 URGENT (12 tests)
│   │   │   ├── logout.test.ts                🔴 À créer (5 tests)
│   │   │   └── start-oauth.test.ts           🔴 À créer (8 tests)
│   │   └── services/
│   │       ├── auth.service.test.ts          🔴 À créer (10 tests)
│   │       └── user.service.test.ts          🔴 À créer (12 tests)
│   │
│   ├── infrastructure/                # Infrastructure Layer
│   │   ├── services/
│   │   │   ├── token.service.test.ts         ✅ EXISTE (14 tests)
│   │   │   ├── oauth.service.test.ts         🔴 URGENT (20 tests)
│   │   │   ├── password.service.test.ts      🔴 À créer (6 tests)
│   │   │   └── session.repository.test.ts    🔴 À créer (10 tests)
│   │   ├── repositories/
│   │   │   ├── user.repository.test.ts       🔴 À créer (15 tests)
│   │   │   ├── session.repository.test.ts    🔴 À créer (10 tests)
│   │   │   └── linked-account.repository.test.ts 🔴 À créer (10 tests)
│   │   └── mappers/
│   │       ├── user.mapper.test.ts           🔴 À créer (8 tests)
│   │       ├── session.mapper.test.ts        🔴 À créer (6 tests)
│   │       └── linked-account.mapper.test.ts 🔴 À créer (6 tests)
│   │
│   └── presentation/                  # Presentation Layer
│       ├── middleware/
│       │   ├── auth.middleware.test.ts       🔴 URGENT (12 tests)
│       │   ├── validation.middleware.test.ts 🔴 URGENT (8 tests)
│       │   ├── error.middleware.test.ts      🔴 À créer (6 tests)
│       │   └── rate-limit.middleware.test.ts 🔴 À créer (5 tests)
│       └── validators/
│           └── request.validators.test.ts    🔴 À créer (10 tests)
│
├── integration/                       # Tests d'intégration
│   ├── api/
│   │   ├── auth.routes.integration.test.ts   🔴 Phase 4 (25 tests)
│   │   └── oauth.routes.integration.test.ts  🔴 Phase 4 (20 tests)
│   └── database/
│       └── repositories.integration.test.ts  🔴 Phase 4 (25 tests)
│
├── e2e/                               # Tests E2E (futur)
│   └── auth-flow.e2e.test.ts          🟡 Futur (Playwright/Cypress)
│
├── scripts/                           # Tests scripts tooling
│   ├── analyze-bundle-size.test.js    ⬅️ Déplacer ici
│   └── optimize-bundles.test.js       ⬅️ Déplacer ici
│
├── frontend/                          # Tests frontend (OK)
│   └── ...                            ✅ 249 tests - Ne pas modifier
│
├── mocks/                             # Mocks partagés (à créer)
│   ├── repositories.mock.ts           🔴 À créer
│   ├── services.mock.ts               🔴 À créer
│   └── entities.mock.ts               🔴 À créer
│
├── fixtures/                          # Données de test (à créer)
│   ├── users.fixture.ts               🔴 À créer
│   ├── tokens.fixture.ts              🔴 À créer
│   └── oauth-responses.fixture.ts     🔴 À créer
│
├── README.md                          # Cette documentation
├── CONTRIBUTING.md                    🔴 À créer - Guide écriture tests
├── COVERAGE_REPORT.md                 🔴 À créer - Rapport auto-généré
└── SECURITY_TESTS.md                  🔴 À créer - Tests sécurité spécifiques
```

### Commande de Réorganisation

```bash
# Créer la nouvelle structure
mkdir -p tests/{unit/{domain/{value-objects,entities},application/{use-cases,services},infrastructure/{services,repositories,mappers},presentation/{middleware,validators}},integration/{api,database},scripts,mocks,fixtures}

# Déplacer les tests scripts
mv tests/unit/analyze-bundle-size.util.test.js tests/scripts/
mv tests/unit/optimize-bundles.utils.test.js tests/scripts/

# Splitter value-objects.test.ts (manuel)
# Voir section "Migration Guide" ci-dessous
```

---

## 📈 État des Tests par Composant

### Domain Layer

| Composant | Fichier Test | Tests | Coverage | Statut | Priorité |
|-----------|--------------|-------|----------|--------|----------|
| **Value Objects** | | | | | |
| Email | value-objects.test.ts | 4/4 | 100% | ✅ | - |
| Password | value-objects.test.ts | 6/6 | 100% | ✅ | - |
| Nickname | value-objects.test.ts | 4/4 | 100% | ✅ | - |
| UserId | value-objects.test.ts | 4/4 | 95% | ✅ | - |
| **Entities** | | | | | |
| User | ❌ | 0/12 | 0% | 🔴 MANQUANT | 🟡 Moyenne |
| LinkedAccount | ❌ | 0/8 | 0% | 🔴 MANQUANT | 🟡 Moyenne |

### Application Layer

| Composant | Fichier Test | Tests | Coverage | Statut | Priorité |
|-----------|--------------|-------|----------|--------|----------|
| **Use Cases** | | | | | |
| register-classic | register-classic.test.ts | 6/6 | 70% | ✅ EXISTE | Améliorer |
| login-classic | ❌ | 0/15 | 0% | 🔴 MANQUANT | 🔴🔴🔴 URGENTE |
| refresh-token | ❌ | 0/10 | 0% | 🔴 MANQUANT | 🔴🔴🔴 URGENTE |
| complete-oauth | ❌ | 0/12 | 0% | 🔴 MANQUANT | 🔴🔴🔴 URGENTE |
| logout | ❌ | 0/5 | 0% | 🔴 MANQUANT | 🟠 Haute |
| start-oauth | ❌ | 0/8 | 0% | 🔴 MANQUANT | 🟠 Haute |
| **Services** | | | | | |
| auth.service | ❌ | 0/10 | 0% | 🔴 MANQUANT | 🟡 Moyenne |
| user.service | ❌ | 0/12 | 0% | 🔴 MANQUANT | 🟡 Moyenne |

### Infrastructure Layer

| Composant | Fichier Test | Tests | Coverage | Statut | Priorité |
|-----------|--------------|-------|----------|--------|----------|
| **Services** | | | | | |
| token.service | token.service.test.ts | 14/14 | 85% | ✅ EXISTE | - |
| oauth.service | ❌ | 0/20 | 0% | 🔴 MANQUANT | 🔴🔴 Urgente |
| password.service | ❌ | 0/6 | 0% | 🔴 MANQUANT | 🟠 Haute |
| session.repository | ❌ | 0/10 | 0% | 🔴 MANQUANT | 🟠 Haute |
| **Repositories** | | | | | |
| user.repository | ❌ | 0/15 | 0% | 🔴 MANQUANT | 🟠 Haute |
| session.repository | ❌ | 0/10 | 0% | 🔴 MANQUANT | 🟠 Moyenne |
| linked-account.repository | ❌ | 0/10 | 0% | 🔴 MANQUANT | 🟠 Moyenne |
| **Mappers** | | | | | |
| user.mapper | ❌ | 0/8 | 0% | 🔴 MANQUANT | 🟠 Haute |
| session.mapper | ❌ | 0/6 | 0% | 🔴 MANQUANT | 🟠 Moyenne |
| linked-account.mapper | ❌ | 0/6 | 0% | 🔴 MANQUANT | 🟠 Moyenne |

### Presentation Layer

| Composant | Fichier Test | Tests | Coverage | Statut | Priorité |
|-----------|--------------|-------|----------|--------|----------|
| **Middleware** | | | | | |
| auth.middleware | ❌ | 0/12 | 0% | 🔴 MANQUANT | 🔴🔴🔴 URGENTE |
| validation.middleware | ❌ | 0/8 | 0% | 🔴 MANQUANT | 🔴🔴 Urgente |
| error.middleware | ❌ | 0/6 | 0% | 🔴 MANQUANT | 🟡 Moyenne |
| rate-limit.middleware | ❌ | 0/5 | 0% | 🔴 MANQUANT | 🟡 Faible |
| **Validators** | | | | | |
| request.validators | ❌ | 0/10 | 0% | 🔴 MANQUANT | 🟠 Haute |

### Frontend (État Actuel - Ne PAS Modifier)

| Composant | Fichier Test | Tests | Coverage | Qualité |
|-----------|--------------|-------|----------|---------|
| auth-service | auth-service.test.js | 15 | ~70% | ⭐⭐⭐⭐ A |
| dashboard-component | dashboard-component.test.js | 15 | ~65% | ⭐⭐⭐⭐ A |
| server-monitor | server-monitor.test.js | 15 | ~75% | ⭐⭐⭐⭐⭐ A+ |
| shared-utils | shared-utils.test.js | 18 | ~70% | ⭐⭐⭐⭐ A |
| toast-manager | managers/toast-manager.test.js | 35 | ~85% | ⭐⭐⭐⭐⭐ A+ |
| token-manager | managers/token-manager.test.js | 36 | ~85% | ⭐⭐⭐⭐⭐ A+ |
| validation | utils/validation.test.js | 28 | ~90% | ⭐⭐⭐⭐⭐ A+ |
| http | utils/http.test.js | 22 | ~75% | ⭐⭐⭐⭐⭐ A+ |
| storage | utils/storage.test.js | 21 | ~70% | ⭐⭐⭐⭐ A |
| format | utils/format.test.js | 14 | ~60% | ⭐⭐⭐⭐ A |
| ui | utils/ui.test.js | 14 | ~60% | ⭐⭐⭐⭐ A |
| logger | utils/logger.test.js | 9 | ~50% | ⭐⭐⭐ B+ |
| error-handler | utils/error-handler.test.js | 7 | ~50% | ⭐⭐⭐ B+ |
| **TOTAL** | | **249** | **60%+** | **🟢 EXCELLENT** |

---

## 🎯 Plan d'Action

Voir les fichiers détaillés:
- **`TESTS_ACTION_PLAN.md`** - Plan jour par jour (10 jours)
- **`TESTS_DASHBOARD.md`** - Vue visuelle des priorités
- **`AUDIT_TESTS_COMPLET.md`** - Analyse exhaustive (50+ pages)

### Résumé des Phases

| Phase | Durée | Tests | Impact | Priorité |
|-------|-------|-------|--------|----------|
| **Phase 1** | 2 jours | +77 | Coverage 18%→40%, Sécurité | 🔴 URGENTE |
| **Phase 2** | 3 jours | +84 | Coverage 40%→60%, Business | 🟠 Haute |
| **Phase 3** | 2 jours | +67 | Coverage 60%→72%, Complétion | 🟡 Moyenne |
| **Phase 4** | 2 jours | +70 | Coverage 72%→82%+, E2E | 🔵 Intégration |
| **TOTAL** | 9-10j | **+298** | **18%→82%+** | - |

---

## 🔧 Configuration

### Jest (Backend - TypeScript)

**Fichier:** `jest.config.ts`

```typescript
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    // ...
  },
  coverageProvider: 'v8',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 75,
      statements: 75
    }
  }
}
```

### Vitest (Frontend - JavaScript)

**Fichier:** `vitest.config.ts`

```typescript
{
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/frontend/setup.js'],
    include: ['tests/frontend/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['tests/**', 'node_modules/**'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60
      }
    }
  }
}
```

---

## 📚 Standards de Qualité

### Pattern AAA (Arrange-Act-Assert)

```typescript
// ✅ BON
describe('LoginClassicUseCase', () => {
  it('should login user with valid credentials', async () => {
    // Arrange - Préparer les données et mocks
    const dto = { email: 'test@example.com', password: 'Valid123!' };
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockTokenService.generateAccessToken.mockReturnValue('access-token');

    // Act - Exécuter l'action à tester
    const result = await useCase.execute(dto);

    // Assert - Vérifier les résultats
    expect(result.accessToken).toBe('access-token');
    expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(dto.email);
  });
});

// ❌ MAUVAIS
it('login test', async () => {
  const result = await useCase.execute({ email: 'test@example.com', password: 'Valid123!' });
  expect(result).toBeTruthy(); // Vague!
});
```

### Mocks Typés (TypeScript)

```typescript
// ✅ BON - Mocks typés avec jest.Mocked
let mockUserRepo: jest.Mocked<IUserRepository>;
let mockTokenService: jest.Mocked<ITokenService>;

beforeEach(() => {
  mockUserRepo = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  } as jest.Mocked<IUserRepository>;

  // Tous les mocks sont typés et auto-complétés
  mockUserRepo.findByEmail.mockResolvedValue(mockUser); // ✅ TypeScript OK
});

// ❌ MAUVAIS - Mocks non typés
const mockUserRepo = {
  findByEmail: jest.fn()
}; // Pas de vérification TypeScript
```

### Edge Cases (Cas Limites)

```typescript
// ✅ BON - Couvrir tous les edge cases
describe('Email Value Object', () => {
  it('should accept valid email', () => {
    expect(Email.create('test@example.com').toString()).toBe('test@example.com');
  });

  it('should reject invalid email', () => {
    expect(() => Email.create('invalid')).toThrow();
  });

  it('should handle null', () => {
    expect(() => Email.create(null as any)).toThrow();
  });

  it('should handle undefined', () => {
    expect(() => Email.create(undefined as any)).toThrow();
  });

  it('should handle empty string', () => {
    expect(() => Email.create('')).toThrow();
  });

  it('should handle whitespace', () => {
    expect(() => Email.create('   ')).toThrow();
  });
});

// ❌ MAUVAIS - Seul le happy path
describe('Email', () => {
  it('should work', () => {
    expect(Email.create('test@example.com')).toBeTruthy();
  });
});
```

### Isolation des Tests

```typescript
// ✅ BON - Isolation complète
describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    // Setup AVANT chaque test (isolation)
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    tokenService = new TokenService();
  });

  afterEach(() => {
    // Cleanup APRÈS chaque test (isolation)
    delete process.env.JWT_ACCESS_SECRET;
  });

  it('test 1', () => {
    // Ce test ne peut pas affecter test 2
  });

  it('test 2', () => {
    // Ce test part d'un état propre
  });
});

// ❌ MAUVAIS - État partagé
describe('TokenService', () => {
  const tokenService = new TokenService(); // Créé UNE fois

  it('test 1', () => {
    tokenService.generateAccessToken('user1'); // Modifie l'état
  });

  it('test 2', () => {
    // État pollué par test 1 ❌
  });
});
```

---

## 🛠️ Templates de Tests

### Use Case Test Template

```typescript
// tests/unit/application/use-cases/login-classic.test.ts
import { LoginClassicUseCase } from '@/application/use-cases/login-classic.use-case';
import { IUserRepository, ITokenService, ISessionRepository } from '@/application/interfaces/repositories.interface';
import { User } from '@/domain/entities';

describe('LoginClassicUseCase', () => {
  let useCase: LoginClassicUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockSessionRepo: jest.Mocked<ISessionRepository>;

  beforeEach(() => {
    // Setup mocks
    mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      getTokenExpiration: jest.fn(),
    } as jest.Mocked<ITokenService>;

    mockSessionRepo = {
      create: jest.fn(),
      findByRefreshToken: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteByRefreshToken: jest.fn(),
    } as jest.Mocked<ISessionRepository>;

    useCase = new LoginClassicUseCase(mockUserRepo, mockTokenService, mockSessionRepo);
  });

  describe('Happy Path', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const dto = { email: 'test@example.com', password: 'Valid123!' };
      const mockUser = User.createWithEmail(/* ... */);

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockSessionRepo.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Cases', () => {
    it('should throw if user not found', async () => {
      // Arrange
      const dto = { email: 'nonexistent@example.com', password: 'Valid123!' };
      mockUserRepo.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw if password incorrect', async () => {
      // Arrange
      const dto = { email: 'test@example.com', password: 'WrongPassword' };
      const mockUser = User.createWithEmail(/* ... */);
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw if user inactive', async () => {
      // Arrange
      const dto = { email: 'test@example.com', password: 'Valid123!' };
      const mockUser = User.createWithEmail(/* ... */);
      mockUser.isActive = false; // User désactivé
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Account is deactivated');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing email', async () => {
      // Arrange
      const dto = { email: '', password: 'Valid123!' };

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow();
    });

    it('should handle null password', async () => {
      // Arrange
      const dto = { email: 'test@example.com', password: null as any };

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow();
    });
  });
});
```

### Middleware Test Template

```typescript
// tests/unit/presentation/middleware/auth.middleware.test.ts
import { authenticateToken } from '@/presentation/middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mock JWT
jest.mock('jsonwebtoken');

describe('authenticateToken Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    req = {
      headers: {},
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  describe('Missing Token', () => {
    it('should return 401 if no authorization header', async () => {
      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Access token is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header malformed', async () => {
      // Arrange
      req.headers!.authorization = 'InvalidFormat';

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Invalid Token', () => {
    it('should return 401 if token invalid', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer invalid-token';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid access token'
      });
    });

    it('should return 401 if token expired', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer expired-token';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Access token has expired'
      });
    });

    it('should return 401 if token type is not access', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer refresh-token';
      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-123',
        type: 'refresh' // ❌ Wrong type
      });

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid token type'
      });
    });
  });

  describe('Valid Token', () => {
    it('should call next() and attach user to request', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer valid-access-token';
      const mockPayload = {
        userId: 'user-123',
        type: 'access',
        email: 'test@example.com',
        nickname: 'testuser',
        isActive: true
      };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect((req as any).user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        nickname: 'testuser',
        isActive: true
      });
    });
  });
});
```

### Repository Test Template (Unitaire)

```typescript
// tests/unit/infrastructure/repositories/user.repository.test.ts
import { UserRepository } from '@/infrastructure/database/repositories/user.repository';
import { User } from '@/domain/entities';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { Repository } from 'typeorm';

// Mock TypeORM
jest.mock('@/infrastructure/database/config/database.config');

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockTypeOrmRepo: jest.Mocked<Repository<UserEntity>>;

  beforeEach(() => {
    mockTypeOrmRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    repository = new UserRepository();
    (repository as any).repository = mockTypeOrmRepo;
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      // Arrange
      const mockEntity = { id: 'user-123', email: 'test@example.com', /* ... */ };
      mockTypeOrmRepo.findOne.mockResolvedValue(mockEntity as UserEntity);

      // Act
      const user = await repository.findById('user-123');

      // Assert
      expect(user).not.toBeNull();
      expect(user!.id).toBe('user-123');
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        relations: ['linkedAccounts', 'sessions']
      });
    });

    it('should return null if not found', async () => {
      // Arrange
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      // Act
      const user = await repository.findById('nonexistent');

      // Assert
      expect(user).toBeNull();
    });
  });

  describe('save', () => {
    it('should save user entity', async () => {
      // Arrange
      const mockUser = User.createWithEmail(/* ... */);
      mockTypeOrmRepo.save.mockResolvedValue({} as UserEntity);

      // Act
      await repository.save(mockUser);

      // Assert
      expect(mockTypeOrmRepo.save).toHaveBeenCalledTimes(1);
    });
  });
});
```

---

## 📊 Coverage Reports

### Génération Coverage

```bash
# Backend (Jest)
npm run test:coverage
# Output: coverage/index.html

# Frontend (Vitest)
npm run test:frontend:coverage
# Output: coverage/index.html

# Global
npm run test:all:coverage
# Output: coverage/backend/ et coverage/frontend/
```

### Seuils de Coverage

**Configuration Jest:**
```typescript
coverageThreshold: {
  global: {
    branches: 75,
    functions: 80,
    lines: 75,
    statements: 75
  },
  './src/domain/**/*.ts': {
    branches: 90,
    functions: 95,
    lines: 90,
    statements: 90
  },
  './src/application/use-cases/**/*.ts': {
    branches: 85,
    functions: 90,
    lines: 85,
    statements: 85
  }
}
```

**Objectifs par Layer:**
- Domain: 90%+
- Application: 85%+
- Infrastructure: 75%+
- Presentation: 65%+

---

## 🐛 Debugging Tests

### Backend (Jest)

```bash
# Mode debug avec Chrome DevTools
node --inspect-brk ./node_modules/.bin/jest --runInBand

# Puis ouvrir chrome://inspect

# Test spécifique en debug
node --inspect-brk ./node_modules/.bin/jest --runInBand --testNamePattern="should login"

# Verbose output
npm test -- --verbose

# Watch mode avec filtre
npm test -- --watch --testPathPattern=login
```

### Frontend (Vitest)

```bash
# Mode debug
npx vitest --inspect-brk auth-service

# UI mode (recommandé)
npm run test:frontend:ui
# Ouvrir http://localhost:51204/__vitest__/

# Watch mode
npm run test:frontend:watch

# Run spécifique
npx vitest -- auth-service
```

---

## 🆘 Troubleshooting

### Problème: Tests TypeScript ne passent pas

```bash
# Vérifier compilation TypeScript
npm run typecheck

# Rebuilder
npm run build

# Vérifier paths aliases
# jest.config.ts → moduleNameMapper doit matcher tsconfig.json paths
```

### Problème: Mocks ne fonctionnent pas

```typescript
// ✅ BON - Mock AVANT l'import
jest.mock('jsonwebtoken');
import jwt from 'jsonwebtoken';

// ❌ MAUVAIS - Import AVANT le mock
import jwt from 'jsonwebtoken';
jest.mock('jsonwebtoken'); // Trop tard!
```

### Problème: Tests frontend timeout

```javascript
// Augmenter timeout
describe('Slow component', () => {
  it('should load data', async () => {
    // ...
  }, 10000); // 10s timeout
});

// Ou dans setup.js
vi.setConfig({ testTimeout: 10000 });
```

### Problème: Coverage ne monte pas

```bash
# Vérifier fichiers exclus
npm run test:coverage -- --verbose

# Coverage détaillée par fichier
npm run test:coverage -- --collectCoverageFrom="src/application/**/*.ts"

# Générer rapport HTML et analyser
npm run test:coverage && open coverage/index.html
```

---

## 📖 Ressources

### Documentation Officielle

- **Jest:** https://jestjs.io/docs/getting-started
- **Vitest:** https://vitest.dev/guide/
- **Testing Library:** https://testing-library.com/docs/
- **Supertest:** https://github.com/ladjs/supertest
- **Test Containers:** https://github.com/testcontainers/testcontainers-node

### Guides Internes

- **AUDIT_TESTS_COMPLET.md** - Analyse détaillée (50+ pages)
- **TESTS_ACTION_PLAN.md** - Plan d'action 10 jours
- **TESTS_DASHBOARD.md** - Vue d'ensemble visuelle
- **CONTRIBUTING.md** (à créer) - Guide contribution tests

### Exemples de Référence

**Frontend (à dupliquer pour backend):**
- `tests/frontend/unit/managers/token-manager.test.js` (36 tests, A+)
- `tests/frontend/unit/utils/validation.test.js` (28 tests, A+)
- `tests/frontend/unit/utils/http.test.js` (22 tests, A+)

**Backend (existants):**
- `tests/unit/value-objects.test.ts` (18 tests, A+)
- `tests/unit/services/token.service.test.ts` (14 tests, A)
- `tests/unit/use-cases/register-classic.test.ts` (6 tests, B)

---

## 🚀 Prochaines Étapes

### Immédiat (Cette Semaine)

1. ✅ **Lire AUDIT_TESTS_COMPLET.md** - Comprendre l'état actuel
2. ✅ **Lire TESTS_ACTION_PLAN.md** - Plan détaillé jour par jour
3. 🔴 **DÉMARRER PHASE 1** - Tests sécurité critiques
   - Créer `login-classic.test.ts` (15 tests)
   - Créer `auth.middleware.test.ts` (12 tests)
   - Créer `refresh-token.test.ts` (10 tests)

### Court Terme (2 Semaines)

4. Compléter Phase 1-2 (161 tests)
5. Coverage backend → 60%+
6. Risque sécurité résolu

### Moyen Terme (1 Mois)

7. Phases 3-4 complètes
8. Coverage → 82%+
9. Tests E2E intégration

---

## 📞 Support

**Questions?**
- Voir `AUDIT_TESTS_COMPLET.md` pour l'analyse détaillée
- Voir `TESTS_ACTION_PLAN.md` pour le plan d'action
- Voir `TESTS_DASHBOARD.md` pour la vue d'ensemble

**Bugs/Issues:**
- Vérifier console errors
- Vérifier TypeScript compilation
- Vérifier mocks configuration

---

**Dernière mise à jour:** 2025-11-19
**Version:** 2.0.0 (après audit)
**Statut:** 🔴 URGENT - Démarrer Phase 1 immédiatement
