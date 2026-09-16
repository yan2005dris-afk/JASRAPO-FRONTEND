import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';
import { JasrapoMascotComponent } from '../../../shared/components/jasrapo-mascot/jasrapo-mascot.component';
import { BRAND_CONFIG } from '../../../shared/constants/brand.constant';

/** Controles fuertemente tipados del formulario de autenticación */
export interface LoginFormGroup {
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    BrandLogoComponent,
    JasrapoMascotComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  readonly brand = BRAND_CONFIG;

  // Formulario de autenticación fuertemente tipado
  readonly loginForm: FormGroup<LoginFormGroup>;
  readonly submitted = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  constructor() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  // Getter con tipado estricto para controles del formulario
  get f(): LoginFormGroup {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);

    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);

        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        if (returnUrl) {
          this.router.navigate([returnUrl]);
        } else {
          this.router.navigate([this.authService.getDefaultRoute()]);
        }
      },
      error: (error: Error) => {
        console.error('Error en login:', error);
        this.errorMessage.set(error.message || 'Error al iniciar sesión');
        this.loading.set(false);
        this.submitted.set(false);
      },
    });
  }
}
