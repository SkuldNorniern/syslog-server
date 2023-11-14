# Syslog Server

A simple and robust Syslog server with Syslog Parser implementation in TypeScript.

## Installation

Install the package using npm:

```sh
npm install syslog-server-ts
```

## Usage

Here is a basic example demonstrating how to use the `SyslogServer` class to create a Syslog server that listens for messages on specified ports:

```typescript
import SyslogServer, { SyslogOptions } from "syslog-server-ts";

const options: SyslogOptions = {
  ports: [514, 515, 516], // Specify the ports you want the server to listen on
  address: '0.0.0.0',
  exclusive: true,
  formatHints: new Map([514, 'rfc5424'], [515, 'LEEF'], [516, 'ELF']),
};

const server = new SyslogServer();

server.onMessage((message) => {
  console.log('Received syslog message:', message);
});

server.onError((error) => {
  console.error('Error occurred:', error);
});

server.onClose(() => {
  console.log('Server closed');
});

server.start(options).catch((error) => { // If you don't specify any option and leave it as black, the server will listen on 514, 0.0.0.0 and exclusice
  console.error('Failed to start server:', error);
});
```

Blank Example
```typescript
server.start().catch((error) => { 
    console.error('Failed to start server:', error);
});

```

## API Documentation

### SyslogServer Class

#### Methods

- `start(options: SyslogOptions)`: Starts the Syslog server with the specified options. Returns a promise that resolves when the server starts successfully.
- `stop()`: Stops the Syslog server. Returns a promise that resolves when the server stops successfully.
- `isRunning()`: Returns a boolean indicating whether the server is currently running.

#### Events

- `message`: Emitted when a syslog message is received. The message object is passed as an argument to the event handler.
- `error`: Emitted when an error occurs. The error object is passed as an argument to the event handler.
- `start`: Emitted when the server starts successfully.
- `stop`: Emitted when the server stops successfully.

### SyslogOptions Type

An object with the following properties:

- `ports`: An array of port numbers that the server should listen on.
- `address`: The address that the server should bind to.
- `exclusive`: A boolean indicating whether the server should have exclusive control over the ports.
- `formatHints`: A map of port numbers to format hints for the server to use.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on the [GitHub repository](https://github.com/yourusername/syslog-server-ts).
