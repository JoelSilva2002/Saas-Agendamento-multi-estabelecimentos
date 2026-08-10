import PDFDocument from 'pdfkit';
import { Appointment } from '../../domain/entities/appointment.entity';

/** Simplest layout that works — one line per appointment, no establishment branding (out of
 * scope, documented in the Fase 6 plan). */
export class PdfAppointmentFormatter {
  static format(appointments: Appointment[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Agenda de Agendamentos', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);

      if (appointments.length === 0) {
        doc.text('Nenhum agendamento no período.');
      }
      for (const appointment of appointments) {
        doc.text(
          `${appointment.startAt.toISOString()} — ${appointment.status} — serviço ${appointment.serviceId} — funcionário ${appointment.employeeId}`,
        );
      }

      doc.end();
    });
  }
}
