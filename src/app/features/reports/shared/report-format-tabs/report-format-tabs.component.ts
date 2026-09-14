import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  viewChildren,
} from '@angular/core';

import { ReportFormat } from '../models/report-workspace.model';

@Component({
  selector: 'app-report-format-tabs',
  templateUrl: './report-format-tabs.component.html',
  styleUrl: './report-format-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportFormatTabsComponent {
  private readonly document = inject(DOCUMENT);
  private readonly tabs = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  readonly activeFormat = input<ReportFormat>('table');
  readonly pdfLoading = input(false);
  readonly formatChange = output<ReportFormat>();

  tabIndex(format: ReportFormat): 0 | -1 {
    return this.activeFormat() === format ? 0 : -1;
  }

  activate(format: ReportFormat, event: MouseEvent): void {
    const wasInactive = this.activeFormat() !== format;
    const panelId = (event.currentTarget as HTMLButtonElement).getAttribute('aria-controls');

    this.formatChange.emit(format);

    if (wasInactive && panelId) {
      queueMicrotask(() => this.document.getElementById(panelId)?.focus());
    }
  }

  onKeydown(event: KeyboardEvent): void {
    const tabs = this.tabs()
      .map(({ nativeElement }) => nativeElement)
      .filter((tab) => !tab.disabled);
    const currentIndex = tabs.indexOf(event.currentTarget as HTMLButtonElement);
    if (currentIndex < 0 || tabs.length === 0) return;

    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    const nextFormat = nextTab.dataset['reportFormat'] as ReportFormat;
    nextTab.focus();
    this.formatChange.emit(nextFormat);
  }
}
