import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { AppwriteService } from './services/appwrite.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, RouterOutlet]
})
export class AppComponent implements OnInit {
  title = 'digital-banking-web';
  constructor(
    public authService: AuthService,
    private appwrite: AppwriteService
  ) { }

  ngOnInit() {
    this.authService.loadJwtTokenFromLocalStorage();
    this.appwrite.pingOnce();
  }
}
