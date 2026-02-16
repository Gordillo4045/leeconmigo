import { useState, useCallback, useEffect, useRef } from "react";
import { LecturaGuiadaProps, ReadingResult } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Timer, Play, Square } from "lucide-react";

const LecturaGuiadaStep = ({ text, onReadingComplete, onNext }: LecturaGuiadaProps) => {
  const [status, setStatus] = useState<"idle" | "reading" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startReading = useCallback(() => {
    setStatus("reading");
    startRef.current = new Date().toISOString();
    setElapsed(0);
    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
  }, []);

  const stopReading = useCallback(() => {
    setStatus("done");
    if (intervalRef.current) clearInterval(intervalRef.current);
    const result: ReadingResult = {
      readingTime: elapsed,
      startedAt: startRef.current,
      finishedAt: new Date().toISOString(),
    };
    onReadingComplete(result);
  }, [elapsed, onReadingComplete]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 animate-pop-in">
      {/* Timer bar */}
      <div className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-step-lectura/10">
            <Timer className="h-6 w-6 text-step-lectura" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tiempo de lectura</p>
            <p className="font-display text-3xl font-bold text-foreground">{formatTime(elapsed)}</p>
          </div>
        </div>
        {status === "idle" && (
          <Button
            size="lg"
            className="gap-2 rounded-xl bg-step-lectura px-8 py-6 text-lg font-bold text-primary-foreground shadow-button hover:opacity-90 transition-all"
            onClick={startReading}
          >
            <Play className="h-5 w-5" />
            ¡Comencé a leer!
          </Button>
        )}
        {status === "reading" && (
          <Button
            size="lg"
            className="gap-2 rounded-xl bg-success px-8 py-6 text-lg font-bold text-success-foreground shadow-button hover:opacity-90 animate-bounce-soft transition-all"
            onClick={stopReading}
          >
            <Square className="h-5 w-5" />
            ¡Terminé de leer!
          </Button>
        )}
        {status === "done" && (
          <Button
            size="lg"
            className="gap-2 rounded-xl bg-step-lectura px-8 py-6 text-lg font-bold text-primary-foreground shadow-button hover:opacity-90 transition-all"
            onClick={onNext}
          >
            Siguiente →
          </Button>
        )}
      </div>

      {/* Text card */}
      <Card className="overflow-hidden rounded-3xl border-2 border-step-lectura/20 shadow-card">
        <CardHeader className="bg-step-lectura/5 pb-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-step-lectura" />
            <CardTitle className="font-display text-2xl text-foreground">{text.title}</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">{text.wordCount} palabras</p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] p-6 md:p-8">
            <div className="prose max-w-none">
              {text.content.split("\n\n").map((paragraph, i) => (
                <p
                  key={i}
                  className="mb-4 text-lg leading-relaxed text-foreground md:text-xl"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default LecturaGuiadaStep;
