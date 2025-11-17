# 🤝 Guide de Contribution - SuperOAuth

## Pour les Agents IA et Développeurs

Ce guide vous aidera à contribuer efficacement au projet SuperOAuth en respectant les conventions établies.

## 📋 Table des Matières

- [Principes Généraux](#principes-généraux)
- [Standards de Code](#standards-de-code)
- [Architecture et Structure](#architecture-et-structure)
- [Conventions de Nommage](#conventions-de-nommage)
- [Gestion des Erreurs](#gestion-des-erreurs)
- [Tests](#tests)
- [Git Workflow](#git-workflow)
- [Documentation](#documentation)

## 🎯 Principes Généraux

### 1. Toujours Lire Avant de Modifier

**Pour les agents IA:** Avant toute modification:
1. Lisez `ARCHITECTURE.md` pour comprendre la structure
2. Lisez `PROJECT_STRUCTURE.md` pour localiser les fichiers
3. Lisez `AI_AGENT_GUIDE.md` pour les instructions spécifiques
4. Lisez le fichier concerné pour comprendre le contexte

### 2. Respecter les Couches DDD

❌ **INTERDIT:**
```typescript
// Controller qui accède directement au repository
class AuthController {
  constructor(private userRepository: UserRepository) {} // ❌ NO!
}
```

✅ **CORRECT:**
```typescript
// Controller qui utilise un Use Case
class AuthController {
  constructor(private registerUseCase: RegisterClassicUseCase) {} // ✅ YES!
}
```

### 3. Principe de Responsabilité Unique

Chaque classe/fonction doit avoir **UNE SEULE** raison de changer.

❌ **MAUVAIS:**
```typescript
class UserService {
  registerUser() {} // Inscription
  sendEmail() {} // Envoi email
  hashPassword() {} // Hachage mot de passe
  validateToken() {} // Validation JWT
}
```

✅ **BON:**
```typescript
class RegisterClassicUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher,
    private emailService: IEmailService
  ) {}
}
```

## 💻 Standards de Code

### TypeScript Strict Mode

Le projet utilise TypeScript en mode strict. **Aucune exception** tolérée.

```typescript
// tsconfig.json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

### Formatting

- **Prettier** pour le formatage automatique
- **ESLint** pour les règles de qualité

```bash
# Avant chaque commit
npm run format
npm run lint:fix
```

### Types et Interfaces

✅ **Bonnes pratiques:**

```typescript
// 1. Préférer les interfaces pour les contrats publics
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

// 2. Utiliser des types pour les unions et alias
export type OAuthProvider = 'discord' | 'google' | 'github' | 'twitch';
export type TokenType = 'access' | 'refresh';

// 3. Éviter 'any' - utiliser 'unknown' si nécessaire
function processData(data: unknown): void {
  if (typeof data === 'string') {
    // Type narrowing
  }
}

// 4. Utiliser les génériques pour la réutilisabilité
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Imports

Utiliser les alias TypeScript définis:

```typescript
// ✅ BON
import { User } from '@domain/entities/user.entity';
import { RegisterDto } from '@application/dto/auth.dto';
import { logger } from '@shared/utils/logger.util';

// ❌ MAUVAIS
import { User } from '../../../domain/entities/user.entity';
```

Ordre des imports:
```typescript
// 1. Packages externes
import express from 'express';
import { IsEmail } from 'class-validator';

// 2. Imports du projet (par couche)
import { User } from '@domain/entities/user.entity';
import { IUserRepository } from '@application/interfaces/repositories.interface';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';

// 3. Types et interfaces
import type { Request, Response } from 'express';
```

## 🏗️ Architecture et Structure

### Ajouter une Nouvelle Fonctionnalité

**Étapes à suivre:**

1. **Domain Layer** (si nouvelle entité)
   ```typescript
   // src/domain/entities/new-entity.entity.ts
   export class NewEntity {
     // Propriétés métier uniquement
   }
   ```

2. **Application Layer** (Use Case)
   ```typescript
   // src/application/use-cases/new-feature.use-case.ts
   export class NewFeatureUseCase {
     constructor(
       private repository: INewEntityRepository
     ) {}

     async execute(dto: NewFeatureDto): Promise<Result> {
       // Logique métier
     }
   }
   ```

3. **Infrastructure Layer** (si besoin d'implémentation)
   ```typescript
   // src/infrastructure/database/repositories/new-entity.repository.ts
   export class NewEntityRepository implements INewEntityRepository {
     // Implémentation TypeORM
   }
   ```

4. **Presentation Layer** (API)
   ```typescript
   // src/presentation/controllers/new-entity.controller.ts
   export class NewEntityController {
     // Endpoints HTTP
   }

   // src/presentation/routes/new-entity.routes.ts
   // Définition des routes
   ```

### Dependency Injection

Utiliser le container DI:

```typescript
// src/infrastructure/di/container.ts
export class DIContainer {
  // Enregistrer les dépendances
  static register() {
    container.bind<IUserRepository>(TYPES.UserRepository)
      .to(UserRepository);
  }
}
```

## 📝 Conventions de Nommage

### Fichiers

| Type | Convention | Exemple |
|------|-----------|---------|
| Entity | `{name}.entity.ts` | `user.entity.ts` |
| Use Case | `{action}-{entity}.use-case.ts` | `register-classic.use-case.ts` |
| Repository | `{entity}.repository.ts` | `user.repository.ts` |
| Interface | `{name}.interface.ts` | `repositories.interface.ts` |
| Controller | `{entity}.controller.ts` | `auth.controller.ts` |
| Service | `{name}.service.ts` | `email.service.ts` |
| DTO | `{context}.dto.ts` | `auth.dto.ts` |
| Value Object | `{name}.vo.ts` | `email.vo.ts` |
| Error | `{context}-errors.ts` | `user-errors.ts` |
| Middleware | `{name}.middleware.ts` | `auth.middleware.ts` |
| Util | `{name}.util.ts` | `logger.util.ts` |

### Classes et Interfaces

```typescript
// Classes: PascalCase
class UserEntity {}
class RegisterClassicUseCase {}

// Interfaces: PascalCase avec préfixe 'I' pour les contrats
interface IUserRepository {}
interface IEmailService {}

// Types: PascalCase
type OAuthProvider = 'discord' | 'google';

// Constantes: UPPER_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 5;
const JWT_EXPIRATION_TIME = '15m';
```

### Fonctions et Variables

```typescript
// Functions: camelCase avec verbe
function calculatePasswordStrength() {}
async function sendVerificationEmail() {}

// Variables: camelCase descriptives
const userEmail = 'user@example.com';
const isEmailVerified = true;
const accessToken = 'jwt_token';

// Boolean: préfixe is/has/should
const isValid = true;
const hasPermission = false;
const shouldRetry = true;
```

## 🚨 Gestion des Erreurs

### Créer des Erreurs Métier

```typescript
// src/domain/errors/{context}-errors.ts
export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
    this.name = 'UserAlreadyExistsError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}
```

### Utiliser les Erreurs

```typescript
// Dans un Use Case
async execute(dto: RegisterDto): Promise<User> {
  const existingUser = await this.userRepository.findByEmail(dto.email);

  if (existingUser) {
    throw new UserAlreadyExistsError(dto.email);
  }

  // Continue...
}
```

### Gérer les Erreurs dans les Controllers

```typescript
// src/presentation/controllers/auth.controller.ts
async register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await this.registerUseCase.execute(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error); // Déléguer au error handler middleware
  }
}
```

### Error Handler Middleware

```typescript
// src/presentation/middleware/error-handler.middleware.ts
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred', { error, path: req.path });

  if (error instanceof UserAlreadyExistsError) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'USER_ALREADY_EXISTS',
        message: error.message
      }
    });
  }

  // Erreur générique
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
};
```

## 🧪 Tests

### Structure des Tests

```typescript
// tests/unit/use-cases/register-classic.use-case.spec.ts
describe('RegisterClassicUseCase', () => {
  let useCase: RegisterClassicUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      save: jest.fn(),
    } as any;

    useCase = new RegisterClassicUseCase(userRepository);
  });

  describe('execute', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const dto = { email: 'test@example.com', password: 'Password123!' };
      userRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect(userRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if user already exists', async () => {
      // Arrange
      const dto = { email: 'test@example.com', password: 'Password123!' };
      userRepository.findByEmail.mockResolvedValue({} as User);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow(UserAlreadyExistsError);
    });
  });
});
```

### Couverture de Tests

Objectifs minimums:
- **Use Cases**: 90%+ de couverture
- **Services**: 85%+ de couverture
- **Controllers**: 80%+ de couverture

```bash
# Vérifier la couverture
npm run test:coverage
```

## 📦 Git Workflow

### Branches

```bash
main                 # Production-ready code
├── develop          # Development branch
├── feature/xxx      # Nouvelles fonctionnalités
├── bugfix/xxx       # Corrections de bugs
└── hotfix/xxx       # Corrections urgentes en production
```

### Commits

Format: `type(scope): message`

**Types:**
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `refactor`: Refactoring sans changement fonctionnel
- `docs`: Documentation
- `test`: Ajout/modification de tests
- `chore`: Tâches diverses (deps, config)
- `perf`: Amélioration des performances
- `style`: Formatage code

**Exemples:**
```bash
git commit -m "feat(auth): add OAuth GitHub provider"
git commit -m "fix(session): resolve token expiration bug"
git commit -m "refactor(user): extract validation logic to value object"
git commit -m "docs(api): update authentication endpoints documentation"
git commit -m "test(auth): add unit tests for login use case"
```

### Pull Requests

**Template:**
```markdown
## Description
Brève description de la PR

## Type de changement
- [ ] Nouvelle fonctionnalité
- [ ] Correction de bug
- [ ] Refactoring
- [ ] Documentation

## Checklist
- [ ] Le code suit les standards du projet
- [ ] Les tests sont ajoutés/mis à jour
- [ ] La documentation est à jour
- [ ] Aucune régression détectée
- [ ] Les migrations DB sont incluses (si applicable)

## Screenshots (si UI)

## Tests effectués
```

## 📚 Documentation

### Documenter le Code

```typescript
/**
 * Registers a new user with classic authentication (email/password)
 *
 * @param dto - User registration data
 * @returns The created user entity with hashed password
 * @throws {UserAlreadyExistsError} If email is already registered
 * @throws {InvalidPasswordError} If password doesn't meet requirements
 *
 * @example
 * ```typescript
 * const user = await registerUseCase.execute({
 *   email: 'user@example.com',
 *   password: 'SecurePass123!',
 *   nickname: 'JohnDoe'
 * });
 * ```
 */
async execute(dto: RegisterDto): Promise<User> {
  // Implementation
}
```

### README des Modules

Chaque module complexe doit avoir un `README.md`:

```
src/infrastructure/oauth/
├── README.md              # Documentation du module OAuth
├── providers/
│   ├── discord.provider.ts
│   └── google.provider.ts
└── oauth-provider.factory.ts
```

## 🔍 Checklist Avant Commit

- [ ] Le code compile sans erreurs TypeScript
- [ ] Les tests passent: `npm run test`
- [ ] Le code est formaté: `npm run format`
- [ ] Le linting passe: `npm run lint`
- [ ] La couverture de tests est maintenue
- [ ] La documentation est à jour
- [ ] Les migrations DB sont créées (si modèle modifié)
- [ ] Les variables d'env sont documentées dans `.env.example`

## 🤖 Instructions Spécifiques pour les Agents IA

1. **Toujours analyser avant de coder**
   - Lire les fichiers existants
   - Comprendre le contexte
   - Identifier les dépendances

2. **Respecter l'architecture en couches**
   - Ne jamais court-circuiter les couches
   - Utiliser les interfaces pour les dépendances
   - Injecter les dépendances via le constructeur

3. **Écrire des tests**
   - Un test unitaire par fonction importante
   - Des tests d'intégration pour les flows complets
   - Mocker les dépendances externes

4. **Logger les opérations importantes**
   ```typescript
   logger.info('User registered successfully', { userId: user.id });
   logger.error('Registration failed', { error: error.message });
   ```

5. **Documenter les changements**
   - Commenter le code complexe
   - Mettre à jour les README
   - Ajouter des exemples d'utilisation

## 📞 Support

Pour toute question:
- Consulter `ARCHITECTURE.md`
- Consulter `AI_AGENT_GUIDE.md`
- Vérifier les exemples existants dans le code
- Ouvrir une issue GitHub

---

**Merci de contribuer à SuperOAuth ! 🚀**
