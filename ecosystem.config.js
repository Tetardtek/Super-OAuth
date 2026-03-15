// ecosystem.config.js — Super-OAuth production process config
// Pourquoi cluster + 2 instances : pm2 reload en mode fork ne garantit pas le 0-downtime.
// En cluster mode, pm2 redémarre les workers un par un → vrai 0-downtime.
// Super-OAuth utilise Redis pour les sessions → pas de state en mémoire → cluster safe.
module.exports = {
  apps: [
    {
      name: 'super-oauth',
      script: 'dist/main.js',

      // Cluster mode = vrai 0-downtime sur pm2 reload
      instances: 2,
      exec_mode: 'cluster',

      autorestart: true,
      watch: false, // jamais en prod — redémarrerait sur chaque fichier modifié

      max_memory_restart: '500M', // filet de sécurité VPS partagé

      // Les secrets (DB, JWT, Redis, SMTP...) viennent du .env — ne pas les dupliquer ici
      // Seules les variables non-secrètes qui divergent entre envs sont définies ici
      env_production: {
        NODE_ENV: 'production',
      },

      // Logs — le dossier logs/ est déjà attendu par l'app (LOG_FILE_PATH dans .env)
      error_file: 'logs/pm2-err.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Merge stdout + stderr dans un seul fichier combiné si souhaité
      // merge_logs: true,
    },
  ],
};
