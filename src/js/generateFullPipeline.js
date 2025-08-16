import path from 'path';
import { generateScript as generateScriptContent } from './generateScriptText.js';
import { generateVoiceLines } from './voiceGeneration.js';
import readline from 'readline';

/**
 * Full pipeline: Generate script and voice lines for artwork
 * @param {string} imagePath - Path to the image file
 * @param {string} title - Title of the artwork
 * @param {string} artist - Artist name
 * @returns {Promise<{script: string, workspacePath: string, audioFiles: string[]}>} Generated content and file paths
 */
export async function generateScript(imagePath, title, artist) {
  try {
    console.log('🎬 Starting AI-Critic Full Pipeline');
    console.log('='.repeat(60));
    
    // Step 1: Generate script content using Anthropic
    console.log('\n📝 Step 1: Generating script...');
    const scriptResult = await generateScriptContent(imagePath, title, artist);
    
    // Step 2: Generate voice lines using ElevenLabs
    console.log('\n🎙️  Step 2: Generating voice lines...');
    const { mp3Files } = await generateVoiceLines(scriptResult.workspacePath);

    console.log('\n✅ Full Pipeline Complete!');
    return {
      script: scriptResult.script,
      workspacePath: scriptResult.workspacePath,
      mp3Files
    };
  } catch (error) {
    console.error('❌ Pipeline failed:', error.message);
    throw error;
  }
}

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

// Allow running as standalone script
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  
  if (args.length !== 3) {
    console.error('Usage: node generateFullPipeline.js <image-path> <title> <artist>');
    console.error('Example: node generateFullPipeline.js ./artwork.jpg "The Starry Night" "Vincent van Gogh"');
    console.error('');
    console.error('This runs the full pipeline: script generation + voice generation');
    console.error('');
    console.error('To run individual steps:');
    console.error('  node src/js/generateScriptText.js <image-path> <title> <artist>');
    console.error('  node src/js/voiceGeneration.js <workspace-path>');
    process.exit(1);
  }

  // Check required API keys
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY environment variable not set');
    process.exit(1);
  }

  const [imagePath, title, artist] = args;
  
  (async () => {
    try {
        let scriptResult;
        let userChoice;

        do {
            console.log('\n📝 Generating script...');
            scriptResult = await generateScriptContent(imagePath, title, artist);

            console.log('\n\n--- GENERATED SCRIPT ---');
            console.log(scriptResult.script);
            console.log('------------------------\n');

            console.log('Choose an option:');
            console.log('[1] Continue with generation');
            console.log('[2] Regenerate script');
            console.log('[3] Exit');

            userChoice = await askQuestion('> ');

            if (userChoice === '3') {
                console.log('Exiting program.');
                process.exit(0);
            }
        } while (userChoice === '2');

        if (userChoice !== '1') {
            console.log('Invalid choice. Exiting.');
            process.exit(1);
        }

        console.log('\n🎙️  Generating voice lines...');
        const { mp3Files } = await generateVoiceLines(scriptResult.workspacePath);

        console.log('\n🎉 Generation Complete!');
        console.log('='.repeat(60));
        console.log(`📁 Workspace: ${scriptResult.workspacePath}`);
        console.log(`🎵 Generated ${mp3Files.length} MP3 files`);
        console.log('\n📜 Generated Script Preview:');
        console.log('-'.repeat(40));
        console.log(scriptResult.script.substring(0, 300) + '...');
        console.log('\n🎵 MP3 Files:');
        mp3Files.forEach((file, index) => {
            console.log(`${index + 1}. ${path.basename(file)}`);
        });
        console.log('\n💡 Next steps:');
        console.log(`   • MP3 files: ${path.join(scriptResult.workspacePath, 'audio')}/*.mp3`);
        console.log(`   • Script files are in: ${scriptResult.workspacePath}`);
        console.log('   • Ready for video production with Unreal Audio Driven Animation!');

    } catch (error) {
        console.error('❌ Failed to generate content:', error.message);
        process.exit(1);
    }
  })();
}