import { useState } from "react";
import { VocabularioProps, VocabularyMatch } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Languages, ChevronRight, Link2 } from "lucide-react";

const VocabularioStep = ({ pairs, onMatchesSubmit, onNext, onPrev }: VocabularioProps) => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matches, setMatches] = useState<VocabularyMatch[]>([]);

  // Shuffle definitions once
  const [shuffledDefs] = useState(() =>
    [...pairs].sort(() => Math.random() - 0.5)
  );

  const matchedWordIds = matches.map((m) => m.wordId);
  const matchedDefIds = matches.map((m) => m.selectedDefinitionId);

  const handleWordClick = (wordId: string) => {
    if (matchedWordIds.includes(wordId)) return;
    setSelectedWord(selectedWord === wordId ? null : wordId);
  };

  const handleDefClick = (defId: string) => {
    if (matchedDefIds.includes(defId) || !selectedWord) return;
    const newMatch: VocabularyMatch = {
      wordId: selectedWord,
      selectedDefinitionId: defId,
      correct: pairs.find((p) => p.id === selectedWord)?.id === defId,
    };
    const updated = [...matches, newMatch];
    setMatches(updated);
    setSelectedWord(null);
  };

  const allMatched = matches.length === pairs.length;

  const handleContinue = () => {
    onMatchesSubmit(matches);
    onNext();
  };

  const getMatchColor = (id: string, type: "word" | "def") => {
    const idx = type === "word"
      ? matches.findIndex((m) => m.wordId === id)
      : matches.findIndex((m) => m.selectedDefinitionId === id);
    if (idx === -1) return "";
    const colors = [
      "bg-step-lectura/10 border-step-lectura",
      "bg-step-comprension/10 border-step-comprension",
      "bg-step-inferencia/10 border-step-inferencia",
      "bg-step-vocabulario/10 border-step-vocabulario",
      "bg-step-secuencias/10 border-step-secuencias",
    ];
    return colors[idx % colors.length];
  };

  return (
    <div className="space-y-6 animate-pop-in">
      <div className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-step-vocabulario/10">
            <Languages className="h-6 w-6 text-step-vocabulario" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Vocabulario</p>
            <p className="font-display text-lg font-bold text-foreground">
              Une cada palabra con su significado
            </p>
          </div>
        </div>
        <Badge className="bg-step-vocabulario/10 text-step-vocabulario border-0 text-base px-4 py-2">
          <Link2 className="h-4 w-4 mr-1" />
          {matches.length}/{pairs.length}
        </Badge>
      </div>

      {selectedWord && (
        <div className="rounded-xl bg-step-vocabulario/5 border border-step-vocabulario/20 p-3 text-center text-sm font-medium text-step-vocabulario">
          Ahora selecciona el significado correcto →
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Words column */}
        <div className="space-y-3">
          <h4 className="font-display text-base font-bold text-muted-foreground px-2">📝 Palabras</h4>
          {pairs.map((pair) => {
            const isMatched = matchedWordIds.includes(pair.id);
            const isSelected = selectedWord === pair.id;
            return (
              <button
                key={pair.id}
                disabled={isMatched}
                onClick={() => handleWordClick(pair.id)}
                className={`w-full rounded-2xl border-2 p-4 text-left text-lg font-bold transition-all duration-200 ${
                  isMatched
                    ? `${getMatchColor(pair.id, "word")} opacity-70`
                    : isSelected
                    ? "border-step-vocabulario bg-step-vocabulario/10 ring-2 ring-step-vocabulario/30"
                    : "border-muted hover:border-step-vocabulario/50 bg-card"
                }`}
              >
                {pair.word}
              </button>
            );
          })}
        </div>

        {/* Definitions column */}
        <div className="space-y-3">
          <h4 className="font-display text-base font-bold text-muted-foreground px-2">📖 Significados</h4>
          {shuffledDefs.map((pair) => {
            const isMatched = matchedDefIds.includes(pair.id);
            return (
              <button
                key={pair.id}
                disabled={isMatched || !selectedWord}
                onClick={() => handleDefClick(pair.id)}
                className={`w-full rounded-2xl border-2 p-4 text-left text-base transition-all duration-200 ${
                  isMatched
                    ? `${getMatchColor(pair.id, "def")} opacity-70`
                    : selectedWord
                    ? "border-muted hover:border-step-vocabulario/50 bg-card cursor-pointer"
                    : "border-muted bg-card opacity-50"
                }`}
              >
                {pair.definition}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="lg" className="rounded-xl px-6 py-5 text-base" onClick={onPrev}>
          ← Anterior
        </Button>
        <Button
          size="lg"
          disabled={!allMatched}
          className="gap-2 rounded-xl bg-step-vocabulario px-8 py-5 text-base font-bold text-accent-foreground shadow-button hover:opacity-90 transition-all disabled:opacity-40"
          onClick={handleContinue}
        >
          Continuar
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default VocabularioStep;
