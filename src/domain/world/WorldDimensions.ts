/** Tamaño del mundo en chunks y de cada chunk en bloques por lado. */
export interface WorldDimensions {
  readonly chunkSize: number;
  readonly widthChunks: number;
  readonly heightChunks: number;
}

export function widthInTiles(dimensions: WorldDimensions): number {
  return dimensions.widthChunks * dimensions.chunkSize;
}

export function heightInTiles(dimensions: WorldDimensions): number {
  return dimensions.heightChunks * dimensions.chunkSize;
}
