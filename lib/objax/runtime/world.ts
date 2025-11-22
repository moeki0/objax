import { Thing } from "../type";

export interface World {
  id: string;
  name: string;
  things: Thing[];
}
