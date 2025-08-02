const { BundleAnalyzer } = require('../../scripts/analyze-bundle-size');

describe('BundleAnalyzer utilitaires', () => {
  let analyzer;
  beforeEach(() => {
    analyzer = new BundleAnalyzer();
  });

  describe('formatBytes', () => {
    it('formate correctement les octets', () => {
      expect(analyzer.formatBytes(0)).toBe('0 B');
      expect(analyzer.formatBytes(512)).toBe('512 B');
      expect(analyzer.formatBytes(1024)).toBe('1 KB');
      expect(analyzer.formatBytes(1536)).toBe('1.5 KB');
      expect(analyzer.formatBytes(1048576)).toBe('1 MB');
    });
  });

  describe('getPerformanceScore', () => {
    it('retourne 95 pour un fichier excellent', () => {
      expect(analyzer.getPerformanceScore(10000)).toBe(95);
    });
    it('retourne 80 pour un fichier good', () => {
      expect(analyzer.getPerformanceScore(80000)).toBe(80);
    });
    it('retourne 60 pour un fichier average', () => {
      expect(analyzer.getPerformanceScore(150000)).toBe(60);
    });
    it('retourne 30 pour un fichier poor', () => {
      expect(analyzer.getPerformanceScore(600000)).toBe(30);
    });
  });

  describe('getPerformanceRating', () => {
    it('retourne la bonne chaîne selon la taille', () => {
      expect(analyzer.getPerformanceRating(10000)).toBe('excellent');
      expect(analyzer.getPerformanceRating(80000)).toBe('good');
      expect(analyzer.getPerformanceRating(150000)).toBe('average');
      expect(analyzer.getPerformanceRating(600000)).toBe('poor');
    });
  });

  describe('getPerformanceEmoji', () => {
    it('retourne le bon emoji', () => {
      expect(analyzer.getPerformanceEmoji(90)).toBe('🟢');
      expect(analyzer.getPerformanceEmoji(70)).toBe('🟡');
      expect(analyzer.getPerformanceEmoji(50)).toBe('🟠');
      expect(analyzer.getPerformanceEmoji(20)).toBe('🔴');
    });
  });

  describe('getPerformanceClass', () => {
    it('retourne la bonne classe CSS', () => {
      expect(analyzer.getPerformanceClass(90)).toBe('excellent');
      expect(analyzer.getPerformanceClass(70)).toBe('good');
      expect(analyzer.getPerformanceClass(50)).toBe('average');
      expect(analyzer.getPerformanceClass(20)).toBe('poor');
    });
  });
});
