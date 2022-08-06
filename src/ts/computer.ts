import { EntityId } from './Entity';
import { AccelerateParams, AccelerateResponse, MessageType } from './globals';

export class Computer {
  #queued: Map<EntityId, AccelerateParams[]> = new Map();

  #queueLength: number = 0;

  public queue(entityId: EntityId, params: AccelerateParams) {
    const entityQueue = this.#queued.get(entityId);
    if (!entityQueue) {
      this.#queued.set(entityId, [params]);
    } else {
      entityQueue.push(params);
    }
    this.#queueLength++;
  }

  public flushActions(entityId: EntityId) {
    const entityQueue = this.#queued.get(entityId);
    if (entityQueue) {
      this.#queueLength -= entityQueue.length;
      this.#queued.delete(entityId);
    }
  }

  public execute(): AccelerateResponse[] {
    if (!this.#queueLength) {
      return [];
    }

    const accelerated: AccelerateResponse[] = new Array(this.#queueLength);
    const entityQueues = this.#queued.values();
    let i = 0;
    for (const queue of entityQueues) {
      for (const param of queue) {
        accelerated[i] = Computer.accelerate(param);
        i++;
      }
    }
    this.#queued.clear();
    this.#queueLength = 0;
    return accelerated;
  }

  private static accelerate({
    messageType,
    time,
    position,
    timestep,
    velocity,
    acceleration,
    minimum,
    maximum,
    id,
  }: AccelerateParams): AccelerateResponse {
    const newPosition =
      position + timestep * (velocity + (timestep * acceleration) / 2.0);

    if (newPosition <= minimum) {
      return {
        messageType,
        time: 0,
        position: minimum,
        velocity: 0,
        id,
      };
    }

    if (newPosition >= maximum) {
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
      position: newPosition,
      velocity: velocity + timestep * acceleration,
      id,
    };
  }
}
