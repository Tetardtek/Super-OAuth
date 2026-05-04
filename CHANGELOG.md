# Changelog — SuperOAuth

> Service OAuth2 + PKCE multi-tenant avec RBAC dual-table.
> Licence : BSL 1.1 (voir `LICENSE`).
> Convention versioning : voir `docs/versioning.md` ou le CHANGELOG du brain stack pour la convention globale.

---

## v0.1.0 — 2026-04-20

### Fondation post-refonte ADR — SOA-001 + SOA-002 COMPLETE

Première entrée CHANGELOG du projet. Les jalons antérieurs (4 clients PKCE E2E validés en prod, mars 2026) sont documentés dans l'historique des commits, pas rétro-portés ici.

Cette version v0.1.0 marque la livraison complète de **SOA-001** (fondation architecture RBAC) et **SOA-002** (implémentation P1 → P6).

---

### SOA-001 — Architecture RBAC dual-table multi-tenant

Refonte de l'architecture d'autorisation :

- **RBAC dual-table** — séparation des rôles plateforme (`platform_roles`) et des rôles tenant (`tenant_roles`). Un même utilisateur peut être admin plateforme ET simple membre sur un tenant spécifique.
- **User-per-tenant** — même email = IDs distincts par tenant. Isolation stricte des identités entre tenants. (Piège owner documenté — voir `docs/user-per-tenant.md`.)
- **Fondation** — ancienne décision BRAIN-008 (OAuth multi-tenant initial) remplacée par SOA-001.

### SOA-002 — Implémentation P1 → P6 (RBAC dual-table livré)

Implémentation par phases, chacune validée E2E en prod avant d'enchaîner :

#### P1 — Shared services + tests

- Services partagés RBAC (résolution rôles, vérification permissions, hooks)
- Couverture tests unitaires + intégration sur la couche autorisation

#### P2 — Backend platform + tenant CRUD

- Endpoints CRUD plateforme (gestion tenants, admins)
- Endpoints CRUD tenant (gestion membres, rôles locaux)
- Contrats HTTP documentés

#### P3 — E2E prod + fix email dispatch

- Déploiement prod, validation end-to-end sur flows réels
- **Blocker SMTP identifié** (P3 initial) → **fix** (P3 final) : dispatch email utilisait une configuration héritée incompatible avec le multi-tenant. Bug rétro-corrigé sur P2 email dispatch.

#### P4 — E2E validé prod

- Validation complète de la couche backend sur flows multi-tenant
- Tous les endpoints CRUD confirmés sur environnement prod

#### P5 — Frontend UI

- **P5.A/B/C** — implémentation UI (tenant management, member management, role assignment). E2E UI validé en prod.
- **P5.D** — UX bout-en-bout 100% usable (fermeture des irritants découverts en review UX).

#### P6 — Intégration middleware + contrat HTTP

- Middleware chain complète (auth → tenant resolution → RBAC → handler)
- Contrat HTTP stabilisé (headers, erreurs, formats de réponse)
- Tests intégration sur la chaîne complète
- Tag git : `soa-002-complete` (2026-04-20)

---

## Historique pré-v0.1.0 (mars 2026)

Les jalons SuperOAuth antérieurs (4 clients PKCE E2E validés en prod, BSL 1.1 licence template, demo mode `DemoPreview`/`TierGate`/`VITE_DEMO_MODE`) sont consultables dans l'historique git du repo.

À partir de v0.1.0 (cette entrée), SuperOAuth tient son propre CHANGELOG.

---

## Convention — 1 jalon `SOA-XXX` = 1 entrée CHANGELOG

Chaque ADR `SOA-XXX` livrée déclenche une entrée CHANGELOG dans ce fichier :

- **Bump semver** selon la nature du changement :
  - `MAJOR` — breaking change (schema, API contract, auth flow)
  - `MINOR` — nouvelle feature RBAC ou tenant
  - `PATCH` — fix ou amélioration non breaking
- **Tags git** — un jalon complet → `soa-XXX-complete` (cohérent avec `soa-002-complete`)
- **Scope** — ce CHANGELOG ne documente **que** SuperOAuth. Les décisions brain qui impactent SOA restent dans le brain ; les sessions perso et le content ne reviennent jamais ici.
