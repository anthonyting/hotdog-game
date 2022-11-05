import { Point } from '../Point';
import { Entity } from './Entity';

export class Platform extends Entity {
  constructor(position: Point) {
    if (!Platform.image) {
      const platformImage = document.createElement('canvas');
      const platformContext = platformImage.getContext('2d');
      platformContext.beginPath();
      platformContext.moveTo(0, 0);
      platformContext.lineWidth = 50;
      platformContext.lineTo(500, 0);
      platformContext.stroke();
      Platform.image = platformImage;
    }

    super(Platform.image, position, 1);
  }

  private static image: HTMLCanvasElement = null;
}
