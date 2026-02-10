"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Texto para "Anterior" / "Siguiente" */
  previousLabel?: string;
  nextLabel?: string;
};

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
  previousLabel = "Anterior",
  nextLabel = "Siguiente",
}: PaginationProps) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav
      role="navigation"
      aria-label="Paginación"
      className={cn("flex items-center justify-between gap-2", className)}
    >
      <p className="text-sm text-muted-foreground">
        Página {page} de {totalPages > 0 ? totalPages : 1}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          aria-label={previousLabel}
        >
          <ChevronLeftIcon className="size-4" />
          <span className="sr-only sm:not-sr-only sm:ml-1">{previousLabel}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          aria-label={nextLabel}
        >
          <span className="sr-only sm:not-sr-only sm:mr-1">{nextLabel}</span>
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
