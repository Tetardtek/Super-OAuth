<script lang="ts">
	import CodeBlock from '$components/CodeBlock.svelte';
</script>

<svelte:head>
	<title>Déploiement — SuperOAuth Docs</title>
</svelte:head>

<h1>Déploiement</h1>
<p class="text-secondary">Guide de déploiement production — VPS, Nginx, PM2, SSL.</p>

<h2>Prérequis</h2>

<div class="table-wrap">
	<table>
		<thead><tr><th>Composant</th><th>Version minimale</th></tr></thead>
		<tbody>
			<tr><td>OS</td><td>Ubuntu 20.04+ / Debian 11+</td></tr>
			<tr><td>Node.js</td><td>22 LTS</td></tr>
			<tr><td>MySQL</td><td>8.0+</td></tr>
			<tr><td>Redis</td><td>7+</td></tr>
			<tr><td>Nginx</td><td>1.18+</td></tr>
			<tr><td>RAM</td><td>2 GB minimum</td></tr>
		</tbody>
	</table>
</div>

<h2>Installation</h2>

<h3>1. Cloner et installer</h3>
<CodeBlock lang="bash" code={`git clone git@github.com:Tetardtek/Super-OAuth.git /var/www/superoauth
cd /var/www/superoauth
npm ci --production
cd frontend && npm ci && npm run build && cd ..
npm run build`} />

<h3>2. Configurer l'environnement</h3>
<p>Copier <code>.env.example</code> vers <code>.env</code> et remplir les valeurs :</p>
<CodeBlock lang="bash" code={`# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_NAME=auth_hybrid_dbts
DB_USER=superoauth
DB_PASSWORD=<depuis_votre_gestionnaire_de_secrets>

# JWT (générer avec openssl rand -base64 32)
JWT_SECRET=<genere>
JWT_REFRESH_SECRET=<genere>

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<genere>

# OAuth providers (par tenant ou global)
DISCORD_CLIENT_ID=<votre_id>
DISCORD_CLIENT_SECRET=<votre_secret>
# ... idem pour GitHub, Google, Twitch

# Production
NODE_ENV=production
PORT=3006
CORS_ORIGIN=https://superoauth.votredomaine.com`} />

<h3>3. Migrations</h3>
<CodeBlock lang="bash" code={`NODE_ENV=production node --env-file=.env ./node_modules/.bin/typeorm migration:run -d dist/data-source.js`} />

<h3>4. PM2</h3>
<CodeBlock lang="bash" code={`# Démarrer avec le fichier ecosystem
pm2 start ecosystem.config.js

# Vérifier
pm2 status
pm2 logs superoauth`} />

<p>Configuration PM2 (cluster mode, 2 instances) :</p>
<CodeBlock lang="javascript" code={`// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'superoauth',
    script: 'dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    env: { NODE_ENV: 'production' }
  }]
};`} />

<h2>Nginx</h2>

<CodeBlock lang="nginx" code={`server {
    listen 80;
    server_name superoauth.votredomaine.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name superoauth.votredomaine.com;

    ssl_certificate /etc/letsencrypt/live/superoauth.votredomaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/superoauth.votredomaine.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend static (SvelteKit build)
    location / {
        root /var/www/superoauth/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3006;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # PKCE endpoints
    location /oauth/ {
        proxy_pass http://127.0.0.1:3006;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3006;
    }
}`} />

<h2>SSL</h2>
<CodeBlock lang="bash" code={`sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d superoauth.votredomaine.com
# Renouvellement automatique
sudo crontab -e
# 0 3 * * * certbot renew --quiet`} />

<h2>Firewall</h2>
<CodeBlock lang="bash" code={`sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable`} />

<h2>Monitoring</h2>
<CodeBlock lang="bash" code={`# PM2
pm2 monit              # dashboard temps réel
pm2 logs superoauth    # logs application

# Health check (à mettre en cron ou monitoring externe)
curl -s https://superoauth.votredomaine.com/health | jq .

# Redémarrage automatique au reboot
pm2 startup
pm2 save`} />

<h2>Déploiement continu</h2>
<p>Script de déploiement type :</p>
<CodeBlock lang="bash" code={`#!/bin/bash
cd /var/www/superoauth
git pull origin main
npm ci --production
cd frontend && npm ci && npm run build && cd ..
npm run build
NODE_ENV=production node --env-file=.env ./node_modules/.bin/typeorm migration:run -d dist/data-source.js
pm2 reload superoauth
curl -sf http://localhost:3006/health || echo "HEALTH CHECK FAILED"`} />

<h2>Checklist</h2>
<ul>
	<li><code>.env</code> configuré avec tous les secrets</li>
	<li>Migrations exécutées</li>
	<li>Frontend build dans <code>frontend/build/</code></li>
	<li>PM2 en cluster mode, 2+ instances</li>
	<li>Nginx configuré avec SSL</li>
	<li>Firewall actif (SSH + Nginx uniquement)</li>
	<li>Health check fonctionnel</li>
	<li><code>pm2 startup</code> pour la persistance reboot</li>
</ul>

<style>
	h1 { font-size: var(--text-3xl); font-weight: 700; margin-bottom: var(--space-sm); }
	h2 { font-size: var(--text-xl); font-weight: 600; margin-top: var(--space-2xl); margin-bottom: var(--space-md); }
	h3 { font-size: var(--text-lg); font-weight: 600; margin-top: var(--space-lg); margin-bottom: var(--space-sm); }
	p { color: var(--text-secondary); line-height: 1.7; margin-bottom: var(--space-md); }
	ul { color: var(--text-secondary); padding-left: var(--space-lg); margin-bottom: var(--space-md); }
	li { margin-bottom: var(--space-sm); line-height: 1.6; }

	.table-wrap { overflow-x: auto; margin: var(--space-md) 0; }
	table { width: 100%; border-collapse: collapse; }
	th, td { text-align: left; padding: var(--space-sm) var(--space-md); border-bottom: 1px solid var(--border); font-size: var(--text-sm); }
	th { color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: var(--text-xs); letter-spacing: 0.05em; }
	td { color: var(--text-secondary); }
</style>
