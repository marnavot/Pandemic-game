


import React, { useState, useMemo, useEffect } from 'react';
import { GameState, Player, DiseaseColor, CityName, PlayerCard, PANDEMIC_INFECTION_RATES, FALLOFROME_INVASION_RATES, FALLOFROME_RECRUITMENT_RATES, PlayerRole, CITIES_DATA, CONNECTIONS, GamePhase, EventCardName, PLAYER_ROLE_INFO, VIRULENT_STRAIN_EPIDEMIC_INFO, VirulentStrainEpidemicCardName, FALLOFROME_PORT_CITIES, IBERIA_PORT_CITIES, FALLOFROME_CITIES_DATA, FALLOFROME_ALLIANCE_CARD_REQUIREMENTS, FallOfRomeDiseaseColor, isFallOfRomeDiseaseColor, FALLOFROME_DISEASE_COLORS, FALLOFROME_INITIAL_CUBE_COUNTS, IBERIA_SEA_CONNECTIONS, IBERIA_REGIONS, IBERIA_CITY_TO_REGIONS_MAP } from '../types';
import { PlayerCardDisplay, PlayableEvents, FieldOperativeActions, PLAYER_PAWN_COLORS, PLAYER_ROLE_COLORS } from '../hooks/ui';
import { getCitiesWithinRange, isReachableByTrain } from '../utils';
import { playSound } from '../services/soundService';
import { getTerminology } from '../services/terminology';

const CURE_STATUS_COLORS: Record<DiseaseColor, string> = {
  [DiseaseColor.Blue]: 'bg-blue-500',
  [DiseaseColor.Yellow]: 'bg-yellow-400',
  [DiseaseColor.Black]: 'bg-gray-500',
  [DiseaseColor.Red]: 'bg-red-600',
  [DiseaseColor.Purple]: 'bg-purple-600',
  [DiseaseColor.White]: 'bg-gray-200',
  [DiseaseColor.Green]: 'bg-green-500',
  [DiseaseColor.Orange]: 'bg-orange-500',
};

const RoleImage: React.FC<{ role: PlayerRole }> = ({ role }) => {
    // This component now uses the <img> onError handler, which is more robust
    // for trying multiple image sources.
    // INSTRUCTIONS:
    // 1. Create a `public` folder at the root of your project.
    // 2. Inside `public`, create an `assets` folder.
    // 3. Inside `assets`, create a `roles` folder.
    // 4. Place images inside `public/assets/roles/`.
    // 5. Filenames MUST be lowercase, with spaces removed.
    //    e.g., "Operations Expert" -> "operationsexpert.png"
    //    e.g., "Dispatcher" -> "dispatcher.png"
    
    const extensionsToTry = useMemo(() => ['png', 'jpg', 'jpeg'], []);
    const [imageIndex, setImageIndex] = useState(0);

    // Reset the image loading attempt when the role changes.
    useEffect(() => {
        setImageIndex(0);
    }, [role]);

    const imageName = role.replace(/\s+/g, '').toLowerCase();
    const possiblePaths = useMemo(() => 
        extensionsToTry.map(ext => `/assets/roles/${imageName}.${ext}`),
        [imageName, extensionsToTry]
    );

    const handleError = () => {
        // If the current image fails to load, try the next one in the list.
        if (imageIndex < possiblePaths.length - 1) {
            setImageIndex(imageIndex + 1);
        }
    };
    
    // If we've tried all possible paths and none have loaded, show the fallback.
    // We check against the original array length, not length-1.
    if (imageIndex >= possiblePaths.length) {
        return (
            <div className="w-20 h-20 rounded-md border-2 border-gray-600 bg-gray-700 flex items-center justify-center text-gray-400 text-xs text-center p-1 flex-shrink-0">
                No Image
            </div>
        );
    }
    
    const currentSrc = possiblePaths[imageIndex];

    return (
        <img 
            src={currentSrc} 
            alt={role} 
            onError={handleError}
            className="w-20 h-20 rounded-md border-2 border-gray-600 object-cover flex-shrink-0"
        />
    );
};

const Dashboard: React.FC<{
  gameState: GameState;
  onAction: (action: string, payload?: any) => void;
  onUndoAction: () => void;
  onEndTurn: () => void;
  onInitiateShareKnowledge: () => void;
  onInitiateDispatchSummon: () => void;
  onInitiateTakeEventCard: () => void;
  onInitiateExpertFlight: () => void;
  onInitiateEpidemiologistTake: () => void;
  onInitiateReturnSamples: (playerId: number) => void;
  onInitiateCureDisease: () => void;
  onInitiateTreatDisease: () => void;
  onInitiateCollectSample: () => void;
  onInitiateFieldDirectorMove: () => void;
  onInitiateLocalLiaisonShare: () => void;
  onInitiateVirologistTreat: () => void;
  onInitiateEnlistBarbarians: () => void;
  onInitiateFreeEnlistBarbarians: () => void;
  onInitiateBattle: () => void;
  onInitiateMercatorShare: () => void;
  onInitiatePraefectusRecruit: () => void;
  onInitiateBuildFortWithLegions: () => void;
  onInitiateFabrumFlight: (destination: CityName | null) => void;
  onInitiateVestalisDrawEvent: () => void;
  onInitiatePurifyWater: () => void;
  onInitiatePoliticianGiveCard: () => void; 
  onInitiatePoliticianSwapCard: () => void;
  onPlayEventCard: (cardName: EventCardName, ownerId: number) => void;
  onPlayContingencyCard: (cardName: EventCardName, ownerId: number) => void;
  onViewPlayerDiscard: () => void;
  onViewInfectionDiscard: () => void;
  onViewEventInfo: (cardName: EventCardName) => void;
  dispatcherTargetId: number | null;
  onSetDispatcherTarget: (id: number | null) => void;
  selectedCity: CityName | null;
  viewedPlayerId: number;
  onSetViewedPlayerId: (id: number) => void;
  onInitiatePlayResilientPopulation: (ownerId: number, from: 'hand' | 'contingency') => void;
  showCityNames: boolean;
  onToggleShowCityNames: (show: boolean) => void;
  isSoundEnabled: boolean;
  onToggleSoundEffects: (enabled: boolean) => void;
  onViewAllHands: () => void;
  selectedConnection: { from: CityName, to: CityName } | null;
  selectedRegion: string | null;
  onInitiateRailwaymanDoubleBuild: () => void; 
  
}> = ({ gameState, onAction, onUndoAction, onEndTurn, onInitiateShareKnowledge, onInitiateDispatchSummon, onInitiateTakeEventCard, onInitiateExpertFlight, onInitiateEpidemiologistTake, onInitiateReturnSamples, onInitiateCureDisease, onInitiateTreatDisease, onInitiateCollectSample, onInitiateFieldDirectorMove, onInitiateLocalLiaisonShare, onInitiateVirologistTreat, onInitiateEnlistBarbarians, onInitiateFreeEnlistBarbarians, onInitiateBattle, onInitiateMercatorShare, onInitiatePraefectusRecruit, onInitiateBuildFortWithLegions, onInitiateFabrumFlight, onInitiateVestalisDrawEvent, onInitiatePurifyWater, onInitiatePoliticianGiveCard, onInitiatePoliticianSwapCard, onInitiateRoyalAcademyScientistForecast, onPlayEventCard, onPlayContingencyCard, onViewPlayerDiscard, onViewInfectionDiscard, onViewEventInfo, selectedCity, dispatcherTargetId, onSetDispatcherTarget, viewedPlayerId, onSetViewedPlayerId, onInitiatePlayResilientPopulation, showCityNames, onToggleShowCityNames, isSoundEnabled, onToggleSoundEffects, onViewAllHands, selectedConnection, selectedRegion, onInitiateRailwaymanDoubleBuild }) => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const T = getTerminology(gameState);
  const viewedPlayer = gameState.players.find(p => p.id === viewedPlayerId)!;
  const isMyTurn = gameState.players[gameState.currentPlayerIndex].id === viewedPlayerId;
  const inActionPhase = gameState.gamePhase === GamePhase.PlayerAction;
  const isSpecialOrdersActive = gameState.specialOrdersControlledPawnId !== null;

  const handleCardAction = (card: PlayerCard) => {
    if(card.type === 'city') {
        onAction('DirectFlight', { destination: card.name });
    }
  };

  const pawnToMoveId = dispatcherTargetId !== null ? dispatcherTargetId : currentPlayer.id;
  const pawnToMove = gameState.players.find(p => p.id === pawnToMoveId)!;
  const controlledPawnForSO = isSpecialOrdersActive ? gameState.players.find(p => p.id === gameState.specialOrdersControlledPawnId) : null;
  const isPilotControllingSelf = currentPlayer.role === PlayerRole.Pilot && pawnToMove.id === currentPlayer.id;

  const canMoveByTrain = useMemo(() => {
      if (gameState.gameType !== 'iberia' || !inActionPhase || !selectedCity || !gameState.railroads || gameState.railroads.length === 0) {
          return false;
      }
      return isReachableByTrain(currentPlayer.location, selectedCity, gameState.railroads);
  }, [gameState, inActionPhase, selectedCity, currentPlayer.location]);

  const canAgronomistPlaceToken = useMemo(() => {
      if (gameState.gameType !== 'iberia' || !inActionPhase || currentPlayer.role !== PlayerRole.Agronomist || !selectedRegion || gameState.purificationTokenSupply < 1) {
          return false;
      }
      const adjacentRegions = IBERIA_CITY_TO_REGIONS_MAP[currentPlayer.location] || [];
      return adjacentRegions.includes(selectedRegion);
  }, [gameState, inActionPhase, currentPlayer, selectedRegion]);

  const canBuildHospital = useMemo(() => {
    if (gameState.gameType !== 'iberia' || !inActionPhase) return false;
    
    const city = currentPlayer.location;
    const cityColor = CITIES_DATA[city].color;

    // Hospitals can only be of the 4 standard colors
    if (![DiseaseColor.Blue, DiseaseColor.Yellow, DiseaseColor.Black, DiseaseColor.Red].includes(cityColor)) {
        return false;
    }

    // A hospital of this color already exists here
    if (gameState.hospitals?.[cityColor as keyof typeof gameState.hospitals] === city) {
        return false;
    }

    // Must have the matching city card in hand
    return currentPlayer.hand.some(c => c.type === 'city' && c.name === city);
  }, [gameState, inActionPhase, currentPlayer]);

  const canPurifyWater = useMemo(() => {
    if (gameState.gameType !== 'iberia' || !inActionPhase || !selectedRegion) {
        return false;
    }
    if (gameState.purificationTokenSupply < 2) {
      return false;
  }
    
    if (currentPlayer.role === PlayerRole.RoyalAcademyScientist) {
        const adjacentRegions = IBERIA_CITY_TO_REGIONS_MAP[currentPlayer.location] || [];
        if (!adjacentRegions.includes(selectedRegion)) return false;
        // Key difference: they only need *any* city card.
        return currentPlayer.hand.some(c => c.type === 'city');
    }

    const adjacentRegions = IBERIA_CITY_TO_REGIONS_MAP[currentPlayer.location] || [];
    if (!adjacentRegions.includes(selectedRegion)) {
        return false;
    }

    const playerHand = currentPlayer.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];

    // Method 1: Card matches a city color in the adjacent region
    const regionData = IBERIA_REGIONS.find(r => r.name === selectedRegion);
    if (regionData) {
        const regionCityColors = new Set(regionData.vertices.map(v => CITIES_DATA[v].color));
        const hasMatchingCityCard = playerHand.some(card => regionCityColors.has(card.color));
        if (hasMatchingCityCard) return true;
    }

    // Method 2: Card matches a researched disease color
    const researchedDiseaseColors = Object.entries(gameState.curedDiseases)
        .filter(([, isCured]) => isCured)
        .map(([color]) => color as DiseaseColor);
        
    const hasMatchingResearchedCard = playerHand.some(card => researchedDiseaseColors.includes(card.color));
    if (hasMatchingResearchedCard) return true;

    return false;
  }, [gameState, inActionPhase, currentPlayer, selectedRegion]);

  const canPoliticianGiveCard = useMemo(() => {
      if (!inActionPhase || currentPlayer.role !== PlayerRole.Politician) return false;
      return currentPlayer.hand.some(c => c.type === 'city' && c.name === currentPlayer.location);
  }, [inActionPhase, currentPlayer]);
  
  const canPoliticianSwapCard = useMemo(() => {
      if (!inActionPhase || currentPlayer.role !== PlayerRole.Politician) return false;
      const hasCityCardsInHand = currentPlayer.hand.some(c => c.type === 'city');
      const hasCityCardsInDiscard = gameState.playerDiscard.some(c => c.type === 'city');
      return hasCityCardsInHand && hasCityCardsInDiscard;
  }, [inActionPhase, currentPlayer, gameState.playerDiscard]);

  const canDriveToSelected = selectedCity && CONNECTIONS[pawnToMove.location].includes(selectedCity);
  const canDirectFlight = selectedCity && currentPlayer.hand.some(c => c.type === 'city' && c.name === selectedCity);
  const canCharterFlight = selectedCity && selectedCity !== pawnToMove.location && currentPlayer.hand.some(c => c.type === 'city' && c.name === pawnToMove.location);
  const canShuttleFlight = selectedCity && selectedCity !== pawnToMove.location && gameState.researchStations.includes(pawnToMove.location) && gameState.researchStations.includes(selectedCity);
  
  const canSail = useMemo(() => {
    const gameType = gameState.gameType;
    if (!selectedCity || !['fallOfRome', 'iberia'].includes(gameType) || !inActionPhase) return false;

    const cardPayer = currentPlayer;
    const pawnToMovePlayer = pawnToMove;
    const startCity = pawnToMovePlayer.location;
    const destinationCity = selectedCity;

    const portCities = gameType === 'fallOfRome' ? FALLOFROME_PORT_CITIES : IBERIA_PORT_CITIES;

    if (!portCities.has(startCity) || !portCities.has(destinationCity) || startCity === destinationCity) {
        return false;
    }

    // Praefectus Classis special ability check (only for Fall of Rome)
    if (gameType === 'fallOfRome' && cardPayer.role === PlayerRole.PraefectusClassis && cardPayer.id === pawnToMovePlayer.id) {
        return true;
    }
    
    // Sailor special ability check (only for Iberia)
    if (gameType === 'iberia' && cardPayer.role === PlayerRole.Sailor && cardPayer.id === pawnToMovePlayer.id) {
        return true;
    }

    const destinationData = CITIES_DATA[destinationCity];
    if (!destinationData) return false;
    
    // This now works for both Fall of Rome's `boardColors` and Iberia's single `color`
    const destinationColors = new Set(destinationData.boardColors || [destinationData.color]);
    
    return cardPayer.hand.some(card => 
        card.type === 'city' && destinationColors.has(card.color)
    );
  }, [selectedCity, gameState, pawnToMove, inActionPhase, currentPlayer]);

  const citiesInPilotRange = useMemo(() => isPilotControllingSelf ? getCitiesWithinRange(pawnToMove.location, 3) : [], [isPilotControllingSelf, pawnToMove.location]);
  const canPilotFlight = isPilotControllingSelf && selectedCity && citiesInPilotRange.includes(selectedCity);

  const canBuildStation = !gameState.researchStations.includes(currentPlayer.location) && (currentPlayer.role === PlayerRole.OperationsExpert || currentPlayer.hand.some(c => c.type === 'city' && c.name === currentPlayer.location));
  
  const canCureDisease = () => {
      const cityCardsInHand = currentPlayer.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];
      const colorGroups = cityCardsInHand.reduce((acc, card) => {
          const color = card.color;
          if (!acc[color]) acc[color] = 0;
          acc[color]++;
          return acc;
      }, {} as Record<DiseaseColor, number>);

      const isBreakthroughActive = gameState.sequencingBreakthroughPlayerId !== null;
      
      const isFallOfRome = gameState.gameType === 'fallOfRome';

      if (isFallOfRome) {
          for (const color of FALLOFROME_DISEASE_COLORS) {
            if (gameState.curedDiseases[color]) continue;

            const cityCubes = gameState.diseaseCubes[currentPlayer.location];
            const hasCubeOfColor = cityCubes && (cityCubes[color] || 0) > 0;
            if (!hasCubeOfColor && currentPlayer.role !== PlayerRole.Mercator) continue;

            const requiredCards = FALLOFROME_ALLIANCE_CARD_REQUIREMENTS[color];
            if ((colorGroups[color] || 0) >= requiredCards) return true;
          }
      } else { // Pandemic & Iberia logic
    const isPandemic = gameState.gameType === 'pandemic';
    const isIberia = gameState.gameType === 'iberia';
    
    const isAtResearchStation = gameState.researchStations.includes(currentPlayer.location);

    if (isPandemic && !isAtResearchStation) return false;

    const isVSComplex = gameState.activeVirulentStrainCards.includes(VirulentStrainEpidemicCardName.ComplexMolecularStructure);
    const colorsToCheck = [DiseaseColor.Blue, DiseaseColor.Yellow, DiseaseColor.Black, DiseaseColor.Red];

    for (const color of colorsToCheck) {
        if (gameState.curedDiseases[color]) continue;
        
        // --- NEW IBERIA LOCATION CHECK ---
        if (isIberia) {
            const requiredHospitalLocation = gameState.hospitals?.[color as keyof typeof gameState.hospitals];
            if (currentPlayer.location !== requiredHospitalLocation) {
                continue; // Can't research this color from here, check the next one.
            }
        }

        let requiredCardsBase = currentPlayer.role === PlayerRole.Scientist ? 4 : 5;
        let requiredCards = requiredCardsBase - (isBreakthroughActive ? 1 : 0);
        if (isVSComplex && color === gameState.virulentStrainColor) {
            requiredCards++;
        }
        if ((colorGroups[color] || 0) >= requiredCards) return true;
              
              if (currentPlayer.role === PlayerRole.FieldOperative) {
                  let requiredSampleCards = (5 - 2) - (isBreakthroughActive ? 1 : 0);
                  if (isVSComplex && color === gameState.virulentStrainColor) {
                      requiredSampleCards++;
                  }
                  if ((colorGroups[color] || 0) >= requiredSampleCards && (currentPlayer.samples[color] || 0) >= 3) {
                      return true;
                  }
              }
          }
          
          if (currentPlayer.role === PlayerRole.Virologist) {
              for (const cureColor of colorsToCheck) {
                  if (gameState.curedDiseases[cureColor]) continue;
                  
                  let requiredValue = 5 - (isBreakthroughActive ? 1 : 0);
                  if (isVSComplex && cureColor === gameState.virulentStrainColor) {
                      requiredValue++;
                  }

                  const mainCardsCount = colorGroups[cureColor] || 0;
                  let otherPairsValue = 0;
                  Object.entries(colorGroups).forEach(([c, count]) => {
                      if (c !== cureColor) {
                          otherPairsValue += Math.floor(count / 2);
                      }
                  });

                  if (mainCardsCount + otherPairsValue >= requiredValue) return true;
              }
          }
      }
      
      return false;
  };

  const canBuildRailroad = useMemo(() => {
    if ((gameState.railroads?.length || 0) >= 20) return false;
    if (gameState.gameType !== 'iberia' || !selectedConnection || !inActionPhase) return false;
    
    // Player must be at one of the connected cities
    if (currentPlayer.location !== selectedConnection.from && currentPlayer.location !== selectedConnection.to) {
        return false;
    }

    // Cannot build on a sea route
    const isSeaRoute = IBERIA_SEA_CONNECTIONS.some(c =>
        (c[0] === selectedConnection.from && c[1] === selectedConnection.to) ||
        (c[0] === selectedConnection.to && c[1] === selectedConnection.from)
    );
    if (isSeaRoute) return false;

    // Cannot build if a railroad already exists
    const railroadExists = gameState.railroads?.some(r =>
        (r.from === selectedConnection.from && r.to === selectedConnection.to) ||
        (r.from === selectedConnection.to && r.to === selectedConnection.from)
    );
    if (railroadExists) return false;

    return true;
  }, [gameState, selectedConnection, inActionPhase, currentPlayer]);

  const canRailwaymanDoubleBuild = useMemo(() => {
      if (!canBuildRailroad || currentPlayer.role !== PlayerRole.Railwayman || gameState.hasUsedRailwaymanDoubleBuild) {
          return false;
      }
      return true;
  }, [canBuildRailroad, currentPlayer.role, gameState.hasUsedRailwaymanDoubleBuild]);

  const isContingencyPlanner = currentPlayer.role === PlayerRole.ContingencyPlanner;
  const canTakeEvent = isContingencyPlanner && !currentPlayer.contingencyCard;
  const canExpertFlight = inActionPhase
      && currentPlayer.role === PlayerRole.OperationsExpert
      && gameState.researchStations.includes(currentPlayer.location)
      && !gameState.hasUsedOperationsExpertFlight
      && currentPlayer.hand.some(c => c.type === 'city')
      && !!selectedCity
      && selectedCity !== currentPlayer.location;
  const canRetrieveCard = inActionPhase && currentPlayer.role === PlayerRole.Archivist && !gameState.hasUsedArchivistRetrieve && gameState.playerDiscard.some(c => c.type === 'city' && c.name === currentPlayer.location);
  const canCollectSample = inActionPhase && currentPlayer.role === PlayerRole.FieldOperative && !gameState.hasUsedFieldOperativeCollect && gameState.diseaseCubes[currentPlayer.location] && Object.values(gameState.diseaseCubes[currentPlayer.location]!).some(c => c > 0);
  
  const canUseFieldDirectorMove = useMemo(() => {
    if (!inActionPhase || currentPlayer.role !== PlayerRole.FieldDirector || gameState.hasUsedFieldDirectorMove) {
        return false;
    }
    const validLocations = new Set([currentPlayer.location, ...CONNECTIONS[currentPlayer.location]]);
    return gameState.players.some(p =>
        p.id !== currentPlayer.id &&
        p.role !== PlayerRole.Pilot &&
        validLocations.has(p.location)
    );
}, [inActionPhase, currentPlayer, gameState.hasUsedFieldDirectorMove, gameState.players]);

const canLocalLiaisonShare = useMemo(() => {
    if (!inActionPhase || currentPlayer.role !== PlayerRole.LocalLiaison || gameState.hasUsedLocalLiaisonShare) {
        return false;
    }

    const liaisonCity = CITIES_DATA[currentPlayer.location];
    // For Pandemic, boardColors is undefined, so we use the single color. For FoR, we use boardColors.
    const liaisonCityColors = (liaisonCity as any).boardColors || [liaisonCity.color];
    const cityCardsInHand = currentPlayer.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];

    // Iterate through each color of the city the Liaison is in.
    for (const color of liaisonCityColors) {
        // Check if the Liaison has a card of this color.
        const hasSharableCardOfColor = cityCardsInHand.some(card => card.color === color);

        if (hasSharableCardOfColor) {
            // If they have a card, check if there's a valid recipient for that color.
            const hasValidRecipientForColor = gameState.players.some(p => {
                if (p.id === currentPlayer.id) return false;
                const recipientCity = CITIES_DATA[p.location];
                const recipientCityColors = (recipientCity as any).boardColors || [recipientCity.color];
                return recipientCityColors.includes(color);
            });

            if (hasValidRecipientForColor) {
                // If we find one valid share opportunity, we can enable the button.
                return true;
            }
        }
    }

    return false;
}, [inActionPhase, currentPlayer, gameState]);

const canVirologistTreat = inActionPhase && currentPlayer.role === PlayerRole.Virologist && currentPlayer.hand.some(c => c.type === 'city');

const canUseMercatorShare = useMemo(() => {
    if (!inActionPhase || currentPlayer.role !== PlayerRole.Mercator || gameState.hasUsedMercatorShare) {
        return false;
    }
    const cityData = FALLOFROME_CITIES_DATA[currentPlayer.location as keyof typeof FALLOFROME_CITIES_DATA];
    if (!cityData || !cityData.boardColors) return false;

    const cityColors = new Set(cityData.boardColors);
    const otherPlayersInCity = gameState.players.filter(p => p.id !== currentPlayer.id && p.location === currentPlayer.location);
    if (otherPlayersInCity.length === 0) return false;

    const canGive = currentPlayer.hand.some(c => c.type === 'city' && cityColors.has(c.color));
    if (canGive) return true;

    const canTake = otherPlayersInCity.some(otherPlayer => 
        otherPlayer.hand.some(c => c.type === 'city' && cityColors.has(c.color))
    );
    if (canTake) return true;

    return false;
}, [inActionPhase, currentPlayer, gameState]);

const canFortify = inActionPhase &&
    gameState.gameType === 'fallOfRome' &&
    !gameState.forts?.includes(currentPlayer.location) &&
    currentPlayer.hand.some(c => c.type === 'city' && c.name === currentPlayer.location);

const canRecruitArmy = inActionPhase &&
    gameState.gameType === 'fallOfRome' &&
    gameState.forts?.includes(currentPlayer.location) &&
    (gameState.legions?.length || 0) < 16;

  const canEnlistBarbarians = useMemo(() => {
    if (gameState.gameType !== 'fallOfRome' || !inActionPhase) return false;
    const player = currentPlayer;
    const cityCubes = gameState.diseaseCubes[player.location];
    if (!cityCubes) return false;

    for (const color of FALLOFROME_DISEASE_COLORS) {
        const cubeCount = cityCubes[color] || 0;
        if (cubeCount > 0) {
            const isAllied = gameState.curedDiseases[color];
            if (isAllied) {
                const hasMatchingCard = player.hand.some(c => c.type === 'city' && c.color === color);
                if (hasMatchingCard) {
                    return true;
                }
            }
        }
    }
    return false;
  }, [gameState, inActionPhase, currentPlayer]);

  const canUseFreeEnlist = useMemo(() => {
    if (!inActionPhase || currentPlayer.role !== PlayerRole.ReginaFoederata || gameState.hasUsedReginaFoederataFreeEnlist) {
        return false;
    }
    const cityCubes = gameState.diseaseCubes[currentPlayer.location];
    if (!cityCubes) return false;
    return FALLOFROME_DISEASE_COLORS.some(color => 
        (cityCubes[color] || 0) > 0 && gameState.curedDiseases[color]
    );
  }, [inActionPhase, currentPlayer, gameState]);

  const canBattle = useMemo(() => {
    if (gameState.gameType !== 'fallOfRome' || !inActionPhase) return false;
    const player = currentPlayer;
    const legionsInCity = (gameState.legions || []).filter(l => l === player.location).length;
    if (legionsInCity === 0) return false;

    const cityCubes = gameState.diseaseCubes[player.location];
    if (!cityCubes || Object.values(cityCubes).every(count => count === 0)) return false;

    return true;
  }, [gameState, inActionPhase, currentPlayer]);
    
  const isPraefectusClassis = currentPlayer.role === PlayerRole.PraefectusClassis;
  const canPraefectusRecruit = useMemo(() => {
    if (!inActionPhase || !isPraefectusClassis || gameState.gameType !== 'fallOfRome') return false;
    if (!FALLOFROME_PORT_CITIES.has(currentPlayer.location)) return false;
    if ((gameState.legions?.length || 0) >= 16) return false;
    const cityData = FALLOFROME_CITIES_DATA[currentPlayer.location as keyof typeof FALLOFROME_CITIES_DATA];
    if (!cityData?.boardColors) return false;
    const cityColors = new Set(cityData.boardColors);
    return currentPlayer.hand.some(c => c.type === 'city' && cityColors.has(c.color));
  }, [inActionPhase, isPraefectusClassis, currentPlayer, gameState]);

  const isPraefectusFabrum = currentPlayer.role === PlayerRole.PraefectusFabrum;
  const canBuildFortWithLegions = useMemo(() => {
      return inActionPhase &&
          gameState.gameType === 'fallOfRome' &&
          isPraefectusFabrum &&
          !gameState.forts.includes(currentPlayer.location) &&
          (gameState.legions || []).filter(l => l === currentPlayer.location).length >= 2;
  }, [inActionPhase, gameState, currentPlayer, isPraefectusFabrum]);

  const canFabrumFlight = useMemo(() => {
      return inActionPhase &&
          gameState.gameType === 'fallOfRome' &&
          isPraefectusFabrum &&
          !!selectedCity &&
          selectedCity !== currentPlayer.location &&
          currentPlayer.hand.some(c => c.type === 'city') &&
          (gameState.forts.includes(currentPlayer.location) || gameState.forts.includes(selectedCity));
  }, [inActionPhase, gameState, currentPlayer, isPraefectusFabrum, selectedCity]);
  
  const pandemicColors = useMemo(() => {
    const colors: DiseaseColor[] = [DiseaseColor.Blue, DiseaseColor.Yellow, DiseaseColor.Black, DiseaseColor.Red];
    if (gameState.setupConfig.useMutationChallenge) {
        colors.push(DiseaseColor.Purple);
    }
    return colors;
  }, [gameState.setupConfig.useMutationChallenge]);


  const isFallOfRome = gameState.gameType === 'fallOfRome';

  const isConsul = currentPlayer.role === PlayerRole.Consul;
  const legionSupplyAvailable = (gameState.legions?.length || 0) < 16;
  const canConsulPlaceLegionInCity = isConsul && inActionPhase && legionSupplyAvailable;
  const canConsulPlaceLegionAtFort = isConsul && inActionPhase && legionSupplyAvailable && selectedCity && gameState.forts.includes(selectedCity);
  const canTakeCardAsEpidemiologist = inActionPhase && currentPlayer.role === PlayerRole.Epidemiologist && !gameState.hasUsedEpidemiologistAbility && gameState.players.some(p => p.id !== currentPlayer.id && p.location === currentPlayer.location && p.hand.some(c => c.type === 'city'));

  const vestalis = gameState.players.find(p => p.role === PlayerRole.Vestalis);
  const canVestalisDrawEvent = useMemo(() => {
      if (!vestalis || gameState.gameType !== 'fallOfRome' || gameState.eventDeck.length === 0) {
          return false;
      }
      const vestalisCityData = FALLOFROME_CITIES_DATA[vestalis.location as keyof typeof FALLOFROME_CITIES_DATA];
      if (!vestalisCityData?.boardColors) return false;
      const cityColors = new Set(vestalisCityData.boardColors);
      return vestalis.hand.some(c => c.type === 'city' && cityColors.has(c.color));
  }, [gameState.players, gameState.gameType, gameState.eventDeck]);

  const LIGHT_ROLE_COLORS = useMemo(() => new Set([
    PlayerRole.Scientist,
    PlayerRole.ContainmentSpecialist,
    PlayerRole.Epidemiologist,
    PlayerRole.FieldOperative,
    PlayerRole.LocalLiaison,
    PlayerRole.PraefectusFabrum,
  ]), []);
  
  return (
    <div className="h-full bg-gray-800 bg-opacity-80 backdrop-blur-sm p-2 flex flex-col text-sm space-y-2 rounded-lg shadow-lg overflow-y-auto">
      <div className="bg-gray-900 p-3 rounded-lg">
        <h3 className="font-orbitron text-fuchsia-400 mb-2">Game Status</h3>
        {gameState.oneQuietNightActive && <div className="text-center font-bold text-cyan-300 animate-pulse mb-1">One Quiet Night Active</div>}
        {gameState.infectionZoneBanPlayerId !== null && <div className="text-center font-bold text-orange-400 mb-1">Infection Zone Ban Active</div>}
        {gameState.improvedSanitationPlayerId !== null && <div className="text-center font-bold text-green-400 mb-1">Improved Sanitation Active</div>}
        {gameState.sequencingBreakthroughPlayerId !== null && <div className="text-center font-bold text-yellow-400 mb-1">Sequencing Breakthrough Active</div>}
        
        {gameState.virulentStrainColor && (
            <div className="text-center font-bold text-purple-400 mb-1 capitalize animate-pulse">
                Virulent Strain: {gameState.virulentStrainColor}
            </div>
        )}
        {gameState.activeVirulentStrainCards.length > 0 && (
            <div className="text-center font-semibold text-purple-300 text-xs mb-1">
                {gameState.activeVirulentStrainCards.map(c => VIRULENT_STRAIN_EPIDEMIC_INFO[c].name).join(', ')}
            </div>
        )}

        <div className="flex items-center justify-between"><span>{T.outbreakMarker}:</span> <span className="font-bold text-xl">{gameState.outbreakCounter} / 8</span></div>
        {gameState.gameType === 'pandemic' && (
            <div className="flex items-center justify-between"><span>Stations Supply:</span> <span className="font-bold text-xl">{Math.max(0, 6 - gameState.researchStations.length)} / 6</span></div>
        )}
        {gameState.gameType === 'iberia' && (
            <div className="flex items-center justify-between">
                <span>Railroads Remaining:</span>
                <span className="font-bold text-xl">{20 - (gameState.railroads?.length || 0)} / 20</span>
            </div>
        )}
        {gameState.gameType === 'iberia' && (
            <div className="flex items-center justify-between">
                <span>Purification Tokens:</span>
                <span className="font-bold text-xl">{gameState.purificationTokenSupply} / 14</span>
            </div>
        )}
        {gameState.gameType === 'iberia' && (
          <div className="mt-2 pt-2 border-t border-gray-700">
              <h4 className="text-xs font-semibold text-gray-400 mb-1">Hospital Supply</h4>
              <div className="flex justify-around items-center">
                  {([DiseaseColor.Blue, DiseaseColor.Yellow, DiseaseColor.Black, DiseaseColor.Red] as const).map(color => {
                      const hospitalLocation = gameState.hospitals?.[color];
                      const isInSupply = hospitalLocation === null;
                      const titleText = isInSupply ? `${color} hospital available` : `On board at ${CITIES_DATA[hospitalLocation as CityName].name}`;
                      
                      return (
                          <div 
                              key={color} 
                              title={titleText} 
                              className={`w-8 h-8 rounded-full ${CURE_STATUS_COLORS[color]} ${isInSupply ? 'opacity-100 shadow-lg' : 'opacity-30'} relative flex items-center justify-center transition-all duration-300`}
                          >
                              <span className="font-bold text-white text-xl" style={{ textShadow: '1px 1px 2px #000' }}>H</span>
                          </div>
                      );
                  })}
              </div>
          </div>
        )}
        {gameState.gameType === 'fallOfRome' && (
            <div className="flex items-center justify-between"><span>Forts Supply:</span> <span className="font-bold text-xl">{Math.max(0, 6 - (gameState.forts?.length || 0))} / 6</span></div>
        )}
        {gameState.gameType === 'fallOfRome' && (
            <div className="flex items-center justify-between"><span>Legions Supply:</span> <span className="font-bold text-xl">{Math.max(0, 16 - (gameState.legions?.length || 0))} / 16</span></div>
        )}
        
        {gameState.gameType === 'fallOfRome' && (
            <div className="flex items-center justify-between">
                <span>Recruitment Rate:</span>
                <span className="font-bold text-xl">{FALLOFROME_RECRUITMENT_RATES[gameState.recruitmentRateIndex]}</span>
            </div>
        )}
        <div className="flex items-center justify-between">
          <span>{gameState.gameType === 'fallOfRome' ? 'Invasion Rate' : 'Infection Rate'}:</span>
          {gameState.commercialTravelBanPlayerId !== null ? (
              <span className="font-bold text-xl">
                  <span className="line-through text-gray-500">{
                      gameState.gameType === 'fallOfRome' 
                          ? FALLOFROME_INVASION_RATES[gameState.infectionRateIndex] 
                          : PANDEMIC_INFECTION_RATES[gameState.infectionRateIndex]
                  }</span>
                  <span className="text-cyan-400"> → 1</span>
              </span>
          ) : (
              <span className="font-bold text-xl">{
                  gameState.gameType === 'fallOfRome' 
                      ? FALLOFROME_INVASION_RATES[gameState.infectionRateIndex] 
                      : PANDEMIC_INFECTION_RATES[gameState.infectionRateIndex]
              }</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-2"><span>Player Deck:</span> <span className="font-bold text-xl">{gameState.playerDeck.length}</span></div>
        <div className="flex items-center justify-between mt-1">
          <span>Player Discard:</span> 
          <div className="flex items-center">
            <span className="font-bold text-xl mr-2">{gameState.playerDiscard.length}</span>
            <button onClick={onViewPlayerDiscard} disabled={gameState.playerDiscard.length === 0} className="text-xs bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed px-3 py-1 rounded transition-colors">View</button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>Infection Discard:</span> 
          <div className="flex items-center">
            <span className="font-bold text-xl mr-2">{gameState.infectionDiscard.length}</span>
            <button onClick={onViewInfectionDiscard} disabled={gameState.infectionDiscard.length === 0} className="text-xs bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed px-3 py-1 rounded transition-colors">View</button>
          </div>
        </div>
        {gameState.eventDeck.length > 0 && (
            <div className="flex items-center justify-between mt-1">
              <span>Event Deck:</span>
              <div className="flex items-center">
                <span className="font-bold text-xl mr-2">{gameState.eventDeck.length}</span>
              </div>
            </div>
        )}
        <div className="mt-2 pt-2 border-t border-gray-700">
          <h4 className="text-xs font-semibold text-gray-400 mb-1">Cubes Remaining</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {isFallOfRome ? (
                FALLOFROME_DISEASE_COLORS.map(color => (
                    <div key={color} className="flex items-center justify-between text-xs">
                        <div className="flex items-center">
                          <span className={`w-3 h-3 rounded-full inline-block mr-2 ${CURE_STATUS_COLORS[color]}`}></span>
                          <span>{color.charAt(0).toUpperCase() + color.slice(1)}:</span>
                        </div>
                        <span className="font-bold">{gameState.remainingCubes[color]}</span>
                    </div>
                ))
              ) : (
                pandemicColors.map(color => (
                    <div key={color} className="flex items-center justify-between text-xs">
                        <div className="flex items-center">
                          <span className={`w-3 h-3 rounded-full inline-block mr-2 ${CURE_STATUS_COLORS[color]}`}></span>
                          <span>{color.charAt(0).toUpperCase() + color.slice(1)}:</span>
                        </div>
                        <span className="font-bold">{gameState.remainingCubes[color]}</span>
                    </div>
                ))
              )}
          </div>
        </div>
      </div>
      <div className="bg-gray-900 p-3 rounded-lg">
        <h3 className="font-orbitron text-fuchsia-400 mb-2">{isFallOfRome ? 'Alliance Status' : 'Cure Status'}</h3>
        <div className="flex justify-around items-center h-full">
          {isFallOfRome ? (
            FALLOFROME_DISEASE_COLORS.map(color => {
                const cured = gameState.curedDiseases[color];
                const requiredCards = FALLOFROME_ALLIANCE_CARD_REQUIREMENTS[color];
                const titleText = cured ? `Alliance with ${color} tribe is forged` : `Forge an alliance with the ${color} tribe (${requiredCards} cards)`;

                return (
                    <div key={color} title={titleText} className={`w-8 h-8 rounded-full ${CURE_STATUS_COLORS[color]} ${cured ? 'opacity-100 shadow-lg' : 'opacity-30'} relative flex items-center justify-center transition-all duration-300`}>
                        {cured ? (
                            <span className="text-white text-lg font-bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>✓</span>
                        ) : (
                            <span className={`${color === DiseaseColor.White ? 'text-black' : 'text-white'} text-lg font-bold`} style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                                {requiredCards}
                            </span>
                        )}
                    </div>
                )
            })
          ) : (
            pandemicColors.map(color => {
                const cured = gameState.curedDiseases[color];
                const isEradicated = gameState.eradicatedDiseases[color];
                const isVirulent = gameState.virulentStrainColor === color;
                const titleText = isEradicated ? 'Eradicated' : cured ? 'Cured' : 'Not Cured';

                return (
                    <div key={color} title={titleText} className={`w-8 h-8 rounded-full ${CURE_STATUS_COLORS[color]} ${cured ? 'opacity-100 shadow-lg' : 'opacity-30'} relative flex items-center justify-center transition-all duration-300`}>
                        {isVirulent && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center animate-pulse" title="Virulent Strain">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                        )}
                        {cured && !isEradicated && <span className="text-white text-lg font-bold">✓</span>}
                        {isEradicated && <div className="w-full h-full flex items-center justify-center animate-pulse"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3-3 1.343 3 3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.092 19.908A9.954 9.954 0 013 12c0-2.28-.78-4.383 2.092-6.092m12.816 12.184A9.954 9.954 0 0121 12c0-2.28-.78-4.383-2.092-6.092M12 21a9.954 9.954 0 01-7.908-4.092M12 3a9.954 9.954 0 017.908 4.092" /></svg></div>}
                    </div>
                )
            })
          )}
        </div>
      </div>
      <div className="bg-gray-900 p-3 rounded-lg flex-grow flex flex-col">
        <div className="mb-3">
            <h3 className="font-orbitron text-green-400">Current Turn: {currentPlayer.name}</h3>
            <div className="flex space-x-1 mt-1">
                <span className="text-xs self-center mr-1 text-gray-400">View Hand:</span>
                {gameState.players.map((p, index) => {
                    const isSelected = viewedPlayerId === p.id;
                    const roleColor = p.role ? PLAYER_ROLE_COLORS[p.role] : PLAYER_PAWN_COLORS[index];
                    const textColorClass = p.role && LIGHT_ROLE_COLORS.has(p.role) ? 'text-black' : 'text-white';
                    const ringColorClass = p.role && LIGHT_ROLE_COLORS.has(p.role) ? 'ring-black' : 'ring-white';

                    return (
                         <button
                            key={p.id}
                            onClick={() => onSetViewedPlayerId(p.id)}
                            className={`text-xs px-2 py-1 rounded font-semibold transition-all duration-150 transform hover:scale-105 ${textColorClass} ${isSelected ? `ring-2 ring-offset-2 ring-offset-gray-900 ${ringColorClass}` : ''}`}
                            style={{ backgroundColor: roleColor }}
                        >
                            {p.name}
                        </button>
                    )
                })}
                  <button
                    onClick={onViewAllHands}
                    className="text-xs px-2 py-1 rounded font-semibold transition-all duration-150 transform hover:scale-105 bg-gray-600 hover:bg-gray-500 text-white"
                    title="View all player hands at once"
                >
                    All Hands
                </button>
            </div>
        </div>
        <div className="flex items-start space-x-4 mb-3">
            {viewedPlayer.role && <RoleImage role={viewedPlayer.role} />}
            <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{viewedPlayer.name} ({viewedPlayer.role})</h3>
                <p className="text-xs text-gray-400 italic mt-1">{PLAYER_ROLE_INFO[viewedPlayer.role]}</p>
            </div>
        </div>
        <div className="flex items-center justify-between mb-2"><span>Actions Remaining:</span> <span className="font-bold text-2xl text-green-400">{inActionPhase ? gameState.actionsRemaining : '0'}</span></div>
        <h4 className="font-bold mb-1 mt-2">Hand ({viewedPlayer.hand.length} / {viewedPlayer.role === PlayerRole.Archivist ? 8 : 7} cards):</h4>
        <div className="grid grid-cols-4 gap-2 flex-grow min-h-[80px]">
          {viewedPlayer.hand.map((card, index) => <div onClick={() => inActionPhase && isMyTurn && handleCardAction(card)} className={inActionPhase && isMyTurn ? 'cursor-pointer' : 'cursor-default'}><PlayerCardDisplay key={index} card={card} isLarge={false} /></div>)}
        </div>
        {viewedPlayer.role === PlayerRole.ContingencyPlanner && viewedPlayer.contingencyCard && (
            <div className="mt-3 border-t-2 border-dashed border-lime-500 pt-3">
                <h4 className="font-bold mb-1">Contingency Plan:</h4>
                <div className="flex items-center justify-between p-2 rounded-md bg-lime-800">
                    <span className="font-bold">{viewedPlayer.contingencyCard}</span>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => onViewEventInfo(viewedPlayer.contingencyCard!)} aria-label={`View info for ${viewedPlayer.contingencyCard}`} className="w-8 h-8 rounded-full bg-lime-800 hover:bg-lime-700 flex items-center justify-center font-bold text-white transition-colors">?</button>
                        <button disabled={!inActionPhase || !isMyTurn} onClick={() => onPlayContingencyCard(viewedPlayer.contingencyCard!, viewedPlayer.id)} className="bg-lime-600 hover:bg-lime-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-1 rounded text-white text-xs font-semibold">Play</button>
                    </div>
                </div>
            </div>
        )}
        {/* Removed sample display to simplify */}
      </div>
      <PlayableEvents 
          gameState={gameState} 
          onPlayEventCard={onPlayEventCard} 
          onPlayContingencyCard={onPlayContingencyCard} 
          onViewEventInfo={onViewEventInfo} 
          onInitiatePlayResilientPopulation={onInitiatePlayResilientPopulation}
      />
      <FieldOperativeActions 
          gameState={gameState} 
          onInitiateReturnSamples={onInitiateReturnSamples} 
      />
      {vestalis && gameState.gameType === 'fallOfRome' && (
        <div className="bg-gray-900 p-3 rounded-lg">
            <h3 className="font-orbitron text-lime-400 mb-2">Vestalis Ability ({vestalis.name})</h3>
            <button
                disabled={!canVestalisDrawEvent}
                onClick={onInitiateVestalisDrawEvent}
                className="w-full bg-lime-700 hover:bg-lime-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold"
            >
                Draw Event Card
            </button>
            <p className="text-xs text-gray-400 mt-2">Discard a city card matching your city's color to draw an Event card. (Any time)</p>
        </div>
      )}
      {isSpecialOrdersActive && inActionPhase && controlledPawnForSO && (
        <div className="bg-gray-900 p-3 rounded-lg">
            <h3 className="font-orbitron text-purple-400 mb-2">Special Orders: Control</h3>
            <p className="text-xs text-gray-400 mb-2">Select which pawn to move.</p>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onSetDispatcherTarget(null)} className={`p-2 rounded text-white font-semibold text-xs transition-colors ${dispatcherTargetId === null || dispatcherTargetId === currentPlayer.id ? 'bg-purple-600 ring-2 ring-white' : 'bg-purple-800 hover:bg-purple-700'}`}>Move Me ({currentPlayer.name.split(' ')[0]})</button>
                <button onClick={() => onSetDispatcherTarget(controlledPawnForSO.id)} className={`p-2 rounded text-white font-semibold text-xs transition-colors ${dispatcherTargetId === controlledPawnForSO.id ? 'bg-purple-600 ring-2 ring-white' : 'bg-purple-800 hover:bg-purple-700'}`}>Move {controlledPawnForSO.name.split(' ')[0]}</button>
            </div>
        </div>
      )}
      {currentPlayer.role === PlayerRole.Dispatcher && inActionPhase && !isSpecialOrdersActive && (
        <div className="bg-gray-900 p-3 rounded-lg">
          <h3 className="font-orbitron text-purple-400 mb-2">Dispatcher Control</h3>
          <p className="text-xs text-gray-400 mb-2">Select a pawn to move with your actions.</p>
          <div className="grid grid-cols-4 gap-1">
            {gameState.players.map(p => <button key={p.id} onClick={() => onSetDispatcherTarget(dispatcherTargetId === p.id ? null : p.id)} disabled={!inActionPhase} className={`p-1 rounded text-white font-semibold text-xs transition-colors ${dispatcherTargetId === p.id ? 'bg-purple-600 ring-2 ring-white' : 'bg-purple-800 hover:bg-purple-700'} disabled:bg-gray-600 disabled:cursor-not-allowed`}>{p.name.split(' ')[0]} {p.id + 1} {currentPlayer.id === p.id && ' (Me)'}</button>)}
          </div>
        </div>
      )}
      <div className="bg-gray-900 p-3 rounded-lg">
        <h3 className="font-orbitron text-yellow-400 mb-2">Actions</h3>
        {isSpecialOrdersActive && <div className="text-center text-sm font-semibold text-purple-300 bg-purple-900 p-2 rounded-md mb-2">Special Orders Active: Controlling {pawnToMove.name}</div>}
        <div className="grid grid-cols-3 gap-2">
            <button disabled={!inActionPhase || !canDriveToSelected || isPilotControllingSelf} onClick={() => onAction('Drive', { destination: selectedCity })} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">
              {T.moveGround}
            </button>
            {gameState.gameType === 'pandemic' && <button disabled={!inActionPhase || !canDirectFlight || isPilotControllingSelf} onClick={() => onAction('DirectFlight', { destination: selectedCity })} className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Direct Flight</button>}
            {gameState.gameType === 'pandemic' && <button disabled={!inActionPhase || !canCharterFlight || isPilotControllingSelf} onClick={() => onAction('CharterFlight', { destination: selectedCity })} className="bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Charter Flight</button>}
            {gameState.gameType === 'pandemic' && <button disabled={!inActionPhase || !canShuttleFlight || isPilotControllingSelf} onClick={() => onAction('ShuttleFlight', { destination: selectedCity })} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Shuttle Flight</button>}
            {gameState.gameType === 'iberia' && (
                <button
                    disabled={!canMoveByTrain}
                    onClick={() => onAction('Train', { destination: selectedCity })}
                    className="bg-stone-500 hover:bg-stone-400 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold"
                >
                    {T.moveTrain}
                </button>
            )}
            {['fallOfRome', 'iberia'].includes(gameState.gameType) && <button disabled={!canSail} onClick={() => onAction('Sail', { destination: selectedCity })} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">{T.moveSea}</button>}
            {gameState.gameType === 'iberia' && (
                <>
                    <button
                        disabled={!canBuildRailroad}
                        onClick={() => onAction('BuildRailroad', { connection: selectedConnection })}
                        className="bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold"
                    >
                        Build Railroad
                    </button>
                    {currentPlayer.role === PlayerRole.Railwayman && (
                        <button
                            disabled={!canRailwaymanDoubleBuild}
                            onClick={onInitiateRailwaymanDoubleBuild}
                            className="bg-amber-700 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold"
                        >
                            Build Double
                        </button>
                    )}
                </>
            )}
            {gameState.gameType === 'iberia' && (
              <button
                  disabled={!canBuildHospital}
                  onClick={() => onAction('BuildHospital')}
                  className="bg-rose-600 hover:bg-rose-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold"
              >
                  {T.buildHospital}
              </button>
            )}
            {gameState.gameType === 'iberia' && (
              <button
                  disabled={!canPurifyWater}
                  onClick={onInitiatePurifyWater}
                  className="bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold"
              >
                  Purify Water
              </button>
            )}
            {currentPlayer.role === PlayerRole.Agronomist && (
                <button
                    disabled={!canAgronomistPlaceToken}
                    onClick={() => onAction('AgronomistPlaceToken', { region: selectedRegion })}
                    className="bg-green-700 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold col-span-1"
                >
                    Place Token
                </button>
            )}
            {currentPlayer.role === PlayerRole.Politician && (
                <>
                    <button
                        disabled={!canPoliticianGiveCard}
                        onClick={onInitiatePoliticianGiveCard}
                        className="bg-indigo-700 hover:bg-indigo-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold col-span-1"
                    >
                        Give Card
                    </button>
                    <button
                        disabled={!canPoliticianSwapCard}
                        onClick={onInitiatePoliticianSwapCard}
                        className="bg-indigo-700 hover:bg-indigo-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold col-span-1"
                    >
                        Swap Card
                    </button>
                </>
            )}
            {currentPlayer.role === PlayerRole.RoyalAcademyScientist && (
                <button
                    disabled={!inActionPhase || pawnToMove.id !== currentPlayer.id}
                    onClick={onInitiateRoyalAcademyScientistForecast}
                    className="bg-sky-700 hover:bg-sky-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold col-span-1"
                >
                    Academy Forecast
                </button>
            )}
            {gameState.gameType === 'pandemic' && <button disabled={!inActionPhase || !canBuildStation || pawnToMove.id !== currentPlayer.id || isPilotControllingSelf} onClick={() => onAction('BuildStation')} className="bg-orange-500 hover:bg-orange-400 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Build Station</button>}
            {gameState.gameType === 'fallOfRome' && <button disabled={!canFortify || pawnToMove.id !== currentPlayer.id} onClick={() => onAction('Fortify')} className="bg-amber-700 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Fortify</button>}
            {gameState.gameType === 'fallOfRome' && <button disabled={!canRecruitArmy || pawnToMove.id !== currentPlayer.id} onClick={() => onAction('RecruitArmy')} className="bg-red-800 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Recruit Army</button>}
            {gameState.gameType === 'fallOfRome' && (
              <button 
                disabled={!canBattle || pawnToMove.id !== currentPlayer.id} 
                onClick={() => {
                    playSound('battle');
                    onInitiateBattle();
                }} 
                className="bg-red-900 hover:bg-red-800 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold"
              >
                Battle
              </button>
            )}
            {gameState.gameType === 'fallOfRome' && <button disabled={!canEnlistBarbarians || pawnToMove.id !== currentPlayer.id} onClick={onInitiateEnlistBarbarians} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Enlist Barbarians</button>}
            {gameState.gameType !== 'fallOfRome' && <button disabled={!inActionPhase || pawnToMove.id !== currentPlayer.id} onClick={onInitiateTreatDisease} className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Treat Disease</button>}
            <button disabled={!inActionPhase || pawnToMove.id !== currentPlayer.id} onClick={onInitiateShareKnowledge} className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">
              {gameState.gameType === 'fallOfRome' ? 'Plot' : 'Share'}
            </button>
            <button
              disabled={!inActionPhase || !canCureDisease() || pawnToMove.id !== currentPlayer.id}
              onClick={onInitiateCureDisease}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold"
            >
              {T.discoverCure}
            </button>
            {isContingencyPlanner && <button disabled={!inActionPhase || !canTakeEvent || pawnToMove.id !== currentPlayer.id} onClick={onInitiateTakeEventCard} className="bg-lime-600 hover:bg-lime-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Take Event</button>}
            {currentPlayer.role === PlayerRole.OperationsExpert && <button disabled={!canExpertFlight || pawnToMove.id !== currentPlayer.id} onClick={onInitiateExpertFlight} className="bg-pink-600 hover:bg-pink-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Expert Flight</button>}
            {currentPlayer.role === PlayerRole.Pilot && <button disabled={!inActionPhase || !canPilotFlight} onClick={() => onAction('PilotFlight', { destination: selectedCity })} className="bg-slate-500 hover:bg-slate-400 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Pilot Flight</button>}
            {currentPlayer.role === PlayerRole.Dispatcher && <button disabled={!inActionPhase || isSpecialOrdersActive} onClick={onInitiateDispatchSummon} className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Summon Pawn</button>}
            {currentPlayer.role === PlayerRole.Archivist && <button disabled={!canRetrieveCard || pawnToMove.id !== currentPlayer.id} onClick={() => onAction('RetrieveCard')} className="bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Retrieve Card</button>}
            {currentPlayer.role === PlayerRole.FieldOperative && <button disabled={!canCollectSample || pawnToMove.id !== currentPlayer.id} onClick={onInitiateCollectSample} className="bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Collect Sample</button>}
            {currentPlayer.role === PlayerRole.LocalLiaison && <button disabled={!canLocalLiaisonShare || pawnToMove.id !== currentPlayer.id} onClick={onInitiateLocalLiaisonShare} className="bg-rose-600 hover:bg-rose-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold">Liaison Share</button>}
        </div>
        <div className="grid grid-cols-1 gap-y-2 mt-2">
            {currentPlayer.role === PlayerRole.Epidemiologist && <button disabled={!canTakeCardAsEpidemiologist || pawnToMove.id !== currentPlayer.id} onClick={onInitiateEpidemiologistTake} className="bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold w-full">Take Card (Free)</button>}
            {currentPlayer.role === PlayerRole.FieldDirector && <button disabled={!canUseFieldDirectorMove} onClick={onInitiateFieldDirectorMove} className="bg-rose-600 hover:bg-rose-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold w-full">Move Pawn (Free)</button>}
            {currentPlayer.role === PlayerRole.Virologist && <button disabled={!canVirologistTreat} onClick={onInitiateVirologistTreat} className="bg-violet-600 hover:bg-violet-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold w-full">Virologist Treat</button>}
            {currentPlayer.role === PlayerRole.Mercator && (
                <button
                    disabled={!canUseMercatorShare || pawnToMove.id !== currentPlayer.id}
                    onClick={onInitiateMercatorShare}
                    className="bg-teal-700 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold w-full"
                >
                    Share Card (Mercator)
                </button>
            )}
            {currentPlayer.role === PlayerRole.ReginaFoederata && (
                <button
                    disabled={!canUseFreeEnlist}
                    onClick={onInitiateFreeEnlistBarbarians}
                    className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold w-full"
                >
                    Enlist Barbarians (Free)
                </button>
            )}
            {isConsul && gameState.gameType === 'fallOfRome' && (
                <>
                    <button
                        disabled={!canConsulPlaceLegionInCity || pawnToMove.id !== currentPlayer.id}
                        onClick={() => onAction('ConsulPlaceLegionInCity')}
                        className="bg-stone-600 hover:bg-stone-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold w-full"
                    >
                        Place Legion (Here)
                    </button>
                    <button
                        disabled={!canConsulPlaceLegionAtFort || pawnToMove.id !== currentPlayer.id}
                        onClick={() => onAction('ConsulPlaceLegionAtFort', { city: selectedCity })}
                        className="bg-stone-600 hover:bg-stone-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold w-full"
                    >
                        Place Legion (Fort)
                    </button>
                </>
            )}
            {isPraefectusClassis && gameState.gameType === 'fallOfRome' && (
                <button
                    disabled={!canPraefectusRecruit}
                    onClick={onInitiatePraefectusRecruit}
                    className="bg-sky-700 hover:bg-sky-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold w-full"
                >
                    Recruit Legions (Port)
                </button>
            )}
             {isPraefectusFabrum && gameState.gameType === 'fallOfRome' && (
                 <>
                    <button
                        disabled={!canBuildFortWithLegions}
                        onClick={onInitiateBuildFortWithLegions}
                        className="bg-yellow-800 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold w-full"
                    >
                        Build Fort (Legions)
                    </button>
                    <button
                        disabled={!canFabrumFlight}
                        onClick={() => onInitiateFabrumFlight(selectedCity)}
                        className="bg-indigo-700 hover:bg-indigo-600 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold w-full"
                    >
                        Fortress Transit
                    </button>
                 </>
            )}
        </div>
        <div className="text-xs text-center mt-2 text-gray-400">
            Selected: {selectedCity 
                ? CITIES_DATA[selectedCity].name 
                : selectedConnection 
                    ? `${CITIES_DATA[selectedConnection.from].name} ↔ ${CITIES_DATA[selectedConnection.to].name}`
                  : selectedRegion
                    ? `Region ${selectedRegion}`
                    : 'None'
            }
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
            <button disabled={!inActionPhase} onClick={onEndTurn} className="bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed p-2 rounded text-white font-bold w-full">End Turn</button>
            <button disabled={!inActionPhase || gameState.actionHistory.length === 0} onClick={onUndoAction} className="bg-gray-500 hover:bg-gray-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed p-2 rounded text-white font-bold w-full">Undo Action</button>
        </div>
      </div>
      <div className="bg-gray-900 p-3 rounded-lg">
        <h3 className="font-orbitron text-yellow-400 mb-2">Display and Sound Options</h3>
        <div className="space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Show All City Names</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showCityNames}
                  onChange={(e) => onToggleShowCityNames(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-green-500"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
              </div>
            </label>
             <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Sound Effects</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isSoundEnabled}
                  onChange={(e) => onToggleSoundEffects(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-green-500"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
              </div>
            </label>
        </div>
      </div>
      <div className="bg-gray-900 p-3 rounded-lg flex-grow flex flex-col">
          <h3 className="font-orbitron text-cyan-400 mb-2">Event Log</h3>
          <div className="flex-grow h-24 overflow-y-auto bg-black bg-opacity-20 p-2 rounded">{gameState.log.map((entry, index) => <p key={index} className="text-xs text-gray-300 leading-tight">{entry}</p>)}</div>
      </div>
    </div>
  );
};

export default Dashboard;
