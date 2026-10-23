const structures = new Set([
  'ObjectExpression', 'ArrayExpression', 'TSTypeLiteral', 'TSInterfaceBody', 'TSUnionType', 'TSIntersectionType',
  'TSTupleType', 'TSTypeParameterInstantiation', 'TSTypeParameterDeclaration', 'BlockStatement', 'TemplateLiteral',
]);

export default {
  meta: {
    type: 'layout',
    fixable: 'code',
    schema: [{ type: 'integer', minimum: 1 }],
    messages: { compact: 'Keep this expression compact when it fits within {{limit}} characters.' },
  },
  create: (context) => {
    const source = context.sourceCode;
    const limit = context.options[0] ?? 150;

    const check = (node, end = node.range[1]) => {
      const start = node.range[0];
      const original = source.text.slice(start, end);

      if (!original.includes('\n') || source.getCommentsInside(node).length) {
        return;
      }

      const protectedRanges = [];

      const collect = (child) => {
        if (child !== node && structures.has(child.type) && child.loc.start.line !== child.loc.end.line) {
          protectedRanges.push(child.range);
          return;
        }

        for (const key of source.visitorKeys[child.type] ?? []) {
          const children = Array.isArray(child[key]) ? child[key] : [child[key]];

          for (const entry of children) {
            if (entry?.type) {
              collect(entry);
            }
          }
        }
      };

      collect(node);

      const tokens = source.getTokens(node).filter((token) => token.range[1] <= end);
      let output = '';
      let cursor = start;

      for (let index = 1; index < tokens.length; index += 1) {
        const left = tokens[index - 1];
        const right = tokens[index];
        const gap = source.text.slice(left.range[1], right.range[0]);

        if (!gap.includes('\n') || protectedRanges.some(([from, to]) => left.range[1] >= from && right.range[0] <= to)) {
          continue;
        }

        // Restricted productions must keep their line terminators (ASI).
        if (['return', 'throw', 'yield', 'async', '++', '--'].includes(left.value) || ['++', '--'].includes(right.value)) {
          continue;
        }

        const separator = ['(', '[', '.', '?.', '<'].includes(left.value) || [')', ']', '.', '?.', ',', ';', '>'].includes(right.value) ? '' : ' ';
        const trailingComma = left.value === ',' && [')', '}'].includes(right.value);
        output += source.text.slice(cursor, trailingComma ? left.range[0] : left.range[1]) + separator;
        cursor = right.range[0];
      }

      output += source.text.slice(cursor, end);

      if (output === original) {
        return;
      }

      const lineStart = source.text.lastIndexOf('\n', start - 1) + 1;
      const nextLine = source.text.indexOf('\n', end);
      const lineEnd = nextLine === -1 ? source.text.length : nextLine;
      const lines = (source.text.slice(lineStart, start) + output + source.text.slice(end, lineEnd)).split('\n');

      if (lines.some((line) => Array.from(line).length > limit)) {
        return;
      }

      context.report({
        node,
        messageId: 'compact',
        data: { limit },
        fix: (fixer) => fixer.replaceTextRange([start, end], output),
      });
    };

    const signature = (node) => check(node, node.body.range[0]);

    return {
      ImportDeclaration: check,
      VariableDeclaration: check,
      ExpressionStatement: check,
      ReturnStatement: check,
      ThrowStatement: check,
      CallExpression: check,
      NewExpression: check,
      MemberExpression: check,
      ConditionalExpression: check,
      LogicalExpression: check,
      BinaryExpression: check,
      IfStatement: (node) => check(node, node.consequent.range[0]),
      WhileStatement: (node) => check(node, node.body.range[0]),
      ForStatement: (node) => check(node, node.body.range[0]),
      ForOfStatement: (node) => check(node, node.body.range[0]),
      ForInStatement: (node) => check(node, node.body.range[0]),
      ArrowFunctionExpression: signature,
      FunctionExpression: signature,
    };
  },
};
