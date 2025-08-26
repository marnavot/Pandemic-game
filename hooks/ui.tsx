
import React from 'react';
import { PlayerCard, InfectionCard, GameState, CityName, DiseaseColor, CITIES_DATA, EventCardName, Player, PlayerRole, GamePhase, VirulentStrainEpidemicCardName, MutationEventCardName, FALLOFROME_CITIES_DATA } from '../types';

export const PLAYER_PAWN_COLORS = ['#ec4899', '#22d3ee', '#f97316', '#84cc16', '#e2e8f0']; // Tailwind: pink-500, cyan-400, orange-500, lime-500, slate-200

export const PLAYER_ROLE_COLORS: Record<PlayerRole, string> = {
    [PlayerRole.ContingencyPlanner]: "#49c2cd",
    [PlayerRole.Dispatcher]: "#d680b9",
    [PlayerRole.Medic]: "#f38740",
    [PlayerRole.OperationsExpert]: "#83c356",
    [PlayerRole.QuarantineSpecialist]: "#1a7a5c",
    [PlayerRole.Researcher]: "#966c56",
    [PlayerRole.Scientist]: "#f0f4ef",
    [PlayerRole.Archivist]: "#377acf",
    [PlayerRole.ContainmentSpecialist]: "#ddd09b",
    [PlayerRole.Epidemiologist]: "#d7a894",
    [PlayerRole.FieldOperative]: "#f6ea64",
    [PlayerRole.Generalist]: "#909392",
    [PlayerRole.Troubleshooter]: "#de4237",
    [PlayerRole.FieldDirector]: "#8e166c",
    [PlayerRole.LocalLiaison]: "#de88a5",
    [PlayerRole.Pilot]: "#6cc8da",
    [PlayerRole.Virologist]: "#3ab16c",
    [PlayerRole.Consul]: "#f5c435",
    [PlayerRole.MagisterMilitum]: "#de72a8",
    [PlayerRole.Mercator]: "#5db34b",
    [PlayerRole.PraefectusClassis]: "#149da6",
    [PlayerRole.PraefectusFabrum]: "#b4a4a9",
    [PlayerRole.ReginaFoederata]: "#7b4d25",
    [PlayerRole.Vestalis]: "#7d4296",
    [PlayerRole.Agronomist]: "#67ba44",
    [PlayerRole.Politician]: "#f1d81c",
    [PlayerRole.Nurse]: "#d44944",
    [PlayerRole.Railwayman]: "#2d3031",
    [PlayerRole.RoyalAcademyScientist]: "#c9c8c5",
    [PlayerRole.RuralDoctor]: "#d574aa",
    [PlayerRole.Sailor]: "#35aac9",
};

export const CITY_COLOR_CLASSES: Record<DiseaseColor, string> = {
  [DiseaseColor.Blue]: "bg-blue-500",
  [DiseaseColor.Yellow]: "bg-yellow-400",
  [DiseaseColor.Black]: "bg-gray-500",
  [DiseaseColor.Red]: "bg-red-600",
  [DiseaseColor.Purple]: "bg-purple-600",
  [DiseaseColor.White]: "bg-gray-200",
  [DiseaseColor.Green]: "bg-green-500",
  [DiseaseColor.Orange]: "bg-orange-500",
};

export const DISEASE_TEXT_COLOR_MAP: Record<DiseaseColor, string> = {
  [DiseaseColor.Blue]: "text-blue-400",
  [DiseaseColor.Yellow]: "text-yellow-300",
  [DiseaseColor.Black]: "text-gray-300",
  [DiseaseColor.Red]: "text-red-400",
  [DiseaseColor.Purple]: "text-purple-400",
  [DiseaseColor.White]: "text-gray-200",
  [DiseaseColor.Green]: "text-green-400",
  [DiseaseColor.Orange]: "text-orange-400",
};

export const getCardDisplayName = (card: PlayerCard | InfectionCard): string => {
    switch (card.type) {
        case 'city':
            // For Fall of Rome cards, we want to show the specific color of the card.
            // This works for player cards (which now have a color) and infection cards.
            if (FALLOFROME_CITIES_DATA.hasOwnProperty(card.name)) {
                const color = (card as { color: DiseaseColor }).color;
                return `${CITIES_DATA[card.name].name} (${color.charAt(0).toUpperCase() + color.slice(1)})`;
            }
            return CITIES_DATA[card.name].name;
        case 'event':
            return card.name;
        case 'epidemic':
            return 'Epidemic';
        case 'virulent_strain_epidemic':
            return `Virulent Strain: ${card.name}`;
        case 'mutation_event':
            return `Mutation: ${card.name}`;
        case 'mutation':
            return 'Mutation';
    }
    return 'Unknown Card';
};

export const PlayerCardDisplay: React.FC<{ card: PlayerCard; isLarge?: boolean; gameType?: 'pandemic' | 'fallOfRome' }> = ({ card, isLarge = false, gameType = 'pandemic' }) => {
    const sizeClasses = isLarge ? 'w-full h-full text-sm p-2' : 'w-full h-full text-xs p-1';
    const baseClasses = 'flex flex-col justify-center items-center text-center rounded-lg shadow-md';
    const isFallOfRome = gameType === 'fallOfRome';

    if (card.type === 'city') {
        const city = CITIES_DATA[card.name];
        // For Fall of Rome, the card's specific color determines its appearance.
        // For Pandemic, it uses the city's default color. The card.color property will match city.color anyway.
        const cardColor = card.color;
        const textColor = (cardColor === DiseaseColor.Yellow || cardColor === DiseaseColor.White) ? 'text-black' : 'text-white';
        return (
            <div className={`${baseClasses} ${sizeClasses} ${CITY_COLOR_CLASSES[cardColor]} ${textColor}`}>
                <div className="font-bold leading-tight">{city.name}</div>
                {isLarge && (
                    <div className="text-xs mt-1">
                        {'distanceFromRoma' in city && city.distanceFromRoma !== undefined
                            ? `Dist. from Roma: ${city.distanceFromRoma}`
                            : `Pop: ${city.population.toLocaleString()}`
                        }
                    </div>
                )}
            </div>
        );
    }

    if (card.type === 'event') {
        return (
            <div className={`${baseClasses} ${sizeClasses} bg-teal-500 text-white`}>
                <div className="font-bold">Event</div>
                <div className={`mt-1 font-semibold leading-tight ${isLarge ? "text-sm" : "text-xs"}`}>{card.name}</div>
            </div>
        );
    }

    if (card.type === 'epidemic') {
        return (
            <div className={`${baseClasses} ${sizeClasses} bg-green-700 text-white`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="font-bold text-red-400 mt-2">{isFallOfRome ? 'REVOLT' : 'EPIDEMIC'}</div>
            </div>
        );
    }

    if (card.type === 'virulent_strain_epidemic') {
        return (
            <div className={`${baseClasses} ${sizeClasses} bg-purple-900 text-white`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.143 14.572a7.714 7.714 0 01-14.286 0M12 18.286v-5.143m0 0a2.571 2.571 0 100-5.143 2.571 2.571 0 000 5.143zm-4.286 2.571h8.572" /></svg>
                <div className="font-bold text-red-400 mt-2">VIRULENT STRAIN</div>
                <div className="text-xs text-purple-300 mt-1">{card.name}</div>
            </div>
        );
    }

    if (card.type === 'mutation_event') {
        return (
            <div className={`${baseClasses} ${sizeClasses} bg-indigo-700 text-white`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 3l6-3" /></svg>
                <div className="font-bold text-purple-300 mt-2">MUTATION EVENT</div>
                 <div className="text-xs text-indigo-200 mt-1">{card.name}</div>
            </div>
        );
    }

    return null;
};

export const InfectionCardDisplay: React.FC<{ card: InfectionCard; gameType?: 'pandemic' | 'fallOfRome' }> = ({ card, gameType = 'pandemic' }) => {
    const isFallOfRome = gameType === 'fallOfRome';

    if (card.type === 'city') {
        const city = CITIES_DATA[card.name];
        const cardColor = card.color;
        const textColor = (cardColor === DiseaseColor.Yellow || cardColor === DiseaseColor.White) ? 'text-black' : 'text-white';
        return (
            <div className={`w-full h-full flex flex-col justify-between items-center text-center rounded-lg shadow-md p-2 ${CITY_COLOR_CLASSES[cardColor]} ${textColor}`}>
                <div/>
                <div className="font-bold text-lg">{city.name}</div>
                <div className="text-sm font-light uppercase tracking-widest">{isFallOfRome ? 'Invasion' : 'Infection'}</div>
            </div>
        );
    }

    if (card.type === 'mutation') {
        return (
            <div className={`w-full h-full flex flex-col justify-between items-center text-center rounded-lg shadow-md text-white p-2 bg-purple-800`}>
                <div/>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 3l6-3" /></svg>
                <div className="text-lg font-bold uppercase tracking-widest text-purple-300">Mutation</div>
            </div>
        );
    }
    return null;
};

export const PlayableEvents: React.FC<{
    gameState: GameState;
    onPlayEventCard: (cardName: EventCardName, ownerId: number) => void;
    onPlayContingencyCard: (cardName: EventCardName, ownerId: number) => void;
    onViewEventInfo: (cardName: EventCardName) => void;
    onInitiatePlayResilientPopulation?: (ownerId: number, from: 'hand' | 'contingency') => void;
}> = ({ gameState, onPlayEventCard, onPlayContingencyCard, onViewEventInfo, onInitiatePlayResilientPopulation }) => {
    const playableEvents: {
        ownerId: number;
        ownerName: string;
        cardName: EventCardName;
        isContingency: boolean;
    }[] = [];

    gameState.players.forEach(player => {
        player.hand.forEach(card => {
            if (card.type === 'event' && card.name !== EventCardName.RapidVaccineDeployment) {
                playableEvents.push({
                    ownerId: player.id,
                    ownerName: player.name,
                    cardName: card.name,
                    isContingency: false,
                });
            }
        });
        if (player.role === PlayerRole.ContingencyPlanner && player.contingencyCard && player.contingencyCard !== EventCardName.RapidVaccineDeployment) {
            playableEvents.push({
                ownerId: player.id,
                ownerName: player.name,
                cardName: player.contingencyCard,
                isContingency: true,
            });
        }
    });
    
    if (playableEvents.length === 0) {
        return null;
    }

    const handlePlay = (event: { ownerId: number, cardName: EventCardName, isContingency: boolean }) => {
        // Resilient Population can be played at specific times, handled by a modal.
        if (event.cardName === EventCardName.ResilientPopulation && onInitiatePlayResilientPopulation) {
            onInitiatePlayResilientPopulation(event.ownerId, event.isContingency ? 'contingency' : 'hand');
            return;
        }

        if (event.isContingency) {
            onPlayContingencyCard(event.cardName, event.ownerId);
        } else {
            onPlayEventCard(event.cardName, event.ownerId);
        }
    };

    return (
        <div className="bg-gray-900 p-3 rounded-lg mt-2">
            <h3 className="font-orbitron text-teal-400 mb-2">Playable Events</h3>
            <div className="space-y-2">
                {playableEvents.map((event, index) => {
                    const { cardName } = event;
                    let isDisabled = false;
                    const isEpidemic = [GamePhase.Epidemic, GamePhase.EpidemicAnnounceInfect, GamePhase.EpidemicIntensify].includes(gameState.gamePhase);

                    if (gameState.gamePhase === GamePhase.GameOver) {
                        isDisabled = true;
                    } else {
                        switch (cardName) {
                            case EventCardName.AudentesFortunaIuvat:
                                if (gameState.gamePhase !== GamePhase.DrawingPlayerCards && gameState.gamePhase !== GamePhase.ResolvingVestalisPlayerCardDraw) {
                                    isDisabled = true;
                                }
                                break;
                            case EventCardName.VaeVictis:
                                if (!gameState.pendingVaeVictisContext) {
                                    isDisabled = true;
                                }
                                break;

                            case EventCardName.ResilientPopulation:
                                // Can be played at any time, but is useless if discard pile is empty of city cards.
                                if (gameState.infectionDiscard.filter(c => c.type === 'city').length === 0) {
                                    isDisabled = true;
                                }
                                break;
                            
                            case EventCardName.RemoteTreatment:
                                const remoteForbiddenPhases = [
                                    ...[GamePhase.Epidemic, GamePhase.EpidemicAnnounceInfect, GamePhase.EpidemicIntensify],
                                    GamePhase.PreInfectionPhase,
                                    GamePhase.InfectionStep,
                                ];
                                if (remoteForbiddenPhases.includes(gameState.gamePhase)) {
                                    isDisabled = true;
                                }
                                break;
                            
                            case EventCardName.CommercialTravelBan:
                                if (isEpidemic || gameState.gamePhase === GamePhase.InfectionStep) {
                                    isDisabled = true;
                                }
                                break;
                            
                            case EventCardName.ReExaminedResearch:
                                if (isEpidemic || gameState.playerDiscard.filter(c => c.type === 'city').length === 0) {
                                    isDisabled = true;
                                }
                                break;
                            
                            case EventCardName.SecondChance: {
                                const player = gameState.players.find(p => p.id === event.ownerId)!;
                                isDisabled = !gameState.playerDiscard.some(c => c.type === 'city' && c.name === player.location);
                                if (isEpidemic || gameState.gamePhase === GamePhase.DrawingPlayerCards) {
                                    isDisabled = true;
                                }
                                break;
                            }

                            default: // Most other cards
                                if (isEpidemic || gameState.gamePhase === GamePhase.DrawingPlayerCards) {
                                    isDisabled = true;
                                }
                                break;
                        }
                    }
                    
                    return (
                        <div key={index} className="flex items-center justify-between p-2 rounded-md bg-teal-900">
                            <div>
                                <span className="font-semibold">{event.cardName}</span>
                                <span className="text-xs text-gray-400 ml-2">({event.ownerName}{event.isContingency ? ', Plan' : ''})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => onViewEventInfo(event.cardName)} aria-label={`View info for ${event.cardName}`} className="w-8 h-8 rounded-full bg-teal-800 hover:bg-teal-700 flex items-center justify-center font-bold text-white transition-colors">?</button>
                                <button
                                    disabled={isDisabled}
                                    onClick={() => handlePlay(event)}
                                    className="bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-1 rounded text-white text-xs font-semibold"
                                >
                                    Play
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const FieldOperativeActions: React.FC<{
    gameState: GameState;
    onInitiateReturnSamples: (playerId: number) => void;
}> = ({ gameState, onInitiateReturnSamples }) => {
    const fieldOperativesWithSamples = gameState.players.filter(p => 
        p.role === PlayerRole.FieldOperative && 
        p.samples && 
        Object.values(p.samples).some(count => count > 0)
    );

    if (fieldOperativesWithSamples.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-900 p-3 rounded-lg mt-2">
            <h3 className="font-orbitron text-sky-400 mb-2">Field Operative Actions</h3>
            <div className="space-y-2">
                {fieldOperativesWithSamples.map(player => (
                    <button 
                        key={player.id} 
                        onClick={() => onInitiateReturnSamples(player.id)}
                        className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-white font-semibold"
                    >
                        Return Samples ({player.name})
                    </button>
                ))}
            </div>
        </div>
    );
};

export const InfectionResultList: React.FC<{ title: string; results: InfectionResult[] }> = ({ title, results }) => {
    if (!results || results.length === 0) return null;

    return (
        <div className="w-full border-t border-gray-700 pt-4 mt-2">
            <h4 className="text-center font-bold mb-2 text-yellow-400">{title}</h4>
            <div className="space-y-2 text-sm text-gray-300 w-full text-left bg-black bg-opacity-20 p-2 rounded max-h-40 overflow-y-auto">
                {results.map((result, index) => {
                    let resultText;
                    if (result.purificationDefense) {
                        resultText = <><span className="text-sky-400 font-semibold">PROTECTED!</span> by token from Region {result.purificationDefense.region}.</>;
                    } else if (result.defended) {
                        resultText = <><span className="text-green-400 font-semibold">DEFENDED!</span> {result.defenseType === 'attack' ? '1 legion lost.' : `AMBUSH! ${result.legionsRemoved} legions lost.`}</>;
                    } else if (result.cubesAdded > 0) {
                        resultText = <><span className="text-red-400 font-semibold">SUCCESSFUL.</span> {result.cubesAdded} cube(s) added.</>;
                    } else {
                        resultText = <><span className="text-blue-400 font-semibold">PREVENTED.</span> No cubes added.</>;
                    }
                    return (
                        <p key={index} className="pl-2 border-l-2 border-gray-600">
                            <strong>{CITIES_DATA[result.city].name} ({result.color}):</strong> {resultText}
                        </p>
                    )
                })}
            </div>
        </div>
    );
};
