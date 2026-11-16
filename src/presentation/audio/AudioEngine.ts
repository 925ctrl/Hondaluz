import type { Settings } from '../../domain/settings/Settings';
import { MOOD_THEMES, nextNote, noteFrequency, type MusicMood } from './music';
import { SOUND_BANK, type SoundCue } from './soundBank';

/** Segundos que tarda la música en pasar de un ambiente a otro. */
const MOOD_FADE = 3;
/** Volumen máximo de la música frente a los efectos, que deben destacar. */
const MUSIC_LEVEL = 0.35;

/**
 * Sonido del juego con Web Audio: efectos sintetizados a partir de `SOUND_BANK` y una música
 * generativa que se compone sola según el ambiente. El contexto de audio se crea con el primer
 * gesto del jugador, como exigen los navegadores; hasta entonces todo se ignora en silencio.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private mood: MusicMood | null = null;
  private drone: { oscillator: OscillatorNode; gain: GainNode } | null = null;
  private nextNoteAt = 0;
  private note = 2;
  private volumes: { music: number; sfx: number };

  constructor(settings: Settings) {
    this.volumes = { music: settings.musicVolume, sfx: settings.sfxVolume };
  }

  /** Crea o reanuda el contexto. Debe llamarse desde un gesto del jugador (tecla o clic). */
  unlock(): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.context) {
      const context = new AudioContext();
      this.context = context;
      this.sfx = context.createGain();
      this.music = context.createGain();
      this.sfx.connect(context.destination);
      this.music.connect(context.destination);
      this.noise = createNoise(context);
      this.applyVolumes();
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  setVolumes(settings: Settings): void {
    this.volumes = { music: settings.musicVolume, sfx: settings.sfxVolume };
    this.applyVolumes();
  }

  play(cue: SoundCue): void {
    const { context, sfx } = this;
    if (!context || !sfx || context.state !== 'running' || this.volumes.sfx === 0) return;
    const start = context.currentTime;
    for (const layer of SOUND_BANK[cue]) {
      const at = start + (layer.delay ?? 0);
      const end = at + layer.duration;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(layer.gain, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      gain.connect(sfx);
      if (layer.source === 'noise') {
        const source = context.createBufferSource();
        source.buffer = this.noise;
        source.loop = true;
        const filter = context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1.2;
        filter.frequency.setValueAtTime(layer.from, at);
        filter.frequency.exponentialRampToValueAtTime(layer.to, end);
        source.connect(filter).connect(gain);
        source.start(at, Math.random());
        source.stop(end);
      } else {
        const oscillator = context.createOscillator();
        oscillator.type = layer.source;
        oscillator.frequency.setValueAtTime(layer.from, at);
        oscillator.frequency.exponentialRampToValueAtTime(layer.to, end);
        oscillator.connect(gain);
        oscillator.start(at);
        oscillator.stop(end);
      }
    }
  }

  /** Avanza la música: cambia de ambiente con un fundido y programa la siguiente nota. */
  updateMusic(mood: MusicMood): void {
    const { context, music } = this;
    if (!context || !music || context.state !== 'running') return;
    const now = context.currentTime;
    const theme = MOOD_THEMES[mood];
    if (mood !== this.mood) {
      this.mood = mood;
      this.fadeOutDrone(now);
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + MOOD_FADE);
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = noteFrequency(theme, theme.drone);
      oscillator.connect(gain).connect(music);
      oscillator.start(now);
      this.drone = { oscillator, gain };
      this.nextNoteAt = now + 0.5;
    }
    if (this.volumes.music === 0 || now < this.nextNoteAt) return;

    this.note = nextNote(theme, this.note, Math.random());
    const frequency = noteFrequency(theme, theme.scale[this.note] ?? 0);
    const length = 1.6;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    const oscillator = context.createOscillator();
    oscillator.type = theme.wave;
    oscillator.frequency.value = frequency;
    oscillator.connect(gain).connect(music);
    oscillator.start(now);
    oscillator.stop(now + length);
    this.nextNoteAt = now + theme.gapMin + Math.random() * (theme.gapMax - theme.gapMin);
  }

  /** Apaga la música (al salir de la partida); los efectos siguen disponibles. */
  stopMusic(): void {
    if (this.context) this.fadeOutDrone(this.context.currentTime);
    this.mood = null;
  }

  private fadeOutDrone(now: number): void {
    if (!this.drone) return;
    const { oscillator, gain } = this.drone;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + MOOD_FADE);
    oscillator.stop(now + MOOD_FADE);
    this.drone = null;
  }

  private applyVolumes(): void {
    if (this.sfx) this.sfx.gain.value = this.volumes.sfx;
    if (this.music) this.music.gain.value = this.volumes.music * MUSIC_LEVEL;
  }
}

/** Un segundo de ruido blanco, reutilizado por todos los sonidos de ruido. */
function createNoise(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
