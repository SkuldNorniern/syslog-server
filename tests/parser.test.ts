import { parseRFC5424, parseRFC3164, parseLEEF, parseJSON, parseCEF, parseCLF, parseELF, parseCustom } from '../src/syslogmessage';
import { RFC5424Message, RFC3164Message, LEEFMessage, CEFMessage, CLFMessage, ELFMessage } from '../src/parsedMessage';

describe('Parser Tests', () => {
	test('RFC5424 Parser', () => {
		const message = '<34>1 2023-09-20T06:59:42Z mymachine.example.com su - ID47 [exampleSDID@32473 iut="3" eventSource="Application" eventID="1011"] An application event log entry...';
		const parsedMessage: RFC5424Message | null = parseRFC5424(message);
		expect(parsedMessage).toMatchObject({
			priority: 34,
			version: 1,
			timestamp: new Date('2023-09-20T06:59:42Z'),
			hostname: 'mymachine.example.com',
			appName: 'su',
			procId: '-',
			msgId: 'ID47',
			structuredData: 'exampleSDID@32473 iut="3" eventSource="Application" eventID="1011"',
			msg: 'An application event log entry...',
		});
	});

	test('RFC3164 Parser', () => {
		const message = '<34>Oct 11 22:14:15 mymachine su: \'su root\' failed for lonvick on /dev/pts/8';
		const parsedMessage: RFC3164Message | null = parseRFC3164(message);
		expect(parsedMessage).toMatchObject({
			priority: 34,
			timestamp: new Date('Oct 11 22:14:15'), // Note: You might need to adjust the year
			hostname: 'mymachine',
			msg: 'su: \'su root\' failed for lonvick on /dev/pts/8',
		});
	});

	test('LEEF Parser', () => {
		const message = 'LEEF:2.0|Security|threatmanager|1.0|20210920|cat=IPS|devTimeFormat=MMM dd yyyy HH:mm:ss z';
		const parsedMessage: LEEFMessage | null = parseLEEF(message);
		expect(parsedMessage).toMatchObject({
			version: '2.0',
			deviceVendor: 'Security',
			deviceProduct: 'threatmanager',
			deviceVersion: '1.0',
			eventId: '20210920',
			nameValuePairs: {
				cat: 'IPS',
				devTimeFormat: 'MMM dd yyyy HH:mm:ss z',
			},
		});
	});
	test('LEEF Parser incomplete', () => {
		const message = 'LEEF:2.0|Vendor|Product|Version|EventID|cat=|severity=';
		const parsedMessage = parseLEEF(message);
		expect(parsedMessage).toEqual({
			version: '2.0',
			deviceVendor: 'Vendor',
			deviceProduct: 'Product',
			deviceVersion: 'Version',
			eventId: 'EventID',
			nameValuePairs: {
				cat: null,
				severity: null
			}
		});
	});

	test('LEEF Parser mixed', () => {
		const message = 'LEEF:2.0|Vendor|Product|Version|EventID|cat=Security|severity=';
		const parsedMessage = parseLEEF(message);
		expect(parsedMessage).toEqual({
			version: '2.0',
			deviceVendor: 'Vendor',
			deviceProduct: 'Product',
			deviceVersion: 'Version',
			eventId: 'EventID',
			nameValuePairs: {
				cat: 'Security',
				severity: null
			}
		});
	});

	test('LEEF Parser quoated', () => {
		const message = 'LEEF:2.0|Vendor|Product|Version|EventID|cat="Security"|severity="High"';
		const parsedMessage = parseLEEF(message);
		expect(parsedMessage).toEqual({
			version: '2.0',
			deviceVendor: 'Vendor',
			deviceProduct: 'Product',
			deviceVersion: 'Version',
			eventId: 'EventID',
			nameValuePairs: {
				cat: 'Security',
				severity: 'High'
			}
		});
	});

	test('LEEF Parser empty name-value', () => {
		const message = 'LEEF:2.0|Vendor|Product|Version|EventID|';
		const parsedMessage = parseLEEF(message);
		expect(parsedMessage).toEqual({
			version: '2.0',
			deviceVendor: 'Vendor',
			deviceProduct: 'Product',
			deviceVersion: 'Version',
			eventId: 'EventID',
			nameValuePairs: {}
		});
	});

	test('JSON Parser', () => {
		const validJSON = '{"name": "John Doe", "age": 30}';
		const parsedMessage = parseJSON(validJSON);
		expect(parsedMessage).toEqual({
			name: "John Doe",
			age: 30
		});
	});

	test('CEF Parser', () => {
		const message = 'CEF:0|Security|threatmanager|1.0|100|worm successfully stopped|10|src=10.0.0.1 dst=2.1.2.2 spt=1232';
		const parsedMessage: CEFMessage | null = parseCEF(message);
		expect(parsedMessage).toMatchObject({
			cefVersion: '0',
			deviceVendor: 'Security',
			deviceProduct: 'threatmanager',
			deviceVersion: '1.0',
			deviceEventClassId: '100',
			name: 'worm successfully stopped',
			severity: '10',
			extension: {
				src: '10.0.0.1',
				dst: '2.1.2.2',
				spt: '1232',
			},
		});
	});

	test('CLF Parser', () => {
		const message = '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326';
		const parsedMessage: CLFMessage | null = parseCLF(message);
		expect(parsedMessage).toMatchObject({
			remoteHost: '127.0.0.1',
			rfc931: '-',
			authUser: 'frank',
			date: new Date('10 Oct 2000 13:55:36 -0700'),
			request: 'GET /apache_pb.gif HTTP/1.0',
			statusCode: 200,
			bytes: 2326,
		});
	});

	test('ELF Parser', () => {
		const message = '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326 "http://www.example.com/start.html" "Mozilla/4.08 [en] (Win98; I ;Nav)"';
		const parsedMessage: ELFMessage | null = parseELF(message);
		expect(parsedMessage).toMatchObject({
			clientIP: '127.0.0.1',
			logName: '-',
			authUser: 'frank',
			date: new Date('10 Oct 2000 13:55:36 -0700'),
			request: 'GET /apache_pb.gif HTTP/1.0',
			statusCode: 200,
			bytes: 2326,
			referrer: 'http://www.example.com/start.html',
			userAgent: 'Mozilla/4.08 [en] (Win98; I ;Nav)',
		});
	});

	test('Custom Parser', () => {
		const formatHint = 'error (\\d+)';
		const message = 'System error 404 occurred';
		const parsedMessage = parseCustom(formatHint, message);
		expect(parsedMessage).toMatchObject({
			match: expect.arrayContaining(['error 404', '404']),
		});
	});

	test('parseRFC5424 should handle edge case formats', () => {
		const invalidMessage = 'invalid message';
		expect(parseRFC5424(invalidMessage)).toBeNull();
	});

	test('parseRFC3164 should handle edge case formats', () => {
		const edgeCaseMessage = 'invalid message';
		expect(parseRFC3164(edgeCaseMessage)).toBeNull();
	});

	test('parseLEEF should handle edge case formats', () => {
		const edgeCaseMessage = 'invalid message';
		expect(parseLEEF(edgeCaseMessage)).toBeNull();
	});

	test('parseJSON should handle edge case formats', () => {
		const invalidJSON = '{"name": "John Doe", "age": 30';
		const parsedMessage = parseJSON(invalidJSON);
		expect(parsedMessage).toBeNull();
	});

	test('parseCEF should handle edge case formats', () => {
		const edgeCaseMessage = 'invalid message';
		expect(parseCEF(edgeCaseMessage)).toBeNull();
	});

	test('parseCLF should handle edge case formats', () => {
		const edgeCaseMessage = 'invalid message';
		expect(parseCLF(edgeCaseMessage)).toBeNull();
	});

	test('parseELF should handle edge case formats', () => {
		const edgeCaseMessage = 'invalid message';
		expect(parseELF(edgeCaseMessage)).toBeNull();
	});

	test('parseCustom should handle edge case formats', () => {
		const formatHint = 'error (\\d+)';
		const message = 'System success occurred';
		const parsedMessage = parseCustom(formatHint, message);
		expect(parsedMessage).toBeNull();
	});
});

