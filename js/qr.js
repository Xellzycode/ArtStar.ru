const QR_TOTAL_CODEWORDS = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

const QR_EC_CODEWORDS = {
  L: [7, 10, 15, 20, 26, 36, 40, 48, 60, 72],
  M: [10, 16, 26, 36, 48, 64, 72, 88, 110, 130],
};

const QR_EC_BLOCKS = {
  L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
};

const QR_EC_LEVEL_BITS = { L: 1, M: 0 };

const QR_ALIGNMENT = [
  [], [6, 18], [6, 22], [6, 26], [6, 30],
  [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
];

const QR_MASK_FNS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisTables() {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  if (!a || !b) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data, ecLength) {
  const gen = rsGenerator(ecLength);
  const remainder = new Uint8Array(ecLength);

  data.forEach((byte) => {
    const factor = byte ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[ecLength - 1] = 0;
    for (let i = 0; i < ecLength; i += 1) {
      remainder[i] ^= gfMul(gen[i + 1], factor);
    }
  });

  return [...remainder];
}

function qrDataCapacity(version, level) {
  return QR_TOTAL_CODEWORDS[version - 1] - QR_EC_CODEWORDS[level][version - 1];
}

function qrCountBits(version) {
  return version < 10 ? 8 : 16;
}

function qrPickVersion(byteLength, level) {
  for (let version = 1; version <= 10; version += 1) {
    const headerBytes = Math.ceil((4 + qrCountBits(version)) / 8);
    if (byteLength + headerBytes <= qrDataCapacity(version, level)) return version;
  }
  return 0;
}

function qrDataCodewords(bytes, version, level) {
  const capacity = qrDataCapacity(version, level) * 8;
  const bits = [];
  const push = (value, length) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >> i) & 1);
  };

  push(0b0100, 4);
  push(bytes.length, qrCountBits(version));
  bytes.forEach((byte) => push(byte, 8));
  push(0, Math.min(4, capacity - bits.length));
  while (bits.length % 8) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  }

  const padding = [0xec, 0x11];
  for (let i = 0; codewords.length < capacity / 8; i += 1) {
    codewords.push(padding[i % 2]);
  }

  return codewords;
}

function qrInterleave(bytes, version, level) {
  const data = qrDataCodewords(bytes, version, level);
  const blockCount = QR_EC_BLOCKS[level][version - 1];
  const ecPerBlock = QR_EC_CODEWORDS[level][version - 1] / blockCount;

  const shortLength = Math.floor(data.length / blockCount);
  const longBlocks = data.length % blockCount;

  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;

  for (let i = 0; i < blockCount; i += 1) {
    const length = shortLength + (i >= blockCount - longBlocks ? 1 : 0);
    const block = data.slice(offset, offset + length);
    offset += length;
    dataBlocks.push(block);
    ecBlocks.push(rsRemainder(block, ecPerBlock));
  }

  const result = [];
  const maxLength = shortLength + (longBlocks ? 1 : 0);
  for (let i = 0; i < maxLength; i += 1) {
    dataBlocks.forEach((block) => {
      if (i < block.length) result.push(block[i]);
    });
  }
  for (let i = 0; i < ecPerBlock; i += 1) {
    ecBlocks.forEach((block) => result.push(block[i]));
  }

  return result;
}

function qrDrawFunctionPatterns(modules, service, version) {
  const size = modules.length;

  const fill = (row, col, height, width, value) => {
    for (let r = row; r < row + height; r += 1) {
      for (let c = col; c < col + width; c += 1) {
        if (r < 0 || c < 0 || r >= size || c >= size) continue;
        modules[r][c] = value;
        service[r][c] = 1;
      }
    }
  };

  const finder = (row, col) => {
    fill(row - 1, col - 1, 9, 9, 0);
    fill(row, col, 7, 7, 1);
    fill(row + 1, col + 1, 5, 5, 0);
    fill(row + 2, col + 2, 3, 3, 1);
  };

  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  fill(8, 0, 1, 9, 0);
  fill(0, 8, 9, 1, 0);
  fill(8, size - 8, 1, 8, 0);
  fill(size - 8, 8, 8, 1, 0);

  for (let i = 8; i < size - 8; i += 1) {
    const value = i % 2 === 0 ? 1 : 0;
    fill(6, i, 1, 1, value);
    fill(i, 6, 1, 1, value);
  }

  const centers = QR_ALIGNMENT[version - 1];
  centers.forEach((row) => {
    centers.forEach((col) => {
      const nearFinder = (row <= 8 && col <= 8)
        || (row <= 8 && col >= size - 9)
        || (row >= size - 9 && col <= 8);
      if (nearFinder) return;
      fill(row - 2, col - 2, 5, 5, 1);
      fill(row - 1, col - 1, 3, 3, 0);
      fill(row, col, 1, 1, 1);
    });
  });

  if (version >= 7) {
    let remainder = version;
    for (let i = 0; i < 12; i += 1) {
      remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    }
    const bits = (version << 12) | remainder;

    for (let i = 0; i < 18; i += 1) {
      const bit = (bits >>> i) & 1;
      const far = size - 11 + (i % 3);
      const near = Math.floor(i / 3);
      fill(near, far, 1, 1, bit);
      fill(far, near, 1, 1, bit);
    }
  }
}

function qrDrawFormatBits(modules, level, mask) {
  const size = modules.length;
  const data = (QR_EC_LEVEL_BITS[level] << 3) | mask;

  let remainder = data;
  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  }
  const bits = (((data << 10) | remainder) ^ 0x5412) & 0x7fff;
  const bit = (i) => (bits >>> i) & 1;

  for (let i = 0; i <= 5; i += 1) modules[i][8] = bit(i);
  modules[7][8] = bit(6);
  modules[8][8] = bit(7);
  modules[8][7] = bit(8);
  for (let i = 9; i < 15; i += 1) modules[8][14 - i] = bit(i);

  for (let i = 0; i < 8; i += 1) modules[8][size - 1 - i] = bit(i);
  for (let i = 8; i < 15; i += 1) modules[size - 15 + i][8] = bit(i);

  modules[size - 8][8] = 1;
}

function qrPlaceCodewords(modules, service, codewords) {
  const size = modules.length;
  const totalBits = codewords.length * 8;
  let index = 0;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;

    for (let vertical = 0; vertical < size; vertical += 1) {
      for (let j = 0; j < 2; j += 1) {
        const col = right - j;
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? size - 1 - vertical : vertical;

        if (service[row][col] || index >= totalBits) continue;
        modules[row][col] = (codewords[index >> 3] >> (7 - (index & 7))) & 1;
        index += 1;
      }
    }
  }
}

function qrApplyMask(modules, service, mask) {
  const size = modules.length;
  const maskFn = QR_MASK_FNS[mask];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!service[row][col] && maskFn(row, col)) modules[row][col] ^= 1;
    }
  }
}

function qrPenalty(modules) {
  const size = modules.length;
  const FINDER = [1, 0, 1, 1, 1, 0, 1];
  let score = 0;

  const lineAt = (fixed, index, horizontal) => (horizontal ? modules[fixed][index] : modules[index][fixed]);

  for (let horizontal = 0; horizontal < 2; horizontal += 1) {
    for (let fixed = 0; fixed < size; fixed += 1) {
      let runLength = 1;

      for (let i = 1; i < size; i += 1) {
        if (lineAt(fixed, i, horizontal) === lineAt(fixed, i - 1, horizontal)) {
          runLength += 1;
          continue;
        }
        if (runLength >= 5) score += 3 + (runLength - 5);
        runLength = 1;
      }
      if (runLength >= 5) score += 3 + (runLength - 5);

      for (let i = 0; i + 6 < size; i += 1) {
        const matches = FINDER.every((value, k) => lineAt(fixed, i + k, horizontal) === value);
        if (!matches) continue;

        const clearBefore = [1, 2, 3, 4].every((k) => i - k < 0 || lineAt(fixed, i - k, horizontal) === 0);
        const clearAfter = [1, 2, 3, 4].every((k) => i + 6 + k >= size || lineAt(fixed, i + 6 + k, horizontal) === 0);
        if (clearBefore || clearAfter) score += 40;
      }
    }
  }

  let dark = 0;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      dark += modules[row][col];
      if (row + 1 >= size || col + 1 >= size) continue;
      const value = modules[row][col];
      if (modules[row][col + 1] === value && modules[row + 1][col] === value
        && modules[row + 1][col + 1] === value) {
        score += 3;
      }
    }
  }

  const deviation = Math.abs((dark * 100) / (size * size) - 50);
  score += Math.floor(deviation / 5) * 10;

  return score;
}

function qrEncode(text, options = {}) {
  const level = options.level === 'L' ? 'L' : 'M';
  const bytes = [...new TextEncoder().encode(String(text))];
  const version = qrPickVersion(bytes.length, level);
  if (!version) return null;

  const size = 17 + version * 4;
  const codewords = qrInterleave(bytes, version, level);

  const base = Array.from({ length: size }, () => new Uint8Array(size));
  const service = Array.from({ length: size }, () => new Uint8Array(size));
  qrDrawFunctionPatterns(base, service, version);
  qrPlaceCodewords(base, service, codewords);

  const build = (mask) => {
    const modules = base.map((row) => Uint8Array.from(row));
    qrApplyMask(modules, service, mask);
    qrDrawFormatBits(modules, level, mask);
    return modules;
  };

  if (Number.isInteger(options.mask)) {
    return { size, version, level, mask: options.mask, modules: build(options.mask) };
  }

  let best = null;
  for (let mask = 0; mask < 8; mask += 1) {
    const modules = build(mask);
    const penalty = qrPenalty(modules);
    if (!best || penalty < best.penalty) best = { modules, mask, penalty };
  }

  return { size, version, level, mask: best.mask, modules: best.modules };
}

function qrToSvg(text, options = {}) {
  const code = qrEncode(text, options);
  if (!code) return '';

  const quiet = options.quiet ?? 2;
  const side = code.size + quiet * 2;

  let path = '';
  for (let row = 0; row < code.size; row += 1) {
    for (let col = 0; col < code.size; col += 1) {
      if (code.modules[row][col]) path += `M${col + quiet} ${row + quiet}h1v1h-1z`;
    }
  }

  return `<svg class="qr-svg" viewBox="0 0 ${side} ${side}" role="img" aria-label="QR-код ссылки"
    shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
    <rect width="${side}" height="${side}" fill="${options.light || '#ffffff'}"/>
    <path d="${path}" fill="${options.dark || '#000000'}"/>
  </svg>`;
}

function qrToCanvas(text, options = {}) {
  const code = qrEncode(text, options);
  if (!code) return null;

  const quiet = options.quiet ?? 2;
  const scale = options.scale || 10;
  const side = (code.size + quiet * 2) * scale;

  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = options.light || '#ffffff';
  ctx.fillRect(0, 0, side, side);
  ctx.fillStyle = options.dark || '#000000';

  for (let row = 0; row < code.size; row += 1) {
    for (let col = 0; col < code.size; col += 1) {
      if (!code.modules[row][col]) continue;
      ctx.fillRect((col + quiet) * scale, (row + quiet) * scale, scale, scale);
    }
  }

  return canvas;
}

window.qrEncode = qrEncode;
window.qrToSvg = qrToSvg;
window.qrToCanvas = qrToCanvas;
