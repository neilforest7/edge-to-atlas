const HEADER_BYTES = 4;
const MAX_MESSAGE_BYTES = 1024 * 1024;

export class NativeMessageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "NativeMessageError";
    this.code = code;
  }
}

export function encodeNativeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(HEADER_BYTES);

  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

export function decodeNativeMessage(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new NativeMessageError("invalid_input", "Native message input must be a Buffer.");
  }

  if (buffer.length < HEADER_BYTES) {
    throw new NativeMessageError("incomplete_header", "Native message header is incomplete.");
  }

  const bodyLength = buffer.readUInt32LE(0);

  if (bodyLength > MAX_MESSAGE_BYTES) {
    throw new NativeMessageError("message_too_large", "Native message exceeds the 1 MB host limit.");
  }

  const expectedLength = HEADER_BYTES + bodyLength;

  if (buffer.length < expectedLength) {
    throw new NativeMessageError("incomplete_body", "Native message body is incomplete.");
  }

  if (buffer.length > expectedLength) {
    throw new NativeMessageError("trailing_data", "Native message contains trailing data.");
  }

  try {
    return JSON.parse(buffer.subarray(HEADER_BYTES).toString("utf8"));
  } catch {
    throw new NativeMessageError("invalid_json", "Native message body is not valid JSON.");
  }
}
