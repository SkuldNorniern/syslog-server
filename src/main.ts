import dgram from 'dgram';
import { EventEmitter } from 'events';
import { SyslogServerOptions } from './syslogserveroptions';
import { SyslogMessage } from './syslogmessage';
import { ErrorObject } from './errorobject';
import { SyslogServerError } from './syslogservererror';

const DEFAULT_OPTIONS: SyslogServerOptions = { port: 514, address: '0.0.0.0', exclusive: true };

class SyslogServer extends EventEmitter {
  private socket: dgram.Socket | null = null;

  start(options: SyslogServerOptions = DEFAULT_OPTIONS, cb?: (error: ErrorObject | null, server: SyslogServer) => void): Promise<SyslogServer> {
    return new Promise((resolve, reject) => {
      if (this.isRunning()) {
        const errorObj = this.createErrorObject(null, 'NodeJS Syslog Server is already running!');
        cb?.(errorObj, this);
        reject(errorObj);
      } else {
        this.socket = dgram.createSocket('udp4');
        this.registerEventHandlers(cb, resolve, reject);
        this.socket.bind(options);
      }
    });
  }

  private registerEventHandlers(cb: ((error: ErrorObject | null, server: SyslogServer) => void) | undefined, resolve: (value: SyslogServer | PromiseLike<SyslogServer>) => void, reject: (reason?: any) => void) {
    this.socket!.on('listening', this.createListeningHandler(cb, resolve));
    this.socket!.on('error', this.createErrorHandler());
    this.socket!.on('message', this.createMessageHandler());
    this.socket!.on('close', this.createCloseHandler());
  }

  private createListeningHandler(cb: ((error: ErrorObject | null, server: SyslogServer) => void) | undefined, resolve: (value: SyslogServer | PromiseLike<SyslogServer>) => void) {
    return () => {
      this.emit('start', this);
      cb?.(null, this);
      resolve(this);
    };
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

  stop(cb?: (error: ErrorObject | null, server: SyslogServer) => void): Promise<SyslogServer> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.socket.close(() => {
          this.socket = null;
          cb?.(null, this);
          resolve(this);
        });
      } else {
        const errorObj = this.createErrorObject(null, 'NodeJS Syslog Server is not running!');
        cb?.(errorObj, this);
        reject(errorObj);
      }
    });
  }

  isRunning(): boolean {
    return this.socket !== null;
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

