
import React from 'react';
import { useState, useRef, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { GameState, Player, CityName, PlayerCard, InfectionCard, DiseaseColor, PlayerRole, CITIES_DATA, CONNECTIONS, PANDEMIC_INFECTION_RATES, FALLOFROME_INVASION_RATES, EventCardName, ALL_EVENT_CARDS, PLAYER_ROLE_INFO, EVENT_CARD_INFO, GamePhase, ShareOption, RemoteTreatmentSelection, CureOptionForModal, CureActionPayload, VirulentStrainEpidemicCardName, VIRULENT_STRAIN_EPIDEMIC_INFO, MutationEventCardName, MUTATION_EVENT_CARD_INFO, ON_THE_BRINK_EVENTS, IN_THE_LAB_EVENTS, PANDEMIC_CITIES_DATA, FALLOFROME_CITIES_DATA, FALLOFROME_MIGRATION_PATHS, FALLOFROME_BARBARIAN_SUPPLY_DATA, InfectionResult, BattleModalState, BattleDieResult, IBERIA_CITIES_DATA, IBERIA_PORT_CITIES, IBERIA_REGIONS, IBERIA_CITY_TO_REGIONS_MAP } from '../types';
import { PlayerCardDisplay, InfectionCardDisplay, PlayableEvents, FieldOperativeActions, DISEASE_TEXT_COLOR_MAP, CITY_COLOR_CLASSES, getCardDisplayName, InfectionResultList } from '../hooks/ui';
import { generateEpidemicReport } from '../services/geminiService';
import { safeCloneGameState, isReachableByTrain } from '../utils';
import { playSound } from '../services/soundService';
import { getTerminology } from '../services/terminology';

const EventCardImage: React.FC<{ cardName: EventCardName }> = ({ cardName }) => {
    const extensionsToTry = useMemo(() => ['jpg', 'png', 'jpeg', 'webp'], []);
    const [imageIndex, setImageIndex] = useState(0);

    // Reset the image loading attempt when the card name changes.
    useEffect(() => {
        setImageIndex(0);
    }, [cardName]);

    // Create a filename-friendly version of the card name
    // e.g., "Government Grant" -> "governmentgrant"
    const imageName = cardName.replace(/[^a-z0-9]/gi, '').toLowerCase();
    
    // Create an array of possible image paths
    const possiblePaths = useMemo(() =>
        extensionsToTry.map(ext => `/assets/events/${imageName}.${ext}`),
        [imageName, extensionsToTry]
    );

    const handleError = () => {
        // If the current image fails to load, try the next one in the list.
        if (imageIndex < possiblePaths.length - 1) {
            setImageIndex(imageIndex + 1);
        }
    };

    // If we've tried all possible paths and none have loaded, show the fallback.
    if (imageIndex >= possiblePaths.length) {
        return (
            <div className="w-full h-40 rounded-lg border-2 border-dashed border-gray-600 bg-gray-900 flex items-center justify-center text-gray-500 text-sm text-center p-2 flex-shrink-0">
                No Image Available
            </div>
        );
    }

    const currentSrc = possiblePaths[imageIndex];

    return (
        <img
            src={currentSrc}
            alt={cardName}
            onError={handleError}
            className="w-full h-40 rounded-lg object-cover mb-4"
        />
    );
};


const InfectionResultDisplay: React.FC<{
    result: InfectionResult | null;
    gameType: 'pandemic' | 'fallOfRome' | 'iberia';
    T: any;
}> = ({ result, gameType, T }) => {
    if (!result) return null;

    const cityData = CITIES_DATA[result.city];

    // Iberia Purification Result
    if (result.purificationDefense) {
        return (
            <div className="text-center p-3 bg-sky-900 border-2 border-sky-700 rounded-lg">
                <h4 className="font-bold text-lg text-sky-300">Infection Prevented!</h4>
                <p>
                    A purification token from <span className="font-bold">Region {result.purificationDefense.region}</span> protected <span className="font-bold">{cityData.name}</span>.
                </p>
                <p className="font-orbitron text-2xl mt-2">
                    <span className="text-white">0</span> Cubes Added
                </p>
            </div>
        );
    }

    // Iberia Nurse Defense Result
    if (result.nurseDefense) {
        return (
            <div className="text-center p-3 bg-red-900 border-2 border-red-700 rounded-lg">
                <h4 className="font-bold text-lg text-red-300">Infection Prevented!</h4>
                <p>
                    The Nurse's token in <span className="font-bold">Region {result.nurseDefense.region}</span> protected <span className="font-bold">{cityData.name}</span>.
                </p>
                <p className="font-orbitron text-2xl mt-2">
                    <span className="text-white">0</span> Cubes Added
                </p>
            </div>
        );
    }

    // Fall of Rome Invasion Result
    if (gameType === 'fallOfRome') {
        if (result.defended) {
            return (
                <div className="text-center p-3 bg-green-900 border-2 border-green-700 rounded-lg">
                    <h4 className="font-bold text-lg text-green-300">City Defended!</h4>
                    <p>
                        {result.defenseType === 'attack'
                            ? `Supported legions in ${cityData.name} fought off the invasion!`
                            : `Unsupported legions in ${cityData.name} were ambushed!`}
                    </p>
                    <div className="flex justify-center items-center space-x-6 mt-2">
                        <p className="font-orbitron text-2xl">
                            <span className="text-red-500">-{result.legionsRemoved}</span> Legion(s)
                        </p>
                        <p className="font-orbitron text-xl">
                            <span className="text-green-400">0</span> Cubes Added
                        </p>
                    </div>
                </div>
            );
        }
    }
    
    // Default Infection Result for all game types
    const cubesAddedText = result.cubesAdded > 0 ? `+${result.cubesAdded}` : '0';
    const titleText = result.cubesAdded > 0 ? `${T.infection} Successful` : `${T.infection} Prevented`;
    const titleColor = result.cubesAdded > 0 ? 'text-red-300' : 'text-blue-300';
    const bgColor = result.cubesAdded > 0 ? 'bg-red-900 border-red-700' : 'bg-blue-900 border-blue-700';
    const description = result.cubesAdded > 0 
        ? `The ${T.infection.toLowerCase()} of ${cityData.name} by the ${result.color} ${T.disease.toLowerCase()} succeeded.`
        : `The ${T.infection.toLowerCase()} of ${cityData.name} had no effect (e.g., city was quarantined or disease was eradicated).`;

    return (
        <div className={`text-center p-3 rounded-lg border-2 ${bgColor}`}>
            <h4 className={`font-bold text-lg ${titleColor}`}>{titleText}</h4>
            <p>{description}</p>
            <p className="font-orbitron text-2xl mt-2">
                <span className="text-white">{cubesAddedText}</span> Cube(s) Added
            </p>
        </div>
    );
};

const NurseTokenPlacementModal: React.FC<{
    show: boolean;
    gameState: GameState;
}> = ({ show, gameState }) => {
    if (!show) return null;
    const nurse = gameState.players.find(p => p.role === PlayerRole.Nurse);
    if (!nurse) return null;

    return (
        <Modal title="Nurse: Place Token" show={show} isSidePanel={true}>
            <div className="space-y-4">
                <p>
                    Your prevention token must be placed.
                </p>
                <p className="text-lg font-semibold text-yellow-300 animate-pulse">
                    Please click on one of the highlighted regions on the map to place your token.
                </p>
                <p className="text-sm text-gray-400">
                    (Regions adjacent to your city, {CITIES_DATA[nurse.location].name})
                </p>
            </div>
        </Modal>
    );
};

const CarpeDiemModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: { option: 'normal' | 'corrupt' }) => void;
}> = ({ show, onClose, onConfirm }) => {
    return (
        <Modal title="Carpe Diem" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.CarpeDiem} />
            <div className="space-y-4">
                <p>Seize the day! Choose how to use this event.</p>
                <button
                    onClick={() => onConfirm({ option: 'normal' })}
                    className="w-full p-3 bg-teal-700 hover:bg-teal-600 rounded-lg text-left"
                >
                    <h3 className="font-bold">Normal</h3>
                    <p className="text-sm text-gray-300">The current player may do 2 more actions this turn.</p>
                </button>
                <button
                    onClick={() => onConfirm({ option: 'corrupt' })}
                    className="w-full p-3 bg-purple-800 hover:bg-purple-700 rounded-lg text-left"
                >
                    <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                    <p className="text-sm text-gray-300">The current player may do 4 more actions this turn.</p>
                </button>
            </div>
        </Modal>
    );
};

const VeniVidiViciModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        option: 'normal' | 'corrupt';
        destination: CityName;
        legionsToMove: number;
        initiateBattle: boolean;
    }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_city' | 'select_legions_and_battle'>('select_city');
    const [destination, setDestination] = useState<CityName | null>(null);
    const [legionsToMove, setLegionsToMove] = useState(0);

    const player = gameState.players[gameState.currentPlayerIndex];
    const cityKeys = useMemo(() => Object.keys(FALLOFROME_CITIES_DATA) as CityName[], []);
    const availableLegions = (gameState.legions || []).filter(l => l === player.location).length;
    const maxLegionsToMove = Math.min(3, availableLegions);

    useEffect(() => {
        if (show) {
            setStep('select_city');
            setDestination(null);
            setLegionsToMove(0);
        }
    }, [show]);

    const handleConfirm = (option: 'normal' | 'corrupt', initiateBattle: boolean) => {
        if (destination) {
            onConfirm({ option, destination, legionsToMove, initiateBattle });
        }
    };

    const renderCitySelection = () => (
        <div>
            <p className="mb-4">I came, I saw, I conquered. Select a destination city for {player.name}.</p>
            <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
                {cityKeys.sort((a, b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name)).map(city => {
                    const cityData = CITIES_DATA[city];
                    const cityCubes = gameState.diseaseCubes[city];
                    const legionCount = (gameState.legions || []).filter(l => l === city).length;
                
                    return (
                        <button
                            key={city}
                            onClick={() => { setDestination(city); setStep('select_legions_and_battle'); }}
                            className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded text-left flex items-center justify-between transition-colors"
                        >
                            <div className="flex flex-col">
                                <span className={`font-bold ${DISEASE_TEXT_COLOR_MAP[cityData.color]}`}>{cityData.name}</span>
                                <div className="flex space-x-1 mt-1">
                                    {(cityData.boardColors || [cityData.color]).map(color => (
                                        <div key={color} className={`w-3 h-3 rounded-full ${CITY_COLOR_CLASSES[color]}`} title={color}></div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <CubeDisplay cubes={cityCubes} />
                                {legionCount > 0 && (
                                    <div className="flex items-center space-x-1" title={`${legionCount} Legion(s)`}>
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-400">
                                            <path d="M3.5 18.5 L3.5 13.5 C3.5 10.19 6.19 7.5 9.5 7.5 L14.5 7.5 C17.81 7.5 20.5 10.19 20.5 13.5 L20.5 18.5 A1.5 1.5 0 0 1 19 20 L5 20 A1.5 1.5 0 0 1 3.5 18.5 Z M9.5 4.5 A1.5 1.5 0 0 1 11 3 h2 a1.5 1.5 0 0 1 1.5 1.5 v3 A1.5 1.5 0 0 1 13 9 h-2 a1.5 1.5 0 0 1 -1.5 -1.5 v-3 Z"></path>
                                        </svg>
                                        <span className="font-bold text-sm">{legionCount}</span>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const renderLegionAndBattleSelection = () => {
        if (!destination) return null;
        const hasBarbarians = Object.values(gameState.diseaseCubes[destination] || {}).some(c => c > 0);
        const hasLegionsForBattle = (availableLegions - legionsToMove) > 0 || legionsToMove > 0;
        const canBattle = hasBarbarians && hasLegionsForBattle;

        return (
            <div>
                <p className="mb-4">Moving to <span className="font-bold">{CITIES_DATA[destination].name}</span>.</p>
                {maxLegionsToMove > 0 && (
                    <div className="bg-gray-900 p-4 rounded-lg text-center mb-6">
                        <p className="font-orbitron text-5xl text-white mb-2">{legionsToMove}</p>
                        <p className="text-sm text-gray-400 mb-4">Legion(s) to take with you</p>
                        <input
                            type="range"
                            min="0"
                            max={maxLegionsToMove}
                            value={legionsToMove}
                            onChange={(e) => setLegionsToMove(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                )}
                <div className="space-y-4">
                    <p>Finally, choose your action:</p>
                    <button
                        onClick={() => handleConfirm('normal', false)}
                        className="w-full p-3 bg-teal-700 hover:bg-teal-600 rounded-lg text-left"
                    >
                        <h3 className="font-bold">Normal Move</h3>
                        <p className="text-sm text-gray-300">Move only. No battle.</p>
                    </button>
                     <button
                        onClick={() => handleConfirm('normal', true)}
                        disabled={!canBattle}
                        className="w-full p-3 bg-teal-700 hover:bg-teal-600 rounded-lg text-left disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <h3 className="font-bold">Normal Move & Free Battle</h3>
                        <p className="text-sm text-gray-300">Perform a free Battle action after moving.</p>
                    </button>
                    <button
                        onClick={() => handleConfirm('corrupt', true)}
                        disabled={!canBattle}
                        className="w-full p-3 bg-purple-800 hover:bg-purple-700 rounded-lg text-left disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <h3 className="font-bold">Corrupt Move & Battle (+1 Decline)</h3>
                        <p className="text-sm text-gray-300">Do the free battle, ignoring any legion losses.</p>
                    </button>
                </div>
                 <button onClick={() => setStep('select_city')} className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back to City Selection</button>
            </div>
        );
    };
    
    return (
        <Modal title="Veni, Vidi, Vici" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.VeniVidiVici} />
            {step === 'select_city' && renderCitySelection()}
            {step === 'select_legions_and_battle' && renderLegionAndBattleSelection()}
        </Modal>
    );
};

const FestinaLenteModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        option: 'normal' | 'corrupt';
        destination: CityName;
        pawnSelections: { pawnId: number; legionsToMove: number }[];
    }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_option' | 'select_city' | 'select_pawns'>('select_option');
    const [selectedOption, setSelectedOption] = useState<'normal' | 'corrupt' | null>(null);
    const [selectedCity, setSelectedCity] = useState<CityName | null>(null);
    const [pawnSelections, setPawnSelections] = useState<{ [key: number]: { legionsToMove: number } }>({});

    const cityKeys = useMemo(() => Object.keys(FALLOFROME_CITIES_DATA) as CityName[], []);

    useEffect(() => {
        if (show) {
            setStep('select_option');
            setSelectedOption(null);
            setSelectedCity(null);
            setPawnSelections({});
        }
    }, [show]);

    const handlePawnSelection = (pawn: Player) => {
        setPawnSelections(prev => {
            const newSelections = { ...prev };
            if (newSelections[pawn.id]) {
                delete newSelections[pawn.id];
            } else {
                if (selectedOption === 'normal' && Object.keys(newSelections).length >= 1) {
                    return { [pawn.id]: { legionsToMove: 0 } }; // Replace selection for normal mode
                }
                newSelections[pawn.id] = { legionsToMove: 0 };
            }
            return newSelections;
        });
    };

    const handleLegionChange = (pawnId: number, newCount: number) => {
        setPawnSelections(prev => ({
            ...prev,
            [pawnId]: { legionsToMove: newCount },
        }));
    };

    const handleConfirmClick = () => {
        if (selectedOption && selectedCity) {
            const selectionsArray = Object.entries(pawnSelections).map(([pawnId, data]) => ({
                pawnId: parseInt(pawnId, 10),
                legionsToMove: data.legionsToMove,
            }));
            onConfirm({ option: selectedOption, destination: selectedCity, pawnSelections: selectionsArray });
        }
    };

    const renderOptionSelection = () => (
        <div className="space-y-4">
            <p>Make haste slowly. Choose how to use this event.</p>
            <button
                onClick={() => { setSelectedOption('normal'); setStep('select_city'); }}
                className="w-full p-3 bg-teal-700 hover:bg-teal-600 rounded-lg text-left"
            >
                <h3 className="font-bold">Normal</h3>
                <p className="text-sm text-gray-300">Choose a city, move 1 pawn to it.</p>
            </button>
            <button
                onClick={() => { setSelectedOption('corrupt'); setStep('select_city'); }}
                className="w-full p-3 bg-purple-800 hover:bg-purple-700 rounded-lg text-left"
            >
                <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                <p className="text-sm text-gray-300">Choose a city, move any number of pawns there.</p>
            </button>
        </div>
    );

    const renderCitySelection = () => (
        <div>
            <p className="mb-4">Select a destination city.</p>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-2">
                {cityKeys.sort((a, b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name)).map(city => {
                    const cityData = CITIES_DATA[city];
                    const cityCubes = gameState.diseaseCubes[city];
                    const legionCount = (gameState.legions || []).filter(l => l === city).length;
                
                    return (
                        <button
                            key={city}
                            onClick={() => { setSelectedCity(city); setStep('select_pawns'); }}
                            className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded text-left flex items-center justify-between transition-colors"
                        >
                            <div className="flex flex-col">
                                <span className={`font-bold ${DISEASE_TEXT_COLOR_MAP[cityData.color]}`}>{cityData.name}</span>
                                <div className="flex space-x-1 mt-1">
                                    {(cityData.boardColors || [cityData.color]).map(color => (
                                        <div key={color} className={`w-3 h-3 rounded-full ${CITY_COLOR_CLASSES[color]}`} title={color}></div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <CubeDisplay cubes={cityCubes} />
                                {legionCount > 0 && (
                                    <div className="flex items-center space-x-1" title={`${legionCount} Legion(s)`}>
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-400">
                                            <path d="M3.5 18.5 L3.5 13.5 C3.5 10.19 6.19 7.5 9.5 7.5 L14.5 7.5 C17.81 7.5 20.5 10.19 20.5 13.5 L20.5 18.5 A1.5 1.5 0 0 1 19 20 L5 20 A1.5 1.5 0 0 1 3.5 18.5 Z M9.5 4.5 A1.5 1.5 0 0 1 11 3 h2 a1.5 1.5 0 0 1 1.5 1.5 v3 A1.5 1.5 0 0 1 13 9 h-2 a1.5 1.5 0 0 1 -1.5 -1.5 v-3 Z"></path>
                                        </svg>
                                        <span className="font-bold text-sm">{legionCount}</span>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
            <button onClick={() => setStep('select_option')} className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
        </div>
    );

    const renderPawnSelection = () => (
        <div>
            <p className="mb-4">Select pawn(s) to move to <span className="font-bold">{selectedCity && CITIES_DATA[selectedCity].name}</span>.</p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                {gameState.players.map(pawn => {
                    const isSelected = !!pawnSelections[pawn.id];
                    const availableLegions = (gameState.legions || []).filter(l => l === pawn.location).length;
                    return (
                        <div key={pawn.id} className={`p-3 rounded-md transition-colors ${isSelected ? 'bg-blue-900' : 'bg-gray-700'}`}>
                            <button
                                onClick={() => handlePawnSelection(pawn)}
                                className="w-full flex justify-between items-center text-left"
                            >
                                <div>
                                    <p className="font-bold">{pawn.name} <span className="font-normal text-gray-300">({pawn.role})</span></p>
                                    <p className="text-xs text-gray-400">in {CITIES_DATA[pawn.location].name}</p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 ${isSelected ? 'bg-blue-500 border-white' : 'border-gray-500'}`}></div>
                            </button>
                            {isSelected && availableLegions > 0 && (
                                <div className="mt-3 text-center">
                                    <label className="text-xs text-gray-400">Legions to take (max {Math.min(3, availableLegions)})</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max={Math.min(3, availableLegions)}
                                        value={pawnSelections[pawn.id]?.legionsToMove || 0}
                                        onChange={(e) => handleLegionChange(pawn.id, parseInt(e.target.value, 10))}
                                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-1"
                                    />
                                    <p className="font-orbitron text-xl">{pawnSelections[pawn.id]?.legionsToMove || 0}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex space-x-2 mt-4">
                <button onClick={() => setStep('select_city')} className="w-1/3 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
                <button
                    onClick={handleConfirmClick}
                    disabled={Object.keys(pawnSelections).length === 0}
                    className="w-2/3 p-2 bg-blue-600 hover:bg-blue-500 rounded disabled:bg-gray-600"
                >
                    Confirm Move
                </button>
            </div>
        </div>
    );

    return (
        <Modal title="Festina Lente" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.FestinaLente} />
            {step === 'select_option' && renderOptionSelection()}
            {step === 'select_city' && renderCitySelection()}
            {step === 'select_pawns' && renderPawnSelection()}
        </Modal>
    );
};

const MortuiNonMordentModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        option: 'normal' | 'corrupt';
        selections: { [key in CityName]?: { [key in DiseaseColor]?: number } };
    }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_option' | 'select_color' | 'select_cubes'>('select_option');
    const [selectedOption, setSelectedOption] = useState<'normal' | 'corrupt' | null>(null);
    const [selectedColor, setSelectedColor] = useState<DiseaseColor | null>(null);
    const [selections, setSelections] = useState<{ [key in CityName]?: { [key in DiseaseColor]?: number } }>({});

    const maxToRemove = selectedOption === 'normal' ? 2 : 4;

    const totalSelected = useMemo(() => {
        return Object.values(selections).reduce((citySum, citySelections) =>
            citySum + Object.values(citySelections || {}).reduce((colorSum, count) => colorSum + (count || 0), 0), 0);
    }, [selections]);

    const colorsOnBoard = useMemo(() => {
        const colors = new Set<DiseaseColor>();
        Object.values(gameState.diseaseCubes).forEach(cityCubes => {
            if (cityCubes) {
                (Object.keys(cityCubes) as DiseaseColor[]).forEach(color => {
                    if ((cityCubes[color] || 0) > 0) {
                        colors.add(color);
                    }
                });
            }
        });
        return Array.from(colors).sort();
    }, [gameState.diseaseCubes]);

    const citiesWithSelectedColor = useMemo(() => {
        if (!selectedColor) return [];
        return (Object.keys(gameState.diseaseCubes) as CityName[])
            .filter(city => (gameState.diseaseCubes[city]?.[selectedColor] || 0) > 0)
            .sort((a, b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name));
    }, [gameState.diseaseCubes, selectedColor]);

    useEffect(() => {
        if (show) {
            setStep('select_option');
            setSelectedOption(null);
            setSelectedColor(null);
            setSelections({});
        }
    }, [show]);

    const handleSelectionChange = (city: CityName, change: number) => {
        if (!selectedColor) return;
        setSelections(prev => {
            const newSelections = JSON.parse(JSON.stringify(prev));
            if (!newSelections[city]) newSelections[city] = {};
            if (!newSelections[city][selectedColor]) newSelections[city][selectedColor] = 0;

            const currentCount = newSelections[city][selectedColor]!;
            const availableInCity = gameState.diseaseCubes[city]?.[selectedColor] || 0;
            let newCount = currentCount + change;
            newCount = Math.max(0, Math.min(availableInCity, newCount));

            if (change > 0 && totalSelected >= maxToRemove) return prev;

            newSelections[city][selectedColor] = newCount;
            return newSelections;
        });
    };

    const handleConfirmClick = () => {
        if (selectedOption) {
            onConfirm({ option: selectedOption, selections });
        }
    };

    const renderOptionSelection = () => (
        <div className="space-y-4">
            <p>Dead men don't bite. Choose how to use this event.</p>
            <button
                onClick={() => { setSelectedOption('normal'); setStep('select_color'); }}
                className="w-full p-3 bg-teal-700 hover:bg-teal-600 rounded-lg text-left"
            >
                <h3 className="font-bold">Normal</h3>
                <p className="text-sm text-gray-300">Remove up to 2 barbarians of the same color from anywhere.</p>
            </button>
            <button
                onClick={() => { setSelectedOption('corrupt'); setStep('select_color'); }}
                className="w-full p-3 bg-purple-800 hover:bg-purple-700 rounded-lg text-left"
            >
                <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                <p className="text-sm text-gray-300">Remove up to 4 barbarians of the same color from anywhere.</p>
            </button>
        </div>
    );

    const renderColorSelection = () => (
        <div>
            <p className="mb-4">Select which tribe's barbarians to remove.</p>
            <div className="space-y-2">
                {colorsOnBoard.map(color => (
                    <button
                        key={color}
                        onClick={() => { setSelectedColor(color); setStep('select_cubes'); }}
                        className={`w-full p-3 rounded-md text-left font-bold capitalize transition-colors hover:opacity-90 ${CITY_COLOR_CLASSES[color]}`}
                    >
                        {color} Tribe
                    </button>
                ))}
            </div>
            <button onClick={() => setStep('select_option')} className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
        </div>
    );

    const renderCubeSelection = () => (
        <div>
            <div className="p-3 bg-gray-900 rounded-lg text-center mb-4">
                <p>Total Removed: <span className="font-orbitron text-3xl">{totalSelected}</span> / {maxToRemove}</p>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                {citiesWithSelectedColor.map(city => (
                    <div key={city} className="p-2 bg-gray-700 rounded-md flex items-center justify-between">
                        <div>
                            <span className="font-bold">{CITIES_DATA[city].name}</span>
                            <span className="text-xs text-gray-400"> ({gameState.diseaseCubes[city]?.[selectedColor!]} present)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => handleSelectionChange(city, -1)} disabled={(selections[city]?.[selectedColor!] || 0) === 0} className="w-8 h-8 rounded-full bg-gray-600 disabled:opacity-50">-</button>
                            <span className="w-8 text-center font-bold">{selections[city]?.[selectedColor!] || 0}</span>
                            <button onClick={() => handleSelectionChange(city, 1)} disabled={(selections[city]?.[selectedColor!] || 0) >= (gameState.diseaseCubes[city]?.[selectedColor!] || 0) || totalSelected >= maxToRemove} className="w-8 h-8 rounded-full bg-gray-600 disabled:opacity-50">+</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex space-x-2 mt-4">
                <button onClick={() => { setStep('select_color'); setSelections({}); }} className="w-1/3 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
                <button onClick={handleConfirmClick} className="w-2/3 p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold">Confirm</button>
            </div>
        </div>
    );

    return (
        <Modal title="Mortui Non Mordent" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.MortuiNonMordent} />
            {step === 'select_option' && renderOptionSelection()}
            {step === 'select_color' && renderColorSelection()}
            {step === 'select_cubes' && renderCubeSelection()}
        </Modal>
    );
};

const MeliusCavereQuamPavereModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        option: 'normal' | 'corrupt';
        rearrangedCards: InfectionCard[];
        removedCard?: InfectionCard;
    }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_option' | 'rearrange_cards'>('select_option');
    const [selectedOption, setSelectedOption] = useState<'normal' | 'corrupt' | null>(null);

    const numCardsToForecast = Math.min(6, gameState.infectionDeck.length);
    const topCards = useMemo(() => gameState.infectionDeck.slice(0, numCardsToForecast), [gameState.infectionDeck, numCardsToForecast]);

    const [cards, setCards] = useState<InfectionCard[]>([]);
    const [removedCard, setRemovedCard] = useState<InfectionCard | null>(null);

    // Drag and drop state
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        if (show) {
            setStep('select_option');
            setSelectedOption(null);
            setCards(topCards);
            setRemovedCard(null);
        }
    }, [show, topCards]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        if (dragItem.current === null || dragItem.current === index) return;
        
        dragOverItem.current = index;
        const newCards = [...cards];
        const draggedItemContent = newCards[dragItem.current];
        newCards.splice(dragItem.current, 1);
        newCards.splice(dragOverItem.current, 0, draggedItemContent);
        
        dragItem.current = dragOverItem.current;
        dragOverItem.current = null;
        
        setCards(newCards);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        dragItem.current = null;
        dragOverItem.current = null;
        e.currentTarget.classList.remove('opacity-50');
    };

    const handleRemoveCard = (indexToRemove: number) => {
        if (removedCard) return; // Only allow one removal
        const cardToRemove = cards[indexToRemove];
        setRemovedCard(cardToRemove);
        setCards(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleUndoRemove = () => {
        if (!removedCard) return;
        // A simple implementation could be to just reset to the initial state
        setCards(topCards.filter(c => c !== removedCard));
        setRemovedCard(null);
        // For a more complex undo, you'd need to store the original index and re-insert.
        // But resetting is simpler and often sufficient.
        setCards(topCards.filter(c => c !== removedCard));
        setRemovedCard(null);
    };
    
    const renderOptionSelection = () => (
        <div className="space-y-4">
            <p>Better to be careful than afraid. Choose how to use this event.</p>
            <button
                onClick={() => { setSelectedOption('normal'); setStep('rearrange_cards'); }}
                className="w-full p-3 bg-teal-700 hover:bg-teal-600 rounded-lg text-left"
            >
                <h3 className="font-bold">Normal</h3>
                <p className="text-sm text-gray-300">Look at the top 6 cards, rearrange them, and put them back.</p>
            </button>
            <button
                onClick={() => { setSelectedOption('corrupt'); setStep('rearrange_cards'); }}
                className="w-full p-3 bg-purple-800 hover:bg-purple-700 rounded-lg text-left"
            >
                <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                <p className="text-sm text-gray-300">Do the same, but remove one card from the game first.</p>
            </button>
        </div>
    );

    const renderRearrangeStep = () => (
        <div>
            <p className="mb-4">
                {selectedOption === 'normal'
                    ? `Drag and drop to reorder the top ${numCardsToForecast} cards. The card at the top will be drawn first.`
                    : `First, remove one card from the game. Then, you may reorder the remaining cards.`}
            </p>
            {removedCard && (
                <div className="p-2 mb-4 bg-red-900 rounded-md flex items-center justify-between">
                    <p className="text-sm">Removed: <span className="font-bold">{getCardDisplayName(removedCard)}</span></p>
                    <button onClick={handleUndoRemove} className="text-xs bg-gray-500 hover:bg-gray-400 px-2 py-1 rounded">Undo</button>
                </div>
            )}
            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto pr-2">
                {cards.map((card, index) => {
                    if (card.type !== 'city') return null; // Should not happen in Fall of Rome
            
                    const city = CITIES_DATA[card.name];
                    const cityCubes = gameState.diseaseCubes[card.name];
                    const legionCount = (gameState.legions || []).filter(l => l === card.name).length;
                    const cardColor = card.color;
                    const textColor = (cardColor === DiseaseColor.Yellow || cardColor === DiseaseColor.White) ? 'text-black' : 'text-white';
            
                    return (
                        <div key={`${card.name}-${card.color}-${index}`} className="flex items-stretch space-x-2">
                            <div
                                className="flex-grow flex items-center p-2 bg-gray-700 rounded-md cursor-grab active:cursor-grabbing"
                                draggable={!removedCard || selectedOption !== 'corrupt'}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                {/* Drag Handle */}
                                <div className="text-gray-400 mr-3 flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                    </svg>
                                </div>
                                
                                {/* City Info */}
                                <div className={`w-40 flex-shrink-0 p-2 rounded-md ${CITY_COLOR_CLASSES[cardColor]} ${textColor}`}>
                                    <p className="font-bold text-sm leading-tight">{city.name}</p>
                                    <p className="text-xs capitalize">{card.color} Tribe</p>
                                </div>
            
                                {/* Cube and Legion Info */}
                                <div className="flex-grow flex items-center justify-end space-x-4 ml-3">
                                    <CubeDisplay cubes={cityCubes} />
                                    {legionCount > 0 && (
                                        <div className="flex items-center space-x-1" title={`${legionCount} Legion(s)`}>
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-400">
                                                <path d="M3.5 18.5 L3.5 13.5 C3.5 10.19 6.19 7.5 9.5 7.5 L14.5 7.5 C17.81 7.5 20.5 10.19 20.5 13.5 L20.5 18.5 A1.5 1.5 0 0 1 19 20 L5 20 A1.5 1.5 0 0 1 3.5 18.5 Z M9.5 4.5 A1.5 1.5 0 0 1 11 3 h2 a1.5 1.5 0 0 1 1.5 1.5 v3 A1.5 1.5 0 0 1 13 9 h-2 a1.5 1.5 0 0 1 -1.5 -1.5 v-3 Z"></path>
                                            </svg>
                                            <span className="font-bold text-sm">{legionCount}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
            
                            {selectedOption === 'corrupt' && (
                                <button
                                    onClick={() => handleRemoveCard(index)}
                                    disabled={!!removedCard}
                                    className="w-10 bg-red-700 hover:bg-red-600 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center text-xl font-bold flex-shrink-0"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex space-x-2">
                <button onClick={() => setStep('select_option')} className="w-1/3 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
                <button
                    onClick={() => onConfirm({ option: selectedOption!, rearrangedCards: cards, removedCard: removedCard || undefined })}
                    disabled={selectedOption === 'corrupt' && !removedCard}
                    className="w-2/3 p-2 bg-blue-600 hover:bg-blue-500 rounded disabled:bg-gray-600"
                >
                    Confirm Arrangement
                </button>
            </div>
        </div>
    );

    return (
        <Modal title="Melius Cavere Quam Pavere" show={show} onClose={onClose} isSidePanel={true} sidePanelWidth="w-[370px]">
            <EventCardImage cardName={EventCardName.MeliusCavereQuamPavere} />
            {step === 'select_option' ? renderOptionSelection() : renderRearrangeStep()}
        </Modal>
    );
};

const AbundansCautelaNonNocetModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: { option: 'normal' | 'corrupt' }) => void;
}> = ({ show, onClose, onConfirm }) => {
    return (
        <Modal title="Abundans Cautela Non Nocet" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.AbundansCautelaNonNocet} />
            <div className="space-y-4">
                <p>Abundant caution does not harm. Choose how to use this event.</p>
                <button
                    onClick={() => onConfirm({ option: 'normal' })}
                    className="w-full p-3 bg-teal-700 hover:bg-teal-600 rounded-lg text-left"
                >
                    <h3 className="font-bold">Normal</h3>
                    <p className="text-sm text-gray-300">During the next Invade Cities step, draw 2 fewer cards.</p>
                </button>
                <button
                    onClick={() => onConfirm({ option: 'corrupt' })}
                    className="w-full p-3 bg-purple-800 hover:bg-purple-700 rounded-lg text-left"
                >
                    <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                    <p className="text-sm text-gray-300">Skip the Invade Cities step this turn.</p>
                </button>
            </div>
        </Modal>
    );
};

const AleaIactaEstModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: { option: 'normal' | 'corrupt' }) => void;
}> = ({ show, onClose, onConfirm }) => {
    return (
        <Modal title="Alea Iacta Est" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.AleaIactaEst} />
            <div className="space-y-4">
                <p>The die is cast. Choose how to use this event.</p>
                <button
                    onClick={() => onConfirm({ option: 'normal' })}
                    className="w-full p-3 bg-teal-700 hover:bg-teal-600 rounded-lg text-left"
                >
                    <h3 className="font-bold">Normal</h3>
                    <p className="text-sm text-gray-300">During 1 battle this turn, set the dice to the results you want, instead of rolling them.</p>
                </button>
                <button
                    onClick={() => onConfirm({ option: 'corrupt' })}
                    className="w-full p-3 bg-purple-800 hover:bg-purple-700 rounded-lg text-left"
                >
                    <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                    <p className="text-sm text-gray-300">Do the above for every battle this turn.</p>
                </button>
            </div>
        </Modal>
    );
};

const HomoFaberFortunaeSuaeModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        option: 'normal' | 'corrupt';
        card: PlayerCard & { type: 'city' };
    }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_option' | 'select_card'>('select_option');
    const [selectedOption, setSelectedOption] = useState<'normal' | 'corrupt' | null>(null);

    const player = gameState.players[gameState.currentPlayerIndex];
    const cityCardsInDiscard = useMemo(() => 
    (gameState.playerDiscard.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[])
        .sort((a, b) => {
            const nameA = CITIES_DATA[a.name]?.name || '';
            const nameB = CITIES_DATA[b.name]?.name || '';
            return nameA.localeCompare(nameB);
        }),
    [gameState.playerDiscard]
);

    const isNormalOptionAvailable = useMemo(() => 
        cityCardsInDiscard.some(c => c.name === player.location),
        [cityCardsInDiscard, player.location]
    );

    useEffect(() => {
        if (show) {
            setStep('select_option');
            setSelectedOption(null);
        }
    }, [show]);

    const cardsToShow = useMemo(() => {
        if (selectedOption === 'normal') {
            return cityCardsInDiscard.filter(c => c.name === player.location);
        }
        return cityCardsInDiscard;
    }, [selectedOption, cityCardsInDiscard, player.location]);

    const renderOptionSelection = () => (
        <div className="space-y-4">
            <p>Man is the architect of his own fate. Choose how to use this event.</p>
            <button
                onClick={() => { setSelectedOption('normal'); setStep('select_card'); }}
                disabled={!isNormalOptionAvailable}
                className="w-full p-3 bg-teal-700 hover:bg-teal-600 rounded-lg text-left disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                <h3 className="font-bold">Normal</h3>
                <p className="text-sm text-gray-300">Draw a City Card matching your city ({CITIES_DATA[player.location].name}) from the discard pile.</p>
                {!isNormalOptionAvailable && <p className="text-xs text-yellow-400 mt-1">No matching card in discard.</p>}
            </button>
            <button
                onClick={() => { setSelectedOption('corrupt'); setStep('select_card'); }}
                className="w-full p-3 bg-purple-800 hover:bg-purple-700 rounded-lg text-left"
            >
                <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                <p className="text-sm text-gray-300">Draw any city card from the discard pile.</p>
            </button>
        </div>
    );

    const renderCardSelection = () => (
        <div>
            <p className="mb-4">Select a card to retrieve.</p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                {cardsToShow.map((card, index) => (
                    <button
                        key={`${card.name}-${card.color}-${index}`}
                        onClick={() => onConfirm({ option: selectedOption!, card })}
                        className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded text-left flex items-center"
                    >
                        <div className={`w-4 h-4 rounded-sm mr-3 ${CITY_COLOR_CLASSES[card.color]}`}></div>
                        <span>{getCardDisplayName(card)}</span>
                    </button>
                ))}
            </div>
            <button onClick={() => setStep('select_option')} className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
        </div>
    );

    return (
        <Modal title="Homo Faber Fortunae Suae" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.HomoFaberFortunaeSuae} />
            {step === 'select_option' ? renderOptionSelection() : renderCardSelection()}
        </Modal>
    );
};

const MorsTuaVitaMeaModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        option: 'normal' | 'corrupt';
        city: CityName;
        selections: { [key in DiseaseColor]?: number };
    }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_option' | 'select_city' | 'select_cubes'>('select_option');
    const [selectedOption, setSelectedOption] = useState<'normal' | 'corrupt' | null>(null);
    const [selectedCity, setSelectedCity] = useState<CityName | null>(null);
    const [selections, setSelections] = useState<{ [key in DiseaseColor]?: number }>({});

    const allInfectedCities = useMemo(() => {
        return (Object.keys(gameState.diseaseCubes) as CityName[])
            .filter(city => Object.values(gameState.diseaseCubes[city]!).some(count => count > 0))
            .sort((a, b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name));
    }, [gameState.diseaseCubes]);

    useEffect(() => {
        if (show) {
            setStep('select_option');
            setSelectedOption(null);
            setSelectedCity(null);
            setSelections({});
        }
    }, [show]);

    const handleConfirmClick = () => {
        if (selectedOption && selectedCity) {
            onConfirm({ option: selectedOption, city: selectedCity, selections });
        }
    };

    const totalSelected = useMemo(() => Object.values(selections).reduce((sum, count) => sum + (count || 0), 0), [selections]);

    const handleCubeChange = (color: DiseaseColor, change: number) => {
        const maxToRemove = selectedOption === 'normal' ? 1 : 3;
        setSelections(prev => {
            const currentCount = prev[color] || 0;
            const newCount = currentCount + change;
            const availableInCity = selectedCity ? (gameState.diseaseCubes[selectedCity]?.[color] || 0) : 0;
            if (newCount < 0 || newCount > availableInCity) return prev;
            if (change > 0 && totalSelected >= maxToRemove) return prev;
            return { ...prev, [color]: newCount };
        });
    };

    const renderOptionSelection = () => (
        <div className="space-y-4">
            <p>Your death, my survival. Choose how to use this event.</p>
            <button
                onClick={() => { setSelectedOption('normal'); setStep('select_city'); }}
                className="w-full p-3 bg-teal-700 hover:bg-teal-600 rounded-lg text-left"
            >
                <h3 className="font-bold">Normal</h3>
                <p className="text-sm text-gray-300">Replace 1 barbarian with 1 legion anywhere.</p>
            </button>
            <button
                onClick={() => { setSelectedOption('corrupt'); setStep('select_city'); }}
                className="w-full p-3 bg-purple-800 hover:bg-purple-700 rounded-lg text-left"
            >
                <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                <p className="text-sm text-gray-300">Replace up to 3 barbarians in 1 city with an equal number of legions.</p>
            </button>
        </div>
    );

    const renderCitySelection = () => (
        <div>
            <p className="mb-4">Select a city with barbarians.</p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                {allInfectedCities.map(city => (
                    <button
                        key={city}
                        onClick={() => { setSelectedCity(city); setStep('select_cubes'); }}
                        className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-left"
                    >
                        {CITIES_DATA[city].name}
                    </button>
                ))}
            </div>
        </div>
    );

    const renderCubeSelection = () => {
        if (!selectedCity) return null;
        const maxToRemove = selectedOption === 'normal' ? 1 : 3;
        const cityCubes = gameState.diseaseCubes[selectedCity]!;
        return (
            <div>
                <p className="mb-4">Select up to {maxToRemove} barbarian(s) in {CITIES_DATA[selectedCity].name} to replace with legions.</p>
                <div className="p-2 bg-gray-900 rounded-md mb-4 text-center">
                    <p>Total Replaced: <span className="font-bold text-xl">{totalSelected}</span> / {maxToRemove}</p>
                </div>
                <div className="space-y-3">
                    {Object.entries(cityCubes).filter(([, count]) => count > 0).map(([color, count]) => (
                        <div key={color} className="flex items-center justify-between p-2 bg-gray-700 rounded-md">
                            <span className={`font-bold capitalize ${DISEASE_TEXT_COLOR_MAP[color as DiseaseColor]}`}>{color} ({count} present)</span>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleCubeChange(color as DiseaseColor, -1)} disabled={(selections[color as DiseaseColor] || 0) === 0} className="w-8 h-8 rounded-full bg-gray-600 disabled:opacity-50">-</button>
                                <span className="w-8 text-center font-bold">{selections[color as DiseaseColor] || 0}</span>
                                <button onClick={() => handleCubeChange(color as DiseaseColor, 1)} disabled={(selections[color as DiseaseColor] || 0) >= count || totalSelected >= maxToRemove} className="w-8 h-8 rounded-full bg-gray-600 disabled:opacity-50">+</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex space-x-2 mt-4">
                    <button onClick={() => setStep('select_city')} className="w-1/3 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
                    <button
                        onClick={handleConfirmClick}
                        disabled={totalSelected === 0 || (selectedOption === 'normal' && totalSelected !== 1)}
                        className="w-2/3 p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold disabled:bg-gray-600"
                    >
                        Confirm Replacement
                    </button>
                </div>
            </div>
        );
    };

    return (
        <Modal title="Mors Tua, Vita Mea" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.MorsTuaVitaMea} />
            {step === 'select_option' && renderOptionSelection()}
            {step === 'select_city' && renderCitySelection()}
            {step === 'select_cubes' && renderCubeSelection()}
        </Modal>
    );
};

const HicManebimusOptimeModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: { option: 'normal' | 'corrupt'; selections?: { [key in CityName]?: number } }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_option' | 'select_cities'>('select_option');
    const [selections, setSelections] = useState<{ [key in CityName]?: number }>({});

    const availableLegions = 16 - (gameState.legions?.length || 0);
    const totalSelectedLegions = useMemo(() => Object.values(selections).reduce((sum, count) => sum + (count || 0), 0), [selections]);
    const selectedCitiesCount = useMemo(() => Object.keys(selections).filter(city => (selections[city as CityName] || 0) > 0).length, [selections]);

    useEffect(() => {
        if (show) {
            setStep('select_option');
            setSelections({});
        }
    }, [show]);

    const handleLegionChange = (city: CityName, change: number) => {
        setSelections(prev => {
            const current = prev[city] || 0;
            const newCount = Math.max(0, Math.min(2, current + change));
            const newTotal = totalSelectedLegions - current + newCount;

            if (newTotal > availableLegions) return prev;

            const newSelections = { ...prev, [city]: newCount };
            const newSelectedCitiesCount = Object.keys(newSelections).filter(c => (newSelections[c as CityName] || 0) > 0).length;

            if (newSelectedCitiesCount > 3) return prev;

            return newSelections;
        });
    };

    const renderOptionSelection = () => (
        <div>
            <p className="mb-4">Here we will stay, excellently. Choose how to play this event.</p>
            <div className="space-y-3">
                <button
                    onClick={() => setStep('select_cities')}
                    className="w-full p-4 bg-teal-700 hover:bg-teal-600 rounded-lg text-left"
                >
                    <h3 className="font-bold">Normal</h3>
                    <p className="text-sm text-gray-300">Choose up to 3 cities with Forts. Add up to 2 Legions to each.</p>
                </button>
                <button
                    onClick={() => onConfirm({ option: 'corrupt' })}
                    className="w-full p-4 bg-purple-800 hover:bg-purple-700 rounded-lg text-left"
                >
                    <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                    <p className="text-sm text-gray-300">Add up to 3 Legions to *every* city with a Fort.</p>
                </button>
            </div>
        </div>
    );

    const renderCitySelection = () => (
        <div>
            <p className="mb-2">Select up to 3 cities with forts and add up to 2 legions to each.</p>
            <div className="p-3 bg-gray-900 rounded-lg text-center mb-4">
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <p className="text-sm text-gray-400">Cities Selected</p>
                        <p className={`font-orbitron text-3xl ${selectedCitiesCount > 3 ? 'text-red-500' : 'text-white'}`}>{selectedCitiesCount} / 3</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Legions Added</p>
                        <p className={`font-orbitron text-3xl ${totalSelectedLegions > availableLegions ? 'text-red-500' : 'text-white'}`}>{totalSelectedLegions}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Supply</p>
                        <p className="font-orbitron text-3xl text-white">{availableLegions}</p>
                    </div>
                </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {gameState.forts.sort((a,b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name)).map(city => (
                    <div key={city} className="p-2 bg-gray-700 rounded-md flex items-center justify-between">
                        <span className="font-bold">{CITIES_DATA[city].name}</span>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => handleLegionChange(city, -1)} disabled={(selections[city] || 0) === 0} className="w-8 h-8 rounded-full bg-gray-600 disabled:opacity-50">-</button>
                            <span className="w-8 text-center font-bold">{selections[city] || 0}</span>
                            <button onClick={() => handleLegionChange(city, 1)} disabled={(selections[city] || 0) >= 2 || totalSelectedLegions >= availableLegions || selectedCitiesCount >= 3 && !selections[city]} className="w-8 h-8 rounded-full bg-gray-600 disabled:opacity-50">+</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex space-x-2 mt-4">
                <button onClick={() => setStep('select_option')} className="w-1/3 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
                <button onClick={() => onConfirm({ option: 'normal', selections })} disabled={totalSelectedLegions === 0} className="w-2/3 p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold disabled:bg-gray-600">Confirm</button>
            </div>
        </div>
    );

    return (
        <Modal title="Hic Manebimus Optime" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.HicManebimusOptime} />
            {step === 'select_option' ? renderOptionSelection() : renderCitySelection()}
        </Modal>
    );
};

const SiVisPacemParaBellumModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: { option: 'normal' | 'corrupt'; city: CityName; cityToRemove?: CityName; pawnId: number | null; legionsToMove: number }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_option' | 'select_city' | 'relocate_fort' | 'select_pawn'>('select_option');
    const [selectedOption, setSelectedOption] = useState<'normal' | 'corrupt' | null>(null);
    const [selectedCity, setSelectedCity] = useState<CityName | null>(null);
    const [cityToRemove, setCityToRemove] = useState<CityName | null>(null);
    const [selectedPawnId, setSelectedPawnId] = useState<number | null>(null);
    const [legionsToMove, setLegionsToMove] = useState(0);

    const cityKeys = useMemo(() => Object.keys(FALLOFROME_CITIES_DATA) as CityName[], []);
    const availableLegionsForPawn = useMemo(() => {
        if (selectedPawnId === null) return 0;
        const pawn = gameState.players.find(p => p.id === selectedPawnId);
        if (!pawn) return 0;
        return (gameState.legions || []).filter(l => l === pawn.location).length;
    }, [selectedPawnId, gameState.players, gameState.legions]);

    useEffect(() => {
        if (show) {
            setStep('select_option');
            setSelectedOption(null);
            setSelectedCity(null);
            setCityToRemove(null);
            setSelectedPawnId(null);
            setLegionsToMove(0);
        }
    }, [show]);

    const handleCitySelect = (city: CityName) => {
        setSelectedCity(city);
        if (gameState.forts.length >= 6 && !gameState.forts.includes(city)) {
            setStep('relocate_fort');
        } else {
            if (selectedOption === 'normal') {
                onConfirm({ option: 'normal', city, pawnId: null, legionsToMove: 0 });
            } else {
                setStep('select_pawn');
            }
        }
    };

    const handleConfirmRelocation = (city: CityName) => {
        setCityToRemove(city);
        if (selectedOption === 'normal') {
            onConfirm({ option: 'normal', city: selectedCity!, cityToRemove: city, pawnId: null, legionsToMove: 0 });
        } else {
            setStep('select_pawn');
        }
    };

    const handleConfirmPawnMove = () => {
        if (selectedOption === 'corrupt' && selectedCity) {
            onConfirm({ option: 'corrupt', city: selectedCity, cityToRemove: cityToRemove, pawnId: selectedPawnId, legionsToMove });
        }
    };

    const renderOptionSelection = () => (
        <div>
            <p className="mb-4">If you want peace, prepare for war. Choose how to play this event.</p>
            <div className="space-y-3">
                <button
                    onClick={() => { setSelectedOption('normal'); setStep('select_city'); }}
                    className="w-full p-4 bg-teal-700 hover:bg-teal-600 rounded-lg text-left"
                >
                    <h3 className="font-bold">Normal</h3>
                    <p className="text-sm text-gray-300">Place a Fort in any city.</p>
                </button>
                <button
                    onClick={() => { setSelectedOption('corrupt'); setStep('select_city'); }}
                    className="w-full p-4 bg-purple-800 hover:bg-purple-700 rounded-lg text-left"
                >
                    <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                    <p className="text-sm text-gray-300">Place a Fort, move a pawn there, and optionally take up to 3 legions.</p>
                </button>
            </div>
        </div>
    );

    const renderCitySelection = () => (
        <div>
            <p className="mb-4">Select a city to place a fort.</p>
            <div className="flex flex-col space-y-1 max-h-72 overflow-y-auto pr-2">
                {cityKeys.sort((a, b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name)).map(city => {
                    const cityData = CITIES_DATA[city];
                    const cityCubes = gameState.diseaseCubes[city];
                    const legionCount = (gameState.legions || []).filter(l => l === city).length;
                    const hasFort = gameState.forts.includes(city);
                
                    return (
                        <button
                            key={city}
                            onClick={() => handleCitySelect(city)}
                            className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded text-left flex items-center justify-between transition-colors"
                        >
                            <div className="flex flex-col">
                                <span className={`font-bold ${DISEASE_TEXT_COLOR_MAP[cityData.color]}`}>{cityData.name}</span>
                                <div className="flex space-x-1 mt-1">
                                    {(cityData.boardColors || [cityData.color]).map(color => (
                                        <div key={color} className={`w-3 h-3 rounded-full ${CITY_COLOR_CLASSES[color]}`} title={color}></div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                {hasFort && <span className="text-xs font-bold text-yellow-400">FORT</span>}
                                <CubeDisplay cubes={cityCubes} />
                                {legionCount > 0 && (
                                    <div className="flex items-center space-x-1" title={`${legionCount} Legion(s)`}>
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-400">
                                            <path d="M3.5 18.5 L3.5 13.5 C3.5 10.19 6.19 7.5 9.5 7.5 L14.5 7.5 C17.81 7.5 20.5 10.19 20.5 13.5 L20.5 18.5 A1.5 1.5 0 0 1 19 20 L5 20 A1.5 1.5 0 0 1 3.5 18.5 Z M9.5 4.5 A1.5 1.5 0 0 1 11 3 h2 a1.5 1.5 0 0 1 1.5 1.5 v3 A1.5 1.5 0 0 1 13 9 h-2 a1.5 1.5 0 0 1 -1.5 -1.5 v-3 Z"></path>
                                        </svg>
                                        <span className="font-bold text-sm">{legionCount}</span>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
            <button onClick={() => setStep('select_option')} className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
        </div>
    );

    const renderFortRelocation = () => (
        <div>
            <p className="mb-1">All forts are in use.</p>
            <p className="mb-4">To build a new fort in <span className="font-bold">{selectedCity && CITIES_DATA[selectedCity].name}</span>, you must move an existing one.</p>
            <p className="mb-4 text-sm font-bold">Please select a fort to move.</p>
            <div className="space-y-1 max-h-60 overflow-y-auto pr-2">
                {gameState.forts.sort((a, b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name)).map(cityName => (
                    <button
                        key={cityName}
                        onClick={() => handleConfirmRelocation(cityName)}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-between text-left w-full"
                    >
                        <span className="font-semibold">{CITIES_DATA[cityName].name}</span>
                    </button>
                ))}
            </div>
            <button onClick={() => setStep('select_city')} className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
        </div>
    );

    const renderPawnSelection = () => (
        <div>
            <p className="mb-4">Optionally, select a pawn to move to the new fort in <span className="font-bold">{selectedCity && CITIES_DATA[selectedCity].name}</span>.</p>
            <div className="space-y-2 mb-4">
                {gameState.players.map(pawn => (
                    <button
                        key={pawn.id}
                        onClick={() => setSelectedPawnId(pawn.id === selectedPawnId ? null : pawn.id)}
                        className={`w-full p-2 rounded text-left ${selectedPawnId === pawn.id ? 'bg-blue-600 ring-2 ring-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        <p className="font-bold">{pawn.name} ({pawn.role})</p>
                        <p className="text-xs text-gray-300">Currently in: {CITIES_DATA[pawn.location].name}</p>
                    </button>
                ))}
            </div>
            {selectedPawnId !== null && availableLegionsForPawn > 0 && (
                <div className="p-4 bg-gray-900 rounded-lg text-center mb-4">
                    <p className="text-sm text-gray-400 mb-2">Legions to take (max 3)</p>
                    <input
                        type="range"
                        min="0"
                        max={Math.min(3, availableLegionsForPawn)}
                        value={legionsToMove}
                        onChange={(e) => setLegionsToMove(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="font-orbitron text-3xl mt-2">{legionsToMove}</p>
                </div>
            )}
            <button onClick={handleConfirmPawnMove} className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold">Confirm Selection</button>
            <button onClick={() => { cityToRemove ? setStep('relocate_fort') : setStep('select_city'); }} className="w-full mt-2 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
        </div>
    );
    
    return (
        <Modal title="Si Vis Pacem, Para Bellum" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.SiVisPacemParaBellum} />
            {step === 'select_option' && renderOptionSelection()}
            {step === 'select_city' && renderCitySelection()}
            {step === 'relocate_fort' && renderFortRelocation()}
            {step === 'select_pawn' && renderPawnSelection()}
        </Modal>
    );
};

// Reusable component for the Vestalis's out-of-turn action
const VestalisOutOfTurnActions: React.FC<{
    gameState: GameState;
    onInitiateVestalisDrawEvent: () => void;
}> = ({ gameState, onInitiateVestalisDrawEvent }) => {
    const vestalis = gameState.players.find(p => p.role === PlayerRole.Vestalis);

    const canVestalisDrawEvent = useMemo(() => {
        if (!vestalis || gameState.gameType !== 'fallOfRome' || gameState.eventDeck.length === 0) {
            return false;
        }
        const vestalisCityData = FALLOFROME_CITIES_DATA[vestalis.location as keyof typeof FALLOFROME_CITIES_DATA];
        if (!vestalisCityData?.boardColors) return false;
        const cityColors = new Set(vestalisCityData.boardColors);
        return vestalis.hand.some(c => c.type === 'city' && cityColors.has(c.color));
    }, [gameState.players, gameState.gameType, gameState.eventDeck, vestalis]);

    if (!vestalis) {
        return null;
    }

    return (
        <div className="bg-gray-900 p-3 rounded-lg mt-2">
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
    );
};


// MODAL COMPONENTS


const FreeEnlistBarbariansModal: React.FC<{
    show: boolean;
    onClose: () => void;
    options: { color: DiseaseColor }[];
    onConfirm: (color: DiseaseColor) => void;
    gameState: GameState;
}> = ({ show, onClose, options, onConfirm, gameState }) => {
    const player = gameState.players[gameState.currentPlayerIndex];

    return (
        <Modal title="Enlist Barbarians (Free)" show={show} onClose={onClose}>
            <p className="mb-4">As the Regina Foederata, you may enlist one allied tribe in your city for free. Choose which tribe to convert into legions:</p>
            <div className="space-y-2">
                {options.map(option => {
                    const cubesToRemove = gameState.diseaseCubes[player.location]?.[option.color] || 0;
                    const availableLegions = 16 - (gameState.legions?.length || 0);
                    const legionsToAdd = Math.min(cubesToRemove, availableLegions);

                    return (
                        <button 
                            key={option.color} 
                            onClick={() => onConfirm(option.color)}
                            className={`w-full p-3 rounded-md text-left flex items-center space-x-4 transition-colors hover:opacity-90 ${CITY_COLOR_CLASSES[option.color]}`}
                        >
                            <div>
                                <p className="font-bold capitalize">Enlist {option.color} Tribe</p>
                                <p className="text-xs text-white text-opacity-80">
                                    Remove {cubesToRemove} cube(s), Add {legionsToAdd} legion(s)
                                </p>
                            </div>
                        </button>
                    )
                })}
            </div>
        </Modal>
    );
};

const ReginaFoederataMoveModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        legionsToMove: number;
        barbariansToMove: { [key in DiseaseColor]?: number };
        cardToDiscard?: (PlayerCard & { type: 'city' });
    }) => void;
    modalState: {
        destination: CityName | null;
        actionType: 'March' | 'Sail';
        availableLegions: number;
        availableBarbarians: { [key in DiseaseColor]?: number };
        destinationBarbarians: { [key in DiseaseColor]?: number };
        validCards?: (PlayerCard & { type: 'city' })[];
    };
    gameState: GameState;
}> = ({ show, onClose, onConfirm, modalState, gameState }) => {
    const { destination, actionType, availableLegions, availableBarbarians, destinationBarbarians, validCards } = modalState;

    const [legionsToMove, setLegionsToMove] = useState(0);
    const [barbariansToMove, setBarbariansToMove] = useState<{ [key in DiseaseColor]?: number }>({});
    const [selectedCard, setSelectedCard] = useState<(PlayerCard & { type: 'city' }) | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (show) {
            setLegionsToMove(0);
            setBarbariansToMove({});
            setSelectedCard(validCards && validCards.length === 1 ? validCards[0] : null);
        }
    }, [show, validCards]);

    const totalUnitsSelected = useMemo(() => {
        return legionsToMove + Object.values(barbariansToMove).reduce((sum, count) => sum + (count || 0), 0);
    }, [legionsToMove, barbariansToMove]);

    const handleLegionChange = (change: number) => {
        const newCount = legionsToMove + change;
        if (newCount >= 0 && newCount <= availableLegions && (totalUnitsSelected - legionsToMove + newCount) <= 3) {
            setLegionsToMove(newCount);
        }
    };

    const handleBarbarianChange = (color: DiseaseColor, change: number) => {
        const currentCount = barbariansToMove[color] || 0;
        const newCount = currentCount + change;

        const maxAvailable = availableBarbarians[color] || 0;
        const destinationCount = destinationBarbarians[color] || 0;
        const maxAllowedInDest = 3 - destinationCount;
        const maxCanTake = Math.min(maxAvailable, maxAllowedInDest);

        if (newCount >= 0 && newCount <= maxCanTake && (totalUnitsSelected - currentCount + newCount) <= 3) {
            setBarbariansToMove(prev => ({ ...prev, [color]: newCount }));
        }
    };

    const handleConfirmClick = () => {
        onConfirm({
            legionsToMove,
            barbariansToMove,
            cardToDiscard: selectedCard || undefined,
        });
    };

    const isSailAndNeedsCard = actionType === 'Sail' && validCards && validCards.length > 0;
    const isConfirmDisabled = totalUnitsSelected > 3 || (isSailAndNeedsCard && !selectedCard);

    if (!destination) return null;

    const presentBarbarianColors = (Object.keys(availableBarbarians) as DiseaseColor[]).filter(color => (availableBarbarians[color] || 0) > 0);

    return (
        <Modal title={`Regina Foederata: Special ${actionType}`} show={show} onClose={onClose} maxWidth="max-w-lg">
            <div className="space-y-6">
                <p>Moving to <span className="font-bold">{CITIES_DATA[destination].name}</span>. You may take up to 3 total legions and/or barbarians with you.</p>

                <div className={`p-3 rounded-lg text-center ${totalUnitsSelected > 3 ? 'bg-red-900' : 'bg-gray-900'}`}>
                    <p className="text-sm text-gray-400">Total Units Selected</p>
                    <p className="font-orbitron text-4xl">{totalUnitsSelected} / 3</p>
                </div>

                {/* Legion Selector */}
                {availableLegions > 0 && (
                    <div className="p-3 bg-gray-700 rounded-md">
                        <div className="flex items-center justify-between">
                            <span className="font-bold">Legions ({availableLegions} available)</span>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleLegionChange(-1)} disabled={legionsToMove === 0} className="w-8 h-8 rounded-full bg-gray-600 disabled:opacity-50">-</button>
                                <span className="w-8 text-center font-bold">{legionsToMove}</span>
                                <button onClick={() => handleLegionChange(1)} disabled={legionsToMove >= availableLegions || totalUnitsSelected >= 3} className="w-8 h-8 rounded-full bg-gray-600 disabled:opacity-50">+</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Barbarian Selectors */}
                {presentBarbarianColors.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="font-bold">Barbarians to Take</h3>
                        {presentBarbarianColors.map(color => {
                            const available = availableBarbarians[color] || 0;
                            const inDest = destinationBarbarians[color] || 0;
                            const maxCanTake = Math.min(available, 3 - inDest);
                            const currentSelection = barbariansToMove[color] || 0;
                            return (
                                <div key={color} className="p-3 bg-gray-700 rounded-md">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className={`font-bold capitalize ${DISEASE_TEXT_COLOR_MAP[color]}`}>{color}</span>
                                            <span className="text-xs text-gray-400 ml-2">({available} available, dest has {inDest})</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleBarbarianChange(color, -1)} disabled={currentSelection === 0} className="w-8 h-8 rounded-full bg-gray-600 disabled:opacity-50">-</button>
                                            <span className="w-8 text-center font-bold">{currentSelection}</span>
                                            <button onClick={() => handleBarbarianChange(color, 1)} disabled={currentSelection >= maxCanTake || totalUnitsSelected >= 3} className="w-8 h-8 rounded-full bg-gray-600 disabled:opacity-50">+</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Card Selector for Sail */}
                {isSailAndNeedsCard && (
                    <div>
                        <h3 className="text-lg font-bold mb-2">Select Card to Discard for Sail</h3>
                        <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-2">
                            {validCards!.map(card => {
                                const isSelected = selectedCard?.name === card.name && selectedCard?.color === card.color;
                                return (
                                    <div
                                        key={`${card.name}-${card.color}`}
                                        onClick={() => setSelectedCard(card)}
                                        className={`cursor-pointer rounded-lg overflow-hidden h-28 transition-all duration-200 ${isSelected ? 'ring-4 ring-yellow-400' : 'ring-2 ring-transparent'}`}
                                    >
                                        <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleConfirmClick}
                    disabled={isConfirmDisabled}
                    className="w-full mt-6 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
                >
                    Confirm {actionType}
                </button>
            </div>
        </Modal>
    );
};

const FabrumFlightModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: { destination: CityName; cardToDiscard: PlayerCard & { type: 'city' }; legionsToMove: number }) => void;
    gameState: GameState;
    destination: CityName | null;
}> = ({ show, onClose, onConfirm, gameState, destination }) => {
    const [selectedCard, setSelectedCard] = useState<(PlayerCard & { type: 'city' }) | null>(null);
    const [legionsToMove, setLegionsToMove] = useState(0);

    const player = gameState.players[gameState.currentPlayerIndex];
    const cityCards = player.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];
    const availableLegions = (gameState.legions || []).filter(l => l === player.location).length;
    const maxLegions = Math.min(3, availableLegions);

    useEffect(() => {
        if (show) {
            setSelectedCard(null);
            setLegionsToMove(0);
        }
    }, [show]);

    const handleConfirmClick = () => {
        if (selectedCard && destination) {
            onConfirm({
                destination,
                cardToDiscard: selectedCard,
                legionsToMove,
            });
        }
    };

    if (!destination) return null;

    return (
        <Modal title={`Fortress Transit to ${CITIES_DATA[destination].name}`} show={show} onClose={onClose} titleColor="text-indigo-400">
            <div className="space-y-6">
                {/* Legion Selector */}
                {maxLegions > 0 && (
                    <div>
                        <h3 className="text-lg font-bold mb-2">Take Legions</h3>
                        <p className="text-sm text-gray-400 mb-4">Available legions in current city: {availableLegions}</p>
                        <div className="bg-gray-900 p-4 rounded-lg text-center">
                            <p className="font-orbitron text-5xl text-white mb-2">{legionsToMove}</p>
                            <p className="text-sm text-gray-400 mb-4">Legion(s)</p>
                            <input
                                type="range"
                                min="0"
                                max={maxLegions}
                                value={legionsToMove}
                                onChange={(e) => setLegionsToMove(parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {/* Card Selector */}
                <div>
                    <h3 className="text-lg font-bold mb-2">Select Card to Discard</h3>
                    <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-2">
                        {cityCards.map(card => {
                            const isSelected = selectedCard?.name === card.name && selectedCard?.color === card.color;
                            return (
                                <div
                                    key={`${card.name}-${card.color}`}
                                    onClick={() => setSelectedCard(card)}
                                    className={`cursor-pointer rounded-lg overflow-hidden h-28 transition-all duration-200 ${isSelected ? 'ring-4 ring-yellow-400' : 'ring-2 ring-transparent'}`}
                                >
                                    <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button
                    onClick={handleConfirmClick}
                    disabled={!selectedCard}
                    className="w-full mt-6 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
                >
                    Confirm Transit
                </button>
            </div>
        </Modal>
    );
};

const PraefectusRecruitModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (cardToDiscard: PlayerCard & { type: 'city' }, legionsToAdd: number) => void;
    validCards: (PlayerCard & { type: 'city' })[];
    availableLegions: number;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, validCards, availableLegions, gameState }) => {
    const [selectedCard, setSelectedCard] = useState<(PlayerCard & { type: 'city' }) | null>(null);
    const [legionsToAdd, setLegionsToAdd] = useState(1);

    const showCardSelector = validCards.length > 1;
    const showLegionSelector = availableLegions >= 2;

    useEffect(() => {
        if (show) {
            // Pre-select card if there's only one option
            setSelectedCard(validCards.length === 1 ? validCards[0] : null);
            // Default to max legions available if it's less than 2
            setLegionsToAdd(availableLegions >= 2 ? 2 : availableLegions);
        }
    }, [show, validCards, availableLegions]);

    const handleConfirmClick = () => {
        if (selectedCard) {
            onConfirm(selectedCard, legionsToAdd);
        }
    };

    const isConfirmDisabled = !selectedCard;

    return (
        <Modal title="Recruit Legions (Port)" show={show} onClose={onClose} titleColor="text-sky-400">
            <div className="space-y-6">
                {showCardSelector && (
                    <div>
                        <h3 className="text-lg font-bold mb-2">Select Card to Discard</h3>
                        <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-2">
                            {validCards.map(card => {
                                const isSelected = selectedCard?.name === card.name && selectedCard?.color === card.color;
                                return (
                                    <div
                                        key={`${card.name}-${card.color}`}
                                        onClick={() => setSelectedCard(card)}
                                        className={`cursor-pointer rounded-lg overflow-hidden h-28 transition-all duration-200 ${isSelected ? 'ring-4 ring-yellow-400' : 'ring-2 ring-transparent'}`}
                                    >
                                        <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {!showCardSelector && selectedCard && (
                     <div className="p-3 bg-gray-900 rounded-lg text-center">
                        <p>Card to discard:</p>
                        <div className="w-24 h-32 mx-auto mt-2">
                            <PlayerCardDisplay card={selectedCard} isLarge={false} gameType={gameState.gameType} />
                        </div>
                    </div>
                )}
                
                {showLegionSelector && (
                    <div>
                        <h3 className="text-lg font-bold mb-2">Select Legions to Add</h3>
                        <div className="flex justify-center space-x-4">
                            <button onClick={() => setLegionsToAdd(1)} className={`px-6 py-3 rounded-lg font-bold text-2xl ${legionsToAdd === 1 ? 'bg-sky-600 ring-2 ring-white' : 'bg-gray-700'}`}>1</button>
                            <button onClick={() => setLegionsToAdd(2)} className={`px-6 py-3 rounded-lg font-bold text-2xl ${legionsToAdd === 2 ? 'bg-sky-600 ring-2 ring-white' : 'bg-gray-700'}`}>2</button>
                        </div>
                    </div>
                )}

                {!showLegionSelector && (
                    <div className="p-3 bg-gray-900 rounded-lg text-center">
                        <p>Legions to add: <span className="font-bold text-xl">{legionsToAdd}</span> (supply: {availableLegions})</p>
                    </div>
                )}

                <button
                    onClick={handleConfirmClick}
                    disabled={isConfirmDisabled}
                    className="w-full mt-6 p-2 bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
                >
                    Confirm Recruit
                </button>
            </div>
        </Modal>
    );
};

const ChooseStartingCityModal: React.FC<{
    show: boolean;
    gameState: GameState;
    onConfirm: (city: CityName) => void;
}> = ({ show, gameState, onConfirm }) => {
    
    const cityDataForGame = useMemo(() => {
        switch (gameState.gameType) {
            case 'iberia':
                return IBERIA_CITIES_DATA;
            case 'fallOfRome':
            default:
                return FALLOFROME_CITIES_DATA;
        }
    }, [gameState.gameType]);

    if (!show) return null;

    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player) return null;

    const cityCardsInHand = player.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];
    const hasCityCards = cityCardsInHand.length > 0;

    const title = `Setup: Choose Starting City`;
    const message = `It is ${player.name}'s (${player.role}) turn to choose a starting city.`;
    const rule = hasCityCards
        ? "You must choose a city from a card in your hand."
        : "You have no city cards. You may choose any city on the board.";

    return (
        <Modal title={title} show={show} isSidePanel={true}>
            <p className="mb-2">{message}</p>
            <p className="text-sm text-gray-400 mb-4">{rule}</p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {hasCityCards ? (
                    cityCardsInHand
                        .sort((a, b) => getCardDisplayName(a).localeCompare(getCardDisplayName(b)))
                        .map((card, index) => {
                            const textColor = (card.color === DiseaseColor.Yellow || card.color === DiseaseColor.White) ? 'text-black' : 'text-white';
                            return (
                                <button
                                    key={`${card.name}-${card.color}-${index}`}
                                    onClick={() => onConfirm(card.name)}
                                    className={`w-full p-2 rounded text-left font-semibold transition-colors ${CITY_COLOR_CLASSES[card.color]} hover:opacity-80 ${textColor}`}
                                >
                                    {getCardDisplayName(card)}
                                </button>
                            );
                        })
                ) : (
                    (Object.keys(cityDataForGame) as CityName[])
                        .sort((a, b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name))
                        .map(city => {
                            const cityData = CITIES_DATA[city];
                            const textColor = (cityData.color === DiseaseColor.Yellow || cityData.color === DiseaseColor.White) ? 'text-black' : 'text-white';
                            return (
                                <button
                                    key={city}
                                    onClick={() => onConfirm(city)}
                                    className={`w-full p-2 rounded text-left font-semibold transition-colors ${CITY_COLOR_CLASSES[cityData.color]} hover:opacity-80 ${textColor}`}
                                >
                                    {cityData.name}
                                </button>
                            );
                        })
                )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-700">
                <h3 className="text-lg font-orbitron text-cyan-300 mb-2">All Player Hands</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 bg-black bg-opacity-25 p-2 rounded-lg">
                    {gameState.players.map(p => {
                        const cityCards = p.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];
                        return (
                            <div key={p.id} className="bg-gray-700 p-2 rounded-md">
                                <p className="font-bold text-sm">{p.name} <span className="text-xs text-gray-400">({p.role})</span></p>
                                {cityCards.length > 0 ? (
                                    <div className="grid grid-cols-4 gap-1 mt-1">
                                        {cityCards.map((card, index) => (
                                            <div key={index} className="h-20">
                                                <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 italic mt-1">No city cards in hand.</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};

const BattleModal: React.FC<{
    show: boolean;
    onClose?: () => void;
    modalState: BattleModalState;
    setBattleModalState: React.Dispatch<React.SetStateAction<BattleModalState>>;
    onRoll: (diceToRoll: number) => void;
    onConfirm: (selectedCubes: { [key in DiseaseColor]?: number }) => void;
    onSetResults: (results: BattleDieResult[]) => void;
    gameState: GameState;
}> = ({ show, onClose, modalState, setBattleModalState, onRoll, onConfirm, onSetResults, gameState }) => {
    const { step, maxDice, diceToRoll, results, legionsLost, barbariansToRemove, legionsToAdd } = modalState;
    const player = gameState.players[gameState.currentPlayerIndex];
    const city = CITIES_DATA[player.location];
    const cityCubes = gameState.diseaseCubes[player.location] || {};
    const presentBarbarianColors = useMemo(() => 
        (Object.keys(cityCubes) as DiseaseColor[]).filter(color => (cityCubes[color] || 0) > 0),
        [cityCubes]
    );

    const [diceCount, setDiceCount] = useState(1);
    const [localSelectedCubes, setLocalSelectedCubes] = useState<{ [key in DiseaseColor]?: number }>({});

    const [chosenResults, setChosenResults] = useState<BattleDieResult[]>([]);

    useEffect(() => {
        if (modalState.step === 'chooseAleaIactaEstResults') {
            setChosenResults(Array(diceCount).fill('removeBarbarian'));
        }
    }, [modalState.step, diceCount]);

    const handleChosenResultChange = (index: number, result: BattleDieResult) => {
        setChosenResults(prev => {
            const newResults = [...prev];
            newResults[index] = result;
            return newResults;
        });
    };

    const isAleaIactaEstActive = gameState.aleaIactaEstStatus === 'normal_available' || gameState.aleaIactaEstStatus === 'corrupt_active';
        
        useEffect(() => {
            if (show) {
                setDiceCount(1);
                setLocalSelectedCubes({});
            }
        }, [show]);

    const handleConfirm = () => {
        if (step === 'viewResults') {
            const autoSelection: { [key in DiseaseColor]?: number } = {};
            let remainingToRemove = barbariansToRemove;
            // Auto-select from the most numerous tribe first
            const sortedColors = presentBarbarianColors.sort((a,b) => (cityCubes[b] || 0) - (cityCubes[a] || 0));
            
            for (const color of sortedColors) {
                const available = cityCubes[color] || 0;
                const toRemove = Math.min(remainingToRemove, available);
                if (toRemove > 0) {
                    autoSelection[color] = toRemove;
                    remainingToRemove -= toRemove;
                }
            }
            onConfirm(autoSelection);
        } else if (step === 'selectCubes') {
            onConfirm(localSelectedCubes);
        }
    };

    const handleCubeSelectionChange = (color: DiseaseColor, change: number) => {
        const totalSelected = Object.values(localSelectedCubes).reduce((sum, count) => sum + (count || 0), 0);
        
        setLocalSelectedCubes(prev => {
            const currentCount = prev[color] || 0;
            const availableInCity = cityCubes[color] || 0;
            
            let newCount = currentCount + change;
            newCount = Math.max(0, Math.min(availableInCity, newCount));

            if (change > 0 && totalSelected >= barbariansToRemove) {
                return prev; // Don't allow selecting more than required
            }
            
            return { ...prev, [color]: newCount };
        });
    };

    const totalSelected = Object.values(localSelectedCubes).reduce((sum, count) => sum + (count || 0), 0);
    const isSelectionComplete = totalSelected === barbariansToRemove;

    const renderDieIcon = (result: BattleDieResult) => {
        const player = gameState.players[gameState.currentPlayerIndex];
        const isConsul = player.role === PlayerRole.Consul;
        const isMagisterMilitum = player.role === PlayerRole.MagisterMilitum;
        const isMercator = player.role === PlayerRole.Mercator;
        const isPraefectusClassis = player.role === PlayerRole.PraefectusClassis;
        const isPraefectusFabrum = player.role === PlayerRole.PraefectusFabrum;
        const isReginaFoederata = player.role === PlayerRole.ReginaFoederata;
        const isVestalis = player.role === PlayerRole.Vestalis;


        let specialText = "Role Special (Remove 1 barbarian)";
        if (isConsul) specialText = "Add 1 Legion";
        else if (isMagisterMilitum) specialText = "Remove 2 barbarians";
        else if (isMercator) specialText = "Remove 1 barbarian & 1 legion";
        else if (isPraefectusClassis) specialText = "remove 1 barbarian if in a port";
        else if (isPraefectusFabrum) specialText = "remove 2 barbarians if in a fort";
        else if (isReginaFoederata) specialText = "Remove 1 barbarian & add 1 legion";
        else if (isVestalis) specialText = "Remove 1 legion from your city";
        

        switch (result) {
            case 'loseLegion': return { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-red-500"><path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3zm0 2.53L17.18 7l-5.18 2.22L6.82 7 12 4.53zM5 11.09V7.22l7 3 7-3v3.87c0 4.1-3.11 8.24-7 9.8-3.89-1.56-7-5.7-7-9.8zM8.29 14.71L10.59 17l-1.41 1.41L7 16.59l-2.18 2.18-1.41-1.41L5.59 15l-2.18-2.18 1.41-1.41L7 13.59l2.18-2.18 1.41 1.41L8.29 14.71z"/></svg>, text: "Remove one legion" };
            case 'removeBarbarian': return { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-green-400"><path d="M20.55 5.55l-1.06-1.06-2.12 2.12-2.12-2.12-1.06 1.06 2.12 2.12-2.12 2.12 1.06 1.06 2.12-2.12 2.12 2.12 1.06-1.06-2.12-2.12 2.12-2.12zM12 2L3 5v6c0 5.55 3.84 10.74 9 12 1.95-.45 3.7-1.5 5.14-2.86l-2.92-2.92C13.1 18.07 12.08 18 11 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.08 0 2.1.27 3 .72l2.92-2.92C15.7 3.5 13.95 2.45 12 2z"/></svg>, text: "Remove one barbarian" };
            case 'removeBarbarianAndLoseLegion': return { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-yellow-400"><path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3zM8.29 14.71L10.59 17l-1.41 1.41L7 16.59l-2.18 2.18-1.41-1.41L5.59 15l-2.18-2.18 1.41-1.41L7 13.59l2.18-2.18 1.41 1.41L8.29 14.71zm9.26-6.16l-1.06-1.06-2.12 2.12-2.12-2.12-1.06 1.06 2.12 2.12-2.12 2.12 1.06 1.06 2.12-2.12 2.12 2.12 1.06-1.06-2.12-2.12 2.12-2.12z"/></svg>, text: "Remove 1 barbarian & 1 legion" };
            case 'removeTwoBarbariansAndLoseLegion': return { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-orange-400"><g><path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3zM8.29 14.71L10.59 17l-1.41 1.41L7 16.59l-2.18 2.18-1.41-1.41L5.59 15l-2.18-2.18 1.41-1.41L7 13.59l2.18-2.18 1.41 1.41L8.29 14.71zm9.26-6.16l-1.06-1.06-1.41 1.41-1.41-1.41-1.06 1.06 1.41 1.41-1.41 1.41 1.06 1.06 1.41-1.41 1.41 1.41 1.06-1.06-1.41-1.41 1.41-1.41zm-4.24 0l-1.06-1.06-1.41 1.41-1.41-1.41-1.06 1.06 1.41 1.41-1.41 1.41 1.06 1.06 1.41-1.41 1.41 1.41 1.06-1.06-1.41-1.41 1.41-1.41z"/></g></svg>, text: "Remove 2 barbarians & 1 legion" };
            case 'special': return { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-cyan-400"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>, text: specialText };
        }
    };
    
    const showGainedColumn = legionsToAdd && legionsToAdd > 0;

    const renderChooseAleaIactaEstResults = () => {
        return (
            <div>
                <h3 className="text-lg font-bold mb-2 text-center">Alea Iacta Est: Set Dice Results</h3>
                <p className="text-sm text-gray-400 mb-4 text-center">Choose the outcome for each of the {diceCount} dice.</p>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                    {Array.from({ length: diceCount }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-2">
                            <span className="font-bold">Die {i + 1}:</span>
                            <select
                                value={chosenResults[i] || 'removeBarbarian'}
                                onChange={(e) => handleChosenResultChange(i, e.target.value as BattleDieResult)}
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            >
                                <option value="removeBarbarian">Remove 1 Barbarian</option>
                                <option value="loseLegion">Lose 1 Legion</option>
                                <option value="removeBarbarianAndLoseLegion">Remove 1 Barbarian & Lose 1 Legion</option>
                                <option value="removeTwoBarbariansAndLoseLegion">Remove 2 Barbarians & Lose 1 Legion</option>
                                <option value="special">Role Special</option>
                            </select>
                        </div>
                    ))}
                </div>
                <div className="flex space-x-2 mt-4">
                    <button onClick={() => setBattleModalState(prev => ({ ...prev, step: 'chooseDice' }))} className="w-1/3 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
                    <button onClick={() => onSetResults(chosenResults)} className="w-2/3 p-2 bg-cyan-600 hover:bg-cyan-500 rounded text-white font-bold">
                        Confirm Results
                    </button>
                </div>
            </div>
        );
    };

    return (
        <Modal title={`Battle in ${city.name}`} show={show} onClose={onClose} titleColor="text-red-400">
            {step === 'chooseDice' && (
                <div className="text-center">
                    <h3 className="text-lg font-bold mb-2">Choose Dice to Roll</h3>
                    <p className="text-sm text-gray-400 mb-4">Roll up to 1 die per legion (max {maxDice}).</p>
                    <div className="bg-gray-900 p-4 rounded-lg">
                        <p className="font-orbitron text-5xl text-white mb-2">{diceCount}</p>
                        <p className="text-sm text-gray-400 mb-4">Die / Dice</p>
                        <input
                            type="range"
                            min="1"
                            max={maxDice}
                            value={diceCount}
                            onChange={(e) => setDiceCount(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <button 
                        onClick={() => {
                            playSound('rolldice');
                            onRoll(diceCount);
                        }} 
                        className="w-full mt-6 p-2 bg-red-600 hover:bg-red-500 rounded text-white font-bold"
                    >
                        Roll Dice
                    </button>
                    {isAleaIactaEstActive && (
                        <button onClick={() => setBattleModalState(prev => ({ ...prev, step: 'chooseAleaIactaEstResults' }))} className="w-full mt-2 p-2 bg-cyan-600 hover:bg-cyan-500 rounded text-white font-bold">
                            Use Alea Iacta Est
                        </button>
                    )}
                </div>
            )}

            {step === 'chooseAleaIactaEstResults' && renderChooseAleaIactaEstResults()}

            {(step === 'viewResults' || step === 'selectCubes') && (
                <div>
                    <h3 className="text-lg font-bold mb-2 text-center">Battle Results</h3>
                    <div className="space-y-2 my-4 max-h-32 overflow-y-auto pr-2">
                        {results.map((result, i) => {
                            const { icon, text } = renderDieIcon(result);
                            return (
                                <div key={i} className="flex items-center space-x-3 p-2 bg-gray-900 rounded-lg">
                                    {icon}
                                    <span className="text-sm">{text}</span>
                                </div>
                            )
                        })}
                    </div>
                    <div className={`grid ${showGainedColumn ? 'grid-cols-3' : 'grid-cols-2'} gap-4 text-center mb-4`}>
                        <div className="bg-red-900 p-3 rounded-lg">
                            <p className="text-sm text-red-300">Legions Lost</p>
                            <p className="font-orbitron text-3xl">{legionsLost}</p>
                        </div>
                        {showGainedColumn && (
                             <div className="bg-blue-900 p-3 rounded-lg">
                                <p className="text-sm text-blue-300">Legions Gained</p>
                                <p className="font-orbitron text-3xl">{legionsToAdd}</p>
                            </div>
                        )}
                        <div className="bg-green-900 p-3 rounded-lg">
                            <p className="text-sm text-green-300">Barbarians to Remove</p>
                            <p className="font-orbitron text-3xl">{barbariansToRemove}</p>
                        </div>
                    </div>
                    
                    {step === 'selectCubes' && (
                        <div className="mt-4 border-t border-gray-700 pt-4">
                            <h4 className="font-bold text-center mb-2">Select which barbarians to remove</h4>
                            <p className="text-center text-sm text-gray-400 mb-4">Total Selected: {totalSelected} / {barbariansToRemove}</p>
                            <div className="space-y-3">
                                {presentBarbarianColors.map(color => (
                                    <div key={color} className="flex items-center justify-between p-2 bg-gray-700 rounded-md">
                                        <span className={`font-bold capitalize ${DISEASE_TEXT_COLOR_MAP[color]}`}>{color} ({cityCubes[color]} present)</span>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleCubeSelectionChange(color, -1)} className="w-8 h-8 rounded-full bg-gray-600">-</button>
                                            <span className="w-8 text-center font-bold">{localSelectedCubes[color] || 0}</span>
                                            <button onClick={() => handleCubeSelectionChange(color, 1)} className="w-8 h-8 rounded-full bg-gray-600">+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleConfirm}
                        disabled={step === 'selectCubes' && !isSelectionComplete}
                        className="w-full mt-6 p-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
                    >
                        Confirm Results
                    </button>
                </div>
            )}
        </Modal>
    );
};

const EnlistBarbariansModal: React.FC<{
    show: boolean;
    onClose: () => void;
    options: { color: DiseaseColor, cards: (PlayerCard & { type: 'city' })[] }[];
    onConfirm: (payload: { cardToDiscard: PlayerCard & { type: 'city' } }) => void;
    gameState: GameState;
}> = ({ show, onClose, options, onConfirm, gameState }) => {
    const [selectedColor, setSelectedColor] = useState<DiseaseColor | null>(null);
    const player = gameState.players[gameState.currentPlayerIndex];

    useEffect(() => {
        // If there's only one option, pre-select it
        if (options.length === 1) {
            setSelectedColor(options[0].color);
        } else {
            setSelectedColor(null);
        }
    }, [options]);

    const handleConfirm = (card: PlayerCard & { type: 'city' }) => {
        onConfirm({ cardToDiscard: card });
    };
    
    const renderCardSelection = (color: DiseaseColor) => {
        const option = options.find(o => o.color === color);
        if (!option) return null;
        
        const cubesToRemove = gameState.diseaseCubes[player.location]?.[color] || 0;
        const availableLegions = 16 - (gameState.legions?.length || 0);
        const legionsToAdd = Math.min(cubesToRemove, availableLegions);

        return (
            <div>
                <p className="mb-4">Select a card to discard to enlist the {color} tribe.</p>
                <div className="p-3 bg-gray-900 rounded-lg text-center mb-4">
                    <p>You will remove <span className="font-bold text-lg">{cubesToRemove}</span> {color} cube(s) and add <span className="font-bold text-lg">{legionsToAdd}</span> legion(s).</p>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-2">
                    {option.cards.map(card => (
                        <div key={`${card.name}-${card.color}`} className="relative">
                            <div className="h-28">
                                <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                            </div>
                            <button 
                                onClick={() => handleConfirm(card)}
                                className="absolute -bottom-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1 rounded-full shadow-lg"
                            >
                                Discard
                            </button>
                        </div>
                    ))}
                </div>
                {options.length > 1 && (
                    <button onClick={() => setSelectedColor(null)} className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-bold">
                        Back to Tribe Selection
                    </button>
                )}
            </div>
        );
    };

    const renderTribeSelection = () => (
        <div>
            <p className="mb-4">Multiple tribes can be enlisted from your city. Choose one:</p>
            <div className="space-y-2">
                {options.map(option => (
                    <button 
                        key={option.color} 
                        onClick={() => setSelectedColor(option.color)}
                        className={`w-full p-3 rounded-md text-left flex items-center space-x-4 transition-colors hover:opacity-90 ${CITY_COLOR_CLASSES[option.color]}`}
                    >
                        <div>
                             <p className="font-bold capitalize">Enlist {option.color} Tribe</p>
                             <p className="text-xs text-white text-opacity-80">{option.cards.length} card(s) available</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <Modal title="Enlist Barbarians" show={show} onClose={onClose}>
            {selectedColor ? renderCardSelection(selectedColor) : renderTribeSelection()}
        </Modal>
    );
};

const SailModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: { legions: number; card: (PlayerCard & { type: 'city' }) | null }) => void;
    destination: CityName | null;
    availableLegions: number;
    validCards: (PlayerCard & { type: 'city' })[];
    gameState: GameState;
    T: any
}> = ({ show, onClose, onConfirm, destination, availableLegions, validCards, gameState, T }) => {
    const [numLegions, setNumLegions] = useState(0);
    const [selectedCard, setSelectedCard] = useState<(PlayerCard & { type: 'city' }) | null>(null);

    const isPraefectusSail = validCards.length === 0;
    const showLegionSelector = availableLegions > 0;
    const showCardSelector = !isPraefectusSail && validCards.length > 1;

    const maxLegionsToMove = Math.min(availableLegions, 3);

    useEffect(() => {
        if (show) {
            setNumLegions(0);
            setSelectedCard(validCards.length === 1 ? validCards[0] : null);
        }
    }, [show, validCards]);

    const handleConfirmClick = () => {
        if (isPraefectusSail) {
            onConfirm({ legions: numLegions, card: null });
            return;
        }
        const cardToDiscard = selectedCard || (validCards.length === 1 ? validCards[0] : null);
        if (cardToDiscard) {
            onConfirm({ legions: numLegions, card: cardToDiscard });
        }
    };

    if (!destination) return null;
    const destinationCity = CITIES_DATA[destination];

    const isConfirmDisabled = !isPraefectusSail && !selectedCard;

    return (
        <Modal
            title={`${T.moveSea} to ${destinationCity.name}`}
            show={show}
            onClose={onClose}
        >
            <div className="space-y-6">
                {showLegionSelector && (
                    <div>
                        <h3 className="text-lg font-bold mb-2">Take Legions</h3>
                        <p className="text-sm text-gray-400 mb-4">Available legions in current city: {availableLegions}</p>
                        <div className="bg-gray-900 p-4 rounded-lg text-center">
                            <p className="font-orbitron text-5xl text-white mb-2">{numLegions}</p>
                            <p className="text-sm text-gray-400 mb-4">Legion(s)</p>
                            <input
                                type="range"
                                min="0"
                                max={maxLegionsToMove}
                                value={numLegions}
                                onChange={(e) => setNumLegions(parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {showCardSelector && (
                    <div>
                        <h3 className="text-lg font-bold mb-2">Select Card to Discard</h3>
                        <p className="text-sm text-gray-400 mb-4">You have multiple cards that can be used for this action. Please choose one.</p>
                        <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-2">
                            {validCards.map(card => {
                                const isSelected = selectedCard?.name === card.name && selectedCard?.color === card.color;
                                return (
                                    <div
                                        key={`${card.name}-${card.color}`}
                                        onClick={() => setSelectedCard(card)}
                                        className={`cursor-pointer rounded-lg overflow-hidden h-28 transition-all duration-200 ${isSelected ? 'ring-4 ring-yellow-400' : 'ring-2 ring-transparent'}`}
                                    >
                                        <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {!isPraefectusSail && !showCardSelector && validCards.length === 1 && (
                    <div className="p-3 bg-gray-900 rounded-lg text-center">
                        <p>Card to discard:</p>
                        <div className="w-24 h-32 mx-auto mt-2">
                            <PlayerCardDisplay card={validCards[0]} isLarge={false} gameType={gameState.gameType} />
                        </div>
                    </div>
                )}
                
                {isPraefectusSail && (
                    <div className="p-3 bg-cyan-900 rounded-lg text-center">
                        <p className="font-bold text-cyan-300">Praefectus Classis Ability</p>
                        <p className="text-sm text-gray-300">No card discard is required for this action.</p>
                    </div>
                )}


                <button
                    onClick={handleConfirmClick}
                    disabled={isConfirmDisabled}
                    className="w-full mt-6 p-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
                >
                    Confirm {T.moveSea}
                </button>
            </div>
        </Modal>
    );
};

const RailwaymanTrainModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (passengerId: number | null) => void;
    destination: CityName | null;
    passengers: Player[];
}> = ({ show, onClose, onConfirm, destination, passengers }) => {
    if (!destination) return null;

    return (
        <Modal title="Railwayman: Take Passenger" show={show} onClose={onClose}>
            <p className="mb-4">Moving by train to <span className="font-bold">{CITIES_DATA[destination].name}</span>.</p>
            <p className="mb-4">You may take one other pawn from your city with you. Select a passenger or travel solo.</p>
            <div className="space-y-2">
                <button
                    onClick={() => onConfirm(null)}
                    className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left font-bold"
                >
                    Travel Solo
                </button>
                {passengers.map(pawn => (
                    <button
                        key={pawn.id}
                        onClick={() => onConfirm(pawn.id)}
                        className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left"
                    >
                        Take {pawn.name} ({pawn.role})
                    </button>
                ))}
            </div>
        </Modal>
    );
};

const SailorPassengerModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (passengerId: number | null) => void;
    destination: CityName | null;
    passengers: Player[];
}> = ({ show, onClose, onConfirm, destination, passengers }) => {
    if (!destination) return null;

    return (
        <Modal title="Sailor: Take Passenger" show={show} onClose={onClose}>
            <p className="mb-4">Moving by ship to <span className="font-bold">{CITIES_DATA[destination].name}</span>.</p>
            <p className="mb-4">You may take one other pawn from your city with you. Select a passenger or travel solo.</p>
            <div className="space-y-2">
                <button
                    onClick={() => onConfirm(null)}
                    className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left font-bold"
                >
                    Travel Solo
                </button>
                {passengers.map(pawn => (
                    <button
                        key={pawn.id}
                        onClick={() => onConfirm(pawn.id)}
                        className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left"
                    >
                        Take {pawn.name} ({pawn.role})
                    </button>
                ))}
            </div>
        </Modal>
    );
};


const MarchModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (numLegions: number) => void;
    destination: CityName | null;
    availableLegions: number;
    maxToMove: number;
}> = ({ show, onClose, onConfirm, destination, availableLegions, maxToMove }) => {
    const [numLegions, setNumLegions] = useState(0);
    const maxAllowed = Math.min(availableLegions, maxToMove);

    useEffect(() => {
        if (show) {
            setNumLegions(0); // Reset on open
        }
    }, [show]);

    if (!destination) return null;

    const destinationCity = CITIES_DATA[destination];

    return (
        <Modal
            title={`March to ${destinationCity.name}`}
            show={show}
            onClose={onClose}
        >
            <p className="mb-4">Select how many legions to take with you.</p>
            <p className="text-sm text-gray-400 mb-4">Available legions in current city: {availableLegions}</p>

            <div className="bg-gray-900 p-4 rounded-lg text-center">
                <p className="font-orbitron text-5xl text-white mb-2">{numLegions}</p>
                <p className="text-sm text-gray-400 mb-4">Legion(s)</p>
                <input
                    type="range"
                    min="0"
                    max={maxAllowed}
                    value={numLegions}
                    onChange={(e) => setNumLegions(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    disabled={maxAllowed === 0}
                />
            </div>
            
            <button
                onClick={() => onConfirm(numLegions)}
                className="w-full mt-6 p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold"
            >
                Confirm March
            </button>
        </Modal>
    );
};


const FortRelocationModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (cityToRemove: CityName) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const cityToAdd = gameState.fortRelocationTargetCity;
    if (!cityToAdd) return null;

    const cityDataToAdd = CITIES_DATA[cityToAdd];

    return (
        <Modal
            title="Relocate Fort"
            show={show}
            onClose={onClose}
            titleColor="text-yellow-700"
        >
            <p className="mb-1">All forts are in use.</p>
            <p className="mb-4">To fortify <span className={`font-bold ${DISEASE_TEXT_COLOR_MAP[cityDataToAdd.color]}`}>{cityDataToAdd.name}</span>, you must move an existing one.</p>
            <p className="mb-4 text-sm font-bold">Please select a fort to move:</p>

            <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
                {gameState.forts.sort((a,b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name)).map(cityName => {
                    const cityData = CITIES_DATA[cityName];
                    const cityCubes = gameState.diseaseCubes[cityName];
                    return (
                        <button
                            key={cityName}
                            onClick={() => onConfirm(cityName)}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-between text-left w-full"
                        >
                            <span className={`font-semibold ${DISEASE_TEXT_COLOR_MAP[cityData.color]}`}>
                                {cityData.name}
                            </span>
                            <CubeDisplay cubes={cityCubes} />
                        </button>
                    )
                })}
            </div>
             <button
                onClick={onClose}
                className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-bold"
            >
                Cancel Fortify
            </button>
        </Modal>
    );
};

const DISEASE_COLOR_VALUES: Record<DiseaseColor, string> = {
  [DiseaseColor.Blue]: '#3b82f6', // blue-500
  [DiseaseColor.Yellow]: '#facc15', // yellow-400
  [DiseaseColor.Black]: '#6b7280', // gray-500
  [DiseaseColor.Red]: '#dc2626', // red-600
  [DiseaseColor.Purple]: '#9333ea', // purple-600
  [DiseaseColor.White]: '#e5e7eb', // gray-200
  [DiseaseColor.Green]: '#22c55e', // green-500
  [DiseaseColor.Orange]: '#f97316', // orange-500
};

const MigrationPathMap: React.FC<{
  path: (CityName | keyof typeof FALLOFROME_BARBARIAN_SUPPLY_DATA)[];
  tribe: DiseaseColor;
}> = ({ path, tribe }) => {
    if (path.length < 2) return null;

    const allLocations = { ...CITIES_DATA, ...FALLOFROME_BARBARIAN_SUPPLY_DATA };

    const coords = path.map(p => allLocations[p as keyof typeof allLocations].coords);
    
    // Calculate bounding box with some padding
    const padding = 10;
    const minX = Math.min(...coords.map(c => c.x)) - padding;
    const minY = Math.min(...coords.map(c => c.y)) - padding;
    const maxX = Math.max(...coords.map(c => c.x)) + padding;
    const maxY = Math.max(...coords.map(c => c.y)) + padding;

    const width = maxX - minX;
    const height = maxY - minY;

    if (width <= 0 || height <= 0) return null;

    const viewBox = `${minX} ${minY} ${width} ${height}`;

    return (
        <div className="mt-4 p-2 bg-black bg-opacity-30 rounded-lg border border-gray-700 w-full max-w-sm">
            <h4 className="text-sm font-bold text-center mb-2">Migration Path</h4>
            <svg viewBox={viewBox} className="w-full h-auto" style={{ maxHeight: '200px' }} preserveAspectRatio="xMidYMid meet">
                <path
                    d={coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')}
                    stroke={DISEASE_COLOR_VALUES[tribe]}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray="4 2"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                />

                {coords.map((c, index) => {
                    const locationName = path[index];
                    const displayName = allLocations[locationName as keyof typeof allLocations].name;
                    const isStart = index === 0;
                    const isEnd = index === path.length - 1;

                    return (
                        <g key={`marker-${index}`} onMouseEnter={(e) => {
                            const tooltip = e.currentTarget.querySelector('text');
                            if (tooltip) tooltip.setAttribute('visibility', 'visible');
                        }} onMouseLeave={(e) => {
                            const tooltip = e.currentTarget.querySelector('text');
                            if (tooltip) tooltip.setAttribute('visibility', 'hidden');
                        }}>
                             <circle 
                                cx={c.x} 
                                cy={c.y} 
                                r="5" 
                                fill="transparent" 
                                vectorEffect="non-scaling-stroke"
                            />
                            {isStart ? (
                                <rect 
                                    x={c.x - 2} 
                                    y={c.y - 2} 
                                    width="4" 
                                    height="4" 
                                    fill={DISEASE_COLOR_VALUES[tribe]} 
                                    stroke="white" 
                                    strokeWidth="0.5" 
                                    vectorEffect="non-scaling-stroke"
                                    className="pointer-events-none"
                                />
                            ) : isEnd ? (
                                <circle 
                                    cx={c.x} 
                                    cy={c.y} 
                                    r="2.5" 
                                    fill="white" 
                                    stroke={DISEASE_COLOR_VALUES[tribe]} 
                                    strokeWidth="1" 
                                    vectorEffect="non-scaling-stroke"
                                    className="pointer-events-none"
                                />
                            ) : (
                                <circle
                                    cx={c.x}
                                    cy={c.y}
                                    r="1.5"
                                    fill={DISEASE_COLOR_VALUES[tribe]}
                                    stroke="rgba(255, 255, 255, 0.7)"
                                    strokeWidth="0.5"
                                    vectorEffect="non-scaling-stroke"
                                    className="pointer-events-none"
                                />
                            )}
                             <text
                                x={c.x}
                                y={c.y - 4} // Position above the point
                                fill="white"
                                textAnchor="middle"
                                fontSize="4"
                                stroke="black"
                                strokeWidth="0.2"
                                paintOrder="stroke"
                                visibility="hidden"
                                vectorEffect="non-scaling-stroke"
                                className="pointer-events-none"
                            >
                                {displayName}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};


const CubeDisplay: React.FC<{ cubes: { [key in DiseaseColor]?: number } | undefined }> = ({ cubes }) => {
    if (!cubes || Object.values(cubes).every(c => c === 0 || c === undefined)) {
        return null;
    }
    const sortedCubes = Object.entries(cubes).filter(([, count]) => count && count > 0).sort(([colorA], [colorB]) => colorA.localeCompare(colorB));

    return (
        <div className="flex items-center space-x-1.5">
            {sortedCubes.map(([color, count]) => (
                <span key={color} className={`flex items-center justify-center text-xs font-bold w-5 h-5 rounded-sm text-white shadow-md border border-gray-900 ${CITY_COLOR_CLASSES[color as DiseaseColor]}`}>
                    {count}
                </span>
            ))}
        </div>
    );
};

const StationRelocationModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (cityToRemove: CityName) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const cityToAdd = gameState.stationRelocationTargetCity;
    if (!cityToAdd) return null;

    const cityDataToAdd = CITIES_DATA[cityToAdd];

    return (
        <Modal
            title="Relocate Research Station"
            show={show}
            onClose={onClose}
            titleColor="text-orange-400"
        >
            <p className="mb-1">All research stations are in use.</p>
            <p className="mb-4">To build a new station in <span className={`font-bold ${DISEASE_TEXT_COLOR_MAP[cityDataToAdd.color]}`}>{cityDataToAdd.name}</span>, you must remove an existing one.</p>
            <p className="mb-4 text-sm font-bold">Please select a station to move:</p>

            <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
                {gameState.researchStations.sort((a,b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name)).map(cityName => {
                    const cityData = CITIES_DATA[cityName];
                    const cityCubes = gameState.diseaseCubes[cityName];
                    return (
                        <button
                            key={cityName}
                            onClick={() => onConfirm(cityName)}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-between text-left w-full"
                        >
                            <span className={`font-semibold ${DISEASE_TEXT_COLOR_MAP[cityData.color]}`}>
                                {cityData.name}
                            </span>
                            <CubeDisplay cubes={cityCubes} />
                        </button>
                    )
                })}
            </div>
             <button
                onClick={onClose}
                className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-bold"
            >
                Cancel Build
            </button>
        </Modal>
    );
};

const PostCureActionModal: React.FC<{
    show: boolean;
    onSkip: () => void;
    curedColor: DiseaseColor | null;
    playableRVD: { ownerId: number; from: 'hand' | 'contingency' } | null;
    onPlayRVD: (ownerId: number, from: 'hand' | 'contingency') => void;
}> = ({ show, onSkip, curedColor, playableRVD, onPlayRVD }) => {
    if (!curedColor) return null;

    return (
        <Modal title="Cure Discovered!" show={show} titleColor="text-cyan-400">
            <p className="mb-4">You have discovered a cure for the <span className={`font-bold capitalize ${DISEASE_TEXT_COLOR_MAP[curedColor]}`}>{curedColor}</span> disease!</p>
            <p className="mb-4">You may now play 'Rapid Vaccine Deployment' if anyone has it.</p>
            <div className="flex flex-col space-y-2">
                {playableRVD && (
                    <button
                        onClick={() => onPlayRVD(playableRVD.ownerId, playableRVD.from)}
                        className="w-full p-2 bg-teal-600 hover:bg-teal-500 rounded text-white font-bold"
                    >
                        Play Rapid Vaccine Deployment
                    </button>
                )}
                <button
                    onClick={onSkip}
                    className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold"
                >
                    Continue Turn
                </button>
            </div>
        </Modal>
    );
};

const ShareKnowledgeModal: React.FC<{
    show: boolean;
    onClose: () => void;
    options: ShareOption[];
    onConfirm: (option: ShareOption) => void;
    players: Player[];
    gameType: 'pandemic' | 'fallOfRome';
}> = ({ show, onClose, options, onConfirm, players, gameType }) => (
    <Modal title={gameType === 'fallOfRome' ? 'Plot' : 'Share Knowledge'} show={show} onClose={onClose}>
        <div className="space-y-3">
            {options.length > 0 ? options.map((option, i) => {
                const fromPlayer = players.find(p => p.id === option.fromPlayerId)!;
                const toPlayer = players.find(p => p.id === option.toPlayerId)!;
                return (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                        <div className="flex items-center">
                            <span className={`w-4 h-4 rounded-full mr-3 ${CITY_COLOR_CLASSES[option.card.color]}`}></span>
                            <div>
                                <p className="font-bold">{option.type === 'give' ? `Give ${getCardDisplayName(option.card)}` : `Take ${getCardDisplayName(option.card)}`}</p>
                                <p className="text-xs text-gray-400">{option.type === 'give' ? `From: You, To: ${toPlayer.name}` : `From: ${fromPlayer.name}, To: You`}</p>
                            </div>
                        </div>
                        <button onClick={() => onConfirm(option)} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1 rounded text-white font-semibold">
                            {option.type === 'give' ? 'Give' : 'Take'}
                        </button>
                    </div>
                );
            }) : <p>No share options available.</p>}
        </div>
    </Modal>
);

const MercatorShareModal: React.FC<{
    show: boolean;
    onClose: () => void;
    options: ShareOption[];
    onConfirm: (option: ShareOption) => void;
    players: Player[];
}> = ({ show, onClose, options, onConfirm, players }) => (
    <Modal title="Mercator: Share Card" show={show} onClose={onClose}>
        <p className="mb-4">Select a card of a color matching your city to give to or take from another player in your city.</p>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {options.length > 0 ? options.map((option, i) => {
                const fromPlayer = players.find(p => p.id === option.fromPlayerId)!;
                const toPlayer = players.find(p => p.id === option.toPlayerId)!;
                const isGiveAction = option.type === 'give';
                return (
                    <div key={`${option.card.name}-${option.card.color}-${i}`} className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                        <div className="flex items-center">
                            <span className={`w-4 h-4 rounded-full mr-3 ${CITY_COLOR_CLASSES[option.card.color]}`}></span>
                            <div>
                                <p className="font-bold">{isGiveAction ? `Give ${getCardDisplayName(option.card)}` : `Take ${getCardDisplayName(option.card)}`}</p>
                                <p className="text-xs text-gray-400">{isGiveAction ? `To: ${toPlayer.name}` : `From: ${fromPlayer.name}`}</p>
                            </div>
                        </div>
                        <button onClick={() => onConfirm(option)} className="bg-teal-600 hover:bg-teal-500 px-4 py-1 rounded text-white font-semibold">
                            {isGiveAction ? 'Give' : 'Take'}
                        </button>
                    </div>
                );
            }) : <p className="text-center text-gray-400">No share options available.</p>}
        </div>
    </Modal>
);

const DispatchSummonModal: React.FC<{
    show: boolean;
    onClose: () => void;
    gameState: GameState;
    onConfirm: (pawnId: number, city: CityName) => void;
}> = ({ show, onClose, gameState, onConfirm }) => {
    const [step, setStep] = useState<'select_pawn' | 'select_destination'>('select_pawn');
    const [pawnToMoveId, setPawnToMoveId] = useState<number | undefined>();
    const [possibleDestinations, setPossibleDestinations] = useState<CityName[]>([]);

    const handlePawnSelect = (pawnId: number) => {
        const pawnToMove = gameState.players.find(p => p.id === pawnId);
        if (!pawnToMove) return;

        const destinationCities = new Set<CityName>();
        gameState.players.forEach(p => {
            destinationCities.add(p.location);
        });
        
        // A pawn cannot be summoned to its own location
        destinationCities.delete(pawnToMove.location);

        setPossibleDestinations(Array.from(destinationCities));
        setPawnToMoveId(pawnId);
        setStep('select_destination');
    };

    const handleClose = () => {
        setStep('select_pawn');
        setPawnToMoveId(undefined);
        onClose();
    };

    return (
        <Modal title="Dispatcher: Summon Pawn" show={show} onClose={handleClose}>
            {step === 'select_pawn' && (
                <div className="space-y-2">
                    <p>Select a pawn to move to another player's city.</p>
                    {gameState.players.map(p => (
                        <button key={p.id} onClick={() => handlePawnSelect(p.id)} className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left transition-colors">
                            <span className="font-bold">Move {p.name}</span>
                            <span className="text-xs text-gray-400 block">From: {CITIES_DATA[p.location].name}</span>
                        </button>
                    ))}
                </div>
            )}
            {step === 'select_destination' && pawnToMoveId !== undefined && (
                <div className="space-y-2">
                    <p>Move {gameState.players.find(p => p.id === pawnToMoveId)?.name} to which city?</p>
                    {possibleDestinations.length > 0 ? possibleDestinations.map(city => {
                        const playersInCity = gameState.players.filter(p => p.location === city).map(p => p.name).join(', ');
                        const cityData = CITIES_DATA[city];
                        return (
                            <button
                                key={city}
                                onClick={() => onConfirm(pawnToMoveId, city)}
                                className={`w-full p-3 rounded text-white text-left transition-colors hover:opacity-90 ${CITY_COLOR_CLASSES[cityData.color]}`}
                            >
                                <span className="font-bold">{cityData.name}</span>
                                <span className="text-xs text-white text-opacity-80 block">Occupied by: {playersInCity}</span>
                            </button>
                        );
                    }) : <p className="text-center text-gray-400">No available destinations with other players.</p>}
                     <button onClick={() => setStep('select_pawn')} className="w-full mt-2 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white">Back</button>
                </div>
            )}
        </Modal>
    );
};

const TakeEventCardModal: React.FC<{
    show: boolean;
    onClose: () => void;
    cards: EventCardName[];
    onConfirm: (cardName: EventCardName) => void;
}> = ({ show, onClose, cards, onConfirm }) => (
    <Modal title="Contingency Plan: Retrieve Event" show={show} onClose={onClose}>
        <div className="space-y-2">
            <p>Select an event card from the discard pile to store.</p>
            {cards.length > 0 ? cards.map(cardName => (
                <button key={cardName} onClick={() => onConfirm(cardName)} className="w-full p-2 bg-lime-700 hover:bg-lime-600 rounded">
                    {cardName}
                </button>
            )) : <p>No event cards in discard pile.</p>}
        </div>
    </Modal>
);

const TreatDiseaseModal: React.FC<{
    show: boolean;
    onClose: () => void;
    availableColors: DiseaseColor[];
    onConfirm: (color: DiseaseColor) => void;
}> = ({ show, onClose, availableColors, onConfirm }) => (
    <Modal title="Treat Disease" show={show} onClose={onClose}>
        <p className="mb-4">Multiple diseases are present. Choose one to treat:</p>
        <div className="space-y-2">
            {availableColors.map(color => (
                <button
                    key={color}
                    onClick={() => onConfirm(color)}
                    className={`w-full p-2 rounded text-white font-bold capitalize ${CITY_COLOR_CLASSES[color]}`}
                >
                    Treat {color}
                </button>
            ))}
        </div>
    </Modal>
);

const CollectSampleModal: React.FC<{
    show: boolean;
    onClose: () => void;
    availableColors: DiseaseColor[];
    onConfirm: (color: DiseaseColor) => void;
}> = ({ show, onClose, availableColors, onConfirm }) => (
    <Modal title="Collect Sample" show={show} onClose={onClose}>
        <p className="mb-4">Multiple disease samples are available. Choose one to collect:</p>
        <div className="space-y-2">
            {availableColors.map(color => (
                <button
                    key={color}
                    onClick={() => onConfirm(color)}
                    className={`w-full p-2 rounded text-white font-bold capitalize ${CITY_COLOR_CLASSES[color]}`}
                >
                    Collect {color} Sample
                </button>
            ))}
        </div>
    </Modal>
);

const CureDiseaseModal: React.FC<{
    show: boolean;
    onClose: () => void;
    options: CureOptionForModal[];
    onConfirm: (payload: CureActionPayload) => void;
    gameState: GameState;
}> = ({ show, onClose, options, onConfirm, gameState }) => {
    const [selectedCureOption, setSelectedCureOption] = useState<CureOptionForModal | null>(null);
    const [selectedCards, setSelectedCards] = useState<(PlayerCard & { type: 'city' })[]>([]);

    useEffect(() => {
        if (!show) {
            setSelectedCureOption(null);
            setSelectedCards([]);
        }
    }, [show]);

    const handleCureSelect = (option: CureOptionForModal) => {
        if (option.availableCards.length === option.requiredCount && !option.isVirologistCure && option.color !== DiseaseColor.Purple) {
            onConfirm({
                color: option.color,
                method: option.method,
                cardsToDiscard: option.availableCards,
            });
        } else {
            setSelectedCureOption(option);
        }
    };

    const handleCardToggle = (card: PlayerCard & { type: 'city' }) => {
        setSelectedCards(prev => {
            if (prev.some(c => c.name === card.name && c.color === card.color)) {
                return prev.filter(c => c.name !== card.name || c.color !== card.color);
            }
            if (selectedCureOption && !selectedCureOption.isVirologistCure) {
                if (prev.length < selectedCureOption.requiredCount) {
                    return [...prev, card];
                }
            }
            if (selectedCureOption && selectedCureOption.isVirologistCure) {
                return [...prev, card];
            }
            return prev;
        });
    };

    const handleConfirmSelection = () => {
        if (selectedCureOption) {
            onConfirm({
                color: selectedCureOption.color,
                method: selectedCureOption.method,
                cardsToDiscard: selectedCards,
            });
        }
    };
    
    const { virologistCureValue, isVirologistCureValid } = useMemo(() => {
        if (!selectedCureOption?.isVirologistCure) return { virologistCureValue: 0, isVirologistCureValid: false };
        
        const cureColor = selectedCureOption.color;
        const requiredValue = selectedCureOption.requiredCount;

        const cardGroups = selectedCards.reduce((acc, card) => {
            const color = card.color;
            if (!acc[color]) acc[color] = 0;
            acc[color]++;
            return acc;
        }, {} as Record<DiseaseColor, number>);

        const mainCardsCount = cardGroups[cureColor] || 0;
        let replacementValue = 0;
        Object.entries(cardGroups).forEach(([color, count]) => {
            if (color !== cureColor) {
                replacementValue += Math.floor(count / 2);
            }
        });
        const totalValue = mainCardsCount + replacementValue;
        return { virologistCureValue: totalValue, isVirologistCureValid: totalValue >= requiredValue };
    }, [selectedCards, selectedCureOption]);

    const { isMutationCureValid } = useMemo(() => {
        if (!selectedCureOption || selectedCureOption.color !== DiseaseColor.Purple) {
            return { isMutationCureValid: false };
        }
        const hasEnoughCards = selectedCards.length === selectedCureOption.requiredCount;
        const hasInfectedCityCard = selectedCards.some(card => 
            (gameState.diseaseCubes[card.name]?.[DiseaseColor.Purple] || 0) > 0
        );
        return { isMutationCureValid: hasEnoughCards && hasInfectedCityCard };
    }, [selectedCards, selectedCureOption, gameState.diseaseCubes]);

    const handleBack = () => {
        setSelectedCureOption(null);
        setSelectedCards([]);
    };
    
    const renderVirologistCureScreen = () => {
        if (!selectedCureOption) return null;
        
        const cardGroups = selectedCureOption.availableCards.reduce((acc, card) => {
            const color = card.color;
            if (!acc[color]) acc[color] = [];
            acc[color].push(card);
            return acc;
        }, {} as Record<DiseaseColor, (PlayerCard & { type: 'city' })[]>);

        return (
             <div>
                <h3 className="font-bold text-lg mb-2">Cure <span className={`capitalize ${DISEASE_TEXT_COLOR_MAP[selectedCureOption.color]}`}>{selectedCureOption.color}</span> Disease (Virologist)</h3>
                <p className="text-sm text-gray-400 mb-2">Discard cards worth {selectedCureOption.requiredCount} points. Each card of the cure color is 1 point. Each pair of any other color is 1 point.</p>
                <div className={`p-2 rounded mb-4 ${isVirologistCureValid ? 'bg-green-800' : 'bg-gray-900'}`}>
                    <p className="text-center font-bold text-lg">Cure Progress: {virologistCureValue} / {selectedCureOption.requiredCount}</p>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {Object.entries(cardGroups).map(([color, cards]) => (
                        <div key={color}>
                            <h4 className={`font-bold text-md capitalize ${DISEASE_TEXT_COLOR_MAP[color as DiseaseColor]}`}>{color} Cards</h4>
                            <div className="grid grid-cols-4 gap-2 mt-1">
                                {cards.map(card => {
                                    const isSelected = selectedCards.some(c => c.name === card.name && c.color === card.color);
                                    return (
                                         <div
                                            key={`${card.name}-${card.color}`}
                                            onClick={() => handleCardToggle(card)}
                                            className={`cursor-pointer rounded-lg overflow-hidden h-24 transition-all duration-200 ${isSelected ? 'ring-4 ring-yellow-400' : 'ring-2 ring-transparent'}`}
                                        >
                                            <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="flex space-x-2 mt-4">
                    <button onClick={handleBack} className="w-1/3 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-bold">Back</button>
                    <button
                        disabled={!isVirologistCureValid}
                        onClick={handleConfirmSelection}
                        className="w-2/3 p-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
                    >
                        Confirm Cure
                    </button>
                </div>
             </div>
        )
    };

    const renderMutationCureScreen = () => {
        if (!selectedCureOption) return null;
        return (
            <div>
                <h3 className="font-bold text-lg mb-2">Cure <span className="capitalize text-purple-400">Purple</span> Disease (Mutation)</h3>
                <p className="text-sm text-gray-400 mb-2">Discard {selectedCureOption.requiredCount} City cards of <span className="font-bold">any</span> color.</p>
                <p className="text-sm text-gray-400 mb-4">At least 1 card must be for a city that currently has purple cubes.</p>
                
                <div className={`p-2 rounded mb-4 text-center ${isMutationCureValid ? 'bg-green-800' : 'bg-gray-900'}`}>
                    <p className="font-bold">Selected {selectedCards.length} of {selectedCureOption.requiredCount} cards.</p>
                    {isMutationCureValid && <p className="text-green-300 text-sm">Requirements met.</p>}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 max-h-56 overflow-y-auto pr-2">
                    {selectedCureOption.availableCards.map(card => {
                        const isSelected = selectedCards.some(c => c.name === card.name && c.color === card.color);
                        const hasPurpleCubes = (gameState.diseaseCubes[card.name]?.[DiseaseColor.Purple] || 0) > 0;
                        return (
                            <div key={`${card.name}-${card.color}`} className="relative">
                                <div
                                    onClick={() => handleCardToggle(card)}
                                    className={`cursor-pointer rounded-lg overflow-hidden h-28 transition-all duration-200 ${isSelected ? 'ring-4 ring-yellow-400' : 'ring-2 ring-transparent'}`}
                                >
                                    <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                                </div>
                                {hasPurpleCubes && <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-600 border-2 border-white" title="Has purple cubes"></div>}
                            </div>
                        );
                    })}
                </div>
                
                <div className="flex space-x-2 mt-4">
                    <button onClick={handleBack} className="w-1/3 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-bold">Back</button>
                    <button
                        disabled={!isMutationCureValid}
                        onClick={handleConfirmSelection}
                        className="w-2/3 p-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
                    >
                        Confirm Cure
                    </button>
                </div>
            </div>
        )
    };

    const modalTitle = gameState.gameType === 'fallOfRome' ? 'Forge Alliance' : 'Discover a Cure';

    return (
        <Modal title={modalTitle} show={show} onClose={onClose}>
            {!selectedCureOption ? (
                <div className="space-y-3">
                    {options.length > 0 ? (
                        options.map((option, i) => (
                            <button
                                key={i}
                                onClick={() => handleCureSelect(option)}
                                className={`w-full p-3 rounded-md text-left flex items-center space-x-4 ${CITY_COLOR_CLASSES[option.color]}`}
                            >
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-black bg-opacity-20 flex items-center justify-center font-bold text-2xl">
                                    {option.method === 'samples' ? '🔬' : option.isVirologistCure ? '🧬' : option.color === DiseaseColor.Purple ? '⚛️' : '📁'}
                                </span>
                                <div>
                                    <p className="font-bold capitalize">
                                        {gameState.gameType === 'fallOfRome' ? `Forge Alliance with the ${option.color} tribe` : `Cure ${option.color} Disease`}
                                    </p>
                                    <p className="text-xs">
                                        {option.method === 'samples'
                                            ? `Use 3 Samples + ${option.requiredCount} City Cards`
                                            : option.isVirologistCure ? `Use mixed City Cards (Virologist)`
                                            : option.color === DiseaseColor.Purple ? `Use ${option.requiredCount} mixed City Cards (Mutation)`
                                            : `Use ${option.requiredCount} City Cards`}
                                    </p>
                                </div>
                            </button>
                        ))
                    ) : (
                        <p>{gameState.gameType === 'fallOfRome'
                            ? "You do not meet the requirements to forge an alliance at your current location."
                            : "You don't have the required cards or samples to discover a cure from this research station."
                        }</p>
                    )}
                </div>
            ) : selectedCureOption.isVirologistCure ? renderVirologistCureScreen() : selectedCureOption.color === DiseaseColor.Purple ? renderMutationCureScreen() : (
                <div>
                    <h3 className="font-bold text-lg mb-2">
                        {gameState.gameType === 'fallOfRome' 
                            ? `Select ${selectedCureOption.requiredCount} cards to forge an alliance with the ${selectedCureOption.color} tribe:` 
                            : <>Select {selectedCureOption.requiredCount} <span className={`capitalize ${DISEASE_TEXT_COLOR_MAP[selectedCureOption.color]}`}>{selectedCureOption.color}</span> cards to discard:</>}
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">Selected {selectedCards.length} of {selectedCureOption.requiredCount}.</p>
                    <div className="grid grid-cols-3 gap-2 mb-4 max-h-56 overflow-y-auto pr-2">
                        {selectedCureOption.availableCards.map(card => {
                            const isSelected = selectedCards.some(c => c.name === card.name && c.color === card.color);
                            return (
                                <div
                                    key={`${card.name}-${card.color}`}
                                    onClick={() => handleCardToggle(card)}
                                    className={`cursor-pointer rounded-lg overflow-hidden h-28 transition-all duration-200 ${isSelected ? 'ring-4 ring-yellow-400' : 'ring-2 ring-transparent'}`}
                                >
                                    <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={handleBack} className="w-1/3 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-bold">Back</button>
                        <button
                            disabled={selectedCards.length !== selectedCureOption.requiredCount}
                            onClick={handleConfirmSelection}
                            className="w-2/3 p-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
                        >
                            {gameState.gameType === 'fallOfRome' ? 'Confirm Alliance' : 'Confirm Cure'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

const ExpertFlightModal: React.FC<{
    show: boolean;
    onClose: () => void;
    player: Player;
    destination: CityName;
    onConfirm: (cardName: CityName) => void;
}> = ({ show, onClose, player, destination, onConfirm }) => {
    const cityCards = player.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];

    return (
        <Modal title="Expert Flight" show={show} onClose={onClose}>
            <p className="mb-1">Flying to: <span className="font-bold text-pink-400">{CITIES_DATA[destination].name}</span></p>
            <p className="mb-4 text-sm text-gray-400">Select a city card to discard to complete the flight.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {cityCards.map(card => {
                    return (
                        <button
                            key={`${card.name}-${card.color}`}
                            onClick={() => onConfirm(card.name)}
                            className={`w-full p-3 rounded-md text-left text-white font-bold flex items-center space-x-3 transition-colors hover:opacity-90 ${CITY_COLOR_CLASSES[card.color]}`}
                        >
                            <span>Discard {getCardDisplayName(card)}</span>
                        </button>
                    );
                })}
                 {cityCards.length === 0 && <p className="text-center text-gray-400">You have no city cards to discard.</p>}
            </div>
        </Modal>
    );
};

const EpidemiologistTakeModal: React.FC<{
    show: boolean;
    onClose: () => void;
    options: { player: Player, card: PlayerCard & {type: 'city'} }[];
    onConfirm: (targetPlayerId: number, card: PlayerCard & {type: 'city'}) => void;
}> = ({ show, onClose, options, onConfirm }) => (
    <Modal title="Epidemiologist: Take Card" show={show} onClose={onClose}>
        <p className="mb-4">Once per turn, you may take any City card from a player in the same city.</p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
            {options.length > 0 ? options.map(({ player, card }) => (
                <button
                    key={`${player.id}-${card.name}-${card.color}`}
                    onClick={() => onConfirm(player.id, card)}
                    className="w-full p-3 rounded-md text-left flex items-center space-x-3 bg-gray-700 hover:bg-gray-600"
                >
                    <div className={`w-3 h-3 rounded-sm ${CITY_COLOR_CLASSES[card.color]}`}></div>
                    <div>
                        <span className="font-bold">{getCardDisplayName(card)}</span>
                        <span className="text-xs text-gray-400"> (from {player.name})</span>
                    </div>
                </button>
            )) : <p>No cards available to take.</p>}
        </div>
    </Modal>
);

const ReturnSamplesModal: React.FC<{
    show: boolean;
    onClose: () => void;
    player: Player | null;
    onConfirm: (playerId: number, samples: { [key in DiseaseColor]?: number }) => void;
}> = ({ show, onClose, player, onConfirm }) => {
    const [selection, setSelection] = useState<{[key in DiseaseColor]?: number}>({});
    if (!player) return null;

    const handleConfirm = () => {
        onConfirm(player.id, selection);
        onClose();
    };

    const updateSelection = (color: DiseaseColor, change: number) => {
        setSelection(prev => {
            const currentCount = prev[color] || 0;
            const newCount = Math.max(0, Math.min(player.samples[color] || 0, currentCount + change));
            return { ...prev, [color]: newCount };
        });
    };

    return (
        <Modal title={`Return Samples (${player.name})`} show={show} onClose={onClose} zIndex="z-[60]">
            <p className="mb-4">Return collected samples to the supply at any time.</p>
            <div className="space-y-3">
                {Object.entries(player.samples).filter(([,count]) => count > 0).map(([color, count]) => (
                    <div key={color} className="flex items-center justify-between p-2 bg-gray-700 rounded-md">
                        <span className={`font-bold capitalize ${DISEASE_TEXT_COLOR_MAP[color as DiseaseColor]}`}>{color} ({count} available)</span>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => updateSelection(color as DiseaseColor, -1)} className="w-8 h-8 rounded-full bg-gray-600">-</button>
                            <span className="w-8 text-center font-bold">{selection[color as DiseaseColor] || 0}</span>
                            <button onClick={() => updateSelection(color as DiseaseColor, 1)} className="w-8 h-8 rounded-full bg-gray-600">+</button>
                        </div>
                    </div>
                ))}
            </div>
            <button
                onClick={handleConfirm}
                disabled={Object.values(selection).every(v => !v || v === 0)}
                className="w-full mt-4 p-2 bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
            >
                Return Selected
            </button>
        </Modal>
    );
};

const PilotFlightModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (passengerId: number | null) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const pilot = gameState.players[gameState.currentPlayerIndex];
    const potentialPassengers = gameState.players.filter(p => p.id !== pilot.id && p.location === pilot.location);
    const destination = gameState.pilotFlightDestination;

    if (!destination) return null;

    return (
        <Modal title="Pilot: Special Flight" show={show} onClose={onClose}>
            <div>
                <p className="mb-4">Flying to: <span className="font-bold text-slate-400">{CITIES_DATA[destination].name}</span>. Select one passenger or fly solo.</p>
                 <div className="space-y-2">
                    <button onClick={() => onConfirm(null)} className="w-full p-3 bg-slate-600 hover:bg-slate-500 rounded font-bold">Fly Solo</button>
                    {potentialPassengers.length > 0 ? potentialPassengers.map(p => (
                        <button key={p.id} onClick={() => onConfirm(p.id)} className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left">
                            Take {p.name} as a passenger
                        </button>
                    )) : <p className="text-sm text-center text-gray-500">No other players in your city.</p>}
                </div>
            </div>
        </Modal>
    );
};

const FieldDirectorTreatModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (city: CityName, color: DiseaseColor) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const player = gameState.players[gameState.currentPlayerIndex];

    const treatOptionsByCity = useMemo(() => {
        const options: { [key in CityName]?: { color: DiseaseColor, count: number }[] } = {};
        if (player.role !== PlayerRole.FieldDirector) return options;

        const citiesToCheck = [...new Set([player.location, ...CONNECTIONS[player.location]])];
        
        citiesToCheck.forEach(city => {
            const cityCubes = gameState.diseaseCubes[city];
            if (cityCubes) {
                const colorsInCity: { color: DiseaseColor, count: number }[] = [];
                (Object.keys(cityCubes) as DiseaseColor[]).forEach(color => {
                    const count = cityCubes[color]!;
                    if (count > 0) {
                        colorsInCity.push({ color, count });
                    }
                });
                if (colorsInCity.length > 0) {
                    options[city] = colorsInCity;
                }
            }
        });
        return options;
    }, [gameState.diseaseCubes, player.location, player.role]);

    const sortedCities = Object.keys(treatOptionsByCity).sort((a,b) => CITIES_DATA[a as CityName].name.localeCompare(CITIES_DATA[b as CityName].name));

    return (
        <Modal title="Field Director: Remote Treat" show={show} onClose={onClose}>
             <p className="mb-4">Choose a disease to treat in your current city or an adjacent one.</p>
             <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                 {sortedCities.length > 0 ? sortedCities.map(cityNameStr => {
                    const cityName = cityNameStr as CityName;
                    const options = treatOptionsByCity[cityName]!;
                    return (
                        <div key={cityName} className="p-3 bg-gray-700 rounded-md">
                            <h4 className="font-bold text-lg mb-2">{CITIES_DATA[cityName].name}</h4>
                            <div className="flex flex-wrap gap-2">
                                {options.map(({ color, count }) => (
                                    <button
                                        key={color}
                                        onClick={() => onConfirm(cityName, color)}
                                        className={`px-4 py-2 rounded text-white font-bold capitalize flex items-center space-x-2 ${CITY_COLOR_CLASSES[color]}`}
                                    >
                                        <span>Treat {color}</span>
                                        <span className="text-xs bg-black bg-opacity-30 px-2 py-1 rounded-full">{count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                 }) : <p className="text-center text-gray-400">No diseases to treat nearby.</p>}
             </div>
        </Modal>
    );
};

const FieldDirectorMoveModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (pawnId: number, destination: CityName) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_pawn' | 'select_destination'>('select_pawn');
    const [selectedPawn, setSelectedPawn] = useState<Player | null>(null);

    const fieldDirector = gameState.players[gameState.currentPlayerIndex];
    
    const movablePawns = useMemo(() => {
        const validLocations = new Set([fieldDirector.location, ...CONNECTIONS[fieldDirector.location]]);
        return gameState.players.filter(p =>
            p.id !== fieldDirector.id &&
            p.role !== PlayerRole.Pilot &&
            validLocations.has(p.location)
        );
    }, [gameState.players, fieldDirector]);

    const destinationOptions = useMemo(() => {
        if (!selectedPawn) return [];
        return CONNECTIONS[selectedPawn.location];
    }, [selectedPawn]);

    const handleClose = () => {
        setStep('select_pawn');
        setSelectedPawn(null);
        onClose();
    };

    return (
        <Modal title="Field Director: Move Pawn (Free)" show={show} onClose={handleClose}>
            {step === 'select_pawn' && (
                <div>
                    <p className="mb-4">Select a player to move. (Cannot move the Pilot).</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {movablePawns.map(pawn => (
                             <button key={pawn.id} onClick={() => { setSelectedPawn(pawn); setStep('select_destination'); }} className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left transition-colors">
                                <span className="font-bold">Move {pawn.name}</span>
                                <span className="text-xs text-gray-400 block">From: {CITIES_DATA[pawn.location].name}</span>
                            </button>
                        ))}
                        {movablePawns.length === 0 && <p className="text-center text-gray-400">No eligible pawns nearby.</p>}
                    </div>
                </div>
            )}
            {step === 'select_destination' && selectedPawn && (
                 <div>
                    <p className="mb-4">Move {selectedPawn.name} from {CITIES_DATA[selectedPawn.location].name} to an adjacent city.</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {destinationOptions.map(dest => {
                            const cityData = CITIES_DATA[dest];
                            return (
                                <button
                                    key={dest}
                                    onClick={() => onConfirm(selectedPawn.id, dest)}
                                    className={`w-full p-3 rounded text-white text-left transition-colors hover:opacity-90 ${CITY_COLOR_CLASSES[cityData.color]}`}
                                >
                                    <span className="font-bold">{cityData.name}</span>
                                </button>
                            );
                        })}
                    </div>
                    <button onClick={() => setStep('select_pawn')} className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white">Back</button>
                </div>
            )}
        </Modal>
    );
};

const LocalLiaisonShareModal: React.FC<{
    show: boolean;
    onClose: () => void;
    options: { card: PlayerCard & { type: 'city' }, toPlayer: Player }[];
    onConfirm: (payload: { card: PlayerCard & { type: 'city' }, toPlayerId: number }) => void;
}> = ({ show, onClose, options, onConfirm }) => (
    <Modal title="Local Liaison: Share Card" show={show} onClose={onClose}>
        <p className="mb-4">Select a card to give to a player in any city of the same color. This costs one action.</p>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {options.length > 0 ? options.map((option, i) => {
                return (
                    <button 
                        key={i} 
                        onClick={() => onConfirm({ card: option.card, toPlayerId: option.toPlayer.id })} 
                        className={`w-full p-3 rounded-md text-left flex items-center space-x-4 transition-colors hover:opacity-90 ${CITY_COLOR_CLASSES[option.card.color]}`}
                    >
                        <div>
                            <p className="font-bold">Give {getCardDisplayName(option.card)}</p>
                            <p className="text-xs text-white text-opacity-80">To: {option.toPlayer.name} (in {CITIES_DATA[option.toPlayer.location].name})</p>
                        </div>
                    </button>
                )
            }) : <p className="text-center text-gray-400">No valid sharing options available.</p>}
        </div>
    </Modal>
);

const VirologistTreatModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: { cardToDiscardName: CityName, targetCity: CityName }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_card' | 'select_city'>('select_card');
    const [selectedCard, setSelectedCard] = useState<(PlayerCard & { type: 'city' }) | null>(null);

    const player = gameState.players[gameState.currentPlayerIndex];
    const cityCards = player.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];

    const handleCardSelect = (card: PlayerCard & { type: 'city' }) => {
        setSelectedCard(card);
        setStep('select_city');
    };

    const handleBack = () => {
        setSelectedCard(null);
        setStep('select_card');
    };

    const handleClose = () => {
        handleBack();
        onClose();
    };

    const infectedCities = useMemo(() => {
        if (!selectedCard) return [];
        const cardColor = selectedCard.color;
        return Object.entries(gameState.diseaseCubes)
            .filter(([, cubeData]) => cubeData && (cubeData[cardColor] || 0) > 0)
            .map(([cityName]) => cityName as CityName)
            .sort((a,b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name));
    }, [selectedCard, gameState.diseaseCubes]);

    useEffect(() => {
        if (!show) {
            // Reset internal state when the modal is hidden
            handleBack();
        }
    }, [show]);

    return (
        <Modal title="Virologist: Remote Treat" show={show} onClose={handleClose}>
            {step === 'select_card' ? (
                <div>
                    <p className="mb-4">Discard 1 City Card to remove one cube of its color from any city.</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {cityCards.map(card => {
                            return (
                                <button
                                    key={`${card.name}-${card.color}`}
                                    onClick={() => handleCardSelect(card)}
                                    className={`w-full p-3 rounded-md text-left text-white font-bold flex items-center space-x-3 transition-colors hover:opacity-90 ${CITY_COLOR_CLASSES[card.color]}`}
                                >
                                    <span>Discard {getCardDisplayName(card)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : selectedCard && (
                <div>
                    <p className="mb-4">Discarding {getCardDisplayName(selectedCard)}. Select a city to remove a <span className={`font-bold ${DISEASE_TEXT_COLOR_MAP[selectedCard.color]}`}>{selectedCard.color}</span> cube from:</p>
                     <div className="space-y-1 max-h-60 overflow-y-auto pr-2 bg-gray-900 p-2 rounded p-2 mb-4">
                        {infectedCities.map(cityName => (
                            <button
                                key={cityName}
                                onClick={() => onConfirm({ cardToDiscardName: selectedCard.name, targetCity: cityName })}
                                className="w-full p-2 rounded-md text-left transition-all duration-150 flex items-center justify-between bg-gray-700 hover:bg-gray-600"
                            >
                                <span className={`font-bold ${DISEASE_TEXT_COLOR_MAP[CITIES_DATA[cityName].color]}`}>{CITIES_DATA[cityName].name}</span>
                                <span>{gameState.diseaseCubes[cityName]![selectedCard.color]} cubes</span>
                            </button>
                        ))}
                         {infectedCities.length === 0 && <p className="text-gray-400 text-center">No cities with this disease.</p>}
                    </div>
                     <button onClick={handleBack} className="w-full mt-2 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white">Back</button>
                </div>
            )}
        </Modal>
    );
};


const DiscardModal: React.FC<{
    gameState: GameState;
    getHandLimit: (player: Player) => number;
    onConfirm: (selection: number[]) => void;
    handlePlayEventCard: (cardName: EventCardName, ownerId: number) => void;
    onPlayContingencyCard: (cardName: EventCardName, ownerId: number) => void;
    onViewEventInfo: (cardName: EventCardName) => void;
    onInitiateReturnSamples: (playerId: number) => void;
    onInitiatePlayResilientPopulation: (ownerId: number, from: 'hand' | 'contingency') => void;
    onInitiateVestalisDrawEvent: () => void;
}> = ({ gameState, getHandLimit, onConfirm, handlePlayEventCard, onPlayContingencyCard, onViewEventInfo, onInitiateReturnSamples, onInitiatePlayResilientPopulation, onInitiateVestalisDrawEvent }) => {
    const [discardSelection, setDiscardSelection] = useState<number[]>([]);
    if (gameState.playerToDiscardId === null) return null;

    const player = gameState.players.find(p => p.id === gameState.playerToDiscardId);
    if (!player) return null;

    const handLimit = getHandLimit(player);
    const cardsToDiscardCount = player.hand.length - handLimit;

    const toggleSelection = (cardIndex: number) => {
        setDiscardSelection(prev => {
            if (prev.includes(cardIndex)) return prev.filter(i => i !== cardIndex);
            if (prev.length < cardsToDiscardCount) return [...prev, cardIndex];
            return prev;
        });
    };

    const handleConfirm = () => {
        onConfirm(discardSelection);
        setDiscardSelection([]);
    };

    const handlePlayCardFromHand = (card: PlayerCard & {type: 'event'}) => {
        if (card.name === EventCardName.ResilientPopulation) {
            onInitiatePlayResilientPopulation(player.id, 'hand');
        } else {
            handlePlayEventCard(card.name, player.id);
        }
    };
    
    return (
        <Modal title={`${player.name}, Discard ${cardsToDiscardCount} Card(s)`} show={true}>
            <p className="mb-4">Your hand is over the limit of {handLimit}. Select {cardsToDiscardCount} card(s) to discard, or play an event card.</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
                {player.hand.map((card, index) => (
                    <div key={index} className="relative">
                        <div
                            onClick={() => toggleSelection(index)}
                            className={`rounded-lg overflow-hidden transition-all duration-200 ${discardSelection.includes(index) ? 'ring-4 ring-yellow-400' : 'ring-2 ring-transparent'} cursor-pointer h-full`}
                        >
                            <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                        </div>
                        {card.type === 'event' && card.name !== EventCardName.RapidVaccineDeployment && (
                            <button
                                onClick={() => handlePlayCardFromHand(card as PlayerCard & {type: 'event'})}
                                className="absolute -bottom-2 -right-2 bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
                            > Play </button>
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-4 border-t border-gray-700 pt-4">
                <PlayableEvents gameState={gameState} onPlayEventCard={handlePlayEventCard} onPlayContingencyCard={onPlayContingencyCard} onViewEventInfo={onViewEventInfo} onInitiatePlayResilientPopulation={onInitiatePlayResilientPopulation} />
                <FieldOperativeActions gameState={gameState} onInitiateReturnSamples={onInitiateReturnSamples} />
                <VestalisOutOfTurnActions gameState={gameState} onInitiateVestalisDrawEvent={onInitiateVestalisDrawEvent} />
            </div>
            <button
                disabled={discardSelection.length !== cardsToDiscardCount}
                onClick={handleConfirm}
                className="w-full p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold mt-4"
            > Confirm Discard </button>
        </Modal>
    );
};

const DrawCardsModal: React.FC<{
  show: boolean;
  cards: PlayerCard[];
  onConfirm: () => void;
  outOfTurnActionsComponent: React.ReactNode;
  gameState: GameState;
  onInitiateVestalisDrawEvent: () => void;
}> = ({ show, cards, onConfirm, outOfTurnActionsComponent, gameState, onInitiateVestalisDrawEvent }) => {
    return (
        <Modal title="Cards Drawn" show={show}>
            <p className="mb-4">You have drawn the following cards from the Player Deck:</p>
            <div className="flex justify-center items-center gap-4 mb-4">
                {cards.map((card, index) => (
                    <div key={index} className="w-40 h-56">
                        <PlayerCardDisplay card={card} isLarge gameType={gameState.gameType} />
                    </div>
                ))}
            </div>
            <button onClick={onConfirm} className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold">
                Continue
            </button>
            <div className="mt-4 border-t border-gray-700 pt-4">
                {outOfTurnActionsComponent}
                <VestalisOutOfTurnActions gameState={gameState} onInitiateVestalisDrawEvent={onInitiateVestalisDrawEvent} />
            </div>
        </Modal>
    );
};

const EndOfActionsModal: React.FC<{
  show: boolean;
  onDraw: () => void;
  onUndo: () => void;
  canUndo: boolean;
  outOfTurnActionsComponent: React.ReactNode;
  gameState: GameState;
  onInitiateFieldDirectorMove: () => void;
  onInitiateEpidemiologistTake: () => void;
  onInitiateVestalisDrawEvent: () => void;
}> = ({ show, onDraw, onUndo, canUndo, outOfTurnActionsComponent, gameState, onInitiateFieldDirectorMove, onInitiateEpidemiologistTake, onInitiateVestalisDrawEvent }) => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const T = getTerminology(gameState); // Get the correct terminology
    
    const hasMovableTargets = useMemo(() => {
        if (currentPlayer.role !== PlayerRole.FieldDirector) return false;
        const validLocations = new Set([currentPlayer.location, ...CONNECTIONS[currentPlayer.location]]);
        return gameState.players.some(p =>
            p.id !== currentPlayer.id &&
            p.role !== PlayerRole.Pilot &&
            validLocations.has(p.location)
        );
    }, [gameState.players, currentPlayer]);
    
    const canUseFieldDirectorMove = currentPlayer.role === PlayerRole.FieldDirector && !gameState.hasUsedFieldDirectorMove && hasMovableTargets;

    const canUseEpidemiologistTake = useMemo(() => {
        if (currentPlayer.role !== PlayerRole.Epidemiologist || gameState.hasUsedEpidemiologistAbility) {
            return false;
        }
        return gameState.players.some(p => p.id !== currentPlayer.id && p.location === currentPlayer.location && p.hand.some(c => c.type === 'city'));
    }, [currentPlayer, gameState]);

    const freeActionsAvailable = canUseFieldDirectorMove || canUseEpidemiologistTake;

    // Use the terminology helper to create the dynamic message
    const message = freeActionsAvailable 
        ? `You may use a free action or draw 2 ${T.playerDeck} cards.`
        : `You must now draw 2 ${T.playerDeck} cards.`;

    return (
        <Modal title="End of Actions" show={show}>
            <p className="mb-4">
                You have used all your actions. {message}
            </p>
            <div className="flex flex-col space-y-2">
                {canUseFieldDirectorMove && (
                    <button onClick={onInitiateFieldDirectorMove} className="w-full p-2 bg-rose-600 hover:bg-rose-500 rounded text-white font-semibold">
                        Move Pawn (Free Action)
                    </button>
                )}
                {canUseEpidemiologistTake && (
                    <button onClick={onInitiateEpidemiologistTake} className="w-full p-2 bg-sky-600 hover:bg-sky-500 rounded text-white font-semibold">
                        Take Card (Free Action)
                    </button>
                )}
                <button onClick={onDraw} className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold">
                    Draw {T.playerDeck} Cards
                </button>
                <button onClick={onUndo} disabled={!canUndo} className="w-full p-2 bg-gray-500 hover:bg-gray-400 disabled:bg-gray-700 disabled:text-gray-500 rounded text-white font-bold">
                    Undo Last Action
                </button>
            </div>
            <div className="mt-4 border-t border-gray-700 pt-4">
                {outOfTurnActionsComponent}
                <VestalisOutOfTurnActions gameState={gameState} onInitiateVestalisDrawEvent={onInitiateVestalisDrawEvent} />
            </div>
        </Modal>
    );
};


const InfectionStepModal: React.FC<{
  show: boolean;
  card: InfectionCard | null;
  onConfirm: () => void;
  outOfTurnActionsComponent: React.ReactNode;
  gameState: GameState;
  infectionStepState: { queue: InfectionCard[]; revealedCard: InfectionCard | null; outbreaksThisTurn: Set<CityName>; invadedCity: CityName | null };
  onInitiateVestalisDrawEvent: () => void;
}> = ({ show, card, onConfirm, outOfTurnActionsComponent, gameState, infectionStepState, onInitiateVestalisDrawEvent }) => {
    const T = getTerminology(gameState); // Get the correct terminology

    const migrationSubPath = useMemo(() => {
        if (gameState.gameType !== 'fallOfRome' || !card || card.type !== 'city') {
            return null;
        }
        const cityToFind = card.name;
        const tribeColor = card.color;

        const fullPath = FALLOFROME_MIGRATION_PATHS.find(p => p.tribe === tribeColor && p.path.includes(cityToFind));
        if (!fullPath) return null;

        const cityIndex = fullPath.path.indexOf(cityToFind);
        if (cityIndex === -1) return null;

        return {
            path: fullPath.path.slice(0, cityIndex + 1),
            tribe: tribeColor
        };
    }, [card, gameState.gameType]);

    const modalTitle = `${T.infection} Phase`;
    const result = gameState.lastInfectionResult;

    const renderInvasionResult = () => {
        if (!result) return null;

        const cityData = CITIES_DATA[result.city];
        if (result.defended) {
            return (
                <div className="text-center p-3 bg-green-900 border-2 border-green-700 rounded-lg">
                    <h4 className="font-bold text-lg text-green-300">City Defended!</h4>
                    <p>
                        {result.defenseType === 'attack'
                            ? `Supported legions in ${cityData.name} fought off the invasion!`
                            : `Unsupported legions in ${cityData.name} were ambushed!`}
                    </p>
                    <div className="flex justify-center items-center space-x-6 mt-2">
                        <p className="font-orbitron text-2xl">
                            <span className="text-red-500">-{result.legionsRemoved}</span> Legion(s)
                        </p>
                        <p className="font-orbitron text-xl">
                            <span className="text-green-400">0</span> Cubes Added
                        </p>
                    </div>
                </div>
            );
        }

        const cubesAddedText = result.cubesAdded > 0 ? `+${result.cubesAdded}` : '0';
        const titleText = result.cubesAdded > 0 ? `${T.infection} Successful` : `${T.infection} Prevented`;
        const titleColor = result.cubesAdded > 0 ? 'text-red-300' : 'text-blue-300';
        const bgColor = result.cubesAdded > 0 ? 'bg-red-900 border-red-700' : 'bg-blue-900 border-blue-700';
        const description = result.cubesAdded > 0 
            ? `The ${T.infection.toLowerCase()} of ${cityData.name} by the ${result.color} ${T.disease.toLowerCase()} succeeded.`
            : `The ${T.infection.toLowerCase()} of ${cityData.name} had no effect (e.g., city was quarantined).`;

        return (
            <div className={`text-center p-3 rounded-lg border-2 ${bgColor}`}>
                <h4 className={`font-bold text-lg ${titleColor}`}>{titleText}</h4>
                <p>{description}</p>
                <p className="font-orbitron text-2xl mt-2">
                    <span className="text-white">{cubesAddedText}</span> Cube(s) Added
                </p>
            </div>
        );
    };
    
    return (
        <Modal title={modalTitle} show={show} maxWidth="max-w-lg">
            {card && (
                <div className="flex flex-col" style={{ maxHeight: '85vh' }}>
                    {/* Scrollable Content Area */}
                    <div className="flex-grow overflow-y-auto pr-2">
                        <div className="flex flex-col items-center gap-4">
                            <p className="self-start font-semibold">{T.infection} Card Drawn:</p>
                            <div className="w-40 h-56 flex-shrink-0">
                                <InfectionCardDisplay card={card} gameType={gameState.gameType} />
                            </div>

                            {gameState.gameType === 'fallOfRome' && infectionStepState.invadedCity && card.type === 'city' && (
                                <div className="mt-4 p-3 bg-black bg-opacity-30 rounded-lg border border-gray-700 w-full text-center">
                                    <h4 className="text-sm font-bold text-yellow-400 mb-1">Actual {T.infection} Target</h4>
                                    <p className="text-xl font-orbitron text-white">
                                        → {CITIES_DATA[infectionStepState.invadedCity].name}
                                    </p>
                                    {infectionStepState.invadedCity !== card.name && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            (Redirected from {CITIES_DATA[card.name].name})
                                        </p>
                                    )}
                                </div>
                            )}

                            {migrationSubPath && (
                                <MigrationPathMap path={migrationSubPath.path} tribe={migrationSubPath.tribe} />
                            )}
                            
                             {result && (
                                <div className="w-full border-t border-gray-700 pt-4 mt-2">
                                    <h4 className="text-center font-bold mb-2 text-yellow-400">{T.infection} Result</h4>
                                    <InfectionResultDisplay result={result} gameType={gameState.gameType} T={T} />
                                </div>
                            )}
                            
                            {result?.outbreak && <InfectionResultList title={`Chain Reaction ${T.outbreak}`} results={gameState.outbreakResults} />}

                            <div className="w-full border-t border-gray-700 pt-4 mt-2">
                                {outOfTurnActionsComponent}
                                <VestalisOutOfTurnActions gameState={gameState} onInitiateVestalisDrawEvent={onInitiateVestalisDrawEvent} />
                            </div>
                        </div>
                    </div>

                    {/* Fixed Action Area */}
                    <div className="flex-shrink-0 pt-4 mt-4 border-t border-gray-600">
                        <button onClick={onConfirm} className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold">
                            Continue
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

const EpidemicAnnounceModal: React.FC<{
    show: boolean;
    onConfirm: () => void;
    gameState: GameState;
    onPlayEventCard: (cardName: EventCardName, ownerId: number) => void;
    onPlayContingencyCard: (cardName: EventCardName, ownerId: number) => void;
    onViewEventInfo: (cardName: EventCardName) => void;
    onInitiatePlayResilientPopulation: (ownerId: number, from: 'hand' | 'contingency') => void;
}> = ({ show, onConfirm, gameState, onPlayEventCard, onPlayContingencyCard, onViewEventInfo, onInitiatePlayResilientPopulation }) => {
    const card = gameState.epidemicCardToAnnounce;
    const [report, setReport] = useState<string | null>(null);
    const T = getTerminology(gameState); // Get the correct terminology

    const rates = gameState.gameType === 'fallOfRome' ? FALLOFROME_INVASION_RATES : PANDEMIC_INFECTION_RATES;

    useEffect(() => {
        // Reset report when modal shows or card changes
        setReport(null);
        if (show && card && gameState.useAiNarratives) {
            if (card.type === 'city') {
                // Note: The AI prompt is hardcoded in geminiService and will still use "Epidemic"
                generateEpidemicReport(CITIES_DATA[card.name].name, CITIES_DATA[card.name].color, true).then(setReport);
            } else {
                setReport(`The infection vector seems to be... mutating. The signal is unclear.`);
            }
        }
    }, [show, card, gameState.useAiNarratives]);

    if (!card) return null;

    const newIndex = gameState.infectionRateIndex;
    const oldIndex = newIndex - 1;

    // Handle the edge case where the infection rate is maxed out
    const newRateDisplay = newIndex >= rates.length ? 'MAX' : rates[newIndex];
    // oldIndex is safe because newIndex is at least 1 after first epidemic
    const oldRateDisplay = rates[oldIndex];
    
    const wasOutbreakDuringEpidemic = gameState.epidemicInfectionResults.some(r => r.outbreak);

    return (
        <Modal title={`${T.epidemic.toUpperCase()}!`} show={show} titleColor="text-red-500">
            <div className="space-y-4">
                {/* Increase Step */}
                <div className="p-3 bg-gray-900 rounded-lg text-center">
                    <h3 className="font-orbitron text-lg text-yellow-400 mb-1">1. INCREASE</h3>
                    <p>The {T.infectionRate.toLowerCase()} marker moves from <span className="font-bold">{oldRateDisplay}</span> to <span className="font-bold text-xl text-yellow-300">{newRateDisplay}</span>.</p>
                </div>

                {/* Infect Step */}
                <div className="p-3 bg-gray-900 rounded-lg text-center">
                    <h3 className="font-orbitron text-lg text-red-400 mb-1">2. {T.infect.toUpperCase()}</h3>
                    {card.type === 'city' && (
                        <>
                        <p className="font-semibold text-lg"><span className={`capitalize ${DISEASE_TEXT_COLOR_MAP[card.color]}`}>{CITIES_DATA[card.name].name}</span></p>
                        <p className="text-sm text-gray-400">was drawn from the bottom of the {T.infectionDeck}.</p>
                        </>
                    )}
                    {['fallOfRome', 'iberia'].includes(gameState.gameType) && <InfectionResultList title={`${T.infection} Attempts`} results={gameState.epidemicInfectionResults} />}
                    {wasOutbreakDuringEpidemic && <InfectionResultList title={`Chain Reaction ${T.outbreak}`} results={gameState.outbreakResults} />}
                </div>
                
                {/* AI Report */}
                {gameState.useAiNarratives && (
                    <div className="p-3 bg-black bg-opacity-20 rounded-lg border border-gray-700 min-h-[6rem] flex items-center justify-center">
                        {report ? (
                            <p className="text-base leading-relaxed italic text-gray-300">"{report}"</p>
                        ) : (
                            <p className="animate-pulse text-gray-400">Generating news report...</p>
                        )}
                    </div>
                )}
                
                <div className="border-t border-gray-700 pt-4">
                     <PlayableEvents
                        gameState={gameState}
                        onPlayEventCard={onPlayEventCard}
                        onPlayContingencyCard={onPlayContingencyCard}
                        onViewEventInfo={onViewEventInfo}
                        onInitiatePlayResilientPopulation={onInitiatePlayResilientPopulation}
                    />
                </div>

                <button onClick={onConfirm} className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold mt-2">
                    Intensify {T.infectionDeck}
                </button>
            </div>
        </Modal>
    );
};


const IntensifyModal: React.FC<{
    show: boolean;
    onConfirm: () => void;
    gameState: GameState; // The prop is added here
}> = ({ show, onConfirm, gameState }) => {
    // Get the correct terminology based on the game type
    const T = getTerminology(gameState);

    return (
        <Modal title={`${T.epidemic}: Intensify`} show={show}>
            <p className="mb-4">The {T.infectionDiscard} will be shuffled and placed on top of the {T.infectionDeck}.</p>
            <button onClick={onConfirm} className="w-full p-2 bg-red-600 hover:bg-red-500 rounded text-white font-bold">
                Continue
            </button>
        </Modal>
    );
};

const PostEpidemicEventModal: React.FC<{
    show: boolean;
    onContinue: () => void;
    outOfTurnActionsComponent: React.ReactNode;
    gameState: GameState;
    onInitiateVestalisDrawEvent: () => void;
}> = ({ show, onContinue, outOfTurnActionsComponent, gameState, onInitiateVestalisDrawEvent }) => {
    // Get the correct terminology based on the game type
    const T = getTerminology(gameState);
    const isFallOfRome = gameState.gameType === 'fallOfRome';

    return (
        <Modal title={`Post-${T.epidemic}`} show={show}>
            <p className="mb-4">
                The {T.epidemic} has been resolved.
                {/* Conditionally show the Resilient Population text only for Pandemic */}
                {!isFallOfRome && ` You may now play 'Resilient Population' to remove a card from the ${T.infectionDiscard}.`}
            </p>
            <div className="border-t border-gray-700 pt-4 mb-4">
                {outOfTurnActionsComponent}
                <VestalisOutOfTurnActions gameState={gameState} onInitiateVestalisDrawEvent={onInitiateVestalisDrawEvent} />
            </div>
            <button onClick={onContinue} className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold">
                Continue to {T.infection} Phase
            </button>
        </Modal>
    );
};

const ViewDiscardModal: React.FC<{
    show: boolean;
    onClose: () => void;
    cards: (PlayerCard | InfectionCard)[];
    title: string;
    gameState: GameState;
}> = ({ show, onClose, cards, title, gameState }) => (
    <Modal title={title} show={show} onClose={onClose} isSidePanel={true}>
        <div className="grid grid-cols-2 gap-2">
            {cards.map((card, index) => (
                <div key={index} className="h-40">
                    {('type' in card && 'name' in card && card.type === 'city')
                        ? <InfectionCardDisplay card={card as InfectionCard} gameType={gameState.gameType} />
                        : <PlayerCardDisplay card={card as PlayerCard} isLarge={true} gameType={gameState.gameType} />
                    }
                </div>
            ))}
        </div>
    </Modal>
);

const EventInfoModal: React.FC<{
    show: boolean;
    onClose: () => void;
    cardName: EventCardName | null;
}> = ({ show, onClose, cardName }) => {
    if (!cardName) return null;
    return (
        <Modal title={cardName} show={show} onClose={onClose}>
            <p>{EVENT_CARD_INFO[cardName]}</p>
        </Modal>
    );
};

const TroubleshooterPreviewModal: React.FC<{
    show: boolean;
    onSkip: () => void;
    onConfirm: () => void;
    gameState: GameState;
}> = ({ show, onSkip, onConfirm, gameState }) => {
    const rates = gameState.gameType === 'fallOfRome' ? FALLOFROME_INVASION_RATES : PANDEMIC_INFECTION_RATES;
    const infectionRate = rates[gameState.infectionRateIndex];
    const topCards = gameState.infectionDeck.slice(0, infectionRate);

    return (
        <Modal title="Troubleshooter: Preview" show={show}>
            <p className="mb-4">As the Troubleshooter, you may preview the top {infectionRate} cards of the Infection Deck at the start of your turn.</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
                {topCards.map((card, index) => (
                    <div key={index} className="h-32">
                        <InfectionCardDisplay card={card} gameType={gameState.gameType} />
                    </div>
                ))}
            </div>
            <div className="flex space-x-2">
                <button onClick={onSkip} className="w-full p-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-bold">
                    Skip Preview
                </button>
                <button onClick={onConfirm} className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold">
                    Acknowledge
                </button>
            </div>
        </Modal>
    );
};

const ReExaminedResearchModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (card: PlayerCard & { type: 'city' }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const cityCards = useMemo(() => 
        (gameState.playerDiscard.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[])
            .sort((a, b) => CITIES_DATA[a.name].name.localeCompare(CITIES_DATA[b.name].name)),
        [gameState.playerDiscard]
    );

    return (
        <Modal title="Re-examined Research" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.ReExaminedResearch} />
            <p className="mb-4">Select a City card from the Player Discard Pile to add to your hand.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {cityCards.length > 0 ? cityCards.map(card => (
                    <button
                        key={`${card.name}-${card.color}`}
                        onClick={() => onConfirm(card)}
                        className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded text-left flex items-center"
                    >
                         <div className={`w-4 h-4 rounded-sm mr-3 ${CITY_COLOR_CLASSES[card.color]}`}></div>
                         <span>{getCardDisplayName(card)}</span>
                    </button>
                )) : <p>No City cards in the discard pile.</p>}
            </div>
        </Modal>
    );
};

const ForecastConfirmationModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    if (!gameState.pendingEvent) return null;
    const { ownerId, from } = gameState.pendingEvent;
    const owner = gameState.players.find(p => p.id === ownerId)!;
    const fromText = from === 'contingency' ? `from ${owner.name}'s Contingency Plan` : `from ${owner.name}'s hand`;

    return (
        <Modal
            title="Play Forecast?"
            show={show}
            onClose={onClose}
            titleColor="text-teal-400"
        >
            <p className="mb-4">Are you sure you want to play the Forecast event card {fromText}?</p>
            <p className="text-sm text-gray-400 mb-4">You will look at the top 6 cards of the Infection Deck, rearrange them, and place them back on top.</p>
            <div className="flex space-x-2">
                <button onClick={onClose} className="w-full p-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-bold">
                    Cancel
                </button>
                <button onClick={onConfirm} className="w-full p-2 bg-teal-600 hover:bg-teal-500 rounded text-white font-bold">
                    Confirm & Play
                </button>
            </div>
        </Modal>
    );
};

const ForecastResolutionModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (rearrangedCards: InfectionCard[]) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const rates = gameState.gameType === 'fallOfRome' ? FALLOFROME_INVASION_RATES : PANDEMIC_INFECTION_RATES;
    const numCardsToForecast = Math.min(6, gameState.infectionDeck.length);
    const topCards = useMemo(() => gameState.infectionDeck.slice(0, numCardsToForecast), [gameState.infectionDeck, numCardsToForecast]);
    const [cards, setCards] = useState<InfectionCard[]>([]);

    // --- Drag and drop state ---
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        if (show) {
            setCards(topCards);
        }
    }, [show, topCards]);

    // --- Drag and drop handlers ---
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        if (dragItem.current === null || dragItem.current === index) return;
        
        dragOverItem.current = index;
        const newCards = [...cards];
        const draggedItemContent = newCards[dragItem.current];
        newCards.splice(dragItem.current, 1);
        newCards.splice(dragOverItem.current, 0, draggedItemContent);
        
        dragItem.current = dragOverItem.current;
        dragOverItem.current = null;
        
        setCards(newCards);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        dragItem.current = null;
        dragOverItem.current = null;
        e.currentTarget.classList.remove('opacity-50');
    };

    return (
        <Modal
            title="Forecast: Rearrange Cards"
            show={show}
            onClose={onClose}
            titleColor="text-teal-400"
        >
            <EventCardImage cardName={EventCardName.Forecast} />
            <p className="mb-4">Drag and drop to reorder the top {numCardsToForecast} cards of the Infection Deck. The card at the top will be drawn first.</p>
            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto pr-2">
                {cards.map((card, index) => {
                    const cityCubes = card.type === 'city' ? gameState.diseaseCubes[card.name] : undefined;
                    return (
                        <div
                            key={`${card.type}-${'name' in card ? card.name : ''}-${index}`}
                            className="flex items-center p-2 bg-gray-700 rounded-md cursor-grab active:cursor-grabbing transition-shadow"
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <div className="flex-grow">
                                {card.type === 'city' ? (
                                    <div className={`w-full h-12 flex items-center justify-between px-4 rounded text-sm font-bold ${CITY_COLOR_CLASSES[CITIES_DATA[card.name].color]} ${CITIES_DATA[card.name].color === DiseaseColor.Yellow || CITIES_DATA[card.name].color === DiseaseColor.White ? 'text-black' : 'text-white'}`}>
                                        <span>{CITIES_DATA[card.name].name}</span>
                                        <CubeDisplay cubes={cityCubes} />
                                    </div>
                                ) : (
                                    <div className="w-full h-12 flex items-center justify-center rounded bg-purple-800 text-white text-sm font-bold">
                                        Mutation
                                    </div>
                                )}
                            </div>
                            <div className="flex-shrink-0 ml-4 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                </svg>
                            </div>
                        </div>
                    );
                })}
            </div>
             <button
                onClick={() => onConfirm(cards)}
                className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold"
            >
                Confirm Arrangement
            </button>
        </Modal>
    );
};

const GovernmentGrantModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (city: CityName) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const nonStationCities = useMemo(() => {
        const cityKeys = Object.keys(gameState.gameType === 'pandemic' ? PANDEMIC_CITIES_DATA : FALLOFROME_CITIES_DATA) as CityName[];
        return cityKeys.filter(c => !gameState.researchStations.includes(c))
            .sort((a,b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name));
    }, [gameState.researchStations, gameState.gameType]);

    return (
        <Modal title="Government Grant" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.GovernmentGrant} />
            <p className="mb-4">Select any city to build a research station in.</p>
            <div className="flex flex-col space-y-1 max-h-72 overflow-y-auto pr-2">
                {nonStationCities.map(city => {
                    const cityData = CITIES_DATA[city];
                    const cityCubes = gameState.diseaseCubes[city];
                    const textColor = (cityData.color === DiseaseColor.Yellow || cityData.color === DiseaseColor.White) ? 'text-black' : 'text-white';

                    return (
                        <button
                            key={city}
                            onClick={() => onConfirm(city)}
                            className={`p-2 rounded w-full flex justify-between items-center transition-colors ${CITY_COLOR_CLASSES[cityData.color]} hover:opacity-80`}
                        >
                            <span className={`font-semibold ${textColor}`}>{cityData.name}</span>
                            <CubeDisplay cubes={cityCubes} />
                        </button>
                    );
                })}
            </div>
        </Modal>
    );
};

const AirliftModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (playerId: number, destination: CityName) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_pawn' | 'select_destination'>('select_pawn');
    const [pawnToMove, setPawnToMove] = useState<Player | null>(null);

    const cityKeys = useMemo(() => Object.keys(gameState.gameType === 'pandemic' ? PANDEMIC_CITIES_DATA : FALLOFROME_CITIES_DATA) as CityName[], [gameState.gameType]);
    
    const handleClose = () => {
        setStep('select_pawn');
        setPawnToMove(null);
        onClose();
    }

    return (
        <Modal title="Airlift" show={show} onClose={handleClose}>
            <EventCardImage cardName={EventCardName.Airlift} />
            {step === 'select_pawn' ? (
                <div>
                    <p className="mb-4">Select a pawn to move.</p>
                    <div className="grid grid-cols-2 gap-2">
                    {gameState.players.map(p => (
                        <button key={p.id} onClick={() => {setPawnToMove(p); setStep('select_destination')}} className="p-3 bg-gray-700 hover:bg-gray-600 rounded text-left">
                            <p className="font-bold">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.role}</p>
                        </button>
                    ))}
                    </div>
                </div>
            ) : pawnToMove && (
                <div>
                    <p className="mb-4">Select a destination for {pawnToMove.name} ({pawnToMove.role}).</p>
                    <div className="flex flex-col space-y-1 max-h-60 overflow-y-auto pr-2">
                        {cityKeys.filter(c => c !== pawnToMove.location).sort((a,b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name)).map(city => {
                            const cityData = CITIES_DATA[city];
                            const cityCubes = gameState.diseaseCubes[city];
                            const textColor = (cityData.color === DiseaseColor.Yellow || cityData.color === DiseaseColor.White) ? 'text-black' : 'text-white';

                            return (
                                <button
                                    key={city}
                                    onClick={() => onConfirm(pawnToMove.id, city)}
                                    className={`p-2 rounded w-full flex justify-between items-center transition-colors ${CITY_COLOR_CLASSES[cityData.color]} hover:opacity-80`}
                                >
                                    <span className={`font-semibold ${textColor}`}>{cityData.name}</span>
                                    <CubeDisplay cubes={cityCubes} />
                                </button>
                            );
                        })}
                    </div>
                    <button onClick={() => setStep('select_pawn')} className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-bold">Back</button>
                </div>
            )}
        </Modal>
    );
};

const NewAssignmentModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (playerId: number, newRole: PlayerRole) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_player' | 'select_role'>('select_player');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    const handlePlayerSelect = (player: Player) => {
        setSelectedPlayer(player);
        setStep('select_role');
    };

    const handleClose = () => {
        setStep('select_player');
        setSelectedPlayer(null);
        onClose();
    };

    const handleConfirm = (role: PlayerRole) => {
        if (selectedPlayer) {
            onConfirm(selectedPlayer.id, role);
        }
    };
    
    // Reset state when modal is hidden
    useEffect(() => {
        if (!show) {
            setStep('select_player');
            setSelectedPlayer(null);
        }
    }, [show]);

    return (
        <Modal title="New Assignment" show={show} onClose={handleClose}>
            <EventCardImage cardName={EventCardName.NewAssignment} />
            {step === 'select_player' ? (
                <div>
                    <p className="mb-4">Select a player to assign a new role to.</p>
                    <div className="space-y-2">
                        {gameState.players.map(p => (
                            <button
                                key={p.id}
                                onClick={() => handlePlayerSelect(p)}
                                className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left"
                            >
                                <p className="font-bold">{p.name}</p>
                                <p className="text-xs text-gray-400">{p.role}</p>
                            </button>
                        ))}
                    </div>
                </div>
            ) : selectedPlayer && (
                 <div>
                    <p className="mb-4">Select a new role for <span className="font-bold">{selectedPlayer.name}</span>.</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                         {gameState.unusedRoles.map(role => (
                            <button
                                key={role}
                                onClick={() => handleConfirm(role)}
                                className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left"
                            >
                                <p className="font-bold">{role}</p>
                                <p className="text-xs text-gray-400">{PLAYER_ROLE_INFO[role]}</p>
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setStep('select_player')} className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-bold">Back</button>
                </div>
            )}
        </Modal>
    );
};

const ResilientPopulationModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (card: InfectionCard) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    return (
        <Modal title="Resilient Population" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.ResilientPopulation} />
            <p className="mb-4">Select a card from the Infection Discard Pile to remove from the game permanently.</p>
            <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-2">
                {gameState.infectionDiscard.length > 0 ? (
                    gameState.infectionDiscard.map((card, index) => (
                        <button key={index} onClick={() => onConfirm(card)} className="h-40 transition-transform transform hover:scale-105">
                            <InfectionCardDisplay card={card} gameType={gameState.gameType} />
                        </button>
                    ))
                ) : (
                    <p className="col-span-3 text-center text-gray-400">Infection Discard Pile is empty.</p>
                )}
            </div>
        </Modal>
    );
};

const SpecialOrdersModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (pawnId: number) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const otherPawns = gameState.players.filter(p => p.id !== currentPlayer.id);

    return (
        <Modal
            title="Special Orders"
            show={show}
            onClose={onClose}
            titleColor="text-purple-400"
        >
            <EventCardImage cardName={EventCardName.SpecialOrders} />
            <p className="mb-4">Choose one other pawn to control for the rest of your turn. You may spend actions to move this pawn as if it were your own.</p>
            <div className="space-y-2">
                {otherPawns.length > 0 ? otherPawns.map(pawn => (
                    <button
                        key={pawn.id}
                        onClick={() => onConfirm(pawn.id)}
                        className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left transition-colors"
                    >
                        <p className="font-bold">Control {pawn.name}</p>
                        <p className="text-xs text-gray-400">{pawn.role} in {CITIES_DATA[pawn.location].name}</p>
                    </button>
                )) : <p className="text-center text-gray-400">No other pawns in the game to control.</p>}
            </div>
        </Modal>
    );
};

const RemoteTreatmentModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (selections: RemoteTreatmentSelection[]) => void;
    gameState: GameState;
    cardName: EventCardName | null; 
}> = ({ show, onClose, onConfirm, gameState, cardName }) => {
    if (!cardName) return null;
    const allCubesOnBoard = useMemo(() => {
        const cubes: RemoteTreatmentSelection[] = [];
        Object.entries(gameState.diseaseCubes).forEach(([cityName, cityCubes]) => {
            Object.entries(cityCubes || {}).forEach(([color, count]) => {
                if (count) {
                    for (let i = 0; i < count; i++) {
                        cubes.push({ city: cityName as CityName, color: color as DiseaseColor });
                    }
                }
            });
        });
        
        return cubes.sort((a,b) => {
            const cityAData = CITIES_DATA[a.city];
            const cityBData = CITIES_DATA[b.city];
            if (!cityAData || !cityBData) return 0;

            const cityCompare = cityAData.name.localeCompare(cityBData.name);
            if (cityCompare !== 0) return cityCompare;
            return a.color.localeCompare(b.color);
        });
    }, [gameState.diseaseCubes]);
    
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    useEffect(() => {
        if (!show) {
            setSelectedIndices([]);
        }
    }, [show]);
    
    const handleToggleIndex = (index: number) => {
        setSelectedIndices(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index);
            }
            if (prev.length < 2) {
                return [...prev, index];
            }
            return prev;
        });
    };
    
    const handleFinalConfirm = () => {
        if(selectedIndices.length === 2) {
            const finalSelections = selectedIndices.map(i => allCubesOnBoard[i]);
            onConfirm(finalSelections);
        }
    };

    return (
        <Modal title={cardName} show={show} onClose={onClose} titleColor="text-teal-400">
            <EventCardImage cardName={cardName} />
            <p className="mb-4">Select any 2 disease cubes to remove from the board. {2 - selectedIndices.length} remaining.</p>
            <div className="space-y-1 max-h-80 overflow-y-auto pr-2 bg-gray-900 p-2 rounded-md">
                {allCubesOnBoard.length > 0 ? allCubesOnBoard.map(({ city, color }, index) => {
                    const cityData = CITIES_DATA[city];
                    if (!cityData) return null; // Safeguard
                    const cityRegionColor = cityData.color;
                    
                    return (
                        <button
                            key={index}
                            onClick={() => handleToggleIndex(index)}
                            className={`w-full p-2 rounded-md text-left transition-all duration-150 flex items-center justify-between ${selectedIndices.includes(index) ? 'bg-yellow-600 ring-2 ring-yellow-400' : 'bg-gray-700 hover:bg-gray-600'}`}
                        >
                            <span className={`font-semibold ${DISEASE_TEXT_COLOR_MAP[cityRegionColor]}`}>{cityData.name}</span>
                            <div className={`w-5 h-5 rounded-sm ${CITY_COLOR_CLASSES[color]}`}></div>
                        </button>
                    )
                }) : <p className="text-center text-gray-400">No disease cubes on the board.</p>}
            </div>
            <button
                disabled={selectedIndices.length !== 2}
                onClick={handleFinalConfirm}
                className="w-full mt-4 p-2 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
            >
                Confirm Removal
            </button>
        </Modal>
    );
};

const RapidVaccineDeploymentModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (selections: { city: CityName; cubesToRemove: number }[]) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const curedColor = gameState.postCureColor;
    const [selection, setSelection] = useState<{ [key in CityName]?: number }>({});

    // Reset state when modal is opened/closed or color changes
    useEffect(() => {
        if (show) {
            setSelection({});
        }
    }, [show, curedColor]);

    const eligibleCities = useMemo(() => {
        if (!curedColor) return [];
        return (Object.keys(CITIES_DATA) as CityName[]).filter(city => 
            gameState.diseaseCubes[city]?.[curedColor]
        ).sort((a, b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name));
    }, [gameState.diseaseCubes, curedColor]);

    const handleSelectionChange = (city: CityName, change: number) => {
        setSelection(prev => {
            const currentCubes = gameState.diseaseCubes[city]?.[curedColor] || 0;
            const currentSelection = prev[city] || 0;
            const newSelection = Math.max(0, Math.min(currentCubes, currentSelection + change));
            
            const totalSelected = Object.values({ ...prev, [city]: newSelection }).reduce((sum, count) => sum + (count || 0), 0);
            if (totalSelected > 5 && change > 0) {
                return prev; // Don't allow selecting more than 5 total
            }

            return { ...prev, [city]: newSelection };
        });
    };

    const { totalSelectedCubes, selectedCities, isSelectionValid } = useMemo(() => {
        const currentSelectedCities = (Object.keys(selection) as CityName[]).filter(city => selection[city]! > 0);
        const currentTotalSelectedCubes = currentSelectedCities.reduce((sum, city) => sum + selection[city]!, 0);

        const isConnected = () => {
            if (currentSelectedCities.length <= 1) return true;
            const visited = new Set<CityName>();
            const queue: CityName[] = [currentSelectedCities[0]];
            visited.add(currentSelectedCities[0]);
            let count = 0;
            while(queue.length > 0) {
                const current = queue.shift()!;
                count++;
                for (const neighbor of CONNECTIONS[current]) {
                    if (currentSelectedCities.includes(neighbor) && !visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }
            return count === currentSelectedCities.length;
        }

        const valid = currentTotalSelectedCubes >= 1 && currentTotalSelectedCubes <= 5 && isConnected();

        return {
            totalSelectedCubes: currentTotalSelectedCubes,
            selectedCities: currentSelectedCities,
            isSelectionValid: valid
        };
    }, [selection]);

    const handleConfirmClick = () => {
        const finalSelections = selectedCities.map(city => ({
            city,
            cubesToRemove: selection[city]!
        }));
        onConfirm(finalSelections);
    };

    if (!curedColor) return null;

    return (
        <Modal title="Rapid Vaccine Deployment" show={show} onClose={onClose} titleColor="text-teal-400">
            <EventCardImage cardName={EventCardName.RapidVaccineDeployment} />
            <p className="mb-2">A cure for the <span className={`font-bold capitalize ${DISEASE_TEXT_COLOR_MAP[curedColor]}`}>{curedColor}</span> disease has been found!</p>
            <p className="mb-4 text-sm text-gray-400">Remove 1 to 5 cubes of this color from a group of connected cities. At least 1 cube must be removed from each affected city.</p>
            
            <div className="p-2 bg-gray-900 rounded-md mb-4 text-center">
                <p>Total Cubes Selected: <span className="font-bold text-xl">{totalSelectedCubes}</span> / 5</p>
                {!isSelectionValid && totalSelectedCubes > 0 && (
                    <p className="text-red-400 text-xs mt-1">
                        {totalSelectedCubes > 5 ? 'Too many cubes selected.' : totalSelectedCubes < 1 ? 'Select at least one cube.' : 'Selected cities must be connected.'}
                    </p>
                )}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {eligibleCities.length > 0 ? eligibleCities.map(city => {
                    const maxCubes = gameState.diseaseCubes[city]?.[curedColor] || 0;
                    const currentSelection = selection[city] || 0;
                    return (
                        <div key={city} className="flex items-center justify-between p-2 bg-gray-700 rounded-md">
                            <span className={`font-semibold ${DISEASE_TEXT_COLOR_MAP[CITIES_DATA[city].color]}`}>{CITIES_DATA[city].name}</span>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleSelectionChange(city, -1)} disabled={currentSelection === 0} className="w-8 h-8 rounded-full bg-gray-600 disabled:opacity-50">-</button>
                                <span className="w-8 text-center font-bold">{currentSelection} / {maxCubes}</span>
                                <button onClick={() => handleSelectionChange(city, 1)} disabled={currentSelection === maxCubes || totalSelectedCubes >= 5} className="w-8 h-8 rounded-full bg-gray-600 disabled:opacity-50">+</button>
                            </div>
                        </div>
                    );
                }) : <p className="text-center text-gray-400">No cities with this disease on the board.</p>}
            </div>

            <button
                disabled={!isSelectionValid}
                onClick={handleConfirmClick}
                className="w-full mt-4 p-2 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
            >
                Confirm Removal
            </button>
        </Modal>
    );
};

const AcknowledgeMutationResultModal: React.FC<{
    show: boolean;
    onAcknowledge: () => void;
    result: string | null;
}> = ({ show, onAcknowledge, result }) => (
    <Modal title="Mutation Event Resolved" show={show}>
        <p className="mb-4">{result}</p>
        <button onClick={onAcknowledge} className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold">
            Continue
        </button>
    </Modal>
);

const MobileHospitalModal: React.FC<{
    show: boolean;
    onConfirm: (color: DiseaseColor) => void;
    gameState: GameState;
}> = ({ show, onConfirm, gameState }) => {
    const city = gameState.cityForMobileHospital;
    if (!city) return null;

    const availableColors = useMemo(() => {
        const cityCubes = gameState.diseaseCubes[city] || {};
        return (Object.keys(cityCubes) as DiseaseColor[]).filter(c => cityCubes[c]! > 0);
    }, [gameState.diseaseCubes, city]);

    return (
        <Modal
            title="Mobile Hospital"
            show={show}
            titleColor="text-teal-400"
        >
            <p className="mb-4">You have entered <span className="font-bold">{CITIES_DATA[city].name}</span> with an active Mobile Hospital.</p>
            <p className="mb-4">Multiple diseases are present. Choose one color cube to remove:</p>
            <div className="space-y-2">
                {availableColors.map(color => (
                    <button
                        key={color}
                        onClick={() => onConfirm(color)}
                        className={`w-full p-2 rounded text-white font-bold capitalize ${CITY_COLOR_CLASSES[color]}`}
                    >
                        Remove {color} cube
                    </button>
                ))}
            </div>
        </Modal>
    );
};

const ConfirmVestalisDrawModal: React.FC<{
    show: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ show, onConfirm, onCancel }) => {
    return (
        <Modal 
            title="Confirm Ability" 
            show={show} 
            onClose={onCancel} 
            titleColor="text-lime-400"
        >
            <p className="mb-4">Are you sure you want to discard a City card to draw an Event card?</p>
            <p className="text-sm text-gray-400 mb-6">Once you confirm, the Event card will be revealed, and you must complete the action by discarding a valid City card.</p>
            <div className="flex justify-end space-x-4">
                <button
                    onClick={onCancel}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-bold"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="px-6 py-2 bg-lime-600 hover:bg-lime-500 rounded text-white font-bold"
                >
                    Confirm
                </button>
            </div>
        </Modal>
    );
};

const VestalisDrawEventModal: React.FC<{
    show: boolean;
    onConfirm: (cardToDiscard: PlayerCard & { type: 'city' }) => void;
    pendingVestalisDraw: { drawnCard: PlayerCard & { type: 'event' }; validDiscards: (PlayerCard & { type: 'city'})[] } | null;
    gameState: GameState;
}> = ({ show, onConfirm, pendingVestalisDraw, gameState }) => {
    const [selectedCard, setSelectedCard] = useState<(PlayerCard & { type: 'city' }) | null>(null);

    useEffect(() => {
        if (show) {
            // If there's only one option, pre-select it
            if (pendingVestalisDraw?.validDiscards.length === 1) {
                setSelectedCard(pendingVestalisDraw.validDiscards[0]);
            } else {
                setSelectedCard(null);
            }
        }
    }, [show, pendingVestalisDraw]);

    if (!pendingVestalisDraw) return null;

    const { drawnCard, validDiscards } = pendingVestalisDraw;

    const handleConfirmClick = () => {
        if (selectedCard) {
            onConfirm(selectedCard);
        }
    };

    return (
        <Modal title="Vestalis: Draw Event" show={show} titleColor="text-lime-400">
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-bold mb-2">Event Card Drawn</h3>
                    <div className="flex flex-col items-center p-4 bg-gray-900 rounded-lg">
                        <div className="w-40 h-56">
                            <PlayerCardDisplay card={drawnCard} isLarge={true} gameType={gameState.gameType} />
                        </div>
                        <p className="text-sm text-gray-300 mt-4 text-center italic">
                            "{EVENT_CARD_INFO[drawnCard.name]}"
                        </p>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold mb-2">Select a City Card to Discard</h3>
                    <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-2">
                        {validDiscards.map(card => {
                            const isSelected = selectedCard?.name === card.name && selectedCard?.color === card.color;
                            return (
                                <div
                                    key={`${card.name}-${card.color}`}
                                    onClick={() => setSelectedCard(card)}
                                    className={`cursor-pointer rounded-lg overflow-hidden h-28 transition-all duration-200 ${isSelected ? 'ring-4 ring-yellow-400' : 'ring-2 ring-transparent'}`}
                                >
                                    <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        onClick={handleConfirmClick}
                        disabled={!selectedCard}
                        className="w-full p-2 bg-lime-600 hover:bg-lime-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
                    >
                        Confirm and Discard
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const VestalisPlayerCardDrawModal: React.FC<{
    show: boolean;
    onConfirm: (cardsToKeep: PlayerCard[]) => void;
    gameState: GameState;
    outOfTurnActionsComponent: React.ReactNode;
    onInitiateVestalisDrawEvent: () => void;
}> = ({ show, onConfirm, gameState, outOfTurnActionsComponent, onInitiateVestalisDrawEvent }) => {
    const [selectedCards, setSelectedCards] = useState<PlayerCard[]>([]);
    const drawnCards = gameState.pendingVestalisPlayerCardDraw;

    useEffect(() => {
        // Reset selection when modal is shown/hidden or cards change
        if (show) {
            setSelectedCards([]);
        }
    }, [show]);

    if (!drawnCards) return null;

    const handleCardToggle = (card: PlayerCard) => {
        setSelectedCards(prev => {
            const isSelected = prev.includes(card);
            
            if (isSelected) {
                 return prev.filter(c => c !== card);
            } else {
                if (prev.length < 2) {
                    return [...prev, card];
                }
            }
            return prev;
        });
    };

    const isConfirmDisabled = selectedCards.length !== 2;

    return (
        <Modal title="Vestalis: Choose Cards" show={show}>
            <p className="mb-4">Your ability allows you to draw 3 cards. Select 2 to keep. The other will return to the top of the deck.</p>
            <div className="flex justify-center items-center gap-4 mb-4">
                {drawnCards.map((card, index) => {
                    const isSelected = selectedCards.includes(card);
                    return (
                        <div
                            key={index}
                            onClick={() => handleCardToggle(card)}
                            className={`w-40 h-56 cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${isSelected ? 'ring-4 ring-yellow-400 transform scale-105' : 'ring-2 ring-transparent'}`}
                        >
                            <PlayerCardDisplay card={card} isLarge gameType={gameState.gameType} />
                        </div>
                    );
                })}
            </div>
            <p className="text-center text-sm text-gray-400 mb-4">{selectedCards.length} / 2 selected</p>
            <button 
                onClick={() => onConfirm(selectedCards)} 
                disabled={isConfirmDisabled}
                className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                Confirm Selection
            </button>
            <div className="mt-4 border-t border-gray-700 pt-4">
                        {outOfTurnActionsComponent}
                        <VestalisOutOfTurnActions gameState={gameState} onInitiateVestalisDrawEvent={onInitiateVestalisDrawEvent} />
                    </div>
        </Modal>
    );
};

const DoUtDesModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        option: 'normal' | 'corrupt';
        player1Id: number;
        player2Id: number;
        card1: PlayerCard & { type: 'city' };
        card2: PlayerCard & { type: 'city' };
    }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_option' | 'select_players' | 'select_cards'>('select_option');
    const [selectedOption, setSelectedOption] = useState<'normal' | 'corrupt' | null>(null);
    const [player1, setPlayer1] = useState<Player | null>(null);
    const [player2, setPlayer2] = useState<Player | null>(null);
    const [card1, setCard1] = useState<(PlayerCard & { type: 'city' }) | null>(null);
    const [card2, setCard2] = useState<(PlayerCard & { type: 'city' }) | null>(null);

    const isNormalOptionAvailable = useMemo(() => {
        const cityPlayerCounts: { [key in CityName]?: number } = {};
        gameState.players.forEach(p => {
            cityPlayerCounts[p.location] = (cityPlayerCounts[p.location] || 0) + 1;
        });
        return Object.values(cityPlayerCounts).some(count => count >= 2);
    }, [gameState.players]);

    const eligiblePlayersForNormal = useMemo(() => {
        if (selectedOption !== 'normal') return [];
        const cityPlayerMap: { [key in CityName]?: Player[] } = {};
        gameState.players.forEach(p => {
            if (!cityPlayerMap[p.location]) cityPlayerMap[p.location] = [];
            cityPlayerMap[p.location]!.push(p);
        });
        return Object.values(cityPlayerMap).filter(players => players.length >= 2).flat();
    }, [gameState.players, selectedOption]);

    useEffect(() => {
        if (show) {
            setStep('select_option');
            setSelectedOption(null);
            setPlayer1(null);
            setPlayer2(null);
            setCard1(null);
            setCard2(null);
        }
    }, [show]);
    
    const handleConfirmClick = () => {
        if (selectedOption && player1 && player2 && card1 && card2) {
            onConfirm({ option: selectedOption, player1Id: player1.id, player2Id: player2.id, card1, card2 });
        }
    };
    
    const renderOptionSelection = () => (
        <div className="space-y-4">
            <p>I give so that you will give back to me. Choose how to use this card.</p>
            <button
                onClick={() => { setSelectedOption('normal'); setStep('select_players'); }}
                disabled={!isNormalOptionAvailable}
                className="w-full p-3 bg-teal-700 hover:bg-teal-600 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                <h3 className="font-bold">Normal</h3>
                <p className="text-sm text-gray-300">Two players in the same city may swap a City Card from their hands.</p>
                {!isNormalOptionAvailable && <p className="text-xs text-yellow-400 mt-1">No players are in the same city.</p>}
            </button>
            <button
                onClick={() => { setSelectedOption('corrupt'); setStep('select_players'); }}
                className="w-full p-3 bg-purple-800 hover:bg-purple-700 rounded-lg"
            >
                <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                <p className="text-sm text-gray-300">Two players, anywhere on the board, may swap a City Card from their hands.</p>
            </button>
        </div>
    );
    
    const renderPlayerSelection = () => {
        const playersToShow = selectedOption === 'corrupt' ? gameState.players : eligiblePlayersForNormal;
        
        return (
            <div>
                 <p className="mb-4">Select two players to swap cards.</p>
                 <div className="grid grid-cols-2 gap-2 mb-4">
                     {playersToShow.map(p => (
                         <button
                             key={p.id}
                             onClick={() => {
                                 if (!player1) setPlayer1(p);
                                 else if (!player2) setPlayer2(p);
                             }}
                             disabled={(player1?.id === p.id) || (player2?.id === p.id)}
                             className="p-2 bg-gray-700 rounded-md disabled:opacity-50"
                         >
                             {p.name}
                         </button>
                     ))}
                 </div>
                 <div className="flex justify-between items-center text-center p-2 bg-gray-900 rounded-lg">
                    <div><p className="text-xs text-gray-400">Player 1</p><p>{player1?.name || '...'}</p></div>
                    <p className="text-xl font-bold">↔</p>
                    <div><p className="text-xs text-gray-400">Player 2</p><p>{player2?.name || '...'}</p></div>
                 </div>
                 <button disabled={!player1 || !player2} onClick={() => setStep('select_cards')} className="w-full mt-4 p-2 bg-blue-600 disabled:bg-gray-600 rounded">Next</button>
            </div>
        );
    };
    
    const renderCardSelection = () => {
        if (!player1 || !player2) return null;
        const p1Cards = player1.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];
        const p2Cards = player2.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];
        
        return (
            <div>
                 <p className="mb-4">Select one card from each player's hand to swap.</p>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-bold text-center mb-2">{player1.name}'s Hand</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {p1Cards.map(c => (
                            <div key={`${c.name}-${c.color}`} onClick={() => setCard1(c)} className={`cursor-pointer rounded-lg overflow-hidden h-24 ${card1 === c ? 'ring-4 ring-yellow-400' : ''}`}><PlayerCardDisplay card={c} gameType={gameState.gameType} /></div>
                        ))}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-bold text-center mb-2">{player2.name}'s Hand</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {p2Cards.map(c => (
                            <div key={`${c.name}-${c.color}`} onClick={() => setCard2(c)} className={`cursor-pointer rounded-lg overflow-hidden h-24 ${card2 === c ? 'ring-4 ring-yellow-400' : ''}`}><PlayerCardDisplay card={c} gameType={gameState.gameType} /></div>
                        ))}
                        </div>
                    </div>
                 </div>
                 <button disabled={!card1 || !card2} onClick={handleConfirmClick} className="w-full mt-4 p-2 bg-blue-600 disabled:bg-gray-600 rounded">Confirm Swap</button>
            </div>
        );
    };
    
    return (
        <Modal title="Do Ut Des" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.DoUtDes} />
            {step === 'select_option' && renderOptionSelection()}
            {step === 'select_players' && renderPlayerSelection()}
            {step === 'select_cards' && renderCardSelection()}
        </Modal>
    );
};

const PurificationChoiceModal: React.FC<{
    show: boolean;
    gameState: GameState;
}> = ({ show, gameState }) => {
    const choiceData = gameState.pendingPurificationChoice;

    if (!choiceData) return null;

    const { city, color } = choiceData;

    return (
        <Modal
            title="Purification Choice"
            show={show}
            isSidePanel={true}
            titleColor="text-sky-400"
        >
            <div className="space-y-4">
                <p>
                    An infection is about to place a <span className={`font-bold capitalize ${DISEASE_TEXT_COLOR_MAP[color]}`}>{color}</span> cube in <span className="font-bold">{CITIES_DATA[city].name}</span>.
                </p>
                <p className="text-lg font-semibold text-yellow-300 animate-pulse">
                    Please click on one of the highlighted regions on the map to use a purification token and prevent this infection.
                </p>
            </div>
        </Modal>
    );
};

const RailwaymanDoubleBuildModal: React.FC<{
    show: boolean;
    onClose: () => void;
}> = ({ show, onClose }) => {
    return (
        <Modal title="Railwayman: Build Double" show={show} onClose={onClose} isSidePanel={true}>
            <div className="space-y-4">
                <p>
                    The first railroad connection has been selected. The board now highlights all valid, consecutive connections for your second build.
                </p>
                <p className="text-lg font-semibold text-yellow-300 animate-pulse">
                    Please click a highlighted connection on the map to complete the action.
                </p>
                <p className="text-sm text-gray-400">
                    Clicking a valid connection will build both railroads for a single action.
                </p>
                <button
                    onClick={onClose}
                    className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-bold"
                >
                    Cancel Build
                </button>
            </div>
        </Modal>
    );
};

const RuralDoctorTreatModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (choice: { city: CityName; color: DiseaseColor }) => void;
    options: { city: CityName; color: DiseaseColor }[];
}> = ({ show, onClose, onConfirm, options }) => {
    return (
        <Modal title="Rural Doctor: Second Treat" show={show} onClose={onClose}>
            <p className="mb-4">You have removed one cube from your city. Select where to remove the second cube from the available targets below.</p>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => onConfirm(option)}
                        className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left flex items-center space-x-4 transition-colors"
                    >
                        <div className={`w-6 h-6 rounded-md flex-shrink-0 ${CITY_COLOR_CLASSES[option.color]}`}></div>
                        <div>
                            <p className="font-bold">{CITIES_DATA[option.city].name}</p>
                            <p className="text-sm text-gray-400 capitalize">{option.color} Disease</p>
                        </div>
                    </button>
                ))}
            </div>
        </Modal>
    );
};

const RoyalAcademyScientistConfirmationModal: React.FC<{
    show: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ show, onConfirm, onCancel }) => {
    return (
        <Modal title="Confirm Action" show={show} onClose={onCancel}>
            <p className="mb-2">Use 1 action to look at the top 3 cards of the Player Deck and rearrange them?</p>
            <p className="font-bold text-yellow-400 my-4 text-center">This action cannot be undone once confirmed.</p>
            <div className="flex justify-end space-x-4 mt-6">
                <button onClick={onCancel} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-bold">Cancel</button>
                <button onClick={onConfirm} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold">Confirm</button>
            </div>
        </Modal>
    );
};

const RoyalAcademyScientistForecastModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (rearrangedCards: PlayerCard[]) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const numCardsToForecast = Math.min(3, gameState.playerDeck.length);
    const topCards = useMemo(() => gameState.playerDeck.slice(0, numCardsToForecast), [gameState.playerDeck, numCardsToForecast]);
    const [cards, setCards] = useState<PlayerCard[]>([]);

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        if (show) {
            setCards(topCards);
        }
    }, [show, topCards]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        if (dragItem.current === null || dragItem.current === index) return;
        
        dragOverItem.current = index;
        const newCards = [...cards];
        const draggedItemContent = newCards[dragItem.current];
        newCards.splice(dragItem.current, 1);
        newCards.splice(dragOverItem.current, 0, draggedItemContent);
        
        dragItem.current = dragOverItem.current;
        dragOverItem.current = null;
        
        setCards(newCards);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        dragItem.current = null;
        dragOverItem.current = null;
        e.currentTarget.classList.remove('opacity-50');
    };

    return (
        <Modal title="Academy Forecast" show={show} onClose={onClose} isSidePanel={true}>
            <p className="mb-4">Drag and drop to reorder the top {numCardsToForecast} cards of the Player Deck. The card at the top will be drawn first.</p>
            <div className="space-y-2 mb-4">
                {cards.map((card, index) => (
                    <div
                        key={`${card.type}-${'name' in card ? card.name : ''}-${index}`}
                        className="flex items-center p-2 bg-gray-700 rounded-md cursor-grab active:cursor-grabbing transition-shadow"
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <div className="w-full h-24">
                           <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                        </div>
                         <div className="flex-shrink-0 ml-4 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                            </svg>
                        </div>
                    </div>
                ))}
            </div>
             <button
                onClick={() => onConfirm(cards)}
                className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold"
            >
                Confirm Arrangement
            </button>
        </Modal>
    );
};

const HospitalFoundingModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (color: DiseaseColor, city: CityName) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_color' | 'select_city'>('select_color');
    const [selectedColor, setSelectedColor] = useState<DiseaseColor | null>(null);

    useEffect(() => {
        if (show) {
            setStep('select_color');
            setSelectedColor(null);
        }
    }, [show]);

    const hospitalColors: DiseaseColor[] = [DiseaseColor.Blue, DiseaseColor.Yellow, DiseaseColor.Black, DiseaseColor.Red];
    const citiesForSelectedColor = useMemo(() => {
        if (!selectedColor) return [];
        return (Object.keys(IBERIA_CITIES_DATA) as CityName[]).filter(
            city => IBERIA_CITIES_DATA[city].color === selectedColor
        ).sort((a, b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name));
    }, [selectedColor]);

    const renderColorSelection = () => (
        <div>
            <p className="mb-4">Select which color hospital you would like to place or move.</p>
            <div className="space-y-2">
                {hospitalColors.map(color => (
                    <button
                        key={color}
                        onClick={() => { setSelectedColor(color); setStep('select_city'); }}
                        className={`w-full p-3 rounded-md text-white font-bold capitalize transition-colors hover:opacity-90 ${CITY_COLOR_CLASSES[color]}`}
                    >
                        {color} Hospital
                    </button>
                ))}
            </div>
        </div>
    );

    const renderCitySelection = () => {
        if (!selectedColor) return null;
        return (
            <div>
                <p className="mb-4">Select a <span className={`font-bold capitalize ${DISEASE_TEXT_COLOR_MAP[selectedColor]}`}>{selectedColor}</span> city to place the hospital in.</p>
                <div className="space-y-1 max-h-72 overflow-y-auto pr-2">
                    {citiesForSelectedColor.map(city => (
                        <button
                            key={city}
                            onClick={() => onConfirm(selectedColor, city)}
                            className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded text-left"
                        >
                            {CITIES_DATA[city].name}
                        </button>
                    ))}
                </div>
                <button onClick={() => setStep('select_color')} className="w-full mt-4 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back to Color Selection</button>
            </div>
        );
    };

    return (
        <Modal title="Hospital Founding" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.HospitalFounding} />
            {step === 'select_color' ? renderColorSelection() : renderCitySelection()}
        </Modal>
    );
};

const MailCorrespondenceModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        player1Id: number;
        player2Id: number;
        card1: PlayerCard & { type: 'city' };
        card2: PlayerCard & { type: 'city' };
    }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_players' | 'select_cards'>('select_players');
    const [player1, setPlayer1] = useState<Player | null>(null);
    const [player2, setPlayer2] = useState<Player | null>(null);
    const [card1, setCard1] = useState<(PlayerCard & { type: 'city' }) | null>(null);
    const [card2, setCard2] = useState<(PlayerCard & { type: 'city' }) | null>(null);

    useEffect(() => {
        if (show) {
            setStep('select_players');
            setPlayer1(null);
            setPlayer2(null);
            setCard1(null);
            setCard2(null);
        }
    }, [show]);
    
    const handleConfirmClick = () => {
        if (player1 && player2 && card1 && card2) {
            onConfirm({ player1Id: player1.id, player2Id: player2.id, card1, card2 });
        }
    };
    
    const renderPlayerSelection = () => (
        <div>
             <p className="mb-4">Select two players to swap one card each.</p>
             <div className="grid grid-cols-2 gap-2 mb-4">
                 {gameState.players.map(p => (
                     <button
                         key={p.id}
                         onClick={() => {
                             if (!player1) setPlayer1(p);
                             else if (player1.id !== p.id && !player2) setPlayer2(p);
                         }}
                         disabled={(player1?.id === p.id) || (player2?.id === p.id)}
                         className="p-2 bg-gray-700 rounded-md disabled:opacity-50"
                     >
                         {p.name}
                     </button>
                 ))}
             </div>
             <div className="flex justify-between items-center text-center p-2 bg-gray-900 rounded-lg">
                <div><p className="text-xs text-gray-400">Player 1</p><p>{player1?.name || '...'}</p></div>
                <p className="text-xl font-bold">↔</p>
                <div><p className="text-xs text-gray-400">Player 2</p><p>{player2?.name || '...'}</p></div>
             </div>
             <button disabled={!player1 || !player2} onClick={() => setStep('select_cards')} className="w-full mt-4 p-2 bg-blue-600 disabled:bg-gray-600 rounded">Next</button>
        </div>
    );
    
    const renderCardSelection = () => {
        if (!player1 || !player2) return null;
        const p1Cards = player1.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];
        const p2Cards = player2.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];
        
        return (
            <div>
                 <p className="mb-4">Select one card from each player's hand to swap.</p>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-bold text-center mb-2">{player1.name}'s Hand</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {p1Cards.map((c, i) => (
                            <div key={i} onClick={() => setCard1(c)} className={`cursor-pointer rounded-lg overflow-hidden h-24 ${card1 === c ? 'ring-4 ring-yellow-400' : ''}`}><PlayerCardDisplay card={c} gameType={gameState.gameType} /></div>
                        ))}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-bold text-center mb-2">{player2.name}'s Hand</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {p2Cards.map((c, i) => (
                            <div key={i} onClick={() => setCard2(c)} className={`cursor-pointer rounded-lg overflow-hidden h-24 ${card2 === c ? 'ring-4 ring-yellow-400' : ''}`}><PlayerCardDisplay card={c} gameType={gameState.gameType} /></div>
                        ))}
                        </div>
                    </div>
                 </div>
                 <button disabled={!card1 || !card2} onClick={handleConfirmClick} className="w-full mt-4 p-2 bg-blue-600 disabled:bg-gray-600 rounded">Confirm Swap</button>
                 <button onClick={() => { setStep('select_players'); setCard1(null); setCard2(null); }} className="w-full mt-2 p-2 bg-gray-500 hover:bg-gray-400 rounded">Back</button>
            </div>
        );
    };
    
    return (
        <Modal title="Mail Correspondence" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.MailCorrespondence} />
            {step === 'select_players' ? renderPlayerSelection() : renderCardSelection()}
        </Modal>
    );
};

const NewRailsModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
    selectedConnections: { from: CityName, to: CityName }[];
}> = ({ show, onClose, onConfirm, selectedConnections }) => {
    const isReady = selectedConnections.length === 2;

    return (
        <Modal title="New Rails" show={show} onClose={onClose} isSidePanel={true}>
            <EventCardImage cardName={EventCardName.NewRails} />
            <div className="space-y-4 mt-4">
                <p>
                    Place 2 railroad tokens for free.
                </p>
                <p className="text-lg font-semibold text-yellow-300 animate-pulse">
                    Please click on two valid, non-sea connections on the map to place the railroads.
                </p>
                <div className="p-3 bg-gray-900 rounded-lg text-center">
                    <p className="text-sm text-gray-400">Connections Selected</p>
                    <p className="font-orbitron text-4xl">{selectedConnections.length} / 2</p>
                </div>
                {selectedConnections.length > 0 && (
                    <div className="text-sm space-y-1">
                        {selectedConnections.map((conn, i) => (
                            <p key={i} className="px-2 py-1 bg-gray-700 rounded-md">
                                {i+1}: {CITIES_DATA[conn.from].name} ↔ {CITIES_DATA[conn.to].name}
                            </p>
                        ))}
                    </div>
                )}
                <button
                    onClick={onConfirm}
                    disabled={!isReady}
                    className="w-full mt-4 p-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
                >
                    Confirm Placement
                </button>
            </div>
        </Modal>
    );
};

const PurifyWaterEventModal: React.FC<{
    show: boolean;
    onClose: () => void;
    gameState: GameState;
}> = ({ show, onClose, gameState }) => {
    const tokensRemaining = gameState.pendingPurifyWaterEvent?.tokensRemaining || 0;

    return (
        <Modal
            title="Event: Purify Water"
            show={show}
            onClose={onClose}
            isSidePanel={true}
        >
            <div className="space-y-4">
                <EventCardImage cardName={EventCardName.PurifyWater} />
                <p>
                    Place up to {tokensRemaining} more purification token(s) onto the board.
                </p>
                <p className="text-lg font-semibold text-yellow-300 animate-pulse">
                    Please click on a region on the map to place a token.
                </p>
                <p className="text-sm text-gray-400">
                    You can click the same region twice to place both tokens there, or click two different regions.
                </p>
            </div>
        </Modal>
    );
};

// MAIN MODAL WRAPPER
interface GameModalsProps {
    gameState: GameState;
    handleAction: (action: string, payload?: any, dispatcherTargetId?: number | null) => void; 
    shareModalState: { isOpen: boolean; options: ShareOption[] };
    setShareModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; options: ShareOption[] }>>;
    dispatchSummonModalState: { isOpen: boolean };
    setDispatchSummonModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean }>>;
    takeEventModalState: { isOpen: boolean, cards: EventCardName[] };
    setTakeEventModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean, cards: EventCardName[] }>>;
    treatDiseaseModalState: { isOpen: boolean, availableColors: DiseaseColor[] };
    setTreatDiseaseModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean, availableColors: DiseaseColor[] }>>;
    cureDiseaseModalState: { isOpen: boolean, options: CureOptionForModal[] };
    setCureDiseaseModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean, options: CureOptionForModal[] }>>;
    onConfirmCureDisease: (payload: CureActionPayload) => void;
    expertFlightModalOpen: boolean;
    setExpertFlightModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    returnSamplesModalState: { isOpen: boolean; player: Player | null };
    setReturnSamplesModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; player: Player | null }>>;
    resilientPopulationModalState: { isOpen: boolean; ownerId: number | null; from: 'hand' | 'contingency' | null };
    setResilientPopulationModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; ownerId: number | null; from: 'hand' | 'contingency' | null }>>;
    collectSampleModalState: { isOpen: boolean; availableColors: DiseaseColor[] };
    setCollectSampleModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; availableColors: DiseaseColor[] }>>;
    localLiaisonShareModalState: { isOpen: boolean; options: { card: PlayerCard & { type: 'city' }, toPlayer: Player }[] };
    setLocalLiaisonShareModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; options: { card: PlayerCard & { type: 'city' }, toPlayer: Player }[] }>>;
    virologistTreatModalOpen: boolean;
    setVirologistTreatModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    enlistBarbariansModalState: { isOpen: boolean; options: { color: DiseaseColor, cards: (PlayerCard & { type: 'city' })[] }[] };
    setEnlistBarbariansModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; options: { color: DiseaseColor, cards: (PlayerCard & { type: 'city' })[] }[] }>>;
    freeEnlistBarbariansModalState: { isOpen: boolean; options: { color: DiseaseColor }[] };
    setFreeEnlistBarbariansModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; options: { color: DiseaseColor }[] }>>;
    onConfirmFreeEnlistBarbarians: (color: DiseaseColor) => void;
    mercatorShareModalState: { isOpen: boolean; options: ShareOption[] };
    setMercatorShareModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; options: ShareOption[] }>>;
    handleConfirmMercatorShare: (payload: ShareOption) => void;
    praefectusRecruitModalState: { isOpen: boolean; validCards: (PlayerCard & { type: 'city' })[]; availableLegions: number; };
    setPraefectusRecruitModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; validCards: (PlayerCard & { type: 'city' })[]; availableLegions: number; }>>;
    handleConfirmPraefectusRecruit: (cardToDiscard: PlayerCard & { type: 'city' }, legionsToAdd: number) => void;
    fabrumFlightModalState: { isOpen: boolean; destination: CityName | null; };
    setFabrumFlightModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; destination: CityName | null; }>>;
    handleConfirmFabrumFlight: (payload: { destination: CityName; cardToDiscard: PlayerCard & { type: 'city' }; legionsToMove: number }) => void;
    marchModalState: { isOpen: boolean; destination: CityName | null; availableLegions: number };
    setMarchModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; destination: CityName | null; availableLegions: number }>>;
    handleConfirmMarch: (numLegions: number) => void;
    sailModalState: { isOpen: boolean; destination: CityName | null; availableLegions: number; validCards: (PlayerCard & { type: 'city' })[] };
    setSailModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; destination: CityName | null; availableLegions: number; validCards: (PlayerCard & { type: 'city' })[] }>>;
    handleConfirmSail: (payload: { legionsToMove: number; cardToDiscard: (PlayerCard & { type: 'city' }) | null }) => void;
    reginaFoederataMoveModalState: { isOpen: boolean; destination: CityName | null; actionType: 'March' | 'Sail'; availableLegions: number; availableBarbarians: { [key in DiseaseColor]?: number; }; destinationBarbarians: { [key in DiseaseColor]?: number; }; validCards?: (PlayerCard & { type: "city"; })[] | undefined; };
    setReginaFoederataMoveModalState: React.Dispatch<React.SetStateAction<any>>;
    handleConfirmReginaFoederataMove: (payload: { legionsToMove: number; barbariansToMove: { [key in DiseaseColor]?: number }; cardToDiscard?: PlayerCard & { type: "city"; } }) => void;
    battleModalState: BattleModalState;
    setBattleModalState: React.Dispatch<React.SetStateAction<BattleModalState>>;
    onRollBattleDice: (diceToRoll: number) => void;
    onConfirmBattle: (selectedCubes: { [key in DiseaseColor]?: number }) => void;
    getHandLimit: (player: Player) => number;
    handleConfirmDiscard: (selection: number[]) => void;
    drawnPlayerCards: PlayerCard[] | null;
    handleConfirmPlayerDraw: () => void;
    viewingDiscard: 'player' | 'infection' | null;
    setViewingDiscard: React.Dispatch<React.SetStateAction<'player' | 'infection' | null>>;
    viewEventInfo: EventCardName | null;
    setViewEventInfo: React.Dispatch<React.SetStateAction<EventCardName | null>>;
    handleUndoAction: () => void;
    _drawPlayerCards: () => void;
    infectionStepState: { queue: InfectionCard[]; revealedCard: InfectionCard | null; outbreaksThisTurn: Set<CityName>; invadedCity: CityName | null };
    handleProcessInfectionStep: () => void;
    intensifyModalOpen: boolean;
    executeIntensify: () => void;
    handleContinueToInfectionPhase: () => void;
    handleAction: (action: string, payload?: any, dispatcherTargetId?: number | null) => void;
    handlePlayEventCard: (cardName: EventCardName, ownerId: number) => void;
    onPlayContingencyCard: (cardName: EventCardName, ownerId: number) => void;
    handlePlayResilientPopulation: (ownerId: number, from: 'hand' | 'contingency', cardToRemove: InfectionCard) => void;
    onInitiatePlayResilientPopulation: (ownerId: number, from: 'hand' | 'contingency') => void;
    handleRemoteTreatment: (selections: RemoteTreatmentSelection[]) => void;
    handleMobileHospitalRemove: (color: DiseaseColor) => void;
    handleEpidemiologistTakeCard: (targetPlayerId: number, card: PlayerCard & { type: 'city' }) => void;
    handleReturnSamples: (playerId: number, samples: { [key in DiseaseColor]?: number }) => void;
    handleSkipPostCureAction: () => void;
    handleGovernmentGrant: (city: CityName) => void;
    handleAirlift: (playerId: number, destination: CityName) => void;
    handleForecast: (rearrangedCards: InfectionCard[]) => void;
    handleNewAssignment: (playerId: number, newRole: PlayerRole) => void;
    handleSpecialOrders: (pawnId: number) => void;
    handleRapidVaccineDeployment: (selections: { city: CityName; cubesToRemove: number }[]) => void;
    handleConfirmTroubleshooterPreview: () => void;
    handleSkipTroubleshooterPreview: () => void;
    handleConfirmEpidemicInfect: () => void;
    handleReExaminedResearch: (card: PlayerCard & { type: 'city' }) => void;
    handleConfirmPilotFlight: (passengerId: number | null) => void;
    handleCancelPilotFlight: () => void;
    onInitiateFieldDirectorMove: () => void;
    handleFieldDirectorMove: (pawnId: number, destination: CityName) => void;
    handleCancelFieldDirectorAction: () => void;
    onInitiateEpidemiologistTake: () => void;
    handleCancelEpidemiologistTake: () => void;
    onResolveMutationEvent: (event: MutationEventCardName) => void;
    onCancelEventResolution: () => void;
    onAcknowledgeMutationResult: () => void;
    handleStationRelocation: (cityToRemove: CityName) => void;
    handleConfirmForecastPlay: () => void;
    handleCancelForecastPlay: () => void;
    handleFortRelocation: (cityToRemove: CityName) => void;
    handleCancelFortRelocation: () => void;
    handleChooseStartingCity: (city: CityName) => void;
    pendingEventCardForModal: EventCardName | null;
    onInitiateVestalisDrawEvent: () => void;
    handleConfirmVestalisDrawEvent: (cardToDiscard: PlayerCard & { type: 'city' }) => void;
    handleConfirmVestalisDrawAction: () => void;
    handleCancelVestalisDrawAction: () => void;
    handleConfirmVestalisPlayerCardDraw: (cardsToKeep: PlayerCard[]) => void;
    handleResolveDoUtDes: (payload: {
        option: 'normal' | 'corrupt';
        player1Id: number;
        player2Id: number;
        card1: PlayerCard & { type: 'city' };
        card2: PlayerCard & { type: 'city' };
    }) => void;
    handleResolveVaeVictis: (payload: {
        option: 'normal' | 'corrupt';
        selections: { [key in CityName]?: { [key in DiseaseColor]?: number } };
    }) => void;
    handleResolveSiVisPacemParaBellum: (payload: { option: 'normal' | 'corrupt'; city: CityName; cityToRemove?: CityName; pawnId: number | null; legionsToMove: number }) => void;
    handleResolveHicManebimusOptime: (payload: { option: 'normal' | 'corrupt'; selections?: { [key in CityName]?: number } }) => void;
    handleResolveAudentesFortunaIuvat: (payload: { option: 'normal' | 'corrupt' }) => void;
    handleResolveMorsTuaVitaMea: (payload: { /* ... */ }) => void;
    handleResolveHomoFaberFortunaeSuae: (payload: { option: 'normal' | 'corrupt'; card: PlayerCard & { type: 'city' } }) => void;
    handleResolveAleaIactaEst: (payload: { option: 'normal' | 'corrupt' }) => void;
    onSetAleaIactaEstResults: (results: BattleDieResult[]) => void;
    handleResolveAbundansCautelaNonNocet: (payload: { option: 'normal' | 'corrupt' }) => void;
    handleResolveMeliusCavereQuamPavere: (payload: {
        option: 'normal' | 'corrupt';
        rearrangedCards: InfectionCard[];
        removedCard?: InfectionCard;
    }) => void;
    handleResolveMortuiNonMordent: (payload: {
        option: 'normal' | 'corrupt';
        selections: { [key in CityName]?: { [key in DiseaseColor]?: number } };
    }) => void;
    handleResolveFestinaLente: (payload: { 
        option: 'normal' | 'corrupt';
        destination: CityName;
        pawnSelections: { pawnId: number; legionsToMove: number }[];
    }) => void;
    handleResolveVeniVidiVici: (payload: { 
        option: 'normal' | 'corrupt';
        destination: CityName;
        legionsToMove: number;
        initiateBattle: boolean;
    }) => void;
    onConfirmFreeBattle: (payload: { legionsLost: number; barbariansToRemove: { [key in DiseaseColor]?: number }; legionsToAdd?: number }) => void;
    handleResolveCarpeDiem: (payload: { option: 'normal' | 'corrupt' }) => void;
    allPlayerHandsModalOpen: boolean;
    setAllPlayerHandsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    purifyWaterModalOpen: boolean;
    setPurifyWaterModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    selectedRegion: string | null;
    purificationChoiceModalOpen: boolean;
    setPurificationChoiceModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handlePurificationChoice: (regionName: string) => void;
    handleAgronomistPurifyChoice: (tokensToPlace: 2 | 3) => void;
    politicianGiveModalOpen: boolean; 
    setPoliticianGiveModalOpen: React.Dispatch<React.SetStateAction<boolean>>; 
    politicianSwapModalOpen: boolean; 
    setPoliticianSwapModalOpen: React.Dispatch<React.SetStateAction<boolean>>; 
    railwaymanTrainModalState: { isOpen: boolean; destination: CityName | null; passengers: Player[] }; 
    setRailwaymanTrainModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; destination: CityName | null; passengers: Player[] }>>;
    railwaymanModalOpen: boolean;
    onCancelRailwaymanBuild: () => void;
    onConfirmRuralDoctorTreat: (choice: { city: CityName; color: DiseaseColor }) => void;
    onConfirmRoyalAcademyScientistForecast: (rearrangedCards: PlayerCard[]) => void;
    onConfirmAcknowledgeForecast: () => void;
    onCancelAcknowledgeForecast: () => void;
    handleConfirmGovernmentMoves: (plannedMoves: any) => void;
    onCancelEventResolution: () => void;
    sailorPassengerModalState: { isOpen: boolean; destination: CityName | null; passengers: Player[] }; 
    setSailorPassengerModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; destination: CityName | null; passengers: Player[] }>>;
    dispatcherTargetId: number | null; 
    handleHospitalFounding: (color: DiseaseColor, city: CityName) => void;
    handleResolveMailCorrespondence: (payload: { player1Id: number; player2Id: number; card1: PlayerCard & { type: 'city' }; card2: PlayerCard & { type: 'city' }; }) => void;
    handleResolveNewRails: (connections: { from: CityName, to: CityName }[]) => void;
    newRailsSelections: { from: CityName, to: CityName }[];
}

const VaeVictisModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        option: 'normal' | 'corrupt';
        selections: { [key in CityName]?: { [key in DiseaseColor]?: number } };
    }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const [step, setStep] = useState<'select_option' | 'select_cubes'>('select_option');
    const [selectedOption, setSelectedOption] = useState<'normal' | 'corrupt' | null>(null);
    const [selections, setSelections] = useState<{ [key in CityName]?: { [key in DiseaseColor]?: number } }>({});

    const { maxToRemove } = gameState.pendingVaeVictisContext || { maxToRemove: 0 };

    useEffect(() => {
        if (show) {
            setStep('select_option');
            setSelectedOption(null);
            setSelections({});
        }
    }, [show]);

    const totalSelected = useMemo(() => {
        return Object.values(selections).reduce((citySum, citySelections) =>
            citySum + Object.values(citySelections).reduce((colorSum, count) => colorSum + (count || 0), 0), 0);
    }, [selections]);


    const handleSelectionChange = (city: CityName, color: DiseaseColor, change: number) => {
        setSelections(prev => {
            const newSelections = JSON.parse(JSON.stringify(prev)); // Deep copy to ensure reactivity
            if (!newSelections[city]) newSelections[city] = {};
            if (!newSelections[city]![color]) newSelections[city]![color] = 0;

            const currentCount = newSelections[city]![color]!;
            const availableInCity = gameState.diseaseCubes[city]?.[color] || 0;
            let newCount = currentCount + change;

            newCount = Math.max(0, Math.min(availableInCity, newCount));

            if (change > 0 && totalSelected >= maxToRemove) return prev;

            if (selectedOption === 'normal') {
                const otherSelectedCities = Object.keys(newSelections).filter(c => c !== city && Object.values(newSelections[c as CityName]!).some(val => val > 0));
                if (otherSelectedCities.length > 0 && newCount > 0) {
                    return prev;
                }
            }

            newSelections[city]![color] = newCount;
            return newSelections;
        });
    };
    
    const allInfectedCities = useMemo(() => {
        return (Object.keys(gameState.diseaseCubes) as CityName[])
            .filter(city => Object.values(gameState.diseaseCubes[city]!).some(count => count > 0))
            .sort((a, b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name));
    }, [gameState.diseaseCubes]);

    const handleConfirmClick = () => {
        if (selectedOption) {
            onConfirm({ option: selectedOption, selections });
        }
    };

    const renderOptionSelection = () => (
        <div className="space-y-4">
            <p>You may remove up to <span className="font-bold text-xl">{maxToRemove}</span> barbarian(s) from the board.</p>
            <button
                onClick={() => { setSelectedOption('normal'); setStep('select_cubes'); }}
                className="w-full p-3 bg-teal-700 hover:bg-teal-600 rounded-lg"
            >
                <h3 className="font-bold">Normal</h3>
                <p className="text-sm text-gray-300">Remove barbarians from 1 other city.</p>
            </button>
            <button
                onClick={() => { setSelectedOption('corrupt'); setStep('select_cubes'); }}
                className="w-full p-3 bg-purple-800 hover:bg-purple-700 rounded-lg"
            >
                <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                <p className="text-sm text-gray-300">Remove barbarians from any combination of cities.</p>
            </button>
        </div>
    );

    const renderCubeSelection = () => (
        <div>
            <div className="p-2 bg-gray-900 rounded-md mb-4 text-center">
                <p>Total Barbarians to Remove: <span className="font-bold text-xl">{totalSelected}</span> / {maxToRemove}</p>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {allInfectedCities.map(city => (
                    <div key={city} className="p-3 bg-gray-700 rounded-md">
                        <h4 className="font-bold text-lg mb-2">{CITIES_DATA[city].name}</h4>
                        <div className="space-y-2">
                            {(Object.keys(gameState.diseaseCubes[city]!) as DiseaseColor[]).filter(c => gameState.diseaseCubes[city]![c]! > 0).map(color => (
                                <div key={color} className="flex items-center justify-between">
                                    <span className={`font-bold capitalize ${DISEASE_TEXT_COLOR_MAP[color]}`}>
                                        {color} ({gameState.diseaseCubes[city]![color]} present)
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => handleSelectionChange(city, color, -1)} className="w-8 h-8 rounded-full bg-gray-600">-</button>
                                        <span className="w-8 text-center font-bold">{selections[city]?.[color] || 0}</span>
                                        <button onClick={() => handleSelectionChange(city, color, 1)} className="w-8 h-8 rounded-full bg-gray-600">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
             <div className="flex space-x-2 mt-4">
                <button onClick={() => setStep('select_option')} className="w-1/3 p-2 bg-gray-500 hover:bg-gray-400 rounded text-white font-bold">Back</button>
                <button
                    onClick={handleConfirmClick}
                    className="w-2/3 p-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold"
                >
                    Confirm Removal
                </button>
            </div>
        </div>
    );

    return (
        <Modal title="Vae Victis" show={show} onClose={onClose}>
            <EventCardImage cardName={EventCardName.VaeVictis} />
            {step === 'select_option' && renderOptionSelection()}
            {step === 'select_cubes' && renderCubeSelection()}
        </Modal>
    );
};

const AudentesFortunaIuvatModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: { option: 'normal' | 'corrupt' }) => void;
}> = ({ show, onClose, onConfirm }) => {
    return (
        <Modal 
            title="Audentes Fortuna Iuvat" 
            show={show} 
            onClose={onClose}
            titleColor="text-yellow-400"
        >
            <EventCardImage cardName={EventCardName.AudentesFortunaIuvat} />
            <div className="space-y-4">
                <p>Fortune favors the bold! Choose how many additional player cards to draw.</p>
                <button
                    onClick={() => onConfirm({ option: 'normal' })}
                    className="w-full p-4 bg-teal-700 hover:bg-teal-600 rounded-lg text-left"
                >
                    <h3 className="font-bold">Normal</h3>
                    <p className="text-sm text-gray-300">Draw 2 additional player cards.</p>
                </button>
                <button
                    onClick={() => onConfirm({ option: 'corrupt' })}
                    className="w-full p-4 bg-purple-800 hover:bg-purple-700 rounded-lg text-left"
                >
                    <h3 className="font-bold">Corrupt (+1 Decline)</h3>
                    <p className="text-sm text-gray-300">Draw 4 additional player cards.</p>
                </button>
            </div>
        </Modal>
    );
};

const AllPlayerHandsModal: React.FC<{
    show: boolean;
    onClose: () => void;
    gameState: GameState;
}> = ({ show, onClose, gameState }) => {
    return (
        <Modal title="All Player Hands" show={show} onClose={onClose} isSidePanel={true} sidePanelWidth="w-[450px]">
            <div className="space-y-4">
                {gameState.players.map(player => (
                    <div key={player.id} className="bg-gray-700 bg-opacity-50 p-3 rounded-lg">
                        <h3 className="font-bold text-lg mb-2">{player.name} <span className="text-sm font-normal text-gray-400">({player.role})</span></h3>
                        {player.hand.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                                {player.hand.map((card, index) => (
                                    <div key={index} className="h-28">
                                        <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No cards in hand.</p>
                        )}
                    </div>
                ))}
            </div>
        </Modal>
    );
};

const PurifyWaterModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: { region: string; cardToDiscard: PlayerCard & { type: 'city' } }) => void;
    gameState: GameState;
    selectedRegion: string | null;
}> = ({ show, onClose, onConfirm, gameState, selectedRegion }) => {
    const player = gameState.players[gameState.currentPlayerIndex];

    const purificationOptions = useMemo(() => {
        if (gameState.gameType !== 'iberia' || !selectedRegion) return [];
    
        const adjacentRegions = IBERIA_CITY_TO_REGIONS_MAP[player.location] || [];
        if (!adjacentRegions.includes(selectedRegion)) return [];
    
        const options: { region: string; card: PlayerCard & { type: 'city' }; reason: string }[] = [];
        const playerHand = player.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[];

        if (player.role === PlayerRole.RoyalAcademyScientist) {
            const adjacentRegions = IBERIA_CITY_TO_REGIONS_MAP[player.location] || [];
            if (!adjacentRegions.includes(selectedRegion)) return [];
            // Show all city cards in hand.
            return playerHand.map(card => ({
                region: selectedRegion,
                card,
                reason: 'Royal Academy Scientist ability allows any city card.'
            }));
        }
    
        // Method 1: Card matches city color
        const regionData = IBERIA_REGIONS.find(r => r.name === selectedRegion);
        if (regionData) {
            const regionCityColors = new Set(regionData.vertices.map(v => CITIES_DATA[v].color));
            playerHand.forEach(card => {
                if (regionCityColors.has(card.color)) {
                    options.push({ region: selectedRegion, card, reason: `Matches a city of the ${card.color} color in this region.` });
                }
            });
        }
    
        // Method 2: Card matches researched disease
        const researchedDiseaseColors = Object.entries(gameState.curedDiseases)
            .filter(([, isCured]) => isCured)
            .map(([color]) => color as DiseaseColor);
    
        playerHand.forEach(card => {
            if (researchedDiseaseColors.includes(card.color)) {
                // Avoid duplicates from Method 1
                if (!options.some(opt => opt.card.name === card.name && opt.card.color === card.color)) {
                    options.push({ region: selectedRegion, card, reason: `Matches the researched ${card.color} disease.` });
                }
            }
        });
    
        return options;
    }, [gameState, player, selectedRegion]);

    if (!selectedRegion) return null;
    
    return (
        <Modal title={`Purify Water in Region ${selectedRegion}`} show={show} onClose={onClose}>
            <p className="mb-4">Select a card to discard to place 2 purification tokens in Region {selectedRegion}.</p>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {purificationOptions.length > 0 ? purificationOptions.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => onConfirm({ region: option.region, cardToDiscard: option.card })}
                        className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded text-left flex items-center space-x-3 transition-colors"
                    >
                        <div className="w-16 h-24 flex-shrink-0">
                            <PlayerCardDisplay card={option.card} gameType="iberia" />
                        </div>
                        <div className="flex-grow">
                            <p className="font-bold">{getCardDisplayName(option.card)}</p>
                            <p className="text-xs text-gray-400 mt-1">{option.reason}</p>
                        </div>
                    </button>
                )) : (
                    <p className="text-center text-gray-400">You have no valid cards to perform this action.</p>
                )}
            </div>
        </Modal>
    );
};

const AgronomistPurifyChoiceModal: React.FC<{
    show: boolean;
    onConfirm: (tokensToPlace: 2 | 3) => void;
    gameState: GameState;
}> = ({ show, onConfirm, gameState }) => {
    if (!show) return null;
    const canAffordBonus = gameState.purificationTokenSupply >= 3;

    return (
        <Modal title="Agronomist: Purify Water" show={show}>
            <p className="mb-4">You have the option to place an additional purification token.</p>
            <div className="space-y-3">
                <button
                    onClick={() => onConfirm(2)}
                    className="w-full p-4 bg-sky-700 hover:bg-sky-600 rounded-lg text-left transition-colors"
                >
                    <h3 className="font-bold text-lg">Place 2 Tokens</h3>
                    <p className="text-sm text-gray-300">Place the standard amount of tokens.</p>
                </button>
                <button
                    onClick={() => onConfirm(3)}
                    disabled={!canAffordBonus}
                    className="w-full p-4 bg-green-700 hover:bg-green-600 rounded-lg text-left transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    <h3 className="font-bold text-lg">Place 3 Tokens (Bonus)</h3>
                    <p className="text-sm text-gray-300">Use your ability to place an extra token.</p>
                    {!canAffordBonus && <p className="text-xs text-yellow-300 mt-1">Not enough tokens in supply for the bonus.</p>}
                </button>
            </div>
        </Modal>
    );
};

const PoliticianGiveCardModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: { cardToGive: PlayerCard & { type: 'city' }, targetPlayerId: number }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const player = gameState.players[gameState.currentPlayerIndex];
    const [selectedCard, setSelectedCard] = useState<(PlayerCard & { type: 'city' }) | null>(null);
    const [targetPlayerId, setTargetPlayerId] = useState<number | null>(null);

    const sharableCards = useMemo(() =>
        player.hand.filter(c => c.type === 'city' && c.name === player.location) as (PlayerCard & { type: 'city' })[]
    , [player.hand, player.location]);

    const otherPlayers = gameState.players.filter(p => p.id !== player.id);

    const handleConfirmClick = () => {
        if (selectedCard && targetPlayerId !== null) {
            onConfirm({ cardToGive: selectedCard, targetPlayerId });
        }
    };

    useEffect(() => {
        if (show) {
            setSelectedCard(null);
            setTargetPlayerId(null);
        }
    }, [show]);

    return (
        <Modal title="Politician: Give Card" show={show} onClose={onClose}>
            <p className="mb-4">Select a card matching your current location ({CITIES_DATA[player.location].name}) and a player to give it to.</p>
            
            <h3 className="font-bold mb-2">1. Select Card to Give:</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
                {sharableCards.map(card => (
                    <div key={card.name} onClick={() => setSelectedCard(card)}
                         className={`cursor-pointer rounded-lg overflow-hidden h-28 ${selectedCard?.name === card.name ? 'ring-4 ring-yellow-400' : 'ring-2 ring-transparent'}`}>
                        <PlayerCardDisplay card={card} isLarge={false} gameType="iberia" />
                    </div>
                ))}
            </div>

            <h3 className="font-bold mb-2">2. Select Recipient:</h3>
            <div className="space-y-2 mb-6">
                {otherPlayers.map(p => (
                    <button key={p.id} onClick={() => setTargetPlayerId(p.id)}
                            className={`w-full p-2 rounded text-left ${targetPlayerId === p.id ? 'bg-indigo-600 ring-2 ring-white' : 'bg-gray-700'}`}>
                        {p.name} (in {CITIES_DATA[p.location].name})
                    </button>
                ))}
            </div>

            <button onClick={handleConfirmClick} disabled={!selectedCard || targetPlayerId === null}
                    className="w-full p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 rounded font-bold">
                Confirm Gift
            </button>
        </Modal>
    );
};

const PoliticianSwapCardModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: (payload: { cardFromHand: PlayerCard & { type: 'city' }, cardFromDiscard: PlayerCard & { type: 'city' } }) => void;
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    const player = gameState.players[gameState.currentPlayerIndex];
    const [handCard, setHandCard] = useState<(PlayerCard & { type: 'city' }) | null>(null);
    const [discardCard, setDiscardCard] = useState<(PlayerCard & { type: 'city' }) | null>(null);

    const cityCardsInHand = useMemo(() => player.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[], [player.hand]);
    const cityCardsInDiscard = useMemo(() => gameState.playerDiscard.filter(c => c.type === 'city') as (PlayerCard & { type: 'city' })[], [gameState.playerDiscard]);

    useEffect(() => {
        if (show) {
            setHandCard(null);
            setDiscardCard(null);
        }
    }, [show]);

    const isValidSwap = handCard && discardCard && (player.location === handCard.name || player.location === discardCard.name);

    const handleConfirmClick = () => {
        if (isValidSwap) {
            onConfirm({ cardFromHand: handCard, cardFromDiscard: discardCard });
        }
    };

    const renderCardList = (
        title: string,
        cards: (PlayerCard & { type: 'city' })[],
        selected: (PlayerCard & { type: 'city' }) | null,
        setter: (card: PlayerCard & { type: 'city' }) => void
    ) => (
        <div>
            <h3 className="font-bold text-center mb-2">{title}</h3>
            <div className="space-y-2 h-64 overflow-y-auto pr-2 bg-gray-900 p-2 rounded-md">
                {cards.map((card, i) => {
                    const isSelected = selected?.name === card.name && selected?.color === card.color;
                    const isLocationMatch = player.location === card.name;
                    return (
                        <div key={`${card.name}-${i}`} onClick={() => setter(card)}
                            className={`cursor-pointer rounded-lg overflow-hidden h-28 relative ${isSelected ? 'ring-4 ring-yellow-400' : 'ring-2 ring-transparent'}`}>
                            <PlayerCardDisplay card={card} isLarge={false} gameType="iberia" />
                            {isLocationMatch && <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white" title="Matches current location"></div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <Modal title="Politician: Swap Card" show={show} onClose={onClose} maxWidth="max-w-xl">
            <p className="mb-4">Select one card from your hand and one from the discard pile to swap. You must be in a city matching at least one of the selected cards.</p>
            <div className="grid grid-cols-2 gap-4">
                {renderCardList("Your Hand", cityCardsInHand, handCard, setHandCard)}
                {renderCardList("Discard Pile", cityCardsInDiscard, discardCard, setDiscardCard)}
            </div>
            {!isValidSwap && handCard && discardCard && (
                <p className="text-center text-red-400 mt-4">Invalid Swap: You must be in {CITIES_DATA[handCard.name].name} or {CITIES_DATA[discardCard.name].name}.</p>
            )}
            <button onClick={handleConfirmClick} disabled={!isValidSwap}
                    className="w-full mt-6 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 rounded font-bold">
                Confirm Swap
            </button>
        </Modal>
    );
};

const GovernmentMobilizationModal: React.FC<{
    show: boolean;
    onClose: () => void; // This is now used for "Cancel Event"
    onConfirm: (plannedMoves: Record<number, any>) => void; // The new handler
    gameState: GameState;
}> = ({ show, onClose, onConfirm, gameState }) => {
    // === State Management ===
    // Main state for the planned moves
    const [plannedMoves, setPlannedMoves] = useState<Record<number, any>>({});
    // Which player's move are we currently editing? (null means show the main list)
    const [viewingPlayerId, setViewingPlayerId] = useState<number | null>(null);
    // What is the specific sub-step for the player being viewed?
    const [subStep, setSubStep] = useState<'selecting_destination' | 'selecting_passenger' | 'selecting_card' | null>(null);
    // Temporary storage for the move being built
    const [tempMoveData, setTempMoveData] = useState<{
        destination: CityName;
        moveType: 'Carriage' | 'Train' | 'Ship';
    } | null>(null);
    const [destination, setDestination] = useState<CityName | null>(null);

    // Effect to reset the modal's internal state whenever it is opened
    useEffect(() => {
        if (show) {
            setPlannedMoves({});
            setViewingPlayerId(null);
            setSubStep(null);
            setTempMoveData(null);
        }
    }, [show]);

    useEffect(() => {
        // Reset destination when switching players to avoid stale selections
        if (viewingPlayerId !== null) {
            setDestination(null);
        }
    }, [viewingPlayerId]);

    // === Derived Data ===
    const playersToMove = gameState.pendingGovernmentMobilization?.playersToMove || [];
    const viewingPlayer = gameState.players.find(p => p.id === viewingPlayerId);
    const isReadyToConfirm = playersToMove.length > 0 && playersToMove.every(id => plannedMoves.hasOwnProperty(id));

    // === Helper Functions ===
    const resetToMainView = () => {
        setViewingPlayerId(null);
        setSubStep(null);
        setTempMoveData(null);
    };

    const finalizeMove = (moveData: any) => {
        if (viewingPlayerId === null) return;
        setPlannedMoves(prev => ({
            ...prev,
            [viewingPlayerId]: moveData
        }));
        resetToMainView();
    };

    // === Sub-Component Renderers ===

    // View for when a player needs to choose a passenger (Sailor/Railwayman)
    const renderPassengerSelection = () => {
        if (!viewingPlayer || !tempMoveData) return null;
        const potentialPassengers = gameState.players.filter(p => p.id !== viewingPlayer.id && p.location === viewingPlayer.location);

        return (
            <div>
                <h4 className="font-bold text-lg mb-2">Take a Passenger?</h4>
                <p className="text-sm text-gray-400 mb-4">{viewingPlayer.name} ({viewingPlayer.role}) can take one other player with them on this {tempMoveData.moveType} move.</p>
                <div className="space-y-2">
                    <button onClick={() => finalizeMove(tempMoveData)} className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded">Travel Alone</button>
                    {potentialPassengers.map(passenger => (
                        <button key={passenger.id} onClick={() => finalizeMove({ ...tempMoveData, passengerId: passenger.id })} className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded">
                            Take {passenger.name}
                        </button>
                    ))}
                </div>
                <button onClick={() => setSubStep('selecting_destination')} className="w-full mt-4 text-sm text-gray-400 hover:text-white">← Back to Move Type</button>
            </div>
        );
    };

    // View for when a non-Sailor needs to discard a card for a ship move
    const renderCardSelection = () => {
        if (!viewingPlayer || !tempMoveData || tempMoveData.moveType !== 'Ship') return null;

        const destinationData = CITIES_DATA[tempMoveData.destination];
        const requiredColors = new Set(destinationData.boardColors || [destinationData.color]);
        const validCards = viewingPlayer.hand.filter(c => c.type === 'city' && requiredColors.has(c.color)) as (PlayerCard & { type: 'city' })[];

        if (validCards.length === 0) {
            return (
                 <div>
                    <h4 className="font-bold text-lg mb-2 text-red-400">No Valid Card</h4>
                    <p className="text-sm text-gray-400 mb-4">You do not have a card matching the color of {destinationData.name} to perform this move.</p>
                    <button onClick={() => setSubStep('selecting_destination')} className="w-full mt-4 text-sm text-gray-400 hover:text-white">← Back to Move Type</button>
                </div>
            )
        }

        return (
            <div>
                <h4 className="font-bold text-lg mb-2">Discard a Card for Ship Move</h4>
                <p className="text-sm text-gray-400 mb-4">Select a card matching the color of {destinationData.name} to discard.</p>
                <div className="grid grid-cols-3 gap-2">
                    {validCards.map((card, index) => (
                        <div key={index} onClick={() => finalizeMove({ ...tempMoveData, cardToDiscard: card })} className="h-28 cursor-pointer transform hover:scale-105 transition-transform">
                            <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                        </div>
                    ))}
                </div>
                <button onClick={() => setSubStep('selecting_destination')} className="w-full mt-4 text-sm text-gray-400 hover:text-white">← Back to Move Type</button>
            </div>
        );
    };

    // View for selecting a destination and move type
    const renderMoveSelection = () => {
        if (!viewingPlayer) return null;

        const canMoveByCarriage = destination && CONNECTIONS[viewingPlayer.location].includes(destination);
        const canMoveByTrain = destination && isReachableByTrain(viewingPlayer.location, destination, gameState.railroads);
        const destinationData = destination ? CITIES_DATA[destination] : null;
        const requiredCardColor = destinationData ? destinationData.color : null;
        const hasValidCardForShipMove = viewingPlayer.hand.some(c => c.type === 'city' && c.color === requiredCardColor);
        const isSailor = viewingPlayer.role === PlayerRole.Sailor;
        const canMoveByShip = destination && IBERIA_PORT_CITIES.has(viewingPlayer.location) && IBERIA_PORT_CITIES.has(destination) && (isSailor || hasValidCardForShipMove);
        
        const handleMoveTypeClick = (moveType: 'Carriage' | 'Train' | 'Ship') => {
            if (!destination) return;
            const currentMoveData = { destination, moveType };
            setTempMoveData(currentMoveData);
            
            const hasPassengers = gameState.players.some(p => p.id !== viewingPlayer.id && p.location === viewingPlayer.location);

            if (moveType === 'Train' && viewingPlayer.role === PlayerRole.Railwayman && hasPassengers) {
                setSubStep('selecting_passenger');
            } else if (moveType === 'Ship' && viewingPlayer.role === PlayerRole.Sailor) {
                if (hasPassengers) {
                    setSubStep('selecting_passenger');
                } else {
                    finalizeMove(currentMoveData); // Sailor sails alone
                }
            } else if (moveType === 'Ship' && viewingPlayer.role !== PlayerRole.Sailor) {
                setSubStep('selecting_card');
            } else {
                finalizeMove(currentMoveData); // Carriage or standard Train/Ship move
            }
        };

        return (
            <div>
                <div className="flex justify-between items-center mb-4">
                     <button onClick={resetToMainView} className="text-sm text-gray-400 hover:text-white">← Back to List</button>
                     <button onClick={() => finalizeMove({ moveType: 'skip' })} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs font-semibold">Don't Move</button>
                </div>

                <h3 className="font-bold text-lg mb-2 text-center">Plan Move for {viewingPlayer.name}</h3>
                
                <div className="bg-gray-900 p-2 rounded-md mb-4">
                    <label htmlFor="city-select" className="text-xs text-gray-400 block mb-1">Select Destination City:</label>
                    <select id="city-select" value={destination || ''} onChange={(e) => setDestination(e.target.value as CityName)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded">
                        <option value="" disabled>Choose a city...</option>
                        {(Object.keys(IBERIA_CITIES_DATA) as CityName[]).sort((a, b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name)).map(city => (
                            <option key={city} value={city} disabled={city === viewingPlayer.location}>{CITIES_DATA[city].name}</option>
                        ))}
                    </select>
                </div>
                
                {destination && (
                    <div className="space-y-2">
                        <h4 className="text-center text-sm font-semibold">Available Moves to {CITIES_DATA[destination].name}:</h4>
                        <button disabled={!canMoveByCarriage} onClick={() => handleMoveTypeClick('Carriage')} className="w-full p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded">Move by Carriage/Boat</button>
                        <button disabled={!canMoveByTrain} onClick={() => handleMoveTypeClick('Train')} className="w-full p-2 bg-stone-500 hover:bg-stone-400 disabled:bg-gray-600 rounded">Move by Train</button>
                        <button disabled={!canMoveByShip} onClick={() => handleMoveTypeClick('Ship')} className="w-full p-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 rounded">Move by Ship</button>
                    </div>
                )}
                <div className="mt-6 pt-4 border-t border-gray-600">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">{viewingPlayer.name}'s Hand:</h4>
                    {viewingPlayer.hand.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                            {viewingPlayer.hand.map((card, index) => (
                                <div key={index} className="h-28">
                                    <PlayerCardDisplay card={card} isLarge={false} gameType={gameState.gameType} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500 italic text-center">Hand is empty.</p>
                    )}
                </div>
            </div>
        );
    };

    // Main view showing the list of all players and their planned moves
    const renderMainList = () => {
        return (
            <div>
                <p className="mb-4 text-sm text-gray-300">Each player gets one free move. Plan each player's move, then confirm them all at once.</p>
                <div className="space-y-2 mb-6">
                    {playersToMove.map(playerId => {
                        const player = gameState.players.find(p => p.id === playerId)!;
                        const plan = plannedMoves[playerId];
                        
                        let planText = <span className="text-gray-500 italic">Awaiting plan...</span>;
                        if (plan) {
                            if (plan.moveType === 'skip') {
                                planText = <span className="text-gray-400">Not moving.</span>;
                            } else {
                                const destName = CITIES_DATA[plan.destination].name;
                                let details = '';
                                if (plan.passengerId !== undefined) {
                                    const passengerName = gameState.players.find(p => p.id === plan.passengerId)!.name;
                                    details = ` with ${passengerName}`;
                                } else if (plan.cardToDiscard) {
                                    details = ` (discarding card)`;
                                }
                                planText = <><span className="font-semibold">{plan.moveType}</span> to <span className="text-yellow-300">{destName}</span>{details}</>;
                            }
                        }

                        return (
                            <button key={playerId} onClick={() => { setViewingPlayerId(playerId); setSubStep('selecting_destination'); }} className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left flex justify-between items-center transition-colors">
                                <div>
                                    <p className="font-bold">{player.name}</p>
                                    <p className="text-xs">{planText}</p>
                                </div>
                                <span className="text-xs font-semibold">EDIT</span>
                            </button>
                        );
                    })}
                </div>
                <button
                    disabled={!isReadyToConfirm}
                    onClick={() => onConfirm(plannedMoves)}
                    className="w-full p-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-bold"
                >
                    Confirm All Moves
                </button>
            </div>
        );
    };

    // Determine which view to render inside the modal
    const renderContent = () => {
        if (viewingPlayerId !== null) {
            switch (subStep) {
                case 'selecting_destination': return renderMoveSelection();
                case 'selecting_passenger': return renderPassengerSelection();
                case 'selecting_card': return renderCardSelection();
                default: return renderMoveSelection();
            }
        }
        return renderMainList();
    };

    return (
        <Modal title="Government Mobilization" show={show} onClose={onClose} isSidePanel={true}>
            {renderContent()}
        </Modal>
    );
};

export const GameModals: React.FC<GameModalsProps> = (props) => {
    const { 
        gameState, setShareModalState, setDispatchSummonModalState, setTakeEventModalState, 
        setTreatDiseaseModalState, setCollectSampleModalState, setCureDiseaseModalState, 
        setExpertFlightModalOpen, setReturnSamplesModalState, setResilientPopulationModalState, 
        setLocalLiaisonShareModalState, setVirologistTreatModalOpen, setViewingDiscard, 
        setViewEventInfo,
        enlistBarbariansModalState, setEnlistBarbariansModalState,
        freeEnlistBarbariansModalState, setFreeEnlistBarbariansModalState, onConfirmFreeEnlistBarbarians,
        mercatorShareModalState, setMercatorShareModalState, handleConfirmMercatorShare,
        praefectusRecruitModalState, setPraefectusRecruitModalState, handleConfirmPraefectusRecruit,
        fabrumFlightModalState, setFabrumFlightModalState, handleConfirmFabrumFlight,
        marchModalState, setMarchModalState, handleConfirmMarch,
        sailModalState, setSailModalState, handleConfirmSail,
        reginaFoederataMoveModalState, setReginaFoederataMoveModalState, handleConfirmReginaFoederataMove,
        battleModalState, setBattleModalState, onRollBattleDice, onConfirmBattle,
        handleChooseStartingCity,
        onInitiateVestalisDrawEvent, handleConfirmVestalisDrawEvent, handleConfirmVestalisDrawAction, handleCancelVestalisDrawAction,
        handleConfirmVestalisPlayerCardDraw,
        handleResolveDoUtDes, handleResolveVaeVictis, handleResolveSiVisPacemParaBellum, handleResolveHicManebimusOptime,
        handleResolveAudentesFortunaIuvat, handleResolveMorsTuaVitaMea, handleResolveHomoFaberFortunaeSuae,
        handleResolveAleaIactaEst, onSetAleaIactaEstResults, handleResolveAbundansCautelaNonNocet, handleResolveMeliusCavereQuamPavere,
        handleResolveMortuiNonMordent, handleResolveFestinaLente,handleResolveVeniVidiVici, onConfirmFreeBattle, handleResolveCarpeDiem,
        allPlayerHandsModalOpen, setAllPlayerHandsModalOpen, purifyWaterModalOpen, setPurifyWaterModalOpen, selectedRegion, purificationChoiceModalOpen,
        setPurificationChoiceModalOpen, handlePurificationChoice, handleAgronomistPurifyChoice, politicianGiveModalOpen, setPoliticianGiveModalOpen,
        politicianSwapModalOpen, setPoliticianSwapModalOpen, railwaymanTrainModalState, setRailwaymanTrainModalState, railwaymanModalOpen, onCancelRailwaymanBuild,
        onConfirmRuralDoctorTreat, onConfirmRoyalAcademyScientistForecast, onConfirmAcknowledgeForecast, onCancelAcknowledgeForecast,
        handleAction, handleConfirmGovernmentMoves, onCancelEventResolution, sailorPassengerModalState, setSailorPassengerModalState, dispatcherTargetId,
        handleHospitalFounding, handleResolveMailCorrespondence, handleResolveNewRails, newRailsSelections,
    } = props;
    
    const T = getTerminology(gameState)
    
    const handleConfirmBattleWrapper = (selectedCubes: { [key in DiseaseColor]?: number }) => {
        const payload = {
            legionsLost: battleModalState.legionsLost,
            barbariansToRemove: selectedCubes,
            legionsToAdd: battleModalState.legionsToAdd,
        };
        if (battleModalState.isFreeAction) {
            onConfirmFreeBattle(payload);
        } else {
            onConfirmBattle(selectedCubes);
        }
    };
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    const outOfTurnActionsComponent = (
        <>
            <PlayableEvents
                gameState={gameState}
                onPlayEventCard={props.handlePlayEventCard}
                onPlayContingencyCard={props.onPlayContingencyCard}
                onViewEventInfo={props.setViewEventInfo}
                onInitiatePlayResilientPopulation={props.onInitiatePlayResilientPopulation}
            />
            <FieldOperativeActions
                gameState={gameState}
                onInitiateReturnSamples={(playerId: number) => setReturnSamplesModalState({ isOpen: true, player: gameState.players.find(p => p.id === playerId) || null })}
            />
        </>
    );
    
    const playableRVD = useMemo(() => {
        for (const player of gameState.players) {
            if (player.hand.some(c => c.type === 'event' && c.name === EventCardName.RapidVaccineDeployment)) {
                return { ownerId: player.id, from: 'hand' as const };
            }
            if (player.contingencyCard === EventCardName.RapidVaccineDeployment) {
                return { ownerId: player.id, from: 'contingency' as const };
            }
        }
        return null;
    }, [gameState.players]);

    const epiTakeOptions = useMemo(() => {
        if (gameState.gamePhase !== GamePhase.ResolvingEpidemiologistTake) return [];
        const otherPlayersInCity = gameState.players.filter(p => p.id !== currentPlayer.id && p.location === currentPlayer.location);
        return otherPlayersInCity.flatMap(player => 
            (player.hand.filter(c => c.type === 'city') as (PlayerCard & { type: 'city'})[]).map(card => ({ player, card }))
        );
    }, [gameState.gamePhase, gameState.players, currentPlayer]);
    
    return (
        <>
            <ShareKnowledgeModal
                show={props.shareModalState.isOpen}
                onClose={() => setShareModalState({ isOpen: false, options: [] })}
                options={props.shareModalState.options}
                onConfirm={(option) => {
                    handleAction('ShareKnowledge', option);
                    setShareModalState({ isOpen: false, options: [] });
                }}
                players={gameState.players}
                gameType={gameState.gameType}
            />
             <MercatorShareModal
                show={mercatorShareModalState.isOpen}
                onClose={() => setMercatorShareModalState({ isOpen: false, options: [] })}
                options={mercatorShareModalState.options}
                onConfirm={handleConfirmMercatorShare}
                players={gameState.players}
            />
            <PraefectusRecruitModal
                show={praefectusRecruitModalState.isOpen}
                onClose={() => setPraefectusRecruitModalState({ isOpen: false, validCards: [], availableLegions: 0 })}
                onConfirm={handleConfirmPraefectusRecruit}
                validCards={praefectusRecruitModalState.validCards}
                availableLegions={praefectusRecruitModalState.availableLegions}
                gameState={gameState}
            />
            <FabrumFlightModal
                show={fabrumFlightModalState.isOpen}
                onClose={() => setFabrumFlightModalState({ isOpen: false, destination: null })}
                onConfirm={handleConfirmFabrumFlight}
                gameState={gameState}
                destination={fabrumFlightModalState.destination}
            />
            <DispatchSummonModal
                show={props.dispatchSummonModalState.isOpen}
                onClose={() => setDispatchSummonModalState({ isOpen: false })}
                gameState={gameState}
                onConfirm={(pawnId, city) => {
                    handleAction('DispatcherSummon', { pawnToMoveId: pawnId, destinationCity: city });
                    setDispatchSummonModalState({ isOpen: false });
                }}
            />
            <TakeEventCardModal
                show={props.takeEventModalState.isOpen}
                onClose={() => setTakeEventModalState({ isOpen: false, cards: [] })}
                cards={props.takeEventModalState.cards}
                onConfirm={(cardName) => {
                    handleAction('TakeEventCard', { cardName });
                    setTakeEventModalState({ isOpen: false, cards: [] });
                }}
            />
            <TreatDiseaseModal
                show={props.treatDiseaseModalState.isOpen}
                onClose={() => setTreatDiseaseModalState({ isOpen: false, availableColors: [] })}
                availableColors={props.treatDiseaseModalState.availableColors}
                onConfirm={(color) => {
                    handleAction('TreatDisease', { city: currentPlayer.location, color: color });
                    setTreatDiseaseModalState({ isOpen: false, availableColors: [] });
                }}
            />
            <CureDiseaseModal
                show={props.cureDiseaseModalState.isOpen}
                onClose={() => setCureDiseaseModalState({ isOpen: false, options: [] })}
                options={props.cureDiseaseModalState.options}
                onConfirm={props.onConfirmCureDisease}
                gameState={gameState}
            />
            {gameState.selectedCity && (
                <ExpertFlightModal
                    show={props.expertFlightModalOpen}
                    onClose={() => setExpertFlightModalOpen(false)}
                    player={currentPlayer}
                    destination={gameState.selectedCity}
                    onConfirm={(cardName) => {
                        handleAction('ExpertFlight', { destination: gameState.selectedCity, cardName });
                        setExpertFlightModalOpen(false);
                    }}
                />
            )}
            <CollectSampleModal 
                show={props.collectSampleModalState.isOpen}
                onClose={() => setCollectSampleModalState({ isOpen: false, availableColors: []})}
                availableColors={props.collectSampleModalState.availableColors}
                onConfirm={(color) => {
                    handleAction('CollectSample', { color });
                    setCollectSampleModalState({ isOpen: false, availableColors: []});
                }}
            />
             <LocalLiaisonShareModal 
                show={props.localLiaisonShareModalState.isOpen}
                onClose={() => props.setLocalLiaisonShareModalState({ isOpen: false, options: []})}
                options={props.localLiaisonShareModalState.options}
                onConfirm={({ card, toPlayerId }) => {
                    handleAction('LocalLiaisonShare', { card, toPlayerId });
                    props.setLocalLiaisonShareModalState({ isOpen: false, options: [] });
                }}
            />
            <VirologistTreatModal
                show={props.virologistTreatModalOpen}
                onClose={() => setVirologistTreatModalOpen(false)}
                gameState={gameState}
                onConfirm={(payload) => {
                    handleAction('VirologistRemoteTreat', payload);
                    setVirologistTreatModalOpen(false);
                }}
            />
             <MarchModal
                show={marchModalState.isOpen}
                onClose={() => setMarchModalState({ isOpen: false, destination: null, availableLegions: 0 })}
                onConfirm={handleConfirmMarch}
                destination={marchModalState.destination}
                availableLegions={marchModalState.availableLegions}
                maxToMove={3}
            />
            <SailModal
                show={sailModalState.isOpen}
                onClose={() => setSailModalState({ isOpen: false, destination: null, availableLegions: 0, validCards: [] })}
                onConfirm={({ legions, card }) => {
                    handleConfirmSail({ legionsToMove: legions, cardToDiscard: card });
                }}
                destination={sailModalState.destination}
                availableLegions={sailModalState.availableLegions}
                validCards={sailModalState.validCards}
                gameState={gameState}
                T={T}
            />
            <ReginaFoederataMoveModal
                show={reginaFoederataMoveModalState.isOpen}
                onClose={() => setReginaFoederataMoveModalState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirmReginaFoederataMove}
                modalState={reginaFoederataMoveModalState}
                gameState={gameState}
            />
             <EnlistBarbariansModal
                show={enlistBarbariansModalState.isOpen}
                onClose={() => setEnlistBarbariansModalState({ isOpen: false, options: [] })}
                options={enlistBarbariansModalState.options}
                onConfirm={({ cardToDiscard }) => {
                    handleAction('EnlistBarbarians', { cardToDiscard });
                    setEnlistBarbariansModalState({ isOpen: false, options: [] });
                }}
                gameState={gameState}
            />
             <FreeEnlistBarbariansModal
                show={freeEnlistBarbariansModalState.isOpen}
                onClose={() => setFreeEnlistBarbariansModalState({ isOpen: false, options: [] })}
                options={freeEnlistBarbariansModalState.options}
                onConfirm={onConfirmFreeEnlistBarbarians}
                gameState={gameState}
            />
            <BattleModal
                show={battleModalState.isOpen}
                onClose={() => setBattleModalState(prev => ({ ...prev, step: 'chooseDice', isOpen: false }))}
                modalState={battleModalState}
                setBattleModalState={setBattleModalState}
                onRoll={onRollBattleDice}
                onConfirm={handleConfirmBattleWrapper} 
                onSetResults={onSetAleaIactaEstResults}
                gameState={gameState}
            />
            <RailwaymanDoubleBuildModal
                show={props.railwaymanModalOpen}
                onClose={props.onCancelRailwaymanBuild}
            />
            <RuralDoctorTreatModal
                show={gameState.gamePhase === GamePhase.ResolvingRuralDoctorTreat}
                onClose={props.onCancelEventResolution} // Using a generic cancel works here
                onConfirm={props.onConfirmRuralDoctorTreat}
                options={gameState.pendingRuralDoctorChoice || []}
            />
            <RoyalAcademyScientistConfirmationModal
                show={gameState.gamePhase === GamePhase.ConfirmingRoyalAcademyScientistForecast}
                onConfirm={props.onConfirmAcknowledgeForecast}
                onCancel={props.onCancelAcknowledgeForecast}
            />
            <RoyalAcademyScientistForecastModal
                show={gameState.gamePhase === GamePhase.ResolvingRoyalAcademyScientistForecast}
                onClose={() => props.onCancelEventResolution()}
                onConfirm={props.onConfirmRoyalAcademyScientistForecast}
                gameState={gameState}
            />

            {/* Turn Phase Modals */}
            <ChooseStartingCityModal
                show={gameState.gamePhase === GamePhase.ChoosingStartingCity}
                gameState={gameState}
                onConfirm={handleChooseStartingCity}
            />
            <EndOfActionsModal
                show={gameState.gamePhase === GamePhase.PreDrawPlayerCards}
                onDraw={props._drawPlayerCards}
                onUndo={props.handleUndoAction}
                canUndo={gameState.actionHistory.length > 0}
                outOfTurnActionsComponent={outOfTurnActionsComponent}
                gameState={gameState}
                onInitiateFieldDirectorMove={props.onInitiateFieldDirectorMove}
                onInitiateEpidemiologistTake={props.onInitiateEpidemiologistTake}
                onInitiateVestalisDrawEvent={onInitiateVestalisDrawEvent}
            />
             {props.drawnPlayerCards && (
                <DrawCardsModal
                    show={gameState.gamePhase === GamePhase.DrawingPlayerCards}
                    cards={props.drawnPlayerCards}
                    onConfirm={props.handleConfirmPlayerDraw}
                    outOfTurnActionsComponent={outOfTurnActionsComponent}
                    gameState={gameState}
                    onInitiateVestalisDrawEvent={onInitiateVestalisDrawEvent}
                />
            )}
            <VestalisPlayerCardDrawModal
                show={gameState.gamePhase === GamePhase.ResolvingVestalisPlayerCardDraw}
                gameState={gameState}
                onConfirm={handleConfirmVestalisPlayerCardDraw}
                outOfTurnActionsComponent={outOfTurnActionsComponent}
                onInitiateVestalisDrawEvent={props.onInitiateVestalisDrawEvent}
            />
            {gameState.playerToDiscardId !== null && (
                 <DiscardModal
                    gameState={gameState}
                    getHandLimit={props.getHandLimit}
                    onConfirm={props.handleConfirmDiscard}
                    handlePlayEventCard={props.handlePlayEventCard}
                    onPlayContingencyCard={props.onPlayContingencyCard}
                    onViewEventInfo={props.setViewEventInfo}
                    onInitiateReturnSamples={(playerId: number) => setReturnSamplesModalState({ isOpen: true, player: gameState.players.find(p => p.id === playerId) || null })}
                    onInitiatePlayResilientPopulation={props.onInitiatePlayResilientPopulation}
                    onInitiateVestalisDrawEvent={onInitiateVestalisDrawEvent}
                />
            )}
            <InfectionStepModal
                show={gameState.gamePhase === GamePhase.InfectionStep && props.infectionStepState.revealedCard !== null}
                card={props.infectionStepState.revealedCard}
                onConfirm={props.handleProcessInfectionStep}
                outOfTurnActionsComponent={outOfTurnActionsComponent}
                gameState={gameState}
                infectionStepState={props.infectionStepState}
                onInitiateVestalisDrawEvent={onInitiateVestalisDrawEvent}
            />
            <EpidemicAnnounceModal
                show={gameState.gamePhase === GamePhase.EpidemicAnnounceInfect}
                onConfirm={props.handleConfirmEpidemicInfect}
                gameState={gameState}
                onPlayEventCard={props.handlePlayEventCard}
                onPlayContingencyCard={props.onPlayContingencyCard}
                onViewEventInfo={props.setViewEventInfo}
                onInitiatePlayResilientPopulation={props.onInitiatePlayResilientPopulation}
            />
            <IntensifyModal
                show={props.intensifyModalOpen}
                onConfirm={props.executeIntensify}
                gameState={gameState}
            />
            <PostEpidemicEventModal
                show={gameState.gamePhase === GamePhase.PostEpidemicEventWindow}
                onContinue={props.handleContinueToInfectionPhase}
                outOfTurnActionsComponent={outOfTurnActionsComponent}
                gameState={gameState}
                onInitiateVestalisDrawEvent={onInitiateVestalisDrawEvent}
            />
            <PurificationChoiceModal
                show={purificationChoiceModalOpen}
                gameState={gameState}
            />

            {/* Event Modals */}
             <ResilientPopulationModal
                show={props.resilientPopulationModalState.isOpen}
                onClose={() => props.setResilientPopulationModalState({ isOpen: false, ownerId: null, from: null })}
                gameState={gameState}
                onConfirm={(card) => {
                    const { ownerId, from } = props.resilientPopulationModalState;
                    if (ownerId !== null && from !== null) {
                        props.handlePlayResilientPopulation(ownerId, from, card);
                    }
                    props.setResilientPopulationModalState({ isOpen: false, ownerId: null, from: null });
                }}
            />
            <MobileHospitalModal
                show={gameState.gamePhase === GamePhase.ResolvingMobileHospital}
                onConfirm={props.handleMobileHospitalRemove}
                gameState={gameState}
            />
             <ForecastConfirmationModal
                show={gameState.gamePhase === GamePhase.ConfirmingForecast}
                onClose={props.handleCancelForecastPlay}
                onConfirm={props.handleConfirmForecastPlay}
                gameState={gameState}
             />
             <ForecastResolutionModal
                show={gameState.gamePhase === GamePhase.ResolvingForecast}
                onClose={props.onCancelEventResolution}
                onConfirm={props.handleForecast}
                gameState={gameState}
             />
             <GovernmentGrantModal 
                show={gameState.gamePhase === GamePhase.ResolvingGovernmentGrant}
                onClose={props.onCancelEventResolution}
                onConfirm={props.handleGovernmentGrant}
                gameState={gameState}
             />
             <AirliftModal
                show={gameState.gamePhase === GamePhase.ResolvingAirlift}
                onClose={props.onCancelEventResolution}
                onConfirm={props.handleAirlift}
                gameState={gameState}
             />
            <NewAssignmentModal
                show={gameState.gamePhase === GamePhase.ResolvingNewAssignment}
                onClose={props.onCancelEventResolution}
                onConfirm={props.handleNewAssignment}
                gameState={gameState}
            />
            <SpecialOrdersModal
                show={gameState.gamePhase === GamePhase.ResolvingSpecialOrders}
                onClose={props.onCancelEventResolution}
                onConfirm={props.handleSpecialOrders}
                gameState={gameState}
            />
            <RemoteTreatmentModal
                show={gameState.gamePhase === GamePhase.ResolvingRemoteTreatment}
                onClose={props.onCancelEventResolution}
                onConfirm={props.handleRemoteTreatment}
                gameState={gameState}
                cardName={props.pendingEventCardForModal} 
            />
            <RapidVaccineDeploymentModal
                show={gameState.gamePhase === GamePhase.ResolvingRapidVaccineDeployment}
                onClose={props.onCancelEventResolution}
                onConfirm={props.handleRapidVaccineDeployment}
                gameState={gameState}
            />
            <ReExaminedResearchModal
                show={gameState.gamePhase === GamePhase.ResolvingReExaminedResearch}
                onClose={props.onCancelEventResolution}
                onConfirm={props.handleReExaminedResearch}
                gameState={gameState}
            />
            <DoUtDesModal
                show={gameState.gamePhase === GamePhase.ResolvingDoUtDes}
                onClose={props.onCancelEventResolution}
                onConfirm={handleResolveDoUtDes}
                gameState={gameState}
            />
            <VaeVictisModal
                show={gameState.gamePhase === GamePhase.ResolvingVaeVictis}
                onClose={props.onCancelEventResolution}
                onConfirm={handleResolveVaeVictis}
                gameState={gameState}
            />
            <SiVisPacemParaBellumModal
                show={gameState.gamePhase === GamePhase.ResolvingSiVisPacemParaBellum}
                onClose={props.onCancelEventResolution}
                onConfirm={handleResolveSiVisPacemParaBellum}
                gameState={gameState}
            />
            <HicManebimusOptimeModal
                show={gameState.gamePhase === GamePhase.ResolvingHicManebimusOptime}
                onClose={props.onCancelEventResolution}
                onConfirm={handleResolveHicManebimusOptime}
                gameState={gameState}
            />
            <AudentesFortunaIuvatModal
                show={gameState.gamePhase === GamePhase.ResolvingAudentesFortunaIuvat}
                onClose={props.onCancelEventResolution}
                onConfirm={handleResolveAudentesFortunaIuvat}
            />
            <MorsTuaVitaMeaModal
                show={gameState.gamePhase === GamePhase.ResolvingMorsTuaVitaMea}
                onClose={props.onCancelEventResolution}
                onConfirm={props.handleResolveMorsTuaVitaMea}
                gameState={gameState}
            />
            <HomoFaberFortunaeSuaeModal
                show={gameState.gamePhase === GamePhase.ResolvingHomoFaberFortunaeSuae}
                onClose={props.onCancelEventResolution}
                onConfirm={props.handleResolveHomoFaberFortunaeSuae}
                gameState={gameState}
            />
            <AleaIactaEstModal
                show={gameState.gamePhase === GamePhase.ResolvingAleaIactaEst}
                onClose={props.onCancelEventResolution}
                onConfirm={handleResolveAleaIactaEst}
            />
            <AbundansCautelaNonNocetModal
                show={gameState.gamePhase === GamePhase.ResolvingAbundansCautelaNonNocet}
                onClose={props.onCancelEventResolution}
                onConfirm={handleResolveAbundansCautelaNonNocet}
            />
            <MeliusCavereQuamPavereModal
                show={gameState.gamePhase === GamePhase.ResolvingMeliusCavereQuamPavere}
                onClose={props.onCancelEventResolution}
                onConfirm={handleResolveMeliusCavereQuamPavere}
                gameState={gameState}
            />
            <MortuiNonMordentModal
                show={gameState.gamePhase === GamePhase.ResolvingMortuiNonMordent}
                onClose={props.onCancelEventResolution}
                onConfirm={handleResolveMortuiNonMordent}
                gameState={gameState}
            />
            <FestinaLenteModal
                show={gameState.gamePhase === GamePhase.ResolvingFestinaLente}
                onClose={props.onCancelEventResolution}
                onConfirm={handleResolveFestinaLente}
                gameState={gameState}
            />
            <VeniVidiViciModal
                show={gameState.gamePhase === GamePhase.ResolvingVeniVidiVici && !battleModalState.isOpen}
                onClose={props.onCancelEventResolution}
                onConfirm={handleResolveVeniVidiVici}
                gameState={gameState}
            />
            <CarpeDiemModal
                show={gameState.gamePhase === GamePhase.ResolvingCarpeDiem}
                onClose={props.onCancelEventResolution}
                onConfirm={handleResolveCarpeDiem}
            />
            <GovernmentMobilizationModal
                show={gameState.gamePhase === GamePhase.ResolvingGovernmentMobilization}
                onClose={onCancelEventResolution}
                onConfirm={handleConfirmGovernmentMoves}
                gameState={gameState}
                selectedCity={gameState.selectedCity}
            />
            <HospitalFoundingModal
                show={gameState.gamePhase === GamePhase.ResolvingHospitalFounding}
                onClose={onCancelEventResolution}
                onConfirm={handleHospitalFounding}
                gameState={gameState}
            />
            <MailCorrespondenceModal
                show={gameState.gamePhase === GamePhase.ResolvingMailCorrespondence}
                onClose={onCancelEventResolution}
                onConfirm={handleResolveMailCorrespondence}
                gameState={gameState}
            />
            <NewRailsModal
                show={gameState.gamePhase === GamePhase.ResolvingNewRails}
                onClose={onCancelEventResolution}
                onConfirm={() => handleResolveNewRails(newRailsSelections)}
                selectedConnections={newRailsSelections}
            />
            <PurifyWaterEventModal
                show={gameState.gamePhase === GamePhase.ResolvingPurifyWaterEvent} 
                onClose={onCancelEventResolution}
                gameState={gameState}
            />
      

            {/* Other Modals */}
            <ViewDiscardModal
                show={props.viewingDiscard !== null}
                onClose={() => setViewingDiscard(null)}
                cards={props.viewingDiscard === 'player' ? gameState.playerDiscard : gameState.infectionDiscard}
                title={props.viewingDiscard === 'player' ? 'Player Discard Pile' : 'Infection Discard Pile'}
                gameState={gameState}
            />
             <EventInfoModal
                show={props.viewEventInfo !== null}
                onClose={() => setViewEventInfo(null)}
                cardName={props.viewEventInfo}
            />
            <TroubleshooterPreviewModal
                show={gameState.gamePhase === GamePhase.ResolvingTroubleshooterPreview}
                onSkip={props.handleSkipTroubleshooterPreview}
                onConfirm={props.handleConfirmTroubleshooterPreview}
                gameState={gameState}
            />
             <PilotFlightModal
                show={gameState.gamePhase === GamePhase.ResolvingPilotFlight}
                onClose={props.handleCancelPilotFlight}
                onConfirm={props.handleConfirmPilotFlight}
                gameState={gameState}
            />
            <ReturnSamplesModal
                show={props.returnSamplesModalState.isOpen}
                onClose={() => setReturnSamplesModalState({ isOpen: false, player: null })}
                player={props.returnSamplesModalState.player}
                onConfirm={props.handleReturnSamples}
            />
            <FieldDirectorTreatModal
                show={gameState.gamePhase === GamePhase.ResolvingFieldDirectorTreat}
                onClose={props.handleCancelFieldDirectorAction}
                onConfirm={(city, color) => handleAction('TreatDisease', { city, color })}
                gameState={gameState}
            />
            <FieldDirectorMoveModal
                show={gameState.gamePhase === GamePhase.ResolvingFieldDirectorMove}
                onClose={props.handleCancelFieldDirectorAction}
                onConfirm={props.handleFieldDirectorMove}
                gameState={gameState}
            />
            <EpidemiologistTakeModal
                show={gameState.gamePhase === GamePhase.ResolvingEpidemiologistTake}
                onClose={props.handleCancelEpidemiologistTake}
                options={epiTakeOptions}
                onConfirm={props.handleEpidemiologistTakeCard}
            />
            {gameState.mutationEventResult && (
                <AcknowledgeMutationResultModal
                    show={true}
                    onAcknowledge={props.onAcknowledgeMutationResult}
                    result={gameState.mutationEventResult}
                />
            )}
            <StationRelocationModal
                show={gameState.gamePhase === GamePhase.ResolvingStationRelocation}
                onClose={props.onCancelEventResolution}
                onConfirm={props.handleStationRelocation}
                gameState={gameState}
            />
            <PostCureActionModal
                show={gameState.gamePhase === GamePhase.PostCureAction}
                onSkip={props.handleSkipPostCureAction}
                curedColor={gameState.postCureColor}
                playableRVD={playableRVD}
                onPlayRVD={(ownerId, from) => {
                    if (from === 'hand') props.handlePlayEventCard(EventCardName.RapidVaccineDeployment, ownerId)
                    else props.onPlayContingencyCard(EventCardName.RapidVaccineDeployment, ownerId)
                }}
            />
            <FortRelocationModal
                show={gameState.gamePhase === GamePhase.ResolvingFortRelocation}
                onClose={props.handleCancelFortRelocation}
                onConfirm={props.handleFortRelocation}
                gameState={gameState}
            />
            <ConfirmVestalisDrawModal
                show={gameState.gamePhase === GamePhase.ConfirmingVestalisDraw}
                onConfirm={handleConfirmVestalisDrawAction}
                onCancel={handleCancelVestalisDrawAction}
            />
            <VestalisDrawEventModal
                show={gameState.gamePhase === GamePhase.ResolvingVestalisDraw}
                onConfirm={handleConfirmVestalisDrawEvent}
                pendingVestalisDraw={gameState.pendingVestalisDraw}
                gameState={gameState}
            />
            <AllPlayerHandsModal
                show={allPlayerHandsModalOpen}
                onClose={() => setAllPlayerHandsModalOpen(false)}
                gameState={gameState}
            />
            <PurifyWaterModal
                show={purifyWaterModalOpen}
                onClose={() => setPurifyWaterModalOpen(false)}
                onConfirm={(payload) => {
                    handleAction('PurifyWater', payload);
                    setPurifyWaterModalOpen(false);
                }}
                gameState={gameState}
                selectedRegion={selectedRegion}
            />
            <AgronomistPurifyChoiceModal
                show={gameState.gamePhase === GamePhase.ResolvingAgronomistPurifyChoice}
                onConfirm={handleAgronomistPurifyChoice}
                gameState={gameState}
            />
            <PoliticianGiveCardModal
                show={politicianGiveModalOpen}
                onClose={() => setPoliticianGiveModalOpen(false)}
                gameState={gameState}
                onConfirm={(payload) => {
                    handleAction('PoliticianGiveCard', payload);
                    setPoliticianGiveModalOpen(false);
                }}
            />
            <PoliticianSwapCardModal
                show={politicianSwapModalOpen}
                onClose={() => setPoliticianSwapModalOpen(false)}
                gameState={gameState}
                onConfirm={(payload) => {
                    handleAction('PoliticianSwapCard', payload);
                    setPoliticianSwapModalOpen(false);
                }}
            />
            <NurseTokenPlacementModal
                show={gameState.gamePhase === GamePhase.NursePlacingPreventionToken}
                gameState={gameState}
            />
            <RailwaymanTrainModal
                show={railwaymanTrainModalState.isOpen}
                onClose={() => setRailwaymanTrainModalState({ isOpen: false, destination: null, passengers: [] })}
                onConfirm={(passengerId) => {
                    props.handleAction('Train', { destination: railwaymanTrainModalState.destination, passengerId }, dispatcherTargetId); // <-- PASS THE PROP HERE
                    setRailwaymanTrainModalState({ isOpen: false, destination: null, passengers: [] });
                }}
                destination={railwaymanTrainModalState.destination}
                passengers={railwaymanTrainModalState.passengers}
            />
            <SailorPassengerModal
                show={props.sailorPassengerModalState.isOpen}
                onClose={() => props.setSailorPassengerModalState({ isOpen: false, destination: null, passengers: [] })}
                onConfirm={(passengerId) => {
                    handleAction('Sail', { destination: props.sailorPassengerModalState.destination, passengerId }, props.dispatcherTargetId);
                    props.setSailorPassengerModalState({ isOpen: false, destination: null, passengers: [] });
                }}
                destination={props.sailorPassengerModalState.destination}
                passengers={props.sailorPassengerModalState.passengers}
            />
        </>
    );
};
