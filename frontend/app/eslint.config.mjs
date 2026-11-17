import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "next-env.d.ts"],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  // Strict Design System Enforcement for Application UI
  // Documented Boundaries: Applies strictly to application pages and components,
  // excluding the design-system documentation showcase (/dying) and test suites.
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["src/app/dying/**", "**/*.test.*", "**/*.spec.*"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXElement[openingElement.name.name='button']",
          message:
            "Strict Dying Enforcement: Do not use raw <button>. Use Button or IconButton from @mp/dying.",
        },
        {
          selector: "JSXElement[openingElement.name.name='input']",
          message:
            "Strict Dying Enforcement: Do not use raw <input>. Use Input from @mp/dying.",
        },
        {
          selector: "JSXElement[openingElement.name.name='textarea']",
          message:
            "Strict Dying Enforcement: Do not use raw <textarea>. Use Textarea from @mp/dying.",
        },
        {
          selector: "JSXElement[openingElement.name.name='select']",
          message:
            "Strict Dying Enforcement: Do not use raw <select>. Use Select from @mp/dying.",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            "Strict Dying Enforcement: Inline styles are prohibited in application code. Use @mp/dying design tokens or components.",
        },
        {
          selector:
            "JSXAttribute[name.name='className'][value.value=/#[0-9a-fA-F]{3,8}/]",
          message:
            "Strict Dying Enforcement: Arbitrary hex classes (e.g. bg-[#...], text-[#...]) are prohibited. Use semantic tokens (bg-surface, text-text-primary, border-border-subtle).",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@mui/material",
              message: "Competing UI libraries are prohibited. Use @mp/dying.",
            },
            {
              name: "antd",
              message: "Competing UI libraries are prohibited. Use @mp/dying.",
            },
            {
              name: "@chakra-ui/react",
              message: "Competing UI libraries are prohibited. Use @mp/dying.",
            },
            {
              name: "@mantine/core",
              message: "Competing UI libraries are prohibited. Use @mp/dying.",
            },
            {
              name: "bootstrap",
              message: "Competing UI libraries are prohibited. Use @mp/dying.",
            },
          ],
        },
      ],
    },
  }
);
