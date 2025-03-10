declare module '@tensorflow-models/handpose' {
  export interface HandPose {
    estimateHands(input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<{
      handInViewConfidence: number;
      boundingBox: {
        topLeft: [number, number];
        bottomRight: [number, number];
      };
      landmarks: Array<[number, number, number]>;
      annotations: {
        indexFinger: Array<[number, number, number]>;
        middleFinger: Array<[number, number, number]>;
        ringFinger: Array<[number, number, number]>;
        pinky: Array<[number, number, number]>;
        thumb: Array<[number, number, number]>;
        palmBase: Array<[number, number, number]>;
      };
    }[]>;
  }

  export function load(): Promise<HandPose>;
}
