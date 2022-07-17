import { AccelerateParams, AccelerateResponse, MessageType } from "./globals";

export class Computer {
  #queued: AccelerateParams[] = [];
  public queue(params: AccelerateParams) {
    this.#queued.push(params);
  }

  public execute(): AccelerateResponse[] {
    if (!this.#queued.length) {
      return [];
    }

    const accelerated: AccelerateResponse[] = new Array(this.#queued.length);
    for (let i = 0; i < this.#queued.length; i++) {
      accelerated[i] = Computer.accelerate(this.#queued[i]);
    }
    this.#queued.length = 0;
    return accelerated;
  }

  private static accelerate({ messageType, time, position, timestep, velocity, acceleration, minimum, maximum, id }: AccelerateParams): AccelerateResponse {
    const new_position = position + (timestep * (velocity + (timestep * acceleration) / 2.0));

    if (new_position <= minimum) {
      return {
        messageType,
        time: 0,
        position: minimum,
        velocity: 0,
        id,
      };
    }

    if (new_position >= maximum) {
      return {
        messageType,
        time: 0,
        position: maximum,
        velocity: 0,
        id,
      };
    }

    return {
      messageType,
      time: time + timestep,
      position: new_position,
      velocity: velocity + (timestep * acceleration),
      id,
    };
  }

}