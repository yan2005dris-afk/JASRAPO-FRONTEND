import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InvitationsService } from '../../../core/services/invitations.service';
import { InvitationPreviewResponse } from '../../../core/models/invitation.model';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './accept-invitation.component.html',
  styleUrls: ['./accept-invitation.component.scss'],
})
export class AcceptInvitationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invitationsService = inject(InvitationsService);

  readonly token = signal<string>('');
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly isSuccess = signal<boolean>(false);
  readonly errorState = signal<string | null>(null);
  readonly invitation = signal<InvitationPreviewResponse | null>(null);
  readonly showPassword = signal<boolean>(false);
  readonly showPasswordConfirm = signal<boolean>(false);

  form!: FormGroup;

  // Criterios de fortaleza de contraseña
  readonly passwordValue = signal<string>('');
  readonly hasMinLength = computed(() => this.passwordValue().length >= 8);
  readonly hasUppercase = computed(() => /[A-Z]/.test(this.passwordValue()));
  readonly hasLowercase = computed(() => /[a-z]/.test(this.passwordValue()));
  readonly hasNumber = computed(() => /\d/.test(this.passwordValue()));
  readonly hasSymbol = computed(() => /[@$!%*?&#.,_-]/.test(this.passwordValue()));
  readonly strengthScore = computed(() => {
    let score = 0;
    if (this.hasMinLength()) score++;
    if (this.hasUppercase()) score++;
    if (this.hasLowercase()) score++;
    if (this.hasNumber()) score++;
    if (this.hasSymbol()) score++;
    return score;
  });

  ngOnInit(): void {
    this.initForm();
    const tokenParam = this.route.snapshot.queryParamMap.get('token') || '';
    this.token.set(tokenParam);

    if (!tokenParam) {
      this.errorState.set('No se proporcionó ningún token de invitación válido.');
      this.isLoading.set(false);
      return;
    }

    this.loadInvitationPreview(tokenParam);
  }

  private initForm(): void {
    this.form = this.fb.group(
      {
        password: [
          '',
          [Validators.required, Validators.minLength(8), this.validatePasswordStrength.bind(this)],
        ],
        password_confirmation: ['', [Validators.required]],
        accept_terms: [false, [Validators.requiredTrue]],
      },
      { validators: this.passwordsMatchValidator },
    );

    this.form.get('password')?.valueChanges.subscribe((val) => {
      this.passwordValue.set(val || '');
    });
  }

  private validatePasswordStrength(control: AbstractControl): Record<string, boolean> | null {
    const val = control.value || '';
    const valid =
      val.length >= 8 &&
      /[A-Z]/.test(val) &&
      /[a-z]/.test(val) &&
      /\d/.test(val) &&
      /[@$!%*?&#.,_-]/.test(val);
    return valid ? null : { weakPassword: true };
  }

  private passwordsMatchValidator(group: AbstractControl): Record<string, boolean> | null {
    const pass = group.get('password')?.value;
    const confirm = group.get('password_confirmation')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  loadInvitationPreview(token: string): void {
    this.isLoading.set(true);
    this.errorState.set(null);

    this.invitationsService.preview(token).subscribe({
      next: (res) => {
        this.invitation.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 404) {
          this.errorState.set('La invitación no existe o el enlace es incorrecto.');
        } else if (err.status === 410) {
          this.errorState.set('Esta invitación ya ha expirado o ha sido utilizada previamente.');
        } else {
          this.errorState.set(
            err.error?.message || 'No fue posible validar la invitación en este momento.',
          );
        }
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const val = this.form.value;

    this.invitationsService
      .accept({
        token: this.token(),
        password: val.password,
        password_confirmation: val.password_confirmation,
        accept_terms: val.accept_terms,
        terms_version: 'v0',
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isSuccess.set(true);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg =
            err.error?.message || 'Ocurrió un error al procesar tu registro. Intenta de nuevo.';
          this.errorState.set(msg);
        },
      });
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { registered: 'true', email: this.invitation()?.email },
    });
  }
}
