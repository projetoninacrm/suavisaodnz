import { Loader2, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AccountMenuProps = {
  accountEmail: string | null;
  isSigningOut: boolean;
  onLogout: () => void | Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AccountMenu({
  accountEmail,
  isSigningOut,
  onLogout,
  open,
  onOpenChange,
}: AccountMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={(
          <Button variant="ghost" size="icon" aria-label="Abrir menu da conta" title="Conta" disabled={isSigningOut}>
            <UserRound className="size-4" aria-hidden="true" />
          </Button>
        )}
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="block font-medium">Conta da loja</span>
            <span className="block break-all text-xs text-muted-foreground">{accountEmail ?? "Sessão ativa"}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void onLogout()} disabled={isSigningOut}>
            {isSigningOut ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
            {isSigningOut ? "Saindo da conta…" : "Sair da conta"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
