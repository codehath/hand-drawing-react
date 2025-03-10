# Hand Drawing React App

A real-time hand drawing web application that uses your webcam to track your index finger and lets you draw on the screen. Built with React, TypeScript, MediaPipe Hands, and TensorFlow.js.

## Features

- Real-time hand tracking using MediaPipe Hands
- Draw on screen by moving your index finger
- Visual cursor that follows your finger
- Clear canvas functionality
- Webcam feed overlay

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- A webcam
- A modern web browser with WebGL support

## Installation

```bash
# Clone the repository
git clone https://github.com/codehath/hand-drawing-react.git

# Navigate to the project directory
cd hand-drawing-react

# Install dependencies using pnpm
pnpm install
```

## Development

To start the development server:

```bash
pnpm run dev
```

Open your browser and navigate to `http://localhost:5173` (or the URL shown in your terminal).

## Usage

1. Grant camera permissions when prompted
2. Hold your hand up in front of the camera
3. Move your index finger to draw
4. Use the "Clear Canvas" button to erase everything

## Tech Stack

- React + TypeScript
- Vite
- MediaPipe Hands
- TensorFlow.js
- pnpm (package manager)

## License

MIT
