function decodeBase64Utf8(base64) {
  const cleaned = String(base64 || '').replace(/\s+/g, '');
  if (!cleaned) return '';

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(cleaned, 'base64').toString('utf8');
  }

  const binary = window.atob(cleaned);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function cleanHeader(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function cleanText(value) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function parseSoopSocketPacket(base64) {
  let raw = '';

  try {
    raw = decodeBase64Utf8(base64);
  } catch (error) {
    return {
      type: 'unknown',
      error: 'BASE64_DECODE_FAILED',
      raw: '',
      fields: [],
    };
  }

  const fields = raw.split('\x0c');
  const header = cleanHeader(fields[0]);
  const packetType = header.slice(0, 4);

  if (packetType === '0005') {
    const message = cleanText(fields[1]);
    const userId = cleanText(fields[2]);
    const nickname = cleanText(fields[6]);

    if (message && nickname) {
      return {
        type: 'chat',
        packetType,
        header,
        message,
        userId,
        nickname,
        raw,
        fields,
      };
    }
  }

  if (packetType === '0018') {
    const userId = cleanText(fields[2]);
    const nickname = cleanText(fields[3]);
    const amount = toNumber(fields[4], 0);
    const fanNumber = toNumber(fields[7], 0);

    if (nickname && amount > 0) {
      return {
        type: 'donation',
        packetType,
        header,
        userId,
        nickname,
        amount,
        fanNumber,
        raw,
        fields,
      };
    }
  }

  return {
    type: 'unknown',
    packetType,
    header,
    raw,
    fields,
  };
}
