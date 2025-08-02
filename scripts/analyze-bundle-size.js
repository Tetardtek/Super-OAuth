#!/usr/bin/env node

/**
 * Analyseur de taille de bundles SuperOAuth
 * Analyse les bundles optimisés et génère des rapports détaillés
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const terser = require('terser');
const { Command } = require('commander');

const LOGS_DIR = path.join(__dirname, '..', 'logs');

function logMessage(message, logFile) {
    console.log(message);
    if (logFile) {
        try {
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

class BundleAnalyzer {
    /**
     * Minifie un fichier JavaScript avec Terser
     * @param {string} filePath
     * @returns {Promise<number>} La taille du fichier minifié (en octets)
     */
    async getMinifiedSize(filePath) {
        try {
            const code = fs.readFileSync(filePath, 'utf8');
            const result = await terser.minify(code);
            if (result.code) {
                return Buffer.byteLength(result.code, 'utf8');
            }
        } catch (err) {
            console.warn(`⚠️ Erreur de minification Terser pour ${filePath}:`, err.message);
        }
        // Fallback: taille originale
        try {
            return fs.statSync(filePath).size;
        } catch (err) {
            console.error(`❌ Impossible d'obtenir la taille du fichier (fallback): ${filePath}\n${err.message}`);
            return 0;
        }
    }
    constructor() {
        this.buildDir = path.join(__dirname, '../dist');
        this.publicDir = path.join(__dirname, '../public');
        this.analysisResults = {
            bundles: {},
            totalSize: 0,
            recommendations: [],
            performanceScore: 0
        };
        
        // Chargement de la configuration externe
        const configPath = path.join(__dirname, 'analyze-bundle-size.config.json');
        let config = {};
        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (err) {
            console.warn(`⚠️ Impossible de charger la configuration externe (${configPath}) :`, err.message);
        }
        this.thresholds = config.thresholds || {
            excellent: 50000,
            good: 100000,
            average: 200000,
            poor: 500000
        };
        this.fileTypes = config.fileTypes || {
            'js': { color: '🟨', category: 'JavaScript' },
            'css': { color: '🟦', category: 'Styles' },
            'html': { color: '🟧', category: 'Markup' },
            'png': { color: '🟩', category: 'Images' },
            'jpg': { color: '🟩', category: 'Images' },
            'jpeg': { color: '🟩', category: 'Images' },
            'svg': { color: '🟪', category: 'Vectors' },
            'json': { color: '⬜', category: 'Data' }
        };
    }

    /**
     * Lance l'analyse complète
     */
    async analyze(reportArg = 'all', logFile = null) {
        logMessage('📊 Analyse des bundles en cours...\n', logFile);
        try {
            if (!fs.existsSync(this.buildDir)) {
                throw new Error('Répertoire de build non trouvé. Exécutez d\'abord npm run optimize');
            }
            await this.analyzeBundles();
            await this.analyzeOriginalFiles();
            await this.generateRecommendations();
            await this.calculatePerformanceScore();
            this.displayReport(logFile);
            await this.generateDetailedReport({
                json: reportArg === 'all' || reportArg.includes('json'),
                html: reportArg === 'all' || reportArg.includes('html')
            }, logFile);
            logMessage('✅ Analyse terminée avec succès !', logFile);
        } catch (error) {
            logMessage('❌ Erreur lors de l\'analyse: ' + error.message, logFile);
            process.exit(1);
        }
    }

    /**
     * Analyse les bundles optimisés
     */
    async analyzeBundles(logFile) {
        logMessage('📦 Analyse des bundles optimisés...', logFile);
        
        const bundleFiles = this.findFiles(this.buildDir, ['.js', '.css']);
        for (const file of bundleFiles) {
            let stats;
            try {
                stats = fs.statSync(file);
            } catch (err) {
                logMessage(`❌ Erreur lors de la lecture des stats du fichier bundle: ${file}\n${err.message}`, logFile);
                continue;
            }
            const relativePath = path.relative(this.buildDir, file);
            const extension = path.extname(file).substring(1);
            const category = this.fileTypes[extension]?.category || 'Other';
            let minifiedSize = stats.size;
            if (extension === 'js') {
                minifiedSize = await this.getMinifiedSize(file);
            }
            this.analysisResults.bundles[relativePath] = {
                size: stats.size,
                minifiedSize: minifiedSize,
                category: category,
                type: extension,
                gzipEstimate: Math.round(minifiedSize * 0.3), // Estimation gzip sur minifié
                performance: this.getPerformanceRating(minifiedSize),
                path: file
            };
            this.analysisResults.totalSize += minifiedSize;
        }
    }

    /**
     * Analyse les fichiers originaux pour comparaison
     */
    async analyzeOriginalFiles(logFile) {
        logMessage('📂 Analyse des fichiers originaux...', logFile);
        
        const originalFiles = this.findFiles(this.publicDir, ['.js', '.css']);
        let originalTotalSize = 0;
        for (const file of originalFiles) {
            try {
                const stats = fs.statSync(file);
                originalTotalSize += stats.size;
            } catch (err) {
                logMessage(`❌ Erreur lors de la lecture des stats du fichier original: ${file}\n${err.message}`, logFile);
            }
        }
        this.analysisResults.originalTotalSize = originalTotalSize;
        this.analysisResults.compressionRatio = originalTotalSize > 0 ? Math.round(
            (1 - this.analysisResults.totalSize / originalTotalSize) * 100
        ) : 0;
    }

    /**
     * Génère des recommandations d'optimisation
     */
    async generateRecommendations(logFile) {
        logMessage('💡 Génération des recommandations...', logFile);
        
        const recommendations = [];
        
        // Analyser chaque bundle
        for (const [fileName, data] of Object.entries(this.analysisResults.bundles)) {
            if (data.size > this.thresholds.poor) {
                recommendations.push({
                    type: 'critical',
                    message: `${fileName} est très volumineux (${this.formatBytes(data.size)}). Considérez le code splitting.`,
                    file: fileName,
                    priority: 'high'
                });
            } else if (data.size > this.thresholds.average) {
                recommendations.push({
                    type: 'warning',
                    message: `${fileName} pourrait être optimisé davantage (${this.formatBytes(data.size)}).`,
                    file: fileName,
                    priority: 'medium'
                });
            }
            
            // Recommandations spécifiques par type
            if (data.type === 'js' && data.size > this.thresholds.good) {
                recommendations.push({
                    type: 'optimization',
                    message: `Considérez la minification avancée et le tree-shaking pour ${fileName}.`,
                    file: fileName,
                    priority: 'medium'
                });
            }
            
            if (data.type === 'css' && data.size > 20000) {
                recommendations.push({
                    type: 'optimization',
                    message: `CSS ${fileName} pourrait bénéficier de la suppression des règles inutilisées.`,
                    file: fileName,
                    priority: 'low'
                });
            }
        }
        
        // Recommandations générales
        if (this.analysisResults.totalSize > 1000000) { // 1MB
            recommendations.push({
                type: 'critical',
                message: 'La taille totale des bundles dépasse 1MB. Implémentez le lazy loading.',
                priority: 'high'
            });
        }
        
        if (this.analysisResults.compressionRatio < 30) {
            recommendations.push({
                type: 'warning',
                message: 'Taux de compression faible. Vérifiez la configuration de minification.',
                priority: 'medium'
            });
        }
        
        this.analysisResults.recommendations = recommendations;
    }

    /**
     * Calcule le score de performance
     */
    async calculatePerformanceScore() {
        let score = 100;
        
        // Pénalités basées sur la taille
        if (this.analysisResults.totalSize > this.thresholds.poor) {
            score -= 40;
        } else if (this.analysisResults.totalSize > this.thresholds.average) {
            score -= 20;
        } else if (this.analysisResults.totalSize > this.thresholds.good) {
            score -= 10;
        }
        
        // Bonus pour la compression
        if (this.analysisResults.compressionRatio > 50) {
            score += 10;
        }
        
        // Pénalités pour les bundles individuels trop volumineux
        const largeFiles = Object.values(this.analysisResults.bundles)
            .filter(bundle => bundle.size > this.thresholds.average);
        score -= largeFiles.length * 5;
        
        this.analysisResults.performanceScore = Math.max(0, Math.min(100, score));
    }

    /**
     * Affiche le rapport console
     */
    displayReport(logFile) {
        logMessage('\n📊 RAPPORT D\'ANALYSE DES BUNDLES', logFile);
        logMessage('==========================================\n', logFile);
        logMessage('📈 Vue d\'ensemble:', logFile);
        logMessage(`   Taille totale:     ${this.formatBytes(this.analysisResults.totalSize)}`, logFile);
        logMessage(`   Taille originale:  ${this.formatBytes(this.analysisResults.originalTotalSize)}`, logFile);
        logMessage(`   Compression:       ${this.analysisResults.compressionRatio}%`, logFile);
        logMessage(`   Score performance: ${this.analysisResults.performanceScore}/100 ${this.getPerformanceEmoji(this.analysisResults.performanceScore)}\n`, logFile);
        logMessage('📦 Détail des bundles:', logFile);
        const sortedBundles = Object.entries(this.analysisResults.bundles)
            .sort(([,a], [,b]) => b.size - a.size);
        for (const [fileName, data] of sortedBundles) {
            const emoji = this.fileTypes[data.type]?.color || '📄';
            const perfEmoji = this.getPerformanceEmoji(this.getPerformanceScore(data.size));
            logMessage(`   ${emoji} ${fileName.padEnd(25)} ${this.formatBytes(data.size).padStart(10)} ${perfEmoji}`, logFile);
        }
        if (this.analysisResults.recommendations.length > 0) {
            logMessage('\n💡 Recommandations:', logFile);
            const priorities = { high: '🔴', medium: '🟡', low: '🟢' };
            for (const rec of this.analysisResults.recommendations) {
                const priority = priorities[rec.priority] || '⚪';
                logMessage(`   ${priority} ${rec.message}`, logFile);
            }
        }
        logMessage('\n==========================================\n', logFile);
    }

    /**
     * Génère un rapport détaillé en JSON
     */
    async generateDetailedReport(options = {json: true, html: true}, logFile) {
        const report = {
            ...this.analysisResults,
            generatedAt: new Date().toISOString(),
            version: '1.0.0',
            metadata: {
                thresholds: this.thresholds,
                totalFiles: Object.keys(this.analysisResults.bundles).length,
                categories: this.getCategoryBreakdown()
            }
        };
        if (options.json) {
            const reportPath = path.join(this.buildDir, 'bundle-analysis.json');
            try {
                fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
                logMessage(`📄 Rapport détaillé sauvegardé: ${reportPath}`, logFile);
            } catch (err) {
                logMessage(`❌ Erreur lors de l'écriture du rapport JSON: ${reportPath}\n${err.message}`, logFile);
            }
        }
        if (options.html) {
            try {
                await this.generateHTMLReport(report);
            } catch (err) {
                logMessage(`❌ Erreur lors de la génération du rapport HTML: ${err.message}`, logFile);
            }
        }
    }

    /**
     * Génère un rapport HTML interactif
     */
    async generateHTMLReport(report) {
        const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analyse des Bundles SuperOAuth</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .score { font-size: 3em; margin: 20px 0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .bundle-list { margin: 20px 0; }
        .bundle-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
        .recommendations { margin-top: 30px; }
        .rec-item { padding: 10px; margin: 5px 0; border-radius: 5px; }
        .critical { background: #fff5f5; border-left: 4px solid #e53e3e; }
        .warning { background: #fffbf0; border-left: 4px solid #dd6b20; }
        .optimization { background: #f0fff4; border-left: 4px solid #38a169; }
        .performance-excellent { color: #38a169; }
        .performance-good { color: #3182ce; }
        .performance-average { color: #d69e2e; }
        .performance-poor { color: #e53e3e; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Analyse des Bundles SuperOAuth</h1>
            <div class="score performance-${this.getPerformanceClass(report.performanceScore)}">
                ${report.performanceScore}/100
            </div>
            <p>Généré le ${new Date(report.generatedAt).toLocaleDateString('fr-FR')}</p>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>📦 Taille Totale</h3>
                <p>${this.formatBytes(report.totalSize)}</p>
            </div>
            <div class="card">
                <h3>🗜️ Compression</h3>
                <p>${report.compressionRatio}%</p>
            </div>
            <div class="card">
                <h3>📁 Fichiers</h3>
                <p>${report.metadata.totalFiles} bundles</p>
            </div>
        </div>
        
        <div class="bundle-list">
            <h3>📦 Détail des Bundles</h3>
            ${Object.entries(report.bundles).map(([name, data]) => `
                <div class="bundle-item">
                    <span>${name}</span>
                    <span class="performance-${this.getPerformanceClass(this.getPerformanceScore(data.size))}">
                        ${this.formatBytes(data.size)}
                    </span>
                </div>
            `).join('')}
        </div>
        
        ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>💡 Recommandations</h3>
            ${report.recommendations.map(rec => `
                <div class="rec-item ${rec.type}">
                    ${rec.message}
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
        
        const htmlPath = path.join(this.buildDir, 'bundle-analysis.html');
        fs.writeFileSync(htmlPath, htmlContent);
        
        console.log(`🌐 Rapport HTML généré: ${htmlPath}`);
    }

    /**
     * Trouve tous les fichiers avec les extensions spécifiées
     */
    findFiles(dir, extensions) {
        const files = [];
        
        if (!fs.existsSync(dir)) return files;
        
        const scan = (currentDir) => {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scan(fullPath);
                } else if (extensions.some(ext => item.endsWith(ext))) {
                    files.push(fullPath);
                }
            }
        };
        
        scan(dir);
        return files;
    }

    /**
     * Obtient la répartition par catégorie
     */
    getCategoryBreakdown() {
        const breakdown = {};
        
        for (const bundle of Object.values(this.analysisResults.bundles)) {
            if (!breakdown[bundle.category]) {
                breakdown[bundle.category] = { count: 0, size: 0 };
            }
            breakdown[bundle.category].count++;
            breakdown[bundle.category].size += bundle.size;
        }
        
        return breakdown;
    }

    /**
     * Obtient la note de performance pour une taille
     */
    getPerformanceRating(size) {
        if (size <= this.thresholds.excellent) return 'excellent';
        if (size <= this.thresholds.good) return 'good';
        if (size <= this.thresholds.average) return 'average';
        return 'poor';
    }

    /**
     * Obtient le score numérique de performance
     */
    getPerformanceScore(size) {
        if (size <= this.thresholds.excellent) return 95;
        if (size <= this.thresholds.good) return 80;
        if (size <= this.thresholds.average) return 60;
        return 30;
    }

    /**
     * Obtient l'emoji de performance
     */
    getPerformanceEmoji(score) {
        if (score >= 80) return '🟢';
        if (score >= 60) return '🟡';
        if (score >= 40) return '🟠';
        return '🔴';
    }

    /**
     * Obtient la classe CSS de performance
     */
    getPerformanceClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'average';
        return 'poor';
    }

    /**
     * Formate les bytes en unités lisibles
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

// Exécution si appelé directement

if (require.main === module) {
    const program = new Command();
    program
      .option('-r, --report <format>', 'Format du rapport (all, html, json)', 'all')
      .option('--log <fichier>', 'Fichier de log (par défaut logs/analyze-bundle-size.log)');
    program.parse(process.argv);
    const options = program.opts();
    let logFile = options.log;
    if (!logFile) {
        if (!fs.existsSync(LOGS_DIR)) {
            fs.mkdirSync(LOGS_DIR, { recursive: true });
        }
        logFile = path.join(LOGS_DIR, 'analyze-bundle-size.log');
    }
    const analyzer = new BundleAnalyzer();
    analyzer.analyze(options.report, logFile).catch(e => logMessage(e.message, logFile));
}

module.exports = { BundleAnalyzer };

console.log('🎯 Bundle Analyzer configuré et prêt !');
