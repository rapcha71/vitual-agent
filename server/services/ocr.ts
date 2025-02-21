import { ImageAnnotatorClient } from '@google-cloud/vision';
import { promises as fs } from 'fs';

export class OCRService {
  private client: ImageAnnotatorClient;

  constructor() {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS || '{}');
      console.log('Initializing Vision API with project:', credentials.project_id);
      this.client = new ImageAnnotatorClient({
        credentials,
        projectId: credentials.project_id
      });
    } catch (error) {
      console.error('Error initializing Vision API client:', error);
      throw error;
    }
  }

  async extractTextFromBase64Image(base64Image: string): Promise<string> {
    try {
      console.log('Starting OCR text extraction...');
      // Remove the data:image/jpeg;base64, prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      console.log('Sending image to Vision API...');
      const [result] = await this.client.textDetection(imageBuffer);
      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        console.log('No text detected in image');
        return '';
      }

      // The first annotation contains the entire text
      const extractedText = detections[0].description || '';
      console.log('Extracted text:', extractedText);

      return extractedText;
    } catch (error) {
      console.error('Error processing image with Vision API:', error);
      throw error;
    }
  }

  async extractPhoneNumbers(text: string): Promise<string[]> {
    console.log('Extracting phone numbers from text:', text);

    // Normalizar el texto: eliminar caracteres especiales excepto números y espacios
    const normalizedText = text
      .replace(/[^\d\s-()]/g, '') // Mantener números, espacios, guiones y paréntesis
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();

    console.log('Normalized text:', normalizedText);

    // Patrones de números de teléfono de Costa Rica (8 dígitos)
    // Acepta formatos:
    // - 8888-8888
    // - 88888888
    // - 8888 8888
    // - (8888)8888
    // - (8888) 8888
    // - 8888.8888
    const phonePatterns = [
      /[2-8][0-9]{3}[\s-.]?[0-9]{4}/g, // Formato básico: 8888-8888 o 88888888
      /\(?[2-8][0-9]{3}\)?[\s-.]?[0-9]{4}/g, // Formato con paréntesis: (8888)8888
    ];

    let matches: string[] = [];

    // Aplicar cada patrón y combinar resultados
    phonePatterns.forEach(pattern => {
      const found = normalizedText.match(pattern) || [];
      matches = [...matches, ...found];
    });

    // Limpiar y normalizar los números encontrados
    const cleanedNumbers = matches.map(number => {
      // Eliminar todos los caracteres no numéricos
      const digits = number.replace(/\D/g, '');
      return digits.length === 8 ? digits : null;
    })
    .filter((number): number is string => 
      number !== null && 
      number.length === 8 && 
      ['2', '3', '4', '5', '6', '7', '8'].includes(number[0])
    );

    // Eliminar duplicados y ordenar
    const uniqueNumbers = [...new Set(cleanedNumbers)].sort();

    console.log('Found valid phone numbers:', uniqueNumbers);
    return uniqueNumbers;
  }

  // Test method to verify OCR functionality
  async testOCR(base64Image: string): Promise<{
    success: boolean;
    extractedText?: string;
    phoneNumbers?: string[];
    error?: string;
  }> {
    try {
      const extractedText = await this.extractTextFromBase64Image(base64Image);
      const phoneNumbers = await this.extractPhoneNumbers(extractedText);

      return {
        success: true,
        extractedText,
        phoneNumbers
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to process image'
      };
    }
  }
}

const ocrService = new OCRService();
export default ocrService;