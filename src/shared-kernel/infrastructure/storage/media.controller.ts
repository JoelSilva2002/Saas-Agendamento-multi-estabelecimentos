import { Controller, Get, NotFoundException, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../../modules/auth/presentation/decorators/public.decorator';
import { FileStoragePort } from '../../domain/file-storage.port';

// @Public(): documental — não há APP_GUARD global neste projeto (guards são por controller), mas
// segue a mesma convenção do PublicController caso isso mude no futuro.
@Public()
@Controller('media')
export class MediaController {
  constructor(private readonly storage: FileStoragePort) {}

  // Express 4 (confirmado em node_modules): '*' + req.params[0] é a sintaxe correta. As formas
  // '*key'/':key(*)' são de Express 5 / Nest 11 e dariam 404 silencioso aqui.
  @Get('*')
  async serve(@Req() req: Request, @Res() res: Response): Promise<void> {
    const key = req.params[0];
    const object = await this.storage.read(key);
    if (!object) {
      throw new NotFoundException();
    }

    if (req.headers['if-none-match'] === object.etag) {
      res.status(304).end();
      return;
    }

    res.set({
      'Content-Type': object.contentType,
      'Content-Length': String(object.byteSize),
      // A chave embute um UUID e nunca é reusada — uma logo/foto trocada ganha chave nova, então
      // os bytes por trás de uma URL são de fato imutáveis. Nunca sobrescrever no lugar.
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: object.etag,
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    object.stream.pipe(res);
  }
}
