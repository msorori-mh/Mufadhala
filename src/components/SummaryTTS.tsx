import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";

interface SummaryTTSProps {
  text: string;
}

const SPEEDS = [1, 1.25, 1.5] as const;

/** Split text into sentence-like chunks to avoid Chrome's ~15s cutoff */
function splitIntoChunks(text: string): string[] {
  // Split on Arabic sentence endings, or fall back to ~200 char chunks
  const sentences = text.split(/(?<=[.!?،؛\n])\s*/);
  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    if ((current + " " + s).length > 200 && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = current ? current + " " + s : s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

/** Pick the best Arabic voice with priority: Google > local > any */
function pickArabicVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const arVoices = voices.filter((v) => v.lang.startsWith("ar"));
  if (!arVoices.length) return null;

  // Prefer Google voices (higher quality)
  const google = arVoices.find((v) => v.name.toLowerCase().includes("google"));
  if (google) return google;

  // Then prefer non-local (network) voices
  const remote = arVoices.find((v) => !v.localService);
  if (remote) return remote;

  return arVoices[0];
}

const SummaryTTS = ({ text }: SummaryTTSProps) => {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [voicesReady, setVoicesReady] = useState(false);
  const chunksRef = useRef<string[]>([]);
  const chunkIdxRef = useRef(0);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  // Wait for voices to load (async on some browsers)
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const check = () => {
      if (window.speechSynthesis.getVoices().length > 0) {
        setVoicesReady(true);
      }
    };
    check();
    window.speechSynthesis.addEventListener("voiceschanged", check);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", check);
    };
  }, []);

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    window.speechSynthesis?.cancel();
    clearKeepAlive();
    setPlaying(false);
    setLoading(false);
  }, [clearKeepAlive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      clearKeepAlive();
    };
  }, [clearKeepAlive]);

  const speakChunk = useCallback(
    (idx: number, rate: number) => {
      if (idx >= chunksRef.current.length) {
        clearKeepAlive();
        setPlaying(false);
        return;
      }

      const utter = new SpeechSynthesisUtterance(chunksRef.current[idx]);
      utter.lang = "ar";
      utter.rate = rate;

      const voice = pickArabicVoice();
      if (voice) utter.voice = voice;

      utter.onstart = () => {
        setLoading(false);
      };

      utter.onend = () => {
        if (stoppedRef.current) return;
        chunkIdxRef.current = idx + 1;
        speakChunk(idx + 1, rate);
      };

      utter.onerror = (e) => {
        // "interrupted" is normal when we cancel
        if (e.error === "interrupted" || e.error === "canceled") return;
        clearKeepAlive();
        setPlaying(false);
        setLoading(false);
      };

      window.speechSynthesis.speak(utter);
    },
    [clearKeepAlive]
  );

  const startPlaying = useCallback(
    (rate: number) => {
      window.speechSynthesis.cancel();
      stoppedRef.current = false;
      chunksRef.current = splitIntoChunks(text);
      chunkIdxRef.current = 0;

      setLoading(true);
      setPlaying(true);

      // Chrome keep-alive workaround: pause/resume every 10s
      clearKeepAlive();
      keepAliveRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      speakChunk(0, rate);
    },
    [text, speakChunk, clearKeepAlive]
  );

  const toggle = useCallback(() => {
    if (!window.speechSynthesis) return;
    if (playing) {
      stop();
      return;
    }
    startPlaying(SPEEDS[speedIdx]);
  }, [playing, speedIdx, stop, startPlaying]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (playing) {
      stop();
      // Small delay to let cancel finish
      setTimeout(() => startPlaying(SPEEDS[next]), 50);
    }
  }, [speedIdx, playing, stop, startPlaying]);

  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  return (
    <div className="flex items-center gap-2 mb-3">
      <Button
        variant={playing ? "default" : "outline"}
        size="sm"
        onClick={toggle}
        disabled={loading && !playing}
        className="gap-1.5 text-xs"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            جاري التحميل...
          </>
        ) : playing ? (
          <>
            <VolumeX className="w-3.5 h-3.5" />
            إيقاف
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5" />
            استماع إلى الملخص
          </>
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
      {!voicesReady && (
        <span className="text-[10px] text-muted-foreground">
          جاري تحميل الأصوات...
        </span>
      )}
    </div>
  );
};

export default SummaryTTS;
