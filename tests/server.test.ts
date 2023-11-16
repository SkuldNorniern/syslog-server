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

	test('should throw an error when starting an already running server', (done) => {
		server.start().then(() => {
			expect(server.isRunning()).toBe(true);
			server.start().then(() => {
				done.fail('Expected server.start to throw an error');
			}).catch((e) => {
				expect(e.message).toContain('Syslog Server is already running!');
				done();
			});
		});
	});

	test('should throw an error when stopping a server that is not running', (done) => {
		expect(server.isRunning()).toBe(false);
		server.stop().then(() => {
			done.fail('Expected server.stop to throw an error');
		}).catch((e) => {
			expect(e.message).toContain('Syslog Server is not running!');
			done();
		});
	});

	test('should correctly report running state', async () => {
		expect(server.isRunning()).toBe(false);
		await server.start();
		expect(server.isRunning()).toBe(true);
		await server.stop();
		expect(server.isRunning()).toBe(false);
	});

});
