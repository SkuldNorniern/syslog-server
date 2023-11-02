export interface RFC5424Message {
  priority: number;
  version: number;
  timestamp: Date;
  hostname: string;
  appName: string;
  procId: string;
  msgId: string;
  structuredData: string;
  msg: string;
}

export interface RFC3164Message {
  priority: number;
  timestamp: Date;
  hostname: string;
  msg: string;
}

export interface LEEFMessage {
  version: string;
  deviceVendor: string;
  deviceProduct: string;
  deviceVersion: string;
  eventId: string;
  nameValuePairs: { [key: string]: string };
}
// ... (existing interfaces)

export interface CEFMessage {
  cefVersion: string;
  deviceVendor: string;
  deviceProduct: string;
  deviceVersion: string;
  deviceEventClassId: string;
  name: string;
  severity: string;
  extension: { [key: string]: string };
}

export interface CLFMessage {
  remoteHost: string;
  rfc931: string;
  authUser: string;
  date: Date;
  request: string;
  statusCode: number;
  bytes: number;
}

export interface ELFMessage {
  clientIP: string;
  logName: string;
  authUser: string;
  date: Date;
  request: string;
  statusCode: number;
  bytes: number;
  referrer: string;
  userAgent: string;
}

