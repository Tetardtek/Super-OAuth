# 🗄️ Scripts de Base de Données - SuperOAuth

## Reset de la Base de Données

Ce dossier contient les scripts pour gérer la base de données SuperOAuth, notamment pour remettre à zéro les données utilisateurs.

### 📋 Scripts Disponibles

| Script | Description | Usage |
|--------|-------------|-------|
| `reset-database.js` | Script principal Node.js | `node scripts/reset-database.js` |
| `reset-database.bat` | Script Windows (batch) | Double-clic ou `scripts/reset-database.bat` |
| `reset-database.sh` | Script Linux/Mac (bash) | `./scripts/reset-database.sh` |

### 🚀 Utilisation Rapide

#### Avec NPM (Recommandé)
```bash
# Avec confirmation interactive
npm run db:reset

# Reset automatique (pour scripts/CI)
npm run db:reset-force
```

#### Méthodes Alternatives
```bash
# Script Node.js direct
node scripts/reset-database.js

# Script automatique sans confirmation
node scripts/reset-database.js --confirm

# Afficher l'aide
node scripts/reset-database.js --help
```

#### Selon votre OS
```bash
# Windows
scripts/reset-database.bat

# Linux/Mac
./scripts/reset-database.sh
```

### ⚠️ Que fait le script ?

Le script **vide complètement** les tables suivantes :
- ✅ **`users`** - Tous les utilisateurs
- ✅ **`linked_accounts`** - Comptes OAuth liés
- ✅ **`sessions`** - Sessions actives

**Structure de DB préservée** ✅ - Seules les données sont supprimées

### 🔧 Configuration

Le script utilise les variables d'environnement du fichier `.env` :

```env
MYSQL_HOST=localhost                    # Host MySQL
MYSQL_PORT=3306                         # Port MySQL
MYSQL_USERNAME=<your-mysql-user>        # Utilisateur MySQL
MYSQL_PASSWORD=<your-mysql-password>    # Mot de passe MySQL
MYSQL_DATABASE=<your-database-name>     # Nom de la base
```

> Voir `.env.example` à la racine pour la liste complète des variables requises.

### 📊 Exemple de Sortie

```
🗄️  SuperOAuth Database Reset Tool
═══════════════════════════════════

🚀 Connexion à la base de données...
📊 Database: auth_hybrid_dbts sur localhost:3306
✅ Connexion établie
🔓 Désactivation des contraintes de clés étrangères...
🗑️  Suppression des sessions...
   → 4 sessions supprimées
🗑️  Suppression des comptes liés OAuth...
   → 0 comptes liés supprimés
🗑️  Suppression des utilisateurs...
   → 3 utilisateurs supprimés
🔒 Réactivation des contraintes de clés étrangères...
📊 Vérification des tables...
   → Users: 0 entrées
   → Linked Accounts: 0 entrées
   → Sessions: 0 entrées

🎉 Base de données remise à zéro avec succès !
💡 Vous pouvez maintenant tester l'inscription avec de nouveaux utilisateurs

📝 Exemples d'inscription valides :
   • Email: test@example.com
   • Password: TestPassword123!
   • Nickname: TestUser
```

### 🛡️ Sécurité

- ⚠️ **Action irréversible** - Toutes les données utilisateurs sont perdues
- 🔒 **Confirmation requise** - Par défaut, demande confirmation
- 🚫 **Mode automatique** - Utiliser `--confirm` pour les scripts
- 📊 **Logs détaillés** - Affiche exactement ce qui est supprimé

### 🔍 Cas d'Usage

#### Développement
```bash
# Reset rapide entre les tests
npm run db:reset-force
```

#### Tests Manuels
```bash
# Avec confirmation pour éviter les erreurs
npm run db:reset
```

#### Intégration Continue
```bash
# Dans les scripts de CI/CD
npm run db:reset-force
```

### 🆘 Dépannage

#### Erreur de Connexion
```
❌ Access denied for user 'root'@'localhost'
💡 Vérifiez vos identifiants de base de données dans le .env
```
**Solution** : Vérifier `MYSQL_USERNAME` et `MYSQL_PASSWORD` dans `.env`

#### Base de Données Introuvable
```
❌ Unknown database 'auth_hybrid_dbts'
💡 Vérifiez que la base de données existe
```
**Solution** : Vérifier `MYSQL_DATABASE` dans `.env` ou créer la base

#### MySQL Non Démarré
```
❌ Error: connect ECONNREFUSED 127.0.0.1:3306
💡 Vérifiez que MySQL est démarré et accessible
```
**Solution** : Démarrer MySQL Server

### 🚀 Workflow Recommandé

1. **Avant nouveaux tests** :
   ```bash
   npm run db:reset-force
   ```

2. **Tester inscription** avec nouveaux utilisateurs :
   - Email : `nouveau@test.com`
   - Password : `MonMotDePasse123!`
   - Nickname : `NouveauUser`

3. **Répéter** autant que nécessaire !

---

🎯 **Conseil** : Créez un alias bash pour encore plus de rapidité :
```bash
alias dbreset="npm run db:reset-force"
```
