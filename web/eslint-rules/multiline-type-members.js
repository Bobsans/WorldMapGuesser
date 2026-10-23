export default {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    schema: [],
    messages: { newline: 'Put each member of a multiline type on its own line.' },
  },
  create: (context) => {
    const check = (node) => {
      if (node.loc.start.line === node.loc.end.line) {
        return;
      }

      const members = node.members ?? node.body;

      for (let index = 1; index < members.length; index++) {
        const member = members[index];

        if (members[index - 1].loc.end.line === member.loc.start.line) {
          context.report({
            node: member,
            messageId: 'newline',
            fix: (fixer) => fixer.insertTextBefore(member, '\n'),
          });
        }
      }
    };

    return { TSTypeLiteral: check, TSInterfaceBody: check };
  },
};
