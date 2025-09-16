

import React, { useState, useEffect, useCallback } from 'react';
import { GameState, GamePhase, Player, CityName, PlayerCard, InfectionCard, DiseaseColor, PlayerRole, CITIES_DATA, CONNECTIONS, GameSetupConfig, EventCardName, ALL_EVENT_CARDS, PLAYER_ROLE_INFO, EVENT_CARD_INFO, ShareOption, CureOptionForModal, CureActionPayload, RemoteTreatmentSelection, VirulentStrainEpidemicCardName, MutationEventCardName, FALLOFROME_CITIES_DATA, FALLOFROME_ALLIANCE_CARD_REQUIREMENTS, BattleModalState, BattleDieResult, FALLOFROME_INITIAL_CUBE_COUNTS, FallOfRomeDiseaseColor, isFallOfRomeDiseaseColor, FALLOFROME_DISEASE_COLORS, IBERIA_CITIES_DATA, IBERIA_REGIONS, IBERIA_PORT_CITIES, IBERIA_CITY_TO_REGIONS_MAP, IBERIA_SEA_CONNECTIONS, IBERIA_CONNECTIONS, City } from './types';
import Board from './components/Board';
import Dashboard from './components/Dashboard';
import Modal from './components/Modal';
import SetupScreen from './components/SetupScreen';
import LobbyScreen from './components/LobbyScreen';
import { generateGameOverReport } from './services/geminiService';
import { useGameLogic } from './hooks/useGameLogic.tsx';
import { GameModals } from './components/GameModals';
import { createGame, getGameStream, updateGame, getGame, isFirebaseInitialized, joinGame, setPlayerOnlineStatus, updatePlayerName } from './services/firebase';
import { getCityDataForGame } from './utils';

const getLocalPlayerId = (): number | null => {
    const id = localStorage.getItem('pandemicPlayerId');
    return id ? parseInt(id, 10) : null;
};
const setLocalPlayerId = (id: number) => localStorage.setItem('pandemicPlayerId', id.toString());

const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    const timeout = new Promise<T>((_, reject) => {
        setTimeout(() => {
            reject(new Error(errorMessage));
        }, ms);
    });
    return Promise.race([promise, timeout]);
};

export const App: React.FC = () => {
    const [highlightedRegions, setHighlightedRegions] = useState<string[]>([]);
    const [localPlayerId, setLpId] = useState<number | null>(getLocalPlayerId());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCityNames, setShowCityNames] = useState(false);
    const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('soundEffectsEnabled');
        // Default to true if not set
        return saved !== 'false';
    });
    const [cityNameFontSize, setCityNameFontSize] = useState<number>(12);
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [highlightedConnections, setHighlightedConnections] = useState<({ from: CityName, to: CityName })[]>([]);
    const [newRailsSelections, setNewRailsSelections] = useState<{ from: CityName, to: CityName }[]>([]);
    const [purifyWaterModalOpen, setPurifyWaterModalOpen] = useState(false);
    const [purificationChoiceModalOpen, setPurificationChoiceModalOpen] = useState(false);
        const handleToggleSoundEffects = (enabled: boolean) => {
            setIsSoundEnabled(enabled);
            localStorage.setItem('soundEffectsEnabled', String(enabled));
        };
    

    const {
        gameState, setGameState,
        modalContent, setModalContent,
        drawnPlayerCards,
        infectionStepState, setInfectionStepState,
        intensifyModalOpen,
        logEvent,
        handleStartGame,
        finalizeGameSetup,
        handleAction, handleUndoAction, handleEndTurn,
        _drawPlayerCards, handleConfirmPlayerDraw, handleConfirmDiscard,
        handleStartInfectionPhase, handleAcknowledgeInfectionStep,
        handleEpidemicPhase, handleConfirmEpidemicInfect, executeIntensify, handleContinueToInfectionPhase,
        handlePlayEventCard, handlePlayContingencyCard, handlePlayResilientPopulation,
        handleRemoteTreatment, handleMobileHospitalRemove, handleEpidemiologistTakeCard, handleReturnSamples, getHandLimit, _startNextTurn, safeCloneGameState,
        handleGovernmentGrant, handleAirlift, handleForecast, handleNewAssignment, handleSpecialOrders, handleRapidVaccineDeployment,
        handleConfirmTroubleshooterPreview, handleSkipTroubleshooterPreview, handleReExaminedResearch,
        handleConfirmPilotFlight, handleCancelPilotFlight,
        handleInitiateFieldDirectorTreat, handleInitiateFieldDirectorMove, handleFieldDirectorMove, handleCancelFieldDirectorAction,
        handleInitiateEpidemiologistTake, handleCancelEpidemiologistTake,
        handleResolveMutationEvent, handleCancelEventResolution, handleAcknowledgeMutationResult, handleStationRelocation,
        handleConfirmForecastPlay, handleCancelForecastPlay,
        handleFortRelocation, handleCancelFortRelocation, handleSimpleCancel,
        handleChooseStartingCity,
        battleModalState, setBattleModalState, handleRollBattleDice, handleAleaIactaEstBattle, initialBattleModalState,
        handleInitiateVestalisDrawEvent, handleConfirmVestalisDrawEvent, handleConfirmVestalisDrawAction, handleCancelVestalisDrawAction,
        handleConfirmVestalisPlayerCardDraw, handleConfirmRoyalAcademyScientistForecast,
        handleResolveDoUtDes, handleResolveVaeVictis, handleResolveSiVisPacemParaBellum, handleResolveHicManebimusOptime, handleResolveAudentesFortunaIuvat,
        handleResolveMorsTuaVitaMea, handleResolveHomoFaberFortunaeSuae, handleResolveAleaIactaEst, handleResolveAbundansCautelaNonNocet, handleResolveMeliusCavereQuamPavere,
        handleResolveMortuiNonMordent, handleResolveFestinaLente, handleResolveVeniVidiVici, handleResolveFreeBattle, handleResolveCarpeDiem, handlePurificationChoice,
        handleAgronomistPurifyChoice, handleNurseTokenPlacement, handleConfirmGovernmentMoves, handleHospitalFounding, handleResolveMailCorrespondence, handleResolveNewRails,
        handleResolvePurifyWaterEvent, handleResolveRingRailroads, handleResolveScienceTriumph, handleResolveScienceTriumphChoice, handleResolveShipsArrive, 
        handleResolveTelegraphMessage, handleResolveWhenThePlansWereGood,
    } = useGameLogic();


    // UI state that doesn't belong in game logic
    const [viewedPlayerId, setViewedPlayerId] = useState(localPlayerId ?? 0);
    const [dispatcherTargetId, setDispatcherTargetId] = useState<number | null>(null);
    const [gameOverReport, setGameOverReport] = useState<string | null>(null);
    const [marchModalState, setMarchModalState] = useState<{ isOpen: boolean; destination: CityName | null; availableLegions: number }>({ isOpen: false, destination: null, availableLegions: 0 });
    const [sailModalState, setSailModalState] = useState<{ isOpen: boolean; destination: CityName | null; availableLegions: number; validCards: (PlayerCard & { type: 'city' })[] }>({ isOpen: false, destination: null, availableLegions: 0, validCards: [] });
    const [selectedConnection, setSelectedConnection] = useState<{ from: CityName, to: CityName } | null>(null);
    const [railwaymanTrainModalState, setRailwaymanTrainModalState] = useState<{ isOpen: boolean; destination: CityName | null; passengers: Player[] }>({ isOpen: false, destination: null, passengers: [] });
    const [politicianGiveModalOpen, setPoliticianGiveModalOpen] = useState(false);
    const [politicianSwapModalOpen, setPoliticianSwapModalOpen] = useState(false);
    const [sailorPassengerModalState, setSailorPassengerModalState] = useState<{ isOpen: boolean; destination: CityName | null; passengers: Player[] }>({ isOpen: false, destination: null, passengers: [] });

    const handleInitiateRailwaymanDoubleBuild = () => {
        if (!gameState || !selectedConnection) return;
        const player = gameState.players[gameState.currentPlayerIndex];
        
        const { from, to } = selectedConnection;
        const endCityOfFirst = from === player.location ? to : from;
    
        const validNextConnections = CONNECTIONS[endCityOfFirst]
            .map(neighbor => ({ from: endCityOfFirst, to: neighbor }))
            .filter(conn => {
                const isReturnPath = conn.to === player.location;

                const railroadExists = gameState.railroads.some(r =>
                    (r.from === conn.from && r.to === conn.to) ||
                    (r.from === conn.to && r.to === conn.from)
                );
                const isSeaRoute = IBERIA_SEA_CONNECTIONS.some(c =>
                    (c[0] === conn.from && c[1] === conn.to) ||
                    (c[0] === conn.to && c[1] === conn.from)
                );
                return !railroadExists && !isSeaRoute && !isReturnPath;
            });
    
        setHighlightedConnections(validNextConnections);
        setRailwaymanModalOpen(true);
    };
    
    const handleCancelRailwaymanBuild = () => {
        setRailwaymanModalOpen(false);
        setHighlightedConnections([]);
        setSelectedConnection(null);
    };
    
    // Modal states
    const [allPlayerHandsModalOpen, setAllPlayerHandsModalOpen] = useState(false);
    const [shareModalState, setShareModalState] = useState<{ isOpen: boolean; options: ShareOption[] }>({ isOpen: false, options: [] });
    const [dispatchSummonModalState, setDispatchSummonModalState] = useState({ isOpen: false });
    const [takeEventModalState, setTakeEventModalState] = useState<{ isOpen: boolean; cards: EventCardName[] }>({ isOpen: false, cards: [] });
    const [treatDiseaseModalState, setTreatDiseaseModalState] = useState<{ isOpen: boolean; availableColors: DiseaseColor[] }>({ isOpen: false, availableColors: [] });
    const [cureDiseaseModalState, setCureDiseaseModalState] = useState<{ isOpen: boolean; options: CureOptionForModal[] }>({ isOpen: false, options: [] });
    const [expertFlightModalOpen, setExpertFlightModalOpen] = useState(false);
    const [returnSamplesModalState, setReturnSamplesModalState] = useState<{ isOpen: boolean; player: Player | null }>({ isOpen: false, player: null });
    const [resilientPopulationModalState, setResilientPopulationModalState] = useState<{ isOpen: boolean; ownerId: number | null; from: 'hand' | 'contingency' | null }>({ isOpen: false, ownerId: null, from: null });
    const [collectSampleModalState, setCollectSampleModalState] = useState<{ isOpen: boolean; availableColors: DiseaseColor[] }>({ isOpen: false, availableColors: [] });
    const [localLiaisonShareModalState, setLocalLiaisonShareModalState] = useState<{ isOpen: boolean; options: { card: PlayerCard & { type: 'city' }, toPlayer: Player }[] }>({ isOpen: false, options: [] });
    const [virologistTreatModalOpen, setVirologistTreatModalOpen] = useState(false);
    const [enlistBarbariansModalState, setEnlistBarbariansModalState] = useState<{ isOpen: boolean; options: { color: DiseaseColor, cards: (PlayerCard & { type: 'city' })[] }[] }>({ isOpen: false, options: [] });
    const [freeEnlistBarbariansModalState, setFreeEnlistBarbariansModalState] = useState<{ isOpen: boolean; options: { color: DiseaseColor }[] }>({ isOpen: false, options: [] });
    const [viewingDiscard, setViewingDiscard] = useState<'player' | 'infection' | null>(null);
    const [viewEventInfo, setViewEventInfo] = useState<EventCardName | null>(null);
    const [mercatorShareModalState, setMercatorShareModalState] = useState<{ isOpen: boolean; options: ShareOption[] }>({ isOpen: false, options: [] });
    const [praefectusRecruitModalState, setPraefectusRecruitModalState] = useState<{ isOpen: boolean; validCards: (PlayerCard & { type: 'city' })[]; availableLegions: number; }>({ isOpen: false, validCards: [], availableLegions: 0 });
    const [fabrumFlightModalState, setFabrumFlightModalState] = useState<{ isOpen: boolean; destination: CityName | null; }>({ isOpen: false, destination: null });
    const [railwaymanModalOpen, setRailwaymanModalOpen] = useState(false);
    const [reginaFoederataMoveModalState, setReginaFoederataMoveModalState] = useState<{
        isOpen: boolean;
        destination: CityName | null;
        actionType: 'March' | 'Sail';
        availableLegions: number;
        availableBarbarians: { [key in DiseaseColor]?: number };
        destinationBarbarians: { [key in DiseaseColor]?: number };
        validCards?: (PlayerCard & { type: 'city' })[];
    }>({
        isOpen: false,
        destination: null,
        actionType: 'March',
        availableLegions: 0,
        availableBarbarians: {},
        destinationBarbarians: {},
        validCards: []
    });
    
    // Effect to check URL for a game ID on initial load
    useEffect(() => {
        const path = window.location.pathname;
        const match = path.match(/\/game\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
            const gameId = match[1];
            setIsLoading(true);
            if (!isFirebaseInitialized) {
                setError("Multiplayer is not configured. Redirecting to home.");
                setTimeout(() => window.location.pathname = '/', 4000);
                return;
            }

            const joinPromise = withTimeout(joinGame(gameId), 10000, "Connection timed out.");
            joinPromise.then(playerId => {
                if (playerId !== null) {
                    setLpId(playerId);
                    setLocalPlayerId(playerId);
                } else {
                     setError("This game lobby is full. Redirecting to home.");
                     setTimeout(() => window.location.pathname = '/', 3000);
                }
            }).catch(err => {
                 setError(`Error joining game: ${(err as Error).message}. Redirecting to home.`);
                 setTimeout(() => window.location.pathname = '/', 4000);
            }).finally(() => { setIsLoading(false); });
        } else {
            try {
                const savedGame = localStorage.getItem('solitaireGameState');
                if (savedGame) {
                    const loadedState: GameState = JSON.parse(savedGame);
                    setGameState(loadedState);
                }
            } catch (e) {
                console.error("Failed to load saved game:", e);
                localStorage.removeItem('solitaireGameState');
            } finally {
                setIsLoading(false);
            }
        }
    }, []);

     // Effect for subscribing to multiplayer game updates
    useEffect(() => {
        const path = window.location.pathname;
        const match = path.match(/\/game\/([a-zA-Z0-9]+)/);
        const gameId = match?.[1];

        if (gameId && isFirebaseInitialized) {
            setIsLoading(true);
            const unsubscribe = getGameStream(gameId, (newState) => {
                setGameState(newState);
                setIsLoading(false);
                if (localPlayerId !== null && !newState.players.find(p => p.id === localPlayerId)?.isOnline) {
                    setPlayerOnlineStatus(gameId, localPlayerId, true);
                }
            });

            const handleBeforeUnload = () => { if (localPlayerId !== null) { setPlayerOnlineStatus(gameId, localPlayerId, false); } };
            window.addEventListener('beforeunload', handleBeforeUnload);

            return () => {
                handleBeforeUnload();
                unsubscribe();
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [localPlayerId, setGameState]);
    
    // Effect to update Firebase when local state changes
    useEffect(() => {
        if (!gameState) return; // Add this guard clause
    
        if (gameState.gameMode === 'solitaire') {
            localStorage.setItem('solitaireGameState', JSON.stringify(gameState));
        } else if (gameState.gameMode === 'multiplayer' && localPlayerId === gameState.hostId) {
            updateGame(gameState.gameId, gameState);
        }
    }, [gameState, localPlayerId]);

    // Effect to auto-select the local player's hand view
    useEffect(() => {
        if (localPlayerId !== null && viewedPlayerId !== localPlayerId) {
            setViewedPlayerId(localPlayerId);
        }
    }, [localPlayerId]);
    
    // Automatically switch the dashboard view to the current player and reset pawn control at the start of their turn.
    useEffect(() => {
        if (gameState && gameState.gameStatus === 'playing') {
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];
            if (currentPlayer) {
                setViewedPlayerId(currentPlayer.id);
                // Reset dispatcher control at the start of every turn
                setDispatcherTargetId(null);
            }
        }
    }, [gameState?.currentPlayerIndex, gameState?.gameStatus]);

    // Effect for game over report
    useEffect(() => {
        if (gameState?.gamePhase === GamePhase.GameOver && !gameOverReport && gameState.gameOverReason) {
            generateGameOverReport(hasWon(gameState), gameState.gameOverReason, gameState.useAiNarratives).then(setGameOverReport);
        }
    }, [gameState, gameOverReport]);
    
    // useEffect to highlight connections and regions
    useEffect(() => {
        if (gameState?.gamePhase === GamePhase.ResolvingPurificationChoice) {
            setPurificationChoiceModalOpen(true);
            setHighlightedRegions(gameState.pendingPurificationChoice?.availableRegions || []);
            setHighlightedConnections([]);
        } else if (gameState?.gamePhase === GamePhase.ResolvingPurifyWaterEvent) {
            setHighlightedRegions(IBERIA_REGIONS.map(r => r.name));
            setHighlightedConnections([]);
        } else if (gameState?.gamePhase === GamePhase.ResolvingRingRailroads) {
            const seaRoutes = new Set(IBERIA_SEA_CONNECTIONS.map(c => [c[0], c[1]].sort().join('_||_')));
            const existingRailroads = new Set((gameState.railroads || []).map(r => [r.from, r.to].sort().join('_||_')));
        
            const validConnections: { from: CityName; to: CityName }[] = [];
            const processedPairs = new Set<string>();
        
            // A more direct approach: iterate only through known port cities.
            for (const fromCity of Array.from(IBERIA_PORT_CITIES) as CityName[]) {
                // Get the neighbors for the current port city.
                const neighbors = IBERIA_CONNECTIONS[fromCity as keyof typeof IBERIA_CONNECTIONS] || [];
        
                for (const toCity of neighbors) {
                    // Check if the neighbor is ALSO a port city.
                    if (IBERIA_PORT_CITIES.has(toCity)) {
                        // Create a unique key to ensure we only process each connection once.
                        const key = [fromCity, toCity].sort().join('_||_');
                        if (processedPairs.has(key)) continue;
                        processedPairs.add(key);
        
                        // Check against other rules (not a sea route, no existing railroad).
                        if (!seaRoutes.has(key) && !existingRailroads.has(key)) {
                            validConnections.push({ from: fromCity, to: toCity });
                        }
                    }
                }
            }
            setHighlightedConnections(validConnections);
            setHighlightedRegions([]);
        } else if (gameState?.gamePhase === GamePhase.ResolvingScienceTriumph) {
            const regionsWithCubes = IBERIA_REGIONS.filter(region => 
                region.vertices.some(city => {
                    const cityCubes = gameState.diseaseCubes[city];
                    return cityCubes && Object.values(cityCubes).some(count => count > 0);
                })
            ).map(r => r.name);
            setHighlightedRegions(regionsWithCubes);
            setHighlightedConnections([]);
        } else if (gameState?.gamePhase === GamePhase.ResolvingNewRails) {
            const seaRoutes = new Set(IBERIA_SEA_CONNECTIONS.map(c => [c[0], c[1]].sort().join('_||_')));
            const existingRailroads = new Set((gameState.railroads || []).map(r => [r.from, r.to].sort().join('_||_')));
    
            const validConnections: { from: CityName, to: CityName }[] = [];
            const processedPairs = new Set<string>();
    
            for (const fromCity of Object.keys(IBERIA_CONNECTIONS) as CityName[]) {
                for (const toCity of IBERIA_CONNECTIONS[fromCity as keyof typeof IBERIA_CONNECTIONS]) {
                    const key = [fromCity, toCity].sort().join('_||_');
                    if (processedPairs.has(key)) continue;
                    processedPairs.add(key);
    
                    if (!seaRoutes.has(key) && !existingRailroads.has(key)) {
                        validConnections.push({ from: fromCity, to: toCity });
                    }
                }
            }
            setHighlightedConnections(validConnections);
            setHighlightedRegions([]);
        } else if (gameState?.gamePhase === GamePhase.NursePlacingPreventionToken) {
            const nurse = gameState.players.find(p => p.role === PlayerRole.Nurse);
            if (nurse && nurse.role === PlayerRole.Nurse) {
                setHighlightedRegions(IBERIA_CITY_TO_REGIONS_MAP[nurse.location] || []);
            } else {
                setHighlightedRegions([]);
            }
            setHighlightedConnections([]);
        } else {
            setPurificationChoiceModalOpen(false);
            setHighlightedRegions([]);
            setHighlightedConnections([]); // Clear all highlights when phase changes
        }
    }, [gameState?.gamePhase, gameState?.pendingPurificationChoice, gameState?.players, gameState?.pendingRailwaymanBuild, gameState?.railroads, gameState?.currentPlayerIndex]);


    // Game Setup/Lobby Handlers
    const handleStartGameClick = async (config: GameSetupConfig) => {
        if (config.gameMode === 'multiplayer') {
            if (!isFirebaseInitialized) return setError("Firebase not configured.");
            setIsLoading(true);
            try {
                const initialGameState = handleStartGame(config, 0);
                const gameId = await createGame(initialGameState);
                const newGsWithId = { ...initialGameState, gameId };
                await updateGame(gameId, newGsWithId);
                setLpId(0);
                setLocalPlayerId(0);
                window.history.pushState(null, '', `/game/${gameId}`);
                // The stream listener will now take over.
            } catch (err) { setError(`Failed to create game: ${(err as Error).message}`); }
            finally { setIsLoading(false); }
        } else {
            window.history.pushState(null, '', '/');
            setGameState(finalizeGameSetup(handleStartGame(config, null)));
        }
    };
    const handleUpdateNameInLobby = (name: string) => {
        if (!gameState || localPlayerId === null) return;
        updatePlayerName(gameState.gameId, localPlayerId, name);
    };
    const handleStartGameFromLobby = () => {
        if (!gameState) return;
        updateGame(gameState.gameId, finalizeGameSetup(gameState));
    };

    // Dashboard interaction handlers
    const handleDashboardAction = (action: string, payload: any) => {
        if (!gameState) return;
    
        // Handle actions that don't require a selected city first
        if (!gameState.selectedCity) {
            // Direct call to useGameLogic's handler for non-city-dependent actions
            handleAction(action, payload, dispatcherTargetId);
            return;
        }
    
        const player = gameState.players[gameState.currentPlayerIndex];
        const pawnToMoveId = dispatcherTargetId !== null ? dispatcherTargetId : player.id;
        const pawnToMove = gameState.players.find(p => p.id === pawnToMoveId)!;
        const destination = gameState.selectedCity;
    
        // --- MARCH (DRIVE) LOGIC ---
        if (action === 'Drive' && gameState.gameType === 'fallOfRome') {
            if (pawnToMove.role === PlayerRole.ReginaFoederata && pawnToMove.id === player.id) {
                const startCity = pawnToMove.location;
                setReginaFoederataMoveModalState({
                    isOpen: true,
                    destination,
                    actionType: 'March',
                    availableLegions: gameState.legions?.filter(l => l === startCity).length || 0,
                    availableBarbarians: gameState.diseaseCubes[startCity] || {},
                    destinationBarbarians: gameState.diseaseCubes[destination] || {},
                });
            } else {
                const legionsInStartCity = gameState.legions?.filter(l => l === pawnToMove.location).length || 0;
                if (legionsInStartCity > 0) {
                    setMarchModalState({
                        isOpen: true,
                        destination: destination,
                        availableLegions: legionsInStartCity,
                    });
                } else {
                    handleAction(action, payload, dispatcherTargetId);
                }
            }
            return;
        }
    
        // --- SAIL LOGIC ---
        if (action === 'Sail' && ['fallOfRome', 'iberia'].includes(gameState.gameType)) {
            const destination = gameState.selectedCity;
            if (!destination) return;
        
            // NEW: Sailor-specific logic for Iberia
            if (gameState.gameType === 'iberia' && player.role === PlayerRole.Sailor && player.id === pawnToMove.id) {
                const passengers = gameState.players.filter(p => p.id !== player.id && p.location === player.location);
                if (passengers.length > 0) {
                    setSailorPassengerModalState({ isOpen: true, destination, passengers });
                } else {
                    handleAction('Sail', { destination }, dispatcherTargetId); // Sail solo
                }
                return;
            }

            const legionsInStartCity = gameState.legions?.filter(l => l === pawnToMove.location).length || 0;
            
            if (player.role === PlayerRole.PraefectusClassis && player.id === pawnToMove.id) {
                setSailModalState({
                    isOpen: true,
                    destination: destination,
                    availableLegions: legionsInStartCity,
                    validCards: [],
                });
            } else {
                const destinationData = getCityDataForGame(destination, gameState.gameType) as City;
                if (!destinationData) return;
                // This is the key change to make the color check generic
                const destinationColors = new Set(destinationData.boardColors || [destinationData.color]);
                const validCards = player.hand.filter(c => c.type === 'city' && destinationColors.has(c.color)) as (PlayerCard & { type: 'city' })[];
        
                if (legionsInStartCity > 0 || validCards.length > 1) {
                    setSailModalState({
                        isOpen: true,
                        destination: destination,
                        availableLegions: legionsInStartCity,
                        validCards: validCards,
                    });
                } else if (validCards.length === 1) {
                    handleAction('Sail', { destination, cardToDiscard: validCards[0], legionsToMove: 0 }, dispatcherTargetId);
                } else {
                    handleAction(action, payload, dispatcherTargetId);
                }
            }
            return;
        }
    
        handleAction(action, payload, dispatcherTargetId);
    };
    
    const handleCityClick = useCallback((city: CityName) => {
        setGameState(gs => gs ? { ...gs, selectedCity: gs.selectedCity === city ? null : city } : null);
        setSelectedConnection(null); 
        setSelectedRegion(null);
    }, [setGameState]);

    const onInitiateTrainMove = useCallback((destination: CityName) => { // <-- ADD THIS
        if (!gameState) return;
        const player = gameState.players[gameState.currentPlayerIndex];
        const passengers = gameState.players.filter(p => p.id !== player.id && p.location === player.location);
        
        if (player.role === PlayerRole.Railwayman && passengers.length > 0) {
            setRailwaymanTrainModalState({ isOpen: true, destination, passengers });
        } else {
            handleAction('Train', { destination }, dispatcherTargetId);
        }
    }, [gameState, handleAction, dispatcherTargetId]);

    const handleConnectionClick = useCallback((from: CityName, to: CityName) => {
        if (gameState?.gamePhase === GamePhase.ResolvingNewRails) {
            setNewRailsSelections(prev => {
                const key = [from, to].sort().join('_||_');
                const isAlreadySelected = prev.some(c => [c.from, c.to].sort().join('_||_') === key);
    
                if (isAlreadySelected) {
                    return prev.filter(c => [c.from, c.to].sort().join('_||_') !== key);
                } else if (prev.length < 2) {
                    return [...prev, { from, to }];
                }
                return prev;
            });
            return;
        }
        if (gameState?.gamePhase === GamePhase.ResolvingRingRailroads) {
            handleResolveRingRailroads({ from, to });
            return;
        }
        if (railwaymanModalOpen) {
            if (selectedConnection) { // selectedConnection is the first build
                handleAction('RailwaymanCompleteDoubleBuild', { 
                    firstConnection: selectedConnection, 
                    secondConnection: { from, to } 
                }, dispatcherTargetId);
                setRailwaymanModalOpen(false);
                setHighlightedConnections([]);
                setSelectedConnection(null);
            }
            return;
        }
    
        setGameState(gs => gs ? { ...gs, selectedCity: null } : null);
        setSelectedRegion(null);
        setSelectedConnection(prev => {
            if (prev && ((prev.from === from && prev.to === to) || (prev.from === to && prev.to === from))) {
                return null;
            }
            return { from, to };
        });
    }, [railwaymanModalOpen, selectedConnection, handleAction, setGameState, setHighlightedConnections, setSelectedConnection, dispatcherTargetId]);

    const handleRegionClick = useCallback((regionName: string) => {
        if (gameState?.gamePhase === GamePhase.ResolvingPurificationChoice) {
            // Check if the clicked region is a valid choice
            if (gameState.pendingPurificationChoice?.availableRegions.includes(regionName)) {
                handlePurificationChoice(regionName); // Call the game logic
            }
            // In this phase, clicks outside valid regions do nothing.
            return; 
        }

        if (gameState?.gamePhase === GamePhase.ResolvingPurifyWaterEvent) {
            handleResolvePurifyWaterEvent(regionName);
            return;
        }

        if (gameState?.gamePhase === GamePhase.ResolvingScienceTriumph) {
            handleResolveScienceTriumph(regionName);
            return;
        }
        
        if (gameState?.gamePhase === GamePhase.NursePlacingPreventionToken) {
            const nurse = gameState.players.find(p => p.role === PlayerRole.Nurse);
            if (nurse && nurse.role === PlayerRole.Nurse) {
                const adjacentRegions = IBERIA_CITY_TO_REGIONS_MAP[nurse.location] || [];
                if (adjacentRegions.includes(regionName)) {
                    handleNurseTokenPlacement(regionName);
                }
            }
            return;
        }
    
        // Original logic for normal region selection
        setSelectedRegion(prev => (prev === regionName ? null : regionName));
        setGameState(gs => gs ? { ...gs, selectedCity: null } : null);
        setSelectedConnection(null);
    }, [gameState, handlePurificationChoice, handleNurseTokenPlacement, setGameState]);

    
    // Modal initiators
    const handleInitiateShareKnowledge = useCallback(() => {
        if (!gameState) return;
        const player = gameState.players[gameState.currentPlayerIndex];
        const options: ShareOption[] = [];
        const otherPlayersInCity = gameState.players.filter(p => p.id !== player.id && p.location === player.location);

        otherPlayersInCity.forEach(otherPlayer => {
            const cardsPlayerCanGive = player.hand.filter(c => c.type === 'city' && (c.name === player.location || player.role === PlayerRole.Researcher)) as (PlayerCard & { type: 'city' })[];
            cardsPlayerCanGive.forEach(card => options.push({ type: 'give', fromPlayerId: player.id, toPlayerId: otherPlayer.id, card }));
            const cardsPlayerCanTake = otherPlayer.hand.filter(c => c.type === 'city' && (c.name === player.location || otherPlayer.role === PlayerRole.Researcher)) as (PlayerCard & { type: 'city' })[];
            cardsPlayerCanTake.forEach(card => options.push({ type: 'take', fromPlayerId: otherPlayer.id, toPlayerId: player.id, card }));
        });
        setShareModalState({ isOpen: true, options: Array.from(new Map(options.map(item => [`${item.type}-${item.card.name}-${item.card.color}-${item.fromPlayerId}-${item.toPlayerId}`, item])).values()) });
    }, [gameState]);

    const handleInitiateMercatorShare = useCallback(() => {
        if (!gameState || gameState.gamePhase !== GamePhase.PlayerAction) return;
        const player = gameState.players[gameState.currentPlayerIndex];
        if (player.role !== PlayerRole.Mercator || gameState.hasUsedMercatorShare) return;
    
        const options: ShareOption[] = [];
        const cityData = FALLOFROME_CITIES_DATA[player.location as keyof typeof FALLOFROME_CITIES_DATA];
        if (!cityData || !cityData.boardColors) return;
    
        const cityColors = new Set<DiseaseColor>(cityData.boardColors);
        const otherPlayersInCity = gameState.players.filter(p => p.id !== player.id && p.location === player.location);
    
        otherPlayersInCity.forEach(otherPlayer => {
            // Give options
            const cardsPlayerCanGive = player.hand.filter(c => c.type === 'city' && cityColors.has(c.color)) as (PlayerCard & { type: 'city' })[];
            cardsPlayerCanGive.forEach(card => options.push({ type: 'give', fromPlayerId: player.id, toPlayerId: otherPlayer.id, card }));
    
            // Take options
            const cardsPlayerCanTake = otherPlayer.hand.filter(c => c.type === 'city' && cityColors.has(c.color)) as (PlayerCard & { type: 'city' })[];
            cardsPlayerCanTake.forEach(card => options.push({ type: 'take', fromPlayerId: otherPlayer.id, toPlayerId: player.id, card }));
        });
        
        const uniqueOptions = Array.from(new Map(options.map(item => [`${item.type}-${item.card.name}-${item.card.color}-${item.fromPlayerId}-${item.toPlayerId}`, item])).values());
    
        if (uniqueOptions.length > 0) {
            setMercatorShareModalState({ isOpen: true, options: uniqueOptions });
        } else {
            logEvent("No valid share options for the Mercator.");
        }
    }, [gameState, logEvent]);

    const handleConfirmMercatorShare = (payload: ShareOption) => {
        handleAction('MercatorShare', payload, null);
        setMercatorShareModalState({ isOpen: false, options: [] });
    };

    const handleInitiateTreatDisease = useCallback(() => {
        if (!gameState) return;
        const player = gameState.players[gameState.currentPlayerIndex];
        if (player.role === PlayerRole.FieldDirector) {
            handleInitiateFieldDirectorTreat();
            return;
        }
        const cityCubes = gameState.diseaseCubes[player.location];
        const colors = cityCubes ? 
            (Object.keys(cityCubes) as DiseaseColor[]).filter(color => cityCubes[color]! > 0) :
            [];
        if (colors.length === 1) handleAction('TreatDisease', { city: player.location, color: colors[0] }, null);
        else if (colors.length > 1) setTreatDiseaseModalState({ isOpen: true, availableColors: colors });
    }, [gameState, handleAction, handleInitiateFieldDirectorTreat]);

    const handleInitiateCureDisease = useCallback(() => {
        if (!gameState) return;
        const player = gameState.players[gameState.currentPlayerIndex];
        const cityCardsInHand = player.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];
        const isScientist = player.role === PlayerRole.Scientist;
        const isVirologist = player.role === PlayerRole.Virologist;
        const isOperative = player.role === PlayerRole.FieldOperative;
        const isBreakthrough = gameState.sequencingBreakthroughPlayerId !== null;
        const isVSComplex = gameState.activeVirulentStrainCards.includes(VirulentStrainEpidemicCardName.ComplexMolecularStructure);
        const options: CureOptionForModal[] = [];

        const colorGroups = cityCardsInHand.reduce((acc, card) => {
            const color = card.color;
            if (!acc[color]) acc[color] = [];
            acc[color].push(card);
            return acc;
        }, {} as Record<DiseaseColor, (PlayerCard & { type: 'city' })[]>);

        if (gameState.gameType === 'fallOfRome') {
            for (const color of FALLOFROME_DISEASE_COLORS) {
                if (gameState.curedDiseases[color]) continue;

                const availableCards = colorGroups[color] || [];
                const cityCubes = gameState.diseaseCubes[player.location];
                const hasCubeOfColor = cityCubes && (cityCubes[color] || 0) > 0;
                if (!hasCubeOfColor && player.role !== PlayerRole.Mercator) continue;

                const requiredCount = FALLOFROME_ALLIANCE_CARD_REQUIREMENTS[color];
                if (availableCards.length >= requiredCount) {
                    options.push({ color, method: 'cards', availableCards, requiredCount });
                }
            }
        } else { // Pandemic logic
            const colors: DiseaseColor[] = [DiseaseColor.Blue, DiseaseColor.Yellow, DiseaseColor.Black, DiseaseColor.Red];
            if (gameState.setupConfig.useMutationChallenge) colors.push(DiseaseColor.Purple);

            colors.forEach(color => {
                if (gameState.curedDiseases[color]) return;

                if (gameState.gameType === 'iberia') {
                    const requiredHospitalLocation = gameState.hospitals?.[color as keyof typeof gameState.hospitals];
                    if (player.location !== requiredHospitalLocation) {
                        return; // Skip this color option, player is not at the right hospital
                    }
                }
    
                if (color === DiseaseColor.Purple) {
                    let requiredCount = (isScientist ? 4 : 5) - (isBreakthrough ? 1 : 0);
                     if (cityCardsInHand.length >= requiredCount) {
                         options.push({ color, method: 'cards', availableCards: cityCardsInHand, requiredCount });
                    }
                } else {
                    const availableCards = colorGroups[color] || [];
                    let requiredCount = (isScientist ? 4 : 5) - (isBreakthrough ? 1 : 0);
                    if (isVSComplex && color === gameState.virulentStrainColor) requiredCount++;

                    if (availableCards.length >= requiredCount) {
                        options.push({ color, method: 'cards', availableCards, requiredCount });
                    }
                    if (isOperative) {
                        const requiredForSample = Math.max(1, requiredCount - 2);
                        if (availableCards.length >= requiredForSample && (player.samples[color] || 0) >= 3) {
                            options.push({ color, method: 'samples', availableCards, requiredCount: requiredForSample });
                        }
                    }
                    if (isVirologist) {
                        options.push({ color, method: 'cards', availableCards: cityCardsInHand, requiredCount, isVirologistCure: true });
                    }
                }
            });
        }
        
        setCureDiseaseModalState({ isOpen: true, options });
    }, [gameState]);

    const handleInitiateEnlistBarbarians = useCallback(() => {
        if (!gameState || gameState.gameType !== 'fallOfRome') return;
        const player = gameState.players[gameState.currentPlayerIndex];
        const cityCubes = gameState.diseaseCubes[player.location];
        if (!cityCubes) return;

        const possibleOptions: { color: FallOfRomeDiseaseColor, cards: (PlayerCard & { type: 'city' })[] }[] = [];
        
        for (const color of FALLOFROME_DISEASE_COLORS) {
            const isAllied = gameState.curedDiseases[color];
            const cubeCount = cityCubes[color] || 0;
            if (cubeCount > 0 && isAllied) {
                const matchingCards = player.hand.filter(c => c.type === 'city' && c.color === color) as (PlayerCard & { type: 'city' })[];
                if (matchingCards.length > 0) {
                    possibleOptions.push({ color, cards: matchingCards });
                }
            }
        }

        if (possibleOptions.length === 1 && possibleOptions[0].cards.length === 1) {
            handleAction('EnlistBarbarians', { cardToDiscard: possibleOptions[0].cards[0] }, null);
        } else if (possibleOptions.length > 0) {
            setEnlistBarbariansModalState({ isOpen: true, options: possibleOptions });
        }
    }, [gameState, handleAction]);

    const handleInitiateFreeEnlistBarbarians = useCallback(() => {
        if (!gameState || gameState.gamePhase !== GamePhase.PlayerAction) return;
        const player = gameState.players[gameState.currentPlayerIndex];
        if (player.role !== PlayerRole.ReginaFoederata || gameState.hasUsedReginaFoederataFreeEnlist) return;

        const cityCubes = gameState.diseaseCubes[player.location];
        if (!cityCubes) return;

        const possibleOptions: { color: FallOfRomeDiseaseColor }[] = [];
        for (const color of FALLOFROME_DISEASE_COLORS) {
            const isAllied = gameState.curedDiseases[color];
            const cubeCount = cityCubes[color] || 0;
            if (cubeCount > 0 && isAllied) {
                possibleOptions.push({ color });
            }
        }

        if (possibleOptions.length === 1) {
            handleAction('EnlistBarbariansFree', { color: possibleOptions[0].color }, null);
        } else if (possibleOptions.length > 1) {
            setFreeEnlistBarbariansModalState({ isOpen: true, options: possibleOptions });
        }
    }, [gameState, handleAction]);

    const handleConfirmFreeEnlistBarbarians = (color: DiseaseColor) => {
        handleAction('EnlistBarbariansFree', { color }, null);
        setFreeEnlistBarbariansModalState({ isOpen: false, options: [] });
    };

    const handleInitiatePraefectusRecruit = useCallback(() => {
        if (!gameState || gameState.gamePhase !== GamePhase.PlayerAction) return;
        const player = gameState.players[gameState.currentPlayerIndex];
        if (player.role !== PlayerRole.PraefectusClassis) return;

        const cityData = FALLOFROME_CITIES_DATA[player.location as keyof typeof FALLOFROME_CITIES_DATA];
        if (!cityData?.boardColors) return;

        const cityColors = new Set<DiseaseColor>(cityData.boardColors);
        const validCards = player.hand.filter(c => c.type === 'city' && cityColors.has(c.color)) as (PlayerCard & { type: 'city' })[];

        if (validCards.length === 0) return;

        const availableLegions = 16 - (gameState.legions?.length || 0);

        setPraefectusRecruitModalState({
            isOpen: true,
            validCards,
            availableLegions,
        });
    }, [gameState]);

    const handleConfirmPraefectusRecruit = (cardToDiscard: PlayerCard & { type: 'city' }, legionsToAdd: number) => {
        handleAction('PraefectusRecruit', { cardToDiscard, legionsToAdd }, null);
        setPraefectusRecruitModalState({ isOpen: false, validCards: [], availableLegions: 0 });
    };

    const handleInitiateBuildFortWithLegions = () => {
        handleAction('BuildFortWithLegions', null, null);
    };

    const handleInitiateFabrumFlight = (destination: CityName | null) => {
        if (!gameState || !destination) return;
        setFabrumFlightModalState({ isOpen: true, destination });
    };

    const handleConfirmFabrumFlight = (payload: { destination: CityName; cardToDiscard: PlayerCard & { type: 'city' }; legionsToMove: number }) => {
        handleAction('FabrumFlight', payload, null);
        setFabrumFlightModalState({ isOpen: false, destination: null });
    };

    const handleInitiateBattle = useCallback(() => {
        if (!gameState || gameState.gameType !== 'fallOfRome') return;
        const player = gameState.players[gameState.currentPlayerIndex];
        const legionsInCity = (gameState.legions || []).filter(l => l === player.location).length;
        if (legionsInCity === 0) return;

        setBattleModalState({
            ...initialBattleModalState,
            isOpen: true,
            maxDice: Math.min(3, legionsInCity),
        });
    }, [gameState, setBattleModalState, initialBattleModalState]);

    const handleConfirmBattle = (selectedCubes: { [key in DiseaseColor]?: number }) => {
        const payload = {
            legionsLost: battleModalState.legionsLost,
            barbariansToRemove: selectedCubes,
            legionsToAdd: battleModalState.legionsToAdd,
        };
        handleAction('Battle', payload, null);
        setBattleModalState(initialBattleModalState);
    };

    const handleConfirmFreeBattleWrapper = (payload: { legionsLost: number; barbariansToRemove: { [key in DiseaseColor]?: number }; legionsToAdd?: number }) => {
        handleResolveFreeBattle(payload);
        setBattleModalState(initialBattleModalState);
    };

    const handleConfirmCureDisease = (payload: CureActionPayload) => {
        handleAction('CureDisease', payload, dispatcherTargetId);
        setCureDiseaseModalState({ isOpen: false, options: [] });
    };

    const handleSkipPostCureAction = () => {
        setGameState(gs => {
            if(!gs) return null;
            const newGs = safeCloneGameState(gs);
            newGs.gamePhase = newGs.actionsRemaining > 0 ? GamePhase.PlayerAction : GamePhase.PreDrawPlayerCards;
            newGs.postCureColor = null;
            return newGs;
        });
    };
    
    const handleConfirmMarch = (numLegions: number) => {
        if (marchModalState.destination) {
            handleAction('Drive', { destination: marchModalState.destination, legionsToMove: numLegions }, dispatcherTargetId);
            setMarchModalState({ isOpen: false, destination: null, availableLegions: 0 });
        }
    };
    
    const handleConfirmSail = (payload: { legionsToMove: number; cardToDiscard: (PlayerCard & { type: 'city' }) | null }) => {
        if (sailModalState.destination) {
            handleAction('Sail', {
                destination: sailModalState.destination,
                ...payload
            }, dispatcherTargetId);
            setSailModalState({ isOpen: false, destination: null, availableLegions: 0, validCards: [] });
        }
    };

    const handleConfirmReginaFoederataMove = (payload: {
        legionsToMove: number;
        barbariansToMove: { [key in DiseaseColor]?: number };
        cardToDiscard?: (PlayerCard & { type: 'city' });
    }) => {
        const { destination, actionType } = reginaFoederataMoveModalState;
        if (destination) {
            const actionName = actionType === 'March' ? 'Drive' : 'Sail';
            handleAction(actionName, {
                destination,
                ...payload
            }, dispatcherTargetId);
        }
        setReginaFoederataMoveModalState(prev => ({ ...prev, isOpen: false }));
    };

    // --- RENDER LOGIC ---

    if (isLoading) {
        return <div className="fixed inset-0 bg-gray-900 flex items-center justify-center text-white text-2xl font-orbitron"><div className="animate-pulse">Loading Game...</div></div>;
    }

    if (error) {
        return <div className="fixed inset-0 bg-red-900 flex items-center justify-center text-white text-xl p-8 text-center"><div><h2 className="text-3xl font-bold mb-4">An Error Occurred</h2><p>{error}</p></div></div>;
    }

    if (!gameState) {
        return <SetupScreen onStartGame={handleStartGameClick} />;
    }

    if (gameState.gameStatus === 'lobby') {
        return <LobbyScreen gameState={gameState} localPlayerId={localPlayerId} onUpdateName={handleUpdateNameInLobby} onStartGame={handleStartGameFromLobby} />;
    }

    // Main Game View
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return (
        <div className="fixed inset-0 bg-gray-900 text-white font-sans flex">
            <div className="flex-grow h-full">
                <Board
                    gameState={gameState}
                    onCityClick={handleCityClick}
                    selectedCity={gameState.selectedCity}
                    showCityNames={showCityNames || gameState.gamePhase === GamePhase.ChoosingStartingCity}
                    selectedConnection={selectedConnection}
                    onConnectionClick={handleConnectionClick}
                    selectedRegion={selectedRegion}
                    onRegionClick={handleRegionClick}
                    highlightedRegions={highlightedRegions}
                    highlightedConnections={highlightedConnections}
                    cityNameFontSize={cityNameFontSize}
                    />
            </div>
            <div className="w-[380px] h-full p-2 flex-shrink-0">
                <Dashboard
                    gameState={gameState}
                    onAction={(action, payload) => {
                        if (action === 'Train' && gameState.selectedCity) {
                            onInitiateTrainMove(gameState.selectedCity);
                        } else {
                            handleDashboardAction(action, payload);
                        }
                    }}
                    onUndoAction={handleUndoAction}
                    onEndTurn={handleEndTurn}
                    onInitiateShareKnowledge={handleInitiateShareKnowledge}
                    onInitiateDispatchSummon={() => setDispatchSummonModalState({ isOpen: true })}
                    onInitiateTakeEventCard={() => setTakeEventModalState({ isOpen: true, cards: gameState.playerDiscard.filter(c => c.type === 'event').map(c => (c as any).name) })}
                    onInitiateExpertFlight={() => setExpertFlightModalOpen(true)}
                    onInitiateEpidemiologistTake={handleInitiateEpidemiologistTake}
                    onInitiateReturnSamples={(playerId: number) => setReturnSamplesModalState({ isOpen: true, player: gameState.players.find(p=>p.id === playerId) || null })}
                    onInitiateCureDisease={handleInitiateCureDisease}
                    onInitiateTreatDisease={handleInitiateTreatDisease}
                    onInitiateCollectSample={() => {
                        const colors = Object.entries(gameState.diseaseCubes[currentPlayer.location] || {}).filter(([,count])=>count! > 0).map(([color]) => color as DiseaseColor);
                        if (colors.length === 1) handleAction('CollectSample', {color: colors[0]}, null);
                        else if (colors.length > 1) setCollectSampleModalState({ isOpen: true, availableColors: colors });
                    }}
                    onInitiateFieldDirectorMove={handleInitiateFieldDirectorMove}
                    onInitiateLocalLiaisonShare={() => {
                        const isFallOfRome = gameState.gameType === 'fallOfRome';
                        const liaisonCity = CITIES_DATA[currentPlayer.location];
                        const liaisonColors = isFallOfRome ? ((liaisonCity as any).boardColors || [liaisonCity.color]) : [liaisonCity.color];
                        
                        const options: { card: PlayerCard & { type: 'city' }, toPlayer: Player }[] = [];
                        
                        const cityCardsInHand = currentPlayer.hand.filter(c => c.type === 'city') as (PlayerCard & {type: 'city'})[];
                
                        liaisonColors.forEach(color => {
                            const sharableCardsOfColor = cityCardsInHand.filter(card => card.color === color);
                            
                            if (sharableCardsOfColor.length > 0) {
                                const validRecipients = gameState.players.filter(p => {
                                    if (p.id === currentPlayer.id) return false;
                                    const recipientCity = CITIES_DATA[p.location];
                                    const recipientColors = isFallOfRome ? ((recipientCity as any).boardColors || [recipientCity.color]) : [recipientCity.color];
                                    return recipientColors.includes(color);
                                });
                                
                                sharableCardsOfColor.forEach(card => {
                                    validRecipients.forEach(toPlayer => {
                                        options.push({ card, toPlayer });
                                    });
                                });
                            }
                        });
                        
                        setLocalLiaisonShareModalState({ isOpen: true, options: Array.from(new Map(options.map(item => [`${item.card.name}-${item.card.color}-${item.toPlayer.id}`, item])).values()) });
                    }}
                    onInitiateVirologistTreat={() => setVirologistTreatModalOpen(true)}
                    onInitiateEnlistBarbarians={handleInitiateEnlistBarbarians}
                    onInitiateFreeEnlistBarbarians={handleInitiateFreeEnlistBarbarians}
                    onInitiateBattle={handleInitiateBattle}
                    onInitiateMercatorShare={handleInitiateMercatorShare}
                    onInitiatePraefectusRecruit={handleInitiatePraefectusRecruit}
                    onInitiateBuildFortWithLegions={handleInitiateBuildFortWithLegions}
                    onInitiateFabrumFlight={handleInitiateFabrumFlight}
                    onInitiateVestalisDrawEvent={handleInitiateVestalisDrawEvent}
                    onPlayEventCard={handlePlayEventCard}
                    onPlayContingencyCard={handlePlayContingencyCard}
                    onViewPlayerDiscard={() => setViewingDiscard('player')}
                    onViewInfectionDiscard={() => setViewingDiscard('infection')}
                    onViewEventInfo={setViewEventInfo}
                    dispatcherTargetId={dispatcherTargetId}
                    onSetDispatcherTarget={setDispatcherTargetId}
                    selectedCity={gameState.selectedCity}
                    viewedPlayerId={viewedPlayerId}
                    onSetViewedPlayerId={setViewedPlayerId}
                    onInitiatePlayResilientPopulation={(ownerId, from) => setResilientPopulationModalState({ isOpen: true, ownerId, from })}
                    showCityNames={showCityNames}
                    onToggleShowCityNames={setShowCityNames}
                    isSoundEnabled={isSoundEnabled}
                    onToggleSoundEffects={handleToggleSoundEffects}
                    onViewAllHands={() => setAllPlayerHandsModalOpen(true)}
                    selectedConnection={selectedConnection}
                    selectedRegion={selectedRegion}
                    onInitiateRailwaymanDoubleBuild={handleInitiateRailwaymanDoubleBuild}
                    onInitiatePurifyWater={() => setPurifyWaterModalOpen(true)}
                    onInitiatePoliticianGiveCard={() => setPoliticianGiveModalOpen(true)}
                    onInitiatePoliticianSwapCard={() => setPoliticianSwapModalOpen(true)}
                    onInitiateRoyalAcademyScientistForecast={() => handleAction('RoyalAcademyScientistForecast', null, dispatcherTargetId)}
                    cityNameFontSize={cityNameFontSize} 
                    onSetCityNameFontSize={setCityNameFontSize}
                />
            </div>
            
            <GameModals
                gameState={gameState}
                shareModalState={shareModalState} setShareModalState={setShareModalState}
                dispatchSummonModalState={dispatchSummonModalState} setDispatchSummonModalState={setDispatchSummonModalState}
                takeEventModalState={takeEventModalState} setTakeEventModalState={setTakeEventModalState}
                treatDiseaseModalState={treatDiseaseModalState} setTreatDiseaseModalState={setTreatDiseaseModalState}
                cureDiseaseModalState={cureDiseaseModalState} setCureDiseaseModalState={setCureDiseaseModalState}
                onConfirmCureDisease={handleConfirmCureDisease}
                expertFlightModalOpen={expertFlightModalOpen} setExpertFlightModalOpen={setExpertFlightModalOpen}
                returnSamplesModalState={returnSamplesModalState} setReturnSamplesModalState={setReturnSamplesModalState}
                resilientPopulationModalState={resilientPopulationModalState} setResilientPopulationModalState={setResilientPopulationModalState}
                collectSampleModalState={collectSampleModalState} setCollectSampleModalState={setCollectSampleModalState}
                localLiaisonShareModalState={localLiaisonShareModalState} setLocalLiaisonShareModalState={setLocalLiaisonShareModalState}
                virologistTreatModalOpen={virologistTreatModalOpen} setVirologistTreatModalOpen={setVirologistTreatModalOpen}
                enlistBarbariansModalState={enlistBarbariansModalState} setEnlistBarbariansModalState={setEnlistBarbariansModalState}
                freeEnlistBarbariansModalState={freeEnlistBarbariansModalState} setFreeEnlistBarbariansModalState={setFreeEnlistBarbariansModalState}
                onConfirmFreeEnlistBarbarians={handleConfirmFreeEnlistBarbarians}
                mercatorShareModalState={mercatorShareModalState}
                setMercatorShareModalState={setMercatorShareModalState}
                handleConfirmMercatorShare={handleConfirmMercatorShare}
                praefectusRecruitModalState={praefectusRecruitModalState}
                setPraefectusRecruitModalState={setPraefectusRecruitModalState}
                handleConfirmPraefectusRecruit={handleConfirmPraefectusRecruit}
                fabrumFlightModalState={fabrumFlightModalState}
                setFabrumFlightModalState={setFabrumFlightModalState}
                handleConfirmFabrumFlight={handleConfirmFabrumFlight}
                marchModalState={marchModalState} setMarchModalState={setMarchModalState} handleConfirmMarch={handleConfirmMarch}
                sailModalState={sailModalState} setSailModalState={setSailModalState} handleConfirmSail={handleConfirmSail}
                reginaFoederataMoveModalState={reginaFoederataMoveModalState}
                setReginaFoederataMoveModalState={setReginaFoederataMoveModalState}
                handleConfirmReginaFoederataMove={handleConfirmReginaFoederataMove}
                battleModalState={battleModalState}
                setBattleModalState={setBattleModalState}
                onRollBattleDice={handleRollBattleDice}
                onConfirmBattle={handleConfirmBattle}
                onConfirmFreeBattle={handleConfirmFreeBattleWrapper}
                onSetAleaIactaEstResults={handleAleaIactaEstBattle}
                getHandLimit={getHandLimit} handleConfirmDiscard={handleConfirmDiscard}
                drawnPlayerCards={drawnPlayerCards} handleConfirmPlayerDraw={handleConfirmPlayerDraw}
                viewingDiscard={viewingDiscard} setViewingDiscard={setViewingDiscard}
                viewEventInfo={viewEventInfo} setViewEventInfo={setViewEventInfo}
                handleUndoAction={handleUndoAction} _drawPlayerCards={_drawPlayerCards}
                infectionStepState={infectionStepState} handleProcessInfectionStep={handleAcknowledgeInfectionStep}
                intensifyModalOpen={intensifyModalOpen} executeIntensify={executeIntensify}
                handleContinueToInfectionPhase={handleContinueToInfectionPhase}
                handleAction={handleAction}
                handlePlayEventCard={handlePlayEventCard}
                onPlayContingencyCard={handlePlayEventCard}
                handlePlayResilientPopulation={handlePlayResilientPopulation}
                onInitiatePlayResilientPopulation={(ownerId, from) => setResilientPopulationModalState({ isOpen: true, ownerId, from })}
                handleRemoteTreatment={handleRemoteTreatment}
                handleMobileHospitalRemove={handleMobileHospitalRemove}
                handleEpidemiologistTakeCard={handleEpidemiologistTakeCard}
                handleReturnSamples={handleReturnSamples}
                handleSkipPostCureAction={handleSkipPostCureAction}
                handleGovernmentGrant={handleGovernmentGrant}
                handleAirlift={handleAirlift}
                handleForecast={handleForecast}
                handleNewAssignment={handleNewAssignment}
                handleSpecialOrders={handleSpecialOrders}
                handleRapidVaccineDeployment={handleRapidVaccineDeployment}
                handleConfirmTroubleshooterPreview={handleConfirmTroubleshooterPreview}
                handleSkipTroubleshooterPreview={handleSkipTroubleshooterPreview}
                handleConfirmEpidemicInfect={handleConfirmEpidemicInfect}
                handleReExaminedResearch={handleReExaminedResearch}
                handleConfirmPilotFlight={handleConfirmPilotFlight}
                handleCancelPilotFlight={handleCancelPilotFlight}
                onInitiateFieldDirectorMove={handleInitiateFieldDirectorMove}
                handleFieldDirectorMove={handleFieldDirectorMove}
                handleCancelFieldDirectorAction={handleCancelFieldDirectorAction}
                onInitiateEpidemiologistTake={handleInitiateEpidemiologistTake}
                handleCancelEpidemiologistTake={handleCancelEpidemiologistTake}
                onResolveMutationEvent={handleResolveMutationEvent}
                onAcknowledgeMutationResult={handleAcknowledgeMutationResult}
                handleStationRelocation={handleStationRelocation}
                handleConfirmForecastPlay={handleConfirmForecastPlay}
                handleCancelForecastPlay={handleCancelForecastPlay}
                handleFortRelocation={handleFortRelocation}
                handleCancelFortRelocation={handleCancelFortRelocation}
                handleChooseStartingCity={handleChooseStartingCity}
                pendingEventCardForModal={gameState.pendingEventCardForModal} 
                onInitiateVestalisDrawEvent={handleInitiateVestalisDrawEvent}
                handleConfirmVestalisDrawEvent={handleConfirmVestalisDrawEvent}
                handleConfirmVestalisDrawAction={handleConfirmVestalisDrawAction}
                handleCancelVestalisDrawAction={handleCancelVestalisDrawAction}
                handleConfirmVestalisPlayerCardDraw={handleConfirmVestalisPlayerCardDraw}
                handleResolveDoUtDes={handleResolveDoUtDes}
                handleResolveVaeVictis={handleResolveVaeVictis}
                handleResolveSiVisPacemParaBellum={handleResolveSiVisPacemParaBellum}
                handleResolveHicManebimusOptime={handleResolveHicManebimusOptime}
                handleResolveAudentesFortunaIuvat={handleResolveAudentesFortunaIuvat}
                handleResolveMorsTuaVitaMea={handleResolveMorsTuaVitaMea}
                handleResolveHomoFaberFortunaeSuae={handleResolveHomoFaberFortunaeSuae}
                handleResolveAleaIactaEst={handleResolveAleaIactaEst}
                handleResolveAbundansCautelaNonNocet={handleResolveAbundansCautelaNonNocet}
                handleResolveMeliusCavereQuamPavere={handleResolveMeliusCavereQuamPavere}
                handleResolveMortuiNonMordent={handleResolveMortuiNonMordent}
                handleResolveFestinaLente={handleResolveFestinaLente}
                handleResolveVeniVidiVici={handleResolveVeniVidiVici}
                handleResolveCarpeDiem={handleResolveCarpeDiem}
                allPlayerHandsModalOpen={allPlayerHandsModalOpen}
                setAllPlayerHandsModalOpen={setAllPlayerHandsModalOpen}
                purifyWaterModalOpen={purifyWaterModalOpen}
                setPurifyWaterModalOpen={setPurifyWaterModalOpen}
                selectedRegion={selectedRegion}
                purificationChoiceModalOpen={purificationChoiceModalOpen}
                setPurificationChoiceModalOpen={setPurificationChoiceModalOpen}
                handlePurificationChoice={handlePurificationChoice}
                handleAgronomistPurifyChoice={handleAgronomistPurifyChoice}
                politicianGiveModalOpen={politicianGiveModalOpen}
                setPoliticianGiveModalOpen={setPoliticianGiveModalOpen}
                politicianSwapModalOpen={politicianSwapModalOpen} 
                setPoliticianSwapModalOpen={setPoliticianSwapModalOpen}
                railwaymanTrainModalState={railwaymanTrainModalState}
                setRailwaymanTrainModalState={setRailwaymanTrainModalState}
                railwaymanModalOpen={railwaymanModalOpen}
                onCancelRailwaymanBuild={handleCancelRailwaymanBuild}
                onConfirmRuralDoctorTreat={(choice) => handleAction('ConfirmRuralDoctorTreat', choice, dispatcherTargetId)}
                onConfirmRoyalAcademyScientistForecast={handleConfirmRoyalAcademyScientistForecast}
                onConfirmAcknowledgeForecast={() => handleAction('AcknowledgeRoyalAcademyScientistForecast', null, dispatcherTargetId)}
                onCancelAcknowledgeForecast={handleSimpleCancel}
                handleConfirmGovernmentMoves={handleConfirmGovernmentMoves}
                handleHospitalFounding={handleHospitalFounding}
                handleResolveMailCorrespondence={handleResolveMailCorrespondence}
                handleResolveNewRails={handleResolveNewRails}
                handleResolveScienceTriumph={handleResolveScienceTriumph}
                handleResolveScienceTriumphChoice={handleResolveScienceTriumphChoice}
                handleResolveShipsArrive={handleResolveShipsArrive}
                handleResolveTelegraphMessage={handleResolveTelegraphMessage}
                newRailsSelections={newRailsSelections}
                handleResolveWhenThePlansWereGood={handleResolveWhenThePlansWereGood}
                onCancelEventResolution={() => {
                    handleCancelEventResolution();
                    setNewRailsSelections([]);
                }}
                sailorPassengerModalState={sailorPassengerModalState}
                setSailorPassengerModalState={setSailorPassengerModalState}
                dispatcherTargetId={dispatcherTargetId}
                
            />

            {modalContent && <Modal title={modalContent.title} show={true} onClose={modalContent.permanent ? undefined : () => setModalContent(null)} titleColor={modalContent.color || 'text-white'}>{modalContent.body}</Modal>}
            {gameState.gamePhase === GamePhase.GameOver && (
                <Modal title={gameOverReport ? (hasWon(gameState) ? "VICTORY" : "DEFEAT") : "Game Over"} show={true} titleColor={gameOverReport ? (hasWon(gameState) ? 'text-green-400' : 'text-red-400') : 'text-white'}>
                    <p className="mb-4">{gameOverReport || gameState.gameOverReason}</p>
                    <button onClick={() => { window.location.href = '/'; }} className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold">Play Again</button>
                </Modal>
            )}
        </div>
    );
};

function hasWon(gameState: GameState): boolean {
    if (gameState.gameType === 'fallOfRome') {
        return FALLOFROME_DISEASE_COLORS.every(tribe => {
            if (isFallOfRomeDiseaseColor(tribe)) {
                const isAllied = gameState.curedDiseases[tribe];
                const isEliminated = gameState.remainingCubes[tribe] === FALLOFROME_INITIAL_CUBE_COUNTS[tribe];
                return isAllied || isEliminated;
            }
            return false;
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
