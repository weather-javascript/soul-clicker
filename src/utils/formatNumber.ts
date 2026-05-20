import Decimal from 'decimal.js';

// サフィックス表示（K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc ...）
const SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc',
  'Vg', 'UVg', 'DVg', 'TVg', 'QaVg', 'QiVg', 'SxVg', 'SpVg', 'OcVg', 'NoVg',
  'Tg', 'UTg',
];

export function formatNumber(value: Decimal): string {
  if (value.lt(1000)) {
    // 1000未満はそのまま整数表示
    return value.toFixed(0);
  }

  // 何桁か計算してサフィックスを選ぶ
  const exponent = Math.floor(value.log(10).toNumber());
  const suffixIndex = Math.floor(exponent / 3);

  if (suffixIndex >= SUFFIXES.length) {
    // サフィックス表が尽きたら指数表記
    return value.toExponential(2);
  }

  const divisor = new Decimal(10).pow(suffixIndex * 3);
  const divided = value.div(divisor);

  return `${divided.toFixed(2)}${SUFFIXES[suffixIndex]}`;
}

export function formatSps(sps: Decimal): string {
  return `${formatNumber(sps)}/秒`;
}