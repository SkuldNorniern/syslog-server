export interface ErrorObject {
  date: Date;
  error: Error | null;
  message: string;
}

export class SyslogServerError extends Error {
  date: Date;

  constructor(message: string, public originalError?: Error) {
    super(message);
    this.date = new Date();
  }
}

