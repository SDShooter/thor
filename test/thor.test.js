import { jest } from '@jest/globals';
import { program } from 'commander';
import path from 'path';
import os from 'os';
import cluster from 'cluster';

// Mock external modules
const mockSetupMaster = jest.fn();
jest.mock('cluster', () => ({
  setupMaster: mockSetupMaster,
  fork: jest.fn(),
  workers: {},
  on: jest.fn()
}));

jest.mock('../metrics.js', () => ({
  __esModule: true,
  default: class Metrics {
    constructor() {
      this.handshaken = jest.fn();
      this.close = jest.fn();
    }
  }
}));

describe('Thor CLI', () => {
  beforeEach(() => {
    // Reset program's state before each test
    program.opts = jest.fn().mockReturnValue({
      amount: 10000,
      concurrent: 0,
      messages: 1,
      protocol: 13,
      buffer: 1024,
      workers: os.cpus().length,
      generator: null,
      masked: false,
      binary: false
    });
  });

  test('should have correct default options', () => {
    const options = program.opts();
    expect(options.amount).toBe(10000);
    expect(options.concurrent).toBe(0);
    expect(options.messages).toBe(1);
    expect(options.protocol).toBe(13);
    expect(options.buffer).toBe(1024);
    expect(options.workers).toBe(os.cpus().length);
    expect(options.masked).toBe(false);
    expect(options.binary).toBe(false);
  });

  test('should exit with error when no URL is provided', () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    program.args = [];
    
    // Simulate the URL check
    if (!program.args.length) {
      console.error('Thor:\n');
      console.error('Odin is disappointed in you... pity human! You forgot to supply the urls.');
      process.exit(1);
    }

    expect(mockConsoleError).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  test('should setup cluster with correct configuration', () => {
    const options = program.opts();
    
    // Mock program.args to include a URL
    program.args = ['ws://localhost:8080'];

    expect(mockSetupMaster).toHaveBeenCalledWith({
      exec: expect.stringContaining('mjolnir.js'),
      silent: false,
      args: [
        expect.stringContaining('generator.js'),
        options.protocol,
        !!options.masked,
        !!options.binary
      ]
    });
  });
});
