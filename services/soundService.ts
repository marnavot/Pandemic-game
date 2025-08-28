// A simple audio service to play sound effects.
// It tries multiple common audio formats for browser compatibility.
// and includes detailed logging to help diagnose pathing issues.

// Cache for loaded audio objects to prevent re-loading.
const audioCache: { [key: string]: HTMLAudioElement } = {};
const SOUND_EXTENSIONS = ['mp3', 'ogg', 'wav'];

/**
 * Plays a sound effect. It checks localStorage to see if sound is enabled.
 * @param name The base name of the sound file (e.g., 'directflight').
 */
export const playSound = (name: string): void => {
  // Read the setting from localStorage. Default to 'true' if not set.
  const isEnabled = localStorage.getItem('soundEffectsEnabled') !== 'false';

  if (!isEnabled) {
    return;
  }
  
  // If we already have a loaded and playable audio element, just play it.
  if (audioCache[name]) {
    const audio = audioCache[name];
    audio.currentTime = 0; // Rewind to start
    audio.play().catch(error => {
      // This can happen if the user hasn't interacted with the page yet.
      // Not a critical error, so we don't need to be too loud about it.
      if (error.name !== 'NotAllowedError') {
        console.error(`[Sound Service] Error re-playing cached sound '${name}':`, error);
      }
    });
    return;
  }

  // Attempt to load the sound with different extensions.
  let attemptIndex = 0;

  const tryLoad = () => {
    if (attemptIndex >= SOUND_EXTENSIONS.length) {
      console.warn(`[Sound Service] Failed to load sound '${name}' after trying all formats.`);
      return;
    }

    const ext = SOUND_EXTENSIONS[attemptIndex];
    const path = `/assets/sounds/${name}.${ext}`;
    console.log(`[Sound Service] Attempting to load sound: ${path}`);
    const audio = new Audio(path);

    audio.addEventListener('canplaythrough', () => {
      console.log(`[Sound Service] Successfully loaded ${path}. Caching and playing.`);
      audioCache[name] = audio; // Cache the successful audio object
      audio.play().catch(error => {
        if (error.name !== 'NotAllowedError') {
          console.error(`[Sound Service] Error playing sound '${name}' for the first time:`, error);
        }
      });
    }, { once: true }); // Use `once` to auto-remove the listener after it fires.

    audio.addEventListener('error', () => {
      console.warn(`[Sound Service] Could not load ${path}. Trying next format...`);
      attemptIndex++;
      tryLoad(); // Recursively try the next extension.
    });
  };

  tryLoad();
};