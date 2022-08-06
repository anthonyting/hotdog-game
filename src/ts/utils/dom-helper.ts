export function element<T extends keyof HTMLElementTagNameMap>(
  tagName: T,
  attributes: {
    [key: string]: string | Partial<CSSStyleDeclaration> | Array<string>;
  } = {},
): HTMLElementTagNameMap[T] {
  const el = document.createElement(tagName);
  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value === 'object' && value !== null) {
      switch (key) {
        case 'style':
          for (const [key2, value2] of Object.entries(value)) {
            (el.style as any)[key2] = value2;
          }
          break;
        case 'class': {
          const classList = (value as string[]).flatMap((className) =>
            className.split(' '),
          );
          el.classList.add(...classList);
          break;
        }
        default:
          throw new Error(
            'Object attribute only valid for style and class attributes',
          );
      }
    } else if (key === 'for') {
      (el as any).htmlFor = value;
    } else {
      (el as any)[key] = value;
    }
  }
  return el;
}
