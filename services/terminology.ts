import { GameState } from '../types';

// Define all the terms that change between game modes
const terms = {
  pandemic: {
    outbreak: 'Outbreak',
    outbreaks: 'Outbreaks',
    outbreakMarker: 'Outbreaks',
    infection: 'Infection',
    infect: 'Infect',
    infectionRate: 'Infection Rate',
    infectionDeck: 'Infection Deck',
    infectionDiscard: 'Infection Discard',
    disease: 'Disease',
    diseases: 'Diseases',
    treatDisease: 'Treat Disease',
    cure: 'Cure',
    cures: 'Cures',
    cured: 'Cured',
    discoverCure: 'Discover a Cure',
    epidemic: 'Epidemic',
    researchStation: 'Research Station',
    playerDeck: 'Player Deck',
    moveGround: 'Drive/Ferry',
  },
  fallOfRome: {
    outbreak: 'Sacking',
    outbreaks: 'Cities Sacked',
    outbreakMarker: 'Decline Marker',
    infection: 'Invasion',
    infect: 'Invade',
    infectionRate: 'Invasion Rate',
    infectionDeck: 'Barbarian Deck',
    infectionDiscard: 'Barbarian Discard',
    disease: 'Tribe',
    diseases: 'Tribes',
    treatDisease: 'Repel Barbarians',
    cure: 'Alliance',
    cures: 'Alliances',
    cured: 'Allied',
    discoverCure: 'Forge an Alliance',
    epidemic: 'Revolt',
    researchStation: 'Fort',
    playerDeck: 'Player Deck',
    moveGround: 'March',
    moveSea: 'Sail',
  },
  iberia: {
    outbreak: 'Outbreak',
    outbreaks: 'Outbreaks',
    outbreakMarker: 'Outbreaks',
    infection: 'Infection',
    infect: 'Infect',
    infectionRate: 'Infection Rate',
    infectionDeck: 'Infection Deck',
    infectionDiscard: 'Infection Discard',
    disease: 'Disease',
    diseases: 'Diseases',
    treatDisease: 'Treat Disease',
    cure: 'Research',
    cures: 'Research Progress',
    cured: 'Researched',
    discoverCure: 'Research Disease',
    epidemic: 'Epidemic',
    researchStation: 'Research Station',
    playerDeck: 'Player Deck',
    moveGround: 'Carriage/Boat',
    moveSea: 'Ship',
    moveTrain: 'Train',
    buildHospital: 'Build Hospital',
  },
};

/**
 * A hook-like function to get the correct terminology object based on the game state.
 * @param gameState The current game state.
 * @returns An object containing the correct terms for the active game type.
 */
export const getTerminology = (gameState: GameState) => {
  const gameType = gameState.gameType || 'pandemic';
  return terms[gameType];
};