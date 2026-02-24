import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { fadeAnimation, slideUpAnimation, staggerFormElements } from '../../../core/animations/route.animations';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css',
    animations: [fadeAnimation, slideUpAnimation, staggerFormElements]
})
export class LoginComponent {
    loginForm: FormGroup;
    submitted = false;

    constructor(
        private formBuilder: FormBuilder,
        private router: Router
    ) {
        this.loginForm = this.formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    // Getter para acceso fácil a los campos del formulario
    get f() { return this.loginForm.controls; }

    onSubmit() {
        this.submitted = true;

        // Detenerse aquí si el formulario es inválido
        if (this.loginForm.invalid) {
            return;
        }

        // Aquí iría la lógica de autenticación real
        console.log('Login exitoso con:', this.loginForm.value);

        // Simular redirección al dashboard
        this.router.navigate(['/']);
    }
}
