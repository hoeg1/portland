export default class Rand {
  /**
   * @constructor
   * @param {number} [seed]   適当な整数
   */
  constructor(seed = Math.floor(Math.random() * 987654321) + 1) {
    this._seed = seed | 0;
    this._rnd_x = 123456789;
    this._rnd_y = 362436069;
    this._rnd_z = 521288629;
    this._rnd_w = this._seed;
  }

  /**
   * @return {number}    シードを返す
   */
  get seed() { return this._seed; }

  /**
   * @return {string}    '0x'から始まる, シード値を１６進数にした文字列。
   */
  hex_seed() { return `0x${this._seed.toString(16).toUpperCase()}`; }

  /**
   * @return {number} ０より大きい 32bit 整数の乱数
   */
  next_int() {
    const t = this._rnd_x ^ (this._rnd_x << 11);
    this._rnd_x =  this._rnd_y;
    this._rnd_y =  this._rnd_z;
    this._rnd_z =  this._rnd_w;
    this._rnd_w = (this._rnd_w ^ (this._rnd_w >>> 19)) ^ (t ^ (t >>> 8));
    return this._rnd_w >>> 0;
  }

  /**
   * @param {number} n
   * @return {number} 0からｎ未満の整数乱数を返す
   */
  rand(n) {
    return this.next_int() % n;
  }

  /**
   * 破壊的なシャッフル
   * 破壊したくないなら shuffle([..ary])すればいい
   * @param {Array<any>} ary  順序を破壊される配列
   * @return {Array<any>} aryをソートした結果（引数と同じポインタ）
   */
  shuffle(ary) {
    for (let i = ary.length - 1; i > 0; --i) {
      const r = this.rand(i + 1);
      [ary[i], ary[r]] = [ary[r], ary[i]];
    }
    return ary;
  }

  /**
   * @return {number} 0.0~1.0 の 乱数
   */
  random() {
    return this.next_int() / 4294967296;
  }
}

