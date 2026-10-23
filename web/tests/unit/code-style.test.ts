import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const cwd = fileURLToPath(new URL('../..', import.meta.url));
const formatter = new ESLint({ cwd, fix: true });
const checker = new ESLint({ cwd });
const filePath = 'src/components/Example.vue';

beforeAll(async () => {
  await formatter.calculateConfigForFile(filePath);
  await checker.calculateConfigForFile(filePath);
});

const template = (tag: string): string => `<template>\n  <section>\n    ${tag}\n  </section>\n</template>\n`;

const openingTag = (length: number): string => {
  const fixed = '    <example-box data-first="" data-last="yes" />';

  return `<example-box data-first="${'x'.repeat(length - fixed.length)}" data-last="yes" />`;
};

const format = async (input: string): Promise<string> => {
  const [result] = await formatter.lintText(input, { filePath });

  expect(result?.messages).toEqual([]);

  return result?.output ?? input;
};

describe('project code style', () => {
  it('keeps a tag of exactly 150 characters including indentation on one line', async () => {
    const input = template(openingTag(150));

    expect(await format(input)).toBe(input);
  });

  it('puts every attribute on its own line at 151 characters', async () => {
    const input = template(openingTag(151));
    const expected = template(`<example-box\n      data-first="${'x'.repeat(102)}"\n      data-last="yes"\n    />`);

    expect(await format(input)).toBe(expected);
    expect(await format(expected)).toBe(expected);
  });

  it('collapses all attributes when a multiline tag fits', async () => {
    const input = template('<example-box\n      first="one"\n      second="two"\n    />');

    expect(await format(input)).toBe(template('<example-box first="one" second="two" />'));
  });

  it('expands a long mixed layout to exactly one attribute per line', async () => {
    const first = `first="${'x'.repeat(120)}"`;
    const input = template(`<example-box ${first} second="two"\n      third="three"\n    />`);
    const expected = template(`<example-box\n      ${first}\n      second="two"\n      third="three"\n    />`);

    expect(await format(input)).toBe(expected);
    expect(await format(expected)).toBe(expected);
  });

  it('keeps formatting stable for long tags inside inline content', async () => {
    const input = template(`<div><example-box first="${'x'.repeat(120)}" second="two" /></div>`);
    const output = await format(input);

    expect(output).toContain('<example-box\n');
    expect(output).toMatch(/first="x+"\n +second="two"/u);
    expect(await format(output)).toBe(output);
  });

  it('preserves whitespace inside literal attribute values', async () => {
    const input = template('<example-box\n      label="keep  two spaces"\n      title="line one\nline two"\n    />');

    expect(await format(input)).toBe(input);
  });

  it('keeps multiline directive expressions intact and separates attributes', async () => {
    const input = template('<example-box :value="{\n      first: true,\n      second: false,\n    }" other="yes" />');
    const expected = template('<example-box\n      :value="{\n        first: true,\n        second: false,\n      }"\n      other="yes"\n    />');

    expect(await format(input)).toBe(expected);
    expect(await format(expected)).toBe(expected);
  });

  it('does not split long literal values to force a hard width limit', async () => {
    const attribute = `label="${'x'.repeat(160)}"`;
    const expected = template(`<example-box\n      ${attribute}\n    />`);

    expect(await format(template(`<example-box ${attribute} />`))).toBe(expected);
    expect(await format(expected)).toBe(expected);
  });

  it('formats regular opening tags with the same width rule', async () => {
    const input = template('<div\n      class="box"\n      role="status"\n    ></div>');

    expect(await format(input)).toBe(template('<div class="box" role="status"></div>'));
  });

  it('applies the same attribute layout to standalone HTML', async () => {
    const input = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta\n      name="viewport"\n      content="width=device-width, initial-scale=1"\n    />\n  </head>\n</html>\n';
    const [result] = await formatter.lintText(input, { filePath: 'index.html' });

    expect(result?.messages).toEqual([]);
    expect(result?.output).toContain('    <meta name="viewport" content="width=device-width, initial-scale=1" />');
  });

  it('uses kebab-case in opening and closing component tags', async () => {
    const input = '<template>\n  <ScoreTable></ScoreTable>\n</template>\n';

    expect(await format(input)).toBe('<template>\n  <score-table />\n</template>\n');
  });

  it('separates imports, props, emits and component state', async () => {
    const input = '<script setup lang="ts">\n  import { ref } from \'vue\';\n  defineProps<{ title: string }>();\n  const emit = defineEmits<{ close: [] }>();\n  const visible = ref(true);\n  emit(\'close\');\n  console.log(visible.value);\n</script>\n';
    const output = await format(input);

    expect(output).toContain("from 'vue';\n\n  defineProps");
    expect(output).toContain('}>();\n\n  const emit');
    expect(output).toContain('}>();\n\n  const visible');
  });

  it('rejects explicit component names while allowing other defineOptions settings', async () => {
    const input = '<script setup lang="ts">\n  defineOptions({ name: \'CustomName\' });\n</script>\n';
    const [result] = await checker.lintText(input, { filePath });

    expect(result?.messages.map((message) => message.ruleId)).toContain('vue/no-restricted-component-options');

    const allowed = '<script setup lang="ts">\n  defineOptions({ inheritAttrs: false });\n</script>\n';
    const [allowedResult] = await checker.lintText(allowed, { filePath: 'src/components/Result.vue' });

    expect(allowedResult?.messages).toEqual([]);
  });

  it('puts members of multiline types on separate lines with semicolons', async () => {
    const input = '<script setup lang="ts">\n  defineProps<{\n    first: string, second: number\n  }>();\n</script>\n';
    const expected = '<script setup lang="ts">\n  defineProps<{\n    first: string;\n    second: number;\n  }>();\n</script>\n';

    expect(await format(input)).toBe(expected);
  });

  it('requires PascalCase for component imports', async () => {
    const input = '<script setup lang="ts">\n  import scoreTable from \'@/components/ScoreTable.vue\';\n\n  console.log(scoreTable);\n</script>\n';
    const [result] = await checker.lintText(input, { filePath });

    expect(result?.messages.map((message) => message.ruleId)).toContain('no-restricted-syntax');
  });

  it('compacts imports, parameters and expressions that fit', async () => {
    const input = `<script setup lang="ts">
  import {
    ref,
    computed,
  } from 'vue';

  const count = ref(
    1,
  );
  const double = computed((
    previous: number,
  ) => count.value > 0
    ? count.value * 2
    : previous);

  console.log(double.value);
</script>
`;
    const output = await format(input);

    expect(output).toContain("import { ref, computed } from 'vue';");
    expect(output).toContain('const count = ref(1);');
    expect(output).toContain('computed((previous: number) => count.value > 0 ? count.value * 2 : previous)');
    expect(await format(output)).toBe(output);
  });

  it('preserves multiline objects and types without wrapping their surrounding calls', async () => {
    const input = `<script setup lang="ts">
  const props = withDefaults(
    defineProps<{
      label: string;
      size?: string;
    }>(),
    {
      size: 'large',
    },
  );

  console.log(props);
</script>
`;
    const output = await format(input);

    expect(output).toContain("withDefaults(defineProps<{\n    label: string;\n    size?: string;\n  }>(), {\n    size: 'large',\n  });");
    expect(await format(output)).toBe(output);
  });

  it('preserves comments, template literals and long expressions', async () => {
    const input = `<script setup lang="ts">
  console.log(
    // Keep the explanation attached to its argument.
    'value',
  );
  console.log(\`line one
line two\`);
  console.log(
    '${'x'.repeat(140)}',
    'other',
  );
</script>
`;
    const output = await format(input);

    expect(output).toContain("// Keep the explanation attached to its argument.\n    'value',");
    expect(output).toContain('`line one\nline two`');
    expect(output).toContain(`console.log(\n    '${'x'.repeat(140)}',\n    'other',\n  );`);
    expect(await format(output)).toBe(output);
  });

  it('allows both arrow body forms and keeps related declarations grouped', async () => {
    const input = `<script setup lang="ts">
  const first = 1;
  const second = 2;
  const point = () => ({ x: first, y: second });
  const copy = () => {
    return { x: first, y: second };
  };
  console.log(point(), copy());
</script>
`;
    const output = await format(input);

    expect(output).toContain('const first = 1;\n  const second = 2;\n\n  const point');
    expect(output).toContain('() => ({ x: first, y: second })');
    expect(output).toContain('() => {\n    return { x: first, y: second };\n  }');
  });

  it('separates guards from the following action', async () => {
    const input = `<script setup lang="ts">
  const log = (value: string) => {
    if (
      !value
    ) {
      return;
    }
    console.log(value);
  };
  log('ready');
</script>
`;
    const output = await format(input);

    expect(output).toContain('if (!value) {');
    expect(output).toContain('return;\n    }\n\n    console.log(value);');
    expect(output).toContain("};\n\n  log('ready');");
  });

  it('preserves multiline generic unions', async () => {
    const input = `<script setup lang="ts">
  import { shallowRef } from 'vue';

  const preview = shallowRef<
    | { position: number }
    | null
  >(null);

  console.log(preview);
</script>
`;

    expect(await format(input)).toBe(input);
  });

  it('uses type imports without forcing mixed imports into separate declarations', async () => {
    const input = `<script setup lang="ts">
  import { ref, type Ref } from 'vue';
  import { Point } from '@/map/viewport';

  const point: Ref<Point> = ref({ x: 0, y: 0 });

  console.log(point);
</script>
`;
    const output = await format(input);

    expect(output).toContain("import { ref, type Ref } from 'vue';");
    expect(output).toContain("import type { Point } from '@/map/viewport';");
  });

  it('includes indentation and the declaration prefix in the 150 character limit', async () => {
    const declaration = (size: number) => `<script setup lang="ts">\n  const value = Math.max(\n    Math.${'x'.repeat(size)},\n    2,\n  );\n\n  console.log(value);\n</script>\n`;

    const fixedWidth = '  const value = Math.max(Math., 2);'.length;
    const fits = await format(declaration(150 - fixedWidth));
    const over = await format(declaration(151 - fixedWidth));

    expect(fits).toContain(`  const value = Math.max(Math.${'x'.repeat(150 - fixedWidth)}, 2);`);
    expect(over).toContain('Math.max(\n');
    expect(await format(over)).toBe(over);
  });
});
