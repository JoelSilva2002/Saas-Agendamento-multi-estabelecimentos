"use client";

import { MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listCities } from "@/lib/public/api";

const ANY_CITY = "all";

export function CitySearchForm({
  initialCity = "",
  initialSearch = "",
  size = "lg",
}: {
  initialCity?: string;
  initialSearch?: string;
  size?: "lg" | "sm";
}) {
  const router = useRouter();
  const [cities, setCities] = useState<string[]>([]);
  const [city, setCity] = useState(initialCity || ANY_CITY);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    listCities()
      .then(setCities)
      // A failure here just means no city dropdown options — the free-text search still works,
      // so there is nothing worth interrupting the visitor with.
      .catch(() => setCities([]));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city && city !== ANY_CITY) params.set("cidade", city);
    if (search.trim()) params.set("busca", search.trim());
    router.push(`/buscar${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
    >
      <Select value={city} onValueChange={setCity}>
        <SelectTrigger className={size === "lg" ? "h-11 sm:w-56" : "sm:w-48"}>
          <MapPin className="size-4 text-muted-foreground" />
          <SelectValue placeholder="Cidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_CITY}>Todas as cidades</SelectItem>
          {cities.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome do estabelecimento"
        className={size === "lg" ? "h-11 flex-1" : "flex-1"}
        aria-label="Buscar por nome do estabelecimento"
      />

      <Button type="submit" size={size === "lg" ? "lg" : "default"}>
        <Search />
        Buscar
      </Button>
    </form>
  );
}
