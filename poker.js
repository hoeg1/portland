"use strict";

///////////////////////////////////////////////////////////////////////////////
//
// Portland 用にポーカーの役を判定＆確率計算
//

export const popcount = function( bits ) {
  bits = (bits & 0x55555555) + (bits >> 1 & 0x55555555);
  bits = (bits & 0x33333333) + (bits >> 2 & 0x33333333);
  bits = (bits & 0x0f0f0f0f) + (bits >> 4 & 0x0f0f0f0f);
  bits = (bits & 0x00ff00ff) + (bits >> 8 & 0x00ff00ff);
  return (bits & 0x0000ffff) + (bits >>16 & 0x0000ffff);
};

export const ntz = x => {
  return popcount( (x & (-x)) - 1 );
};

/*
export const nlz = x => {
  let c = 0;
  if (x == 0) return 32;
  if (x & 0xffff0000) { x &= 0xffff0000; c |= 0x10; }
  if (x & 0xff00ff00) { x &= 0xff00ff00; c |= 0x08; }
  if (x & 0xf0f0f0f0) { x &= 0xf0f0f0f0; c |= 0x04; }
  if (x & 0xcccccccc) { x &= 0xcccccccc; c |= 0x02; }
  if (x & 0xaaaaaaaa) { c |= 0x01; }
  return c ^ 31;
};
*/

// 立っているビットを１ビットずつ見るジェネレータ 32bit
export const bit_loop = function*( bits ) {
  while (bits != 0) {
    const b = bits & -bits;
    yield b;
    bits &= ~b;
  }
};

///////////////////////////////////////////////////////////////////////////////
//
// 山札クラス (BigInt)
//
export class Pile {
  constructor(def = (1n << 52n) - 1n) {
    this.deck = def;
  }
  deal() {
    while (this.deck != 0n) {
      const rnd = Math.trunc(Math.random() * 52);
      const bit = 1n << BigInt(rnd);
      if ((bit & this.deck) != 0) {
        this.deck &= ~bit;
        return this.bit2card(bit);
      }
    }
  }
  bit2card(bit) {
    const pos = this.ntz(bit); // 0...51
    return {
      suit: pos &  3, // x % 4; 0bHCDS HCDS HCDS....
      rank: pos >> 2, // x / 4; 0bAAAA 2222 3333...
      bit:  bit
    };
  }
  // rank_map[13] ... 各ランクの残りスートをビットで表現したもの(最大0b1111)
  // rank_cnt[13] ... 各ランクの残り枚数
  // suit_map[4]  ... 各スートの残りランクをビットで表現したもの(13bit)
  // suit_cnt[4]  ... 各スートの残り枚数
  get info() {
    const rank_cnt = new Array(13);
    const rank_map = new Array(13);
    const suit_map = new Array(4);
    rank_cnt.fill(0);
    rank_map.fill(0);
    suit_map.fill(0);
    for (let i = 0; i < 13; ++i) {
      const pos = BigInt(i * 4);
      const mask = 0b1111n << pos;
      const rm = this.deck & mask;
      rank_map[i] = Number(rm >> pos);
      rank_cnt[i] = this.popcount(rm);
      const dat = 1 << i;
      if ((rm & 0b0001n) != 0n) suit_map[0] |= dat;
      if ((rm & 0b0010n) != 0n) suit_map[1] |= dat;
      if ((rm & 0b0100n) != 0n) suit_map[2] |= dat;
      if ((rm & 0b1000n) != 0n) suit_map[3] |= dat;
    }
    //                     K   Q   J  10   9   8   7   6   5   4   3   2   A
    const suit_mask = 0b0001000100010001000100010001000100010001000100010001n;
    const suit_cnt = new Array(4);
    suit_cnt.fill(0);
    for (let i = 0; i < 4; ++i) {
      const mask = suit_mask << BigInt(i);
      const sm = this.deck & mask;
      suit_cnt[i] = this.popcount(sm);
    }
    return {
      rank_cnt: rank_cnt,
      rank_map: rank_map,
      suit_cnt: suit_cnt,
      suit_map: suit_map,
      len: this.length
    };
  }
  is_empty() { return this.deck == 0n; }
  get length() { return this.popcount(this.deck); }
  // 64bit => Number
  popcount(x) {
    x = x - ((x >> 1n) & 0x5555555555555555n);
    x = (x & 0x3333333333333333n) + ((x >> 2n) & 0x3333333333333333n);
    x = (x + (x >>  4n)) & 0x0f0f0f0f0f0f0f0fn;
    x =  x + (x >>  8n);
    x =  x + (x >> 16n);
    x =  x + (x >> 32n);
    return Number(x & 0x0000007fn);
  }
  ntz(bit) {
    return this.popcount((bit & (-bit)) - 1n);
  }
}


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// 役の一覧。L は Lesser で、手札が不足している状態を表す。
export const POKER = {
  NO_HAND:            0,
  L_HIGH:             1 << 21, // 手札4枚以下のハイカード
  HIGH:               2 << 21, // 手札が5枚あるハイカード
  L_ONE_PAIR:         3 << 21, // 手札4枚以下の1Pair
  ONE_PAIR:           4 << 21,
  L_TWO_PAIR:         5 << 21, // 手札4枚以下の2Pair
  TWO_PAIR:           6 << 21,
  L_THREE_OF_A_KIND:  7 << 21, // 手札4枚以下の3Kind
  THREE_OF_A_KIND:    8 << 21,
  STRAIGHT:           9 << 21,
  FLUSH:             10 << 21,
  FULL_HOUSE:        11 << 21,
  L_FOUR_OF_A_KIND:  12 << 21, // 手札4枚以下の4Kind
  FOUR_OF_A_KIND:    13 << 21,
  STRAIGHT_FLUSH:    14 << 21,
  ROYAL_FLUSH:       15 << 21,
};

// 得点からタイブレークを除去する。
export const remove_tie = function( pt ) {
  return pt & ~((1 << 21) - 1);
};

// 得点を NO_HAND = 0 から ROYAL_FLUSH = MAX までの数値にする。
export const pt2idx = function( pt ) {
  return remove_tie( pt ) >> 21;
};

// 得点を文字列にする。
export const pt2str = function( pt ) {
  const point = remove_tie( pt );
  switch (point) {
    case POKER.NO_HAND:           return "no hand";
    case POKER.L_HIGH:            return "High Card(L)";
    case POKER.HIGH:              return "High Card";
    case POKER.L_ONE_PAIR:        return "One Pair(L)";
    case POKER.ONE_PAIR:          return "One Pair";
    case POKER.L_TWO_PAIR:        return "Two Pair(L)";
    case POKER.TWO_PAIR:          return "Two Pair";
    case POKER.L_THREE_OF_A_KIND: return "Three of a Kind(L)";
    case POKER.THREE_OF_A_KIND:   return "Three of a Kind";
    case POKER.STRAIGHT:          return "Straight";
    case POKER.FLUSH:             return "Flush";
    case POKER.FULL_HOUSE:        return "Full House";
    case POKER.L_FOUR_OF_A_KIND:  return "Four of a Kind(L)";
    case POKER.FOUR_OF_A_KIND:    return "Four of a Kind";
    case POKER.STRAIGHT_FLUSH:    return "Straight Flush";
    case POKER.ROYAL_FLUSH:       return "Royal Flush";
    default:
      throw new Error(`pt2str: pt = ${pt}`);
  }
};


///////////////////////////////////////////////////////////////////////////////
//
// 手札を判定
//
// hand ... カードデータの配列。５枚以下１枚以上
//   カードデータ ... 次のような連想配列
//      suit ... 0, 1, 2 or 3
//      rank ... 0(A), 1(2) .... 10(J), 11(Q), 12(K)
// 手札枚数が５枚より少ないときはペア系の役ができているかだけ考える。
// ただし５枚より少ないならペア系が成立しても Lesser がつく。
//
export const calc_poker = function( hand ) {
  if (hand.length == 0) return 0; // 0 point
  if (hand.length > 5) throw new Error(`hand.length = ${hand.length}`);
  // [枚数][ランク] の配列。ランクのほうはいじらない。
  let data = [[0,14],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],
    [0,8],[0,9],[0,10],[0,11],[0,12],[0,13]];
  const first_suit = hand[0].suit; // フラッシュか判定するために最初の手札のスートを記憶
  const less = hand.length != 5;   // 手札が５枚無ければ役が弱体化する
  let is_flush = !less;            // フラッシュか判定: 手札が足りない時は無効
  let rank_map = 0;                // 出たランクの記録
  for (const card of hand) { // 最大５回のループ
    data[ card.rank ][0] += 1; // A = 0, K = 12 な配列の枚数をカウント
    rank_map |= 1 << card.rank;
    if (is_flush && first_suit != card.suit) is_flush = false;
  }
  // 判定やタイブレークのために手札情報を整理。ペアがあるなら最多が先頭に来る
  data = data.sort((a, b) => {
    if (a[0] == b[0]) {
      return b[1] - a[1];
    } else {
      return b[0] - a[0];
    }
  });
  /////////////////////////////////////////////////////////////////////////////
  // 役を判定
  let result = 0;
  if (data[0][0] == 1) { // ペア系じゃない
    //                KQJT98765432A
    if (rank_map == 0b1111000000001) {
      result = is_flush? POKER.ROYAL_FLUSH: POKER.STRAIGHT;
    } else if (!less && (data[0][1] == 14? data[1][1] - 1: data[0][1] - data[4][1]) == 4) {
      result = is_flush? POKER.STRAIGHT_FLUSH: POKER.STRAIGHT;
      if (data[0][1] == 14) { // Ａ２３４５なら最強ランクは５になる
        data[5][0] = 1;
        data[5][1] = 1;
        data.shift();
      }
    } else if (is_flush) {
      result = POKER.FLUSH;
    } else {
      result = less? POKER.L_HIGH: POKER.HIGH;
    }
  } else {
    if (data[0][0] == data[1][0]) {
      result = less? POKER.L_TWO_PAIR: POKER.TWO_PAIR;
    } else if (data[0][0] == 3) {
      if (data[1][0] == 2) {
        result = POKER.FULL_HOUSE
      } else {
        result = less? POKER.L_THREE_OF_A_KIND: POKER.THREE_OF_A_KIND;
      }
    } else if (data[0][0] == 4) {
      result = less? POKER.L_FOUR_OF_A_KIND: POKER.FOUR_OF_A_KIND;
    } else {
      result = less? POKER.L_ONE_PAIR: POKER.ONE_PAIR;
    }
  }
  /////////////////////////////////////////////////////////////////////////////
  // タイブレークを算出
  let tie = 0;
  for (let i = 0; i < 5; ++i) {
    // ソートの結果、data[x][0] が 0 でない = そのランクに手札がある場合、
    // それは役に必要で、かつ、ランクの強さ順になっている。
    if (data[i][0] != 0) { // タイブレークに関わるカードがあるなら、
      tie |= data[i][1] << (16 - (i * 4)); // それを記録しておく
    } else {
      break;
    }
  }
  // result > (x << 20), tie >= 20bit
  return result + tie;
};





///////////////////////////////////////////////////////////////////////////////
//
// 足りない手札から作れそうな役を推測
//
// hand     ... ４枚以上の手札
// pi       ... Pile.info
//     rank_map[13] ... 各ランクの残りスートをビットで表現したもの(最大0b1111)
//     rank_cnt[13] ... 各ランクの残り枚数
//     suit_map[4]  ... 各スートの残りランクをビットで表現したもの(13bit)
//     suit_cnt[4]  ... 各スートの残り枚数
// eg_cards ... ５枚以上のとき、この手札をスキップする
//
export const calc_four = (hand, pi, eg_cards = null) => {
  let first_suit = -1;
  let rank_map = 0;
  let pair_count = 0;
  let pair_rank = -1;
  let pair_map = 0;
  let rank_max = -1;
  let rank_min = 999;
  let is_flush = true;
  hand_loop: for (const h of hand) {
    if (eg_cards) {
      for (const e of eg_cards) {
        if (e.suit == h.suit && e.rank == h.rank) {
          continue hand_loop;
        }
      }
    }
    if (first_suit == -1) first_suit = h.suit;
    const rank = 1 << h.rank;
    if ((rank_map & rank) != 0) {
      pair_count += 1;
      pair_rank = h.rank;
      pair_map |= rank;
    } else {
      rank_map |= rank;
    }
    if (h.rank > rank_max) rank_max = h.rank;
    if (h.rank < rank_min) rank_min = h.rank;
    if (is_flush && first_suit != h.suit) is_flush = false;
  }
  ////////////////////////////////////////////////////////////////////////////
  const result = [];
  if (pair_count == 0) { // Straight, Flush, High Card
    let n_high = 0;
    let f_sum = 0; // flush 削る用
    const suit_mask = 1 << first_suit;
    //             KQJT98765432A
    const ASTR = 0b1111000000001;
    const a_str = ASTR & rank_map;
    const sa = rank_max - rank_min;
    // STRAIGHT
    if (popcount(a_str) == 4) {
      const p = ASTR ^ a_str; // 不足を出す
      const x = ntz( p );
      let n = pi.rank_cnt[ x ];
      if (is_flush) {
        const f = popcount( pi.rank_map[ x ] & suit_mask );
        if (f == 1) {
          n -= 1;
          result.push({ type: POKER.ROYAL_FLUSH, count: 1, avg: 1 / pi.len });
          f_sum += 1;
          n_high += 1;
        }
      }
      if (n != 0) {
        result.push({ type: POKER.STRAIGHT, count: n, avg: n / pi.len });
        n_high += n;
      }
    } else if (sa == 4 || sa == 3) {
      if (sa == 3) { // x 5432 x
        let n = 0;
        let f = 0;
        if (rank_max != 12) {
          n = pi.rank_cnt[ rank_max + 1 ];
          if (is_flush) {
            f = popcount( pi.rank_map[ rank_max + 1 ] & suit_mask );
          }
        }
        if (rank_min !=  0) {
          n += pi.rank_cnt[ rank_min - 1 ];
          if (is_flush) {
            f += popcount( pi.rank_map[ rank_max + 1 ] & suit_mask );
          }
        }
        if (is_flush && f != 0) {
          result.push({ type: POKER.STRAIGHT_FLUSH, count: f, avg: f / pi.len });
          n -= f;
          f_sum += f;
          n_high += f;
        }
        if (n != 0) {
          result.push({ type: POKER.STRAIGHT, count: n, avg: n / pi.len });
          n_high += n;
        }
      } else { // sa=4, 654 x 2
        const mask = 0b11111 << rank_min;
        const x = ntz(rank_map ^ mask);
        let n = pi.rank_cnt[ x ];
        if (is_flush) {
          const f = popcount( pi.rank_map[ x ] & suit_mask );
          if ( f == 1 ) {
            result.push({ type: POKER.STRAIGHT_FLUSH, count: 1, avg: 1 / pi.len });
            n -= 1;
            f_sum += 1;
            n_high += 1;
          }
        }
        if (n != 0) {
          result.push({ type: POKER.STRAIGHT, count: n, avg: n / pi.len });
          n_high += n;
        }
      }
    }
    // FLUSH
    if (is_flush) {
      const n = pi.suit_cnt[ first_suit ] - f_sum;
      if (n != 0) {
        result.push({ type: POKER.FLUSH, count: n, avg: n / pi.len });
        n_high += n;
      }
    }
    // ワンペアの可能性がある
    let pn = 0; // ペアになるカード枚数
    for (let rank = 0; rank < 13; ++rank) {
      if (((1 << rank) & rank_map) != 0) {
        pn += pi.rank_cnt[ rank ];
      }
    }
    if (pn != 0) {
      result.push({ type: POKER.ONE_PAIR, count: pn, avg: pn / pi.len });
      n_high += pn;
    }
    // ハイカードは確定
    n_high = pi.len - n_high;
    result.push({ type: POKER.HIGH, count: n_high, avg: n_high / pi.len });
  } else if (pair_count == 3) { // 4K
    // なにを引いても４Ｋ
    result.push({ type: POKER.FOUR_OF_A_KIND, count: pi.len, avg: 1 });
  } else if (pair_count == 2) { // 3K, 2P
    if (popcount(pair_map) == 1) { // 3K
      let n3 = 0;
      // ４Ｋになるかも
      if (pi.rank_cnt[ pair_rank ] != 0) {
        result.push({ type: POKER.FOUR_OF_A_KIND, count: 1, avg: 1 / pi.len });
        n3 = 1;
      }
      // フルハになるかも
      const pos = ntz( (1 << pair_rank) ^ rank_map );
      const n = pi.rank_cnt[ pos ];
      if (n != 0) {
        result.push({ type: POKER.FULL_HOUSE, count: n, avg: n / pi.len });
        n3 += n;
      }
      // 3Kは確定できる
      n3 = pi.len - n3;
      result.push({ type: POKER.THREE_OF_A_KIND, count: n3, avg: n3 / pi.len });
    } else { // 2P
      // フルハになるかも
      let n = 0;
      for (const r of bit_loop( rank_map )) {
        const pos = ntz(r);
        n += pi.rank_cnt[pos];
      }
      if (n != 0) {
        result.push({ type: POKER.FULL_HOUSE, count: n, avg: n / pi.len });
      }
      // 2Pは確定
      n = pi.len - n;
      result.push({ type: POKER.TWO_PAIR, count: n, avg: n / pi.len });
    }
  } else { // 1P
    let n1 = 0;
    // ペアが３Ｋになるかも
    if (pi.rank_cnt[ pair_rank ] != 0) {
      const n = pi.rank_cnt[ pair_rank ];
      result.push({ type: POKER.THREE_OF_A_KIND, count: n, avg: n / pi.len });
      n1 = n;
    }
    // ペアでない２枚にペアができる＝＞２Ｐ
    let n = 0;
    for (const r of bit_loop( (1 << pair_rank) ^ rank_map )) {
      const pos = ntz(r);
      n += pi.rank_cnt[pos];
    }
    if (n != 0) {
      result.push({ type: POKER.TWO_PAIR, count: n, avg: n / pi.len });
      n1 += n;
    }
    // 1P
    n1 = pi.len - n1;
    result.push({ type: POKER.ONE_PAIR, count: n1, avg: n1 / pi.len });
  }

  return result;
};

//////////////////////////////////////////////////////
// 手札５枚の配列と残り山札クラスを受け取り、
// 作れそうな役を算出
export const think_avg = (hand, pile) => {
  const pi = pile.info;
  // portland のルール的に、山札が枯れた時はもう引けない
  if (pi.len == 0 || hand.length != 5) return [];
  const result = [];
  for (let i = 0; i < 5; ++i) {
    result.push( calc_four(hand, pi, [ hand[i] ]) );
  }
  return result;
};

