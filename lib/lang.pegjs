{
  function toInt(chars) {
    return parseInt(chars.join(""), 10);
  }
}

Start
  = _ stmts:StatementList _ { return stmts; }

StatementList
  = head:Statement tail:(_ Statement)* {
      return [head].concat(tail.map(item => item[1]));
    }

Statement
  = expr:Additive { return { type: "ExprStatement", expr } }
  / Duplicate
  / DefName
  / Sticky
  / EventAction
  / Transition
  / DefField
  / If
  / Name

Value
  = And / Or / Eq / Additive / Integer / Boolean / FieldValue / String

Or
  = left:And _ "or" _ right:Or { return { type: "Or", left, right } }

And
  = left:Not _ "and" _ right:(And / Not) {
    return { type: "And", left, right }
  }

Not
  = "not" _ operand:Not { return { type: "Not", operand } }
  / BoolPrimary

BoolPrimary
  = "(" _ value:Or _ ")" { return value; }
  / Eq
  / Boolean
  / FieldValue

Boolean
  = value:("true" / "false") {
    return { type: "Boolean", value: value === "true" }
  }

Sticky
  = _ "sticky" _ name:Name {
    return { type: "Sticky", name }
  }

Transition
  = _ "transition" _ name:Name _ "of" _ field:FieldValue _ "is" _ states:Array {
    return { type: "Transition", name, states, field }
  }

Array
  = "[" _ head:Value tail:(_ "," _ Value)* _ "]" {
    return [head].concat(tail.map(t => t[3]))
  }

DefName
  = _ "name" _ "is" _ value:Name {
    return { type: "DefName", value }
  }

DefField
  = _ name:Name _ "is" _ value:Value {
    return { type: "DefField", name, value }
  }

Duplicate
  = _ "duplicate" _ name:Name {
    return { type: "Duplicate", name }
  }

EventAction
  = "on" name:Name _ "is" _ transition:FieldValue {
    return { type: "EventAction", name: { ...name, name: name.name.toLowerCase() }, transition }
  }

Name
  = name:$(JapaneseChar+) {
    return { type: "Name", name }
  }

FieldValue
  = ref:Reference {
    return ref;
  }

Reference
= head:Name "." tail:Name {
    return { type: "Reference", path: [head, tail] }
  }

String
  = "\"" string:([^"]*) "\"" {
    return { type: "String", value: string.join("") }
  }

Eq
  = left:FieldValue _ "eq" _ right:Value {
    return { type: "Eq", left, right }
  }

If
  = "if" _ expr:Expr _ "then" _ thenBranch:Statement {
    return { type: "If", expr, thenBranch }
  }

Expr
  = target:Var _ "is" _ additive:Additive {
    return { type: "Expr", target, additive }
  }

Var
  = name:[A-Za-z]+ {
    return { type: "Var", name: name.join("") }
  }

Additive
  = left:Multiplicative _ op:("+" / "-") _ right:Additive {
    return { type: "BinaryOp", op, left, right };
  }
  / Multiplicative

Multiplicative
  = left:Primary _ op:("*" / "/") _ right:Multiplicative { return { type: "BinaryOp", op, left, right }; }
  / Primary

Primary
  = Integer
  / FieldValue
  / "(" _ expr:Additive _ ")" { return expr; }

Integer "integer"
  = digits:[0-9]+ {
    return { type: "Integer", value: toInt(digits) }
  }

_ "whitespace"
  = [ \t\n\r]* 

JapaneseChar
  = [\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9_]
