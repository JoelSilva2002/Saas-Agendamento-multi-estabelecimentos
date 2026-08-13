import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  Clock,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Palette,
  Scissors,
  Settings,
  Star,
  Ticket,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";

export type AdminNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

// Mirrors the backend modules 1:1 (appointments, waitlist, clients,
// employees, services, coupons, reviews, payments, reports, users/theme)
// so every module built across Fases 1-6 has a home in the admin shell.
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Operação",
    items: [
      { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
      { title: "Agenda", url: "/admin/agenda", icon: CalendarDays },
      { title: "Lista de Espera", url: "/admin/lista-de-espera", icon: Clock },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { title: "Clientes", url: "/admin/clientes", icon: Users },
      { title: "Funcionários", url: "/admin/funcionarios", icon: UserCog },
      { title: "Serviços", url: "/admin/servicos", icon: Scissors },
    ],
  },
  {
    label: "Comercial",
    items: [
      { title: "Pagamentos", url: "/admin/pagamentos", icon: CreditCard },
      { title: "Cupons", url: "/admin/cupons", icon: Ticket },
      { title: "Avaliações", url: "/admin/avaliacoes", icon: Star },
    ],
  },
  {
    label: "Relatórios",
    items: [{ title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 }],
  },
  {
    label: "Configurações",
    items: [
      { title: "Estabelecimento", url: "/admin/configuracoes", icon: Settings },
      { title: "Minha Conta", url: "/admin/configuracoes/conta", icon: UserRound },
      { title: "Tema", url: "/admin/configuracoes/tema", icon: Palette },
      { title: "Integrações", url: "/admin/configuracoes/integracoes", icon: KeyRound },
    ],
  },
];
