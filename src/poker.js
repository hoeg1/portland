/**
 * カードを表すビット値
 *   suit(4)    rank(13)
 * 0b1111____1111111111111 = 17bit
 * @typedef {number} Card
 */

// ビット演算用のマスク
const SUIT_MASK = 0b11110000000000000;
const RANK_MASK = 0b00001111111111111;
const ROYAL     =     0b1111000000001;

/**
 * スート(1-4)とランク(1-13)からカードを作る
 * @param {number} suit = 1~4
 * @param {number} rank = 1~13
 * @return {Card}  カードを表すビット値
 */
export const make_card = (suit, rank) => ((1 << suit - 1) << 13) | (1 << rank - 1);

/**
 * カードからランクを取り出す
 * @param {Card} card
 * @return {number} 1~13
 */
export const to_rank = card => 32 - Math.clz32(card & RANK_MASK);

/**
 * カードからスートを取り出す
 * @param {Card} card
 * @return {number} 1~4
 */
export const to_suit = card => 32 - Math.clz32(card >> 13);

/**
 * カードからスートとランクをリストで取り出す
 * @param {Card} card
 * @return {Array<number>} [suit, rank]
 */
export const to_sr = card => [to_suit(card), to_rank(card)];

/**
 * 引数xのうち立っているビットがひとつのみなら真を返す
 * @param {number} x
 * @return {boolean}
 */
export const is_single = x => x > 0 && (x & (x - 1)) === 0;

/**
 * ポーカー役を文字列にするための配列
 * @type {Array<string>}
 */
export const TYPE_STR = [
  'High Card','One Pair','Two Pair','Three of a Kind','Straight',
  'Flush','Full House','Four of a Kind','Straight Flush','Royal Flush'];



/**
 * ポーカーの手役判定用クラス
 * @class
 */
export class Poker {
  // 定数
  static RoyalFlush    = 9;
  static StraightFlush = 8;
  static FourOfAKind   = 7;
  static FullHouse     = 6;
  static Flush         = 5;
  static Straight      = 4;
  static ThreeOfAKind  = 3;
  static TwoPair       = 2;
  static OnePair       = 1;
  static HighCard      = 0;

  /**
   * @constructor
   * @property {number} type  単純な役の種類
   * @property {number} power タイブレークを考慮した役の強さ
   *
   * @param {Array<Card>} hand  役を決めるための手札。** 破壊されない **
   */
  constructor(hand) {
    // ６枚以上の手札は判定できない
    if (hand.length >= 6) throw new RangeError(`hand.length = ${hand.length}`);
    // 手札が無いならなにもかも０点
    if (hand.length === 0) {
      this.type  = Poker.HighCard; // 手札無しだがハイカードとするしかない
      this.power = 0;              // しかし手札が無いのでハイカード勝負でも０点
      return;
    }
    /////////////////////////////////////////////
    //
    // 手札（５枚以下）の価値を判定する
    //
    const data = hand.reduce((obj, card) => {
      // 手札の状態を収集する
      obj.wa |= card;
      const rank = to_rank(card);
      if (obj.cnt[ rank ] === 0) obj.rcnt += 1;
      obj.cnt[ rank ] += 1;
      if (obj.cnt[rank] > obj.cmax) obj.cmax = obj.cnt[rank];
      return obj;
    }, {
      wa: 0,
      rcnt: 0, // 含まれるランクの種類をカウント 11223 なら ３種類なので rcnt = 3
      cmax: 0, // 一番たくさんあったランクの枚数
      cnt: [0,  0,0,0,0,0,0,0,0,0,0,0,0,0], // [0]はダミー
    });
    //////////////////////////////////////////////////////////////////////////
    // bitの並びからランクについてだけを切り出す:
    //    存在するランクのビットだけが立っているデータを作る
    const ranks = data.wa & RANK_MASK;
    //////////////////////////////////////////////////////////////////////////
    //
    // 以下、手札枚数について
    //
    if (hand.length === 5) {
      // 手札が５枚ならマトモなポーカーのルールが適用できる
      if (is_single(data.wa & SUIT_MASK)) { // flush
        if (ranks === ROYAL) {
          this.type = Poker.RoyalFlush;
        } else {
          const is_straight = to_rank(data.wa) - to_rank(ranks & -ranks) === 4;
          this.type = is_straight? Poker.StraightFlush: Poker.Flush;
        }
      } else {
      /*
       * 判定基準:
       * 11112: rcnt(2)
       * 11122: rcnt(2) => cmax(3)
       * 11123: rcnt(3) => cmax(3)
       * 11223: rcnt(3)
       * 11234: rcnt(4) => one pair
       * 15392: rcnt(5) => straight or high card
       *
       */
        switch (data.rcnt) {
          case 2:
            this.type = data.cmax === 3? Poker.FullHouse: Poker.FourOfAKind;
            break;
          case 3:
            this.type = data.cmax === 3? Poker.ThreeOfAKind: Poker.TwoPair;
            break;
          case 4:
            this.type = Poker.OnePair;
            break;
          case 5:
            const is_straight = to_rank(data.wa) - to_rank(ranks & -ranks) === 4;
            this.type = is_straight || ranks === ROYAL? Poker.Straight: Poker.HighCard;
            break;
          default:
            throw new Error(`panic: ${data.rcnt}`);
        }
      }
    } else if (hand.length === 4) {
      // 1122  rcnt:2, cmax:2
      // 1222  rcnt:2, cmax:3
      // 1111  rcnt:1, cmax:4
      // 1123  rcnt:3, cmax:2
      switch (data.rcnt) {
        case 1: this.type = Poker.FourOfAKind; break;
        case 2: this.type = data.cmax == 3? Poker.ThreeOfAKind: Poker.TwoPair; break;
        case 3: this.type = Poker.OnePair; break;
        case 4: this.type = Poker.HighCard; break;
        default: throw new Error(`panic: ${data.rcnt}`);
      }
    } else if (hand.length === 3) {
      // 111  rcnt:1, cmax:3
      // 112  rcnt:2, cmax:2
      // 123  rcnt:3, cmax:1
      switch (data.rcnt) {
        case 1: this.type = Poker.ThreeOfAKind; break;
        case 2: this.type = Poker.OnePair; break;
        case 3: this.type = Poker.HighCard; break;
        default: throw new Error(`panic: ${data.rcnt}`);
      }
    } else if (hand.length === 2) {
      // 手札が２枚ある
      switch (data.rcnt) {
        case 1: this.type = Poker.OnePair; break;
        case 2: this.type = Poker.HighCard; break;
        default: throw new Error(`panic: ${data.rcnt}`);
      }
    } else {
      // 手札が１枚ならハイカード勝負になるのが確定
      this.type = Poker.HighCard;
      const r = to_rank(card);
      this.power = r === 1? 14: r; // この場合、A が特別に強い
      // 以降の無駄な計算をスキップ
      return;
    }
    //////////////////////////////////////////////////////////////////////////
    // 判定勝ちに備えてソート
    this.hand = hand.toSorted((a, b) => {
      const [ra, rb] = [to_rank(a), to_rank(b)];
      if (data.cnt[rb] === data.cnt[ra]) {
        // 複数枚の時を含め、枚数が同じならAを最強としてソート
        const [aa, bb] = [ra === 1? 14: ra, rb === 1? 14: rb];
        return bb - aa;
      } else {
        // ペア系は枚数が多い部分から比較されるので、多い順
        // ストレート系は全部１枚なので上の条件でソートされる
        return data.cnt[rb] - data.cnt[ra];
      }
    });
    /////////////////////////////////////
    // タイブレークを見据えた具体的な役の得点を算出
    this.calc_power();
  }

  /**
   * 簡単な比較で強さを判定するために手札枚数と役から強さを表す整数を得る
   * 基本的に枚数が多いほうが強い
   * 同じ枚数なら役が強いほうの勝ち
   * 役が同じなら
   *  ペア系なら役を構成する部分のうち枚数が多いほうからランク勝負
   *  でなければランク勝負
   * というルールで this.power を算出
   * @return {void}
   */
  calc_power() {
    const a2s = card => {
      if (card === undefined) return 0; // ４枚以下の場合がありうる: なら 0 点
      const r = to_rank(card);
      return r === 1? 14: r; // Ace を特別視する => Straight 系では別の処理が必要
    };
    // 点数がかぶらないよう手札枚数を１０万倍し、役を１万倍する。
    // -> ４枚以下の手札は枚数が多い役に必ず負ける
    const base = this.hand.length * 100000 + this.type * 10000;
    switch (this.type) {
      case Poker.TwoPair       :
        // base + { aa(1400) + kk(130 ※10倍) = 最大1530 } + （あれば）あまりの１枚
        this.power = base + a2s(this.hand[0]) * 100 + a2s(this.hand[2]) * 10 +
          a2s(this.hand[4]);
        break;
      case Poker.FourOfAKind   :
        // base + { aaaa(1400) = 最大1400 } + （あれば）あまりの１枚
        this.power = base + a2s(this.hand[0]) * 100 + a2s(this.hand[4]);
        break;
      case Poker.FullHouse     :
        // base + { aaa(1400) = 最大1400 } + 残りのペア(最大14)
        this.power = base + a2s(this.hand[0]) * 100 + a2s(this.hand[4]);
        break;
      case Poker.ThreeOfAKind  :
        // base + { aaa(1400) = 最大1400 } + （あれば）残りの２枚(最大A+K=27)
        this.power = base +
          a2s(this.hand[0]) * 100 + a2s(this.hand[3]) + a2s(this.hand[4]);
        break;
      case Poker.OnePair       :
        // base + { aa(1400) = 最大1400 } + （あれば）残りの３枚(最大A+K+Q=39)
        this.power = base + a2s(this.hand[0]) * 100 +
          a2s(this.hand[2]) + a2s(this.hand[3]) + a2s(this.hand[4]);
        break;
      // ペア系じゃない役
      // ランク合計 14+13+12+11+10=60 点が最大
      case Poker.StraightFlush :
      case Poker.Straight      :
        // ストレート系は A2345 と AKQJT で A の価値が変わる
        let ranks = 0;
        this.power = base + this.hand.reduce((a,c)=> {
          const rank = to_rank(c);
          ranks |= 1 << (rank - 1);
          return a + rank; // とりあえずは A = 1 として計算
        }, 0);
        if (ranks === ROYAL) this.power += 13; // AKQJTなら A = (13 + 1)
        break;
      case Poker.RoyalFlush : // Royalは A = 14 でOK
      case Poker.Flush      :
      case Poker.HighCard   :
        this.power = base + this.hand.reduce((a,c)=> a + a2s(c) , 0);
        break;
      default:
        throw new Error(`panic: type=${this.type}`);
    }
    // unreachable
  }

  /**
   * @return {string} 役の名前
   */
  toString() {
    return TYPE_STR[this.type];
  }
}

