import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { GameState, Player, CityName, PlayerCard, DiseaseColor, CITIES_DATA, PANDEMIC_CITIES_DATA, FALLOFROME_CITIES_DATA, IBERIA_CITIES_DATA, PANDEMIC_ROLES, FALLOFROME_DISEASE_COLORS, IBERIA_REGIONS, IBERIA_CONNECTIONS } from '../types';
import { getCardDisplayName } from '../hooks/ui';
import { getTerminology } from '../services/terminology';

interface DevToolsProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onDevAction: (action: string, payload: any) => void;
  selectedCity: CityName | null;
}

const DevTools: React.FC<DevToolsProps> = ({ isOpen, onClose, gameState, onDevAction, selectedCity }) => {
  const [pawnToMove, setPawnToMove] = useState<string>(gameState.players[0].id.toString());
  const [pawnDestination, setPawnDestination] = useState<CityName>(gameState.players[0].location);

  const [cardToMove, setCardToMove] = useState<string>(''); // format: "locationType_locationId_cardName_cardColor"
  const [cardDestination, setCardDestination] = useState<string>(''); // format: "locationType_locationId"

  const T = getTerminology(gameState);
  const excludedRailroadCities: Set<CityName> = new Set(['PalmaDeMallorca', 'AndorraLaVella', 'Gibraltar']);
  
  const renderIberiaTools = () => (
    <div className="space-y-4">
      {/* Purification Tokens */}
      <div>
        <h4 className="font-bold text-lg mb-2 text-cyan-300">Purification Tokens</h4>
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2">
          {IBERIA_REGIONS.map(region => (
            <div
              key={region.name}
              className="p-2 bg-gray-700 rounded-md text-center"
              title={region.vertices.map(v => CITIES_DATA[v].name).join(', ')}
            >
              <p className="text-sm font-semibold">Region {region.name}</p>
              <div className="flex items-center justify-center space-x-2 mt-1">
                <button onClick={() => onDevAction('setPurificationTokens', { regionName: region.name, change: -1 })} className="w-6 h-6 rounded-full bg-red-600 font-bold">-</button>
                <span className="font-bold text-lg">{gameState.purificationTokens?.[region.name] || 0}</span>
                <button onClick={() => onDevAction('setPurificationTokens', { regionName: region.name, change: 1 })} className="w-6 h-6 rounded-full bg-green-600 font-bold">+</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Railroads */}
      <div>
        <h4 className="font-bold text-lg mb-2 text-yellow-700">Railroads</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
          {Object.keys(IBERIA_CONNECTIONS).flatMap(fromCity =>
            (IBERIA_CONNECTIONS[fromCity as keyof typeof IBERIA_CONNECTIONS] as CityName[]).map(toCity => {
              const key = [fromCity, toCity].sort().join('-');
              return { key, from: fromCity as CityName, to: toCity as CityName };
            })
          )
          .filter((value, index, self) => self.findIndex(v => v.key === value.key) === index)
          .filter(({ from, to }) => !excludedRailroadCities.has(from) && !excludedRailroadCities.has(to))
          .sort((a,b) => CITIES_DATA[a.from].name.localeCompare(CITIES_DATA[b.from].name))
          .map(({ from, to }) => {
            const hasRailroad = gameState.railroads.some(r => (r.from === from && r.to === to) || (r.from === to && r.to === from));
            return (
              <button key={`${from}-${to}`} onClick={() => onDevAction('toggleRailroad', { from, to })}
                      className={`w-full p-1 text-xs text-left rounded ${hasRailroad ? 'bg-yellow-800' : 'bg-gray-700 hover:bg-gray-600'}`}>
                {CITIES_DATA[from].name} ↔ {CITIES_DATA[to].name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );

  const renderFallOfRomeTools = () => (
    <div className="space-y-4">
      {/* Legions */}
      <div>
        <h4 className="font-bold text-lg mb-2 text-red-400">Legions</h4>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
          {Object.keys(FALLOFROME_CITIES_DATA).sort((a,b) => CITIES_DATA[a as CityName].name.localeCompare(CITIES_DATA[b as CityName].name)).map(city => {
            const legionCount = gameState.legions?.filter(l => l === city).length || 0;
            return (
              <div key={city} className="p-2 bg-gray-700 rounded-md">
                <p className="text-sm font-semibold truncate">{CITIES_DATA[city as CityName].name}</p>
                <div className="flex items-center justify-center space-x-2 mt-1">
                  <button onClick={() => onDevAction('setLegions', { city, change: -1 })} className="w-6 h-6 rounded-full bg-red-600 font-bold">-</button>
                  <span className="font-bold text-lg">{legionCount}</span>
                  <button onClick={() => onDevAction('setLegions', { city, change: 1 })} className="w-6 h-6 rounded-full bg-green-600 font-bold">+</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {/* Forts */}
      <div>
        <h4 className="font-bold text-lg mb-2 text-yellow-600">Forts</h4>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
          {Object.keys(FALLOFROME_CITIES_DATA).sort((a,b) => CITIES_DATA[a as CityName].name.localeCompare(CITIES_DATA[b as CityName].name)).map(city => {
            const hasFort = gameState.forts?.includes(city as CityName);
            return (
              <button key={city} onClick={() => onDevAction('toggleFort', { city })}
                      className={`w-full p-1 text-xs text-left rounded ${hasFort ? 'bg-yellow-800' : 'bg-gray-700 hover:bg-gray-600'}`}>
                {CITIES_DATA[city as CityName].name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );

  const renderGameSpecificTools = () => {
    switch (gameState.gameType) {
      case 'iberia':
        return renderIberiaTools();
      case 'fallOfRome':
        return renderFallOfRomeTools();
      default:
        return null; // Return nothing if it's the base Pandemic game
    }
  };

  // Memoize all city cards currently in play (hands or discard)
  const allCityCardsInPlay = useMemo(() => {
    const cards: { locationType: 'player' | 'discard'; locationId: number | 'discard'; card: PlayerCard & { type: 'city' } }[] = [];
    
    // Cards in player hands
    gameState.players.forEach(p => {
      p.hand.forEach(c => {
        if (c.type === 'city') {
          cards.push({ locationType: 'player', locationId: p.id, card: c });
        }
      });
    });

    // Cards in discard pile
    gameState.playerDiscard.forEach(c => {
        if (c.type === 'city') {
            cards.push({ locationType: 'discard', locationId: 'discard', card: c });
        }
    });

    // Sort for consistent display
    cards.sort((a, b) => {
      const nameA = CITIES_DATA[a.card.name]?.name || '';
      const nameB = CITIES_DATA[b.card.name]?.name || '';
      return nameA.localeCompare(nameB);
    });

    return cards;
  }, [gameState.players, gameState.playerDiscard]);

  // Memoize all possible destinations for a card
  const allCardDestinations = useMemo(() => {
    const destinations: { locationType: 'player' | 'discard'; locationId: number | 'discard'; name: string }[] = [];
    gameState.players.forEach(p => {
        destinations.push({ locationType: 'player', locationId: p.id, name: p.name });
    });
    destinations.push({ locationType: 'discard', locationId: 'discard', name: 'Player Discard Pile' });
    return destinations;
  }, [gameState.players]);

  // Reset local state when the modal opens to ensure it's fresh
  useEffect(() => {
    if (isOpen) {
      setPawnToMove(gameState.players[0].id.toString());
      setPawnDestination(gameState.players[0].location);
      setCardToMove('');
      setCardDestination('');
    }
  }, [isOpen, gameState.players]);

  const diseaseColorsForGame = gameState.gameType === 'fallOfRome' 
    ? FALLOFROME_DISEASE_COLORS 
    : [DiseaseColor.Blue, DiseaseColor.Yellow, DiseaseColor.Black, DiseaseColor.Red];

  const citiesForCurrentGame = useMemo(() => {
    let cityData;
    switch (gameState.gameType) {
        case 'fallOfRome':
            cityData = FALLOFROME_CITIES_DATA;
            break;
        case 'iberia':
            cityData = IBERIA_CITIES_DATA;
            break;
        case 'pandemic':
        default:
            cityData = PANDEMIC_CITIES_DATA;
            break;
    }
    return Object.keys(cityData) as CityName[];
  }, [gameState.gameType]);

  return (
    <Modal title="Developer Options" show={isOpen} onClose={onClose} isSidePanel={true} zIndex="z-[70]">
      <div className="space-y-6 text-sm">

        {/* Cube Management */}
        <div className="p-3 bg-gray-900 rounded-lg">
          <h3 className="font-bold text-lg text-cyan-400 mb-2">Cube Management</h3>
          {selectedCity ? (
            <div className="space-y-2">
              <p className="text-center font-semibold">{CITIES_DATA[selectedCity].name}</p>
              {diseaseColorsForGame.map(color => (
                <div key={color} className="flex items-center justify-between p-1 bg-gray-800 rounded">
                  <span className="font-bold capitalize">{color}</span>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => onDevAction('removeCube', { city: selectedCity, color })} className="w-8 h-8 rounded-full bg-red-800 hover:bg-red-700">-</button>
                    <span className="w-6 text-center font-mono">{gameState.diseaseCubes[selectedCity]?.[color] || 0}</span>
                    <button onClick={() => onDevAction('addCube', { city: selectedCity, color })} className="w-8 h-8 rounded-full bg-green-800 hover:bg-green-700">+</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center">Select a city on the board to manage its cubes.</p>
          )}
        </div>

        {/* Game-Specific Tools */}
        {renderGameSpecificTools() && (
            <div className="p-3 bg-gray-900 rounded-lg">
                <h3 className="font-bold text-lg text-fuchsia-400 mb-2">
                    {gameState.gameType === 'iberia' ? 'Iberia' : 'Fall of Rome'} Options
                </h3>
                {renderGameSpecificTools()}
            </div>
        )}

        {/* Pawn Relocation */}
        <div className="p-3 bg-gray-900 rounded-lg">
          <h3 className="font-bold text-lg text-cyan-400 mb-2">Pawn Relocation</h3>
          <div className="space-y-2">
            <select value={pawnToMove} onChange={e => setPawnToMove(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded">
              {gameState.players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
            </select>
            <select value={pawnDestination} onChange={e => setPawnDestination(e.target.value as CityName)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded">
              {citiesForCurrentGame.sort((a,b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name)).map(city => <option key={city} value={city}>{CITIES_DATA[city].name}</option>)}
            </select>
            <button onClick={() => onDevAction('movePawn', { playerId: parseInt(pawnToMove), destination: pawnDestination })} className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded">Move Pawn</button>
          </div>
        </div>

        {/* Card Relocation */}
        <div className="p-3 bg-gray-900 rounded-lg">
            <h3 className="font-bold text-lg text-cyan-400 mb-2">Card Relocation</h3>
            <div className="space-y-2">
                <div>
                    <label className="text-xs text-gray-400">Source Card:</label>
                    <select value={cardToMove} onChange={e => setCardToMove(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-xs">
                        <option value="" disabled>Select a card...</option>
                        {allCityCardsInPlay.map(({ locationType, locationId, card }) => {
                            const owner = locationType === 'player' ? gameState.players.find(p => p.id === locationId)?.name : 'Discard';
                            const key = `${locationType}_${locationId}_${card.name}_${card.color}`;
                            return <option key={key} value={key}>{getCardDisplayName(card)} (in {owner})</option>
                        })}
                    </select>
                </div>
                 <div>
                    <label className="text-xs text-gray-400">Destination:</label>
                    <select value={cardDestination} onChange={e => setCardDestination(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded">
                        <option value="" disabled>Select a destination...</option>
                         {allCardDestinations.map(({ locationType, locationId, name }) => (
                            <option key={`${locationType}_${locationId}`} value={`${locationType}_${locationId}`}>{name}</option>
                         ))}
                    </select>
                </div>
                 <button 
                    onClick={() => onDevAction('moveCard', { sourceKey: cardToMove, destinationKey: cardDestination })}
                    disabled={!cardToMove || !cardDestination}
                    className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded disabled:bg-gray-600"
                >
                    Move Card
                </button>
            </div>
        </div>


        {/* Disease Cure */}
        <div className="p-3 bg-gray-900 rounded-lg">
            <h3 className="font-bold text-lg text-cyan-400 mb-2">{T.cure} Status</h3>
            <div className="space-y-2">
                {diseaseColorsForGame.map(color => (
                    <div key={color} className="flex items-center justify-between p-1 bg-gray-800 rounded">
                        <span className="font-bold capitalize">{color}</span>
                        <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded ${gameState.curedDiseases[color] ? 'bg-green-500' : 'bg-red-500'}`}>
                                {gameState.curedDiseases[color] ? T.cured : `Not ${T.cured}`}
                            </span>
                            <button onClick={() => onDevAction('toggleCure', { color })} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded">Toggle</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Action Points */}
        <div className="p-3 bg-gray-900 rounded-lg">
          <h3 className="font-bold text-lg text-cyan-400 mb-2">Action Points</h3>
          <p className="text-center mb-2">Current Player: {gameState.players[gameState.currentPlayerIndex].name}</p>
          <div className="flex items-center justify-center space-x-4">
            <button onClick={() => onDevAction('removeAP', {})} className="w-12 h-12 rounded-full text-2xl bg-red-800 hover:bg-red-700">-</button>
            <span className="text-4xl font-orbitron w-16 text-center">{gameState.actionsRemaining}</span>
            <button onClick={() => onDevAction('addAP', {})} className="w-12 h-12 rounded-full text-2xl bg-green-800 hover:bg-green-700">+</button>
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default DevTools;
