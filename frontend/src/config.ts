/**
 * Application Configuration
 * 
 * All configuration values can be set via environment variables at build time.
 * Vite exposes env variables prefixed with VITE_ to the client.
 */

export const config = {
  // API base URL - empty means same origin (recommended for production)
  // Set VITE_API_BASE_URL for development or if API is on different domain
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  
  // Application name
  appName: import.meta.env.VITE_APP_NAME || 'CxO Ninja',
  
  // Application tagline
  appTagline: import.meta.env.VITE_APP_TAGLINE || 'Your Digital C-Suite',
  
  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

export default config;

