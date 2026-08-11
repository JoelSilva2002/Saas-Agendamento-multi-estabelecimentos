import { SearchResults } from "@/components/public/search-results";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ cidade?: string; busca?: string }>;
}) {
  const { cidade, busca } = await searchParams;

  return <SearchResults city={cidade} search={busca} />;
}
