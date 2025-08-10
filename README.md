# AI-Critic

A modular video generation pipeline that creates art criticism dialogues, voice narration, and MetaHuman facial animations using Claude, ElevenLabs, and NVIDIA Audio2Face.

## Features

- **🎨 AI Art Analysis**: Generate sophisticated art criticism dialogue using Claude
- **🎙️ Voice Generation**: Convert dialogue to high-quality MP3 and WAV speech using ElevenLabs (MP3 44.1kHz for video, WAV 16kHz for Audio2Face)
- **🎭 MetaHuman Animation**: Generate facial animations for Unreal Engine via Audio2Face
- **📁 Workspace Management**: Organized file structure for incremental video production
- **🔧 Modular Pipeline**: Run individual steps or the complete workflow
- **💰 Cost Efficient**: Re-run individual steps without burning API credits

## Setup

### Prerequisites

1. **Node.js Environment**
   ```bash
   npm install
   ```

2. **FFmpeg** (required for audio transcoding)
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install ffmpeg
   
   # macOS (with Homebrew)
   brew install ffmpeg
   
   # Windows (with Chocolatey)
   choco install ffmpeg
   
   # Verify installation
   ffmpeg -version
   ```

3. **API Keys**
   ```bash
   # Required for script generation
   export ANTHROPIC_API_KEY='your-anthropic-api-key'
   
   # Required for voice generation
   export ELEVENLABS_API_KEY='your-elevenlabs-api-key'
   ```

4. **Python Environment** (for Audio2Face → Unreal pipeline)
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
└── python/                # Python pipeline (Voice → Animation)
    ├── audio2face_unreal.py   # Audio2Face → Unreal animation processor
    └── requirements.txt       # Python dependencies

workspace/                 # Auto-generated workspaces (git-ignored)
└── artwork_name_timestamp/
    ├── script.txt         # Raw generated script
    ├── dialogue.json      # Parsed dialogue lines
    ├── audio/             # Generated voice files (MP3 + WAV format)
    │   ├── 01_elena.mp3   # High-quality MP3 for video processing  
    │   ├── 01_elena.wav   # 16kHz WAV for Audio2Face
    │   ├── 02_marcus.mp3
    │   ├── 02_marcus.wav
    │   └── ...
    └── unreal_assets/     # Generated animation assets
        ├── 01_elena_animation.usd
        ├── 01_elena_animation.json
        └── ...
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

## Audio Quality & Dual Format Output

The voice generation system creates **both MP3 and WAV formats** for optimal quality and compatibility:

### High-Quality MP3 Files
- Generated directly from ElevenLabs API (default high-quality format)
- **44.1kHz sampling rate** for professional video production
- Used by your video processing pipeline
- Superior audio quality compared to PCM transcoding

### Audio2Face-Optimized WAV Files
- **16kHz mono WAV** files transcoded locally using ffmpeg
- Specifically formatted for NVIDIA Audio2Face compatibility
- Maintains facial animation quality while reducing API costs
- Only one ElevenLabs API call needed per audio line

### Benefits
- **Cost Efficient**: Single API call generates both formats
- **Quality Preservation**: No quality loss from ElevenLabs PCM format
- **Local Control**: ffmpeg transcoding ensures consistent WAV format
- **Workflow Optimization**: Each format optimized for its specific use case

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
├── audio/                  # Generated voice files (MP3 + WAV format)
│   ├── 01_elena.mp3         # Elena's first line (44.1kHz MP3 for video)
│   ├── 01_elena.wav         # Elena's first line (16kHz WAV for Audio2Face)  
│   ├── 02_marcus.mp3        # Marcus's first line (44.1kHz MP3 for video)
│   ├── 02_marcus.wav        # Marcus's first line (16kHz WAV for Audio2Face)
│   └── ...                  # Alternating dialogue in both formats
└── unreal_assets/          # MetaHuman animation files (generated separately)
    ├── 01_elena_animation.usd      # Unreal Engine import file
    ├── 01_elena_animation.json     # Raw animation data
    ├── 01_elena_metadata.json      # File information
    └── ...                         # One set per audio file
```

## Error Handling

- **Missing API Keys**: Scripts check for required environment variables
- **Invalid Workspaces**: Voice generation validates workspace structure
- **Partial Failures**: Individual voice line failures don't stop the process
- **File Conflicts**: Timestamped folders prevent overwrites
- **Audio2Face Timeouts**: Configurable timeout prevents hanging (default: 3 minutes)

## Cost Optimization

- **Script-only runs**: Test content without voice generation costs
- **Voice-only runs**: Iterate on audio without re-generating scripts
- **Workspace reuse**: Point voice generation at any existing folder
- **Batch processing**: Generate multiple artworks efficiently
- **Dual format efficiency**: Single ElevenLabs API call generates both MP3 and WAV formats
- **Local transcoding**: Avoid additional API costs for format conversion

## Audio2Face → Unreal Engine Pipeline

After generating WAV files, process them through Audio2Face to create MetaHuman animations:

### Prerequisites

1. **Python Environment**
   ```bash
   # Activate your Python environment (if not already active)
   source venv/bin/activate
   ```

2. **Audio2Face Service**
   ```bash
   # Start headless Audio2Face service
   docker run -it --rm --network host -e NGC_API_KEY nvcr.io/nim/nvidia/audio2face-3d:1.3.16
   ```

### Generate MetaHuman Animations

**Process entire workspace:**
```bash
python src/python/audio2face_unreal.py workspace/your_workspace_folder
```

**Process single audio file:**
```bash
python src/python/audio2face_unreal.py workspace/your_workspace/audio/01_elena.wav --single
```

**With custom timeout (default 3 minutes):**
```bash
python src/python/audio2face_unreal.py workspace/your_workspace_folder --timeout 300
```

**Output files:**
- `{name}_animation.usd` - Import directly into Unreal Engine
- `{name}_animation.json` - Raw animation data for custom workflows  
- `{name}_metadata.json` - Import instructions and file info

### Complete Workflow

```bash
# 1. Generate script and voice files
node src/js/generateScript.js "artwork.jpg" "Title" "Artist"

# 2. Start Audio2Face service (in separate terminal)
docker run -it --rm --network host -e NGC_API_KEY nvcr.io/nim/nvidia/audio2face-3d:1.3.16

# 3. Generate MetaHuman animations
python src/python/audio2face_unreal.py workspace/your_workspace_folder

# 4. Import USD files into Unreal Engine
# 5. Apply animations to MetaHuman characters
# 6. Use Movie Render Queue for video generation
```

## Next Steps

Generated files are ready for:
- **Unreal Engine**: Import USD files for MetaHuman animation
- **Video Production**: Use Movie Render Queue for automated video generation
- **Custom Workflows**: Process JSON animation data with custom scripts
- **Distribution/Publishing**: Batch render multiple character animations