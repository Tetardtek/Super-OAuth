# ✅ Security Hardening - Checklist

**Branche :** `feature/security-hardening`
**Référence :** [AUDIT_REPORT.md](./AUDIT_REPORT.md) | [SECURITY_ROADMAP.md](./SECURITY_ROADMAP.md)

---

## 📊 Progression Globale

**Score actuel :** 6.5/10 → **Objectif :** 9.5/10

| Phase | Issues | Complétées | Statut |
|-------|--------|------------|--------|
| P0 - Blockers | 4 | 0 | 🔴 0% |
| P1 - High | 3 | 0 | ⚪ 0% |
| P2 - Medium | 3 | 0 | ⚪ 0% |
| P3 - Low | 3 | 0 | ⚪ 0% |
| P4 - Infra | 3 | 0 | ⚪ 0% |
| **TOTAL** | **16** | **0** | **0%** |

---

## 🔴 PHASE 0 : BLOCKERS (P0)

### ✅ #1 - Crypto Dépréciées (CRITICAL) - COMPLÉTÉ

**Fichier :** `src/shared/utils/crypto.util.ts` | **Temps :** 4h | **CVSS :** 8.5

- [x] Implémenter `CryptoUtil` sécurisé (AES-256-GCM)
- [x] Tests unitaires (encrypt/decrypt/tampering) - 33 tests
- [x] Migrer code existant
- [x] Migration données si nécessaire (pas de données existantes)
- [x] Validation complète (156 tests passent, build OK)

---

### ✅ #2 - OAuth State en Mémoire (CRITICAL) - COMPLÉTÉ

**Fichier :** `src/infrastructure/oauth/oauth.service.ts` | **Temps :** 6h | **CVSS :** 9.0

- [x] Setup Redis client - Singleton avec reconnexion
- [x] `RedisStateStorage` service (save/get/delete) - TTL automatique
- [x] Tests unitaires (tests existants passent avec mocks)
- [x] Intégration dans `OAuthService` - Dependency injection
- [x] Tests flow OAuth complet (156 tests passent)
- [x] Documentation setup Redis (inline comments)

---

### ✅ #3 - Vulnérabilités npm (12) (CRITICAL) - COMPLÉTÉ

**Temps :** 3h | **CVSS :** 7.5

- [x] Mises à jour non-breaking : axios@1.13.2, typeorm@0.3.27, mysql2@3.15.3, typescript@5.9.3
- [x] Mises à jour breaking : happy-dom@20.0.10, nodemailer@7.0.10, tsx@4.20.6, lint-staged@16.2.7
- [x] `npm audit fix` (auto-fix restantes)
- [x] Validation : 156 tests passent, build OK
- [x] `npm audit` → 0 vulnérabilités ✅

---

### ❌ #4 - CSRF Protection (HIGH)

**Endpoints :** `/auth/*` | **Temps :** 3h | **CVSS :** 7.0

- [ ] Installer `csurf`
- [ ] Middleware CSRF
- [ ] Protéger POST `/auth/register`, `/auth/login`, `/auth/logout`
- [ ] Endpoint GET `/csrf-token`
- [ ] Mise à jour frontend
- [ ] Tests (token valide/invalide/manquant)

---

## 🟡 PHASE 1 : HIGH PRIORITY (P1)

### ⚪ #5 - CSP unsafe-inline (HIGH)

**Fichier :** `src/shared/config/security.config.ts` | **Temps :** 2h | **CVSS :** 6.5

- [ ] Middleware génération nonces
- [ ] Mise à jour CSP (remplacer unsafe-inline)
- [ ] Mise à jour templates HTML (ajouter nonces)
- [ ] Tests (scripts/styles chargent)
- [ ] Enforcement CSP

---

### ⚪ #6 - Session Fingerprinting (HIGH)

**Fichier :** `src/infrastructure/database/entities/session.entity.ts` | **Temps :** 4h | **CVSS :** 6.0

- [ ] Étendre `SessionEntity` (userAgent, ipAddress, deviceFingerprint)
- [ ] Migration DB
- [ ] Capturer lors création session
- [ ] Validation dans middleware auth
- [ ] Tests (valid/mismatch)

---

### ⚪ #7 - Rate Limiting Redis (HIGH)

**Fichier :** `src/presentation/middleware/rate-limit.middleware.ts` | **Temps :** 3h | **CVSS :** 6.0

- [ ] Installer `rate-limit-redis`
- [ ] Créer limiters (API/Auth/User/OAuth)
- [ ] Configuration Redis
- [ ] Appliquer aux routes
- [ ] Headers rate limit
- [ ] Tests multi-instances

---

## 🟡 PHASE 2 : MEDIUM PRIORITY (P2)

### ⚪ #8 - Token Revocation (MEDIUM)

**Fichier :** `src/infrastructure/services/token.service.ts` | **Temps :** 4h | **CVSS :** 5.5

- [ ] `TokenBlacklistService` (Redis)
- [ ] Intégration auth middleware
- [ ] Endpoints `/auth/logout`, `/auth/logout-all`
- [ ] Tests revocation
- [ ] Documentation

---

### ⚪ #9 - Chiffrer OAuth Tokens DB (MEDIUM)

**Fichier :** `src/application/use-cases/complete-oauth.use-case.ts` | **Temps :** 5h | **CVSS :** 5.0

- [ ] `TokenEncryptionService`
- [ ] Mise à jour use cases (encrypt avant save, decrypt après load)
- [ ] Script migration données
- [ ] Tests
- [ ] Documentation

---

### ⚪ #10 - SSL Certificate Validation (MEDIUM)

**Fichier :** `src/infrastructure/database/config/database.config.ts` | **Temps :** 2h | **CVSS :** 5.0

- [ ] Variables env CA cert
- [ ] Config `ssl: { ca: ..., rejectUnauthorized: true }`
- [ ] Documentation setup SSL
- [ ] Tests connexion staging

---

## 🟢 PHASE 3 : LOW PRIORITY (P3)

### ⚪ #11 - Migrations DB (LOW)

**Temps :** 6h | **CVSS :** 3.5

- [ ] Créer migration initiale
- [ ] Documentation process
- [ ] CI/CD integration
- [ ] Templates migration

---

### ⚪ #12 - Tests Coverage 82% (LOW)

**Objectif :** 45% → 82% | **Temps :** 12h

- [ ] Tests Repositories : 35 tests (user, session, linked-account)
- [ ] Tests Controllers : 45 tests (auth, oauth integration)
- [ ] Tests intégration : 30 tests (flows end-to-end)
- [ ] Tests sécurité : injection, XSS, CSRF, rate limiting
- [ ] Codecov integration

---

### ⚪ #13 - Monitoring (LOW)

**Temps :** 10h

- [ ] Prometheus metrics + endpoint `/metrics`
- [ ] Health checks endpoint `/health`
- [ ] Sentry error tracking
- [ ] Logging structuré (JSON, correlation IDs)
- [ ] Grafana dashboards

---

## 🔵 PHASE 4 : INFRASTRUCTURE (P4)

### ⚪ #14 - Docker (OPTIMIZATION)

**Temps :** 8h

- [ ] Dockerfile multi-stage
- [ ] docker-compose.yml (app, mysql, redis)
- [ ] Optimisation taille image
- [ ] Tests container
- [ ] Documentation

---

### ⚪ #15 - CI/CD Complet (OPTIMIZATION)

**Temps :** 10h

- [ ] Job security audit
- [ ] Job Docker build/push
- [ ] Déploiement staging automatique
- [ ] Déploiement prod avec approval
- [ ] Rollback automatique
- [ ] Notifications

---

### ⚪ #16 - Documentation API (OPTIMIZATION)

**Temps :** 8h

- [ ] OpenAPI 3.0 spec
- [ ] Swagger UI
- [ ] Postman collection
- [ ] Code examples
- [ ] Versioning API

---

## 📅 Timeline

```
Semaine 1 : P0 (4 issues) + P1 (3 issues)
Semaine 2 : P2 (3 issues)
Semaine 3-4 : P3 (3 issues) + P4 (3 issues)
```

---

## 🎯 Validation Finale

### Critères Production Ready

- [ ] 0 vulnérabilités npm
- [ ] 0 issues CRITICAL/HIGH
- [ ] Score sécurité ≥ 9.0/10
- [ ] Coverage backend ≥ 80%
- [ ] Tous les tests passent
- [ ] Build OK
- [ ] Documentation à jour
- [ ] Redis configuré
- [ ] Migrations DB créées
- [ ] Monitoring actif

---

**Status :** 🔴 Phase 0 en attente
**Progression :** 0/16 issues (0%)
**Dernière mise à jour :** 20 Novembre 2025
