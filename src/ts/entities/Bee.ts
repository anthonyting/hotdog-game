import beeImage from 'assets/images/bee.png';
import { GameInstance } from '../GameInstance';
import { AccelerateParams, GRAVITY, MessageType } from '../globals';
import { Point } from '../Point';
import { getImage } from '../utils/helpers';
import { Entity } from './Entity';

export class Bee extends Entity {
  readonly speedY: number;

  constructor(position: Point, speed: Point) {
    super(getImage(beeImage), position, 0.1, speed.x);

    this.speedY = speed.y;
  }

  protected _tick(game: GameInstance): void {
    const distance = this.position.distance(game.player.position);
    if (Math.abs(distance.x - this.velocity.x) > game.player.width * 2) {
      game.action(
        this.id,
        Math.sign(distance.x) < 1 ? this.onRight() : this.onLeft(),
      );
    }
    if (Math.abs(distance.y - this.velocity.y) > 0) {
      game.action(this.id, Math.sign(distance.y) < 1 ? this.onUp() : null);
    }
  }

  private onUp(): AccelerateParams | null {
    const maxVelocity = this.speedY / 2;
    const wasMoving = this.moving.y;
    if (wasMoving) {
      this.bufferedVelocity.y = maxVelocity;
      return null;
    }
    this.moving.y = true;
    this.time.y = 0;
    this.lastUpdate.y = window.performance.now();
    return {
      messageType: MessageType.yAccelerate,
      time: this.time.y,
      position: this.position.y,
      timestep: 0.001,
      velocity: maxVelocity,
      acceleration: -GRAVITY,
      minimum: this.minimumY,
      maximum: Infinity,
      id: this.id,
    };
  }
}
