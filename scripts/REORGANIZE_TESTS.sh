#!/bin/bash

# ================================================================
# Script de Réorganisation des Tests - SuperOAuth
# ================================================================
# Date: 2025-11-19
# Objectif: Réorganiser la structure des tests selon Clean Architecture
# Usage: bash REORGANIZE_TESTS.sh
# ================================================================

echo "🔄 Réorganisation des Tests SuperOAuth"
echo "======================================"
echo ""

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ================================================================
# ÉTAPE 1: Créer la nouvelle structure de dossiers
# ================================================================

echo -e "${BLUE}[1/5] Création de la nouvelle structure...${NC}"

mkdir -p tests/unit/domain/value-objects
mkdir -p tests/unit/domain/entities
mkdir -p tests/unit/application/use-cases
mkdir -p tests/unit/application/services
mkdir -p tests/unit/infrastructure/services
mkdir -p tests/unit/infrastructure/repositories
mkdir -p tests/unit/infrastructure/mappers
mkdir -p tests/unit/presentation/middleware
mkdir -p tests/unit/presentation/validators
mkdir -p tests/integration/api
mkdir -p tests/integration/database
mkdir -p tests/e2e
mkdir -p tests/scripts
mkdir -p tests/mocks
mkdir -p tests/fixtures

echo -e "${GREEN}✅ Structure créée${NC}"
echo ""

# ================================================================
# ÉTAPE 2: Déplacer les tests existants
# ================================================================

echo -e "${BLUE}[2/5] Déplacement des tests existants...${NC}"

# Déplacer tests scripts (tooling)
if [ -f "tests/unit/analyze-bundle-size.util.test.js" ]; then
    mv tests/unit/analyze-bundle-size.util.test.js tests/scripts/
    echo -e "${GREEN}✅ Déplacé: analyze-bundle-size.util.test.js → tests/scripts/${NC}"
fi

if [ -f "tests/unit/optimize-bundles.utils.test.js" ]; then
    mv tests/unit/optimize-bundles.utils.test.js tests/scripts/
    echo -e "${GREEN}✅ Déplacé: optimize-bundles.utils.test.js → tests/scripts/${NC}"
fi

# Déplacer tests use-cases
if [ -f "tests/unit/use-cases/register-classic.test.ts" ]; then
    mv tests/unit/use-cases/register-classic.test.ts tests/unit/application/use-cases/
    echo -e "${GREEN}✅ Déplacé: register-classic.test.ts → tests/unit/application/use-cases/${NC}"
fi

# Déplacer tests services
if [ -f "tests/unit/services/token.service.test.ts" ]; then
    mv tests/unit/services/token.service.test.ts tests/unit/infrastructure/services/
    echo -e "${GREEN}✅ Déplacé: token.service.test.ts → tests/unit/infrastructure/services/${NC}"
fi

# Note: value-objects.test.ts sera splité manuellement (voir ÉTAPE 4)
echo -e "${YELLOW}⚠️  value-objects.test.ts à spliter manuellement (voir instructions)${NC}"

echo ""

# ================================================================
# ÉTAPE 3: Supprimer les anciens dossiers vides
# ================================================================

echo -e "${BLUE}[3/5] Nettoyage des dossiers vides...${NC}"

if [ -d "tests/unit/use-cases" ] && [ -z "$(ls -A tests/unit/use-cases)" ]; then
    rmdir tests/unit/use-cases
    echo -e "${GREEN}✅ Supprimé: tests/unit/use-cases/${NC}"
fi

if [ -d "tests/unit/services" ] && [ -z "$(ls -A tests/unit/services)" ]; then
    rmdir tests/unit/services
    echo -e "${GREEN}✅ Supprimé: tests/unit/services/${NC}"
fi

echo ""

# ================================================================
# ÉTAPE 4: Créer fichiers README de documentation
# ================================================================

echo -e "${BLUE}[4/5] Création des fichiers README...${NC}"

# tests/mocks/README.md
cat > tests/mocks/README.md << 'EOF'
# Mocks Partagés

Ce dossier contient les mocks réutilisables pour les tests.

## Structure

```
mocks/
├── repositories.mock.ts    # Mocks repositories (UserRepository, etc.)
├── services.mock.ts        # Mocks services (TokenService, OAuthService, etc.)
└── entities.mock.ts        # Factory pour entités de test (User, LinkedAccount)
```

## Usage

```typescript
import { mockUserRepository, mockTokenService } from '@/tests/mocks';

describe('LoginClassicUseCase', () => {
  let useCase: LoginClassicUseCase;

  beforeEach(() => {
    const userRepo = mockUserRepository();
    const tokenService = mockTokenService();
    useCase = new LoginClassicUseCase(userRepo, tokenService);
  });
});
```

## À Créer

- [ ] repositories.mock.ts
- [ ] services.mock.ts
- [ ] entities.mock.ts
EOF

# tests/fixtures/README.md
cat > tests/fixtures/README.md << 'EOF'
# Fixtures de Test

Ce dossier contient les données de test réutilisables.

## Structure

```
fixtures/
├── users.fixture.ts            # Utilisateurs de test
├── tokens.fixture.ts           # Tokens JWT de test
└── oauth-responses.fixture.ts  # Réponses OAuth providers
```

## Usage

```typescript
import { validUser, inactiveUser } from '@/tests/fixtures/users.fixture';

describe('LoginClassicUseCase', () => {
  it('should reject inactive user', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(inactiveUser);
    // ...
  });
});
```

## À Créer

- [ ] users.fixture.ts
- [ ] tokens.fixture.ts
- [ ] oauth-responses.fixture.ts
EOF

# tests/integration/README.md
cat > tests/integration/README.md << 'EOF'
# Tests d'Intégration

Tests d'intégration HTTP (Supertest) et Database (Test Containers).

## API Tests (Supertest)

```bash
npm install --save-dev supertest @types/supertest
```

```typescript
// tests/integration/api/auth.routes.integration.test.ts
import request from 'supertest';
import { app } from '@/main';

describe('POST /auth/login', () => {
  it('should return 200 with valid credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'Valid123!' });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeDefined();
  });
});
```

## Database Tests (Test Containers)

```bash
npm install --save-dev testcontainers
```

```typescript
// tests/integration/database/repositories.integration.test.ts
import { GenericContainer } from 'testcontainers';

describe('UserRepository Integration', () => {
  let container: StartedTestContainer;

  beforeAll(async () => {
    container = await new GenericContainer('mysql:8.0')
      .withExposedPorts(3306)
      .start();
  });

  afterAll(async () => {
    await container.stop();
  });
});
```

## À Créer (Phase 4)

- [ ] auth.routes.integration.test.ts (25 tests)
- [ ] oauth.routes.integration.test.ts (20 tests)
- [ ] repositories.integration.test.ts (25 tests)
EOF

echo -e "${GREEN}✅ Fichiers README créés${NC}"
echo ""

# ================================================================
# ÉTAPE 5: Afficher les instructions finales
# ================================================================

echo -e "${BLUE}[5/5] Instructions finales${NC}"
echo ""
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   ACTIONS MANUELLES REQUISES${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}1. SPLITER value-objects.test.ts${NC}"
echo "   Le fichier tests/unit/value-objects.test.ts contient 18 tests"
echo "   Il doit être divisé en 4 fichiers:"
echo ""
echo "   tests/unit/domain/value-objects/"
echo "   ├── email.test.ts      (4 tests - lignes 32-51)"
echo "   ├── password.test.ts   (6 tests - lignes 53-78)"
echo "   ├── nickname.test.ts   (4 tests - lignes 80-98)"
echo "   └── user-id.test.ts    (4 tests - lignes 8-30)"
echo ""
echo "   Commandes:"
echo "   - Créer les 4 nouveaux fichiers"
echo "   - Copier les tests correspondants"
echo "   - Supprimer tests/unit/value-objects.test.ts"
echo ""
echo -e "${YELLOW}2. METTRE À JOUR jest.config.ts${NC}"
echo "   Modifier le roots pour pointer vers la nouvelle structure:"
echo ""
echo "   roots: ["
echo "     '<rootDir>/tests/unit',"
echo "     '<rootDir>/tests/integration'"
echo "   ]"
echo ""
echo -e "${YELLOW}3. METTRE À JOUR tests/README.md${NC}"
echo "   Remplacer tests/README.md par tests/README_UPDATED.md:"
echo ""
echo "   mv tests/README.md tests/README_OLD.md"
echo "   mv tests/README_UPDATED.md tests/README.md"
echo ""
echo -e "${YELLOW}4. VÉRIFIER LES IMPORTS${NC}"
echo "   Après déplacement, vérifier que les imports fonctionnent:"
echo ""
echo "   npm test"
echo "   npm run test:frontend"
echo ""
echo -e "${YELLOW}5. CRÉER LES MOCKS ET FIXTURES (Optionnel)${NC}"
echo "   - tests/mocks/repositories.mock.ts"
echo "   - tests/mocks/services.mock.ts"
echo "   - tests/mocks/entities.mock.ts"
echo "   - tests/fixtures/users.fixture.ts"
echo "   - tests/fixtures/tokens.fixture.ts"
echo "   - tests/fixtures/oauth-responses.fixture.ts"
echo ""
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo ""

# ================================================================
# Résumé Final
# ================================================================

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   RÉSUMÉ DE LA RÉORGANISATION${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "📁 Nouvelle structure créée :"
echo "   tests/"
echo "   ├── unit/"
echo "   │   ├── domain/          ✅ (value-objects, entities)"
echo "   │   ├── application/     ✅ (use-cases, services)"
echo "   │   ├── infrastructure/  ✅ (services, repositories, mappers)"
echo "   │   └── presentation/    ✅ (middleware, validators)"
echo "   ├── integration/         ✅ (api, database)"
echo "   ├── e2e/                 ✅"
echo "   ├── scripts/             ✅ (tests tooling déplacés)"
echo "   ├── mocks/               ✅ (+ README)"
echo "   ├── fixtures/            ✅ (+ README)"
echo "   └── frontend/            ✅ (inchangé - 249 tests)"
echo ""
echo "📦 Fichiers déplacés :"
echo "   ✅ analyze-bundle-size.util.test.js → tests/scripts/"
echo "   ✅ optimize-bundles.utils.test.js → tests/scripts/"
echo "   ✅ register-classic.test.ts → tests/unit/application/use-cases/"
echo "   ✅ token.service.test.ts → tests/unit/infrastructure/services/"
echo "   ⚠️  value-objects.test.ts → À spliter manuellement"
echo ""
echo "📝 Documentation créée :"
echo "   ✅ tests/mocks/README.md"
echo "   ✅ tests/fixtures/README.md"
echo "   ✅ tests/integration/README.md"
echo "   ✅ tests/README_UPDATED.md (à activer)"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""

# ================================================================
# Vérification
# ================================================================

echo -e "${BLUE}🔍 Vérification de la structure...${NC}"
echo ""

tree tests/ -L 3 -d 2>/dev/null || find tests/ -type d -print | sed 's|[^/]*/| |g'

echo ""
echo -e "${GREEN}✅ Réorganisation terminée !${NC}"
echo ""
echo -e "${YELLOW}⚠️  N'oubliez pas de compléter les actions manuelles ci-dessus${NC}"
echo ""
echo "Prochaines étapes :"
echo "1. Spliter value-objects.test.ts (voir instructions)"
echo "2. Mettre à jour jest.config.ts"
echo "3. Activer tests/README_UPDATED.md"
echo "4. Lancer les tests: npm test && npm run test:frontend"
echo "5. Commencer Phase 1 (voir TESTS_ACTION_PLAN.md)"
echo ""
echo -e "${GREEN}Pour plus d'infos:${NC}"
echo "- AUDIT_TESTS_COMPLET.md (analyse détaillée)"
echo "- TESTS_ACTION_PLAN.md (plan 10 jours)"
echo "- TESTS_DASHBOARD.md (vue d'ensemble)"
echo ""
