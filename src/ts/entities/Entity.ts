/* eslint-disable no-underscore-dangle */
import { AccelerateParams, GRAVITY, MessageType } from '../globals';
import { Point } from '../Point';
import { Direction } from '../Direction';
import type { GameInstance } from '../GameInstance';
import { element } from '../utils/dom-helper';

export type EntityId = number;

type EntityEventType = 'load' | 'error';
interface EntityCallbacks {
  load: () => void;
  error: (err: unknown) => void;
}

export abstract class Entity {
  public position: Point;

  #height: number;

  #width: number;

  #image: HTMLCanvasElement;

  static readonly hiddenImage: HTMLCanvasElement = element('canvas', {
    width: '1',
    height: '1',
  }) as HTMLCanvasElement;

  public readonly velocity: Point = new Point(0, 0);

  public readonly time: Point = new Point(0, 0);

  public readonly lastUpdate: Point = new Point(0, 0);

  public readonly moving: { x: boolean; y: boolean } = { x: false, y: false };

  public readonly bufferedVelocity: Point = new Point(0, 0);

  private static ENTITY_INCREMENT: EntityId = 0;

  public readonly id: EntityId = Entity.ENTITY_INCREMENT++;

  // eslint-disable-next-line no-use-before-define
  static readonly ENTITY_MAP: Map<number, Entity> = new Map();

  public readonly speed: number;

  #imageFacingLeft: HTMLCanvasElement;

  #imageFacingRight: HTMLCanvasElement;

  public facing: Direction = Direction.LEFT;

  public visible: boolean = true;

  public minimumY: number;

  #flying: boolean = false;

  public text: HTMLCanvasElement = null;

  #loaded: boolean;

  #errored: unknown;

  #onload?: () => void = null;

  #onerror?: (err: unknown) => void = null;

  /**
   *
   * @param image assumed to be facing left
   * @param position
   * @param scale
   * @param speed
   */
  constructor(
    image: Promise<HTMLImageElement> | HTMLCanvasElement,
    position: Point,
    scale: number,
    speed: number = 0.6,
    minimumY: number = 0,
  ) {
    this.position = position;
    Entity.ENTITY_MAP.set(this.id, this);
    this.speed = speed;
    this.minimumY = minimumY;
    if (image instanceof HTMLCanvasElement) {
      this.load(image, scale);
    } else {
      image
        .then((element) => this.load(element, scale))
        .catch((err) => {
          this.#errored = err;
          if (this.#onerror) {
            this.#onerror(err);
          }
        });
    }
  }

  addEventListener<T extends EntityEventType, K extends EntityCallbacks[T]>(
    type: T,
    cb: K,
  ) {
    switch (type) {
      case 'load':
        this.#onload = cb as EntityCallbacks['load'];
        break;
      case 'error':
        this.#onerror = cb as EntityCallbacks['error'];
        break;
      default:
        break;
    }
  }

  waitForLoad(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.#loaded) {
        resolve();
      } else if (this.#errored) {
        reject(this.#errored);
      } else {
        this.addEventListener('load', () => resolve());
        this.addEventListener('error', reject);
      }
    });
  }

  load(image: HTMLImageElement | HTMLCanvasElement, scale: number) {
    this.#width = Math.floor(image.width * scale);
    this.#height = Math.floor(image.height * scale);
    const canvas = element('canvas', {
      width: this.#width.toString(),
      height: this.height.toString(),
    });
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, this.#width, this.#height);
    this.#image = canvas;
    const flippedCanvas = element('canvas', {
      width: this.#width.toString(),
      height: this.#height.toString(),
    });
    const flippedCtx = flippedCanvas.getContext('2d');
    flippedCtx.translate(canvas.width, 0);
    flippedCtx.scale(-1, 1);
    flippedCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
    this.#imageFacingLeft = canvas;
    this.#imageFacingRight = flippedCanvas;
    if (this.#onload) {
      this.#onload();
    }
    this.#loaded = true;
  }

  public get image(): HTMLCanvasElement {
    return this.#image;
  }

  public startFlying() {
    this.moving.x = false;
    this.moving.y = false;
    this.#flying = true;
  }

  public stopFlying() {
    this.#flying = false;
  }

  public jump(game: GameInstance) {
    if (this.moving.y) return;
    this.moving.y = true;
    this.time.y = 0;
    this.lastUpdate.y = window.performance.now();
    game.action(this.id, {
      messageType: MessageType.yAccelerate,
      time: this.time.y,
      position: this.position.y,
      timestep: 0.001,
      velocity: 0.6,
      acceleration: -GRAVITY,
      minimum: this.minimumY,
      maximum: Infinity,
      id: this.id,
    });
  }

  public startFalling(time: number, game: GameInstance) {
    if (this.#flying) return;
    this.time.y = 0;
    this.lastUpdate.y = time;
    this.velocity.y = 0;
    this.moving.y = true;
    game.action(this.id, {
      messageType: MessageType.yAccelerate,
      time: this.time.y,
      position: this.position.y,
      timestep: 0,
      velocity: this.velocity.y,
      acceleration: GRAVITY,
      minimum: this.minimumY,
      maximum: Infinity,
      id: this.id,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  protected _tick(game: GameInstance): void {}

  public tick(game: GameInstance) {
    if (this._tick) {
      this._tick(game);
    }
    if (this.position.y > this.minimumY && !this.moving.y) {
      this.startFalling(window.performance.now(), game);
    }
  }

  public onLeft(
    minimum: number = 0,
    acceleration = 0.001,
  ): AccelerateParams | null {
    const maxVelocity = -this.speed;
    const wasMoving = this.moving.x;
    this.#image = this.#imageFacingLeft;
    this.facing = Direction.LEFT;
    if (wasMoving) {
      this.bufferedVelocity.x = maxVelocity;
      return null;
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

  public onRight(
    maximum: number = 10000,
    acceleration = -0.001,
  ): AccelerateParams | null {
    const maxVelocity = this.speed;
    const wasMoving = this.moving.x;
    this.#image = this.#imageFacingRight;
    this.facing = Direction.RIGHT;
    if (wasMoving) {
      this.bufferedVelocity.x = maxVelocity;
      return null;
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
    this.#image = Entity.hiddenImage;
  }

  public show() {
    this.visible = true;
    if (this.velocity.x > 0) {
      this.#image = this.#imageFacingRight;
    } else {
      this.#image = this.#imageFacingLeft;
    }
  }

  public get width(): number {
    return this.#width;
  }

  public get height(): number {
    return this.#height;
  }
}
