import { Component, ChangeDetectionStrategy, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { InvitationsService, InvitationNotFoundError, InvitationGoneError } from '../../invitations.service';
import { AuthService } from '../../../../core/services/auth.service';

interface PasswordStrengthRule {
  name: string;
  validator: (password: string) => boolean;
  met: boolean;
}

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

@Component({
  selector: 'app-set-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './set-password.component.html',
  styleUrl: './set-password.component.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class SetPasswordComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly invitationsService = inject(InvitationsService);
  private readonly authService = inject(AuthService);

  readonly form: FormGroup;
  readonly submitted = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly passwordValue = signal<string>('');

  private readonly token = signal<string>('');

  private readonly ruleValidators = [
    { name: 'Mínimo 8 caracteres', check: (p: string) => p.length >= 8 },
    { name: 'Mayúscula (A-Z)', check: (p: string) => /[A-Z]/.test(p) },
    { name: 'Minúscula (a-z)', check: (p: string) => /[a-z]/.test(p) },
    { name: 'Número (0-9)', check: (p: string) => /\d/.test(p) },
    { name: 'Carácter especial (!@#$%)', check: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
  ];

  readonly rules = computed<PasswordStrengthRule[]>(() => {
    const password = this.passwordValue();
    return this.ruleValidators.map((rule) => ({
      name: rule.name,
      validator: rule.check,
      met: rule.check(password),
    }));
  });

  readonly passwordStrength = computed<PasswordStrength>(() => {
    const metRules = this.rules().filter((r) => r.met).length;
    if (metRules <= 2) return 'weak';
    if (metRules <= 3) return 'fair';
    if (metRules <= 4) return 'good';
    return 'strong';
  });

  readonly strengthLabel = computed<string>(() => {
    const strength = this.passwordStrength();
    const labels: Record<PasswordStrength, string> = {
      weak: 'Débil',
      fair: 'Regular',
      good: 'Buena',
      strong: 'Fuerte',
    };
    return labels[strength];
  });

  readonly strengthColor = computed<string>(() => {
    const strength = this.passwordStrength();
    const colors: Record<PasswordStrength, string> = {
      weak: '#ef4444',
      fair: '#f59e0b',
      good: '#10b981',
      strong: '#0c9ea1',
    };
    return colors[strength];
  });

  constructor() {
    this.form = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator.bind(this)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordMatchValidator });

    this.form.get('password')?.valueChanges.subscribe((value) => {
      this.passwordValue.set(value || '');
    });

    this.route.queryParams.subscribe((params) => {
      if (params['token']) {
        this.token.set(params['token']);
      }
    });
  }

  ngOnInit(): void {
    if (this.authService.currentUser()) {
      this.authService.logout();
    }
  }

  private passwordStrengthValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.value;
    if (!password) return null;

    const validators = [
      { check: (p: string) => p.length >= 8 },
      { check: (p: string) => /[A-Z]/.test(p) },
      { check: (p: string) => /[a-z]/.test(p) },
      { check: (p: string) => /\d/.test(p) },
      { check: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
    ];

    const metRules = validators.filter((v) => v.check(password)).length;
    if (metRules < 4) {
      return { weakPassword: true };
    }
    return null;
  }

  private passwordMatchValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
  }

  get f() {
    return this.form.controls;
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.form.invalid || !this.token()) {
      return;
    }

    this.loading.set(true);

    try {
      await this.invitationsService.acceptInvitation(
        this.token(),
        this.form.value.password,
        this.form.value.confirmPassword,
        true
      );

      this.successMessage.set('¡Contraseña establecida correctamente!');

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } catch (err: any) {
      if (err instanceof InvitationNotFoundError) {
        this.errorMessage.set('Invitación inválida. Verifica que el enlace sea correcto.');
      } else if (err instanceof InvitationGoneError) {
        this.errorMessage.set('Esta invitación ya fue usada o expiró.');
      } else if (err?.status === 422 && err?.errors) {
        this.errorMessage.set('Error al validar los datos. Por favor intenta de nuevo.');
      } else {
        this.errorMessage.set('Error al establecer la contraseña. Por favor intenta de nuevo.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
