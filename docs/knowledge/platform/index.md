# iPad web app platform

* [Add to Home Screen and the web app manifest on iPadOS](home-screen-install-and-manifest.md) - How a site becomes a Home Screen web app on iPadOS, what Safari reads from the manifest, and what it ignores.
* [Standalone display, safe areas and orientation on iPad](standalone-safe-areas-orientation.md) - How a standalone web app fills the iPad screen, keeps content clear of rounded corners and system bars, and handles portrait and landscape.
* [Touch targets and gestures for an iPad web app](touch-targets-and-gestures.md) - Minimum hit sizes, removing tap delay, one input model for finger and pencil, and which gestures to leave to the system.
* [Web push on iPadOS Home Screen web apps](web-push-on-ipados.md) - Push works on iPadOS 16.4+ only for an installed web app, after a tap-triggered permission prompt; Declarative Web Push arrives in 18.4.
* [Service workers and offline storage limits on iPadOS](offline-storage-and-service-workers.md) - How much a Home Screen web app may store, when WebKit evicts it, and how to keep a training session working on patchy wifi.
* [Audio and video autoplay rules on iPadOS Safari](audio-video-autoplay.md) - Muted inline video may autoplay; sound needs a tap; the app starts its audio cues from the session's Start button.
* [Haptics in a web app on iPad](haptics-availability.md) - Safari on iPadOS has no Vibration API, so the app gives feedback with sound and visuals only.
* [Keeping the iPad screen on during a session](screen-wake-lock.md) - Screen Wake Lock works in Safari from 16.4 but only in Home Screen web apps from 18.4; it is released when the app is hidden and must be re-requested.
* [Google sign-in behind the cloud sign-in proxy in a Home Screen web app](sign-in-in-home-screen-app.md) - How the identity-aware proxy's session cookie, redirects and 401s behave for an installed iPad web app, and the patterns that keep sign-in working.

# Decision

* [Front-end approach for the iPad web app](/decisions/frontend-approach.md) - Framework, PWA scope, breakpoints, minimum iPadOS and sign-in behind the proxy.
