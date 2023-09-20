import SyslogServer from '../src';

describe('SyslogServer', () => {
  let server: SyslogServer;

  beforeEach(() => {
    server = new SyslogServer();
  });

  afterEach(async () => {
    if (server.isRunning()) {
      await server.stop();
    }
  });

  test('should not be running initially', () => {
    expect(server.isRunning()).toBe(false);
  });

  test('should start and stop correctly', async () => {
    await server.start();
    expect(server.isRunning()).toBe(true);

    await server.stop();
    expect(server.isRunning()).toBe(false);
  });

  test('should emit start event when started', async () => {
    const startSpy = jest.fn();
    server.on('start', startSpy);

    await server.start();
    expect(startSpy).toHaveBeenCalled();

    await server.stop();
  });

  test('should emit stop event when stopped', async () => {
    const stopSpy = jest.fn();
    server.on('stop', stopSpy);

    await server.start();
    await server.stop();
    
    expect(stopSpy).toHaveBeenCalled();
  });
});
