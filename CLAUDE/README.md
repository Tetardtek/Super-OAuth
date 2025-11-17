# 📁 CLAUDE - Documentation pour Agents IA

Ce dossier contient toute la documentation nécessaire pour les agents IA (Claude Code, Cursor, GitHub Copilot, etc.) qui travaillent sur le projet SuperOAuth.

## 📋 Table des Matières

- [Démarrage Rapide](#démarrage-rapide)
- [Structure du Dossier](#structure-du-dossier)
- [Guides Disponibles](#guides-disponibles)
- [Statut du Projet](#statut-du-projet)
- [Règles et Conventions](#règles-et-conventions)

## 🚀 Démarrage Rapide

### Pour un Agent IA Nouveau sur le Projet

**Ordre de lecture recommandé (temps total : ~1h):**

1. **[QUICK_START.md](./QUICK_START.md)** (5-10 min)
   - Démarrer l'application
   - Comprendre les commandes essentielles
   - Checklist avant de coder

2. **[.cursorrules](./.cursorrules)** (10 min)
   - Règles NON NÉGOCIABLES
   - Interdictions strictes
   - Conventions de nommage

3. **[guides/ARCHITECTURE.md](./guides/ARCHITECTURE.md)** (15 min)
   - Architecture DDD et Clean Architecture
   - Flux de données
   - Modèle de données

4. **[guides/AI_AGENT_GUIDE.md](./guides/AI_AGENT_GUIDE.md)** (20-25 min)
   - Patterns complets avec exemples
   - Erreurs communes à éviter
   - Workflows pour tâches courantes

5. **[guides/PROJECT_STRUCTURE.md](./guides/PROJECT_STRUCTURE.md)** (5-10 min)
   - Localisation rapide des fichiers
   - Carte de navigation

6. **[status/PROJECT_STATUS.md](./status/PROJECT_STATUS.md)** (5 min)
   - État actuel du projet
   - Prochaines actions
   - Métriques

## 📁 Structure du Dossier

```
CLAUDE/
├── README.md                    # Ce fichier
├── QUICK_START.md              # Démarrage en 5 minutes
├── .cursorrules                # Règles pour agents IA
│
├── guides/                     # Guides techniques détaillés
│   ├── ARCHITECTURE.md         # Architecture DDD complète
│   ├── CONTRIBUTING.md         # Standards et workflow
│   ├── AI_AGENT_GUIDE.md       # Patterns et exemples
│   └── PROJECT_STRUCTURE.md    # Navigation dans le projet
│
└── status/                     # Statut et suivi
    ├── PROJECT_STATUS.md       # État actuel du projet
    ├── PROJECT_CONTEXT_OLD.md  # Archive (référence)
    └── SUIVI_PROJET_OLD.md     # Archive (référence)
```

## 📚 Guides Disponibles

### 🎯 Guides Essentiels

| Guide | Description | Quand le Lire |
|-------|-------------|---------------|
| **QUICK_START.md** | Démarrage rapide en 5 min | Dès le début |
| **.cursorrules** | Règles strictes pour agents IA | Avant tout changement |

### 📖 Guides Détaillés

| Guide | Description | Quand le Lire |
|-------|-------------|---------------|
| **ARCHITECTURE.md** | Architecture DDD, flux, sécurité | Pour comprendre la structure |
| **CONTRIBUTING.md** | Standards code, Git workflow, tests | Avant de contribuer |
| **AI_AGENT_GUIDE.md** | Patterns, exemples, erreurs | Pour coder efficacement |
| **PROJECT_STRUCTURE.md** | Localisation fichiers, navigation | Pour trouver rapidement |

### 📊 Statut et Suivi

| Document | Description | Quand le Consulter |
|----------|-------------|-------------------|
| **PROJECT_STATUS.md** | État actuel, métriques, roadmap | Pour voir l'avancement |

## 🎯 Statut du Projet

### Dernière Mise à Jour : 18 Novembre 2025

| Domaine | Progression | Statut |
|---------|:-----------:|:------:|
| Architecture | 100% | ✅ |
| Documentation AI | 100% | ✅ |
| Backend & API | 95% | ✅ |
| Frontend | 90% | ✅ |
| Tests | 90% | ✅ |
| Performance | 100% | ✅ |
| Sécurité | 90% | ✅ |
| CI/CD | 30% | ⚠️ |

**Phase Actuelle :** Phase 4.4 - Documentation Agents IA ✅ COMPLÉTÉE

**Prochaine Phase :** Phase 5 - Fonctionnalités Avancées OAuth

## 📜 Règles et Conventions

### Règles d'Or (NON NÉGOCIABLES)

1. ✅ **TOUJOURS** respecter la séparation des couches DDD
2. ✅ **TOUJOURS** utiliser l'injection de dépendances
3. ✅ **TOUJOURS** créer des tests pour le nouveau code
4. ❌ **JAMAIS** court-circuiter les couches
5. ❌ **JAMAIS** utiliser le type `any`
6. ❌ **JAMAIS** mettre de logique métier dans les Controllers

### Conventions de Nommage

```typescript
// Classes: PascalCase
class UserEntity {}
class RegisterClassicUseCase {}

// Interfaces: PascalCase avec 'I'
interface IUserRepository {}

// Fonctions/Variables: camelCase
const getUserById = () => {}
const isEmailValid = true

// Constantes: SCREAMING_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 5

// Fichiers: kebab-case
user.entity.ts
register-classic.use-case.ts
auth.controller.ts
```

### Architecture en Couches

```
Presentation ──> Application ──> Domain <── Infrastructure
```

**Interdiction absolue :** Les dépendances doivent TOUJOURS pointer vers le Domain, jamais l'inverse.

## 🔧 Commandes Utiles

```bash
# Développement
npm run dev              # Lancer en mode développement
npm run build            # Compiler TypeScript
npm start                # Lancer en production

# Tests
npm test                 # Tous les tests
npm run test:coverage    # Tests avec couverture
npm run test:watch       # Tests en mode watch

# Qualité
npm run lint:fix         # Corriger le code
npm run format           # Formater le code
npm run typecheck        # Vérifier les types

# Base de données
npm run migration:generate  # Générer une migration
npm run migration:run       # Exécuter les migrations
npm run db:reset           # Réinitialiser la DB
```

## 🆘 En Cas de Problème

### Erreur "Cannot find module"
→ Vérifier les alias TypeScript dans `tsconfig.json`
→ Utiliser `@domain/`, `@application/`, etc.

### Tests qui échouent
```bash
npm run test -- --clearCache
npm run test
```

### "Database connection failed"
→ L'application peut fonctionner sans DB en mode démo
→ Vérifier `.env` et les credentials MySQL

## 📞 Support

1. **Consulter les guides** dans `/CLAUDE/guides`
2. **Vérifier le statut** dans `/CLAUDE/status`
3. **Chercher dans la doc** via `PROJECT_STRUCTURE.md`
4. **Lire les exemples** dans `AI_AGENT_GUIDE.md`

## 🎓 Checklist pour Agents IA

Avant de modifier quoi que ce soit :

- [ ] J'ai lu `QUICK_START.md`
- [ ] J'ai lu `.cursorrules`
- [ ] J'ai compris l'architecture via `ARCHITECTURE.md`
- [ ] Je connais les patterns via `AI_AGENT_GUIDE.md`
- [ ] Je sais où sont les fichiers via `PROJECT_STRUCTURE.md`
- [ ] J'ai vérifié le statut du projet via `PROJECT_STATUS.md`
- [ ] Je respecte les conventions de nommage
- [ ] Je comprends la séparation des couches DDD

## 🚀 Prêt à Contribuer

Une fois tous les guides lus et la checklist validée, vous êtes prêt à contribuer à SuperOAuth !

**Rappel Important :**
- Toujours lire les fichiers avant de les modifier
- Respecter l'architecture en couches
- Écrire des tests pour le nouveau code
- Documenter les fonctions publiques

---

**Bon développement ! 🎉**

*Documentation maintenue par : Équipe SuperOAuth*
*Dernière mise à jour : 18 Novembre 2025*
