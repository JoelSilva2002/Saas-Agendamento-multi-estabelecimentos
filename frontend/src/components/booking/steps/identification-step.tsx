import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldGroup } from "@/components/ui/field";
import { TextField } from "@/components/booking/text-field";
import type { AuthMode } from "@/lib/booking/types";
import type { BookingStepProps } from "@/components/booking/step-props";

export function IdentificationStep({ form, authError }: BookingStepProps & { authError?: string }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const authMode = watch("authMode");

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Identifique-se</h2>
        <p className="text-sm text-muted-foreground">
          Entre com sua conta ou crie uma em poucos segundos.
        </p>
      </div>

      <Tabs
        value={authMode}
        onValueChange={(value) => setValue("authMode", value as AuthMode, { shouldValidate: true })}
      >
        <TabsList className="w-full">
          <TabsTrigger value="login" className="flex-1">
            Entrar
          </TabsTrigger>
          <TabsTrigger value="register" className="flex-1">
            Criar conta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-4">
          <FieldGroup>
            <TextField
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              registration={register("email")}
              error={errors.email?.message}
            />
            <TextField
              label="Senha"
              type="password"
              autoComplete="current-password"
              registration={register("password")}
              error={errors.password?.message}
            />
          </FieldGroup>
        </TabsContent>

        <TabsContent value="register" className="mt-4">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Nome"
                autoComplete="given-name"
                registration={register("firstName")}
                error={errors.firstName?.message}
              />
              <TextField
                label="Sobrenome"
                autoComplete="family-name"
                registration={register("lastName")}
                error={errors.lastName?.message}
              />
            </div>
            <TextField
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              registration={register("email")}
              error={errors.email?.message}
            />
            <TextField
              label="Telefone"
              type="tel"
              autoComplete="tel"
              placeholder="(11) 91234-5678"
              registration={register("phone")}
              error={errors.phone?.message}
            />
            <TextField
              label="Senha"
              type="password"
              autoComplete="new-password"
              registration={register("password")}
              error={errors.password?.message}
            />
          </FieldGroup>
        </TabsContent>
      </Tabs>

      {authError && (
        <Alert variant="destructive">
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
