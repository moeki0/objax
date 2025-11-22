/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Name {
  type: "Name";
  name: string;
}

export interface StringType {
  type: "String";
  value: string;
}

export interface BooleanType {
  type: "Boolean";
  value: boolean;
}

export interface FieldValueType {
  type: "Reference";
  path: (Name | IntegerType)[];
}

export interface CompareType {
  type: "Compare";
  op: "==" | "!=" | "<" | "<=" | ">" | ">=";
  left: ValueType;
  right: ValueType;
}

export interface EventActionType {
  type: "EventAction";
  name: Name;
  transition: FieldValueType;
}

export interface TransitionType {
  type: "Transition";
  name: Name;
  states: ValueType[];
  field: FieldValueType;
}

export interface FieldType {
  type: "Field";
  name: Name;
  value: ValueType;
}

export interface VisibleType {
  type: "Visible";
  value: ValueType;
}

export interface Duplicate {
  type: "Duplicate";
  name: Name;
}

export interface OrType {
  type: "Or";
  left: ValueType;
  right: ValueType;
}

export interface AndType {
  type: "And";
  left: ValueType;
  right: ValueType;
}

export interface BinaryOp {
  type: "BinaryOp";
  left: ValueType;
  right: ValueType;
  op: string;
}

export interface NotType {
  type: "Not";
  operand: ValueType;
}

export interface IntegerType {
  type: "Integer";
  value: number;
}

export interface NumberType {
  type: "Number";
  value: number;
}

export interface ArrayType {
  type: "Array";
  value: ValueType[];
}

export interface ItType {
  type: "It";
}

export interface OperationType {
  type: "Operation";
  name: Name;
  field: FieldValueType;
  block: BlockType;
}

export interface BlockType {
  type: "Block";
  expr: ValueType;
}

export interface ConstantType {
  type: "Constant";
  value: "pi" | "e";
}

export interface FunctionCallType {
  type: "FunctionCall";
  name: Name;
  args: ValueType[];
}

export type ValueType =
  | BooleanType
  | StringType
  | IntegerType
  | NumberType
  | BinaryOp
  | ArrayType
  | FieldValueType
  | CompareType
  | OrType
  | AndType
  | NotType
  | ItType
  | ConstantType
  | FunctionCallType;

export interface Thing {
  id: string;
  code: string;
  x: number;
  y: number;
  name: string;
  users: any[];
  sticky?: string;
  duplicate?: Duplicate;
  eventActions?: EventActionType[];
  transitions?: TransitionType[];
  operations?: OperationType[];
  fields?: FieldType[];
}
