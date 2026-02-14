'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { MapMarker } from '@/lib/api-service';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  metadata?: {
    confidence?: number;
    agentData?: any;
    weatherData?: any;
    markers?: MapMarker[];
  };
}

export interface AppState {
  messages: ChatMessage[];
  currentLocation: { lat: number; lng: number } | null;
  mapMarkers: MapMarker[];
  isLoading: boolean;
  streamingMessageId: string | null;
  selectedDestination: { lat: number; lng: number; name: string } | null;
  userPreferences: {
    vehicleType: 'bike' | 'car' | 'auto';
    budget: 'low' | 'medium' | 'high';
    radius: number;
  };
}

type AppAction = 
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_STREAMING_MESSAGE'; payload: { id: string; content: string } }
  | { type: 'FINISH_STREAMING'; payload: { id: string } }
  | { type: 'SET_CURRENT_LOCATION'; payload: { lat: number; lng: number } }
  | { type: 'SET_MAP_MARKERS'; payload: MapMarker[] }
  | { type: 'ADD_MAP_MARKER'; payload: MapMarker }
  | { type: 'CLEAR_MAP_MARKERS' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SELECTED_DESTINATION'; payload: { lat: number; lng: number; name: string } | null }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<AppState['userPreferences']> }
  | { type: 'CLEAR_MESSAGES' };

const initialState: AppState = {
  messages: [
    {
      id: 'welcome',
      type: 'system',
      content: '🤖 **AI Travel Assistant Initialized**\n\nI can help you with:\n• 🗺️ **Travel planning** to any destination\n• 🍽️ **Restaurant recommendations** with safety analysis\n• 🚗 **Route planning** with traffic & regulatory insights\n• 🌤️ **Weather-aware suggestions**\n• 📍 **Area analysis** for any location\n\nJust tell me where you want to go or what you need!',
      timestamp: new Date(),
    }
  ],
  currentLocation: { lat: 19.0760, lng: 72.8777 }, // Default to Mumbai
  mapMarkers: [],
  isLoading: false,
  streamingMessageId: null,
  selectedDestination: null,
  userPreferences: {
    vehicleType: 'car',
    budget: 'medium',
    radius: 2000,
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        streamingMessageId: action.payload.isStreaming ? action.payload.id : null,
      };

    case 'UPDATE_STREAMING_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id 
            ? { ...msg, content: action.payload.content }
            : msg
        ),
      };

    case 'FINISH_STREAMING':
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id 
            ? { ...msg, isStreaming: false }
            : msg
        ),
        streamingMessageId: null,
      };

    case 'SET_CURRENT_LOCATION':
      return {
        ...state,
        currentLocation: action.payload,
      };

    case 'SET_MAP_MARKERS':
      return {
        ...state,
        mapMarkers: action.payload,
      };

    case 'ADD_MAP_MARKER':
      return {
        ...state,
        mapMarkers: [...state.mapMarkers, action.payload],
      };

    case 'CLEAR_MAP_MARKERS':
      return {
        ...state,
        mapMarkers: [],
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_SELECTED_DESTINATION':
      return {
        ...state,
        selectedDestination: action.payload,
      };

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          ...action.payload,
        },
      };

    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [state.messages[0]], // Keep welcome message
        mapMarkers: [],
        selectedDestination: null,
        streamingMessageId: null,
      };

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// Helper hooks
export function useMessages() {
  const { state } = useApp();
  return state.messages;
}

export function useMapMarkers() {
  const { state } = useApp();
  return state.mapMarkers;
}

export function useCurrentLocation() {
  const { state } = useApp();
  return state.currentLocation;
}

export function useUserPreferences() {
  const { state, dispatch } = useApp();
  return {
    preferences: state.userPreferences,
    updatePreferences: (prefs: Partial<AppState['userPreferences']>) =>
      dispatch({ type: 'UPDATE_PREFERENCES', payload: prefs }),
  };
}