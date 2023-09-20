import assert from 'assert';
import SyslogServer from './main';

const server = new SyslogServer();

async function testSyslogServer() {
  try {
    // Test isRunning method when server is not started
    assert.strictEqual(server.isRunning(), false, 'Server should not be running initially');

    // Test start method
    await server.start();
    assert.strictEqual(server.isRunning(), true, 'Server should be running after start method is called');

    // Test stop method
    await server.stop();
    assert.strictEqual(server.isRunning(), false, 'Server should not be running after stop method is called');

    console.log('All tests passed!');
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Test failed:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  } finally {
    if (server.isRunning()) {
      server.stop();
    }
  }
}

testSyslogServer();

