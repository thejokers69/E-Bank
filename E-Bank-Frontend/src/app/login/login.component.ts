import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ThemeToggleComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  formLogin! : FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.formLogin = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  handleLogin() {
    if (this.formLogin.invalid) {
      this.errorMessage = 'Please fill in all fields correctly';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    let username = this.formLogin.value.username;
    let password = this.formLogin.value.password;

    this.authService.login(username, password).subscribe({
      next: (data: any) => {
        try {
          const roles = this.authService.loadProfile(data);
          if (roles && roles.includes('ADMIN')) {
            // Set flag for welcome message
            localStorage.setItem('justLoggedIn', 'true');
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/home';
            this.router.navigateByUrl(returnUrl);
          } else {
            this.errorMessage = "You don't have permission to access this application.";
            this.isLoading = false;
          }
        } catch (error) {
          console.error('Error processing login response:', error);
          this.errorMessage = "Invalid response from server";
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Login error:', err);
        if (err.status === 0) {
          this.errorMessage = 'Cannot reach the API. The backend may be waking up — wait a few seconds and try again.';
        } else if (err.status === 401) {
          this.errorMessage = 'Authentication failed. Please check your credentials.';
        } else {
          this.errorMessage = err.error?.detail || err.error?.message || err.message || 'Authentication failed. Please check your credentials.';
        }
        this.isLoading = false;
      },
      complete: () => {
        if (this.errorMessage) {
          this.isLoading = false;
        }
      }
    });
  }

  // Helper methods for template
  get usernameControl() {
    return this.formLogin.get('username');
  }

  get passwordControl() {
    return this.formLogin.get('password');
  }
}
