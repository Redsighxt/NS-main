import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useRef,
} from "react";

export interface MusicState {
  // Current music info
  currentTrack: {
    title: string;
    source: "local" | "youtube";
    url: string;
    duration?: number;
  } | null;

  // Playback state
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  volume: number; // 0-100
  isLooping: boolean;

  // Local music library
  localTracks: Array<{
    id: string;
    title: string;
    file: File;
    url: string;
    duration?: number;
  }>;

  // YouTube integration
  youtubeUrl: string;
  youtubeVideoId: string | null;

  // UI state
  showYouTubeInput: boolean;
}

type MusicAction =
  | { type: "PLAY_TRACK"; track: MusicState["currentTrack"] }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "STOP" }
  | { type: "SET_CURRENT_TIME"; time: number }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "TOGGLE_LOOP" }
  | { type: "ADD_LOCAL_TRACK"; track: MusicState["localTracks"][0] }
  | { type: "REMOVE_LOCAL_TRACK"; trackId: string }
  | { type: "SET_YOUTUBE_URL"; url: string }
  | { type: "SET_YOUTUBE_VIDEO_ID"; videoId: string | null }
  | { type: "TOGGLE_YOUTUBE_INPUT" }
  | { type: "CLEAR_YOUTUBE" };

const initialState: MusicState = {
  currentTrack: null,
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  volume: 70,
  isLooping: false,
  localTracks: [],
  youtubeUrl: "",
  youtubeVideoId: null,
  showYouTubeInput: false,
};

function musicReducer(state: MusicState, action: MusicAction): MusicState {
  switch (action.type) {
    case "PLAY_TRACK":
      return {
        ...state,
        currentTrack: action.track,
        isPlaying: true,
        isPaused: false,
        currentTime: 0,
      };

    case "PLAY":
      return {
        ...state,
        isPlaying: true,
        isPaused: false,
      };

    case "PAUSE":
      return {
        ...state,
        isPlaying: false,
        isPaused: true,
      };

    case "STOP":
      return {
        ...state,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      };

    case "SET_CURRENT_TIME":
      return {
        ...state,
        currentTime: action.time,
      };

    case "SET_VOLUME":
      return {
        ...state,
        volume: Math.max(0, Math.min(100, action.volume)),
      };

    case "TOGGLE_LOOP":
      return {
        ...state,
        isLooping: !state.isLooping,
      };

    case "ADD_LOCAL_TRACK":
      return {
        ...state,
        localTracks: [...state.localTracks, action.track],
      };

    case "REMOVE_LOCAL_TRACK":
      return {
        ...state,
        localTracks: state.localTracks.filter(
          (track) => track.id !== action.trackId,
        ),
        currentTrack:
          state.currentTrack?.source === "local" &&
          state.localTracks.find((t) => t.id === action.trackId)
            ? null
            : state.currentTrack,
      };

    case "SET_YOUTUBE_URL":
      return {
        ...state,
        youtubeUrl: action.url,
      };

    case "SET_YOUTUBE_VIDEO_ID":
      return {
        ...state,
        youtubeVideoId: action.videoId,
      };

    case "TOGGLE_YOUTUBE_INPUT":
      return {
        ...state,
        showYouTubeInput: !state.showYouTubeInput,
      };

    case "CLEAR_YOUTUBE":
      return {
        ...state,
        youtubeUrl: "",
        youtubeVideoId: null,
        currentTrack:
          state.currentTrack?.source === "youtube" ? null : state.currentTrack,
      };

    default:
      return state;
  }
}

interface MusicContextType {
  state: MusicState;
  dispatch: React.Dispatch<MusicAction>;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(musicReducer, initialState);
  const audioRef = useRef<HTMLAudioElement>(null);

  return (
    <MusicContext.Provider value={{ state, dispatch, audioRef }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
}
