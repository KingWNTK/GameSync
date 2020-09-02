export class Vector2 {
    x: number;
    y: number;
    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
  
    clone(): Vector2 {
      return new Vector2(this.x, this.y);
    }
  
    add(rhs: Vector2): Vector2 {
      return new Vector2(this.x + rhs.x, this.y + rhs.y);
    }
  }
  
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    add(rhs: Vector3): Vector3 {
      return new Vector3(this.x + rhs.x, this.y + rhs.y, this.z + rhs.z);
    }
  
    clone(): Vector3 {
      return new Vector3(this.x, this.y, this.z);
    }
  
    toColorString(): string {
      return 'rgb(' + this.x + ',' + this.y + ',' + this.z + ')';
    }
  }
  