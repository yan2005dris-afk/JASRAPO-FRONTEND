import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { PhotoCaptureComponent } from './photo-capture.component';

describe('PhotoCaptureComponent', () => {
  it('emits the selected Blob reference', () => {
    TestBed.configureTestingModule({ imports: [PhotoCaptureComponent] });
    const fixture = TestBed.createComponent(PhotoCaptureComponent);
    const blob = new Blob(['photo'], { type: 'image/jpeg' });
    const emitted: (Blob | null)[] = [];
    fixture.componentInstance.previewChange.subscribe((value) => emitted.push(value));

    fixture.componentInstance.onCapture({
      target: { files: [blob] },
    } as unknown as Event);

    expect(emitted[0]).toBe(blob);
    expect(fixture.componentInstance.previewUrl).toBeTruthy();
    fixture.destroy();
  });

  it('creates and revokes an object URL for the preview', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:photo');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    TestBed.configureTestingModule({ imports: [PhotoCaptureComponent] });
    const fixture = TestBed.createComponent(PhotoCaptureComponent);
    const blob = new Blob(['photo'], { type: 'image/jpeg' });

    fixture.componentRef.setInput('preview', blob);
    fixture.detectChanges();
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(fixture.componentInstance.previewUrl).toBe('blob:photo');

    fixture.componentInstance.removePhoto();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:photo');
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('revokes the preview URL on destroy', () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:destroy'),
      revokeObjectURL,
    });
    TestBed.configureTestingModule({ imports: [PhotoCaptureComponent] });
    const fixture = TestBed.createComponent(PhotoCaptureComponent);
    fixture.componentRef.setInput('preview', new Blob(['photo']));
    fixture.detectChanges();

    fixture.destroy();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:destroy');
    vi.unstubAllGlobals();
  });
});
