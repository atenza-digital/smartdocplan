import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type KanbanColumnDef = {
  key: string;
  label: string;
  color: string;
  textColor: string;
  bg: string;
  border: string;
};

export function KanbanColumn({
  column,
  count,
  dimmed,
  children,
}: {
  column: KanbanColumnDef;
  count: number;
  dimmed: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key, disabled: dimmed });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 flex-col rounded-xl border ${column.border} ${column.bg} transition-opacity ${
        dimmed ? "opacity-40" : ""
      } ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-inherit px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${column.color}`} />
          <span className={`text-sm font-semibold ${column.textColor}`}>{column.label}</span>
        </div>
        <Badge variant="outline" className={`border-current text-xs ${column.textColor}`}>
          {count}
        </Badge>
      </div>
      <div className="max-h-[calc(100vh-300px)] min-h-24 flex-1 space-y-2 overflow-y-auto p-3">{children}</div>
    </div>
  );
}

export function KanbanCard({
  item,
  canDrag,
  onOpen,
  children,
}: {
  item: { id: number; status: string };
  canDrag: boolean;
  onOpen: () => void;
  children: ReactNode;
}) {
  // O card que acompanha o cursor é desenhado pelo KanbanDragOverlay; aqui fica só o espaço de origem.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { status: item.status },
    disabled: !canDrag,
  });
  return (
    <Card
      ref={setNodeRef}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      aria-roledescription={canDrag ? "card arrastável" : undefined}
      className={`border-border/60 bg-background/80 transition-shadow hover:border-primary/30 hover:shadow-md ${
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${isDragging ? "border-dashed border-primary/50 opacity-40" : ""}`}
      onClick={onOpen}
    >
      {children}
    </Card>
  );
}

/** Card arrastado, renderizado no <body> para não ser cortado pelas colunas com rolagem. */
export function KanbanDragOverlay({ children }: { children: ReactNode | null }) {
  return createPortal(
    <DragOverlay dropAnimation={null} zIndex={60}>
      {children ? (
        <Card className="w-[264px] rotate-2 cursor-grabbing border-primary/40 bg-background shadow-xl">{children}</Card>
      ) : null}
    </DragOverlay>,
    document.body
  );
}
