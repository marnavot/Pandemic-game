import React, { useState, useEffect } from 'react';
import { PlayerRole, GameSetupConfig, EventCardName, ALL_EVENT_CARDS, PLAYER_ROLE_INFO, EVENT_CARD_INFO, ON_THE_BRINK_ROLES, ON_THE_BRINK_EVENTS, IN_THE_LAB_ROLES, IN_THE_LAB_EVENTS, BASE_GAME_ROLES, FALLOFROME_ROLES, PANDEMIC_ROLES, PANDEMIC_EVENTS, FALLOFROME_EVENTS, IBERIA_ROLES, IBERIA_EVENTS } from '../types';
import Modal from './Modal';
import { isFirebaseInitialized } from '../services/firebase';

interface SetupScreenProps {
  onStartGame: (config: GameSetupConfig) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStartGame }) => {
  const [gameType, setGameType] = useState<'pandemic' | 'fallOfRome' | 'iberia'>('pandemic');
  const [gameMode, setGameMode] = useState<'solitaire' | 'multiplayer'>('solitaire');
  const [numPlayers, setNumPlayers] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5']);
  const [roleSelection, setRoleSelection] = useState<'random' | 'manual' | 'pool'>('random');
  const [selectedRoles, setSelectedRoles] = useState<(PlayerRole | null)[]>(Array(5).fill(null));
  const [rolePool, setRolePool] = useState<PlayerRole[]>([]);

  const [numEpidemics, setNumEpidemics] = useState(5);
  const [firstPlayerRule, setFirstPlayerRule] = useState<'random' | 'highestPopulation' | 'player1' | 'farthestFromRoma'>('random');
  const [numEvents, setNumEvents] = useState(5);
  const [eventCountRule, setEventCountRule] = useState<'manual' | 'byRules'>('byRules');
  const [eventSelection, setEventSelection] = useState<'random' | 'manual' | 'pool'>('random');
  const [selectedEvents, setSelectedEvents] = useState<EventCardName[]>([]);
  const [eventPool, setEventPool] = useState<EventCardName[]>([]);
  const [useAiNarratives, setUseAiNarratives] = useState(true);
  const [useVirulentStrainChallenge, setUseVirulentStrainChallenge] = useState(false);
  const [useMutationChallenge, setUseMutationChallenge] = useState(false);

  const [modalContent, setModalContent] = useState<{title: string, content: React.ReactNode} | null>(null);

  const { availableRoles, availableEvents } = React.useMemo(() => {
    switch (gameType) {
      case 'fallOfRome':
        return { availableRoles: FALLOFROME_ROLES, availableEvents: FALLOFROME_EVENTS };
      case 'iberia':
        return { availableRoles: IBERIA_ROLES, availableEvents: IBERIA_EVENTS };
      case 'pandemic':
      default:
        return { availableRoles: PANDEMIC_ROLES, availableEvents: PANDEMIC_EVENTS };
    }
  }, [gameType]);


  // Effect to reset configurations when game type changes to prevent invalid states
  useEffect(() => {
    setSelectedRoles(Array(5).fill(null));
    setRolePool([]);
    // Challenges are not compatible with Fall of Rome or Iberia
    if (gameType === 'fallOfRome' || gameType === 'iberia') {
      setNumEpidemics(gameType === 'fallOfRome' ? 6 : 5); // Standard for FoR, placeholder for Iberia
      setUseVirulentStrainChallenge(false);
      setUseMutationChallenge(false);
      if (firstPlayerRule === 'highestPopulation') {
        setFirstPlayerRule(gameType === 'fallOfRome' ? 'farthestFromRoma' : 'random');
      }
    } else { // pandemic
      setNumEpidemics(5); // Standard for Pandemic
      if (firstPlayerRule === 'farthestFromRoma') {
        setFirstPlayerRule('highestPopulation');
      }
    }
  }, [gameType, firstPlayerRule]);
  
  // Effect to automatically calculate event cards when "By Rules" is selected
  useEffect(() => {
    if (eventCountRule === 'byRules') {
        let calculatedNumEvents = 0;
        if (gameType === 'fallOfRome' || gameType === 'iberia') { 
            switch (numPlayers) {
                case 2: calculatedNumEvents = 4; break;
                case 3: calculatedNumEvents = 5; break;
                case 4: calculatedNumEvents = 6; break;
                case 5: calculatedNumEvents = 8; break;
                default: calculatedNumEvents = 4;
            }
        } else { // Pandemic
            if (useVirulentStrainChallenge || useMutationChallenge) {
                calculatedNumEvents = numPlayers * 2;
            } else {
                calculatedNumEvents = 5;
            }
        }
        // Clamp to max 10
        const finalNumEvents = Math.min(calculatedNumEvents, 10);
        if (finalNumEvents !== numEvents) {
            setNumEvents(finalNumEvents);
            setSelectedEvents([]);
            setEventPool([]);
        }
    }
  }, [eventCountRule, gameType, numPlayers, useVirulentStrainChallenge, useMutationChallenge, numEvents]);


  const getDisplayName = (item: PlayerRole | EventCardName): string => {
    if (ON_THE_BRINK_ROLES.includes(item as PlayerRole) || ON_THE_BRINK_EVENTS.includes(item as EventCardName)) {
        return `${item} (OtB)`;
    }
    if (IN_THE_LAB_ROLES.includes(item as PlayerRole) || IN_THE_LAB_EVENTS.includes(item as EventCardName)) {
        return `${item} (ItL)`;
    }
    return item;
  };
    
  const PandemicRulesContent = (
    <>
        <div>
            <h3 className="text-lg font-bold text-cyan-300 mb-2">Objective</h3>
            <p>You win the game as soon as cures for all four diseases (blue, yellow, black, and red) have been discovered. The players lose immediately if any of the following happens:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The Outbreaks marker reaches the last space of the outbreaks track (8 outbreaks).</li>
                <li>You need to place disease cubes of a color on the board, but there are no more cubes of that color left in the supply.</li>
                <li>A player needs to draw a card from the Player Deck, but there are no cards left.</li>
            </ul>
        </div>
        <div>
            <h3 className="text-lg font-bold text-cyan-300 mt-4 mb-2">Turn Overview</h3>
            <p>On your turn, you must perform these three steps in order:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Do up to 4 actions.</li>
                <li>Draw the top 2 cards from the Player Deck.</li>
                <li>Infect cities by drawing cards from the Infection Deck.</li>
            </ol>
        </div>
        <div>
            <h3 className="text-lg font-bold text-cyan-300 mt-4 mb-2">Player Actions</h3>
            <p>You may perform up to 4 actions each turn. You may do the same action several times, each time counting as 1 action. Your Role will give you special abilities you can use.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Movement:</strong> Drive/Ferry, Direct Flight, Charter Flight, Shuttle Flight.</li>
                <li><strong>Build a Research Station:</strong> Discard the City card that matches the city you are in to place a research station there.</li>
                <li><strong>Treat Disease:</strong> Remove 1 disease cube from the city you are in. If this disease has been cured, remove all cubes of that color instead.</li>
                <li><strong>Share Knowledge:</strong> Give the City card that matches the city you are in to a player in the same city.</li>
                <li><strong>Discover a Cure:</strong> At any research station, discard 5 City cards of the same color to cure the disease of that color.</li>
            </ul>
        </div>
    </>
  );

  const FallOfRomeRulesContent = (
    <>
        <div>
            <h3 className="text-lg font-bold text-cyan-300 mb-2">Objective</h3>
            <p>You win the game as a team if you forge an alliance with every barbarian tribe, or if you eliminate every barbarian tribe from the board. The Roman Empire falls (and you lose) if:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The Decline marker reaches the last space of the track (8 sackings).</li>
                <li>You need to place a barbarian cube on the board, but there are none left of that color.</li>
                <li>You need to place a legion on the board, but there are none left in the supply.</li>
                <li>A player needs to draw a card from the Player Deck, but there are no cards left.</li>
                <li>The city of Roma is sacked (an outbreak occurs there).</li>
            </ul>
        </div>
        <div>
            <h3 className="text-lg font-bold text-cyan-300 mt-4 mb-2">Turn Overview</h3>
            <p>On your turn, you must perform these three steps in order:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Do up to 4 actions.</li>
                <li>Draw the top 2 cards from the Player Deck.</li>
                <li>Invade cities by drawing cards from the Barbarian Deck.</li>
            </ol>
        </div>
        <div>
            <h3 className="text-lg font-bold text-cyan-300 mt-4 mb-2">Player Actions</h3>
            <p>You may perform up to 4 actions each turn. Your Role will give you special abilities.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>March:</strong> Move to an adjacent city. You may take up to 3 legions with you.</li>
                <li><strong>Sail:</strong> From a port city, discard a card matching one of the destination port's colors to move there. You may take up to 3 legions.</li>
                <li><strong>Fortify:</strong> Discard a card matching your current city to build a Fort. Forts help in recruiting and defending.</li>
                <li><strong>Recruit Army:</strong> At a Fort, add legions to your city up to the current Recruitment Rate.</li>
                <li><strong>Plot:</strong> Give a card that matches your city's color to another player in your city, or take such a card from them.</li>
                <li><strong>Battle:</strong> In a city with both legions and barbarians, roll dice to remove them.</li>
                <li><strong>Forge an Alliance:</strong> In a city with barbarians of a tribe you are not yet allied with, discard the required number of matching colored cards to form an alliance.</li>
            </ul>
        </div>
    </>
);
  
  const VirulentStrainRulesContent = (
    <>
        <div>
            <h3 className="text-lg font-bold text-purple-300 mb-2">Challenge Overview</h3>
            <p>In this challenge, one disease becomes particularly nasty. The standard Epidemic cards are replaced with more dangerous Virulent Strain Epidemic cards, each with a unique, persistent, or immediate effect.</p>
        </div>
        <div>
            <h3 className="text-lg font-bold text-purple-300 mt-4 mb-2">Determining the Virulent Strain</h3>
            <p>When the first Virulent Strain Epidemic card is drawn:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Perform the <strong>Infect</strong> step of the Epidemic as usual (draw the bottom card of the Infection Deck and place 3 cubes).</li>
                <li>After infecting, determine which disease color has the most cubes on the entire board. That disease is now the <strong>Virulent Strain</strong> for the rest of the game. The purple disease cannot become the Virulent Strain.</li>
                <li>If there is a tie for the most cubes, the Virulent Strain is chosen randomly from among the tied colors.</li>
                <li>Finish the Epidemic (apply the Virulent Strain effect, then Intensify).</li>
            </ol>
        </div>
        <div>
            <h3 className="text-lg font-bold text-purple-300 mt-4 mb-2">Virulent Strain Effects</h3>
            <p>Each Virulent Strain Epidemic card has a special effect that applies only to the Virulent Strain disease:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Continuing Effect:</strong> These cards are kept face up after the Epidemic is resolved. Their effects remain active for the rest of the game (or until a specific condition is met).</li>
                <li><strong>Immediate Effect:</strong> These effects take place right before the <strong>Intensify</strong> step of the Epidemic. After the Epidemic is fully resolved, these cards are flipped face down.</li>
            </ul>
        </div>
    </>
  );

  const MutationChallengeRulesContent = (
    <>
      <div>
        <h3 className="text-lg font-bold text-indigo-300 mb-2">Challenge Overview</h3>
        <p>This challenge adds a 5th, purple disease to the game that appears in unpredictable ways. Players must either cure all 5 diseases or cure the 4 other diseases and have no purple disease cubes on the board.</p>
      </div>
      <div>
        <h3 className="text-lg font-bold text-indigo-300 mt-4 mb-2">Setup</h3>
        <ul className="list-disc list-inside mt-2 space-y-1">
            <li>12 purple disease cubes are added to the supply.</li>
            <li>2 Mutation cards are put in the Infection Discard Pile.</li>
            <li>3 Mutation Event cards are shuffled into the Player Deck before Epidemics are added.</li>
        </ul>
      </div>
       <div>
        <h3 className="text-lg font-bold text-indigo-300 mt-4 mb-2">Winning the Game</h3>
        <p>The players win immediately if they either:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Cure all 5 diseases (including purple).</li>
            <li>Cure the 4 regular diseases AND have no purple disease cubes on the board.</li>
        </ul>
      </div>
      <div>
        <h3 className="text-lg font-bold text-indigo-300 mt-4 mb-2">New Rules</h3>
        <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Drawing a Mutation Card:</strong> When a purple Mutation card is drawn from the Infection Deck, draw the bottom card of the Infection Deck. Place 1 purple cube on that city.</li>
            <li><strong>Infecting a Mutated City:</strong> When you draw an Infection card for a city that already has 1 or more purple cubes, you must place 1 cube of the city's color AND 1 purple cube.</li>
        </ul>
      </div>
      <div>
        <h3 className="text-lg font-bold text-indigo-300 mt-4 mb-2">Mutation Event Cards</h3>
        <p>Three powerful Mutation Event cards are shuffled into the Player Deck. When drawn, they are resolved immediately:</p>
        <ul className="list-disc list-inside mt-2 space-y-2">
            <li><strong>The Mutation Threatens:</strong> Draw the bottom card of the Infection Deck and place 3 purple cubes on that city.</li>
            <li><strong>The Mutation Spreads:</strong> Draw the bottom 3 cards of the Infection Deck and place 1 purple cube on each of those cities.</li>
            <li><strong>The Mutation Intensifies:</strong> Place 1 purple cube on each city that has exactly 2 purple cubes.</li>
        </ul>
      </div>
    </>
  );

  const handlePlayerCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value, 10);
    setNumPlayers(count);
    setSelectedRoles(Array(5).fill(null)); 
  };
  
  const handlePlayerNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleRoleChange = (playerIndex: number, role: PlayerRole) => {
    const newRoles = [...selectedRoles];
    newRoles[playerIndex] = role;
    setSelectedRoles(newRoles);
  };

  const handleRolePoolChange = (role: PlayerRole, checked: boolean) => {
    setRolePool(prev => {
        if (checked) return [...prev, role];
        return prev.filter(r => r !== role);
    });
  };

  const handleEventCheckboxChange = (event: EventCardName, checked: boolean) => {
    setSelectedEvents(prev => {
        if (checked) return [...prev, event];
        return prev.filter(e => e !== event);
    });
  };
  
  const handleEventPoolChange = (event: EventCardName, checked: boolean) => {
    setEventPool(prev => {
        if (checked) return [...prev, event];
        return prev.filter(e => e !== event);
    });
  };

  const isStartDisabled = () => {
    if (gameMode === 'multiplayer' && playerNames.slice(0, numPlayers).some(name => name.trim() === '')) return true;

    if (gameMode === 'solitaire' && roleSelection === 'manual') {
        const finalRoles = selectedRoles.slice(0, numPlayers).filter(r => r !== null);
        if (finalRoles.length !== numPlayers || new Set(finalRoles).size !== finalRoles.length) return true;
    }
    
    if (gameMode === 'solitaire' && roleSelection === 'pool') {
        if (rolePool.length < numPlayers) return true;
    }

    if (eventSelection === 'manual') {
        if (selectedEvents.length !== numEvents) return true;
    }
    
    if (eventSelection === 'pool') {
        if (eventPool.length < numEvents) return true;
    }

    return false;
  }

  const handleStartClick = () => {
    if (isStartDisabled()) {
        alert('Please check your settings. Ensure all player names are filled and selections are valid.');
        return;
    }
    
    onStartGame({ 
        gameType,
        gameMode,
        numPlayers, 
        roleSelection, 
        roles: selectedRoles.filter(r => r !== null) as PlayerRole[],
        rolePool,
        playerNames: playerNames.slice(0, numPlayers),
        numEpidemics,
        numEvents,
        eventSelection,
        events: selectedEvents,
        eventPool,
        firstPlayerRule,
        useAiNarratives,
        useVirulentStrainChallenge,
        useMutationChallenge,
    });
  };
  
  const rulesModalTitle = `Rules for ${gameType === 'fallOfRome' ? 'Fall of Rome' : 'Pandemic'}`;
  const rulesModalContent = gameType === 'fallOfRome' ? FallOfRomeRulesContent : PandemicRulesContent;

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-gray-800 border-2 border-gray-600 rounded-lg shadow-2xl p-8 space-y-6 overflow-y-auto max-h-full">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-orbitron text-fuchsia-400">Pandemic: Game Setup</h1>
                <button onClick={() => setModalContent({title: rulesModalTitle, content: rulesModalContent})} className="text-sm bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition-colors font-semibold">View Rules</button>
            </div>

            {/* Game Selection */}
            <div className="p-4 border border-gray-700 rounded-lg">
                <h2 className="text-xl font-orbitron text-white mb-2">Game Selection</h2>
                <select id="gameType" value={gameType} onChange={(e) => setGameType(e.target.value as 'pandemic' | 'fallOfRome' | 'iberia')} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400">
                    <option value="pandemic">Pandemic</option>
                    <option value="fallOfRome">Pandemic: Fall of Rome</option>
                    <option value="iberia">Pandemic: Iberia</option>
                </select>
            </div>
            
            {/* Game Mode */}
            <div className="p-4 border border-gray-700 rounded-lg">
                <h2 className="text-xl font-orbitron text-white mb-2">Game Mode</h2>
                <div className="flex space-x-4">
                    <label className="flex-1 p-3 bg-gray-700 rounded-md text-center cursor-pointer has-[:checked]:bg-blue-600 has-[:checked]:ring-2 ring-blue-400 transition-all">
                        <input type="radio" name="gameMode" value="solitaire" checked={gameMode === 'solitaire'} onChange={() => setGameMode('solitaire')} className="sr-only"/> Solitaire
                    </label>
                    <label className={`flex-1 p-3 bg-gray-700 rounded-md text-center transition-all ${isFirebaseInitialized ? 'cursor-pointer has-[:checked]:bg-blue-600 has-[:checked]:ring-2 ring-blue-400' : 'cursor-not-allowed opacity-50'}`} title={!isFirebaseInitialized ? "Multiplayer is disabled. Add your Firebase configuration to services/firebase.ts to enable it." : ""}>
                        <input type="radio" name="gameMode" value="multiplayer" checked={gameMode === 'multiplayer'} onChange={() => setGameMode('multiplayer')} className="sr-only" disabled={!isFirebaseInitialized}/> Multiplayer
                    </label>
                </div>
                 {gameMode === 'multiplayer' && isFirebaseInitialized && <p className="text-xs text-blue-300 mt-2 text-center">Multiplayer mode will generate a shareable link after you start the game.</p>}
                 {!isFirebaseInitialized && <p className="text-xs text-yellow-400 mt-2 text-center">Multiplayer disabled. Add Firebase config to <code>services/firebase.ts</code>.</p>}
            </div>

            {/* Player Setup */}
            <div className="p-4 border border-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-orbitron text-cyan-300">Player Setup</h2>
                    <button onClick={() => setModalContent({
                        title: "Role Descriptions", 
                        content: availableRoles.map(role => (
                            <div key={role}>
                                <h3 className="font-bold text-lg">{getDisplayName(role)}</h3>
                                <p className="text-sm text-gray-300">{PLAYER_ROLE_INFO[role]}</p>
                            </div>
                        ))
                    })} className="text-xs bg-cyan-800 hover:bg-cyan-700 px-3 py-1 rounded transition-colors">View Roles</button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="numPlayers" className="block text-lg mb-1">Number of Players</label>
                        <select id="numPlayers" value={numPlayers} onChange={handlePlayerCountChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400">
                            <option value={2}>2 Players</option>
                            <option value={3}>3 Players</option>
                            <option value={4}>4 Players</option>
                            <option value={5}>5 Players</option>
                        </select>
                        {numPlayers === 5 && (
                            <p className="text-xs text-yellow-400 mt-2 text-center">A 5-player game is not recommended for a normal game without expansion challenges.</p>
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg">{gameMode === 'multiplayer' ? 'Your Name' : 'Player Names'}</h3>
                        {Array.from({ length: gameMode === 'multiplayer' ? 1 : numPlayers }).map((_, i) => (
                            <div key={i} className="mt-2">
                                <label htmlFor={`playerName${i}`} className="block text-sm font-medium text-gray-300 mb-1">{gameMode === 'multiplayer' ? 'Host Name' : `Player ${i + 1}`}</label>
                                <input type="text" id={`playerName${i}`} value={playerNames[i]} onChange={(e) => handlePlayerNameChange(i, e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400" maxLength={20} />
                            </div>
                        ))}
                    </div>
                    {gameMode === 'solitaire' && (
                        <div>
                            <span className="block text-lg mb-2">Role Assignment</span>
                            <div className="flex space-x-4">
                                <label className="flex-1 p-3 bg-gray-700 rounded-md text-center cursor-pointer has-[:checked]:bg-cyan-600 has-[:checked]:ring-2 ring-cyan-400 transition-all">
                                    <input type="radio" name="roleSelection" value="random" checked={roleSelection === 'random'} onChange={() => setRoleSelection('random')} className="sr-only"/> Random
                                </label>
                                <label className="flex-1 p-3 bg-gray-700 rounded-md text-center cursor-pointer has-[:checked]:bg-cyan-600 has-[:checked]:ring-2 ring-cyan-400 transition-all">
                                    <input type="radio" name="roleSelection" value="manual" checked={roleSelection === 'manual'} onChange={() => setRoleSelection('manual')} className="sr-only"/> Manual
                                </label>
                                <label className="flex-1 p-3 bg-gray-700 rounded-md text-center cursor-pointer has-[:checked]:bg-cyan-600 has-[:checked]:ring-2 ring-cyan-400 transition-all">
                                    <input type="radio" name="roleSelection" value="pool" checked={roleSelection === 'pool'} onChange={() => setRoleSelection('pool')} className="sr-only"/> Pool
                                </label>
                            </div>
                        </div>
                    )}
                    {gameMode === 'solitaire' && roleSelection === 'manual' && (
                         <div className="space-y-4">
                            {Array.from({ length: numPlayers }).map((_, i) => (
                                <div key={i}>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">{playerNames[i] || `Player ${i + 1}`}</label>
                                    <select value={selectedRoles[i] || ''} onChange={(e) => handleRoleChange(i, e.target.value as PlayerRole)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400">
                                        <option value="" disabled>Select a role...</option>
                                        {availableRoles.map(role => ( <option key={role} value={role} disabled={selectedRoles.includes(role) && selectedRoles[i] !== role} className="disabled:text-gray-500">{getDisplayName(role)}</option>))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}
                    {gameMode === 'solitaire' && roleSelection === 'pool' && (
                         <div>
                            <h3 className="text-lg">Select Roles for Pool ({rolePool.length} selected, need {numPlayers})</h3>
                            <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto p-2 bg-black bg-opacity-20 rounded">
                                {availableRoles.map(role => (
                                    <label key={role} className="flex items-center space-x-2 p-2 bg-gray-700 rounded-md cursor-pointer has-[:checked]:bg-cyan-800">
                                        <input type="checkbox" checked={rolePool.includes(role)} onChange={(e) => handleRolePoolChange(role, e.target.checked)} className="form-checkbox h-5 w-5 text-cyan-500 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500" />
                                        <span>{getDisplayName(role)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* General Game Rules */}
            <div className="p-4 border border-gray-700 rounded-lg space-y-4">
                <h2 className="text-xl font-orbitron text-green-400 mb-2">Game Rules</h2>
                <div>
                    <span className="block text-lg mb-2">First Player</span>
                    <div className="flex space-x-4">
                        <label className="flex-1 p-3 bg-gray-700 rounded-md text-center cursor-pointer has-[:checked]:bg-green-600 has-[:checked]:ring-2 ring-green-400 transition-all">
                            <input type="radio" name="firstPlayerRule" value="random" checked={firstPlayerRule === 'random'} onChange={() => setFirstPlayerRule('random')} className="sr-only"/> Random
                        </label>
                        <label className="flex-1 p-3 bg-gray-700 rounded-md text-center cursor-pointer has-[:checked]:bg-green-600 has-[:checked]:ring-2 ring-green-400 transition-all">
                            <input
                                type="radio"
                                name="firstPlayerRule"
                                value={gameType === 'fallOfRome' ? 'farthestFromRoma' : 'highestPopulation'}
                                checked={firstPlayerRule === (gameType === 'fallOfRome' ? 'farthestFromRoma' : 'highestPopulation')}
                                onChange={() => setFirstPlayerRule(gameType === 'fallOfRome' ? 'farthestFromRoma' : 'highestPopulation')}
                                className="sr-only"
                            />
                            {gameType === 'fallOfRome' ? 'Farthest from Roma' : gameType === 'iberia' ? 'Earliest Founding' : 'Highest Pop.'}
                        </label>
                        <label className="flex-1 p-3 bg-gray-700 rounded-md text-center cursor-pointer has-[:checked]:bg-green-600 has-[:checked]:ring-2 ring-green-400 transition-all">
                            <input type="radio" name="firstPlayerRule" value="player1" checked={firstPlayerRule === 'player1'} onChange={() => setFirstPlayerRule('player1')} className="sr-only"/> Player 1
                        </label>
                    </div>
                </div>

                <div>
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-lg">AI-Generated Narratives</span>
                        <div className="relative">
                            <input type="checkbox" checked={useAiNarratives} onChange={(e) => setUseAiNarratives(e.target.checked)} className="sr-only peer" />
                            <div className="w-14 h-8 bg-gray-600 rounded-full peer peer-checked:bg-green-500"></div>
                            <div className="absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-full"></div>
                        </div>
                    </label>
                    <p className="text-xs text-gray-400 mt-1">Enables dramatic, AI-powered reports for key game events. Disable if you have API quota issues or prefer simple messages.</p>
                </div>
            </div>

            {/* Difficulty Setup */}
            <div className="p-4 border border-gray-700 rounded-lg">
                <h2 className="text-xl font-orbitron text-red-400 mb-4">Difficulty</h2>
                 <div>
                    <label htmlFor="difficulty" className="block text-lg mb-1">{gameType === 'fallOfRome' ? 'Revolt Cards' : 'Epidemic Cards'}</label>
                    <select id="difficulty" value={numEpidemics} onChange={(e) => setNumEpidemics(parseInt(e.target.value, 10))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400">
                        {gameType === 'fallOfRome' ? (
                            <>
                                <option value={5}>Introductory (5)</option>
                                <option value={6}>Standard (6)</option>
                                <option value={7}>Heroic (7)</option>
                            </>
                        ) : (
                            <>
                                <option value={4}>Introductory (4)</option>
                                <option value={5}>Standard (5)</option>
                                <option value={6}>Heroic (6)</option>
                                <option value={7}>Legendary (7)</option>
                            </>
                        )}
                    </select>
                </div>
            </div>

            {/* Challenges Setup */}
            {gameType === 'pandemic' && (
                <div className="p-4 border border-gray-700 rounded-lg">
                    <h2 className="text-xl font-orbitron text-purple-400 mb-4">Challenges (On the Brink)</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-md has-[:checked]:bg-purple-800">
                            <label className="flex flex-1 items-center cursor-pointer">
                                <div className="flex-1">
                                    <span className="text-lg font-semibold">Virulent Strain</span>
                                    <p className="text-xs text-gray-400">Replace Epidemic cards with more dangerous ones, and one disease becomes a greater threat.</p>
                                </div>
                                <div className="relative ml-4">
                                    <input type="checkbox" checked={useVirulentStrainChallenge} onChange={(e) => setUseVirulentStrainChallenge(e.target.checked)} className="sr-only peer" />
                                    <div className="w-14 h-8 bg-gray-600 rounded-full peer peer-checked:bg-purple-500"></div>
                                    <div className="absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-full"></div>
                                </div>
                            </label>
                            <button onClick={() => setModalContent({title: "Virulent Strain Rules", content: VirulentStrainRulesContent})} className="ml-4 flex-shrink-0 text-xs bg-purple-800 hover:bg-purple-700 px-3 py-1 rounded transition-colors">Rules</button>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-700 rounded-md has-[:checked]:bg-indigo-800">
                            <label className="flex flex-1 items-center cursor-pointer">
                                <div className="flex-1">
                                    <span className="text-lg font-semibold">Mutation Challenge</span>
                                    <p className="text-xs text-gray-400">Adds a 5th (purple) disease that spreads in unique ways.</p>
                                </div>
                                <div className="relative ml-4">
                                    <input type="checkbox" checked={useMutationChallenge} onChange={(e) => setUseMutationChallenge(e.target.checked)} className="sr-only peer" />
                                    <div className="w-14 h-8 bg-gray-600 rounded-full peer peer-checked:bg-indigo-500"></div>
                                    <div className="absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-full"></div>
                                </div>
                            </label>
                            <button onClick={() => setModalContent({title: "Mutation Challenge Rules", content: MutationChallengeRulesContent})} className="ml-4 flex-shrink-0 text-xs bg-indigo-800 hover:bg-indigo-700 px-3 py-1 rounded transition-colors">Rules</button>
                        </div>
                    </div>
                </div>
            )}

             {/* Event Card Setup */}
            <div className="p-4 border border-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-orbitron text-yellow-300">Event Cards</h2>
                    <button onClick={() => setModalContent({
                        title: "Event Card Descriptions",
                        content: availableEvents.map(eventName => (
                            <div key={eventName} className="mb-4">
                                <h3 className="font-bold text-lg">{getDisplayName(eventName)}</h3>
                                <p className="text-sm text-gray-300">{EVENT_CARD_INFO[eventName]}</p>
                            </div>
                        ))
                    })} className="text-xs bg-yellow-800 hover:bg-yellow-700 px-3 py-1 rounded transition-colors">View Events</button>
                </div>
                <div className="space-y-4">
                    <div>
                        <span className="block text-lg mb-2">Number of Event Cards</span>
                        <div className="flex space-x-4 mb-4">
                            <label className="flex-1 p-3 bg-gray-700 rounded-md text-center cursor-pointer has-[:checked]:bg-yellow-600 has-[:checked]:ring-2 ring-yellow-400 transition-all">
                                <input type="radio" name="eventCountRule" value="manual" checked={eventCountRule === 'manual'} onChange={() => setEventCountRule('manual')} className="sr-only"/> Manual
                            </label>
                            <label className="flex-1 p-3 bg-gray-700 rounded-md text-center cursor-pointer has-[:checked]:bg-yellow-600 has-[:checked]:ring-2 ring-yellow-400 transition-all">
                                <input type="radio" name="eventCountRule" value="byRules" checked={eventCountRule === 'byRules'} onChange={() => setEventCountRule('byRules')} className="sr-only"/> By Rules
                            </label>
                        </div>
                        <select 
                            id="numEvents" 
                            value={numEvents} 
                            onChange={(e) => {setNumEvents(parseInt(e.target.value, 10)); setSelectedEvents([]); setEventPool([]);}} 
                            disabled={eventCountRule === 'byRules'}
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {[...Array(11).keys()].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        {eventCountRule === 'byRules' && <p className="text-xs text-yellow-300 mt-2 text-center">Number of events calculated based on game type, player count, and active challenges.</p>}
                    </div>
                    {numEvents > 0 && (
                        <>
                         <div>
                            <span className="block text-lg mb-2">Event Card Selection</span>
                            <div className="flex space-x-4">
                                <label className="flex-1 p-3 bg-gray-700 rounded-md text-center cursor-pointer has-[:checked]:bg-yellow-600 has-[:checked]:ring-2 ring-yellow-400 transition-all">
                                    <input type="radio" name="eventSelection" value="random" checked={eventSelection === 'random'} onChange={() => setEventSelection('random')} className="sr-only"/> Random
                                </label>
                                <label className="flex-1 p-3 bg-gray-700 rounded-md text-center cursor-pointer has-[:checked]:bg-yellow-600 has-[:checked]:ring-2 ring-yellow-400 transition-all">
                                    <input type="radio" name="eventSelection" value="manual" checked={eventSelection === 'manual'} onChange={() => setEventSelection('manual')} className="sr-only"/> Manual
                                </label>
                                <label className="flex-1 p-3 bg-gray-700 rounded-md text-center cursor-pointer has-[:checked]:bg-yellow-600 has-[:checked]:ring-2 ring-yellow-400 transition-all">
                                    <input type="radio" name="eventSelection" value="pool" checked={eventSelection === 'pool'} onChange={() => setEventSelection('pool')} className="sr-only"/> Pool
                                </label>
                            </div>
                        </div>
                        {eventSelection === 'manual' && (
                             <div>
                                <h3 className="text-lg">Select Cards ({selectedEvents.length}/{numEvents})</h3>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {availableEvents.map(event => (
                                        <label key={event} className="flex items-center space-x-2 p-2 bg-gray-700 rounded-md cursor-pointer has-[:checked]:bg-yellow-800">
                                            <input type="checkbox" checked={selectedEvents.includes(event)} onChange={(e) => handleEventCheckboxChange(event, e.target.checked)} className="form-checkbox h-5 w-5 text-yellow-500 bg-gray-800 border-gray-600 rounded focus:ring-yellow-500" />
                                            <span>{getDisplayName(event)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                        {eventSelection === 'pool' && (
                             <div>
                                <h3 className="text-lg">Select Events for Pool ({eventPool.length} selected, need {numEvents})</h3>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {availableEvents.map(event => (
                                        <label key={event} className="flex items-center space-x-2 p-2 bg-gray-700 rounded-md cursor-pointer has-[:checked]:bg-yellow-800">
                                            <input type="checkbox" checked={eventPool.includes(event)} onChange={(e) => handleEventPoolChange(event, e.target.checked)} className="form-checkbox h-5 w-5 text-yellow-500 bg-gray-800 border-gray-600 rounded focus:ring-yellow-500" />
                                            <span>{getDisplayName(event)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                        </>
                    )}
                </div>
            </div>

            <button 
                onClick={handleStartClick} 
                disabled={isStartDisabled()}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-md text-xl font-orbitron transition-all transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
            >
                {gameMode === 'multiplayer' ? 'Create Lobby' : 'Start Game'}
            </button>

            {modalContent && (
                <Modal title={modalContent.title} show={true} onClose={() => setModalContent(null)}>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-left">
                        {modalContent.content}
                    </div>
                </Modal>
            )}
        </div>
    </div>
  );
};

export default SetupScreen;
