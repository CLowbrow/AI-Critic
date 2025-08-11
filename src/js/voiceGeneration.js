import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { getWorkspacePaths, checkWorkspaceRequirements } from './workspaceUtils.js';

const execAsync = promisify(exec);

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

/**
 * Generate voice lines for dialogue using ElevenLabs
 * @param {string} workspacePath - Path to the workspace folder containing dialogue.json
 * @returns {Promise<string[]>} Array of generated audio file paths
 */
export async function generateVoiceLines(workspacePath) {
  try {
    // Validate workspace and requirements
    if (!checkWorkspaceRequirements(workspacePath, 'voice')) {
      throw new Error(`Workspace missing required files. Need dialogue.json in: ${workspacePath}`);
    }

    // Get workspace paths
    const paths = getWorkspacePaths(workspacePath);

    // Ensure audio directory exists
    if (!fs.existsSync(paths.audio)) {
      fs.mkdirSync(paths.audio, { recursive: true });
    }

    // Read dialogue from JSON file
    console.log(`Reading dialogue from: ${paths.dialogue}`);
    const dialogueData = fs.readFileSync(paths.dialogue, 'utf8');
    const dialogueLines = JSON.parse(dialogueData);

    if (!Array.isArray(dialogueLines) || dialogueLines.length === 0) {
      throw new Error('No dialogue lines found in dialogue.json');
    }

    console.log(`Found ${dialogueLines.length} dialogue lines`);

    // Generate audio files in MP3 format
    const mp3Files = await generateAudioFiles(dialogueLines, paths.audio);

    return { mp3Files };
  } catch (error) {
    console.error('Error generating voice lines:', error.message);
    throw error;
  }
}


/**
 * Generate audio files for each dialogue line in MP3 format
 * @param {Array<{speaker: string, line: string}>} dialogueLines - Parsed dialogue lines
 * @param {string} audioDir - Directory to save audio files
 * @returns {Promise<string[]>} Array of generated MP3 file paths
 */
async function generateAudioFiles(dialogueLines, audioDir) {
  const mp3Files = [];

  // Define voice IDs for each critic (you can customize these)
  const voiceMap = {
    'CRITIC A': 'gOZRcEzY40chlRuMDmLV', 
    'CRITIC B': 'giAoKpl5weRTCJK7uB9b', 
    'Elena': 'gOZRcEzY40chlRuMDmLV', 
    'Marcus': 'giAoKpl5weRTCJK7uB9b', 
    'ELENA': 'gOZRcEzY40chlRuMDmLV', 
    'MARCUS': 'giAoKpl5weRTCJK7uB9b', 
  };

  console.log('Generating high-quality MP3 files with ElevenLabs...');

  for (let i = 0; i < dialogueLines.length; i++) {
    const { speaker, line } = dialogueLines[i];
    
    try {
      console.log(`Generating audio for ${speaker}: "${line.substring(0, 50)}..."`);
      
      // Get voice ID for speaker (default to Rachel if not found)
      const voiceId = voiceMap[speaker] || voiceMap['CRITIC B'];
      
      // Generate high-quality audio using ElevenLabs (default format)
      const audio = await elevenlabs.textToSpeech.convert(voiceId, {
        text: line,
        modelId: 'eleven_multilingual_v2',
      });

      // Create file path
      const baseFilename = `${String(i + 1).padStart(2, '0')}_${speaker.replace(/\s+/g, '_').toLowerCase()}`;
      const mp3Path = path.join(audioDir, `${baseFilename}.mp3`);
      
      // Convert audio stream to buffer and save MP3
      const chunks = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }
      const mp3Buffer = Buffer.concat(chunks);
      fs.writeFileSync(mp3Path, mp3Buffer);
      mp3Files.push(mp3Path);
      console.log(`✅ MP3 saved: ${path.basename(mp3Path)}`);
      
    } catch (error) {
      console.error(`❌ Error generating audio for ${speaker}:`, error.message);
      // Continue with other lines even if one fails
    }
  }

  return mp3Files;
}

// Allow running as standalone script
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('Usage: node voiceGeneration.js <workspace-path>');
    console.error('Example: node voiceGeneration.js workspace/electric_dreams_2025-08-09T00-42-24');
    console.error('');
    console.error('The workspace folder must contain a dialogue.json file.');
    process.exit(1);
  }

  const [workspacePath] = args;

  // Check if API key is set
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY environment variable not set');
    process.exit(1);
  }
  
  generateVoiceLines(workspacePath)
    .then(({ mp3Files }) => {
      console.log('\n✅ Voice Generation Complete!');
      console.log('='.repeat(50));
      console.log(`Workspace: ${workspacePath}`);
      console.log(`Generated ${mp3Files.length} MP3 files`);
      console.log('\nMP3 Files:');
      mp3Files.forEach((file, index) => {
        console.log(`${index + 1}. ${path.basename(file)}`);
      });
    })
    .catch(error => {
      console.error('❌ Failed to generate voice lines:', error.message);
      process.exit(1);
    });
}