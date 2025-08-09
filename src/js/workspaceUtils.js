import fs from 'fs';
import path from 'path';

/**
 * Create workspace folder structure for the artwork
 * @param {string} title - Title of the artwork
 * @returns {string} Path to the created workspace folder
 */
export function createWorkspaceStructure(title) {
  // Sanitize the title for use as a folder name
  const sanitizedTitle = title
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase();

  // Create base workspace directory if it doesn't exist
  const workspaceBase = path.join(process.cwd(), 'workspace');
  if (!fs.existsSync(workspaceBase)) {
    fs.mkdirSync(workspaceBase, { recursive: true });
  }

  // Create artwork-specific directory with timestamp to avoid conflicts
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const artworkDir = path.join(workspaceBase, `${sanitizedTitle}_${timestamp}`);
  
  // Create the directory structure
  fs.mkdirSync(artworkDir, { recursive: true });
  
  // Create subdirectories
  const audioDir = path.join(artworkDir, 'audio');
  fs.mkdirSync(audioDir, { recursive: true });

  return artworkDir;
}

/**
 * Validate that a workspace folder exists and has required structure
 * @param {string} workspacePath - Path to the workspace folder
 * @returns {boolean} True if valid workspace
 */
export function validateWorkspace(workspacePath) {
  if (!fs.existsSync(workspacePath)) {
    return false;
  }

  const stats = fs.statSync(workspacePath);
  if (!stats.isDirectory()) {
    return false;
  }

  return true;
}

/**
 * Get standard file paths within a workspace
 * @param {string} workspacePath - Path to the workspace folder
 * @returns {object} Object with standard file paths
 */
export function getWorkspacePaths(workspacePath) {
  return {
    script: path.join(workspacePath, 'script.txt'),
    dialogue: path.join(workspacePath, 'dialogue.json'),
    audio: path.join(workspacePath, 'audio'),
  };
}

/**
 * Check if required files exist in workspace for a given step
 * @param {string} workspacePath - Path to the workspace folder
 * @param {string} step - Step to check ('script' or 'voice')
 * @returns {boolean} True if required files exist
 */
export function checkWorkspaceRequirements(workspacePath, step) {
  if (!validateWorkspace(workspacePath)) {
    return false;
  }

  const paths = getWorkspacePaths(workspacePath);

  switch (step) {
    case 'script':
      // Script generation doesn't require any existing files
      return true;
    
    case 'voice':
      // Voice generation requires dialogue.json
      return fs.existsSync(paths.dialogue);
    
    default:
      return false;
  }
}