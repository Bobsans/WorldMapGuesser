import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

const cwd = fileURLToPath(new URL('../..', import.meta.url));

const format = async (code: string, filename = 'src/styles/example.scss'): Promise<string> => {
  const result = await stylelint.lint({
    code,
    codeFilename: `${cwd}/${filename}`,
    configFile: `${cwd}/stylelint.config.js`,
    fix: true,
  });

  expect(result.results.flatMap((entry) => entry.warnings)).toEqual([]);

  return result.code ?? code;
};

describe('project Sass style', () => {
  it('aligns variable groups independently and expands uppercase hex colors', async () => {
    const input = '$a: #fff;\n$long: #abcd;\n\n$other: #123;\n$x: #abcdef;\n';
    const expected = '$a:    #FFFFFF;\n$long: #AABBCCDD;\n\n$other: #112233;\n$x:     #ABCDEF;\n';
    const output = await format(input);

    expect(output).toBe(expected);
    expect(await format(output)).toBe(output);
  });

  it('preserves the chosen column in an already aligned group', async () => {
    const input = '$white:     #FFFFFF;\n$accent:    #C38F58;\n';

    expect(await format(input)).toBe(input);
  });

  it('compacts ordinary declaration values and preserves quoted text', async () => {
    const input = '.example {\n  box-shadow:\n    0 0 4px #fff,\n    0 1px 2px #abc;\n  content: "#fff  keep spaces";\n}\n';
    const output = await format(input);

    expect(output).toContain('  box-shadow: 0 0 4px #FFFFFF, 0 1px 2px #AABBCC;');
    expect(output).toContain('  content: "#fff  keep spaces";');
    expect(await format(output)).toBe(output);
  });

  it('keeps Sass maps and custom property token streams multiline', async () => {
    const input = '$colors: (\n  first: #FFFFFF,\n  second: #000000,\n);\n\n.example {\n  --custom: first\n    second;\n}\n';
    const output = await format(input);

    expect(output).toContain('$colors: (\n  first: #FFFFFF,\n  second: #000000,\n);');
    expect(output).toContain('--custom: first\n    second;');
    expect(await format(output)).toBe(output);
  });

  it('respects the indentation of Vue style blocks', async () => {
    const input = '<template>\n  <div />\n</template>\n\n<style lang="scss">\n  $a: #fff;\n  $long: #abc;\n\n  .example {\n    color: $a;\n    background: $long;\n  }\n</style>\n';
    const output = await format(input, 'src/components/Example.vue');

    expect(output).toContain('  $a:    #FFFFFF;\n  $long: #AABBCC;');
    expect(output).toContain('    color: $a;');
    expect(await format(output, 'src/components/Example.vue')).toBe(output);
  });

  it('uses the same 150 character boundary for declaration values', async () => {
    const declaration = (size: number) => `.example {\n  font-family: ${'A'.repeat(size)},\n    sans-serif;\n}\n`;

    const fixedWidth = '  font-family: , sans-serif;'.length;
    const fits = await format(declaration(150 - fixedWidth));
    const over = await format(declaration(151 - fixedWidth));

    expect(fits).toContain(`  font-family: ${'A'.repeat(150 - fixedWidth)}, sans-serif;`);
    expect(over).toContain(',\n    sans-serif;');
    expect(await format(over)).toBe(over);
  });
});
