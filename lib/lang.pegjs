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
  / Sticky
  / EventAction
  / DefField
  / Transition
  / If
  / Name

Value
  = Eq / Integer / Boolean / FieldValue / String

Boolean
  = value:("true" / "false") {
    return { type: "Boolean", value: value === "true" }
  }

Sticky
  = _ "sticky" _ name:Name {
    return { type: "Sticky", name }
  }

Transition
  = _ "transition" _ name:Name _ states:Array _ "on" _ field:FieldValue {
    return { type: "Transition", name, states, field }
  }

Array
  = "[" _ head:Value tail:(_ "," _ Value)* _ "]" {
    return [head].concat(tail.map(t => t[3]))
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
  = "on" _ name:Name _ "do" _ transition:FieldValue {
    return { type: "EventAction", name, transition }
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
= head:Name tail:("." Name)* {
    return { type: "Reference", path: [head].concat(tail.map(t => t[1])) }
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

Page
  = " name:[A-Za-z]+ " {
    return { type: "Page", name: name.join("") }
  }

Additive
  = left:Multiplicative _ op:("+" / "-") _ right:Additive {
    return { type: "BinaryOp", op, left, right };
  }
  / Multiplicative

Multiplicative
  = left:Primary _ "*" _ right:Multiplicative { return left * right; }
  / left:Primary _ "/" _ right:Multiplicative { return left / right; }
  / Primary

Primary
  = Integer
  / "(" _ expr:Additive _ ")" { return expr; }

Integer "integer"
  = digits:[0-9]+ {
    return { type: "NumberLiteral", value: toInt(digits) }
  }

_ "whitespace"
  = [ \t\n\r]* 

JapaneseChar
  = [\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9_]
