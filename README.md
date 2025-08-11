# AI-Critic

A modular video generation pipeline that creates art criticism dialogues and voice narration using Claude and ElevenLabs, designed to work with Unreal Engine's Audio Driven Animation for MetaHumans.

## Features

- **🎨 AI Art Analysis**: Generate sophisticated art criticism dialogue using Claude
- **🎙️ Voice Generation**: Convert dialogue to high-quality MP3 speech using ElevenLabs
- **🎭 Unreal Integration**: Designed to work seamlessly with Unreal Engine's Audio Driven Animation for MetaHumans
- **📁 Workspace Management**: Organized file structure for incremental video production
- **🔧 Modular Pipeline**: Run individual steps or the complete workflow
- **💰 Cost Efficient**: Re-run individual steps without burning API credits

## Setup

### Prerequisites

1. **Node.js Environment**
   ```bash
   npm install
   ```

2. **Unreal Engine** (for MetaHuman animation using Audio Driven Animation)
   - Download from Epic Games Launcher
   - Import MetaHuman characters from MetaHuman Creator
   - Enable Audio Driven Animation plugin

3. **API Keys**
   ```bash
   # Required for script generation
   export ANTHROPIC_API_KEY='your-anthropic-api-key'
   
   # Required for voice generation
   export ELEVENLABS_API_KEY='your-elevenlabs-api-key'
   ```

4. **Python Environment** (for Unreal Engine automation)
   ```bash
   # One-time setup
   ./setup_python.sh
   
   # For each session
   source venv/bin/activate
   ```

## Project Structure

```
src/
├── js/                    # JavaScript pipeline (Text → Voice)
│   ├── generateScript.js      # Main pipeline orchestrator
│   ├── scriptGeneration.js    # Claude API integration (text generation)
│   ├── voiceGeneration.js     # ElevenLabs API integration (speech synthesis)
│   ├── parseScript.js         # Script parsing utilities
│   └── workspaceUtils.js      # Workspace management utilities
└── python/                # Python scripts (Unreal automation)
    └── requirements.txt       # Python dependencies

workspace/                 # Auto-generated workspaces (git-ignored)
└── artwork_name_timestamp/
    ├── script.txt         # Raw generated script
    ├── dialogue.json      # Parsed dialogue lines
    └── audio/             # Generated voice files (MP3 format)
        ├── 01_elena.mp3   # Elena's first line
        ├── 02_marcus.mp3  # Marcus's first line
        └── ...            # Alternating dialogue
```

## Usage

### Full Pipeline (Recommended)

Generate both script and voice files in one command:

```bash
node src/js/generateScript.js "sample/sample_image.png" "Electric Dreams" "AI"
```

**Output:**
- Creates timestamped workspace folder
- Generates script with Claude API
- Parses dialogue into structured format
- Creates voice files with ElevenLabs API
- Organizes all files for video production

### Individual Steps

#### 1. Script Generation Only

Generate script and dialogue files without voice synthesis:

```bash
node src/js/scriptGeneration.js "sample/sample_image.png" "Electric Dreams" "AI"
```

**Use when:**
- Testing different prompts/artwork
- Iterating on script content
- Saving ElevenLabs API costs

#### 2. Voice Generation Only

Generate voice files from existing dialogue:

```bash
node src/js/voiceGeneration.js "workspace/electric_dreams_2025-08-09T00-42-24"
```

**Use when:**
- Re-generating with different voices
- Fixing audio quality issues
- Testing different voice settings
- Saving Claude API costs

### Example Workflow

```bash
# 1. Generate script first (uses Claude API)
node src/js/scriptGeneration.js "my-artwork.jpg" "Starry Night" "Van Gogh"

# 2. Iterate on voice generation (uses ElevenLabs API)
node src/js/voiceGeneration.js "workspace/starry_night_2025-08-09T12-00-00"

# 3. Re-run voice with adjustments if needed
node src/js/voiceGeneration.js "workspace/starry_night_2025-08-09T12-00-00"
```

## Audio Quality

The voice generation system creates high-quality MP3 files optimized for Unreal Engine's Audio Driven Animation:

### High-Quality MP3 Files
- Generated directly from ElevenLabs API in high-quality format
- Professional audio quality suitable for video production
- Compatible with Unreal Engine's Audio Driven Animation system
- Optimized for MetaHuman facial animation processing

### Benefits
- **Cost Efficient**: Single API call per dialogue line
- **Quality Preservation**: Direct high-quality output from ElevenLabs
- **Unreal Integration**: Format compatible with Audio Driven Animation
- **Simplified Workflow**: No additional transcoding required

## Voice Characters

The system uses two distinct art critics:

- **Elena (CRITIC A)**: Academic, formal voice - focuses on art history and technique
- **Marcus (CRITIC B)**: Contemporary, conversational voice - focuses on cultural relevance

## File Outputs

Each generation creates a workspace with:

```
workspace/artwork_name_timestamp/
├── script.txt              # Full dialogue script
├── dialogue.json           # Structured dialogue data
└── audio/                  # Generated voice files (MP3 format)
    ├── 01_elena.mp3         # Elena's first line
    ├── 02_marcus.mp3        # Marcus's first line
    └── ...                  # Alternating dialogue
```

## Error Handling

- **Missing API Keys**: Scripts check for required environment variables
- **Invalid Workspaces**: Voice generation validates workspace structure
- **Partial Failures**: Individual voice line failures don't stop the process
- **File Conflicts**: Timestamped folders prevent overwrites

## Cost Optimization

- **Script-only runs**: Test content without voice generation costs
- **Voice-only runs**: Iterate on audio without re-generating scripts
- **Workspace reuse**: Point voice generation at any existing folder
- **Batch processing**: Generate multiple artworks efficiently
- **Single format output**: Streamlined workflow reduces complexity and costs

## Unreal Engine Audio Driven Animation

The generated MP3 files are designed to work with Unreal Engine's new Audio Driven Animation feature for MetaHumans:

### Setup in Unreal Engine

1. **Enable Audio Driven Animation Plugin**
   - In Unreal Engine, go to Edit → Plugins
   - Search for "Audio Driven Animation" 
   - Enable the plugin and restart the engine

2. **Import MetaHuman Character**
   - Use MetaHuman Creator to design your characters
   - Import the characters into your Unreal project
   - Ensure the MetaHuman has proper facial rig setup

3. **Configure Audio Driven Animation**
   - Add Audio Driven Animation component to your MetaHuman
   - Configure the audio analysis settings
   - Map audio frequencies to facial blendshapes

### Workflow

```bash
# 1. Generate script and voice files
node src/js/generateScript.js "artwork.jpg" "Title" "Artist"

# 2. Import MP3 files into Unreal Engine
# 3. Set up Audio Driven Animation on MetaHuman characters
# 4. Configure audio analysis and blendshape mapping
# 5. Use Sequencer to create your animated scenes
# 6. Render with Movie Render Queue
```

## Next Steps

Generated files are ready for:
- **Unreal Engine**: Import MP3 files and configure Audio Driven Animation
- **MetaHuman Setup**: Apply audio-driven facial animation to your characters
- **Video Production**: Use Sequencer and Movie Render Queue for automated rendering
- **Distribution/Publishing**: Create professional-quality art criticism videos