import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GamePhase, Player, CityName, PlayerCard, InfectionCard, DiseaseColor, PlayerRole, CITIES_DATA, CONNECTIONS, PANDEMIC_INFECTION_RATES, FALLOFROME_INVASION_RATES, FALLOFROME_RECRUITMENT_RATES, GameSetupConfig, EventCardName, ALL_EVENT_CARDS, VirulentStrainEpidemicCardName, VIRULENT_STRAIN_EPIDEMIC_INFO, MutationEventCardName, MUTATION_EVENT_CARD_INFO, PANDEMIC_CITIES_DATA, FALLOFROME_CITIES_DATA, FALLOFROME_MIGRATION_PATHS, FALLOFROME_PORT_CITIES, IBERIA_PORT_CITIES, FALLOFROME_ALLIANCE_CARD_REQUIREMENTS, InfectionResult, FALLOFROME_INITIAL_CUBE_COUNTS, BattleModalState, BattleDieResult, ShareOption, isFallOfRomeDiseaseColor, FALLOFROME_DISEASE_COLORS, PANDEMIC_ROLES, FALLOFROME_ROLES, IBERIA_ROLES, IBERIA_EVENTS, IBERIA_CITIES_DATA, IBERIA_SEA_CONNECTIONS, IBERIA_REGIONS, IBERIA_CITY_TO_REGIONS_MAP } from '../types';
import { shuffle, deepClone, safeCloneGameState, isReachableByTrain } from '../utils';
import { generateEpidemicReport, generateCureDiscoveredReport, generateOutbreakReport, generateGameOverReport, generateEradicationReport } from '../services/geminiService';
import { getCardDisplayName, InfectionResultList } from './ui';
import { RemoteTreatmentSelection, PANDEMIC_EVENTS, FALLOFROME_EVENTS, ResolvingVaeVictis } from '../types';
import { playSound } from '../services/soundService';

// Duplicating this from App.tsx for use within the hook
function hasWon(gameState: GameState): boolean {
    if (gameState.gameType === 'fallOfRome') {
        return FALLOFROME_DISEASE_COLORS.every(tribe => {
            const isAllied = gameState.curedDiseases[tribe];
            const isEliminated = gameState.remainingCubes[tribe] === FALLOFROME_INITIAL_CUBE_COUNTS[tribe];
            return isAllied || isEliminated;
        });
    }

    if (gameState.setupConfig.useMutationChallenge) {
        const regularCured = [DiseaseColor.Blue, DiseaseColor.Yellow, DiseaseColor.Black, DiseaseColor.Red].every(c => gameState.curedDiseases[c]);
        const noPurpleCubes = gameState.remainingCubes.purple === 12;
        if ((regularCured && noPurpleCubes) || (gameState.curedDiseases.purple && regularCured)) {
            return true;
        }
    } else {
        const colors = [DiseaseColor.Blue, DiseaseColor.Yellow, DiseaseColor.Black, DiseaseColor.Red];
        return colors.every(c => gameState.curedDiseases[c]);
    }
    return false;
}

const initialBattleModalState: BattleModalState = {
    isOpen: false,
    step: 'chooseDice',
    maxDice: 0,
    diceToRoll: 1,
    results: [],
    legionsLost: 0,
    barbariansToRemove: 0,
    selectedCubes: {},
    legionsToAdd: 0,
};

export const useGameLogic = () => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [battleModalState, setBattleModalState] = useState<BattleModalState>(initialBattleModalState);

    // This ref is for internal logic within the hook/app, doesn't need to be exposed.
    const discardTriggerRef = useRef<'action' | 'draw' | null>(null);
    
    // Exposed UI state
    const [modalContent, setModalContent] = useState<{ title: string; body: React.ReactNode; color?: string; permanent?: boolean } | null>(null);
    const [drawnPlayerCards, setDrawnPlayerCards] = useState<PlayerCard[] | null>(null);
    const [infectionStepState, setInfectionStepState] = useState<{ queue: InfectionCard[]; revealedCard: InfectionCard | null; outbreaksThisTurn: Set<CityName>, invadedCity: CityName | null }>({ queue: [], revealedCard: null, outbreaksThisTurn: new Set(), invadedCity: null });
    const [intensifyModalOpen, setIntensifyModalOpen] = useState(false);

    const _handleNursePostMove = (gs: GameState, movedPawn: Player): void => {
        if (movedPawn.role === PlayerRole.Nurse) {
            gs.phaseBeforeEvent = gs.gamePhase;
            gs.gamePhase = GamePhase.NursePlacingPreventionToken;
        }
    };

    const handleNurseTokenPlacement = (region: string) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.NursePlacingPreventionToken) return prevState;
            const newState = safeCloneGameState(prevState);
            const nurse = newState.players.find(p => p.role === PlayerRole.Nurse);
            if (!nurse) return prevState;
    
            newState.nursePreventionTokenLocation = region;
            newState.log.unshift(`- ${nurse.name} (Nurse) places their prevention token in Region ${region}.`);
    
            if (newState.phaseBeforeEvent === GamePhase.Setup) {
                // This was the initial setup placement. Now, start the game.
                const firstPlayer = newState.players[newState.firstPlayerIndex];
                newState.currentPlayerIndex = newState.firstPlayerIndex;
                newState.actionsRemaining = firstPlayer.role === PlayerRole.Generalist ? 5 : 4;
                newState.gamePhase = GamePhase.PlayerAction;
                newState.log.unshift(`- It is now ${firstPlayer.name}'s turn.`);
            } else {
                // This was a mid-turn placement after a move.
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            }
            
            newState.phaseBeforeEvent = null;
            return newState;
        });
    };

    const logEvent = useCallback((message: string) => {
        setGameState(prevState => {
            if (!prevState) return null;
            return { ...prevState, log: [`- ${message}`, ...prevState.log].slice(0, 50) };
        });
    }, []);

    // The two functions below are mutually recursive. They are defined as function declarations
    // so they are hoisted and can call each other regardless of order.
    function _performOutbreak(gs: GameState, city: CityName, color: DiseaseColor, outbreaksInTurn: Set<CityName>, newlyOutbrokenCities: CityName[], isFromOverflow: boolean, outbreakResults: InfectionResult[]): void {
        if (outbreaksInTurn.has(city) || gs.gamePhase === GamePhase.GameOver) return;
        
        if (gs.infectionZoneBanPlayerId !== null && newlyOutbrokenCities.length > 0) {
            gs.log.unshift(`- Infection Zone Ban prevents chain reaction outbreak in ${CITIES_DATA[city].name}.`);
            return;
        }
    
        if (gs.gameType === 'fallOfRome' && city === 'Roma') {
            gs.gamePhase = GamePhase.GameOver;
            gs.gameOverReason = 'Roma has been sacked!';
            gs.log.unshift(`- GAME OVER: Roma has been sacked!`);
            return;
        }
    
        const isChainReaction = newlyOutbrokenCities.length > 0;
    
        const isSlipperySlope = gs.activeVirulentStrainCards.includes(VirulentStrainEpidemicCardName.SlipperySlope) && gs.virulentStrainColor === color;
        gs.outbreakCounter += isSlipperySlope ? 2 : 1;
        gs.log.unshift(`- OUTBREAK in ${CITIES_DATA[city].name}!`);
        outbreaksInTurn.add(city);
        newlyOutbrokenCities.push(city);
    
        if (gs.gameType === 'fallOfRome') {
                const fortIndex = gs.forts.indexOf(city);
                if (fortIndex > -1) {
                    gs.forts.splice(fortIndex, 1);
                    gs.log.unshift(`- The fort in ${CITIES_DATA[city].name} has been sacked and removed!`);
                }
            }
    
        if (gs.outbreakCounter >= 8) { gs.gamePhase = GamePhase.GameOver; gs.gameOverReason = 'The outbreak limit has been reached.'; return; }
        
        const isHighlyContagious = gs.activeVirulentStrainCards.includes(VirulentStrainEpidemicCardName.HighlyContagious) && gs.virulentStrainColor === color;
        
        const neighbors = CONNECTIONS[city];
        for (let i = 0; i < neighbors.length; i++) {
            const neighbor = neighbors[i];
            if (gs.gamePhase === GamePhase.ResolvingPurificationChoice) return; // Halt if a previous infection in this chain paused the game
    
            if (isHighlyContagious && !isChainReaction) {
                gs.log.unshift(`- Highly Contagious effect triggers!`);
                if(outbreaksInTurn.has(neighbor)) continue;
                const cubesInNeighbor = gs.diseaseCubes[neighbor]?.[color] || 0;
                const cubesToAdd = (cubesInNeighbor >= 2) ? 3 : 2;
                gs.log.unshift(`- Highly Contagious adds ${cubesToAdd} cube(s) to ${CITIES_DATA[neighbor].name}.`);
                
                for (let j = 0; j < cubesToAdd; j++) {
                    if (gs.gamePhase === GamePhase.GameOver || gs.gamePhase === GamePhase.ResolvingPurificationChoice) break;
                    _performInfection(gs, neighbor, color, outbreaksInTurn, newlyOutbrokenCities, 1, outbreakResults);
                    if (gs.gamePhase === GamePhase.ResolvingPurificationChoice) {
                        // An infection needs a choice. We must pause the outbreak.
                        gs.infectionContinuation = {
                            type: 'outbreak',
                            city: city,
                            color: color,
                            remaining: 0, // Not used for outbreaks
                            outbreakRemainingNeighbors: neighbors.slice(i + 1),
                            outbreaksInTurn: Array.from(outbreaksInTurn),
                            newlyOutbrokenCities: newlyOutbrokenCities,
                            outbreakOriginalColor: color
                        };
                        return; // Stop the outbreak process
                    }
                }
    
            } else {
                _performInfection(gs, neighbor, color, outbreaksInTurn, newlyOutbrokenCities, 1, outbreakResults);
                if (gs.gamePhase === GamePhase.ResolvingPurificationChoice) {
                    // An infection needs a choice. We must pause the outbreak.
                    gs.infectionContinuation = {
                        type: 'outbreak',
                        city: city,
                        color: color,
                        remaining: 0,
                        outbreakRemainingNeighbors: neighbors.slice(i + 1),
                        outbreaksInTurn: Array.from(outbreaksInTurn),
                        newlyOutbrokenCities: newlyOutbrokenCities,
                        outbreakOriginalColor: color,
                    };
                    return; // Stop the outbreak process
                }
            }
        }
    }

    function _performInfection(gs: GameState, city: CityName, color: DiseaseColor, outbreaksInTurn: Set<CityName>, newlyOutbrokenCities: CityName[], cubesToAdd: number = 1, outbreakResults?: InfectionResult[]): InfectionResult {
        const result: InfectionResult = { city, color, defended: false, defenseType: null, legionsRemoved: 0, cubesAdded: 0, outbreak: false };
        if (gs.gamePhase === GamePhase.GameOver) {
            if (outbreakResults) outbreakResults.push(result);
            return result;
        }
        if (gs.gameType === 'iberia' && gs.nursePreventionTokenLocation) {
            const adjacentRegions = IBERIA_CITY_TO_REGIONS_MAP[city] || [];
            if (adjacentRegions.includes(gs.nursePreventionTokenLocation)) {
                gs.log.unshift(`- Nurse's prevention token in Region ${gs.nursePreventionTokenLocation} protects ${CITIES_DATA[city].name} from infection.`);
                result.nurseDefense = { region: gs.nursePreventionTokenLocation };
                if (outbreakResults) outbreakResults.push(result);
                return result;
            }
        }
        if (gs.eradicatedDiseases[color]) {
            gs.log.unshift(`- Eradicated ${color} disease has no effect on ${CITIES_DATA[city].name}.`);
            if (outbreakResults) outbreakResults.push(result);
            return result;
        }
        if (_isQuarantined(gs, city)) { 
            gs.log.unshift(`- Quarantine Specialist protects ${CITIES_DATA[city].name} from infection.`); 
            if (outbreakResults) outbreakResults.push(result);
            return result; 
        }
        if (gs.curedDiseases[color] && gs.players.some(p => p.role === PlayerRole.Medic && p.location === city)) { 
            gs.log.unshift(`- Medic in ${CITIES_DATA[city].name} prevents infection.`); 
            if (outbreakResults) outbreakResults.push(result);
            return result; 
        }
    
        // --- NEW IBERIA: PURIFICATION LOGIC ---
        if (gs.gameType === 'iberia') {
            const adjacentRegions = IBERIA_CITY_TO_REGIONS_MAP[city] || [];
            const regionsWithTokens = adjacentRegions.filter(regionName => (gs.purificationTokens[regionName] || 0) > 0);
    
            if (regionsWithTokens.length > 0) {
                if (regionsWithTokens.length === 1) {
                    const regionToUse = regionsWithTokens[0];
                    gs.purificationTokens[regionToUse]--;
                    gs.purificationTokenSupply++;
                    gs.log.unshift(`- A purification token from Region ${regionToUse} prevents 1 ${color} cube placement in ${CITIES_DATA[city].name}.`);
                    result.purificationDefense = { region: regionToUse };
                    // Cube placement is prevented. We're done for this cube.
                    return result;
                } else {
                    // Multiple regions available. Pause for player choice.
                    gs.phaseBeforePurificationChoice = gs.gamePhase;
                    gs.gamePhase = GamePhase.ResolvingPurificationChoice;
                    gs.pendingPurificationChoice = {
                        city,
                        color,
                        availableRegions: regionsWithTokens,
                        outbreaksInTurnAsArray: Array.from(outbreaksInTurn),
                        newlyOutbrokenCities: newlyOutbrokenCities,
                    };
                    // The function must stop here. The caller will check the phase and halt.
                    return result; // Return a neutral result for now.
                }
            }
        }
    
        // Fall of Rome: Defend a City rule
        if (gs.gameType === 'fallOfRome') {
            const legionsInCity = (gs.legions || []).filter(l => l === city).length;
            if (legionsInCity > 0) {
                result.defended = true;
                const isSupported = gs.players.some(p => p.location === city) || (gs.forts || []).includes(city);
                
                if (isSupported) {
                    result.defenseType = 'attack';
                    result.legionsRemoved = 1;
                    const legionIndex = gs.legions.indexOf(city);
                    if (legionIndex > -1) gs.legions.splice(legionIndex, 1);
                    gs.log.unshift(`- Supported legions in ${CITIES_DATA[city].name} defend against the ${color} invasion! One legion is lost.`);
                } else {
                    result.defenseType = 'ambush';
                    const originalLegionCount = gs.legions.length;
                    gs.legions = gs.legions.filter(l => l !== city);
                    const legionsRemoved = originalLegionCount - gs.legions.length;
                    result.legionsRemoved = legionsRemoved;
                    gs.log.unshift(`- AMBUSH! Unsupported legions in ${CITIES_DATA[city].name} are defeated by the ${color} invasion! All ${legionsRemoved} legions are lost.`);
                }
                if (outbreakResults) outbreakResults.push(result);
                return result;
            }
        }
    
        if (gs.remainingCubes[color] < cubesToAdd) {
            gs.gamePhase = GamePhase.GameOver;
            gs.gameOverReason = `Ran out of ${color} disease cubes. Not enough cubes in the supply to infect ${CITIES_DATA[city].name}.`;
            gs.log.unshift(`- GAME OVER: Ran out of ${color} cubes.`);
            if (outbreakResults) outbreakResults.push(result);
            return result;
        }
    
        const currentCubes = gs.diseaseCubes[city]?.[color] || 0;
        
        if (currentCubes + cubesToAdd < 4) {
            gs.remainingCubes[color] -= cubesToAdd;
            if (!gs.diseaseCubes[city]) gs.diseaseCubes[city] = {};
            gs.diseaseCubes[city]![color] = currentCubes + cubesToAdd;
            result.cubesAdded = cubesToAdd;
        } else { 
            const cubesToReachThree = 3 - currentCubes;
            const overflow = cubesToAdd - cubesToReachThree;
            gs.remainingCubes[color] -= cubesToReachThree;
            if (!gs.diseaseCubes[city]) gs.diseaseCubes[city] = {};
            gs.diseaseCubes[city]![color] = 3;
            result.cubesAdded = cubesToReachThree;
            result.outbreak = true;
    
            const isNewChain = !outbreakResults;
            const resultsCollector = isNewChain ? [] : outbreakResults!;
    
            _performOutbreak(gs, city, color, outbreaksInTurn, newlyOutbrokenCities, overflow > 0, resultsCollector);
            
            if (isNewChain) {
                gs.outbreakResults = resultsCollector;
            }
        }
        if (outbreakResults) outbreakResults.push(result);
        return result;
    }

    const handlePurificationChoice = (regionName: string) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingPurificationChoice || !prevState.pendingPurificationChoice) {
                return prevState;
            }
            const newState = safeCloneGameState(prevState);
            const { city, color, outbreaksInTurnAsArray, newlyOutbrokenCities } = newState.pendingPurificationChoice;
    
            // 1. Use the token
            newState.purificationTokens[regionName] = (newState.purificationTokens[regionName] || 1) - 1;
            newState.purificationTokenSupply++;
            newState.log.unshift(`- A purification token from Region ${regionName} prevents 1 ${color} cube placement in ${CITIES_DATA[city].name}.`);

            // 2. Create and store the result for the modal
            const result: InfectionResult = {
                city,
                color,
                defended: false,
                defenseType: null,
                legionsRemoved: 0,
                cubesAdded: 0,
                outbreak: false,
                purificationDefense: { region: regionName }
            };

            const continuation = newState.infectionContinuation;
            if (continuation) {
                // If this choice was part of a larger chain (epidemic or outbreak)
                if (continuation.type === 'epidemic') {
                    newState.epidemicInfectionResults.push(result);
                } else if (continuation.type === 'outbreak') {
                    newState.outbreakResults.push(result);
                }
            } else {
                // This was a regular infection step that was paused
                newState.lastInfectionResult = result;
            }
    
            // 3. Clean up state
            newState.gamePhase = newState.phaseBeforePurificationChoice || GamePhase.PlayerAction;
            newState.phaseBeforePurificationChoice = null;
            newState.pendingPurificationChoice = null;
            newState.infectionContinuation = null;
    
            const outbreaksInTurn = new Set(outbreaksInTurnAsArray);
    
            // 4. Resume the infection process based on what was interrupted
            if (continuation) {
                switch (continuation.type) {
                    case 'epidemic':
                        // Place remaining cubes for the epidemic
                        for (let i = 0; i < continuation.remaining; i++) {
                            if (newState.gamePhase === GamePhase.GameOver) break;
                            _performInfection(newState, continuation.city, continuation.color, outbreaksInTurn, newlyOutbrokenCities, 1, newState.epidemicInfectionResults);
                            if (newState.gamePhase === GamePhase.ResolvingPurificationChoice) {
                                // Another choice is needed. Update continuation and pause again.
                                newState.infectionContinuation = { ...continuation, remaining: continuation.remaining - 1 - i };
                                return newState;
                            }
                        }
                        // If all remaining cubes were placed without another pause, proceed to Intensify.
                        newState.gamePhase = GamePhase.EpidemicAnnounceInfect; // This will show the card and results again briefly
                        break;
    
                    case 'outbreak':
                        // Process remaining neighbors from the outbreak
                        const remainingNeighbors = continuation.outbreakRemainingNeighbors || [];
                        for (let i = 0; i < remainingNeighbors.length; i++) {
                            const neighbor = remainingNeighbors[i];
                             if (newState.gamePhase === GamePhase.GameOver) break;
                            _performInfection(newState, neighbor, continuation.color, outbreaksInTurn, newlyOutbrokenCities, 1, newState.outbreakResults);
                            if (newState.gamePhase === GamePhase.ResolvingPurificationChoice) {
                                // Another choice needed. Update continuation and pause again.
                                newState.infectionContinuation = { ...continuation, outbreakRemainingNeighbors: remainingNeighbors.slice(i + 1) };
                                return newState;
                            }
                        }
                        // Outbreak continuation finished. The game logic will naturally proceed.
                        break;
                }
            }
            
            // If it was a regular infection ('infectionContinuation' is null), the useEffect for InfectionStep will automatically handle the next card.
    
            return newState;
        });
    };

    const _startNextTurn = useCallback((gs: GameState): GameState => {
        const currentGs = safeCloneGameState(gs);
        if (currentGs.gamePhase === GamePhase.GameOver) return currentGs;
        
        const nextPlayerIndex = (currentGs.currentPlayerIndex + 1) % currentGs.players.length;
        const nextPlayer = currentGs.players[nextPlayerIndex];
    
        // Check for Commercial Travel Ban expiry
        if (currentGs.commercialTravelBanPlayerId === nextPlayer.id) {
            currentGs.commercialTravelBanPlayerId = null;
            currentGs.log.unshift(`- Commercial Travel Ban expires.`);
        }
        if (currentGs.infectionZoneBanPlayerId === nextPlayer.id) {
            currentGs.infectionZoneBanPlayerId = null;
            currentGs.log.unshift(`- Infection Zone Ban expires.`);
        }
        if (currentGs.improvedSanitationPlayerId === nextPlayer.id) {
            currentGs.improvedSanitationPlayerId = null;
            currentGs.log.unshift(`- Improved Sanitation expires.`);
        }
        if (currentGs.sequencingBreakthroughPlayerId === nextPlayer.id) {
            currentGs.sequencingBreakthroughPlayerId = null;
            currentGs.log.unshift(`- Sequencing Breakthrough expires.`);
        }

        let newActions = nextPlayer.role === PlayerRole.Generalist ? 5 : 4;
    
        if (currentGs.extraActionsForNextTurn > 0) {
            newActions += currentGs.extraActionsForNextTurn;
            currentGs.log.unshift(`- ${nextPlayer.name} starts their turn with ${currentGs.extraActionsForNextTurn} extra action(s) from Borrowed Time!`);
            currentGs.extraActionsForNextTurn = 0;
        }
    
        if (currentGs.mobileHospitalActiveThisTurn) {
            currentGs.log.unshift(`- Mobile Hospital effect expires.`);
        }
        currentGs.mobileHospitalActiveThisTurn = false;

        currentGs.currentPlayerIndex = nextPlayerIndex;
        currentGs.actionsRemaining = newActions;
    
        currentGs.hasUsedOperationsExpertFlight = false;
        currentGs.hasUsedArchivistRetrieve = false;
        currentGs.hasUsedEpidemiologistAbility = false;
        currentGs.hasUsedFieldOperativeCollect = false;
        currentGs.hasUsedTroubleshooterPreview = false;
        currentGs.hasUsedFieldDirectorMove = false;
        currentGs.hasUsedLocalLiaisonShare = false;
        currentGs.hasUsedMercatorShare = false;
        currentGs.hasUsedReginaFoederataFreeEnlist = false;
        currentGs.hasUsedRailwaymanDoubleBuild = false; 
        currentGs.pendingRailwaymanBuild = null;
        currentGs.specialOrdersControlledPawnId = null;
        currentGs.actionHistory = [];
        currentGs.selectedCity = nextPlayer.location;
        currentGs.treatedVSCitiesThisTurn = [];
        currentGs.pendingVaeVictisContext = null;
        currentGs.aleaIactaEstStatus = 'inactive';
    
        currentGs.log.unshift(`- Turn ends. It is now ${nextPlayer.name}'s turn.`);

        if (nextPlayer.role === PlayerRole.Troubleshooter) {
            currentGs.gamePhase = GamePhase.ResolvingTroubleshooterPreview;
        } else {
            currentGs.gamePhase = GamePhase.PlayerAction;
        }
        
        return currentGs;
    }, []);
    
    const _checkForEradication = (gs: GameState, color: DiseaseColor) => {
        if (gs.gameType === 'fallOfRome' || gs.gameType === 'iberia') {
            return; // Eradication does not apply in Fall of Rome
        }
        const totalCubes = color === DiseaseColor.Purple ? 12 : 24;
        if (gs.curedDiseases[color] && !gs.eradicatedDiseases[color] && gs.remainingCubes[color] === totalCubes) {
            gs.eradicatedDiseases[color] = true;
            const message = `The ${color} disease has been ERADICATED!`;
            gs.log.unshift(`- ${message}`);
            generateEradicationReport(color, gs.useAiNarratives).then(report => {
                setModalContent({
                    title: "DISEASE ERADICATED!",
                    body: report || message,
                    color: "text-cyan-300"
                });
            });
        }
    };

    const _isQuarantined = (gs: GameState, city: CityName): boolean => gs.players.some(p => p.role === PlayerRole.QuarantineSpecialist && (p.location === city || CONNECTIONS[p.location].includes(city)));
    
    const _canMoveFrom = (gs: GameState, pawn: Player): boolean => {
        if (!gs.activeVirulentStrainCards.includes(VirulentStrainEpidemicCardName.GovernmentInterference)) return true;
        
        const cityCubes = gs.diseaseCubes[pawn.location];
        if (!cityCubes || !gs.virulentStrainColor || (cityCubes[gs.virulentStrainColor] || 0) === 0) {
            return true;
        }
        // If we are here, GovernmentInterference is active and pawn is in a city with VS cubes.
        return gs.treatedVSCitiesThisTurn.includes(pawn.location);
    };

    const _handleMedicAutoTreat = (gs: GameState, player: Player): void => {
        if (player.role !== PlayerRole.Medic) return;
        const cityCubes = gs.diseaseCubes[player.location];
        if (!cityCubes) return;
        (Object.keys(gs.curedDiseases) as DiseaseColor[]).forEach(color => {
            if (gs.curedDiseases[color] && cityCubes[color] && cityCubes[color]! > 0) {
                const cubesToRemove = cityCubes[color]!;
                gs.remainingCubes[color] += cubesToRemove;
                cityCubes[color] = 0;
                gs.log.unshift(`- ${player.name} (Medic) automatically clears ${cubesToRemove} ${color} cube(s) from ${CITIES_DATA[player.location].name}.`);
                _checkForEradication(gs, color);
            }
        });
    };

    const _handlePostMoveEffects = (gs: GameState, pawnMoved: Player, moveType: 'Drive/Ferry' | 'Other'): void => {
        // 1. Containment Specialist ability (triggers for any moved pawn, on any move type)
        if (pawnMoved.role === PlayerRole.ContainmentSpecialist) {
            const cityCubes = gs.diseaseCubes[pawnMoved.location];
            if (cityCubes) {
                (Object.keys(cityCubes) as DiseaseColor[]).forEach(color => {
                    // Check again inside loop in case a previous removal changed the state
                    if (cityCubes[color] && cityCubes[color]! >= 2) {
                        cityCubes[color]! -= 1;
                        gs.remainingCubes[color as DiseaseColor] += 1;
                        gs.log.unshift(`- ${pawnMoved.name} (Containment Specialist) contains a ${color} disease cube in ${CITIES_DATA[pawnMoved.location].name}.`);
                    }
                });
            }
        }
    
        // 2. Mobile Hospital event (triggers ONLY for Drive/Ferry actions by the current player)
        if (gs.mobileHospitalActiveThisTurn && moveType === 'Drive/Ferry') {
            const cityCubes = gs.diseaseCubes[pawnMoved.location] || {};
            const availableColors = (Object.keys(cityCubes) as DiseaseColor[]).filter(c => cityCubes[c]! > 0);
    
            if (availableColors.length === 1) {
                const color = availableColors[0];
                gs.diseaseCubes[pawnMoved.location]![color]!--;
                gs.remainingCubes[color]++;
                gs.log.unshift(`- Mobile Hospital effect removes one ${color} cube from ${CITIES_DATA[pawnMoved.location].name}.`);
                _checkForEradication(gs, color);
            } else if (availableColors.length > 1) {
                // Pause the game flow for user input via modal
                gs.gamePhase = GamePhase.ResolvingMobileHospital;
                gs.cityForMobileHospital = pawnMoved.location;
            }
        }
    
        // 3. Medic auto-treat (triggers for any moved pawn, on any move type)
        _handleMedicAutoTreat(gs, pawnMoved);
    };

    const handleStartGame = (config: GameSetupConfig, hostId: number | null): GameState => {
        const isFallOfRome = config.gameType === 'fallOfRome';
        const initialLocation = isFallOfRome ? 'Roma' : 'Atlanta';

        const players: Player[] = Array.from({ length: config.numPlayers }, (_, i) => ({
            id: i,
            name: config.playerNames[i] || `Player ${i + 1}`,
            role: null, // Roles assigned when game starts from lobby
            location: initialLocation,
            hand: [],
            contingencyCard: null,
            samples: {},
            isOnline: i === (hostId ?? 0), // Host is online by default
        }));

        const remainingCubes: { [key in DiseaseColor]: number } = {
            [DiseaseColor.Blue]: 24,
            [DiseaseColor.Yellow]: 24,
            [DiseaseColor.Black]: 24,
            [DiseaseColor.Red]: 24,
            [DiseaseColor.Purple]: 0,
            [DiseaseColor.White]: 24,
            [DiseaseColor.Green]: 24,
            [DiseaseColor.Orange]: 24,
        };

        const curedDiseases: { [key in DiseaseColor]: boolean } = {
            [DiseaseColor.Blue]: false,
            [DiseaseColor.Yellow]: false,
            [DiseaseColor.Black]: false,
            [DiseaseColor.Red]: false,
            [DiseaseColor.Purple]: false,
            [DiseaseColor.White]: false,
            [DiseaseColor.Green]: false,
            [DiseaseColor.Orange]: false,
        };

        const eradicatedDiseases: { [key in DiseaseColor]: boolean } = {
            [DiseaseColor.Blue]: false,
            [DiseaseColor.Yellow]: false,
            [DiseaseColor.Black]: false,
            [DiseaseColor.Red]: false,
            [DiseaseColor.Purple]: false,
            [DiseaseColor.White]: false,
            [DiseaseColor.Green]: false,
            [DiseaseColor.Orange]: false,
        };

        const initialGameState: GameState = {
            gameId: '', // Will be set by Firebase service
            gameMode: config.gameMode,
            gameStatus: config.gameMode === 'multiplayer' ? 'lobby' : 'playing',
            hostId: hostId ?? 0,
            setupConfig: config, // Store the config
            gameType: config.gameType,
            players,
            gamePhase: GamePhase.Setup,
            // Initialize other fields with placeholder/default values
            gameOverReason: null, currentPlayerIndex: 0, actionsRemaining: 0, researchStations: [initialLocation], outbreakCounter: 0, infectionRateIndex: 0,
            recruitmentRateIndex: 0,
            diseaseCubes: {},
            remainingCubes,
            curedDiseases,
            eradicatedDiseases,
            playerDeck: [], playerDiscard: [], eventDeck: [], infectionDeck: [], infectionDiscard: [], oneQuietNightActive: false, goodSeasonsActive: false, pendingGovernmentMobilization: null, log: ["- Game lobby created. Waiting for players..."], lastEventMessage: null, playerToDiscardId: null, pendingEpidemicCard: null,
            phaseBeforeEvent: null, pendingPurifyWaterEvent: null, pendingRingRailroadsEvent: null, 
            hasUsedOperationsExpertFlight: false, hasUsedArchivistRetrieve: false, hasUsedEpidemiologistAbility: false, hasUsedFieldOperativeCollect: false, hasUsedTroubleshooterPreview: false, hasUsedFieldDirectorMove: false, hasUsedLocalLiaisonShare: false, hasUsedMercatorShare: false, hasUsedReginaFoederataFreeEnlist: false,
            unusedRoles: [], extraActionsForNextTurn: 0, mobileHospitalActiveThisTurn: false, cityForMobileHospital: null, postCureColor: null, specialOrdersControlledPawnId: null,
            epidemicCardToAnnounce: null,
            commercialTravelBanPlayerId: null,
            pilotFlightDestination: null,
            infectionZoneBanPlayerId: null,
            improvedSanitationPlayerId: null,
            sequencingBreakthroughPlayerId: null,
            stationRelocationTargetCity: null,
            stationRelocationTrigger: null,
            pendingEventCardForModal: null,
            pendingEvent: null,
            pendingVestalisDraw: null,
            pendingVestalisPlayerCardDraw: null,
            pendingVaeVictisContext: null,
            forts: [],
            fortRelocationTargetCity: null,
            legions: [],
            railroads: [],
            hospitals: {
                [DiseaseColor.Blue]: null,
                [DiseaseColor.Yellow]: null,
                [DiseaseColor.Black]: null,
                [DiseaseColor.Red]: null,
            },
            virulentStrainColor: null,
            activeVirulentStrainCards: [],
            treatedVSCitiesThisTurn: [],
            pendingMutationEvents: [],
            mutationEventResult: null,
            actionHistory: [], useAiNarratives: config.useAiNarratives, selectedCity: initialLocation,
            lastInfectionResult: null,
            epidemicInfectionResults: [],
            outbreakResults: [],
            firstPlayerIndex: 0,
        };
        // We return the pre-game state. Final setup happens in `finalizeGameSetup`.
        return initialGameState;
    };
    
    const finalizeGameSetup = (lobbyState: GameState): GameState => {
        const newState = safeCloneGameState(lobbyState);
        const config = newState.setupConfig; // Use the stored config
        
        let roles: PlayerRole[];
        let availableRoles: PlayerRole[];
        switch (config.gameType) {
            case 'fallOfRome':
                availableRoles = FALLOFROME_ROLES;
                break;
            case 'iberia':
                availableRoles = IBERIA_ROLES;
                break;
            case 'pandemic':
            default:
                availableRoles = PANDEMIC_ROLES;
                break;
        }

        if (config.roleSelection === 'random') {
            roles = shuffle(availableRoles).slice(0, config.numPlayers);
        } else if (config.roleSelection === 'pool') {
            roles = shuffle(config.rolePool).slice(0, config.numPlayers);
        } else { // Manual
            roles = config.roles;
        }
        
        // In multiplayer, roles are selected in the lobby. For now, we'll assign randomly.
        // This will be replaced with lobby role selection logic later.
        if (newState.gameMode === 'multiplayer') {
             roles = shuffle(availableRoles).slice(0, config.numPlayers);
        }
        
        newState.players.forEach((p, i) => p.role = roles[i]);
        
        const usedRoles = new Set(newState.players.map(p => p.role));
        newState.unusedRoles = availableRoles.filter(r => !usedRoles.has(r));

        const isFallOfRome = config.gameType === 'fallOfRome';

        if (config.gameType === 'iberia') {
            newState.purificationTokenSupply = 14;
            newState.purificationTokens = {}; // Also initialize the placed tokens map
        }
        
        newState.remainingCubes = {
            [DiseaseColor.Blue]: 0, [DiseaseColor.Yellow]: 0, [DiseaseColor.Black]: 0,
            [DiseaseColor.Red]: 0, [DiseaseColor.Purple]: 0, [DiseaseColor.White]: 0,
            [DiseaseColor.Green]: 0, [DiseaseColor.Orange]: 0,
        };

        if (isFallOfRome) {
            newState.remainingCubes[DiseaseColor.Orange] = FALLOFROME_INITIAL_CUBE_COUNTS[DiseaseColor.Orange];
            newState.remainingCubes[DiseaseColor.Black] = FALLOFROME_INITIAL_CUBE_COUNTS[DiseaseColor.Black];
            newState.remainingCubes[DiseaseColor.Green] = FALLOFROME_INITIAL_CUBE_COUNTS[DiseaseColor.Green];
            newState.remainingCubes[DiseaseColor.White] = FALLOFROME_INITIAL_CUBE_COUNTS[DiseaseColor.White];
            newState.remainingCubes[DiseaseColor.Blue] = FALLOFROME_INITIAL_CUBE_COUNTS[DiseaseColor.Blue];
        } else { // pandemic
            newState.remainingCubes[DiseaseColor.Blue] = 24;
            newState.remainingCubes[DiseaseColor.Yellow] = 24;
            newState.remainingCubes[DiseaseColor.Black] = 24;
            newState.remainingCubes[DiseaseColor.Red] = 24;
        }
        
        const cityCards: PlayerCard[] = [];
        switch (config.gameType) {
            case 'fallOfRome':
                (Object.keys(FALLOFROME_CITIES_DATA) as (keyof typeof FALLOFROME_CITIES_DATA)[]).forEach(cityName => {
                    const cityData = FALLOFROME_CITIES_DATA[cityName];
                    cityData.boardColors?.forEach(color => {
                        cityCards.push({ type: 'city', name: cityName, color: color });
                    });
                });
                break;
            case 'iberia':
                (Object.keys(IBERIA_CITIES_DATA) as (keyof typeof IBERIA_CITIES_DATA)[]).forEach(cityName => {
                    const cityData = IBERIA_CITIES_DATA[cityName];
                    cityCards.push({ type: 'city', name: cityName, color: cityData.color });
                });
                break;
            case 'pandemic':
            default:
                (Object.keys(PANDEMIC_CITIES_DATA) as (keyof typeof PANDEMIC_CITIES_DATA)[]).forEach(cityName => {
                    const cityData = PANDEMIC_CITIES_DATA[cityName];
                    cityCards.push({ type: 'city', name: cityName, color: cityData.color });
                });
                break;
        }
        
        let eventCards: PlayerCard[] = [];
            if (config.numEvents > 0) {
                let eventCardNames: EventCardName[];
                let availableEvents: EventCardName[];
                switch (config.gameType) {
                    case 'fallOfRome':
                        availableEvents = FALLOFROME_EVENTS;
                        break;
                    case 'iberia':
                        availableEvents = IBERIA_EVENTS;
                        break;
                    case 'pandemic':
                    default:
                        availableEvents = PANDEMIC_EVENTS;
                        break;
                }

                if (config.eventSelection === 'random') {
                    eventCardNames = shuffle(availableEvents).slice(0, config.numEvents);
                } else if (config.eventSelection === 'pool') {
                eventCardNames = shuffle(config.eventPool).slice(0, config.numEvents);
                } else { // Manual
                eventCardNames = config.events;
                }
                eventCards = eventCardNames.map(name => ({ type: 'event', name }));
            }

        let playerDeck = shuffle([...cityCards, ...eventCards]);
        
        const initialHandSizes: { [key: number]: number } = { 2: 4, 3: 3, 4: 2, 5: 2 };
        const handSize = initialHandSizes[config.numPlayers];
        newState.players.forEach(p => { p.hand = playerDeck.splice(0, handSize); });
        
        // --- MUTATION CHALLENGE SETUP ---
        if (config.useMutationChallenge) {
            newState.remainingCubes[DiseaseColor.Purple] = 12;
            newState.infectionDiscard.push({ type: 'mutation' }, { type: 'mutation' });

            const mutationEvents: PlayerCard[] = [
                { type: 'mutation_event', name: MutationEventCardName.MutationThreatens },
                { type: 'mutation_event', name: MutationEventCardName.MutationSpreads },
                { type: 'mutation_event', name: MutationEventCardName.MutationIntensifies },
            ];
            playerDeck.push(...mutationEvents);
            playerDeck = shuffle(playerDeck);
            newState.log.unshift(`- MUTATION challenge is active! 3 Mutation Event cards shuffled into the Player Deck.`);
        }

        let firstPlayerIndex = 0;
        if (config.firstPlayerRule === 'highestPopulation') {
            const playerPops = newState.players.map(player => {
                const cityCardsInHand = player.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];
                if (cityCardsInHand.length === 0) return { playerId: player.id, playerName: player.name, maxPop: 0, city: 'N/A' };
                const highestPopCard = cityCardsInHand.reduce((highest, card) => CITIES_DATA[card.name].population > CITIES_DATA[highest.name].population ? card : highest);
                return { playerId: player.id, playerName: player.name, maxPop: CITIES_DATA[highestPopCard.name].population, city: CITIES_DATA[highestPopCard.name].name };
            });
            playerPops.sort((a, b) => b.maxPop - a.maxPop);
            firstPlayerIndex = playerPops[0].playerId;
        } else if (config.firstPlayerRule === 'farthestFromRoma') {
            let maxDistance = -1;
            let playerWithFarthestCity = -1;

            newState.players.forEach(player => {
                const cityCardsInHand = player.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];
                
                cityCardsInHand.forEach(card => {
                    const cityData = CITIES_DATA[card.name];
                    if (cityData.distanceFromRoma !== undefined && cityData.distanceFromRoma > maxDistance) {
                        maxDistance = cityData.distanceFromRoma;
                        playerWithFarthestCity = player.id;
                    }
                });
            });

            if (playerWithFarthestCity !== -1) {
                firstPlayerIndex = playerWithFarthestCity;
            } else {
                firstPlayerIndex = Math.floor(Math.random() * newState.players.length);
            }
        } else if (config.firstPlayerRule === 'random') {
            firstPlayerIndex = Math.floor(Math.random() * newState.players.length);
        } else { // Player 1
            firstPlayerIndex = 0;
        }
        newState.firstPlayerIndex = firstPlayerIndex;
        
        const epidemicCards: PlayerCard[] = config.useVirulentStrainChallenge
            ? shuffle(Object.values(VirulentStrainEpidemicCardName)).slice(0, config.numEpidemics).map(name => ({ type: 'virulent_strain_epidemic', name }))
            : Array(config.numEpidemics).fill({ type: 'epidemic' });
            
        const piles: PlayerCard[][] = [];
        const deckToDivide = [...playerDeck];
        const baseSize = Math.floor(deckToDivide.length / config.numEpidemics);
        let remainder = deckToDivide.length % config.numEpidemics;
        for (let i = 0; i < config.numEpidemics; i++) {
            const size = baseSize + (remainder-- > 0 ? 1 : 0);
            const pile = deckToDivide.splice(0, size);
            pile.push(epidemicCards.shift()!);
            piles.push(shuffle(pile));
        }
        newState.playerDeck = piles.flat();
        
        // Vestalis Setup
        const isVestalisInGame = newState.players.some(p => p.role === PlayerRole.Vestalis);
        newState.eventDeck = []; 
        if (isVestalisInGame) {
            const usedEventNames = new Set(
                eventCards.map(c => (c as PlayerCard & { type: 'event' }).name)
            );
            const unusedEventCards: PlayerCard[] = FALLOFROME_EVENTS
                .filter(eventName => !usedEventNames.has(eventName))
                .map(eventName => ({ type: 'event', name: eventName }));
            newState.eventDeck = shuffle(unusedEventCards);
            newState.log.unshift(`- The Vestalis is in play. An Event Deck with ${newState.eventDeck.length} cards has been created.`);
        }
        
        // --- START: Replacement for Initial Infection Setup ---
        switch (config.gameType) {
            case 'fallOfRome': {
                newState.forts.push('Roma');
                newState.log.unshift(`- A fort has been established in Roma.`);
                
                const allInvasionCards: (InfectionCard & { type: 'city' })[] = [];
                (Object.keys(FALLOFROME_CITIES_DATA) as (keyof typeof FALLOFROME_CITIES_DATA)[]).forEach(cityName => {
                    const cityData = FALLOFROME_CITIES_DATA[cityName];
                    cityData.boardColors?.forEach(color => {
                        allInvasionCards.push({ type: 'city', name: cityName, color: color });
                    });
                });
        
                const romaCards = allInvasionCards.filter(card => card.name === 'Roma');
                let remainingCards = allInvasionCards.filter(card => card.name !== 'Roma');
                newState.infectionDiscard.push(...romaCards);
                newState.log.unshift(`- The 5 Roma invasion cards have been placed in the discard pile.`);
        
                const initialInvasionTargets: { name: CityName; color: DiseaseColor }[] = [
                    { name: 'Mogontiacum', color: DiseaseColor.Black }, { name: 'Philippopolis', color: DiseaseColor.Green },
                    { name: 'Chersonesus', color: DiseaseColor.Blue }, { name: 'Gesoriacum', color: DiseaseColor.Orange },
                    { name: 'Mogontiacum', color: DiseaseColor.Orange }, { name: 'Tyras', color: DiseaseColor.White },
                    { name: 'Carnuntum', color: DiseaseColor.Green }, { name: 'Carnuntum', color: DiseaseColor.Blue },
                    { name: 'Philippopolis', color: DiseaseColor.White },
                ];
                const initialInvasionCards: (InfectionCard & { type: 'city' })[] = [];
                initialInvasionTargets.forEach(target => {
                    const cardIndex = remainingCards.findIndex(card => card.name === target.name && card.color === target.color);
                    if (cardIndex > -1) {
                        const [foundCard] = remainingCards.splice(cardIndex, 1);
                        initialInvasionCards.push(foundCard);
                    }
                });
        
                const shuffledInitialCards = shuffle(initialInvasionCards);
                for (let i = 3; i > 0; i--) {
                    for (let j = 0; j < 3; j++) {
                        const card = shuffledInitialCards.pop();
                        if (card) {
                            newState.infectionDiscard.push(card);
                            if (!newState.diseaseCubes[card.name]) newState.diseaseCubes[card.name] = {};
                            newState.diseaseCubes[card.name]![card.color] = i;
                            newState.remainingCubes[card.color] -= i;
                        }
                    }
                }
                newState.infectionDeck = shuffle(remainingCards);
                break;
            }
        
            case 'iberia': {
                newState.researchStations.push('Lisboa'); // Iberia's starting city
                const iberiaCityKeys = Object.keys(IBERIA_CITIES_DATA) as (keyof typeof IBERIA_CITIES_DATA)[];
                const infectionCards: InfectionCard[] = iberiaCityKeys.map(cn => {
                    const cityData = IBERIA_CITIES_DATA[cn];
                    return { type: 'city', name: cn, color: cityData.color };
                });
                newState.infectionDeck = shuffle(infectionCards);
        
                for (let i = 3; i > 0; i--) {
                    for (let j = 0; j < 3; j++) {
                        const card = newState.infectionDeck.pop()!;
                        if (card.type === 'city') {
                            newState.infectionDiscard.push(card);
                            if (!newState.diseaseCubes[card.name]) newState.diseaseCubes[card.name] = {};
                            newState.diseaseCubes[card.name]![card.color] = i;
                            newState.remainingCubes[card.color] -= i;
                        }
                    }
                }
                break;
            }
        
            case 'pandemic':
            default: {
                newState.researchStations.push('Atlanta');
                const pandemicCityKeys = Object.keys(PANDEMIC_CITIES_DATA) as (keyof typeof PANDEMIC_CITIES_DATA)[];
                const infectionCards: InfectionCard[] = pandemicCityKeys.map(cn => {
                    const cityData = PANDEMIC_CITIES_DATA[cn];
                    return { type: 'city', name: cn, color: cityData.color };
                });
                newState.infectionDeck = shuffle(infectionCards);
                
                for (let i = 3; i > 0; i--) {
                    for (let j = 0; j < 3; j++) {
                        const card = newState.infectionDeck.pop()!;
                        if (card.type === 'city') {
                            newState.infectionDiscard.push(card);
                            if (!newState.diseaseCubes[card.name]) newState.diseaseCubes[card.name] = {};
                            newState.diseaseCubes[card.name]![card.color] = i;
                            newState.remainingCubes[card.color] -= i;
                        }
                    }
                }
                break;
            }
        }
        // --- END: Replacement for Initial Infection Setup ---
        
        // --- START: Replacement for First Turn Setup ---
        switch (config.gameType) {
            case 'fallOfRome':
            case 'iberia':
                newState.currentPlayerIndex = 0; // First player starts choosing
                newState.gamePhase = GamePhase.ChoosingStartingCity;
                newState.log = [`- Game started! Players will now choose their starting cities.`, ...newState.log];
                break;
        
            case 'pandemic':
            default: {
                const firstPlayer = newState.players[firstPlayerIndex];
                newState.currentPlayerIndex = firstPlayerIndex;
                newState.actionsRemaining = firstPlayer.role === PlayerRole.Generalist ? 5 : 4;
                newState.gamePhase = firstPlayer.role === PlayerRole.Troubleshooter ? GamePhase.ResolvingTroubleshooterPreview : GamePhase.PlayerAction;
                newState.log = [`- Game started! It is ${firstPlayer.name}'s turn.`, ...newState.log];
                break;
            }
        }
        // --- END: Replacement for First Turn Setup ---
        newState.gameStatus = 'playing';
        if (config.useVirulentStrainChallenge) {
            newState.log.unshift(`- VIRULENT STRAIN challenge is active!`);
        }
        return newState;
    };


    const getHandLimit = (player: Player) => player.role === PlayerRole.Archivist ? 8 : 7;
    
    const handleAction = useCallback((action: string, payload: any, dispatcherTargetId: number | null) => {
        setGameState(prevState => {
            const allowedPhases = [GamePhase.PlayerAction, GamePhase.ResolvingFieldDirectorTreat, GamePhase.ConfirmingRoyalAcademyScientistForecast, GamePhase.ResolvingRuralDoctorTreat]; 
            if (!prevState || !allowedPhases.includes(prevState.gamePhase) || (prevState.gamePhase === GamePhase.PlayerAction && prevState.actionsRemaining <= 0)) {
                return prevState;
            }
            
            const snapshot = safeCloneGameState(prevState);
            // Intentionally don't save history in the snapshot itself.
            const { actionHistory, ...stateToSave } = snapshot;
            const newState = safeCloneGameState(prevState);
            if (action !== 'Battle') {
                newState.pendingVaeVictisContext = null;
            }

            const player = newState.players[newState.currentPlayerIndex];
            const pawnToMoveId = dispatcherTargetId !== null ? dispatcherTargetId : player.id;
            const pawnToMove = newState.players.find((p: Player) => p.id === pawnToMoveId)!;
            const isActingOnOtherPawn = pawnToMove.id !== player.id;
            const isPilotControllingSelf = player.role === PlayerRole.Pilot && pawnToMove.id === player.id;
            
            let actionTaken = false;
            let isFreeAction = false;

            const checkHandLimit = (gs: GameState, p: Player) => {
                if (p.hand.length > getHandLimit(p)) {
                    gs.playerToDiscardId = p.id;
                    gs.gamePhase = GamePhase.Discarding;
                    discardTriggerRef.current = 'action';
                    gs.log.unshift(`- ${p.name} is over the hand limit and must discard.`);
                }
            };
            
            // Movement checks
            if (['Drive', 'DirectFlight', 'CharterFlight', 'ShuttleFlight', 'ExpertFlight', 'PilotFlight', 'DispatcherSummon', 'Sail'].includes(action)) {
                 if (!_canMoveFrom(newState, pawnToMove)) {
                    logEvent(`Government Interference prevents ${pawnToMove.name} from leaving ${CITIES_DATA[pawnToMove.location].name} without treating the Virulent Strain first.`);
                    return prevState;
                }
            }
            
            switch(action) {
                case 'Drive': {
                    if (isPilotControllingSelf) break;

                    const startCity = pawnToMove.location;
                    const destinationCity = payload.destination;

                    pawnToMove.location = destinationCity;

                    if (newState.gameType === 'fallOfRome') {
                        const legionsToMove = payload.legionsToMove || 0;
                        const barbariansToMove = payload.barbariansToMove as { [key in DiseaseColor]?: number } | undefined;
                        const logParts: string[] = [];

                        if (legionsToMove > 0) {
                            let removedCount = 0;
                            const newLegions: CityName[] = [];
                            (newState.legions || []).forEach(l => {
                                if (l === startCity && removedCount < legionsToMove) { removedCount++; } else { newLegions.push(l); }
                            });
                            for (let i = 0; i < legionsToMove; i++) { newLegions.push(destinationCity); }
                            newState.legions = newLegions;
                            logParts.push(`${legionsToMove} legion(s)`);
                        }

                        if (barbariansToMove && Object.values(barbariansToMove).some(c => c > 0)) {
                            let totalBarbariansMoved = 0;
                            Object.entries(barbariansToMove).forEach(([color, count]) => {
                                if (count && count > 0) {
                                    if (!newState.diseaseCubes[startCity]) newState.diseaseCubes[startCity] = {};
                                    newState.diseaseCubes[startCity]![color as DiseaseColor] = (newState.diseaseCubes[startCity]![color as DiseaseColor] || 0) - count;
                                    if (!newState.diseaseCubes[destinationCity]) newState.diseaseCubes[destinationCity] = {};
                                    newState.diseaseCubes[destinationCity]![color as DiseaseColor] = (newState.diseaseCubes[destinationCity]![color as DiseaseColor] || 0) + count;
                                    totalBarbariansMoved += count;
                                }
                            });
                            if (totalBarbariansMoved > 0) {
                                logParts.push(`${totalBarbariansMoved} barbarian(s)`);
                            }
                        }
                        
                        const takingStr = logParts.length > 0 ? `, taking ${logParts.join(' and ')}` : '';
                        newState.log.unshift(`- ${player.name} ${isActingOnOtherPawn ? `moves ${pawnToMove.name}` : 'marches'} to ${CITIES_DATA[destinationCity].name}${takingStr}.`);
                    } else { // Pandemic
                        newState.log.unshift(`- ${player.name} ${isActingOnOtherPawn ? `moves ${pawnToMove.name}` : 'drives'} to ${CITIES_DATA[destinationCity].name}.`);
                    }

                    _handlePostMoveEffects(newState, pawnToMove, 'Drive/Ferry');
                    _handleNursePostMove(newState, pawnToMove);
                    if (newState.gameType === 'pandemic') {playSound('driveferry')};
                    if (newState.gameType === 'fallOfRome') {playSound('march')};
                    actionTaken = true;
                    break;
                }
                case 'Sail': {
                    if (!['fallOfRome', 'iberia'].includes(newState.gameType)) break;
                
                    const { destination, cardToDiscard, legionsToMove, barbariansToMove, passengerId } = payload as { 
                        destination: CityName, 
                        cardToDiscard?: PlayerCard & { type: 'city' }, 
                        legionsToMove?: number, 
                        barbariansToMove?: { [key in DiseaseColor]?: number },
                        passengerId?: number,
                    };
                    const actualLegionsToMove = Math.min(legionsToMove || 0, 3);
                    const startCity = pawnToMove.location;
                
                    const isPraefectusSail = newState.gameType === 'fallOfRome' && player.role === PlayerRole.PraefectusClassis && player.id === pawnToMove.id && !cardToDiscard;
                    const isSailorSail = newState.gameType === 'iberia' && player.role === PlayerRole.Sailor && player.id === pawnToMove.id;
                
                    let logParts: string[] = [];
                    let takingStr = '';
                
                    if (isPraefectusSail) {
                        logParts.push(`(Praefectus Classis) uses their ability to sail`);
                    } else if (isSailorSail) {
                        logParts.push(`(Sailor) uses their ability to sail`);
                    } else {
                        if (!cardToDiscard) { logEvent(`Error: Sail action requires a card to discard.`); break; }
                        const cardIndex = player.hand.findIndex(c => c.type === 'city' && c.name === cardToDiscard.name && c.color === cardToDiscard.color);
                        if (cardIndex === -1) { logEvent(`Error: ${player.name} does not have the required card for Sail action.`); break; }
                        
                        const [discarded] = player.hand.splice(cardIndex, 1);
                        newState.playerDiscard.push(discarded);
                        logParts.push(`${isActingOnOtherPawn ? `sails ${pawnToMove.name}` : 'sails'}`, `discarding a ${getCardDisplayName(cardToDiscard)} card`);
                    }
                    
                    pawnToMove.location = destination;
                    
                    // Handle passenger for Sailor
                    const passenger = (isSailorSail && passengerId !== undefined && passengerId !== null) ? newState.players.find(p => p.id === passengerId) : null;
                    let passengerLog = '';
                    if (passenger) {
                        passenger.location = destination;
                        passengerLog = ` with ${passenger.name}`;
                        _handlePostMoveEffects(newState, passenger, 'Other');
                        _handleNursePostMove(newState, passenger);
                    }
                
                    // Handle legions/barbarians for Fall of Rome
                    if (newState.gameType === 'fallOfRome') {
                        if (actualLegionsToMove > 0) {
                            // ... (rest of legion moving logic, no changes needed here) ...
                        }
                        if (barbariansToMove && Object.values(barbariansToMove).some(c => c > 0)) {
                            // ... (rest of barbarian moving logic, no changes needed here) ...
                        }
                    }
                    
                    newState.log.unshift(`- ${player.name} ${logParts.join(' ')} from ${CITIES_DATA[startCity].name} to ${CITIES_DATA[destination].name}${takingStr.length > 0 ? `, taking ${takingStr}` : ''}${passengerLog}.`);
                
                    _handlePostMoveEffects(newState, pawnToMove, 'Other');
                    _handleNursePostMove(newState, pawnToMove);
                    playSound('sail')
                    actionTaken = true;
                    break;
                }

                case 'Train': {
                    if (newState.gameType !== 'iberia') break;
                    const { destination, passengerId } = payload as { destination: CityName, passengerId?: number };
                
                    if (!isReachableByTrain(pawnToMove.location, destination, newState.railroads)) {
                        logEvent(`${pawnToMove.name} cannot move by train to ${CITIES_DATA[destination].name} as there is no continuous railroad path.`);
                        break;
                    }
                
                    const passenger = (passengerId !== undefined) ? newState.players.find(p => p.id === passengerId) : null;
                    let passengerLog = '';
                
                    pawnToMove.location = destination;
                    
                    if (pawnToMove.role === PlayerRole.Railwayman && passenger) {
                        passenger.location = destination;
                        passengerLog = ` with ${passenger.name}`;
                        _handlePostMoveEffects(newState, passenger, 'Other');
                    }
                
                    newState.log.unshift(`- ${pawnToMove.name} moves by train to ${CITIES_DATA[destination].name}${passengerLog}.`);
                    _handlePostMoveEffects(newState, pawnToMove, 'Other');
                    _handleNursePostMove(newState, pawnToMove);
                    playSound('train');
                    actionTaken = true;
                    break;
                }

                case 'DirectFlight': {
                    if (isPilotControllingSelf) break;
                    const cardIndex = player.hand.findIndex((c: PlayerCard) => c.type === 'city' && c.name === payload.destination);
                    if (cardIndex > -1) {
                        if (player.role === PlayerRole.Troubleshooter) {
                            newState.log.unshift(`- ${player.name} (Troubleshooter) reveals a ${CITIES_DATA[payload.destination].name} card for a Direct Flight ${isActingOnOtherPawn ? `to move ${pawnToMove.name}`: ''} to ${CITIES_DATA[payload.destination].name}.`);
                        } else {
                            const [card] = player.hand.splice(cardIndex, 1);
                            newState.playerDiscard.push(card);
                            newState.log.unshift(`- ${player.name} uses a direct flight ${isActingOnOtherPawn ? `to move ${pawnToMove.name}`: ''} to ${CITIES_DATA[payload.destination].name}.`);
                        }
                        pawnToMove.location = payload.destination;
                        _handlePostMoveEffects(newState, pawnToMove, 'Other');
                        playSound('directflight');
                        actionTaken = true;
                    }
                    break;
                }
                case 'CharterFlight': {
                    if (isPilotControllingSelf) break;
                    const cardIndex = player.hand.findIndex((c: PlayerCard) => c.type === 'city' && c.name === pawnToMove.location);
                    if (cardIndex > -1 && payload.destination) { 
                        const [card] = player.hand.splice(cardIndex, 1);
                        newState.playerDiscard.push(card);
                        pawnToMove.location = payload.destination; 
                        newState.log.unshift(`- ${player.name} uses a charter flight ${isActingOnOtherPawn ? `to move ${pawnToMove.name}`: ''} to ${CITIES_DATA[payload.destination].name}.`);
                        _handlePostMoveEffects(newState, pawnToMove, 'Other');
                        playSound('directflight');
                        actionTaken = true; 
                    } break;
                }
                case 'ShuttleFlight': { 
                    if (isPilotControllingSelf) break;
                    pawnToMove.location = payload.destination; 
                    newState.log.unshift(`- ${player.name} uses a shuttle flight ${isActingOnOtherPawn ? `to move ${pawnToMove.name}`: ''} to ${CITIES_DATA[payload.destination].name}.`); 
                    _handlePostMoveEffects(newState, pawnToMove, 'Other');
                    playSound('directflight');
                    actionTaken = true; 
                    break; 
                }
                 case 'ExpertFlight': {
                    const { destination, cardName } = payload;
                    const cardIndex = player.hand.findIndex((c: PlayerCard) => c.type === 'city' && c.name === cardName);
                    if (cardIndex > -1) {
                        const [card] = player.hand.splice(cardIndex, 1);
                        newState.playerDiscard.push(card);
                        player.location = destination;
                        newState.hasUsedOperationsExpertFlight = true;
                        newState.log.unshift(`- ${player.name} uses an Expert Flight to ${CITIES_DATA[destination].name}.`);
                        _handlePostMoveEffects(newState, player, 'Other');
                        playSound('directflight');
                        actionTaken = true;
                    }
                    break;
                }
                case 'PilotFlight': {
                    const { destination } = payload;
                    const potentialPassengers = newState.players.filter(p => p.id !== player.id && p.location === player.location);

                    if (potentialPassengers.length === 0) {
                        // No passengers, move directly
                        player.location = destination;
                        newState.log.unshift(`- ${player.name} (Pilot) flies solo to ${CITIES_DATA[destination].name}.`);
                        _handlePostMoveEffects(newState, player, 'Other');
                        playSound('directflight');
                        actionTaken = true;
                    } else {
                        // Passengers exist, enter selection phase
                        newState.pilotFlightDestination = destination;
                        newState.gamePhase = GamePhase.ResolvingPilotFlight;
                        // Action is not consumed yet, it will be on confirm.
                    }
                    break;
                }
                case 'BuildStation': {
                    if (player.role === PlayerRole.Pilot) break;
                    if (newState.gameType === 'fallOfRome') break;
                    
                    const canBuildByCard = player.hand.some(c => c.type === 'city' && c.name === player.location);
                    const canBuildAsExpert = player.role === PlayerRole.OperationsExpert;

                    if (!canBuildByCard && !canBuildAsExpert) {
                        logEvent(`${player.name} cannot build a station in ${CITIES_DATA[player.location].name} without the matching city card.`);
                        break;
                    }

                    if (newState.researchStations.length >= 6) {
                        newState.gamePhase = GamePhase.ResolvingStationRelocation;
                        newState.stationRelocationTargetCity = player.location;
                        newState.stationRelocationTrigger = 'action';
                        logEvent(`All stations are on the board. ${player.name} must choose a station to move.`);
                        break; // Don't consume action yet
                    }

                    if (canBuildAsExpert) {
                        newState.researchStations.push(player.location);
                        newState.log.unshift(`- ${player.name} (Operations Expert) builds a station in ${CITIES_DATA[player.location].name}.`);
                        playSound('buildresearchstation');
                        actionTaken = true;
                    } else { // Must be by card
                        const cardIndex = player.hand.findIndex((c: PlayerCard) => c.type === 'city' && c.name === player.location);
                        if (cardIndex > -1) {
                            const [card] = player.hand.splice(cardIndex, 1);
                            newState.playerDiscard.push(card);
                            newState.researchStations.push(player.location);
                            newState.log.unshift(`- ${player.name} builds a station in ${CITIES_DATA[player.location].name}.`);
                            actionTaken = true;
                        }
                    }
                    break;
                }
                case 'Fortify': {
                    if (player.role === PlayerRole.Pilot) break;
                    if (newState.gameType !== 'fallOfRome') break;
                    if (newState.forts.includes(player.location)) break;
                
                    const hasCard = player.hand.some(c => c.type === 'city' && c.name === player.location);
                    if (!hasCard) {
                        logEvent(`${player.name} cannot fortify ${CITIES_DATA[player.location].name} without the matching city card.`);
                        break;
                    }
                
                    const cardIndex = player.hand.findIndex((c: PlayerCard) => c.type === 'city' && c.name === player.location);
                    if (cardIndex === -1) break;
                
                    if (newState.forts.length < 6) {
                        const [card] = player.hand.splice(cardIndex, 1);
                        newState.playerDiscard.push(card);
                        newState.forts.push(player.location);
                        newState.log.unshift(`- ${player.name} fortifies ${CITIES_DATA[player.location].name}.`);
                        playSound('fortify')
                        actionTaken = true;
                    } else { // Fort supply is empty, must relocate
                        const [card] = player.hand.splice(cardIndex, 1);
                        newState.playerDiscard.push(card);
                        newState.gamePhase = GamePhase.ResolvingFortRelocation;
                        newState.fortRelocationTargetCity = player.location;
                        logEvent(`All forts are on the board. ${player.name} must choose a fort to move.`);
                        actionTaken = true; // Still consumes the action
                    }
                    break;
                }
                
                case 'BuildHospital': {
                    if (newState.gameType !== 'iberia') break;
                    
                    const city = player.location;
                    const cityData = CITIES_DATA[city];
                    const cityColor = cityData.color;
                
                    // Rule: Can't build non-standard color hospitals
                    if (cityColor === DiseaseColor.Purple || cityColor === DiseaseColor.White || cityColor === DiseaseColor.Green || cityColor === DiseaseColor.Orange) {
                        logEvent(`Cannot build a hospital in a city of color ${cityColor}.`);
                        break;
                    }
                
                    // Rule: Must have the matching city card
                    const cardIndex = player.hand.findIndex(c => c.type === 'city' && c.name === city);
                    if (cardIndex === -1) {
                        logEvent(`${player.name} cannot build a hospital in ${cityData.name} without the city card.`);
                        break;
                    }
                
                    const oldLocation = newState.hospitals[cityColor];
                
                    // Build or move the hospital
                    newState.hospitals = {
                        ...newState.hospitals,
                        [cityColor]: city,
                    };
                    
                    // Discard the card
                    const [card] = player.hand.splice(cardIndex, 1);
                    newState.playerDiscard.push(card);
                
                    // Log the event
                    if (oldLocation) {
                        newState.log.unshift(`- ${player.name} moves the ${cityColor} hospital from ${CITIES_DATA[oldLocation].name} to ${cityData.name}.`);
                    } else {
                        newState.log.unshift(`- ${player.name} builds the ${cityColor} hospital in ${cityData.name}.`);
                    }
                    
                    playSound('buildresearchstation'); // We can reuse the same sound effect for now
                    actionTaken = true;
                    break;
                }
                    
                case 'RecruitArmy': {
                    if (newState.gameType !== 'fallOfRome') break;
                    if (!newState.forts.includes(player.location)) break;
                
                    const recruitmentRate = FALLOFROME_RECRUITMENT_RATES[newState.recruitmentRateIndex];
                    const availableLegions = 16 - newState.legions.length;
                
                    if (availableLegions <= 0) {
                        logEvent("No legions available in the supply to recruit.");
                        break;
                    }
                
                    const legionsToRecruit = Math.min(recruitmentRate, availableLegions);
                
                    for (let i = 0; i < legionsToRecruit; i++) {
                        newState.legions.push(player.location);
                    }
                
                    newState.log.unshift(`- ${player.name} recruits ${legionsToRecruit} legion(s) in ${CITIES_DATA[player.location].name}.`);
                    playSound('recruitarmy')
                    actionTaken = true;
                    break;
                }
                case 'Battle': {
                    if (newState.gameType !== 'fallOfRome') break;
                    const city = player.location;
                    const { legionsLost, barbariansToRemove, legionsToAdd } = payload as { 
                        legionsLost: number; 
                        barbariansToRemove: { [key in DiseaseColor]?: number };
                        legionsToAdd?: number;
                    };

                    // 1. Resolve Legion Losses
                    const legionsInCity = newState.legions.filter(l => l === city).length;
                    const actualLegionsLost = Math.min(legionsLost, legionsInCity);
                    if (actualLegionsLost > 0) {
                        let removedCount = 0;
                        const newLegions: CityName[] = [];
                        newState.legions.forEach(l => {
                            if (l === city && removedCount < actualLegionsLost) {
                                removedCount++;
                            } else {
                                newLegions.push(l);
                            }
                        });
                        newState.legions = newLegions;
                        newState.log.unshift(`- Battle losses: ${actualLegionsLost} legion(s) removed from ${CITIES_DATA[city].name}.`);
                    }

                    // 2. Resolve Barbarian Removals
                    let totalRemoved = 0;
                    const removedLogParts: string[] = [];
                    if (barbariansToRemove && Object.keys(barbariansToRemove).length > 0) {
                        (Object.keys(barbariansToRemove) as DiseaseColor[]).forEach(color => {
                            if (isFallOfRomeDiseaseColor(color)) {
                                const countToRemove = barbariansToRemove[color] || 0;
                                if (countToRemove > 0 && newState.diseaseCubes[city]?.[color]) {
                                    const currentCubes = newState.diseaseCubes[city]![color]!;
                                    const actualRemoved = Math.min(countToRemove, currentCubes);
                                    
                                    newState.diseaseCubes[city]![color]! -= actualRemoved;
                                    newState.remainingCubes[color] += actualRemoved;
                                    totalRemoved += actualRemoved;
                                    if (actualRemoved > 0) {
                                        removedLogParts.push(`${actualRemoved} ${color}`);
                                    }
                                }
                            }
                        });
                    }

                    if (totalRemoved > 0) {
                        newState.pendingVaeVictisContext = { maxToRemove: totalRemoved };
                    } else {
                        newState.pendingVaeVictisContext = null;
                    }
                    
                    if (totalRemoved > 0) {
                        newState.log.unshift(`- Battle victory: ${totalRemoved} barbarian(s) removed from ${CITIES_DATA[city].name} (${removedLogParts.join(', ')}).`);
                    } else {
                        newState.log.unshift(`- No barbarians were removed in the battle.`);
                    }
                    
                    // 3. Resolve Legion Gains (Consul, Regina Foederata)
                    if (legionsToAdd && legionsToAdd > 0) {
                        const availableInSupply = 16 - (newState.legions?.length || 0);
                        const actualLegionsAdded = Math.min(legionsToAdd, availableInSupply);
                        if (actualLegionsAdded > 0) {
                            for (let i = 0; i < actualLegionsAdded; i++) {
                                newState.legions.push(city);
                            }
                            newState.log.unshift(`- Special ability adds ${actualLegionsAdded} legion(s) to ${CITIES_DATA[city].name}.`);
                        } else {
                            newState.log.unshift(`- Special ability failed to add legions: supply is empty.`);
                        }
                    }
                    
                    playSound('battle')
                    actionTaken = true;
                    newState.actionHistory = []; // Battle is irreversible
                    logEvent(`The outcome of the battle is final. Previous actions this turn cannot be undone.`);

                    if (hasWon(newState)) {
                        newState.gamePhase = GamePhase.GameOver;
                        newState.gameOverReason = 'All barbarian threats have been contained. Rome is saved!';
                        newState.log.unshift(`- VICTORY! ${newState.gameOverReason}`);
                    }
                    break;
                }
                case 'TreatDisease': {
                    const { city, color } = payload;
                    
                    if (player.role === PlayerRole.RuralDoctor) {
                        const cityCubes = newState.diseaseCubes[city];
                        if (!cityCubes || !cityCubes[color] || cityCubes[color]! <= 0) break;
                        
                        // 1. Remove the first cube from the current city
                        cityCubes[color]!--;
                        newState.remainingCubes[color]++;
                        newState.log.unshift(`- ${player.name} (Rural Doctor) removes 1 ${color} cube from their city, ${CITIES_DATA[city].name}.`);
                        
                        // 2. Calculate all valid targets for the second cube removal
                        const secondCubeTargets: { city: CityName; color: DiseaseColor }[] = [];
                        
                        // Option A: The current city (if it still has cubes of that color)
                        if ((newState.diseaseCubes[city]?.[color] || 0) > 0) {
                            secondCubeTargets.push({ city, color });
                        }
                        
                        // Option B: Cities that share a region with the player's city
                        const currentRegions = new Set(IBERIA_CITY_TO_REGIONS_MAP[player.location] || []);
                        
                        (Object.keys(IBERIA_CITIES_DATA) as CityName[]).forEach(cityName => {
                            if (cityName === player.location) return; // Must be a *different* city
                        
                            const cityRegions = IBERIA_CITY_TO_REGIONS_MAP[cityName] || [];
                            const sharesRegion = cityRegions.some(r => currentRegions.has(r));
                        
                            if (sharesRegion && (newState.diseaseCubes[cityName]?.[color] || 0) > 0) {
                                secondCubeTargets.push({ city: cityName, color });
                            }
                        });
                        
                        const uniqueTargets = Array.from(new Map(secondCubeTargets.map(item => [item.city, item])).values());
                        
                        // 3. Resolve the second cube removal
                        if (uniqueTargets.length === 0) {
                            newState.log.unshift(`- No other valid targets for Rural Doctor's second cube removal.`);
                            actionTaken = true;
                        } else if (uniqueTargets.length === 1) {
                            const target = uniqueTargets[0];
                            newState.diseaseCubes[target.city]![target.color]!--;
                            newState.remainingCubes[target.color]++;
                            newState.log.unshift(`- Rural Doctor removes a second ${target.color} cube from ${CITIES_DATA[target.city].name}.`);
                            actionTaken = true;
                        } else {
                            // Multiple choices exist, pause for player input
                            newState.pendingRuralDoctorChoice = uniqueTargets;
                            newState.phaseBeforeEvent = GamePhase.PlayerAction;
                            newState.gamePhase = GamePhase.ResolvingRuralDoctorTreat;
                            // The action is considered "taken" here to be undoable, but we don't decrement the counter until it's fully resolved.
                            actionTaken = true; 
                            newState.actionsRemaining++; // Temporarily give the action back until the choice is made.
                        }
                        
                        _checkForEradication(newState, color);
                        playSound('treatdisease');
                    
                    } else {
                        const isVS = color === newState.virulentStrainColor;
                        const isResistant = newState.activeVirulentStrainCards.includes(VirulentStrainEpidemicCardName.ResistantToTreatment);
                        
                        if (isVS && isResistant && !newState.curedDiseases[color] && newState.actionsRemaining < 2) {
                            logEvent(`Resistant to Treatment: 2 actions are required to treat the Virulent Strain.`);
                            return prevState;
                        }
                        
                        const isRemoteTreat = player.role === PlayerRole.FieldDirector && player.location !== city;
                        const cityCubes = newState.diseaseCubes[city];
                        if (cityCubes && cityCubes[color]! > 0) {
                            const currentCubes = cityCubes[color]!;
                            let cubesToRemove = 1;
                            
                            if (newState.improvedSanitationPlayerId !== null && !(player.role === PlayerRole.Medic || newState.curedDiseases[color])) {
                                cubesToRemove++;
                            }
                            
                            if (player.role === PlayerRole.Medic || (newState.curedDiseases[color] && newState.gameType !== 'iberia')) {
                                cubesToRemove = currentCubes;
                            }
                            
                            cubesToRemove = Math.min(currentCubes, cubesToRemove);
    
                            cityCubes[color]! -= cubesToRemove;
                            newState.remainingCubes[color] += cubesToRemove;
                            newState.log.unshift(`- ${player.name} treats ${cubesToRemove} cube(s) of ${color} disease in ${CITIES_DATA[city].name}${isRemoteTreat ? ' (remotely)' : ''}.`);
                            _checkForEradication(newState, color);
                            
                            if (isVS) {
                                newState.treatedVSCitiesThisTurn.push(city);
                            }
                            playSound('treatdisease');
                            actionTaken = true;
                            
                            if (isVS && isResistant && !newState.curedDiseases[color]) {
                                newState.actionsRemaining--; // Consume one extra action
                                logEvent(`Resistant to Treatment consumes an extra action.`);
                            }
                        }
                    }
                    break;
                }

                case 'ShareKnowledge': {
                    const { fromPlayerId, toPlayerId, card } = payload;
                    const fromPlayer = newState.players.find((p: Player) => p.id === fromPlayerId)!;
                    const toPlayer = newState.players.find((p: Player) => p.id === toPlayerId)!;
                    const cardIndex = fromPlayer.hand.findIndex((c: PlayerCard) => c.type === 'city' && c.name === card.name && c.color === card.color);
                    
                    if (cardIndex > -1) {
                        const [movedCard] = fromPlayer.hand.splice(cardIndex, 1);
                        toPlayer.hand.push(movedCard);
                        const actionVerb = newState.gameType === 'fallOfRome' ? 'plots with' : 'shares knowledge with';
                        newState.log.unshift(`- ${fromPlayer.name} ${actionVerb} ${toPlayer.name}, giving them the ${getCardDisplayName(card)} card.`);
                        
                        checkHandLimit(newState, toPlayer);
                        playSound('shareknowledge');
                        actionTaken = true;
                    }
                    break;
                }
                case 'MercatorShare': {
                    if (player.role !== PlayerRole.Mercator || newState.hasUsedMercatorShare) break;

                    const { fromPlayerId, toPlayerId, card: cardToMove } = payload as ShareOption;
                    const fromPlayer = newState.players.find(p => p.id === fromPlayerId);
                    const toPlayer = newState.players.find(p => p.id === toPlayerId);

                    if (!fromPlayer || !toPlayer) {
                        logEvent(`Error: Could not find players for Mercator share.`);
                        break;
                    }

                    const cardIndex = fromPlayer.hand.findIndex(c => c.type === 'city' && c.name === cardToMove.name && c.color === cardToMove.color);

                    if (cardIndex > -1) {
                        const [movedCard] = fromPlayer.hand.splice(cardIndex, 1);
                        toPlayer.hand.push(movedCard);

                        newState.log.unshift(`- ${player.name} (Mercator) shares the ${getCardDisplayName(cardToMove)} card from ${fromPlayer.name} to ${toPlayer.name}.`);
                        newState.hasUsedMercatorShare = true;
                        
                        checkHandLimit(newState, toPlayer);
                        playSound('shareknowledge')
                        actionTaken = true;
                    } else {
                        logEvent(`Error: ${fromPlayer.name} does not have the ${getCardDisplayName(cardToMove)} card to share.`);
                    }
                    break;
                }
                case 'CureDisease': {
                    const { color, method, cardsToDiscard } = payload;
                    if (!color) break;

                    let isValidCure = false;
                    
                    if (newState.gameType === 'fallOfRome') {
                        if (isFallOfRomeDiseaseColor(color)) {
                            const requiredCards = FALLOFROME_ALLIANCE_CARD_REQUIREMENTS[color];
                            if (cardsToDiscard.length >= requiredCards) {
                                isValidCure = true;
                            }
                        }
                    } else { // Pandemic & Iberia Logic
                        if (newState.gameType === 'iberia') {
                            const requiredHospitalLocation = newState.hospitals[color as keyof typeof newState.hospitals];
                            if (player.location !== requiredHospitalLocation) {
                                logEvent(`${player.name} cannot research the ${color} disease from ${CITIES_DATA[player.location].name}. They must be at the ${color} hospital.`);
                                break;
                            }
                        }
                        const isVSComplex = newState.activeVirulentStrainCards.includes(VirulentStrainEpidemicCardName.ComplexMolecularStructure);
                        if (color === DiseaseColor.Purple) {
                            let requiredCards = (player.role === PlayerRole.Scientist ? 4 : 5) - (newState.sequencingBreakthroughPlayerId !== null ? 1 : 0);
                             if (cardsToDiscard.length >= requiredCards) {
                                isValidCure = true;
                            }
                        } else if (player.role === PlayerRole.Virologist) {
                            let requiredValue = 5 - (newState.sequencingBreakthroughPlayerId !== null ? 1 : 0);
                            if (isVSComplex && color === newState.virulentStrainColor) requiredValue++;
                            const cardGroups = cardsToDiscard.reduce((acc, card) => {
                                const cardColor = card.color;
                                if (!acc[cardColor]) acc[cardColor] = 0;
                                acc[cardColor]++;
                                return acc;
                            }, {} as Record<DiseaseColor, number>);
                            const mainCardsCount = cardGroups[color] || 0;
                            let replacementValue = 0;
                            (Object.keys(cardGroups) as DiseaseColor[]).forEach(c => {
                                if (c !== color) {
                                    replacementValue += Math.floor((cardGroups[c] || 0) / 2);
                                }
                            });
                            if (mainCardsCount + replacementValue >= requiredValue) isValidCure = true;
                        } else if (method === 'samples' && player.role === PlayerRole.FieldOperative) {
                            let requiredSampleCards = (5 - 2) - (newState.sequencingBreakthroughPlayerId !== null ? 1 : 0);
                            if (isVSComplex && color === newState.virulentStrainColor) requiredSampleCards++;
                            if (cardsToDiscard.length >= requiredSampleCards && (player.samples[color] || 0) >= 3) {
                                 player.samples[color]! -= 3;
                                 newState.remainingCubes[color] += 3;
                                 newState.log.unshift(`- ${player.name} uses 3 ${color} samples to help cure the disease!`);
                                 isValidCure = true;
                            }
                        } else { // Standard card cure
                            let requiredCards = (player.role === PlayerRole.Scientist ? 4 : 5) - (newState.sequencingBreakthroughPlayerId !== null ? 1 : 0);
                            if (isVSComplex && color === newState.virulentStrainColor) requiredCards++;
                            if (cardsToDiscard.length >= requiredCards) isValidCure = true;
                        }
                    }

                    if (isValidCure) {
                        cardsToDiscard.forEach((cardToDiscard: PlayerCard & {type: 'city'}) => {
                            const idx = player.hand.findIndex((c: PlayerCard) => c.type === 'city' && c.name === cardToDiscard.name && c.color === cardToDiscard.color);
                            if (idx > -1) player.hand.splice(idx, 1);
                        });
                        newState.playerDiscard.push(...cardsToDiscard);
                        newState.curedDiseases[color] = true;
                        playSound('curedisease');
                        actionTaken = true;

                        // Pandemic-specific effects
                        if (newState.gameType !== 'fallOfRome') {
                            if (newState.sequencingBreakthroughPlayerId !== null) {
                                newState.log.unshift(`- Sequencing Breakthrough was used to aid the cure.`);
                                newState.sequencingBreakthroughPlayerId = null;
                            }
                            const isVSResistant = newState.activeVirulentStrainCards.includes(VirulentStrainEpidemicCardName.ResistantToTreatment);
                            if (isVSResistant && color === newState.virulentStrainColor) {
                                newState.activeVirulentStrainCards = newState.activeVirulentStrainCards.filter(c => c !== VirulentStrainEpidemicCardName.ResistantToTreatment);
                                logEvent(`Curing the Virulent Strain removes the 'Resistant to Treatment' effect.`);
                            }
                        }
                        
                        if (hasWon(newState)) {
                            newState.gamePhase = GamePhase.GameOver;
                            newState.gameOverReason = newState.gameType === 'fallOfRome'
                                ? 'All barbarian threats have been contained. Rome is saved!'
                                : 'All diseases have been cured! Humanity is saved.';
                            newState.log.unshift(`- VICTORY! ${newState.gameOverReason}`);
                        } else {
                            if (newState.gameType === 'fallOfRome') {
                                 newState.log.unshift(`- ${player.name} forges an alliance with the ${color} tribe!`);
                                 // No RVD for Fall of Rome, so skip PostCureAction
                                 if (newState.actionsRemaining > 0) {
                                     newState.gamePhase = GamePhase.PlayerAction;
                                 } else {
                                     newState.gamePhase = GamePhase.PreDrawPlayerCards;
                                 }
                            } else { // Pandemic-specific post-cure flow
                                if (color === DiseaseColor.Purple) {
                                    logEvent(`${player.name} has discovered a cure for the purple mutation!`);
                                    setModalContent({ title: "MUTATION CURED!", body: "A cure for the dangerous purple mutation has been found!", color: "text-purple-400" });
                                } else {
                                    newState.log.unshift(`- ${player.name} has discovered a cure for the ${color} disease!`);
                                    newState.players.forEach((p: Player) => _handleMedicAutoTreat(newState, p));
                                    _checkForEradication(newState, color);
                                    newState.gamePhase = GamePhase.PostCureAction;
                                    newState.postCureColor = color;
                                }
                            }
                        }
                    }
                    break;
                }
                case 'TakeEventCard': {
                    const { cardName } = payload;
                    const cardIndex = newState.playerDiscard.findIndex((c: PlayerCard) => c.type === 'event' && c.name === cardName);
                    if (cardIndex > -1) {
                        const [card] = newState.playerDiscard.splice(cardIndex, 1);
                        if(card.type === 'event') player.contingencyCard = card.name;
                        newState.log.unshift(`- ${player.name} (Contingency Planner) retrieves ${cardName} from the discard pile.`);
                        actionTaken = true;
                    }
                    break;
                }
                 case 'RetrieveCard': {
                    if (player.role !== PlayerRole.Archivist || newState.hasUsedArchivistRetrieve) break;
                    const cardIndex = newState.playerDiscard.findIndex((c: PlayerCard) => c.type === 'city' && c.name === player.location);
                    if (cardIndex > -1) {
                        const [card] = newState.playerDiscard.splice(cardIndex, 1);
                        player.hand.push(card);
                        newState.hasUsedArchivistRetrieve = true;
                        newState.log.unshift(`- ${player.name} (Archivist) retrieves the ${getCardDisplayName(card)} card from the discard pile.`);
                        checkHandLimit(newState, player);
                        actionTaken = true;
                    }
                    break;
                }
                case 'DispatcherSummon': {
                    const { pawnToMoveId, destinationCity } = payload;
                    const summonedPawn = newState.players.find((p:Player) => p.id === pawnToMoveId)!;
                    summonedPawn.location = destinationCity;
                    newState.log.unshift(`- ${player.name} (Dispatcher) summons ${summonedPawn.name} to ${CITIES_DATA[destinationCity].name}.`);
                    _handlePostMoveEffects(newState, summonedPawn, 'Other');
                    _handleNursePostMove(newState, pawnToMove);
                    playSound('directflight')
                    actionTaken = true;
                    break;
                }
                case 'CollectSample': {
                     if (player.role !== PlayerRole.FieldOperative || newState.hasUsedFieldOperativeCollect) break;
                     const cityCubes = newState.diseaseCubes[player.location];
                     if (!cityCubes || Object.values(cityCubes).every(c => c === 0)) break;
                     const { color } = payload;
                     if (cityCubes[color] > 0) {
                         cityCubes[color]--;
                         player.samples[color] = (player.samples[color] || 0) + 1;
                         newState.hasUsedFieldOperativeCollect = true;
                         newState.log.unshift(`- ${player.name} (Field Operative) collects a ${color} sample.`);
                         actionTaken = true;
                     }
                     break;
                }
                case 'LocalLiaisonShare': {
                    const { card, toPlayerId } = payload;
                    if (player.role !== PlayerRole.LocalLiaison || newState.hasUsedLocalLiaisonShare) break;
                    
                    const toPlayer = newState.players.find((p: Player) => p.id === toPlayerId)!;
                    const cardInHand = player.hand.find((c: PlayerCard) => c.type === 'city' && c.name === card.name && c.color === card.color);

                    if (!cardInHand || cardInHand.type !== 'city') break;

                    const liaisonCityColor = CITIES_DATA[player.location].color;
                    const cardColor = cardInHand.color;
                    const recipientCityColor = CITIES_DATA[toPlayer.location].color;

                    if (liaisonCityColor === cardColor && cardColor === recipientCityColor) {
                        const cardIndex = player.hand.findIndex((c: PlayerCard) => c.type === 'city' && c.name === card.name && c.color === card.color);
                        const [movedCard] = player.hand.splice(cardIndex, 1);
                        toPlayer.hand.push(movedCard);

                        newState.log.unshift(`- ${player.name} (Local Liaison) shares the ${getCardDisplayName(card)} card with ${toPlayer.name}.`);
                        newState.hasUsedLocalLiaisonShare = true;
                        
                        checkHandLimit(newState, toPlayer);
                        playSound('shareknowledge')
                        actionTaken = true;
                    }
                    break;
                }
                case 'VirologistRemoteTreat': {
                    if (player.role !== PlayerRole.Virologist) break;
                    const { cardToDiscardName, targetCity } = payload;
                    const cardIndex = player.hand.findIndex((c: PlayerCard) => c.type === 'city' && c.name === cardToDiscardName);
                    if (cardIndex > -1) {
                        const [card] = player.hand.splice(cardIndex, 1);
                        newState.playerDiscard.push(card);
                        const color = (card as PlayerCard & { type: 'city' }).color;
                        if (newState.diseaseCubes[targetCity]?.[color]) {
                            newState.diseaseCubes[targetCity]![color]!--;
                            newState.remainingCubes[color]++;
                             newState.log.unshift(`- ${player.name} (Virologist) discards a ${CITIES_DATA[cardToDiscardName].name} card to remove a ${color} cube from ${CITIES_DATA[targetCity].name}.`);
                            _checkForEradication(newState, color);
                            actionTaken = true;
                        }
                    }
                    break;
                }
                case 'EnlistBarbarians': {
                    if (newState.gameType !== 'fallOfRome') break;
                    const { cardToDiscard } = payload as { cardToDiscard: PlayerCard & { type: 'city' } };
                    const city = player.location;
                    const color = cardToDiscard.color;
                
                    // Safety checks
                    const allianceForged = newState.curedDiseases[color];
                    const cubesPresent = (newState.diseaseCubes[city]?.[color] || 0) > 0;
                    if (!allianceForged || !cubesPresent) {
                        logEvent(`Cannot enlist ${color} barbarians: requirements not met.`);
                        break;
                    }
                
                    // 1. Find and discard card
                    const cardIndex = player.hand.findIndex(c => c.type === 'city' && c.name === cardToDiscard.name && c.color === cardToDiscard.color);
                    if (cardIndex === -1) {
                        logEvent(`Error: ${player.name} does not have the required card.`);
                        break;
                    }
                    const [discarded] = player.hand.splice(cardIndex, 1);
                    newState.playerDiscard.push(discarded);
                
                    // 2. Remove cubes
                    const cubesRemoved = newState.diseaseCubes[city]![color]!;
                    newState.diseaseCubes[city]![color] = 0;
                    newState.remainingCubes[color] += cubesRemoved;
                
                    // 3. Add legions
                    const availableLegionsInSupply = 16 - (newState.legions?.length || 0);
                    const legionsToAdd = Math.min(cubesRemoved, availableLegionsInSupply);
                    
                    if (legionsToAdd > 0) {
                        for (let i = 0; i < legionsToAdd; i++) {
                            newState.legions.push(city);
                        }
                    }
                
                    // 4. Log and consume action
                    newState.log.unshift(`- ${player.name} enlists barbarians in ${CITIES_DATA[city].name}, removing ${cubesRemoved} ${color} cube(s) and adding ${legionsToAdd} legion(s).`);
                    playSound('enlistbarbarians')
                    actionTaken = true;

                    if (hasWon(newState)) {
                        newState.gamePhase = GamePhase.GameOver;
                        newState.gameOverReason = 'All barbarian threats have been contained. Rome is saved!';
                        newState.log.unshift(`- VICTORY! ${newState.gameOverReason}`);
                    }
                    break;
                }
                case 'EnlistBarbariansFree': {
                    if (newState.gameType !== 'fallOfRome' || player.role !== PlayerRole.ReginaFoederata || newState.hasUsedReginaFoederataFreeEnlist) break;
                    
                    const { color } = payload as { color: DiseaseColor };
                    const city = player.location;
                
                    // Safety checks
                    const allianceForged = newState.curedDiseases[color];
                    const cubesPresent = (newState.diseaseCubes[city]?.[color] || 0) > 0;
                    if (!allianceForged || !cubesPresent) {
                        logEvent(`Cannot use free enlist for ${color} tribe: requirements not met.`);
                        break;
                    }
                    
                    // 1. Set used flag
                    newState.hasUsedReginaFoederataFreeEnlist = true;
                
                    // 2. Remove cubes
                    const cubesRemoved = newState.diseaseCubes[city]![color]!;
                    newState.diseaseCubes[city]![color] = 0;
                    newState.remainingCubes[color] += cubesRemoved;
                
                    // 3. Add legions
                    const availableLegionsInSupply = 16 - (newState.legions?.length || 0);
                    const legionsToAdd = Math.min(cubesRemoved, availableLegionsInSupply);
                    
                    if (legionsToAdd > 0) {
                        for (let i = 0; i < legionsToAdd; i++) {
                            newState.legions.push(city);
                        }
                    }
                
                    // 4. Log and DO NOT consume action
                    newState.log.unshift(`- ${player.name} (Regina Foederata) uses her free ability to enlist barbarians in ${CITIES_DATA[city].name}, removing ${cubesRemoved} ${color} cube(s) and adding ${legionsToAdd} legion(s).`);
                    
                    isFreeAction = true;
                    playSound('enlistbarbarians')
                    actionTaken = true;
                    
                    if (hasWon(newState)) {
                        newState.gamePhase = GamePhase.GameOver;
                        newState.gameOverReason = 'All barbarian threats have been contained. Rome is saved!';
                        newState.log.unshift(`- VICTORY! ${newState.gameOverReason}`);
                    }
                    break;
                }
                case 'ConsulPlaceLegionInCity': {
                    if (player.role !== PlayerRole.Consul || newState.gameType !== 'fallOfRome') break;
                    if ((newState.legions?.length || 0) >= 16) {
                        logEvent("No legions available in the supply.");
                        break;
                    }

                    newState.legions.push(player.location);
                    newState.log.unshift(`- ${player.name} (Consul) places a legion in their city, ${CITIES_DATA[player.location].name}.`);
                    playSound('recruitarmy')
                    actionTaken = true;
                    break;
                }
                case 'ConsulPlaceLegionAtFort': {
                    const { city } = payload;
                    if (player.role !== PlayerRole.Consul || newState.gameType !== 'fallOfRome' || !city) break;
                    if (!newState.forts.includes(city)) {
                        logEvent(`Cannot place legion: ${CITIES_DATA[city].name} does not have a fort.`);
                        break;
                    }
                    if ((newState.legions?.length || 0) >= 16) {
                        logEvent("No legions available in the supply.");
                        break;
                    }

                    newState.legions.push(city);
                    newState.log.unshift(`- ${player.name} (Consul) places a legion in the fortified city of ${CITIES_DATA[city].name}.`);
                    playSound('recruitarmy')
                    actionTaken = true;
                    break;
                }
                case 'PraefectusRecruit': {
                    if (player.role !== PlayerRole.PraefectusClassis || newState.gameType !== 'fallOfRome') break;

                    const { cardToDiscard, legionsToAdd } = payload as { cardToDiscard: PlayerCard & { type: 'city' }, legionsToAdd: number };
                    const cardIndex = player.hand.findIndex(c => c.type === 'city' && c.name === cardToDiscard.name && c.color === cardToDiscard.color);

                    if (cardIndex === -1) {
                        logEvent(`Error: ${player.name} does not have the required card for Praefectus Recruit.`);
                        break;
                    }

                    const availableLegionsInSupply = 16 - (newState.legions?.length || 0);
                    if (availableLegionsInSupply <= 0) {
                        logEvent("No legions available in the supply to recruit.");
                        break;
                    }
                    
                    const [discarded] = player.hand.splice(cardIndex, 1);
                    newState.playerDiscard.push(discarded);
                    
                    const actualLegionsToAdd = Math.min(legionsToAdd, availableLegionsInSupply);
                    
                    for (let i = 0; i < actualLegionsToAdd; i++) {
                        newState.legions.push(player.location);
                    }
                    
                    newState.log.unshift(`- ${player.name} (Praefectus Classis) discards a ${getCardDisplayName(cardToDiscard)} card to recruit ${actualLegionsToAdd} legion(s) in ${CITIES_DATA[player.location].name}.`);
                    playSound('recruitarmy')
                    actionTaken = true;
                    break;
                }
                case 'BuildFortWithLegions': {
                    if (player.role !== PlayerRole.PraefectusFabrum || newState.gameType !== 'fallOfRome') break;
                    const legionsInCity = (newState.legions || []).filter(l => l === player.location).length;
                    if (legionsInCity < 2) {
                        logEvent(`${player.name} does not have enough legions to build a fort.`);
                        break;
                    }
                    if (newState.forts.includes(player.location)) {
                        logEvent(`${CITIES_DATA[player.location].name} already has a fort.`);
                        break;
                    }

                    // Remove 2 legions
                    let removedCount = 0;
                    newState.legions = (newState.legions || []).filter(l => {
                        if (l === player.location && removedCount < 2) {
                            removedCount++;
                            return false; // remove this legion
                        }
                        return true; // keep this legion
                    });

                    // Add fort
                    if (newState.forts.length < 6) {
                        newState.forts.push(player.location);
                        newState.log.unshift(`- ${player.name} (Praefectus Fabrum) removes 2 legions to build a fort in ${CITIES_DATA[player.location].name}.`);
                    } else {
                        newState.gamePhase = GamePhase.ResolvingFortRelocation;
                        newState.fortRelocationTargetCity = player.location;
                        newState.log.unshift(`- ${player.name} (Praefectus Fabrum) removes 2 legions. All forts are on the board; one must be moved to ${CITIES_DATA[player.location].name}.`);
                    }
                    
                    playSound('fortify')
                    actionTaken = true;
                    break;
                }
                case 'FabrumFlight': {
                    if (player.role !== PlayerRole.PraefectusFabrum || newState.gameType !== 'fallOfRome') break;
                    const { destination, cardToDiscard, legionsToMove } = payload as { destination: CityName; cardToDiscard: PlayerCard & { type: 'city' }; legionsToMove: number };
                    
                    const cardIndex = player.hand.findIndex(c => c.type === 'city' && c.name === cardToDiscard.name && c.color === cardToDiscard.color);
                    if (cardIndex === -1) {
                        logEvent(`Error: ${player.name} does not have the required card for Fortress Transit.`);
                        break;
                    }

                    const startCity = player.location;
                    const [discarded] = player.hand.splice(cardIndex, 1);
                    newState.playerDiscard.push(discarded);
                    
                    player.location = destination;

                    const actualLegionsToMove = Math.min(legionsToMove, 3);
                    if (actualLegionsToMove > 0) {
                        let removedCount = 0;
                        const newLegions: CityName[] = [];
                        (newState.legions || []).forEach(l => {
                            if (l === startCity && removedCount < actualLegionsToMove) {
                                removedCount++;
                            } else {
                                newLegions.push(l);
                            }
                        });
                        for (let i = 0; i < actualLegionsToMove; i++) {
                            newLegions.push(destination);
                        }
                        newState.legions = newLegions;
                    }
                    
                    newState.log.unshift(`- ${player.name} (Praefectus Fabrum) uses Fortress Transit to move from ${CITIES_DATA[startCity].name} to ${CITIES_DATA[destination].name}, taking ${actualLegionsToMove} legion(s).`);
                    _handlePostMoveEffects(newState, player, 'Other');
                    playSound('directflight')
                    actionTaken = true;
                    break;
                }

                case 'BuildRailroad': {
                    if ((newState.railroads?.length || 0) >= 20) {
                        logEvent("No more railroad tokens available to build.");
                        break;
                    }
                    if (newState.gameType !== 'iberia') break;
                    const { connection } = payload as { connection: { from: CityName, to: CityName } };
                
                    // Rule 1: Player must be at one end of the connection.
                    if (player.location !== connection.from && player.location !== connection.to) {
                        logEvent(`${player.name} must be in an adjacent city to build a railroad.`);
                        break;
                    }
                
                    // Rule 2: Check if a railroad already exists.
                    const railroadExists = newState.railroads.some(r =>
                        (r.from === connection.from && r.to === connection.to) ||
                        (r.from === connection.to && r.to === connection.from)
                    );
                    if (railroadExists) {
                        logEvent(`A railroad already exists on this route.`);
                        break;
                    }
                
                    // Rule 3: Check if it's a sea route.
                    const isSeaRoute = IBERIA_SEA_CONNECTIONS.some(seaRoute =>
                        (seaRoute[0] === connection.from && seaRoute[1] === connection.to) ||
                        (seaRoute[0] === connection.to && seaRoute[1] === connection.from)
                    );
                    if (isSeaRoute) {
                        logEvent(`Railroads cannot be built on sea routes.`);
                        break;
                    }
                
                    // All checks passed, build the railroad.
                    newState.railroads.push(connection);
                    newState.log.unshift(`- ${player.name} builds a railroad between ${CITIES_DATA[connection.from].name} and ${CITIES_DATA[connection.to].name}.`);
                    playSound('buildrailroad'); // We assume a sound 'buildrailroad.mp3' will exist
                    actionTaken = true;
                    break;
                }

                case 'RailwaymanCompleteDoubleBuild': {
                    if (newState.gameType !== 'iberia' || player.role !== PlayerRole.Railwayman || newState.hasUsedRailwaymanDoubleBuild) break;
                
                    const { firstConnection, secondConnection } = payload as { 
                        firstConnection: { from: CityName, to: CityName },
                        secondConnection: { from: CityName, to: CityName }
                    };
                
                    // --- VALIDATION ---
                    if (player.location !== firstConnection.from && player.location !== firstConnection.to) {
                        logEvent("Invalid first railroad placement: must start from your current city.");
                        break;
                    }
                    const firstExists = newState.railroads.some(r => (r.from === firstConnection.from && r.to === firstConnection.to) || (r.from === firstConnection.to && r.to === firstConnection.from));
                    const firstIsSea = IBERIA_SEA_CONNECTIONS.some(c => (c[0] === firstConnection.from && c[1] === firstConnection.to) || (c[0] === firstConnection.to && c[1] === firstConnection.from));
                    if (firstExists || firstIsSea) {
                        logEvent("Invalid first railroad placement (already exists or is a sea route).");
                        break;
                    }
                    const endCityOfFirst = firstConnection.to === player.location ? firstConnection.from : firstConnection.to;
                    if (secondConnection.from !== endCityOfFirst && secondConnection.to !== endCityOfFirst) {
                        logEvent("Invalid second railroad placement: must be consecutive.");
                        break;
                    }
                    const secondExists = newState.railroads.some(r => (r.from === secondConnection.from && r.to === secondConnection.to) || (r.from === secondConnection.to && r.to === secondConnection.from));
                    const secondIsSea = IBERIA_SEA_CONNECTIONS.some(c => (c[0] === secondConnection.from && c[1] === secondConnection.to) || (c[0] === secondConnection.to && c[1] === secondConnection.from));
                    if (secondExists || secondIsSea) {
                        logEvent("Invalid second railroad placement (already exists or is a sea route).");
                        break;
                    }
                    // --- END VALIDATION ---
                
                    newState.railroads.push(firstConnection);
                    newState.railroads.push(secondConnection);
                    newState.log.unshift(`- ${player.name} (Railwayman) builds two consecutive railroads: ${CITIES_DATA[firstConnection.from].name} ↔ ${CITIES_DATA[firstConnection.to].name}, and ${CITIES_DATA[secondConnection.from].name} ↔ ${CITIES_DATA[secondConnection.to].name}.`);
                    newState.hasUsedRailwaymanDoubleBuild = true;
                    playSound('buildrailroad');
                    playSound('buildrailroad');
                
                    actionTaken = true;
                    break;
                }

                case 'AgronomistPlaceToken': {
                    if (newState.gameType !== 'iberia') break;
                    const { region } = payload as { region: string };
                    if (player.role !== PlayerRole.Agronomist) break;
                    if (newState.purificationTokenSupply < 1) {
                        logEvent("No purification tokens available in the supply.");
                        break;
                    }
        
                    const adjacentRegions = IBERIA_CITY_TO_REGIONS_MAP[player.location] || [];
                    if (!adjacentRegions.includes(region)) {
                        logEvent(`Agronomist can only place tokens in adjacent regions.`);
                        break;
                    }
        
                    newState.purificationTokens[region] = (newState.purificationTokens[region] || 0) + 1;
                    newState.purificationTokenSupply--;
                    newState.log.unshift(`- ${player.name} (Agronomist) places 1 purification token in Region ${region}.`);
                    playSound('purifywater');
                    actionTaken = true;
                    break;
                }

                case 'PurifyWater': {
                    if (newState.gameType !== 'iberia') break;
                    const { region, cardToDiscard } = payload as { region: string; cardToDiscard: PlayerCard & { type: 'city' } };
                
                    // Agronomist special logic
                    if (player.role === PlayerRole.Agronomist) {
                        if (newState.purificationTokenSupply < 2) {
                            logEvent("Not enough purification tokens for the base action.");
                            break;
                        }
                        // If they have enough for the bonus, trigger a choice modal
                        if (newState.purificationTokenSupply >= 3) {
                            newState.phaseBeforeEvent = newState.gamePhase;
                            newState.gamePhase = GamePhase.ResolvingAgronomistPurifyChoice;
                            newState.pendingAgronomistPurifyChoice = { region, cardToDiscard };
                            // Don't set actionTaken=true yet, the action resolves after the choice.
                            break;
                        }
                        // If they don't have enough for the bonus, proceed with the default 2 tokens
                    }
                
                    // Standard logic for non-Agronomists, or Agronomists who can't afford the bonus
                    const tokensToPlace = 2; 
                    if (newState.purificationTokenSupply < tokensToPlace) {
                        logEvent("Not enough purification tokens available in the supply.");
                        break;
                    }
                
                    const cardIndex = player.hand.findIndex(c => c.type === 'city' && c.name === cardToDiscard.name && c.color === cardToDiscard.color);
                    if (cardIndex === -1) {
                        logEvent(`Error: ${player.name} does not have the required card for Purify Water.`);
                        break;
                    }
                
                    // Discard card
                    const [discarded] = player.hand.splice(cardIndex, 1);
                    newState.playerDiscard.push(discarded);
                
                    // Add tokens
                    newState.purificationTokens[region] = (newState.purificationTokens[region] || 0) + tokensToPlace;
                    newState.purificationTokenSupply -= tokensToPlace;
                
                    newState.log.unshift(`- ${player.name} purifies water in Region ${region}, adding ${tokensToPlace} tokens.`);
                    playSound('purifywater');
                    actionTaken = true;
                    break;
                }
                
                case 'PoliticianGiveCard': {
                    if (newState.gameType !== 'iberia' || player.role !== PlayerRole.Politician) break;
                    const { cardToGive, targetPlayerId } = payload as { cardToGive: PlayerCard & { type: 'city' }, targetPlayerId: number };
        
                    if (player.location !== cardToGive.name) {
                        logEvent(`Politician must be in ${CITIES_DATA[cardToGive.name].name} to give that card.`);
                        break;
                    }
        
                    const cardIndex = player.hand.findIndex(c => c.type === 'city' && c.name === cardToGive.name && c.color === cardToGive.color);
                    const targetPlayer = newState.players.find(p => p.id === targetPlayerId);
        
                    if (cardIndex === -1 || !targetPlayer) {
                        logEvent("Error processing Politician's Give Card action.");
                        break;
                    }
        
                    const [movedCard] = player.hand.splice(cardIndex, 1);
                    targetPlayer.hand.push(movedCard);
                    newState.log.unshift(`- ${player.name} (Politician) gives the ${getCardDisplayName(cardToGive)} card to ${targetPlayer.name}.`);
                    playSound('shareknowledge');
                    actionTaken = true;
        
                    if (targetPlayer.hand.length > getHandLimit(targetPlayer)) {
                        newState.playerToDiscardId = targetPlayer.id;
                        newState.gamePhase = GamePhase.Discarding;
                        discardTriggerRef.current = 'action';
                        newState.log.unshift(`- ${targetPlayer.name} is over their hand limit and must discard.`);
                    }
                    break;
                }
        
                case 'PoliticianSwapCard': {
                    if (newState.gameType !== 'iberia' || player.role !== PlayerRole.Politician) break;
                    const { cardFromHand, cardFromDiscard } = payload as { cardFromHand: PlayerCard & { type: 'city' }, cardFromDiscard: PlayerCard & { type: 'city' } };
        
                    const locationRequirementMet = player.location === cardFromHand.name || player.location === cardFromDiscard.name;
                    if (!locationRequirementMet) {
                        logEvent(`Politician must be in either ${CITIES_DATA[cardFromHand.name].name} or ${CITIES_DATA[cardFromDiscard.name].name} to perform this swap.`);
                        break;
                    }
        
                    const handIndex = player.hand.findIndex(c => c.type === 'city' && c.name === cardFromHand.name && c.color === cardFromHand.color);
                    const discardIndex = newState.playerDiscard.findIndex(c => c.type === 'city' && c.name === cardFromDiscard.name && c.color === cardFromDiscard.color);
        
                    if (handIndex === -1 || discardIndex === -1) {
                        logEvent("Error processing Politician's Swap Card action.");
                        break;
                    }
        
                    const [cardToDiscard] = player.hand.splice(handIndex, 1);
                    const [cardToTake] = newState.playerDiscard.splice(discardIndex, 1);
        
                    player.hand.push(cardToTake);
                    newState.playerDiscard.push(cardToDiscard);
        
                    newState.log.unshift(`- ${player.name} (Politician) swaps the ${getCardDisplayName(cardFromHand)} card from hand with the ${getCardDisplayName(cardFromDiscard)} card from the discard pile.`);
                    playSound('shareknowledge');
                    actionTaken = true;
                    break;
                }
                
                case 'RoyalAcademyScientistForecast': {
                    if (newState.gameType !== 'iberia' || player.role !== PlayerRole.RoyalAcademyScientist) break;
                    
                    newState.phaseBeforeEvent = GamePhase.PlayerAction;
                    newState.gamePhase = GamePhase.ConfirmingRoyalAcademyScientistForecast;
                    // The action is NOT consumed yet.
                    break;
                }

                case 'AcknowledgeRoyalAcademyScientistForecast': {
                    if (newState.gamePhase !== GamePhase.ConfirmingRoyalAcademyScientistForecast) break;
                
                    if (newState.playerDeck.length < 1) {
                        logEvent("Cannot use Academy Forecast: Player Deck is empty.");
                        newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                        newState.phaseBeforeEvent = null;
                        break;
                    }
                
                    // Consume the action and make it irreversible
                    actionTaken = true;
                    newState.actionHistory = [];
                    newState.log.unshift(`- ${player.name} (Royal Academy Scientist) confirms using an action to forecast the Player Deck. This turn can no longer be undone.`);
                
                    // Proceed to the card rearrangement view
                    newState.gamePhase = GamePhase.ResolvingRoyalAcademyScientistForecast;
                    // phaseBeforeEvent is already set and will be used by the 'ConfirmRoyalAcademyScientistForecast' step
                    break;
                }
                
                case 'ConfirmRuralDoctorTreat': {
                    if (newState.gamePhase !== GamePhase.ResolvingRuralDoctorTreat || !newState.pendingRuralDoctorChoice) break;
                    const { city, color } = payload as { city: CityName; color: DiseaseColor };
                
                    // Validate the choice
                    if (!newState.pendingRuralDoctorChoice.some(c => c.city === city && c.color === color)) {
                        logEvent("Invalid choice for Rural Doctor's second treat action.");
                        break;
                    }
                
                    // Perform the action
                    newState.diseaseCubes[city]![color]!--;
                    newState.remainingCubes[color]++;
                    newState.log.unshift(`- Rural Doctor removes a second ${color} cube from ${CITIES_DATA[city].name}.`);
                    _checkForEradication(newState, color);
                
                    // Cleanup and resume play
                    newState.actionsRemaining--; // Now we officially consume the action.
                    newState.pendingRuralDoctorChoice = null;
                    newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                    newState.phaseBeforeEvent = null;
                
                    if (newState.actionsRemaining <= 0) {
                        newState.gamePhase = GamePhase.PreDrawPlayerCards;
                    }
                    break;
                }
                
            }

            if (actionTaken) {
                // Irreversible actions like Battle or a confirmed Forecast clear the history
                // inside their case block. For all other actions, we save the previous state.
                if (action !== 'Battle' && action !== 'AcknowledgeRoyalAcademyScientistForecast') {
                    newState.actionHistory.push(stateToSave as GameState);
                }
                
                if (!isFreeAction) {
                    newState.actionsRemaining--;
                }
            }

            const wasInResolvingPhase = [GamePhase.ResolvingFieldDirectorTreat].includes(prevState.gamePhase);
            if (wasInResolvingPhase && actionTaken) {
                newState.gamePhase = GamePhase.PlayerAction;
            }
            
            if(newState.gamePhase === GamePhase.PlayerAction && newState.actionsRemaining <= 0) {
                newState.gamePhase = GamePhase.PreDrawPlayerCards;
            }
            
            switch (action) {
                case 'Drive': case 'DirectFlight': case 'CharterFlight': case 'ShuttleFlight': case 'ExpertFlight':
                case 'PilotFlight': case 'Sail':
                    newState.selectedCity = payload.destination;
                    break;
                case 'DispatcherSummon':
                    newState.selectedCity = payload.destinationCity;
                    break;
            }

            return newState;
        });
    }, [logEvent, getHandLimit, _startNextTurn]);

    const handleAgronomistPurifyChoice = (tokensToPlace: 2 | 3) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingAgronomistPurifyChoice || !prevState.pendingAgronomistPurifyChoice) {
                return prevState;
            }
    
            const snapshot = safeCloneGameState(prevState);
            const { actionHistory, ...stateToSave } = snapshot;
    
            const newState = safeCloneGameState(prevState);
            const player = newState.players[newState.currentPlayerIndex];
            const { region, cardToDiscard } = newState.pendingAgronomistPurifyChoice;
    
            if (newState.purificationTokenSupply < tokensToPlace) {
                logEvent(`Not enough tokens in supply to place ${tokensToPlace}.`);
                // Revert game phase
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
                newState.pendingAgronomistPurifyChoice = null;
                return newState;
            }
            
            const cardIndex = player.hand.findIndex(c => c.type === 'city' && c.name === cardToDiscard.name && c.color === cardToDiscard.color);
            if (cardIndex === -1) {
                logEvent(`Error: Card for Purify Water action is missing.`);
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                return newState;
            }
    
            // --- Perform the action ---
            newState.actionHistory.push(stateToSave as GameState);
    
            // Discard card
            const [discarded] = player.hand.splice(cardIndex, 1);
            newState.playerDiscard.push(discarded);
    
            // Add tokens
            newState.purificationTokens[region] = (newState.purificationTokens[region] || 0) + tokensToPlace;
            newState.purificationTokenSupply -= tokensToPlace;
    
            const logSuffix = tokensToPlace === 3 ? ' (Agronomist bonus)' : '';
            newState.log.unshift(`- ${player.name} purifies water in Region ${region}, adding ${tokensToPlace} tokens${logSuffix}.`);
            playSound('purifywater');
            
            // Consume action & cleanup
            newState.actionsRemaining--;
            if (newState.actionsRemaining <= 0) {
                newState.gamePhase = GamePhase.PreDrawPlayerCards;
            } else {
                newState.gamePhase = GamePhase.PlayerAction;
            }
            newState.phaseBeforeEvent = null;
            newState.pendingAgronomistPurifyChoice = null;
    
            return newState;
        });
    };

    const handleFortRelocation = (cityToRemove: CityName) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingFortRelocation) return prevState;
    
            const newState = safeCloneGameState(prevState);
    
            const cityToAdd = newState.fortRelocationTargetCity;
            if (!cityToAdd) return prevState;
    
            // Perform the swap
            newState.forts = newState.forts.filter(f => f !== cityToRemove);
            newState.forts.push(cityToAdd);
            logEvent(`Fort in ${CITIES_DATA[cityToRemove].name} was moved to ${CITIES_DATA[cityToAdd].name}.`);
    
            // The action was already consumed when entering the phase, just need to return to PlayerAction
            newState.gamePhase = newState.actionsRemaining > 0 ? GamePhase.PlayerAction : GamePhase.PreDrawPlayerCards;
    
            // Reset the temporary state fields
            newState.fortRelocationTargetCity = null;
    
            return newState;
        });
    };
    
    const handleCancelFortRelocation = () => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingFortRelocation || !prevState.fortRelocationTargetCity) return prevState;
    
            const newState = safeCloneGameState(prevState);
    
            const player = newState.players[newState.currentPlayerIndex];
            const cityToReturnCardFor = newState.fortRelocationTargetCity;

            // Find the discarded card and return it to the player's hand.
            const cardIndexInDiscard = newState.playerDiscard.findIndex(c => c.type === 'city' && c.name === cityToReturnCardFor);
            if (cardIndexInDiscard > -1) {
                const [cardToReturn] = newState.playerDiscard.splice(cardIndexInDiscard, 1);
                player.hand.push(cardToReturn);
            }
            
            // Give the action back
            newState.actionsRemaining++;
            
            newState.gamePhase = GamePhase.PlayerAction;
            newState.fortRelocationTargetCity = null;
            logEvent("Fortify action cancelled.");
    
            return newState;
        });
    };
    
    const handleSimpleCancel = useCallback(() => {
        setGameState(prevState => {
            if (!prevState) return null;
            const newState = safeCloneGameState(prevState);
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            logEvent("Action cancelled.");
            // We explicitly DO NOT touch actionHistory here.
            return newState;
        });
    }, [logEvent]);
    
    const handleFieldDirectorMove = useCallback((pawnToMoveId: number, destination: CityName) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingFieldDirectorMove) return prevState;
    
            const snapshot = safeCloneGameState(prevState);
            const { actionHistory, ...stateToSave } = snapshot;
            const newState = safeCloneGameState(prevState);
            
            const player = newState.players[newState.currentPlayerIndex];
            const pawnToMove = newState.players.find(p => p.id === pawnToMoveId);
    
            const returnToPhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
    
            if (player.role !== PlayerRole.FieldDirector || newState.hasUsedFieldDirectorMove || !pawnToMove || pawnToMove.role === PlayerRole.Pilot) {
                newState.gamePhase = returnToPhase;
                newState.phaseBeforeEvent = null;
                return newState;
            }
             if (!_canMoveFrom(newState, pawnToMove)) {
                logEvent(`Government Interference prevents ${pawnToMove.name} from being moved from ${CITIES_DATA[pawnToMove.location].name}.`);
                newState.gamePhase = returnToPhase;
                newState.phaseBeforeEvent = null;
                return newState;
            }
    
            const validStartLocations = [player.location, ...CONNECTIONS[player.location]];
            if (!validStartLocations.includes(pawnToMove.location) || !CONNECTIONS[pawnToMove.location].includes(destination)) {
                newState.gamePhase = returnToPhase;
                newState.phaseBeforeEvent = null;
                return newState;
            }
            
            pawnToMove.location = destination;
            newState.hasUsedFieldDirectorMove = true;
            newState.log.unshift(`- ${player.name} (Field Director) uses their free action to move ${pawnToMove.name} to ${CITIES_DATA[destination].name}.`);
            
            _handlePostMoveEffects(newState, pawnToMove, 'Drive/Ferry');
            
            newState.selectedCity = destination;
            newState.gamePhase = returnToPhase;
            newState.phaseBeforeEvent = null;
    
            newState.actionHistory.push(stateToSave as GameState);
            
            return newState;
        });
    }, [logEvent, _startNextTurn]);

    const handleConfirmPilotFlight = useCallback((passengerId: number | null) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingPilotFlight || !prevState.pilotFlightDestination) return prevState;

            const snapshot = safeCloneGameState(prevState);
            const { actionHistory, ...stateToSave } = snapshot;
            const newState = safeCloneGameState(prevState);
            
            const pilot = newState.players[newState.currentPlayerIndex];
            const destination = newState.pilotFlightDestination!;
            const passenger = passengerId !== null ? newState.players.find(p => p.id === passengerId) : null;

            pilot.location = destination;
            
            let logMessage = `- ${pilot.name} (Pilot) flies to ${CITIES_DATA[destination].name}`;
            if (passenger) {
                passenger.location = destination;
                logMessage += ` with ${passenger.name} as a passenger`;
            }
            logMessage += '.';
            newState.log.unshift(logMessage);

            // Post-move effects
            _handlePostMoveEffects(newState, pilot, 'Other');
            if (passenger) {
                _handlePostMoveEffects(newState, passenger, 'Other');
            }

            // Consume action and reset phase
            newState.actionHistory.push(stateToSave as GameState);
            newState.actionsRemaining--;
            newState.gamePhase = newState.actionsRemaining > 0 ? GamePhase.PlayerAction : GamePhase.PreDrawPlayerCards;
            newState.pilotFlightDestination = null;
            newState.selectedCity = destination;

            return newState;
        });
    }, [logEvent]);

    const handleCancelPilotFlight = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingPilotFlight) return prevState;
            const newState = safeCloneGameState(prevState);
            newState.gamePhase = GamePhase.PlayerAction;
            newState.pilotFlightDestination = null;
            logEvent("Pilot flight cancelled.");
            return newState;
        });
    }, [logEvent]);

    const handleInitiateFieldDirectorTreat = useCallback(() => {
        setGameState(prevState => {
            if (!prevState) return null;
            const player = prevState.players[prevState.currentPlayerIndex];
            if (player.role !== PlayerRole.FieldDirector) return prevState;
        
            const treatOptions: {city: CityName, color: DiseaseColor}[] = [];
            const citiesToCheck = [...new Set([player.location, ...CONNECTIONS[player.location]])];
            
            citiesToCheck.forEach(city => {
                const cityCubes = prevState.diseaseCubes[city];
                if (cityCubes) {
                    (Object.keys(cityCubes) as DiseaseColor[]).forEach(color => {
                        const count = cityCubes[color];
                        if (count && count > 0) {
                            treatOptions.push({ city, color });
                        }
                    });
                }
            });
            
            if (treatOptions.length === 0) return prevState;
        
            if (treatOptions.length === 1) {
                handleAction('TreatDisease', treatOptions[0], null);
                return prevState; // handleAction will cause a re-render with the new state
            } else {
                const newState = safeCloneGameState(prevState);
                newState.gamePhase = GamePhase.ResolvingFieldDirectorTreat;
                return newState;
            }
        });
    }, [handleAction]);

    const handleInitiateFieldDirectorMove = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || ![GamePhase.PlayerAction, GamePhase.PreDrawPlayerCards].includes(prevState.gamePhase)) return null;
            const newState = safeCloneGameState(prevState);
            newState.phaseBeforeEvent = prevState.gamePhase;
            newState.gamePhase = GamePhase.ResolvingFieldDirectorMove;
            return newState;
        });
    }, []);

    const handleCancelFieldDirectorAction = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || ![GamePhase.ResolvingFieldDirectorMove, GamePhase.ResolvingFieldDirectorTreat].includes(prevState.gamePhase)) return null;
            const newState = safeCloneGameState(prevState);
            newState.gamePhase = prevState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            logEvent("Field Director action cancelled.");
            return newState;
        });
    }, [logEvent]);

    const handleUndoAction = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || prevState.actionHistory.length === 0) return prevState;
            const historyToRestoreFrom = [...prevState.actionHistory];
            const lastStateSnapshot = historyToRestoreFrom.pop()!;
            // The snapshot is already a valid GameState object without a nested history
            const restoredState: GameState = {
                ...lastStateSnapshot,
                actionHistory: historyToRestoreFrom,
            };
            restoredState.log.unshift("- Last action has been undone.");
            return restoredState;
        });
    }, [setGameState]);
    
    const _drawPlayerCards = useCallback(() => {
        setGameState(prevState => {
            if (!prevState) return null;
            const newState = safeCloneGameState(prevState);
            const player = newState.players[newState.currentPlayerIndex];

            // Vestalis special ability
            if (player.role === PlayerRole.Vestalis && newState.playerDeck.length >= 3) {
                const cardsDrawn: PlayerCard[] = [];
                for (let i = 0; i < 3; i++) {
                    const card = newState.playerDeck.shift()!;
                    cardsDrawn.push(card);
                }
                newState.pendingVestalisPlayerCardDraw = cardsDrawn;
                newState.gamePhase = GamePhase.ResolvingVestalisPlayerCardDraw;
                logEvent(`${player.name} (Vestalis) draws 3 cards to choose 2 from.`);
                return newState;
            }

            // Standard draw logic
            const cardsDrawn: PlayerCard[] = [];
            for (let i = 0; i < 2; i++) {
                const card = newState.playerDeck.shift();
                if (!card) { newState.gamePhase = GamePhase.GameOver; newState.gameOverReason = 'The player deck ran out of cards.'; return newState; }
                cardsDrawn.push(card);
            }
            setDrawnPlayerCards(cardsDrawn);
            newState.gamePhase = GamePhase.DrawingPlayerCards;
            return newState;
        });
    }, [setGameState, setDrawnPlayerCards, logEvent]);

    const handleConfirmPlayerDraw = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || !drawnPlayerCards) return prevState;
            const newState = safeCloneGameState(prevState);
            const player = newState.players[newState.currentPlayerIndex];

            const epidemicCard = drawnPlayerCards.find(c => c.type === 'epidemic' || c.type === 'virulent_strain_epidemic');
            const mutationEvents = drawnPlayerCards.filter(c => c.type === 'mutation_event') as (PlayerCard & { type: 'mutation_event' })[];
            const normalCards = drawnPlayerCards.filter(c => c.type !== 'epidemic' && c.type !== 'virulent_strain_epidemic' && c.type !== 'mutation_event');
            
            player.hand.push(...normalCards);
            normalCards.forEach(c => newState.log.unshift(`- ${player.name} draws ${getCardDisplayName(c)}.`));
            
            if (mutationEvents.length > 0) {
                newState.pendingMutationEvents = mutationEvents.map(c => c.name);
                if (epidemicCard) {
                    newState.pendingEpidemicCard = epidemicCard;
                }
                newState.gamePhase = GamePhase.ResolvingMutationEvent;
                newState.log.unshift(`- ${player.name} draws ${mutationEvents.map(c => getCardDisplayName(c)).join(' and ')}!`);
            } else if (epidemicCard) {
                newState.playerDiscard.push(epidemicCard);
                newState.log.unshift(`- ${epidemicCard.type === 'virulent_strain_epidemic' ? 'VIRULENT STRAIN ' : ''}EPIDEMIC drawn!`);
                newState.gamePhase = GamePhase.Epidemic;
            } else {
                const cardsToDiscardCount = player.hand.length - getHandLimit(player);
                if (cardsToDiscardCount > 0) {
                    newState.gamePhase = GamePhase.Discarding;
                    newState.playerToDiscardId = player.id;
                    discardTriggerRef.current = 'draw';
                    newState.log.unshift(`- ${player.name} must discard ${cardsToDiscardCount} card(s).`);
                } else {
                    newState.gamePhase = GamePhase.PreInfectionPhase;
                }
            }
            return newState;
        });
        setDrawnPlayerCards(null);
    }, [drawnPlayerCards, setGameState, setDrawnPlayerCards, getHandLimit]);

    const handleConfirmDiscard = useCallback((discardSelection: number[]) => {
        setGameState(prevState => {
            if (!prevState || prevState.playerToDiscardId === null) return null;
            const newState = safeCloneGameState(prevState);
            const playerToUpdate = newState.players.find((p: Player) => p.id === prevState.playerToDiscardId)!;
            
            const cardsToKeep: PlayerCard[] = [];
            const cardsToDiscard: PlayerCard[] = [];
            playerToUpdate.hand.forEach((card: PlayerCard, index: number) => {
                if (discardSelection.includes(index)) cardsToDiscard.push(card);
                else cardsToKeep.push(card);
            });
            playerToUpdate.hand = cardsToKeep;
            newState.playerDiscard.push(...cardsToDiscard);
            newState.log.unshift(`- ${playerToUpdate.name} discards ${cardsToDiscard.map(c => getCardDisplayName(c)).join(', ')}.`);
            
            newState.playerToDiscardId = null;

            // Determine the next game phase after discarding is complete.
            let nextPhase: GamePhase;

            // Priority 1: A specific phase was saved before the discard modal was triggered.
            if (newState.phaseBeforeEvent) {
                nextPhase = newState.phaseBeforeEvent;
                newState.phaseBeforeEvent = null; // Consume the stored phase
            } 
            // Priority 2: Handle post-draw events that were pending.
            else if (newState.pendingMutationEvents.length > 0) {
                nextPhase = GamePhase.ResolvingMutationEvent;
            } else if (newState.pendingEpidemicCard) {
                newState.playerDiscard.push(newState.pendingEpidemicCard);
                const isVirulent = newState.pendingEpidemicCard.type === 'virulent_strain_epidemic';
                newState.log.unshift(`- ${isVirulent ? 'VIRULENT STRAIN ' : ''}EPIDEMIC drawn!`);
                nextPhase = GamePhase.Epidemic;
                newState.pendingEpidemicCard = null;
            } 
            // Priority 3: Determine phase based on what triggered the discard.
            else {
                if (discardTriggerRef.current === 'draw') {
                    nextPhase = GamePhase.PreInfectionPhase;
                } else { // 'action' or null
                    nextPhase = prevState.actionsRemaining > 0 ? GamePhase.PlayerAction : GamePhase.PreDrawPlayerCards;
                }
            }
            
            newState.gamePhase = nextPhase;
            discardTriggerRef.current = null;
            return newState;
        });
    }, [setGameState, getHandLimit]);

    const handleStartInfectionPhase = useCallback(() => {
        setGameState(prevState => {
            if (!prevState) return null;

            if (prevState.oneQuietNightActive) {
                const newState = safeCloneGameState(prevState);
                newState.oneQuietNightActive = false;
                newState.log.unshift("- One Quiet Night is active. Infection phase is skipped.");
                return _startNextTurn(newState);
            }

            if (prevState.abundansCautelaStatus === 'corrupt_active') {
                const newState = safeCloneGameState(prevState);
                newState.abundansCautelaStatus = 'inactive';
                newState.log.unshift("- Abundans Cautela Non Nocet (Corrupt) is active. Invasion phase is skipped.");
                return _startNextTurn(newState);
            }

            if (prevState.goodSeasonsActive) {
                const newState = safeCloneGameState(prevState);
                newState.goodSeasonsActive = false; // It's a one-time effect
                logEvent("Good Seasons is active! Drawing 1 card from the bottom of the Infection Deck.");
    
                if (newState.infectionDeck.length === 0) {
                    logEvent("Infection Deck is empty. Good Seasons has no effect.");
                    return _startNextTurn(newState);
                }
    
                const cardToDraw = newState.infectionDeck.pop()!; // Draw from the bottom
                setInfectionStepState({ queue: [cardToDraw], revealedCard: null, outbreaksThisTurn: new Set(), invadedCity: null });
                
                newState.gamePhase = GamePhase.InfectionStep;
                return newState;
            }
            
            const newState = safeCloneGameState(prevState);
            
            const rates = newState.gameType === 'fallOfRome' ? FALLOFROME_INVASION_RATES : PANDEMIC_INFECTION_RATES;
            let infectionCount = newState.commercialTravelBanPlayerId !== null ? 1 : rates[newState.infectionRateIndex];
            if (newState.commercialTravelBanPlayerId !== null) {
                newState.log.unshift(`- Commercial Travel Ban reduces infection rate to 1.`);
            }
            
            if (newState.abundansCautelaStatus === 'normal_active') {
                infectionCount = Math.max(0, infectionCount - 2);
                newState.abundansCautelaStatus = 'inactive';
                logEvent(`Abundans Cautela Non Nocet (Normal) reduces the number of invasion cards drawn to ${infectionCount}.`);
            }

            if (infectionCount === 0) {
                logEvent("Invasion rate is 0. The Invade Cities step is skipped.");
                return _startNextTurn(newState);
            }
        
            const cardsToDraw: InfectionCard[] = [];
            let vsCardDrawn = false;
            
            for (let i = 0; i < infectionCount; i++) {
                if (newState.infectionDeck.length === 0) break;
                const card = newState.infectionDeck.shift()!;
                cardsToDraw.push(card);
                if (card.type === 'city' && newState.virulentStrainColor && CITIES_DATA[card.name].color === newState.virulentStrainColor) {
                    vsCardDrawn = true;
                }
            }
        
            if (vsCardDrawn && newState.activeVirulentStrainCards.includes(VirulentStrainEpidemicCardName.RateEffect) && !newState.eradicatedDiseases[newState.virulentStrainColor!]) {
                if (newState.infectionDeck.length > 0) {
                    const extraCard = newState.infectionDeck.shift()!;
                    cardsToDraw.push(extraCard);
                    logEvent(`Rate Effect triggers, drawing an extra infection card: ${getCardDisplayName(extraCard)}.`);
                }
            }
        
            setInfectionStepState({ queue: cardsToDraw, revealedCard: null, outbreaksThisTurn: new Set(), invadedCity: null });
            
            newState.gamePhase = GamePhase.InfectionStep;
            return newState;
        });
    }, [setGameState, setInfectionStepState, _startNextTurn, logEvent]);

    const _getFallOfRomeInvasionTarget = (gs: GameState, drawnCard: InfectionCard & { type: 'city' }): CityName => {
        const { name: drawnCityName, color: tribe } = drawnCard;
        const migrationPathData = FALLOFROME_MIGRATION_PATHS.find(p => p.tribe === tribe && p.path.includes(drawnCityName));
        if (!migrationPathData) return drawnCityName;

        const path = migrationPathData.path;
        const cityIndex = path.indexOf(drawnCityName);

        for (let i = cityIndex; i > 0; i--) {
            const currentCityName = path[i] as CityName;
            const previousCityName = path[i - 1] as CityName;
            const hasBarbariansInCity = (gs.diseaseCubes[currentCityName]?.[tribe] || 0) > 0;
            const previousIsCity = CITIES_DATA.hasOwnProperty(previousCityName);
            const hasBarbariansInPreviousCity = previousIsCity && (gs.diseaseCubes[previousCityName]?.[tribe] || 0) > 0;

            if (hasBarbariansInCity || hasBarbariansInPreviousCity) {
                return currentCityName;
            }
        }
        return path[1] as CityName;
    };

    const handleAcknowledgeInfectionStep = useCallback(() => {
        if (!gameState) return;
        
        const isLastCard = infectionStepState.queue.length === 0;

        if (isLastCard) {
            setGameState(gs => gs ? _startNextTurn(gs) : null);
            setInfectionStepState({ queue: [], revealedCard: null, outbreaksThisTurn: new Set(), invadedCity: null });
        } else {
            // There are more cards to process. Clear the revealed card, and the useEffect will pick up the next one.
            setInfectionStepState(prev => ({ ...prev, revealedCard: null, invadedCity: null }));
        }
    }, [gameState, infectionStepState.queue.length, _startNextTurn, setGameState, setInfectionStepState]);

    const handleEpidemicPhase = useCallback(() => {
        setGameState(prevState => {
            if (!prevState) return null;
            const newState = safeCloneGameState(prevState);
            newState.log.unshift("- EPIDEMIC processing...");
            const epidemicCard = newState.playerDiscard[newState.playerDiscard.length - 1];
    
            // 1. Increase
            newState.infectionRateIndex++;
            const rates = newState.gameType === 'fallOfRome' ? FALLOFROME_INVASION_RATES : PANDEMIC_INFECTION_RATES;
            const rateName = newState.gameType === 'fallOfRome' ? 'Invasion rate' : 'Infection rate';
            newState.log.unshift(`- ${rateName} increases to ${rates[newState.infectionRateIndex]}.`);
    
            if (newState.gameType === 'fallOfRome') {
                newState.recruitmentRateIndex++;
                const recruitmentRates = FALLOFROME_RECRUITMENT_RATES;
                const newRecruitmentRate = recruitmentRates[newState.recruitmentRateIndex];
                newState.log.unshift(`- Recruitment Rate decreases to ${newRecruitmentRate}.`);
            }
    
            // 2. Infect
            const bottomCard = newState.infectionDeck.pop()!;
            newState.infectionDiscard.push(bottomCard);
            newState.epidemicInfectionResults = []; // Clear previous results
    
            if (bottomCard.type === 'mutation') {
                 logEvent(`- Epidemic infects... a MUTATION card! No infection occurs from this step.`);
                 newState.epidemicCardToAnnounce = bottomCard;
                 newState.gamePhase = GamePhase.EpidemicAnnounceInfect;
                 return newState;
            }
            
            const cityToInfect = bottomCard.name;
            const color = bottomCard.color;
            newState.log.unshift(`- Epidemic infects ${CITIES_DATA[cityToInfect].name}.`);
    
            // 2a. Determine Virulent Strain on first epidemic
            if (newState.setupConfig.useVirulentStrainChallenge && !newState.virulentStrainColor) {
                const cubeCounts = (Object.values(DiseaseColor)).reduce((acc, c) => ({ ...acc, [c]: 0 }), {} as Record<DiseaseColor, number>);
                Object.values(newState.diseaseCubes).forEach(cityCubes => {
                    Object.entries(cityCubes).forEach(([c, count]) => {
                        cubeCounts[c as DiseaseColor] += count!;
                    });
                });
                
                let maxCubes = -1;
                let tiedColors: DiseaseColor[] = [];
                Object.entries(cubeCounts).forEach(([c, count]) => {
                    if (c === DiseaseColor.Purple) return; // Purple cannot be the virulent strain
                    if (count > maxCubes) {
                        maxCubes = count;
                        tiedColors = [c as DiseaseColor];
                    } else if (count === maxCubes) {
                        tiedColors.push(c as DiseaseColor);
                    }
                });
                
                const chosenStrain = tiedColors.length > 1 ? shuffle(tiedColors)[0] : tiedColors[0];
                newState.virulentStrainColor = chosenStrain;
                const strainMessage = `The ${chosenStrain.toUpperCase()} disease is now the VIRULENT STRAIN!`;
                newState.log.unshift(`- ${strainMessage}`);
                setModalContent({ title: "VIRULENT STRAIN IDENTIFIED!", body: strainMessage, color: "text-purple-400" });
            }
    
            // 2b. Handle immediate Virulent Strain effects BEFORE intensify
            if (epidemicCard?.type === 'virulent_strain_epidemic') {
                 const vsCardName = epidemicCard.name;
                 const vsCardInfo = VIRULENT_STRAIN_EPIDEMIC_INFO[vsCardName];
                 
                 if (vsCardInfo.continuing && !newState.activeVirulentStrainCards.includes(vsCardName)) {
                     newState.activeVirulentStrainCards.push(vsCardName);
                     logEvent(`${vsCardInfo.name} is now in effect.`);
                 }
                 
                 const vsColor = newState.virulentStrainColor;
                 if (!vsCardInfo.continuing && vsColor) {
                     logEvent(`Immediate effect of ${vsCardInfo.name} triggers.`);
                     const outbreaksInTurn = new Set<CityName>();
                     switch (vsCardName) {
                         case VirulentStrainEpidemicCardName.UnacceptableLoss:
                             const toRemove = Math.min(4, newState.remainingCubes[vsColor]);
                             newState.remainingCubes[vsColor] -= toRemove;
                             logEvent(`Unacceptable Loss: ${toRemove} ${vsColor} cubes removed from the game.`);
                             break;
                         case VirulentStrainEpidemicCardName.UncountedPopulations:
                             Object.entries(newState.diseaseCubes).forEach(([cityName, cityCubes]) => {
                                 if (cityCubes[vsColor] === 1) {
                                     const result = _performInfection(newState, cityName as CityName, vsColor, outbreaksInTurn, [], 1);
                                     newState.epidemicInfectionResults.push(result);
                                 }
                             });
                             logEvent(`Uncounted Populations: 1 ${vsColor} cube added to each city with exactly one.`);
                             break;
                         case VirulentStrainEpidemicCardName.HiddenPocket:
                             if (newState.eradicatedDiseases[vsColor]) {
                                 const vsCardsInDiscard = newState.infectionDiscard.filter(c => c.type === 'city' && c.color === vsColor);
                                 if (vsCardsInDiscard.length > 0) {
                                     newState.eradicatedDiseases[vsColor] = false;
                                     logEvent(`Hidden Pocket: ${vsColor} is no longer eradicated!`);
                                     const citiesToInfect = [...new Set(vsCardsInDiscard.map(c => (c as {type: 'city', name: CityName}).name))];
                                     citiesToInfect.forEach(c => {
                                        const result = _performInfection(newState, c, vsColor, outbreaksInTurn, [], 1);
                                        newState.epidemicInfectionResults.push(result);
                                     });
                                     logEvent(`1 ${vsColor} cube placed on: ${citiesToInfect.map(c => CITIES_DATA[c].name).join(', ')}.`);
                                 }
                             }
                             break;
                     }
                 }
            }
    
            if (!newState.eradicatedDiseases[color]) {
                const outbreaksInTurn = new Set<CityName>();
                const newlyOutbrokenCities: CityName[] = [];
                for (let i = 0; i < 3; i++) {
                    if (newState.gamePhase === GamePhase.GameOver) break;
                    const result = _performInfection(newState, cityToInfect, color, outbreaksInTurn, newlyOutbrokenCities, 1);
                    newState.epidemicInfectionResults.push(result);
    
                    if (newState.gamePhase === GamePhase.ResolvingPurificationChoice) {
                        // A choice is needed. Pause the epidemic infection process.
                        newState.infectionContinuation = {
                            type: 'epidemic',
                            city: cityToInfect,
                            color: color,
                            remaining: 2 - i, // Cubes left to place after this one is resolved
                            outbreaksInTurn: Array.from(outbreaksInTurn),
                            newlyOutbrokenCities: newlyOutbrokenCities
                        };
                        return newState; // Exit immediately, game is paused
                    }
                }
    
                if (newlyOutbrokenCities.length > 0) {
                    const isFallOfRome = newState.gameType === 'fallOfRome';
                    const title = isFallOfRome ? "CITY SACKED!" : "OUTBREAK ALERT";
                    const cityNames = newlyOutbrokenCities.map(c => CITIES_DATA[c].name).join(', ');
                    setTimeout(() => generateOutbreakReport(cityNames, newState.useAiNarratives, newState.gameType).then(msg => msg && setModalContent({ title: title, body: msg, color: "text-red-500" })), 500);
                }
            }
    
            if (newState.gamePhase === GamePhase.GameOver) return newState;
    
            // 3. Announce
            newState.epidemicCardToAnnounce = bottomCard;
            newState.gamePhase = GamePhase.EpidemicAnnounceInfect;
            
            return newState;
        });
    }, [setGameState, setModalContent, logEvent]);

    const handleConfirmEpidemicInfect = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.EpidemicAnnounceInfect) return null;
            const newState = safeCloneGameState(prevState);
            newState.epidemicCardToAnnounce = null;
            newState.gamePhase = GamePhase.EpidemicIntensify;
            return newState;
        });
        setIntensifyModalOpen(true);
    }, [setGameState, setIntensifyModalOpen]);

    const executeIntensify = useCallback(() => {
        setGameState(prevState => {
            if (!prevState) return null;
            const newState = safeCloneGameState(prevState);
            newState.infectionDeck = [...shuffle(newState.infectionDiscard), ...newState.infectionDeck];
            newState.infectionDiscard = [];
            newState.log.unshift(`- Infection discard pile is shuffled and placed on top of the deck.`);
            newState.gamePhase = GamePhase.PostEpidemicEventWindow;
            return newState;
        });
        setIntensifyModalOpen(false);
    }, [setGameState, setIntensifyModalOpen]);

    const handleContinueToInfectionPhase = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.PostEpidemicEventWindow) return prevState;
            const newState = safeCloneGameState(prevState);
            newState.gamePhase = GamePhase.PreInfectionPhase;
            logEvent("Continuing to Infection Phase.");
            return newState;
        });
    }, [setGameState, logEvent]);

    const handlePlayEventCard = useCallback((cardName: EventCardName, ownerId: number) => {
        setGameState(prevState => {
            if (!prevState) return null;
            
            const owner = prevState.players.find((p: Player) => p.id === ownerId)!;
            const cardIndex = owner.hand.findIndex((c: PlayerCard) => c.type === 'event' && c.name === cardName);
            if (cardIndex === -1) return prevState;

            if (cardName === EventCardName.Forecast) {
                const newState = safeCloneGameState(prevState);
                newState.phaseBeforeEvent = prevState.gamePhase;
                newState.gamePhase = GamePhase.ConfirmingForecast;
                newState.pendingEvent = { cardName, ownerId, from: 'hand' };
                return newState;
            }

            const snapshot = safeCloneGameState(prevState);
            const { actionHistory, ...stateToSave } = snapshot;

            const newState = safeCloneGameState(prevState);
            newState.actionHistory.push(stateToSave as GameState); // Save state before mutation

            const newOwner = newState.players.find((p: Player) => p.id === ownerId)!;
            
            const [card] = newOwner.hand.splice(cardIndex, 1);
            newState.playerDiscard.push(card);
            logEvent(`${newOwner.name} plays the event card: ${cardName}.`);

            const interactiveEventPhases: Partial<Record<EventCardName, GamePhase>> = {
                [EventCardName.GovernmentGrant]: GamePhase.ResolvingGovernmentGrant,
                [EventCardName.Airlift]: GamePhase.ResolvingAirlift,
                [EventCardName.NewAssignment]: GamePhase.ResolvingNewAssignment,
                [EventCardName.SpecialOrders]: GamePhase.ResolvingSpecialOrders,
                [EventCardName.RemoteTreatment]: GamePhase.ResolvingRemoteTreatment,
                [EventCardName.OverseasMigration]: GamePhase.ResolvingRemoteTreatment,
                [EventCardName.ReExaminedResearch]: GamePhase.ResolvingReExaminedResearch,
                [EventCardName.RapidVaccineDeployment]: GamePhase.ResolvingRapidVaccineDeployment,
                [EventCardName.SiVisPacemParaBellum]: GamePhase.ResolvingSiVisPacemParaBellum,
                [EventCardName.HicManebimusOptime]: GamePhase.ResolvingHicManebimusOptime,
                [EventCardName.AudentesFortunaIuvat]: GamePhase.ResolvingAudentesFortunaIuvat,
                [EventCardName.PurifyWater]: GamePhase.ResolvingPurifyWaterEvent, 
                [EventCardName.RingRailroads]: GamePhase.ResolvingRingRailroads,
                [EventCardName.ScienceTriumph]: GamePhase.ResolvingScienceTriumph,
            };

            const targetPhase = interactiveEventPhases[cardName];
            if (targetPhase) {
                if (cardName === EventCardName.RapidVaccineDeployment && prevState.gamePhase !== GamePhase.PostCureAction) {
                    logEvent("Rapid Vaccine Deployment can only be played immediately after discovering a cure.");
                    return prevState; // Revert state change
                }
                if (cardName === EventCardName.AudentesFortunaIuvat && (prevState.gamePhase !== GamePhase.DrawingPlayerCards && prevState.gamePhase !== GamePhase.ResolvingVestalisPlayerCardDraw)) {
                    logEvent("Audentes Fortuna Iuvat can only be played after drawing your player cards.");
                    return prevState;
                }
                newState.phaseBeforeEvent = newState.gamePhase;
                newState.gamePhase = targetPhase;
            
                // Set the card for the modal if it's one of our target events
                if (cardName === EventCardName.RemoteTreatment || cardName === EventCardName.OverseasMigration) {
                    newState.pendingEventCardForModal = cardName;
                }
                if (cardName === EventCardName.PurifyWater) {
                    if (newState.purificationTokenSupply < 1) {
                        logEvent("Cannot play Purify Water: No purification tokens are left in the supply.");
                        return prevState; // Revert state change
                    }
                    newState.pendingPurifyWaterEvent = { tokensRemaining: Math.min(2, newState.purificationTokenSupply) };
                }
                if (cardName === EventCardName.RingRailroads) {
                    if ((newState.railroads?.length || 0) > 17) { // 20 total, need 3
                        logEvent("Cannot play Ring Railroads: Fewer than 3 railroad tokens remain.");
                        return prevState;
                    }
                    newState.pendingRingRailroadsEvent = { tokensRemaining: 3 };
                }
            
                return newState;
            }

            switch(cardName) {
                case EventCardName.OneQuietNight:
                    newState.oneQuietNightActive = true;
                    logEvent("The next infection phase will be skipped.");
                    break;
                case EventCardName.OneMoreDay:
                case EventCardName.BorrowedTime: { // A block is used to create a new scope for constants
                    const isActionPhase = newState.gamePhase === GamePhase.PlayerAction;
                
                    if (isActionPhase) {
                        // Card is played during the action phase. Award actions to the CURRENT player.
                        const currentPlayer = newState.players[newState.currentPlayerIndex];
                        newState.actionsRemaining += 2;
                        logEvent(`${owner.name} played ${cardName}. ${currentPlayer.name} gets 2 extra actions THIS turn.`);
                    } else {
                        // Card is played outside the action phase. Award actions to the NEXT player.
                        newState.extraActionsForNextTurn += 2;
                        // The current turn is not over yet, so the "next" player is still currentPlayerIndex + 1
                        const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
                        const nextPlayer = newState.players[nextPlayerIndex];
                        logEvent(`${owner.name} played ${cardName}. ${nextPlayer.name} will get 2 extra actions on their NEXT turn.`);
                    }
                    break;
                }
                case EventCardName.MobileHospital:
                    newState.mobileHospitalActiveThisTurn = true;
                    logEvent(`Mobile Hospital is active for the rest of ${newState.players[newState.currentPlayerIndex].name}'s turn.`);
                    break;
                case EventCardName.CommercialTravelBan:
                    newState.commercialTravelBanPlayerId = newState.players[newState.currentPlayerIndex].id;
                    logEvent(`The infection rate is now 1 until the start of ${newState.players[newState.currentPlayerIndex].name}'s next turn.`);
                    break;
                case EventCardName.InfectionZoneBan:
                    newState.infectionZoneBanPlayerId = newState.players[newState.currentPlayerIndex].id;
                    logEvent("Chain reaction outbreaks are now ignored until the start of your next turn.");
                    break;
                case EventCardName.ImprovedSanitation:
                    newState.improvedSanitationPlayerId = newState.players[newState.currentPlayerIndex].id;
                    logEvent("Treat Disease actions are now more effective until the start of your next turn.");
                    break;
                case EventCardName.SequencingBreakthrough:
                    newState.sequencingBreakthroughPlayerId = newState.players[newState.currentPlayerIndex].id;
                    logEvent("The next Discover a Cure action requires one fewer card.");
                    break;
                case EventCardName.DoUtDes:
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingDoUtDes;
                    return newState; // Return early as this is interactive
                case EventCardName.VaeVictis:
                    if (!newState.pendingVaeVictisContext) {
                        logEvent("Vae Victis can only be played immediately after a battle where barbarians were removed.");
                        return prevState; // Revert because it's an invalid play
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingVaeVictis;
                    return newState;
                case EventCardName.MorsTuaVitaMea:
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingMorsTuaVitaMea;
                    return newState;
                case EventCardName.HomoFaberFortunaeSuae:
                    if (!prevState.playerDiscard.some(c => c.type === 'city')) {
                        logEvent("Homo Faber Fortunae Suae cannot be played as there are no city cards in the discard pile.");
                        return prevState;
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingHomoFaberFortunaeSuae;
                    return newState;
                case EventCardName.AleaIactaEst:
                    if (prevState.gamePhase !== GamePhase.PlayerAction) {
                        logEvent("Alea Iacta Est can only be played during the Do Actions step.");
                        return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingAleaIactaEst;
                    return newState;
                case EventCardName.AbundansCautelaNonNocet:
                    // This card can be played at any time.
                    if (newState.phaseBeforeEvent || newState.gamePhase === GamePhase.GameOver) {
                         logEvent("Cannot play Abundans Cautela Non Nocet at this time.");
                         return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingAbundansCautelaNonNocet;
                    return newState;
                case EventCardName.MeliusCavereQuamPavere:
                    if (newState.phaseBeforeEvent || newState.gamePhase === GamePhase.GameOver) {
                        logEvent("Cannot play Melius Cavere Quam Pavere at this time.");
                        return prevState; // Revert
                    }
                    if (newState.infectionDeck.length === 0) {
                        logEvent("Cannot play Melius Cavere Quam Pavere as the Barbarian Deck is empty.");
                        return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingMeliusCavereQuamPavere;
                    return newState;
                case EventCardName.MortuiNonMordent:
                    if (newState.phaseBeforeEvent || newState.gamePhase === GamePhase.GameOver) {
                        logEvent("Cannot play Mortui Non Mordent at this time.");
                        return prevState; // Revert
                    }
                    const areAnyCubesOnBoard = Object.values(newState.diseaseCubes).some(cityCubes =>
                        Object.values(cityCubes || {}).some(count => count > 0)
                    );
                    if (!areAnyCubesOnBoard) {
                        logEvent("Cannot play Mortui Non Mordent as there are no barbarians on the board.");
                        return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingMortuiNonMordent;
                    return newState
                case EventCardName.FestinaLente:
                    if (newState.phaseBeforeEvent || newState.gamePhase === GamePhase.GameOver) {
                        logEvent("Cannot play Festina Lente at this time.");
                        return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingFestinaLente;
                    return newState;
                case EventCardName.VeniVidiVici:
                    if (prevState.gamePhase !== GamePhase.PlayerAction) {
                        logEvent("Veni, Vidi, Vici can only be played during the Do Actions step.");
                        return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingVeniVidiVici;
                    return newState;
                case EventCardName.CarpeDiem:
                    if (newState.phaseBeforeEvent || newState.gamePhase === GamePhase.GameOver) {
                        logEvent("Cannot play Carpe Diem at this time.");
                        return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingCarpeDiem;
                    return newState;
                case EventCardName.GoodSeasons: {
                    newState.goodSeasonsActive = true;
                    logEvent("The next infection phase will be affected by Good Seasons.");
                    break;
                    }
                case EventCardName.GovernmentMobilization: {
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingGovernmentMobilization;
                    
                    const currentPlayerId = newState.players[newState.currentPlayerIndex].id;
                    const currentIdIndex = newState.players.findIndex(p => p.id === currentPlayerId);
                
                    const playersToMove = [
                        ...newState.players.slice(currentIdIndex).map(p => p.id),
                        ...newState.players.slice(0, currentIdIndex).map(p => p.id)
                    ];
                
                    newState.pendingGovernmentMobilization = { playersToMove };
                    logEvent("Government Mobilization is played! Each player will move once for free.");
                    return newState; // Return early for interactive events
                }
                case EventCardName.HospitalFounding: {
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingHospitalFounding;
                    return newState;
                }
                case EventCardName.MailCorrespondence: {
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingMailCorrespondence;
                    return newState;
                }
                case EventCardName.NewRails: {
                    if ((newState.railroads?.length || 0) >= 18) {
                        logEvent("Cannot play New Rails: Fewer than 2 railroad tokens remain in the supply.");
                        return prevState; // Revert state change because it's an invalid play
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingNewRails;
                    return newState;
                }

                }
                return newState;
            });
        }, [logEvent]);

    const handlePlayContingencyCard = useCallback((cardName: EventCardName, ownerId: number) => {
        setGameState(prevState => {
             if (!prevState) return null;
            const owner = prevState.players.find((p: Player) => p.id === ownerId)!;
            if (owner.role !== PlayerRole.ContingencyPlanner || owner.contingencyCard !== cardName) return prevState;
            
            if (cardName === EventCardName.Forecast) {
                const newState = safeCloneGameState(prevState);
                newState.phaseBeforeEvent = prevState.gamePhase;
                newState.gamePhase = GamePhase.ConfirmingForecast;
                newState.pendingEvent = { cardName, ownerId, from: 'contingency' };
                return newState;
            }

            const snapshot = safeCloneGameState(prevState);
            const { actionHistory, ...stateToSave } = snapshot;

            const newState = safeCloneGameState(prevState);
            newState.actionHistory.push(stateToSave as GameState); // Save state before mutation

            const newOwner = newState.players.find((p: Player) => p.id === ownerId)!;
            newOwner.contingencyCard = null;

            logEvent(`${newOwner.name} plays their planned event: ${cardName}.`);
            
            const interactiveEventPhases: Partial<Record<EventCardName, GamePhase>> = {
                [EventCardName.GovernmentGrant]: GamePhase.ResolvingGovernmentGrant,
                [EventCardName.Airlift]: GamePhase.ResolvingAirlift,
                [EventCardName.NewAssignment]: GamePhase.ResolvingNewAssignment,
                [EventCardName.SpecialOrders]: GamePhase.ResolvingSpecialOrders,
                [EventCardName.RemoteTreatment]: GamePhase.ResolvingRemoteTreatment,
                [EventCardName.OverseasMigration]: GamePhase.ResolvingRemoteTreatment,
                [EventCardName.ReExaminedResearch]: GamePhase.ResolvingReExaminedResearch,
                [EventCardName.RapidVaccineDeployment]: GamePhase.ResolvingRapidVaccineDeployment,
                [EventCardName.SiVisPacemParaBellum]: GamePhase.ResolvingSiVisPacemParaBellum,
                [EventCardName.HicManebimusOptime]: GamePhase.ResolvingHicManebimusOptime,
                [EventCardName.PurifyWater]: GamePhase.ResolvingPurifyWaterEvent,
                [EventCardName.RingRailroads]: GamePhase.ResolvingRingRailroads,
                [EventCardName.ScienceTriumph]: GamePhase.ResolvingScienceTriumph,
            };

            const targetPhase = interactiveEventPhases[cardName];
            if (targetPhase) {
                if (cardName === EventCardName.RapidVaccineDeployment && prevState.gamePhase !== GamePhase.PostCureAction) {
                    logEvent("Rapid Vaccine Deployment can only be played immediately after discovering a cure.");
                    return prevState; // Revert state change
                }
                newState.phaseBeforeEvent = newState.gamePhase;
                newState.gamePhase = targetPhase;
            
                // Set the card for the modal if it's one of our target events
                if (cardName === EventCardName.RemoteTreatment || cardName === EventCardName.OverseasMigration) {
                    newState.pendingEventCardForModal = cardName;
                }
                if (cardName === EventCardName.PurifyWater) {
                    if (newState.purificationTokenSupply < 1) {
                        logEvent("Cannot play Purify Water: No purification tokens are left in the supply.");
                        return prevState; // Revert state change
                    }
                    newState.pendingPurifyWaterEvent = { tokensRemaining: Math.min(2, newState.purificationTokenSupply) };
                }
                if (cardName === EventCardName.RingRailroads) {
                    if ((newState.railroads?.length || 0) > 17) {
                        logEvent("Cannot play Ring Railroads: Fewer than 3 railroad tokens remain.");
                        return prevState;
                    }
                    newState.pendingRingRailroadsEvent = { tokensRemaining: 3 };
                }
            
                return newState;
            }

             switch(cardName) {
                case EventCardName.OneQuietNight:
                    newState.oneQuietNightActive = true;
                    logEvent("The next infection phase will be skipped.");
                    break;
                case EventCardName.OneMoreDay:
                case EventCardName.BorrowedTime: { // A block is used to create a new scope for constants
                    const isActionPhase = newState.gamePhase === GamePhase.PlayerAction;
                
                    if (isActionPhase) {
                        // Card is played during the action phase. Award actions to the CURRENT player.
                        const currentPlayer = newState.players[newState.currentPlayerIndex];
                        newState.actionsRemaining += 2;
                        logEvent(`${owner.name} played ${cardName}. ${currentPlayer.name} gets 2 extra actions THIS turn.`);
                    } else {
                        // Card is played outside the action phase. Award actions to the NEXT player.
                        newState.extraActionsForNextTurn += 2;
                        // The current turn is not over yet, so the "next" player is still currentPlayerIndex + 1
                        const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
                        const nextPlayer = newState.players[nextPlayerIndex];
                        logEvent(`${owner.name} played ${cardName}. ${nextPlayer.name} will get 2 extra actions on their NEXT turn.`);
                    }
                    break;
                }
                case EventCardName.MobileHospital:
                    newState.mobileHospitalActiveThisTurn = true;
                    logEvent(`Mobile Hospital is active for the rest of ${newState.players[newState.currentPlayerIndex].name}'s turn.`);
                    break;
                case EventCardName.CommercialTravelBan:
                    newState.commercialTravelBanPlayerId = newState.players[newState.currentPlayerIndex].id;
                    logEvent(`The infection rate is now 1 until the start of ${newState.players[newState.currentPlayerIndex].name}'s next turn.`);
                    break;
                case EventCardName.InfectionZoneBan:
                    newState.infectionZoneBanPlayerId = newState.players[newState.currentPlayerIndex].id;
                    logEvent("Chain reaction outbreaks are now ignored until the start of your next turn.");
                    break;
                case EventCardName.ImprovedSanitation:
                    newState.improvedSanitationPlayerId = newState.players[newState.currentPlayerIndex].id;
                    logEvent("Treat Disease actions are now more effective until the start of your next turn.");
                    break;
                case EventCardName.SequencingBreakthrough:
                    newState.sequencingBreakthroughPlayerId = newState.players[newState.currentPlayerIndex].id;
                    logEvent("The next Discover a Cure action requires one fewer card.");
                    break;
                case EventCardName.DoUtDes:
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingDoUtDes;
                    return newState; // Return early as this is interactive
                case EventCardName.VaeVictis:
                    if (!newState.pendingVaeVictisContext) {
                        logEvent("Vae Victis can only be played immediately after a battle where barbarians were removed.");
                        return prevState; // Revert because it's an invalid play
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingVaeVictis;
                    return newState;
                case EventCardName.MorsTuaVitaMea:
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingMorsTuaVitaMea;
                    return newState;
                case EventCardName.HomoFaberFortunaeSuae:
                    if (!prevState.playerDiscard.some(c => c.type === 'city')) {
                        logEvent("Homo Faber Fortunae Suae cannot be played as there are no city cards in the discard pile.");
                        return prevState;
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingHomoFaberFortunaeSuae;
                    return newState;
                case EventCardName.AleaIactaEst:
                    if (prevState.gamePhase !== GamePhase.PlayerAction) {
                        logEvent("Alea Iacta Est can only be played during the Do Actions step.");
                        return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingAleaIactaEst;
                    return newState;
                case EventCardName.AbundansCautelaNonNocet:
                    // This card can be played at any time.
                    if (newState.phaseBeforeEvent || newState.gamePhase === GamePhase.GameOver) {
                         logEvent("Cannot play Abundans Cautela Non Nocet at this time.");
                         return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingAbundansCautelaNonNocet;
                    return newState;
                case EventCardName.MeliusCavereQuamPavere:
                    if (newState.phaseBeforeEvent || newState.gamePhase === GamePhase.GameOver) {
                        logEvent("Cannot play Melius Cavere Quam Pavere at this time.");
                        return prevState; // Revert
                    }
                    if (newState.infectionDeck.length === 0) {
                        logEvent("Cannot play Melius Cavere Quam Pavere as the Barbarian Deck is empty.");
                        return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingMeliusCavereQuamPavere;
                    return newState;
                case EventCardName.MortuiNonMordent:
                    if (newState.phaseBeforeEvent || newState.gamePhase === GamePhase.GameOver) {
                        logEvent("Cannot play Mortui Non Mordent at this time.");
                        return prevState; // Revert
                    }
                    const areAnyCubesOnBoard = Object.values(newState.diseaseCubes).some(cityCubes =>
                        Object.values(cityCubes || {}).some(count => count > 0)
                    );
                    if (!areAnyCubesOnBoard) {
                        logEvent("Cannot play Mortui Non Mordent as there are no barbarians on the board.");
                        return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingMortuiNonMordent;
                    return newState;
                case EventCardName.FestinaLente:
                    if (newState.phaseBeforeEvent || newState.gamePhase === GamePhase.GameOver) {
                        logEvent("Cannot play Festina Lente at this time.");
                        return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingFestinaLente;
                    return newState;
                case EventCardName.VeniVidiVici:
                    if (prevState.gamePhase !== GamePhase.PlayerAction) {
                        logEvent("Veni, Vidi, Vici can only be played during the Do Actions step.");
                        return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingVeniVidiVici;
                    return newState;
                case EventCardName.CarpeDiem:
                    if (newState.phaseBeforeEvent || newState.gamePhase === GamePhase.GameOver) {
                        logEvent("Cannot play Carpe Diem at this time.");
                        return prevState; // Revert
                    }
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingCarpeDiem;
                    return newState;
                case EventCardName.HospitalFounding: {
                    newState.phaseBeforeEvent = newState.gamePhase;
                    newState.gamePhase = GamePhase.ResolvingHospitalFounding;
                    return newState;
                }
            }
            
            return newState;
        });
    }, [logEvent]);

    const handlePlayResilientPopulation = useCallback((ownerId: number, from: 'hand' | 'contingency', cardToRemove: InfectionCard) => {
        setGameState(prevState => {
            if (!prevState) return null;

            const snapshot = safeCloneGameState(prevState);
            const { actionHistory, ...stateToSave } = snapshot;

            const newState = safeCloneGameState(prevState);
            const owner = newState.players.find(p => p.id === ownerId)!;
            
            let cardPlayed = false;
            if (from === 'hand') {
                const cardIndex = owner.hand.findIndex(c => c.type === 'event' && c.name === EventCardName.ResilientPopulation);
                if (cardIndex > -1) {
                    const [card] = owner.hand.splice(cardIndex, 1);
                    newState.playerDiscard.push(card);
                    cardPlayed = true;
                }
            } else { // from === 'contingency'
                if (owner.contingencyCard === EventCardName.ResilientPopulation) {
                    owner.contingencyCard = null;
                    cardPlayed = true;
                }
            }

            if (!cardPlayed) {
                logEvent(`Error playing Resilient Population: card not found.`);
                return prevState;
            }
            
            const cardInDiscardIndex = newState.infectionDiscard.findIndex(c => {
                if (c.type !== cardToRemove.type) return false;
                if (c.type === 'mutation') return true;
                if (c.type === 'city' && cardToRemove.type === 'city') {
                    return c.name === cardToRemove.name && c.color === cardToRemove.color;
                }
                return false;
            });

            if (cardInDiscardIndex > -1) {
                newState.infectionDiscard.splice(cardInDiscardIndex, 1);
            } else {
                logEvent(`Error: Could not find ${getCardDisplayName(cardToRemove)} in the Infection Discard pile.`);
                return prevState;
            }

            newState.actionHistory.push(stateToSave as GameState);
            logEvent(`${owner.name} plays Resilient Population, removing ${getCardDisplayName(cardToRemove)} from the game.`);
            return newState;
        });
    }, [logEvent]);

    const handleRemoteTreatment = useCallback((selections: RemoteTreatmentSelection[]) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingRemoteTreatment) return null;
            const newState = safeCloneGameState(prevState);
            
            selections.forEach(sel => {
                if(newState.diseaseCubes[sel.city]?.[sel.color]) {
                    newState.diseaseCubes[sel.city]![sel.color]!--;
                    newState.remainingCubes[sel.color]++;
                    logEvent(`One ${sel.color} cube removed from ${CITIES_DATA[sel.city].name}.`);
                    _checkForEradication(newState, sel.color);
                }
            });

            if (newState.phaseBeforeEvent === GamePhase.PlayerAction) {
                if(newState.actionsRemaining === 0) newState.gamePhase = GamePhase.PreDrawPlayerCards;
                else newState.gamePhase = GamePhase.PlayerAction;
            } else {
                 newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            }
            newState.phaseBeforeEvent = null;
            newState.pendingEventCardForModal = null;

            return newState;
        });
    }, [logEvent, _checkForEradication]);

    const handleEpidemiologistTakeCard = useCallback((targetPlayerId: number, card: PlayerCard & { type: 'city' }) => {
        setGameState(prevState => {
            if(!prevState) return null;
            const wasResolving = prevState.gamePhase === GamePhase.ResolvingEpidemiologistTake;

            const snapshot = safeCloneGameState(prevState);
            const { actionHistory, ...stateToSave } = snapshot;
            const newState = safeCloneGameState(prevState);
            
            const targetPlayer = newState.players.find(p => p.id === targetPlayerId)!;
            const currentPlayer = newState.players[newState.currentPlayerIndex];

            const cardIndex = targetPlayer.hand.findIndex(c => c.type === 'city' && c.name === card.name);
            if (cardIndex > -1) {
                const [movedCard] = targetPlayer.hand.splice(cardIndex, 1);
                currentPlayer.hand.push(movedCard);
                newState.hasUsedEpidemiologistAbility = true;
                logEvent(`${currentPlayer.name} (Epidemiologist) takes the ${getCardDisplayName(card)} card from ${targetPlayer.name}.`);

                // This is a free action, so it should be undoable. Save to history.
                newState.actionHistory.push(stateToSave as GameState);

                if (wasResolving) {
                    newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                    newState.phaseBeforeEvent = null;
                }

                if (currentPlayer.hand.length > getHandLimit(currentPlayer)) {
                    newState.playerToDiscardId = currentPlayer.id;
                    newState.gamePhase = GamePhase.Discarding;
                    discardTriggerRef.current = 'action'; // Even though it's free, it's an action in terms of triggering discard
                    newState.log.unshift(`- ${currentPlayer.name} is over the hand limit and must discard.`);
                }
            }
            
            return newState;
        });
    }, [logEvent, getHandLimit]);

    const handleReturnSamples = (playerId: number, samplesToReturn: { [key in DiseaseColor]?: number }) => {
        setGameState(prevState => {
            if(!prevState) return null;
            const newState = safeCloneGameState(prevState);
            const player = newState.players.find(p => p.id === playerId)!;

            let logMessage = `${player.name} returns samples: `;
            const returnedParts: string[] = [];

            (Object.keys(samplesToReturn) as DiseaseColor[]).forEach(color => {
                const count = samplesToReturn[color];
                if (count && count > 0) {
                    player.samples[color] = (player.samples[color] || 0) - count;
                    newState.remainingCubes[color] += count;
                    returnedParts.push(`${count} ${color}`);
                }
            });

            if (returnedParts.length > 0) {
                 logEvent(logMessage + returnedParts.join(', '));
            }
            return newState;
        });
    };
    
    const handleGovernmentGrant = (city: CityName) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingGovernmentGrant) return prevState;
            const newState = safeCloneGameState(prevState);

            if (newState.researchStations.length >= 6) {
                logEvent(`All research stations are on the board. Choose one to move for the Government Grant.`);
                newState.stationRelocationTargetCity = city;
                newState.stationRelocationTrigger = 'event';
                newState.gamePhase = GamePhase.ResolvingStationRelocation;
                // phaseBeforeEvent is already set from when the event card was played.
                return newState;
            }

            if (!newState.researchStations.includes(city)) {
                newState.researchStations.push(city);
                logEvent(`A research station was built in ${CITIES_DATA[city].name} via Government Grant.`);
            }
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            // No action cost
            return newState;
        });
    };

    const handleAirlift = (playerId: number, destination: CityName) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingAirlift) return prevState;
            const newState = safeCloneGameState(prevState);
            const player = newState.players.find(p => p.id === playerId)!;
             if (!_canMoveFrom(newState, player)) {
                logEvent(`Government Interference prevents ${player.name} from being airlifted from ${CITIES_DATA[player.location].name}.`);
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
                return newState;
            }
            player.location = destination;
            logEvent(`${player.name} was airlifted to ${CITIES_DATA[destination].name}.`);
            _handlePostMoveEffects(newState, player, 'Other');
            _handleNursePostMove(newState, player);
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            return newState;
        });
    };

    const handleForecast = (rearrangedCards: InfectionCard[]) => {
         setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingForecast) return prevState;
            const newState = safeCloneGameState(prevState);
            // Replace top 6 cards
            newState.infectionDeck.splice(0, rearrangedCards.length, ...rearrangedCards);
            logEvent(`The top ${rearrangedCards.length} cards of the Infection Deck have been rearranged.`);
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            return newState;
        });
    };
    
    const handleNewAssignment = (playerId: number, newRole: PlayerRole) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingNewAssignment) return prevState;
            const newState = safeCloneGameState(prevState);
            const player = newState.players.find(p => p.id === playerId)!;
            const oldRole = player.role!;
            
            const newUnusedRoles = [...newState.unusedRoles.filter(r => r !== newRole), oldRole];
            player.role = newRole;
            newState.unusedRoles = newUnusedRoles;

            logEvent(`${player.name} is now the ${newRole}.`);
            
            const currentPlayer = newState.players[newState.currentPlayerIndex];
            if (player.id === currentPlayer.id) {
                // If the current player changes their own role to or from the Generalist,
                // their total actions for the turn becomes 5.
                if (oldRole === PlayerRole.Generalist && newRole !== PlayerRole.Generalist) {
                    // Was Generalist, is no longer. Actions remain the same for this turn.
                    logEvent(`${player.name} keeps their remaining actions for this turn.`);
                } else if (oldRole !== PlayerRole.Generalist && newRole === PlayerRole.Generalist) {
                    // Was not Generalist, is now. Gains 1 action to total 5 for the turn.
                    newState.actionsRemaining++;
                    logEvent(`${player.name} gains an action for becoming the Generalist this turn.`);
                }
            }
            
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            return newState;
        });
    };

    const handleSpecialOrders = (pawnId: number) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingSpecialOrders) return prevState;
            const newState = safeCloneGameState(prevState);
            newState.specialOrdersControlledPawnId = pawnId;
            const controlledPawn = newState.players.find(p => p.id === pawnId)!;
            logEvent(`${newState.players[newState.currentPlayerIndex].name} will now control ${controlledPawn.name}'s pawn for the turn.`);
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            return newState;
        });
    };

    const handleRapidVaccineDeployment = (selections: { city: CityName; cubesToRemove: number }[]) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingRapidVaccineDeployment) return prevState;
            const newState = safeCloneGameState(prevState);
            const curedColor = newState.postCureColor;

            if (curedColor) {
                selections.forEach(({ city, cubesToRemove }) => {
                    if (newState.diseaseCubes[city]?.[curedColor]) {
                        newState.diseaseCubes[city]![curedColor]! -= cubesToRemove;
                        newState.remainingCubes[curedColor] += cubesToRemove;
                        logEvent(`Rapid Vaccine Deployment removed ${cubesToRemove} ${curedColor} cube(s) from ${CITIES_DATA[city].name}.`);
                    }
                });
                _checkForEradication(newState, curedColor);
            }
            
            newState.gamePhase = newState.actionsRemaining > 0 ? GamePhase.PlayerAction : GamePhase.PreDrawPlayerCards;
            newState.phaseBeforeEvent = null;
            newState.postCureColor = null;
            return newState;
        });
    };

    const handleConfirmTroubleshooterPreview = () => {
         setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingTroubleshooterPreview) return prevState;
            const newState = safeCloneGameState(prevState);
            newState.hasUsedTroubleshooterPreview = true;
            newState.gamePhase = GamePhase.PlayerAction;
            logEvent(`${newState.players[newState.currentPlayerIndex].name} (Troubleshooter) previewed the top infection cards.`);
            return newState;
        });
    };

    const handleSkipTroubleshooterPreview = () => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingTroubleshooterPreview) return prevState;
            const newState = safeCloneGameState(prevState);
            newState.gamePhase = GamePhase.PlayerAction;
            logEvent(`${newState.players[newState.currentPlayerIndex].name} (Troubleshooter) skipped their preview.`);
            return newState;
        });
    };
    
    const handleReExaminedResearch = (card: PlayerCard & { type: 'city' }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingReExaminedResearch) return prevState;
            const newState = safeCloneGameState(prevState);
            const player = newState.players[newState.currentPlayerIndex];
            
            const cardIndex = newState.playerDiscard.findIndex(c => c.type === 'city' && c.name === card.name && c.color === card.color);
            if (cardIndex > -1) {
                const [retrievedCard] = newState.playerDiscard.splice(cardIndex, 1);
                player.hand.push(retrievedCard);
                logEvent(`${player.name} uses Re-examined Research to draw the ${getCardDisplayName(card)}.`);
                
                if (player.hand.length > getHandLimit(player)) {
                    newState.playerToDiscardId = player.id;
                    newState.gamePhase = GamePhase.Discarding;
                    discardTriggerRef.current = 'action';
                    newState.log.unshift(`- ${player.name} is over the hand limit and must discard.`);
                } else {
                    newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                    newState.phaseBeforeEvent = null;
                }
            } else {
                 newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                 newState.phaseBeforeEvent = null;
            }
            
            return newState;
        });
    };

    const handleInitiateEpidemiologistTake = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || ![GamePhase.PlayerAction, GamePhase.PreDrawPlayerCards].includes(prevState.gamePhase)) return null;
            const currentPlayer = prevState.players[prevState.currentPlayerIndex];
            if (currentPlayer.role !== PlayerRole.Epidemiologist || prevState.hasUsedEpidemiologistAbility) return prevState;
    
            const otherPlayersInCity = prevState.players.filter(p => p.id !== currentPlayer.id && p.location === currentPlayer.location);
            const hasOptions = otherPlayersInCity.some(p => p.hand.some(c => c.type === 'city'));
    
            if (!hasOptions) {
                logEvent("No cards available to take.");
                return prevState;
            }
    
            const newState = safeCloneGameState(prevState);
            newState.phaseBeforeEvent = prevState.gamePhase;
            newState.gamePhase = GamePhase.ResolvingEpidemiologistTake;
            return newState;
        });
    }, [logEvent]);

    const handleCancelEpidemiologistTake = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingEpidemiologistTake) return prevState;
            const newState = safeCloneGameState(prevState);
            newState.gamePhase = prevState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            logEvent("Epidemiologist 'Take Card' action cancelled.");
            return newState;
        });
    }, [logEvent]);

    const handleCancelEventResolution = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || !prevState.phaseBeforeEvent) return prevState;
            
            // The core of the fix: use the action history to undo.
            if (prevState.actionHistory.length > 0) {
                const historyToRestoreFrom = [...prevState.actionHistory];
                const lastStateSnapshot = historyToRestoreFrom.pop()!;
                const restoredState: GameState = {
                    ...lastStateSnapshot,
                    actionHistory: historyToRestoreFrom,
                };
                restoredState.log.unshift("- Event resolution cancelled. Action reverted.");
                return restoredState;
            }

            // Fallback for safety, though it shouldn't be reached if events are always saved to history.
            const newState = safeCloneGameState(prevState);
            newState.gamePhase = prevState.phaseBeforeEvent;
            newState.phaseBeforeEvent = null;
            newState.pendingEventCardForModal = null; 
            newState.pendingPurifyWaterEvent = null;
            newState.pendingRingRailroadsEvent = null;
            logEvent("Event resolution cancelled.");
            return newState;
        });
    }, [logEvent]);
    
    const handleResolveMutationEvent = useCallback((eventToResolve: MutationEventCardName) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingMutationEvent) return prevState;
            const newState = safeCloneGameState(prevState);
            const player = newState.players[newState.currentPlayerIndex];
            
            newState.log.unshift(`- ${player.name} resolves the event: ${eventToResolve}.`);

            let resultMessage = "";

            if (!newState.eradicatedDiseases[DiseaseColor.Purple]) {
                switch (eventToResolve) {
                    case MutationEventCardName.MutationThreatens:
                        const bottomCard = newState.infectionDeck.pop();
                        if (bottomCard) {
                            newState.infectionDiscard.push(bottomCard);
                            if (bottomCard.type === 'city') {
                                const outbreaksInTurn = new Set<CityName>();
                                const newlyOutbrokenCities: CityName[] = [];
                                _performInfection(newState, bottomCard.name, DiseaseColor.Purple, outbreaksInTurn, newlyOutbrokenCities, 3);
                                resultMessage = `The Mutation Threatens! drew ${CITIES_DATA[bottomCard.name].name} from the bottom of the Infection Deck. 3 purple cubes were placed there.`;
                                newState.log.unshift(`- ${resultMessage}`);
                                if (newlyOutbrokenCities.length > 0) {
                                    const cityNames = newlyOutbrokenCities.map(c => CITIES_DATA[c].name).join(', ');
                                    generateOutbreakReport(cityNames, newState.useAiNarratives).then(msg => msg && setModalContent({ title: "OUTBREAK ALERT", body: msg, color: "text-red-500" }));
                                }
                            } else {
                                resultMessage = `The Mutation Threatens! was drawn, but it pulled another Mutation card from the bottom of the deck. No effect.`;
                                newState.log.unshift(`- ${resultMessage}`);
                            }
                        } else {
                            resultMessage = `The Mutation Threatens! was drawn, but the Infection Deck is empty. No effect.`;
                             newState.log.unshift(`- ${resultMessage}`);
                        }
                        break;
                    case MutationEventCardName.MutationSpreads:
                        const citiesToInfect: CityName[] = [];
                        for (let i = 0; i < 3; i++) {
                            const card = newState.infectionDeck.pop();
                            if (card) {
                                newState.infectionDiscard.push(card);
                                if (card.type === 'city') {
                                    citiesToInfect.push(card.name);
                                    _performInfection(newState, card.name, DiseaseColor.Purple, new Set(), [], 1);
                                }
                            }
                        }
                        if (citiesToInfect.length > 0) {
                            const cityNames = citiesToInfect.map(c => CITIES_DATA[c].name).join(', ');
                            resultMessage = `The Mutation Spreads! infected ${cityNames} with 1 purple cube each.`;
                            newState.log.unshift(`- ${resultMessage}`);
                        } else {
                            resultMessage = `The Mutation Spreads! was drawn, but the Infection Deck is empty. No effect.`;
                            newState.log.unshift(`- ${resultMessage}`);
                        }
                        break;
                    case MutationEventCardName.MutationIntensifies:
                        const intensifiedCities: CityName[] = [];
                        Object.entries(newState.diseaseCubes).forEach(([cityName, cityCubes]) => {
                            if (cityCubes[DiseaseColor.Purple] === 2) {
                                intensifiedCities.push(cityName as CityName);
                                _performInfection(newState, cityName as CityName, DiseaseColor.Purple, new Set(), [], 1);
                            }
                        });
                        if (intensifiedCities.length > 0) {
                            const cityNames = intensifiedCities.map(c => CITIES_DATA[c].name).join(', ');
                            resultMessage = `The Mutation Intensifies! added 1 purple cube to the following cities: ${cityNames}.`;
                            newState.log.unshift(`- ${resultMessage}`);
                        } else {
                            resultMessage = `The Mutation Intensifies! has no effect as no city has exactly 2 purple cubes.`;
                            newState.log.unshift(`- ${resultMessage}`);
                        }
                        break;
                }
            } else {
                resultMessage = `${eventToResolve} has no effect as the purple disease is eradicated.`;
                newState.log.unshift(`- ${resultMessage}`);
            }

            newState.mutationEventResult = resultMessage;

            newState.playerDiscard.push({ type: 'mutation_event', name: eventToResolve });

            const eventIndex = newState.pendingMutationEvents.indexOf(eventToResolve);
            if (eventIndex > -1) {
                newState.pendingMutationEvents.splice(eventIndex, 1);
            }

            if (newState.pendingMutationEvents.length === 0) {
                if (newState.pendingEpidemicCard) {
                    const epidemicCard = newState.pendingEpidemicCard;
                    newState.playerDiscard.push(epidemicCard);
                    newState.log.unshift(`- ${getCardDisplayName(epidemicCard)} drawn!`);
                    newState.gamePhase = GamePhase.Epidemic;
                    newState.pendingEpidemicCard = null;
                } else {
                    if (player.hand.length > getHandLimit(player)) {
                        newState.gamePhase = GamePhase.Discarding;
                        newState.playerToDiscardId = player.id;
                        discardTriggerRef.current = 'draw';
                        newState.log.unshift(`- ${player.name} must discard ${player.hand.length - getHandLimit(player)} card(s).`);
                    } else {
                        newState.gamePhase = GamePhase.PreInfectionPhase;
                    }
                }
            }

            return newState;
        });
    }, [getHandLimit, _performInfection, logEvent, setModalContent]);

    const handleAcknowledgeMutationResult = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || !prevState.mutationEventResult) return prevState;
            const newState = safeCloneGameState(prevState);
            newState.mutationEventResult = null;
            return newState;
        });
    }, []);

    const handleStationRelocation = (cityToRemove: CityName) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingStationRelocation) return prevState;

            const snapshot = safeCloneGameState(prevState);
            const { actionHistory, ...stateToSave } = snapshot;
            const newState = safeCloneGameState(prevState);

            const cityToAdd = newState.stationRelocationTargetCity;
            if (!cityToAdd) return prevState; // Should not happen

            // Perform the swap
            newState.researchStations = newState.researchStations.filter(s => s !== cityToRemove);
            newState.researchStations.push(cityToAdd);
            logEvent(`Research station in ${CITIES_DATA[cityToRemove].name} was moved to ${CITIES_DATA[cityToAdd].name}.`);

            // Check what triggered this relocation
            if (newState.stationRelocationTrigger === 'action') {
                const player = newState.players[newState.currentPlayerIndex];

                // Pay the cost for the build action (card discard unless Operations Expert)
                if (player.role !== PlayerRole.OperationsExpert) {
                    const cardIndex = player.hand.findIndex((c: PlayerCard) => c.type === 'city' && c.name === cityToAdd);
                    if (cardIndex > -1) {
                        const [card] = player.hand.splice(cardIndex, 1);
                        newState.playerDiscard.push(card);
                        logEvent(`${player.name} discards the ${CITIES_DATA[cityToAdd].name} card.`);
                    } else {
                        // This case should ideally not happen if the UI prevents it, but as a safeguard:
                        logEvent(`ERROR: Could not find required card for Build Station after relocating. Action failed.`);
                        // Revert to previous state to avoid an invalid game state
                        return prevState;
                    }
                }

                // Consume the action
                newState.actionHistory.push(stateToSave as GameState);
                newState.actionsRemaining--;
                
                newState.gamePhase = newState.actionsRemaining > 0 ? GamePhase.PlayerAction : GamePhase.PreDrawPlayerCards;

            } else { // It came from an Event (Government Grant) or another source
                // No action cost, no card discard. Just return to the phase before the event was played.
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            }

            // Reset the temporary state fields
            newState.stationRelocationTargetCity = null;
            newState.stationRelocationTrigger = null;
            newState.phaseBeforeEvent = null; // Clear this as its purpose is served

            return newState;
        });
    };

    const handleConfirmForecastPlay = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || !prevState.pendingEvent || prevState.pendingEvent.cardName !== EventCardName.Forecast) return prevState;
            
            const newState = safeCloneGameState(prevState);
            const { ownerId, from, cardName } = newState.pendingEvent;
            const owner = newState.players.find(p => p.id === ownerId)!;
            let cardFoundAndConsumed = false;

            if (from === 'hand') {
                const cardIndex = owner.hand.findIndex(c => c.type === 'event' && c.name === cardName);
                if (cardIndex > -1) {
                    const [card] = owner.hand.splice(cardIndex, 1);
                    newState.playerDiscard.push(card);
                    cardFoundAndConsumed = true;
                }
            } else { // from === 'contingency'
                if (owner.contingencyCard === cardName) {
                    owner.contingencyCard = null;
                    // Forecast card is removed from game when played from contingency plan
                    cardFoundAndConsumed = true;
                }
            }
            
            if (!cardFoundAndConsumed) {
                logEvent(`Error: Forecast card not found. Cancelling action.`);
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
                newState.pendingEvent = null;
                return newState;
            }
            
            logEvent(`${owner.name} plays the event card: ${cardName}.`);
            
            newState.gamePhase = GamePhase.ResolvingForecast;
            // Keep phaseBeforeEvent, it's needed by the final handleForecast step
            newState.pendingEvent = null;
            
            return newState;
        });
    }, [logEvent]);

    const handleCancelForecastPlay = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ConfirmingForecast) return prevState;

            const newState = safeCloneGameState(prevState);
            newState.gamePhase = prevState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            newState.pendingEvent = null;
            logEvent("Forecast play cancelled.");
            return newState;
        });
    }, [logEvent]);

    const handleMobileHospitalRemove = useCallback((color: DiseaseColor) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingMobileHospital || !prevState.cityForMobileHospital) return prevState;

            const newState = safeCloneGameState(prevState);
            const city = newState.cityForMobileHospital;
            const player = newState.players[newState.currentPlayerIndex];

            if (newState.diseaseCubes[city]?.[color]) {
                newState.diseaseCubes[city]![color]!--;
                newState.remainingCubes[color]++;
                newState.log.unshift(`- ${player.name} uses Mobile Hospital to remove one ${color} cube from ${CITIES_DATA[city].name}.`);
                _checkForEradication(newState, color);
            }

            // Reset state and return to player action
            newState.cityForMobileHospital = null;
            newState.gamePhase = newState.actionsRemaining > 0 ? GamePhase.PlayerAction : GamePhase.PreDrawPlayerCards;

            return newState;
        });
    }, [logEvent, _checkForEradication]);

    const handleEndTurn = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.PlayerAction) return prevState;

            // Save state for undo functionality
            const snapshot = safeCloneGameState(prevState);
            const { actionHistory, ...stateToSave } = snapshot;

            const newState = safeCloneGameState(prevState);
            
            // Push the state *before* ending the turn to history
            newState.actionHistory.push(stateToSave as GameState);

            newState.actionsRemaining = 0;
            newState.gamePhase = GamePhase.PreDrawPlayerCards;
            logEvent(`${newState.players[newState.currentPlayerIndex].name} chose to end their turn early.`);
            return newState;
        });
    }, [setGameState, logEvent]);
    
    const handleChooseStartingCity = useCallback((city: CityName) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ChoosingStartingCity) return prevState;

            const newState = safeCloneGameState(prevState);
            const player = newState.players[newState.currentPlayerIndex];
            
            player.location = city;

            if (newState.gameType === 'fallOfRome') {
                // Add up to 2 legions from the supply to the starting city
                const availableLegionsInSupply = 16 - (newState.legions?.length || 0);
                const legionsToAdd = Math.min(2, availableLegionsInSupply);
                
                if (legionsToAdd > 0) {
                    for (let i = 0; i < legionsToAdd; i++) {
                        newState.legions.push(city);
                    }
                }
                
                newState.log.unshift(`- ${player.name} chooses to start in ${CITIES_DATA[city].name} with ${legionsToAdd} legion(s).`);
            } else {
                // For Iberia, just log the city choice without legions.
                newState.log.unshift(`- ${player.name} chooses to start in ${CITIES_DATA[city].name}.`);
            }

            const nextPlayerIndex = (newState.currentPlayerIndex + 1);

            if (nextPlayerIndex >= newState.players.length) {
                // Last player has chosen. Check for Nurse before starting the game.
                const nurse = newState.players.find(p => p.role === PlayerRole.Nurse);
                if (nurse) {
                    newState.currentPlayerIndex = newState.players.findIndex(p => p.id === nurse.id);
                    newState.gamePhase = GamePhase.NursePlacingPreventionToken;
                    newState.phaseBeforeEvent = GamePhase.Setup; // Use a marker for setup phase
                    newState.log.unshift(`- All players have chosen a city. ${nurse.name} (Nurse) must now place their prevention token.`);
                } else {
                    // No Nurse, start the game normally.
                    const firstPlayer = newState.players[newState.firstPlayerIndex];
                    newState.currentPlayerIndex = newState.firstPlayerIndex;
                    newState.actionsRemaining = firstPlayer.role === PlayerRole.Generalist ? 5 : 4;
                    newState.gamePhase = firstPlayer.role === PlayerRole.Troubleshooter ? GamePhase.ResolvingTroubleshooterPreview : GamePhase.PlayerAction;
                    newState.log.unshift(`- All players have chosen their starting city. It is now ${firstPlayer.name}'s turn.`);
                }
            } else {
                newState.currentPlayerIndex = nextPlayerIndex;
                // Stay in ChoosingStartingCity phase for the next player.
                newState.log.unshift(`- It is now ${newState.players[nextPlayerIndex].name}'s turn to choose a starting city.`);
            }
            return newState;
        });
    }, [setGameState, logEvent]);

    const handleRollBattleDice = useCallback((diceToRoll: number) => {
        setGameState(prevState => {
            if (!prevState) return prevState;

            const player = prevState.players[prevState.currentPlayerIndex];
            const cityCubes = prevState.diseaseCubes[player.location] || {};
            const totalBarbariansInCity = Object.values(cityCubes).reduce((sum, count) => sum + (count || 0), 0);
    
            const diceFaces: BattleDieResult[] = ['loseLegion', 'removeBarbarian', 'removeBarbarian', 'removeBarbarianAndLoseLegion', 'removeTwoBarbariansAndLoseLegion', 'special'];
            
            const results: BattleDieResult[] = [];
            for (let i = 0; i < diceToRoll; i++) {
                results.push(diceFaces[Math.floor(Math.random() * diceFaces.length)]);
            }
    
            let legionsLost = 0;
            let barbariansToRemove = 0;
            let legionsToAdd = 0;
            results.forEach(result => {
                switch (result) {
                    case 'loseLegion': legionsLost++; break;
                    case 'removeBarbarian': barbariansToRemove++; break;
                    case 'removeBarbarianAndLoseLegion': barbariansToRemove++; legionsLost++; break;
                    case 'removeTwoBarbariansAndLoseLegion': barbariansToRemove += 2; legionsLost++; break;
                    case 'special':
                        if (player.role === PlayerRole.Consul) {
                            legionsToAdd++;
                        } else if (player.role === PlayerRole.MagisterMilitum) {
                            barbariansToRemove += 2;
                        } else if (player.role === PlayerRole.Mercator) {
                            barbariansToRemove++;
                            legionsLost++;
                        } else if (player.role === PlayerRole.PraefectusClassis && FALLOFROME_PORT_CITIES.has(player.location)) {
                            barbariansToRemove++;
                        } else if (player.role === PlayerRole.PraefectusFabrum && prevState.forts.includes(player.location)) {
                            barbariansToRemove += 2;
                        } else if (player.role === PlayerRole.ReginaFoederata) {
                            barbariansToRemove++;
                            legionsToAdd++;
                        } else if (player.role === PlayerRole.Vestalis) {
                            legionsLost++;
                        }
                        break;
                }
            });
            
            if (player.role === PlayerRole.MagisterMilitum && legionsLost > 0) {
                legionsLost = Math.max(0, legionsLost - 1);
            }
    
            barbariansToRemove = Math.min(barbariansToRemove, totalBarbariansInCity);
    
            const requiresSelection = barbariansToRemove > 0 && Object.values(cityCubes).filter(c => c > 0).length > 1;
    
            setBattleModalState(prev => ({
                ...prev,
                step: requiresSelection ? 'selectCubes' : 'viewResults',
                diceToRoll,
                results,
                legionsLost,
                barbariansToRemove,
                legionsToAdd,
            }));

            return prevState; // No direct game state change here
        });
    }, [setGameState, setBattleModalState]);

    const handleInitiateVestalisDrawEvent = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || prevState.gameType !== 'fallOfRome') return prevState;
            
            const vestalis = prevState.players.find(p => p.role === PlayerRole.Vestalis);
            if (!vestalis) return prevState;
            
            if (prevState.eventDeck.length === 0) {
                 logEvent("Vestalis cannot draw: Event Deck is empty.");
                 return prevState;
            }
    
            const vestalisCityData = FALLOFROME_CITIES_DATA[vestalis.location as keyof typeof FALLOFROME_CITIES_DATA];
            if (!vestalisCityData?.boardColors) return prevState;
    
            const cityColors = new Set(vestalisCityData.boardColors);
            const validDiscards = vestalis.hand.filter(c => c.type === 'city' && cityColors.has(c.color)) as (PlayerCard & { type: 'city' })[];
    
            if (validDiscards.length === 0) {
                logEvent("Vestalis has no matching city cards to discard.");
                return prevState;
            }
    
            const newState = safeCloneGameState(prevState);
            newState.phaseBeforeEvent = prevState.gamePhase;
            newState.gamePhase = GamePhase.ConfirmingVestalisDraw;
            logEvent(`${vestalis.name} (Vestalis) is considering using their ability to draw an event card.`);
            return newState;
        });
    }, [logEvent]);

    const handleConfirmVestalisDrawAction = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ConfirmingVestalisDraw) return prevState;
    
            const vestalis = prevState.players.find(p => p.role === PlayerRole.Vestalis)!;
            const newState = safeCloneGameState(prevState);
    
            if (newState.eventDeck.length === 0) {
                logEvent("Vestalis cannot draw: Event Deck is empty.");
                newState.gamePhase = prevState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
                return newState;
            }
    
            const [drawnCard] = newState.eventDeck.splice(0, 1);
    
            if (!drawnCard || drawnCard.type !== 'event') {
                logEvent("Error: A non-event card was drawn from the event deck.");
                if (drawnCard) { // Put it back if it was just the wrong type
                    newState.eventDeck.unshift(drawnCard);
                }
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
                return newState;
            }
    
            const vestalisCityData = FALLOFROME_CITIES_DATA[vestalis.location as keyof typeof FALLOFROME_CITIES_DATA];
            const cityColors = new Set(vestalisCityData.boardColors);
            const validDiscards = vestalis.hand.filter(c => c.type === 'city' && cityColors.has(c.color)) as (PlayerCard & { type: 'city' })[];
    
            newState.gamePhase = GamePhase.ResolvingVestalisDraw;
            newState.pendingVestalisDraw = {
                drawnCard: drawnCard,
                validDiscards: validDiscards
            };
            
            logEvent(`${vestalis.name} commits to drawing an event card.`);
            return newState;
        });
    }, [logEvent]);

    const handleCancelVestalisDrawAction = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ConfirmingVestalisDraw) return prevState;
            const newState = safeCloneGameState(prevState);
            newState.gamePhase = prevState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            logEvent("Vestalis decides not to draw an event card.");
            return newState;
        });
    }, [logEvent]);

    const handleConfirmVestalisDrawEvent = useCallback((cardToDiscard: PlayerCard & { type: 'city' }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingVestalisDraw || !prevState.pendingVestalisDraw) return prevState;
            
            const newState = safeCloneGameState(prevState);
            const vestalis = newState.players.find(p => p.role === PlayerRole.Vestalis)!;
            const { drawnCard } = newState.pendingVestalisDraw;

            if (!drawnCard || drawnCard.type !== 'event') {
                logEvent("Error resolving Vestalis draw: invalid card was pending.");
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
                newState.pendingVestalisDraw = null;
                return newState;
            }

            const cardIndex = vestalis.hand.findIndex(c => c.type === 'city' && c.name === cardToDiscard.name && c.color === cardToDiscard.color);
            if (cardIndex === -1) {
                logEvent("Error: Vestalis does not have the selected card to discard.");
                return prevState;
            }
            const [discarded] = vestalis.hand.splice(cardIndex, 1);
            newState.playerDiscard.push(discarded);

            vestalis.hand.push(drawnCard);
            logEvent(`${vestalis.name} discards ${getCardDisplayName(cardToDiscard)} and draws the ${getCardDisplayName(drawnCard)} event card.`);

            const phaseAfterAction = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.pendingVestalisDraw = null;
            newState.phaseBeforeEvent = null;

            if (vestalis.hand.length > getHandLimit(vestalis)) {
                newState.playerToDiscardId = vestalis.id;
                newState.gamePhase = GamePhase.Discarding;
                newState.phaseBeforeEvent = phaseAfterAction;
                discardTriggerRef.current = 'action';
                logEvent(`${vestalis.name} is over the hand limit and must discard.`);
            } else {
                newState.gamePhase = phaseAfterAction;
            }
            
            return newState;
        });
    }, [logEvent, getHandLimit]);

    const handleConfirmVestalisPlayerCardDraw = useCallback((cardsToKeep: PlayerCard[]) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingVestalisPlayerCardDraw || !prevState.pendingVestalisPlayerCardDraw) return prevState;

            const newState = safeCloneGameState(prevState);
            const player = newState.players[newState.currentPlayerIndex];
            const allDrawnCards = newState.pendingVestalisPlayerCardDraw!;

            if (cardsToKeep.length !== 2) {
                logEvent("Error: Must select exactly 2 cards to keep.");
                return prevState;
            }

            // A robust way to find the card to put back
            const cardToKey = (card: PlayerCard): string => {
                // Creates a unique identifier for a card instance
                if (card.type === 'city') return `${card.type}|${card.name}|${card.color}`;
                if (card.type === 'event') return `${card.type}|${card.name}`;
                if (card.type === 'virulent_strain_epidemic') return `${card.type}|${card.name}`;
                if (card.type === 'mutation_event') return `${card.type}|${card.name}`;
                return card.type;
            };
            const cardsToKeepKeys = new Set(cardsToKeep.map(cardToKey));
            const cardToPutBack = allDrawnCards.find(c => !cardsToKeepKeys.has(cardToKey(c)));

            if (!cardToPutBack) {
                logEvent("Error: Could not determine card to put back on deck.");
                return prevState;
            }

            // Separate kept cards into normal cards and special cards (epidemics, mutations)
            const epidemicCard = cardsToKeep.find(c => c.type === 'epidemic' || c.type === 'virulent_strain_epidemic');
            const mutationEvents = cardsToKeep.filter(c => c.type === 'mutation_event') as (PlayerCard & { type: 'mutation_event' })[];
            const normalCardsToKeep = cardsToKeep.filter(c => c.type !== 'epidemic' && c.type !== 'virulent_strain_epidemic' && c.type !== 'mutation_event');

            // Process kept cards (only add normal cards to hand)
            player.hand.push(...normalCardsToKeep);
            const keptCardsLog = cardsToKeep.map(c => getCardDisplayName(c)).join(' and ');
            newState.log.unshift(`- ${player.name} keeps ${keptCardsLog}.`);

            // Process returned card
            newState.playerDeck.unshift(cardToPutBack);
            newState.log.unshift(`- ${getCardDisplayName(cardToPutBack)} is returned to the top of the deck.`);
            
            newState.pendingVestalisPlayerCardDraw = null;
            
            // Now handle the special cards that were kept but not added to hand
            if (mutationEvents.length > 0) {
                newState.pendingMutationEvents = mutationEvents.map(c => c.name);
                if (epidemicCard) {
                    newState.pendingEpidemicCard = epidemicCard;
                }
                newState.gamePhase = GamePhase.ResolvingMutationEvent;
                newState.log.unshift(`- ${player.name} draws ${mutationEvents.map(c => getCardDisplayName(c)).join(' and ')}!`);
            } else if (epidemicCard) {
                newState.playerDiscard.push(epidemicCard);
                newState.log.unshift(`- ${epidemicCard.type === 'virulent_strain_epidemic' ? 'VIRULENT STRAIN ' : ''}EPIDEMIC drawn!`);
                newState.gamePhase = GamePhase.Epidemic;
            } else {
                const cardsToDiscardCount = player.hand.length - getHandLimit(player);
                if (cardsToDiscardCount > 0) {
                    newState.gamePhase = GamePhase.Discarding;
                    newState.playerToDiscardId = player.id;
                    discardTriggerRef.current = 'draw';
                    newState.log.unshift(`- ${player.name} must discard ${cardsToDiscardCount} card(s).`);
                } else {
                    newState.gamePhase = GamePhase.PreInfectionPhase;
                }
            }
            
            return newState;
        });
    }, [logEvent, getHandLimit]);

    const handleConfirmRoyalAcademyScientistForecast = useCallback((rearrangedCards: PlayerCard[]) => {
        setGameState(prevState => {
            if (!prevState || prevState.gameType !== 'iberia' || prevState.gamePhase !== GamePhase.ResolvingRoyalAcademyScientistForecast) {
                return prevState;
            }
            const newState = safeCloneGameState(prevState);
    
            // Remove the original top cards
            newState.playerDeck.splice(0, rearrangedCards.length);
            // Add the rearranged cards back to the top
            newState.playerDeck.unshift(...rearrangedCards);
    
            newState.log.unshift(`- The top ${rearrangedCards.length} cards of the Player Deck have been rearranged.`);
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            
            return newState;
        });
    }, [logEvent]);

    
    const handleResolveDoUtDes = useCallback((payload: {
            option: 'normal' | 'corrupt';
            player1Id: number;
            player2Id: number;
            card1: PlayerCard & { type: 'city' };
            card2: PlayerCard & { type: 'city' };
        }) => {
            setGameState(prevState => {
                if (!prevState || prevState.gamePhase !== GamePhase.ResolvingDoUtDes) return prevState;

                const newState = safeCloneGameState(prevState);
                const { option, player1Id, player2Id, card1, card2 } = payload;

                const player1 = newState.players.find(p => p.id === player1Id);
                const player2 = newState.players.find(p => p.id === player2Id);

                if (!player1 || !player2) {
                    logEvent("Error resolving Do Ut Des: Players not found.");
                    newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                    newState.phaseBeforeEvent = null;
                    return newState;
                }

                const card1Index = player1.hand.findIndex(c => c.type === 'city' && c.name === card1.name && c.color === card1.color);
                const card2Index = player2.hand.findIndex(c => c.type === 'city' && c.name === card2.name && c.color === card2.color);

                if (card1Index === -1 || card2Index === -1) {
                    logEvent("Error resolving Do Ut Des: Cards not found in players' hands.");
                    newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                    newState.phaseBeforeEvent = null;
                    return newState;
                }

                const [swappedCard1] = player1.hand.splice(card1Index, 1);
                const [swappedCard2] = player2.hand.splice(card2Index, 1);
                player1.hand.push(swappedCard2);
                player2.hand.push(swappedCard1);

                let logMessage = `${player1.name} and ${player2.name} swapped the ${getCardDisplayName(card1)} and ${getCardDisplayName(card2)} cards`;

                if (option === 'corrupt') {
                    newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                    logMessage += " using the corrupt option. The decline marker advances!";
                    if (newState.outbreakCounter >= 8) {
                        newState.gamePhase = GamePhase.GameOver;
                        newState.gameOverReason = 'The decline marker has reached the last space.';
                    }
                } else {
                    logMessage += ".";
                }
                logEvent(logMessage);

                const checkHandLimit = (gs: GameState, p: Player, nextPhase: GamePhase) => {
                    if (p.hand.length > getHandLimit(p)) {
                        gs.playerToDiscardId = p.id;
                        gs.gamePhase = GamePhase.Discarding;
                        gs.phaseBeforeEvent = nextPhase;
                        discardTriggerRef.current = 'action';
                        gs.log.unshift(`- ${p.name} is over the hand limit and must discard.`);
                        return true;
                    }
                    return false;
                };

                const returnPhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            
                const player1NeedsDiscard = checkHandLimit(newState, player1, returnPhase);
                if (!player1NeedsDiscard) {
                    const player2NeedsDiscard = checkHandLimit(newState, player2, returnPhase);
                    if (!player2NeedsDiscard) {
                        newState.gamePhase = returnPhase;
                    }
                }
            
                newState.phaseBeforeEvent = null;

                return newState;
            });
        }, [logEvent, getHandLimit]);


    // This effect manages phase transitions that don't require user input.
    useEffect(() => {
        if (!gameState) return;

        if (gameState.gamePhase === GamePhase.PreInfectionPhase) {
            handleStartInfectionPhase();
        } else if (gameState.gamePhase === GamePhase.InfectionStep) {
            if (infectionStepState.queue.length > 0 && !infectionStepState.revealedCard) {
                const newState = safeCloneGameState(gameState);
                const newQueue = [...infectionStepState.queue];
                const card = newQueue.shift()!;
                const outbreaksInTurn = new Set<CityName>(infectionStepState.outbreaksThisTurn);
                const newlyOutbrokenCities: CityName[] = [];
                newState.lastInfectionResult = null;
                newState.outbreakResults = []; // Clear previous outbreak results at start of new infection card
                
                let invadedCity: CityName | null = null;
                if (card.type === 'city') {
                    invadedCity = newState.gameType === 'fallOfRome' ? _getFallOfRomeInvasionTarget(newState, card) : card.name;
                }

                if (card.type === 'mutation') {
                    newState.infectionDiscard.push(card);
                    if (newState.eradicatedDiseases[DiseaseColor.Purple]) {
                        logEvent(`A Mutation card is drawn, but nothing happens because the purple disease is eradicated.`);
                    } else {
                        const bottomCard = newState.infectionDeck.pop();
                        if (bottomCard) {
                            newState.infectionDiscard.push(bottomCard);
                            if (bottomCard.type === 'city') {
                                logEvent(`A Mutation card was drawn. It pulls ${getCardDisplayName(bottomCard)} from the bottom, and 1 purple cube is added.`);
                                newState.lastInfectionResult = _performInfection(newState, bottomCard.name, DiseaseColor.Purple, outbreaksInTurn, newlyOutbrokenCities, 1);
                            }
                        }
                    }
                } else { // City card
                    newState.log.unshift(`- Infection card drawn: ${getCardDisplayName(card)}.`);
                    if (invadedCity && invadedCity !== card.name) {
                        newState.log.unshift(`- Invasion redirected from ${CITIES_DATA[card.name].name} to ${CITIES_DATA[invadedCity].name}.`);
                    }
                    if (invadedCity) {
                        const color = card.color;
                        if (newState.setupConfig.useMutationChallenge && (newState.diseaseCubes[invadedCity]?.[DiseaseColor.Purple] || 0) > 0) {
                            logEvent(`Infection in ${CITIES_DATA[invadedCity].name} adds 1 ${color} and 1 purple cube due to mutation.`);
                            newState.lastInfectionResult = _performInfection(newState, invadedCity, color, outbreaksInTurn, newlyOutbrokenCities, 1);
                            if (!newState.eradicatedDiseases[DiseaseColor.Purple]) {
                                _performInfection(newState, invadedCity, DiseaseColor.Purple, outbreaksInTurn, newlyOutbrokenCities, 1);
                            }
                        } else {
                            let cubesToAdd = 1;
                            if (newState.activeVirulentStrainCards.includes(VirulentStrainEpidemicCardName.ChronicEffect) && color === newState.virulentStrainColor && (!newState.diseaseCubes[invadedCity] || !newState.diseaseCubes[invadedCity]![color])) {
                                cubesToAdd = 2;
                                logEvent(`Chronic Effect: Placing 2 cubes on ${CITIES_DATA[invadedCity].name}.`);
                            }
                            newState.lastInfectionResult = _performInfection(newState, invadedCity, color, outbreaksInTurn, newlyOutbrokenCities, cubesToAdd);
                        }
                    }
                    newState.infectionDiscard.push(card);
                }
                
                if (newlyOutbrokenCities.length > 0) {
                    const isFallOfRome = newState.gameType === 'fallOfRome';
                    const title = isFallOfRome ? "CITY SACKED!" : "OUTBREAK ALERT";
                    const cityNames = newlyOutbrokenCities.map(c => CITIES_DATA[c].name).join(', ');
                    
                    // Capture the state of outbreak results at this moment for the report
                    const outbreakResultsForReport = [...newState.outbreakResults];

                    generateOutbreakReport(cityNames, newState.useAiNarratives, newState.gameType).then(msg => {
                        if (msg) {
                            const modalBody = (
                                <div>
                                    <p>{msg}</p>
                                    <InfectionResultList title="Chain Reaction Details" results={outbreakResultsForReport} />
                                </div>
                            );
                            setModalContent({ title: title, body: modalBody, color: "text-red-500" });
                        }
                    });
                }

                setGameState(newState);
                setInfectionStepState({
                    queue: newQueue,
                    revealedCard: card,
                    outbreaksThisTurn: outbreaksInTurn,
                    invadedCity: invadedCity,
                });
            }
        } else if (gameState.gamePhase === GamePhase.Epidemic) {
            const timer = setTimeout(() => {
                handleEpidemicPhase();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [gameState, infectionStepState, handleStartInfectionPhase, handleEpidemicPhase, logEvent, setModalContent]);

    const handleResolveVaeVictis = useCallback((payload: {
        option: 'normal' | 'corrupt';
        selections: { [key in CityName]?: { [key in DiseaseColor]?: number } };
    }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingVaeVictis || !prevState.pendingVaeVictisContext) {
                return prevState;
            }
    
            const newState = safeCloneGameState(prevState);
            const { option, selections } = payload;
    
            let totalRemoved = 0;
            const logParts: string[] = [];
    
            Object.entries(selections).forEach(([cityName, citySelections]) => {
                Object.entries(citySelections).forEach(([color, count]) => {
                    if (count && count > 0) {
                        const currentCubes = newState.diseaseCubes[cityName as CityName]?.[color as DiseaseColor] || 0;
                        const actualRemoved = Math.min(count, currentCubes);
                        
                        if (actualRemoved > 0) {
                            newState.diseaseCubes[cityName as CityName]![color as DiseaseColor]! -= actualRemoved;
                            newState.remainingCubes[color as DiseaseColor] += actualRemoved;
                            totalRemoved += actualRemoved;
                            logParts.push(`${actualRemoved} ${color} from ${CITIES_DATA[cityName as CityName].name}`);
                        }
                    }
                });
            });
            
            let logMessage = `Vae Victis removes ${totalRemoved} barbarian(s): ${logParts.join(', ')}`;
    
            if (option === 'corrupt') {
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                logMessage += ". The corrupt option advances the decline marker!";
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                }
            } else {
                logMessage += ".";
            }
            logEvent(logMessage);
    
            // Cleanup and return to previous phase
            newState.pendingVaeVictisContext = null;
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
    
            if (hasWon(newState)) {
                newState.gamePhase = GamePhase.GameOver;
                newState.gameOverReason = 'All barbarian threats have been contained. Rome is saved!';
            }
    
            return newState;
        });
    }, [logEvent]);

    const handleResolveSiVisPacemParaBellum = useCallback((payload: { 
        option: 'normal' | 'corrupt';
        city: CityName; 
        cityToRemove?: CityName; 
        pawnId: number | null; 
        legionsToMove: number 
    }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingSiVisPacemParaBellum) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const { option, city, cityToRemove, pawnId, legionsToMove } = payload;
            
            // 1. Place a fort (both options)
            if (cityToRemove) {
                newState.forts = newState.forts.filter(f => f !== cityToRemove);
                newState.forts.push(city);
                logEvent(`A fort was moved from ${CITIES_DATA[cityToRemove].name} to ${CITIES_DATA[city].name} via Si Vis Pacem, Para Bellum.`);
            } else if (!newState.forts.includes(city)) {
                newState.forts.push(city);
                logEvent(`A fort was built in ${CITIES_DATA[city].name} via Si Vis Pacem, Para Bellum.`);
            }
    
            // 2. Corrupt option effects
            if (option === 'corrupt') {
                // 2a. Increase outbreak counter
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                logEvent(`The corrupt option was chosen. The decline marker advances!`);
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                    return newState;
                }
    
                // 2b. Move pawn and legions if selected
                if (pawnId !== null) {
                    const pawn = newState.players.find(p => p.id === pawnId);
                    if (pawn) {
                        const startCity = pawn.location;
                        pawn.location = city;
                        
                        let takingStr = '';
                        if (legionsToMove > 0) {
                            let removedCount = 0;
                            const newLegions: CityName[] = [];
                            (newState.legions || []).forEach(l => {
                                if (l === startCity && removedCount < legionsToMove) { removedCount++; } else { newLegions.push(l); }
                            });
                            for (let i = 0; i < legionsToMove; i++) { newLegions.push(city); }
                            newState.legions = newLegions;
                            takingStr = `, taking ${legionsToMove} legion(s)`;
                        }
                        
                        logEvent(`${pawn.name} is moved to the new fort in ${CITIES_DATA[city].name}${takingStr}.`);
                        _handlePostMoveEffects(newState, pawn, 'Other');
                    }
                }
            }
            
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
    
            return newState;
        });
    }, [logEvent, _handlePostMoveEffects]);

    const handleResolveHicManebimusOptime = useCallback((payload: {
        option: 'normal' | 'corrupt';
        selections?: { [key in CityName]?: number };
    }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingHicManebimusOptime) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const { option, selections } = payload;
            let availableLegions = 16 - (newState.legions?.length || 0);
    
            if (option === 'corrupt') {
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                logEvent(`The corrupt option was chosen for Hic Manebimus Optime. The decline marker advances!`);
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                    return newState;
                }
    
                newState.forts.forEach(city => {
                    const legionsToAdd = Math.min(3, availableLegions);
                    if (legionsToAdd > 0) {
                        for (let i = 0; i < legionsToAdd; i++) {
                            newState.legions.push(city);
                        }
                        availableLegions -= legionsToAdd;
                        logEvent(`${legionsToAdd} legion(s) added to the fort in ${CITIES_DATA[city].name}.`);
                    }
                });
    
            } else if (selections) { // Normal option
                Object.entries(selections).forEach(([city, count]) => {
                    const legionsToAdd = Math.min(count, availableLegions);
                    if (legionsToAdd > 0) {
                        for (let i = 0; i < legionsToAdd; i++) {
                            newState.legions.push(city as CityName);
                        }
                        availableLegions -= legionsToAdd;
                        logEvent(`${legionsToAdd} legion(s) added to the fort in ${CITIES_DATA[city as CityName].name}.`);
                    }
                });
            }
    
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
    
            return newState;
        });
    }, [logEvent]);

    const handleResolveAudentesFortunaIuvat = useCallback((payload: { option: 'normal' | 'corrupt' }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingAudentesFortunaIuvat) return prevState;

            const wasVestalisDraw = prevState.phaseBeforeEvent === GamePhase.ResolvingVestalisPlayerCardDraw;
            
            const newState = safeCloneGameState(prevState);
            const { option } = payload;
            
            // --- Corrupt option penalty ---
            if (option === 'corrupt') {
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                logEvent(`The corrupt option was chosen. The decline marker advances!`);
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                    setDrawnPlayerCards(null);
                    newState.pendingVestalisPlayerCardDraw = null;
                    return newState;
                }
            }

            let finalDrawnCards: PlayerCard[] = [];

            if (wasVestalisDraw) {
                // ---- VESTALIS LOGIC OVERRIDE ----
                // The event overrides her 3-draw ability with a standard 2-draw as the base.
                const baseDrawCount = 2;
                const additionalDrawCount = option === 'corrupt' ? 4 : 2;
                const totalCardsToDraw = baseDrawCount + additionalDrawCount;

                logEvent(`Audentes Fortuna Iuvat overrides Vestalis's ability! Drawing ${totalCardsToDraw} cards.`);

                // Put her initial 3 cards back on top of the deck to nullify that draw.
                if (newState.pendingVestalisPlayerCardDraw) {
                    newState.playerDeck.unshift(...newState.pendingVestalisPlayerCardDraw);
                }
                newState.pendingVestalisPlayerCardDraw = null; // Clear the pending state

                // Now, perform the new, combined draw.
                for (let i = 0; i < totalCardsToDraw; i++) {
                    const card = newState.playerDeck.shift();
                    if (!card) {
                        newState.gamePhase = GamePhase.GameOver;
                        newState.gameOverReason = 'The player deck ran out of cards.';
                        setDrawnPlayerCards(null);
                        return newState;
                    }
                    finalDrawnCards.push(card);
                }
            } else {
                // ---- STANDARD PLAYER LOGIC ----
                const initialCards = drawnPlayerCards;
                if (!initialCards) {
                    logEvent("Error: No initial cards found to add to.");
                    newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction; // Go back
                    return newState;
                }

                const additionalDrawCount = option === 'corrupt' ? 4 : 2;
                logEvent(`Fortune favors the bold! Drawing ${additionalDrawCount} additional cards.`);

                const additionalCards: PlayerCard[] = [];
                for (let i = 0; i < additionalDrawCount; i++) {
                    const card = newState.playerDeck.shift();
                    if (!card) {
                        newState.gamePhase = GamePhase.GameOver;
                        newState.gameOverReason = 'The player deck ran out of cards.';
                        setDrawnPlayerCards(null);
                        return newState;
                    }
                    additionalCards.push(card);
                }
                finalDrawnCards = [...initialCards, ...additionalCards];
            }

            // --- UNIFIED OUTCOME ---
            // Both paths now lead here. The result is a set of cards to be shown in the standard "Cards Drawn" modal.
            setDrawnPlayerCards(finalDrawnCards);
            newState.gamePhase = GamePhase.DrawingPlayerCards;
            newState.phaseBeforeEvent = null;
            
            return newState;
        });
    }, [drawnPlayerCards, logEvent, setDrawnPlayerCards]);

    const handleResolveMorsTuaVitaMea = useCallback((payload: {
        option: 'normal' | 'corrupt';
        city: CityName;
        selections: { [key in DiseaseColor]?: number };
    }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingMorsTuaVitaMea) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const { option, city, selections } = payload;
            let totalReplaced = 0;
            const logParts: string[] = [];
    
            // 1. Corrupt option penalty
            if (option === 'corrupt') {
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                logEvent(`The corrupt option was chosen. The decline marker advances!`);
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                    return newState;
                }
            }
    
            // 2. Replace barbarians with legions
            Object.entries(selections).forEach(([color, count]) => {
                if (count && count > 0) {
                    const colorKey = color as DiseaseColor;
                    const availableInCity = newState.diseaseCubes[city]?.[colorKey] || 0;
                    const barbariansToReplace = Math.min(count, availableInCity);
                    
                    if (barbariansToReplace > 0) {
                        const availableLegionsInSupply = 16 - (newState.legions?.length || 0);
                        const legionsToAdd = Math.min(barbariansToReplace, availableLegionsInSupply);
    
                        // Remove barbarians
                        newState.diseaseCubes[city]![colorKey]! -= barbariansToReplace;
                        newState.remainingCubes[colorKey] += barbariansToReplace;
    
                        // Add legions
                        for (let i = 0; i < legionsToAdd; i++) {
                            newState.legions.push(city);
                        }
                        
                        totalReplaced += legionsToAdd;
                        logParts.push(`${legionsToAdd} ${color}`);
                    }
                }
            });
    
            if (totalReplaced > 0) {
                 logEvent(`Mors Tua, Vita Mea: Replaced ${logParts.join(', ')} barbarian(s) with legion(s) in ${CITIES_DATA[city].name}.`);
            }
    
            // 3. Cleanup and return to previous phase
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
    
            if (hasWon(newState)) {
                newState.gamePhase = GamePhase.GameOver;
                newState.gameOverReason = 'All barbarian threats have been contained. Rome is saved!';
            }
    
            return newState;
        });
    }, [logEvent]);

    const handleResolveHomoFaberFortunaeSuae = useCallback((payload: {
        option: 'normal' | 'corrupt';
        card: PlayerCard & { type: 'city' };
    }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingHomoFaberFortunaeSuae) return prevState;

            const newState = safeCloneGameState(prevState);
            const { option, card: cardToRetrieve } = payload;
            const player = newState.players[newState.currentPlayerIndex];

            const cardIndex = newState.playerDiscard.findIndex(c => 
                c.type === 'city' && c.name === cardToRetrieve.name && c.color === cardToRetrieve.color
            );

            if (cardIndex === -1) {
                logEvent(`Error: Could not find ${getCardDisplayName(cardToRetrieve)} in the discard pile.`);
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
                return newState;
            }

            // 1. Move card from discard to hand
            const [retrievedCard] = newState.playerDiscard.splice(cardIndex, 1);
            player.hand.push(retrievedCard);

            // 2. Corrupt option penalty
            let logMessage = `${player.name} retrieves the ${getCardDisplayName(retrievedCard)} card from the discard pile.`;
            if (option === 'corrupt') {
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                logMessage += " The corrupt option advances the decline marker!";
                logEvent(logMessage); // Log before potential game over
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                    return newState;
                }
            } else {
                logEvent(logMessage);
            }

            // 3. Cleanup and hand limit check
            const returnPhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;

            if (player.hand.length > getHandLimit(player)) {
                newState.playerToDiscardId = player.id;
                newState.gamePhase = GamePhase.Discarding;
                newState.phaseBeforeEvent = returnPhase; // Store the phase to return to after discard
                discardTriggerRef.current = 'action';
                newState.log.unshift(`- ${player.name} is over the hand limit and must discard.`);
            } else {
                newState.gamePhase = returnPhase;
            }

            return newState;
        });
    }, [logEvent, getHandLimit]);

    const handleResolveAleaIactaEst = useCallback((payload: { option: 'normal' | 'corrupt' }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingAleaIactaEst) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const { option } = payload;
    
            if (option === 'corrupt') {
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                logEvent(`The corrupt option for Alea Iacta Est was chosen. The decline marker advances! The effect will apply to all battles this turn.`);
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                    return newState;
                }
                newState.aleaIactaEstStatus = 'corrupt_active';
            } else { // normal
                logEvent(`The normal option for Alea Iacta Est was chosen. You may set the dice results for one battle this turn.`);
                newState.aleaIactaEstStatus = 'normal_available';
            }
    
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            return newState;
        });
    }, [logEvent]);

    const handleAleaIactaEstBattle = useCallback((chosenResults: BattleDieResult[]) => {
        setGameState(prevState => {
            if (!prevState) return prevState;
            
            const player = prevState.players[prevState.currentPlayerIndex];
            const cityCubes = prevState.diseaseCubes[player.location] || {};
            const totalBarbariansInCity = Object.values(cityCubes).reduce((sum, count) => sum + (count || 0), 0);
    
            let legionsLost = 0;
            let barbariansToRemove = 0;
            let legionsToAdd = 0;
            chosenResults.forEach(result => {
                switch (result) {
                    case 'loseLegion': legionsLost++; break;
                    case 'removeBarbarian': barbariansToRemove++; break;
                    case 'removeBarbarianAndLoseLegion': barbariansToRemove++; legionsLost++; break;
                    case 'removeTwoBarbariansAndLoseLegion': barbariansToRemove += 2; legionsLost++; break;
                    case 'special':
                        if (player.role === PlayerRole.Consul) legionsToAdd++;
                        else if (player.role === PlayerRole.MagisterMilitum) barbariansToRemove += 2;
                        else if (player.role === PlayerRole.Mercator) { barbariansToRemove++; legionsLost++; }
                        else if (player.role === PlayerRole.PraefectusClassis && FALLOFROME_PORT_CITIES.has(player.location)) barbariansToRemove++;
                        else if (player.role === PlayerRole.PraefectusFabrum && prevState.forts.includes(player.location)) barbariansToRemove += 2;
                        else if (player.role === PlayerRole.ReginaFoederata) { barbariansToRemove++; legionsToAdd++; }
                        else if (player.role === PlayerRole.Vestalis) legionsLost++;
                        break;
                }
            });
    
            if (player.role === PlayerRole.MagisterMilitum && legionsLost > 0) {
                legionsLost = Math.max(0, legionsLost - 1);
            }
    
            barbariansToRemove = Math.min(barbariansToRemove, totalBarbariansInCity);
    
            const requiresSelection = barbariansToRemove > 0 && Object.values(cityCubes).filter(c => c > 0).length > 1;
    
            const newState = safeCloneGameState(prevState);
            if (newState.aleaIactaEstStatus === 'normal_available') {
                newState.aleaIactaEstStatus = 'inactive';
                logEvent("Alea Iacta Est has been used for this turn.");
            }
    
            setBattleModalState(prev => ({
                ...prev,
                step: requiresSelection ? 'selectCubes' : 'viewResults',
                results: chosenResults,
                legionsLost,
                barbariansToRemove,
                legionsToAdd,
            }));
    
            return newState;
        });
    }, [setBattleModalState, logEvent]);

    const handleResolveAbundansCautelaNonNocet = useCallback((payload: { option: 'normal' | 'corrupt' }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingAbundansCautelaNonNocet) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const { option } = payload;
    
            if (option === 'corrupt') {
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                logEvent(`The corrupt option for Abundans Cautela Non Nocet was chosen. The decline marker advances! The Invade Cities step will be skipped this turn.`);
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                    return newState;
                }
                newState.abundansCautelaStatus = 'corrupt_active';
            } else { // normal
                logEvent(`The normal option for Abundans Cautela Non Nocet was chosen. The next Invade Cities step will draw 2 fewer cards.`);
                newState.abundansCautelaStatus = 'normal_active';
            }
    
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            return newState;
        });
    }, [logEvent]);

    const handleResolveMeliusCavereQuamPavere = useCallback((payload: { 
        option: 'normal' | 'corrupt';
        rearrangedCards: InfectionCard[];
        removedCard?: InfectionCard;
    }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingMeliusCavereQuamPavere) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const { option, rearrangedCards, removedCard } = payload;
    
            const numCardsToReplace = prevState.infectionDeck.length >= 6 ? 6 : prevState.infectionDeck.length;
    
            // Replace the top cards of the deck with the rearranged ones
            newState.infectionDeck.splice(0, numCardsToReplace, ...rearrangedCards);
            
            let logMessage = `The top ${rearrangedCards.length} cards of the Barbarian Deck have been rearranged.`;
    
            if (option === 'corrupt') {
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                
                if (removedCard) {
                    logMessage += ` The ${getCardDisplayName(removedCard)} card was removed from the game.`;
                }
                logMessage += " The corrupt option advances the decline marker!";
                
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                    return newState;
                }
            }
            
            logEvent(logMessage);
    
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            return newState;
        });
    }, [logEvent]);
    
    const handleResolveMortuiNonMordent = useCallback((payload: {
        option: 'normal' | 'corrupt';
        selections: { [key in CityName]?: { [key in DiseaseColor]?: number } };
    }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingMortuiNonMordent) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const { option, selections } = payload;
    
            let totalRemoved = 0;
            const logParts: string[] = [];
    
            // Handle corrupt option penalty
            if (option === 'corrupt') {
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                logEvent(`The corrupt option for Mortui Non Mordent was chosen. The decline marker advances!`);
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                    return newState;
                }
            }
    
            // Process removals
            Object.entries(selections).forEach(([cityName, citySelections]) => {
                Object.entries(citySelections).forEach(([color, count]) => {
                    if (count && count > 0) {
                        const colorKey = color as DiseaseColor;
                        const currentCubes = newState.diseaseCubes[cityName as CityName]?.[colorKey] || 0;
                        const actualRemoved = Math.min(count, currentCubes);
                        
                        if (actualRemoved > 0) {
                            newState.diseaseCubes[cityName as CityName]![colorKey]! -= actualRemoved;
                            newState.remainingCubes[colorKey] += actualRemoved;
                            totalRemoved += actualRemoved;
                            logParts.push(`${actualRemoved} from ${CITIES_DATA[cityName as CityName].name}`);
                        }
                    }
                });
            });
    
            if (totalRemoved > 0) {
                logEvent(`Mortui Non Mordent removes ${totalRemoved} barbarian(s): ${logParts.join(', ')}.`);
            }
    
            // Cleanup and return to the previous phase
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
    
            if (hasWon(newState)) {
                newState.gamePhase = GamePhase.GameOver;
                newState.gameOverReason = 'All barbarian threats have been contained. Rome is saved!';
            }
    
            return newState;
        });
    }, [logEvent]);

    const handleResolveFestinaLente = useCallback((payload: {
        option: 'normal' | 'corrupt';
        destination: CityName;
        pawnSelections: { pawnId: number; legionsToMove: number }[];
    }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingFestinaLente) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const { option, destination, pawnSelections } = payload;
    
            // Handle corrupt option penalty first
            if (option === 'corrupt') {
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                logEvent(`The corrupt option for Festina Lente was chosen. The decline marker advances!`);
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                    return newState;
                }
            }
    
            // Process pawn and legion movements
            const movedPawnsLog: string[] = [];
            pawnSelections.forEach(({ pawnId, legionsToMove }) => {
                const pawn = newState.players.find(p => p.id === pawnId);
                if (!pawn) return;
    
                const startCity = pawn.location;
                let logPart = pawn.name;
    
                // Move pawn
                pawn.location = destination;
    
                // Move legions
                if (legionsToMove > 0) {
                    let removedCount = 0;
                    const newLegions: CityName[] = [];
                    (newState.legions || []).forEach(l => {
                        if (l === startCity && removedCount < legionsToMove) {
                            removedCount++;
                        } else {
                            newLegions.push(l);
                        }
                    });
                    for (let i = 0; i < legionsToMove; i++) {
                        newLegions.push(destination);
                    }
                    newState.legions = newLegions;
                    logPart += ` with ${legionsToMove} legion(s)`;
                }
                
                movedPawnsLog.push(logPart);
    
                // Trigger post-move effects for each pawn moved
                _handlePostMoveEffects(newState, pawn, 'Other');
            });
    
            if (movedPawnsLog.length > 0) {
                logEvent(`Festina Lente moves ${movedPawnsLog.join(', ')} to ${CITIES_DATA[destination].name}.`);
            }
    
            // Cleanup and return to previous phase
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
    
            return newState;
        });
    }, [logEvent, _handlePostMoveEffects]);

    const handleResolveVeniVidiVici = useCallback((payload: {
        option: 'normal' | 'corrupt';
        destination: CityName;
        legionsToMove: number;
        initiateBattle: boolean;
    }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingVeniVidiVici) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const { option, destination, legionsToMove, initiateBattle } = payload;
            const player = newState.players[newState.currentPlayerIndex];
            const startCity = player.location;
    
            // 1. Corrupt option penalty
            if (option === 'corrupt') {
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                logEvent(`The corrupt option for Veni, Vidi, Vici was chosen. The decline marker advances!`);
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                    return newState;
                }
            }
    
            // 2. Move pawn and legions
            player.location = destination;
            let takingStr = '';
            if (legionsToMove > 0) {
                let removedCount = 0;
                const newLegions: CityName[] = [];
                (newState.legions || []).forEach(l => {
                    if (l === startCity && removedCount < legionsToMove) { removedCount++; } else { newLegions.push(l); }
                });
                for (let i = 0; i < legionsToMove; i++) { newLegions.push(destination); }
                newState.legions = newLegions;
                takingStr = ` with ${legionsToMove} legion(s)`;
            }
            logEvent(`${player.name} is moved to ${CITIES_DATA[destination].name}${takingStr} by Veni, Vidi, Vici.`);
            _handlePostMoveEffects(newState, player, 'Other');
    
            // 3. Handle battle or end of event
            if (initiateBattle) {
                if (option === 'corrupt') {
                    newState.veniVidiViciStatus = 'corrupt_battle_pending';
                }
                const legionsInCity = (newState.legions || []).filter(l => l === destination).length;
                setBattleModalState({
                    ...initialBattleModalState,
                    isOpen: true,
                    maxDice: Math.min(3, legionsInCity),
                    isFreeAction: true, // Mark this as a free battle
                });
                // The game phase remains ResolvingVeniVidiVici until the battle is confirmed.
            } else {
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
            }
    
            return newState;
        });
    }, [logEvent, _handlePostMoveEffects, setBattleModalState]);

    const handleHospitalFounding = (color: DiseaseColor, city: CityName) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingHospitalFounding) return prevState;
            const newState = safeCloneGameState(prevState);
    
            const oldLocation = newState.hospitals[color];
            newState.hospitals[color] = city;
    
            if (oldLocation) {
                logEvent(`Hospital Founding moves the ${color} hospital from ${CITIES_DATA[oldLocation].name} to ${CITIES_DATA[city].name}.`);
            } else {
                logEvent(`Hospital Founding places the ${color} hospital in ${CITIES_DATA[city].name}.`);
            }
    
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            return newState;
        });
    };
    
    const handleResolveMailCorrespondence = (payload: {
        player1Id: number;
        player2Id: number;
        card1: PlayerCard & { type: 'city' };
        card2: PlayerCard & { type: 'city' };
    }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingMailCorrespondence) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const { player1Id, player2Id, card1, card2 } = payload;
    
            const player1 = newState.players.find(p => p.id === player1Id);
            const player2 = newState.players.find(p => p.id === player2Id);
    
            if (!player1 || !player2) {
                logEvent("Error resolving Mail Correspondence: Players not found.");
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
                return newState;
            }
    
            const card1Index = player1.hand.findIndex(c => c.type === 'city' && c.name === card1.name && c.color === card1.color);
            const card2Index = player2.hand.findIndex(c => c.type === 'city' && c.name === card2.name && c.color === card2.color);
    
            if (card1Index === -1 || card2Index === -1) {
                logEvent("Error resolving Mail Correspondence: Cards not found in players' hands.");
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
                return newState;
            }
    
            const [swappedCard1] = player1.hand.splice(card1Index, 1);
            const [swappedCard2] = player2.hand.splice(card2Index, 1);
            player1.hand.push(swappedCard2);
            player2.hand.push(swappedCard1);
    
            logEvent(`${player1.name} and ${player2.name} swapped the ${getCardDisplayName(card1)} and ${getCardDisplayName(card2)} cards via Mail Correspondence.`);
    
            const checkHandLimit = (gs: GameState, p: Player, nextPhase: GamePhase) => {
                if (p.hand.length > getHandLimit(p)) {
                    gs.playerToDiscardId = p.id;
                    gs.gamePhase = GamePhase.Discarding;
                    gs.phaseBeforeEvent = nextPhase;
                    discardTriggerRef.current = 'action';
                    gs.log.unshift(`- ${p.name} is over the hand limit and must discard.`);
                    return true;
                }
                return false;
            };
    
            const returnPhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
        
            const player1NeedsDiscard = checkHandLimit(newState, player1, returnPhase);
            if (!player1NeedsDiscard) {
                const player2NeedsDiscard = checkHandLimit(newState, player2, returnPhase);
                if (!player2NeedsDiscard) {
                    newState.gamePhase = returnPhase;
                }
            }
        
            newState.phaseBeforeEvent = null;
    
            return newState;
        });
    };

    const handleResolveNewRails = (connections: { from: CityName, to: CityName }[]) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingNewRails || connections.length !== 2) {
                return prevState;
            }
            const newState = safeCloneGameState(prevState);
            newState.railroads.push(...connections);
    
            const connection1Str = `${CITIES_DATA[connections[0].from].name} ↔ ${CITIES_DATA[connections[0].to].name}`;
            const connection2Str = `${CITIES_DATA[connections[1].from].name} ↔ ${CITIES_DATA[connections[1].to].name}`;
            logEvent(`New Rails event adds railroads between ${connection1Str} and ${connection2Str}.`);
    
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            return newState;
        });
    };

    const handleResolvePurifyWaterEvent = (regionName: string) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingPurifyWaterEvent || !prevState.pendingPurifyWaterEvent) {
                return prevState;
            }
            if (prevState.purificationTokenSupply < 1) {
                logEvent("Cannot place token: Supply is empty.");
                return prevState;
            }
    
            const newState = safeCloneGameState(prevState);
            
            newState.purificationTokens[regionName] = (newState.purificationTokens[regionName] || 0) + 1;
            newState.purificationTokenSupply--;
            newState.log.unshift(`- Purify Water event adds 1 purification token to Region ${regionName}.`);
    
            const tokensRemaining = newState.pendingPurifyWaterEvent!.tokensRemaining - 1;
    
            if (tokensRemaining <= 0 || newState.purificationTokenSupply <= 0) {
                // Event is finished
                newState.pendingPurifyWaterEvent = null;
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
                logEvent("Purify Water event resolution complete.");
            } else {
                // More tokens to place
                newState.pendingPurifyWaterEvent!.tokensRemaining = tokensRemaining;
            }
    
            return newState;
        });
    };
    
    const handleResolveRingRailroads = (connection: { from: CityName, to: CityName }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingRingRailroads || !prevState.pendingRingRailroadsEvent) {
                return prevState;
            }
    
            const { from, to } = connection;
    
            // --- Validation ---
            if (!IBERIA_PORT_CITIES.has(from) || !IBERIA_PORT_CITIES.has(to)) {
                logEvent("Invalid placement: Railroad must be between two port cities.");
                return prevState;
            }
            const railroadExists = prevState.railroads.some(r => (r.from === from && r.to === to) || (r.from === to && r.to === from));
            if (railroadExists) {
                logEvent("A railroad already exists on this route.");
                return prevState;
            }
            const isSeaRoute = IBERIA_SEA_CONNECTIONS.some(c => (c[0] === from && c[1] === to) || (c[0] === to && c[1] === from));
            if (isSeaRoute) {
                logEvent("Railroads cannot be built on sea routes.");
                return prevState;
            }
            // --- End Validation ---
    
            const newState = safeCloneGameState(prevState);
            newState.railroads.push(connection);
            newState.log.unshift(`- Ring Railroads adds a railroad between ${CITIES_DATA[from].name} and ${CITIES_DATA[to].name}.`);
            
            const tokensRemaining = newState.pendingRingRailroadsEvent!.tokensRemaining - 1;
    
            if (tokensRemaining <= 0) {
                newState.pendingRingRailroadsEvent = null;
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
                logEvent("Ring Railroads event resolution complete.");
            } else {
                newState.pendingRingRailroadsEvent!.tokensRemaining = tokensRemaining;
            }
    
            return newState;
        });
    };

    const handleResolveFreeBattle = useCallback((payload: {
        legionsLost: number;
        barbariansToRemove: { [key in DiseaseColor]?: number };
        legionsToAdd?: number;
    }) => {
        setGameState(prevState => {
            if (!prevState) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const player = newState.players[newState.currentPlayerIndex];
            const city = player.location;
            let { legionsLost, barbariansToRemove, legionsToAdd } = payload;
    
            // Check for Veni, Vidi, Vici (Corrupt) effect
            if (newState.veniVidiViciStatus === 'corrupt_battle_pending') {
                logEvent("Legion losses from this battle are ignored due to Veni, Vidi, Vici!");
                legionsLost = 0;
            }
    
            // --- This is the same logic as the regular battle action ---
            const legionsInCity = newState.legions.filter(l => l === city).length;
            const actualLegionsLost = Math.min(legionsLost, legionsInCity);
            if (actualLegionsLost > 0) {
                let removedCount = 0;
                const newLegions: CityName[] = [];
                newState.legions.forEach(l => {
                    if (l === city && removedCount < actualLegionsLost) { removedCount++; } else { newLegions.push(l); }
                });
                newState.legions = newLegions;
                newState.log.unshift(`- Battle losses: ${actualLegionsLost} legion(s) removed.`);
            }
    
            let totalRemoved = 0;
            Object.entries(barbariansToRemove).forEach(([color, count]) => {
                if (count && count > 0 && newState.diseaseCubes[city]?.[color as DiseaseColor]) {
                    const currentCubes = newState.diseaseCubes[city]![color as DiseaseColor]!;
                    const actualRemoved = Math.min(count, currentCubes);
                    newState.diseaseCubes[city]![color as DiseaseColor]! -= actualRemoved;
                    newState.remainingCubes[color as DiseaseColor] += actualRemoved;
                    totalRemoved += actualRemoved;
                }
            });
             if (totalRemoved > 0) newState.log.unshift(`- Battle victory: ${totalRemoved} barbarian(s) removed.`);
    
            if (legionsToAdd && legionsToAdd > 0) {
                const availableInSupply = 16 - (newState.legions?.length || 0);
                const actualLegionsAdded = Math.min(legionsToAdd, availableInSupply);
                if (actualLegionsAdded > 0) {
                    for (let i = 0; i < actualLegionsAdded; i++) newState.legions.push(city);
                    newState.log.unshift(`- Special ability adds ${actualLegionsAdded} legion(s).`);
                }
            }
            // --- End of duplicated logic ---
            
            newState.actionHistory = [];
            logEvent('The free battle action is final and cannot be undone.');

            // Cleanup and return to the player action phase
            newState.veniVidiViciStatus = 'inactive';
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
    
            if (hasWon(newState)) {
                newState.gamePhase = GamePhase.GameOver;
                newState.gameOverReason = 'All barbarian threats have been contained. Rome is saved!';
            }
    
            return newState;
        });
    }, [logEvent]);

    const handleResolveCarpeDiem = useCallback((payload: { option: 'normal' | 'corrupt' }) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingCarpeDiem) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const { option } = payload;
            const currentPlayer = newState.players[newState.currentPlayerIndex];
            const nextPlayer = newState.players[(newState.currentPlayerIndex + 1) % newState.players.length];
            
            const isActionPhase = prevState.gamePhase === GamePhase.PlayerAction;
            
            let actionsToAdd = 0;
            let logMessage = `${currentPlayer.name} plays Carpe Diem. `;
    
            if (option === 'corrupt') {
                newState.outbreakCounter = Math.min(8, newState.outbreakCounter + 1);
                actionsToAdd = 4;
                logMessage += `The corrupt option was chosen, granting 4 extra actions. The decline marker advances!`;
                if (newState.outbreakCounter >= 8) {
                    newState.gamePhase = GamePhase.GameOver;
                    newState.gameOverReason = 'The decline marker has reached the last space.';
                    logEvent(logMessage);
                    return newState;
                }
            } else { // normal
                actionsToAdd = 2;
                logMessage += `The normal option was chosen, granting 2 extra actions.`;
            }
            
            if (isActionPhase) {
                newState.actionsRemaining += actionsToAdd;
                logMessage += ` ${currentPlayer.name} now has ${newState.actionsRemaining} actions remaining.`;
            } else {
                newState.extraActionsForNextTurn += actionsToAdd;
                logMessage += ` ${nextPlayer.name} will have ${actionsToAdd} extra actions on their turn.`;
            }
            
            logEvent(logMessage);
    
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            return newState;
        });
    }, [logEvent]);

    const handleConfirmGovernmentMoves = useCallback((plannedMoves: Record<number, {
        destination?: CityName;
        moveType: 'Carriage' | 'Train' | 'Ship' | 'skip';
        cardToDiscard?: PlayerCard & { type: 'city' };
        passengerId?: number;
    }>) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingGovernmentMobilization) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const playerOrder = newState.pendingGovernmentMobilization?.playersToMove || [];
    
            // Process moves in the original turn order
            for (const playerId of playerOrder) {
                const move = plannedMoves[playerId];
                if (!move) continue;
    
                const movingPlayer = newState.players.find(p => p.id === playerId)!;
    
                if (move.moveType === 'skip') {
                    newState.log.unshift(`- ${movingPlayer.name} does not move.`);
                    continue;
                }
    
                if (move.destination) {
                    const startCity = movingPlayer.location;
    
                    // 1. Handle Card Discard (for ship moves)
                    if (move.cardToDiscard) {
                        const cardIndex = movingPlayer.hand.findIndex(c =>
                            c.type === 'city' && c.name === move.cardToDiscard!.name && c.color === move.cardToDiscard!.color
                        );
                        if (cardIndex > -1) {
                            const [discarded] = movingPlayer.hand.splice(cardIndex, 1);
                            newState.playerDiscard.push(discarded);
                        }
                    }
    
                    // 2. Move the Player
                    movingPlayer.location = move.destination;
                     let logMessage = `- ${movingPlayer.name} moves to ${CITIES_DATA[move.destination].name} via ${move.moveType}`;
    
    
                    // 3. Move the Passenger (if any)
                    if (move.passengerId !== undefined) {
                        const passenger = newState.players.find(p => p.id === move.passengerId)!;
                        passenger.location = move.destination;
                        logMessage += ` with ${passenger.name}.`;
                        _handlePostMoveEffects(newState, passenger, 'Other');
                        _handleNursePostMove(newState, passenger);
                    } else {
                        logMessage += '.';
                    }
    
                    newState.log.unshift(logMessage);
                    _handlePostMoveEffects(newState, movingPlayer, 'Other');
                    _handleNursePostMove(newState, movingPlayer);
                }
            }
    
            // 4. Clean up and exit event
            newState.pendingGovernmentMobilization = null;
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
            newState.log.unshift("- Government Mobilization is complete.");
    
            return newState;
        });
    }, [setGameState, logEvent, _handlePostMoveEffects, _handleNursePostMove]);

    const handleResolveScienceTriumph = (regionName: string) => {
        setGameState(prevState => {
            if (!prevState || prevState.gamePhase !== GamePhase.ResolvingScienceTriumph) return prevState;
    
            const newState = safeCloneGameState(prevState);
            const region = IBERIA_REGIONS.find(r => r.name === regionName);
    
            if (!region) {
                logEvent(`Error: Region ${regionName} not found.`);
                newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
                newState.phaseBeforeEvent = null;
                return newState;
            }
    
            let cubesRemovedCount = 0;
            const removedLogParts: string[] = [];
    
            region.vertices.forEach(city => {
                const cityCubes = newState.diseaseCubes[city];
                if (cityCubes && Object.values(cityCubes).some(count => count > 0)) {
                    // Find the first color with cubes to remove one from.
                    const colorToRemove = (Object.keys(cityCubes) as DiseaseColor[]).find(color => (cityCubes[color] || 0) > 0);
                    
                    if (colorToRemove) {
                        newState.diseaseCubes[city]![colorToRemove]!--;
                        newState.remainingCubes[colorToRemove]++;
                        cubesRemovedCount++;
                        removedLogParts.push(`1 ${colorToRemove} from ${CITIES_DATA[city].name}`);
                        _checkForEradication(newState, colorToRemove);
                    }
                }
            });
    
            if (cubesRemovedCount > 0) {
                playSound('treatdisease');
                logEvent(`Science Triumph removes ${cubesRemovedCount} cube(s) from Region ${regionName}: ${removedLogParts.join(', ')}.`);
            } else {
                logEvent(`Science Triumph had no effect in Region ${regionName} as there were no cubes to remove.`);
            }
    
            newState.gamePhase = newState.phaseBeforeEvent || GamePhase.PlayerAction;
            newState.phaseBeforeEvent = null;
    
            return newState;
        });
    };

    return {
        gameState,
        setGameState,
        modalContent, setModalContent,
        drawnPlayerCards,
        infectionStepState, setInfectionStepState,
        intensifyModalOpen,
        logEvent,
        handleStartGame,
        finalizeGameSetup,
        handleAction,
        handleUndoAction,
        handleEndTurn,
        _drawPlayerCards,
        handleConfirmPlayerDraw,
        handleConfirmDiscard,
        handleStartInfectionPhase,
        handleAcknowledgeInfectionStep,
        handleEpidemicPhase,
        handleConfirmEpidemicInfect,
        executeIntensify,
        handleContinueToInfectionPhase,
        handlePlayEventCard,
        handlePlayContingencyCard,
        handlePlayResilientPopulation,
        handleRemoteTreatment,
        handleMobileHospitalRemove,
        handleEpidemiologistTakeCard,
        handleReturnSamples,
        getHandLimit,
        _startNextTurn,
        safeCloneGameState,
        handleGovernmentGrant,
        handleAirlift,
        handleForecast,
        handleConfirmForecastPlay,
        handleCancelForecastPlay,
        handleNewAssignment,
        handleSpecialOrders,
        handleRapidVaccineDeployment,
        handleConfirmTroubleshooterPreview,
        handleSkipTroubleshooterPreview,
        handleReExaminedResearch,
        handleConfirmPilotFlight,
        handleCancelPilotFlight,
        handleInitiateFieldDirectorTreat,
        handleInitiateFieldDirectorMove,
        handleFieldDirectorMove,
        handleCancelFieldDirectorAction,
        handleInitiateEpidemiologistTake,
        handleCancelEpidemiologistTake,
        handleResolveMutationEvent,
        handleCancelEventResolution,
        handleAcknowledgeMutationResult,
        handleStationRelocation,
        handleFortRelocation,
        handleCancelFortRelocation,
        handleSimpleCancel,
        handleChooseStartingCity,
        battleModalState, setBattleModalState, handleRollBattleDice, initialBattleModalState,
        handleInitiateVestalisDrawEvent,
        handleConfirmVestalisDrawEvent,
        handleConfirmVestalisDrawAction,
        handleCancelVestalisDrawAction,
        handleConfirmVestalisPlayerCardDraw,
        handleConfirmRoyalAcademyScientistForecast,
        handleResolveDoUtDes,
        handleResolveVaeVictis,
        handleResolveSiVisPacemParaBellum,
        handleResolveHicManebimusOptime,
        handleResolveAudentesFortunaIuvat,
        handleResolveMorsTuaVitaMea,
        handleResolveHomoFaberFortunaeSuae,
        handleResolveAleaIactaEst,
        handleAleaIactaEstBattle,
        handleResolveAbundansCautelaNonNocet,
        handleResolveMeliusCavereQuamPavere,
        handleResolveMortuiNonMordent,
        handleResolveFestinaLente,
        handleResolveVeniVidiVici,
        handleResolveFreeBattle,
        handleResolveCarpeDiem,
        handlePurificationChoice,
        handleAgronomistPurifyChoice, 
        handleNurseTokenPlacement,
        handleConfirmGovernmentMoves,
        handleHospitalFounding,
        handleResolveMailCorrespondence,
        handleResolveNewRails,
        handleResolvePurifyWaterEvent,
        handleResolveRingRailroads,
        handleResolveScienceTriumph,
    };
};
