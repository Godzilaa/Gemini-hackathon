// Travel-specific utilities and system prompts for Gemini
import { DecisionAgentResponse, WeatherData } from './api-service';

export interface ParsedTravelIntent {
  type: 'travel' | 'food' | 'general' | 'route' | 'area_analysis';
  destination?: string;
  origin?: string;
  vehicleType?: 'bike' | 'car' | 'auto';
  preferences?: {
    budget?: 'low' | 'medium' | 'high';
    accommodation?: 'budget' | 'luxury' | 'business';
    cuisine?: string[];
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  };
  specificRequests?: string[];
}

export class TravelIntentParser {
  static parseUserMessage(message: string): ParsedTravelIntent {
    const lowerMessage = message.toLowerCase();
    
    // Travel intent detection
    const travelKeywords = ['travel', 'go to', 'visit', 'trip', 'journey', 'destination'];
    const foodKeywords = ['food', 'restaurant', 'eat', 'dining', 'hungry', 'meal'];
    const routeKeywords = ['route', 'path', 'directions', 'way to', 'how to reach'];
    
    let type: ParsedTravelIntent['type'] = 'general';
    
    if (travelKeywords.some(keyword => lowerMessage.includes(keyword))) {
      type = 'travel';
    } else if (foodKeywords.some(keyword => lowerMessage.includes(keyword))) {
      type = 'food';
    } else if (routeKeywords.some(keyword => lowerMessage.includes(keyword))) {
      type = 'route';
    }
    
    // Extract destination
    const destinationPattern = /(?:to|visit|go to)\s+([a-zA-Z\s]+)(?:\s|$|,|\?|!)/i;
    const destinationMatch = message.match(destinationPattern);
    const destination = destinationMatch?.[1]?.trim();
    
    // Extract vehicle type
    let vehicleType: 'bike' | 'car' | 'auto' | undefined;
    if (lowerMessage.includes('bike') || lowerMessage.includes('motorcycle')) vehicleType = 'bike';
    else if (lowerMessage.includes('car') || lowerMessage.includes('drive')) vehicleType = 'car';
    else if (lowerMessage.includes('auto') || lowerMessage.includes('rickshaw')) vehicleType = 'auto';
    
    // Extract preferences
    let budget: 'low' | 'medium' | 'high' | undefined;
    if (lowerMessage.includes('budget') || lowerMessage.includes('cheap')) budget = 'low';
    else if (lowerMessage.includes('luxury') || lowerMessage.includes('expensive')) budget = 'high';
    else if (lowerMessage.includes('mid-range') || lowerMessage.includes('moderate')) budget = 'medium';
    
    let accommodation: 'budget' | 'luxury' | 'business' | undefined;
    if (lowerMessage.includes('budget hotel') || lowerMessage.includes('hostel')) accommodation = 'budget';
    else if (lowerMessage.includes('luxury') || lowerMessage.includes('5 star')) accommodation = 'luxury';
    else if (lowerMessage.includes('business hotel')) accommodation = 'business';
    
    // Extract cuisine preferences
    const cuisineKeywords = ['indian', 'chinese', 'italian', 'mexican', 'thai', 'japanese', 'continental', 'local', 'vegetarian', 'vegan'];
    const cuisine = cuisineKeywords.filter(c => lowerMessage.includes(c));
    
    // Extract time preferences
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | undefined;
    if (lowerMessage.includes('morning') || lowerMessage.includes('breakfast')) timeOfDay = 'morning';
    else if (lowerMessage.includes('afternoon') || lowerMessage.includes('lunch')) timeOfDay = 'afternoon';
    else if (lowerMessage.includes('evening') || lowerMessage.includes('dinner')) timeOfDay = 'evening';
    else if (lowerMessage.includes('night') || lowerMessage.includes('late')) timeOfDay = 'night';
    
    return {
      type,
      destination,
      vehicleType,
      preferences: {
        budget,
        accommodation,
        cuisine: cuisine.length > 0 ? cuisine : undefined,
        timeOfDay
      }
    };
  }
}

export class SystemPromptGenerator {
  static generateTravelPrompt(
    intent: ParsedTravelIntent,
    decisionData: DecisionAgentResponse,
    weatherData: WeatherData,
    currentLocation?: { lat: number; lng: number }
  ): string {
    const basePrompt = `You are a concise travel assistant. Provide ONLY bullet points with essential information.

DESTINATION: ${intent.destination || 'Current Location'}
WEATHER: ${weatherData.temperature}°C, ${weatherData.condition}
FORECAST: ${weatherData.forecast.map(f => `${f.date.split('T')[0]}: ${f.temperature.min}-${f.temperature.max}°C`).join(' | ')}

RESPONSE FORMAT (Maximum 10 bullet points):
• **Route**: Best path with timing
• **Weather Prep**: What to pack/wear  
• **Key Stops**: 2-3 must-visit places
• **Food**: Top restaurant recommendation
• **Safety**: Important warnings only
• **Transport**: Best travel mode
• **Timing**: Optimal departure/arrival
• **Cost**: Estimated budget range
• **Duration**: Total travel time
• **Navigation**: Include this at the end: [🧭 START NAVIGATION - Click to open Google Maps directions]

Keep each bullet point under 15 words. No lengthy explanations.

WARNINGS: ${decisionData.warnings ? decisionData.warnings.join('; ') : 'None'}
CONFIDENCE: ${Math.round((decisionData.confidence_score || 0) * 100)}%`;

    return basePrompt;
  }

  static generateFoodPrompt(
    intent: ParsedTravelIntent,
    decisionData: DecisionAgentResponse,
    currentLocation?: { lat: number; lng: number }
  ): string {
    return `You are a local food expert. Provide ONLY bullet points for restaurant recommendations.

RESPONSE FORMAT (Maximum 8 bullet points):
• **Top Pick**: Highest rated restaurant with cuisine type
• **Budget**: Best affordable option  
• **Specialty**: Unique local cuisine recommendation
• **Location**: Walking distance/transport info
• **Timing**: Operating hours or best visit time
• **Price Range**: Average cost per person
• **Safety**: Any food safety notes
• **Navigation**: [🍽️ VIEW ON MAP - Restaurants marked on map, click to navigate]

Keep each bullet point under 12 words. No lengthy descriptions.

USER PREFERENCES: ${intent.preferences?.cuisine?.join(', ') || 'Any'} cuisine, ${intent.preferences?.budget || 'Any'} budget
RESTAURANT DATA: ${decisionData.agent_contributions?.food?.data ? 'Available' : 'Mock data used'}`;
  }

  static generateRoutePrompt(
    intent: ParsedTravelIntent,
    decisionData: DecisionAgentResponse,
    weatherData: WeatherData
  ): string {
    return `You are a route planning expert with access to traffic, safety, and weather data.

ROUTE ANALYSIS:
- Origin Risk: ${decisionData.agent_contributions.origin_regulatory || 'Not analyzed'}
- Destination Risk: ${decisionData.agent_contributions.destination_regulatory || 'Not analyzed'}
- Warnings: ${decisionData.warnings.join('; ')}

WEATHER CONDITIONS:
- Current: ${weatherData.condition}, ${weatherData.temperature}°C
- Wind: ${weatherData.windSpeed} km/h
- Forecast: ${weatherData.forecast[0]?.condition}

VEHICLE: ${intent.vehicleType || 'Car'}
DESTINATION: ${intent.destination || 'Not specified'}

Provide:
1. Best route options with timing
2. Traffic and safety warnings
3. Weather-appropriate travel advice
4. Vehicle-specific recommendations
5. Alternative routes if needed
6. Estimated travel time and costs
7. Parking and stopping suggestions

Be specific about road conditions, enforcement zones, and optimal departure times.`;
  }

  static generateGeneralPrompt(
    intent: ParsedTravelIntent,
    decisionData: DecisionAgentResponse,
    weatherData?: WeatherData
  ): string {
    return `You are a comprehensive city guide with real-time data access.

AREA ANALYSIS:
- Location Assessment: ${decisionData.primary_recommendation || 'Not available'}
- Confidence: ${(decisionData.confidence_score || 0) * 100}%
- Key Recommendations: ${decisionData.combined_recommendations ? decisionData.combined_recommendations.join('; ') : 'Not available'}
- Warnings: ${decisionData.warnings ? decisionData.warnings.join('; ') : 'None'}

CURRENT CONDITIONS:
${weatherData ? `- Weather: ${weatherData.condition}, ${weatherData.temperature}°C` : '- Weather: Not available'}

Provide helpful, contextual information based on the user's query. Include:
1. Relevant local insights
2. Safety considerations
3. Best times to visit/travel
4. Practical tips and recommendations
5. Specific locations and details

Be conversational, informative, and actionable in your response.`;
  }
}