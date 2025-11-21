// Grammar coverage tests for lib/lang.pegjs compiled parser (lib/lang.js)
// Uses Node's built-in test runner and assert (no extra deps).

const test = require('node:test');
const assert = require('node:assert/strict');

const parser = require('../lib/lang.js');

function parse(code) {
  return parser.parse(code);
}

test('Integer literal', () => {
  const [stmt] = parse('123');
  assert.deepEqual(stmt, { type: 'ExprStatement', expr: { type: 'Integer', value: 123 } });
});

test('String literal with escapes', () => {
  const [stmt] = parse('"a\\"b\\\\c"');
  assert.equal(stmt.type, 'ExprStatement');
  assert.deepEqual(stmt.expr, { type: 'String', value: 'a"b\\c' });
});

test('Array empty and values', () => {
  const [emptyStmt, valuesStmt] = parse('[] [1, 2, 3]');
  assert.deepEqual(emptyStmt.expr, { type: 'Array', value: [] });
  assert.deepEqual(valuesStmt.expr, {
    type: 'Array',
    value: [
      { type: 'Integer', value: 1 },
      { type: 'Integer', value: 2 },
      { type: 'Integer', value: 3 },
    ]
  });
});

test('Array ranges (ascending and descending) and mixing', () => {
  const [stmt] = parse('[1..3, 5, 7..5]');
  assert.deepEqual(stmt.expr, {
    type: 'Array',
    value: [
      { type: 'Integer', value: 1 },
      { type: 'Integer', value: 2 },
      { type: 'Integer', value: 3 },
      { type: 'Integer', value: 5 },
      { type: 'Integer', value: 7 },
      { type: 'Integer', value: 6 },
      { type: 'Integer', value: 5 },
    ]
  });
});

test('Boolean true/false (as Value in DefField)', () => {
  const [t, f] = parse('flagTrue = true flagFalse = false');
  assert.deepEqual(t, {
    type: 'DefField',
    name: { type: 'Name', name: 'flagTrue' },
    value: { type: 'Boolean', value: true },
  });
  assert.deepEqual(f, {
    type: 'DefField',
    name: { type: 'Name', name: 'flagFalse' },
    value: { type: 'Boolean', value: false },
  });
});

test('Reference (FieldValue) with names and digits (digits parsed as Name)', () => {
  const [stmt] = parse('foo.0.bar.9');
  assert.deepEqual(stmt.expr, {
    type: 'Reference',
    path: [
      { type: 'Name', name: 'foo' },
      { type: 'Name', name: '0' },
      { type: 'Name', name: 'bar' },
      { type: 'Name', name: '9' },
    ],
  });
});

test('Name in Japanese and ASCII allowed', () => {
  const [ja, en] = parse('名前 test123');
  assert.deepEqual(ja, { type: 'Name', name: '名前' });
  assert.deepEqual(en, { type: 'Name', name: 'test123' });
});

test('DefName', () => {
  const [stmt] = parse('name is 太郎');
  assert.deepEqual(stmt, {
    type: 'DefName',
    value: { type: 'Name', name: '太郎' },
  });
});

test('DefField with is and =', () => {
  const [a, b] = parse('foo is 10 bar = "x"');
  assert.deepEqual(a, {
    type: 'DefField',
    name: { type: 'Name', name: 'foo' },
    value: { type: 'Integer', value: 10 },
  });
  assert.deepEqual(b, {
    type: 'DefField',
    name: { type: 'Name', name: 'bar' },
    value: { type: 'String', value: 'x' },
  });
});

test('Duplicate', () => {
  const [stmt] = parse('duplicate アイテム');
  assert.deepEqual(stmt, { type: 'Duplicate', name: { type: 'Name', name: 'アイテム' } });
});

test('Sticky', () => {
  const [stmt] = parse('sticky 状態');
  assert.deepEqual(stmt, { type: 'Sticky', name: { type: 'Name', name: '状態' } });
});

test('EventAction (lowercases event name)', () => {
  // EventAction requires no whitespace between "on" and Name
  const [stmt] = parse('onClick is foo.bar');
  assert.equal(stmt.type, 'EventAction');
  assert.deepEqual(stmt.name, { type: 'Name', name: 'click' });
  assert.equal(stmt.transition.type, 'Reference');
});

test('Operation with Block', () => {
  const [stmt] = parse('operation 計算 of a.b is { 1 + 2 * 3 }');
  assert.equal(stmt.type, 'Operation');
  assert.deepEqual(stmt.name, { type: 'Name', name: '計算' });
  assert.equal(stmt.field.type, 'Reference');
  assert.equal(stmt.block.type, 'Block');
  assert.equal(stmt.block.expr.type, 'BinaryOp'); // 1 + (2 * 3)
});

test('Transition with states array', () => {
  const [stmt] = parse('transition 状態 of user.state is [0..2, 4]');
  assert.equal(stmt.type, 'Transition');
  assert.deepEqual(stmt.name, { type: 'Name', name: '状態' });
  assert.equal(stmt.field.type, 'Reference');
  assert.deepEqual(stmt.states, [
    { type: 'Integer', value: 0 },
    { type: 'Integer', value: 1 },
    { type: 'Integer', value: 2 },
    { type: 'Integer', value: 4 },
  ]);
});

test('Eq expression (as Value in DefField)', () => {
  const [stmt] = parse('cond = foo.bar eq 10');
  assert.equal(stmt.type, 'DefField');
  assert.deepEqual(stmt.value, {
    type: 'Eq',
    left: {
      type: 'Reference',
      path: [ { type: 'Name', name: 'foo' }, { type: 'Name', name: 'bar' } ],
    },
    right: { type: 'Integer', value: 10 },
  });
});

test('Boolean logic: Not and And (as Value in DefField)', () => {
  const [stmt] = parse('cond = not a.b and x.y');
  assert.equal(stmt.type, 'DefField');
  const v = stmt.value;
  assert.equal(v.type, 'And');
  assert.equal(v.left.type, 'Not');
  assert.equal(v.left.operand.type, 'Reference');
  assert.equal(v.right.type, 'Reference');
});

test('Boolean logic: Or with booleans (as Value in DefField)', () => {
  const [stmt] = parse('cond = true or false');
  assert.equal(stmt.type, 'DefField');
  const v = stmt.value;
  assert.equal(v.type, 'Or');
  assert.equal(v.left.type, 'Boolean');
  assert.equal(v.right.type, 'Boolean');
});

test('Arithmetic precedence and associativity', () => {
  const [stmt] = parse('1 + 2 * 3');
  assert.equal(stmt.expr.type, 'BinaryOp');
  assert.equal(stmt.expr.op, '+');
  assert.equal(stmt.expr.right.type, 'BinaryOp');
  assert.equal(stmt.expr.right.op, '*');
});

test('Parenthesized arithmetic', () => {
  const [stmt] = parse('(1 + 2) * 3');
  assert.equal(stmt.expr.type, 'BinaryOp');
  assert.equal(stmt.expr.op, '*');
  assert.equal(stmt.expr.left.type, 'BinaryOp');
});

test('ItRef in Primary', () => {
  const [stmt] = parse('it * 2');
  assert.equal(stmt.expr.type, 'BinaryOp');
  assert.equal(stmt.expr.left.type, 'It');
});

test('If statement with embedded Expr and then Statement', () => {
  const [stmt] = parse('if x is 1+2 then sticky 位置');
  assert.equal(stmt.type, 'If');
  assert.deepEqual(stmt.expr, {
    type: 'Expr',
    target: { type: 'Var', name: 'x' },
    additive: {
      type: 'BinaryOp',
      op: '+',
      left: { type: 'Integer', value: 1 },
      right: { type: 'Integer', value: 2 },
    },
  });
  assert.deepEqual(stmt.thenBranch, { type: 'Sticky', name: { type: 'Name', name: '位置' } });
});

test('Plain Name as a Statement', () => {
  const [stmt] = parse('状態');
  assert.deepEqual(stmt, { type: 'Name', name: '状態' });
});

test('StatementList with whitespace and newlines', () => {
  const program = `\n  name is 山田\n\n  sticky 状態\n  duplicate ほげ\n`;
  const ast = parse(program);
  assert.equal(Array.isArray(ast), true);
  assert.equal(ast.length >= 3, true);
  assert.equal(ast[0].type, 'DefName');
  assert.equal(ast[1].type, 'Sticky');
  assert.equal(ast[2].type, 'Duplicate');
});
