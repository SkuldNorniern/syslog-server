import { RFC5424Message, RFC3164Message, LEEFMessage, CEFMessage, CLFMessage, ELFMessage} from './parsedMessage';

export interface SyslogMessage {
	date: Date;
	host: string;
	message: string;
	protocol: string;
	parsedMessage: object | null;
}

export function parseRFC5424(message: string): RFC5424Message | null {
	const regex = /<(\d+)>(\d+) (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z) ([a-zA-Z0-9.-]+) ([a-zA-Z0-9.-]+) ([a-zA-Z0-9.-]+) ([a-zA-Z0-9.-]+) \[([^\]]+)\] (.+)/;
	const match = regex.exec(message);

	if (match) {
		return {
			priority: parseInt(match[1], 10),
			version: parseInt(match[2], 10),
			timestamp: new Date(match[3]),
			hostname: match[4],
			appName: match[5],
			procId: match[6],
			msgId: match[7],
			structuredData: match[8],
			msg: match[9],
		};
	}

	return null;
}

export function parseRFC3164(message: string): RFC3164Message | null {
	const regex = /<(\d+)>([a-zA-Z]{3} \d{1,2} \d{2}:\d{2}:\d{2}) ([a-zA-Z0-9.-]+) (.+)/;
	const match = regex.exec(message);

	if (match) {
		return {
			priority: parseInt(match[1], 10),
			timestamp: new Date(match[2]),
			hostname: match[3],
			msg: match[4],
		};
	}

	return null;
}

export function parseLEEF(message: string): LEEFMessage | null {
	// const regex = /LEEF:(\d+\.\d+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|(.+)/;
	const regex = /LEEF:(\d+\.\d+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)(?:\|(.+))?/;
	const match = regex.exec(message);

	if (match) {
		let nameValuePairs = {};

		// Only process name-value pairs if they are present
		if (match[6]) {
			nameValuePairs = match[6].split('|').reduce((obj: Record<string, any>, pair) => {
				const [name, value] = pair.split('=');
				if (value) {
					obj[name] = value.replace(/^"|"$/g, ''); // Remove quotes if present
				} else {
					obj[name] = null; // or some other default value
				}
				return obj;
			}, {});
		}

		return {
			version: match[1],
			deviceVendor: match[2],
			deviceProduct: match[3],
			deviceVersion: match[4],
			eventId: match[5],
			nameValuePairs,
		};
	}

	return null;
}


export function parseJSON(message: string): object | null {
	try {
		return JSON.parse(message);
	} catch {
		return null;
	}
}
export function parseCEF(message: string): CEFMessage | null {
	const regex = /CEF:(\d+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|(.+)/;
	const match = regex.exec(message);

	if (match) {
		const extension = match[8].split(' ').reduce((obj: Record<string, any>, pair: string) => {
			const [name, value] = pair.split('=');
			obj[name] = value;
			return obj;
		}, {});


		return {
			cefVersion: match[1],
			deviceVendor: match[2],
			deviceProduct: match[3],
			deviceVersion: match[4],
			deviceEventClassId: match[5],
			name: match[6],
			severity: match[7],
			extension,
		};
	}

	return null;
}


export function parseCLF(message: string): CLFMessage | null {
	const regex = /(\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]+)" (\d+) (\d+)/;
	const match = regex.exec(message);

	if (match) {
		return {
			remoteHost: match[1],
			rfc931: match[2],
			authUser: match[3],
			date: new Date(match[4].replace(/:/, ' ')),
			request: match[5],
			statusCode: parseInt(match[6], 10),
			bytes: parseInt(match[7], 10),
		};
	}

	return null;
}

export function parseELF(message: string): ELFMessage | null {
	const regex = /(\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]+)" (\d+) (\d+) "([^"]+)" "([^"]+)"/;
	const match = regex.exec(message);

	if (match) {
		return {
			clientIP: match[1],
			logName: match[2],
			authUser: match[3],
			date: new Date(match[4].replace(/:/, ' ')),
			request: match[5],
			statusCode: parseInt(match[6], 10),
			bytes: parseInt(match[7], 10),
			referrer: match[8],
			userAgent: match[9],
		};
	}

	return null;
}

export function parseCustom(formatHint: string, message: string): object | null {
	const regex = new RegExp(formatHint);
	const match = regex.exec(message);
	return match ? { match } : null;
}
