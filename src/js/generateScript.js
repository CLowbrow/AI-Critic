import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import Anthropic from '@anthropic-ai/sdk';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { parseScript } from './parseScript.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

/**
 * Generate a video script based on artwork details and create voice lines
 * @param {string} imagePath - Path to the JPEG image file
 * @param {string} title - Title of the artwork
 * @param {string} artist - Artist who created the artwork
 * @returns {Promise<{script: string, workspacePath: string, audioFiles: string[]}>} Generated content and file paths
 */
async function generateScript(imagePath, title, artist) {
  try {
    // Validate inputs
    if (!imagePath || !title || !artist) {
      throw new Error('All parameters (imagePath, title, artist) are required');
    }

    // Check if image file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Create workspace folder structure
    const workspacePath = createWorkspaceStructure(title);
    console.log(`Created workspace: ${workspacePath}`);

    // Encode image to base64 and get media type
    const { data: imageData, mediaType } = await encodeImageToBase64(imagePath);

    // Create system prompt and user message
    const systemPrompt = createSystemPrompt();
    const userMessage = createUserMessage(title, artist);

    // Call Claude API to generate script
    console.log('Generating script with Claude...');
    const script = await callClaudeAPI(systemPrompt, userMessage, imageData, mediaType);

    // Save raw script to workspace
    const scriptPath = path.join(workspacePath, 'script.txt');
    fs.writeFileSync(scriptPath, script, 'utf8');
    console.log(`Script saved to: ${scriptPath}`);

    // Parse script into dialogue lines
    const dialogueLines = parseScript(script);
    
    // Save parsed dialogue as JSON
    const dialoguePath = path.join(workspacePath, 'dialogue.json');
    fs.writeFileSync(dialoguePath, JSON.stringify(dialogueLines, null, 2), 'utf8');
    console.log(`Parsed dialogue saved to: ${dialoguePath}`);

    // Generate voice lines for each dialogue
    console.log('Generating voice lines with ElevenLabs...');
    const audioFiles = await generateVoiceLines(dialogueLines, workspacePath);

    return {
      script,
      workspacePath,
      audioFiles
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

/**
 * Create workspace folder structure for the artwork
 * @param {string} title - Title of the artwork
 * @returns {string} Path to the created workspace folder
 */
function createWorkspaceStructure(title) {
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
 * Generate voice lines for each dialogue using ElevenLabs
 * @param {Array<{speaker: string, line: string}>} dialogueLines - Parsed dialogue lines
 * @param {string} workspacePath - Path to the workspace folder
 * @returns {Promise<string[]>} Array of generated audio file paths
 */
async function generateVoiceLines(dialogueLines, workspacePath) {
  const audioDir = path.join(workspacePath, 'audio');
  const audioFiles = [];

  // Define voice IDs for each critic (you can customize these)
  const voiceMap = {
    'CRITIC A': 'EXAVITQu4vr4xnSDxMaL', // Bella - professional, articulate
    'CRITIC B': '21m00Tcm4TlvDq8ikWAM', // Rachel - conversational, warm
    'Elena': 'EXAVITQu4vr4xnSDxMaL', // Bella
    'Marcus': '21m00Tcm4TlvDq8ikWAM', // Rachel
  };

  for (let i = 0; i < dialogueLines.length; i++) {
    const { speaker, line } = dialogueLines[i];
    
    try {
      console.log(`Generating audio for ${speaker}: "${line.substring(0, 50)}..."`);
      
      // Get voice ID for speaker (default to Rachel if not found)
      const voiceId = voiceMap[speaker] || voiceMap['CRITIC B'];
      
      // Generate speech using ElevenLabs
      const audio = await elevenlabs.textToSpeech.convert(voiceId, {
        text: line,
        modelId: 'eleven_multilingual_v2',
      });

      // Save audio to file
      const audioFilename = `${String(i + 1).padStart(2, '0')}_${speaker.replace(/\s+/g, '_').toLowerCase()}.mp3`;
      const audioPath = path.join(audioDir, audioFilename);
      
      // Convert audio stream to buffer and save
      const chunks = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);
      fs.writeFileSync(audioPath, audioBuffer);
      
      audioFiles.push(audioPath);
      console.log(`Audio saved: ${audioPath}`);
      
    } catch (error) {
      console.error(`Error generating audio for ${speaker}:`, error.message);
      // Continue with other lines even if one fails
    }
  }

  return audioFiles;
}

// Export for use as module
export { generateScript };

// Allow running as standalone script
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  
  if (args.length !== 3) {
    console.error('Usage: node generateScript.js <image-path> <title> <artist>');
    console.error('Example: node generateScript.js ./artwork.jpg "The Starry Night" "Vincent van Gogh"');
    process.exit(1);
  }

  const [imagePath, title, artist] = args;
  
  generateScript(imagePath, title, artist)
    .then(result => {
      console.log('\nGeneration Complete!');
      console.log('='.repeat(60));
      console.log(`Workspace: ${result.workspacePath}`);
      console.log(`Generated ${result.audioFiles.length} audio files`);
      console.log('\nGenerated Script:');
      console.log('-'.repeat(40));
      console.log(result.script);
      console.log('\nAudio Files:');
      result.audioFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${path.basename(file)}`);
      });
    })
    .catch(error => {
      console.error('Failed to generate script:', error.message);
      process.exit(1);
    });
}