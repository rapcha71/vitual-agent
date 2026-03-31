export interface WasiPropertyData {
  id_property: number;
  id_company: number;
  title: string;
  rent_price: string;
  rent_price_label: string;
  sale_price: string;
  sale_price_label: string;
  area: string;
  built_area: string;
  bedrooms: string;
  bathrooms: string;
  garages: string;
  floor: string;
  stratum: string;
  observations: string;
  year_built: string;
  maintenance_fee: string;
  galleries: { id: number, id_property: number, url: string, description: string }[];
  location_label: string;
  property_type_label: string;
  property_condition_label: string;
}

export class WasiService {
  private idCompany: string;
  private token: string;
  private baseUrl = 'https://api.wasi.co/v1';

  constructor() {
    this.idCompany = process.env.WASI_ID_COMPANY || '';
    this.token = process.env.WASI_TOKEN || '';
  }

  isConfigured(): boolean {
    return !!(this.idCompany && this.token);
  }

  async getProperty(wasiId: string): Promise<any | null> {
    if (!this.isConfigured()) {
      console.warn('[WasiService] WASI credentials not configured in environment.');
      return null;
    }

    try {
      // Usar formData o qparams segun spec. WASI recomienda POST para varias APIs pero GET/json para algunas.
      // Intentaremos GET query params
      const url = `${this.baseUrl}/property/get/${wasiId}?id_company=${this.idCompany}&wasi_token=${this.token}`;
      console.log(`[WasiService] Buscando propiedad en WASI id: ${wasiId}...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[WasiService] HTTP Error ${response.status} al consultar WASI id: ${wasiId}`);
        return null;
      }

      const data = await response.json();

      if (data.status === 'error') {
        console.error(`[WasiService] API Error:`, data.message);
        return null;
      }

      console.log(`[WasiService] Exito al obtener de WASI. Propiedad encontrada.`);
      return data;
    } catch (error) {
      console.error(`[WasiService] Fetch failed:`, error);
      return null;
    }
  }
}

export const wasiService = new WasiService();
