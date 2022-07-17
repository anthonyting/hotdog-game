import { AccelerateParams, GRAVITY, MessageType } from "./globals";
import { Point } from "./Point";
import { Direction } from "./index";
import { element } from "./element";
import { GameInstance } from "./GameInstance";

export class Entity {
  public position: Point;

  public readonly height: number;

  public readonly width: number;

  private _image: HTMLCanvasElement;

  static readonly hiddenImage: HTMLCanvasElement = element("canvas", {
    width: "1",
    height: "1",
  }) as HTMLCanvasElement;

  public readonly velocity: Point = new Point(0, 0);

  public readonly time: Point = new Point(0, 0);

  public readonly lastUpdate: Point = new Point(0, 0);

  public readonly moving: { x: boolean; y: boolean; } = { x: false, y: false };

  public readonly bufferedVelocity: Point = new Point(0, 0);

  private static ENTITY_INCREMENT: number = 0;

  public readonly id: number = Entity.ENTITY_INCREMENT++;

  static readonly ENTITY_MAP: Map<number, Entity> = new Map();

  public readonly speed: number;

  private readonly imageFacingLeft: HTMLCanvasElement;

  private readonly imageFacingRight: HTMLCanvasElement;

  public facing: Direction = Direction.LEFT;

  public visible: boolean = true;

  public minimumY;

  public flying: boolean = false;

  public text: HTMLCanvasElement = null;

  #tick: () => void = null;

  /**
   *
   * @param image assumed to be facing left
   * @param position
   * @param scale
   * @param tick
   * @param speed
   */
  constructor(
    image: HTMLImageElement | HTMLCanvasElement,
    position: Point,
    scale: number,
    tick: (this: Entity) => void = null,
    speed: number = 0.6,
    minimumY: number = 0
  ) {
    this.position = position;
    this.width = Math.floor(image.width * scale);
    this.height = Math.floor(image.height * scale);
    const canvas = element("canvas", {
      width: this.width.toString(),
      height: this.height.toString(),
    }) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, this.width, this.height);
    this._image = canvas;
    const flippedCanvas = element("canvas", {
      width: this.width.toString(),
      height: this.height.toString(),
    }) as HTMLCanvasElement;
    const flippedCtx = flippedCanvas.getContext("2d");
    flippedCtx.translate(canvas.width, 0);
    flippedCtx.scale(-1, 1);
    flippedCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
    this.imageFacingLeft = canvas;
    this.imageFacingRight = flippedCanvas;
    Entity.ENTITY_MAP.set(this.id, this);
    this.#tick = tick ? tick.bind(this) : null;
    this.speed = speed;
    this.minimumY = minimumY;
  }

  public get image(): HTMLCanvasElement {
    return this._image;
  }

  public jump(game: GameInstance) {
    if (this.moving.y)
      return;
    this.moving.y = true;
    this.time.y = 0;
    this.lastUpdate.y = window.performance.now();
    game.action(
      {
        messageType: MessageType.yAccelerate,
        time: this.time.y,
        position: this.position.y,
        timestep: 0.001,
        velocity: 0.6,
        acceleration: -GRAVITY,
        minimum: this.minimumY,
        maximum: Infinity,
        id: this.id,
      }
    );
  }

  public startFalling(time: number, game: GameInstance) {
    if (this.flying)
      return;
    this.time.y = 0;
    this.lastUpdate.y = time;
    this.velocity.y = 0;
    this.moving.y = true;
    game.action(
      {
        messageType: MessageType.yAccelerate,
        time: this.time.y,
        position: this.position.y,
        timestep: 0,
        velocity: this.velocity.y,
        acceleration: GRAVITY,
        minimum: this.minimumY,
        maximum: Infinity,
        id: this.id,
      }
    );
  }

  public tick(game: GameInstance) {
    if (this.#tick) {
      this.#tick();
    }
    if (this.position.y > this.minimumY && !this.moving.y) {
      this.startFalling(window.performance.now(), game);
    }
  }

  public onLeft(minimum: number = 0, acceleration = 0.001): AccelerateParams {
    const maxVelocity = -this.speed;
    const wasMoving = this.moving.x;
    this._image = this.imageFacingLeft;
    this.facing = Direction.LEFT;
    if (wasMoving) {
      this.bufferedVelocity.x = maxVelocity;
      return;
    }

    this.moving.x = true;
    this.time.x = 0;
    this.lastUpdate.x = window.performance.now();
    if (!wasMoving) {
      return {
        messageType: MessageType.xAccelerate,
        time: this.time.x,
        position: this.position.x,
        timestep: 0.001,
        velocity: maxVelocity,
        acceleration,
        minimum,
        maximum: 100000,
        id: this.id,
      };
    }

    return null;
  }

  public onRight(maximum: number = 10000, acceleration = -0.001): AccelerateParams {
    const maxVelocity = this.speed;
    const wasMoving = this.moving.x;
    this._image = this.imageFacingRight;
    this.facing = Direction.RIGHT;
    if (wasMoving) {
      this.bufferedVelocity.x = maxVelocity;
      return;
    }
    this.moving.x = true;
    this.time.x = 0;
    this.lastUpdate.x = window.performance.now();
    if (!wasMoving) {
      return {
        messageType: MessageType.xAccelerate,
        time: this.time.x,
        position: this.position.x,
        timestep: 0.001,
        velocity: maxVelocity,
        acceleration,
        minimum: 0,
        maximum,
        id: this.id,
      };
    }

    return null;
  }

  public hide() {
    this.visible = false;
    this._image = Entity.hiddenImage;
  }

  public show() {
    this.visible = true;
    if (this.velocity.x > 0) {
      this._image = this.imageFacingRight;
    } else {
      this._image = this.imageFacingLeft;
    }
  }
}
