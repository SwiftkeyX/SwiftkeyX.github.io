// Single place for personal details. Phone number deliberately not here — it lives only in the PDF.
const base = import.meta.env.BASE_URL;

export const site = {
  name: 'Pasit Pisanucaraleadkul',
  description:
    'Gameplay programmer (Unity / C#) — combat and data-driven systems. Portfolio of playable projects with technical breakdowns.',
  email: 'pisanucaraleadkul.pasit@gmail.com',
  github: 'https://github.com/SwiftkeyX',
  itch: 'https://switftkeyx.itch.io',
  linkedin: '' as string, // TODO: paste LinkedIn URL if you have one
  resume: `${base}resume-pasit-pisanucaraleadkul.pdf`,
};
