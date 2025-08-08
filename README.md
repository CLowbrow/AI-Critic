# AI-Critic

Video generation project integrating Claude, ElevenLabs, and Unreal Engine.

## Setup

### Python Environment
```bash
# Activate virtual environment
source activate.sh  # or source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Node.js Environment
```bash
npm install
```

## Project Structure
- `src/js/` - JavaScript/Node.js code
- `src/python/` - Python scripts and modules
- `scripts/` - Utility scripts
- `config/` - Configuration files
- `docs/` - Documentation

## Usage

### Generating the Art Critic Script

This project includes a Node.js script to generate a dialogue between two art critics based on an image.

**Prerequisites:**
1.  **Node.js Environment:** Ensure you have installed the dependencies by running `npm install`.
2.  **API Key:** You must have an Anthropic API key. Export it as an environment variable:
    ```bash
    export ANTHROPIC_API_KEY='your-api-key-here'
    ```

**Running the Script:**

To generate a script, run the `generateScript.js` file with the path to the image, the artwork title, and the artist's name.

Here is an example using the sample image provided in the repository:
```bash
node src/js/generateScript.js "sample/sample_image.png" "Electric Dreams" "AI"
```

The generated script will be printed to the console.