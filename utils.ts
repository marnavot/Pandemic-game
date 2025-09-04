import { CityName, CONNECTIONS, CITIES_DATA, GameState, IBERIA_CITIES_DATA, FALLOFROME_CITIES_DATA, PANDEMIC_CITIES_DATA } from './types';

export const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * A robust deep-cloning function that creates a "pure" data object,
 * suitable for serialization and for saving to databases like Firestore. It strips
 * all class information, methods, and circular references.
 * @param obj The object to clone.
 * @returns A plain JavaScript object clone.
 */
export const deepClone = <T>(obj: T): T => {
    // This is the most reliable way to create a deep, "plain" copy of an object
    // that might contain non-serializable properties from libraries like Firebase.
    if (obj === undefined) {
        return obj;
    }
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Safely clones the game state object, preventing circular reference errors
 * from the actionHistory array or complex library objects by using a custom deep clone function.
 * @param gameState The game state to clone.
 * @returns A deep copy of the game state.
 */
export const safeCloneGameState = (gameState: GameState): GameState => {
    const { actionHistory, ...restOfState } = gameState;
    const newState = deepClone(restOfState) as GameState;
    // The history is a series of snapshots; we don't need to deep clone it, just the array itself.
    newState.actionHistory = [...actionHistory];
    return newState;
};

export const getCitiesWithinRange = (startCity: CityName, range: number): CityName[] => {
    const visited = new Set<CityName>([startCity]);
    const queue: { city: CityName; distance: number }[] = [{ city: startCity, distance: 0 }];
    const result: CityName[] = [];

    while (queue.length > 0) {
        const { city, distance } = queue.shift()!;

        if (distance > 0 && distance <= range) {
            result.push(city);
        }

        if (distance < range) {
            for (const neighbor of CONNECTIONS[city]) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ city: neighbor, distance: distance + 1 });
                }
            }
        }
    }
    // Sort alphabetically for display
    return result.sort((a,b) => CITIES_DATA[a].name.localeCompare(CITIES_DATA[b].name));
};

export const isReachableByTrain = (
  start: CityName,
  end: CityName,
  railroads: { from: CityName; to: CityName }[]
): boolean => {
  if (start === end) return false; // Cannot travel to the same city

  // 1. Build an adjacency list for the railroad network
  const adjList: Record<string, CityName[]> = {};
  railroads.forEach(({ from, to }) => {
    if (!adjList[from]) adjList[from] = [];
    if (!adjList[to]) adjList[to] = [];
    adjList[from].push(to);
    adjList[to].push(from);
  });

  if (!adjList[start]) return false; // Start city has no railroads connected

  // 2. Perform BFS to find if a path exists
  const queue: CityName[] = [start];
  const visited = new Set<CityName>([start]);

  while (queue.length > 0) {
    const currentCity = queue.shift()!;
    
    if (currentCity === end) {
      return true;
    }

    const neighbors = adjList[currentCity] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // 3. If loop finishes, 'end' was not reached
  return false;
};

export const getCityDataForGame = (city: CityName, gameType: 'pandemic' | 'fallOfRome' | 'iberia') => {
    switch (gameType) {
        case 'iberia':
            // Prioritize Iberia data for Iberia games
            return IBERIA_CITIES_DATA[city as keyof typeof IBERIA_CITIES_DATA] || CITIES_DATA[city];
        case 'fallOfRome':
            return FALLOFROME_CITIES_DATA[city as keyof typeof FALLOFROME_CITIES_DATA] || CITIES_DATA[city];
        case 'pandemic':
        default:
            // MUST prioritize Pandemic data for Pandemic games to get blue Madrid
            return PANDEMIC_CITIES_DATA[city as keyof typeof PANDEMIC_CITIES_DATA] || CITIES_DATA[city];
    }
};
