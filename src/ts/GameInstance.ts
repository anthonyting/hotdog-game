import { Computer } from "./computer";
import { Entity } from "./Entity";
import { AccelerateParams, AccelerateResponse } from "./globals";
import { Movement } from "./Movement";
import { Player } from "./Player";

export class GameInstance {
  public readonly player: Player;

  #canvas: HTMLCanvasElement;

  #ctx: CanvasRenderingContext2D;

  #loopFunc: () => void;

  public keyMap: Map<Movement, boolean>;

  #changed: boolean = false;

  public readonly entities: Entity[];

  #animation: number;

  #isPaused: boolean = false;

  #pauseTimestamp: number = 0;

  #queuedMessages: AccelerateParams[] = [];

  #computer: Computer;

  #onAccelerateResponse: (response: AccelerateResponse) => void;

  public readonly interactables: Entity[];

  constructor(
    player: Player,
    canvas: HTMLCanvasElement,
    keyMap: Map<Movement, boolean>,
    entitites: Entity[],
    interactables: Entity[],
    computer: Computer,
    onAccelerateResponse: (response: AccelerateResponse) => void,
  ) {
    this.player = player;
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d");
    this.keyMap = keyMap;
    this.entities = entitites;
    this.interactables = interactables;
    this.#loopFunc = this.loop.bind(this);
    this.#computer = computer;
    this.#onAccelerateResponse = onAccelerateResponse;
  }

  public start() {
    const now = window.performance.now();
    this.player.startFalling(now, this);
    this.entities.forEach((entity) => {
      entity.startFalling(now, this);
    });
    this.setChanged();

    this.#loopFunc();
  }

  public isPaused(): boolean {
    return this.#isPaused;
  }

  public setChanged() {
    this.#changed = true;
  }

  public play() {
    if (!this.#isPaused)
      return;

    this.#isPaused = false;

    const adjustment = window.performance.now() - this.#pauseTimestamp;

    this.player.lastUpdate.y += adjustment;
    this.player.lastUpdate.x += adjustment;
    this.entities.forEach((entity) => {
      entity.lastUpdate.y += adjustment;
      entity.lastUpdate.x += adjustment;
    });
    this.#queuedMessages.forEach((message) => {
      this.action(message);
    });
    this.#queuedMessages.length = 0;

    this.#loopFunc();
  }

  public pause() {
    if (this.#isPaused)
      return;

    this.#isPaused = true;
    this.#pauseTimestamp = window.performance.now();
    window.cancelAnimationFrame(this.#animation);
  }

  private loop() {
    if (this.#isPaused)
      return;

    if (this.keyMap.get(Movement.RIGHT)) {
      this.action(this.player.onRight());
    } else if (this.keyMap.get(Movement.LEFT)) {
      this.action(this.player.onLeft());
    }

    if (this.keyMap.get(Movement.UP)) {
      this.player.jump(this);
    }

    if (this.#changed) {
      this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

      let changedMinimumY = false;
      this.interactables.forEach((entity) => {
        if (
          // right side
          this.player.position.x + this.player.width <=
          entity.position.x + entity.width &&
          // left side
          entity.position.x <= this.player.position.x &&
          // player above
          this.player.position.y >= entity.position.y + entity.height) {
          changedMinimumY = true;
          this.player.minimumY = entity.position.y + entity.height;
        }
        this.#ctx.drawImage(
          entity.image,
          Math.floor(entity.position.x),
          Math.floor(this.#canvas.height - entity.position.y - entity.height)
        );
      });
      if (!changedMinimumY) {
        this.player.minimumY = 0;
      }
      this.entities.forEach((entity) => {
        const x = Math.floor(entity.position.x);
        const y = Math.floor(
          this.#canvas.height - entity.position.y - entity.height
        );
        this.#ctx.drawImage(entity.image, x, y);
        entity.tick(this);
        if (entity.text) {
          this.#ctx.drawImage(
            entity.text,
            x,
            y - entity.height - entity.text.height
          );
        }
      });
      const x = Math.floor(this.player.position.x);
      const y = Math.floor(
        this.#canvas.height - this.player.position.y - this.player.height
      );
      this.#ctx.drawImage(this.player.image, x, y);
      if (this.player.text) {
        this.#ctx.drawImage(
          this.player.text,
          x,
          y - this.player.height - this.player.text.height
        );
      }
      this.player.tick(this);
      this.#changed = false;
    }

    const executionResult = this.#computer.execute();
    for (let i = 0; i < executionResult.length; i++) {
      this.#onAccelerateResponse(executionResult[i]);
    }

    this.#animation = window.requestAnimationFrame(this.#loopFunc);
  }

  public action(params: AccelerateParams) {
    if (params) {
      if (this.#isPaused) {
        this.#queuedMessages.push(params);
      } else {
        // params.type = message;
        // worker.postMessage(params);
        this.#computer.queue(params);
      }
    }
  }
}
