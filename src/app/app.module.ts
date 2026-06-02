import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoaderComponent } from './shared/components/loader/loader.component';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle.component';
import { AudioToggleComponent } from './shared/components/audio-toggle/audio-toggle.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    LoaderComponent,
    ThemeToggleComponent,
    AudioToggleComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
