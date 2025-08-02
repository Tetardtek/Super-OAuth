#!/usr/bin/env node
const { Command } = require('commander');
/**
 * Script de reset de la base de données SuperOAuth
 * 
 * Ce script vide toutes les tables utilisateurs tout en préservant la structure.
 * Parfait pour remettre à zéro entre les tests !
 * 
 * Usage:
 *   node scripts/reset-database.js
 *   npm run db:reset
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = {
    host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT) || 3306,
    user: process.env.MYSQL_USERNAME || process.env.DB_USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'auth_hybrid_dbts'
};

const fs = require('fs');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

function logMessage(message, logFile) {
    console.log(message);
    if (logFile) {
        try {
            // Crée le dossier logs si besoin
            const dir = path.dirname(logFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
        } catch (err) {
            console.error('Erreur lors de l\'écriture dans le fichier de log:', err.message);
        }
    }
}

async function resetDatabase(tablesToReset, dryRun = false, logFile = null) {
    let connection;
    
    try {
        logMessage('🚀 Connexion à la base de données...', logFile);
        logMessage(`📊 Database: ${config.database} sur ${config.host}:${config.port}`, logFile);
        connection = await mysql.createConnection(config);
        logMessage('✅ Connexion établie', logFile);
        logMessage('🔓 Désactivation des contraintes de clés étrangères...', logFile);
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

        // Déterminer les tables à supprimer
        const allTables = ['sessions', 'linked_accounts', 'users'];
        const tables = tablesToReset && tablesToReset.length > 0
            ? allTables.filter(t => tablesToReset.includes(t))
            : allTables;
        if (tables.length === 0) {
            logMessage('Aucune table à réinitialiser (argument --tables vide ou non valide).', logFile);
            return;
        }
        logMessage(`Tables ciblées : ${tables.join(', ')}`, logFile);

        for (const table of tables) {
            let label = '';
            if (table === 'sessions') label = 'sessions';
            if (table === 'linked_accounts') label = 'comptes liés OAuth';
            if (table === 'users') label = 'utilisateurs';
            if (dryRun) {
                logMessage(`� [DRY-RUN] Suppression simulée des ${label || table} (aucune donnée supprimée)`, logFile);
            } else {
                logMessage(`�️  Suppression des ${label || table}...`, logFile);
                const [result] = await connection.execute(`DELETE FROM \`${table}\``);
                logMessage(`   → ${result.affectedRows} ${label || table} supprimé(s)`, logFile);
            }
        }

        logMessage('🔒 Réactivation des contraintes de clés étrangères...', logFile);
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        // Vérifier que les tables sont vides (ou afficher simulation)
        if (dryRun) {
            logMessage('📊 [DRY-RUN] Vérification simulée des tables (aucune donnée supprimée)', logFile);
            for (const table of tables) {
                logMessage(`   → [DRY-RUN] ${table}: (simulation)`, logFile);
            }
            logMessage('', logFile);
            logMessage('🎉 [DRY-RUN] Simulation terminée : aucune donnée n\'a été supprimée.', logFile);
        } else {
            logMessage('📊 Vérification des tables...', logFile);
            for (const table of tables) {
                const [countRows] = await connection.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
                logMessage(`   → ${table}: ${countRows[0].count} entrées`, logFile);
            }
            logMessage('', logFile);
            logMessage('🎉 Base de données remise à zéro avec succès !', logFile);
            logMessage('💡 Vous pouvez maintenant tester l\'inscription avec de nouveaux utilisateurs', logFile);
            logMessage('', logFile);
            logMessage('📝 Exemples d\'inscription valides :', logFile);
            logMessage('   • Email: test@example.com', logFile);
            logMessage('   • Password: TestPassword123!', logFile);
            logMessage('   • Nickname: TestUser', logFile);
        }
    } catch (error) {
        logMessage('❌ Erreur lors du reset de la base de données: ' + error.message, logFile);
        if (error.code === 'ECONNREFUSED') {
            logMessage('💡 Vérifiez que MySQL est démarré et accessible', logFile);
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            logMessage('💡 Vérifiez vos identifiants de base de données dans le .env', logFile);
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            logMessage('💡 Vérifiez que la base de données existe', logFile);
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            logMessage('🔌 Connexion fermée', logFile);
        }
    }
}

// Fonction pour afficher l'aide
function showHelp() {
    console.log(`
🚀 SuperOAuth Database Reset Script

Usage:
  node scripts/reset-database.js [options]

Options:
  --help, -h     Afficher cette aide
  --confirm, -y  Confirmer automatiquement le reset (pour les scripts)
  --tables <tables>  Réinitialiser uniquement certaines tables (ex: users,sessions)
  --dry-run      Simuler la réinitialisation sans supprimer de données
  --log <fichier>  Journaliser les actions et erreurs dans un fichier

Description:
  Ce script vide toutes les tables utilisateurs (users, linked_accounts, sessions)
  tout en préservant la structure de la base de données.
  
  ⚠️  ATTENTION: Cette action est irréversible !
  
Variables d'environnement requises:
  DB_HOST       - Host MySQL (défaut: localhost)
  DB_PORT       - Port MySQL (défaut: 3306)
  DB_USER       - Utilisateur MySQL (défaut: root)
  DB_PASSWORD   - Mot de passe MySQL
  DB_NAME       - Nom de la base de données (défaut: auth_hybrid_dbts)

Exemples:
  npm run db:reset                    # Avec confirmation interactive
  node scripts/reset-database.js -y  # Sans confirmation (pour CI/CD)
  node scripts/reset-database.js --tables users --log reset.log --confirm
`);
}

// Fonction pour demander confirmation
function askConfirmation() {
    return new Promise((resolve) => {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log('⚠️  ATTENTION: Vous êtes sur le point de supprimer TOUTES les données utilisateurs !');
        console.log(`📊 Base de données: ${config.database}`);
        console.log('');
        
        rl.question('Êtes-vous sûr de vouloir continuer ? (oui/non): ', (answer) => {
            rl.close();
            const confirmation = answer.toLowerCase().trim();
            resolve(confirmation === 'oui' || confirmation === 'o' || confirmation === 'yes' || confirmation === 'y');
        });
    });
}

// Point d'entrée principal

async function main() {
    const program = new Command();
    program
      .option('--tables <tables>', 'Réinitialiser uniquement certaines tables (ex: users,sessions)')
      .option('-y, --confirm', 'Confirmer automatiquement le reset (pour les scripts)')
      .option('--dry-run', 'Simuler la réinitialisation sans supprimer de données')
      .option('--log <fichier>', 'Journaliser les actions et erreurs dans un fichier')
      .option('-h, --help', 'Afficher cette aide');
    program.parse(process.argv);
    const options = program.opts();

    if (options.help) {
        showHelp();
        return;
    }

    const autoConfirm = options.confirm || false;

    console.log('🗄️  SuperOAuth Database Reset Tool');
    console.log('═══════════════════════════════════');
    console.log('');

    // Demander confirmation sauf si --confirm
    if (!autoConfirm) {
        const confirmed = await askConfirmation();
        if (!confirmed) {
            console.log('❌ Opération annulée par l\'utilisateur');
            return;
        }
        console.log('');
    }

    let tablesToReset = null;
    if (options.tables) {
        tablesToReset = options.tables.split(',').map(t => t.trim()).filter(Boolean);
    }
    const dryRun = options.dryRun || false;
    // Par défaut, log dans logs/reset-database.log si --log non précisé
    let logFile = options.log;
    if (!logFile) {
        if (!fs.existsSync(LOGS_DIR)) {
            fs.mkdirSync(LOGS_DIR, { recursive: true });
        }
        logFile = path.join(LOGS_DIR, 'reset-database.log');
    }
    await resetDatabase(tablesToReset, dryRun, logFile);
}

// Exécuter le script si appelé directement
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { resetDatabase };
