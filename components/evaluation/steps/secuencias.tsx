import { useState, useRef } from "react";
import { SecuenciasProps } from "../types";
import type { SequenceItem } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListOrdered, GripVertical, ChevronRight, CheckCircle2, XCircle } from "lucide-react";

const SecuenciasStep = ({ items, onOrderSubmit, onNext, onPrev }: SecuenciasProps) => {
  const [orderedItems, setOrderedItems] = useState<SequenceItem[]>(() =>
    [...items].sort(() => Math.random() - 0.5)
  );
  const [verified, setVerified] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const startTime = useRef(Date.now());

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (verified) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex === null) return;
    if (draggedIndex !== index) setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const fromIndex = draggedIndex;
    if (fromIndex === null || fromIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }
    const newOrder = [...orderedItems];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(dropIndex, 0, removed);
    setOrderedItems(newOrder);
    setDraggedIndex(null);
  };

  const handleVerify = () => {
    const correct = orderedItems.every((item, i) => item.correctOrder === i + 1);
    setIsCorrect(correct);
    setVerified(true);
  };

  const handleContinue = () => {
    onOrderSubmit(orderedItems.map((i) => i.id));
    onNext();
  };

  const handleRetry = () => {
    setVerified(false);
    setIsCorrect(false);
    setOrderedItems([...items].sort(() => Math.random() - 0.5));
  };

  return (
    <div className="space-y-6 animate-pop-in">
      <div className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-step-secuencias/10">
            <ListOrdered className="h-6 w-6 text-step-secuencias" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Secuencias</p>
            <p className="font-display text-lg font-bold text-foreground">
              Ordena los eventos del cuento
            </p>
          </div>
        </div>
        <Badge className="bg-step-secuencias/10 text-step-secuencias border-0 text-base px-4 py-2">
          {orderedItems.length} eventos
        </Badge>
      </div>

      <p className="text-center text-base text-muted-foreground">
        Arrastra y suelta cada tarjeta para ordenar los eventos del cuento
      </p>

      <div className="space-y-3">
        {orderedItems.map((item, index) => {
          const isCorrectPos = verified && item.correctOrder === index + 1;
          const isWrongPos = verified && item.correctOrder !== index + 1;
          const isDragging = draggedIndex === index;
          const isDropTarget = dragOverIndex === index;

          return (
            <Card
              key={item.id}
              draggable={!verified}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`rounded-2xl border-2 transition-all duration-300 cursor-grab active:cursor-grabbing select-none ${
                verified ? "cursor-default" : ""
              } ${
                isCorrectPos
                  ? "border-success bg-success/5"
                  : isWrongPos
                  ? "border-destructive bg-destructive/5"
                  : isDropTarget
                  ? "border-step-secuencias ring-2 ring-step-secuencias/40 bg-step-secuencias/5"
                  : "border-muted shadow-card"
              } ${isDragging ? "opacity-50" : ""}`}
            >
              <CardContent className="flex items-center gap-3 p-4">
                {!verified && (
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-step-secuencias transition-colors"
                    aria-hidden
                  >
                    <GripVertical className="h-6 w-6" />
                  </span>
                )}
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold ${
                  isCorrectPos
                    ? "bg-success/10 text-success"
                    : isWrongPos
                    ? "bg-destructive/10 text-destructive"
                    : "bg-step-secuencias/10 text-step-secuencias"
                }`}>
                  {index + 1}
                </span>
                <p className="flex-1 text-base font-medium text-foreground md:text-lg">{item.text}</p>
                {isCorrectPos && <CheckCircle2 className="h-6 w-6 text-success shrink-0" />}
                {isWrongPos && <XCircle className="h-6 w-6 text-destructive shrink-0" />}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {verified && (
        <div className={`rounded-2xl p-4 text-center text-lg font-bold ${
          isCorrect ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        }`}>
          {isCorrect ? "🎉 ¡Orden correcto! ¡Muy bien!" : "😅 El orden no es correcto. ¡Inténtalo de nuevo!"}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" size="lg" className="rounded-xl px-6 py-5 text-base" onClick={onPrev}>
          ← Anterior
        </Button>
        <div className="flex gap-3">
          {verified && !isCorrect && (
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl px-6 py-5 text-base"
              onClick={handleRetry}
            >
              Reintentar
            </Button>
          )}
          {!verified ? (
            <Button
              size="lg"
              className="gap-2 rounded-xl bg-step-secuencias px-8 py-5 text-base font-bold text-primary-foreground shadow-button hover:opacity-90 transition-all"
              onClick={handleVerify}
            >
              Verificar orden
            </Button>
          ) : (
            <Button
              size="lg"
              className="gap-2 rounded-xl bg-step-secuencias px-8 py-5 text-base font-bold text-primary-foreground shadow-button hover:opacity-90 transition-all"
              onClick={handleContinue}
            >
              Ver resultados
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecuenciasStep;
