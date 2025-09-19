import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { GameState, Player, CityName, PlayerCard, DiseaseColor, CITIES_DATA, PANDEMIC_CITIES_DATA, FALLOFROME_CITIES_DATA, IBERIA_CITIES_DATA, PANDEMIC_ROLES, FALLOFROME_DISEASE_COLORS } from '../types';
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
