import type { Client, Employee, Service } from "./types";

export const MOCK_SERVICES: Service[] = [
  {
    id: "svc-corte",
    name: "Corte de cabelo",
    description: "Corte na tesoura ou máquina, inclui lavagem",
    price: 50,
    durationMinutes: 30,
  },
  {
    id: "svc-barba",
    name: "Barba",
    description: "Modelagem e acabamento com navalha",
    price: 35,
    durationMinutes: 20,
  },
  {
    id: "svc-combo",
    name: "Corte + Barba",
    description: "Combo completo",
    price: 75,
    durationMinutes: 50,
  },
  {
    id: "svc-coloracao",
    name: "Coloração",
    description: "Aplicação de coloração e finalização",
    price: 120,
    durationMinutes: 90,
  },
];

export const MOCK_EMPLOYEES: Employee[] = [
  { id: "emp-ana", userId: "user-ana", jobTitle: "Cabeleireira", displayName: "Ana Souza" },
  { id: "emp-bruno", userId: "user-bruno", jobTitle: "Barbeiro", displayName: "Bruno Lima" },
  { id: "emp-carla", userId: "user-carla", jobTitle: "Cabeleireira", displayName: "Carla Dias" },
];

// Which employees offer which service — mirrors the eligible-employees
// endpoint (GET .../services/:id/employees) instead of a flat "all offer
// everything" assumption.
export const ELIGIBLE_EMPLOYEES_BY_SERVICE: Record<string, string[]> = {
  "svc-corte": ["emp-ana", "emp-bruno", "emp-carla"],
  "svc-barba": ["emp-bruno"],
  "svc-combo": ["emp-bruno"],
  "svc-coloracao": ["emp-ana", "emp-carla"],
};

export const MOCK_CLIENTS: Client[] = [
  { id: "client-joao", displayName: "João Pereira", phone: "(11) 91234-5678" },
  { id: "client-maria", displayName: "Maria Fernandes", phone: "(11) 92345-6789" },
  { id: "client-pedro", displayName: "Pedro Alves", phone: "(11) 93456-7890" },
  { id: "client-julia", displayName: "Júlia Rocha", phone: "(11) 94567-8901" },
];
