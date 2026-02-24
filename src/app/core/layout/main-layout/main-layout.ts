import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterModule, Sidebar, Header],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {

}
