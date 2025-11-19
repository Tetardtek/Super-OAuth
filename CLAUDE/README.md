# 📁 CLAUDE - Documentation pour Agents IA

Ce dossier contient toute la documentation nécessaire pour les agents IA (Claude Code, Cursor, GitHub Copilot, etc.) qui travaillent sur le projet SuperOAuth.

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

4. **[guides/DEVELOPMENT.md](./guides/DEVELOPMENT.md)** (20 min)
   - Standards de code
   - Patterns de développement
   - Gestion des erreurs

5. **[guides/AI_AGENT_GUIDE.md](./guides/AI_AGENT_GUIDE.md)** (20 min)
   - Workflows pour agents IA
   - Exemples complets step-by-step
   - Erreurs communes à éviter

6. **[guides/PROJECT_STRUCTURE.md](./guides/PROJECT_STRUCTURE.md)** (5-10 min)
   - Localisation rapide des fichiers
   - Carte de navigation

## 📁 Structure du Dossier

```
CLAUDE/
├── README.md                    # Ce fichier
├── QUICK_START.md              # Démarrage en 5 minutes
├── .cursorrules                # Règles pour agents IA
│
└── guides/                     # Guides techniques détaillés
    ├── ARCHITECTURE.md         # Architecture DDD complète
    ├── DEVELOPMENT.md          # Standards de code et patterns
    ├── AI_AGENT_GUIDE.md       # Workflows pour agents IA
    ├── PROJECT_STRUCTURE.md    # Navigation dans le projet
    └── TESTING.md              # Guide complet des tests
```

## 📚 Guides Disponibles

### 🎯 Guides Essentiels

| Guide | Description | Lignes | Quand le Lire |
|-------|-------------|--------|---------------|
| **QUICK_START.md** | Démarrage rapide en 5 min | ~200 | Dès le début |
| **.cursorrules** | Règles strictes pour agents IA | ~350 | Avant tout changement |

### 📖 Guides Détaillés

| Guide | Description | Lignes | Quand le Lire |
|-------|-------------|--------|---------------|
| **ARCHITECTURE.md** | Architecture DDD, flux, sécurité | ~300 | Pour comprendre la structure |
| **DEVELOPMENT.md** | Standards code, patterns, tests | ~500 | Pour développer |
| **AI_AGENT_GUIDE.md** | Workflows IA, exemples complets | ~400 | Pour coder efficacement |
| **PROJECT_STRUCTURE.md** | Localisation fichiers, navigation | ~350 | Pour trouver rapidement |
| **TESTING.md** | Guide complet des tests (290 tests) | ~350 | Pour écrire/comprendre les tests |

**Total: ~2600 lignes** (au lieu de 3993 précédemment)

## 🎯 Statut du Projet

**Voir `.github/PROJECT_STATUS.md` pour l'état détaillé**

| Domaine | Statut |
|---------|:------:|
| Architecture DDD | ✅ 100% |
| Code Backend | ✅ 95% |
| Tests | ✅ 290/290 (100%) |
| Documentation | ✅ 100% |
| ESLint | ✅ 0 erreurs |

**Phase Actuelle :** Phase 6 - ESLint Strict Mode ✅ COMPLÉTÉ

**Prochaine Étape :** Créer PR vers `main`

## 🎓 Checklist pour Agents IA

Avant de modifier quoi que ce soit :

- [ ] J'ai lu `QUICK_START.md`
- [ ] J'ai lu `.cursorrules`
- [ ] J'ai compris l'architecture via `guides/ARCHITECTURE.md`
- [ ] Je connais les standards via `guides/DEVELOPMENT.md`
- [ ] Je connais les workflows via `guides/AI_AGENT_GUIDE.md`
- [ ] Je sais où sont les fichiers via `guides/PROJECT_STRUCTURE.md`
- [ ] Je respecte les conventions de nommage
- [ ] Je comprends la séparation des couches DDD

## 📜 Règles d'Or (NON NÉGOCIABLES)

1. ✅ **TOUJOURS** respecter la séparation des couches DDD
2. ✅ **TOUJOURS** utiliser l'injection de dépendances
3. ✅ **TOUJOURS** créer des tests pour le nouveau code
4. ❌ **JAMAIS** court-circuiter les couches
5. ❌ **JAMAIS** utiliser le type `any`
6. ❌ **JAMAIS** mettre de logique métier dans les Controllers

**Détails complets:** Voir [.cursorrules](./.cursorrules)

## 🔧 Commandes Rapides

```bash
# Développement
npm run dev              # Lancer en mode développement

# Tests
npm run test             # Tous les tests (290 tests)
npm run test:frontend    # Tests frontend (249 tests)

# Qualité
npm run lint:fix         # Corriger le code
npm run format           # Formater le code
npm run typecheck        # Vérifier les types

# Base de données
npm run migration:run    # Exécuter les migrations
```

**Commandes complètes:** Voir [QUICK_START.md](./QUICK_START.md)

## 🆘 Navigation Rapide

### Je veux...

| Objectif | Fichier à Consulter |
|----------|-------------------|
| Démarrer rapidement | [QUICK_START.md](./QUICK_START.md) |
| Comprendre l'architecture | [guides/ARCHITECTURE.md](./guides/ARCHITECTURE.md) |
| Connaître les standards | [guides/DEVELOPMENT.md](./guides/DEVELOPMENT.md) |
| Voir des exemples complets | [guides/AI_AGENT_GUIDE.md](./guides/AI_AGENT_GUIDE.md) |
| Trouver un fichier | [guides/PROJECT_STRUCTURE.md](./guides/PROJECT_STRUCTURE.md) |
| Écrire des tests | [guides/TESTING.md](./guides/TESTING.md) |
| Voir les règles strictes | [.cursorrules](./.cursorrules) |

## 🚀 Prêt à Contribuer

Une fois tous les guides lus et la checklist validée, vous êtes prêt à contribuer à SuperOAuth !

**Rappel Important :**
- Toujours lire les fichiers avant de les modifier
- Respecter l'architecture en couches
- Écrire des tests pour le nouveau code
- Documenter les fonctions publiques

---

**Bon développement !**

*Documentation maintenue par : Équipe SuperOAuth*
*Dernière mise à jour : 19 Novembre 2024*
