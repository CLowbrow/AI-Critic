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

    // Generate audio files in both MP3 and WAV formats
    const { mp3Files, wavFiles } = await generateAudioFiles(dialogueLines, paths.audio);

    return { mp3Files, wavFiles };
  } catch (error) {
    console.error('Error generating voice lines:', error.message);
    throw error;
  }
}

/**
 * Convert MP3 file to WAV format using ffmpeg (16kHz mono for Audio2Face)
 * @param {string} mp3Path - Path to the input MP3 file
 * @param {string} wavPath - Path to the output WAV file
 * @returns {Promise<void>}
 */
async function convertMp3ToWav(mp3Path, wavPath) {
  try {
    await execAsync(`ffmpeg -y -i "${mp3Path}" -ar 16000 -ac 1 -sample_fmt s16 "${wavPath}"`);
  } catch (error) {
    throw new Error(`Failed to convert MP3 to WAV: ${error.message}`);
  }
}

/**
 * Generate audio files for each dialogue line in both MP3 and WAV formats
 * @param {Array<{speaker: string, line: string}>} dialogueLines - Parsed dialogue lines
 * @param {string} audioDir - Directory to save audio files
 * @returns {Promise<{mp3Files: string[], wavFiles: string[]}>} Object with arrays of generated file paths
 */
async function generateAudioFiles(dialogueLines, audioDir) {
  const mp3Files = [];
  const wavFiles = [];

  // Define voice IDs for each critic (you can customize these)
  const voiceMap = {
    'CRITIC A': 'EXAVITQu4vr4xnSDxMaL', // Bella - professional, articulate
    'CRITIC B': '21m00Tcm4TlvDq8ikWAM', // Rachel - conversational, warm
    'Elena': 'EXAVITQu4vr4xnSDxMaL', // Bella
    'Marcus': '21m00Tcm4TlvDq8ikWAM', // Rachel
    'ELENA': 'EXAVITQu4vr4xnSDxMaL', // Bella (uppercase variant)
    'MARCUS': '21m00Tcm4TlvDq8ikWAM', // Rachel (uppercase variant)
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

      // Create file paths
      const baseFilename = `${String(i + 1).padStart(2, '0')}_${speaker.replace(/\s+/g, '_').toLowerCase()}`;
      const mp3Path = path.join(audioDir, `${baseFilename}.mp3`);
      const wavPath = path.join(audioDir, `${baseFilename}.wav`);
      
      // Convert audio stream to buffer and save MP3
      const chunks = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }
      const mp3Buffer = Buffer.concat(chunks);
      fs.writeFileSync(mp3Path, mp3Buffer);
      mp3Files.push(mp3Path);
      console.log(`✅ MP3 saved: ${path.basename(mp3Path)}`);
      
      // Convert MP3 to WAV (16kHz mono) for Audio2Face
      console.log(`🔄 Converting to WAV for Audio2Face: ${path.basename(wavPath)}`);
      await convertMp3ToWav(mp3Path, wavPath);
      wavFiles.push(wavPath);
      console.log(`✅ WAV saved: ${path.basename(wavPath)}`);
      
    } catch (error) {
      console.error(`❌ Error generating audio for ${speaker}:`, error.message);
      // Continue with other lines even if one fails
    }
  }

  return { mp3Files, wavFiles };
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
    .then(({ mp3Files, wavFiles }) => {
      console.log('\n✅ Voice Generation Complete!');
      console.log('='.repeat(50));
      console.log(`Workspace: ${workspacePath}`);
      console.log(`Generated ${mp3Files.length} MP3 files and ${wavFiles.length} WAV files`);
      console.log('\nMP3 Files (for video processing):');
      mp3Files.forEach((file, index) => {
        console.log(`${index + 1}. ${path.basename(file)}`);
      });
      console.log('\nWAV Files (for Audio2Face):');
      wavFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${path.basename(file)}`);
      });
    })
    .catch(error => {
      console.error('❌ Failed to generate voice lines:', error.message);
      process.exit(1);
    });
}