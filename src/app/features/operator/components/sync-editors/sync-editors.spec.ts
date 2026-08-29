import { TestBed } from '@angular/core/testing';
import { SyncReadingEditorComponent, ReadingEditResult } from './sync-reading-editor.component';
import { SyncAnomalyEditorComponent, AnomalyEditResult } from './sync-anomaly-editor.component';
import { PendingRecord } from '../../../../core/services/indexed-db.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Sync Editors', () => {
  const mockReadingRecord: PendingRecord = {
    id: 1,
    type: 'reading',
    syncState: 'RECHAZADA',
    errorMessage: 'Lectura menor a anterior',
    lecturaActual: 150,
    lecturaAnterior: 100,
    lecturaInicial: false,
  };

  const mockAnomalyRecord: PendingRecord = {
    id: 2,
    type: 'anomaly',
    syncState: 'RECHAZADA',
    errorMessage: 'Tipo inválido',
    tipo: 'FUGA',
    observacion: 'Fuga visible en llave de paso',
    fotoBase64: 'data:image/png;base64,existingphoto',
  };

  describe('SyncReadingEditorComponent', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [SyncReadingEditorComponent],
      });
    });

    it('initializes from record payload and emits on save', () => {
      const fixture = TestBed.createComponent(SyncReadingEditorComponent);
      const comp = fixture.componentInstance;
      fixture.componentRef.setInput('record', mockReadingRecord);
      fixture.detectChanges();

      expect(comp.lecturaActual).toBe(150);
      expect(comp.lecturaAnterior).toBe(100);

      const saved: ReadingEditResult[] = [];
      comp.saved.subscribe((r) => saved.push(r));

      comp.lecturaActual = 160;
      comp.save();

      expect(saved).toHaveLength(1);
      expect(saved[0].lecturaActual).toBe(160);
      expect(saved[0].consumoCalculado).toBe(60);
    });

    it('prevents saving when readingActual is less than readingAnterior without initial reading', () => {
      const fixture = TestBed.createComponent(SyncReadingEditorComponent);
      const comp = fixture.componentInstance;
      fixture.componentRef.setInput('record', mockReadingRecord);
      fixture.detectChanges();

      comp.lecturaActual = 50;
      expect(comp.isInvalid()).toBe(true);
      expect(comp.validationErrorMessage()).toBe(
        'La lectura actual no puede ser menor a la lectura anterior.',
      );
    });

    it('rejects negative, empty or NaN values properly', () => {
      const fixture = TestBed.createComponent(SyncReadingEditorComponent);
      const comp = fixture.componentInstance;
      fixture.componentRef.setInput('record', mockReadingRecord);
      fixture.detectChanges();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      comp.lecturaActual = NaN as any;
      expect(comp.isInvalid()).toBe(true);

      comp.lecturaActual = -5;
      expect(comp.isInvalid()).toBe(true);

      comp.lecturaActual = 120;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      comp.lecturaAnterior = -10 as any;
      expect(comp.isInvalid()).toBe(true);
    });

    it('permits readingActual to be lower if lecturaInicial is true (meter replacement)', () => {
      const fixture = TestBed.createComponent(SyncReadingEditorComponent);
      const comp = fixture.componentInstance;
      fixture.componentRef.setInput('record', mockReadingRecord);
      fixture.detectChanges();

      comp.lecturaInicial = true;
      comp.lecturaActual = 10;
      comp.lecturaAnterior = 200;

      expect(comp.isInvalid()).toBe(false);
      const saved: ReadingEditResult[] = [];
      comp.saved.subscribe((r) => saved.push(r));
      comp.save();

      expect(saved[0].consumoCalculado).toBe(0);
    });
  });

  describe('SyncAnomalyEditorComponent', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [SyncAnomalyEditorComponent],
      });
    });

    it('initializes from record payload and emits on save', () => {
      const fixture = TestBed.createComponent(SyncAnomalyEditorComponent);
      const comp = fixture.componentInstance;
      fixture.componentRef.setInput('record', mockAnomalyRecord);
      fixture.detectChanges();

      expect(comp.tipo).toBe('FUGA');
      expect(comp.observacion).toBe('Fuga visible en llave de paso');
      expect(comp.fotoPreview()).toBe('data:image/png;base64,existingphoto');

      const saved: AnomalyEditResult[] = [];
      comp.saved.subscribe((r) => saved.push(r));

      comp.observacion = 'Observacion corregida';
      comp.save();

      expect(saved).toHaveLength(1);
      expect(saved[0].observacion).toBe('Observacion corregida');
      expect(saved[0].fotoBase64).toBe('data:image/png;base64,existingphoto');
    });

    it('preserves an existing Blob and revokes object URLs on destroy', () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:photo');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
      const blob = new Blob(['photo'], { type: 'image/jpeg' });
      const record = { ...mockAnomalyRecord, fotoBase64: 'blob:old-preview', fotoBlob: blob };
      const fixture = TestBed.createComponent(SyncAnomalyEditorComponent);
      const comp = fixture.componentInstance;
      fixture.componentRef.setInput('record', record);
      fixture.detectChanges();

      expect(comp.fotoPreview()).toBe('blob:photo');
      const saved: AnomalyEditResult[] = [];
      comp.saved.subscribe((r) => saved.push(r));
      comp.observacion = 'Observacion corregida';
      comp.save();

      expect(saved[0].fotoBlob).toBe(blob);
      expect(saved[0].fotoBase64).toBeNull();
      fixture.destroy();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:photo');
      vi.unstubAllGlobals();
    });

    it('supports photo removal', () => {
      const fixture = TestBed.createComponent(SyncAnomalyEditorComponent);
      const comp = fixture.componentInstance;
      fixture.componentRef.setInput('record', mockAnomalyRecord);
      fixture.detectChanges();

      comp.removePhoto();
      expect(comp.fotoPreview()).toBeNull();

      const saved: AnomalyEditResult[] = [];
      comp.saved.subscribe((r) => saved.push(r));
      comp.save();

      expect(saved[0].fotoBase64).toBeNull();
    });

    it('prevents saving when observation is empty whitespace', () => {
      const fixture = TestBed.createComponent(SyncAnomalyEditorComponent);
      const comp = fixture.componentInstance;
      fixture.componentRef.setInput('record', mockAnomalyRecord);
      fixture.detectChanges();

      comp.observacion = '   ';
      const saved: AnomalyEditResult[] = [];
      comp.saved.subscribe((r) => saved.push(r));
      comp.save();

      expect(saved).toHaveLength(0);
    });
  });
});
