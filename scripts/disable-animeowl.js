#!/usr/bin/env node

/**
 * AGGRESSIVE FIX: Overwrite AnimeOwl module to prevent runtime crashes
 * This script runs before every build to neutralize AnimeOwl in node_modules
 */

const fs = require('fs');
const path = require('path');

const EXTENSIONS_BASE = path.join(__dirname, '..', 'node_modules', '@consumet', 'extensions', 'dist');

const ANIMEOWL_PATH = path.join(EXTENSIONS_BASE, 'providers', 'anime', 'animeowl.js');
const PROVIDERS_LIST_PATH = path.join(EXTENSIONS_BASE, 'utils', 'providers-list.js');

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

function patchFile(filePath, patchFn, description) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${description} not found:`, filePath);
      return false;
    }

    const backup = filePath + '.original';
    if (!fs.existsSync(backup)) {
      fs.copyFileSync(filePath, backup);
      console.log(`📦 Backed up ${description}`);
    }

    const result = patchFn(filePath);
    if (result) {
      console.log(`✓  ${description} patched successfully`);
    }
    return result;
  } catch (error) {
    console.error(`✗  Failed to patch ${description}:`, error.message);
    return false;
  }
}

try {
  if (!fs.existsSync(EXTENSIONS_BASE)) {
    console.log('⚠️  @consumet/extensions not installed yet. Run npm install first.');
    process.exit(0);
  }

  let successCount = 0;

  // Patch 1: Replace animeowl.js with stub
  if (patchFile(ANIMEOWL_PATH, (file) => {
    fs.writeFileSync(file, SAFE_STUB, 'utf8');
    const written = fs.readFileSync(file, 'utf8');
    return written.includes('AnimeOwl disabled');
  }, 'AnimeOwl module')) {
    successCount++;
  }

  // Patch 2: Remove AnimeOwl from providers-list.js
  if (patchFile(PROVIDERS_LIST_PATH, (file) => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove AnimeOwl require/import statements
    content = content.replace(/const\s+animeowl_\d+\s*=\s*require\(["']\.\.\/providers\/anime\/animeowl["']\);?\s*/gi, '');
    content = content.replace(/var\s+animeowl_\d+\s*=\s*require\(["']\.\.\/providers\/anime\/animeowl["']\);?\s*/gi, '');
    content = content.replace(/import\s+.*?from\s+["']\.\.\/providers\/anime\/animeowl["'];?\s*/gi, '');
    
    // Remove AnimeOwl from ANIME object/exports
    content = content.replace(/,?\s*AnimeOwl:\s*animeowl_\d+\.default/gi, '');
    content = content.replace(/AnimeOwl:\s*animeowl_\d+\.default\s*,?/gi, '');
    content = content.replace(/,?\s*AnimeOwl:\s*\w+/gi, '');
    content = content.replace(/AnimeOwl:\s*\w+\s*,?/gi, '');
    
    // Remove any new AnimeOwl() instantiation
    content = content.replace(/new\s+providers_1\.ANIME\.AnimeOwl\(\)/gi, '');
    content = content.replace(/new\s+\w+\.AnimeOwl\(\)/gi, '');
    content = content.replace(/new\s+AnimeOwl\(\)/gi, '');
    
    // Remove AnimeOwl from arrays
    content = content.replace(/,?\s*AnimeOwl\s*,?/gi, '');
    content = content.replace(/\[\s*AnimeOwl\s*\]/gi, '[]');
    
    // Clean up double commas and trailing commas
    content = content.replace(/,\s*,/g, ',');
    content = content.replace(/,\s*\}/g, '}');
    content = content.replace(/,\s*\]/g, ']');
    content = content.replace(/\{\s*,/g, '{');
    content = content.replace(/\[\s*,/g, '[');
    
    fs.writeFileSync(file, content, 'utf8');
    const patched = fs.readFileSync(file, 'utf8');
    return !patched.toLowerCase().includes('animeowl');
  }, 'providers-list.js')) {
    successCount++;
  }

  if (successCount > 0) {
    console.log('🧩 AnimeOwl disabled successfully.');
    console.log(`✅ AnimeOwl provider permanently neutralized (${successCount} files patched)`);
  } else {
    console.log('⚠️  No files were patched. Extensions may not be installed yet.');
  }

} catch (error) {
  console.error('❌ Failed to disable AnimeOwl:', error.message);
  console.error('   Build will continue, but AnimeOwl may still cause crashes.');
  process.exit(0);
}
