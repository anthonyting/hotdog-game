import './css/style.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { Background } from './components/Background';
import hotdogImage from './assets/images/hot_dog.svg';
import parkImage from './assets/images/park.jpg';
import dogImage from './assets/images/dog.svg';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { debounce } from 'debounce';
import { isMobileDevice, getImage } from './utils/helpers';
import {
  Button,
  Form,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from 'reactstrap';
import { Player } from './Player';
import { Point } from './Point';
import { Entity } from './Entity';
import { GameInstance, KeyMap } from './GameInstance';
import { Computer } from './computer';
import { AccelerateParams, GRAVITY, MessageType } from './globals';

interface GameProps {}

interface CanvasSize {
  width: number;
  height: number;
}

const computer = new Computer();

export const Game: React.FC<GameProps> = () => {
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(() => ({
    width: window.innerWidth,
    height: window.innerHeight * 0.9,
  }));
  const [keys, setKeys] = useState<KeyMap>({
    left: false,
    right: false,
    up: false,
    clicked: false,
  });
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [spawnDogInput, setSpawnDogInput] = useState<string>(
    (0.001).toString(),
  );

  const canvasRef = useRef<HTMLCanvasElement>();
  const playerRef = useRef<Player>();
  const gameRef = useRef<GameInstance>();

  const isMobile = useMemo(() => isMobileDevice(), []);

  const dogLogic = useCallback(function (this: Entity) {
    const distance = this.position.x - playerRef.current.position.x;
    const directionToMove = Math.sign(distance);
    if (Math.abs(distance - this.velocity.x) > playerRef.current.width) {
      gameRef.current.action(
        this.id,
        directionToMove < 1 ? this.onRight() : this.onLeft(),
      );
      if (Math.random() < 0.005) {
        this.jump(gameRef.current);
      }
    }
  }, []);

  useLayoutEffect(() => {
    const onSizeUpdate = debounce(() => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight * 0.9,
      });
      if (gameRef.current) {
        gameRef.current.setChanged();
      }
    }, 50);
    window.addEventListener('resize', onSizeUpdate);
    return () => window.removeEventListener('resize', onSizeUpdate);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const loadedHotDog = await getImage(hotdogImage);
      const player = new Player(
        loadedHotDog,
        new Point(0, canvasSize.height),
        0.1,
      );
      playerRef.current = player;

      const entities = [];
      const gap = canvasSize.width / 10;
      const heightGap = canvasSize.height / 10;
      const loadedDogImage = await getImage(dogImage);
      for (let i = 0, j = 0; i < canvasSize.width; i += gap, j += heightGap) {
        const speed = Math.max(
          0.1,
          Math.min(Math.random() * 0.4, player.speed),
        );
        entities.push(
          new Entity(
            loadedDogImage,
            new Point(i, canvasSize.height - j),
            1,
            dogLogic,
            speed,
          ),
        );
      }

      const platformImage = document.createElement('canvas');
      const platformContext = platformImage.getContext('2d');
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
        entity.startFlying();
      });

      const game = new GameInstance(
        player,
        canvasRef.current,
        keys,
        entities,
        interactables,
        computer,
        function (this: GameInstance, response) {
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
                if (this.keys.clicked && entity.id === player.id) {
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
                game.action(entity.id, params);
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
                if (this.keys.clicked && entity.id === player.id) {
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
                  maximum: canvasRef.current.width - entity.width,
                  id: entity.id,
                };
                game.action(entity.id, params);
              } else {
                entity.moving.x = false;
                entity.velocity.x = 0;
              }

              entity.lastUpdate.x = now;
              break;
            default:
              console.log(`unhandled: `, response);
          }
        },
      );

      gameRef.current = game;

      game.start();
    };

    initialize().catch(console.error);
  }, []);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.keys = keys;
      gameRef.current.setChanged();
    }
  }, [keys]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'd':
          if (keys.clicked) {
            return;
          }
          setKeys({ ...keys, right: true });
          break;
        case 'a':
          if (keys.clicked) {
            return;
          }
          setKeys({ ...keys, left: true });
          break;
        case ' ':
          if (keys.clicked) {
            return;
          }
          setKeys({ ...keys, up: true });
          break;
        case 'e':
          if (e.repeat || isPaused) return;
          playerRef.current.shooting = true;
          gameRef.current.setChanged();
          break;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [keys]);

  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'd':
          setKeys({ ...keys, right: false });
          break;
        case 'a':
          setKeys({ ...keys, left: false });
          break;
        case ' ':
          setKeys({ ...keys, up: false });
          break;
      }
    };
    document.addEventListener('keyup', onKeyUp);
    return () => document.removeEventListener('keyup', onKeyUp);
  }, [keys]);

  useEffect(() => {
    if (gameRef.current) {
      if (isPaused) {
        gameRef.current.pause();
      } else {
        gameRef.current.play();
      }
    }
  }, [isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const onTouchStart = (e: TouchEvent) => {
      playerRef.current.position.x = e.touches.item(0).pageX;
      playerRef.current.position.y = canvas.height - e.touches.item(0).pageY;
      playerRef.current.startFlying();
      gameRef.current.computer.flushActions(playerRef.current.id);
      setKeys({ ...keys, clicked: true });
    };
    const onTouchMove = (e: TouchEvent) => {
      if (keys.clicked) {
        playerRef.current.position.x = e.touches.item(0).pageX;
        playerRef.current.position.y = canvas.height - e.touches.item(0).pageY;
        playerRef.current.moving.y = true;
        gameRef.current.setChanged();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      playerRef.current.stopFlying();
      playerRef.current.startFalling(window.performance.now(), gameRef.current);
      setKeys({ ...keys, clicked: false });
    };

    canvas.addEventListener('touchstart', onTouchStart);
    canvas.addEventListener('touchmove', onTouchMove);
    canvas.addEventListener('touchend', onTouchEnd);

    const onMouseDown = (e: MouseEvent) => {
      playerRef.current.position.x = e.pageX;
      playerRef.current.position.y = canvas.height - e.pageY;
      playerRef.current.startFlying();
      gameRef.current.computer.flushActions(playerRef.current.id);
      setKeys({ ...keys, clicked: true });
    };
    const onMouseMove = (e: MouseEvent) => {
      if (keys.clicked) {
        playerRef.current.position.x = e.pageX;
        playerRef.current.position.y = canvas.height - e.pageY;
        playerRef.current.moving.y = true;
        gameRef.current.setChanged();
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      playerRef.current.stopFlying();
      playerRef.current.startFalling(window.performance.now(), gameRef.current);
      setKeys({ ...keys, clicked: false });
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);

      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
    };
  }, [keys]);

  return (
    <div>
      <Background backgroundUrl={parkImage}></Background>
      <Modal isOpen={isPaused} onClosed={() => setIsPaused(false)}>
        <ModalHeader toggle={() => setIsPaused(false)}>Paused</ModalHeader>
        <ModalBody>
          <Form
            onSubmit={(e) => {
              e.preventDefault();

              getImage(dogImage).then((image) => {
                gameRef.current.entities.push(
                  new Entity(
                    image,
                    new Point(canvasSize.width / 2, canvasSize.height),
                    1,
                    dogLogic,
                    Number(spawnDogInput),
                  ),
                );
                setIsPaused(false);
              });
            }}
          >
            <FormGroup>
              <Label for="dog-speed">Speed</Label>
              <Input
                id="dog-speed"
                type="number"
                min={0}
                max={2}
                value={spawnDogInput}
                onChange={(e) => {
                  setSpawnDogInput(e.target.value);
                }}
                step="any"
                title="too fast and it will run in circles"
              ></Input>
            </FormGroup>
            <Button type="submit" color="primary">
              Spawn a dog
            </Button>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setIsPaused(false)}>Close</Button>
        </ModalFooter>
      </Modal>
      <canvas {...canvasSize} ref={canvasRef}></canvas>
      {isMobile ? (
        <div
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
          }}
        >
          <Button
            onTouchStart={() => setKeys({ ...keys, left: true })}
            onTouchEnd={() => setKeys({ ...keys, left: false })}
          >
            LEFT
          </Button>
          <Button onClick={() => playerRef.current.jump(gameRef.current)}>
            UP
          </Button>
          <Button
            onTouchStart={() => setKeys({ ...keys, right: true })}
            onTouchEnd={() => setKeys({ ...keys, right: false })}
          >
            RIGHT
          </Button>
          <Button
            onClick={() => setIsPaused(true)}
            onFocus={(e) => e.target.blur()}
          >
            Pause
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => setIsPaused(true)}
          onFocus={(e) => e.target.blur()}
        >
          Pause
        </Button>
      )}
    </div>
  );
};
