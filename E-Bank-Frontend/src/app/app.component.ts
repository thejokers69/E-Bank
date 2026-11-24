import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from "./services/auth.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, RouterOutlet]
})
export class AppComponent implements OnInit {
  title = 'digital-banking-web';
  constructor(public authService: AuthService) { }
  ngOnInit() {
    this.authService.loadJwtTokenFromLocalStorage();
  }
}
