import stylelint from 'stylelint';

const alignmentName = 'project/sass-variable-alignment';
const compactName = 'project/compact-values';

const alignment = (enabled) => (root, result) => {
  if (!stylelint.utils.validateOptions(result, alignmentName, { actual: enabled, possible: [true] })) {
    return;
  }

  const visit = (container) => {
    if (!container.nodes) {
      return;
    }

    let group = [];

    const align = () => {
      const columns = group.map((node) => node.prop.length + node.raws.between.length);

      if (group.length > 1 && new Set(columns).size > 1) {
        const column = Math.max(...group.map((node) => node.prop.length)) + 2;

        for (const node of group) {
          const between = ':' + ' '.repeat(column - node.prop.length - 1);

          if (node.raws.between !== between) {
            stylelint.utils.report({
              ruleName: alignmentName,
              result,
              node,
              message: 'Align Sass variable values within each contiguous group.',
              fix: () => {
                node.raws.between = between;
              },
            });
          }
        }
      }

      group = [];
    };

    for (const node of container.nodes) {
      if (/\n\s*\n/u.test(node.raws.before ?? '')) {
        align();
      }

      if (node.type === 'decl' && node.prop.startsWith('$') && !node.value.includes('\n')) {
        group.push(node);
      } else {
        align();
      }
    }

    align();
  };

  visit(root);
  root.walk(visit);
};

alignment.ruleName = alignmentName;
alignment.meta = { fixable: true };

const compactValues = (limit) => (root, result) => {
  if (!stylelint.utils.validateOptions(result, compactName, { actual: limit, possible: (value) => Number.isInteger(value) && value > 0 })) {
    return;
  }

  root.walkDecls((node) => {
    const value = node.raws.value?.raw ?? node.value;

    // Preserve Sass maps, custom property token streams, strings and comments.
    if (node.prop.startsWith('$') || node.prop.startsWith('--') || !value.includes('\n') || /["'\\]|\/\*|\/\//u.test(value)) {
      return;
    }

    const compact = value.replace(/\s*\n\s*/gu, ' ').replace(/\( +/gu, '(').replace(/ +\)/gu, ')');
    const indentation = (node.raws.before ?? '').split('\n').at(-1);
    const text = indentation + node.prop + node.raws.between + compact + (node.important ? ' !important' : '') + ';';

    if (Array.from(text).length > limit) {
      return;
    }

    stylelint.utils.report({
      ruleName: compactName,
      result,
      node,
      message: `Keep declaration values on one line when they fit within ${limit} characters.`,
      fix: () => {
        node.value = compact;
        delete node.raws.value;
      },
    });
  });
};

compactValues.ruleName = compactName;
compactValues.meta = { fixable: true };

export default [stylelint.createPlugin(alignmentName, alignment), stylelint.createPlugin(compactName, compactValues)];
