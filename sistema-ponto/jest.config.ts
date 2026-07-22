const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: ".",
});

const jestConfig = {
  moduleDirectories: ["node_modules", "<rootDir>"],
  testTimeout: 30000,
};

module.exports = createJestConfig(jestConfig);
