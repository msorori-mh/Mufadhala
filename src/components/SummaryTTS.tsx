import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

interface SummaryTTSProps {
  text: string;
}

const SPEEDS = [1, 1.25, 1.5] as const;

const SummaryTTS = ({ text }: SummaryTTSProps) => {
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    utterRef.current = null;
    setPlaying(false);
  }, []);

  // Cleanup on unmount / page leave
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const toggle = useCallback(() => {
    if (!window.speechSynthesis) return;

    if (playing) {
      stop();
      return;
    }

    // Cancel any leftover
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ar";
    utter.rate = SPEEDS[speedIdx];

    // Try to find an Arabic voice
    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find(v => v.lang.startsWith("ar"));
    if (arVoice) utter.voice = arVoice;

    utter.onend = () => setPlaying(false);
    utter.onerror = () => setPlaying(false);

    utterRef.current = utter;
    setPlaying(true);
    window.speechSynthesis.speak(utter);
  }, [playing, text, speedIdx, stop]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    // If currently playing, restart with new speed
    if (playing && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ar";
      utter.rate = SPEEDS[next];
      const voices = window.speechSynthesis.getVoices();
      const arVoice = voices.find(v => v.lang.startsWith("ar"));
      if (arVoice) utter.voice = arVoice;
      utter.onend = () => setPlaying(false);
      utter.onerror = () => setPlaying(false);
      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
    }
  }, [speedIdx, playing, text]);

  // Don't render if SpeechSynthesis not supported
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  return (
    <div className="flex items-center gap-2 mb-3">
      <Button
        variant={playing ? "default" : "outline"}
        size="sm"
        onClick={toggle}
        className="gap-1.5 text-xs"
      >
        {playing ? (
          <><VolumeX className="w-3.5 h-3.5" />إيقاف</>
        ) : (
          <><Volume2 className="w-3.5 h-3.5" />استماع إلى الملخص</>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={cycleSpeed}
        className="text-xs px-2 min-w-[3rem] font-mono text-muted-foreground"
      >
        {SPEEDS[speedIdx]}x
      </Button>
    </div>
  );
};

export default SummaryTTS;
