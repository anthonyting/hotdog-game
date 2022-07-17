import "./css/style.css";
import "bootstrap/dist/css/bootstrap.min.css";

import { debounce } from "debounce";
import HotDog from "./assets/images/hot_dog.svg";
import Dog from "./assets/images/dog.svg";
import Bullet from "./assets/images/bullet.svg";
import Background from "./assets/images/park.jpg";
import {
  AccelerateParams,
  GRAVITY,
  MessageType,
} from "./globals";
import { Point } from "./Point";
import { Entity } from "./Entity";
import { GameInstance } from "./GameInstance";
import { Player } from "./Player";
import { Computer } from "./computer";
import { Movement } from "./Movement";
import { element } from "./element";

const computer = new Computer();

export enum Direction {
  LEFT,
  RIGHT,
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.addEventListener(
      "load",
      () => {
        resolve(img);
        img.removeEventListener("error", reject);
      },
      {
        once: true,
      }
    );
    img.addEventListener("error", reject, {
      once: true,
    });
    img.src = src;
  });
}

function isMobileDevice(): boolean {
  // from https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
  let hasTouchScreen = false;
  if ("maxTouchPoints" in navigator) {
    hasTouchScreen = navigator.maxTouchPoints > 0;
  } else if ("msMaxTouchPoints" in navigator) {
    hasTouchScreen = (navigator as any).msMaxTouchPoints > 0;
  } else {
    const mQ = window.matchMedia && matchMedia("(pointer:coarse)");
    if (mQ && mQ.media === "(pointer:coarse)") {
      hasTouchScreen = !!mQ.matches;
    } else if ("orientation" in window) {
      hasTouchScreen = true; // deprecated, but good fallback
    } else {
      // Only as a last resort, fall back to user agent sniffing
      const UA = navigator.userAgent;
      hasTouchScreen =
        /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
        /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA);
    }
  }

  return hasTouchScreen;
}

// safer if the server generates this
const id = (Math.random() + 1).toString(36).substring(7);

async function initMultiplayer(
  game: GameInstance,
  newPlayerImage: HTMLImageElement,
  socket: WebSocket
) {
  const createPlayer = (id: string) => {
    const newPlayer = new Player(
      newPlayerImage,
      new Point(0, window.innerHeight),
      0.1
    );
    multiplayerEntityMap.set(id, newPlayer);
    game.entities.push(newPlayer);
    return newPlayer;
  };
  await new Promise((resolve, reject) => {
    if (socket.readyState === WebSocket.OPEN) {
      resolve(null);
    } else if (socket.readyState !== WebSocket.CONNECTING) {
      reject(null);
    } else {
      socket.addEventListener("open", resolve, {
        once: true,
      });
      socket.addEventListener("error", reject);
    }
  });
  socket.send(
    JSON.stringify({
      id,
      type: "connect",
    })
  );
  const multiplayerEntityMap: Map<string, Player> = new Map();
  socket.addEventListener("message", (e) => {
    const parsed = JSON.parse(e.data);

    if (!parsed.id || typeof parsed.id !== "string") {
      console.error(`no id for message`, parsed);
      return;
    }

    const player =
      multiplayerEntityMap.get(parsed.id) || createPlayer(parsed.id);

    if (parsed.type === "connect") return;

    if (parsed.id !== id) {
      switch (parsed.type) {
        case "movement":
          if (
            !isNaN(parsed.pX) &&
            !isNaN(parsed.pY) &&
            typeof parsed.flying === "boolean" &&
            !isNaN(parsed.minY)
          ) {
            player.position.x = parsed.pX;
            player.position.y = parsed.pY;
            player.flying = parsed.flying;
            player.minimumY = parsed.minY;
            game.setChanged();
          } else {
            console.error(`could not parse position for message`, parsed);
          }
          break;
        case "message":
          if (typeof parsed.content === "string" && parsed.content) {
            if (!player.text) {
              player.text = element("canvas") as HTMLCanvasElement;
            }
            const ctx = player.text.getContext("2d");
            player.text.height = 72;
            player.text.width = parsed.content.length * 18;
            ctx.clearRect(0, 0, player.text.width, player.text.height);
            ctx.font = "18px serif";
            ctx.fillText(parsed.content, 0, 36);
            game.setChanged();
          } else {
            console.error(`could not parse message for message`, parsed);
          }
          break;
        default:
          console.error(`unknown type for message`, parsed);
      }
    }
  });

  const prevPosition = game.player.position.clone();
  const interval = setInterval(() => {
    if (!prevPosition.equals(game.player.position)) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            id,
            type: "movement",
            pX: game.player.position.x,
            pY: game.player.position.y,
            minY: game.player.minimumY,
            flying: game.player.flying || game.player.moving.y,
          })
        );
      } else {
        console.warn(
          `connection disconnected, there is no retry attempts so refresh please`
        );
        clearInterval(interval);
      }
      prevPosition.x = game.player.position.x;
      prevPosition.y = game.player.position.y;
    }
  }, (1 / 12) * 1000);
}

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = element("canvas", {
    width: window.innerWidth.toString(),
    height: (window.innerHeight * 0.9).toString(),
  }) as HTMLCanvasElement;

  const keyMap: Map<Movement, boolean> = new Map();

  window.addEventListener(
    "resize",
    debounce(() => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 0.9;
      game.setChanged();
    }, 50)
  );

  const root = element("div");
  const background = element("div", {
    style: {
      backgroundImage: `url(${Background})`,
      opacity: "0.5",
      position: "fixed",
      height: "100%",
      width: "100%",
      zIndex: "-1",
      backgroundSize: "cover",
    },
  });
  root.appendChild(background);

  const menuButton = element("button", {
    textContent: "MENU/PAUSE",
    class: ["btn btn-primary"]
  });
  menuButton.addEventListener("click", (e) => {
    modal.show();
    game.pause();
  });
  const spawnDogForm = element("form", {
    style: {
      display: "flex",
      flexDirection: "column",
      padding: "1rem",
    },
  });
  const spawnDogButton = element("button", {
    textContent: "Spawn a dog",
    type: "submit",
    class: ['btn btn-primary'],
  });
  const spawnDogLabel = element("label", {
    textContent: "Speed",
    for: "dog-speed",
  });
  const spawnDogInput = element("input", {
    id: "dog-speed",
    type: "number",
    min: "0",
    value: "0.001",
    max: "2",
    step: "any",
    title: "too fast and it will run in circles around you",
    class: ['form-control'],
  });
  spawnDogForm.appendChild(spawnDogButton);
  spawnDogForm.appendChild(spawnDogLabel);
  spawnDogForm.appendChild(spawnDogInput);

  const modalElement = document.getElementById('menu');
  const modalContent = modalElement.querySelector('.modal-body');
  modalContent.appendChild(spawnDogForm);
  let modal: bootstrap.Modal;
  import('bootstrap').then((bootstrap) => {
    modal = new bootstrap.Modal(modalElement);
  });
  modalElement.addEventListener('hide.bs.modal', () => {
    game.play();
  });

  root.appendChild(canvas);
  if (isMobileDevice()) {
    const container = element("div", {
      style: {
        display: "flex",
        width: "100%",
        justifyContent: "space-between",
      },
    });

    const left = element("button", {
      textContent: "LEFT",
    });
    left.addEventListener("touchstart", () => {
      keyMap.set(Movement.LEFT, true);
    });
    left.addEventListener("touchend", () => {
      keyMap.set(Movement.LEFT, false);
    });
    container.appendChild(left);

    const up = element("button", {
      textContent: "UP",
    });
    up.addEventListener("click", () => {
      player.jump(game);
    });
    container.appendChild(up);

    const right = element("button", {
      textContent: "RIGHT",
    });
    right.addEventListener("touchstart", () => {
      keyMap.set(Movement.RIGHT, true);
    });
    right.addEventListener("touchend", () => {
      keyMap.set(Movement.RIGHT, false);
    });
    container.appendChild(right);
    container.appendChild(menuButton);

    root.appendChild(container);
  } else {
    root.appendChild(menuButton);
  }

  const loadedHotDog = await loadImage(HotDog);

  const player = new Player(loadedHotDog, new Point(0, canvas.height), 0.1);
  const entities = [];
  const gap = canvas.width / 10;
  const heightGap = canvas.height / 10;
  const dogImage = await loadImage(Dog);
  const dogLogic = function (this: Entity) {
    const distance = this.position.x - player.position.x;
    const directionToMove = Math.sign(distance);
    if (Math.abs(distance - this.velocity.x) > player.width) {
      game.action(directionToMove < 1 ? this.onRight() : this.onLeft());
      if (Math.random() < 0.005) {
        this.jump(game);
      }
    }
  };
  for (let i = 0, j = 0; i < canvas.width; i += gap, j += heightGap) {
    const speed = Math.max(0.1, Math.min(Math.random() * 0.4, player.speed));
    entities.push(
      new Entity(dogImage, new Point(i, canvas.height - j), 1, dogLogic, speed)
    );
  }

  spawnDogForm.addEventListener("submit", (e) => {
    e.preventDefault();
    modal.hide();
    game.entities.push(
      new Entity(
        dogImage,
        new Point(canvas.width / 2, canvas.height),
        1,
        dogLogic,
        Number(spawnDogInput.value)
      )
    );
  });

  const bullet = new Entity(
    await loadImage(Bullet),
    new Point(-100, -100),
    0.1,
    function (this: Entity) {
      if (player.shooting && !this.visible && !this.moving.y) {
        this.position.x = player.position.x;
        this.position.y = player.position.y;
        this.velocity.x = player.velocity.x;
        this.velocity.y = player.velocity.y;
        this.show();
        const params =
          player.facing === Direction.LEFT ? this.onLeft() : this.onRight();
        game.action(params);
        const now = window.performance.now();
        this.time.y = 0;
        this.lastUpdate.y = now;
        this.velocity.y = 0;
        this.moving.y = true;
        const newParams: AccelerateParams = {
          messageType: MessageType.yAccelerate,
          time: this.time.y,
          position: this.position.y,
          timestep: 0,
          velocity: 0.5,
          acceleration: GRAVITY,
          minimum: this.minimumY,
          maximum: Infinity,
          id: this.id,
        }
        game.action(newParams);
        player.shooting = false;
      } else if (this.position.y + this.height <= 0) {
        this.hide();
      }
    },
    1,
    -500
  );

  const platformImage = element("canvas") as HTMLCanvasElement;
  const platformContext = platformImage.getContext("2d");
  platformContext.beginPath();
  platformContext.moveTo(0, 0);
  platformContext.lineWidth = 50;
  platformContext.lineTo(500, 0);
  platformContext.stroke();

  const interactables = [
    new Entity(platformImage, new Point(-50, 8), 1),
    new Entity(platformImage, new Point(750, 100), 1),
    new Entity(platformImage, new Point(1000, 200), 1),
    new Entity(platformImage, new Point(1250, 300), 1),
  ];
  interactables.forEach((entity) => {
    entity.flying = true;
  });

  bullet.hide();
  entities.push(bullet);
  const game = new GameInstance(
    player,
    canvas,
    keyMap,
    entities,
    interactables,
    computer,
    (response) => {

      const now = window.performance.now();
      const entity = Entity.ENTITY_MAP.get(response.id);
      if (!entity) {
        console.warn(`Entity not found with id: ${response.id}`);
        return;
      }
      game.setChanged();

      switch (response.messageType) {
        case MessageType.yAccelerate:
          entity.position.y = response.position;
          entity.velocity.y = response.velocity;
          entity.time.y = response.time;

          if (entity.position.y > entity.minimumY) {
            if (keyMap.get(Movement.CLICKED) && entity.id === player.id) {
              entity.moving.y = false;
              return;
            }
            const params: AccelerateParams = {
              messageType: MessageType.yAccelerate,
              time: entity.time.y,
              position: entity.position.y,
              timestep: now - entity.lastUpdate.y,
              velocity: entity.velocity.y,
              acceleration: GRAVITY,
              minimum: entity.minimumY,
              maximum: Infinity,
              id: entity.id,
            };
            game.action(params);
          } else {
            entity.moving.y = false;
          }

          entity.lastUpdate.y = now;
          break;
        case MessageType.xAccelerate:
          entity.position.x = response.position;

          const bufferedVelocity = entity.bufferedVelocity.x;

          entity.velocity.x = bufferedVelocity || response.velocity;
          entity.bufferedVelocity.x = 0;
          entity.time.x = response.time;

          if (Math.abs(entity.velocity.x) > 0.05) {
            if (keyMap.get(Movement.CLICKED) && entity.id === player.id) {
              entity.moving.x = false;
              entity.velocity.x = 0;
              return;
            }

            const acceleration = bufferedVelocity
              ? 0
              : (entity.moving.y ? -0.001 : -0.005) *
              Math.sign(entity.velocity.x);

            const params: AccelerateParams = {
              messageType: MessageType.xAccelerate,
              time: entity.time.x,
              position: entity.position.x,
              timestep: now - entity.lastUpdate.x,
              velocity: entity.velocity.x,
              acceleration,
              minimum: 0,
              maximum: canvas.width - entity.width,
              id: entity.id,
            };
            game.action(params);
          } else {
            entity.moving.x = false;
            entity.velocity.x = 0;
          }

          entity.lastUpdate.x = now;
          break;
        default:
          console.log(`unhandled: `, response);
      }
    }
  );

  if (USE_MULTIPLAYER) {
    try {
      const socket = new WebSocket(
        `${(window.location.protocol === "https:" ? "wss://" : "ws://") +
        window.location.host
        }/socket`
      );

      await initMultiplayer(game, loadedHotDog, socket);

      const messageForm = element("form", {
        style: {
          display: "flex",
          flexDirection: "column",
          padding: "1rem",
        },
      });
      const messageInput = element("input", {
        id: "message-input",
        type: "text",
        required: "true",
      });
      const messageSubmit = element("button", {
        type: "submit",
        textContent: "Send Message",
      });
      messageForm.append(messageInput);
      messageForm.append(messageSubmit);
      messageForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (messageInput.value) {
          if (!player.text) {
            player.text = element("canvas") as HTMLCanvasElement;
          }
          const ctx = player.text.getContext("2d");
          player.text.height = 72;
          player.text.width = messageInput.value.length * 18;
          ctx.clearRect(0, 0, player.text.width, player.text.height);
          ctx.font = "18px serif";
          ctx.fillText(messageInput.value, 0, 36);
          socket.send(
            JSON.stringify({
              id,
              type: "message",
              content: messageInput.value,
            })
          );
          messageInput.value = "";
          modal.hide();
        }
      });

      modalContent.appendChild(messageForm);
    } catch (err) {
      console.error(
        `failed to start multiplayer, will just use singleplayer`,
        err
      );
    }
  }

  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "d":
        if (keyMap.get(Movement.CLICKED)) {
          return;
        }
        keyMap.set(Movement.RIGHT, true);
        break;
      case "a":
        if (keyMap.get(Movement.CLICKED)) {
          return;
        }
        keyMap.set(Movement.LEFT, true);
        break;
      case " ":
        if (keyMap.get(Movement.CLICKED)) {
          return;
        }
        keyMap.set(Movement.UP, true);
        break;
      case "e":
        if (e.repeat || game.isPaused()) return;
        player.shooting = true;
        game.setChanged();
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "d":
        keyMap.set(Movement.RIGHT, false);
        break;
      case "a":
        keyMap.set(Movement.LEFT, false);
        break;
      case " ":
        keyMap.set(Movement.UP, false);
        break;
    }
  });

  canvas.addEventListener("touchstart", (e) => {
    player.position.x = e.touches.item(0).pageX;
    player.position.y = canvas.height - e.touches.item(0).pageY;
    player.flying = true;
    keyMap.set(Movement.CLICKED, true);
  });
  canvas.addEventListener("touchmove", (e) => {
    if (keyMap.get(Movement.CLICKED)) {
      player.position.x = e.touches.item(0).pageX;
      player.position.y = canvas.height - e.touches.item(0).pageY;
      player.moving.y = true;
      game.setChanged();
    }
  });
  canvas.addEventListener("touchend", (e) => {
    keyMap.set(Movement.CLICKED, false);
    player.flying = false;
    player.startFalling(window.performance.now(), game);
  });

  canvas.addEventListener("mousedown", (e) => {
    player.position.x = e.pageX;
    player.position.y = canvas.height - e.pageY;
    player.flying = true;
    keyMap.set(Movement.CLICKED, true);
  });
  canvas.addEventListener("mousemove", (e) => {
    if (keyMap.get(Movement.CLICKED)) {
      player.position.x = e.pageX;
      player.position.y = canvas.height - e.pageY;
      player.moving.y = true;
      game.setChanged();
    }
  });
  canvas.addEventListener("mouseup", () => {
    keyMap.set(Movement.CLICKED, false);
    player.flying = false;
    player.startFalling(window.performance.now(), game);
  });

  game.start();

  document.body.appendChild(root);
});
