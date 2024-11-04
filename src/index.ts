import dgram from 'dgram';
import { EventEmitter } from 'events';
import { SyslogMessage, parseRFC5424, parseRFC3164, parseLEEF, parseCEF, parseCLF, parseELF, parseCustom } from './syslogmessage';
import { ErrorObject, SyslogServerError } from './errorobject';
import net from 'net';

export type MessageFormatHint = 'RFC5424' | 'RFC3164' | 'LEEF' | 'CEF' | 'CLF' | 'ELF' | 'NONE' | string;

export type ProtocolType = 'TCP' | 'UDP';

export interface PortConfig {
	port: number;
	protocol: ProtocolType;
	formatHint?: MessageFormatHint;
}

export interface SyslogOptions {
	ports: PortConfig[];
	address: string;
	exclusive?: boolean;
}

const DEFAULT_OPTIONS: SyslogOptions = {
	ports: [{ port: 514, protocol: 'UDP', formatHint: 'RFC5424' }],
	address: '0.0.0.0',
	exclusive: true
};

class SyslogServer extends EventEmitter {
	private udpSockets: dgram.Socket[] = [];
	private tcpSockets: net.Server[] = [];
	private addressFormatHintMapping: Map<number, MessageFormatHint> = new Map();

	async start(options: SyslogOptions = DEFAULT_OPTIONS): Promise<SyslogServer> {
		if (this.isRunning()) {
			throw new SyslogServerError('Syslog Server is already running!');
		}

		try {
			for (const portConfig of options.ports) {
				if (portConfig.formatHint) {
					this.addressFormatHintMapping.set(portConfig.port, portConfig.formatHint);
				}
				await this.createAndBindSocket(portConfig, options);
			}
			this.emit('start', this);
			return this;
		} catch (err) {
			if (err instanceof Error) {
				throw new SyslogServerError('Syslog Server failed to start!', err);
			} else {
				// Handle the case where err is not an Error object
				throw new SyslogServerError('Syslog Server failed to start! An unknown error occurred.');
			}
		}
	}

	private async createAndBindSocket(portConfig: PortConfig, options: SyslogOptions): Promise<void> {
		if (portConfig.protocol === 'UDP') {
			await this.createUDPSocket(portConfig, options);
		} else {
			await this.createTCPSocket(portConfig, options);
		}
	}

	private async createUDPSocket(portConfig: PortConfig, options: SyslogOptions): Promise<void> {
		const socket = dgram.createSocket('udp4');
		this.registerUDPEventHandlers(socket, portConfig.port);

		await new Promise((resolve, reject) => {
			socket.on('listening', () => resolve(null));
			socket.on('error', err => reject(err));
			socket.bind({ port: portConfig.port, address: options.address, exclusive: options.exclusive });
		});

		this.udpSockets.push(socket);
	}

	private async createTCPSocket(portConfig: PortConfig, options: SyslogOptions): Promise<void> {
		const server = net.createServer();
		this.registerTCPEventHandlers(server, portConfig.port);

		await new Promise((resolve, reject) => {
			server.on('listening', () => resolve(null));
			server.on('error', err => reject(err));
			server.listen(portConfig.port, options.address);
		});

		this.tcpSockets.push(server);
	}

	private registerTCPEventHandlers(server: net.Server, port: number) {
		server.on('error', err => this.emit('error', err));
		server.on('close', () => this.emit('stop'));
		
		server.on('connection', (socket) => {
			let messageBuffer = '';
			
			socket.on('data', (data) => {
				messageBuffer += data.toString('utf8');
				
				// Split on newline to handle multiple messages
				const messages = messageBuffer.split('\n');
				messageBuffer = messages.pop() || ''; // Keep the last incomplete message

				messages.forEach(msg => {
					if (msg) {
						const message: SyslogMessage = {
							date: new Date(),
							host: socket.remoteAddress || 'unknown',
							port: port,
							message: msg,
							protocol: 'IPv4',
							parsedMessage: this.parseMessage(
								this.addressFormatHintMapping.get(port) ?? 'NONE',
								msg
							),
						};
						
						this.emit('message', message);
					}
				});
			});
		});
	}

	private registerUDPEventHandlers(socket: dgram.Socket, port: number) {
		socket.on('error', err => this.emit('error', err));
		socket.on('message', (msg, remote) => this.handleMessage(
			msg, 
			remote, 
			socket
		));
		socket.on('close', () => this.emit('stop'));
	}

	onMessage(callback: (message: SyslogMessage) => void) {
		this.on('message', callback);
	}

	onError(callback: (error: Error) => void) {
		this.on('error', callback);
	}

	onClose(callback: () => void) {
		this.on('stop', callback);
	}

	private handleMessage(msg: Buffer, remote: dgram.RemoteInfo, socket: dgram.Socket) {
		const messageContent = msg.toString('utf8');
		const formatHint = this.addressFormatHintMapping.get(socket.address().port) ?? 'NONE';
		const parsedMessage: object | null = this.parseMessage(formatHint, messageContent);

		const message: SyslogMessage = {
			date: new Date(),
			host: remote.address,
			port: socket.address().port,
			message: messageContent,
			protocol: remote.family,
			parsedMessage,
		};

		this.emit('message', message);
	}

	private parseMessage(formatHint: MessageFormatHint, messageContent: string): object | null {
		switch (formatHint) {
			case 'RFC5424': return parseRFC5424(messageContent);
			case 'RFC3164': return parseRFC3164(messageContent);
			case 'LEEF': return parseLEEF(messageContent);
			case 'CEF': return parseCEF(messageContent);
			case 'CLF': return parseCLF(messageContent);
			case 'ELF': return parseELF(messageContent);
			case 'NONE': return null;
			default: return parseCustom(formatHint, messageContent);
		}
	}

	async stop(): Promise<SyslogServer> {
		if (!this.isRunning()) {
			throw new SyslogServerError('Syslog Server is not running!');
		}

		try {
			await Promise.all([
				...this.udpSockets.map(socket => new Promise(resolve => socket.close(() => resolve(null)))),
				...this.tcpSockets.map(server => new Promise(resolve => server.close(() => resolve(null))))
			]);
			this.udpSockets = [];
			this.tcpSockets = [];
			return this;
		} catch (err) {
			if (err instanceof Error) {
				throw new SyslogServerError('Failed to stop Syslog Server', err);
			} else {
				// Handle the case where err is not an Error object
				throw new SyslogServerError('Syslog Server failed to start!! An unknown error occurred.');
			}
		}
	}

	isRunning(): boolean {
		return this.udpSockets.length > 0 || this.tcpSockets.length > 0;
	}

	private createErrorObject(err: Error | null, message: string): ErrorObject {
		return {
			date: new Date(),
			error: err,
			message: message,
		};
	}
}

export { SyslogMessage, SyslogServerError};
export default SyslogServer;
