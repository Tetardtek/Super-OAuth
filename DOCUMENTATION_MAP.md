# 📚 Documentation SuperOAuth - Carte de Navigation

**Version**: 2.0.0 | **Dernière mise à jour**: 19 Novembre 2025

---

## 🎯 Guide Rapide par Audience

### 👨‍💻 Je suis un Développeur
→ **Commencez ici**: [CLAUDE/README.md](./CLAUDE/README.md)
- Quick Start: [CLAUDE/QUICK_START.md](./CLAUDE/QUICK_START.md)
- Architecture: [CLAUDE/guides/ARCHITECTURE.md](./CLAUDE/guides/ARCHITECTURE.md)
- Development: [CLAUDE/guides/DEVELOPMENT.md](./CLAUDE/guides/DEVELOPMENT.md)
- Testing: [CLAUDE/guides/TESTING.md](./CLAUDE/guides/TESTING.md)

### 🤖 Je suis un Agent IA
→ **Commencez ici**: [CLAUDE/guides/AI_AGENT_GUIDE.md](./CLAUDE/guides/AI_AGENT_GUIDE.md)
- Structure du projet: [CLAUDE/guides/PROJECT_STRUCTURE.md](./CLAUDE/guides/PROJECT_STRUCTURE.md)
- Patterns et bonnes pratiques: [CLAUDE/guides/DEVELOPMENT.md](./CLAUDE/guides/DEVELOPMENT.md)

### 🌐 Je veux utiliser l'API
→ **Commencez ici**: [public/docs/README.md](./public/docs/README.md)
- Quick Start API: [public/docs/swagger/QUICK_START.md](./public/docs/swagger/QUICK_START.md)
- Documentation API: [public/docs/swagger/API_DOCUMENTATION.md](./public/docs/swagger/API_DOCUMENTATION.md)
- Codes d'erreur: [public/docs/swagger/ERROR_CODES.md](./public/docs/swagger/ERROR_CODES.md)
- Guide d'intégration SDK: [public/docs/swagger/SDK_INTEGRATION_GUIDE.md](./public/docs/swagger/SDK_INTEGRATION_GUIDE.md)

### 🧪 Je veux comprendre les Tests
→ **Commencez ici**: [tests/README.md](./tests/README.md)
- Statut des tests: [.github/TESTS_STATUS.md](./.github/TESTS_STATUS.md)
- Guide d'écriture: [CLAUDE/guides/TESTING.md](./CLAUDE/guides/TESTING.md)

### 📊 Je veux voir le Statut du Projet
→ **Statut global**: [.github/PROJECT_STATUS.md](./.github/PROJECT_STATUS.md)
- Qualité du code: [.github/CODE_QUALITY_STATUS.md](./.github/CODE_QUALITY_STATUS.md)
- Tests: [.github/TESTS_STATUS.md](./.github/TESTS_STATUS.md)
- Documentation: [.github/DOCUMENTATION_STATUS.md](./.github/DOCUMENTATION_STATUS.md)

---

## 📁 Organisation de la Documentation

### Documentation de Développement (`CLAUDE/`)
**Audience**: Développeurs et Agents IA

```
CLAUDE/
├── README.md                      # Index principal pour développeurs
├── QUICK_START.md                 # Démarrage rapide (setup, tests, dev)
└── guides/
    ├── AI_AGENT_GUIDE.md         # Guide spécifique agents IA
    ├── ARCHITECTURE.md            # Architecture DDD détaillée (SOURCE DE VÉRITÉ)
    ├── DEVELOPMENT.md             # Standards de développement
    ├── PROJECT_STRUCTURE.md       # Navigation dans le code
    └── TESTING.md                 # Guide écriture de tests
```

### Status en Temps Réel (`.github/`)
**Audience**: Toute l'équipe - SOURCES DE VÉRITÉ officielles

```
.github/
├── PROJECT_STATUS.md              # Vue d'ensemble projet (SOURCE DE VÉRITÉ)
├── CODE_QUALITY_STATUS.md         # Métriques qualité (SOURCE DE VÉRITÉ)
├── TESTS_STATUS.md                # Métriques tests (SOURCE DE VÉRITÉ)
└── DOCUMENTATION_STATUS.md        # État de la documentation
```

### Documentation Publique (`public/docs/`)
**Audience**: Utilisateurs externes, intégrateurs

```
public/docs/
├── README.md                      # Index documentation publique
├── index.html                     # Documentation web interactive
├── swagger/                       # Documentation API REST
│   ├── QUICK_START.md            # Démarrage rapide API
│   ├── API_DOCUMENTATION.md      # Référence API complète
│   ├── ERROR_CODES.md            # Codes d'erreur HTTP
│   ├── SDK_INTEGRATION_GUIDE.md  # Guide SDK
│   ├── DOCUMENTATION_INDEX.md    # Index Swagger
│   └── DOCUMENTATION_SUMMARY.md  # Résumé Swagger
└── content/                       # Pages web documentation
    ├── api-reference.html
    ├── architecture.html
    ├── integration.html
    ├── security.html
    └── tests.html
```

### Documentation Tests (`tests/`)
**Audience**: Testeurs, développeurs

```
tests/
└── README.md                      # Guide complet des tests (SOURCE DE VÉRITÉ tests)
```

### Documentation Scripts (`scripts/`)
**Audience**: DevOps, développeurs

```
scripts/
└── README.md                      # Documentation des scripts utilitaires
```

---

## 🎯 Sources de Vérité par Type d'Information

**Règle d'Or**: Chaque information a **UNE SEULE** source de vérité. En cas de conflit entre fichiers, les sources ci-dessous font foi.

| Information | Source de Vérité Officielle | Fichiers Référents |
|-------------|------------------------------|-------------------|
| **Statut Projet Global** | `.github/PROJECT_STATUS.md` | `README.md`, `CLAUDE/README.md` |
| **Métriques Tests** | `.github/TESTS_STATUS.md` | `tests/README.md`, `README.md` |
| **Métriques Qualité Code** | `.github/CODE_QUALITY_STATUS.md` | `README.md` |
| **Architecture DDD** | `CLAUDE/guides/ARCHITECTURE.md` | `README.md` (vue d'ensemble uniquement) |
| **Tests (métriques détaillées)** | `tests/README.md` | `README.md`, `CLAUDE/guides/TESTING.md` |
| **Tests (guide d'écriture)** | `CLAUDE/guides/TESTING.md` | - |
| **API REST (documentation externe)** | `public/docs/swagger/` | `README.md` |
| **Setup Développement** | `CLAUDE/QUICK_START.md` | `README.md` |

---

## 📐 Règles de Maintenance

### Avant d'Ajouter/Modifier une Documentation

**Checklist**:
1. ✅ Vérifier si l'information existe déjà (chercher dans tous les fichiers)
2. ✅ Si existe → Mettre à jour la **source de vérité**
3. ✅ Si nouveau → Déterminer l'emplacement selon l'audience
4. ✅ Ajouter des références croisées vers la source de vérité
5. ✅ Ne JAMAIS dupliquer les métriques/statistiques

### Mise à Jour des Métriques

**TOUJOURS suivre cet ordre**:

1. **Mettre à jour la source de vérité** (`.github/*_STATUS.md` ou fichier désigné)
2. **Mettre à jour les références** dans les autres fichiers (avec lien vers source)
3. **Vérifier la cohérence** entre tous les fichiers

### Ajout de Nouvelle Documentation

**Déterminer l'audience d'abord**:

```mermaid
Si audience = Développeurs/IA     → CLAUDE/guides/
Si audience = Utilisateurs API     → public/docs/swagger/
Si audience = Toute l'équipe       → .github/
Si audience = Testeurs             → tests/
Si audience = DevOps               → scripts/
Si vue d'ensemble générale         → README.md (root)
```

---

## 🔍 Comment Trouver une Information

### Métriques du Projet
- **Nombre total de tests**: `.github/TESTS_STATUS.md` → 372 tests
- **Coverage**: `.github/TESTS_STATUS.md` → 45% backend, 60% frontend
- **ESLint warnings/errors**: `.github/CODE_QUALITY_STATUS.md` → 0 erreurs, 72 warnings
- **État global**: `.github/PROJECT_STATUS.md`

### Guides Techniques
- **Architecture DDD**: `CLAUDE/guides/ARCHITECTURE.md`
- **Écrire un test**: `CLAUDE/guides/TESTING.md`
- **Standards de code**: `CLAUDE/guides/DEVELOPMENT.md`
- **Navigation codebase**: `CLAUDE/guides/PROJECT_STRUCTURE.md`

### Setup et Configuration
- **Installation locale**: `CLAUDE/QUICK_START.md`
- **Variables d'environnement**: `.env.example`
- **Configuration OAuth**: `README.md` section OAuth + `CLAUDE/QUICK_START.md`

### API et Intégration
- **Endpoints disponibles**: `public/docs/swagger/API_DOCUMENTATION.md`
- **Codes d'erreur**: `public/docs/swagger/ERROR_CODES.md`
- **Quick Start API**: `public/docs/swagger/QUICK_START.md`

---

## 📞 Support

### Questions sur le Code
→ Consultez [CLAUDE/guides/AI_AGENT_GUIDE.md](./CLAUDE/guides/AI_AGENT_GUIDE.md)

### Questions sur l'API
→ Consultez [public/docs/swagger/](./public/docs/swagger/)

### Questions sur les Tests
→ Consultez [tests/README.md](./tests/README.md)

### Contribution
→ Consultez [CLAUDE/guides/DEVELOPMENT.md](./CLAUDE/guides/DEVELOPMENT.md)

---

## 🔄 Historique des Versions

| Version | Date | Changements |
|---------|------|-------------|
| 2.0.0 | 2025-11-19 | Création DOCUMENTATION_MAP, nettoyage redondances, 372 tests |
| 1.0.0 | 2025-11-18 | Documentation initiale |

---

**Note**: Ce fichier est la **carte de navigation** de toute la documentation. Il est mis à jour à chaque changement majeur dans l'organisation des docs.
