/**
 * canton-bounds.ts
 *
 * Bounding boxes (cajas delimitadoras) de los cantones de Costa Rica.
 * Usados para validación automática servidor-lado: si las coordenadas capturadas
 * no caen dentro del bounding box del cantón seleccionado, se rechaza el registro.
 *
 * Fuente: SNIT Costa Rica + cálculos propios sobre datos OSM.
 * Los límites son ligeramente holgados (+0.01°) para tolerar propiedades
 * en los bordes exactos del cantón sin falsos rechazos.
 *
 * Formato: [latMin, latMax, lngMin, lngMax]
 */

export interface CantonBounds {
  label: string;
  lat: [number, number]; // [min, max]
  lng: [number, number]; // [min, max]
}

export const CANTON_BOUNDS: Record<string, CantonBounds> = {
  // ── Provincia 01: San José ─────────────────────────────────────────────────
  "01-01": { label: "San José",            lat: [9.88, 9.99],   lng: [-84.14, -83.99] },
  "01-02": { label: "Escazú",              lat: [9.87, 9.95],   lng: [-84.19, -84.08] },
  "01-03": { label: "Desamparados",        lat: [9.80, 9.93],   lng: [-84.12, -84.00] },
  "01-04": { label: "Puriscal",            lat: [9.68, 9.92],   lng: [-84.47, -84.23] },
  "01-05": { label: "Tarrazú",             lat: [9.53, 9.77],   lng: [-84.13, -83.93] },
  "01-06": { label: "Aserrí",              lat: [9.76, 9.89],   lng: [-84.13, -84.00] },
  "01-07": { label: "Mora",                lat: [9.81, 9.95],   lng: [-84.32, -84.13] },
  "01-08": { label: "Goicoechea",          lat: [9.92, 9.99],   lng: [-84.07, -83.97] },
  "01-09": { label: "Santa Ana",           lat: [9.87, 9.97],   lng: [-84.23, -84.08] },
  "01-10": { label: "Alajuelita",          lat: [9.84, 9.93],   lng: [-84.13, -84.03] },
  "01-11": { label: "Vásquez de Coronado", lat: [9.94, 10.07],  lng: [-84.04, -83.87] },
  "01-12": { label: "Acosta",              lat: [9.68, 9.82],   lng: [-84.23, -84.03] },
  "01-13": { label: "Tibás",               lat: [9.94, 9.99],   lng: [-84.10, -84.03] },
  "01-14": { label: "Moravia",             lat: [9.94, 10.00],  lng: [-84.05, -83.97] },
  "01-15": { label: "Montes de Oca",       lat: [9.91, 9.96],   lng: [-84.05, -83.99] },
  "01-16": { label: "Turrubares",          lat: [9.67, 9.87],   lng: [-84.52, -84.29] },
  "01-17": { label: "Dota",                lat: [9.40, 9.65],   lng: [-84.02, -83.78] },
  "01-18": { label: "Curridabat",          lat: [9.89, 9.94],   lng: [-84.02, -83.97] },
  "01-19": { label: "Pérez Zeledón",       lat: [9.17, 9.60],   lng: [-83.88, -83.45] },
  "01-20": { label: "León Cortés",         lat: [9.55, 9.72],   lng: [-84.10, -83.93] },

  // ── Provincia 02: Cartago ──────────────────────────────────────────────────
  "02-01": { label: "Cartago",             lat: [9.82, 9.93],   lng: [-83.97, -83.83] },
  "02-02": { label: "Paraíso",             lat: [9.79, 9.93],   lng: [-83.92, -83.70] },
  "02-03": { label: "La Unión",            lat: [9.87, 9.97],   lng: [-84.01, -83.87] },
  "02-04": { label: "Jiménez",             lat: [9.75, 9.88],   lng: [-83.82, -83.62] },
  "02-05": { label: "Turrialba",           lat: [9.72, 10.08],  lng: [-83.72, -83.38] },
  "02-06": { label: "Alvarado",            lat: [9.88, 9.99],   lng: [-83.92, -83.78] },
  "02-07": { label: "Oreamuno",            lat: [9.87, 10.00],  lng: [-83.97, -83.82] },
  "02-08": { label: "El Guarco",           lat: [9.77, 9.88],   lng: [-84.00, -83.87] },

  // ── Provincia 03: Heredia ──────────────────────────────────────────────────
  "03-01": { label: "Heredia",             lat: [9.96, 10.05],  lng: [-84.14, -84.06] },
  "03-02": { label: "Barva",               lat: [10.00, 10.10], lng: [-84.12, -84.04] },
  "03-03": { label: "Santo Domingo",       lat: [9.97, 10.04],  lng: [-84.10, -84.03] },
  "03-04": { label: "Santa Bárbara",       lat: [10.01, 10.11], lng: [-84.17, -84.09] },
  "03-05": { label: "San Rafael",          lat: [10.02, 10.12], lng: [-84.12, -84.03] },
  "03-06": { label: "San Isidro",          lat: [10.02, 10.10], lng: [-84.08, -84.00] },
  "03-07": { label: "Belén",               lat: [9.97, 10.03],  lng: [-84.20, -84.13] },
  "03-08": { label: "Flores",              lat: [9.99, 10.05],  lng: [-84.19, -84.12] },
  "03-09": { label: "San Pablo",           lat: [9.98, 10.05],  lng: [-84.10, -84.04] },
  "03-10": { label: "Sarapiquí",           lat: [10.30, 10.72], lng: [-84.23, -83.70] },

  // ── Provincia 04: Alajuela ─────────────────────────────────────────────────
  "04-01": { label: "Alajuela",            lat: [9.95, 10.12],  lng: [-84.30, -84.10] },
  "04-02": { label: "San Ramón",           lat: [9.98, 10.25],  lng: [-84.60, -84.33] },
  "04-03": { label: "Grecia",              lat: [10.00, 10.22], lng: [-84.40, -84.20] },
  "04-04": { label: "San Mateo",           lat: [9.87, 10.02],  lng: [-84.55, -84.40] },
  "04-05": { label: "Atenas",              lat: [9.93, 10.05],  lng: [-84.47, -84.32] },
  "04-06": { label: "Naranjo",             lat: [10.07, 10.22], lng: [-84.45, -84.30] },
  "04-07": { label: "Palmares",            lat: [10.03, 10.12], lng: [-84.47, -84.38] },
  "04-08": { label: "Poás",                lat: [10.08, 10.22], lng: [-84.28, -84.13] },
  "04-09": { label: "Orotina",             lat: [9.88, 10.00],  lng: [-84.60, -84.47] },
  "04-10": { label: "San Carlos",          lat: [10.17, 10.80], lng: [-84.73, -84.12] },
  "04-11": { label: "Zarcero",             lat: [10.15, 10.28], lng: [-84.45, -84.30] },
  "04-12": { label: "Sarchí",              lat: [10.07, 10.17], lng: [-84.37, -84.27] },
  "04-13": { label: "Upala",               lat: [10.73, 11.00], lng: [-85.20, -84.85] },
  "04-14": { label: "Los Chiles",          lat: [10.92, 11.12], lng: [-84.80, -84.50] },
  "04-15": { label: "Guatuso",             lat: [10.62, 10.87], lng: [-84.93, -84.65] },
  "04-16": { label: "Río Cuarto",          lat: [10.35, 10.65], lng: [-84.25, -83.98] },

  // ── Provincia 05: Puntarenas ───────────────────────────────────────────────
  "05-01": { label: "Puntarenas",          lat: [9.55, 10.20],  lng: [-85.10, -84.60] },
  "05-02": { label: "Esparza",             lat: [9.87, 10.02],  lng: [-84.77, -84.58] },
  "05-03": { label: "Buenos Aires",        lat: [9.00, 9.50],   lng: [-83.57, -83.20] },
  "05-04": { label: "Montes de Oro",       lat: [10.00, 10.18], lng: [-84.77, -84.60] },
  "05-05": { label: "Osa",                 lat: [8.52, 9.12],   lng: [-83.93, -83.32] },
  "05-06": { label: "Quepos",              lat: [9.30, 9.55],   lng: [-84.22, -83.93] },
  "05-07": { label: "Golfito",             lat: [8.42, 8.82],   lng: [-83.55, -83.10] },
  "05-08": { label: "Coto Brus",           lat: [8.75, 9.10],   lng: [-83.12, -82.70] },
  "05-09": { label: "Parrita",             lat: [9.42, 9.65],   lng: [-84.42, -84.17] },
  "05-10": { label: "Corredores",          lat: [8.53, 8.85],   lng: [-83.05, -82.65] },
  "05-11": { label: "Garabito",            lat: [9.55, 9.75],   lng: [-84.72, -84.48] },

  // ── Provincia 06: Guanacaste ───────────────────────────────────────────────
  "06-01": { label: "Liberia",             lat: [10.47, 10.77], lng: [-85.55, -85.25] },
  "06-02": { label: "Nicoya",              lat: [9.93, 10.37],  lng: [-85.65, -85.27] },
  "06-03": { label: "Santa Cruz",          lat: [10.05, 10.45], lng: [-85.80, -85.40] },
  "06-04": { label: "Bagaces",             lat: [10.37, 10.82], lng: [-85.27, -84.90] },
  "06-05": { label: "Carrillo",            lat: [10.27, 10.55], lng: [-85.73, -85.40] },
  "06-06": { label: "Cañas",               lat: [10.33, 10.65], lng: [-85.17, -84.90] },
  "06-07": { label: "Abangares",           lat: [10.15, 10.48], lng: [-85.05, -84.82] },
  "06-08": { label: "Tilarán",             lat: [10.35, 10.62], lng: [-84.98, -84.75] },
  "06-09": { label: "Nandayure",           lat: [9.87, 10.18],  lng: [-85.48, -85.12] },
  "06-10": { label: "La Cruz",             lat: [10.88, 11.12], lng: [-85.80, -85.50] },
  "06-11": { label: "Hojancha",            lat: [10.00, 10.20], lng: [-85.42, -85.22] },

  // ── Provincia 07: Limón ────────────────────────────────────────────────────
  "07-01": { label: "Limón",               lat: [9.92, 10.12],  lng: [-83.15, -82.88] },
  "07-02": { label: "Pococí",              lat: [10.25, 10.65], lng: [-83.85, -83.42] },
  "07-03": { label: "Siquirres",           lat: [10.03, 10.33], lng: [-83.58, -83.25] },
  "07-04": { label: "Talamanca",           lat: [9.45, 9.85],   lng: [-83.20, -82.60] },
  "07-05": { label: "Matina",              lat: [10.02, 10.33], lng: [-83.42, -83.13] },
  "07-06": { label: "Guácimo",             lat: [10.12, 10.37], lng: [-83.75, -83.47] },
};

/**
 * Retorna los límites del cantón para el código dado, o undefined si no existe.
 */
export function getCantonBounds(districtCode: string): CantonBounds | undefined {
  return CANTON_BOUNDS[districtCode];
}
