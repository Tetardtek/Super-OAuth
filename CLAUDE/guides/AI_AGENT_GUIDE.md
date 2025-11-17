# 🤖 Guide pour Agents IA - SuperOAuth

## 📘 Introduction

Ce guide est **spécifiquement conçu pour les agents IA** (Claude Code, Cursor, GitHub Copilot, etc.) travaillant sur le projet SuperOAuth. Il contient des instructions claires, des patterns à suivre, et des exemples concrets.

## 🎯 Principes Fondamentaux

### 1. Toujours Lire Avant d'Écrire

**RÈGLE #1:** Ne jamais modifier un fichier sans l'avoir lu et compris.

**Workflow obligatoire:**
```
1. Lire les fichiers de documentation (ARCHITECTURE.md, CONTRIBUTING.md)
2. Lire le fichier à modifier
3. Lire les fichiers dépendants
4. Analyser l'impact des changements
5. Implémenter la modification
6. Tester le résultat
```

### 2. Respecter l'Architecture en Couches

**Architecture DDD stricte:**
```
Presentation ──> Application ──> Domain <── Infrastructure
```

**Interdictions absolues:**
- ❌ Controller qui accède directement au Repository
- ❌ Use Case qui utilise directement TypeORM
- ❌ Domain qui dépend de l'Infrastructure
- ❌ Logique métier dans les Controllers

### 3. TypeScript Strict - Zéro Compromis

- ❌ `any` est **INTERDIT**
- ✅ Utiliser `unknown` si type inconnu
- ✅ Créer des types spécifiques
- ✅ Utiliser des génériques pour la réutilisabilité

## 📋 Checklist pour Chaque Tâche

Avant de commencer toute tâche, vérifier:

```markdown
### Analyse
- [ ] J'ai lu les fichiers de documentation pertinents
- [ ] J'ai compris l'architecture existante
- [ ] J'ai identifié les dépendances
- [ ] Je connais la couche concernée

### Implémentation
- [ ] Je respecte la séparation des couches
- [ ] J'utilise l'injection de dépendances
- [ ] Je crée des erreurs métier spécifiques
- [ ] Je log les opérations importantes
- [ ] Je valide toutes les entrées

### Qualité
- [ ] Le code compile sans erreurs TypeScript
- [ ] Les tests sont écrits et passent
- [ ] Le code est formaté (Prettier)
- [ ] Le linting passe (ESLint)
- [ ] La documentation est à jour
```

## 🛠️ Patterns Communs

### Pattern 1: Créer un Nouveau Use Case

**Étapes:**

1. **Créer le DTO** dans `application/dto/`
```typescript
// src/application/dto/verify-email.dto.ts
export interface VerifyEmailDto {
  token: string;
  userId: string;
}
```

2. **Créer l'erreur métier** dans `domain/errors/`
```typescript
// src/domain/errors/email-errors.ts
export class InvalidVerificationTokenError extends Error {
  constructor() {
    super('Invalid or expired verification token');
    this.name = 'InvalidVerificationTokenError';
  }
}
```

3. **Créer le Use Case** dans `application/use-cases/`
```typescript
// src/application/use-cases/verify-email.use-case.ts
import { IUserRepository } from '@application/interfaces/repositories.interface';
import { VerifyEmailDto } from '@application/dto/verify-email.dto';
import { InvalidVerificationTokenError } from '@domain/errors/email-errors';
import { logger } from '@shared/utils/logger.util';

export class VerifyEmailUseCase {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  async execute(dto: VerifyEmailDto): Promise<void> {
    logger.debug('Verifying email', { userId: dto.userId });

    const user = await this.userRepository.findById(dto.userId);

    if (!user) {
      logger.warn('User not found for email verification', { userId: dto.userId });
      throw new InvalidVerificationTokenError();
    }

    if (user.verificationToken !== dto.token) {
      logger.warn('Invalid verification token', { userId: dto.userId });
      throw new InvalidVerificationTokenError();
    }

    user.isEmailVerified = true;
    user.verificationToken = null;

    await this.userRepository.save(user);

    logger.info('Email verified successfully', { userId: user.id });
  }
}
```

4. **Créer le Controller** dans `presentation/controllers/`
```typescript
// src/presentation/controllers/email.controller.ts
import { Request, Response, NextFunction } from 'express';
import { VerifyEmailUseCase } from '@application/use-cases/verify-email.use-case';
import { logger } from '@shared/utils/logger.util';

export class EmailController {
  constructor(
    private readonly verifyEmailUseCase: VerifyEmailUseCase
  ) {}

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.verifyEmailUseCase.execute({
        token: req.query.token as string,
        userId: req.query.userId as string,
      });

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Email verification failed', { error });
      next(error);
    }
  }
}
```

5. **Ajouter la route** dans `presentation/routes/`
```typescript
// src/presentation/routes/email.routes.ts
import { Router } from 'express';
import { EmailController } from '@presentation/controllers/email.controller';
import { container } from '@infrastructure/di/container';

const router = Router();
const emailController = container.resolve(EmailController);

router.get('/verify', emailController.verifyEmail.bind(emailController));

export default router;
```

6. **Créer les tests** dans `tests/unit/use-cases/`
```typescript
// tests/unit/use-cases/verify-email.use-case.spec.ts
import { VerifyEmailUseCase } from '@application/use-cases/verify-email.use-case';
import { IUserRepository } from '@application/interfaces/repositories.interface';
import { InvalidVerificationTokenError } from '@domain/errors/email-errors';

describe('VerifyEmailUseCase', () => {
  let useCase: VerifyEmailUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as any;

    useCase = new VerifyEmailUseCase(mockUserRepository);
  });

  it('should verify email successfully with valid token', async () => {
    const mockUser = {
      id: 'user-123',
      verificationToken: 'valid-token',
      isEmailVerified: false,
    };

    mockUserRepository.findById.mockResolvedValue(mockUser as any);

    await useCase.execute({
      userId: 'user-123',
      token: 'valid-token',
    });

    expect(mockUser.isEmailVerified).toBe(true);
    expect(mockUser.verificationToken).toBeNull();
    expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
  });

  it('should throw error with invalid token', async () => {
    const mockUser = {
      id: 'user-123',
      verificationToken: 'valid-token',
      isEmailVerified: false,
    };

    mockUserRepository.findById.mockResolvedValue(mockUser as any);

    await expect(useCase.execute({
      userId: 'user-123',
      token: 'invalid-token',
    })).rejects.toThrow(InvalidVerificationTokenError);
  });
});
```

### Pattern 2: Ajouter une Nouvelle Entité

**Exemple: Ajout d'une entité Notification**

1. **Créer l'entité** dans `domain/entities/`
```typescript
// src/domain/entities/notification.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export type NotificationType = 'info' | 'warning' | 'success' | 'error';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;
}
```

2. **Créer l'interface du repository** dans `domain/repositories/`
```typescript
// src/domain/repositories/notification.repository.interface.ts
import { Notification } from '@domain/entities/notification.entity';

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, limit?: number): Promise<Notification[]>;
  save(notification: Notification): Promise<Notification>;
  markAsRead(id: string): Promise<void>;
  deleteById(id: string): Promise<void>;
}
```

3. **Implémenter le repository** dans `infrastructure/database/repositories/`
```typescript
// src/infrastructure/database/repositories/notification.repository.ts
import { Repository } from 'typeorm';
import { Notification } from '@domain/entities/notification.entity';
import { INotificationRepository } from '@domain/repositories/notification.repository.interface';
import { DatabaseConnection } from '@infrastructure/database/config/database.config';

export class NotificationRepository implements INotificationRepository {
  private repository: Repository<Notification>;

  constructor() {
    this.repository = DatabaseConnection.getRepository(Notification);
  }

  async findById(id: string): Promise<Notification | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserId(userId: string, limit: number = 10): Promise<Notification[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async save(notification: Notification): Promise<Notification> {
    return this.repository.save(notification);
  }

  async markAsRead(id: string): Promise<void> {
    await this.repository.update(id, {
      isRead: true,
      readAt: new Date(),
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
```

4. **Créer la migration**
```bash
npm run migration:generate -- src/infrastructure/database/migrations/CreateNotificationsTable
```

### Pattern 3: Ajouter un Provider OAuth

**Exemple: LinkedIn OAuth Provider**

1. **Créer le provider** dans `infrastructure/oauth/providers/`
```typescript
// src/infrastructure/oauth/providers/linkedin.provider.ts
import axios from 'axios';
import { IOAuthProvider, OAuthUserInfo } from '@shared/types/oauth.types';
import { getAppConfig } from '@shared/config';
import { logger } from '@shared/utils/logger.util';

export class LinkedInOAuthProvider implements IOAuthProvider {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    const config = getAppConfig();
    this.clientId = config.linkedinClientId || '';
    this.clientSecret = config.linkedinClientSecret || '';
    this.redirectUri = `${config.apiBaseUrl}/oauth/linkedin/callback`;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: 'r_liteprofile r_emailaddress',
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<OAuthUserInfo> {
    try {
      // 1. Exchange code for access token
      const tokenResponse = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // 2. Fetch user profile
      const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // 3. Fetch user email
      const emailResponse = await axios.get(
        'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const email = emailResponse.data.elements[0]['handle~'].emailAddress;
      const profile = profileResponse.data;

      return {
        provider: 'linkedin',
        providerId: profile.id,
        email,
        name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
        username: profile.id,
        avatar: null,
        accessToken,
        refreshToken: null,
      };
    } catch (error) {
      logger.error('LinkedIn OAuth callback failed', { error });
      throw new Error('Failed to authenticate with LinkedIn');
    }
  }
}
```

2. **Enregistrer dans la factory** dans `infrastructure/oauth/`
```typescript
// src/infrastructure/oauth/oauth-provider.factory.ts
import { LinkedInOAuthProvider } from './providers/linkedin.provider';

export class OAuthProviderFactory {
  static create(provider: OAuthProvider): IOAuthProvider {
    switch (provider) {
      case 'discord':
        return new DiscordOAuthProvider();
      case 'google':
        return new GoogleOAuthProvider();
      case 'github':
        return new GitHubOAuthProvider();
      case 'twitch':
        return new TwitchOAuthProvider();
      case 'linkedin':
        return new LinkedInOAuthProvider();
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
  }
}
```

3. **Mettre à jour les types** dans `shared/types/`
```typescript
// src/shared/types/oauth.types.ts
export type OAuthProvider = 'discord' | 'google' | 'github' | 'twitch' | 'linkedin';
```

4. **Ajouter les variables d'environnement**
```bash
# .env.example
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

## 🚨 Erreurs Communes à Éviter

### Erreur #1: Court-circuiter les Couches

❌ **MAUVAIS:**
```typescript
// Controller qui accède directement au repository
class AuthController {
  constructor(private userRepo: UserRepository) {}

  async register(req: Request, res: Response) {
    const user = await this.userRepo.save(req.body); // ❌ NON!
  }
}
```

✅ **CORRECT:**
```typescript
// Controller qui utilise un Use Case
class AuthController {
  constructor(private registerUseCase: RegisterClassicUseCase) {}

  async register(req: Request, res: Response) {
    const user = await this.registerUseCase.execute(req.body); // ✅ OUI!
  }
}
```

### Erreur #2: Logique Métier dans le Controller

❌ **MAUVAIS:**
```typescript
async login(req: Request, res: Response) {
  const user = await this.userRepo.findByEmail(req.body.email);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValid = await bcrypt.compare(req.body.password, user.password);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

  res.json({ token });
}
```

✅ **CORRECT:**
```typescript
async login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await this.loginUseCase.execute(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error); // Déléguer au error handler
  }
}
```

### Erreur #3: Ne Pas Logger les Opérations

❌ **MAUVAIS:**
```typescript
async execute(dto: RegisterDto): Promise<User> {
  const user = await this.userRepository.save(dto);
  return user;
}
```

✅ **CORRECT:**
```typescript
async execute(dto: RegisterDto): Promise<User> {
  logger.info('Attempting user registration', { email: dto.email });

  const existingUser = await this.userRepository.findByEmail(dto.email);

  if (existingUser) {
    logger.warn('Registration failed: email already exists', { email: dto.email });
    throw new UserAlreadyExistsError(dto.email);
  }

  const user = await this.userRepository.save(dto);

  logger.info('User registered successfully', { userId: user.id });

  return user;
}
```

### Erreur #4: Utiliser 'any'

❌ **MAUVAIS:**
```typescript
function processData(data: any) {
  return data.value.toUpperCase();
}
```

✅ **CORRECT:**
```typescript
interface DataWithValue {
  value: string;
}

function processData(data: DataWithValue): string {
  return data.value.toUpperCase();
}
```

### Erreur #5: Ne Pas Valider les Entrées

❌ **MAUVAIS:**
```typescript
router.post('/register', authController.register);
```

✅ **CORRECT:**
```typescript
router.post(
  '/register',
  validateRequest(registerSchema), // Middleware de validation
  authController.register
);
```

## 📚 Ressources Utiles

### Fichiers à Consulter

| Tâche | Fichier à Lire |
|-------|----------------|
| Comprendre l'architecture | `ARCHITECTURE.md` |
| Contribuer au projet | `CONTRIBUTING.md` |
| Localiser un fichier | `PROJECT_STRUCTURE.md` |
| Voir les conventions | `.cursorrules` |
| Comprendre l'API | `README.md` |

### Commandes Importantes

```bash
# Développement
npm run dev              # Lancer en mode développement
npm run build            # Compiler TypeScript
npm start                # Lancer en production

# Tests
npm run test             # Lancer tous les tests
npm run test:watch       # Tests en mode watch
npm run test:coverage    # Tests avec couverture

# Qualité
npm run lint             # Vérifier le code
npm run lint:fix         # Corriger automatiquement
npm run format           # Formater le code
npm run typecheck        # Vérifier les types

# Base de données
npm run migration:generate  # Générer une migration
npm run migration:run       # Exécuter les migrations
npm run db:reset            # Réinitialiser la DB
```

## 🎓 Exemples Complets

### Exemple Complet: Feature "Réinitialisation de Mot de Passe"

**1. Domain Layer**
```typescript
// src/domain/errors/password-errors.ts
export class InvalidResetTokenError extends Error {
  constructor() {
    super('Invalid or expired reset token');
    this.name = 'InvalidResetTokenError';
  }
}

// src/domain/entities/user.entity.ts (ajouter les champs)
@Column({ name: 'reset_token', nullable: true })
resetToken: string | null;

@Column({ name: 'reset_token_expires', nullable: true })
resetTokenExpires: Date | null;
```

**2. Application Layer**
```typescript
// src/application/dto/password-reset.dto.ts
export interface RequestPasswordResetDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

// src/application/use-cases/request-password-reset.use-case.ts
export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute(dto: RequestPasswordResetDto): Promise<void> {
    logger.info('Password reset requested', { email: dto.email });

    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      // Ne pas révéler que l'email n'existe pas (sécurité)
      logger.warn('Password reset requested for non-existent email', { email: dto.email });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 heure

    user.resetToken = resetToken;
    user.resetTokenExpires = expiresAt;

    await this.userRepository.save(user);

    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    logger.info('Password reset email sent', { userId: user.id });
  }
}

// src/application/use-cases/reset-password.use-case.ts
export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: ResetPasswordDto): Promise<void> {
    logger.info('Attempting password reset', { token: dto.token });

    const user = await this.userRepository.findByResetToken(dto.token);

    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      logger.warn('Invalid or expired reset token', { token: dto.token });
      throw new InvalidResetTokenError();
    }

    const hashedPassword = await this.passwordHasher.hash(dto.newPassword);

    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpires = null;

    await this.userRepository.save(user);

    logger.info('Password reset successfully', { userId: user.id });
  }
}
```

**3. Infrastructure Layer**
```typescript
// src/infrastructure/database/repositories/user.repository.ts (ajouter)
async findByResetToken(token: string): Promise<User | null> {
  return this.repository.findOne({ where: { resetToken: token } });
}

// src/infrastructure/services/email.service.ts (ajouter)
async sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await this.transporter.sendMail({
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `,
  });
}
```

**4. Presentation Layer**
```typescript
// src/presentation/controllers/password.controller.ts
export class PasswordController {
  constructor(
    private readonly requestResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase
  ) {}

  async requestReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.requestResetUseCase.execute(req.body);
      res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.resetPasswordUseCase.execute(req.body);
      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

// src/presentation/routes/password.routes.ts
const router = Router();

router.post(
  '/request-reset',
  validateRequest(requestResetSchema),
  passwordController.requestReset.bind(passwordController)
);

router.post(
  '/reset',
  validateRequest(resetPasswordSchema),
  passwordController.resetPassword.bind(passwordController)
);

export default router;
```

**5. Tests**
```typescript
// tests/unit/use-cases/reset-password.use-case.spec.ts
describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordHasher: jest.Mocked<IPasswordHasher>;

  beforeEach(() => {
    mockUserRepository = { findByResetToken: jest.fn(), save: jest.fn() } as any;
    mockPasswordHasher = { hash: jest.fn() } as any;
    useCase = new ResetPasswordUseCase(mockUserRepository, mockPasswordHasher);
  });

  it('should reset password with valid token', async () => {
    const mockUser = {
      id: 'user-123',
      resetToken: 'valid-token',
      resetTokenExpires: new Date(Date.now() + 3600000),
    };

    mockUserRepository.findByResetToken.mockResolvedValue(mockUser as any);
    mockPasswordHasher.hash.mockResolvedValue('hashed_password');

    await useCase.execute({ token: 'valid-token', newPassword: 'NewPass123!' });

    expect(mockUser.password).toBe('hashed_password');
    expect(mockUser.resetToken).toBeNull();
    expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
  });

  it('should throw error with expired token', async () => {
    const mockUser = {
      id: 'user-123',
      resetToken: 'valid-token',
      resetTokenExpires: new Date(Date.now() - 1000), // Expiré
    };

    mockUserRepository.findByResetToken.mockResolvedValue(mockUser as any);

    await expect(useCase.execute({
      token: 'valid-token',
      newPassword: 'NewPass123!',
    })).rejects.toThrow(InvalidResetTokenError);
  });
});
```

## 🎯 Résumé pour Agents IA

### À Faire Systématiquement

1. ✅ Lire la documentation avant de coder
2. ✅ Respecter les couches DDD
3. ✅ Utiliser l'injection de dépendances
4. ✅ Créer des erreurs métier spécifiques
5. ✅ Logger toutes les opérations importantes
6. ✅ Valider toutes les entrées utilisateur
7. ✅ Écrire des tests pour le nouveau code
8. ✅ Documenter les fonctions publiques
9. ✅ Utiliser TypeScript strict
10. ✅ Formater et linter le code

### À Ne Jamais Faire

1. ❌ Court-circuiter les couches
2. ❌ Utiliser le type `any`
3. ❌ Mettre de la logique métier dans les controllers
4. ❌ Oublier de logger les erreurs
5. ❌ Hardcoder des valeurs (utiliser des constantes)
6. ❌ Exposer des données sensibles dans les logs
7. ❌ Modifier du code sans tests
8. ❌ Ignorer les erreurs TypeScript
9. ❌ Créer des fichiers sans respecter les conventions
10. ❌ Commit sans formater/linter

---

**En cas de doute, toujours privilégier:**
- La clarté sur la concision
- La sécurité sur la performance
- La maintenabilité sur l'optimisation prématurée
