#!/usr/bin/env node

/**
 * AGGRESSIVE FIX: Overwrite AnimeOwl module to prevent runtime crashes
 * This script runs before every build to neutralize AnimeOwl in node_modules
 */

const fs = require('fs');
const path = require('path');

const ANIMEOWL_PATH = path.join(
  __dirname,
  '..',
  'node_modules',
  '@consumet',
  'extensions',
  'dist',
  'providers',
  'anime',
  'animeowl.js'
);

const SAFE_STUB = `"use strict";
/**
 * AnimeOwl provider has been disabled to prevent runtime crashes.
 * This file was automatically replaced by scripts/disable-animeowl.js
 */
Object.defineProperty(exports, "__esModule", { value: true });

class AnimeOwl {
  constructor() {
    this.name = 'AnimeOwl (Disabled)';
  }
  
  fetchSpotlight() {
    return Promise.resolve({ error: 'AnimeOwl disabled', results: [] });
  }
  
  fetchTrending() {
    return Promise.resolve({ error: 'AnimeOwl disabled', results: [] });
  }
  
  fetchRecentEpisodes() {
    return Promise.resolve({ error: 'AnimeOwl disabled', results: [] });
  }
  
  search() {
    return Promise.resolve({ error: 'AnimeOwl disabled', results: [] });
  }
  
  fetchAnimeInfo() {
    return Promise.resolve({ error: 'AnimeOwl disabled' });
  }
  
  fetchEpisodeSources() {
    return Promise.resolve({ error: 'AnimeOwl disabled', sources: [] });
  }
}

exports.default = AnimeOwl;
exports.AnimeOwl = AnimeOwl;
`;

try {
  // Check if the file exists
  if (!fs.existsSync(ANIMEOWL_PATH)) {
    console.log('⚠️  AnimeOwl file not found (may not be installed yet):', ANIMEOWL_PATH);
    console.log('   This is normal during initial npm install.');
    process.exit(0);
  }

  // Backup the original file (optional, for safety)
  const backupPath = ANIMEOWL_PATH + '.original';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(ANIMEOWL_PATH, backupPath);
    console.log('📦 Original AnimeOwl backed up to:', backupPath);
  }

  // Overwrite with safe stub
  fs.writeFileSync(ANIMEOWL_PATH, SAFE_STUB, 'utf8');
  console.log('🧩 AnimeOwl disabled successfully.');
  console.log('✅ AnimeOwl provider permanently neutralized within extensions.');
  
  // Verify the file was written
  const written = fs.readFileSync(ANIMEOWL_PATH, 'utf8');
  if (written.includes('AnimeOwl disabled')) {
    console.log('✓  Verification passed: AnimeOwl stub is in place.');
  } else {
    console.error('✗  Verification failed: Could not confirm stub was written.');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Failed to disable AnimeOwl:', error.message);
  console.error('   Build will continue, but AnimeOwl may still cause crashes.');
  // Don't fail the build - let it continue
  process.exit(0);
}
