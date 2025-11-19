# Plan d'Action - Tests SuperOAuth

**Date:** 2025-11-19
**Objectif:** Passer de 18% à 75%+ de couverture backend
**Délai:** 7-10 jours

---

## Situation Actuelle

| Métrique | Valeur | Statut |
|----------|--------|--------|
| Tests Backend | 41 | 🔴 INSUFFISANT |
| Tests Frontend | 249 | 🟢 EXCELLENT |
| Coverage Backend | ~18% | 🔴 CRITIQUE |
| Coverage Frontend | ~60%+ | 🟢 ATTEINT |
| Use Cases testés | 1/7 (14%) | 🔴 CRITIQUE |
| Middleware testés | 0/4 (0%) | 🔴 CRITIQUE |

**PROBLÈME MAJEUR:** Sécurité insuffisamment testée (auth, OAuth, JWT)

---

## Phase 1 - URGENT (Jours 1-2) 🔴

**Priorité: Sécurité Maximale**

### Tests à Créer (77 tests)

1. **Use Cases Auth (37 tests)**
   ```
   tests/unit/application/use-cases/
   ├── login-classic.test.ts          (15 tests) 🔴🔴🔴
   ├── refresh-token.test.ts          (10 tests) 🔴🔴🔴
   └── complete-oauth.test.ts         (12 tests) 🔴🔴🔴
   ```

2. **Middleware Sécurité (20 tests)**
   ```
   tests/unit/presentation/middleware/
   ├── auth.middleware.test.ts        (12 tests) 🔴🔴🔴
   └── validation.middleware.test.ts   (8 tests) 🔴🔴
   ```

3. **Service OAuth (20 tests)**
   ```
   tests/unit/infrastructure/services/
   └── oauth.service.test.ts          (20 tests) 🔴🔴
   ```

**Impact:** Risque sécurité 🔴 → 🟡, Coverage 18% → 40%

---

## Phase 2 - HAUTE (Jours 3-5) 🟠

**Priorité: Couverture Business Logic**

### Tests à Créer (84 tests)

4. **Use Cases Restants (13 tests)**
   ```
   tests/unit/application/use-cases/
   ├── logout.test.ts                  (5 tests)
   └── start-oauth.test.ts             (8 tests)
   ```

5. **Services & Repositories (41 tests)**
   ```
   tests/unit/infrastructure/
   ├── services/
   │   ├── password.service.test.ts    (6 tests)
   │   └── session.repository.test.ts  (10 tests)
   └── repositories/
       ├── user.repository.test.ts     (15 tests)
       ├── session.repository.test.ts  (10 tests)
       └── linked-account.repository.test.ts (10 tests)
   ```

6. **Mappers (20 tests) - CRITIQUE Intégrité**
   ```
   tests/unit/infrastructure/mappers/
   ├── user.mapper.test.ts             (8 tests)
   ├── session.mapper.test.ts          (6 tests)
   └── linked-account.mapper.test.ts   (6 tests)
   ```

7. **Validators (10 tests)**
   ```
   tests/unit/presentation/validators/
   └── request.validators.test.ts      (10 tests)
   ```

**Impact:** Coverage 40% → 60%

---

## Phase 3 - MOYENNE (Jours 6-8) 🟡

**Priorité: Complétion Domain + Middleware**

### Tests à Créer (67 tests)

8. **Entités Domain (20 tests)**
   ```
   tests/unit/domain/entities/
   ├── user.entity.test.ts             (12 tests)
   └── linked-account.entity.test.ts   (8 tests)
   ```

9. **Services Application (22 tests)**
   ```
   tests/unit/application/services/
   ├── auth.service.test.ts            (10 tests)
   └── user.service.test.ts            (12 tests)
   ```

10. **Middleware Restants (11 tests)**
    ```
    tests/unit/presentation/middleware/
    ├── error.middleware.test.ts        (6 tests)
    └── rate-limit.middleware.test.ts   (5 tests)
    ```

11. **Value Objects Split (14 tests)**
    ```
    tests/unit/domain/value-objects/
    ├── email.test.ts                   (4 tests)
    ├── password.test.ts                (4 tests)
    ├── nickname.test.ts                (3 tests)
    └── user-id.test.ts                 (3 tests)
    ```

**Impact:** Coverage 60% → 72%

---

## Phase 4 - Intégration (Jours 9-10) 🔵

**Priorité: Tests E2E API**

### Tests à Créer (70 tests)

12. **Controllers Integration (45 tests)**
    ```
    tests/integration/api/
    ├── auth.controller.integration.test.ts   (25 tests)
    └── oauth.controller.integration.test.ts  (20 tests)
    ```

13. **Database Integration (25 tests)**
    ```
    tests/integration/database/
    ├── user.repository.integration.test.ts     (15 tests)
    └── session.repository.integration.test.ts  (10 tests)
    ```

**Impact:** Coverage 72% → 82%+, Tests réalistes

---

## Réorganisation Structure

### Avant (Actuel)
```
tests/
├── unit/
│   ├── analyze-bundle-size.util.test.js  ❌ Mélangé avec core
│   ├── optimize-bundles.utils.test.js    ❌ Mélangé avec core
│   ├── value-objects.test.ts
│   ├── services/
│   │   └── token.service.test.ts
│   └── use-cases/
│       └── register-classic.test.ts
└── frontend/ (OK)
```

### Après (Proposé)
```
tests/
├── unit/
│   ├── domain/               # Value Objects, Entities
│   ├── application/          # Use Cases, Services
│   ├── infrastructure/       # Repositories, Services, Mappers
│   └── presentation/         # Middleware, Validators
├── integration/              # API, Database
├── scripts/                  # Tooling tests (déplacer bundle tests ici)
├── frontend/                 # OK (249 tests)
├── mocks/                    # Mocks partagés
└── fixtures/                 # Données test
```

**Action:** `mkdir -p tests/{unit/{domain,application,infrastructure,presentation},integration,scripts,mocks,fixtures}`

---

## Checklist Quotidienne

### Jour 1 (Phase 1.1)
- [ ] Créer `login-classic.test.ts` (15 tests)
- [ ] Créer `auth.middleware.test.ts` (12 tests)
- **Objectif:** 27 tests, Coverage +5%

### Jour 2 (Phase 1.2)
- [ ] Créer `refresh-token.test.ts` (10 tests)
- [ ] Créer `complete-oauth.test.ts` (12 tests)
- [ ] Créer `validation.middleware.test.ts` (8 tests)
- **Objectif:** 30 tests, Coverage +8%

### Jour 3 (Phase 1.3 + 2.1)
- [ ] Créer `oauth.service.test.ts` (20 tests)
- [ ] Créer `logout.test.ts` (5 tests)
- [ ] Créer `start-oauth.test.ts` (8 tests)
- **Objectif:** 33 tests, Coverage +7%

### Jour 4 (Phase 2.2)
- [ ] Créer `password.service.test.ts` (6 tests)
- [ ] Créer `user.repository.test.ts` (15 tests)
- [ ] Créer `session.repository.test.ts` (10 tests)
- **Objectif:** 31 tests, Coverage +6%

### Jour 5 (Phase 2.3)
- [ ] Créer `linked-account.repository.test.ts` (10 tests)
- [ ] Créer `user.mapper.test.ts` (8 tests)
- [ ] Créer `session.mapper.test.ts` (6 tests)
- [ ] Créer `linked-account.mapper.test.ts` (6 tests)
- **Objectif:** 30 tests, Coverage +5%

### Jour 6 (Phase 2.4 + 3.1)
- [ ] Créer `request.validators.test.ts` (10 tests)
- [ ] Créer `user.entity.test.ts` (12 tests)
- [ ] Créer `linked-account.entity.test.ts` (8 tests)
- **Objectif:** 30 tests, Coverage +5%

### Jour 7 (Phase 3.2)
- [ ] Créer `auth.service.test.ts` (10 tests)
- [ ] Créer `user.service.test.ts` (12 tests)
- [ ] Créer `error.middleware.test.ts` (6 tests)
- [ ] Créer `rate-limit.middleware.test.ts` (5 tests)
- **Objectif:** 33 tests, Coverage +4%

### Jour 8 (Phase 3.3 - Refactor)
- [ ] Split `value-objects.test.ts` en 4 fichiers
- [ ] Réorganiser structure folders
- [ ] Déplacer tests scripts
- **Objectif:** Organisation, pas nouveaux tests

### Jour 9 (Phase 4.1)
- [ ] Créer `auth.controller.integration.test.ts` (25 tests)
- [ ] Setup Supertest + Test Database
- **Objectif:** 25 tests, Coverage +4%

### Jour 10 (Phase 4.2)
- [ ] Créer `oauth.controller.integration.test.ts` (20 tests)
- [ ] Créer `repositories.integration.test.ts` (25 tests)
- [ ] Génération rapport coverage final
- **Objectif:** 45 tests, Coverage +4%

---

## Métriques de Succès

### Objectifs Numériques

| Métrique | Jour 0 | Jour 5 | Jour 10 | Objectif |
|----------|--------|--------|---------|----------|
| **Tests Backend** | 41 | 160+ | 340+ | 340 ✅ |
| **Coverage** | 18% | 60% | 82%+ | 75% ✅ |
| **Use Cases** | 1/7 | 5/7 | 7/7 | 7/7 ✅ |
| **Middleware** | 0/4 | 2/4 | 4/4 | 4/4 ✅ |
| **Repositories** | 0/3 | 3/3 | 3/3 | 3/3 ✅ |
| **Mappers** | 0/3 | 3/3 | 3/3 | 3/3 ✅ |

### Critères de Qualité

Pour CHAQUE test créé:
- ✅ Pattern AAA (Arrange-Act-Assert)
- ✅ Mocks typés (`jest.Mocked<T>`)
- ✅ Edge cases (null, undefined, empty)
- ✅ Happy path + Error paths
- ✅ Nomenclature claire (describe/it)
- ✅ Isolation (beforeEach/afterEach)

---

## Commandes Utiles

```bash
# Lancer tests backend
npm test

# Lancer tests frontend
npm run test:frontend

# Lancer TOUS les tests
npm run test:all

# Coverage backend
npm run test:coverage

# Coverage frontend
npm run test:frontend:coverage

# Coverage global
npm run test:all:coverage

# Watch mode (dev)
npm run test:watch
npm run test:frontend:watch

# Test spécifique
npm test -- login-classic
npx vitest -- auth-service

# Verbose
npm test -- --verbose
npx vitest -- --reporter=verbose

# Réorganiser structure
mkdir -p tests/{unit/{domain/{value-objects,entities},application/{use-cases,services},infrastructure/{services,repositories,mappers},presentation/{middleware,validators}},integration/{api,database},scripts,mocks,fixtures}

# Déplacer tests scripts
mv tests/unit/analyze-bundle-size.util.test.js tests/scripts/
mv tests/unit/optimize-bundles.utils.test.js tests/scripts/
```

---

## Exemples de Templates

### Template Use Case Test
```typescript
// tests/unit/application/use-cases/login-classic.test.ts
import { LoginClassicUseCase } from '@/application/use-cases/login-classic.use-case';
import { IUserRepository, ITokenService, ISessionRepository } from '@/application/interfaces/repositories.interface';

describe('LoginClassicUseCase', () => {
  let useCase: LoginClassicUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockSessionRepo: jest.Mocked<ISessionRepository>;

  beforeEach(() => {
    mockUserRepo = { /* ... */ } as jest.Mocked<IUserRepository>;
    mockTokenService = { /* ... */ } as jest.Mocked<ITokenService>;
    mockSessionRepo = { /* ... */ } as jest.Mocked<ISessionRepository>;

    useCase = new LoginClassicUseCase(mockUserRepo, mockTokenService, mockSessionRepo);
  });

  describe('Happy Path', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const dto = { email: 'test@example.com', password: 'Valid123!' };
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken.mockReturnValue('access-token');

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result.accessToken).toBe('access-token');
      expect(mockSessionRepo.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Cases', () => {
    it('should throw if user not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      await expect(useCase.execute(dto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw if password incorrect', async () => {
      // ...
    });

    it('should throw if user inactive', async () => {
      // ...
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing email', async () => {
      // ...
    });
  });
});
```

### Template Middleware Test
```typescript
// tests/unit/presentation/middleware/auth.middleware.test.ts
import { authenticateToken } from '@/presentation/middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

describe('authenticateToken Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should return 401 if no token provided', async () => {
    await authenticateToken(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Access token is required'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() if valid token', async () => {
    req.headers!.authorization = 'Bearer valid-token';
    // Mock JWT verify...

    await authenticateToken(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });
});
```

---

## Ressources

- **Audit Complet:** `AUDIT_TESTS_COMPLET.md` (détails exhaustifs)
- **Tests README:** `tests/README.md` (documentation tests)
- **Vitest Docs:** https://vitest.dev/
- **Jest Docs:** https://jestjs.io/
- **Supertest Docs:** https://github.com/ladjs/supertest

---

## Notes Importantes

1. **NE PAS** supprimer les tests frontend (249 tests) - ils sont excellents
2. **NE PAS** supprimer les tests scripts - juste les déplacer dans `tests/scripts/`
3. **PRIORISER** absolument Phase 1 (sécurité) avant Phase 2-3
4. **UTILISER** les tests frontend comme référence de qualité
5. **CONFIGURER** coverage thresholds dans jest.config après Phase 2

---

**Dernière mise à jour:** 2025-11-19
**Statut:** 🔴 URGENT - Démarrer Phase 1 IMMÉDIATEMENT
