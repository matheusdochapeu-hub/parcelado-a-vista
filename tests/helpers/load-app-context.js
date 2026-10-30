const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadAppContext(customState = {}) {
  const htmlPath = path.resolve(__dirname, '../../index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    throw new Error('Não foi possível encontrar a tag <script> em index.html');
  }

  const storage = {};
  const mockLocalStorage = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); }
  };

  const elements = {};
  function getOrCreateElement(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        value: '',
        textContent: '',
        innerHTML: '',
        style: {},
        attributes: {},
        classList: {
          _classes: new Set(),
          add: function(c) { this._classes.add(c); },
          remove: function(c) { this._classes.delete(c); },
          contains: function(c) { return this._classes.has(c); },
          toggle: function(c) { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); }
        },
        setAttribute: function(k, v) { this.attributes[k] = String(v); if (k === 'onclick') this.onclick = v; },
        getAttribute: function(k) { return this.attributes[k] || null; },
        appendChild: () => {},
        removeChild: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
      };
    }
    return elements[id];
  }

  const sandbox = {
    window: {},
    document: {
      getElementById: (id) => getOrCreateElement(id),
      querySelector: () => getOrCreateElement('mock-el'),
      querySelectorAll: () => [],
      createElement: (tag) => getOrCreateElement('el_' + Math.random().toString(36).slice(2)),
      head: { appendChild: () => {}, removeChild: () => {} },
      body: { appendChild: () => {}, removeChild: () => {} },
      location: { hash: '' }
    },
    localStorage: mockLocalStorage,
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    parseFloat,
    parseInt,
    isNaN,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    JSON,
    ...customState
  };

  sandbox.window = sandbox;
  vm.createContext(sandbox);

  const scriptContent = scriptMatch[1];
  vm.runInContext(scriptContent, sandbox);

  return sandbox;
}

module.exports = { loadAppContext };
