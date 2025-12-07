import { colors as behrColors } from '../../behr_colors.js';
import { colors as benjaminMooreColors } from '../../benjamin_moore_colors.js';
import { colors as sherwinWilliamsColors } from '../../sherwin_williams_colors.js';
import { colors as valsparColors } from '../../valspar_colors.js';

// Combine all colors with brand information
export const allColors = [
  ...behrColors.map(c => ({ ...c, brand: 'Behr' })),
  ...benjaminMooreColors.map(c => ({ ...c, brand: 'Benjamin Moore' })),
  ...sherwinWilliamsColors.map(c => ({ ...c, brand: 'Sherwin Williams' })),
  ...valsparColors.map(c => ({ ...c, brand: 'Valspar' }))
];

// Search colors by name or hex code
export function searchColors(query) {
  if (!query || query.trim() === '') {
    return allColors.slice(0, 50); // Return first 50 colors if no query
  }

  const lowerQuery = query.toLowerCase().trim();

  return allColors.filter(color => {
    const colorName = color.color.toLowerCase();
    const hexCode = color.hex_code.toLowerCase();

    return colorName.includes(lowerQuery) || hexCode.includes(lowerQuery);
  }).slice(0, 50); // Limit results to 50 for performance
}

// Get color by exact hex code
export function getColorByHex(hex) {
  return allColors.find(c => c.hex_code.toLowerCase() === hex.toLowerCase());
}
