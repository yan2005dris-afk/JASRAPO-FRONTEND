import { trigger, style, animate, transition, query, stagger } from '@angular/animations';

export const fadeAnimation = trigger('fadeAnimation', [
  transition(':enter', [style({ opacity: 0 }), animate('500ms ease-out', style({ opacity: 1 }))]),
]);

export const slideUpAnimation = trigger('slideUpAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(30px)' }),
    animate(
      '600ms cubic-bezier(0.16, 1, 0.3, 1)',
      style({ opacity: 1, transform: 'translateY(0)' }),
    ),
  ]),
]);

export const staggerFormElements = trigger('staggerFormElements', [
  transition(':enter', [
    query(
      '.form-group-custom, .custom-checkbox, .btn-login',
      [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        stagger('150ms', [
          animate(
            '500ms cubic-bezier(0.16, 1, 0.3, 1)',
            style({ opacity: 1, transform: 'translateY(0)' }),
          ),
        ]),
      ],
      { optional: true },
    ),
  ]),
]);
