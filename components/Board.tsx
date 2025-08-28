import React, { useState, useEffect, useMemo } from 'react';
import { GameState, CityName, CONNECTIONS, CITIES_DATA, DiseaseColor, Player, PlayerRole, PANDEMIC_CITIES_DATA, FALLOFROME_CITIES_DATA, PANDEMIC_CONNECTIONS, FALLOFROME_CONNECTIONS, BarbarianSupplySpace, FALLOFROME_BARBARIAN_SUPPLY_DATA, FALLOFROME_MIGRATION_PATHS, FALLOFROME_PORT_CITIES, IBERIA_PORT_CITIES, IBERIA_CITIES_DATA, IBERIA_CONNECTIONS, IBERIA_SEA_CONNECTIONS, IBERIA_REGIONS } from '../types';
import { PLAYER_PAWN_COLORS, PLAYER_ROLE_COLORS } from '../hooks/ui';

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

const BarbarianSupplyMarker: React.FC<{
  supplySpace: BarbarianSupplySpace;
  gameState: GameState;
}> = ({ supplySpace, gameState }) => {
  const remainingCubes = gameState.remainingCubes[supplySpace.color];
  const color = supplySpace.color;
  
  // Dynamically create border color class from the value
  const borderStyle = { borderColor: DISEASE_COLOR_VALUES[color] };
  const textColorClass = color === DiseaseColor.White || color === DiseaseColor.Yellow ? 'text-black' : 'text-white';

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${supplySpace.coords.x}%`, top: `${supplySpace.coords.y}%` }}
    >
      <div 
        style={borderStyle}
        className={`relative w-24 h-14 bg-gray-800 border-4 rounded-lg flex flex-col items-center justify-center p-1 shadow-2xl`}>
        <h4 className={`text-[10px] font-bold leading-tight text-center text-gray-300`}>{supplySpace.name}</h4>
        <div className={`text-xl font-orbitron font-bold mt-1`} style={{color: DISEASE_COLOR_VALUES[color]}}>{remainingCubes}</div>
      </div>
    </div>
  );
};

const CityVisual: React.FC<{
  colors: DiseaseColor[];
  sizeClass: string;
  pulseClass: string;
}> = ({ colors, sizeClass, pulseClass }) => {
  if (colors.length === 1) {
    const color = colors[0];
    // A white-only city gets a dark border to stand out against the light city color.
    // All other single-color cities get a light border.
    const borderColorClass = color === DiseaseColor.White ? 'border-gray-800' : 'border-gray-300';
    // Use inline style for color to avoid Tailwind purge issues and ensure consistency with pie charts.
    return (
      <div 
        style={{ backgroundColor: DISEASE_COLOR_VALUES[color] }}
        className={`${sizeClass} ${pulseClass} rounded-full border-2 ${borderColorClass} transition-all duration-200`}
      ></div>
    );
  }

  // --- Multi-color pie chart rendering ---
  const slice = 100 / colors.length;
  const gradientStops = colors.map((color, index) => {
      const cssColor = DISEASE_COLOR_VALUES[color];
      const start = index * slice;
      const end = (index + 1) * slice;
      return `${cssColor} ${start}% ${end}%`;
  }).join(', ');

  const gradientStyle = {
    background: `conic-gradient(${gradientStops})`,
  };
  
  // Multi-color cities always get a light border.
  return (
    <div 
      style={gradientStyle} 
      className={`${sizeClass} ${pulseClass} rounded-full border-2 border-gray-300 transition-all duration-200`}
    ></div>
  );
};


const CityMarker: React.FC<{
  city: { name: string; color: DiseaseColor; boardColors?: DiseaseColor[]; coords: { x: number; y: number } };
  cityName: CityName;
  gameState: GameState;
  onCityClick: (city: CityName) => void;
  isSelected: boolean;
  isHighlighted: boolean;
  showName: boolean;
}> = ({ city, cityName, gameState, onCityClick, isSelected, isHighlighted, showName }) => {
  const cubes = gameState.diseaseCubes[cityName] || {};
  const hasStation = gameState.researchStations.includes(cityName);
  const hasFort = gameState.gameType === 'fallOfRome' && gameState.forts?.includes(cityName);
  const legionsInCity = gameState.gameType === 'fallOfRome' && gameState.legions?.filter(l => l === cityName).length || 0;
  const isPortCity = (gameState.gameType === 'fallOfRome' && FALLOFROME_PORT_CITIES.has(cityName)) || (gameState.gameType === 'iberia' && IBERIA_PORT_CITIES.has(cityName));
  const hospitalInCity = Object.entries(gameState.hospitals || {}).find(([, hospitalLocation]) => hospitalLocation === cityName)?.[0] as DiseaseColor | undefined;
  const totalCubes = Object.values(cubes).reduce((sum, count) => sum + (count || 0), 0);
  const colorsToShow = city.boardColors || [city.color];

  // Dynamic sizing for the city marker based on cube count
  const markerSizeClasses = {
    0: 'w-3 h-3',
    1: 'w-4 h-4',
    2: 'w-5 h-5',
    3: 'w-6 h-6',
  };
  const sizeClass = markerSizeClasses[Math.min(totalCubes, 3) as keyof typeof markerSizeClasses];
  const pulseClass = totalCubes >= 3 ? 'animate-pulse-danger' : '';
  const selectionClass = isSelected ? 'bg-yellow-400' : isHighlighted ? 'bg-green-400' : '';

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
      style={{ left: `${city.coords.x}%`, top: `${city.coords.y}%` }}
      onClick={() => onCityClick(cityName)}
    >
      {/* Container for the city marker and its name */}
      <div className="relative flex flex-col items-center justify-center">

        {/* City Name Label/Tooltip */}
        <span
          className={`absolute bottom-full mb-2 w-max px-2 py-1 text-xs text-center text-white bg-black bg-opacity-70 rounded-md transition-opacity pointer-events-none ${showName ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ textShadow: '1px 1px 2px #000' }}
        >
          {city.name}
        </span>
        
        {/* City circle and selection indicator */}
        <div className={`p-1 rounded-full transition-all duration-200 ${selectionClass}`}>
          <CityVisual colors={colorsToShow} sizeClass={sizeClass} pulseClass={pulseClass} />
        </div>

        {/* Port City Anchor Icon */}
        {isPortCity && (
          <div className="absolute top-1/2 -left-5 transform -translate-y-1/2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-cyan-200 shadow-lg z-20" title="Port City">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-3 w-3 text-white"
            >
                <path d="M12 2C9.25 2 7 4.25 7 7c0 1.38.53 2.63 1.4 3.61L3 16.16V20h5v-2H5.83l3.54-5.54C10.23 12.82 11.09 13 12 13c.91 0 1.77-.18 2.56-.47L18.17 20H16v2h5v-3.84l-5.4-5.55C16.47 9.63 17 8.38 17 7c0-2.75-2.25-5-5-5zm0 2c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3z"/>
            </svg>
          </div>
        )}

        {/* Research Station */}
        {gameState.gameType === 'pandemic' && hasStation && (
          <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-sm border border-gray-800 flex items-center justify-center text-black text-xs font-bold shadow-lg z-10" title="Research Station">R</div>
        )}
        {hasFort && (
          <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-yellow-700 rounded-sm border border-gray-800 flex items-center justify-center text-white text-xs font-bold shadow-lg z-10" title="Fort">F</div>
        )}
        {hospitalInCity && (
          <div 
              className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-sm border border-gray-800 flex items-center justify-center text-white text-xs font-bold shadow-lg z-10" 
              style={{ backgroundColor: DISEASE_COLOR_VALUES[hospitalInCity] }}
              title={`${hospitalInCity.charAt(0).toUpperCase() + hospitalInCity.slice(1)} Hospital`}
          >
              H
          </div>
        )}
        {legionsInCity > 0 && (
          <div className="absolute bottom-0 left-0 transform -translate-x-1/2 translate-y-1/2 w-6 h-6 flex items-center justify-center z-10" title={`${legionsInCity} Legion(s)`}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="absolute w-full h-full text-red-900 drop-shadow-lg">
                 <path d="M3.5 18.5 L3.5 13.5 C3.5 10.19 6.19 7.5 9.5 7.5 L14.5 7.5 C17.81 7.5 20.5 10.19 20.5 13.5 L20.5 18.5 A1.5 1.5 0 0 1 19 20 L5 20 A1.5 1.5 0 0 1 3.5 18.5 Z M9.5 4.5 A1.5 1.5 0 0 1 11 3 h2 a1.5 1.5 0 0 1 1.5 1.5 v3 A1.5 1.5 0 0 1 13 9 h-2 a1.5 1.5 0 0 1 -1.5 -1.5 v-3 Z"></path>
            </svg>
            <span className="relative text-white font-bold text-xs" style={{ textShadow: '1px 1px 3px black' }}>
              {legionsInCity}
            </span>
          </div>
        )}
      </div>

      {/* Cube container, positioned below the city marker */}
      {totalCubes > 0 && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 flex space-x-1">
              {Object.entries(cubes).filter(([,count]) => count && count > 0).sort(([colorA], [colorB]) => colorA.localeCompare(colorB)).map(([color, count]) => {
                  const bgColorClass = color === DiseaseColor.Black ? 'bg-gray-400' : `bg-${color as DiseaseColor}-500`;
                  const textColorClass = color === DiseaseColor.Yellow ? 'text-black font-semibold' : 'text-white font-bold';
                  return (
                      <div 
                          key={color}
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-sm shadow-lg ${bgColorClass} ${textColorClass}`}
                      >
                          {count}
                      </div>
                  )
              })}
          </div>
      )}
    </div>
  );
};

const PawnImage: React.FC<{
  role: PlayerRole;
  onLoadSuccess: () => void;
  onLoadError: () => void;
}> = ({ role, onLoadSuccess, onLoadError }) => {
  const extensionsToTry = useMemo(() => ['png', 'jpg', 'jpeg'], []);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [role]);

  const imageName = role.replace(/\s+/g, '').toLowerCase();
  const possiblePaths = useMemo(
    () => extensionsToTry.map(ext => `/assets/roles/${imageName}.${ext}`),
    [imageName, extensionsToTry]
  );

  const handleError = () => {
    if (imageIndex < possiblePaths.length - 1) {
      setImageIndex(imageIndex + 1);
    } else {
      onLoadError();
    }
  };
  
  if (imageIndex >= possiblePaths.length) {
    // This state will trigger the parent's fallback render.
    return null;
  }

  const currentSrc = possiblePaths[imageIndex];

  return (
    <img
      src={currentSrc}
      alt={role}
      onLoad={onLoadSuccess}
      onError={handleError}
      className="w-full h-full object-cover"
    />
  );
};

const PlayerPawn: React.FC<{ player: Player; index: number }> = ({ player, index }) => {
  const [imageHasFailed, setImageHasFailed] = useState(false);
  const city = CITIES_DATA[player.location];

  useEffect(() => {
    setImageHasFailed(false);
  }, [player.role]);
  
  if (!city) return null;
  
  const offset = index * 10;
  const roleColor = player.role ? PLAYER_ROLE_COLORS[player.role] : PLAYER_PAWN_COLORS[index];
  
  const fallbackContent = (
      <span className="font-bold text-xs text-black">
          P{player.id + 1}
      </span>
  );

  const pawnStyle = {
    backgroundColor: imageHasFailed || !player.role ? roleColor : 'transparent',
    borderColor: imageHasFailed || !player.role ? 'white' : roleColor,
    transform: `translateX(${offset - 12}px)`
  };

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out pointer-events-none"
      style={{ left: `${city.coords.x}%`, top: `${city.coords.y}%`, zIndex: 10 + index }}
      title={`${player.name} (${player.role})`}
    >
      <div
        className="w-6 h-6 rounded-full border-2 shadow-lg flex items-center justify-center overflow-hidden"
        style={pawnStyle}
      >
        {player.role && !imageHasFailed ? (
          <PawnImage 
            role={player.role} 
            onLoadSuccess={() => setImageHasFailed(false)}
            onLoadError={() => setImageHasFailed(true)}
          />
        ) : (
          fallbackContent
        )}
      </div>
    </div>
  );
};

const Board: React.FC<{
  gameState: GameState;
  onCityClick: (city: CityName) => void;
  selectedCity: CityName | null;
  showCityNames: boolean;
  highlightedCities?: CityName[];
  highlightedRegions?: string[]; 
  selectedConnection: { from: CityName; to: CityName } | null;
  onConnectionClick: (from: CityName, to: CityName) => void;
  selectedRegion: string | null;
  onRegionClick: (regionName: string) => void;
  highlightedConnections?: { from: CityName; to: CityName }[]; 
}> = ({ gameState, onCityClick, selectedCity, showCityNames, highlightedCities = [], highlightedRegions = [], selectedConnection, onConnectionClick, selectedRegion, onRegionClick, highlightedConnections = []  }) => {
  const DELIMITER = '_||_'; // Using a safer delimiter to avoid issues with names containing hyphens
  
  const { citiesToRenderData, connectionsToRender, backgroundImage } = useMemo(() => {
    let cities;
    let connections;
    let bg;

    switch (gameState.gameType) {
      case 'fallOfRome':
        cities = FALLOFROME_CITIES_DATA;
        connections = FALLOFROME_CONNECTIONS;
        bg = { 
          url: "https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg", 
          style: "absolute top-0 left-0 w-full h-full object-cover opacity-25 filter invert transform scale-[6.5] -translate-x-[8%] -translate-y-[-177%]" 
        };
        break;
      case 'iberia':
        cities = IBERIA_CITIES_DATA;
        connections = IBERIA_CONNECTIONS;
        bg = { 
            url: "https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg", 
            style: "absolute top-0 left-0 w-full h-full object-cover opacity-25 filter invert transform scale-[16.2] -translate-x-[-66.5%] -translate-y-[-395%]" 
        };
        break;
      case 'pandemic':
      default:
        cities = PANDEMIC_CITIES_DATA;
        connections = PANDEMIC_CONNECTIONS;
        bg = { 
          url: "https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg", 
          style: "absolute top-0 left-0 w-full h-full object-fill opacity-25 filter invert transform scale-x-[1.25] scale-y-[1.1] translate-y-[15%]" 
        };
        break;
    }
    return { citiesToRenderData: cities, connectionsToRender: connections, backgroundImage: bg };
  }, [gameState.gameType]);
  
  const migrationPathSegments = new Set<string>();
  if (gameState.gameType === 'fallOfRome') {
    FALLOFROME_MIGRATION_PATHS.forEach(p => {
        for(let i=0; i < p.path.length - 1; i++) {
            const key = [p.path[i], p.path[i+1]].sort().join(DELIMITER);
            migrationPathSegments.add(key);
        }
    });
  }

  const renderConnections = () => {
      const drawnConnections = new Set<string>();
      const isIberia = gameState.gameType === 'iberia';
      const seaRoutes = new Set(IBERIA_SEA_CONNECTIONS.map(c => [c[0], c[1]].sort().join(DELIMITER)));
  
      return Object.entries(connectionsToRender).flatMap(([from, toList]) =>
          (toList as CityName[]).map(to => {
              const fromCity = CITIES_DATA[from as CityName];
              const toCity = CITIES_DATA[to as CityName];
              if (!fromCity || !toCity) return null;
  
              const key = [from, to].sort().join(DELIMITER);
              if (drawnConnections.has(key)) return null;
              drawnConnections.add(key);
  
              if (migrationPathSegments.has(key)) return null;
  
              const isSelected = selectedConnection &&
                  ((selectedConnection.from === from && selectedConnection.to === to) ||
                  (selectedConnection.from === to && selectedConnection.to === from));
  
              const isHighlighted = highlightedConnections.some(hc =>
                  (hc.from === from && hc.to === to) || (hc.from === to && hc.to === from)
              );
  
              const isSeaRoute = isIberia && seaRoutes.has(key);
  
              return (
                  <g key={key} className="cursor-pointer group" onClick={() => isIberia && onConnectionClick(from as CityName, to as CityName)}>
                      <line
                          x1={`${fromCity.coords.x}%`} y1={`${fromCity.coords.y}%`}
                          x2={`${toCity.coords.x}%`} y2={`${toCity.coords.y}%`}
                          className={`transition-all duration-200 ${
                              isHighlighted ? 'stroke-green-400 animate-pulse' :
                              isSelected ? 'stroke-yellow-400' : 'stroke-gray-500 group-hover:stroke-gray-400'
                          }`}
                          strokeWidth={isSelected || isHighlighted ? "0.6" : "0.2"}
                          strokeDasharray={isSeaRoute ? "1 1" : "none"}
                      />
                      <line
                          x1={`${fromCity.coords.x}%`} y1={`${fromCity.coords.y}%`}
                          x2={`${toCity.coords.x}%`} y2={`${toCity.coords.y}%`}
                          stroke="transparent"
                          strokeWidth="2.5"
                      />
                  </g>
              );
          })
      );
  };
  
  const renderRailroads = () => {
    if (gameState.gameType !== 'iberia' || !gameState.railroads) return null;

    return gameState.railroads.map(({ from, to }, index) => {
        const fromCity = CITIES_DATA[from];
        const toCity = CITIES_DATA[to];
        if (!fromCity || !toCity) return null;

        return (
            <line
                key={`railroad-${index}`}
                x1={`${fromCity.coords.x}%`} y1={`${fromCity.coords.y}%`}
                x2={`${toCity.coords.x}%`} y2={`${toCity.coords.y}%`}
                stroke="#A16207" // Tailwind yellow-700
                strokeWidth="0.8"
                strokeLinecap="round"
                className="pointer-events-none"
            />
        );
    });
  };

  const renderMigrationPaths = () => {
    if (gameState.gameType !== 'fallOfRome') return null;

    const allLocations = { ...CITIES_DATA, ...FALLOFROME_BARBARIAN_SUPPLY_DATA };

    // Group segments by their physical path to handle parallel lines for different tribes.
    const segments: Record<string, { tribe: DiseaseColor; from: string; to: string }[]> = {};

    FALLOFROME_MIGRATION_PATHS.forEach(p => {
        for (let i = 0; i < p.path.length - 1; i++) {
            const fromName = p.path[i] as string;
            const toName = p.path[i + 1] as string;
            const key = [fromName, toName].sort().join(DELIMITER);

            if (!segments[key]) {
                segments[key] = [];
            }
            
            // Avoid adding the exact same tribe segment twice to the same path key
            const alreadyExists = segments[key].some(s => s.tribe === p.tribe);
            if (!alreadyExists) {
              segments[key].push({ tribe: p.tribe, from: fromName, to: toName });
            }
        }
    });

    return Object.entries(segments).flatMap(([key, segmentList]) => {
        const totalLines = segmentList.length;
        const offsetAmount = 0.35; 
        const totalOffsetWidth = (totalLines - 1) * offsetAmount;

        // Establish a canonical direction for this path segment to calculate a consistent perpendicular vector.
        const [canonFromName, canonToName] = key.split(DELIMITER);
        const canonFromLoc = allLocations[canonFromName as keyof typeof allLocations];
        const canonToLoc = allLocations[canonToName as keyof typeof allLocations];

        if (!canonFromLoc || !canonToLoc) return [];

        const { x: cx1, y: cy1 } = canonFromLoc.coords;
        const { x: cx2, y: cy2 } = canonToLoc.coords;

        const dx = cx2 - cx1;
        const dy = cy2 - cy1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return [];

        // This perpendicular vector is now the same for all lines on this physical path.
        const perpX = -dy / length;
        const perpY = dx / length;

        return segmentList.map(({ tribe, from, to }, index) => {
            const fromLoc = allLocations[from as keyof typeof allLocations];
            const toLoc = allLocations[to as keyof typeof allLocations];

            if (!fromLoc || !toLoc) return null;

            // Get the original coordinates for this specific line segment.
            const { x: x1, y: y1 } = fromLoc.coords;
            const { x: x2, y: y2 } = toLoc.coords;

            let finalX1 = x1, finalY1 = y1, finalX2 = x2, finalY2 = y2;

            // If multiple tribes share this path, calculate offsets to draw parallel lines.
            if (totalLines > 1) {
                // Calculate the offset for this specific line from the center of the group
                const lineOffset = -totalOffsetWidth / 2 + index * offsetAmount;

                // Apply the canonical offset to the start and end points of this line
                finalX1 = x1 + lineOffset * perpX;
                finalY1 = y1 + lineOffset * perpY;
                finalX2 = x2 + lineOffset * perpX;
                finalY2 = y2 + lineOffset * perpY;
            }
            
            const lineKey = `${from}-${to}-${tribe}-${index}`;

            return (
                <line
                    key={lineKey}
                    x1={`${finalX1}%`}
                    y1={`${finalY1}%`}
                    x2={`${finalX2}%`}
                    y2={`${finalY2}%`}
                    stroke={DISEASE_COLOR_VALUES[tribe]}
                    strokeWidth="0.3"
                    strokeLinecap="round"
                />
            );
        });
    });
};

  const renderIberiaRegionsAndTokens = () => {
    if (gameState.gameType !== 'iberia') return null;
  
    return (
      <>
        {/* Render Regions as Polygons */}
        <g>
          {IBERIA_REGIONS.map(region => {
            const points = region.vertices
              .map(v => CITIES_DATA[v].coords)
              .map(coords => `${coords.x},${coords.y}`)
              .join(' ');
            
            const isSelected = selectedRegion === region.name;
            const isHighlighted = highlightedRegions.includes(region.name);
  
            return (
               <g key={region.name} onClick={() => onRegionClick(region.name)} className="cursor-pointer group">
                {/* Visible Polygon - hover is now controlled by the parent group */}
                <polygon
                  points={points}
                  className={`transition-all duration-200 pointer-events-none 
                    ${isHighlighted
                        ? 'fill-yellow-400/50 stroke-yellow-200 animate-pulse'
                        : isSelected 
                            ? 'fill-cyan-500/40 stroke-cyan-200' 
                            : 'fill-cyan-500/10 stroke-cyan-500/40 group-hover:fill-cyan-500/25'
                    }`}
                  strokeWidth="0.3"
                />
                {/* Invisible Click Helper Polygon Border */}
                <polygon
                  points={points}
                  className="fill-transparent stroke-transparent"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </g>
  
        {/* Render Purification Tokens */}
        {Object.entries(gameState.purificationTokens || {}).map(([regionName, count]) => {
          if (count === 0) return null;
          const region = IBERIA_REGIONS.find(r => r.name === regionName);
          if (!region) return null;
  
          return (
            <g
              key={`token-${regionName}`}
              transform={`translate(${region.center.x}, ${region.center.y})`}
              className="pointer-events-none"
            >
              {/* Water Drop Shape */}
              <path
                d="M6 0 C-2 7, 1 14, 6 18 C11 14, 14 7, 6 0 Z"
                transform="scale(0.15) translate(-6, -9)"
                className="fill-blue-400 stroke-blue-200"
                strokeWidth="0.2"
              />
              {/* Count Badge */}
              <circle cx="0" cy="0.5" r="1" className="fill-white" />
              <text
                x="0"
                y="0.5"
                textAnchor="middle"
                dy=".3em"
                className="fill-black font-bold"
                fontSize="1.2"
              >
                {count}
              </text>
            </g>
          );
        })}
      </>
    );
  };
  
  const renderNursePreventionToken = () => {
    if (gameState.gameType !== 'iberia' || !gameState.nursePreventionTokenLocation) return null;
  
    const region = IBERIA_REGIONS.find(r => r.name === gameState.nursePreventionTokenLocation);
    if (!region) return null;
  
    return (
      <g
        key="nurse-token"
        // We add a small offset (+1.5 on x, -1.5 on y) to move the token up and to the right.
        transform={`translate(${region.center.x + 1.5}, ${region.center.y - 1.5})`}
        className="pointer-events-none"
      >
        {/* The radii of the circles have been reduced to make the token smaller. */}
        <circle cx="0" cy="0" r="1.6" className="fill-red-500 opacity-75" />
        <circle cx="0" cy="0" r="0.8" className="fill-white opacity-90" />
        <circle cx="0" cy="0" r="0.3" className="fill-red-500 opacity-90" />
      </g>
    );
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-black rounded-lg shadow-2xl overflow-hidden">
      <img
        src={backgroundImage.url}
        alt="Game map background"
        className={backgroundImage.style}
      />
      <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {renderIberiaRegionsAndTokens()}
        {renderNursePreventionToken()}
        {renderRailroads()}
        {renderMigrationPaths()}
        {renderConnections()}
      </svg>
      {gameState.gameType === 'fallOfRome' && Object.values(FALLOFROME_BARBARIAN_SUPPLY_DATA).map(supply => (
        <BarbarianSupplyMarker key={supply.name} supplySpace={supply} gameState={gameState} />
      ))}
      {Object.entries(citiesToRenderData).map(([cityName, city]) => (
        <CityMarker
          key={cityName}
          city={city}
          cityName={cityName as CityName}
          gameState={gameState}
          onCityClick={onCityClick}
          isSelected={selectedCity === cityName}
          isHighlighted={highlightedCities.includes(cityName as CityName)}
          showName={showCityNames}
        />
      ))}
      {gameState.players.map((player, index) => (
        <PlayerPawn key={player.id} player={player} index={index} />
      ))}
    </div>
  );
};

export default Board;
