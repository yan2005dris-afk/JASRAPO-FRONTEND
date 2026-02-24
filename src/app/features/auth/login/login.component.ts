import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { fadeAnimation, slideUpAnimation, staggerFormElements } from '../../../core/animations/route.animations';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css',
    animations: [fadeAnimation, slideUpAnimation, staggerFormElements],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
    private readonly formBuilder = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly authService = inject(AuthService);

    loginForm: FormGroup;
    submitted = signal(false);
    loading = signal(false);
    errorMessage = signal<string | null>(null);

    constructor() {
        this.loginForm = this.formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    get f() { return this.loginForm.controls; }

    onSubmit(): void {
        this.submitted.set(true);
        this.errorMessage.set(null);

        if (this.loginForm.invalid) {
            return;
        }

        this.loading.set(true);

        // Llamar al servicio de autenticación
        this.authService.login(this.loginForm.value).subscribe({
            next: (response) => {
                console.log('Login exitoso:', response);
                this.loading.set(false);
                
                // Redirigir a la URL solicitada o al dashboard
                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/app/dashboard';
                this.router.navigate([returnUrl]);
            },
            error: (error) => {
                console.error('Error en login:', error);
                this.errorMessage.set(error.message || 'Error al iniciar sesión');
                this.loading.set(false);
                this.submitted.set(false);
            }
        });
    }
}
