/**
 * Iconos de los objetos como imágenes para la interfaz HTML. Los genera la precarga a partir
 * de las mismas texturas del juego, así el arte tiene un único origen.
 */
export class ItemIcons {
  private readonly urls = new Map<string, string>();

  set(itemId: string, dataUrl: string): void {
    this.urls.set(itemId, dataUrl);
  }

  get(itemId: string): string | undefined {
    return this.urls.get(itemId);
  }
}
