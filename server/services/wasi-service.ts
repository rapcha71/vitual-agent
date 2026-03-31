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

// Fallback credentials in case Railway doesn't inject env vars
const WASI_FALLBACK_COMPANY = '22125617';
const WASI_FALLBACK_TOKEN = '4964_0daF_9is1_Ul8Y';

export class WasiService {
  private baseUrl = 'https://api.wasi.co/v1';

  private get idCompany(): string {
    return process.env.WASI_ID_COMPANY || WASI_FALLBACK_COMPANY;
  }

  private get token(): string {
    return process.env.WASI_TOKEN || WASI_FALLBACK_TOKEN;
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
      // URL Base sin parametros, se envian por POST para mayor seguridad según docs oficiales de WASI
      const url = `${this.baseUrl}/property/get/${wasiId}`;
      console.log(`[WasiService] Buscando propiedad en WASI id: ${wasiId}...`);
      
      const formData = new URLSearchParams();
      formData.append('id_company', this.idCompany);
      formData.append('wasi_token', this.token);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
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
