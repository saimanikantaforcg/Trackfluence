// Manual mock for nanoid (ESM-only package, needs CJS shim for Jest)
let counter = 0;
module.exports = {
  nanoid: (size = 21) => `mock_${size}_${++counter}`,
};
