# 🚀 Quick Start - SuperOAuth

Guide de démarrage rapide pour les développeurs et agents IA qui souhaitent travailler sur SuperOAuth.

## 📋 Prérequis

- **Node.js** 20.0.0 ou supérieur
- **npm** 9.0.0 ou supérieur
- **MySQL** 8.0+ (optionnel pour le développement)
- **Git** pour le contrôle de version

## 🎯 Démarrage en 5 Minutes

### 1. Cloner et Installer

```bash
# Cloner le repository
git clone <repository-url>
cd Super-OAuth

# Installer les dépendances
npm install
```

### 2. Configuration de Base

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer les variables (minimum requis)
# Ouvrir .env et configurer:
# - DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE
# - JWT_SECRET, JWT_REFRESH_SECRET
```

**Configuration minimale pour développement:**

```env
# JWT (OBLIGATOIRE)
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_key_min_32_chars

# Serveur
PORT=3000
NODE_ENV=development

# Base de données (optionnel si pas de DB locale)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=superoauth
```

### 3. Lancer l'Application

```bash
# Mode développement (avec hot-reload)
npm run dev

# L'application démarre sur http://localhost:3000
```

**L'application peut fonctionner SANS base de données** pour la démonstration. Les avertissements DB peuvent être ignorés en développement.

## 📚 Documentation Essentielle

Avant de commencer à coder, **LIRE OBLIGATOIREMENT** dans cet ordre:

1. **[guides/ARCHITECTURE.md](./guides/ARCHITECTURE.md)** (10-15 min) - Comprendre l'architecture DDD
2. **[guides/DEVELOPMENT.md](./guides/DEVELOPMENT.md)** (20 min) - Standards de code et patterns
3. **[guides/AI_AGENT_GUIDE.md](./guides/AI_AGENT_GUIDE.md)** (20 min) - Workflows et exemples pour agents IA
4. **[guides/PROJECT_STRUCTURE.md](./guides/PROJECT_STRUCTURE.md)** (5-10 min) - Localiser les fichiers rapidement

**Total: ~1 heure** pour bien comprendre le projet.

## 🎓 Pour les Agents IA

### Checklist Avant Toute Modification

- [ ] J'ai lu [guides/ARCHITECTURE.md](./guides/ARCHITECTURE.md) pour comprendre les couches DDD
- [ ] J'ai lu [guides/DEVELOPMENT.md](./guides/DEVELOPMENT.md) pour connaître les standards
- [ ] J'ai lu [guides/AI_AGENT_GUIDE.md](./guides/AI_AGENT_GUIDE.md) pour les workflows
- [ ] J'ai lu le fichier [.cursorrules](./.cursorrules) pour les conventions
- [ ] J'ai lu le fichier concerné avant de le modifier
- [ ] Je connais la structure du projet via [guides/PROJECT_STRUCTURE.md](./guides/PROJECT_STRUCTURE.md)

### Règles d'Or (NON NÉGOCIABLES)

1. ✅ **TOUJOURS** respecter la séparation des couches
2. ✅ **TOUJOURS** utiliser l'injection de dépendances
3. ✅ **TOUJOURS** créer des tests pour le nouveau code
4. ❌ **JAMAIS** court-circuiter les couches (Controller → Repository directement)
5. ❌ **JAMAIS** utiliser le type `any` en TypeScript
6. ❌ **JAMAIS** mettre de logique métier dans les Controllers

**Détails complets:** Voir [guides/DEVELOPMENT.md](./guides/DEVELOPMENT.md)

## 🛠️ Commandes Essentielles

### Développement

```bash
# Lancer en mode développement (hot-reload)
npm run dev

# Compiler TypeScript
npm run build

# Lancer en production
npm start
```

### Tests

```bash
# Tous les tests (372 tests: 123 backend + 249 frontend)
npm run test:all

# Tests backend uniquement (123 tests)
npm run test

# Tests frontend uniquement (249 tests)
npm run test:frontend

# Tests avec couverture
npm run test:coverage
npm run test:frontend:coverage

# Tests en mode watch
npm run test:watch
npm run test:frontend:watch
```

> **📊 Pour plus de détails**: Voir [tests/README.md](../tests/README.md) et [.github/TESTS_STATUS.md](../.github/TESTS_STATUS.md)

### Qualité du Code

```bash
# Linter (vérification)
npm run lint

# Linter (auto-correction)
npm run lint:fix

# Formater le code
npm run format

# Vérifier les types TypeScript
npm run typecheck
```

### Base de Données

```bash
# Générer une migration
npm run migration:generate -- src/infrastructure/database/migrations/NomDeLaMigration

# Exécuter les migrations
npm run migration:run

# Annuler la dernière migration
npm run migration:revert

# Réinitialiser la DB (ATTENTION: efface tout)
npm run db:reset
```

## 🗺️ Navigation Rapide

### Où Trouver Quoi?

| Je veux... | Aller dans... |
|-----------|---------------|
| Ajouter une route API | `src/presentation/routes/` |
| Ajouter de la logique métier | `src/application/use-cases/` |
| Modifier une entité | `src/domain/entities/` |
| Ajouter un provider OAuth | `src/infrastructure/oauth/providers/` |
| Ajouter un test | `tests/unit/` ou `tests/frontend/` |
| Modifier la configuration | `src/shared/config/` ou `.env` |

**Carte complète:** Voir [guides/PROJECT_STRUCTURE.md](./guides/PROJECT_STRUCTURE.md)

## 🔧 Workflows Courants

### Ajouter un Nouvel Endpoint API

**Voir [guides/AI_AGENT_GUIDE.md](./guides/AI_AGENT_GUIDE.md)** - Exemple complet avec tous les fichiers

1. Créer le Use Case dans `src/application/use-cases/`
2. Créer le Controller dans `src/presentation/controllers/`
3. Ajouter la Route dans `src/presentation/routes/`
4. Créer les Tests dans `tests/unit/use-cases/`

### Ajouter un Provider OAuth

**Voir [guides/AI_AGENT_GUIDE.md](./guides/AI_AGENT_GUIDE.md)** - Exemple complet LinkedIn

1. Créer le Provider dans `src/infrastructure/oauth/providers/`
2. Enregistrer dans Factory `src/infrastructure/oauth/oauth-provider.factory.ts`
3. Ajouter les Types dans `src/shared/types/oauth.types.ts`
4. Configurer .env avec les credentials

## 🐛 Problèmes Courants

### "Cannot find module" ou erreurs d'import

**Solution:** Vérifier les alias TypeScript dans `tsconfig.json`

```typescript
// ✅ BON
import { User } from '@domain/entities/user.entity';

// ❌ MAUVAIS
import { User } from '../../../domain/entities/user.entity';
```

### "Database connection failed"

**Solution:** L'application peut fonctionner sans DB en mode démo. Sinon:
1. Vérifier MySQL est démarré
2. Vérifier les credentials dans `.env`
3. Créer la database: `CREATE DATABASE superoauth;`

### Infrastructure MySQL — VPS (11/03/2026)

MySQL natif supprimé du VPS. Deux containers Docker gérés via le Gestionnaire Docker Hostinger :

| Container | Port | Usage |
|-----------|------|-------|
| `mysql-prod` | `127.0.0.1:3306` | Production |
| `mysql-dev` | `127.0.0.1:3307` | Développement / tests |

**Avant de redéployer Super-OAuth**, créer le user et la DB dans `mysql-prod` :
```sql
CREATE DATABASE auth_hybrid_dbts;
CREATE USER 'superoauth'@'%' IDENTIFIED BY 'mot_de_passe';
GRANT ALL PRIVILEGES ON auth_hybrid_dbts.* TO 'superoauth'@'%';
FLUSH PRIVILEGES;
```

Puis lancer les migrations :
```bash
npm run migration:run
```

`.env` à configurer :
```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306        # prod
# MYSQL_PORT=3307      # dev
MYSQL_DATABASE=auth_hybrid_dbts
MYSQL_USERNAME=superoauth
```

### Tests qui échouent

**Solution:**
```bash
# Nettoyer le cache Jest
npm run test -- --clearCache

# Relancer les tests
npm run test
```

## 📞 Ressources et Support

### Documentation Complète

| Document | Description |
|----------|-------------|
| [README.md](./README.md) | Vue d'ensemble de la documentation |
| [guides/ARCHITECTURE.md](./guides/ARCHITECTURE.md) | Architecture DDD détaillée |
| [guides/DEVELOPMENT.md](./guides/DEVELOPMENT.md) | Standards et patterns |
| [guides/AI_AGENT_GUIDE.md](./guides/AI_AGENT_GUIDE.md) | Workflows pour agents IA |
| [guides/PROJECT_STRUCTURE.md](./guides/PROJECT_STRUCTURE.md) | Structure des fichiers |
| [guides/TESTING.md](./guides/TESTING.md) | Guide des tests |

### Points d'Entrée du Code

| Fichier | Description |
|---------|-------------|
| `src/main.ts` | Point d'entrée de l'application |
| `src/presentation/routes/` | Définition des routes API |
| `src/application/use-cases/` | Logique métier principale |
| `src/domain/entities/` | Modèles de données |

## ✅ Checklist Finale Avant de Commencer

- [ ] Node.js 20+ installé
- [ ] npm 9+ installé
- [ ] Repository cloné
- [ ] `npm install` exécuté
- [ ] `.env` configuré
- [ ] Application démarre avec `npm run dev`
- [ ] J'ai lu [guides/ARCHITECTURE.md](./guides/ARCHITECTURE.md)
- [ ] J'ai lu [guides/DEVELOPMENT.md](./guides/DEVELOPMENT.md)
- [ ] J'ai lu [guides/AI_AGENT_GUIDE.md](./guides/AI_AGENT_GUIDE.md)
- [ ] Je connais la structure via [guides/PROJECT_STRUCTURE.md](./guides/PROJECT_STRUCTURE.md)
- [ ] J'ai lu [.cursorrules](./.cursorrules)

## 🎯 Prêt à Coder!

Vous êtes maintenant prêt à contribuer à SuperOAuth!

**Rappel important pour les agents IA:**
- Toujours lire les fichiers avant de les modifier
- Respecter l'architecture en couches
- Écrire des tests pour le nouveau code
- Documenter les fonctions publiques

**Bon développement!**

*Dernière mise à jour : 19 Novembre 2024*
