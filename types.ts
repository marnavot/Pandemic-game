

export enum DiseaseColor {
Blue = "blue",
Yellow = "yellow",
Black = "black",
Red = "red",
Purple = "purple",
White = "white",
Green = "green",
Orange = "orange",
}

export type FallOfRomeDiseaseColor = DiseaseColor.Blue | DiseaseColor.Orange | DiseaseColor.Green | DiseaseColor.White | DiseaseColor.Black;

export const FALLOFROME_DISEASE_COLORS: FallOfRomeDiseaseColor[] = [DiseaseColor.Blue, DiseaseColor.Orange, DiseaseColor.Green, DiseaseColor.White, DiseaseColor.Black];

export interface City {
name: string;
color: DiseaseColor;
boardColors?: DiseaseColor[];
coords: { x: number; y: number };
population: number;
distanceFromRoma?: number;
}

// By removing the explicit type annotation and adding 'as const',
// we allow TypeScript to infer the type from the object literal,
// which breaks the circular reference with CityName.
export const PANDEMIC_CITIES_DATA = {
SanFrancisco: { name: "San Francisco", color: DiseaseColor.Blue, coords: { x: 8, y: 35 }, population: 874961 },
Chicago: { name: "Chicago", color: DiseaseColor.Blue, coords: { x: 18, y: 32 }, population: 2705994 },
Atlanta: { name: "Atlanta", color: DiseaseColor.Blue, coords: { x: 20, y: 42 }, population: 498044 },
Montreal: { name: "Montreal", color: DiseaseColor.Blue, coords: { x: 25, y: 31 }, population: 1780000 },
NewYork: { name: "New York", color: DiseaseColor.Blue, coords: { x: 29, y: 34 }, population: 8398748 },
Washington: { name: "Washington", color: DiseaseColor.Blue, coords: { x: 28, y: 43 }, population: 705749 },
London: { name: "London", color: DiseaseColor.Blue, coords: { x: 45, y: 28 }, population: 8982000 },
Madrid: { name: "Madrid", color: DiseaseColor.Blue, coords: { x: 43, y: 41 }, population: 3223334 },
Paris: { name: "Paris", color: DiseaseColor.Blue, coords: { x: 51, y: 33 }, population: 2141000 },
Essen: { name: "Essen", color: DiseaseColor.Blue, coords: { x: 52, y: 25 }, population: 583109 },
Milan: { name: "Milan", color: DiseaseColor.Blue, coords: { x: 55, y: 32 }, population: 1352000 },
StPetersburg: { name: "St. Petersburg", color: DiseaseColor.Blue, coords: { x: 60, y: 23 }, population: 5351935 },
LosAngeles: { name: "Los Angeles", color: DiseaseColor.Yellow, coords: { x: 9, y: 50 }, population: 3990456 },
MexicoCity: { name: "Mexico City", color: DiseaseColor.Yellow, coords: { x: 15, y: 55 }, population: 9209944 },
Miami: { name: "Miami", color: DiseaseColor.Yellow, coords: { x: 23, y: 54 }, population: 467963 },
Bogota: { name: "Bogota", color: DiseaseColor.Yellow, coords: { x: 24, y: 65 }, population: 7412566 },
Lima: { name: "Lima", color: DiseaseColor.Yellow, coords: { x: 21, y: 78 }, population: 9752000 },
Santiago: { name: "Santiago", color: DiseaseColor.Yellow, coords: { x: 23, y: 90 }, population: 6158080 },
BuenosAires: { name: "Buenos Aires", color: DiseaseColor.Yellow, coords: { x: 30, y: 85 }, population: 2891000 },
SaoPaulo: { name: "Sao Paulo", color: DiseaseColor.Yellow, coords: { x: 35, y: 78 }, population: 12325232 },
Lagos: { name: "Lagos", color: DiseaseColor.Yellow, coords: { x: 48, y: 65 }, population: 14862000 },
Kinshasa: { name: "Kinshasa", color: DiseaseColor.Yellow, coords: { x: 54, y: 72 }, population: 14950000 },
Johannesburg: { name: "Johannesburg", color: DiseaseColor.Yellow, coords: { x: 58, y: 84 }, population: 5635000 },
Khartoum: { name: "Khartoum", color: DiseaseColor.Yellow, coords: { x: 59, y: 62 }, population: 5274321 },
Moscow: { name: "Moscow", color: DiseaseColor.Black, coords: { x: 64, y: 32 }, population: 12615882 },
Istanbul: { name: "Istanbul", color: DiseaseColor.Black, coords: { x: 59, y: 41 }, population: 15460000 },
Algiers: { name: "Algiers", color: DiseaseColor.Black, coords: { x: 51, y: 48 }, population: 3415811 },
Cairo: { name: "Cairo", color: DiseaseColor.Black, coords: { x: 58, y: 50 }, population: 9845000 },
Baghdad: { name: "Baghdad", color: DiseaseColor.Black, coords: { x: 65, y: 45 }, population: 8126755 },
Riyadh: { name: "Riyadh", color: DiseaseColor.Black, coords: { x: 67, y: 55 }, population: 7676654 },
Tehran: { name: "Tehran", color: DiseaseColor.Black, coords: { x: 70, y: 38 }, population: 8693706 },
Karachi: { name: "Karachi", color: DiseaseColor.Black, coords: { x: 73, y: 48 }, population: 14910352 },
Delhi: { name: "Delhi", color: DiseaseColor.Black, coords: { x: 78, y: 45 }, population: 18980000 },
Mumbai: { name: "Mumbai", color: DiseaseColor.Black, coords: { x: 75, y: 55 }, population: 12442373 },
Kolkata: { name: "Kolkata", color: DiseaseColor.Black, coords: { x: 84, y: 48 }, population: 4496694 },
Chennai: { name: "Chennai", color: DiseaseColor.Black, coords: { x: 80, y: 63 }, population: 7088000 },
Beijing: { name: "Beijing", color: DiseaseColor.Red, coords: { x: 85, y: 30 }, population: 21540000 },
Seoul: { name: "Seoul", color: DiseaseColor.Red, coords: { x: 91, y: 31 }, population: 9776000 },
Tokyo: { name: "Tokyo", color: DiseaseColor.Red, coords: { x: 96, y: 36 }, population: 13929000 },
Shanghai: { name: "Shanghai", color: DiseaseColor.Red, coords: { x: 86, y: 40 }, population: 24280000 },
HongKong: { name: "Hong Kong", color: DiseaseColor.Red, coords: { x: 87, y: 52 }, population: 7482500 },
Taipei: { name: "Taipei", color: DiseaseColor.Red, coords: { x: 92, y: 48 }, population: 2646204 },
Osaka: { name: "Osaka", color: DiseaseColor.Red, coords: { x: 97, y: 44 }, population: 2691000 },
Bangkok: { name: "Bangkok", color: DiseaseColor.Red, coords: { x: 83, y: 60 }, population: 10539000 },
Jakarta: { name: "Jakarta", color: DiseaseColor.Red, coords: { x: 84, y: 75 }, population: 10562088 },
HoChiMinhCity: { name: "Ho Chi Minh City", color: DiseaseColor.Red, coords: { x: 89, y: 65 }, population: 8993082 },
Manila: { name: "Manila", color: DiseaseColor.Red, coords: { x: 95, y: 62 }, population: 1780148 },
Sydney: { name: "Sydney", color: DiseaseColor.Red, coords: { x: 95, y: 88 }, population: 5312163 },
} as const;

export const FALLOFROME_CITIES_DATA = {
// Anglo-Saxons & Franks (Orange) - original color preserved, boardColors added
Eburacum: { name: "Eburacum", color: DiseaseColor.Orange, boardColors: [DiseaseColor.Orange], coords: { x: 10, y: 5 }, population: 20000, distanceFromRoma: 15 },
Londinium: { name: "Londinium", color: DiseaseColor.Orange, boardColors: [DiseaseColor.Orange], coords: { x: 16, y: 16 }, population: 45000, distanceFromRoma: 14 },
Gesoriacum: { name: "Gesoriacum", color: DiseaseColor.Orange, boardColors: [DiseaseColor.Orange], coords: { x: 23, y: 20 }, population: 10000, distanceFromRoma: 13 },
Lutetia: { name: "Lutetia", color: DiseaseColor.Orange, boardColors: [DiseaseColor.Orange, DiseaseColor.Green], coords: { x: 23, y: 29 }, population: 20000, distanceFromRoma: 12 },
Mogontiacum: { name: "Mogontiacum", color: DiseaseColor.Orange, boardColors: [DiseaseColor.Orange, DiseaseColor.Black], coords: { x: 34, y: 22 }, population: 20000, distanceFromRoma: 10 },
Iuvavum: { name: "Iuvavum", color: DiseaseColor.Orange, boardColors: [DiseaseColor.Green], coords: { x: 45, y: 33 }, population: 15000, distanceFromRoma: 7 },
Carnuntum: { name: "Carnuntum", color: DiseaseColor.Orange, boardColors: [DiseaseColor.Green, DiseaseColor.Blue], coords: { x: 53, y: 31 }, population: 50000, distanceFromRoma: 8 },

// Visigoths (White) - original color preserved, boardColors added
Burdigala: { name: "Burdigala", color: DiseaseColor.White, boardColors: [DiseaseColor.Orange, DiseaseColor.Black], coords: { x: 16, y: 52 }, population: 30000, distanceFromRoma: 11 },
Lugdunum: { name: "Lugdunum", color: DiseaseColor.White, boardColors: [DiseaseColor.Green, DiseaseColor.Black], coords: { x: 29, y: 44 }, population: 50000, distanceFromRoma: 9 },
Narbo: { name: "Narbo", color: DiseaseColor.White, boardColors: [DiseaseColor.Orange, DiseaseColor.White], coords: { x: 26, y: 63 }, population: 35000, distanceFromRoma: 8 },
Caesaraugusta: { name: "Caesaraugusta", color: DiseaseColor.White, boardColors: [DiseaseColor.Black], coords: { x: 13, y: 69 }, population: 20000, distanceFromRoma: 10 },
Corduba: { name: "Corduba", color: DiseaseColor.White, boardColors: [DiseaseColor.Black, DiseaseColor.White], coords: { x: 8, y: 82 }, population: 50000, distanceFromRoma: 11 },
NovaCarthago: { name: "Nova Carthago", color: DiseaseColor.White, boardColors: [DiseaseColor.White], coords: { x: 16, y: 84 }, population: 20000, distanceFromRoma: 9 },

// Ostrogoths (Blue) - original color preserved, boardColors added
Mediolanum: { name: "Mediolanum", color: DiseaseColor.Blue, boardColors: [DiseaseColor.Green], coords: { x: 39, y: 44 }, population: 100000, distanceFromRoma: 6 },
Genua: { name: "Genua", color: DiseaseColor.Blue, boardColors: [DiseaseColor.Orange, DiseaseColor.White], coords: { x: 37, y: 52 }, population: 25000, distanceFromRoma: 5 },
Aquileia: { name: "Aquileia", color: DiseaseColor.Blue, boardColors: [DiseaseColor.Blue, DiseaseColor.White], coords: { x: 47, y: 41 }, population: 100000, distanceFromRoma: 6 },
Ravenna: { name: "Ravenna", color: DiseaseColor.Blue, boardColors: [DiseaseColor.White], coords: { x: 45, y: 50 }, population: 40000, distanceFromRoma: 4 },
Roma: { name: "Roma", color: DiseaseColor.Blue, boardColors: [DiseaseColor.Blue, DiseaseColor.Green, DiseaseColor.Black, DiseaseColor.Orange, DiseaseColor.White], coords: { x: 45, y: 63 }, population: 800000, distanceFromRoma: 0 },
Brundisium: { name: "Brundisium", color: DiseaseColor.Blue, boardColors: [DiseaseColor.Green], coords: { x: 58, y: 69 }, population: 40000, distanceFromRoma: 5 },
Narona: { name: "Narona", color: DiseaseColor.Blue, boardColors: [DiseaseColor.White], coords: { x: 58, y: 52 }, population: 10000, distanceFromRoma: 7 },
Patrae: { name: "Patrae", color: DiseaseColor.Blue, boardColors: [DiseaseColor.Green, DiseaseColor.White], coords: { x: 66, y: 71 }, population: 20000, distanceFromRoma: 8 },
Athenae: { name: "Athenae", color: DiseaseColor.Blue, boardColors: [DiseaseColor.White, DiseaseColor.Black], coords: { x: 71, y: 74 }, population: 200000, distanceFromRoma: 9 },
Syracusae: { name: "Syracusae", color: DiseaseColor.Blue, boardColors: [DiseaseColor.Black], coords: { x: 53, y: 84 }, population: 90000, distanceFromRoma: 4 },

// Huns (Green) - original color preserved, boardColors added
Philippopolis: { name: "Philippopolis", color: DiseaseColor.Green, boardColors: [DiseaseColor.Green, DiseaseColor.White], coords: { x: 71, y: 57 }, population: 50000, distanceFromRoma: 10 },
Constantinopolis: { name: "Constantinopolis", color: DiseaseColor.Green, boardColors: [DiseaseColor.Blue, DiseaseColor.Black, DiseaseColor.White], coords: { x: 82, y: 61 }, population: 400000, distanceFromRoma: 12 },
Sinope: { name: "Sinope", color: DiseaseColor.Green, boardColors: [DiseaseColor.Blue], coords: { x: 95, y: 61 }, population: 25000, distanceFromRoma: 15 },
Tyras: { name: "Tyras", color: DiseaseColor.Green, boardColors: [DiseaseColor.White], coords: { x: 84, y: 48 }, population: 10000, distanceFromRoma: 14 },
Chersonesus: { name: "Chersonesus", color: DiseaseColor.Green, boardColors: [DiseaseColor.Blue], coords: { x: 92, y: 50 }, population: 5000, distanceFromRoma: 16 },

// Vandals (Black) - original color preserved, boardColors added
Tingi: { name: "Tingi", color: DiseaseColor.Black, boardColors: [DiseaseColor.Black], coords: { x: 5, y: 95 }, population: 20000, distanceFromRoma: 13 },
Carthago: { name: "Carthago", color: DiseaseColor.Black, boardColors: [DiseaseColor.Black], coords: { x: 39, y: 86 }, population: 300000, distanceFromRoma: 6 },
Cesarea: { name: "Cesarea", color: DiseaseColor.Black, boardColors: [DiseaseColor.Black], coords: { x: 23, y: 91 }, population: 30000, distanceFromRoma: 7 },
} as const;

export const IBERIA_CITIES_DATA = {
ACoruña: { name: "A Coruña", color: DiseaseColor.Blue, coords: { x: 12.93, y: 18.23 }, population: 0},
SangiagoDeCompostela: { name: "Santiago de Compostela", color: DiseaseColor.Blue, coords: { x: 12.55, y: 23.44 }, population: 0},
Ourense: { name: "Ourense", color: DiseaseColor.Blue, coords: { x: 20.53, y: 28.13 }, population: 0},
Vigo: { name: "Vigo", color: DiseaseColor.Blue, coords: { x: 11.03, y: 30.21 }, population: 0},
Braga: { name: "Braga", color: DiseaseColor.Blue, coords: { x: 18.63, y: 36.98 }, population: 0},
Porto: { name: "Porto", color: DiseaseColor.Blue, coords: { x: 11.79, y: 41.15 }, population: 0},
Salamanca: { name: "Salamanca", color: DiseaseColor.Blue, coords: { x: 28.52, y: 43.75 }, population: 0},
Coimbra: { name: "Coimbra", color: DiseaseColor.Blue, coords: { x: 17.11, y: 51.04 }, population: 0},
Cáceres: { name: "Cáceres", color: DiseaseColor.Blue, coords: { x: 24.71, y: 57.81 }, population: 0},
Lisboa: { name: "Lisboa", color: DiseaseColor.Blue, coords: { x: 9.13, y: 65.63 }, population: 0},
Évora: { name: "Évora", color: DiseaseColor.Blue, coords: { x: 16.35, y: 67.19 }, population: 0},
Albufeira: { name: "Albufeira", color: DiseaseColor.Blue, coords: { x: 13.69, y: 81.25 }, population: 0},
AndorraLaVella: { name: "Andorra la Vella", color: DiseaseColor.Yellow, coords: { x: 68.82, y: 27.08 }, population: 0},
Girona: { name: "Girona", color: DiseaseColor.Yellow, coords: { x: 76.05, y: 32.81 }, population: 0},
Zaragoza: { name: "Zaragoza", color: DiseaseColor.Yellow, coords: { x: 55.51, y: 36.46 }, population: 0},
Barcelona: { name: "Barcelona", color: DiseaseColor.Yellow, coords: { x: 72.24, y: 39.06 }, population: 0 },
Tarragona: { name: "Tarragona", color: DiseaseColor.Yellow, coords: { x: 64.26, y: 42.71 }, population: 0},
Teruel: { name: "Teruel", color: DiseaseColor.Yellow, coords: { x: 53.99, y: 50 }, population: 0},
Cuenca: { name: "Cuenca", color: DiseaseColor.Yellow, coords: { x: 48.29, y: 52.6 }, population: 0},
PalmaDeMallorca: { name: "Palma de Mallorca", color: DiseaseColor.Yellow, coords: { x: 72.62, y: 56.77 }, population: 0},
Valencia: { name: "Valencia", color: DiseaseColor.Yellow, coords: { x: 57.79, y: 58.33 }, population: 0},
Albacete: { name: "Albacete", color: DiseaseColor.Yellow, coords: { x: 49.81, y: 63.02 }, population: 0},
Alicante: { name: "Alicante", color: DiseaseColor.Yellow, coords: { x: 57.41, y: 69.27 }, population: 0},
Cartagena: { name: "Cartagena", color: DiseaseColor.Yellow, coords: { x: 54.75, y: 76.56 }, population: 0},
Toledo: { name: "Toledo", color: DiseaseColor.Black, coords: { x: 33.46, y: 53.65 }, population: 0},
CiudadReal: { name: "Ciudad Real", color: DiseaseColor.Black, coords: { x: 38.4, y: 63.02 }, population: 0},
Badajoz: { name: "Badajoz", color: DiseaseColor.Black, coords: { x: 21.29, y: 64.06 }, population: 0},
Jaén: { name: "Jaén", color: DiseaseColor.Black, coords: { x: 40.3, y: 71.35 }, population: 0},
Córdoba: { name: "Córdoba", color: DiseaseColor.Black, coords: { x: 33.46, y: 73.44 }, population: 0},
Granada: { name: "Granada", color: DiseaseColor.Black, coords: { x: 41.44, y: 78.65 }, population: 0},
Sevilla: { name: "Sevilla", color: DiseaseColor.Black, coords: { x: 27, y: 79.17 }, population: 0},
Huelva: { name: "Huelva", color: DiseaseColor.Black, coords: { x: 21.29, y: 79.69 }, population: 0},
Almería: { name: "Almería", color: DiseaseColor.Black, coords: { x: 46.39, y: 83.85 }, population: 0},
Málaga: { name: "Málaga", color: DiseaseColor.Black, coords: { x: 35.36, y: 84.9 }, population: 0},
Cádiz: { name: "Cádiz", color: DiseaseColor.Black, coords: { x: 25.1, y: 87.5 }, population: 0},
Gibraltar: { name: "Gibraltar", color: DiseaseColor.Black, coords: { x: 29.66, y: 90.63 }, population: 0},
SanSebastiánDonostia: { name: "San Sebastián-Donostia", color: DiseaseColor.Red, coords: { x: 50.19, y: 17.19 }, population: 0},
Gijón: { name: "Gijón", color: DiseaseColor.Red, coords: { x: 28.9, y: 16.15 }, population: 0},
Santander: { name: "Santander", color: DiseaseColor.Red, coords: { x: 38.78, y: 17.71 }, population: 0},
BilbaoBilbo: { name: "Bilbao-Bilbo", color: DiseaseColor.Red, coords: { x: 44.11, y: 19.79 }, population: 0},
Pamplona: { name: "Pamplona", color: DiseaseColor.Red, coords: { x: 50.95, y: 24.48 }, population: 0},
VitoriaGasteiz: { name: "Vitoria-Gasteiz", color: DiseaseColor.Red, coords: { x: 45.63, y: 27.6 }, population: 0},
León: { name: "León", color: DiseaseColor.Red, coords: { x: 28.9, y: 26.56 }, population: 0},
Burgos: { name: "Burgos", color: DiseaseColor.Red, coords: { x: 39.54, y: 29.17 }, population: 0},
Huesca: { name: "Huesca", color: DiseaseColor.Red, coords: { x: 58.17, y: 30.21 }, population: 0},
Valladolid: { name: "Valladolid", color: DiseaseColor.Red, coords: { x: 33.84, y: 36.46 }, population: 0},
Soria: { name: "Soria", color: DiseaseColor.Red, coords: { x: 44.87, y: 37.5 }, population: 0},
Madrid: { name: "Madrid", color: DiseaseColor.Red, coords: { x: 39.54, y: 48.44 }, population: 0},
} as const;

export const FALLOFROME_ALLIANCE_CARD_REQUIREMENTS: Record<FallOfRomeDiseaseColor, number> = {
[DiseaseColor.Blue]: 3,    // Ostrogoths
[DiseaseColor.Orange]: 4,  // Anglo-Saxons & Franks
[DiseaseColor.Green]: 4,   // Huns
[DiseaseColor.White]: 5,   // Visigoths
[DiseaseColor.Black]: 5,   // Vandals
};

export const FALLOFROME_INITIAL_CUBE_COUNTS: Record<DiseaseColor, number> = {
[DiseaseColor.Orange]: 20, // Anglo-Saxons & Franks
[DiseaseColor.Black]: 22,  // Vandals
[DiseaseColor.Green]: 20,  // Huns
[DiseaseColor.White]: 24,  // Visigoths
[DiseaseColor.Blue]: 14,   // Ostrogoths
// Defaults for other colors, not used but good for type completeness
[DiseaseColor.Yellow]: 24,
[DiseaseColor.Red]: 24,
[DiseaseColor.Purple]: 12,
};

export interface BarbarianSupplySpace {
name: string;
color: DiseaseColor;
coords: { x: number; y: number };
}

export const FALLOFROME_BARBARIAN_SUPPLY_DATA: Record<string, BarbarianSupplySpace> = {
Ostrogoths: { name: "Ostrogoths", color: DiseaseColor.Blue, coords: { x: 80, y: 18 } },
Visigoths: { name: "Visigoths", color: DiseaseColor.White, coords: { x: 75, y: 42 } },
Huns: { name: "Huns", color: DiseaseColor.Green, coords: { x: 62, y: 38 } },
Vandals: { name: "Vandals", color: DiseaseColor.Black, coords: { x: 45, y: 15 } },
'Anglo-Saxons & Franks': { name: "Anglo-Saxons & Franks", color: DiseaseColor.Orange, coords: { x: 28, y: 10 } },
} as const;

export const CITIES_DATA = { ...PANDEMIC_CITIES_DATA, ...FALLOFROME_CITIES_DATA, ...IBERIA_CITIES_DATA };
export type CityName = keyof typeof CITIES_DATA;

export const PANDEMIC_CONNECTIONS: Record<keyof typeof PANDEMIC_CITIES_DATA, (keyof typeof PANDEMIC_CITIES_DATA)[]> = {
SanFrancisco: ["Tokyo", "Manila", "LosAngeles", "Chicago"],
Chicago: ["SanFrancisco", "LosAngeles", "MexicoCity", "Atlanta", "Montreal"],
Atlanta: ["Chicago", "Washington", "Miami"],
Montreal: ["Chicago", "Washington", "NewYork"],
NewYork: ["Montreal", "Washington", "London", "Madrid"],
Washington: ["Atlanta", "Montreal", "NewYork", "Miami"],
London: ["NewYork", "Madrid", "Paris", "Essen"],
Madrid: ["NewYork", "London", "Paris", "Algiers", "SaoPaulo"],
Paris: ["London", "Madrid", "Algiers", "Milan", "Essen"],
Essen: ["London", "Paris", "Milan", "StPetersburg"],
Milan: ["Essen", "Paris", "Istanbul"],
StPetersburg: ["Essen", "Istanbul", "Moscow"],
LosAngeles: ["Sydney", "SanFrancisco", "Chicago", "MexicoCity"],
MexicoCity: ["LosAngeles", "Chicago", "Miami", "Bogota", "Lima"],
Miami: ["Atlanta", "Washington", "MexicoCity", "Bogota"],
Bogota: ["MexicoCity", "Miami", "SaoPaulo", "BuenosAires", "Lima"],
Lima: ["MexicoCity", "Bogota", "Santiago"],
Santiago: ["Lima"],
BuenosAires: ["Bogota", "SaoPaulo"],
SaoPaulo: ["Bogota", "BuenosAires", "Madrid", "Lagos"],
Lagos: ["SaoPaulo", "Khartoum", "Kinshasa"],
Kinshasa: ["Lagos", "Khartoum", "Johannesburg"],
Johannesburg: ["Kinshasa", "Khartoum"],
Khartoum: ["Lagos", "Kinshasa", "Johannesburg", "Cairo"],
Moscow: ["StPetersburg", "Istanbul", "Tehran"],
Istanbul: ["StPetersburg", "Moscow", "Milan", "Algiers", "Cairo", "Baghdad"],
Algiers: ["Madrid", "Paris", "Istanbul", "Cairo"],
Cairo: ["Algiers", "Istanbul", "Khartoum", "Baghdad", "Riyadh"],
Baghdad: ["Istanbul", "Cairo", "Riyadh", "Karachi", "Tehran"],
Riyadh: ["Cairo", "Baghdad", "Karachi"],
Tehran: ["Moscow", "Baghdad", "Karachi", "Delhi"],
Karachi: ["Tehran", "Baghdad", "Riyadh", "Mumbai", "Delhi"],
Delhi: ["Tehran", "Karachi", "Mumbai", "Chennai", "Kolkata"],
Mumbai: ["Karachi", "Delhi", "Chennai"],
Kolkata: ["Delhi", "Chennai", "Bangkok", "HongKong"],
Chennai: ["Mumbai", "Delhi", "Kolkata", "Bangkok", "Jakarta"],
Beijing: ["Seoul", "Shanghai"],
Seoul: ["Beijing", "Shanghai", "Tokyo"],
Tokyo: ["Seoul", "Shanghai", "SanFrancisco", "Osaka"],
Shanghai: ["Beijing", "Seoul", "Tokyo", "Taipei", "HongKong"],
HongKong: ["Kolkata", "Bangkok", "HoChiMinhCity", "Manila", "Taipei", "Shanghai"],
Taipei: ["Shanghai", "HongKong", "Manila", "Osaka"],
Osaka: ["Tokyo", "Taipei"],
Bangkok: ["Kolkata", "Chennai", "Jakarta", "HoChiMinhCity", "HongKong"],
Jakarta: ["Chennai", "Bangkok", "HoChiMinhCity", "Sydney"],
HoChiMinhCity: ["Jakarta", "Bangkok", "HongKong", "Manila"],
Manila: ["HoChiMinhCity", "HongKong", "Taipei", "SanFrancisco", "Sydney"],
Sydney: ["Jakarta", "Manila", "LosAngeles"],
};

export const FALLOFROME_CONNECTIONS: Record<keyof typeof FALLOFROME_CITIES_DATA, (keyof typeof FALLOFROME_CITIES_DATA)[]> = {
Chersonesus: ["Tyras", "Sinope"],
Sinope: ["Chersonesus", "Constantinopolis"],
Tyras: ["Chersonesus", "Constantinopolis", "Philippopolis"],
Constantinopolis: ["Sinope", "Athenae", "Philippopolis", "Tyras"],
Philippopolis: ["Tyras", "Constantinopolis", "Patrae", "Narona"],
Athenae: ["Constantinopolis", "Syracusae", "Patrae"],
Patrae: ["Philippopolis", "Athenae", "Brundisium", "Narona"],
Narona: ["Philippopolis", "Patrae", "Aquileia"],
Brundisium: ["Patrae", "Syracusae", "Roma"],
Syracusae: ["Athenae", "Carthago", "Brundisium"],
Carnuntum: ["Iuvavum", "Aquileia"],
Aquileia: ["Carnuntum", "Narona", "Roma", "Ravenna"],
Iuvavum: ["Carnuntum", "Mediolanum"],
Ravenna: ["Aquileia", "Roma", "Genua", "Mediolanum"],
Roma: ["Aquileia", "Brundisium", "Carthago", "Genua", "Ravenna"],
Carthago: ["Syracusae", "Cesarea", "Roma"],
Gesoriacum: ["Mogontiacum", "Lutetia", "Londinium"],
Mogontiacum: ["Mediolanum", "Lugdunum", "Lutetia", "Gesoriacum"],
Mediolanum: ["Iuvavum", "Ravenna", "Genua", "Lugdunum", "Mogontiacum"],
Genua: ["Mediolanum", "Ravenna", "Roma", "Narbo"],
Eburacum: ["Londinium"],
Londinium: ["Eburacum", "Gesoriacum", "Lutetia"],
Lutetia: ["Londinium", "Gesoriacum", "Mogontiacum", "Lugdunum", "Burdigala"],
Lugdunum: ["Mogontiacum", "Mediolanum", "Narbo", "Burdigala", "Lutetia"],
Narbo: ["Lugdunum", "Genua", "NovaCarthago", "Caesaraugusta", "Burdigala"],
NovaCarthago: ["Narbo", "Cesarea", "Corduba", "Caesaraugusta"],
Cesarea: ["Carthago", "NovaCarthago", "Tingi"],
Burdigala: ["Lutetia", "Lugdunum", "Narbo", "Caesaraugusta"],
Caesaraugusta: ["Burdigala", "Narbo", "NovaCarthago", "Corduba"],
Corduba: ["Caesaraugusta", "NovaCarthago", "Tingi"],
Tingi: ["Cesarea", "Corduba"],
};

export const IBERIA_CONNECTIONS: Record<keyof typeof IBERIA_CITIES_DATA, (keyof typeof IBERIA_CITIES_DATA)[]> = {
ACoruña: ["SangiagoDeCompostela", "Gijón"],
SangiagoDeCompostela: ["ACoruña", "Vigo", "Ourense"],
Ourense: ["SangiagoDeCompostela", "Vigo", "León"],
Vigo: ["SangiagoDeCompostela", "Ourense", "Braga", "Porto"],
Braga: ["Vigo", "Porto", "Salamanca"],
Porto: ["Vigo", "Braga", "Coimbra", "Lisboa"],
Salamanca: ["Braga", "León", "Valladolid", "Madrid", "Cáceres"],
Coimbra: ["Porto", "Lisboa", "Cáceres"],
Cáceres: ["Coimbra", "Salamanca", "Toledo", "Badajoz"],
Lisboa: ["Porto", "Coimbra", "Évora", "Albufeira"],
Évora: ["Lisboa", "Badajoz", "Huelva"],
Albufeira: ["Lisboa", "Huelva"],
AndorraLaVella: ["Huesca", "Girona"],
Girona: ["AndorraLaVella", "Barcelona"],
Zaragoza: ["Soria", "VitoriaGasteiz", "Huesca", "Barcelona", "Teruel", "Madrid"],
Barcelona: ["Girona", "Zaragoza", "Tarragona", "PalmaDeMallorca"],
Tarragona: ["Barcelona", "Teruel", "Valencia"],
Teruel: ["Zaragoza", "Tarragona", "Cuenca"],
Cuenca: ["Madrid", "Teruel", "Valencia", "Albacete"],
PalmaDeMallorca: ["Barcelona", "Valencia"],
Valencia: ["Tarragona", "PalmaDeMallorca", "Alicante", "PalmaDeMallorca", "Albacete"],
Albacete: ["CiudadReal", "Cuenca", "Valencia", "Cartagena", "Jaén"],
Alicante: ["Valencia", "Cartagena"],
Cartagena: ["Alicante", "Albacete", "Almería"],
Toledo: ["Madrid", "CiudadReal", "Cáceres"],
CiudadReal: ["Toledo", "Madrid", "Albacete", "Córdoba"],
Badajoz: ["Cáceres", "CiudadReal", "Córdoba", "Évora"],
Jaén: ["Albacete", "Granada", "Córdoba"],
Córdoba: ["Badajoz", "CiudadReal", "Jaén", "Málaga", "Sevilla"],
Granada: ["Jaén", "Almería", "Málaga"],
Sevilla: ["Córdoba", "Málaga", "Cádiz", "Huelva"],
Huelva: ["Albufeira", "Évora", "Sevilla"],
Almería: ["Málaga", "Granada", "Cartagena"],
Málaga: ["Gibraltar", "Sevilla", "Córdoba", "Granada", "Almería"],
Cádiz: ["Sevilla", "Gibraltar"],
Gibraltar: ["Cádiz", "Málaga"],
SanSebastiánDonostia: ["BilbaoBilbo", "Pamplona"],
Gijón: ["ACoruña", "León", "Santander"],
Santander: ["Gijón", "Valladolid", "BilbaoBilbo"],
BilbaoBilbo: ["Santander", "VitoriaGasteiz", "SanSebastiánDonostia"],
Pamplona: ["SanSebastiánDonostia", "Huesca", "VitoriaGasteiz"],
VitoriaGasteiz: ["Burgos", "BilbaoBilbo", "Pamplona", "Zaragoza"],
León: ["Gijón", "Ourense", "Salamanca"],
Burgos: ["Valladolid", "VitoriaGasteiz", "Soria"],
Huesca: ["Pamplona", "AndorraLaVella", "Zaragoza"],
Valladolid: ["Santander", "Burgos", "Madrid", "Salamanca"],
Soria: ["Burgos", "Zaragoza"],
Madrid: ["Salamanca", "Valladolid", "Zaragoza", "Cuenca", "CiudadReal", "Toledo"],
};

export interface MigrationPath {
tribe: DiseaseColor;
path: (CityName | keyof typeof FALLOFROME_BARBARIAN_SUPPLY_DATA)[];
}

// Updated to start from supply points for correct arrow directionality
export const FALLOFROME_MIGRATION_PATHS: MigrationPath[] = [
// Ostrogoths (Blue)
{ tribe: DiseaseColor.Blue, path: ['Ostrogoths', 'Chersonesus', 'Sinope', 'Constantinopolis'] },
{ tribe: DiseaseColor.Blue, path: ['Ostrogoths', 'Carnuntum', 'Aquileia', 'Roma'] },
// Visigoths (White)
{ tribe: DiseaseColor.White, path: ['Visigoths', 'Tyras', 'Constantinopolis', 'Athenae', 'Patrae'] },
{ tribe: DiseaseColor.White, path: ['Visigoths', 'Philippopolis', 'Narona', 'Aquileia', 'Ravenna', 'Genua', 'Narbo', 'NovaCarthago', 'Corduba'] },
{ tribe: DiseaseColor.White, path: ['Visigoths', 'Philippopolis', 'Narona', 'Aquileia', 'Ravenna', 'Roma'] },
// Huns (Green)
{ tribe: DiseaseColor.Green, path: ['Huns', 'Philippopolis', 'Patrae', 'Brundisium', 'Roma'] },
{ tribe: DiseaseColor.Green, path: ['Huns', 'Carnuntum', 'Iuvavum', 'Mediolanum', 'Lugdunum', 'Lutetia'] },
// Vandals (Black)
{ tribe: DiseaseColor.Black, path: ['Vandals', 'Mogontiacum', 'Lugdunum', 'Burdigala', 'Caesaraugusta', 'Corduba', 'Tingi', 'Cesarea', 'Carthago', 'Syracusae', 'Athenae', 'Constantinopolis'] },
{ tribe: DiseaseColor.Black, path: ['Vandals', 'Mogontiacum', 'Lugdunum', 'Burdigala', 'Caesaraugusta', 'Corduba', 'Tingi', 'Cesarea', 'Carthago', 'Roma'] },
// Anglo-Saxons & Franks (Orange)
{ tribe: DiseaseColor.Orange, path: ['Anglo-Saxons & Franks', 'Mogontiacum', 'Lutetia', 'Burdigala', 'Narbo', 'Genua', 'Roma'] },
{ tribe: DiseaseColor.Orange, path: ['Anglo-Saxons & Franks', 'Gesoriacum', 'Londinium', 'Eburacum'] },
];

export const CONNECTIONS: Record<CityName, CityName[]> = { ...PANDEMIC_CONNECTIONS, ...FALLOFROME_CONNECTIONS, ...IBERIA_CONNECTIONS };

export const FALLOFROME_PORT_CITIES: Set<CityName> = new Set([
'Chersonesus', 'Sinope', 'Tyras', 'Constantinopolis', 'Athenae', 'Patrae', 
'Narona', 'Brundisium', 'Aquileia', 'Syracusae', 'Ravenna', 'Roma', 'Carthago', 
'Gesoriacum', 'Genua', 'Narbo', 'NovaCarthago', 'Cesarea', 'Londinium', 
'Burdigala', 'Tingi'
]);

export const IBERIA_PORT_CITIES: Set<CityName> = new Set([
    'ACoruña', 'Vigo', 'Porto', 'Lisboa', 'Albufeira', 'Gijón', 
    'Santander', 'SanSebastiánDonostia', 'Huelva', 'Cádiz', 'Gibraltar', 
    'Málaga', 'Almería', 'Cartagena', 'Valencia', 'PalmaDeMallorca', 
    'Tarragona', 'Barcelona'
]);

export const IBERIA_SEA_CONNECTIONS: ReadonlyArray<Readonly<[CityName, CityName]>> = [
    ['Gibraltar', 'Cádiz'],
    ['Gibraltar', 'Málaga'],
    ['PalmaDeMallorca', 'Valencia'],
    ['PalmaDeMallorca', 'Barcelona'],
    ['AndorraLaVella', 'Girona'],
    ['AndorraLaVella', 'Huesca'],
];

export interface IberiaRegion {
  name: string;
  vertices: CityName[];
  center: { x: number; y: number };
}

export const IBERIA_REGIONS: IberiaRegion[] = [
  { name: "R1", vertices: ["ACoruña", "Gijón", "León", "Ourense", "SangiagoDeCompostela"], center: { x: 20.8, y: 22.5 } },
  { name: "R2", vertices: ["SangiagoDeCompostela", "Ourense", "Vigo"], center: { x: 14.7, y: 27.3 } },
  { name: "R3", vertices: ["Vigo", "Ourense", "León", "Salamanca", "Braga"], center: { x: 22.5, y: 30.0 } },
  { name: "R4", vertices: ["Vigo", "Braga", "Porto"], center: { x: 13.8, y: 36.1 } },
  { name: "R5", vertices: ["Porto", "Braga", "Salamanca", "Cáceres", "Coimbra"], center: { x: 20.0, y: 46.1 } },
  { name: "R6", vertices: ["Porto", "Coimbra", "Lisboa"], center: { x: 12.7, y: 52.6 } },
  { name: "R7", vertices: ["Coimbra", "Cáceres", "Badajoz", "Évora", "Lisboa"], center: { x: 17.7, y: 63.7 } },
  { name: "R8", vertices: ["Lisboa", "Évora", "Huelva", "Albufeira"], center: { x: 15.1, y: 73.8 } },
  { name: "R9", vertices: ["Gijón", "Santander", "Valladolid", "Salamanca", "León"], center: { x: 31.9, y: 26.4 } },
  { name: "R10", vertices: ["Santander", "BilbaoBilbo", "VitoriaGasteiz", "Burgos", "Valladolid"], center: { x: 40.4, y: 27.2 } },
  { name: "R11", vertices: ["BilbaoBilbo", "SanSebastiánDonostia", "Pamplona", "VitoriaGasteiz"], center: { x: 47.7, y: 22.2 } },
  { name: "R12", vertices: ["Salamanca", "Valladolid", "Madrid"], center: { x: 34.0, y: 42.9 } },
  { name: "R13", vertices: ["Valladolid", "Burgos", "Soria", "Zaragoza", "Madrid"], center: { x: 44.5, y: 39.4 } },
  { name: "R14", vertices: ["Burgos", "VitoriaGasteiz", "Zaragoza", "Soria"], center: { x: 46.4, y: 33.5 } },
  { name: "R15", vertices: ["VitoriaGasteiz", "Pamplona", "Huesca", "Zaragoza"], center: { x: 52.6, y: 29.6 } },
  { name: "R16", vertices: ["Madrid", "Zaragoza", "Teruel", "Cuenca"], center: { x: 49.3, y: 46.9 } },
  { name: "R17", vertices: ["Cáceres", "Salamanca", "Madrid", "Toledo"], center: { x: 31.6, y: 48.4 } },
  { name: "R18", vertices: ["Cáceres", "Toledo", "CiudadReal", "Badajoz"], center: { x: 29.5, y: 59.6 } },
  { name: "R19", vertices: ["Toledo", "Madrid", "CiudadReal"], center: { x: 37.1, y: 55.0 } },
  { name: "R20", vertices: ["Madrid", "Cuenca", "Albacete", "CiudadReal"], center: { x: 44.0, y: 56.8 } },
  { name: "R21", vertices: ["Évora", "Badajoz", "Córdoba", "Sevilla", "Huelva"], center: { x: 23.9, y: 74.7 } },
  { name: "R22", vertices: ["Badajoz", "CiudadReal", "Córdoba"], center: { x: 31.1, y: 66.8 } },
  { name: "R23", vertices: ["CiudadReal", "Albacete", "Jaén", "Córdoba"], center: { x: 40.4, y: 66.9 } },
  { name: "R24", vertices: ["Jaén", "Albacete", "Cartagena", "Almería", "Granada"], center: { x: 46.5, y: 76.7 } },
  { name: "R25", vertices: ["Cádiz", "Sevilla", "Málaga", "Gibraltar"], center: { x: 29.3, y: 85.5 } },
  { name: "R26", vertices: ["Sevilla", "Córdoba", "Málaga"], center: { x: 31.8, y: 79.2 } },
  { name: "R27", vertices: ["Córdoba", "Jaén", "Granada", "Málaga"], center: { x: 37.6, y: 77.9 } },
  { name: "R28", vertices: ["Málaga", "Granada", "Almería"], center: { x: 41.1, y: 82.5 } },
  { name: "R29", vertices: ["Huesca", "AndorraLaVella", "Girona", "Barcelona", "Zaragoza"], center: { x: 66.1, y: 33.0 } },
  { name: "R30", vertices: ["Zaragoza", "Barcelona", "Tarragona", "Teruel"], center: { x: 61.5, y: 42.8 } },
  { name: "R31", vertices: ["Cuenca", "Teruel", "Tarragona", "Valencia"], center: { x: 55.9, y: 50.9 } },
  { name: "R32", vertices: ["Tarragona", "Barcelona", "PalmaDeMallorca", "Valencia"], center: { x: 66.7, y: 49.2 } },
  { name: "R33", vertices: ["Cuenca", "Valencia", "Albacete"], center: { x: 51.9, y: 57.9 } },
  { name: "R34", vertices: ["Albacete", "Valencia", "Alicante", "Cartagena"], center: { x: 54.9, y: 66.8 } },
];

export const IBERIA_CITY_TO_REGIONS_MAP: Record<CityName, string[]> = {
  ACoruña: ["R1"],
  Gijón: ["R1", "R9"],
  León: ["R1", "R9"],
  Ourense: ["R1", "R2", "R3"],
  SangiagoDeCompostela: ["R1", "R2"],
  Vigo: ["R2", "R3", "R4"],
  Braga: ["R3", "R4", "R5"],
  Porto: ["R4", "R5", "R6"],
  Salamanca: ["R3", "R5", "R9", "R12", "R17"],
  Cáceres: ["R5", "R7", "R17", "R18"],
  Coimbra: ["R5", "R6", "R7"],
  Lisboa: ["R6", "R7", "R8"],
  Évora: ["R7", "R8", "R21"],
  Huelva: ["R8", "R21"],
  Albufeira: ["R8"],
  Santander: ["R9", "R10"],
  Valladolid: ["R9", "R10", "R12", "R13"],
  BilbaoBilbo: ["R10", "R11"],
  VitoriaGasteiz: ["R10", "R11", "R14", "R15"],
  Burgos: ["R10", "R13", "R14"],
  SanSebastiánDonostia: ["R11"],
  Pamplona: ["R11", "R15"],
  Madrid: ["R12", "R13", "R16", "R17", "R19", "R20"],
  Soria: ["R13", "R14"],
  Zaragoza: ["R13", "R14", "R15", "R16", "R29", "R30"],
  Huesca: ["R15", "R29"],
  Teruel: ["R16", "R30", "R31"],
  Cuenca: ["R16", "R20", "R31", "R33"],
  Toledo: ["R17", "R18", "R19"],
  Badajoz: ["R7", "R18", "R21", "R22"],
  CiudadReal: ["R18", "R19", "R20", "R22", "R23"],
  Córdoba: ["R21", "R22", "R23", "R26", "R27"],
  Sevilla: ["R21", "R25", "R26"],
  Albacete: ["R20", "R23", "R24", "R33", "R34"],
  Jaén: ["R23", "R24", "R27"],
  Cartagena: ["R24", "R34"],
  Almería: ["R24", "R28"],
  Granada: ["R24", "R27", "R28"],
  Cádiz: ["R25"],
  Málaga: ["R25", "R26", "R27", "R28"],
  Gibraltar: ["R25"],
  AndorraLaVella: ["R29"],
  Girona: ["R29"],
  Barcelona: ["R29", "R30", "R32"],
  Tarragona: ["R30", "R31", "R32"],
  Valencia: ["R31", "R32", "R33", "R34"],
  PalmaDeMallorca: ["R32"],
  Alicante: ["R34"],
} as const;

export enum PlayerRole {
Scientist = "Scientist",
Medic = "Medic",
Researcher = "Researcher",
OperationsExpert = "Operations Expert",
QuarantineSpecialist = "Quarantine Specialist",
ContingencyPlanner = "Contingency Planner",
Dispatcher = "Dispatcher",
Generalist = "Generalist",
Archivist = "Archivist",
ContainmentSpecialist = "Containment Specialist",
Epidemiologist = "Epidemiologist",
FieldOperative = "Field Operative",
Troubleshooter = "Troubleshooter",
Pilot = "Pilot",
FieldDirector = "Field Director",
LocalLiaison = "Local Liaison",
Virologist = "Virologist",
Consul = "Consul",
MagisterMilitum = "Magister Militum",
Mercator = "Mercator",
PraefectusClassis = "Praefectus Classis",
PraefectusFabrum = "Praefectus Fabrum",
ReginaFoederata = "Regina Foederata",
Vestalis = "Vestalis",
Agronomist = "Agronomist",
Politician = "Politician",
Nurse = "Nurse",
Railwayman = "Railwayman",
RoyalAcademyScientist = "Royal Academy Scientist",
RuralDoctor = "Rural Doctor",
Sailor = "Sailor",
}

export const PLAYER_ROLE_INFO: Record<PlayerRole, string> = {
[PlayerRole.ContingencyPlanner]: "The Contingency Planner may, as an action, take an Event card from anywhere in the Player Discard Pile and place it on his Role card. Only 1 Event card can be on his role card at a time. It does not count against his hand limit. When the Contingency Planner plays the Event card on his role card, remove this Event card from the game (instead of discarding it).",
[PlayerRole.Dispatcher]: "The Dispatcher may, as an action, either: • move any pawn, if its owner agrees, to any city containing another pawn, or • move another player’s pawn, if its owner agrees, as if it were his own. When moving a player’s pawn as if it were your own, discard cards for Direct and Charter Flights from your hand. A card discarded for a Charter Flight must match the city the pawn is moving from. The Dispatcher can only move other players’ pawns; he may not direct them to do other actions, such as Treat Disease.",
[PlayerRole.Medic]: "The Medic removes all cubes, not 1, of the same color when doing the Treat Disease action. If a disease has been cured, he automatically removes all cubes of that color from a city, simply by entering it or being there. This does not take an action. The Medic’s automatic removal of cubes can occur on other players’ turns, if he is moved by the Dispatcher or the Airlift Event. The Medic also prevents placing disease cubes (and outbreaks) of cured diseases in his location.",
[PlayerRole.OperationsExpert]: "The Operations Expert may, as an action, either: • build a research station in his current city without discarding (or using) a City card, or • once per turn, move from a research station to any city by discarding any City card. The Dispatcher may not use the Operations Expert’s special move ability when moving the Operation Expert’s pawn.",
[PlayerRole.QuarantineSpecialist]: "The Quarantine Specialist prevents both outbreaks and the placement of disease cubes in the city she is in and all cities connected to that city. She does not affect cubes placed during setup.",
[PlayerRole.Researcher]: "When doing the Share Knowledge action, the Researcher may give any City card from her hand to another player in the same city as her, without this card having to match her city. The transfer must be from her hand to the other player’s hand, but it can occur on either player’s turn.",
[PlayerRole.Scientist]: "The Scientist needs only 4 (not 5) City cards of the same disease color to Discover a Cure for that disease.",
[PlayerRole.Generalist]: "The Generalist may do up to 5 actions each turn.",
[PlayerRole.Archivist]: "The Archivist’s hand limit is 8 cards. He may, once per turn, as an action, draw the City card that matches the city he is in from the Player Discard Pile into his hand. Players may not freely discard cards (for the Archivist to retrieve); they may discard only by doing an action requiring a discard or when over their hand limits.",
[PlayerRole.ContainmentSpecialist]: "When the Containment Specialist enters a city, if 2 or more disease cubes of the same color are present, he removes 1 of them. He does this when moved by others (the Dispatcher or the Events Airlift and Special Orders). If several diseases with 2 or more cubes are present, he removes 1 cube from each of these diseases.",
[PlayerRole.Epidemiologist]: "The Epidemiologist, once per turn and on her turn (only), may take any City card from a player in the same city. The other player must agree. Doing this is not an action.",
[PlayerRole.FieldOperative]: "The Field Operative may, once per turn as an action, move 1 disease cube from the city he is in and place it as a sample on his role card. When he Discovers a Cure, he may replace exactly 2 of the needed City cards by returning 3 cubes of the cure color from his Role card to the supply. The Field Operative may return sample cubes from his role card back to the supply at any time (at any time in which an Event Card can be used, not only on his turn).",
[PlayerRole.Troubleshooter]: "At the start of her turn, the Troubleshooter may look at a number of cards from the top of the Infection Deck equal to the current infection rate and return them in the same order. When taking a Direct Flight action, she may reveal the corresponding City card from her hand instead of discarding it.",
[PlayerRole.Pilot]: "The Pilot may not do any (of the regular) movement actions, nor build research stations. He may, as an action, fly to any city within 3 connections, skipping cities in between. He may take along 1 other pawn as a passenger (that must be in the same city he is in). Passenger abilities that occur when a city is entered, such as the Containment Specialist ability, affect only the city moved to, not cities in between. When the Pilot is moved by the Dispatcher or the event Special Orders, he may not fly and instead uses the normal movement actions.",
[PlayerRole.FieldDirector]: "The Field Director can treat disease in a city connected to their current city as a standard action. Once per turn, as a free bonus action, they may move another player's pawn (but not the Pilot) from their city or a connected city to an adjacent city (Drive/Ferry).",
[PlayerRole.LocalLiaison]: "May give a city card that matches the color of the city she is in to a player in any city of the same color. Doing so is an action, which she may do once a turn and only on her turn.",
[PlayerRole.Virologist]: "May discard 2 City Cards of the same color to replace 1 City Card of the cure color when she discovers a cure. She may discard several pairs of city cards to discover a cure. May discard 1 City Card, as an action, to remove one cube of its color from any city, returning it to the supply.",
[PlayerRole.Consul]: "As an action, add 1 Legion to any city with a fort. As an action, add 1 Legion to your city. Battle special effect: add 1 Legion to your city.",
[PlayerRole.MagisterMilitum]: "When you do the Battle action, reduce the number of legions you lose by 1 (for the entire roll, not per die). Special Battle Effect: Remove 2 barbarians from your city.",
[PlayerRole.Mercator]: "Once during your turn, as an action, give or take a card of a color matching your city to another player in your city. You do not have to be in a city with a matching barbarian to do the Forge Alliance action. Special Battle effect: Remove 1 barbarian and 1 legion from your city.",
[PlayerRole.PraefectusClassis]: "As an action, move from a port to any other port (do the Sail action without discarding a card). You may take up to 3 legions with you. If you are in a port, as an action, discard a City card matching a color of your city to add up to 2 legions to your city. Battle special effect: If in a port, remove 1 barbarian from your city (Otherwise, nothing happens).",
[PlayerRole.PraefectusFabrum]: "As an action, remove 2 legions from your city to add a fort to it. As an action, discard a City card to either move from a city with a fort to any city or move from any city to a city with a fort (you may take up to 3 legions with you). Battle special effect: If in a city with a fort, remove 2 barbarians from your city (otherwise, no effect).",
[PlayerRole.ReginaFoederata]: "1. When you do the March or Sail action, you may take up to 3 barbarians and/or legions with you (a maximum of 3, in any combination). Note: you cannot cause a city to have more than 3 barbarians of a single color. Moving barbarians this way does not trigger city defense.\n2. Once per turn, you may do the Enlist Barbarians action without spending a card. Note: You must still have an alliance with that tribe in order to do this.\n\nBattle special effect: remove 1 barbarian and add 1 legion to your city.",
[PlayerRole.Vestalis]: "Setup: Stack all unused Event cards facedown to form an Event deck.\n\n1. At any time, discard a City card matching a color of your city to draw 1 card from your Event deck.\n2. During the Draw 2 Player Cards step, you may draw 3 Player cards; put 1 of them back on top of the deck.\n\nBattle special effect: Remove 1 legion from your city",
[PlayerRole.Agronomist]: "As an action, place 1 purification token in a region adjacent to your city (from the supply). When you Purify Water, place 1 additional purification token in the region (3 total).",
[PlayerRole.Politician]: "As an action, give a City card to another player in any City (you must be in the city matching the card). As an action, swap a City card in your hand with a City card in the discard pile (you must be in a city matching one of the swapped cards).",
[PlayerRole.Nurse]: "Your prevention token always travels with you. Whenever your pawn moves, immediately put your prevention token into a region adjacent to your pawn. Cities adjacent to your prevention token cannot be infected.",
[PlayerRole.Railwayman]: "Once per turn, when you do the Build Railroad action, you may place two consecutive railroad tokens starting from your current city. When you do the Move by Train action, you may take 1 pawn in your city with you.",
[PlayerRole.RoyalAcademyScientist]: "When you do the Purify Water action, you may play any City card, regardless of color. As an action, you may look at the top 3 cards of the Player Deck and rearrange them as you like.",
[PlayerRole.RuralDoctor]: "When you do the Treat Disease action, remove one cube from your city, and one additional cube from your city or from a different city in an adjacent region (if one exists).",
[PlayerRole.Sailor]: "When you Move by Ship, do not spend a card. When you Move by Ship you may take one passenger (a pawn in your city) with you.",
};


export enum EventCardName {
Airlift = "Airlift",
BorrowedTime = "Borrowed Time",
Forecast = "Forecast",
GovernmentGrant = "Government Grant",
MobileHospital = "Mobile Hospital",
NewAssignment = "New Assignment",
OneQuietNight = "One Quiet Night",
RapidVaccineDeployment = "Rapid Vaccine Deployment",
ResilientPopulation = "Resilient Population",
SpecialOrders = "SpecialOrders",
RemoteTreatment = "Remote Treatment",
ReExaminedResearch = "Re-examined Research",
CommercialTravelBan = "Commercial Travel Ban",
InfectionZoneBan = "Infection Zone Ban",
ImprovedSanitation = "Improved Sanitation",
SequencingBreakthrough = "Sequencing Breakthrough",
DoUtDes = "Do Ut Des",
VaeVictis = "Vae Victis",
SiVisPacemParaBellum = "Si Vis Pacem, Para Bellum",
HicManebimusOptime = "Hic Manebimus Optime",
AudentesFortunaIuvat = "Audentes Fortuna Iuvat",
MorsTuaVitaMea = "Mors Tua, Vita Mea",
HomoFaberFortunaeSuae = "Homo Faber Fortunae Suae",
AleaIactaEst = "Alea Iacta Est",
AbundansCautelaNonNocet = "Abundans Cautela Non Nocet",
MeliusCavereQuamPavere = "Melius Cavere Quam Pavere",
MortuiNonMordent = "Mortui Non Mordent",
FestinaLente = "Festina Lente",
VeniVidiVici = "Veni, Vidi, Vici",
CarpeDiem = "Carpe Diem",
GoodSeasons = "Good Seasons",
GovernmentMobilization = "Government Mobilization",
HospitalFounding = "Hospital Founding",
MailCorrespondence = "Mail Correspondence",
NewRails = "New Rails",
OneMoreDay = "One More Day", 
OverseasMigration = "Overseas Migration",
PurifyWater = "Purify Water",
RingRailroads = "Ring Railroads",
ScienceTriumph = "Science Triumph",
SecondChance = "Second Chance",
ShipsArrive = "Ships Arrive",
TelegraphMessage = "Telegraph Message",
TravelDayAndNight = "Travel Day and Night",
WhenThePlansWereGood = "When the Plans Were Good",
}

export const EVENT_CARD_INFO: Record<EventCardName, string> = {
[EventCardName.Airlift]: "Move any 1 pawn to any city.",
[EventCardName.Forecast]: "Draw, look at, and rearrange the top 6 cards of the infection deck. Put them back on top.",
[EventCardName.GovernmentGrant]: "Add one research station to any city (no city card needed).",
[EventCardName.OneQuietNight]: "Skip the next Infect Cities step (do not flip over any infection cards).",
[EventCardName.ResilientPopulation]: "Remove any 1 card in the Infection Discard Pile from the game. You may play this between the Infect and Intensify steps of an epidemic.",
[EventCardName.BorrowedTime]: "The current player takes 2 extra actions this turn.",
[EventCardName.MobileHospital]: "This turn, remove 1 disease cube from each city the player drives/ferries to. The Containment Specialist first removes 1 cube of each color with 2 or more cubes present and then removes 1 more cube (for each city entered). If the city contains cubes of more than one color, the player can choose which color cube to remove.",
[EventCardName.NewAssignment]: "Select a player, this player may swap his role with any one of the unused roles. If the current player was selected and he swapped either from or to the Generalist role, then he may do up to 5 actions this turn.",
[EventCardName.RapidVaccineDeployment]: "Play immediately after a Discover a Cure action to remove 1-5 cubes of the cured disease from a group of connected cities. At least 1 cube must be removed from each city in the group.",
[EventCardName.SpecialOrders]: "This turn, the player may spend actions to move 1 pawn (with permission) as if it were his own. As when moving other pawns with the Dispatcher, the current player must discard (or reveal) any cards used to move that pawn by Direct or Charter flights. Powers that are part of movement (such as the Medic’s power to remove cured disease cubes or the Containment Specialist’s power) do occur.",
[EventCardName.RemoteTreatment]: "Remove any two cubes from the board. Play at any time during any turn before the infection phase of that turn begins.",
[EventCardName.ReExaminedResearch]: "The current player may draw any one city card from the Player Discard Pile and add it to his hand.",
[EventCardName.CommercialTravelBan]: "The infection rate becomes 1 until the start of the current player’s next turn.",
[EventCardName.InfectionZoneBan]: "Ignore all chain reaction outbreaks until the current player’s next turn. This card is played face up and discarded when the player's next turn begins.",
[EventCardName.ImprovedSanitation]: "When any player takes the Treat Disease action, they remove 1 more cube of the same color, if present. This lasts until the player who played this card's next turn begins.",
[EventCardName.SequencingBreakthrough]: "The next Discover a Cure action requires 1 fewer City Card. This card is played face up and discarded when the player's next turn begins or after the cure is discovered.",
[EventCardName.DoUtDes]: "Normal: Two players in the same city may swap a City Card from their hands.\nCorrupt: Two players, anywhere on the board, may swap a City Card from their hands.",
[EventCardName.VaeVictis]: "Normal: After removing barbarians from a battle, remove up to the same number of barbarians from 1 other city.\nCorrupt: Do the above but remove the amount of barbarians from any combination of cities.",
[EventCardName.SiVisPacemParaBellum]: "Normal: Place a Fort in any city.\nCorrupt: Do the above and move 1 pawn there. That player may take up to 3 Legions with him.",
[EventCardName.HicManebimusOptime]: "Normal: Choose up to 3 cities with Forts. Add up to 2 Legions to each of them.\nCorrupt: Add up to 3 Legions to every city with a Fort on the board.",
[EventCardName.AudentesFortunaIuvat]: "Normal: The current player may draw 2 additional player cards.\nCorrupt: The current player may draw 4 additional player cards.\n(Play after drawing cards during the Draw Player Cards step.)",
[EventCardName.MorsTuaVitaMea]: "Normal: Replace 1 barbarian with 1 legion.\nCorrupt: Replace up to 3 barbarians in 1 city with an equal number of legions.\n(Play at any time).",
[EventCardName.HomoFaberFortunaeSuae]: "Normal: The current player may draw a City Card matching their city from the Player Discard pile.\nCorrupt: The current player may draw any city card from the Player Discard Pile.\n(play at any time).",
[EventCardName.AleaIactaEst]: "Normal: During 1 battle this turn, set the dice to the results you want, instead of rolling them.\nCorrupt: Do the above for every battle this turn.\n(Play during the Do Actions step)",
[EventCardName.AbundansCautelaNonNocet]: "Normal: During the next Invade Cities step, draw 2 fewer cards.\nCorrupt: Skip the Invade Cities step this turn.\n(play at any time)",
[EventCardName.MeliusCavereQuamPavere]: "Normal: Draw, look at, and rearrange the top 6 cards of the Barbarian Deck. Then: put them back on top.\nCorrupt: Do the same but remove one of the 6 cards from the game, then put the rest back on top.\n(play at any time)",
[EventCardName.MortuiNonMordent]: "Normal: Remove up to 2 barbarians of the same color from anywhere on the board.\nCorrupt: Remove up to 4 barbarians of the same color from anywhere on the board.\n(play at any time)",
[EventCardName.FestinaLente]: "Normal: Choose a city, move 1 pawn to it.\nCorrupt: Do the above, but move any number of pawns there.\n(Each moving player - in both options - can take up to 3 Legions with them).",
[EventCardName.VeniVidiVici]: "Normal: Move the current player to any city (they may take up to 3 Legions with them). That player may do a free battle action there.\nCorrupt: Do the above, ignoring Legion losses from the battle.\n(Play during the Do Actions step)",
[EventCardName.CarpeDiem]: "Normal: The current player may do 2 more actions this turn.\nCorrupt: The current player may do 4 more actions this turn.\n(Play at any time)",
[EventCardName.GoodSeasons]: "During the next infection step, draw only 1 Infection card, and draw it from the bottom of the Infection Deck. (Play at anytime).",
[EventCardName.GovernmentMobilization]: "Each player may immediately move their pawn once for free, using the means of their choice: carriage, train, or ship. (Play at anytime).",
[EventCardName.HospitalFounding]: "Place or move a hospital of your choice into a city matching its color. (Play at anytime).",
[EventCardName.MailCorrespondence]: "Two players (anywhere on the board) can swap 1 card from their hands. (Play at any time).",
[EventCardName.NewRails]: "Add 2 railroad tokens anywhere on the board. (Not possible on dashed lines.) (Play at any time).",
[EventCardName.OneMoreDay]: "The current player may take 2 more actions this turn. (Play at any time)",
[EventCardName.OverseasMigration]: "Remove up to 2 cubes from the board. (Play at any time)",
[EventCardName.PurifyWater]: "Put up to 2 purification tokens onto the board, placed into one or two different regions. (Play at any time)",
[EventCardName.RingRailroads]: "Add 3 railroad tokens between port cities. (Not possible on dashed lines.) (Play at any time)",
[EventCardName.ScienceTriumph]: "Remove up to 1 cube from each city in one region. (Play at any time).",
[EventCardName.SecondChance]: "Take the City card matching your current city from the Player Discard pile. (Play at any time).",
[EventCardName.ShipsArrive]: "Select a port city. Move 1 or more player pawns there from anywhere on the board (with permission). (Play at any time).",
[EventCardName.TelegraphMessage]: "One player may give 1 or 2 City cards to one other player anywhere on the board. (Play at any time).",
[EventCardName.TravelDayAndNight]: "Move a pawn to any city on the board (with permission). (Play at any time).",
[EventCardName.WhenThePlansWereGood]: "Take 1 Event card from the Player Discard Pile and play it immediately. (Play at any time).",
};

export enum VirulentStrainEpidemicCardName {
SlipperySlope = "Slippery Slope",
ChronicEffect = "Chronic Effect",
GovernmentInterference = "Government Interference",
ComplexMolecularStructure = "Complex Molecular Structure",
UnacceptableLoss = "Unacceptable Loss",
RateEffect = "Rate Effect",
HighlyContagious = "Highly Contagious",
ResistantToTreatment = "Resistant to Treatment",
HiddenPocket = "Hidden Pocket",
UncountedPopulations = "Uncounted Populations",
}

export const VIRULENT_STRAIN_EPIDEMIC_INFO: Record<VirulentStrainEpidemicCardName, { name: string; description: string, continuing: boolean }> = {
[VirulentStrainEpidemicCardName.ChronicEffect]: { name: "Chronic Effect", description: "During infections, when a Virulent Strain city is drawn, place 2 Virulent Strain cubes if the city has no Virulent Strain cubes. Otherwise, place 1 cube normally.", continuing: true },
[VirulentStrainEpidemicCardName.ComplexMolecularStructure]: { name: "Complex Molecular Structure", description: "If the Virulent Strain has not been cured, you need one more Virulent Strain city card to discover a cure for it.", continuing: true },
[VirulentStrainEpidemicCardName.UnacceptableLoss]: { name: "Unacceptable Loss", description: "Before doing this card’s Intensify step, remove 4 Virulent Strain disease cubes from the supply to the box. If fewer than 4 of these cubes are in the supply, instead remove them all.", continuing: false },
[VirulentStrainEpidemicCardName.SlipperySlope]: { name: "Slippery Slope", description: "Move the outbreaks marker forward 2 spaces (not 1) when an outbreak of the Virulent Strain occurs.", continuing: true },
[VirulentStrainEpidemicCardName.UncountedPopulations]: { name: "Uncounted Populations", description: "Before doing this card’s Intensify step, place 1 Virulent Strain disease cube on each city with exactly 1 of these cubes.", continuing: false },
[VirulentStrainEpidemicCardName.RateEffect]: { name: "Rate Effect", description: "During infections, draw 1 more card than the infection rate if at least 1 Infection Card drawn was a Virulent Strain card (and the Virulent Strain is not eradicated).", continuing: true },
[VirulentStrainEpidemicCardName.HiddenPocket]: { name: "Hidden Pocket", description: "Before doing this card’s Intensify step, if the Virulent Strain is eradicated but at least 1 Virulent Strain card is in the Infection Discard Pile: flip its cure marker back to its non-eradicated side, and place 1 Virulent Strain cube on each city whose card is in this discard pile.", continuing: false },
[VirulentStrainEpidemicCardName.GovernmentInterference]: { name: "Government Interference", description: "To leave a city with Virulent Strain disease cubes, a player must first, on that turn, treat at least 1 Virulent Strain cube in that city.", continuing: true },
[VirulentStrainEpidemicCardName.HighlyContagious]: { name: "Highly Contagious", description: "Outbreaks (but not chain reactions) of the Virulent Strain add 2 cubes to each connected city. If a connected city already has 2 or more Virulent Strain cubes, it gets 3 cubes and causes a chain reaction outbreak.", continuing: true },
[VirulentStrainEpidemicCardName.ResistantToTreatment]: { name: "Resistant to Treatment", description: "Until the Virulent Strain is cured, removing its cubes with Treat Disease takes 2 actions in 1 turn.", continuing: true },
};

export enum MutationEventCardName {
MutationSpreads = "The Mutation Spreads",
MutationThreatens = "The Mutation Threatens!",
MutationIntensifies = "The Mutation Intensifies!",
}

export const MUTATION_EVENT_CARD_INFO: Record<MutationEventCardName, string> = {
[MutationEventCardName.MutationThreatens]: "If the purple disease is not eradicated, draw a card from the bottom of the Infection Deck. Place 3 purple disease cubes (only) on that city. (If that city already has at least 1 purple disease cube, fill it to 3 and an outbreak occurs in that city). Discard that card to the Infection Discard Pile.",
[MutationEventCardName.MutationSpreads]: "If the purple disease is not eradicated, draw 3 cards from the bottom of the Infection Deck. Place 1 purple disease cube (only) on each of these cities (If that would cause an Outbreak, continue the outbreak normally). Discard these cards to the Infection Discard Pile.",
[MutationEventCardName.MutationIntensifies]: "Place 1 purple disease cube on each city with exactly 2 purple cubes (ignore cubes of other colors).",
};

export const ALL_EVENT_CARDS = Object.values(EventCardName);

export const BASE_GAME_ROLES: PlayerRole[] = [
PlayerRole.ContingencyPlanner,
PlayerRole.Dispatcher,
PlayerRole.Medic,
PlayerRole.OperationsExpert,
PlayerRole.QuarantineSpecialist,
PlayerRole.Researcher,
PlayerRole.Scientist
];

export const FALLOFROME_ROLES: PlayerRole[] = [
PlayerRole.Consul,
PlayerRole.MagisterMilitum,
PlayerRole.Mercator,
PlayerRole.PraefectusClassis,
PlayerRole.PraefectusFabrum,
PlayerRole.ReginaFoederata,
PlayerRole.Vestalis,
];

export const ON_THE_BRINK_ROLES: PlayerRole[] = [
PlayerRole.Archivist,
PlayerRole.ContainmentSpecialist,
PlayerRole.Epidemiologist,
PlayerRole.FieldOperative,
PlayerRole.Generalist,
PlayerRole.Troubleshooter
];

export const IN_THE_LAB_ROLES: PlayerRole[] = [
PlayerRole.Pilot,
PlayerRole.FieldDirector,
PlayerRole.LocalLiaison,
PlayerRole.Virologist,
];

export const PANDEMIC_ROLES: PlayerRole[] = [
...BASE_GAME_ROLES,
...ON_THE_BRINK_ROLES,
...IN_THE_LAB_ROLES,
];

export const IBERIA_ROLES: PlayerRole[] = [
    PlayerRole.Agronomist,
    PlayerRole.Politician,
    PlayerRole.Nurse,
    PlayerRole.Railwayman,
    PlayerRole.RoyalAcademyScientist,
    PlayerRole.RuralDoctor,
    PlayerRole.Sailor,
];

export const BASE_GAME_EVENTS: EventCardName[] = [
EventCardName.GovernmentGrant,
EventCardName.Forecast,
EventCardName.Airlift,
EventCardName.ResilientPopulation,
EventCardName.OneQuietNight
];

export const ON_THE_BRINK_EVENTS: EventCardName[] = [
EventCardName.BorrowedTime,
EventCardName.MobileHospital,
EventCardName.NewAssignment,
EventCardName.RapidVaccineDeployment,
EventCardName.SpecialOrders,
EventCardName.RemoteTreatment,
EventCardName.ReExaminedResearch,
EventCardName.CommercialTravelBan
];

export const IN_THE_LAB_EVENTS: EventCardName[] = [
EventCardName.InfectionZoneBan,
EventCardName.ImprovedSanitation,
EventCardName.SequencingBreakthrough,
];

export const PANDEMIC_EVENTS: EventCardName[] = [
    ...BASE_GAME_EVENTS,
    ...ON_THE_BRINK_EVENTS,
    ...IN_THE_LAB_EVENTS,
];

export const FALLOFROME_EVENTS: EventCardName[] = [
    EventCardName.DoUtDes,
    EventCardName.VaeVictis,
    EventCardName.SiVisPacemParaBellum,
    EventCardName.HicManebimusOptime,
    EventCardName.AudentesFortunaIuvat,
    EventCardName.MorsTuaVitaMea,
    EventCardName.HomoFaberFortunaeSuae,
    EventCardName.AleaIactaEst,
    EventCardName.AbundansCautelaNonNocet,
    EventCardName.MeliusCavereQuamPavere,
    EventCardName.MortuiNonMordent,
    EventCardName.FestinaLente,
    EventCardName.VeniVidiVici,
    EventCardName.CarpeDiem,
];

export const IBERIA_EVENTS: EventCardName[] = [
    EventCardName.GoodSeasons,
    EventCardName.GovernmentMobilization,
    EventCardName.HospitalFounding,
    EventCardName.MailCorrespondence,
    EventCardName.NewRails,
    EventCardName.OneMoreDay,
    EventCardName.OverseasMigration,
    EventCardName.PurifyWater,
    EventCardName.RingRailroads,
    EventCardName.ScienceTriumph,
    EventCardName.SecondChance,
    EventCardName.ShipsArrive,
    EventCardName.TelegraphMessage,
    EventCardName.TravelDayAndNight,
    EventCardName.WhenThePlansWereGood,
];

export interface Player {
id: number;
name: string;
role: PlayerRole | null; // Can be null in lobby
location: CityName;
hand: PlayerCard[];
contingencyCard: EventCardName | null;
samples: { [key in DiseaseColor]?: number };
isOnline?: boolean; // For multiplayer lobby
}

export type PlayerCard = 
| { type: 'city'; name: CityName; color: DiseaseColor } 
| { type: 'epidemic' } 
| { type: 'event'; name: EventCardName }
| { type: 'virulent_strain_epidemic'; name: VirulentStrainEpidemicCardName }
| { type: 'mutation_event'; name: MutationEventCardName };

export type InfectionCard = 
| { type: 'city', name: CityName, color: DiseaseColor }
| { type: 'mutation' };

export enum GamePhase {
Setup,
ChoosingStartingCity,
PlayerAction,
PreDrawPlayerCards,
DrawingPlayerCards,
Discarding, // Player must discard cards to get to hand limit
PreInfectionPhase,
InfectionStep,
Epidemic,
EpidemicAnnounceInfect,
EpidemicIntensify,
PostEpidemicEventWindow,
GameOver,

// Event & Special Action Resolution Phases
PostCureAction, // Special phase after curing to allow playing RVD
ResolvingRapidVaccineDeployment,
ResolvingMobileHospital,
ResolvingRemoteTreatment,
ResolvingAirlift,
ConfirmingForecast,
ResolvingForecast,
ResolvingGovernmentGrant,
ResolvingNewAssignment,
ResolvingSpecialOrders,
ResolvingTroubleshooterPreview,
ResolvingReExaminedResearch,
ResolvingPilotFlight,
ResolvingFieldDirectorMove,
ResolvingFieldDirectorTreat,
ResolvingEpidemiologistTake,
ResolvingMutationEvent,
ResolvingStationRelocation,
ResolvingFortRelocation,
ConfirmingVestalisDraw,
ResolvingVestalisDraw,
ResolvingVestalisPlayerCardDraw,
ResolvingDoUtDes,
ResolvingVaeVictis,
ResolvingSiVisPacemParaBellum,
ResolvingHicManebimusOptime,
ResolvingAudentesFortunaIuvat,
ResolvingMorsTuaVitaMea,
ResolvingHomoFaberFortunaeSuae,
ResolvingAleaIactaEst,
ResolvingAbundansCautelaNonNocet,
ResolvingMeliusCavereQuamPavere,
ResolvingMortuiNonMordent,
ResolvingFestinaLente,
ResolvingVeniVidiVici,
ResolvingCarpeDiem,
ResolvingGovernmentMobilization, 
ResolvingHospitalFounding,
ResolvingMailCorrespondence,
ResolvingNewRails,
ResolvingRingRailroads,
ResolvingPurifyWaterEvent,
ResolvingScienceTriumph,
ResolvingScienceTriumphChoice,
ResolvingShipsArrive,
ResolvingTelegraphMessage,
ResolvingWhenThePlansWereGood,
ResolvingPurifyWater,
ResolvingPurificationChoice,
ResolvingAgronomistPurifyChoice,
ConfirmingRoyalAcademyScientistForecast,
ResolvingRoyalAcademyScientistForecast,
ResolvingRuralDoctorTreat,
NursePlacingPreventionToken,
}

export type GameStatus = 'lobby' | 'playing' | 'finished';

export interface InfectionResult {
city: CityName;
color: DiseaseColor;
defended: boolean;
defenseType: 'attack' | 'ambush' | null;
legionsRemoved: number;
cubesAdded: number;
outbreak: boolean;
purificationDefense?: { region: string };
nurseDefense?: { region: string };
}

export interface GameState {
// Multiplayer fields
gameId: string;
gameMode: 'solitaire' | 'multiplayer';
gameStatus: GameStatus; // New field for lobby/playing state
hostId: number; // ID of the player who created the game
setupConfig: GameSetupConfig;
gameType: 'pandemic' | 'fallOfRome' | 'iberia';

gamePhase: GamePhase;
phaseBeforeEvent: GamePhase | null;
gameOverReason: string | null;
players: Player[];
currentPlayerIndex: number;
firstPlayerIndex: number;
actionsRemaining: number;

researchStations: CityName[];

outbreakCounter: number;
infectionRateIndex: number; // index for INFECTION_RATES
recruitmentRateIndex: number;

diseaseCubes: { [key in CityName]?: { [key in DiseaseColor]?: number } };
remainingCubes: { [key in DiseaseColor]: number };

curedDiseases: { [key in DiseaseColor]: boolean };
eradicatedDiseases: { [key in DiseaseColor]: boolean };

playerDeck: PlayerCard[];
playerDiscard: PlayerCard[];
eventDeck: PlayerCard[];

infectionDeck: InfectionCard[];
infectionDiscard: InfectionCard[];

oneQuietNightActive: boolean;
goodSeasonsActive: boolean;

// State for hand limit discard flow
playerToDiscardId: number | null;
pendingEpidemicCard: PlayerCard | null;

// Role-specific state
hasUsedOperationsExpertFlight: boolean;
hasUsedArchivistRetrieve: boolean;
hasUsedEpidemiologistAbility: boolean;
hasUsedFieldOperativeCollect: boolean;
hasUsedTroubleshooterPreview: boolean;
hasUsedFieldDirectorMove: boolean;
hasUsedLocalLiaisonShare: boolean;
hasUsedMercatorShare: boolean;
hasUsedReginaFoederataFreeEnlist: boolean;
unusedRoles: PlayerRole[];

// Event Card State
extraActionsForNextTurn: number;
mobileHospitalActiveThisTurn: boolean;
cityForMobileHospital: CityName | null;
postCureColor: DiseaseColor | null; // For Rapid Vaccine Deployment
specialOrdersControlledPawnId: number | null;
epidemicCardToAnnounce: InfectionCard | null;
commercialTravelBanPlayerId: number | null;
pilotFlightDestination: CityName | null;
infectionZoneBanPlayerId: number | null;
improvedSanitationPlayerId: number | null;
sequencingBreakthroughPlayerId: number | null;
stationRelocationTargetCity: CityName | null;
stationRelocationTrigger: 'action' | 'event' | null;
pendingEventCardForModal: EventCardName | null;
pendingEvent: { cardName: EventCardName, ownerId: number, from: 'hand' | 'contingency' } | null;
pendingVestalisDraw: { drawnCard: PlayerCard & { type: 'event' }; validDiscards: (PlayerCard & { type: 'city'})[] } | null;
pendingVestalisPlayerCardDraw: PlayerCard[] | null;
pendingVaeVictisContext: { maxToRemove: number } | null;
aleaIactaEstStatus: 'inactive' | 'normal_available' | 'corrupt_active' | null;
abundansCautelaStatus: 'inactive' | 'normal_active' | 'corrupt_active';
veniVidiViciStatus: 'inactive' | 'corrupt_battle_pending';
pendingPurifyWaterEvent: { tokensRemaining: number } | null;
pendingRingRailroadsEvent: { tokensRemaining: number } | null; 
pendingGovernmentMobilization: { playersToMove: number[] } | null;
pendingScienceTriumphChoice: {
  regionName: string;
  citiesWithChoices: {
    city: CityName;
    colors: DiseaseColor[];
  }[];
  processedCities: { city: CityName; colorRemoved: DiseaseColor }[];
} | null;

// Fall of Rome specific state
forts: CityName[];
fortRelocationTargetCity: CityName | null;
legions: CityName[];

//Iberia specific state
purificationTokens: { [key: string]: number };
purificationTokenSupply: number;
railroads: { from: CityName; to: CityName }[];
hospitals: { // <-- Add this new property
        [DiseaseColor.Blue]: CityName | null;
        [DiseaseColor.Yellow]: CityName | null;
        [DiseaseColor.Black]: CityName | null;
        [DiseaseColor.Red]: CityName | null;
    };
phaseBeforePurificationChoice: GamePhase | null;
pendingPurificationChoice: {
  city: CityName;
  color: DiseaseColor;
  availableRegions: string[];
  // We need to carry over the state of the current outbreak chain
  outbreaksInTurnAsArray: CityName[]; 
  newlyOutbrokenCities: CityName[];
} | null;
pendingAgronomistPurifyChoice: {
  region: string;
  cardToDiscard: PlayerCard & { type: 'city' };
} | null;
pendingRuralDoctorChoice: {
  city: CityName;
  color: DiseaseColor;
}[] | null;
infectionContinuation: {
    type: 'epidemic' | 'outbreak';
    city: CityName; // The city that was being infected or that outbroke
    color: DiseaseColor;
    remaining: number; // remaining cubes for epidemic
    // For outbreaks
    outbreakRemainingNeighbors?: CityName[];
} | null;
nursePreventionTokenLocation: string | null;
hasUsedRailwaymanDoubleBuild: boolean;

// Challenge State
virulentStrainColor: DiseaseColor | null;
activeVirulentStrainCards: VirulentStrainEpidemicCardName[];
treatedVSCitiesThisTurn: CityName[];
pendingMutationEvents: MutationEventCardName[];
mutationEventResult: string | null;


log: string[];
lastEventMessage: string | null;

// New features state
actionHistory: GameState[];
useAiNarratives: boolean;
selectedCity: CityName | null;
lastInfectionResult: InfectionResult | null;
epidemicInfectionResults: InfectionResult[];
outbreakResults: InfectionResult[];
}

export const PANDEMIC_INFECTION_RATES = [2, 2, 2, 3, 3, 4, 4];
export const FALLOFROME_INVASION_RATES = [2, 2, 3, 3, 4, 4, 4, 5];
export const FALLOFROME_RECRUITMENT_RATES = [3, 3, 2, 2, 2, 1, 1, 1];

export interface GameSetupConfig {
gameType: 'pandemic' | 'fallOfRome' | 'iberia';
gameMode: 'solitaire' | 'multiplayer';
numPlayers: number;
roleSelection: 'random' | 'manual' | 'pool';
roles: PlayerRole[];
rolePool: PlayerRole[];
playerNames: string[];
numEpidemics: number;
numEvents: number;
eventSelection: 'random' | 'manual' | 'pool';
events: EventCardName[];
eventPool: EventCardName[];
firstPlayerRule: 'random' | 'highestPopulation' | 'player1' | 'farthestFromRoma';
useAiNarratives: boolean;
useVirulentStrainChallenge: boolean;
useMutationChallenge: boolean;
}

// App-level type definitions, moved here to break circular dependencies
export type ShareOption = {
type: 'give' | 'take';
card: PlayerCard & { type: 'city' };
fromPlayerId: number;
toPlayerId: number;
};

export type CureOptionForModal = {
color: DiseaseColor;
method: 'cards' | 'samples';
availableCards: (PlayerCard & { type: 'city' })[];
requiredCount: number;
isVirologistCure?: boolean;
};

export type CureActionPayload = {
color: DiseaseColor;
method: 'cards' | 'samples';
cardsToDiscard: (PlayerCard & { type: 'city' })[];
};

export type RemoteTreatmentSelection = { city: CityName; color: DiseaseColor };

export type BattleDieResult = 'loseLegion' | 'removeBarbarian' | 'removeBarbarianAndLoseLegion' | 'removeTwoBarbariansAndLoseLegion' | 'special';

export interface BattleModalState {
isOpen: boolean;
step: 'chooseDice' | 'viewResults' | 'selectCubes' | 'chooseAleaIactaEstResults';
maxDice: number;
diceToRoll: number;
results: BattleDieResult[];
legionsLost: number;
barbariansToRemove: number;
selectedCubes: { [key in DiseaseColor]?: number };
legionsToAdd?: number;
isFreeAction?: boolean;
}

export function isFallOfRomeDiseaseColor(color: DiseaseColor): color is FallOfRomeDiseaseColor {
return color === DiseaseColor.Blue ||
color === DiseaseColor.Orange ||
color === DiseaseColor.Green ||
color === DiseaseColor.White ||
color === DiseaseColor.Black;
}
