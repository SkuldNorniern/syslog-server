import { parseRFC5424, parseRFC3164, parseLEEF, parseCEF, parseCLF, parseELF } from '../src/syslogmessage';
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

  // Similar test cases for CEF, CLF, and ELF parsers
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
});

