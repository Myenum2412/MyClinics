"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2 } from "lucide-react";

interface VideoPreviewProps {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
}

export function VideoPreview({
  src,
  poster,
  title,
  className,
  autoPlay = false,
  muted = true,
  loop = false,
  controls = true,
}: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(!video.muted);
    }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!isFullscreen && video) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      }
      setIsFullscreen(true);
    } else if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.currentTime >= video.duration - 0.1 && !loop) {
      setIsPlaying(false);
    }
  };

  if (hasError) {
    return (
      <div className={cn("relative aspect-video rounded-lg bg-muted flex items-center justify-center", className)}>
        <div className="text-center p-4">
          <p className="text-sm text-destructive">Unable to load video</p>
          <p className="text-xs text-muted-foreground mt-1">{title || src}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg bg-black overflow-hidden", className)}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        onLoadedData={handleLoadedData}
        onError={handleError}
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
        className="w-full h-full object-contain"
        aria-label={title || "Video preview"}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="size-8 text-white animate-spin" />
        </div>
      )}

      {controls && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent",
            "flex items-center gap-2 text-white",
            "opacity-0 hover:opacity-100 transition-opacity duration-200",
            "group-hover:opacity-100"
          )}
        >
          <button
            onClick={togglePlay}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </button>
          
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="ml-auto p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="size-4" />
            ) : (
              <Maximize className="size-4" />
            )}
          </button>
        </div>
      )}

      {!controls && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="size-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="size-6 ml-1" />
            ) : (
              <Play className="size-6 ml-1" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

interface AttachmentVideoPreviewProps {
  url: string;
  name: string;
  mimeType: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function AttachmentVideoPreview({
  url,
  name,
  mimeType,
  className,
  size = "md",
}: AttachmentVideoPreviewProps) {
  const isVideo = mimeType?.startsWith("video/") ?? false;
  const sizeClasses = {
    sm: "aspect-video max-h-32",
    md: "aspect-video max-h-64",
    lg: "aspect-video max-h-96",
  };

  if (!isVideo) return null;

  return (
    <VideoPreview
      src={url}
      title={name}
      className={cn(sizeClasses[size], "rounded-lg", className)}
      controls={true}
      muted={true}
    />
  );
}