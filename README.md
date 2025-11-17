# 🔐 SuperOAuth

**Système d'authentification moderne avec OAuth et gestion des tokens JWT**

SuperOAuth est une solution complète d'authentification qui combine l'authentification classique par email/mot de passe avec l'intégration OAuth pour les plateformes populaires (Discord, Twitch, Google, GitHub).

## 📋 Table des Matières

- [🚀 Fonctionnalités](#-fonctionnalités)
- [🛠️ Technologies](#️-technologies)
- [📦 Installation](#-installation)
- [🔧 Configuration](#-configuration)
- [📖 Documentation API](#-documentation-api)
- [🎨 Interface Utilisateur](#-interface-utilisateur)
- [🔒 Sécurité](#-sécurité)
- [🤖 Pour les Agents IA](#-pour-les-agents-ia)
- [📝 Changelog](#-changelog)

## 🚀 Fonctionnalités

### ✅ Authentification Complète
- **Inscription/Connexion classique** avec validation des mots de passe
- **OAuth intégré** : Discord, Twitch, Google, GitHub
- **Gestion des tokens JWT** avec refresh automatique
- **Sessions sécurisées** avec expiration et révocation

### 🛡️ Sécurité Avancée
- **Hachage bcrypt** pour les mots de passe
- **Validation stricte** des entrées utilisateur
- **Protection CSRF** et XSS
- **Content Security Policy** (CSP) configurée
- **Rate limiting** sur les endpoints sensibles

### 🎯 Interface Moderne
- **Design responsive** et accessible
- **Système de notifications toast** avec animations
- **Dashboard utilisateur** avec informations détaillées
- **Gestion d'erreurs** contextuelle et intuitive

### 🔧 Fonctionnalités Techniques
- **Architecture modulaire** avec Domain-Driven Design
- **Base de données MySQL** avec migrations
- **Logging complet** des actions utilisateur
- **Validation TypeScript** stricte
- **Tests unitaires** et d'intégration

## 🛠️ Technologies

### Backend
- **Node.js** 18+ avec TypeScript
- **Express.js** avec middleware de sécurité
- **MySQL** avec TypeORM
- **JWT** pour l'authentification
- **bcrypt** pour le hachage des mots de passe
- **Helmet** pour la sécurité HTTP

### Frontend
- **HTML5** sémantique
- **CSS3** moderne avec animations
- **JavaScript ES6+** vanilla
- **Design responsive** mobile-first

### DevOps & Qualité
- **ESLint** et **Prettier** pour la qualité du code
- **Jest** pour les tests
- **GitHub Actions** pour CI/CD
- **Docker** pour la containerisation

## 📦 Installation

### Prérequis
- Node.js 18+
- MySQL 8.0+
- npm ou yarn

### Installation Rapide

```bash
# Cloner le projet
git clone <repository-url>
cd SuperOAuth

# Installer les dépendances
npm install

# Configuration de la base de données
cp .env.example .env
# Éditer .env avec vos paramètres

# Lancer les migrations
npm run migration:run

# Démarrer en développement
npm run dev
```

### Variables d'Environnement

```env
# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=superoauth

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key

# OAuth Providers
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Serveur
PORT=3000
NODE_ENV=development
```

## 🔧 Configuration

### OAuth Providers

#### Discord
1. Aller sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Créer une nouvelle application
3. Ajouter l'URL de redirection : `http://localhost:3000/api/v1/auth/oauth/discord/callback`

#### Google
1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un projet et activer l'API Google+
3. Configurer l'écran de consentement OAuth
4. Ajouter l'URL de redirection : `http://localhost:3000/api/v1/auth/oauth/google/callback`

#### GitHub
1. Aller sur [GitHub Developer Settings](https://github.com/settings/developers)
2. Créer une nouvelle OAuth App
3. Ajouter l'URL de redirection : `http://localhost:3000/api/v1/auth/oauth/github/callback`

#### Twitch
1. Aller sur [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Créer une nouvelle application
3. Ajouter l'URL de redirection : `http://localhost:3000/api/v1/auth/oauth/twitch/callback`

## 📖 Documentation API

### Base URL
```
http://localhost:3000/api/v1
```

### Endpoints d'Authentification

#### POST /auth/register
Inscription d'un nouvel utilisateur
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "nickname": "MonPseudo"
}
```

#### POST /auth/login
Connexion utilisateur
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### POST /auth/refresh
Rafraîchir le token d'accès
```json
{
  "refreshToken": "your_refresh_token"
}
```

#### POST /auth/logout
Déconnexion et révocation des tokens
```json
{
  "refreshToken": "your_refresh_token"
}
```

#### GET /auth/me
Obtenir les informations de l'utilisateur connecté
```
Headers: Authorization: Bearer <access_token>
```

### OAuth Endpoints

#### GET /auth/oauth/{provider}
Initier la connexion OAuth
- Providers supportés : `discord`, `google`, `github`, `twitch`

#### GET /auth/oauth/{provider}/callback
Callback OAuth automatique

### Réponses API

#### Succès
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token"
    }
  },
  "message": "Opération réussie"
}
```

#### Erreur
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description de l'erreur",
    "details": { /* détails optionnels */ }
  }
}
```

## 🎨 Interface Utilisateur

### Système de Toast

SuperOAuth inclut un système de notifications toast moderne :

```javascript
// Utilisation du système de toast
Toast.success('Opération réussie !');
Toast.error('Une erreur est survenue');
Toast.warning('Attention !');
Toast.info('Information');
```

#### Fonctionnalités des Toast
- ✅ 4 types : Success, Error, Warning, Info
- 🎨 Animations fluides d'entrée/sortie
- ⏱️ Auto-fermeture configurable
- 👆 Fermeture manuelle au clic
- 📱 Design responsive

### Dashboard Utilisateur

Le dashboard affiche :
- Informations personnelles
- Historique de connexion
- Gestion des tokens
- Paramètres de compte

### Interface Responsive

- 📱 **Mobile First** : Optimisé pour mobile
- 💻 **Desktop** : Interface complète sur grand écran

## 🔒 Sécurité

### Mesures Implémentées

#### Protection des Mots de Passe
- **Hachage bcrypt** avec salt
- **Validation stricte** : minimum 8 caractères, majuscules, minuscules, chiffres, caractères spéciaux
- **Protection contre les attaques par dictionnaire**

#### Sécurité des Sessions
- **JWT avec expiration courte** (15 minutes)
- **Refresh tokens sécurisés** (7 jours)
- **Révocation automatique** en cas de suspicion

#### Protection Web
- **Content Security Policy** stricte
- **Protection CSRF** avec tokens
- **Sanitisation des entrées** utilisateur
- **Rate limiting** sur les endpoints sensibles

#### Headers de Sécurité
```javascript
// Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

### Validation des Données

```typescript
// Exemple de validation
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nickname: string;
}
```

## 🧪 Tests

### Lancer les Tests

```bash
# Tests unitaires
npm run test

# Tests avec couverture
npm run test:coverage

# Tests en mode watch
npm run test:watch

# Tests d'intégration
npm run test:e2e
```

## 🤖 Pour les Agents IA

Si vous êtes un **agent IA** (Claude Code, Cursor, GitHub Copilot, etc.) travaillant sur ce projet, **commencez par consulter** :

### 📁 [CLAUDE/](./CLAUDE/) - Documentation Complète pour Agents IA

Cette documentation spécialisée contient tout ce dont vous avez besoin :

#### 🚀 Démarrage Rapide
- **[QUICK_START.md](./CLAUDE/QUICK_START.md)** - Démarrer en 5 minutes
- **[.cursorrules](./CLAUDE/.cursorrules)** - Règles strictes (NON NÉGOCIABLES)

#### 📚 Guides Techniques
- **[ARCHITECTURE.md](./CLAUDE/guides/ARCHITECTURE.md)** - Architecture DDD et Clean Architecture
- **[CONTRIBUTING.md](./CLAUDE/guides/CONTRIBUTING.md)** - Standards de code et workflow Git
- **[AI_AGENT_GUIDE.md](./CLAUDE/guides/AI_AGENT_GUIDE.md)** - Patterns, exemples et best practices
- **[PROJECT_STRUCTURE.md](./CLAUDE/guides/PROJECT_STRUCTURE.md)** - Navigation et localisation des fichiers

#### 📊 Statut du Projet
- **[PROJECT_STATUS.md](./CLAUDE/status/PROJECT_STATUS.md)** - État actuel, métriques, roadmap

### ⚡ Ordre de Lecture Recommandé

1. **QUICK_START.md** (5-10 min) - Installation et commandes essentielles
2. **.cursorrules** (10 min) - Règles NON NÉGOCIABLES
3. **ARCHITECTURE.md** (15 min) - Comprendre la structure DDD
4. **AI_AGENT_GUIDE.md** (20-25 min) - Patterns et exemples de code
5. **PROJECT_STRUCTURE.md** (5-10 min) - Localiser les fichiers rapidement

### 🎯 Règles d'Or

- ✅ **TOUJOURS** respecter la séparation des couches (Domain, Application, Infrastructure, Presentation)
- ✅ **TOUJOURS** utiliser l'injection de dépendances
- ✅ **TOUJOURS** créer des tests pour le nouveau code
- ❌ **JAMAIS** court-circuiter les couches (Controller → Repository directement)
- ❌ **JAMAIS** utiliser le type `any` en TypeScript
- ❌ **JAMAIS** mettre de logique métier dans les Controllers

### 📖 Documentation Complète

Pour plus de détails, consultez le **[README du dossier CLAUDE](./CLAUDE/README.md)** qui contient :
- Index complet de la documentation
- Guide de navigation
- Checklist avant de commencer
- Ressources et support

## 📝 Changelog

### Version 1.0.0 (Actuelle)
- ✅ Authentification complète avec OAuth
- ✅ Interface utilisateur moderne
- ✅ Système de toast notifications
- ✅ Sécurité renforcée avec CSP
- ✅ Documentation complète

### Prochaines Versions

#### v1.1.0 (Planifiée)
- 🔄 **2FA** : Authentification à deux facteurs
- 📧 **Email de vérification** automatique
- 🔐 **Réinitialisation de mot de passe** par email
- 👥 **Gestion des rôles** utilisateur

#### v1.2.0 (Future)
- 🌍 **Internationalisation** (i18n)
- 📊 **Dashboard administrateur**
- 🔍 **Logs avancés** avec recherche
- 🐳 **Déploiement Docker** complet

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez le guide de contribution pour plus de détails.

### Développement Local

```bash
# Fork le projet
git clone <your-fork>

# Créer une branche feature
git checkout -b feature/amazing-feature

# Commiter vos changements
git commit -m 'Add amazing feature'

# Pousser vers la branche
git push origin feature/amazing-feature

# Ouvrir une Pull Request
```

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

- 🐛 **Issues** : [GitHub Issues](repository-url/issues)

---

**Développé avec ❤️ par l'équipe SuperOAuth**
