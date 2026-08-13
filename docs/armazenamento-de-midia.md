# Armazenamento de mídia (logo e galeria de fotos)

## Contexto

A Fase 26 adicionou upload de logo e galeria de fotos para o estabelecimento. O armazenamento
fica atrás de uma porta — `FileStoragePort` (`src/shared-kernel/domain/file-storage.port.ts`) —
com um único adaptador hoje: disco local (`LocalDiskFileStorageAdapter`), zero configuração,
mesmo padrão do `PaymentGatewayPort` (sandbox) e do `ResendEmailNotifier` (log-mode).

Este documento existe para quando um adaptador de nuvem (S3, Cloudflare R2, etc.) for necessário
— tipicamente ao sair de um único servidor com disco persistente para múltiplas instâncias, ou
para deploy num provedor com disco efêmero.

## O contrato que o novo adaptador precisa cumprir

```ts
export abstract class FileStoragePort {
  abstract put(params: PutObjectParams): Promise<StorageKey>;
  abstract delete(key: StorageKey): Promise<void>;
  abstract read(key: StorageKey): Promise<StoredObject | null>;
  abstract publicUrl(key: StorageKey): string;
}
```

- **`put`** recebe `keyParts: string[]` (segmentos já validados pelo chamador — nunca vêm de
  input do usuário, são sempre `randomUUID()` + ids de rota) e devolve uma **chave opaca**, nunca
  uma URL. As linhas do banco (`establishments.logo_storage_key` etc.,
  `establishment_photos.storage_key`) guardam só essa chave — trocar de adaptador não pode virar
  migração de dados.
- **`delete`** precisa ser idempotente: chave inexistente não é erro. O código chama isso
  best-effort (dentro de `try/catch`, com log em falha) ao trocar/remover logo ou foto — nunca
  deixe uma falha de delete propagar.
- **`read`** devolve `null` quando a chave não existe — usado por `MediaController` para servir
  `GET /media/*` e por qualquer verificação futura de existência.
- **`publicUrl`** é **síncrono e sem I/O** — só concatenação de string. Um adaptador de bucket
  devolveria a URL do bucket/CDN aqui (ex.: `https://cdn.exemplo.com/${key}` ou uma signed URL,
  se mídia privada entrar em escopo — ver "Fora de escopo" abaixo).

## O que muda ao trocar para S3/R2

1. **Novo adaptador** implementando as quatro operações acima, registrado no lugar de
   `LocalDiskFileStorageAdapter` em `src/shared-kernel/infrastructure/storage/file-storage.module.ts`.
2. **`MediaController` (`GET /media/*`) fica sem uso** — com um adaptador de bucket,
   `publicUrl()` já devolve a URL final do bucket/CDN, então o navegador nunca passa pelo backend
   para buscar a imagem. Pode ficar registrado sem problema (não quebra nada), ou ser removido.
3. **Nenhuma mudança em domínio, casos de uso, controllers de upload ou frontend** — todos
   dependem só da porta, nunca do adaptador concreto.
4. **`docker-compose.yml`**: o volume `media-uploads` e a env `MEDIA_STORAGE_ROOT` do serviço
   `api` deixam de ser necessários.
5. **Credenciais do bucket** entram como novas variáveis de ambiente (seguir o padrão de
   `PAYMENT_GATEWAY_*`/`RESEND_API_KEY` em `src/config/configuration.ts` e `env.validation.ts`).

## Fora de escopo desta fase (decidir ao implementar o adaptador de nuvem)

- **Mídia privada / URLs assinadas com expiração.** Hoje tudo é público de propósito (são fotos
  de marketing do estabelecimento) — `MediaController` não checa autenticação nenhuma. Se um caso
  de uso futuro precisar de mídia privada, isso muda o contrato de `publicUrl()` (deixa de ser
  puro, passaria a assinar) e exige repensar o cache `immutable` de um ano.
- **Proteção contra hotlinking.**
- **Cron de reconciliação** para apagar do storage chaves que não têm mais linha no banco
  (hoje o comportamento documentado é: soft-delete de estabelecimento mantém os arquivos; ver o
  raciocínio em `remove-establishment-logo.use-case.ts` / `delete-establishment-photo.use-case.ts`).
- **CDN / cache em proxy reverso** na frente do bucket.
