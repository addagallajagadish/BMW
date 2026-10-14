# Skyline 4 — Performance Coupe Concept

An independent, sky-blue 3D performance coupe concept inspired by the BMW M4 Competition. This fan-made design study is not affiliated with or endorsed by BMW AG. It does not use BMW logos or claim to be an official vehicle.

The 3D scene uses an independently designed detailed sports-coupe model distributed under CC0 1.0 Universal. It is not a BMW model or an official BMW M4 Competition. The site does not use a primitive vehicle fallback and is not affiliated with or endorsed by BMW AG.

## Start the website

1. Open a terminal in this project folder.
2. Install packages (only needed the first time):

   ```sh
   npm install
   ```

3. Start the Vite development server:

   ```sh
   npm run dev
   ```

4. Open the local URL printed in the terminal (usually `http://localhost:5173/`) in your browser.

To verify a production build and lint the source:

```sh
npm run build
npm run lint
```

## Add your 3D car model

The included model is already installed at:

```text
public/models/car.glb
```

It is the Spectral GT RS sports-car model by JaronKBragg7337, released under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). The source and license are documented in [public/models/README.md](./public/models/README.md); the downloaded license text is [public/models/SPECTRAL-GT-RS-LICENSE.txt](./public/models/SPECTRAL-GT-RS-LICENSE.txt). This model is a detailed independent coupe, not a BMW M4. If you later choose another licensed model, replace `public/models/car.glb` with your own file using the same name.

The loader recentres the meter-scale model, places its lowest point on the studio floor, fits its longest horizontal dimension to approximately 5.8 scene units, and rotates its documented +X-forward axis to align with the camera path. Clearly named body paint is changed to metallic sky blue; glass, wheels, lights, brakes, and interior finishes are preserved. Procedural light panels provide reflections without remote environment-map downloads. If the model is missing or invalid, the page displays an error instead of a substitute car.

## The nine scroll chapters

Home, Exterior, Engine, Aerodynamics, Wheels, Brakes, Interior, Transmission, and Final Reveal each have a working chapter link. Scrolling through the story moves the camera around the model and updates the top progress line. With reduced motion enabled, the camera stays still, the reveal transitions are removed, and the progress indicator still tracks the page.

## Project files

- `src/App.jsx` — chapter copy, page structure, responsive navigation, scroll progress, and GSAP triggers.
- `src/App.css` — typography, chapter layouts, visual styling, and responsive breakpoints.
- `src/CarScene.jsx` — Three.js studio scene, GLB loading and fitting, paint-material handling, and nine-stop camera path.
- `src/CarScene.css` — scene labels and presentation overlays.
- `public/models/README.md` — local model replacement instructions.
