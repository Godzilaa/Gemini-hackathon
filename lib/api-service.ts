// API utilities for communicating with decision agent and Gemini
export interface TravelQuery {
  destination: string;
  origin?: string;
  vehicleType?: 'bike' | 'car' | 'auto';
  preferences?: {
    budget?: 'low' | 'medium' | 'high';
    accommodation?: 'budget' | 'luxury' | 'business';
    cuisine?: string[];
    activities?: string[];
  };
}

export interface DecisionAgentResponse {
  decision_id: string;
  primary_recommendation: string;
  confidence_score: number;
  agent_contributions: Record<string, any>;
  combined_recommendations: string[];
  warnings: string[];
  additional_info: Record<string, any>;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface GeminiResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  forecast: Array<{
    date: string;
    temperature: { min: number; max: number };
    condition: string;
  }>;
}

export interface MapMarker {
  id: string;
  type: 'food' | 'hotel' | 'attraction' | 'warning' | 'route';
  position: { lat: number; lng: number };
  title: string;
  description: string;
  icon?: string;
  color?: string;
}

class APIService {
  private decisionAgentUrl = 'http://localhost:8004';
  private geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  async queryDecisionAgent(
    latitude: number,
    longitude: number,
    vehicleType: string = 'car',
    queryType: string = 'area_analysis'
  ): Promise<DecisionAgentResponse> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        vehicle_type: vehicleType,
        analysis_type: queryType,
      });
      
      const response = await fetch(`${this.decisionAgentUrl}/quick-analysis?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Decision agent error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Decision agent query failed:', error);
      throw error;
    }
  }

  async getRouteAnalysis(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    vehicleType: string = 'car'
  ): Promise<DecisionAgentResponse> {
    try {
      const response = await fetch(
        `${this.decisionAgentUrl}/route-safety?origin_lat=${originLat}&origin_lng=${originLng}&dest_lat=${destLat}&dest_lng=${destLng}&vehicle_type=${vehicleType}`
      );

      if (!response.ok) {
        throw new Error(`Route analysis error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Route analysis failed:', error);
      throw error;
    }
  }

  async getDiningRecommendations(
    latitude: number,
    longitude: number,
    vehicleType: string = 'car',
    radius: number = 2000
  ): Promise<DecisionAgentResponse> {
    try {
      const response = await fetch(
        `${this.decisionAgentUrl}/dining-recommendation?latitude=${latitude}&longitude=${longitude}&vehicle_type=${vehicleType}&radius=${radius}`
      );

      if (!response.ok) {
        throw new Error(`Dining recommendations error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Dining recommendations failed:', error);
      throw error;
    }
  }

  async queryGemini(prompt: string, systemPrompt?: string): Promise<GeminiResponse> {
    try {
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\nUser Query: ${prompt}`
        : prompt;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.9,
            topP: 1,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated',
        usage: data.usageMetadata,
      };
    } catch (error) {
      console.error('Gemini query failed:', error);
      throw error;
    }
  }

  async streamGeminiResponse(
    prompt: string, 
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    systemPrompt?: string
  ) {
    try {
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\nUser Query: ${prompt}`
        : prompt;

      console.log('🤖 Sending to Gemini:', { prompt: prompt.substring(0, 100) + '...', systemPrompt: systemPrompt ? 'Present' : 'None' });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.9,
            topP: 1,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🤖 Gemini response:', data);
      
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        // Since Google AI Studio doesn't support streaming for free tier,
        // we'll simulate streaming by splitting the response
        const fullText = data.candidates[0].content.parts[0].text;
        console.log('🤖 Full response text length:', fullText.length);
        const chunks = fullText.match(/.{1,50}/g) || [fullText];
        
        // Stream chunks sequentially
        for (let i = 0; i < chunks.length; i++) {
          onChunk(chunks[i]);
          // Small delay to simulate streaming
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        onComplete();
      } else {
        console.error('No response content in Gemini response:', data);
        throw new Error('No response content received from Gemini');
      }

    } catch (error) {
      console.error('Gemini streaming failed:', error);
      throw error;
    }
  }

  async getWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
    // Mock weather data for now - you can integrate with real weather API
    return {
      temperature: 28,
      condition: 'Partly Cloudy',
      humidity: 65,
      windSpeed: 12,
      forecast: [
        {
          date: new Date().toISOString().split('T')[0],
          temperature: { min: 24, max: 31 },
          condition: 'Partly Cloudy'
        },
        {
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          temperature: { min: 23, max: 30 },
          condition: 'Sunny'
        },
        {
          date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
          temperature: { min: 25, max: 32 },
          condition: 'Light Rain'
        }
      ]
    };
  }

  async geocodeLocation(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }

      return null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  }
}

export const apiService = new APIService();