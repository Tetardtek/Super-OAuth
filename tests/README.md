# 🧪 Tests SuperOAuth

## 📚 Documentation Complète
## 🚀 Quick Start

### Exécution des Tests
```bash
# Tests frontend complets
npm run test:frontend

# Tests backend complets
npm run test

# Tous les tests (frontend + backend)
npm run test:all

# Mode développement (watch)
npm run test:frontend:watch
npm run test:watch

# Interface graphique (frontend)
npm run test:frontend:ui

# Rapports de couverture
npm run test:frontend:coverage
npm run test:coverage
npm run test:all:coverage
```

## 📊 État Actuel

### Tests Frontend ✅
- **Framework** : Vitest + jsdom
- **Tests** : 63 tests (100% réussite)
- **Composants** : 4 modules testés
- **Coverage** : Configuration V8 avec seuils 60%

### Tests Backend ✅
- **Framework** : Jest + ts-jest
- **Tests** : 30 tests (100% réussite)
- **Composants** : 3 modules testés
- **Coverage** : 11.94% globale (focus sur domaine)

### Répartition des Tests
| Type | Module | Tests | Statut |
|------|--------|-------|--------|
| **Frontend** | Auth Service | 15 | ✅ |
| **Frontend** | Dashboard | 15 | ✅ |
| **Frontend** | Server Monitor | 15 | ✅ |
| **Frontend** | Shared Utils | 18 | ✅ |
| **Backend** | Value Objects | 7 | ✅ |
| **Backend** | Use Cases | 5 | ✅ |
| **Backend** | Token Service | 18 | ✅ |
| **TOTAL** | - | **93** | **✅** |

## 🏗️ Structure

```
tests/
├── frontend/                  # Tests Frontend (Vitest)
│   ├── setup.js               # Configuration globale
│   ├── mocks/
│   │   └── api.js            # Mocks API
│   └── unit/
│       ├── auth-service.test.js
│       ├── dashboard-component.test.js
│       ├── server-monitor.test.js
│       └── shared-utils.test.js
├── unit/                      # Tests Backend (Jest)
│   ├── value-objects.test.ts  # Domain Value Objects
│   ├── use-cases/
│   │   └── register-classic.test.ts
│   └── services/
│       └── token.service.test.ts
└── README.md                  # Ce fichier
```

## 🎯 Objectifs de Tests

### Classification Frontend
- **Critiques** : 32 tests (51%) - Sécurité, auth, logique métier
- **Performance** : 18 tests (29%) - UX, optimisations
- **Robustesse** : 13 tests (20%) - Edge cases, recovery

### Classification Backend
- **Value Objects** : 7 tests - Validation domaine (Email, Password, etc.)
- **Use Cases** : 5 tests - Logique métier (Register Classic)
- **Services** : 18 tests - Infrastructure (Token Service)

### Couverture Cible
- **Frontend** : 60% minimum (configuré)
- **Backend** : 90% minimum (objectif)
- **Domaine Critique** : 95% (auth/sécurité)

## 🔧 Configuration

### Frontend - Vitest Config
- **Environment** : jsdom (simulation navigateur)
- **Globals** : Activé (describe, it, expect)
- **Coverage** : V8 provider avec seuils
- **Timeout** : 10s par test/hook

### Backend - Jest Config
- **Environment** : node (TypeScript)
- **Preset** : ts-jest
- **Coverage** : V8 provider avec HTML/LCOV
- **Timeout** : 10s par test

### Mocks Disponibles
#### Frontend
- **localStorage/sessionStorage** : Persistance données
- **fetch API** : Requêtes HTTP
- **clipboard API** : Copier/coller
- **DOM APIs** : Simulation navigateur

#### Backend
- **Repositories** : Mocks TypeORM
- **Services** : Mocks JWT/Token
- **External APIs** : Mocks OAuth providers

## 📈 Prochaines Étapes

### Phase 3.2 - Tests Backend
- Tests unitaires (Jest/Vitest)
- Tests d'intégration (Supertest)
- Tests base de données (Test containers)

### Phase 3.3 - Tests E2E
- Playwright ou Cypress
- Scénarios utilisateur complets
- Tests cross-browser

### Phase 3.4 - Tests Performance
- Tests de charge (Artillery/k6)
- Benchmarks API
- Monitoring continu

## 🆘 Aide et Support

### Commandes Utiles
```bash
# Debug tests frontend spécifiques
npx vitest auth-service --inspect-brk

# Debug tests backend spécifiques
npm run test -- --testNamePattern="UserId"

# Tests avec pattern
npx vitest --grep "login"
npm run test -- --testPathPattern="value-objects"

# Verbose output
npx vitest --reporter=verbose
npm run test -- --verbose
```

### Documentation
- [Guide Vitest](https://vitest.dev/guide/)
- [jsdom Reference](https://github.com/jsdom/jsdom)
---

*Dernière mise à jour : Phase 3.1 - Juillet 2025*
