"use client";

import { useTheme } from "next-themes";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEstablishmentTheme } from "@/components/providers/establishment-theme-provider";
import { isValidHexColor } from "@/lib/color";

const PRESET_COLORS = ["#4f46e5", "#0ea5e9", "#16a34a", "#d97706", "#dc2626", "#db2777"];

export default function TemaPage() {
  const { theme, setTheme } = useTheme();
  const { color, setColor } = useEstablishmentTheme();
  const [draft, setDraft] = useState(color ?? "");

  const applyColor = (hex: string) => {
    if (!isValidHexColor(hex)) return;
    setColor(hex);
    setDraft(hex);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tema</h1>
        <p className="text-sm text-muted-foreground">
          Modo de exibição e cor de marca do estabelecimento, aplicada ao painel e à página
          pública de agendamento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modo de exibição</CardTitle>
          <CardDescription>Claro, escuro ou de acordo com o sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecione um tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Escuro</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cor de marca</CardTitle>
          <CardDescription>
            Usada em botões, links e destaques do painel e da agenda pública deste
            estabelecimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-label={`Usar cor ${preset}`}
                onClick={() => applyColor(preset)}
                className="size-8 rounded-full ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                style={{ backgroundColor: preset }}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand-color-picker">Personalizada</Label>
              <input
                id="brand-color-picker"
                type="color"
                value={isValidHexColor(draft) ? draft : "#4f46e5"}
                onChange={(e) => applyColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand-color-hex">Código hexadecimal</Label>
              <Input
                id="brand-color-hex"
                value={draft}
                placeholder="#4f46e5"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => applyColor(draft)}
                className="w-32"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setColor(null);
                setDraft("");
              }}
            >
              Restaurar padrão
            </Button>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-4">
            <span className="text-sm text-muted-foreground">Pré-visualização:</span>
            <Button>Agendar horário</Button>
            <Button variant="outline">Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
