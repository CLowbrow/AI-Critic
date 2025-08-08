import { describe, it, expect } from 'vitest';
import { parseScript } from './parseScript.js';

describe('parseScript', () => {
  it('should parse a script with a header into an array of speaker and line objects', () => {
    const scriptText = `
Image is 5.6MB, resizing to stay under 5MB limit...
Resized to 0.2MB
Generated Script:
==================================================
Let me create a script analyzing this digital artwork that appears to be a surrealist take on vintage computer hardware.

[Elena]: The technical precision and conceptual depth of this digital artwork is remarkable. The juxtaposition of the ethereal, spiraling vortex emanating from the CRT monitor against the brutalist aesthetic of 1990s computer hardware creates a fascinating temporal dialogue. The composition clearly references the memento mori tradition in Dutch still life painting, but reimagines it through a technological lens.

[Marcus]: I'm getting major cyberpunk vibes here, but with a twist of humor! Those keyboard and CD-ROM drive mutations with teeth are brilliant - it's like hardware literally consuming itself. It speaks to how technology both empowers and devours us. Anyone who's ever felt their computer was out to get them will totally relate to this.

[Elena]: While your interpretation is intriguing, Marcus, I believe we must consider the piece's commentary on technological obsolescence. The deteriorating beige hardware, characteristic of the early personal computing era, serves as a vanitas symbol for the transient nature of digital progress. The luminous portal suggests transcendence, perhaps pointing to the immortality of digital information versus the mortality of physical hardware.

[Marcus]: Fair point about the obsolescence, Elena, but look at how alive everything feels! The glowing vortex isn't just about transcendence - it's like a digital black hole, pulling everything into the virtual realm. And those scattered keyboard pieces? They're like digital breadcrumbs leading us deeper into this cyber-nightmare. It's both nostalgic and unsettling.

[Elena]: Indeed, the artist has masterfully manipulated the tension between decay and transformation. The composition's technical execution - the photorealistic rendering, the subtle play of light, and the precise modeling - demonstrates a profound understanding of both classical artistic principles and contemporary digital techniques.

[Marcus]: You know what? We're both seeing different sides of the same coin here. Whether you're looking at it through an art history lens or modern tech culture, it's telling the same story about our complicated relationship with technology - beautiful, frightening, familiar, and alien all at once. That's what makes it so powerful.

[Elena]: On that point, Marcus, we certainly agree. The piece successfully bridges the gap between classical artistic traditions and contemporary digital anxieties, creating something both intellectually stimulating and viscerally affecting.
`;

    const expected = [
      { speaker: 'Elena', line: `The technical precision and conceptual depth of this digital artwork is remarkable. The juxtaposition of the ethereal, spiraling vortex emanating from the CRT monitor against the brutalist aesthetic of 1990s computer hardware creates a fascinating temporal dialogue. The composition clearly references the memento mori tradition in Dutch still life painting, but reimagines it through a technological lens.` },
      { speaker: 'Marcus', line: `I'm getting major cyberpunk vibes here, but with a twist of humor! Those keyboard and CD-ROM drive mutations with teeth are brilliant - it's like hardware literally consuming itself. It speaks to how technology both empowers and devours us. Anyone who's ever felt their computer was out to get them will totally relate to this.` },
      { speaker: 'Elena', line: `While your interpretation is intriguing, Marcus, I believe we must consider the piece's commentary on technological obsolescence. The deteriorating beige hardware, characteristic of the early personal computing era, serves as a vanitas symbol for the transient nature of digital progress. The luminous portal suggests transcendence, perhaps pointing to the immortality of digital information versus the mortality of physical hardware.` },
      { speaker: 'Marcus', line: `Fair point about the obsolescence, Elena, but look at how alive everything feels! The glowing vortex isn't just about transcendence - it's like a digital black hole, pulling everything into the virtual realm. And those scattered keyboard pieces? They're like digital breadcrumbs leading us deeper into this cyber-nightmare. It's both nostalgic and unsettling.` },
      { speaker: 'Elena', line: `Indeed, the artist has masterfully manipulated the tension between decay and transformation. The composition's technical execution - the photorealistic rendering, the subtle play of light, and the precise modeling - demonstrates a profound understanding of both classical artistic principles and contemporary digital techniques.` },
      { speaker: 'Marcus', line: `You know what? We're both seeing different sides of the same coin here. Whether you're looking at it through an art history lens or modern tech culture, it's telling the same story about our complicated relationship with technology - beautiful, frightening, familiar, and alien all at once. That's what makes it so powerful.` },
      { speaker: 'Elena', line: `On that point, Marcus, we certainly agree. The piece successfully bridges the gap between classical artistic traditions and contemporary digital anxieties, creating something both intellectually stimulating and viscerally affecting.` }
    ];

    expect(parseScript(scriptText)).toEqual(expected);
  });

  it('should return an empty array for an empty script', () => {
    expect(parseScript('')).toEqual([]);
  });

  it('should handle scripts with no valid lines', () => {
    const scriptText = `
    This is some text
    but not in the correct format
    `;
    expect(parseScript(scriptText)).toEqual([]);
  });

    it('should handle scripts with different critic names', () => {
        const scriptText = `[Critic 1]: Hello\n[Critic 2]: World`;
        const expected = [
            { speaker: 'Critic 1', line: 'Hello' },
            { speaker: 'Critic 2', line: 'World' },
        ];
        expect(parseScript(scriptText)).toEqual(expected);
    });
});
