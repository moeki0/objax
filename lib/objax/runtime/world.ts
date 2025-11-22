import { Thing } from "../type";

export interface World {
  things: Thing[];
  width?: number;
  height?: number;
}
