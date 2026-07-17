import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, Wallet, Target, User } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type NavItem = {
  to: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const items: NavItem[] = [
  { to: "/", label: "Início", Icon: Home },
  { to: "/rotina", label: "Rotina", Icon: ListChecks },
  { to: "/financeiro", label: "Financeiro", Icon: Wallet },
  { to: "/objetivos", label: "Objetivos", Icon: Target },
  { to: "/perfil", label: "Perfil", Icon: User },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-md"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        {items.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className="group flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors"
              >
                <Icon
                  className={
                    "h-5 w-5 transition-colors " +
                    (active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")
                  }
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span
                  className={
                    "transition-colors " +
                    (active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")
                  }
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}