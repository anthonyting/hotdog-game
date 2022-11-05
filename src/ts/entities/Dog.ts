import dogImage from 'assets/images/dog.svg';
import { getImage } from '../utils/helpers';
import { Entity } from './Entity';
import { Point } from '../Point';
import { GameInstance } from '../GameInstance';

export class Dog extends Entity {
  constructor(position: Point, speed: number = 0.6) {
    super(getImage(dogImage), position, 1, speed);
  }

  protected _tick(game: GameInstance): void {
    const distance = this.position.distance(game.player.position);
    const directionToMove = Math.sign(distance.x);
    if (Math.abs(distance.x - this.velocity.x) > game.player.width) {
      game.action(
        this.id,
        directionToMove < 1 ? this.onRight() : this.onLeft(),
      );
      if (Math.random() < 0.005) {
        this.jump(game);
      }
    }
  }
}
