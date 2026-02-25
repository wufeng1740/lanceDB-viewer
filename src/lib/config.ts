import pkg from '../../package.json';
import tauriConf from '../../src-tauri/tauri.conf.json';

/**
 * Global Application Configuration
 * Acts as a central source of truth for app constants, default values, and settings keys.
 */
export const APP_CONFIG = {
    // App Identity
    name: "LanceDB Viewer", // Display Name (can differ from package.json)
    version: tauriConf.version, // Sourced from tauri.conf.json for consistency with app build
    packageName: pkg.name, // Sourced from package.json

    // Default Values
    defaults: {
        sidebarWidth: 300,
        theme: 'auto' as const, // 'light' | 'dark' | 'auto'
        tab: 'data' as const, // 'schema' | 'data'
        tableLimit: 100, // Max rows to fetch for preview
    },

    // Local Storage Keys
    storageKeys: {
        theme: 'theme',
        sidebarWidth: 'sidebar_width', // Note: Make sure this key matches used key or update app to use this
        defaultTab: 'defaultTab',
        lastScanned: 'last_scanned_folder' // Check if this matches lib/api usage
    },

    // UI Constants
    ui: {
        sidebarMin: 200,
        sidebarMax: 600,
    }
} as const;

export type AppConfig = typeof APP_CONFIG;
