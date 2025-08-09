import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import Anthropic from '@anthropic-ai/sdk';
import { parseScript } from './parseScript.js';
import { createWorkspaceStructure, getWorkspacePaths, validateWorkspace } from './workspaceUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate a script using Anthropic and save to workspace
 * @param {string} imagePath - Path to the image file
 * @param {string} title - Title of the artwork
 * @param {string} artist - Artist name
 * @param {string} [workspacePath] - Optional existing workspace path
 * @returns {Promise<{script: string, workspacePath: string, dialogueLines: Array}>} Generated content and paths
 */
export async function generateScript(imagePath, title, artist, workspacePath = null) {
  try {
    // Validate inputs
    if (!imagePath || !title || !artist) {
      throw new Error('All parameters (imagePath, title, artist) are required');
    }

    // Check if image file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Create or validate workspace
    if (!workspacePath) {
      workspacePath = createWorkspaceStructure(title);
      console.log(`Created workspace: ${workspacePath}`);
    } else if (!validateWorkspace(workspacePath)) {
      throw new Error(`Invalid workspace path: ${workspacePath}`);
    }

    // Get workspace file paths
    const paths = getWorkspacePaths(workspacePath);

    // Encode image to base64 and get media type
    console.log('Processing image...');
    const { data: imageData, mediaType } = await encodeImageToBase64(imagePath);

    // Create prompts
    const systemPrompt = createSystemPrompt();
    const userMessage = createUserMessage(title, artist);

    // Call Claude API to generate script
    console.log('Generating script with Claude...');
    const script = await callClaudeAPI(systemPrompt, userMessage, imageData, mediaType);

    // Save raw script to workspace
    fs.writeFileSync(paths.script, script, 'utf8');
    console.log(`Script saved to: ${paths.script}`);

    // Parse script into dialogue lines
    const dialogueLines = parseScript(script);
    
    // Save parsed dialogue as JSON
    fs.writeFileSync(paths.dialogue, JSON.stringify(dialogueLines, null, 2), 'utf8');
    console.log(`Parsed dialogue saved to: ${paths.dialogue}`);

    return {
      script,
      workspacePath,
      dialogueLines
    };
  } catch (error) {
    console.error('Error generating script:', error.message);
    throw error;
  }
}

/**
 * Encode image file to base64 and determine media type
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} Object with base64 data and media type
 */
async function encodeImageToBase64(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  
  let mediaType;
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      mediaType = 'image/jpeg';
      break;
    case '.png':
      mediaType = 'image/png';
      break;
    case '.gif':
      mediaType = 'image/gif';
      break;
    case '.webp':
      mediaType = 'image/webp';
      break;
    default:
      throw new Error(`Unsupported image format: ${ext}`);
  }
  
  // Resize image if it's too large (Claude has 5MB limit)
  let imageBuffer;
  const maxSize = 4 * 1024 * 1024; // 4MB to be safe
  const originalBuffer = fs.readFileSync(imagePath);
  
  if (originalBuffer.length > maxSize) {
    console.log(`Image is ${(originalBuffer.length / 1024 / 1024).toFixed(1)}MB, resizing to stay under 5MB limit...`);
    
    // Resize to maintain aspect ratio while reducing file size
    imageBuffer = await sharp(originalBuffer)
      .resize(1024, 1024, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 80 })
      .toBuffer();
      
    mediaType = 'image/jpeg'; // Sharp converts to JPEG for size reduction
    
    console.log(`Resized to ${(imageBuffer.length / 1024 / 1024).toFixed(1)}MB`);
  } else {
    imageBuffer = originalBuffer;
  }
  
  return {
    data: imageBuffer.toString('base64'),
    mediaType: mediaType
  };
}

/**
 * Create system prompt for the two critics format
 * @returns {string} System prompt
 */
function createSystemPrompt() {
  return `You are tasked with creating a video script for an art criticism discussion between two distinct critics. The script should be formatted for a 3-minute video.

CRITIC PERSONALITIES:
- Critic A (Elena): Academic, formal, focuses on historical context and artistic techniques. Uses sophisticated vocabulary and references art movements and theory.
- Critic B (Marcus): Contemporary, accessible, focuses on emotional impact and modern relevance. Uses conversational language and relates art to current culture.

SCRIPT FORMAT (for easy parsing):
[CRITIC A]: [dialogue]
[CRITIC B]: [dialogue]
[CRITIC A]: [dialogue]
[etc.]

REQUIREMENTS:
- Target length: approximately 3 minutes (roughly 450-500 words of dialogue)
- Each critic should have 3-4 speaking turns
- Include natural conversational flow with some disagreement/different perspectives
- Focus on the specific artwork provided
- End with both critics finding some common ground or appreciation

The script should feel natural and engaging while maintaining each critic's distinct voice and perspective.`;
}

/**
 * Create user message with artwork details
 * @param {string} title - Artwork title
 * @param {string} artist - Artist name
 * @returns {string} User message
 */
function createUserMessage(title, artist) {
  return `Please analyze this artwork and create a discussion script between two art critics.
  
Artwork Details:
- Title: "${title}"
- Artist: ${artist}`;
}

/**
 * Call Claude API with the prepared messages
 * @param {string} systemPrompt - System prompt
 * @param {string} userMessage - User message
 * @param {string} imageData - Base64 encoded image
 * @param {string} mediaType - Image media type (e.g., 'image/png', 'image/jpeg')
 * @returns {Promise<string>} Generated script
 */
async function callClaudeAPI(systemPrompt, userMessage, imageData, mediaType) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageData,
            },
          },
          {
            type: 'text',
            text: userMessage,
          },
        ],
      },
    ],
  });

  return message.content[0].text;
}

// Allow running as standalone script
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  
  if (args.length < 3 || args.length > 4) {
    console.error('Usage: node scriptGeneration.js <image-path> <title> <artist> [workspace-path]');
    console.error('Example: node scriptGeneration.js ./artwork.jpg "The Starry Night" "Vincent van Gogh"');
    console.error('Example: node scriptGeneration.js ./artwork.jpg "The Starry Night" "Vincent van Gogh" workspace/existing_folder');
    process.exit(1);
  }

  const [imagePath, title, artist, workspacePath] = args;
  
  generateScript(imagePath, title, artist, workspacePath)
    .then(result => {
      console.log('\n✅ Script Generation Complete!');
      console.log('='.repeat(50));
      console.log(`Workspace: ${result.workspacePath}`);
      console.log(`Generated ${result.dialogueLines.length} dialogue lines`);
      console.log('\nGenerated Script Preview:');
      console.log('-'.repeat(40));
      console.log(result.script.substring(0, 300) + '...');
    })
    .catch(error => {
      console.error('❌ Failed to generate script:', error.message);
      process.exit(1);
    });
}