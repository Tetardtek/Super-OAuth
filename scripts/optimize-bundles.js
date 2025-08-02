// Utilitaire de log centralisé
function logMessage(message, logFile = null) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}`;
    if (logFile) {
        const fs = require('fs');
        try {
            fs.appendFileSync(logFile, line + '\n');
        } catch (e) {
            console.error('Erreur écriture log:', e.message);
        }
    } else {
        console.log(line);
    }
}

/**
 * Script d'optimisation des bundles SuperOAuth
 * Minifie et optimise les ressources pour la production
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const terser = require('terser');
const CleanCSS = require('clean-css');

// Simple parsing des arguments CLI (sans dépendance)
function parseArgs() {
    const args = process.argv.slice(2);
    const options = { include: null, exclude: null };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--include' && args[i+1]) {
            options.include = args[i+1].split(',').map(s => s.trim());
            i++;
        } else if (args[i] === '--exclude' && args[i+1]) {
            options.exclude = args[i+1].split(',').map(s => s.trim());
            i++;
        }
    }
    return options;
}

class BundleOptimizer {
    constructor(cliOptions = {}) {
        this.sourceDir = path.join(__dirname, '../public');
        this.buildDir = path.join(__dirname, '../dist');
        this.tempDir = path.join(__dirname, '../temp');
        
        this.config = {
            minifyJS: true,
            minifyCSS: true,
            optimizeImages: true,
            generateSourceMaps: true,
            bundleSize: true,
            compressionLevel: 9
        };
        
        // Configuration des bundles
        const allBundles = {
            'core': [
                'js/utils.js',
                'js/config.js',
                'js/auth-service.js'
            ],
            'components': [
                'js/auth-component.js',
                'js/dashboard-component.js',
                'js/server-monitor.js'
            ],
            'app': [
                'js/app.js',
                'js/module-loader.js'
            ],
            'docs': [
                'docs/js/docs-app.js',
                'docs/js/content-service.js'
            ]
        };
        // Filtrage selon les options CLI
        let filteredBundles = allBundles;
        if (cliOptions.include) {
            filteredBundles = {};
            for (const name of cliOptions.include) {
                if (allBundles[name]) filteredBundles[name] = allBundles[name];
            }
        } else if (cliOptions.exclude) {
            filteredBundles = {};
            for (const name of Object.keys(allBundles)) {
                if (!cliOptions.exclude.includes(name)) filteredBundles[name] = allBundles[name];
            }
        }
        this.bundles = filteredBundles;
        
        this.stats = {
            originalSize: 0,
            optimizedSize: 0,
            compressionRatio: 0,
            files: {
                processed: 0,
                skipped: 0,
                errors: 0
            }
        };
    }

    /**
     * Lance l'optimisation complète
     */
    async optimize(logFile = null) {
        logMessage('🚀 Début de l\'optimisation des bundles...', logFile);
        try {
            // Préparation
            await this.cleanup(logFile);
            await this.createDirectories(logFile);
            // Optimisations
            await this.bundleJavaScript(logFile);
            await this.optimizeCSS(logFile);
            await this.optimizeImages(logFile);
            await this.optimizeHTML(logFile);
            await this.generateManifest(logFile);
            // Statistiques finales
            this.generateReport(logFile);
            logMessage('✅ Optimisation terminée avec succès !', logFile);
        } catch (error) {
            logMessage('❌ Erreur lors de l\'optimisation: ' + error, logFile);
            process.exit(1);
        }
    }

    /**
     * Nettoie les répertoires de build
     */
    async cleanup(logFile) {
        logMessage('🧹 Nettoyage des répertoires...', logFile);
        if (fs.existsSync(this.buildDir)) {
            fs.rmSync(this.buildDir, { recursive: true, force: true });
        }
        if (fs.existsSync(this.tempDir)) {
            fs.rmSync(this.tempDir, { recursive: true, force: true });
        }
    }

    /**
     * Crée les répertoires nécessaires
     */
    async createDirectories(logFile) {
        const dirs = [
            this.buildDir,
            this.tempDir,
            path.join(this.buildDir, 'js'),
            path.join(this.buildDir, 'css'),
            path.join(this.buildDir, 'images'),
            path.join(this.buildDir, 'docs')
        ];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                try {
                    fs.mkdirSync(dir, { recursive: true });
                } catch (err) {
                    logMessage(`❌ Erreur lors de la création du dossier : ${dir}`, logFile);
                    logMessage(err.message, logFile);
                    this.stats.files.errors++;
                }
            }
        }
    }

    /**
     * Bundle et minifie le JavaScript
     */
    async bundleJavaScript(logFile) {
        logMessage('📦 Bundling JavaScript...', logFile);
        for (const [bundleName, files] of Object.entries(this.bundles)) {
            await this.createBundle(bundleName, files, logFile);
        }
    }

    /**
     * Crée un bundle spécifique
     */
    async createBundle(name, files, logFile) {
        logMessage(`  📄 Création du bundle ${name}...`, logFile);
        let bundleContent = '';
        let originalSize = 0;
        // Concaténer les fichiers
        for (const file of files) {
            const filePath = path.join(this.sourceDir, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                originalSize += content.length;
                // Ajouter des commentaires de séparation
                bundleContent += `\n/* === ${file} === */\n`;
                bundleContent += content;
                bundleContent += '\n';
            } else {
                logMessage(`  ⚠️ Fichier non trouvé: ${file}`, logFile);
                this.stats.files.skipped++;
            }
        }
        // Minifier si activé
        if (this.config.minifyJS) {
            bundleContent = await this.minifyJavaScript(bundleContent, logFile);
        }
        // Sauvegarder le bundle
        const bundlePath = path.join(this.buildDir, 'js', `${name}.bundle.js`);
        fs.writeFileSync(bundlePath, bundleContent);
        // Générer source map si activé
        if (this.config.generateSourceMaps) {
            await this.generateSourceMap(name, bundlePath);
        }
        // Mettre à jour les stats
        const optimizedSize = bundleContent.length;
        this.stats.originalSize += originalSize;
        this.stats.optimizedSize += optimizedSize;
        this.stats.files.processed++;
        logMessage(`    ✅ ${name}: ${originalSize} → ${optimizedSize} bytes (${Math.round((1 - optimizedSize/originalSize) * 100)}% réduction)`, logFile);
    }

    /**
     * Minifie le code JavaScript avec Terser
     */
    async minifyJavaScript(code, logFile) {
        try {
            const result = await terser.minify(code);
            if (result.code) return result.code;
            return code;
        } catch (error) {
            logMessage('⚠️ Erreur de minification JS (Terser), code original conservé: ' + error.message, logFile);
            return code;
        }
    }

    /**
     * Optimise les fichiers CSS
     */
    async optimizeCSS(logFile) {
        logMessage('🎨 Optimisation CSS...', logFile);
        const cssFiles = this.findFiles(this.sourceDir, '.css');
        for (const file of cssFiles) {
            await this.optimizeCSSFile(file, logFile);
        }
    }

    /**
     * Optimise un fichier CSS spécifique
     */
    async optimizeCSSFile(filePath, logFile) {
        const relativePath = path.relative(this.sourceDir, filePath);
        logMessage(`  📄 Optimisation ${relativePath}...`, logFile);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const originalSize = content.length;
            // Minification CSS
            let optimized = content;
            if (this.config.minifyCSS) {
                optimized = this.minifyCSS(content, logFile);
            }
            // Sauvegarder
            const outputPath = path.join(this.buildDir, relativePath);
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                try {
                    fs.mkdirSync(outputDir, { recursive: true });
                } catch (err) {
                    logMessage(`❌ Erreur lors de la création du dossier : ${outputDir}`, logFile);
                    logMessage(err.message, logFile);
                    this.stats.files.errors++;
                }
            }
            fs.writeFileSync(outputPath, optimized);
            // Stats
            const optimizedSize = optimized.length;
            this.stats.originalSize += originalSize;
            this.stats.optimizedSize += optimizedSize;
            this.stats.files.processed++;
            logMessage(`    ✅ ${relativePath}: ${originalSize} → ${optimizedSize} bytes`, logFile);
        } catch (error) {
            logMessage(`    ❌ Erreur avec ${relativePath}: ${error.message}`, logFile);
            this.stats.files.errors++;
        }
    }

    /**
     * Minifie le CSS avec CleanCSS
     */
    minifyCSS(css, logFile) {
        try {
            const output = new CleanCSS({ level: 2 }).minify(css);
            if (output.styles) return output.styles;
            return css;
        } catch (error) {
            logMessage('⚠️ Erreur de minification CSS (CleanCSS), code original conservé: ' + error.message, logFile);
            return css;
        }
    }

    /**
     * Optimise les images
     */
    async optimizeImages() {
        console.log('🖼️ Optimisation des images...');
        
        const imageFiles = this.findFiles(this.sourceDir, ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp']);
        
        for (const file of imageFiles) {
            await this.copyFile(file);
        }
    }

    /**
     * Optimise les fichiers HTML
     */
    async optimizeHTML() {
        console.log('📄 Optimisation HTML...');
        
        const htmlFiles = this.findFiles(this.sourceDir, '.html');
        
        for (const file of htmlFiles) {
            await this.optimizeHTMLFile(file);
        }
    }

    /**
     * Optimise un fichier HTML
     */
    async optimizeHTMLFile(filePath) {
        const relativePath = path.relative(this.sourceDir, filePath);
        console.log(`  📄 Optimisation ${relativePath}...`);
        
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            const originalSize = content.length;
            
            // Remplacer les références vers les bundles
            content = this.updateHTMLReferences(content);
            
            // Minification HTML simple
            content = content
                .replace(/>\s+</g, '><') // Supprimer les espaces entre les balises
                .replace(/\s+/g, ' ') // Réduire les espaces multiples
                .trim();
            
            // Sauvegarder
            const outputPath = path.join(this.buildDir, relativePath);
            const outputDir = path.dirname(outputPath);
            
            if (!fs.existsSync(outputDir)) {
                try {
                    fs.mkdirSync(outputDir, { recursive: true });
                } catch (err) {
                    console.error(`❌ Erreur lors de la création du dossier : ${outputDir}`);
                    console.error(err.message);
                    this.stats.files.errors++;
                }
            }
            
            fs.writeFileSync(outputPath, content);
            
            const optimizedSize = content.length;
            this.stats.originalSize += originalSize;
            this.stats.optimizedSize += optimizedSize;
            this.stats.files.processed++;
            
            console.log(`    ✅ ${relativePath}: ${originalSize} → ${optimizedSize} bytes`);
            
        } catch (error) {
            console.error(`    ❌ Erreur avec ${relativePath}:`, error.message);
            this.stats.files.errors++;
        }
    }

    /**
     * Met à jour les références dans le HTML pour pointer vers les bundles
     */
    updateHTMLReferences(html) {
        // Remplacer les imports individuels par les bundles
        const bundleReplacements = {
            'js/utils.js': 'js/core.bundle.js',
            'js/config.js': 'js/core.bundle.js',
            'js/auth-service.js': 'js/core.bundle.js',
            'js/auth-component.js': 'js/components.bundle.js',
            'js/dashboard-component.js': 'js/components.bundle.js',
            'js/server-monitor.js': 'js/components.bundle.js',
            'js/app.js': 'js/app.bundle.js',
            'js/module-loader.js': 'js/app.bundle.js'
        };
        
        let result = html;
        for (const [original, bundle] of Object.entries(bundleReplacements)) {
            result = result.replace(new RegExp(original, 'g'), bundle);
        }
        
        return result;
    }

    /**
     * Génère le manifeste de build
     */
    async generateManifest() {
        console.log('📋 Génération du manifeste...');
        
        const manifest = {
            buildTime: new Date().toISOString(),
            version: '1.0.0',
            bundles: this.bundles,
            stats: this.stats,
            files: this.getAllBuiltFiles()
        };
        
        const manifestPath = path.join(this.buildDir, 'manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    }

    /**
     * Trouve tous les fichiers avec les extensions spécifiées
     */
    findFiles(dir, extensions) {
        const files = [];
        const exts = Array.isArray(extensions) ? extensions : [extensions];
        
        const scan = (currentDir) => {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scan(fullPath);
                } else if (exts.some(ext => item.endsWith(ext))) {
                    files.push(fullPath);
                }
            }
        };
        
        scan(dir);
        return files;
    }

    /**
     * Copie un fichier vers le répertoire de build
     */
    async copyFile(filePath, logFile) {
        const relativePath = path.relative(this.sourceDir, filePath);
        const outputPath = path.join(this.buildDir, relativePath);
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            try {
                fs.mkdirSync(outputDir, { recursive: true });
            } catch (err) {
                logMessage(`❌ Erreur lors de la création du dossier : ${outputDir}`, logFile);
                logMessage(err.message, logFile);
                this.stats.files.errors++;
            }
        }
        try {
            fs.copyFileSync(filePath, outputPath);
            this.stats.files.processed++;
            logMessage(`    ✅ Copié: ${relativePath}`, logFile);
        } catch (err) {
            logMessage(`❌ Erreur de copie pour ${filePath}: ${err.message}`, logFile);
            this.stats.files.errors++;
        }
    }

    /**
     * Obtient la liste de tous les fichiers générés
     */
    getAllBuiltFiles() {
        const files = [];
        const scan = (dir) => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scan(fullPath);
                } else {
                    files.push(path.relative(this.buildDir, fullPath));
                }
            }
        };
        
        scan(this.buildDir);
        return files;
    }

    /**
     * Génère le rapport d'optimisation
     */
    generateReport(logFile) {
        this.stats.compressionRatio = Math.round((1 - this.stats.optimizedSize / this.stats.originalSize) * 100);
        // Log rapport console
        logMessage('\n📊 Rapport d\'optimisation:', logFile);
        logMessage('=====================================', logFile);
        logMessage(`📁 Taille originale:  ${this.formatBytes(this.stats.originalSize)}`, logFile);
        logMessage(`📦 Taille optimisée:  ${this.formatBytes(this.stats.optimizedSize)}`, logFile);
        logMessage(`💾 Compression:       ${this.stats.compressionRatio}%`, logFile);
        logMessage(`✅ Fichiers traités:  ${this.stats.files.processed}`, logFile);
        logMessage(`⚠️ Fichiers ignorés:  ${this.stats.files.skipped}`, logFile);
        logMessage(`❌ Erreurs:           ${this.stats.files.errors}`, logFile);
        logMessage('=====================================\n', logFile);
        // JSON
        const reportPath = path.join(this.buildDir, 'optimization-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.stats, null, 2));
        // HTML
        const htmlReport = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport d'optimisation SuperOAuth</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f9fafb; color: #222; }
        .report { max-width: 600px; margin: 2em auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 2em; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 1.5em; }
        th, td { border: 1px solid #d0d0d0; padding: 0.7em 1em; text-align: center; }
        th { background: #f5f7fa; }
        tr:nth-child(even) { background: #f9fafb; }
        .ok { color: #1a7f37; font-weight: bold; }
        .warn { color: #b88600; font-weight: bold; }
        .err { color: #b91c1c; font-weight: bold; }
    </style>
</head>
<body>
    <div class="report">
        <h1>📊 Rapport d'optimisation</h1>
        <table>
            <tr><th>Taille originale</th><td>${this.formatBytes(this.stats.originalSize)}</td></tr>
            <tr><th>Taille optimisée</th><td>${this.formatBytes(this.stats.optimizedSize)}</td></tr>
            <tr><th>Compression</th><td>${this.stats.compressionRatio}%</td></tr>
            <tr><th>Fichiers traités</th><td class="ok">${this.stats.files.processed}</td></tr>
            <tr><th>Fichiers ignorés</th><td class="warn">${this.stats.files.skipped}</td></tr>
            <tr><th>Erreurs</th><td class="err">${this.stats.files.errors}</td></tr>
        </table>
        <p style="text-align:center;margin-top:2em;font-size:0.95em;color:#888;">Généré le ${new Date().toLocaleString('fr-FR')}</p>
    </div>
</body>
</html>`;
        const htmlPath = path.join(this.buildDir, 'optimization-report.html');
        fs.writeFileSync(htmlPath, htmlReport);
    }

    /**
     * Formate les bytes en unités lisibles
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Génère une source map simple
     */
    async generateSourceMap(bundleName, bundlePath) {
        const sourceMap = {
            version: 3,
            file: `${bundleName}.bundle.js`,
            sources: this.bundles[bundleName],
            names: [],
            mappings: ''
        };
        
        const sourceMapPath = bundlePath + '.map';
        fs.writeFileSync(sourceMapPath, JSON.stringify(sourceMap, null, 2));
        
        // Ajouter la référence à la source map dans le bundle
        const bundleContent = fs.readFileSync(bundlePath, 'utf8');
        const updatedContent = bundleContent + `\n//# sourceMappingURL=${path.basename(sourceMapPath)}`;
        fs.writeFileSync(bundlePath, updatedContent);
    }
}

// Exécution si appelé directement

if (require.main === module) {
    const cliOptions = parseArgs();
    const optimizer = new BundleOptimizer(cliOptions);
    optimizer.optimize().catch(console.error);
}


if (require.main === module) {
    const program = new (require('commander').Command)();
    program
      .option('--include <bundles>', 'Optimiser uniquement certains bundles (ex: core,app)', val => val.split(',').map(s => s.trim()))
      .option('--exclude <bundles>', 'Ignorer certains bundles (ex: vendor,legacy)', val => val.split(',').map(s => s.trim()))
      .option('--log <fichier>', 'Fichier de log (par défaut logs/optimize-bundles.log)');
    program.parse(process.argv);
    const options = program.opts();
    const LOGS_DIR = path.join(__dirname, '..', 'logs');
    let logFile = options.log;
    if (!logFile) {
        if (!fs.existsSync(LOGS_DIR)) {
            fs.mkdirSync(LOGS_DIR, { recursive: true });
        }
        logFile = path.join(LOGS_DIR, 'optimize-bundles.log');
    }
    const optimizer = new BundleOptimizer({ include: options.include, exclude: options.exclude });
    optimizer.optimize(logFile).catch(e => logMessage(e.message, logFile));
}

module.exports = { BundleOptimizer };
