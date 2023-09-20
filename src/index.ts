import dgram from 'dgram';
import { EventEmitter } from 'events';
import { SyslogMessage } from './syslogmessage';
import { ErrorObject } from './errorobject';
import { SyslogServerError } from './syslogservererror';

export interface SyslogOptions {
  ports: number[];
  address: string;
  exclusive?: boolean;
}

const DEFAULT_OPTIONS: SyslogOptions = { ports: [514], address: '0.0.0.0', exclusive: true };

class SyslogServer extends EventEmitter {
  private sockets: dgram.Socket[] = [];

  async start(options: SyslogOptions = DEFAULT_OPTIONS, cb?: (error: ErrorObject | null, server: SyslogServer) => void): Promise<SyslogServer> {
    if (this.isRunning()) {
        const errorObj = this.createErrorObject(new Error('Syslog Server is already running!'), 'Syslog Server is already running!');
        cb?.(errorObj, this);
        return Promise.reject(errorObj);
	}

    try {
      for (const port of options.ports) {
        const socket = dgram.createSocket('udp4');
        await new Promise((resolve, reject) => {
          socket.on('listening', () => resolve(null));
          socket.on('error', (err) => reject(err));
          socket.bind({ port, address: options.address, exclusive: options.exclusive });
        });
        this.registerEventHandlers(socket);
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

  private registerEventHandlers(socket: dgram.Socket) {
    socket.on('error', this.createErrorHandler());
    socket.on('message', this.createMessageHandler());
    socket.on('close', this.createCloseHandler());
  }

  private createErrorHandler() {
    return (err: Error) => {
      this.emit('error', err);
    };
  }

  private createMessageHandler() {
    return (msg: Buffer, remote: dgram.RemoteInfo) => {
      const message: SyslogMessage = {
        date: new Date(),
        host: remote.address,
        message: msg.toString('utf8'),
        protocol: remote.family,
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
