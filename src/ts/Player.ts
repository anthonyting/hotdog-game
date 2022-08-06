import { Entity } from './Entity';

export class Player extends Entity {
  public shooting: boolean = false;

  public shoot() {
    this.shooting = true;
  }
}
