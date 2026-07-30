import { useMemo } from "react";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function NotificationCenter() {
  const [, navigate] = useLocation();
  const { data: items = [], refetch } = trpc.notifications.list.useQuery();
  const { data: unread } = trpc.notifications.unreadCount.useQuery();

  const unreadCount = unread?.total ?? 0;
  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const latestItems = useMemo(() => items.slice(0, 8), [items]);

  const handleOpenItem = async (id: number, link?: string | null) => {
    await markReadMutation.mutateAsync({ id });
    if (link) navigate(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={() => markAllReadMutation.mutate()}
            >
              Marcar tudo como lido
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {latestItems.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhuma notificação no momento.
          </div>
        ) : (
          latestItems.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="block cursor-pointer space-y-1 p-3"
              onClick={() => handleOpenItem(item.id, item.link)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="line-clamp-1 text-sm font-medium">{item.titulo}</p>
                {!item.lidaAt && (
                  <Badge variant="secondary" className="text-[10px]">
                    Nova
                  </Badge>
                )}
              </div>
              {item.mensagem && <p className="line-clamp-2 text-xs text-muted-foreground">{item.mensagem}</p>}
              <p className="text-[11px] text-muted-foreground">
                {new Date(item.createdAt).toLocaleString("pt-BR")}
              </p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
