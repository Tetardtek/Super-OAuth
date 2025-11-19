# 🤖 Guide pour Agents IA - SuperOAuth

## 📘 Introduction

Ce guide est **spécifiquement conçu pour les agents IA** (Claude Code, Cursor, GitHub Copilot, etc.) travaillant sur SuperOAuth. Il contient des workflows optimisés pour les IA et des exemples complets step-by-step.

**Pour les standards de code généraux**, voir [DEVELOPMENT.md](./DEVELOPMENT.md).

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

## 🛠️ Workflow Step-by-Step

### 1. Toujours Lire Avant d'Écrire

**RÈGLE #1:** Ne jamais modifier un fichier sans l'avoir lu et compris.

**Workflow obligatoire:**
```
1. Lire les fichiers de documentation (ARCHITECTURE.md, DEVELOPMENT.md)
2. Lire le fichier à modifier
3. Lire les fichiers dépendants
4. Analyser l'impact des changements
5. Implémenter la modification
6. Tester le résultat
```

### 2. Analyser l'Impact

Avant toute modification, se poser ces questions:

- ✅ Est-ce que je respecte la séparation des couches?
- ✅ Est-ce que j'utilise l'injection de dépendances?
- ✅ Est-ce que mes erreurs sont typées et explicites?
- ✅ Est-ce que je log les opérations importantes?
- ✅ Est-ce que mon code est testé?
- ✅ Est-ce que la sécurité est préservée?

## 📚 Exemples Complets Step-by-Step

### Exemple 1: Feature "Réinitialisation de Mot de Passe"

**Contexte:** L'utilisateur demande d'ajouter la fonctionnalité de reset password.

**Étapes à suivre:**

#### 1. Domain Layer

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

#### 2. Application Layer

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

#### 3. Infrastructure Layer

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

#### 4. Presentation Layer

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

#### 5. Tests

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

### Exemple 2: Ajouter un Provider OAuth (LinkedIn)

**Contexte:** L'utilisateur demande d'ajouter LinkedIn comme provider OAuth.

#### 1. Créer le Provider

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

#### 2. Enregistrer dans la Factory

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

#### 3. Mettre à jour les Types

```typescript
// src/shared/types/oauth.types.ts
export type OAuthProvider = 'discord' | 'google' | 'github' | 'twitch' | 'linkedin';
```

#### 4. Configuration

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

## 📚 Ressources Utiles

### Fichiers à Consulter

| Tâche | Fichier à Lire |
|-------|----------------|
| Comprendre l'architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Standards de code | [DEVELOPMENT.md](./DEVELOPMENT.md) |
| Localiser un fichier | [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) |
| Tests | [TESTING.md](./TESTING.md) |
| Conventions | [../.cursorrules](../.cursorrules) |

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

*Dernière mise à jour : 19 Novembre 2024*
