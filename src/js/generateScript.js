import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate a video script based on artwork details
 * @param {string} imagePath - Path to the JPEG image file
 * @param {string} title - Title of the artwork
 * @param {string} artist - Artist who created the artwork
 * @returns {Promise<string>} Generated script content
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

    // Encode image to base64 and get media type
    const { data: imageData, mediaType } = await encodeImageToBase64(imagePath);

    // Create system prompt
    const systemPrompt = createSystemPrompt();

    // Create user message
    const userMessage = createUserMessage(title, artist);

    // Call Claude API
    const script = await callClaudeAPI(systemPrompt, userMessage, imageData, mediaType);

    return script;
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
    .then(script => {
      console.log('Generated Script:');
      console.log('='.repeat(50));
      console.log(script);
    })
    .catch(error => {
      console.error('Failed to generate script:', error.message);
      process.exit(1);
    });
}