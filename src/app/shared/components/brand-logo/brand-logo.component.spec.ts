import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrandLogoComponent } from './brand-logo.component';
import { BRAND_CONFIG } from '../../constants/brand.constant';

describe('BrandLogoComponent', () => {
  let component: BrandLogoComponent;
  let fixture: ComponentFixture<BrandLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandLogoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BrandLogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should use logoUrl from BRAND_CONFIG as default', () => {
    expect(component.currentLogoUrl()).toBe(BRAND_CONFIG.logoUrl);
  });

  it('should fall back to fallbackLogoUrl on image error', () => {
    component.onImageError();
    expect(component.currentLogoUrl()).toBe(BRAND_CONFIG.fallbackLogoUrl);
  });
});
