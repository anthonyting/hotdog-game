export enum MessageType {
  xAccelerate,
  yAccelerate,
}

export interface AccelerateParams {
  messageType: MessageType;
  time: number;
  position: number;
  timestep: number;
  velocity: number;
  acceleration: number;
  minimum: number;
  maximum: number;
  id: number;
}

export interface AccelerateResponse {
  messageType: MessageType;
  time: number;
  position: number;
  velocity: number;
  id: number;
}

export const GRAVITY = -0.001;
