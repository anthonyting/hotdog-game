import hotdogImage from 'assets/images/hot_dog.svg';
import { Point } from '../Point';
import { getImage } from '../utils/helpers';
import { Entity } from './Entity';

export class Player extends Entity {
  public shooting: boolean = false;

  constructor(position: Point) {
    super(getImage(hotdogImage), position, 0.1);
  }

  public shoot() {
    this.shooting = true;
  }
}
