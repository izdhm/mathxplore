/**
 * MathXplore Python Engine - AST node definitions.
 *
 * Every node carries a `line` so runtime errors and the CodeLab editor can
 * point at the exact line a student needs to look at.
 */

export interface Pos {
  line: number;
  col: number;
}

// ---------------------------------------------------------------- expressions

export type Expr =
  | NumLit
  | StrLit
  | BoolLit
  | NoneLit
  | Name
  | ListLit
  | TupleLit
  | UnaryOp
  | BinOp
  | BoolOp
  | Compare
  | Call
  | Attribute
  | Subscript
  | FString;

export interface NumLit extends Pos { kind: 'Num'; value: number; isFloat: boolean }
export interface StrLit extends Pos { kind: 'Str'; value: string }
export interface BoolLit extends Pos { kind: 'Bool'; value: boolean }
export interface NoneLit extends Pos { kind: 'None' }
export interface Name extends Pos { kind: 'Name'; id: string }
export interface ListLit extends Pos { kind: 'List'; items: Expr[] }
export interface TupleLit extends Pos { kind: 'Tuple'; items: Expr[] }
export interface UnaryOp extends Pos { kind: 'Unary'; op: '-' | '+' | 'not'; operand: Expr }
export interface BinOp extends Pos { kind: 'Bin'; op: string; left: Expr; right: Expr }
export interface BoolOp extends Pos { kind: 'BoolOp'; op: 'and' | 'or'; left: Expr; right: Expr }
export interface Compare extends Pos { kind: 'Compare'; ops: string[]; operands: Expr[] }
export interface Call extends Pos {
  kind: 'Call';
  func: Expr;
  args: Expr[];
  keywords: { name: string; value: Expr }[];
}
export interface Attribute extends Pos { kind: 'Attribute'; value: Expr; attr: string }
export interface Subscript extends Pos { kind: 'Subscript'; value: Expr; index: Expr; slice?: { lower?: Expr; upper?: Expr } }
/** f"..." - alternating literal chunks and embedded expressions. */
export interface FString extends Pos { kind: 'FString'; parts: ({ text: string } | { expr: Expr; spec?: string })[] }

// ----------------------------------------------------------------- statements

export type Stmt =
  | ExprStmt
  | Assign
  | AugAssign
  | If
  | While
  | For
  | FuncDef
  | Return
  | Break
  | Continue
  | Pass
  | Import;

export interface ExprStmt extends Pos { kind: 'ExprStmt'; value: Expr }
export interface Assign extends Pos { kind: 'Assign'; targets: Expr[]; value: Expr }
export interface AugAssign extends Pos { kind: 'AugAssign'; target: Expr; op: string; value: Expr }
export interface If extends Pos { kind: 'If'; test: Expr; body: Stmt[]; orelse: Stmt[] }
export interface While extends Pos { kind: 'While'; test: Expr; body: Stmt[] }
export interface For extends Pos { kind: 'For'; target: Expr; iter: Expr; body: Stmt[] }
export interface FuncDef extends Pos {
  kind: 'FuncDef';
  name: string;
  params: { name: string; def?: Expr }[];
  body: Stmt[];
}
export interface Return extends Pos { kind: 'Return'; value?: Expr }
export interface Break extends Pos { kind: 'Break' }
export interface Continue extends Pos { kind: 'Continue' }
export interface Pass extends Pos { kind: 'Pass' }
export interface Import extends Pos { kind: 'Import'; module: string; names?: string[]; alias?: string }

export interface Module {
  body: Stmt[];
}
