
import React, { useState, useEffect } from 'react';
import { GameState, Player, PLAYER_ROLE_INFO } from '../types';

interface LobbyScreenProps {
    gameState: GameState;
    localPlayerId: number | null;
    onUpdateName: (name: string) => void;
    onStartGame: () => void;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ gameState, localPlayerId, onUpdateName, onStartGame }) => {
    const localPlayer = gameState.players.find(p => p.id === localPlayerId);
    const [name, setName] = useState(localPlayer?.name || '');
    const [isEditing, setIsEditing] = useState(!localPlayer?.name);

    useEffect(() => {
        if (localPlayer?.name) {
            setName(localPlayer.name);
            setIsEditing(false);
        } else {
            setIsEditing(true);
        }
    }, [localPlayer?.name]);

    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onUpdateName(name.trim());
            setIsEditing(false);
        }
    };

    const shareableLink = `${window.location.origin}/game/${gameState.gameId}`;

    const copyLinkToClipboard = () => {
        navigator.clipboard.writeText(shareableLink).then(() => {
            alert('Link copied to clipboard!');
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    const isHost = localPlayerId === gameState.hostId;
    const allPlayersJoined = gameState.players.every(p => p.isOnline && p.name);

    return (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-gray-800 border-2 border-gray-600 rounded-lg shadow-2xl p-8 space-y-6">
                <h1 className="text-4xl font-orbitron text-center text-blue-400">Multiplayer Lobby</h1>

                <div className="p-4 bg-gray-900 rounded-lg">
                    <h2 className="text-xl font-bold text-center mb-2">Share this link to invite players:</h2>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={shareableLink}
                            readOnly
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button onClick={copyLinkToClipboard} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white font-semibold">Copy</button>
                    </div>
                </div>

                <div className="p-4 border border-gray-700 rounded-lg">
                    <h2 className="text-xl font-orbitron text-cyan-300 mb-4">Players ({gameState.players.filter(p => p.isOnline).length}/{gameState.players.length})</h2>
                    <div className="space-y-3">
                        {gameState.players.map((player) => (
                            <div key={player.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                                <div className="flex items-center space-x-3">
                                    <span className={`w-3 h-3 rounded-full ${player.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                    <div>
                                        {player.id === localPlayerId && isEditing ? (
                                            <form onSubmit={handleNameSubmit} className="flex space-x-2">
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="Enter your name"
                                                    className="p-1 bg-gray-800 border border-gray-600 rounded-md text-sm"
                                                    autoFocus
                                                />
                                                <button type="submit" className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded-md text-xs font-semibold">Save</button>
                                            </form>
                                        ) : (
                                            <p className="font-bold">{player.name || 'Awaiting player...'}</p>
                                        )}
                                        {player.id === localPlayerId && !isEditing && (
                                            <button onClick={() => setIsEditing(true)} className="text-xs text-gray-400 hover:text-white ml-2">(edit name)</button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                     {player.id === gameState.hostId && <span className="text-xs font-bold text-yellow-400 px-2 py-1 bg-yellow-900 rounded-full">HOST</span>}
                                     <span className={`text-xs font-semibold ${player.isOnline ? 'text-green-400' : 'text-red-400'}`}>
                                        {player.isOnline ? 'Online' : 'Offline'}
                                     </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {isHost ? (
                    <button
                        onClick={onStartGame}
                        disabled={!allPlayersJoined}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-md text-xl font-orbitron transition-all transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {allPlayersJoined ? 'Start Game' : `Waiting for ${gameState.players.filter(p => !p.isOnline || !p.name).length} more player(s)...`}
                    </button>
                ) : (
                    <p className="text-center text-gray-400">Waiting for the host to start the game...</p>
                )}
            </div>
        </div>
    );
};

export default LobbyScreen;