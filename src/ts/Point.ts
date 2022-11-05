export class Point {
  public x;

  public y;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Point(this.x, this.y);
  }

  equals(position: Point) {
    return position && this.x === position.x && this.y === position.y;
  }

  add(x: number, y: number) {
    this.x += x;
    this.y += y;
  }

  distance(position: Point) {
    return new Point(this.x - position.x, this.y - position.y);
  }
}
