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
  = Duplicate
  / DefName
  / Sticky
  / EventAction
  / Operation
  / Transition
  / DefField
  / Additive { return { type: "ExprStatement", expr: $1 } }

Value
  = Or / And / Compare / Additive / Primary

Or
  = left:And tail:(_ "or" _ And)+ {
    let node = left;
    for (const t of tail) node = { type: "Or", left: node, right: t[3] };
    return node;
  }
  / And

And
  = left:Not tail:(_ "and" _ Not)+ {
    let node = left;
    for (const t of tail) node = { type: "And", left: node, right: t[3] };
    return node;
  }
  / Not

Not
  = "not" _ operand:Not { return { type: "Not", operand } }
  / BoolPrimary

BoolPrimary
  = "(" _ value:Or _ ")" { return value; }
  / Compare
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
  = _ "transition" _ name:Name _ "of" _ field:FieldValue _ "is" _ arr:Array {
    const states = arr.value;
    return { type: "Transition", name, states, field }
  }

ArrayEntry
  = Range
  / Value

Range
  = start:Integer _ ".." _ end:Integer {
    return { type: "Range", start, end }
  }

Array
  = "[" _ "]" { return { type: "Array", value: [] }; }
  / "[" _ head:ArrayEntry tail:(_ "," _ ArrayEntry)* _ "]" {
    function expand(entry) {
      if (entry && entry.type === "Range") {
        const a = entry.start.value;
        const b = entry.end.value;
        const step = a <= b ? 1 : -1;
        const out = [];
        for (let v = a; step > 0 ? v <= b : v >= b; v += step) {
          out.push({ type: "Integer", value: v });
        }
        return out;
      }
      return [entry];
    }
    const value = expand(head).concat(tail.flatMap(t => expand(t[3])));
    return { type: "Array", value };
  }

DefName
  = _ "name" _ "is" _ value:Name {
    return { type: "DefName", value }
  }

DefField
  = _ name:Name _ ("is" / "=") _ value:Value {
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

Operation
  = _ "operation" _ name:Name _ "of" _ field:FieldValue _ "is" _ block:Block {
    return { type: "Operation", name, field, block };
  }

Name
  = name:$(NameStart NameChar*) {
    return { type: "Name", name }
  }

NameStart
  = [\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z_]

NameChar
  = [\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9_]

FieldValue
  = ref:Reference {
    return ref;
  }

Reference
= head:Name "." tail:(Name / Integer) rest:("." (Name / Integer))* {
    const more = rest ? rest.map(r => r[1]) : [];
    return { type: "Reference", path: [head, tail].concat(more) }
  }

String
  = "\"" chars:(EscapedQuote / EscapedBackslash / NormalChar)* "\"" {
    return { type: "String", value: chars.join("") }
  }

EscapedQuote
  = "\\\"" { return "\"" }

EscapedBackslash
  = "\\\\" { return "\\" }

NormalChar
  = [^"\\] { return text(); }

Compare
  = left:Additive _ op:("==" / "!=" / "<=" / ">=" / "<" / ">") _ right:Additive {
    return { type: "Compare", op, left, right };
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
  = head:Multiplicative tail:(_ op:("+" / "-" / "_") _ right:Multiplicative)* {
      let node = head;
      for (const t of tail) {
        node = { type: "BinaryOp", op: t[1], left: node, right: t[3] };
      }
      return node;
    }

Multiplicative
  = head:Power tail:(_ op:("*" / "/" / "%") _ right:Power)* {
      let node = head;
      for (const t of tail) {
        node = { type: "BinaryOp", op: t[1], left: node, right: t[3] };
      }
      return node;
    }

Power
  = head:Unary _ op:("**" / "^") _ right:Power {
      return { type: "BinaryOp", op, left: head, right };
    }
  / Unary

Unary
  = Primary

Primary
  = NumberLiteral
  / String
  / Array
  / FieldValue
  / FunctionCall
  / Constant
  / ItRef
  / "(" _ expr:Additive _ ")" { return expr; }

ItRef
  = "it" { return { type: "It" } }

FunctionCall
  = name:Name _ "(" _ args:ArgumentList? _ ")" {
    return { type: "FunctionCall", name, args: args ?? [] };
  }

ArgumentList
  = head:Value tail:(_ "," _ Value)* { return [head].concat(tail.map(t => t[3])); }

Constant
  = value:("pi" / "e") { return { type: "Constant", value } }

Block
  = "{" _ expr:Additive _ "}" { return { type: "Block", expr } }

NumberLiteral
  = Integer
  / sign:("-" / "+")? digits:[0-9]+ "." frac:[0-9]+ {
    const raw = digits.join("") + "." + frac.join("");
    const value = parseFloat(raw) * (sign === "-" ? -1 : 1);
    return { type: "Number", value }
  }

Integer "integer"
  = sign:("-" / "+")? digits:[0-9]+ !("." [0-9]) {
    const value = toInt(digits) * (sign === "-" ? -1 : 1);
    return { type: "Integer", value }
  }

_ "whitespace"
  = (WS / Comment)*

WS = [ \t\n\r]+

Comment
  = "#" [^\n\r]* ("\r"? "\n")?

JapaneseChar
  = [\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9_]
