/**
 * Configuration setup pour les tests frontend Vitest
 * Environnement : jsdom pour simuler le DOM browser
 */

import '@testing-library/jest-dom'

// Mock global fetch pour les tests
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key) => null), // Retourner null par défaut
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage  
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock console pour éviter les logs durant les tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Mock window.location
delete window.location
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
}

// Setup DOM environment
beforeEach(() => {
  // Reset mocks avant chaque test
  vi.clearAllMocks()
  
  // Reset localStorage
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  
  // Reset sessionStorage
  sessionStorageMock.getItem.mockClear()
  sessionStorageMock.setItem.mockClear()
  sessionStorageMock.removeItem.mockClear()
  sessionStorageMock.clear.mockClear()
  
  // Reset DOM
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

// Cleanup après chaque test
afterEach(() => {
  vi.restoreAllMocks()
})
