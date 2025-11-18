/**
 * Project Information Constants
 *
 * Centralized source of truth for project metadata, versioning, and phase information.
 * This file should be the ONLY place where project phase and version info is defined.
 *
 * @module shared/constants/project-info
 */

/**
 * Project phase information
 */
export const PROJECT_INFO = {
  /**
   * Application name
   */
  name: 'SuperOAuth',

  /**
   * Current version (SemVer format)
   * @see https://semver.org/
   */
  version: '1.0.0',

  /**
   * Current development phase
   */
  currentPhase: 'Phase 4.2.B.1 OAuth Integration - COMPLETE ✅',

  /**
   * Next planned phase
   */
  nextPhase: 'Phase 4.3 - Web Documentation',

  /**
   * Project description
   */
  description: 'Universal OAuth2 authentication server with multi-provider support',

  /**
   * API version
   */
  apiVersion: 'v1',
} as const;

/**
 * Endpoint status information
 * Tracks implementation status of all API endpoints
 */
export const ENDPOINT_STATUS = {
  auth: {
    register: 'POST /api/v1/auth/register ✅',
    login: 'POST /api/v1/auth/login ✅',
    refresh: 'POST /api/v1/auth/refresh ✅',
    logout: 'POST /api/v1/auth/logout ✅',
    me: 'GET /api/v1/auth/me ✅',
  },
  oauth: {
    providers: 'GET /api/v1/oauth/providers ✅',
    start: 'GET /api/v1/oauth/{provider} ✅',
    callback: 'GET /api/v1/oauth/{provider}/callback ✅',
    linked: 'GET /api/v1/oauth/linked ✅',
    unlink: 'DELETE /api/v1/oauth/{provider}/unlink ✅',
  },
  user: {
    profile: 'GET /api/v1/user/profile (Phase 6)',
    accounts: 'GET /api/v1/user/linked-accounts (Phase 6)',
  },
} as const;
