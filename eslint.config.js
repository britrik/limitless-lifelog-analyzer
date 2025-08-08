import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js"; // Assuming React is used, common for .tsx

export default [
  { languageOptions: { globals: globals.browser } }, // For browser environments
  ...tseslint.configs.recommended, // TypeScript recommended rules
  { // Settings for eslint-plugin-react
    ...pluginReactConfig,
    settings: {
      react: {
        version: "detect" // Automatically detect the React version
      }
    }
  },
  {
    files: ["**/*.{ts,tsx}"], // Target TypeScript and TSX files
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // Enable JSX parsing
        },
      },
    },
    rules: {
      // Common overrides:
      "no-unused-vars": "off", // Disable base rule
      "@typescript-eslint/no-unused-vars": [
        "error", // Set to error to fail on unused vars unless ignored
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          // "caughtErrors": "all",
          "caughtErrorsIgnorePattern": "^_" // Use this if 'all' is too broad and we only want to ignore underscore prefixed ones
        }
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off", // Allow implicit return types for module boundaries
      "no-undef": "off", // Often problematic in TS projects, TS handles this better
      // Add any specific project rule overrides here
    }
  },
  {
    // Configuration for .js or .cjs files if any (e.g., config files themselves)
    files: ["*.{js,cjs}"],
    languageOptions: {
      globals: globals.node // For Node.js environments (like this config file)
    },
    rules: {
      // Rules specific to JS/CJS files if needed
    }
  }
];
