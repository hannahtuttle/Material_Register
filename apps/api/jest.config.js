module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  globalSetup: '<rootDir>/tests/globalSetup.js',
  setupFiles: ['<rootDir>/tests/setup.ts'],
  // Tests share one database and truncate it; run serially to prevent collisions.
  maxWorkers: 1,
};
