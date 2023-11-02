import dgram from 'dgram';
import { EventEmitter } from 'events';
import { SyslogMessage, parseRFC5424, parseRFC3164, parseLEEF, parseCEF, parseCLF, parseELF } from './syslogmessage';
import { ErrorObject, SyslogServerError } from './errorobject';

export type MessageFormatHint = 'RFC5424' | 'RFC3164' | 'LEEF' | 'CEF' | 'CLF' | 'ELF' | 'NONE' | string;

export interface SyslogOptions {
	ports: number[];
	address: string;
	exclusive?: boolean;
	formatHints?: Map<string, MessageFormatHint>; // remote server's address as key, format hint as parsing method
}


const DEFAULT_OPTIONS: SyslogOptions = { ports: [514], address: '0.0.0.0', exclusive: true, formatHints: new Map([["0.0.0.0", 'RFC5424']])};


class SyslogServer extends EventEmitter {
	private sockets: dgram.Socket[] = [];
	private addressFormatHintMapping: Map<string, MessageFormatHint> = new Map();


	async start(options: SyslogOptions = DEFAULT_OPTIONS, cb?: (error: ErrorObject | null, server: SyslogServer) => void): Promise<SyslogServer> {
		if (this.isRunning()) {
			const errorObj = this.createErrorObject(new Error('Syslog Server is already running!'), 'Syslog Server is already running!');
			cb?.(errorObj, this);
			return Promise.reject(errorObj);
		}

		try {
			this.addressFormatHintMapping = options.formatHints ?? new Map();
			for (let i = 0; i < options.ports.length; i++) {
				const port = options.ports[i];
				const socket = dgram.createSocket('udp4');
				await new Promise((resolve, reject) => {
					socket.on('listening', () => resolve(null));
					socket.on('error', (err) => reject(err));
					socket.bind({ port, address: options.address, exclusive: options.exclusive });
				});
				this.registerEventHandlers(socket, port); // Pass the port instead of format hint
				this.sockets.push(socket);
			}
			this.emit('start', this);
			cb?.(null, this);
			return Promise.resolve(this);
		} catch (err) {
			const errorObj = this.createErrorObject(err as Error, 'Syslog Server failed to start!');
			cb?.(errorObj, this);
			return Promise.reject(errorObj);
		}
	}

	private registerEventHandlers(socket: dgram.Socket, port: number) {
		socket.on('error', this.createErrorHandler());
		socket.on('message', this.createMessageHandler());
		socket.on('close', this.createCloseHandler());
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

	private createErrorHandler() {
		return (err: Error) => {
			this.emit('error', err);
		};
	}

	private createMessageHandler() {
		
		return (msg: Buffer, remote: dgram.RemoteInfo) => {
			const messageContent = msg.toString('utf8');
			let parsedMessage: object | null = null;
			console.log("messageContent :",remote.address);
			const formatHint = this.addressFormatHintMapping.get(remote.address) ?? 'NONE';
			switch (formatHint){
				case 'RFC5424':
					console.log("parrrurururuur");
					parsedMessage = parseRFC5424(messageContent);
					break;
				case 'RFC3164':
					parsedMessage = parseRFC3164(messageContent);
					break;
				case 'LEEF':
					parsedMessage = parseLEEF(messageContent);
					break;
				case 'CEF':
					parsedMessage = parseCEF(messageContent);
					break;
				case 'CLF':
					parsedMessage = parseCLF(messageContent);
					break;
				case 'ELF':
					parsedMessage = parseELF(messageContent);
					break;
				case 'NONE':
					break;
				default:
					if (formatHint !== 'NONE') {
						console.log("PARU!");
						const regex = new RegExp(formatHint);
						const match = regex.exec(messageContent);
						console.log("regex :",match);
						parsedMessage = match ? { match } : null;
						break;
					}
					console.log("not paru!");
					break;
			}

			const message: SyslogMessage = {
				date: new Date(),
				host: remote.address,
				message: messageContent,
				protocol: remote.family,
				parsedMessage,
			};

			this.emit('message', message);
		};
	}


	private createCloseHandler() {
		return () => {
			this.emit('stop');
		};
	}

	async stop(cb?: (error: ErrorObject | null, server: SyslogServer) => void): Promise<SyslogServer> {
		if (!this.isRunning()) {
			const errorObj = this.createErrorObject(null, 'Syslog Server is not running!');
			cb?.(errorObj, this);
			return Promise.reject(errorObj);
		}

		try {
			await Promise.all(this.sockets.map(socket => new Promise(resolve => socket.close(() => resolve(null)))));
			this.sockets = [];
			cb?.(null, this);
			return Promise.resolve(this);
		} catch (err) {
			const errorObj = this.createErrorObject(new Error('Syslog Server is not running!'), 'Syslog Server is not running!');
			cb?.(errorObj, this);
			return Promise.reject(errorObj);
		}
	}

	isRunning(): boolean {
		return this.sockets.length > 0;
	}

	private createErrorObject(err: Error | null, message: string): ErrorObject {
		return {
			date: new Date(),
			error: err,
			message: message,
		};
	}
}

export default SyslogServer;
