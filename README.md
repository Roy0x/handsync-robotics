# HandSync — Robot Playground

React + Three.js + MediaPipe web prototype for tracking one hand and controlling an orange industrial-style robotic arm with a parallel-jaw gripper, based on the supplied reference image.

## Studio v0.3

- Full-screen-style 3D interactive industrial arm stage with improved mechanical housings, cable routing, accents and a detailed gripper
- Dark/light studio lighting, drag-to-orbit and scroll-to-zoom
- Live webcam preview and gesture states; pinching or making a fist closes the gripper
- Manual control lab with base, shoulder, wrist and grip sliders
- Three live gesture challenges with a local session score (no account/backend)
- Adjustable smoothing and landmark visibility

The 3D robot is a custom procedural illustration inspired by an industrial arm, **not** a manufacturer-certified CAD/URDF model. There is no real physical robot connection.

## Quick start

Requires Node.js 20.19+ (Node 24 works) and an internet connection for initial dependencies and the MediaPipe model.

```bash
npm install
npm run prepare:model
npm run dev
```

Open the displayed localhost URL in Chrome or Edge, click **Enable Camera**, grant permission, then hold one hand in frame. Finger flexion updates the robot. Drag the 3D model to rotate, scroll to zoom. Use the five demo gestures without a camera.

`npm install` also attempts to cache MediaPipe WASM and the hand model in `public/mediapipe/`. If an installation network error prevented model download, run `npm run prepare:model` again while online. The local model avoids relying on the runtime model CDN. After preparing, restart the Vite server.

## Live gestures (v0.2)

- **Open palm:** release the parallel gripper.
- **Pinch thumb and index fingertips:** close the gripper.
- **Fist:** close the gripper.
- **Move your hand:** approximate shoulder, elbow, and base movement.
- **Demo gestures:** temporarily switch to manual mode without stopping the camera; click **Resume Live Hand Control** to take over again.

The UI shows separate states for camera feed, model loading, hand detection, and live gesture output. Camera preview stays on even if MediaPipe initialization fails.

To build a static deployment:

```bash
npm run build
```

Host the generated `dist/` folder on a static HTTPS host. Browser camera permission requires HTTPS or `localhost` (not arbitrary HTTP IP addresses).

## Scope and limitations

- MediaPipe estimates 21 hand landmarks and finger bend from a single RGB webcam. It does not measure precise real-world 3D position.
- Arm shoulder/elbow motion is an **illustrative mapping** of wrist position, not biomechanical arm tracking or inverse-kinematics teleoperation.
- The first robot uses an industrial two-jaw gripper. Mean finger flexion closes its gripper; a separate five-finger dexterous robot is a future selectable model.
- The camera stays visible if MediaPipe model initialization fails, and reports a separate model-loading error.
- MediaPipe WASM is copied from the installed npm package, and the model is cached from Google Storage when possible. If local assets are unavailable, runtime online fallback is attempted. There is no paid API and no video upload to an application server; inference runs in the browser.
- If the webcam is unavailable, use demo poses. Tracking quality depends on lighting, occlusion and camera position.

## Troubleshooting

- Blank video: verify Chrome/Edge camera permissions and close other apps holding the camera.
- Model does not load: check access to the external MediaPipe model/WASM CDN; a network connection is required.
- Low FPS: close heavy browser tabs and reduce other GPU loads. Rendering DPR is capped at 1.5.
- Hand movement looks reversed: toggle **Mirror camera preview** (preview only); tracking uses the original sensor frame.

## Next iteration

Add full body/arm landmark tracking, calibration, physically constrained IK, recording, robot-specific URDF import, and collision-aware grasping.
