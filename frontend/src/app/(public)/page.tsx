import { CitySearchForm } from "@/components/public/city-search-form";

export default function LandingPage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Encontre e agende perto de você
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Busque estabelecimentos na sua cidade, veja os serviços e horários disponíveis e agende
        online. Você só precisa entrar na hora de confirmar.
      </p>
      <div className="w-full max-w-2xl">
        <CitySearchForm />
      </div>
    </section>
  );
}
