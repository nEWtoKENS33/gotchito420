"use client";

type Mood = "idle" | "happy" | "hungry" | "playing" | "healing";

const GIFS: Record<Mood, string> = {
  idle:    "/gifs/alien_idle_transparent.gif",  // o /gifs/alien_idle.gif si lo renombras
  happy:   "/gifs/alien_happy.gif",
  hungry:  "/gifs/alien_hungry.gif",
  playing: "/gifs/alien_playing.gif",
  healing: "/gifs/alien_healing.gif",
};

export default function PetAvatar({
  mood = "idle",
  size = 256,
  className = "",
}: {
  mood?: Mood;
  size?: number;
  className?: string;
}) {
  const src = GIFS[mood] ?? GIFS.idle;
  return (
    <img
      src={src}
      alt={`alien ${mood}`}
      width={size}
      height={size}
      className={className}
      style={{
        imageRendering: "pixelated",        // look retro
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}
