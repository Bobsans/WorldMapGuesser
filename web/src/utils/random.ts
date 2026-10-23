export const shuffle = <T>(items: readonly T[], random: () => number = Math.random): T[] => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    const current = result[index]!;
    result[index] = result[target]!;
    result[target] = current;
  }

  return result;
};
