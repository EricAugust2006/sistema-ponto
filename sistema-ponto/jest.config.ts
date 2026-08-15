import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: ".",
});

const jestConfig = {
  moduleDirectories: ["node_modules", "<rootDir>"],
  testTimeout: 30000,
};

module.exports = createJestConfig(jestConfig);
