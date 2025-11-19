# 🧪 Guide de Tests - SuperOAuth

## Vue d'Ensemble

SuperOAuth dispose d'une suite complète de **372 tests** (123 backend + 249 frontend) avec un taux de réussite de **100%**. Ce guide explique **comment écrire de nouveaux tests** selon les bonnes pratiques du projet.

> **⚠️ Ce guide explique COMMENT écrire des tests.**
> **Pour les métriques à jour, consultez [.github/TESTS_STATUS.md](../../.github/TESTS_STATUS.md) et [tests/README.md](../../tests/README.md)**

## 📊 Statistiques Globales

- **Total de tests** : 372 (123 backend + 249 frontend)
- **Tests backend** : 123 tests (Jest) - Phase 1 complétée ✅
- **Tests frontend** : 249 tests (Vitest)
- **Taux de réussite** : 100% ✅
- **Coverage backend** : ~45% (objectif: 82%)
- **Coverage frontend** : ~60%
- **Durée d'exécution** : ~15s (backend), ~5s (frontend)
- **Frameworks** : Jest + ts-jest (backend), Vitest + jsdom (frontend)

## 🗂️ Structure des Tests

```
tests/
├── frontend/
│   ├── setup.js                    # Configuration globale Vitest
│   ├── unit/
│   │   ├── managers/
│   │   │   ├── toast-manager.test.js      (35 tests)
│   │   │   └── token-manager.test.js      (36 tests)
│   │   ├── utils/
│   │   │   ├── storage.test.js            (21 tests)
│   │   │   ├── validation.test.js         (28 tests)
│   │   │   ├── http.test.js               (22 tests)
│   │   │   ├── ui.test.js                 (14 tests)
│   │   │   ├── format.test.js             (14 tests)
│   │   │   ├── logger.test.js             (9 tests)
│   │   │   └── error-handler.test.js      (7 tests)
│   │   ├── auth-service.test.js           (15 tests)
│   │   ├── dashboard-component.test.js    (15 tests)
│   │   ├── server-monitor.test.js         (15 tests)
│   │   └── shared-utils.test.js           (18 tests)
```

## 🎯 Modules Testés

### Managers (71 tests)

#### ToastManager (35 tests)
```javascript
// tests/frontend/unit/managers/toast-manager.test.js

describe('ToastManager', () => {
  it('should create and display a toast', () => {
    const toast = manager.show('Test message')
    expect(toast).toBeTruthy()
    expect(toast.textContent).toContain('Test message')
  })

  it('should auto-remove toast after duration', () => {
    manager.show('Auto-remove test', 'info', 2000)
    vi.advanceTimersByTime(2000)
    // Toast should be removed
  })
})
```

**Couverture** :
- ✅ Création et affichage de toasts
- ✅ 4 types : success, error, warning, info
- ✅ Animations d'entrée/sortie
- ✅ Auto-fermeture avec durée configurable
- ✅ Fermeture manuelle au clic
- ✅ Gestion de multiples toasts
- ✅ Edge cases (messages longs, vides, HTML, XSS)

#### TokenManager (36 tests)
```javascript
// tests/frontend/unit/managers/token-manager.test.js

describe('TokenManager', () => {
  it('should store and retrieve access token', () => {
    manager.setAccessToken('test-token')
    expect(manager.getAccessToken()).toBe('test-token')
  })

  it('should validate authentication state', () => {
    expect(manager.isAuthenticated()).toBe(false)
    manager.setAccessToken('token')
    expect(manager.isAuthenticated()).toBe(true)
  })
})
```

**Couverture** :
- ✅ Gestion access/refresh tokens
- ✅ Storage/retrieval de tokens
- ✅ User info avec JSON parsing
- ✅ Clear tokens et authentification
- ✅ Validation de l'état auth
- ✅ Edge cases (empty, null, invalid JSON)

### Utils (115 tests)

#### Storage (21 tests)
```javascript
// tests/frontend/unit/utils/storage.test.js

describe('Storage', () => {
  it('should store and retrieve a value', () => {
    Storage.set('key', 'value')
    expect(Storage.get('key')).toBe('value')
  })

  it('should handle token management', () => {
    Storage.setTokens('access', 'refresh')
    expect(Storage.getAccessToken()).toBe('access')
    expect(Storage.getRefreshToken()).toBe('refresh')
  })
})
```

**Couverture** :
- ✅ Get/Set/Remove operations
- ✅ Token-specific methods
- ✅ Clear operations
- ✅ Edge cases (empty strings, null, special chars)

#### Validation (28 tests)
```javascript
// tests/frontend/unit/utils/validation.test.js

describe('Validation', () => {
  it('should validate email format', () => {
    expect(Validation.isEmail('test@example.com')).toBe(true)
    expect(Validation.isEmail('invalid')).toBe(false)
  })

  it('should validate password strength', () => {
    const strong = 'MyP@ssw0rd123'
    const weak = 'password'
    expect(Validation.isPasswordStrong(strong)).toBe(true)
    expect(Validation.isPasswordStrong(weak)).toBe(false)
  })
})
```

**Couverture** :
- ✅ Email validation (RFC compliant)
- ✅ Password strength (8+ chars, uppercase, lowercase, digit, special)
- ✅ Password matching
- ✅ Edge cases (null, empty, invalid formats)

#### HTTP (22 tests)
```javascript
// tests/frontend/unit/utils/http.test.js

describe('HTTP', () => {
  it('should make GET request with auth', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' })
    })

    const result = await HTTP.get('/api/test', 'token')
    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer token'
        })
      })
    )
  })
})
```

**Couverture** :
- ✅ GET/POST/PUT/DELETE methods
- ✅ Authorization headers
- ✅ Error handling
- ✅ Response parsing

### Components (45 tests)

#### AuthService (15 tests)
- ✅ Login/Register/Logout
- ✅ OAuth flows
- ✅ Token refresh
- ✅ Error handling

#### Dashboard (15 tests)
- ✅ User info display
- ✅ Data loading
- ✅ Update operations
- ✅ Error states

#### ServerMonitor (15 tests)
- ✅ Health checks
- ✅ Status monitoring
- ✅ Connection state
- ✅ Auto-refresh

## 🔧 Configuration

### Vitest Config

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/frontend/setup.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js'
      ]
    }
  }
});
```

### Setup Global

```javascript
// tests/frontend/setup.js

// Mock localStorage avec stockage fonctionnel
const createLocalStorageMock = () => {
  let store = {}
  return {
    getItem: (key) => key in store ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} }
  }
}
global.localStorage = createLocalStorageMock()

// Mock fetch API
global.fetch = vi.fn()

// Mock console pour tests silencieux
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}
```

## ✍️ Écrire de Nouveaux Tests

### Template de Base

```javascript
/**
 * Tests unitaires pour [module-name]
 * Teste [description]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ModuleToTest } from '../../../../public/js/path/to/module.js'

describe('ModuleToTest', () => {
  beforeEach(() => {
    // Setup avant chaque test
    vi.clearAllMocks()
  })

  describe('Feature Group', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = ModuleToTest.method(input)

      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

### Bonnes Pratiques

#### 1. Structure AAA (Arrange-Act-Assert)

```javascript
it('should validate email format', () => {
  // Arrange
  const validEmail = 'user@example.com'
  const invalidEmail = 'not-an-email'

  // Act
  const valid = Validation.isEmail(validEmail)
  const invalid = Validation.isEmail(invalidEmail)

  // Assert
  expect(valid).toBe(true)
  expect(invalid).toBe(false)
})
```

#### 2. Tests Descriptifs

```javascript
// ✅ BON - Description claire et spécifique
it('should return null when no access token exists', () => {
  expect(manager.getAccessToken()).toBeNull()
})

// ❌ MAUVAIS - Description vague
it('should work', () => {
  expect(manager.getAccessToken()).toBeNull()
})
```

#### 3. Coverage des Edge Cases

```javascript
describe('Edge Cases', () => {
  it('should handle empty string values', () => {
    Storage.set('key', '')
    expect(Storage.get('key')).toBe('')
  })

  it('should handle null values gracefully', () => {
    Storage.set('key', null)
    expect(Storage.get('key')).toBe('null') // localStorage convertit en string
  })

  it('should handle undefined values gracefully', () => {
    expect(() => Storage.get(undefined)).not.toThrow()
  })

  it('should handle very long values', () => {
    const longValue = 'x'.repeat(10000)
    Storage.set('key', longValue)
    expect(Storage.get('key').length).toBe(10000)
  })
})
```

#### 4. Mocking Approprié

```javascript
// Mock d'un module entier
vi.mock('../../../../public/js/utils/ui.js', () => ({
  UI: {
    showElement: vi.fn(),
    setHTML: vi.fn()
  }
}))

// Mock de fetch pour tests HTTP
beforeEach(() => {
  global.fetch = vi.fn()
})

it('should call API with correct parameters', async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: 'test' })
  })

  await HTTP.get('/api/endpoint')

  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/endpoint'),
    expect.any(Object)
  )
})
```

#### 5. Tests Asynchrones

```javascript
it('should handle async operations', async () => {
  const promise = HTTP.post('/api/endpoint', { data: 'test' })

  await expect(promise).resolves.toEqual({
    ok: true,
    data: expect.any(Object)
  })
})
```

#### 6. Timers et Animations

```javascript
import { vi } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('should auto-remove toast after duration', () => {
  const toast = manager.show('Test', 'info', 2000)

  expect(manager.toasts.length).toBe(1)

  vi.advanceTimersByTime(2000)
  vi.advanceTimersByTime(300) // Animation duration

  expect(manager.toasts.length).toBe(0)
})
```

## 🚀 Commandes

### Lancer les Tests

```bash
# Tous les tests frontend
npm run test:frontend

# Tests en mode watch
npm run test:frontend -- --watch

# Tests avec coverage
npm run test:frontend -- --coverage

# Test d'un fichier spécifique
npm run test:frontend -- tests/frontend/unit/utils/validation.test.js

# Tests en mode UI interactif
npm run test:frontend -- --ui

# Tests des fichiers modifiés seulement
npm run test:frontend -- --changed

# Tests en parallèle (plus rapide)
npm run test:frontend -- --threads
```

### Debugging

```bash
# Mode debug avec Node inspector
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Logs détaillés
npm run test:frontend -- --reporter=verbose

# Run un seul test
npm run test:frontend -- -t "should validate email format"
```

## 🎯 Checklist Nouveau Test

Avant de soumettre un nouveau test, vérifier :

- [ ] ✅ Le test utilise la structure AAA (Arrange-Act-Assert)
- [ ] ✅ La description est claire et spécifique
- [ ] ✅ Les edge cases sont couverts (null, undefined, empty, invalid)
- [ ] ✅ Les mocks sont correctement configurés et nettoyés
- [ ] ✅ Les tests asynchrones utilisent `async/await`
- [ ] ✅ Les timers utilisent `vi.useFakeTimers()` si nécessaire
- [ ] ✅ Le test est isolé et n'affecte pas les autres tests
- [ ] ✅ Le test passe localement avec `npm run test:frontend`
- [ ] ✅ Le code est formaté avec Prettier
- [ ] ✅ Pas de console.log ou debugger oubliés

## 📈 Métriques de Qualité

### Objectifs
- **Pass rate** : 100% (actuellement atteint ✅)
- **Coverage** : >80% des lignes de code
- **Performance** : <10 secondes pour toute la suite
- **Isolation** : Chaque test doit pouvoir s'exécuter indépendamment

### Analyse de Coverage

```bash
# Générer le rapport de coverage
npm run test:frontend -- --coverage

# Ouvrir le rapport HTML
open coverage/index.html
```

Le rapport affiche :
- **Statements** : Pourcentage de lignes exécutées
- **Branches** : Pourcentage de branches conditionnelles testées
- **Functions** : Pourcentage de fonctions appelées
- **Lines** : Pourcentage de lignes de code couvertes

## 🐛 Résolution de Problèmes

### Test Fails Intermittents

```javascript
// Problème : Tests qui passent/échouent aléatoirement
// Cause : État partagé entre tests

// Solution : Nettoyer l'état dans beforeEach
beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  document.body.innerHTML = ''
})
```

### Mock localStorage ne Persiste pas

```javascript
// ❌ MAUVAIS - Mock avec vi.fn() ne persiste pas l'état
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn()
}

// ✅ BON - Mock fonctionnel avec stockage réel
const createLocalStorageMock = () => {
  let store = {}
  return {
    getItem: (key) => key in store ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value) }
  }
}
```

### Tests Asynchrones qui Timeout

```javascript
// Augmenter le timeout pour tests lents
it('should handle long operation', async () => {
  // ...
}, 10000) // 10 secondes timeout

// Ou globalement dans vitest.config.js
export default defineConfig({
  test: {
    testTimeout: 10000
  }
})
```

## 📚 Ressources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

### Patterns de Test
- Arrange-Act-Assert (AAA)
- Given-When-Then (GWT)
- Test-Driven Development (TDD)

### Outils
- [Vitest UI](https://vitest.dev/guide/ui.html) - Interface graphique pour les tests
- [Vitest VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer) - Intégration IDE

---

**Maintenu par l'équipe SuperOAuth** | Dernière mise à jour : 19 Novembre 2024
