import { mixPalette } from '../theme/mixPalette';
import { DAY_BACKDROP, DUSK_BACKDROP, NIGHT_BACKDROP } from '../theme/palette';
import type { ParallaxBackdrop } from './ParallaxBackdrop';

/** Pasos en que se cuantiza la luz del día para no repintar el cielo en cada frame. */
const SKY_STEPS = 48;

/**
 * Traduce la luz del día en los colores del cielo: noche → atardecer → día. La oscuridad
 * sobre el terreno la pone `LightingOverlay`.
 */
export class DayNightView {
  private skyStep = -1;

  constructor(private readonly backdrop: ParallaxBackdrop) {}

  update(daylight: number): void {
    const step = Math.round(daylight * SKY_STEPS);
    if (step === this.skyStep) return;
    this.skyStep = step;
    const t = step / SKY_STEPS;
    // De la noche al día se pasa por los colores cálidos del atardecer.
    this.backdrop.setPalette(
      t < 0.5
        ? mixPalette(NIGHT_BACKDROP, DUSK_BACKDROP, t * 2)
        : mixPalette(DUSK_BACKDROP, DAY_BACKDROP, (t - 0.5) * 2),
    );
  }

  /** Obliga a repintar el cielo, por ejemplo tras cambiar el tamaño de la pantalla. */
  invalidate(): void {
    this.skyStep = -1;
  }
}
