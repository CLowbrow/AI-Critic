# AI-Critic

A modular video generation pipeline that creates art criticism dialogues and voice narration using Claude and ElevenLabs APIs.

## Features

- **🎨 AI Art Analysis**: Generate sophisticated art criticism dialogue using Claude
- **🎙️ Voice Generation**: Convert dialogue to high-quality speech using ElevenLabs
- **📁 Workspace Management**: Organized file structure for incremental video production
- **🔧 Modular Pipeline**: Run individual steps or the complete workflow
- **💰 Cost Efficient**: Re-run individual steps without burning API credits

## Setup

### Prerequisites

1. **Node.js Environment**
   ```bash
   npm install
   ```

2. **API Keys**
   ```bash
   # Required for script generation
   export ANTHROPIC_API_KEY='your-anthropic-api-key'
   
   # Required for voice generation
   export ELEVENLABS_API_KEY='your-elevenlabs-api-key'
   ```

### Python Environment (Optional)
```bash
# Activate virtual environment
source activate.sh  # or source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Project Structure

```
src/js/
├── generateScript.js      # Main pipeline orchestrator
├── scriptGeneration.js    # Claude API integration (text generation)
├── voiceGeneration.js     # ElevenLabs API integration (speech synthesis)
├── parseScript.js         # Script parsing utilities
└── workspaceUtils.js      # Workspace management utilities

workspace/                 # Auto-generated workspaces (git-ignored)
└── artwork_name_timestamp/
    ├── script.txt         # Raw generated script
    ├── dialogue.json      # Parsed dialogue lines
    └── audio/             # Generated voice files
        ├── 01_elena.mp3
        ├── 02_marcus.mp3
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
└── audio/
    ├── 01_elena.mp3         # Elena's first line
    ├── 02_marcus.mp3        # Marcus's first line
    ├── 03_elena.mp3         # Elena's second line
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

## Next Steps

Generated files are ready for:
- Video editing software import
- Unreal Engine integration
- Further post-processing
- Distribution/publishing