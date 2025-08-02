// Jest setup file
import 'reflect-metadata';

// Global test configuration
global.console = {
  ...console,
  // Suppress debug logs during tests
  debug: jest.fn(),
  log: jest.fn(),
};
