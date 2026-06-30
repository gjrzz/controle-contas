import { Request, Response, NextFunction } from 'express';
import fs from 'fs';

/**
 * Valida se os arquivos enviados são PDFs reais (verifica magic bytes)
 * PDF sempre começa com %PDF (hex: 25 50 44 46)
 */
export function validatePdfFiles(req: Request, res: Response, next: NextFunction): void {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    next();
    return;
  }

  for (const file of files) {
    try {
      const buffer = fs.readFileSync(file.path);
      // Verifica magic bytes do PDF: %PDF
      if (buffer.length < 4 || buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
        // Remove o arquivo inválido
        fs.unlinkSync(file.path);
        res.status(400).json({ error: `Arquivo "${file.originalname}" não é um PDF válido.` });
        return;
      }
    } catch {
      res.status(400).json({ error: `Erro ao validar arquivo "${file.originalname}".` });
      return;
    }
  }

  next();
}
