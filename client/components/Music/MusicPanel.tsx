import React, { useState, useEffect, useCallback } from "react";
import { useMusic } from "../../contexts/MusicContext";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Separator } from "../ui/separator";
import {
  Music,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Repeat,
  Video,
  Trash2,
} from "lucide-react";
import { cn } from "../../lib/utils";

export function MusicPanel() {
  const { state, dispatch, audioRef } = useMusic();
  const [youtubeLinkInput, setYoutubeLinkInput] = useState("");
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState("0:00");
  const [durationDisplay, setDurationDisplay] = useState("0:00");

  // YouTube API integration
  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleYouTubeSubmit = () => {
    const videoId = extractYouTubeVideoId(youtubeLinkInput);
    if (videoId) {
      dispatch({ type: "SET_YOUTUBE_VIDEO_ID", videoId });
      dispatch({ type: "SET_YOUTUBE_URL", url: youtubeLinkInput });

      // Create YouTube track
      const youtubeTrack = {
        title: `YouTube: ${videoId}`,
        source: "youtube" as const,
        url: youtubeLinkInput,
      };

      dispatch({ type: "PLAY_TRACK", track: youtubeTrack });
      setYoutubeLinkInput("");
    }
  };

  const handleLocalMusicUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const supportedFormats = [".mp3", ".wav", ".ogg", ".m4a", ".aac"];
      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf("."));

      if (supportedFormats.includes(fileExtension)) {
        const url = URL.createObjectURL(file);
        const trackId = `local_${Date.now()}_${i}`;

        const track = {
          id: trackId,
          title: file.name.replace(/\.[^/.]+$/, ""),
          file,
          url,
        };

        dispatch({ type: "ADD_LOCAL_TRACK", track });
      }
    }

    // Clear the input
    event.target.value = "";
  };

  const handlePlayLocalTrack = (track: any) => {
    const localTrack = {
      title: track.title,
      source: "local" as const,
      url: track.url,
    };
    dispatch({ type: "PLAY_TRACK", track: localTrack });
  };

  const handleRemoveLocalTrack = (trackId: string) => {
    dispatch({ type: "REMOVE_LOCAL_TRACK", trackId });
  };

  // Audio controls
  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
      dispatch({ type: "PLAY" });
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      dispatch({ type: "PAUSE" });
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      dispatch({ type: "STOP" });
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const volume = value[0];
    dispatch({ type: "SET_VOLUME", volume });
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  };

  const handleSeek = (value: number[]) => {
    const time = value[0];
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      dispatch({ type: "SET_CURRENT_TIME", time });
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      dispatch({ type: "SET_CURRENT_TIME", time: audio.currentTime });
      setCurrentTimeDisplay(formatTime(audio.currentTime));
    };

    const handleLoadedMetadata = () => {
      setDurationDisplay(formatTime(audio.duration || 0));
    };

    const handleEnded = () => {
      if (state.isLooping) {
        audio.currentTime = 0;
        audio.play();
      } else {
        dispatch({ type: "STOP" });
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [state.isLooping, dispatch]);

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current && state.currentTrack) {
      if (state.currentTrack.source === "local") {
        audioRef.current.src = state.currentTrack.url;
        audioRef.current.volume = state.volume / 100;
      }
    }
  }, [state.currentTrack, state.volume]);

  return (
    <>
      <AnimatedFloatingPanel
        id="music-player"
        title="Music Player"
        defaultPosition={{ x: 50, y: 200 }}
        defaultSize={{ width: 350, height: 550 }}
        icon={Music}
      >
        <div className="space-y-4 p-4">
          {/* Current Track Display */}
          {state.currentTrack && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Now Playing</Label>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium truncate">
                  {state.currentTrack.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {state.currentTrack.source === "youtube"
                    ? "YouTube"
                    : "Local File"}
                </div>
              </div>
            </div>
          )}

          {/* Playback Controls */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Controls</Label>
            <div className="flex items-center justify-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleStop}
                disabled={!state.currentTrack}
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={state.isPlaying ? handlePause : handlePlay}
                disabled={!state.currentTrack}
              >
                {state.isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant={state.isLooping ? "default" : "outline"}
                onClick={() => dispatch({ type: "TOGGLE_LOOP" })}
              >
                <Repeat className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            {state.currentTrack && (
              <div className="space-y-2">
                <Slider
                  value={[state.currentTime]}
                  onValueChange={handleSeek}
                  min={0}
                  max={audioRef.current?.duration || 100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{currentTimeDisplay}</span>
                  <span>{durationDisplay}</span>
                </div>
              </div>
            )}

            {/* Volume Control */}
            <div className="space-y-2">
              <Label className="text-xs">Volume: {state.volume}%</Label>
              <div className="flex items-center space-x-2">
                {state.volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                )}
                <Slider
                  value={[state.volume]}
                  onValueChange={handleVolumeChange}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* YouTube Integration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">YouTube Music</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => dispatch({ type: "TOGGLE_YOUTUBE_INPUT" })}
              >
                <Video className="h-4 w-4" />
              </Button>
            </div>

            {state.showYouTubeInput && (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Paste YouTube URL here..."
                    value={youtubeLinkInput}
                    onChange={(e) => setYoutubeLinkInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleYouTubeSubmit}>
                    Play
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Supports youtube.com and youtu.be links
                </div>
              </div>
            )}

            {state.youtubeVideoId && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground">
                  YouTube Player
                </div>
                <div className="mt-2">
                  <iframe
                    width="100%"
                    height="180"
                    src={`https://www.youtube.com/embed/${state.youtubeVideoId}?autoplay=1&loop=${state.isLooping ? 1 : 0}&playlist=${state.youtubeVideoId}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => dispatch({ type: "CLEAR_YOUTUBE" })}
                  className="mt-2 w-full"
                >
                  Clear YouTube
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Local Music */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Local Music Library</Label>

            <div className="space-y-2">
              <Input
                type="file"
                accept=".mp3,.wav,.ogg,.m4a,.aac"
                onChange={handleLocalMusicUpload}
                className="text-xs"
                multiple
              />
              <div className="text-xs text-muted-foreground">
                Supports: MP3, WAV, OGG, M4A, AAC
              </div>
            </div>

            {/* Local Tracks List */}
            {state.localTracks.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {state.localTracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between bg-muted/50 p-2 rounded text-xs"
                  >
                    <span className="flex-1 truncate">{track.title}</span>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePlayLocalTrack(track)}
                        className="h-6 w-6 p-0"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveLocalTrack(track.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AnimatedFloatingPanel>

      {/* Hidden audio element for local music playback */}
      <audio ref={audioRef} style={{ display: "none" }} />
    </>
  );
}
