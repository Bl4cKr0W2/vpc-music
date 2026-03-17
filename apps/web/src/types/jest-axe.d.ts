declare module "jest-axe" {
  export interface AxeViolation {
    id: string;
    impact?: string | null;
    description: string;
    help: string;
    helpUrl: string;
  }

  export interface AxeResults {
    violations: AxeViolation[];
    incomplete: AxeViolation[];
    passes: AxeViolation[];
    inapplicable: AxeViolation[];
  }

  export function axe(
    node: Element | Document | DocumentFragment | string,
    options?: Record<string, unknown>,
  ): Promise<AxeResults>;

  export const toHaveNoViolations: Record<string, (...args: any[]) => unknown>;
}
