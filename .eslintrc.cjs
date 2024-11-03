module.exports = {
    extends: [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "@electron-toolkit/eslint-config-ts/recommended",
        "@electron-toolkit/eslint-config-prettier"
    ],
    rules: {
        semi: ["error", "always"],
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["off"],
        "@typescript-eslint/explicit-function-return-type": "off"
    }
};
