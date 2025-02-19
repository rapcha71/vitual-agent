import { ImageAnnotatorClient } from '@google-cloud/vision';
import { promises as fs } from 'fs';

export class OCRService {
  private client: ImageAnnotatorClient;

  constructor() {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS || '{}');
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
      // Remove the data:image/jpeg;base64, prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

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
    // Match various phone number formats
    const phoneRegex = /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([0-9]{3})\s*\)|([0-9]{3}))\s*(?:[.-]\s*)?([0-9]{3})\s*(?:[.-]\s*)?([0-9]{4}))/g;
    const matches = text.match(phoneRegex) || [];
    return matches.map(number => number.replace(/\D/g, ''));
  }
}

const ocrService = new OCRService();
export default ocrService;
