/** Vida de una criatura, con invulnerabilidad temporal tras recibir daño. */
export class Health {
  private value: number;
  private invulnerable = 0;
  private sinceDamage = Infinity;

  constructor(readonly max: number) {
    this.value = max;
  }

  get current(): number {
    return this.value;
  }

  get isDead(): boolean {
    return this.value <= 0;
  }

  get isInvulnerable(): boolean {
    return this.invulnerable > 0;
  }

  /** Segundos transcurridos desde el último daño recibido. */
  get secondsSinceDamage(): number {
    return this.sinceDamage;
  }

  tick(dt: number): void {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.sinceDamage += dt;
  }

  /**
   * Aplica daño y abre una ventana de invulnerabilidad. Devuelve el daño aplicado:
   * 0 si estaba muerta o aún era invulnerable.
   */
  damage(amount: number, invulnerableSeconds: number): number {
    if (this.isDead || this.isInvulnerable || amount <= 0) return 0;
    const applied = Math.min(this.value, amount);
    this.value -= applied;
    this.invulnerable = invulnerableSeconds;
    this.sinceDamage = 0;
    return applied;
  }

  /** Recupera vida sin superar el máximo. Devuelve lo recuperado. */
  heal(amount: number): number {
    if (this.isDead || amount <= 0) return 0;
    const applied = Math.min(this.max - this.value, amount);
    this.value += applied;
    return applied;
  }

  /** Fija la vida, por ejemplo al cargar una partida, sin superar el máximo. */
  setCurrent(value: number): void {
    this.value = Math.min(this.max, Math.max(0, value));
  }

  restore(): void {
    this.value = this.max;
    this.invulnerable = 0;
    this.sinceDamage = Infinity;
  }
}
