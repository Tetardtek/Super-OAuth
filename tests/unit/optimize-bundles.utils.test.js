const { BundleOptimizer } = require('../../scripts/optimize-bundles.js');

describe('BundleOptimizer utils', () => {
  let optimizer;
  beforeAll(() => {
    optimizer = new BundleOptimizer();
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(optimizer.formatBytes(0)).toBe('0 Bytes');
      expect(optimizer.formatBytes(1023)).toBe('1023 Bytes');
      expect(optimizer.formatBytes(1024)).toBe('1 KB');
      expect(optimizer.formatBytes(1048576)).toBe('1 MB');
      expect(optimizer.formatBytes(1073741824)).toBe('1 GB');
    });
  });

  describe('minifyCSS', () => {
    it('should minify simple CSS', () => {
      const css = 'body {    color: red;   }';
      const minified = optimizer.minifyCSS(css);
      // CleanCSS may omit the trailing semicolon for the last property
      expect(minified.replace(/\s+/g, '')).toMatch(/^body\{color:red;?\}$/);
    });
    it('should return original CSS on error', () => {
      // Simulate error by passing non-string
      const minified = optimizer.minifyCSS(null);
      expect(minified).toBe(null);
    });
  });
});
