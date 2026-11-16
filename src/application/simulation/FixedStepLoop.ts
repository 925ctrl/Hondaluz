/**
 * Ejecuta la simulación a un ritmo fijo, independiente de los FPS de pantalla,
 * para que la física sea reproducible.
 */
export class FixedStepLoop {
  private accumulator = 0;

  constructor(
    readonly stepSeconds: number,
    /** Límite de pasos por frame: tras un parón largo se descarta tiempo en vez de acelerar. */
    private readonly maxStepsPerFrame: number,
  ) {}

  /** Avanza los pasos pendientes y devuelve la fracción (0-1) recorrida hacia el siguiente. */
  advance(deltaSeconds: number, step: (stepSeconds: number) => void): number {
    this.accumulator = Math.min(
      this.accumulator + deltaSeconds,
      this.stepSeconds * this.maxStepsPerFrame,
    );
    while (this.accumulator >= this.stepSeconds) {
      step(this.stepSeconds);
      this.accumulator -= this.stepSeconds;
    }
    return this.accumulator / this.stepSeconds;
  }
}
