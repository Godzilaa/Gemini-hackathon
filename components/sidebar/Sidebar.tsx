'use client';

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Send, MapPin, Car, Bike, Users, Clock, Loader2, Settings, Trash2 } from "lucide-react"
import { useApp, useMessages, useUserPreferences, ChatMessage } from '@/contexts/AppContext'
import { apiService } from '@/lib/api-service'
import { TravelIntentParser, SystemPromptGenerator } from '@/lib/travel-utils'
import ReactMarkdown from 'react-markdown'

export function Sidebar() {
  return (
    <>
      {/* Mobile Trigger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="border-2 border-black rounded-none bg-white">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 border-r-2 border-black w-[320px] sm:w-[384px] gap-0">
             <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col h-screen w-[320px] lg:w-[384px] border-r-2 border-black bg-white text-black fixed left-0 top-0 z-40">
        <SidebarContent />
      </div>
    </>
  )
}

function SidebarContent() {
  const { state, dispatch } = useApp();
  const messages = useMessages();
  const { preferences, updatePreferences } = useUserPreferences();
  const [inputValue, setInputValue] = React.useState('');
  const [showPreferences, setShowPreferences] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || state.isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_LOADING', payload: true });
    setInputValue('');

    try {
      // Parse user intent
      const intent = TravelIntentParser.parseUserMessage(userMessage.content);
      
      // Create streaming assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });

      let decisionData;
      let weatherData;
      let systemPrompt = '';

      // Get current location for context
      const currentLoc = state.currentLocation || { lat: 19.0760, lng: 72.8777 };

      // Handle different intent types
      if (intent.type === 'travel' && intent.destination) {
        // Geocode destination
        const destLocation = await apiService.geocodeLocation(intent.destination);
        if (destLocation) {
          dispatch({ type: 'SET_SELECTED_DESTINATION', payload: {
            lat: destLocation.lat,
            lng: destLocation.lng,
            name: intent.destination
          }});

          // Get route analysis
          decisionData = await apiService.getRouteAnalysis(
            currentLoc.lat, currentLoc.lng,
            destLocation.lat, destLocation.lng,
            intent.vehicleType || preferences.vehicleType
          );

          // Get weather for destination
          weatherData = await apiService.getWeatherData(destLocation.lat, destLocation.lng);

          // Also get dining recommendations for destination
          const diningData = await apiService.getDiningRecommendations(
            destLocation.lat, destLocation.lng,
            intent.vehicleType || preferences.vehicleType
          );

          // Combine data
          decisionData.agent_contributions.dining = diningData.agent_contributions;

          systemPrompt = SystemPromptGenerator.generateTravelPrompt(intent, decisionData, weatherData, currentLoc);
          
          // Add map markers
          const markers = [
            {
              id: 'destination',
              type: 'attraction' as const,
              position: destLocation,
              title: intent.destination,
              description: 'Destination',
              color: '#FF0000'
            }
          ];
          dispatch({ type: 'SET_MAP_MARKERS', payload: markers });
        }
      } else if (intent.type === 'food') {
        // Get dining recommendations
        decisionData = await apiService.getDiningRecommendations(
          currentLoc.lat, currentLoc.lng,
          intent.vehicleType || preferences.vehicleType,
          preferences.radius
        );

        systemPrompt = SystemPromptGenerator.generateFoodPrompt(intent, decisionData, currentLoc);

        // Add food markers to map
        if (decisionData?.agent_contributions?.food?.data?.top_recommendations) {
          const foodMarkers = decisionData.agent_contributions.food.data.top_recommendations.slice(0, 10).map((restaurant: any, index: number) => ({
            id: `food_${index}`,
            type: 'food' as const,
            position: { lat: restaurant.latitude, lng: restaurant.longitude },
            title: restaurant.name,
            description: `${restaurant.rating}⭐ - ${restaurant.label}`,
            color: '#00FF00'
          }));
          console.log('🗺️ Adding food markers:', foodMarkers);
          dispatch({ type: 'SET_MAP_MARKERS', payload: foodMarkers });
        } else {
          console.log('⚠️ No restaurant data found for markers:', decisionData);
        }
      } else if (intent.type === 'route') {
        // Get route analysis for current location or specified route
        if (intent.destination) {
          const destLocation = await apiService.geocodeLocation(intent.destination);
          if (destLocation) {
            decisionData = await apiService.getRouteAnalysis(
              currentLoc.lat, currentLoc.lng,
              destLocation.lat, destLocation.lng,
              intent.vehicleType || preferences.vehicleType
            );
            weatherData = await apiService.getWeatherData(destLocation.lat, destLocation.lng);
            systemPrompt = SystemPromptGenerator.generateRoutePrompt(intent, decisionData, weatherData);
          }
        }
      } else {
        // General area analysis
        decisionData = await apiService.queryDecisionAgent(
          currentLoc.lat,
          currentLoc.lng,
          intent.vehicleType || preferences.vehicleType,
          'area_analysis'
        );

        weatherData = await apiService.getWeatherData(currentLoc.lat, currentLoc.lng);
        systemPrompt = SystemPromptGenerator.generateGeneralPrompt(intent, decisionData, weatherData);
      }

      // Stream response from Gemini
      let streamedContent = '';
      await apiService.streamGeminiResponse(
        userMessage.content,
        (chunk: string) => {
          streamedContent += chunk;
          dispatch({ 
            type: 'UPDATE_STREAMING_MESSAGE', 
            payload: { id: assistantMessage.id, content: streamedContent }
          });
        },
        () => {
          dispatch({ type: 'FINISH_STREAMING', payload: { id: assistantMessage.id } });
          dispatch({ type: 'SET_LOADING', payload: false });
        },
        systemPrompt
      );

      // Store metadata for reference
      const finalMessage = {
        ...assistantMessage,
        content: streamedContent,
        isStreaming: false,
        metadata: {
          confidence: decisionData?.confidence_score || 0,
          agentData: decisionData,
          weatherData,
        }
      };
      
      // Update message with metadata
      dispatch({ type: 'UPDATE_STREAMING_MESSAGE', payload: { id: assistantMessage.id, content: streamedContent } });

    } catch (error) {
      console.error('Chat error:', error);
      dispatch({ type: 'ADD_MESSAGE', payload: {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: `⚠️ Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      }});
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  };

  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="p-6 border-b-2 border-black">
        <h1 className="text-2xl font-bold uppercase tracking-tight mb-4">🤖 AI TRAVEL ASSISTANT</h1>
        <div className="flex gap-2">
          <Button 
            onClick={clearChat}
            variant="ghost" 
            className="flex-1 justify-start rounded-none border-2 border-black hover:bg-black hover:text-white transition-colors uppercase font-medium"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            New Chat
          </Button>
          <Button 
            onClick={() => setShowPreferences(!showPreferences)}
            variant="ghost" 
            size="icon"
            className="rounded-none border-2 border-black hover:bg-black hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preferences Panel */}
      {showPreferences && (
        <div className="p-4 border-b-2 border-black bg-gray-50">
          <h3 className="font-bold mb-3 text-sm uppercase">PREFERENCES</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">Vehicle</label>
              <div className="flex gap-1">
                {(['car', 'bike', 'auto'] as const).map((vehicle) => (
                  <Button
                    key={vehicle}
                    onClick={() => updatePreferences({ vehicleType: vehicle })}
                    size="sm"
                    variant={preferences.vehicleType === vehicle ? "default" : "ghost"}
                    className="rounded-none border border-black text-xs uppercase"
                  >
                    {vehicle === 'car' ? <Car className="w-3 h-3" /> : 
                     vehicle === 'bike' ? <Bike className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">Budget</label>
              <div className="flex gap-1">
                {(['low', 'medium', 'high'] as const).map((budget) => (
                  <Button
                    key={budget}
                    onClick={() => updatePreferences({ budget })}
                    size="sm"
                    variant={preferences.budget === budget ? "default" : "ghost"}
                    className="rounded-none border border-black text-xs uppercase"
                  >
                    {budget}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <ChatMessageComponent key={message.id} message={message} />
            ))}
            {state.isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing data sources...</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t-2 border-black bg-white">
        <div className="relative">
          <Textarea 
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about travel, food, routes, weather..." 
            className="min-h-[80px] w-full rounded-none border-2 border-black p-3 resize-none focus-visible:ring-0 text-sm placeholder:text-gray-500 pr-12"
            disabled={state.isLoading}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || state.isLoading}
            className="absolute bottom-3 right-3 p-2 rounded-none border border-black bg-black text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
            size="sm"
          >
            {state.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className="mt-2 text-xs text-gray-600 flex items-center gap-4">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {state.currentLocation ? `${state.currentLocation.lat.toFixed(3)}, ${state.currentLocation.lng.toFixed(3)}` : 'Getting location...'}
          </span>
          <span className="flex items-center gap-1">
            {preferences.vehicleType === 'car' ? <Car className="w-3 h-3" /> : 
             preferences.vehicleType === 'bike' ? <Bike className="w-3 h-3" /> : <Users className="w-3 h-3" />}
            {preferences.vehicleType.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}

function ChatMessageComponent({ message }: { message: ChatMessage }) {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${
        isSystem ? 'bg-blue-50 border-blue-200' :
        isUser ? 'bg-black text-white' : 'bg-gray-50'
      } border-2 border-black p-3 relative`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-xs font-bold">
              🤖
            </div>
            <span className="text-xs font-medium uppercase tracking-wide">
              {isSystem ? 'SYSTEM' : 'AI Assistant'}
            </span>
            {message.metadata?.confidence && (
              <span className="text-xs bg-green-200 px-2 py-1 border border-black">
                {Math.round(message.metadata.confidence * 100)}% CONFIDENCE
              </span>
            )}
            {message.isStreaming && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
          </div>
        )}
        
        <div className={`text-sm ${isSystem ? 'font-mono' : ''}`}>
          <ReactMarkdown 
            className="prose prose-sm max-w-none"
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-300 text-xs text-gray-500">
          <span>{message.timestamp.toLocaleTimeString()}</span>
          {message.metadata?.weatherData && (
            <span className="flex items-center gap-1">
              🌤️ {message.metadata.weatherData.temperature}°C
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
