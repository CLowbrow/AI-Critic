/**
 * Parses a script text into an array of objects, each containing a speaker and their line.
 * @param {string} scriptText - The full text of the script.
 * @returns {Array<{speaker: string, line: string}>} An array of dialogue lines.
 */
export function parseScript(scriptText) {
  if (!scriptText) {
    return [];
  }

  const lines = scriptText.split('\n');
  const dialogue = [];
  const lineRegex = /^\[(.*?)\]: (.*)$/;

  for (const line of lines) {
    const match = line.match(lineRegex);
    if (match) {
      dialogue.push({
        speaker: match[1],
        line: match[2].trim(),
      });
    }
  }

  return dialogue;
}
