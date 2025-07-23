// Jest setup file for Chrome extension testing

// Mock Chrome APIs
const chromeMock = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      getBytesInUse: jest.fn(),
      onChanged: {
        addListener: jest.fn()
      }
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      getBytesInUse: jest.fn(),
      onChanged: {
        addListener: jest.fn()
      }
    },
    onChanged: {
      addListener: jest.fn()
    }
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    onAlarm: {
      addListener: jest.fn()
    }
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  }
};

// Setup global chrome object
(global as any).chrome = chromeMock;

// Mock TextEncoder/TextDecoder for Node.js environment
if (typeof TextEncoder === 'undefined') {
  (global as any).TextEncoder = class {
    encode(str: string) {
      return new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
    }
  };
}

if (typeof TextDecoder === 'undefined') {
  (global as any).TextDecoder = class {
    decode(buffer: Uint8Array) {
      return String.fromCharCode(...buffer);
    }
  };
}

// Mock Blob for storage size calculations
if (typeof Blob === 'undefined') {
  (global as any).Blob = class {
    size: number;
    constructor(parts: any[]) {
      this.size = JSON.stringify(parts).length;
    }
  };
}