import { Point, Rect } from "./utils";

export class Paddle {
  rect: Rect;
  color: string | CanvasGradient | CanvasPattern = "white";

  constructor(spawn: Point, size: Point = new Point(6, 100)) {
    this.rect = new Rect(spawn, size);
  }

  draw(context: CanvasRenderingContext2D) {
    this.rect.draw(context, this.color);
  }

  move(e: MouseEvent) {
    const canvas = e.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const new_y = ((e.clientY - rect.top) * canvas.height) / rect.height;

    const offset: number = this.rect.size.y / 2;
    if (new_y - offset < 0) {
      this.rect.center.y = offset;
    } else if (new_y + offset > canvas.height) {
      this.rect.center.y = canvas.height - offset;
    } else {
      this.rect.center.y = new_y;
    }
  }
}