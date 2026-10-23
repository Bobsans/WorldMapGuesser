export default {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    schema: [{ type: 'integer', minimum: 1 }],
    messages: {
      layout: 'Keep opening tags on one line up to {{limit}} characters; otherwise put each attribute on its own line.',
    },
  },
  create: (context) => {
    const source = context.sourceCode;
    const limit = context.options[0] ?? 150;

    const check = (node) => {
      const attributes = node.attributes.map((attribute) => source.getText(attribute));
      const opening = `<${node.parent.rawName}`;
      const closing = node.selfClosing ? ' />' : '>';
      const compact = opening + attributes.map((attribute) => ` ${attribute}`).join('') + closing;
      const column = node.loc.start.column;
      const fits = !/[\r\n]/u.test(compact) && column + Array.from(compact).length <= limit;
      const indent = source.lines[node.loc.start.line - 1].match(/^[\t ]*/u)[0];
      const expanded = attributes.length
        ? `${opening}\n${indent}  ${attributes.join(`\n${indent}  `)}\n${indent}${closing.trimStart()}`
        : opening + closing;
      const expected = fits ? compact : expanded;

      if (source.getText(node) !== expected) {
        context.report({
          node,
          messageId: 'layout',
          data: { limit },
          fix: (fixer) => fixer.replaceText(node, expected),
        });
      }
    };

    const visit = (node) => {
      for (const child of node.children ?? []) {
        if (child.type === 'VElement') {
          check(child.startTag);
          visit(child);
        }
      }
    };

    return {
      Program: () => visit(source.parserServices.getDocumentFragment()),
    };
  },
};
