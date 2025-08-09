import fs from 'fs';
import path from 'path';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { getWorkspacePaths, checkWorkspaceRequirements } from './workspaceUtils.js';

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

    // Generate audio files
    const audioFiles = await generateAudioFiles(dialogueLines, paths.audio);

    return audioFiles;
  } catch (error) {
    console.error('Error generating voice lines:', error.message);
    throw error;
  }
}

/**
 * Generate audio files for each dialogue line
 * @param {Array<{speaker: string, line: string}>} dialogueLines - Parsed dialogue lines
 * @param {string} audioDir - Directory to save audio files
 * @returns {Promise<string[]>} Array of generated audio file paths
 */
async function generateAudioFiles(dialogueLines, audioDir) {
  const audioFiles = [];

  // Define voice IDs for each critic (you can customize these)
  const voiceMap = {
    'CRITIC A': 'EXAVITQu4vr4xnSDxMaL', // Bella - professional, articulate
    'CRITIC B': '21m00Tcm4TlvDq8ikWAM', // Rachel - conversational, warm
    'Elena': 'EXAVITQu4vr4xnSDxMaL', // Bella
    'Marcus': '21m00Tcm4TlvDq8ikWAM', // Rachel
    'ELENA': 'EXAVITQu4vr4xnSDxMaL', // Bella (uppercase variant)
    'MARCUS': '21m00Tcm4TlvDq8ikWAM', // Rachel (uppercase variant)
  };

  console.log('Generating voice lines with ElevenLabs...');

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
      console.log(`✅ Audio saved: ${path.basename(audioPath)}`);
      
    } catch (error) {
      console.error(`❌ Error generating audio for ${speaker}:`, error.message);
      // Continue with other lines even if one fails
    }
  }

  return audioFiles;
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
    .then(audioFiles => {
      console.log('\n✅ Voice Generation Complete!');
      console.log('='.repeat(50));
      console.log(`Workspace: ${workspacePath}`);
      console.log(`Generated ${audioFiles.length} audio files`);
      console.log('\nAudio Files:');
      audioFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${path.basename(file)}`);
      });
    })
    .catch(error => {
      console.error('❌ Failed to generate voice lines:', error.message);
      process.exit(1);
    });
}