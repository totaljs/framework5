// Total.js Utils
// The MIT License
// Copyright 2012-2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

const KeepAlive = new F.Http.Agent({ keepAlive: true, timeout: 120000 });
const KeepAliveHttps = new F.Https.Agent({ keepAlive: true, timeout: 120000 });

// Flags
const COMPRESS = { gzip: 1, deflate: 1 };
const CONCAT = [null, null];
const SKI_PPORTS = { '80': 1, '443': 1 };
const SKIP_BODYENCRYPTOR = { ':': 1, '"': 1, '[': 1, ']': 1, '\'': 1, '_': 1, '{': 1, '}': 1, '&': 1, '=': 1, '+': 1, '-': 1, '\\': 1, '/': 1, ',': 1 };
const TYPE_OCTET = 'application/octet-stream';
const RANDOM_STRING = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
const RANDOM_NUMBER = '0123456789';
const RANDOM_TEXT = [...RANDOM_NUMBER, ...RANDOM_STRING];
const CRC32TABLE = '00000000,77073096,EE0E612C,990951BA,076DC419,706AF48F,E963A535,9E6495A3,0EDB8832,79DCB8A4,E0D5E91E,97D2D988,09B64C2B,7EB17CBD,E7B82D07,90BF1D91,1DB71064,6AB020F2,F3B97148,84BE41DE,1ADAD47D,6DDDE4EB,F4D4B551,83D385C7,136C9856,646BA8C0,FD62F97A,8A65C9EC,14015C4F,63066CD9,FA0F3D63,8D080DF5,3B6E20C8,4C69105E,D56041E4,A2677172,3C03E4D1,4B04D447,D20D85FD,A50AB56B,35B5A8FA,42B2986C,DBBBC9D6,ACBCF940,32D86CE3,45DF5C75,DCD60DCF,ABD13D59,26D930AC,51DE003A,C8D75180,BFD06116,21B4F4B5,56B3C423,CFBA9599,B8BDA50F,2802B89E,5F058808,C60CD9B2,B10BE924,2F6F7C87,58684C11,C1611DAB,B6662D3D,76DC4190,01DB7106,98D220BC,EFD5102A,71B18589,06B6B51F,9FBFE4A5,E8B8D433,7807C9A2,0F00F934,9609A88E,E10E9818,7F6A0DBB,086D3D2D,91646C97,E6635C01,6B6B51F4,1C6C6162,856530D8,F262004E,6C0695ED,1B01A57B,8208F4C1,F50FC457,65B0D9C6,12B7E950,8BBEB8EA,FCB9887C,62DD1DDF,15DA2D49,8CD37CF3,FBD44C65,4DB26158,3AB551CE,A3BC0074,D4BB30E2,4ADFA541,3DD895D7,A4D1C46D,D3D6F4FB,4369E96A,346ED9FC,AD678846,DA60B8D0,44042D73,33031DE5,AA0A4C5F,DD0D7CC9,5005713C,270241AA,BE0B1010,C90C2086,5768B525,206F85B3,B966D409,CE61E49F,5EDEF90E,29D9C998,B0D09822,C7D7A8B4,59B33D17,2EB40D81,B7BD5C3B,C0BA6CAD,EDB88320,9ABFB3B6,03B6E20C,74B1D29A,EAD54739,9DD277AF,04DB2615,73DC1683,E3630B12,94643B84,0D6D6A3E,7A6A5AA8,E40ECF0B,9309FF9D,0A00AE27,7D079EB1,F00F9344,8708A3D2,1E01F268,6906C2FE,F762575D,806567CB,196C3671,6E6B06E7,FED41B76,89D32BE0,10DA7A5A,67DD4ACC,F9B9DF6F,8EBEEFF9,17B7BE43,60B08ED5,D6D6A3E8,A1D1937E,38D8C2C4,4FDFF252,D1BB67F1,A6BC5767,3FB506DD,48B2364B,D80D2BDA,AF0A1B4C,36034AF6,41047A60,DF60EFC3,A867DF55,316E8EEF,4669BE79,CB61B38C,BC66831A,256FD2A0,5268E236,CC0C7795,BB0B4703,220216B9,5505262F,C5BA3BBE,B2BD0B28,2BB45A92,5CB36A04,C2D7FFA7,B5D0CF31,2CD99E8B,5BDEAE1D,9B64C2B0,EC63F226,756AA39C,026D930A,9C0906A9,EB0E363F,72076785,05005713,95BF4A82,E2B87A14,7BB12BAE,0CB61B38,92D28E9B,E5D5BE0D,7CDCEFB7,0BDBDF21,86D3D2D4,F1D4E242,68DDB3F8,1FDA836E,81BE16CD,F6B9265B,6FB077E1,18B74777,88085AE6,FF0F6A70,66063BCA,11010B5C,8F659EFF,F862AE69,616BFFD3,166CCF45,A00AE278,D70DD2EE,4E048354,3903B3C2,A7672661,D06016F7,4969474D,3E6E77DB,AED16A4A,D9D65ADC,40DF0B66,37D83BF0,A9BCAE53,DEBB9EC5,47B2CF7F,30B5FFE9,BDBDF21C,CABAC28A,53B39330,24B4A3A6,BAD03605,CDD70693,54DE5729,23D967BF,B3667A2E,C4614AB8,5D681B02,2A6F2B94,B40BBE37,C30C8EA1,5A05DF1B,2D02EF8D'.split(',').map(s => parseInt(s, 16));
const QUERIFYMETHODS = { GET: 1, POST: 1, DELETE: 1, PUT: 1, PATCH: 1, API: 1 };

// Regullar expressions
const REG_ISARR = /\[\d+\]|\[\]$/;
const REG_REPLACEARR = /\[\]/g;
const REG_EMPTYBUFFER = /\0|%00|\\u0000/g;
const REG_EMPTYBUFFER_TEST = /\0|%00|\\u0000/;
const REG_GUID = (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const REG_JPG = /jfif|exif/;
const REG_WEBP = /jfif|webp|exif/;
const REG_SVG = /xml|svg/i;
// const REG_DOUBLESLASH = /\/{2}|\.{2,}|\.{1,}\/|/g;
const REG_DOUBLESLASH = /\/{2,}/g;
const REG_TRIM = /^[\s]+|[\s]+$/g;
const REG_DATE = /(\d{1,2}\.\d{1,2}\.\d{4})|(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2}:\d{1,2}(:\d{1,2})?)/g;
const REG_DATEFORMAT = /YYYY|yyyy|YY|yy|MMMM|MMM|MM|M|dddd|DDDD|DDD|ddd|DD|dd|D|d|HH|H|hh|h|mm|m|ss|s|a|ww|w/g;
const REG_STRFORMAT = /\{\d+\}/g;
const REG_ASCII = /[^\u0000-\u007e]/g;
const REG_TRAVELSE = /\.\/|%/; // ./ | % in the URL address
const REG_PATH = /\\/g;
const REG_TAGS = /<\/?[^>]+(>|$)/g;
const REG_UA = /[a-z]+/gi;
const REG_XML = /\w+=".*?"/g;
const REG_DECODE = /&#?[a-z0-9]+;/g;
const REG_ARGS = /\{{1,2}[a-z0-9_.-\s]+\}{1,2}/gi;
const REG_INTEGER = /(^-|\s-)?[0-9]+/g;
const REG_FLOAT = /(^-|\s-)?[0-9.,]+/g;
const REG_TERMINAL = /[\w\S]+/g;
const REG_CONFIGURE = /\[\w+\]/g;
const REG_KEYWORD1 = /y/g;
const REG_KEYWORD2 = /\n/g;
const REG_KEYWORD3 = /\W|_/g;
const REG_BASE = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/;
const REG_BASE2 = /^|,([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/;
const REG_NUMBER = /^[0-9,.]$/;

const NEWLINE = '\r\n';
const DIACRITICSMAP = {};
const ALPHA_INDEX = { '&lt': '<', '&gt': '>', '&quot': '"', '&apos': '\'', '&amp': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': '\'', '&amp;': '&' };
const STREAMPIPE = { end: false };
const CT = 'Content-Type';
const PROXYBLACKLIST = { 'localhost': 1, '127.0.0.1': 1, '0.0.0.0': 1 };
const PROXYOPTIONS = { headers: {}, method: 'CONNECT', agent: false };
const PROXYTLS = { headers: {}};
const PROXYOPTIONSHTTP = {};
const REG_ROOT = /@\{#\}(\/)?/g;
const REG_NOREMAP = /@\{noremap\}(\n)?/g;
const REG_REMAP = /\shref=".*?"|src=".*?"/gi;
const REG_AJAX = /('|")+(!)?(GET|POST|PUT|DELETE|PATCH)\s(\(.*?\)\s)?\//g;
const REG_URLEXT = /^(https|http|wss|ws|file):\/\/|\/\/[a-z0-9]|[a-z]:|javascript:|#|@\{|'|"|\(/i;
const REG_TEXTAPPLICATION = /text|application/i;
const REG_TIME = /am|pm/i;
const REG_XMLKEY = /\[|\]|:|\.|_/g;
const REG_HEADERPARSER = /(name|filename)=".*?"|content-type:\s[a-z0-9-./+]+/ig;
const HEADEREND = Buffer.from('\r\n\r\n', 'ascii');

exports.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
exports.DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

var DIACRITICS=[{b:' ',c:'\u00a0'},{b:'0',c:'\u07c0'},{b:'A',c:'\u24b6\uff21\u00c0\u00c1\u00c2\u1ea6\u1ea4\u1eaa\u1ea8\u00c3\u0100\u0102\u1eb0\u1eae\u1eb4\u1eb2\u0226\u01e0\u00c4\u01de\u1ea2\u00c5\u01fa\u01cd\u0200\u0202\u1ea0\u1eac\u1eb6\u1e00\u0104\u023a\u2c6f'},{b:'AA',c:'\ua732'},{b:'AE',c:'\u00c6\u01fc\u01e2'},{b:'AO',c:'\ua734'},{b:'AU',c:'\ua736'},{b:'AV',c:'\ua738\ua73a'},{b:'AY',c:'\ua73c'},{b:'B',c:'\u24b7\uff22\u1e02\u1e04\u1e06\u0243\u0181'},{b:'C',c:'\u24b8\uff23\ua73e\u1e08\u0106C\u0108\u010a\u010c\u00c7\u0187\u023b'},{b:'D',c:'\u24b9\uff24\u1e0a\u010e\u1e0c\u1e10\u1e12\u1e0e\u0110\u018a\u0189\u1d05\ua779'},{b:'Dh',c:'\u00d0'},{b:'DZ',c:'\u01f1\u01c4'},{b:'Dz',c:'\u01f2\u01c5'},{b:'E',c:'\u025b\u24ba\uff25\u00c8\u00c9\u00ca\u1ec0\u1ebe\u1ec4\u1ec2\u1ebc\u0112\u1e14\u1e16\u0114\u0116\u00cb\u1eba\u011a\u0204\u0206\u1eb8\u1ec6\u0228\u1e1c\u0118\u1e18\u1e1a\u0190\u018e\u1d07'},{b:'F',c:'\ua77c\u24bb\uff26\u1e1e\u0191\ua77b'}, {b:'G',c:'\u24bc\uff27\u01f4\u011c\u1e20\u011e\u0120\u01e6\u0122\u01e4\u0193\ua7a0\ua77d\ua77e\u0262'},{b:'H',c:'\u24bd\uff28\u0124\u1e22\u1e26\u021e\u1e24\u1e28\u1e2a\u0126\u2c67\u2c75\ua78d'},{b:'I',c:'\u24be\uff29\u00cc\u00cd\u00ce\u0128\u012a\u012c\u0130\u00cf\u1e2e\u1ec8\u01cf\u0208\u020a\u1eca\u012e\u1e2c\u0197'},{b:'J',c:'\u24bf\uff2a\u0134\u0248\u0237'},{b:'K',c:'\u24c0\uff2b\u1e30\u01e8\u1e32\u0136\u1e34\u0198\u2c69\ua740\ua742\ua744\ua7a2'},{b:'L',c:'\u24c1\uff2c\u013f\u0139\u013d\u1e36\u1e38\u013b\u1e3c\u1e3a\u0141\u023d\u2c62\u2c60\ua748\ua746\ua780'}, {b:'LJ',c:'\u01c7'},{b:'Lj',c:'\u01c8'},{b:'M',c:'\u24c2\uff2d\u1e3e\u1e40\u1e42\u2c6e\u019c\u03fb'},{b:'N',c:'\ua7a4\u0220\u24c3\uff2e\u01f8\u0143\u00d1\u1e44\u0147\u1e46\u0145\u1e4a\u1e48\u019d\ua790\u1d0e'},{b:'NJ',c:'\u01ca'},{b:'Nj',c:'\u01cb'},{b:'O',c:'\u24c4\uff2f\u00d2\u00d3\u00d4\u1ed2\u1ed0\u1ed6\u1ed4\u00d5\u1e4c\u022c\u1e4e\u014c\u1e50\u1e52\u014e\u022e\u0230\u00d6\u022a\u1ece\u0150\u01d1\u020c\u020e\u01a0\u1edc\u1eda\u1ee0\u1ede\u1ee2\u1ecc\u1ed8\u01ea\u01ec\u00d8\u01fe\u0186\u019f\ua74a\ua74c'}, {b:'OE',c:'\u0152'},{b:'OI',c:'\u01a2'},{b:'OO',c:'\ua74e'},{b:'OU',c:'\u0222'},{b:'P',c:'\u24c5\uff30\u1e54\u1e56\u01a4\u2c63\ua750\ua752\ua754'},{b:'Q',c:'\u24c6\uff31\ua756\ua758\u024a'},{b:'R',c:'\u24c7\uff32\u0154\u1e58\u0158\u0210\u0212\u1e5a\u1e5c\u0156\u1e5e\u024c\u2c64\ua75a\ua7a6\ua782'},{b:'S',c:'\u24c8\uff33\u1e9e\u015a\u1e64\u015c\u1e60\u0160\u1e66\u1e62\u1e68\u0218\u015e\u2c7e\ua7a8\ua784'},{b:'T',c:'\u24c9\uff34\u1e6a\u0164\u1e6c\u021a\u0162\u1e70\u1e6e\u0166\u01ac\u01ae\u023e\ua786'}, {b:'Th',c:'\u00de'},{b:'TZ',c:'\ua728'},{b:'U',c:'\u24ca\uff35\u00d9\u00da\u00db\u0168\u1e78\u016a\u1e7a\u016c\u00dc\u01db\u01d7\u01d5\u01d9\u1ee6\u016e\u0170\u01d3\u0214\u0216\u01af\u1eea\u1ee8\u1eee\u1eec\u1ef0\u1ee4\u1e72\u0172\u1e76\u1e74\u0244'},{b:'V',c:'\u24cb\uff36\u1e7c\u1e7e\u01b2\ua75e\u0245'},{b:'VY',c:'\ua760'},{b:'W',c:'\u24cc\uff37\u1e80\u1e82\u0174\u1e86\u1e84\u1e88\u2c72'},{b:'X',c:'\u24cd\uff38\u1e8a\u1e8c'},{b:'Y',c:'\u24ce\uff39\u1ef2\u00dd\u0176\u1ef8\u0232\u1e8e\u0178\u1ef6\u1ef4\u01b3\u024e\u1efe'}, {b:'Z',c:'\u24cf\uff3a\u0179\u1e90\u017b\u017d\u1e92\u1e94\u01b5\u0224\u2c7f\u2c6b\ua762'},{b:'a',c:'\u24d0\uff41\u1e9a\u00e0\u00e1\u00e2\u1ea7\u1ea5\u1eab\u1ea9\u00e3\u0101\u0103\u1eb1\u1eaf\u1eb5\u1eb3\u0227\u01e1\u00e4\u01df\u1ea3\u00e5\u01fb\u01ce\u0201\u0203\u1ea1\u1ead\u1eb7\u1e01\u0105\u2c65\u0250\u0251'},{b:'aa',c:'\ua733'},{b:'ae',c:'\u00e6\u01fd\u01e3'},{b:'ao',c:'\ua735'},{b:'au',c:'\ua737'},{b:'av',c:'\ua739\ua73b'},{b:'ay',c:'\ua73d'}, {b:'b',c:'\u24d1\uff42\u1e03\u1e05\u1e07\u0180\u0183\u0253\u0182'},{b:'c',c:'\uff43\u24d2\u0107\u0109\u010b\u010d\u00e7\u1e09\u0188\u023c\ua73f\u2184'},{b:'d',c:'\u24d3\uff44\u1e0b\u010f\u1e0d\u1e11\u1e13\u1e0f\u0111\u018c\u0256\u0257\u018b\u13e7\u0501\ua7aa'},{b:'dh',c:'\u00f0'},{b:'dz',c:'\u01f3\u01c6'},{b:'e',c:'\u24d4\uff45\u00e8\u00e9\u00ea\u1ec1\u1ebf\u1ec5\u1ec3\u1ebd\u0113\u1e15\u1e17\u0115\u0117\u00eb\u1ebb\u011b\u0205\u0207\u1eb9\u1ec7\u0229\u1e1d\u0119\u1e19\u1e1b\u0247\u01dd'}, {b:'f',c:'\u24d5\uff46\u1e1f\u0192'},{b:'ff',c:'\ufb00'},{b:'fi',c:'\ufb01'},{b:'fl',c:'\ufb02'},{b:'ffi',c:'\ufb03'},{b:'ffl',c:'\ufb04'},{b:'g',c:'\u24d6\uff47\u01f5\u011d\u1e21\u011f\u0121\u01e7\u0123\u01e5\u0260\ua7a1\ua77f\u1d79'},{b:'h',c:'\u24d7\uff48\u0125\u1e23\u1e27\u021f\u1e25\u1e29\u1e2b\u1e96\u0127\u2c68\u2c76\u0265'},{b:'hv',c:'\u0195'},{b:'i',c:'\u24d8\uff49\u00ec\u00ed\u00ee\u0129\u012b\u012d\u00ef\u1e2f\u1ec9\u01d0\u0209\u020b\u1ecb\u012f\u1e2d\u0268\u0131'}, {b:'j',c:'\u24d9\uff4a\u0135\u01f0\u0249'},{b:'k',c:'\u24da\uff4b\u1e31\u01e9\u1e33\u0137\u1e35\u0199\u2c6a\ua741\ua743\ua745\ua7a3'},{b:'l',c:'\u24db\uff4c\u0140\u013a\u013e\u1e37\u1e39\u013c\u1e3d\u1e3b\u017f\u0142\u019a\u026b\u2c61\ua749\ua781\ua747\u026d'},{b:'lj',c:'\u01c9'},{b:'m',c:'\u24dc\uff4d\u1e3f\u1e41\u1e43\u0271\u026f'},{b:'n',c:'\u24dd\uff4e\u01f9\u0144\u00f1\u1e45\u0148\u1e47\u0146\u1e4b\u1e49\u019e\u0272\u0149\ua791\ua7a5\u043b\u0509'},{b:'nj', c:'\u01cc'},{b:'o',c:'\u24de\uff4f\u00f2\u00f3\u00f4\u1ed3\u1ed1\u1ed7\u1ed5\u00f5\u1e4d\u022d\u1e4f\u014d\u1e51\u1e53\u014f\u022f\u0231\u00f6\u022b\u1ecf\u0151\u01d2\u020d\u020f\u01a1\u1edd\u1edb\u1ee1\u1edf\u1ee3\u1ecd\u1ed9\u01eb\u01ed\u00f8\u01ff\ua74b\ua74d\u0275\u0254\u1d11'},{b:'oe',c:'\u0153'},{b:'oi',c:'\u01a3'},{b:'oo',c:'\ua74f'},{b:'ou',c:'\u0223'},{b:'p',c:'\u24df\uff50\u1e55\u1e57\u01a5\u1d7d\ua751\ua753\ua755\u03c1'},{b:'q',c:'\u24e0\uff51\u024b\ua757\ua759'}, {b:'r',c:'\u24e1\uff52\u0155\u1e59\u0159\u0211\u0213\u1e5b\u1e5d\u0157\u1e5f\u024d\u027d\ua75b\ua7a7\ua783'},{b:'s',c:'\u24e2\uff53\u015b\u1e65\u015d\u1e61\u0161\u1e67\u1e63\u1e69\u0219\u015f\u023f\ua7a9\ua785\u1e9b\u0282'},{b:'ss',c:'\u00df'},{b:'t',c:'\u24e3\uff54\u1e6b\u1e97\u0165\u1e6d\u021b\u0163\u1e71\u1e6f\u0167\u01ad\u0288\u2c66\ua787'},{b:'th',c:'\u00fe'},{b:'tz',c:'\ua729'},{b:'u',c:'\u24e4\uff55\u00f9\u00fa\u00fb\u0169\u1e79\u016b\u1e7b\u016d\u00fc\u01dc\u01d8\u01d6\u01da\u1ee7\u016f\u0171\u01d4\u0215\u0217\u01b0\u1eeb\u1ee9\u1eef\u1eed\u1ef1\u1ee5\u1e73\u0173\u1e77\u1e75\u0289'}, {b:'v',c:'\u24e5\uff56\u1e7d\u1e7f\u028b\ua75f\u028c'},{b:'vy',c:'\ua761'},{b:'w',c:'\u24e6\uff57\u1e81\u1e83\u0175\u1e87\u1e85\u1e98\u1e89\u2c73'},{b:'x',c:'\u24e7\uff58\u1e8b\u1e8d'},{b:'y',c:'\u24e8\uff59\u1ef3\u00fd\u0177\u1ef9\u0233\u1e8f\u00ff\u1ef7\u1e99\u1ef5\u01b4\u024f\u1eff'},{b:'z',c:'\u24e9\uff5a\u017a\u1e91\u017c\u017e\u1e93\u1e95\u01b6\u0225\u0240\u2c6c\ua763'}];
var UPLOADINDEXER = 1;

// NEW
const REG_ENVLINES = /\n|\r|\r\n/;
const REG_SEARCH = /[^a-zA-Zá-žÁ-Ž\d\s:]/g;
const REG_UTF8 = /[\u3400-\u9FBF]/;

exports.success = { success: true };
exports.noop = function() {};

exports.parseConfig = function(value) {

	if (!value)
		return {};

	if (typeof(value) === 'string') {

		var lines = value.split('\n');
		var response = [];
		for (let line of lines) {

			if (!line || line[0] === '#' || line.substring(0, 2) === '//')
				continue;

			let index = line.indexOf(':');
			if (index === -1) {
				index = line.indexOf('\t:');
				if (index === -1)
					continue;
			}

			let name = line.substring(0, index).trim();
			let value = line.substring(index + 2).trim();
			let type = 'string';

			if (value.substring(0, 7) === 'base64 ' && value.length > 8)
				value = Buffer.from(value.substring(7).trim(), 'base64').toString('utf8');
			else if (value.substring(0, 4) === 'hex ' && value.length > 6)
				value = Buffer.from(value.substring(4).trim(), 'hex').toString('utf8');

			index = name.indexOf('(');

			if (index !== -1) {
				type = name.substring(index + 1, name.indexOf(')')).trim().toLowerCase();
				name = name.substring(0, index).trim();
			}

			response.push({ id: name, type: type, value: value });
		}

		return exports.parseConfig(response);
	}

	if (!(value instanceof Array)) {
		let tmp = [];
		for (let key in value)
			tmp.push({ id: key, value: value[key] });
		value = tmp;
	}

	var cfg = {};
	var generated = [];

	for (let item of value) {

		let key = item.id || item.key || item.name;
		let val = item.value || item.val || item.body;
		let type = item.type;

		switch (type) {
			case 'number':
			case 'float':
			case 'double':
			case 'currency':
				cfg[key] = val.parseFloat2();
				break;
			case 'boolean':
			case 'bool':
				cfg[key] = (/true|on|1|enabled/i).test(val);
				break;
			case 'config':
				cfg[key] = F.config[val];
				break;
			case 'array':
				cfg[key] = val.split(',').trim();
				break;
			case 'eval':
				try {
					cfg[key] = new Function('return ' + val)();
				} catch (e) {
					throw new Error('Invalid "{0}" value: {1}'.format(key, e.toString()));
				}
				break;
			case 'json':
			case 'object':
				cfg[key] = val.parseJSON(true);
				break;
			case 'env':
			case 'environment':
				cfg[key] = process.env[val];
				break;
			case 'date':
			case 'time':
			case 'datetime':
				cfg[key] = val.parseDate();
				break;
			case 'random':
				cfg[key] = exports.guid((val || '0').parseInt() || 10);
				break;
			case 'generate':
				cfg[key] = exports.random_string(val.parseInt() || 10);
				generated.push(key);
				break;
			case 'hash':
				cfg[key] = exports.guid(val.parseInt() || 10);
				generated.push(key);
				break;
			default:

				if (val === 'true' || val === 'false')
					val = val === 'true';
				else if (REG_NUMBER.test(val))
					val = val.parseFloat();

				cfg[key] = val;
				break;
		}
	}

	if (generated && generated.length) {

		var filename = F.path.databases('config.json');
		var cache = {};
		try {
			cache = F.Fs.readFileSync(filename).toString('utf8').parseJSON();
		} catch (e) {}

		var resave = false;

		for (let key of generated) {
			if (cache[key] == null) {
				cache[key] = cfg[key];
				resave = true;
			} else
				cfg[key] = cache[key];
		}

		if (resave) {
			F.path.verify('databases');
			F.Fs.writeFileSync(filename, JSON.stringify(cache, null, '\t'), NOOP);
		}
	}

	return cfg;
};

const COMPARER = function(a, b) {
	if (!a && b)
		return -1;
	if (a && !b)
		return 1;
	if (a === b)
		return 0;
	return global.Intl.Collator().compare(a, b);
};

const COMPARER_DESC = function(a, b) {

	if (!a && b)
		return 1;

	if (a && !b)
		return -1;

	if (a === b)
		return 0;

	var val = global.Intl.Collator().compare(a, b);
	return val ? val * -1 : 0;
};

for (let i = 0; i < DIACRITICS.length; i += 1)
	for (let chars = DIACRITICS[i].c, j = 0; j < chars.length; j += 1)
		DIACRITICSMAP[chars[j]] = DIACRITICS[i].b;

const DP = Date.prototype;
const SP = String.prototype;
const NP = Number.prototype;

DIACRITICS = null;

var CONTENTTYPES = {
	aac: 'audio/aac',
	ai: 'application/postscript',
	appcache: 'text/cache-manifest',
	avi: 'video/avi',
	bin: TYPE_OCTET,
	bmp: 'image/bmp',
	coffee: 'text/coffeescript',
	css: 'text/css',
	csv: 'text/csv',
	doc: 'application/msword',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	dtd: 'application/xml-dtd',
	eps: 'application/postscript',
	exe: TYPE_OCTET,
	flac: 'audio/x-flac',
	geojson: 'application/json',
	gif: 'image/gif',
	gzip: 'application/x-gzip',
	heic: 'image/heic',
	heif: 'image/heif',
	htm: 'text/html',
	html: 'text/html',
	ico: 'image/x-icon',
	ics: 'text/calendar',
	ifb: 'text/calendar',
	jpe: 'image/jpeg',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	js: 'text/javascript',
	json: 'application/json',
	ui: 'application/json', // UI builder
	jsx: 'text/jsx',
	less: 'text/css',
	m3u8: 'application/x-mpegURL',
	m4a: 'audio/mp4a-latm',
	m4v: 'video/x-m4v',
	manifest: 'text/cache-manifest',
	md: 'text/x-markdown',
	mid: 'audio/midi',
	midi: 'audio/midi',
	mjs: 'text/javascript',
	mov: 'video/quicktime',
	mp3: 'audio/mpeg',
	mp4: 'video/mp4',
	mpe: 'video/mpeg',
	mpeg: 'video/mpeg',
	mpg: 'video/mpeg',
	mpga: 'audio/mpeg',
	mtl: 'text/plain',
	mv4: 'video/mv4',
	obj: 'text/plain',
	ogg: 'application/ogg',
	ogv: 'video/ogg',
	package: 'text/plain',
	pdf: 'application/pdf',
	png: 'image/png',
	psd: 'image/vnd.adobe.photoshop',
	ppt: 'application/vnd.ms-powerpoint',
	pptx: 'application/vnd.ms-powerpoint',
	ps: 'application/postscript',
	rar: 'application/x-rar-compressed',
	rtf: 'text/rtf',
	sass: 'text/css',
	scss: 'text/css',
	sh: 'application/x-sh',
	stl: 'application/sla',
	svg: 'image/svg+xml',
	swf: 'application/x-shockwave-flash',
	tar: 'application/x-tar',
	ts: 'video/mp2t',
	tif: 'image/tiff',
	tiff: 'image/tiff',
	txt: 'text/plain',
	sql: 'text/plain',
	wav: 'audio/wav',
	wasm: 'application/wasm',
	webm: 'video/webm',
	webp: 'image/webp',
	woff: 'application/font-woff',
	woff2: 'application/font-woff2',
	xht: 'application/xhtml+xml',
	xhtml: 'application/xhtml+xml',
	xls: 'application/vnd.ms-excel',
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	xml: 'application/xml',
	xpm: 'image/x-xpixmap',
	xsl: 'application/xml',
	xsd: 'application/xml',
	xslt: 'application/xslt+xml',
	zip: 'application/zip',
	'7zip': 'application/x-7z-compressed'
};

exports.diffarr = function(prop, db, form) {

	var an = [];
	var au = [];
	var ar = [];
	var is, oa, ob;

	for (var i = 0; i < db.length; i++) {
		oa = db[i];
		is = false;
		for (var j = 0; j < form.length; j++) {
			ob = form[j];
			if (oa[prop] == ob[prop]) {
				au.push({ db: oa, form: ob });
				is = true;
				break;
			}
		}
		if (!is)
			ar.push(oa[prop]);
	}

	for (var i = 0; i < form.length; i++) {
		ob = form[i];
		is = false;
		for (var j = 0; j < db.length; j++) {
			oa = db[j];
			if (ob[prop] == oa[prop]) {
				is = true;
				break;
			}
		}
		if (!is)
			an.push(ob);
	}

	var obj = {};
	obj.add = an;
	obj.upd = au;
	obj.rem = ar;
	return obj;
};

exports.groupify = function(id, count) {

	var number = 1;

	if (!count)
		count = 4;

	for (var i = 0; i < count; i++)
		number *= 10;

	var val = (HASH(id, true) % number) + '';
	var diff = count - val.length;
	if (diff > 0) {
		for (var i = 0; i < diff; i++)
			val = '0' + val;
	}

	if (diff.length > 4)
		val = val.substring(0, 4);

	return val;
};

exports.toURLEncode = function(value) {
	var builder = [];

	for (var key in value) {
		var val = value[key];

		if (val == null || val === '')
			continue;

		var type = typeof(val);
		switch (type) {
			case 'string':
				builder.push(key + '=' + encodeURIComponent(val));
				break;
			case 'date':
				builder.push(key + '=' + encodeURIComponent(val.format('utc')));
				break;
			case 'boolean':
			case 'number':
				builder.push(key + '=' + val);
				break;
			case 'object':
				if (val instanceof Array)
					builder.push(key + '=' + encodeURIComponent(val.join(',')));
				break;
		}
	}

	return builder.length ? builder.join('&') : '';
};

exports.resolve = function(url, callback, param) {

	var uri;

	try {
		uri = F.Url.parse(url);
	} catch (e) {
		callback(e);
		return;
	}

	var cache = F.temporary.dnscache[uri.host];

	if (!callback)
		return cache;

	if (cache) {
		uri.host = cache[0];
		callback(null, uri, param, cache);
		return;
	}

	F.Dns.resolve4(uri.hostname, function(e, addresses) {
		if (e) {
			setImmediate(dnsresolve_callback, uri, callback, param);
		} else {
			F.temporary.dnscache[uri.host] = addresses;
			uri.host = addresses[0];
			callback(null, uri, param, addresses);
		}
	});
};

function dnsresolve_callback(uri, callback, param) {
	F.Dns.resolve4(uri.hostname, function(e, addresses) {
		if (addresses && addresses.length) {
			F.temporary.dnscache[uri.host] = addresses;
			uri.host = addresses[0];
		}
		callback(e, uri, param, addresses);
	});
}

function keywordscleaner(c) {
	return c.charCodeAt(0) < 200 ? '' : c;
}

function parseProxy(p) {

	var key = 'proxy_' + p;

	if (F.temporary.utils[key])
		return F.temporary.utils[key];

	if (p.indexOf('://') === -1)
		p = 'http://' + p;

	var obj = F.Url.parse(p);

	if (obj.auth)
		obj._auth = 'Basic ' + Buffer.from(obj.auth).toString('base64');

	obj.port = +obj.port;

	if (p.indexOf('https:') !== -1) {
		obj.rejectUnauthorized = false;
		obj.requestCert = true;
	}

	return F.temporary.utils[key] = obj;
}

function _request(opt, callback) {

	var options = { length: 0, timeout: opt.timeout == false || opt.timeout == 0 ? 0 : (opt.timeout || 8000), encoding: opt.encoding || 'utf8', callback: callback || opt.callback || NOOP, post: true, redirect: 0 };
	var proxy;

	F.stats.performance.external++;

	if (opt.headers)
		opt.headers = exports.extend({}, opt.headers);
	else
		opt.headers = {};

	if (!opt.method)
		opt.method = 'GET';

	options.$totalinit = opt;

	// opt.encrypt {String}
	// opt.limit in kB
	// opt.key {Buffer}
	// opt.cert {Buffer}
	// opt.onprogress(percentage)
	// opt.ondata(chunk, percentage)

	if (opt.ondata)
		options.ondata = opt.ondata;

	if (opt.onprogress)
		options.onprogress = opt.onprogress;

	if (opt.proxy)
		proxy = parseProxy(opt.proxy);

	if (opt.xhr)
		opt.headers['X-Requested-With'] = 'XMLHttpRequest';

	options.response = opt.response ? opt.response : {};
	options.response.body = '';
	options.iserror = false;

	if (opt.resolve || opt.dnscache)
		options.resolve = true;

	if (opt.custom)
		options.custom = true;

	if (opt.noredirect)
		options.noredirect = true;

	if (opt.keepalive)
		options.keepalive = true;

	if (opt.type) {
		switch (opt.type) {
			case 'plain':
			case 'text':
				opt.headers[CT] = 'text/plain';
				break;
			case 'html':
				opt.headers[CT] = 'text/html';
				break;
			case 'raw':
				opt.headers[CT] = TYPE_OCTET;
				break;
			case 'json':
				opt.headers[CT] = 'application/json; charset=utf-8';
				break;
			case 'urlencoded':
				opt.headers[CT] = 'application/x-www-form-urlencoded';
				break;
			case 'xml':
				opt.headers[CT] = 'text/xml';
				break;
		}
	}

	if (opt.compress)
		opt.headers['Content-Encoding'] = opt.compress;

	if (opt.files) {
		options.boundary = '----TOTALFILE_' + Math.random().toString(36).substring(3);
		opt.headers[CT] = 'multipart/form-data; boundary=' + options.boundary;
		options.files = opt.files;
		options.upload = true;

		// Must be object { key: value }
		if (opt.body)
			options.body = opt.body;

	} else {
		if (opt.body) {
			if (!(opt.body instanceof Buffer)) {
				if (opt.encrypt) {
					opt.body = exports.encrypt_data(opt.body, opt.encrypt);
					opt.headers['X-Encryption'] = 'a';
				}
				opt.body = Buffer.from(opt.body, 'utf8');
			}

			if (!opt.compress || !COMPRESS[opt.compress])
				opt.headers['Content-Length'] = opt.body.length;
		}

		options.body = opt.body;
	}

	if (opt.cookies) {
		var builder = '';
		for (var m in opt.cookies)
			builder += (builder ? '; ' : '') + m + '=' + opt.cookies[m];
		if (builder)
			opt.headers.Cookie = builder;
	}

	if (opt.query) {
		if (typeof(opt.query) !== 'string')
			opt.query = exports.toURLEncode(opt.query);
		if (opt.url) {
			if (opt.url.lastIndexOf('?') === -1)
				opt.url += '?' + opt.query;
			else
				opt.url += '&' + opt.query;
		} else if (opt.unixsocket.path) {
			if (opt.unixsocket.path.lastIndexOf('?') === -1)
				opt.unixsocket.path += '?' + opt.query;
			else
				opt.unixsocket.path += '&' + opt.query;
		}
	}

	var uri = opt.unixsocket ? { socketPath: opt.unixsocket.socket, path: opt.unixsocket.path } : F.Url.parse(opt.url);

	if ((opt.unixsocket && !uri.socketPath) || (!opt.unixsocket && (!uri.hostname || !uri.host))) {
		options.response.canceled = true;
		opt.callback && opt.callback('Invalid hostname', options.response);
		return;
	}

	uri.method = opt.method;
	uri.headers = opt.headers;

	if (opt.insecure) {
		uri.rejectUnauthorized = false;
		uri.requestCert = true;
	}

	options.uri = uri;
	options.opt = opt;

	if (opt.key)
		uri.key = opt.key;

	if (opt.cert)
		uri.cert = opt.cert;

	if (opt.dhparam)
		uri.dhparam = opt.dhparam;

	if (options.resolve && (opt.unixsocket || (uri.hostname === 'localhost' || uri.hostname.charCodeAt(0) < 64)))
		options.resolve = false;

	if (!opt.unixsocket && CONF.default_proxy && !proxy && !PROXYBLACKLIST[uri.hostname])
		proxy = parseProxy(CONF.default_proxy);

	if (!opt.unixsocket && proxy && (uri.hostname === 'localhost' || uri.hostname === '127.0.0.1'))
		proxy = null;

	options.proxy = proxy;

	if (proxy && uri.protocol === 'https:') {
		proxy.tls = true;
		uri.agent = new ProxyAgent(options);
		uri.agent.request = F.Http.request;
		uri.agent.createSocket = createSecureSocket;
		uri.agent.defaultPort = 443;
	}

	if (options.keepalive && !options.proxy) {
		if (uri.protocol === 'https:') {
			if (!uri.port)
				uri.port = 443;
			uri.agent = KeepAliveHttps;
		} else
			uri.agent = KeepAlive;
	} else
		uri.agent = null;

	if (proxy)
		request_call(uri, options);
	else if (options.resolve)
		exports.resolve(opt.url, request_resolve, options);
	else
		request_call(uri, options);
}

exports.request = function(opt, callback) {

	if (callback)
		opt.callback = callback;

	if (opt.callback)
		_request(opt);
	else
		return new Promise((resolve, reject) => _request(opt, (err, res) => err ? reject(err) : resolve(res)));

};

function request_resolve(err, uri, options, origin) {
	if (!err) {
		options.uri.host = uri.host;
		options.origin = origin;
	}
	request_call(options.uri, options);
}

function ProxyAgent(options) {
	var self = this;
	self.options = options;
	self.maxSockets = F.Http.Agent.defaultMaxSockets;
	self.requests = [];
}

const PAP = ProxyAgent.prototype;

PAP.createConnection = function(pending) {
	var self = this;
	self.createSocket(pending, function(socket) {
		pending.request.onSocket(socket);
	});
};

PAP.createSocket = function(options, callback) {

	var self = this;
	var proxy = self.options.proxy;
	var uri = self.options.uri;

	PROXYOPTIONS.host = proxy.hostname;
	PROXYOPTIONS.port = proxy.port;
	PROXYOPTIONS.path = PROXYOPTIONS.headers.host = uri.hostname + ':' + (uri.port || '443');

	if (proxy._auth)
		PROXYOPTIONS.headers['Proxy-Authorization'] = proxy._auth;

	var req = self.request(PROXYOPTIONS);
	req.setTimeout(10000);
	req.on('response', proxyagent_response);
	req.on('connect', function(res, socket) {

		if (res.statusCode === 200) {
			socket.$req = req;
			callback(socket);
		} else {
			var err = new Error('Proxy could not be established (maybe a problem in auth), code: ' + res.statusCode);
			err.code = 'ECONNRESET';
			req.destroy && req.destroy();
			req = null;
			self.requests = null;
			self.options = null;
		}

	});

	req.on('error', function(err) {
		var e = new Error('Request Proxy "proxy {0} --> target {1}": {2}'.format(PROXYOPTIONS.host + ':' + proxy.port, PROXYOPTIONS.path, err.toString()));
		e.code = err.code;
		req.destroy && req.destroy();
		req = null;
		self.requests = null;
		self.options = null;
	});

	req.end();
};

function proxyagent_response(res) {
	res.upgrade = true;
}

PAP.addRequest = function(req, options) {
	this.createConnection({ host: options.host, port: options.port, request: req });
};

function createSecureSocket(options, callback) {
	var self = this;
	PAP.createSocket.call(self, options, function(socket) {
		PROXYTLS.servername = self.options.uri.hostname;
		PROXYTLS.headers = self.options.uri.headers;
		PROXYTLS.socket = socket;
		var tls = F.Tls.connect(0, PROXYTLS);
		callback(tls);
	});
}

function request_call(uri, options) {

	var opt;

	if (options.proxy && !options.proxy.tls) {
		opt = PROXYOPTIONSHTTP;
		opt.port = options.proxy.port;
		opt.host = options.proxy.hostname;
		opt.path = uri.href;
		opt.headers = uri.headers;
		opt.method = uri.method;
		opt.headers.host = uri.host;
		if (options.proxy._auth)
			opt.headers['Proxy-Authorization'] = options.proxy._auth;
	} else
		opt = uri;

	var connection = uri.protocol === 'https:' ? F.Https : F.Http;
	var req = opt.method === 'GET' ? connection.get(opt, request_response) : connection.request(opt, request_response);

	req.$options = options;
	req.$uri = uri;

	if (!options.callback) {
		req.on('error', NOOP);
		return;
	}

	req.on('error', request_process_error);

	if (options.timeoutid) {
		clearTimeout(options.timeoutid);
		options.timeoutid = null;
	}

	if (options.timeout)
		options.timeoutid = setTimeout(request_process_timeout, options.timeout, req);

	req.on('response', request_assign_res);

	if (options.upload) {
		options.first = true;
		options.files.wait(function(file, next) {
			request_writefile(req, options, file, next);
		}, function() {

			if (options.iserror)
				return;

			if (options.body) {
				for (var key in options.body) {
					var value = options.body[key];
					if (value != null) {
						try {
							req.write((options.first ? '' : NEWLINE) + '--' + options.boundary + NEWLINE + 'Content-Disposition: form-data; name="' + key + '"' + NEWLINE + NEWLINE + value);
						} catch (e) {
							request_process_error.apply(req, e);
							break;
						}
						if (options.first)
							options.first = false;
					}
				}
			}

			req.end(NEWLINE + '--' + options.boundary + '--');
		});
	} else {
		if (options.opt.compress) {
			F.Zlib[options.opt.compress](options.body, (err, buffer) => req.end(buffer));
		} else
			req.end(options.body);
	}
}

function request_process_error(err) {
	var options = this.$options;
	options.iserror = true;
	if (options.callback && !options.done) {
		if (options.timeoutid) {
			clearTimeout(options.timeoutid);
			options.timeoutid = null;
		}
		options.canceled = true;
		options.response.status = 0;
		options.response.host = this.$uri.host;
		options.callback(err, options.response);
		options.callback = null;
	}
}

function request_process_timeout(req) {
	var options = req.$options;
	options.iserror = true;
	if (options.callback) {
		if (options.timeoutid) {
			clearTimeout(options.timeoutid);
			options.timeoutid = null;
		}
		req.socket.destroy();
		req.socket.end();
		req.destroy();
		options.response.status = 408;
		options.response.host = req.$uri.host;
		options.canceled = true;
		options.callback(exports.httpstatus(408), options.response);
		options.callback = null;
	}
}

function request_process_ok() {
	var options = this.req.$options;
	if (options.timeoutid) {
		clearTimeout(options.timeoutid);
		options.timeoutid = null;
	}
}

function request_assign_res(response) {
	response.req = this;
}

function request_writefile(req, options, file, next) {

	if (options.iserror) {
		next();
		return;
	}

	var filedata = file.buffer || file.url;
	var isbuffer = filedata instanceof Buffer;
	var isurl = isbuffer ? false : typeof(filedata) === 'string' && filedata;

	var filename = (isbuffer || isurl ? file.filename : exports.getName(file.filename));

	req.write((options.first ? '' : NEWLINE) + '--' + options.boundary + NEWLINE + 'Content-Disposition: form-data; name="' + file.name + '"; filename="' + filename + '"' + NEWLINE + 'Content-Type: ' + exports.getContentType(exports.getExtension(filename)) + NEWLINE + NEWLINE);

	if (options.first)
		options.first = false;

	if (isbuffer) {
		try {
			req.write(filedata);
		} catch (e) {
			request_process_error.apply(req, e);
		}
		next();
	} else if (isurl) {
		// Download
		var opt = {};
		opt.method = 'GET';
		opt.custom = true;
		opt.url = filedata;
		opt.callback = function(err, response) {
			if (response && response.stream) {
				response.stream.on('close', next);
				response.stream.pipe(req, STREAMPIPE);
			} else {
				err && request_process_error.apply(req, err);
				next();
			}
		};
		exports.request(opt);
	} else {
		F.stats.performance.open++;
		var stream = F.Fs.createReadStream(file.path || file.filename);
		stream.once('close', next);
		stream.pipe(req, STREAMPIPE);
	}
}

function request_response(res) {

	var options = this.$options;
	var uri = this.$uri;

	res._buffer = null;
	res._bufferlength = 0;

	// We have redirect
	if (res.statusCode === 301 || res.statusCode === 302) {

		if (options.noredirect) {
			options.timeoutid && clearTimeout(options.timeoutid);
			options.canceled = true;
			if (options.callback) {
				options.response.origin = options.origin;
				options.response.status = res.statusCode;
				options.response.headers = res.headers;
				if (options.custom) {
					options.response.stream = res;
					options.callback(null, options.response);
				} else {
					options.response.host = uri.host;
					options.response.headers = res.headers;
					options.callback(null, options.response);
				}
				options.callback = null;
			}

			res.req.removeAllListeners();
			res.removeAllListeners();
			res.req = null;
			res = null;
			return;
		}

		if (options.redirect > (options.redirects || 3)) {

			options.timeoutid && clearTimeout(options.timeoutid);
			options.canceled = true;
			options.response.origin = options.origin;
			options.response.headers = res.headers;

			if (options.callback) {
				if (options.custom) {
					options.response.status = res.statusCode;
					options.response.stream = res;
					options.callback('Too many redirects', options.response);
				} else {
					options.response.status = 0;
					options.response.host = uri.host;
					options.callback('Too many redirects', options.response);
				}
				options.callback = null;
			}

			res.req.removeAllListeners();
			res.removeAllListeners();
			res.req = null;
			res = null;
			return;
		}

		options.redirect++;

		var loc = res.headers.location;
		var proto = loc.substring(0, 6);

		if (proto !== 'http:/' && proto !== 'https:')
			loc = uri.protocol + '//' + uri.hostname + (uri.port && !SKI_PPORTS[uri.port] ? (':' + uri.port) : '') + loc;

		var tmp = F.Url.parse(loc);
		tmp.headers = uri.headers;

		// Transfers cookies
		if (!options.nocookies) {
			var cookies = res.headers['set-cookie'];
			if (cookies) {

				if (options.$totalinit.cook && !options.$totalinit.cookies)
					options.$totalinit.cookies = {};

				if (!options.cookies)
					options.cookies = {};

				for (var i = 0; i < cookies.length; i++) {
					var cookie = cookies[i];
					var index = cookie.indexOf(';');
					if (index !== -1){
						cookie = cookie.substring(0, index);
						index = cookie.indexOf('=');
						if (index !== -1) {
							var key = decodeURIComponent(cookie.substring(0, index));
							options.cookies[key] = decodeURIComponent(cookie.substring(index + 1));
							if (options.$totalinit.cookies)
								options.$totalinit.cookies[key] = options.cookies[key];
						}
					}
				}

				var builder = '';
				for (var m in options.cookies)
					builder += (builder ? '; ' : '') + encodeURIComponent(m) + '=' + encodeURIComponent(options.cookies[m]);

				if (tmp.headers.cookie)
					tmp.headers.cookie = builder;
				else
					tmp.headers.Cookie = builder;
			}
		}

		// tmp.agent = false;
		tmp.method = uri.method;

		res.req.socket.destroy();
		res.req.socket.end();
		res.req.destroy();
		res.removeAllListeners();
		res.req.removeAllListeners();
		res.req = null;

		if (options.proxy && tmp.protocol === 'https:') {
			// TLS?
			options.proxy.tls = true;
			options.uri = tmp;
			options.uri.agent = new ProxyAgent(options);
			options.uri.agent.request = F.Http.request;
			options.uri.agent.createSocket = createSecureSocket;
			options.uri.agent.defaultPort = 443;
		}

		if (!options.resolve) {
			res.removeAllListeners();
			res = null;
			return request_call(tmp, options);
		}

		exports.resolve(tmp, function(err, u, param, origin) {
			if (!err) {
				tmp.host = u.host;
				options.origin = origin;
			}
			res.removeAllListeners();
			res = null;
			request_call(tmp, options);
		});

		return;
	}

	options.length = +res.headers['content-length'] || 0;

	// Shared cookies
	if (options.$totalinit.cook) {

		if (!options.$totalinit.cookies)
			options.$totalinit.cookies = {};

		var arr = (res.headers['set-cookie'] || '');

		// Only the one value
		if (arr && !(arr instanceof Array))
			arr = [arr];

		if (arr instanceof Array) {
			for (var i = 0; i < arr.length; i++) {
				var line = arr[i];
				var end = line.indexOf(';');
				if (end === -1)
					end = line.length;
				line = line.substring(0, end);
				var index = line.indexOf('=');
				if (index !== -1)
					options.$totalinit.cookies[line.substring(0, index)] = decodeURIComponent(line.substring(index + 1));
			}
		}
	}

	if (res.statusCode === 204) {
		options.done = true;
		if (options.custom) {
			options.timeoutid && clearTimeout(options.timeoutid);
			options.response.origin = options.origin;
			options.response.status = res.statusCode;
			options.response.headers = res.headers;
			options.response.stream = res;
			options.callback(null, options.response);
			options.callback = null;
		} else
			request_process_end.call(res);
		return;
	}

	options.timeoutid && res.once('data', request_process_ok);

	var encoding = res.headers['content-encoding'] || '';
	if (encoding)
		encoding = encoding.split(',')[0];

	if (options.custom) {
		options.timeoutid && clearTimeout(options.timeoutid);
		options.response.origin = options.origin;
		options.response.status = res.statusCode;
		options.response.headers = res.headers;
		options.response.stream = res;
		options.callback && options.callback(null, options.response);
		options.callback = null;
	} else {
		if (COMPRESS[encoding]) {
			var zlib = encoding === 'gzip' ? F.Zlib.createGunzip() : F.Zlib.createInflate();
			zlib._buffer = res.buffer;
			zlib.headers = res.headers;
			zlib.statusCode = res.statusCode;
			zlib.res = res;
			zlib.on('data', request_process_data);
			zlib.on('end', request_process_end);
			res.pipe(zlib);
		} else {
			res.on('data', request_process_data);
			res.on('end', request_process_end);
		}
		res.resume();
	}
}

function request_process_data(chunk) {
	var self = this;
	// Is Zlib
	if (!self.req)
		self = self.res;
	var options = self.req.$options;
	if (options.canceled || (options.limit && self._bufferlength > options.limit))
		return;
	if (self._buffer) {
		CONCAT[0] = self._buffer;
		CONCAT[1] = chunk;
		self._buffer = Buffer.concat(CONCAT);
	} else
		self._buffer = chunk;
	self._bufferlength += chunk.length;
	options.ondata && options.ondata(chunk, options.length ? (self._bufferlength / options.length) * 100 : 0);
	options.onprogress && options.onprogress(options.length ? (self._bufferlength / options.length) * 100 : 0);
}

function request_process_end() {

	var res = this;

	// Is Zlib
	if (!res.req)
		res = res.res;

	var self = res;
	var options = self.req.$options;
	var uri = self.req.$uri;
	var data;

	options.socket && options.uri.agent.destroy();
	options.timeoutid && clearTimeout(options.timeoutid);

	if (options.canceled)
		return;

	var ct = self.headers['content-type'];

	if (!ct || REG_TEXTAPPLICATION.test(ct)) {
		data = self._buffer ? options.encoding === 'binary' ? self._buffer : self._buffer.toString(options.encoding) : '';
		if (options.opt.encrypt && typeof(data) === 'string')
			data = exports.decrypt_data(data, options.opt.encrypt);
	} else
		data = self._buffer;

	options.canceled = true;
	self._buffer = undefined;

	if (options.callback) {
		options.response.origin = options.origin;
		options.response.headers = self.headers;
		options.response.body = data;
		options.response.status = self.statusCode;
		options.response.host = uri.host || uri.socketPath;
		options.response.cookies = options.cookies;
		options.callback(null, options.response);
		options.callback = null;
	}

	if (res.statusCode !== 204) {
		res.req && res.req.removeAllListeners();
		res.removeAllListeners();
	}
}

exports.btoa = function(str) {
	return (str instanceof Buffer) ? str.toString('base64') : Buffer.from(str.toString(), 'utf8').toString('base64');
};

exports.atob = function(str) {
	return Buffer.from(str, 'base64').toString('utf8');
};

exports.httpstatus = function(code, addcode = true) {
	return (addcode ? code + ': ' : '') + F.Http.STATUS_CODES[code];
};

exports.extend = function(target, source, rewrite = true) {

	if (!target || !source)
		return target;

	for (let key in source) {
		if (rewrite || target[key] === undefined)
			target[key] = exports.clone(source[key]);
	}

	return target;
};

exports.clone = function(obj, skip, nofunctions) {

	if (!obj)
		return obj;

	var type = typeof(obj);
	if (type !== 'object' || obj instanceof Date || obj instanceof Error)
		return obj;

	var length;
	var o;

	if (obj instanceof Array) {

		length = obj.length;
		o = new Array(length);

		for (let i = 0; i < length; i++) {
			type = typeof(obj[i]);
			if (type !== 'object' || obj[i] instanceof Date || obj[i] instanceof Error) {
				if (nofunctions && type === 'function')
					continue;
				o[i] = obj[i];
				continue;
			}
			o[i] = exports.clone(obj[i], skip, nofunctions);
		}

		return o;
	}

	o = {};

	for (let m in obj) {

		if (skip && skip[m])
			continue;

		let val = obj[m];
		if (val instanceof Buffer) {
			let copy = Buffer.alloc(val.length);
			val.copy(copy);
			o[m] = copy;
			continue;
		}

		type = typeof(val);
		if (type !== 'object' || val instanceof Date || val instanceof Error) {
			if (nofunctions && type === 'function')
				continue;
			o[m] = val;
			continue;
		}

		o[m] = exports.clone(obj[m], skip, nofunctions);
	}

	return o;
};

exports.copy = function(source, target, all = true) {

	if (!target)
		return exports.extend({}, source, true);

	if (!target || !source)
		return target;

	for (var key in source) {
		if (all || target[key] !== undefined)
			target[key] = exports.clone(source[key]);
	}

	return target;
};

/**
 * Streamer method
 * @param {String/Buffer} beg
 * @param {String/Buffer} end
 * @param {Function(value, index)} callback
 */
exports.streamer = function(beg, end, callback, skip, stream, raw) {

	if (typeof(end) === 'function') {
		stream = skip;
		skip = callback;
		callback = end;
		end = undefined;
	}

	if (typeof(skip) === 'object') {
		stream = skip;
		skip = 0;
	}

	var indexer = 0;
	var buffer = Buffer.alloc(0);
	var canceled = false;
	var fn;

	if (skip === undefined)
		skip = 0;

	if (!(beg instanceof Buffer))
		beg = Buffer.from(beg, 'utf8');

	if (end && !(end instanceof Buffer))
		end = Buffer.from(end, 'utf8');

	if (!end) {
		var length = beg.length;
		fn = function(chunk) {

			if (!chunk || canceled)
				return;

			CONCAT[0] = buffer;
			CONCAT[1] = chunk;

			let f = 0;

			if (buffer.length) {
				f = buffer.length - beg.length;
				if (f < 0)
					f = 0;
			}

			buffer = Buffer.concat(CONCAT);

			let index = buffer.indexOf(beg, f);
			if (index === -1)
				return;

			while (index !== -1) {

				if (skip)
					skip--;
				else {
					if (callback(raw ? buffer.slice(0, index + length) : buffer.toString('utf8', 0, index + length), indexer++) === false)
						canceled = true;
				}

				if (canceled)
					return;

				buffer = buffer.slice(index + length);
				index = buffer.indexOf(beg);
				if (index === -1)
					return;
			}
		};

		stream && stream.on('end', () => fn(beg));
		return fn;
	}

	var blength = beg.length;
	var elength = end.length;
	var bi = -1;
	var ei = -1;
	var is = false;

	fn = function(chunk) {

		if (!chunk || canceled)
			return;

		CONCAT[0] = buffer;
		CONCAT[1] = chunk;
		buffer = Buffer.concat(CONCAT);

		if (!is) {
			let f = CONCAT[0].length - beg.length;
			if (f < 0)
				f = 0;
			bi = buffer.indexOf(beg, f);
			if (bi === -1)
				return;
			is = true;
		}

		if (is) {
			ei = buffer.indexOf(end, bi + blength);
			if (ei === -1)
				return;
		}

		while (bi !== -1) {

			if (skip)
				skip--;
			else {
				if (callback(raw ? buffer.slice(bi, ei + elength) : buffer.toString('utf8', bi, ei + elength), indexer++) === false)
					canceled = true;
			}

			if (canceled)
				return;

			buffer = buffer.slice(ei + elength);
			is = false;
			bi = buffer.indexOf(beg);
			if (bi === -1)
				return;
			is = true;
			ei = buffer.indexOf(end, bi + blength);
			if (ei === -1)
				return;
		}
	};

	stream && stream.on('end', () => fn(end));
	return fn;
};

exports.streamer2 = function(beg, end, callback, skip, stream) {
	return exports.streamer(beg, end, callback, skip, stream, true);
};

exports.parseInt = function(obj, def) {
	if (obj == null || obj === '')
		return def === undefined ? 0 : def;
	let type = typeof(obj);
	return type === 'number' ? obj : (type !== 'string' ? obj.toString() : obj).parseInt(def);
};

exports.parseBoolean = function(obj, def) {
	if (obj == null)
		return def === undefined ? false : def;
	var type = typeof(obj);
	return type === 'boolean' ? obj : type === 'number' ? obj > 0 : (type !== 'string' ? obj.toString() : obj).parseBoolean(def);
};

exports.parseFloat = function(obj, def) {
	if (obj == null || obj === '')
		return def === undefined ? 0 : def;
	var type = typeof(obj);
	return type === 'number' ? obj : (type !== 'string' ? obj.toString() : obj).parseFloat(def);
};

exports.isDate = function(obj) {
	return obj instanceof Date && !isNaN(obj.getTime()) ? true : false;
};

exports.getContentType = function(ext) {
	if (!ext)
		return TYPE_OCTET;
	if (ext[0] === '.')
		ext = ext.substring(1);
	return CONTENTTYPES[ext] || TYPE_OCTET;
};

exports.contentTypes = CONTENTTYPES;

exports.getExtensionFromContentType = function(value) {
	for (let key in CONTENTTYPES) {
		if (CONTENTTYPES[key] === value)
			return key;
	}
};

exports.getExtension = function(filename, raw = false) {
	var end = filename.length;
	for (var i = filename.length - 1; i > 0; i--) {
		var c = filename[i];
		if (c === ' ' || c === '?')
			end = i;
		else if (c === '.') {
			c = filename.substring(i + 1, end);
			return raw ? c : c.toLowerCase();
		}
		else if (c === '/' || c === '\\')
			return '';
	}
	return '';
};

exports.getName = function(path) {
	var l = path.length - 1;
	var c = path[l];
	if (c === '/' || c === '\\')
		path = path.substring(0, l);
	var index = path.lastIndexOf('/');
	if (index !== -1)
		return path.substring(index + 1);
	index = path.lastIndexOf('\\');
	return index === -1 ? path : path.substring(index + 1);
};

exports.normalize = function(path) {
	if (path[0] !== '/')
		path = '/' + path;
	if (path[path.length - 1] !== '/')
		path += '/';
	return path;
};

exports.link = function() {
	var builder = '';
	for (var i = 0; i < arguments.length; i++) {

		var url = arguments[i];
		var between = '';

		if (builder) {
			var c = builder[builder.length - 1];
			if (c === '/') {
				if (url[0] === '/')
					url = url.substring(1);
			} else {
				if (url[0] !== '/')
					between = '/';
			}
		} else
			between = '';

		builder += between + url;
	}
	return builder;
};

exports.$normalize = function(path) {
	return F.isWindows ? path.replace(REG_PATH, '/') : path;
};

exports.convert62 = function(number) {

	var rixit; // like 'digit', only in some non-decimal radix
	var residual = Math.floor(number);
	var max = RANDOM_TEXT.length;
	var result = '';

	while (true) {
		rixit = residual % max;
		result = RANDOM_TEXT[rixit] + result;
		residual = Math.floor(residual / max);
		if (residual == 0)
			break;
	}

	return result;
};

exports.from62 = function(rixits) {
	var result = 0;
	var max = RANDOM_TEXT.length;
	rixits = rixits.split('');
	for (var i = 0; i < rixits.length; i++)
		result = (result * max) + RANDOM_TEXT.indexOf(rixits[i]);
	return result;
};

exports.random_text = function(max) {
	var builder = '';
	for (var i = 0; i < max; i++) {
		var index = Math.floor(Math.random() * RANDOM_TEXT.length);
		builder += RANDOM_TEXT[index];
	}
	return builder;
};

exports.random_string = function(max) {
	var builder = '';
	for (var i = 0; i < max; i++) {
		var index = Math.floor(Math.random() * RANDOM_STRING.length);
		builder += RANDOM_STRING[index];
	}
	return builder;
};

exports.random_number = function(max) {
	var builder = '';
	for (var i = 0; i < max; i++) {
		var index = Math.floor(Math.random() * RANDOM_NUMBER.length);
		if (!i && !index)
			index++;
		builder += RANDOM_NUMBER[index];
	}
	return builder;
};

exports.random = function(max, min) {
	max = (max || 100000);
	min = (min || 0);
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

function rnd() {
	return Math.floor(Math.random() * 65536).toString(36);
}

function rnd2() {
	return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function rnd3() {
	return arguments[Math.floor(Math.random() * arguments.length)];
}

exports.guid = function(max) {

	if (!max) {
		var ticks = Date.now();
		var low = ticks.toString(16);
		var sec = (ticks / 60000 >> 0).toString(16);
		return low.substring(0, 8) + '-' + (low.length < 8 ? low.substring(8).padLeft(4, '0') : low.substring(4, 8)) + '-' + rnd3(1, 2, 3, 4, 5) + sec.substring(1, 4) + '-' + rnd3(0, 8, 9, 'a', 'b') + sec.substring(4, 7) + '-' + rnd2() + rnd2() + rnd2();
	}

	max = max || 40;
	var str = '';
	for (var i = 0; i < (max / 3) + 1; i++)
		str += rnd();
	return str.substring(0, max);
};

exports.parseXML = function(xml, replace) {
	return xml.parseXML(replace);
};

function jsonparser(key, value) {
	return typeof(value) === 'string' && value.isJSONDate() ? new Date(value) : value;
}

exports.distance = function(lat1, lon1, lat2, lon2) {
	var R = 6371;
	var dLat = (lat2 - lat1).toRad();
	var dLon = (lon2 - lon1).toRad();
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return (R * c).floor(3);
};

function ls(path, callback, advanced, filter) {
	var filelist = new FileList();
	var tmp;

	filelist.advanced = advanced;
	filelist.onComplete = callback;

	if (typeof(filter) === 'string') {
		tmp = filter.toLowerCase();
		filelist.onFilter = function(filename, is) {
			return is ? true : filename.toLowerCase().indexOf(tmp) !== -1;
		};
	} else if (filter && filter.test) {
		// regexp
		tmp = filter;
		filelist.onFilter = function(filename, is) {
			return is ? true : tmp.test(filename);
		};
	} else
		filelist.onFilter = filter || null;

	filelist.walk(path);
}

exports.ls = function(path, callback, filter) {
	if (callback)
		ls(path, callback, false, filter);
	else
		return new Promise(resolve => ls(path, (files, dirs) => resolve({ directories: dirs, files: files }), false, filter));
};

exports.ls2 = function(path, callback, filter) {
	if (callback)
		ls(path, callback, true, filter);
	else
		return new Promise(resolve => ls(path, (files, dirs) => resolve({ directories: dirs, files: files }), true, filter));
};

DP.setTimeZone = function(timezone) {

	var dt = new Date(this.toLocaleString('en-US', { timeZone: timezone }));
	var offset = dt + '';
	var index = offset.indexOf('GMT');
	var op = offset.substring(index + 3, index + 4);
	var count = offset.substring(index + 4, index + 9);
	var h = +count.substring(0, 2);
	var m = +count.substring(2);

	if (op === '+') {
		h && dt.setHours(dt.getHours() + h);
		m && dt.setMinutes(dt.getMinutes() + m);
	} else {
		h && dt.setHours(dt.getHours() - h);
		m && dt.setMinutes(dt.getMinutes() - m);
	}

	return dt;
};

DP.diff = function(date, type) {

	if (arguments.length === 1) {
		type = date;
		date = Date.now();
	} else {
		var to = typeof(date);
		if (to === 'string')
			date = Date.parse(date);
		else if (exports.isDate(date))
			date = date.getTime();
	}

	var r = this.getTime() - date;

	switch (type) {
		case 's':
		case 'ss':
		case 'second':
		case 'seconds':
			return Math.ceil(r / 1000);
		case 'm':
		case 'mm':
		case 'minute':
		case 'minutes':
			return Math.ceil((r / 1000) / 60);
		case 'h':
		case 'hh':
		case 'hour':
		case 'hours':
			return Math.ceil(((r / 1000) / 60) / 60);
		case 'd':
		case 'dd':
		case 'day':
		case 'days':
			return Math.ceil((((r / 1000) / 60) / 60) / 24);
		case 'M':
		case 'MM':
		case 'month':
		case 'months':
			// avg: 28 days per month
			return Math.ceil((((r / 1000) / 60) / 60) / (24 * 28));

		case 'y':
		case 'yyyy':
		case 'year':
		case 'years':
			// avg: 28 days per month
			return Math.ceil((((r / 1000) / 60) / 60) / (24 * 28 * 12));
	}

	return NaN;
};

DP.add = function(type, value) {

	var self = this;

	if (type.constructor === Number)
		return new Date(self.getTime() + (type - type % 1));

	if (value === undefined) {
		var arr = type.split(' ');
		type = arr[1];
		value = exports.parseInt(arr[0]);
	}

	var dt = new Date(self.getTime());

	switch(type) {
		case 's':
		case 'ss':
		case 'sec':
		case 'second':
		case 'seconds':
			dt.setUTCSeconds(dt.getUTCSeconds() + value);
			return dt;
		case 'm':
		case 'mm':
		case 'minute':
		case 'min':
		case 'minutes':
			dt.setUTCMinutes(dt.getUTCMinutes() + value);
			return dt;
		case 'h':
		case 'hh':
		case 'hour':
		case 'hours':
			dt.setUTCHours(dt.getUTCHours() + value);
			return dt;
		case 'd':
		case 'dd':
		case 'day':
		case 'days':
			dt.setUTCDate(dt.getUTCDate() + value);
			return dt;
		case 'w':
		case 'ww':
		case 'week':
		case 'weeks':
			dt.setUTCDate(dt.getUTCDate() + (value * 7));
			return dt;
		case 'M':
		case 'MM':
		case 'month':
		case 'months':
			dt.setUTCMonth(dt.getUTCMonth() + value);
			return dt;
		case 'y':
		case 'yyyy':
		case 'year':
		case 'years':
			dt.setUTCFullYear(dt.getUTCFullYear() + value);
			return dt;
	}
	return dt;
};

DP.extend = function(date) {
	var dt = new Date(this);
	var match = date.match(REG_DATE);

	if (!match)
		return dt;

	for (var i = 0, length = match.length; i < length; i++) {
		var m = match[i];
		var arr, tmp;

		if (m.indexOf(':') !== -1) {

			arr = m.split(':');
			tmp = +arr[0];
			tmp >= 0 && dt.setUTCHours(tmp);

			if (arr[1]) {
				tmp = +arr[1];
				tmp >= 0 && dt.setUTCMinutes(tmp);
			}

			if (arr[2]) {
				tmp = +arr[2];
				tmp >= 0 && dt.setUTCSeconds(tmp);
			}

			continue;
		}

		if (m.indexOf('-') !== -1) {
			arr = m.split('-');

			tmp = +arr[0];
			tmp && dt.setUTCFullYear(tmp);

			if (arr[1]) {
				tmp = +arr[1];
				tmp >= 0 && dt.setUTCMonth(tmp - 1);
			}

			if (arr[2]) {
				tmp = +arr[2];
				tmp >= 0 && dt.setUTCDate(tmp);
			}

			continue;
		}

		if (m.indexOf('.') !== -1) {
			arr = m.split('.');

			if (arr[2]) {
				tmp = +arr[2];
				!isNaN(tmp) && dt.setUTCFullYear(tmp);
			}

			if (arr[1]) {
				tmp = +arr[1];
				!isNaN(tmp) && dt.setUTCMonth(tmp - 1);
			}

			tmp = +arr[0];
			!isNaN(tmp) && dt.setUTCDate(tmp);

			continue;
		}
	}

	return dt;
};

DP.format = function(format, resource) {

	if (!format)
		return this.getUTCFullYear() + '-' + (this.getUTCMonth() + 1).toString().padLeft(2, '0') + '-' + this.getUTCDate().toString().padLeft(2, '0') + 'T' + this.getUTCHours().toString().padLeft(2, '0') + ':' + this.getUTCMinutes().toString().padLeft(2, '0') + ':' + this.getUTCSeconds().toString().padLeft(2, '0') + '.' + this.getUTCMilliseconds().toString().padLeft(3, '0') + 'Z';

	if (F.temporary.datetime[format])
		return F.temporary.datetime[format](this, resource);

	var key = format;
	var half = false;

	if (format && format[0] === '!') {
		half = true;
		format = format.substring(1);
	}

	var beg = '\'+';
	var end = '+\'';
	var before = [];

	var ismm = false;
	var isdd = false;
	var isww = false;

	format = format.replace(REG_DATEFORMAT, function(key) {
		switch (key) {
			case 'yyyy':
			case 'YYYY':
				return beg + 'd.getFullYear()' + end;
			case 'yy':
			case 'YY':
				return beg + 'd.getFullYear().toString().substring(2)' + end;
			case 'MMM':
				ismm = true;
				return beg + '(F.resource(resource, mm) || mm).substring(0, 3)' + end;
			case 'MMMM':
				ismm = true;
				return beg + '(F.resource(resource, mm) || mm)' + end;
			case 'MM':
				return beg + '(d.getMonth() + 1).toString().padLeft(2, \'0\')' + end;
			case 'M':
				return beg + '(d.getMonth() + 1)' + end;
			case 'ddd':
			case 'DDD':
				isdd = true;
				return beg + '(F.resource(resource, dd) || dd).substring(0, 2).toUpperCase()' + end;
			case 'dddd':
			case 'DDDD':
				isdd = true;
				return beg + '(F.resource(resource, dd) || dd)' + end;
			case 'dd':
			case 'DD':
				return beg + 'd.getDate().toString().padLeft(2, \'0\')' + end;
			case 'd':
			case 'D':
				return beg + 'd.getDate()' + end;
			case 'HH':
			case 'hh':
				return beg + (half ? 'F.TUtils.pmam(d.getHours()).toString().padLeft(2, \'0\')' : 'd.getHours().toString().padLeft(2, \'0\')') + end;
			case 'H':
			case 'h':
				return beg + (half ? 'F.TUtils.pmam(d.getHours())' : 'd.getHours()') + end;
			case 'mm':
				return beg + 'd.getMinutes().toString().padLeft(2, \'0\')' + end;
			case 'm':
				return beg + 'd.getMinutes()' + end;
			case 'ss':
				return beg + 'd.getSeconds().toString().padLeft(2, \'0\')' + end;
			case 's':
				return beg + 'd.getSeconds()' + end;
			case 'w':
			case 'ww':
				isww = true;
				return beg + (key === 'ww' ? 'ww.toString().padLeft(2, \'0\')' : 'ww') + end;
			case 'a':
				var b = "'PM':'AM'";
				return beg + '(d.getHours() >= 12 ? ' + b + ')' + end;
		}
	});

	ismm && before.push('var mm = F.TUtils.MONTHS[d.getMonth()];');
	isdd && before.push('var dd = F.TUtils.DAYS[d.getDay()];');
	isww && before.push('var ww = new Date(+d);ww.setHours(0,0,0,0);ww.setDate(ww.getDate()+3-(ww.getDay()+6)%7);var ww1=new Date(ww.getFullYear(),0,4);ww=1+Math.round(((ww.getTime()-ww1.getTime())/86400000-3+(ww1.getDay()+6)%7)/7);');

	F.temporary.datetime[key] = new Function('d', 'resource', before.join('\n') + 'return \'' + format + '\';');
	return F.temporary.datetime[key](this, resource);
};

exports.pmam = function(value) {
	return value >= 12 ? value - 12 : value;
};

DP.toUTC = function(ticks) {
	var dt = this.getTime() + this.getTimezoneOffset() * 60000;
	return ticks ? dt : new Date(dt);
};

// +v2.2.0 parses JSON dates as dates and this is the fallback for backward compatibility
DP.parseDate = function() {
	return this;
};

SP.toName = function() {

	var a = '';
	var p = 0;
	var space = false;
	var val = this;

	for (var i = 0; i < val.length; i++) {
		var c = val.charCodeAt(i);
		if ((c < 65 || (c > 90 && c < 97) || (c > 122 && c < 128)) && c !== 32)
			continue;

		if (a && p !== 32) {

			if (c === 32) {
				p = c;
				space = true;
				continue;
			}

			if (space) {
				a += ' ';
				space = false;
			}

			a += val[i];

		} else {

			if (space) {
				a += ' ';
				space = false;
			}

			a += val[i].toUpperCase();
		}

		p = c;
	}

	return a;
};

SP.isJSONDate = function() {
	var l = this.length - 1;
	return l > 22 && l < 30 && this[l] === 'Z' && this[10] === 'T' && this[4] === '-' && this[13] === ':' && this[16] === ':';
};

SP.ROOT = function(noremap) {

	var str = this;

	str = str.replace(REG_NOREMAP, function() {
		noremap = true;
		return '';
	});

	if (!noremap && F.config.$root)
		str = str.replace(REG_REMAP, $urlremap).replace(REG_AJAX, $urlajax);

	return str.replace(REG_ROOT, $urlmaker);
};

function $urlremap(text) {
	var plus = text[0] == ' ' ? 1 : 0;
	var pos = (text[plus] === 'h' ? 6 : 5) + plus;
	var url = text.substring(pos, text.length - 1);
	return REG_URLEXT.test(url) ? text : ((text[plus] === 'h' ? 'href' : 'src') + '="' + F.config.$root + (text[pos] === '/' ? text.substring(pos + 1) : text));
}

function $urlajax(text) {
	return text.substring(0, text.length - 1) + F.config.$root;
}

function $urlmaker(text) {
	var c = text[4];
	return F.config.$root ? F.config.$root : (c || '');
}

if (!SP.trim) {
	SP.trim = function() {
		return this.replace(REG_TRIM, '');
	};
}

SP.parseHTML = function(trim) {
	return require('./htmlparser').parseHTML(this, trim);
};

SP.hash = function(type, salt) {
	let str = salt ? (this + salt) : this;
	switch (type) {
		case 'md5':
			return str.md5();
		case 'sha1':
			return str.sha1();
		case 'sha256':
			return str.sha256();
		case 'sha512':
			return str.sha512();
		case 'crc32':
			return str.crc32();
		case 'crc32unsigned':
			return str.crc32(true);
		default:
			var val = string_hash(str);
			return type === true ? val >>> 0 : val;
	}
};

SP.sign = function(key, check) {

	if (check) {
		let index = this.lastIndexOf('-');
		if (index === -1)
			return null;
		var id = this.substring(0, index);
		return id.sign(key) === this ? id : null;
	}

	return this + '-' + (string_hash(this + (key || '')) >>> 0).toString(36);
};

SP.makeid = function() {
	return (string_hash(this) >>> 0).toString(36);
};

SP.crc32 = function(unsigned) {
	var crc = -1;
	for (var i = 0, length = this.length; i < length; i++)
		crc = (crc >>> 8) ^ CRC32TABLE[(crc ^ this.charCodeAt(i)) & 0xFF];
	var val = crc ^ (-1);
	return unsigned ? val >>> 0 : val;
};

function string_hash(s, convert) {
	var hash = 0;
	if (s.length === 0)
		return convert ? '' : hash;
	for (var i = 0, l = s.length; i < l; i++) {
		var char = s.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
	}
	return hash;
}

SP.parseComponent = function(tags) {

	var html = this;
	var beg = -1;
	var end = -1;
	var output = {};

	for (var key in tags) {

		var tagbeg = tags[key];
		var tagindex = tagbeg.indexOf(' ');

		if (tagindex === -1)
			tagindex = tagbeg.length - 1;

		var tagend = '</' + tagbeg.substring(1, tagindex) + '>';
		var tagbeg2 = '<' + tagend.substring(2);

		beg = html.indexOf(tagbeg);

		if (beg !== -1) {

			var count = 0;
			end = -1;

			for (var j = (beg + tagbeg.length); j < html.length; j++) {
				var a = html.substring(j, j + tagbeg2.length);
				if (a === tagbeg2) {
					count++;
				} else {
					if (html.substring(j, j + tagend.length) === tagend) {
						if (count) {
							count--;
						} else {
							end = j;
							break;
						}
					}
				}
			}

			if (end !== -1) {
				var tmp = html.substring(html.indexOf('>', beg) + 1, end);
				html = html.replace(html.substring(beg, end + tagend.length), '').trim();
				output[key] = tmp.replace(/^\n|\n$/, '');
			}

		}
	}

	return output;
};

SP.streamer = function(beg, end, callback, skip) {

	if (typeof(end) === 'function') {
		skip = callback;
		callback = end;
		end = undefined;
	}

	var indexer = 0;
	var canceled = false;
	var fn;
	var buffer = this;

	if (skip === undefined)
		skip = 0;

	if (!end) {

		var length = beg.length;
		if (!buffer || canceled)
			return;

		var f = 0;

		var index = buffer.indexOf(beg, f);
		if (index === -1)
			return;

		while (index !== -1) {

			if (skip)
				skip--;
			else {

				if (callback(buffer.substring(0, index + length), indexer++) === false)
					canceled = true;
			}

			if (canceled)
				return;

			buffer = buffer.slice(index + length);
			index = buffer.indexOf(beg);
			if (index === -1)
				return;
		}

		return fn;
	}

	var blength = beg.length;
	var elength = end.length;
	var bi = -1;
	var ei = -1;
	var is = false;

	if (!buffer || canceled)
		return;

	if (!is) {
		var f = 0;
		bi = buffer.indexOf(beg, f);
		if (bi === -1)
			return;
		is = true;
	}

	if (is) {
		ei = buffer.indexOf(end, bi + blength);
		if (ei === -1)
			return;
	}

	while (bi !== -1) {

		if (skip)
			skip--;
		else {
			if (callback(buffer.substring(bi, ei + elength), indexer++) === false)
				canceled = true;
		}

		if (canceled)
			return;

		buffer = buffer.slice(ei + elength);
		is = false;
		bi = buffer.indexOf(beg);
		if (bi === -1)
			return;
		is = true;
		ei = buffer.indexOf(end, bi + blength);
		if (ei === -1)
			return;
	}

};

SP.parseXML = function(replace) {

	var xml = this;
	var beg = -1;
	var end = 0;
	var tmp = 0;
	var current = [];
	var obj = {};
	var from = -1;

	while (true) {
		beg = xml.indexOf('<![CDATA[', beg);
		if (beg === -1)
			break;
		end = xml.indexOf(']]>', beg + 9);
		xml = xml.substring(0, beg) + xml.substring(beg + 9, end).trim().safehtml() + xml.substring(end + 3);
		beg += 9;
	}

	beg = -1;
	end = 0;

	while (true) {

		beg = xml.indexOf('<', beg + 1);
		if (beg === -1)
			break;

		end = xml.indexOf('>', beg + 1);
		if (end === -1)
			break;

		var el = xml.substring(beg, end + 1);
		var c = el[1];

		if (el.substring(0, 4) === '<!--') {
			beg = end + 3;
			continue;
		}

		if (c === '?' || c === '/') {

			var o = current.pop();

			if (from === -1 || o !== el.substring(2, el.length - 1))
				continue;

			var path = (current.length ? current.join('.') + '.' : '') + o;
			var value = xml.substring(from, beg).decode();

			if (replace)
				path = path.replace(REG_XMLKEY, '_');

			if (obj[path] === undefined)
				obj[path] = value;
			else if (obj[path] instanceof Array)
				obj[path].push(value);
			else
				obj[path] = [obj[path], value];

			from = -1;
			continue;
		}

		tmp = el.indexOf(' ');
		var hasAttributes = true;

		if (tmp === -1) {
			tmp = el.length - 1;
			hasAttributes = false;
		}

		from = beg + el.length;

		var isSingle = el[el.length - 2] === '/';
		var name = el.substring(1, tmp);

		if (!isSingle)
			current.push(name);

		if (!hasAttributes)
			continue;

		var match = el.match(REG_XML);
		if (!match)
			continue;

		var attr = {};
		var length = match.length;

		for (var i = 0; i < length; i++) {
			var index = match[i].indexOf('"');
			attr[match[i].substring(0, index - 1)] = match[i].substring(index + 1, match[i].length - 1).decode();
		}

		var k = current.join('.') + (isSingle ? '.' + name : '') + '[]';
		if (replace)
			k = k.replace(REG_XMLKEY, '_');
		obj[k] = attr;
	}

	return obj;
};

SP.parseJSON = function(date) {
	try {
		return JSON.parse(this, date ? jsonparser : undefined);
	} catch (e) {}
};

function parseQueryArgumentsDecode(val) {
	try {
		return decodeURIComponent(val);
	} catch (e) {
		return '';
	}
}

const QUERY_ALLOWED = { '45': 1, '95': 1, 46: 1, '91': 1, '93': 1 };

SP.parseEncoded = function() {

	var str = this + '&';
	var obj = {};
	var key = '';
	var val = '';
	var is = false;
	var decodev = false;
	var decodek = false;
	var count = 0;
	var pos = 0;

	for (var i = 0; i < str.length; i++) {
		var n = str.charCodeAt(i);

		if (n === 38) {

			if (key) {
				if (pos < i)
					val += str.substring(pos, i);

				if (decodev)
					val = parseQueryArgumentsDecode(val);

				if (decodek)
					key = parseQueryArgumentsDecode(key);

				if (obj[key])
					obj[key] += ',' + val;
				else
					obj[key] = val;
			}

			if (key)
				key = '';

			if (val)
				val = '';

			pos = i + 1;
			is = false;
			decodek = false;
			decodev = false;

			if ((count++) >= CONF.default_request_maxkeys)
				break;

		} else {

			if (n === 61) {
				if ((i - pos) > CONF.default_request_maxkey)
					key = '';
				else {
					if (pos < i)
						key += str.substring(pos, i);
					pos = i + 1;
					is = true;
				}
				continue;
			}

			if (!is) {
				var can = false;
				if (n > 47 && n < 58)
					can = true;
				else if ((n > 64 && n < 91) || (n > 96 && n < 123))
					can = true;
				else if (QUERY_ALLOWED[n])
					can = true;
				if (!can)
					break;
			}

			if (n === 43) {
				if (is)
					val += str.substring(pos, i) + ' ';
				else
					key += str.substring(pos, i) + ' ';
				pos = i + 1;
			}

			if (n === 37) {
				if (str.charCodeAt(i + 1) === 48 && str.charCodeAt(i + 2) === 48)
					pos = i + 3;
				else if (is) {
					if (!decodev)
						decodev = true;
				} else {
					if (!decodev)
						decodek = true;
				}
			}
		}
	}

	return obj;
};

SP.parseUA = function(structured) {

	var ua = this;

	if (!ua)
		return '';

	var arr = ua.match(REG_UA);
	var uid = '';

	if (arr) {

		var data = {};

		for (var i = 0; i < arr.length; i++) {

			if (arr[i] === 'like' && arr[i + 1] === 'Gecko') {
				i += 1;
				continue;
			}

			var key = arr[i].toLowerCase();
			if (key === 'like')
				break;

			switch (key) {
				case 'linux':
				case 'windows':
				case 'mac':
				case 'symbian':
				case 'symbos':
				case 'tizen':
				case 'android':
					data[arr[i]] = 2;
					if (key === 'tizen' || key === 'android')
						data.Mobile = 1;
					break;
				case 'webos':
					data.WebOS = 2;
					break;
				case 'media':
				case 'center':
				case 'tv':
				case 'smarttv':
				case 'smart':
					data[arr[i]] = 5;
					break;
				case 'iemobile':
				case 'mobile':
					data[arr[i]] = 1;
					data.Mobile = 3;
					break;
				case 'ipad':
				case 'ipod':
				case 'iphone':
					data.iOS = 2;
					data.Mobile = 3;
					data[arr[i]] = 1;
					if (key === 'ipad')
						data.Tablet = 4;
					break;
				case 'phone':
					data.Mobile = 3;
					break;
				case 'tizenbrowser':
				case 'blackberry':
				case 'mini':
					data.Mobile = 3;
					data[arr[i]] = 1;
					break;
				case 'samsungbrowser':
				case 'chrome':
				case 'firefox':
				case 'msie':
				case 'opera':
				case 'brave':
				case 'vivaldi':
				case 'outlook':
				case 'safari':
				case 'mail':
				case 'edge':
				case 'maxthon':
				case 'electron':
					data[arr[i]] = 1;
					break;
				case 'trident':
					data.MSIE = 1;
					break;
				case 'opr':
					data.Opera = 1;
					break;
				case 'tablet':
					data.Tablet = 4;
					break;
			}
		}

		if (data.MSIE) {
			data.IE = 1;
			delete data.MSIE;
		}

		if (data.WebOS || data.Android)
			delete data.Linux;

		if (data.IEMobile) {
			if (data.Android)
				delete data.Android;
			if (data.Safari)
				delete data.Safari;
			if (data.Chrome)
				delete data.Chrome;
		} else if (data.MSIE) {
			if (data.Chrome)
				delete data.Chrome;
			if (data.Safari)
				delete data.Safari;
		} else if (data.Edge) {
			if (data.Chrome)
				delete data.Chrome;
			if (data.Safari)
				delete data.Safari;
		} else if (data.Opera || data.Electron) {
			if (data.Chrome)
				delete data.Chrome;
			if (data.Safari)
				delete data.Safari;
		} else if (data.Chrome) {
			if (data.Safari)
				delete data.Safari;
			if (data.SamsungBrowser)
				delete data.SamsungBrowser;
		} else if (data.SamsungBrowser) {
			if (data.Safari)
				delete data.Safari;
		}

		if (structured) {
			var output = { os: '', browser: '', device: 'desktop' };

			if (data.Tablet)
				output.device = 'tablet';
			else if (data.Mobile)
				output.device = 'mobile';

			for (var key in data) {
				var val = data[key];
				switch (val) {
					case 1:
						output.browser += (output.browser ? ' ' : '') + key;
						break;
					case 2:
						output.os += (output.os ? ' ' : '') + key;
						break;
					case 5:
						output.device = 'tv';
						break;
				}
			}
			return output;
		}

		uid = Object.keys(data).join(' ');
	}

	return uid;
};

SP.parseCSV = function(delimiter) {

	if (!delimiter)
		delimiter = ',';

	var delimiterstring = '"';
	var t = this;
	var scope;
	var tmp = {};
	var index = 1;
	var data = [];
	var current = 'a';

	for (var i = 0; i < t.length; i++) {
		var c = t[i];

		if (!scope) {

			if (c === '\n' || c === '\r') {
				tmp && data.push(tmp);
				index = 1;
				current = 'a';
				tmp = null;
				continue;
			}

			if (c === delimiter) {
				current = String.fromCharCode(97 + index);
				index++;
				continue;
			}
		}

		if (c === delimiterstring) {
			// Check escaped quotes
			if (scope && t[i + 1] === delimiterstring) {
				i++;
			} else {
				scope = c === scope ? '' : c;
				continue;
			}
		}

		if (!tmp)
			tmp = {};

		if (tmp[current])
			tmp[current] += c;
		else
			tmp[current] = c;
	}

	tmp && data.push(tmp);
	return data;
};

SP.parseTerminal = function(fields, fn, skip, take) {

	var lines = this.split('\n');

	if (typeof(fields) === 'function') {
		take = skip;
		skip = fn;
		fn = fields;
		parseTerminal2(lines, fn, skip, take);
		return this;
	}

	if (skip === undefined)
		skip = 0;
	if (take === undefined)
		take = lines.length;

	var headers = [];
	var indexer = 0;
	var line = lines[0];

	if (!line) {
		line = lines[1];
		skip++;
	}

	if (!line) {
		line = lines[2];
		skip++;
	}

	if (!line)
		return this;

	var fieldslength = fields.length;
	var tmp;

	for (var i = 0, length = fieldslength; i < length; i++) {
		var field = fields[i];

		var beg = -1;
		var end = -1;
		var type = typeof(field);

		if (type === 'object' && field.test) {
			tmp = line.match(field);
			if (tmp) {
				beg = tmp.index;
				end = beg + tmp.toString().length;
			} else {
				beg = -1;
				end = -1;
			}
		} else if (type === 'string') {
			tmp = line.indexOf(field);
			if (tmp === -1) {
				beg = -1;
				end = -1;
			} else {
				beg = tmp;
				end = line.indexOf(' ', beg + field.length);
			}
		}

		headers.push({ beg: beg, end: end });
	}

	for (var i = skip + 1, length = skip + 1 + take; i < length; i++) {

		var line = lines[i];
		if (!line)
			continue;

		var arr = [];
		var is = false;
		var beg;

		for (var j = 0; j < fieldslength; j++) {
			var header = headers[j];
			if (header.beg !== -1) {
				is = true;
				beg = 0;

				for (var k = header.beg; k > -1; k--) {
					if (line[k] === ' ') {
						beg = k + 1;
						break;
					}
				}

				arr.push(line.substring(beg, header.end === -1 ? undefined : header.end).trim());
			} else
				arr.push('');
		}

		is && fn(arr, indexer++, length, i);
	}

	return this;
};

function parseTerminal2(lines, fn, skip, take) {
	var indexer = 0;

	if (skip == null)
		skip = 0;
	if (take == null)
		take = lines.length;

	for (var i = skip, length = skip + take; i < length; i++) {
		var line = lines[i];
		if (!line)
			continue;
		var m = line.match(REG_TERMINAL);
		m && fn(m, indexer++, length, i);
	}
}

function parseDateFormat(format, val) {

	var tmp = [];
	var tmpformat = [];
	var prev = '';
	var prevformat = '';
	var allowed = { y: 1, Y: 1, M: 1, m: 1, d: 1, D: 1, H: 1, s: 1, a: 1, w: 1 };

	for (var i = 0; i < format.length; i++) {

		var c = format[i];

		if (!allowed[c])
			continue;

		if (prev !== c) {
			prevformat && tmpformat.push(prevformat);
			prevformat = c;
			prev = c;
		} else
			prevformat += c;
	}

	prev = '';

	for (var i = 0; i < val.length; i++) {
		var code = val.charCodeAt(i);
		if (code >= 48 && code <= 57)
			prev += val[i];
	}

	prevformat && tmpformat.push(prevformat);

	var f = 0;
	for (var i = 0; i < tmpformat.length; i++) {
		var l = tmpformat[i].length;
		tmp.push(prev.substring(f, f + l));
		f += l;
	}

	var dt = {};

	for (var i = 0; i < tmpformat.length; i++) {
		var type = tmpformat[i];
		if (tmp[i])
			dt[type[0]] = +tmp[i];
	}

	var h = dt.h || dt.H;

	if (h != null) {
		var ampm = val.match(REG_TIME);
		if (ampm && ampm[0].toLowerCase() === 'pm')
			h += 12;
	}

	var y = (dt.y || dt.Y) || 0;
	if (y < 100)
		y += 2000;

	return new Date(y, (dt.M || 1) - 1, dt.d || dt.D || 0, h || 0, dt.m || 0, dt.s || 0);
}

SP.parseDate = function(format) {

	if (format)
		return parseDateFormat(format, this);

	var self = this.trim();
	var lc = self.charCodeAt(self.length - 1);

	// Classic date
	if (lc === 41)
		return new Date(self);

	// JSON format
	if (lc === 90)
		return new Date(Date.parse(self));

	var arr = self.indexOf(' ') === -1 ? self.split('T') : self.split(' ');
	var index = arr[0].indexOf(':');
	var length = arr[0].length;

	if (index !== -1) {
		var tmp = arr[1];
		arr[1] = arr[0];
		arr[0] = tmp;
	}

	if (arr[0] === undefined)
		arr[0] = '';

	var noTime = arr[1] === undefined ? true : arr[1].length === 0;

	for (var i = 0; i < length; i++) {
		var c = arr[0].charCodeAt(i);
		if (c === 45 || c === 46 || (c > 47 && c < 58))
			continue;
		if (noTime)
			return new Date(self);
	}

	if (arr[1] === undefined)
		arr[1] = '00:00:00';

	var firstDay = arr[0].indexOf('-') === -1;

	var date = (arr[0] || '').split(firstDay ? '.' : '-');
	var time = (arr[1] || '').split(':');
	var parsed = [];

	if (date.length < 4 && time.length < 2)
		return new Date(self);

	index = (time[2] || '').indexOf('.');

	// milliseconds
	if (index !== -1) {
		time[3] = time[2].substring(index + 1);
		time[2] = time[2].substring(0, index);
	} else
		time[3] = '0';

	parsed.push(+date[firstDay ? 2 : 0]); // year
	parsed.push(+date[1]); // month
	parsed.push(+date[firstDay ? 0 : 2]); // day
	parsed.push(+time[0]); // hours
	parsed.push(+time[1]); // minutes
	parsed.push(+time[2]); // seconds
	parsed.push(+time[3]); // miliseconds

	var def = new Date();

	for (var i = 0, length = parsed.length; i < length; i++) {
		if (isNaN(parsed[i]))
			parsed[i] = 0;

		var value = parsed[i];
		if (value !== 0)
			continue;

		switch (i) {
			case 0:
				if (value <= 0)
					parsed[i] = def.getFullYear();
				break;
			case 1:
				if (value <= 0)
					parsed[i] = def.getMonth() + 1;
				break;
			case 2:
				if (value <= 0)
					parsed[i] = def.getDate();
				break;
		}
	}

	return new Date(parsed[0], parsed[1] - 1, parsed[2], parsed[3], parsed[4] - NOW.getTimezoneOffset(), parsed[5]);
};

SP.parseDateExpiration = function() {
	var self = this;

	var arr = self.split(' ');
	var dt = new Date();
	var length = arr.length;

	for (var i = 0; i < length; i += 2) {
		var num = arr[i].parseInt();
		if (num === 0)
			continue;
		var type = arr[i + 1];
		if (type)
			dt = dt.add(type, num);
	}

	return dt;
};

var configurereplace = function(text) {
	var val = CONF[text.substring(1, text.length - 1)];
	return val == null ? '' : val;
};

SP.env = function() {
	return this.replace(REG_CONFIGURE, configurereplace);
};

SP.parseConfig = function(def, onerr) {

	if (typeof(def) === 'function') {
		onerr = def;
		def = null;
	}

	var arr = this.split('\n');
	var length = arr.length;
	var obj = def ? exports.extend({}, def) : {};
	var subtype;
	var name;
	var index;
	var value;

	for (var i = 0; i < length; i++) {

		var str = arr[i];
		if (!str || str[0] === '#' || str.substring(0, 2) === '//')
			continue;

		index = str.indexOf(':');
		if (index === -1) {
			index = str.indexOf('\t:');
			if (index === -1)
				continue;
		}

		name = str.substring(0, index).trim();
		value = str.substring(index + 2).trim();

		index = name.indexOf('(');
		if (index !== -1) {
			subtype = name.substring(index + 1, name.indexOf(')')).trim().toLowerCase();
			name = name.substring(0, index).trim();
		} else
			subtype = '';

		if (value.substring(0, 7) === 'base64 ' && value.length > 8)
			value = Buffer.from(value.substring(7).trim(), 'base64').toString('utf8');
		else if (value.substring(0, 4) === 'hex ' && value.length > 6)
			value = Buffer.from(value.substring(4).trim(), 'hex').toString('utf8');

		switch (subtype) {
			case 'string':
				obj[name] = value;
				break;
			case 'number':
			case 'float':
			case 'double':
			case 'currency':
				obj[name] = value.isNumber(true) ? value.parseFloat2() : value.parseInt2();
				break;
			case 'boolean':
			case 'bool':
				obj[name] = (/true|on|1|enabled/i).test(value);
				break;
			case 'config':
				obj[name] = CONF[value];
				break;
			case 'eval':
			case 'object':
			case 'array':
				try {
					obj[name] = new Function('return ' + value)();
				} catch (e) {
					if (onerr)
						onerr(e, arr[i]);
					else
						throw new Error('A value of "{0}" can\'t be converted to "{1}": '.format(name, subtype) + e.toString());
				}
				break;
			case 'json':
				obj[name] = value.parseJSON(true);
				break;
			case 'env':
			case 'environment':
				obj[name] = process.env[value];
				break;
			case 'date':
			case 'time':
			case 'datetime':
				obj[name] = value.parseDate();
				break;
			case 'random':
				obj[name] = GUID((value || '0').parseInt() || 10);
				break;
			default:
				obj[name] = value;
				break;
		}
	}

	return obj;
};

SP.format = function() {
	var arg = arguments;
	return this.replace(REG_STRFORMAT, function(text) {
		var value = arg[+text.substring(1, text.length - 1)];
		return value == null ? '' : value;
	});
};

SP.encrypt_uid = function(key) {
	return exports.encrypt_uid(this, key);
};

SP.decrypt_uid = function(key) {
	return exports.decrypt_uid(this, key);
};

SP.encode = SP.safehtml = function() {
	var output = '';
	for (var i = 0, length = this.length; i < length; i++) {
		var c = this[i];
		switch (c) {
			case '<':
				output += '&lt;';
				break;
			case '>':
				output += '&gt;';
				break;
			case '"':
				output += '&quot;';
				break;
			case '\'':
				output += '&apos;';
				break;
			case '&':
				output += '&amp;';
				break;
			default:
				output += c;
				break;
		}
	}
	return output;
};

SP.decode = function() {
	return this.replace(REG_DECODE, function(s) {
		if (s.charAt(1) !== '#')
			return ALPHA_INDEX[s] || s;
		var code = s[2].toLowerCase() === 'x' ? parseInt(s.substr(3), 16) : parseInt(s.substr(2));
		return !code || code < -32768 || code > 65535 ? '' : String.fromCharCode(code);
	});
};

SP.arg = SP.args = function(obj, encode, def) {
	if (typeof(encode) === 'string')
		def = encode;
	var isfn = typeof(encode) === 'function';
	return this.replace(REG_ARGS, function(text) {
		// Is double bracket?
		var l = text[1] === '{' ? 2 : 1;
		var key = text.substring(l, text.length - l).trim();
		var val = obj[key];

		if (encode) {
			if (isfn)
				return encode(val, key);
			if (encode === 'json')
				return JSON.stringify(val);
		}

		return val == null ? (def == null ? text : def) : encode ? encode === 'html' ? (val + '').encode() : encodeURIComponent(val + '') : val;
	});
};

SP.max = function(length, chars) {
	var str = this;
	if (chars == null)
		chars = '...';
	return str.length > length ? str.substring(0, length - chars.length) + chars : str;
};

SP.isJSON = function() {
	var self = this;
	if (self.length <= 1)
		return false;

	var l = self.length - 1;
	var a;
	var b;
	var i = 0;

	while (true) {
		a = self[i++];
		if (a === ' ' || a === '\n' || a === '\r' || a === '\t')
			continue;
		break;
	}

	while (true) {
		b = self[l--];
		if (b === ' ' || b === '\n' || b === '\r' || b === '\t')
			continue;
		break;
	}

	return (a === '"' && b === '"') || (a === '[' && b === ']') || (a === '{' && b === '}') || (a.charCodeAt(0) > 47 && b.charCodeAt(0) < 57);
};

SP.isURL = function() {
	return this.length <= 7 ? false : F.def.validators.url.test(this);
};

SP.isZIP = function() {
	return F.def.validators.zip.test(this);
};

SP.isXSS = function() {
	return F.def.validators.xss.test(this);
};

SP.isSQLInjection = function() {
	return F.def.validators.sqlinjection.test(this);
};

SP.isEmail = function() {
	return this.length <= 4 ? false : F.def.validators.email.test(this);
};

SP.isPhone = function() {
	return this.length < 6 ? false : F.def.validators.phone.test(this);
};

SP.isBase64 = function(isdata) {

	var str = this;
	var count = str.length;

	if (isdata) {
		var index = str.indexOf(';base64,');
		if (index !== -1)
			count -= (index + 8);
	}

	return count % 4 === 0 && (isdata ? REG_BASE2.test(str) : REG_BASE.test(str));
};

SP.isGUID = function() {
	return this.length === 36 ? REG_GUID.test(this) : false;
};

SP.isUID = function() {
	var str = this;

	if (str.length < 10 && str.length > 25)
		return false;

	var is = F.def.validators.uid.test(str);
	if (is) {

		var sum;
		var beg;
		var end;
		var e = str[str.length - 1];
		if (e === 'r') {
			// random version
			sum = 0;
			for (var i = 0; i < 10; i++) {
				if (str.charCodeAt(i) < 91)
					sum++;
			}
			return str[10] == RANDOM_STRING[+sum];
		} else if (e === 'f') {
			sum = str[str.length - 2];
			beg = +str[str.length - 3];
			end = str.length - 4;
			var tmp = exports.from62(str.substring(beg, end)) - 99;
			return sum === (tmp % 2 ? '1' : '0');
		} else if (e === 'b' || e === 'c' || e === 'd') {
			sum = str[str.length - 2];
			beg = +str[str.length - 3];
			end = str.length - 5;
			var tmp = e === 'c' || e === 'd' ? (+str.substring(beg, end)) : parseInt(str.substring(beg, end), 16);
			return sum === (tmp % 2 ? '1' : '0');
		} else if (e === 'a') {
			sum = str[str.length - 2];
			beg = 6;
			end = str.length - 4;
		} else {
			sum = str[str.length - 1];
			beg = 10;
			end = str.length - 4;
		}

		while (beg++ < end) {
			if (str[beg] !== '0') {
				if (((+str.substring(beg, end)) % 2 ? '1' : '0') === sum)
					return true;
			}
		}
	}
	return false;
};

SP.parseUID = function() {
	var self = this;
	var obj = {};
	var hash;
	var e = self[self.length - 1];

	obj.version = e;

	if (e === 'r') {
		// random version
		var sum = 0;
		for (var i = 0; i < 8; i++) {
			if (self.charCodeAt(i) < 91)
				sum++;
		}
		obj.index = self.substring(0, 8);
		obj.hash = self[8];
		obj.valid = obj.hash == RANDOM_STRING[sum];
		return obj;
	} else if (e === 'f') {
		end = +self[self.length - 3];
		var ticks = exports.from62(self.substring(0, end)) * 100;
		obj.date = new Date(ticks);
		beg = end;
		end = self.length - 4;
		hash = +self.substring(self.length - 2, self.length - 1);
		obj.century = Math.floor((obj.date.getFullYear() - 1) / 100) + 1;
		obj.hash = self.substring(end, end + 2);
	} else if (e === 'b' || e === 'c' || e === 'd') {
		end = +self[self.length - 3];
		var ticks = ((e === 'b' ? (+self.substring(0, end)) : parseInt(self.substring(0, end), e === 'd' ? 36 : 16)) * 1000 * 60) + 1580511600000; // 1.1.2020
		obj.date = new Date(ticks);
		beg = end;
		end = self.length - 5;
		hash = +self.substring(end + 3, end + 4);
		obj.century = Math.floor((obj.date.getFullYear() - 1) / 100) + 1;
		obj.hash = self.substring(end, end + 2);
	} else if (e === 'a') {
		var ticks = ((+self.substring(0, 6)) * 1000 * 60) + 1548975600000; // old 1.1.2019
		obj.date = new Date(ticks);
		beg = 7;
		end = self.length - 4;
		hash = +self.substring(end + 2, end + 3);
		obj.century = Math.floor((obj.date.getFullYear() - 1) / 100) + 1;
		obj.hash = self.substring(end, end + 2);
	} else {
		var y = self.substring(0, 2);
		var M = self.substring(2, 4);
		var d = self.substring(4, 6);
		var H = self.substring(6, 8);
		var m = self.substring(8, 10);

		obj.date = new Date(+('20' + y), (+M) - 1, +d, +H, +m, 0);

		var beg = 0;
		var end = 0;
		var index = 10;

		while (true) {

			var c = self[index];

			if (!c)
				break;

			if (!beg && c !== '0')
				beg = index;

			if (c.charCodeAt(0) > 96) {
				end = index;
				break;
			}

			index++;
		}

		obj.century = self.substring(end + 4);

		if (obj.century) {
			obj.century = 20 + (+obj.century);
			obj.date.setYear(obj.date.getFullYear() + 100);
		} else
			obj.century = 21;

		hash = +self.substring(end + 3, end + 4);
		obj.hash = self.substring(end, end + 3);
	}

	obj.index = e === 'f' ? (exports.from62(self.substring(beg, end)) - 99) : (+self.substring(beg, end));
	obj.valid = (obj.index % 2 ? 1 : 0) === hash;
	return obj;
};

String.prototype.parseEnv = function() {

	var arr = this.split(REG_ENVLINES);
	var obj = {};

	for (var i = 0; i < arr.length; i++) {
		var line = arr[i];

		if (!line || line.substring(0, 2) === '//' || line[0] === '#')
			continue;

		var index = line.indexOf('=');
		if (index === -1)
			continue;

		var key = line.substring(0, index);
		var val = line.substring(index + 1).replace(/\\n/g, '\n');
		var end = val.length - 1;

		if ((val[0] === '"' && val[end] === '"') || (val[0] === '\'' && val[end] === '\''))
			val = val.substring(1, end);
		else
			val = val.trim();

		obj[key] = val;
	}

	return obj;
};

SP.parseInt = function(def) {
	var str = this.trim();
	var num = +str;
	return isNaN(num) ? (def === undefined ? 0 : def) : num;
};

SP.parseInt2 = function(def) {
	var num = this.match(REG_INTEGER);
	return num ? +num[0] : (def === undefined ? 0 : def);
};

SP.parseFloat2 = function(def) {
	var num = this.match(REG_FLOAT);
	return num ? +num[0].toString().replace(/,/g, '.') : (def === undefined ? 0 : def);
};

SP.parseBoolean = function() {
	var self = this.toLowerCase();
	return self === 'true' || self === '1' || self === 'on';
};

SP.parseFloat = function(def) {
	var str = this.trim();
	if (str.indexOf(',') !== -1)
		str = str.replace(',', '.');
	var num = +str;
	return isNaN(num) ? (def === undefined ? 0 : def) : num;
};

SP.capitalize = function(first) {

	if (first)
		return (this[0] || '').toUpperCase() + this.substring(1).toLowerCase();

	var builder = '';
	var c;

	var str = this.toLowerCase();

	for (var i = 0; i < str.length; i++) {
		var c = str[i - 1];
		if (!c || (c === ' ' || c === '\t' || c === '\n'))
			c = str[i].toUpperCase();
		else
			c = str[i];
		builder += c;
	}

	return builder;
};

SP.toUnicode = function() {
	var output = '';
	for (var i = 0; i < this.length; i++) {
		var c = this[i].charCodeAt(0);
		if(c > 126 || c < 32)
			output += '\\u' + ('000' + c.toString(16)).substr(-4);
		else
			output += this[i];
	}
	return output;
};

SP.fromUnicode = function() {
	var output = '';
	for (var i = 0; i < this.length; i++) {
		if (this[i] === '\\' && this[i + 1] === 'u') {
			output += String.fromCharCode(parseInt(this[i + 2] + this[i + 3] + this[i + 4] + this[i + 5], 16));
			i += 5;
		} else
			output += this[i];
	}
	return output;
};

SP.sha1 = function(salt) {
	var hash = F.Crypto.createHash('sha1');
	hash.update(this + (salt || ''), 'utf8');
	return hash.digest('hex');
};

SP.sha256 = function(salt) {
	var hash = F.Crypto.createHash('sha256');
	hash.update(this + (salt || ''), 'utf8');
	return hash.digest('hex');
};

SP.sha512 = function(salt) {
	var hash = F.Crypto.createHash('sha512');
	hash.update(this + (salt || ''), 'utf8');
	return hash.digest('hex');
};

SP.md5 = function(salt) {
	var hash = F.Crypto.createHash('md5');
	hash.update(this + (salt || ''), 'utf8');
	return hash.digest('hex');
};

SP.toSearch = function() {
	var str = this.replace(REG_SEARCH, '').trim().toLowerCase().toASCII();
	var buf = [];
	var prev = '';
	for (var i = 0; i < str.length; i++) {
		var c = str[i];
		if (c === 'y')
			c = 'i';
		if (c === prev)
			continue;
		prev = c;
		buf.push(c);
	}
	return buf.join('');
};

SP.toKeywords = function(forsearch = true, alternative = false, max_count = 200, max_length = 20, min_length = 2) {

	var content = this;
	var words = (forsearch ? content.toASCII().toLowerCase().replace(REG_KEYWORD1, 'i') : content.toLowerCase()).replace(REG_KEYWORD2, ' ').split(' ');

	var dic = {};
	var counter = 0;

	for (let w of words) {

		var word = w.trim().replace(REG_KEYWORD3, keywordscleaner);

		if (REG_UTF8.test(word)) {

			var tmpw = word.split('', max_count);

			for (var j = 0; j < tmpw.length; j++) {
				word = tmpw[j];
				if (dic[word])
					dic[word]++;
				else
					dic[word] = 1;
				counter++;
			}

			if (counter >= max_count)
				break;

			continue;
		}

		if (word.length < min_length)
			continue;

		if (counter >= max_count)
			break;

		// Gets 80% length of word
		if (alternative) {
			var size = (word.length / 100) * 80;
			if (size > min_length + 1)
				word = word.substring(0, size);
		}

		if (word.length < min_length || word.length > max_length)
			continue;

		if (dic[word])
			dic[word]++;
		else
			dic[word] = 1;

		counter++;
	}

	var keys = Object.keys(dic);

	keys.sort(function(a, b) {
		var countA = dic[a];
		var countB = dic[b];
		return countA > countB ? -1 : countA < countB ? 1 : 0;
	});

	return keys;
};

function checksum(val) {
	var sum = 0;
	for (var i = 0; i < val.length; i++)
		sum += val.charCodeAt(i);
	return sum;
}

SP.encrypt = function(key, isUnique, secret) {
	var str = '0' + this;
	var data_count = str.length;
	var key_count = key.length;
	var random = isUnique ? exports.random(120) + 40 : 65;
	var count = data_count + (random % key_count);
	var values = [];
	var index = 0;

	values[0] = String.fromCharCode(random);

	var counter = this.length + key.length;

	for (var i = count - 1; i > 0; i--) {
		index = str.charCodeAt(i % data_count);
		values[i] = String.fromCharCode(index ^ (key.charCodeAt(i % key_count) ^ random));
	}

	str = Buffer.from(counter + '=' + values.join(''), 'utf8').toString('hex');
	var sum = 0;

	for (var i = 0; i < str.length; i++)
		sum += str.charCodeAt(i);

	return (sum + checksum((secret || CONF.secret) + key)) + '-' + str;
};

SP.decrypt = function(key, secret) {

	var index = this.indexOf('-');
	if (index === -1)
		return null;

	var cs = +this.substring(0, index);
	if (!cs || isNaN(cs))
		return null;

	var hash = this.substring(index + 1);
	var sum = checksum((secret || CONF.secret) + key);
	for (var i = 0; i < hash.length; i++)
		sum += hash.charCodeAt(i);

	if (sum !== cs)
		return null;

	var values = Buffer.from(hash, 'hex').toString('utf8');
	var index = values.indexOf('=');
	if (index === -1)
		return null;

	var counter = +values.substring(0, index);
	if (isNaN(counter))
		return null;

	values = values.substring(index + 1);

	var count = values.length;
	var random = values.charCodeAt(0);
	var key_count = key.length;
	var data_count = count - (random % key_count);
	var decrypt_data = [];

	for (var i = data_count - 1; i > 0; i--) {
		index = values.charCodeAt(i) ^ (random ^ key.charCodeAt(i % key_count));
		decrypt_data[i] = String.fromCharCode(index);
	}

	var val = decrypt_data.join('');
	return counter !== (val.length + key.length) ? null : val;
};

exports.encrypt_data = function(value, key, encode) {

	var builder = [];
	var index = 0;
	var length = key.length;

	for (var i = 0; i < value.length; i++) {

		if (SKIP_BODYENCRYPTOR[value[i]]) {
			builder.push(value[i]);
			continue;
		}

		if (index === length)
			index = 0;

		var a = value.charCodeAt(i) + 2;
		var b = key.charCodeAt(index++);
		var t = (a + b).toString(36);
		builder.push(t.length + t);
	}

	var mask = Buffer.alloc(4);
	mask.writeInt32BE((Math.random() * 214748364) >> 0);

	var buffer = Buffer.from(builder.join(''));
	for (var i = 0; i < buffer.length; i++)
		buffer[i] = buffer[i] ^ mask[i % 4];

	var buf = Buffer.concat([mask, buffer]);
	return encode === 'buffer' ? buf : buf.toString(encode || 'base64');
};

exports.decrypt_data = function(value, key, encode) {

	try {
		value = value instanceof Buffer ? value : Buffer.from(value, encode || 'base64');
	} catch (e) {
		return null;
	}

	var size = value.length - 4;
	if (size < 1)
		return null;

	var index = 0;
	var length = key.length;
	var builder = [];
	var mask = Buffer.alloc(4);
	var buffer = Buffer.alloc(size);
	mask.writeInt32BE(value.readInt32BE(0));

	for (var i = 4; i < value.length; i++)
		buffer[i - 4] = value[i] ^ mask[i % 4];

	value = buffer.toString('utf8');

	for (var i = 0; i < value.length; i++) {

		var c = value[i];

		if (SKIP_BODYENCRYPTOR[c]) {
			builder.push(c);
			continue;
		}

		if (index === length)
			index = 0;

		var l = +value.charAt(i);
		var code = parseInt(value.substring(i + 1, i + 1 + l), 36);
		var b = key.charCodeAt(index++);
		builder.push(String.fromCharCode(code - b - 2));
		i += l;
	}

	return builder.join('');
};

exports.encrypt_uid = function(val, key) {

	var num = typeof(val) === 'number';
	var sum = 0;

	if (!key)
		key = CONF.secret;

	val = val + '';

	for (var i = 0; i < val.length; i++)
		sum += val.charCodeAt(i);

	for (var i = 0; i < key.length; i++)
		sum += key.charCodeAt(i);

	return (num ? 'n' : 'x') + (F.config.secret_uid + val + sum + key).crc32(true).toString(32) + 'x' + val;
};

exports.decrypt_uid = function(val, key) {
	var num = val[0] === 'n';
	var raw = val.substring(val.indexOf('x', 1) + 1);

	if (num)
		raw = +raw;

	return exports.encrypt_uid(raw, key) === val ? raw : null;
};

exports.encrypt_crypto = function(type, key, value) {
	if (!F.temporary.keys[key])
		F.temporary.keys[key] = Buffer.from(key);
	var cipher = F.Crypto.createCipheriv(type, F.temporary.keys[key], CONF.default_crypto_iv);
	CONCAT[0] = cipher.update(value);
	CONCAT[1] = cipher.final();
	return Buffer.concat(CONCAT);
};

exports.decrypt_crypto = function(type, key, value) {
	if (!F.temporary.keys[key])
		F.temporary.keys[key] = Buffer.from(key);
	var decipher = F.Crypto.createDecipheriv(type, F.temporary.keys[key], CONF.default_crypto_iv);
	try {
		CONCAT[0] = decipher.update(value);
		CONCAT[1] = decipher.final();
		return Buffer.concat(CONCAT);
	} catch (e) {}
};

SP.base64ToFile = function(filename, callback) {
	var self = this;
	var index = self.indexOf(',');
	if (index === -1)
		index = 0;
	else
		index++;
	F.Fs.writeFile(filename, self.substring(index), 'base64', callback || NOOP);
	return this;
};

SP.base64ToBuffer = function() {
	var self = this;

	var index = self.indexOf(',');
	if (index === -1)
		index = 0;
	else
		index++;

	return Buffer.from(self.substring(index), 'base64');
};

SP.parseDataURI = function() {
	var self = this;
	var index = self.indexOf(';');
	return index == -1 ? null : { type: self.substring(5, index), buffer: Buffer.from(self.substring(self.indexOf(',', index) + 1), 'base64') };
};

SP.base64ContentType = function() {
	var self = this;
	var index = self.indexOf(';');
	return index === -1 ? '' : self.substring(5, index);
};

var toascii = c => DIACRITICSMAP[c] || c;

SP.toASCII = function() {
	return this.replace(REG_ASCII, toascii);
};

SP.indent = function(max, c) {
	var plus = '';
	if (c === undefined)
		c = ' ';
	while (max--)
		plus += c;
	return plus + this;
};

SP.isNumber = function(isDecimal) {

	var self = this;
	var length = self.length;

	if (!length)
		return false;

	isDecimal = isDecimal || false;

	for (var i = 0; i < length; i++) {
		var ascii = self.charCodeAt(i);

		if (isDecimal) {
			if (ascii === 44 || ascii === 46) {
				isDecimal = false;
				continue;
			}
		}

		if (ascii < 48 || ascii > 57)
			return false;
	}

	return true;
};

if (!SP.padLeft) {
	SP.padLeft = function(max, c) {
		var self = this;
		var len = max - self.length;
		if (len < 0)
			return self;
		if (c === undefined)
			c = ' ';
		while (len--)
			self = c + self;
		return self;
	};
}

if (!SP.padRight) {
	SP.padRight = function(max, c) {
		var self = this;
		var len = max - self.length;
		if (len < 0)
			return self;
		if (c === undefined)
			c = ' ';
		while (len--)
			self += c;
		return self;
	};
}

SP.slug = function(max) {
	max = max || 60;

	var self = this.trim().toLowerCase().toASCII();
	var builder = '';
	var length = self.length;

	for (var i = 0; i < length; i++) {
		var c = self[i];
		var code = self.charCodeAt(i);

		if (code > 540){
			builder = '';
			break;
		}

		if (builder.length >= max)
			break;

		if (code > 31 && code < 48) {
			if (builder[builder.length - 1] !== '-')
				builder += '-';
			continue;
		}

		if ((code > 47 && code < 58) || (code > 94 && code < 123))
			builder += c;
	}

	if (builder.length > 1) {
		length = builder.length - 1;
		return builder[length] === '-' ? builder.substring(0, length) : builder;
	} else if (!length)
		return '';

	length = self.length;
	self = self.replace(/\s/g, '');
	builder = self.crc32(true).toString(36) + '';
	return self[0].charCodeAt(0).toString(32) + builder + self[self.length - 1].charCodeAt(0).toString(32) + length;
};

SP.pluralize = function(zero, one, few, other) {
	return this.parseInt().pluralize(zero, one, few, other);
};

SP.removeTags = function() {
	return this.replace(REG_TAGS, '');
};

NP.between = function(condition, otherwise) {

	var val = this;

	for (var key in condition) {

		var arr = key.split('-');

		var a = arr[0] ? +arr[0] : null;
		var b = arr[1] ? +arr[1] : null;

		if (a != null && b !== null) {
			if (val >= a && val <= b)
				return condition[key];
		} else if (a != null) {
			if (val >= a)
				return condition[key];
		} else if (b != null)
			if (val <= b)
				return condition[key];
	}

	return otherwise;
};

NP.floor = function(decimals) {
	return Math.floor(this * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

NP.fixed = function(decimals) {
	return +this.toFixed(decimals);
};

NP.padLeft = function(max, c) {
	return this.toString().padLeft(max, c || '0');
};

NP.padRight = function(max, c) {
	return this.toString().padRight(max, c || '0');
};

NP.round = function(precision) {
	var m = Math.pow(10, precision) || 1;
	return Math.round(this * m) / m;
};

NP.currency = function(currency, a, b, c) {
	var curr = F.def.currencies[currency || 'default'];
	return curr ? curr(this, a, b, c) : this.format(2);
};

NP.async = function(fn, callback) {
	var number = this;
	if (number)
		fn(number--, () => setImmediate(() => number.async(fn, callback)));
	else
		callback && callback();
	return number;
};

NP.format = function(decimals, separator, separatorDecimal) {

	var self = this;
	var num = self.toString();
	var dec = '';
	var output = '';
	var minus = num[0] === '-' ? '-' : '';
	if (minus)
		num = num.substring(1);

	var index = num.indexOf('.');

	if (typeof(decimals) === 'string') {
		var tmp = separator;
		separator = decimals;
		decimals = tmp;
	}

	if (separator === undefined)
		separator = ' ';

	if (index !== -1) {
		dec = num.substring(index + 1);
		num = num.substring(0, index);
	}

	index = -1;
	for (var i = num.length - 1; i >= 0; i--) {
		index++;
		if (index > 0 && index % 3 === 0)
			output = separator + output;
		output = num[i] + output;
	}

	if (decimals || dec.length) {
		if (dec.length > decimals)
			dec = dec.substring(0, decimals || 0);
		else
			dec = dec.padRight(decimals || 0, '0');
	}

	if (dec.length && separatorDecimal === undefined)
		separatorDecimal = separator === '.' ? ',' : '.';

	return minus + output + (dec.length ? separatorDecimal + dec : '');
};


NP.pluralize = function(zero, one, few, other) {

	var num = this;
	var value = '';

	if (num == 0)
		value = zero || '';
	else if (num == 1)
		value = one || '';
	else if (num > 1 && num < 5)
		value = few || '';
	else
		value = other;

	var beg = value.indexOf('#');
	if (beg === -1)
		return value;

	var end = value.lastIndexOf('#');
	var format = value.substring(beg, end + 1);
	return num.format(format) + value.replace(format, '');
};

NP.VAT = NP.TAX = function(percentage, decimals, includedVAT) {
	var num = this;
	var type = typeof(decimals);

	if (type === 'boolean') {
		var tmp = includedVAT;
		includedVAT = decimals;
		decimals = tmp;
		type = typeof(decimals);
	}

	if (type === 'undefined')
		decimals = 2;

	return !percentage || !num ? num.round(decimals) : includedVAT ? (num / ((percentage / 100) + 1)).round(decimals) : (num * ((percentage / 100) + 1)).round(decimals);
};

NP.discount = function(percentage, decimals) {
	var num = this;
	if (decimals === undefined)
		decimals = 2;
	return !num || !percentage ? num : (num - (num / 100) * percentage).floor(decimals);
};

NP.parseDate = function(plus) {
	return new Date(this + (plus || 0));
};

if (!NP.toRad) {
	NP.toRad = function () {
		return this * Math.PI / 180;
	};
}

NP.filesize = function(decimals, type) {

	if (typeof(decimals) === 'string') {
		var tmp = type;
		type = decimals;
		decimals = tmp;
	}

	var value;

	// this === bytes
	switch (type) {
		case 'bytes':
			value = this;
			break;
		case 'KB':
			value = this / 1024;
			break;
		case 'MB':
			value = filesizehelper(this, 2);
			break;
		case 'GB':
			value = filesizehelper(this, 3);
			break;
		case 'TB':
			value = filesizehelper(this, 4);
			break;
		default:

			type = 'bytes';
			value = this;

			if (value > 1023) {
				value = value / 1024;
				type = 'KB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'MB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'GB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'TB';
			}

			break;
	}

	type = ' ' + type;
	return (decimals === undefined ? value.format(2).replace('.00', '') : value.format(decimals)) + type;
};

function filesizehelper(number, count) {
	while (count--) {
		number = number / 1024;
		if (number.toFixed(3) === '0.000')
			return 0;
	}
	return number;
}

var AP = Array.prototype;

AP.take = function(count) {
	var arr = [];
	var self = this;
	for (var i = 0; i < self.length; i++) {
		arr.push(self[i]);
		if (arr.length >= count)
			return arr;
	}
	return arr;
};

AP.first = function(def) {
	var item = this[0];
	return item === undefined ? def : item;
};

AP.last = function(def) {
	var item = this[this.length - 1];
	return item === undefined ? def : item;
};

AP.quicksort = function(sort) {

	var self = this;
	if (self.length < 2)
		return self;

	// Backward compatibility
	if (!sort) {
		self.sort(COMPARER);
		return self;
	}

	// Backward compatibility
	if (sort === true) {
		self.sort(COMPARER_DESC);
		return self;
	}

	if (arguments[1] === true || arguments[1] === 2)
		sort += '_desc';

	shellsort(self, exports.sortcomparer(sort));
	return self;
};

exports.sortcomparer = function(sort) {

	var key = 'sort_' + sort;
	var meta = F.temporary.utils[key];

	if (!meta) {
		meta = [];
		sort = sort.replace(/\s/g, '').split(',');
		for (var i = 0; i < sort.length; i++) {
			var tmp = sort[i].split((/_(desc|asc)/));
			var obj = { name: tmp[0], type: null, desc: tmp[1] === 'desc' };
			if (tmp[0].indexOf('.') !== -1)
				obj.read = new Function('val', 'return val.' + tmp[0].replace(/\./g, '?.'));
			meta.push(obj);
		}
		F.temporary.utils[key] = meta;
	}

	return function(a, b) {
		for (var i = 0; i < meta.length; i++) {
			var col = meta[i];
			var va = col.read ? col.read(a) : a[col.name];
			var vb = col.read ? col.read(b) : b[col.name];

			if (!col.type) {
				if (va != null)
					col.type = va instanceof Date ? 4 : typeof(va);
				else if (vb != null)
					col.type = vb instanceof Date ? 4: typeof(vb);
				switch (col.type) {
					case 'string':
						col.type = 1;
						break;
					case 'number':
						col.type = 2;
						break;
					case 'boolean':
						col.type = 3;
						break;
					case 'object':
						col.type = 5;
						break;
				}
			}

			if (col.type) {
				switch (col.type) {

					case 1:
						tmp = col.desc ? COMPARER_DESC(va, vb) : COMPARER(va, vb);
						if (tmp)
							return tmp;
						break;

					case 2:
						tmp = va > vb ? (col.desc ? -1 : 1) : va < vb ? (col.desc ? 1 : -1) : 0;
						if (tmp)
							return tmp;
						break;

					case 3:
						tmp = va === true && vb === false ? (col.desc ? -1 : 1) : va === false && vb === true ? (col.desc ? 1 : -1) : 0;
						if (tmp)
							return tmp;
						break;

					case 4:

						if (!va && !vb)
							break;

						if (va && !vb)
							return col.desc ? -1 : 1;

						if (!va && vb)
							return col.desc ? 1 : -1;

						if (!va.getTime)
							va = new Date(va);

						if (!vb.getTime)
							vb = new Date(vb);

						tmp = va > vb ? (col.desc ? -1 : 1) : va < vb ? (col.desc ? 1 : -1) : 0;

						if (tmp)
							return tmp;

						break;
				}
			} else
				return 0;
		}

		return 0;
	};
};

AP.trim = function() {
	var self = this;
	var output = [];
	for (var i = 0, length = self.length; i < length; i++) {
		if (typeof(self[i]) === 'string')
			self[i] = self[i].trim();
		self[i] && output.push(self[i]);
	}
	return output;
};

AP.skip = function(count) {
	var arr = [];
	var self = this;
	var length = self.length;
	for (var i = 0; i < length; i++)
		i >= count && arr.push(self[i]);
	return arr;
};

AP.findAll = function(cb, value) {

	var self = this;
	var selected = [];
	var isFN = typeof(cb) === 'function';
	var isV = value !== undefined;

	for (var i = 0, length = self.length; i < length; i++) {

		if (isFN) {
			cb.call(self, self[i], i) && selected.push(self[i]);
			continue;
		}

		if (isV) {
			self[i] && self[i][cb] === value && selected.push(self[i]);
			continue;
		}

		self[i] === cb && selected.push(self[i]);
	}

	return selected;
};

AP.findValue = function(cb, value, path, def) {
	var index = this.findIndex(cb, value);
	if (index !== -1) {
		var item = this[index][path];
		return item == null ? def : item;
	}
	return def;
};

AP.findItem = function(cb, value) {
	var self = this;
	var index = self.findIndex(cb, value);
	if (index === -1)
		return null;
	return self[index];
};

AP.findIndex = function(cb, value) {

	var self = this;
	var isFN = typeof(cb) === 'function';
	var isV = value !== undefined;

	for (var i = 0, length = self.length; i < length; i++) {

		if (isFN) {
			if (cb.call(self, self[i], i))
				return i;
			continue;
		}

		if (isV) {
			if (self[i] && self[i][cb] === value)
				return i;
			continue;
		}

		if (self[i] === cb)
			return i;
	}

	return -1;
};

AP.remove = function(cb, value) {

	var self = this;
	var arr = [];
	var isFN = typeof(cb) === 'function';
	var isV = value !== undefined;

	for (var i = 0, length = self.length; i < length; i++) {

		if (isFN) {
			!cb.call(self, self[i], i) && arr.push(self[i]);
			continue;
		}

		if (isV) {
			self[i] && self[i][cb] !== value && arr.push(self[i]);
			continue;
		}

		self[i] !== cb && arr.push(self[i]);
	}
	return arr;
};

AP.wait = function(onItem, callback, thread, tmp) {

	var self = this;
	var init = false;

	// INIT
	if (!tmp) {

		if (typeof(callback) !== 'function') {
			thread = callback;
			callback = null;
		}

		tmp = {};
		tmp.pending = 0;
		tmp.index = 0;
		tmp.thread = thread;
		tmp.next = function(type) {
			if (type === 'cancel' || tmp.canceled) {
				tmp.pending--;
				tmp.canceled = true;
				if (!tmp.pending && callback)
					callback('cancel');
			} else
				setImmediate(next_wait, self, onItem, callback, thread, tmp);
		};

		// thread === Boolean then array has to be removed item by item
		init = true;
	}

	var item = thread === true ? self.shift() : self[tmp.index++];
	if (item === undefined) {
		if (!tmp.pending) {
			callback && callback();
			tmp.canceled = true;
		}
		return self;
	}

	tmp.pending++;
	onItem.call(self, item, tmp.next, tmp.index);

	if (!init || tmp.thread === 1)
		return self;

	for (var i = 1; i < tmp.thread; i++)
		self.wait(onItem, callback, 1, tmp);

	return self;
};

function next_wait(self, onItem, callback, thread, tmp) {
	tmp.pending--;
	self.wait(onItem, callback, thread, tmp);
}

AP.async = function(thread, callback, tmp) {

	var self = this;

	if (typeof(thread) === 'function') {
		callback = thread;
		thread = 1;
	} else if (thread === undefined)
		thread = 1;
	else if (thread > self.length)
		thread = self.length;

	if (!tmp) {
		tmp = {};
		tmp.pending = 0;
		tmp.next = function(type) {
			if (type === 'cancel' || tmp.canceled) {
				tmp.pending--;
				tmp.canceled = true;
				if (!tmp.pending && callback)
					callback('cancel');
			} else
				setImmediate(async_next, self, callback,  tmp);
		};
	}

	var item = self.shift();
	if (item === undefined) {
		if (!tmp.pending && callback)
			callback();
		return self;
	}

	for (var i = 0; i < thread; i++) {
		if (i)
			item = self.shift();
		tmp.pending++;
		item(tmp.next);
	}

	return self;
};

function async_next(self, callback, tmp) {
	tmp.pending--;
	self.async(1, callback, tmp);
}

// Fisher-Yates shuffle
AP.random = function(item) {
	if (item)
		return this.length > 1 ? this[exports.random(this.length - 1)] : this[0];
	for (var i = this.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = this[i];
		this[i] = this[j];
		this[j] = temp;
	}
	return this;
};

AP.limit = function(max, fn, callback, index) {

	if (index === undefined)
		index = 0;

	var current = [];
	var self = this;
	var length = index + max;

	for (var i = index; i < length; i++) {
		var item = self[i];

		if (item !== undefined) {
			current.push(item);
			continue;
		}

		if (!current.length) {
			callback && callback();
			return self;
		}

		fn(current, () => callback && callback(), index, index + max);
		return self;
	}

	if (!current.length) {
		callback && callback();
		return self;
	}

	fn(current, function() {
		if (length < self.length)
			self.limit(max, fn, callback, length);
		else
			callback && callback();
	}, index, index + max);

	return self;
};

ArrayBuffer.prototype.toBuffer = function() {
	var buf = Buffer.alloc(this.byteLength);
	var view = new Uint8Array(this);
	for (var i = 0; i < buf.length; ++i)
		buf[i] = view[i];
	return buf;
};

function FileList() {
	this.pending = [];
	this.pendingDirectory = [];
	this.directory = [];
	this.file = [];
	this.onComplete = null;
	this.onFilter = null;
	this.advanced = false;
}

const FLP = FileList.prototype;

FLP.reset = function() {
	this.file.length = 0;
	this.directory.length = 0;
	this.pendingDirectory.length = 0;
	return this;
};

FLP.walk = function(directory) {

	var self = this;

	if (directory instanceof Array) {
		var length = directory.length;
		for (var i = 0; i < length; i++)
			self.pendingDirectory.push(directory[i]);
		self.next();
		return;
	}

	F.Fs.readdir(directory, function(err, arr) {
		if (err)
			return self.next();
		var length = arr.length;
		for (var i = 0; i < length; i++)
			self.pending.push(F.Path.join(directory, arr[i]));
		self.next();
	});
};

FLP.stat = function(path) {
	var self = this;

	F.Fs.stat(path, function(err, stats) {

		if (err)
			return self.next();

		if (stats.isDirectory()) {
			path = self.clean(path);
			if (!self.onFilter || self.onFilter(path, true)) {
				self.directory.push(path);
				self.pendingDirectory.push(path);
			}
		} else if (!self.onFilter || self.onFilter(path, false))
			self.file.push(self.advanced ? { filename: path, stats: stats } : path);

		self.next();
	});
};

FLP.clean = function(path) {
	return path[path.length - 1] === F.Path.sep ? path : path + F.Path.sep;
};

FLP.next = function() {
	var self = this;

	if (self.pending.length) {
		var item = self.pending.shift();
		self.stat(item);
		return;
	}

	if (self.pendingDirectory.length) {
		var directory = self.pendingDirectory.shift();
		self.walk(directory);
		return;
	}

	self.onComplete(self.file, self.directory);
};

exports.queuecache = {};

function queue_next(name) {

	var item = exports.queuecache[name];
	if (!item)
		return;

	item.running--;

	if (item.running < 0)
		item.running = 0;

	if (item.pending.length) {
		var next = item.pending.shift();
		if (next) {
			next.running++;
			setImmediate(queue_next_callback, next, item);
		} else
			item.running = 0;
	}
}

function queue_next_callback(next, item) {
	next.fn(item.next, item.param);
}

exports.json2replacer = function(key, value) {
	if (value != null)
		return value;
};

exports.queue = function(name, max, fn, param) {

	if (!fn)
		return false;

	if (!max) {
		fn(NOOP);
		return true;
	}

	if (!exports.queuecache[name])
		exports.queuecache[name] = { limit: max, running: 0, pending: [], next: () => queue_next(name) };

	var obj = { fn: fn, param: param };
	var item = exports.queuecache[name];

	if ((item.running + 1) > item.limit) {
		item.pending.push(obj);
		return false;
	}

	item.running++;
	setImmediate(queue_next_callback, obj, item);
	return true;
};

exports.minify_css = function(val) {
	return F.TMinificators.css(val);
};

exports.minify_js = function(val) {
	return F.TMinificators.js(val);
};

exports.minify_html = function(val) {
	return F.TMinificators.html(val);
};

// =============================================
// SHELL SORT IMPLEMENTATION OF ALGORITHM
// =============================================

function _shellInsertionSort(list, length, gapSize, fn) {
	var temp, i, j;
	for (i = gapSize; i < length; i += gapSize ) {
		j = i;
		while(j > 0 && fn(list[j - gapSize], list[j]) === 1) {
			temp = list[j];
			list[j] = list[j - gapSize];
			list[j - gapSize] = temp;
			j -= gapSize;
		}
	}
}

function shellsort(arr, fn) {
	var length = arr.length;
	var gapSize = Math.floor(length / 2);
	while(gapSize) {
		_shellInsertionSort(arr, length, gapSize, fn);
		gapSize = Math.floor(gapSize / 2);
	}
	return arr;
}

function EventEmitter2(obj) {
	if (obj) {
		if (!obj.emit)
			EventEmitter2.extend(obj);
		return obj;
	} else
		this.$events = {};
}

EventEmitter2.prototype.emit = function(name, a, b, c, d, e, f, g) {

	var self = this;

	if (!self.$events)
		return self;

	var events = self.$events[name];
	if (events) {
		var clean = false;
		for (let fn of events) {
			if (fn.$once)
				clean = true;
			fn.call(self, a, b, c, d, e, f, g);
		}

		if (clean) {
			events = events.remove(fn => fn.$once);
			if (events.length)
				self.$events[name] = events;
			else
				delete self.$events[name];
		}
	}

	return self;
};

EventEmitter2.prototype.on = function(name, fn) {

	var self = this;

	if (!self.$events)
		self.$events = {};

	if (self.$events[name])
		self.$events[name].push(fn);
	else
		self.$events[name] = [fn];

	return self;
};

EventEmitter2.prototype.once = function(name, fn) {
	fn.$once = true;
	return this.on(name, fn);
};

EventEmitter2.prototype.off = function(name, fn) {

	var self = this;

	if (fn == null) {
		delete self.$events[name];
		return self;
	}

	var events = self.$events[name];
	if (events) {
		events = events.remove(n => n === fn);
		if (events.length)
			self.$events[name] = events;
		else
			delete self.$events[name];
	}

	return self;
};

EventEmitter2.extend = function(obj) {
	if (!obj.$events)
		obj.$events = {};
	obj.emit = EventEmitter2.prototype.emit;
	obj.on = EventEmitter2.prototype.on;
	obj.once = EventEmitter2.prototype.once;
	obj.off = EventEmitter2.prototype.off;
};

exports.EventEmitter2 = EventEmitter2;

function Chunker(name, max) {
	this.name = name;
	this.max = max || 50;
	this.index = 0;
	this.filename = '{0}-'.format(name);
	this.stack = [];
	this.flushing = 0;
	this.pages = 0;
	this.count = 0;
	this.percentage = 0;
	this.autoremove = true;
	this.compress = true;
	this.filename = F.path.tmp(this.filename);
}

const CHP = Chunker.prototype;

CHP.append = CHP.write = function(obj) {

	var self = this;
	self.stack.push(obj);

	var tmp = self.stack.length;
	if (tmp >= self.max) {

		self.flushing++;
		self.pages++;
		self.count += tmp;

		var index = (self.index++);

		if (self.compress) {
			F.Zlib.deflate(Buffer.from(JSON.stringify(self.stack), 'utf8'), function(err, buffer) {
				F.Fs.writeFile(self.filename + index + '.chunker', buffer, () => self.flushing--);
			});
		} else
			F.Fs.writeFile(self.filename + index + '.chunker', JSON.stringify(self.stack), () => self.flushing--);

		self.stack = [];
	}

	return self;
};

CHP.end = function() {
	var self = this;
	var tmp = self.stack.length;
	if (tmp) {
		self.flushing++;
		self.pages++;
		self.count += tmp;

		var index = (self.index++);

		if (self.compress) {
			F.Zlib.deflate(Buffer.from(JSON.stringify(self.stack), 'utf8'), function(err, buffer) {
				F.Fs.writeFile(self.filename + index + '.chunker', buffer, () => self.flushing--);
			});
		} else
			F.Fs.writeFile(self.filename + index + '.chunker', JSON.stringify(self.stack), () => self.flushing--);

		self.stack = [];
	}

	return self;
};

CHP.each = function(onItem, onEnd, indexer) {

	var self = this;

	if (indexer == null) {
		self.percentage = 0;
		indexer = 0;
	}

	if (indexer >= self.index)
		return onEnd && onEnd();

	self.read(indexer++, function(err, items) {
		self.percentage = Math.ceil((indexer / self.pages) * 100);
		onItem(items, () => self.each(onItem, onEnd, indexer), indexer - 1);
	});

	return self;
};

CHP.read = function(index, callback) {
	var self = this;

	if (self.flushing) {
		self.flushing_timeout = setTimeout(() => self.read(index, callback), 300);
		return;
	}

	var filename = self.filename + index + '.chunker';

	F.Fs.readFile(filename, function(err, data) {

		if (err) {
			callback(null, EMPTYARRAY);
			return;
		}

		if (self.compress) {
			F.Zlib.inflate(data, function(err, data) {
				if (err) {
					callback(null, EMPTYARRAY);
				} else {
					self.autoremove && F.Fs.unlink(filename, NOOP);
					callback(null, data.toString('utf8').parseJSON(true));
				}
			});
		} else {
			self.autoremove && F.Fs.unlink(filename, NOOP);
			callback(null, data.toString('utf8').parseJSON(true));
		}
	});

	return self;
};

CHP.clear = function() {
	var files = [];
	for (var i = 0; i < this.index; i++)
		files.push(this.filename + i + '.chunker');
	files.wait((filename, next) => F.Fs.unlink(filename, next));
	return this;
};

CHP.destroy = function() {
	this.clear();
	this.indexer = 0;
	this.flushing = 0;
	clearTimeout(this.flushing_timeout);
	this.stack = null;
	return this;
};

exports.chunker = function(name, max) {
	return new Chunker(name, max);
};

exports.Chunker = Chunker;

exports.wait = function(validator, callback, timeout = 5000, interval = 500) {

	if (!callback)
		return new Promise((resolve, reject) => exports.wait(validator, err => err ? reject(err) : resolve(), timeout, interval));

	if (validator() === true)
		return callback(null, true);

	var id_timeout = null;
	var id_interval = setInterval(function() {

		if (validator() === true) {
			clearInterval(id_interval);
			clearTimeout(id_timeout);
			callback && callback(null, true);
		}

	}, interval || 500);

	id_timeout = setTimeout(function() {
		clearInterval(id_interval);
		callback && callback(new Error('Timeout'), false);
	}, timeout || 5000);

};

// Author: Peter Širka
// License: MIT
function MultipartParser(multipart, stream, callback) {

	if (UPLOADINDEXER > 9999999999)
		UPLOADINDEXER = 1;

	var self = this;

	self.buffer = null;
	self.header = Buffer.from(multipart, 'ascii');
	self.length = self.header.length;
	self.tmp = F.path.tmp((F.clusterid || '') + 'upload_');

	// 0: nothing
	// 1: head
	// 2: data
	// 3: file
	self.step = 0;

	// Meta data
	self.prevsize = 0;
	self.sizes = { total: 0, files: 0, data: 0, parts: 0 };
	self.limits = { total: 0, files: 0, data: 0, parts: 0 };
	self.current = {};
	self.body = {};
	self.files = [];
	self.size = 0;

	self.ondata = function(chunk) {

		// if (!self.size)
		// 	chunk = chunk.slice(4);

		self.size += chunk.length;

		if (self.buffer) {
			CONCAT[0] = self.buffer;
			CONCAT[1] = chunk;
			self.buffer = Buffer.concat(CONCAT);
			self.parse(1);
		} else {
			self.buffer = chunk;
			self.parse(0);
		}
	};

	self.onend = function() {
		self.isend = true;
		self.checkready();
	};

	self.onclose = () => self.free('3: Request closed');
	self.callback = callback;
	self.stream = stream;
	self.stream.on('data', self.ondata);
	self.stream.on('end', self.onend);
	self.stream.on('error', self.onclose);
	self.stream.on('abort', self.onclose);
	self.stream.on('aborted', self.onclose);
}

MultipartParser.prototype.custom = function(check, callback) {
	this.$custom = { check: check, data: callback };
	return this;
};

MultipartParser.prototype.free = function(err) {

	var self = this;

	if (!self.stream)
		return;

	self.stream.removeListener('data', self.ondata);
	self.stream.removeListener('end', self.onend);
	self.stream.removeListener('error', self.onclose);
	self.stream.removeListener('abort', self.onclose);
	self.stream.removeListener('aborted', self.onclose);
	self.current.stream && self.current.stream.end();
	self.stream = null;
	self.buffer = null;
	self.callback && self.callback(err, self);
};

MultipartParser.prototype.parse = function(type) {
	var self = this;
	if (self.buffer.length) {
		switch (self.step) {
			case 0: // no data, tries to parse meta
				self.parse_meta(type);
				break;
			case 1: // part found
				self.parse_head();
				break;
			case 2: // part data
				self.parse_data();
				break;
			case 3: // part file
				self.parse_file();
				break;
			case 4: // custom
				self.parse_custom();
				break;
			case 9: // skip
				self.parse_skip();
				break;
		}
	}
};

MultipartParser.prototype.parse_meta = function(type) {

	var self = this;

	var fromindex = type === 1 ? (self.buffer.length - self.header.length) : 0;
	if (fromindex < 0)
		fromindex = 0;

	var index = type === 2 ? 0 : self.buffer.indexOf(self.header, fromindex);
	if (index === -1)
		return;

	// Is end?
	if (self.buffer[index + self.length - 1] === 45) {
		self.current.stream && self.current.stream.end();
		self.current.stream = null;
		return;
	}

	self.sizes.parts++;
	if (self.limits.parts && self.sizes.parts > self.limits.parts) {
		self.kill('1: Count of parts is too large');
		return;
	}

	self.buffer = self.buffer.slice(self.length + 2);
	self.step = 1;
	self.parse();

};

MultipartParser.prototype.kill = function(err) {
	this.free(err);
};

var multipartfileready = function() {
	this.$mpfile.ready = true;
	this.$mpfile = null;
	this.$mpinstance.checkready();
	this.$mpinstance = null;
};

MultipartParser.prototype.checkready = function() {

	var self = this;

	if (!self.stream || !self.isend)
		return;

	for (var i = 0; i < self.files.length; i++) {
		if (!self.files[i].ready)
			return;
	}

	self.free();
};

MultipartParser.prototype.parse_head = function() {

	var self = this;
	var index = self.buffer.indexOf(HEADEREND);

	if (index === -1)
		return;

	var header = self.buffer.slice(0, index).toString('utf8');
	var m = header.match(REG_HEADERPARSER);

	if (!m) {
		self.kill('7:');
		return;
	}

	if (self.$custom) {
		self.current.file = null;
		self.buffer = self.buffer.slice(index + HEADEREND.length);
		self.current.size = 0;
		if (self.$custom.check(header, m))
			self.step = 4;
		else
			self.step = 9; // skip
		self.parse();
		return;
	}

	var isfile = false;

	self.current.ext = null;
	self.current.filename = null;
	self.current.type = null;
	self.current.name = '';

	for (var i = 0; i < m.length; i++) {
		var str = m[i];
		switch (str.substring(0, 4).toLowerCase()) {
			case 'name':
				self.current.name = str.substring(6, str.length - 1).replace(REG_EMPTYBUFFER_TEST, '');
				break;
			case 'file':
				isfile = true;
				self.current.filename = str.substring(10, str.length - 1).replace(REG_EMPTYBUFFER_TEST, '');
				var tmp = self.current.filename.lastIndexOf('.');
				if (tmp !== -1)
					self.current.ext = self.current.filename.substring(tmp + 1);
				break;
			case 'cont':
				self.current.type = str.substring(14).trim().replace(REG_EMPTYBUFFER_TEST, '');
				break;
		}
	}

	if (!self.current.name || (isfile && (!self.current.filename || !self.current.type))) {
		self.kill('2: Invalid part header');
		return;
	}

	self.current.size = 0;

	if (isfile) {

		if (self.current.type) {

			self.current.width = 0;
			self.current.height = 0;
			self.current.header = null;
			self.current.measure = null;

			if (!self.skipcheck) {
				switch (self.current.type) {
					case 'image/svg+xml':
					case 'image/svg':
						self.current.header = REG_SVG;
						self.current.measure = 'measureSVG';
						break;
					case 'image/jpeg':
					case 'image/jpg':
						self.current.header = REG_JPG;
						self.current.measure = 'measureJPG';
						break;
					case 'image/png':
						self.current.header = 'png';
						self.current.measure = 'measurePNG';
						break;
					case 'image/gif':
						self.current.header = 'gif';
						self.current.measure = 'measureGIF';
						break;
					case 'image/webp':
						self.current.header = REG_WEBP;
						self.current.measure = 'measureWEBP';
						break;
					case 'image/vnd.adobe.photoshop':
						self.current.header = 'bps';
						self.current.measure = 'measurePSD';
						break;
					case 'image/bmp':
						self.current.header = 'bm';
						self.current.measure = 'measureBMP';
						break;
					case 'application/zip':
						self.current.header = 'pk';
						break;
					case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
					case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
						self.current.header = 'office';
						break;
					case 'application/pdf':
						self.current.header = 'pdf';
						break;
					case 'video/mp4':
						self.current.header = 'ftyp';
						break;
					case 'image/heic':
					case 'image/heif':
						self.current.header = 'heic';
						break;
					case 'application/x-rar-compressed':
						self.current.header = 'rar';
						break;
					case 'application/x-7z-compressed':
						self.current.header = '7z';
						break;
					case 'audio/mpeg':
						self.current.header = 'id';
						break;
					case 'application/ogg':
						self.current.header = 'ogg';
						break;
				}
			}
		}

		if (self.current.stream) {
			self.current.stream.end();
			self.current.stream = null;
		}

		self.current.path = self.tmp + (UPLOADINDEXER++) + '.bin';
		F.stats.performance.open++;
		self.current.stream = F.Fs.createWriteStream(self.current.path);
		var file = { path: self.current.path, name: self.current.name, filename: self.current.filename, size: 0, type: self.current.type, width: 0, height: 0 };
		self.current.file = file;
		self.current.fileheader = Buffer.alloc(0);
		self.current.stream.$mpfile = file;
		self.current.stream.$mpinstance = self;
		self.current.stream.on('close', multipartfileready);

	} else
		self.current.file = null;

	self.buffer = self.buffer.slice(index + HEADEREND.length);
	self.step = isfile ? 3 : 2;
	self.current.size = 0;
	self.parse();
};

MultipartParser.prototype.parse_meta_check = function() {

	var self = this;

	if (self.current.header) {

		var isinvalid = true;

		if (self.current.header === 'office') {
			var hex = self.buffer.toString('hex', 0, 3);
			isinvalid = hex !== 'd0cf11' && hex !== '504b03';
		} else {
			var check = '';
			for (var i = 0; i < 30; i++) {
				var c = self.buffer[i];
				if (c == null)
					break;
				if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
					if (c < 90)
						c += 32;
					check += String.fromCharCode(c);
				}
			}
			isinvalid = typeof(self.current.header) === 'string' ? check.indexOf(self.current.header) === -1 : self.current.header.test(check) !== true;
		}

		if (isinvalid) {
			// Invalid file
			self.kill('3: Invalid file data');
			return true;
		}

		self.current.header = null;
	}

	if (self.current.measure) {
		var tmp = F.TImages[self.current.measure](self.buffer);
		if (tmp) {
			self.current.file.width = tmp.width;
			self.current.file.height = tmp.height;
		}
		self.current.measure = null;
	}

	self.current.fileheader = null;
};

MultipartParser.prototype.parse_file = function() {

	var self = this;
	var index = self.buffer.indexOf(self.header);

	if (self.current.fileheader) {
		self.current.fileheader = Buffer.concat([self.current.fileheader, self.buffer.length > 100 ? self.buffer.slice(0, 100) : self.buffer]);
		if (self.current.fileheader.length > 60) {
			if (self.parse_meta_check())
				return;
		}
	}

	if (index !== -1) {

		self.current.size += index - 4;
		self.current.file.size += index - 4;
		self.sizes.total += index - 4;
		self.sizes.files += index - 4;

		if (self.current.fileheader) {
			if (self.parse_meta_check())
				return;
		}

		if (self.limits.files && self.sizes.files > self.limits.files) {
			self.kill('4: File body is too large');
			return;
		}

		if (self.limits.total && self.sizes.total > self.limits.total) {
			self.kill('6: Stream is too large');
			return;
		}

		var data = self.buffer.slice(0, index - 4);
		self.current.stream.end(data);
		self.current.stream = null;
		self.files.push(self.current.file);
		self.buffer = self.buffer.slice(index);
		self.current.file = null;
		self.prevsize = 0;
		self.step = 0;
		self.parse(2);

	} else {

		let length = self.buffer.length;
		self.current.size += length;
		self.current.file.size += length;
		self.sizes.total += length;
		self.sizes.files += length;

		if (self.limits.files && self.sizes.files > self.limits.files) {
			self.kill('4: File body is too large');
			return;
		}

		if (self.limits.total && self.sizes.total > self.limits.total) {
			self.kill('6: Stream is too large');
			return;
		}

		self.current.stream.write(self.buffer);
		self.buffer = null;
	}
};

MultipartParser.prototype.parse_data = function() {

	var self = this;
	let beg = (self.prevsize - ((self.header.length * 1.3) >> 0)) < 0 ? 0 : (self.prevsize - self.header.length);
	let index = self.buffer.indexOf(self.header, beg);

	if (index !== -1) {

		self.sizes.total += index - 2;
		self.sizes.data += index - 2;

		if (self.limits.data && self.sizes.data > self.limits.data) {
			self.kill('5: Data are too large');
			return;
		}

		if (self.limits.total && self.sizes.total > self.limits.total) {
			self.kill('6: Stream is too large');
			return;
		}

		var val = self.buffer.slice(0, index - 4).toString('utf8');

		if (REG_EMPTYBUFFER_TEST.test(val))
			val = val.replace(REG_EMPTYBUFFER, '');

		self.body[self.current.name] = val;
		self.buffer = self.buffer.slice(index);
		self.prevsize = 0;
		self.step = 0;
		self.parse(true);

	} else {

		let length = self.buffer.length;
		self.current.size += length;
		self.prevsize = length;

		if (self.limits.data && self.current.size > self.limits.data) {
			self.kill('5: Data are too large');
			return;
		}

		if (self.limits.total && (self.sizes.total + self.current.size) > self.limits.total) {
			self.kill('6: Stream is too large');
			return;
		}

	}
};

MultipartParser.prototype.parse_custom = function() {

	var self = this;

	let length = self.buffer.length;
	let beg = (self.prevsize - ((self.header.length * 1.3) >> 0)) < 0 ? 0 : (self.prevsize - self.header.length);
	let index = self.buffer.indexOf(self.header, beg);

	if (index !== -1) {
		self.sizes.total += index - 2;
		self.sizes.data += index - 2;
		self.prevsize = 0;
		let val = self.buffer.slice(0, index - 4);
		self.$custom.data(val);
		self.buffer = self.buffer.slice(index);
		self.step = 0;
		self.parse(2);
	} else {
		self.current.size += length;
		self.prevsize = length;
	}
};

MultipartParser.prototype.parse_skip = function() {
	var self = this;
	var index = self.buffer.indexOf(self.header);
	if (index !== -1) {
		self.sizes.total += index - 2;
		self.sizes.data += index - 2;
		self.buffer = self.buffer.slice(index);
		self.current.file = null;
		self.prevsize = 0;
		self.step = 0;
		self.parse(2);
	} else {
		self.current.size += self.buffer.length;
		self.buffer = null;
	}
};

exports.multipartparser = function(multipart, stream, callback) {
	return new MultipartParser(multipart, stream, callback);
};

exports.jsonschema = function(value, throwerr) {
	let type = typeof(value);
	if (type === 'string') {
		if (value[0] === '@') {
			let name = value.substring(1);
			let schema = F.jsonschemas[name];
			if (!schema && throwerr)
				throw new Error('JSON Schema "{0}" not found'.format(name));
			return schema;
		} else
			return value.toJSONSchema();
	}
	return value;
};

exports.querify = function(url, obj) {

	if (typeof(url) !== 'string') {
		obj = url;
		url = '';
	}

	if (!obj)
		return url;

	var arg = [];
	var keys = Object.keys(obj);

	for (let i = 0; i < keys.length; i++) {

		let key = keys[i];
		let val = obj[key];
		if (val != null) {

			if (val instanceof Date)
				val = val.toISOString();
			else if (val instanceof Array)
				val = val.join(',');

			val = val + '';
			val && arg.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
		}
	}

	if (url) {

		if (!arg.length)
			return url;

		let arr = url.split(' ');
		let index = QUERIFYMETHODS[arr[0]] ? 1 : 0;
		arr[index] += (arr[index].indexOf('?') === -1 ? '?' : '&') + arg.join('&');
		return arr.join(' ');
	}

	return arg.length ? ('?' + arg.join('&')) : '';
};

exports.connect = function(opt, callback) {

	// opt.secure {Boolean}
	// opt.host
	// opt.port
	// opt.timeout

	var opt = CLONE(opt);
	var tls = opt.tls;
	var meta = {};
	var timeout;

	meta.opt = opt;
	meta.tls = tls;

	delete opt.tls;

	var close = function() {

		if (meta.socket1) {
			meta.socket1.removeAllListeners();
			meta.socket1.end();
			meta.socket1.destroy();
			meta.socket1 = null;
		}

		if (meta.socket2) {
			meta.socket2.removeAllListeners();
			meta.socket2.end();
			meta.socket2.destroy();
			meta.socket2 = null;
		}

	};

	var error = function(err) {
		callback && callback(err);
		callback = null;
		close();
	};

	if (opt.timeout)
		timeout = setTimeout(() => error(new Error('Timeout')), opt.timeout);

	meta.destroy = meta.close = close;
	meta.write = function(data) {
		meta.socket.write(data);
	};

	meta.ondata = function(fn) {
		meta.socket.on('data', fn);
	};

	meta.onend = function(fn) {
		meta.socket.on('destroy', fn);
	};

	var done = function() {

		if (!callback)
			return;

		if (opt.tls) {
			if (!meta.socket2) {
				tls.socket = meta.socket1;
				meta.socket2 = F.Tls.connect(tls, done);
				meta.socket2.on('error', error);
				meta.socket2.on('clientError', error);
				return;
			}
		}

		meta.socket = meta.socket2 || meta.socket1;
		timeout && clearTimeout(timeout);
		timeout = null;
		callback && callback(null, meta);
		callback = null;
	};

	if (opt.secure)
		meta.socket1 = F.Tls.connect(opt, done);
	else
		meta.socket1 = F.Net.createConnection(opt.port, opt.host, done);

	meta.socket1.on('error', error);
	meta.socket1.on('clientError', error);
};

String.prototype.toJSONSchema = String.prototype.parseSchema = function(name, url) {

	var obj = {};
	var p = (url || CONF.url || 'https://schemas.totaljs.com/');

	if (p[p.length - 1] !== '/')
		p += '/';

	obj.$id = p + (name || (HASH(this) + '')) + '.json';
	obj.$schema = 'https://json-schema.org/draft/2020-12/schema';
	obj.type = 'object';
	obj.properties = {};

	var str = this;
	var nestedtypes = [];

	str = str.replace(/\[.*?\]/g, function(text) {
		if (text.substring(1, 2) === '@')
			return text;
		return '[#' + (nestedtypes.push(text.substring(1, text.length - 1)) - 1) + ']';
	});

	str = str.replace(/\{.*?\}/g, function(text) {
		if (text.substring(1, 2) === '@')
			return text;
		return '{#' + (nestedtypes.push(text.substring(1, text.length - 1)) - 1) + '}';
	});

	var prop = str.split(/,|\n/);
	var required = [];

	for (var i = 0; i < prop.length; i++) {

		var arr = prop[i].split(':').trim();
		var tmp = null;

		if (arr[0][0] === '!' || arr[0][0] === '*') {
			// required
			arr[0] = arr[0].substring(1);
			required.push(arr[0]);
		}

		var type = (arr[1] || 'string').trim();
		// var type = typename.toLowerCase().trim();
		var size = 0;
		var isarr = type[0] === '[';
		if (isarr)
			type = type.substring(1, type.length - 1);

		var nestedschema = '';
		var isenum = type[0] === '{';

		if (isenum) {
			tmp = type.substring(2, type.length - 1);
			tmp = nestedtypes[+tmp];

			// Nested schema
			if (tmp.includes(':')) {
				nestedschema = tmp.toJSONSchema();
				type = 'object';
			} else {
				tmp = tmp.split(/;|\|/).trim();
				type = 'enum';
			}
		}

		var index = type.indexOf('(');
		if (index !== -1) {
			size = +type.substring(index + 1, type.length - 1).trim();
			type = type.substring(0, index);
		}

		if (type[0] === '#') {

			type = nestedtypes[+type.substring(1)];

			if (type[0] === '{') {
				isenum = true;
				type = type.substring(1, type.length - 1);
			} else if ((/:|,|\n/).test(type)) {
				isenum = true;
			} else {
				index = type.indexOf('(');
				if (index !== -1) {
					size = +type.substring(index + 1, type.length - 1).trim();
					type = type.substring(0, index);
				}
			}

			// Is nested object? {...}
			if (isenum) {
				nestedschema = type.toJSONSchema();
				type = 'object';
			} else
				type = type.toLowerCase();

		} else if (type[0] === '@') {
			nestedschema = type.substring(1);
			type = 'object';
		}

		switch (type.toLowerCase()) {
			case 'string':
			case 'uid':
			case 'guid':
			case 'email':
			case 'phone':
			case 'name':
			case 'url':
			case 'zip':
			case 'lower':
			case 'upper':
			case 'lowercase':
			case 'uppercase':
			case 'capitalize':
			case 'capitalize2':
			case 'color':
			case 'icon':
			case 'base64':
			case 'safestring':
			case 'search':
			case 'text':
				tmp = {};
				if (isarr) {
					tmp.type = 'array';
					tmp.items = { type: 'string', subtype: type === 'text' ? undefined : type };
					if (size)
						tmp.items.maxLength = size;
				} else {
					tmp.type = 'string';
					if (type !== tmp.type)
						tmp.subtype = type;
					if (size)
						tmp.maxLength = size;
				}
				break;
			case 'number':
			case 'number2':
			case 'float':
			case 'decimal':
			case 'int':
			case 'integer':
			case 'smallint':
			case 'tinyint':

				if (type === 'integer')
					type = 'int';

				tmp = {};
				if (isarr) {
					tmp.type = 'array';
					tmp.items = { type: 'number', subtype: type === 'number' ? undefined : type };
				} else {
					tmp.type = 'number';
					if (type !== 'number')
						tmp.subtype = type;
				}

				break;
			case 'bool':
			case 'boolean':
				tmp = {};
				if (isarr) {
					tmp.type = 'array';
					tmp.items = { type: 'boolean' };
				} else
					tmp.type = 'boolean';
				break;
			case 'date':
				tmp = {};
				if (isarr) {
					tmp.type = 'array';
					tmp.items = { type: 'date' };
				} else
					tmp.type = 'date';
				break;
			case 'object':
				tmp = {};

				if (isarr) {
					tmp.type = 'array';
					tmp.items = { type: 'object', $ref: nestedschema };
				} else {
					tmp.type = 'object';
					tmp.$ref = nestedschema;
				}

				break;
			case 'enum':
				tmp = { enum: tmp, type: 'string' };
				break;
			default:
				tmp = {};
				if (isarr) {
					tmp.type = 'array';
					tmp.items = { type: 'string' };
				} else
					tmp.type = 'string';
				break;
		}
		if (tmp)
			obj.properties[arr[0].trim()] = tmp;
	}

	if (required.length)
		obj.required = required;

	obj.transform = exports.jsonschematransform;

	if (name)
		F.jsonschemas[name] = obj;

	return obj;
};

exports.jsonschematransform = function(value, partial, error, path) {

	var self = this;

	if (!error)
		error = new ErrorBuilder();

	var response = null;

	if (partial) {

		var tmp = {};
		var schema = {};

		schema.properties = {};
		schema.required = [];

		for (let key in value) {
			let prop = self.properties[key];
			if (prop) {
				tmp[key] = value[key];
				schema.properties[key] = prop;
				if (self.required && self.required.includes(key))
					schema.required.push(key);
			}
		}

		schema.$id = self.$id;
		schema.$schema = self.$schema;
		schema.type = self.type;
		response = F.TJSONSchema.transform(schema, error, tmp, false, path);

	} else
		response = F.TJSONSchema.transform(self, error, value, false, path);

	return { error: error.items.length ? error : null, response: response };
};

exports.set = function(obj, path, value) {
	var cachekey = 'uset' + path;

	if (F.temporary.utils[cachekey])
		return F.temporary.utils[cachekey](obj, value);

	if ((/__proto__|constructor|prototype|eval|function|\*|\+|;|\s|\(|\)|!/).test(path))
		return value;

	var arr = parsepath(path);
	var builder = [];

	for (var i = 0; i < arr.length - 1; i++) {
		var type = arr[i + 1] ? (REG_ISARR.test(arr[i + 1]) ? '[]' : '{}') : '{}';
		var p = 'w' + (arr[i][0] === '[' ? '' : '.') + arr[i];
		builder.push('if(typeof(' + p + ')!==\'object\'||' + p + '==null)' + p + '=' + type + ';');
	}

	var v = arr[arr.length - 1];
	var ispush = v.lastIndexOf('[]') !== -1;
	var a = builder.join(';') + ';var v=typeof(a)===\'function\'?a(F.TUtils.get(b)):a;w' + (v[0] === '[' ? '' : '.') + (ispush ? v.replace(REG_REPLACEARR, '.push(v)') : (v + '=v')) + ';return v';

	var fn = new Function('w', 'a', 'b', a);
	F.temporary.utils[cachekey] = fn;
	return fn(obj, value, path);
};

exports.get = function(obj, path) {

	var cachekey = 'uget' + path;

	if (F.temporary.utils[cachekey])
		return F.temporary.utils[cachekey](obj);

	if ((/__proto__|constructor|prototype|eval|function|\*|\+|;|\s|\(|\)|!/).test(path))
		return;

	var arr = parsepath(path);
	var builder = [];

	for (var i = 0, length = arr.length - 1; i < length; i++)
		builder.push('if(!w' + (!arr[i] || arr[i][0] === '[' ? '' : '.') + arr[i] + ')return');

	var v = arr[arr.length - 1];
	var fn = (new Function('w', builder.join(';') + ';return w' + (v[0] === '[' ? '' : '.') + v));
	F.temporary.utils[cachekey] = fn;
	return fn(obj);
};

function parsepath(path) {

	var arr = path.split('.');
	var builder = [];
	var all = [];

	for (var i = 0; i < arr.length; i++) {
		var p = arr[i];
		var index = p.indexOf('[');
		if (index === -1) {
			if (p.indexOf('-') === -1) {
				all.push(p);
				builder.push(all.join('.'));
			} else {
				var a = all.splice(all.length - 1);
				all.push(a + '[\'' + p + '\']');
				builder.push(all.join('.'));
			}
		} else {
			if (p.indexOf('-') === -1) {
				all.push(p.substring(0, index));
				builder.push(all.join('.'));
				all.splice(all.length - 1);
				all.push(p);
				builder.push(all.join('.'));
			} else {
				all.push('[\'' + p.substring(0, index) + '\']');
				builder.push(all.join(''));
				all.push(p.substring(index));
				builder.push(all.join(''));
			}
		}
	}

	return builder;
}

exports.decodeURIComponent = function(value) {
	try
	{
		return decodeURIComponent(value);
	} catch (e) {
		return value;
	}
};

// Internal for HTTP Web/Files/WebSocket routes
exports.parseURI2 = function(url) {

	let index = url.indexOf('?');
	let search = '';

	if (index !== -1) {
		search = url.substring(index + 1);
		url = url.substring(0, index);
	}

	url = url.replace(REG_DOUBLESLASH, '/');
	index = url.lastIndexOf('.'); // max. 10 chars for extension

	if (index == -1 && url[url.length - 1] !== '/')
		url += '/';

	let split = null;

	if (url === '/') {
		split = [];
	} else {
		if (index == -1)
			split = url.substring(1, url.length - 1).split('/');
		else
			split = url.split('/').slice(1);
	}

	// Stops path travelsation outside of "public" directory
	if (index != -1)
		url = url.replace(REG_TRAVELSE, '');

	return { key: url.toLowerCase(), pathname: url, search: search, file: index != -1, ext: index == -1 ? '' : url.substring(index + 1), split: split };
};

function destroyStreamopen() {
	if (typeof(this.fd) === 'number')
		this.close();
}

// MIT
// Copyright (c) 2013 Jonathan Ong <me@jongleberry.com>
// Copyright (c) 2014 Douglas Christopher Wilson <doug@somethingdoug.com>
exports.destroystream = function(stream) {

	if (stream instanceof F.Fs.ReadStream) {
		stream.destroy();
		typeof(stream.close) === 'function' && stream.on('open', destroyStreamopen);
	} else if (stream instanceof F.Stream)
		typeof(stream.destroy) === 'function' && stream.destroy();

	if (stream.$totalfd) {
		F.Fs.close(stream.$totalfd, NOOP);
		stream.$totalfd = null;
	}

	return stream;
};

// MIT
// Copyright (c) 2013 Jonathan Ong <me@jongleberry.com>
// Copyright (c) 2014 Douglas Christopher Wilson <doug@somethingdoug.com>
exports.onfinished = function(stream, fn) {

	if (stream.$onFinished) {
		fn && fn();
		fn = null;
		return;
	}

	if (stream.$onFinishedQueue) {
		if (stream.$onFinishedQueue instanceof Array)
			stream.$onFinishedQueue.push(fn);
		else
			stream.$onFinishedQueue = [stream.$onFinishedQueue, fn];
		return;
	} else
		stream.$onFinishedQueue = fn;

	var callback = function() {
		!stream.$onFinished && (stream.$onFinished = true);
		if (stream.$onFinishedQueue instanceof Array) {
			while (stream.$onFinishedQueue.length)
				stream.$onFinishedQueue.shift()();
			stream.$onFinishedQueue = null;
		} else if (stream.$onFinishedQueue) {
			stream.$onFinishedQueue();
			stream.$onFinishedQueue = null;
		}
	};

	if (isFinished(stream)) {
		setImmediate(callback);
	} else {

		if (stream.socket) {
			if (!stream.socket.$totalstream) {
				stream.socket.$totalstream = stream;
				if (stream.socket.prependListener) {
					stream.socket.prependListener('error', callback);
					stream.socket.prependListener('close', callback);
				} else {
					stream.socket.on('error', callback);
					stream.socket.on('close', callback);
				}
			}
		}

		if (stream.prependListener) {
			stream.prependListener('error', callback);
			stream.prependListener('end', callback);
			stream.prependListener('close', callback);
			stream.prependListener('aborted', callback);
			stream.prependListener('finish', callback);
		} else {
			stream.on('error', callback);
			stream.on('end', callback);
			stream.on('close', callback);
			stream.on('aborted', callback);
			stream.on('finish', callback);
		}
	}
};

exports.uidr = function() {

	var builder = '';
	var sum = 0;

	for (var i = 0; i < 10; i++) {
		var c;

		if (i === 9) {
			c = F.internal.uidc;
		} else {
			let index = Math.floor(Math.random() * RANDOM_TEXT.length);
			c = RANDOM_TEXT[index];
		}

		if (c.charCodeAt(0) < 91)
			sum++;

		builder += c;
	}

	return builder + RANDOM_STRING[sum] + 'r'; // "r" version
};

function isFinished(stream) {

	// Response & Request
	if (stream.socket) {
		if (stream.writable && (!stream.socket._writableState || stream.socket._writableState.finished || stream.socket._writableState.destroyed))
			return true;
		if (stream.readable && (!stream.socket._readableState|| stream.socket._writableState.ended || stream.socket._readableState.destroyed))
			return true;
		return false;
	}

	if (stream._readableState && (stream._readableState.ended || stream._readableState.destroyed))
		return true;

	if (stream._writableState && (stream._writableState.finished || stream._writableState.destroyed))
		return true;

	return false;
}