import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'script.js',
  output: {
    file: 'bundle.js',
    format: 'iife', // Immediately Invoked Function Expression for browser compatibility
    name: 'myBundle' // A global variable name if needed, though 'iife' is self-executing
  },
  plugins: [
    resolve(), // Locates modules in node_modules
    commonjs() // Converts CommonJS modules to ES6
  ]
}; 