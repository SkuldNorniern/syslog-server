import dgram from 'dgram';
import { EventEmitter } from 'events';
import { SyslogMessage, parseRFC5424, parseRFC3164, parseLEEF, parseCEF, parseCLF, parseELF, parseCustom } from './syslogmessage';
import { ErrorObject, SyslogServerError } from './errorobject';

export type MessageFormatHint = 'RFC5424' | 'RFC3164' | 'LEEF' | 'CEF' | 'CLF' | 'ELF' | 'NONE' | string;

export interface SyslogOptions {
	ports: number[];
	address: string;
	exclusive?: boolean;
	formatHints?: Map<number, MessageFormatHint>; // remote server's address as key, format hint as parsing method
}


const DEFAULT_OPTIONS: SyslogOptions = { ports: [514], address: '0.0.0.0', exclusive: true, formatHints: new Map([[514, 'RFC5424']])};


class SyslogServer extends EventEmitter {
	private sockets: dgram.Socket[] = [];
	private addressFormatHintMapping: Map<number, MessageFormatHint> = new Map();


	async start(options: SyslogOptions = DEFAULT_OPTIONS): Promise<SyslogServer> {
		if (this.isRunning()) {
            throw new SyslogServerError('Syslog Server is already running!');
        }

		try {
			this.addressFormatHintMapping = options.formatHints ?? new Map();
			for (const port of options.ports) {
                await this.createAndBindSocket(port, options);
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

	private async createAndBindSocket(port: number, options: SyslogOptions): Promise<void> {
		const socket = dgram.createSocket('udp4');
		this.registerEventHandlers(socket, port);

		await new Promise((resolve, reject) => {
			socket.on('listening', () => resolve(null));
			socket.on('error', err => reject(err));
			socket.bind({ port, address: options.address, exclusive: options.exclusive });
		});

		this.sockets.push(socket);
	}

	private registerEventHandlers(socket: dgram.Socket, port: number) {
		socket.on('error', err => this.emit('error', err));
		socket.on('message', (msg, remote) => this.handleMessage(msg, remote, socket));
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
            await Promise.all(this.sockets.map(socket => new Promise(resolve => socket.close(() => resolve(null)))));
            this.sockets = [];
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
