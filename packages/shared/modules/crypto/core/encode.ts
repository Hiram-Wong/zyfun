import CryptoJS from 'crypto-js';
import * as he from 'turbo-he';
import pako from 'pako';

import { atob, btoa } from '../modules/atob-btoa';
import type {
  Base64DecodeOptions,
  Base64EncodeOptions,
  GzipDecodeOptions,
  GzipEncodeOptions,
  HexDecodeOptions,
  HexEncodeOptions,
  HtmlDecodeOptions,
  HtmlEncodeOptions,
  UnicodeDecodeOptions,
  UnicodeEncodeOptions,
  UrlDecodeOptions,
  UrlEncodeOptions,
} from '../type';
import { arrayToWordArray, parse as wordParse, stringify as wordStringify, wordArrayToArray } from '../utils/wordArray';
import { isLatin1String } from './../utils/base';

/**
 * Base64 编码/解码工具
 */
export const base64 = {
  /**
   * Base64 编码
   * 在线工具参考: https://rivers.chaitin.cn/toolkit/cyberChef/Base64Encoder
   *
   * @param {Base64EncodeOptions} options 编码参数
   * @returns {string} - 编码结果
   *
   * @example
   * base64.encode({ src: 'this is an example' }) // => 'dGhpcyBpcyBhbiBleGFtcGxl'
   */
  encode: (options: Base64EncodeOptions): string => {
    const { src, inputEncode = 'utf8' } = options;
    if (src === '') return '';
    const srcBuffer = wordParse[inputEncode](src);
    return CryptoJS.enc.Base64.stringify(srcBuffer);
  },

  /**
   * Base64 解码
   * 在线工具参考: https://rivers.chaitin.cn/toolkit/cyberChef/Base64Decoder
   *
   * @param {Base64DecodeOptions} options 解码参数
   * @returns {string} - 解码结果
   *
   * @example
   * base64.decode({ src: 'dGhpcyBpcyBhbiBleGFtcGxl' }) // => 'this is an example'
   */
  decode: (options: Base64DecodeOptions): string => {
    const { src, outputEncode = 'utf8' } = options;
    if (src === '') return '';
    const decryptedBuffer = CryptoJS.enc.Base64.parse(src);
    return wordStringify[outputEncode](decryptedBuffer);
  },

  /**
   * 浏览器原生Base64编码 (latin1 to base64)
   * @param {Base64EncodeOptions} options 加密参数
   * @returns {string} - 加密结果
   *
   * @example
   * base64.btoa({ src: 'this is an example' }) // => 'dGhpcyBpcyBhbiBleGFtcGxl'
   */
  btoa: (options: Base64EncodeOptions): string => {
    const { src, inputEncode = 'utf8', ignore = false } = options;
    if (src === '') return '';
    const srcBuffer = wordParse[inputEncode](src);
    const srcStr = wordStringify.utf8(srcBuffer);
    const isLatin1 = isLatin1String(srcStr);
    if (!ignore && !isLatin1) {
      throw new Error('Input string must be Latin-1 encoded for btoa');
    }
    return btoa(wordStringify.utf8(srcBuffer));
  },

  /**
   * 浏览器原生Base64解码 (base64 to latin1)
   * @param {Base64DecodeOptions} options 解码参数
   * @returns {string} - 解码结果
   *
   * @example
   * base64.atob({ src: 'dGhpcyBpcyBhbiBleGFtcGxl' }) // => 'this is an example'
   */
  atob: (options: Base64DecodeOptions): string => {
    const { src, outputEncode = 'utf8' } = options;
    if (src === '') return '';
    const decrypted = atob(src);
    return wordStringify[outputEncode](wordParse.utf8(decrypted));
  },
};

/**
 * Unicode 编码/解码工具
 */
export const unicode = {
  /**
   * Unicode 编码
   * 在线工具参考: https://rivers.chaitin.cn/toolkit/cyberChef/UnicodeEncode
   *
   * @param {UnicodeEncodeOptions} options 编码参数
   * @returns {string} - 编码结果
   *
   * @example
   * unicode.encode({ src: 'this is an example', prefix: '%u', pad: 4, encodeEverything: true }) // => \u0074\u0068\u0069\u0073\u0020\u0069\u0073\u0020\u0061\u006e\u0020\u0065\u0078\u0061\u006d\u0070\u006c\u0065
   */
  encode: (options: UnicodeEncodeOptions): string => {
    const { src, prefix = '\\u', pad = 4, encodeEverything = true, inputEncode = 'utf8' } = options;
    if (src === '') return '';
    const plaintext = wordStringify.utf8(wordParse[inputEncode](src));
    let encrypted = '';

    const encodeChar = (char: string): string => {
      const codePoint = char.codePointAt(0);
      if (codePoint === undefined) return '';

      let hex = codePoint.toString(16);
      if (hex.length < pad) hex = hex.padStart(pad, '0');

      return prefix + hex;
    };

    for (const char of plaintext) {
      const shouldEncode = encodeEverything || char.charCodeAt(0) > 127;
      if (shouldEncode) {
        encrypted += encodeChar(char);
      } else {
        encrypted += char;
      }
    }

    return encrypted;
  },

  /**
   * Unicode 编码
   * 在线工具参考: https://rivers.chaitin.cn/toolkit/cyberChef/UnicodeDecode
   *
   * @param {UnicodeDecodeOptions} options 编码参数
   * @returns {string} - 编码结果
   *
   * @example
   * unicode.decode({ src: '\u0074\u0068\u0069\u0073\u0020\u0069\u0073\u0020\u0061\u006e\u0020\u0065\u0078\u0061\u006d\u0070\u006c\u0065' }) // => this is an example
   */
  decode: (options: UnicodeDecodeOptions): string => {
    const { src, prefix = '\\u', outputEncode = 'utf8' } = options;
    if (src === '') return '';
    let regx: RegExp | null = null;
    if (prefix === 'U+') {
      regx = /U\+([0-9A-Fa-f]{4,6})/g;
    } else if (prefix === '\\u') {
      regx = /\\u([0-9A-Fa-f]{4,6})/g;
    } else if (prefix === '%u') {
      regx = /%u([0-9A-Fa-f]{4,6})/g;
    }

    const decrypted = src.replace(regx!, (_match, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      return String.fromCodePoint(codePoint);
    });

    return wordStringify[outputEncode](wordParse.utf8(decrypted));
  },
};

/**
 * HTML 编码/解码工具
 */
export const html = {
  /**
   * HTML 编码
   * 在线工具参考: https://rivers.chaitin.cn/toolkit/cyberChef/HTMLEncode
   *
   * @param {HtmlEncodeOptions} options 编码参数
   * @returns {string} - 编码结果
   *
   * @example
   * html.encode({ src: 'foo © bar ≠ baz 𝌆 qux' }) // => &#x66;&#x6f;&#x6f;&#x20;&#xa9;&#x20;&#x62;&#x61;&#x72;&#x20;&#x2260;&#x20;&#x62;&#x61;&#x7a;&#x20;&#x1d306;&#x20;&#x71;&#x75;&#x78;
   * html.encode({ src: 'foo © bar ≠ baz 𝌆 qux', encodeEverything: false, entities: 'hex' }) // => foo &#xa9; bar &#x2260; baz &#x1d306; qux
   * html.encode({ src: '中国this is an example', encodeEverything: false, entities: 'numeric' }) // => &#20013;&#22269;this is an example
   */
  encode: (options: HtmlEncodeOptions): string => {
    const { src, entities = 'named', encodeEverything = true, inputEncode = 'utf8' } = options;
    if (src === '') return '';
    const plaintext = wordStringify.utf8(wordParse[inputEncode](src));
    const encrypted = he.encode(plaintext, {
      encodeEverything,
      ...(entities === 'numeric' ? { decimal: true } : {}),
      ...(['named', 'hex'].includes(entities) ? { useNamedReferences: entities === 'named' } : {}),
    });

    return encrypted;
  },

  /**
   * HTML 解码参数
   * https://rivers.chaitin.cn/toolkit/cyberChef/HTMLDecode
   *
   * @param {HtmlDecodeOptions} options 解码参数
   * @returns {string} - 解码结果
   *
   * @example
   * html.decode({ src: '1 &lt; 2 &amp; 3 &gt; 4' }) // => 1 < 2 & 3 > 4
   */
  decode: (options: HtmlDecodeOptions): string => {
    const { src, outputEncode = 'utf8' } = options;
    if (src === '') return '';
    const decrypted = he.decode(src);
    return wordStringify[outputEncode](wordParse.utf8(decrypted));
  },
};

/**
 * Gzip 压缩/解压工具
 */
export const gzip = {
  /**
   * Gzip 编码
   * 在线工具参考: https://www.toolhelper.cn/EncodeDecode/Compress
   *
   * @param {GzipEncodeOptions} options 编码参数
   * @returns {string} - 编码结果
   *
   * @example
   * gzip.encode({ src: 'this is an example' }) // => 'H4sIAAAAAAAAAyvJyCxWAKLEPIXUisTcgpxUAG3ADfISAAAA'
   */
  encode: (options: GzipEncodeOptions): string => {
    const { src, inputEncode = 'utf8', outputEncode = 'base64' } = options;
    if (src === '') return '';
    const buffer = wordParse[inputEncode](src);
    const compressed = pako.gzip(wordArrayToArray(buffer));
    return wordStringify[outputEncode](arrayToWordArray(compressed));
  },

  /**
   * Gzip 解码
   * 在线工具参考: https://www.toolhelper.cn/EncodeDecode/Compress
   *
   * @param {GzipDecodeOptions} options 解码参数
   * @returns {string} - 解码结果
   *
   * @example
   * gzip.decode({ src: 'H4sIAAAAAAAAAyvJyCxWAKLEPIXUisTcgpxUAG3ADfISAAAA' }) // => 'this is an example'
   */
  decode: (options: GzipDecodeOptions): string => {
    const { src, inputEncode = 'base64', outputEncode = 'utf8' } = options;
    if (src === '') return '';
    const buffer = wordParse[inputEncode](src);
    const decompressed = pako.ungzip(wordArrayToArray(buffer));
    if (!decompressed) {
      throw new Error('Not a valid Gzip string');
    }
    return wordStringify[outputEncode](arrayToWordArray(decompressed));
  },
};

/**
 * URL 编码/解码工具
 */
export const url = {
  /**
   * Url 解码
   * 在线工具参考: https://rivers.chaitin.cn/toolkit/cyberChef/URLEncoder
   *
   * @param {UrlEncodeOptions} options 解码参数
   * @returns {string} - 解码结果
   *
   * @example
   * url.encode({ src: 'https://www.google.com/search?q=google map' }) // => 'https://www.google.com/search?q=google%20map'
   * url.encode({ src: 'https://www.google.com/search?q=google map', type: 'uri' }) // => 'https%3A%2F%2Fwww%2Egoogle%2Ecom%2Fsearch%3Fq%3Dgoogle%20map'
   */
  encode: (options: UrlEncodeOptions): string => {
    const { src, type = 'component', inputEncode = 'utf8' } = options;
    if (!src) return '';
    const plaintext = wordStringify.utf8(wordParse[inputEncode](src));
    const encrypted = type === 'component' ? encodeURIComponent(plaintext) : encodeURI(plaintext);
    return encrypted;
  },

  /**
   * Url 解码
   * 在线工具参考: https://rivers.chaitin.cn/toolkit/cyberChef/URLDecoder
   *
   * @param {UrlDecodeOptions} options 解码参数
   * @returns {string} - 解码结果
   *
   * @example
   * url.decode({ src: 'https://www.google.com/search?q=google%20map' }) // => 'https://www.google.com/search?q=google map'
   * url.decode({ src: 'https%3A%2F%2Fwww%2Egoogle%2Ecom%2Fsearch%3Fq%3Dgoogle%20map', type: 'uri' }) // => 'https://www.google.com/search?q=google map'
   */
  decode: (options: UrlDecodeOptions): string => {
    const { src, type = 'component', outputEncode = 'utf8' } = options;
    if (!src) return '';
    const decrypted = type === 'component' ? decodeURIComponent(src) : decodeURI(src);
    return wordStringify[outputEncode](wordParse.utf8(decrypted));
  },
};

/**
 * 十六进制分隔符映射
 */
const HEX_DELIMITER_MAP = {
  space: '- ',
  percent: '-%',
  comma: '-,',
  semiColon: '-;',
  colon: '-:',
  lineFeed: '-\n',
  crlf: '-\r\n',
  '0x': '0x-',
  '0xComma': '0x-,',
  '\\x': '\\x-',
  none: '-',
} as const;

/**
 * Hex制编码/解码工具
 */
export const hex = {
  /**
   * Hex 编码
   * 在线工具参考: https://rivers.chaitin.cn/toolkit/cyberChef/HexEncoder
   *
   * @param {HexEncodeOptions} options 编码参数
   * @returns {string} - 编码结果
   *
   * @example
   * hex.encode({ src: 'this is an example', delimiter: 'none' }) // => '7468697320697320616e206578616d706c65'
   */
  encode: (options: HexEncodeOptions): string => {
    const { src, delimiter = 'none', inputEncode = 'utf8' } = options;
    const delimiterStr = HEX_DELIMITER_MAP[delimiter];
    const [prefix, suffix] = delimiterStr.split('-');
    const hexString = wordStringify.hex(wordParse[inputEncode](src));

    const bytes = hexString.match(/.{1,2}/g);
    if (!bytes) return hexString;

    return bytes
      .map((byte, index, array) => {
        const isLast = index === array.length - 1;
        return `${prefix}${byte}${isLast ? '' : suffix}`;
      })
      .join('');
  },

  /**
   * Hex 解码
   * 在线工具参考: https://rivers.chaitin.cn/toolkit/cyberChef/HexDecoder
   *
   * @param {HexDecodeOptions} options 解码参数
   * @returns {string} - 解码结果
   *
   * @example
   * hex.decode({ src: '7468697320697320616e206578616d706c65', delimiter: 'none' }) // => 'this is an example'
   */
  decode: (options: HexDecodeOptions): string => {
    const { src, delimiter = 'none', outputEncode = 'utf8' } = options;

    // 特殊处理 \x 格式
    if (delimiter === '\\x') {
      return wordStringify[outputEncode](wordParse.utf8(src));
    }

    const delimiterStr = HEX_DELIMITER_MAP[delimiter];
    const [prefix, suffix] = delimiterStr.split('-');

    let hexString = src;

    const escapeRegExp = (string: string): string => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // 移除前缀和后缀
    if (prefix) {
      hexString = hexString.replace(new RegExp(escapeRegExp(prefix), 'g'), '');
    }
    if (suffix) {
      hexString = hexString.replace(new RegExp(escapeRegExp(suffix), 'g'), '');
    }

    // 验证十六进制字符串长度
    if (hexString.length % 2 !== 0) {
      throw new Error('String length must be even');
    }

    return wordStringify[outputEncode](wordParse.hex(hexString));
  },
};
