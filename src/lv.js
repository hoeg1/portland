import { Poker } from "./poker.js";
import { Player } from "./portland.js";

/**
 * @import { PlayerInfo } from './portland.js';
 */

/**
 * @import { Card } from './poker.js';
 */

export const LV_MAX = 4;

/**
 * @param {number}      lv
 * @param {number}      seed
 * @param {number}      max   5 or 6
 * @param {Set<number>} used  個性の重複を防ぐための Set
 * @return {Lv}
 */
export const get_lv = (lv, seed, max, used) => {
  switch (lv) {
    case 4:
      return new Lv4(seed, max, used);
    case 3:
      return new Lv3(seed, max, used);
    case 2:
      return new Lv2(seed, max, used);
    case 1:
      return new Lv1(seed, max, used);
    default:
      return new  Lv(seed, max, used);
  }
};

const AllNext = -1;

const KOSEI = [
  { name: 'ピッグ',      dl: [2, 3, 3, 4, 5, 5], bunpai: AllNext, },
  { name: 'ミズハラ',    dl: [2, 3, 3, 4, 5, 5], bunpai: 7,       },
  { name: 'ほげっち',    dl: [2, 3, 3, 4, 5, 5], bunpai: 3,       },
  { name: '鶴瓶',        dl: [2, 3, 3, 4, 5, 5], bunpai: 2,       },
  { name: 'スリンカ',    dl: [3, 3, 3, 4, 4, 5], bunpai: AllNext, },
  { name: 'フォッカ',    dl: [3, 3, 3, 4, 4, 5], bunpai: 7,       },
  { name: 'ポポラマー',  dl: [3, 3, 3, 4, 4, 5], bunpai: 3,       },
  { name: 'ぽかすけ',    dl: [3, 3, 3, 4, 4, 5], bunpai: 2,       },
  { name: 'ダンダン',    dl: [2, 3, 5, 5, 5, 2], bunpai: AllNext, },
  { name: 'クリリン',    dl: [2, 3, 5, 5, 5, 2], bunpai: 7,       },
  { name: 'ピッコロ',    dl: [2, 3, 5, 5, 5, 2], bunpai: 3,       },
  { name: 'ダディ',      dl: [2, 3, 5, 5, 5, 2], bunpai: 2,       },
  { name: 'キッカー',    dl: [2, 3, 5, 6, 5, 1], bunpai: AllNext, },
  { name: 'トンヌラ',    dl: [2, 3, 5, 6, 5, 1], bunpai: 7,       },
  { name: 'ゲレゲレ',    dl: [2, 3, 5, 6, 5, 1], bunpai: 3,       },
  { name: 'ブラウン',    dl: [2, 3, 5, 6, 5, 1], bunpai: 2,       },
  { name: 'ロイフン',    dl: [2, 4, 5, 5, 5, 1], bunpai: AllNext, },
  { name: 'ポトラン',    dl: [2, 4, 5, 5, 5, 1], bunpai: 7,       },
  { name: 'パンサー',    dl: [2, 4, 5, 5, 5, 1], bunpai: 3,       },
  { name: 'ガッちゃん',  dl: [2, 4, 5, 5, 5, 1], bunpai: 2,       },
  { name: '柴田くん',    dl: [1, 2, 3, 4, 7, 5], bunpai: AllNext, },
  { name: 'サトシ',      dl: [1, 2, 3, 4, 7, 5], bunpai: 7,       },
  { name: 'レッド',      dl: [1, 2, 3, 4, 7, 5], bunpai: 3,       },
  { name: 'カサハラ',    dl: [1, 2, 3, 4, 7, 5], bunpai: 2,       },
  { name: 'リューヤ',    dl: [1, 2, 4, 4, 6, 5], bunpai: AllNext, },
  { name: 'キョースケ',  dl: [1, 2, 4, 4, 6, 5], bunpai: 7,       },
  { name: 'アントニー',  dl: [1, 2, 4, 4, 6, 5], bunpai: 3,       },
  { name: 'ボンバイエ',  dl: [1, 2, 4, 4, 6, 5], bunpai: 2,       },
  { name: 'やきぶた',    dl: [2, 4, 4, 5, 5, 2], bunpai: AllNext, },
  { name: 'トンテキ',    dl: [2, 4, 4, 5, 5, 2], bunpai: 7,       },
  { name: '生姜焼き',    dl: [2, 4, 4, 5, 5, 2], bunpai: 3,       },
  { name: '豚丼老師',    dl: [2, 4, 4, 5, 5, 2], bunpai: 2,       },
  { name: '大器晩成',    dl: [0, 2, 4, 6, 6, 4], bunpai: AllNext, },
  { name: 'サナギ',      dl: [0, 2, 4, 6, 6, 4], bunpai: 7,       },
  { name: '桜前線',      dl: [0, 2, 4, 6, 6, 4], bunpai: 3,       },
  { name: '出世魚',      dl: [0, 2, 4, 6, 6, 4], bunpai: 2,       },
  { name: 'インフレ',    dl: [1, 1, 3, 4, 7, 6], bunpai: AllNext, },
  { name: 'へのへの',    dl: [1, 1, 3, 4, 7, 6], bunpai: 7,       },
  { name: 'ワグナー',    dl: [1, 1, 3, 4, 7, 6], bunpai: 3,       },
  { name: 'ラッパー',    dl: [1, 1, 3, 4, 7, 6], bunpai: 2,       },
  { name: 'サンジ',      dl: [3, 3, 4, 4, 4, 4], bunpai: AllNext, },
  { name: '十二支',      dl: [3, 3, 4, 4, 4, 4], bunpai: 7,       },
  { name: 'ミニ獅子',    dl: [3, 3, 4, 4, 4, 4], bunpai: 3,       },
  { name: 'サンスーシ',  dl: [3, 3, 4, 4, 4, 4], bunpai: 2,       },
];

/**
 * @class
 * くそざこCPU
 * 他のレベルでよく使い回す関数をここに定義する
 */
export class Lv extends Player {
  /**
   * @constructor
   * @param {number} seed
   * @param {number} max   ラウンド数
   * @param {Set<number>} used
   */
  constructor(seed, max, used) {
    super(seed, '', false, max);
    let kosei = null;
    while (true) {
      const r = this.rand(KOSEI.length);
      if (! used.has(r)) {
        kosei = KOSEI[ r ];
        used.add(r);
        break;
      }
    }
    this.name = kosei.name;
    this.draw_limit = [0, ...kosei.dl]; // roundは１から
    this.bunpai = kosei.bunpai;
    if (max === 5) {
      // ５回勝負ならLastToFirst方式で使わない６ラウンド目の数を配る
      const k = this.draw_limit.pop();
      this.last_to_first(0, k);
    }
  }

  /**
   * round+1 に n を足す
   * @param {number} round 現在のラウンド数、または配る範囲をこれで指定
   * @param {number} n     分配する数値
   */
  all_next(round, n) {
    if (round + 1 < this.draw_limit.length) {
      this.draw_limit[round + 1] += n;
    }
  }

  /**
   * n を最後から順に１ずつ i > round まで分配
   * まだ残っているなら同様にする
   * @param {number} round 現在のラウンド数、または配る範囲をこれで指定
   * @param {number} n     分配する数値
   */
  last_to_first(round, n) {
    if (round >= this.draw_limit.length - 1) return;
    while (n > 0) {
      for (let i = this.draw_limit.length - 1; n > 0 && i > round; --i, --n) {
        this.draw_limit[i] += 1;
      }
    }
  }

  /**
   * @param {number} round 現在のラウンド数(1~5or6)
   * @return {number}      このラウンドで引いて良い限界
   */
  get_dl(round) {
    return this.draw_limit[round];
  }

  /**
   * このラウンドで引いて良い限界を減らす
   * @param {number} round 現在のラウンド数(1~5or6)
   */
  dec_dl(round) {
    if (this.draw_limit[round] === 0) throw new Error('panic');
    this.draw_limit[round] -= 1;
  }

  /**
   * 分配を実施する
   * @param {number} round   現在のラウンド
   */
  do_bunpai(round) {
    const dl = this.get_dl(round); // 余った dl
    if (dl !== 0) {
      // bunpai が -1であるか、例えばbunpai が 4 なら、ラウンド数が５以上のときall_next
      if (this.bunpai === AllNext || round > this.bunpai) this.all_next(round, dl);
      else this.last_to_first(round, dl); // round < bunpai のとき
    }
  }

  /**
   * パスすると決めたとき
   * @param {number} round
   * @return {boolean} 常に真
   */
  choice_pass(round) {
    this.do_bunpai(round);
    return true; // パス
  }

  /**
   * 交換すると決めたとき
   * @param {number} round
   * @return {boolean} 常に偽
   */
  choice_change(round) {
    this.dec_dl(round);
    return false; // 交換
  }

  /**
   * パスか交換かを選ぶ
   * @virtual
   * @param {Array<PlayerInfo>}  info   他のプレイヤーの状態(自分を含まない)
   * @param {number}             round  今のラウンド数
   * @param {number}             id     自分の席の番号
   * @return {boolean}           pass なら true
   */
  on_think_pass(info, round, _id) {
    const win = info.reduce((acc, i) => acc + (i.power < this.power? 1: 0), 0);
    const dl = this.get_dl(round);
    // 手札がブタか、最下位のときは引く
    if ((this.type === Poker.HighCard || win === 0) && dl >= 1) {
      if (this.deck.length === 0) throw new Error('panic');
      return this.choice_pass(round); // 交換する
    } else {
      return this.choice_pass(round); // パスする
    }
  }

  /**
   * @virtual
   * @param {Card} card
   * @param {number} round
   * @return {number}   交換する手札のインデックス
   */
  on_think_change(card, _round) {
    // 一番良くなるような交換をする
    return this.hand.reduce((cur, c, index) => {
      const hand = this.hand.filter(t => t !== c);
      const pok = new Poker([...hand, card]);
      if (pok.power > cur.power) {
        cur.power = pok.power;
        cur.index = index;
      }
      return cur;
    }, {power:-1, index:-1}).index;
  }
}


/**
 * @class
 * くそざこCPUその２
 * on_think_change は雛形のLvクラスを流用
 */
class Lv1 extends Lv {
  /**
   * @constructor
   * @param {number} seed
   * @param {number} max   ラウンド数
   * @param {Set<number>} used
   */
  constructor(seed, max, used) {
    super(seed, max, used);
  }

  /**
   * パスか交換かを選ぶ
   * @virtual
   * @param {Array<PlayerInfo>}  info   他のプレイヤーの状態(自分を含まない)
   * @param {number}             round  今のラウンド数
   * @param {number}             id     自分の席の番号
   * @return {boolean}           pass なら true
   */
  on_think_pass(info, round, _id) {
    const dl = this.get_dl(round);
    if (dl === 0) return true; // リミットならパス一択
    // ここから先はリミットでないし、手札５枚＆デッキ＞＝１確定
    const np_h = info.length / 2; // 敵の半数
    const win = info.reduce((acc, i)=>acc + (i.pass && i.power < this.power? 1: 0), 0);
    if (win >= np_h) {
      return this.choice_pass(round);// 敵の半分以上に確実に勝ってるならパスでよさそう
    }
    const win2 = info.reduce((acc, i)=>acc + (i.power < this.power? 1: 0), 0);
    if (this.type > Poker.HighCard && win2 >= np_h) {
      // 手札がハイカードではなくて、
      // 敵の半分以上に今のところ勝ってるならパスでよさそう
      return this.choice_pass(round);
    }
    // 交換してみる
    return this.choice_change(round);
  }

  // on_think_change => Lv を流用
}

/**
 * @class
 * think_pass は 1手先読み
 * think_change は Lv1 と同じ戦略を取る？
 */
class Lv2 extends Lv1 {
  /**
   * @constructor
   * @param {number} seed
   * @param {number} max   ラウンド数
   * @param {Set<number>} used
   */
  constructor(seed, max, used) {
    super(seed, max, used);
  }

  /**
   * 対象の手札が５枚あり、デッキがゼロでないとき呼び出す。
   * 手札５枚の交換したときの期待値（パワー基準で計算）を求める
   * 返却値は、「最も高い数値のインデックスこそ最も捨てたほうが良い札」を表す
   *
   * @param {Array<Card>} [hand]  省略したら自分のハンド
   * @param {Array<Card>} [deck]  省略したら自分のデッキ
   * @returns {Array<number>} そのインデックスを交換したときの期待値のリスト
   *
   * 手札全体の期待値が知りたければ次のようにする:
   *    cosnt ev = calc_ev().reduce((a, ev)=>a + ev, 0);
   */
  calc_ev(hand=this.hand, deck=this.deck) {
    if (hand.length !== 5) throw new Error('length != 5');
    if (deck.length === 0) throw new Error('deck is empty');
    const L = deck.length;
    const calc = hd => {
      const dat = [];
      for (let i = 0; i < 10; ++i)
        dat.push({type:i, count: 0, power: 0});
      for (const card of deck) {
        const p = new Poker([card, ...hd]);
        const idx = p.type;
        dat[idx].count += 1;
        // 各 power は最大でも20万点 * 47枚 = 9,400,000;  オーバーフローしない
        dat[idx].power += p.power;
      }
      // 各役に個別の期待値 = 結果 * その確率
      //   結果 = その役の点数の合計
      //   その確率 = その役を作ったカードの枚数 / 山札の枚数
      // 全体の期待値 => 単に足せばよい
      return dat.reduce((a, d)=>a + d.power * (d.count / L), 0);
    };
    // 手札全体の期待値が知りたければ
    // cosnt ev = lst.reduce((a, d)=>a + d, 0);
    return hand.map(ignore => {
      const hd = hand.filter(card => card !== ignore);
      return calc(hd);
    });
  }

  /**
   * パスか交換かを選ぶ
   * @virtual
   * @param {Array<PlayerInfo>}  info   他のプレイヤーの状態(自分を含まない)
   * @param {number}             round  今のラウンド数
   * @param {number}             id     自分の席の番号
   * @return {boolean}           pass なら true
   */
  on_think_pass(info, round, id) {
    const dl = this.get_dl(round);
    if (dl === 0) {
      return true; // リミットならパス一択
    }
    // ここから先はリミットがある状態
    const np_h = info.length / 2; // 敵の半分
    const win0 = info.reduce((acc, i)=>acc + (i.pass && i.power < this.power? 1: 0), 0);
    if (win0 >= np_h) {
      return this.choice_pass(round); // 半数以上に確実に勝ってるならパスでよさそう
    }
    const win1 = info.reduce((acc, i)=>acc + (i.type < this.type? 1: 0), 0);
    if (win1 === info.length) {
      return this.choice_pass(round); // 全員に役で勝ってるならパスでよさそう
    }
    // 期待値で行動を決める
    // 手番が来る時点でデッキは空じゃないし、手札は５枚ある
    const ev = this.calc_ev().reduce((acc, e)=>acc + e, 0);
    // 期待値的に交換したら勝てそうな人数を数える
    const win2 = info.reduce((acc, i)=>acc + (i.power < ev? 1: 0), 0);
    if (win2 >= np_h) {
      return this.choice_change(round); // 半数以上に勝てそうなら交換
    }
    // 思考放棄
    return super.on_think_pass(info, round, id);
  }

  /**
   * card と交換する手札のインデックスを選ぶ
   * @virtual
   * @param {Card} card
   * @param {number} round
   * @return {number}   交換する手札のインデックス
   */
  on_think_change(card, round) {
    // とりあえず原初のLvと同様に、一番良くなるような交換を計算
    const best_change = this.hand.reduce((cur, c, index) => {
      const hand = this.hand.filter(t => t !== c);
      const pok = new Poker([...hand, card]);
      if (pok.power > cur.power) {
        cur.power = pok.power;
        cur.index = index;
      }
      return cur;
    }, {power:-1, index:-1});
    if (best_change.index === -1) throw new Error('panic! index == -1');

    // まだ交換できるか？
    const dl = this.get_dl(round);
    if (dl >= 1) {
      // もう一度チェンジする前提で今最も要らないのを捨てる
      // ただし、それは今のベストな交換よりよい結果が前提
      const best_idx = this.calc_ev().reduce((cur, e, i) => {
        if (cur.best < e) {
          cur.best = e;
          cur.idx  = i;
        }
        return cur;
      }, {
        best: best_change.power, // ここでのベストな交換結果
        idx: -1}).idx;
      // 交換しても良くならないならベストな交換を返す
      if (best_idx === -1) return best_change.index;
      // そうでなければ次に期待して要らないのを捨てる
      return best_idx;
    } else {
      // 交換できないなら best_change.index
      return best_change.index;
    }
  }
}

/**
 * @class
 * ラストラウンドだけ本気出す：
 *     残り手札 n 枚から 5 枚を選ぶすべての組み合わせについて強さを計算し、
 *     うちベストな手札をキャッシュする。
 *     ラストラウンドならそのような手札を確実に引くことができるので、
 *     そのハンドを引き切るまで引き続ける。
 * ほかは Lv2 を流用？
 */
class Lv3 extends Lv2 {
  /**
   * @constructor
   * @param {number} seed
   * @param {number} max   ラウンド数
   * @param {Set<number>} used
   */
  constructor(seed, max, used) {
    super(seed, max, used);
    this.best_target = [];
  }

  /**
   * @callback FCombCB
   * @param {Array<T>} ary
   * @returns {void}
   */
  /**
   * 長さ n の配列 ary から r 枚を取り出す組み合わせすべてを関数 f に与える
   * @param {Array<T>} ary
   * @param {number}   r
   * @param {FCombCB}  f
   */
  fcomb(ary, r, f) {
    /**
     * すべての組み合わせを試す再帰
     * @param {number}   start    組み合わせを作るインデックスの開始位置
     * @param {Array<T>} current  現在作りかけの組み合わせ。長さが r なら f に渡す。
     */
    const helper = (start, current) => {
      if (current.length === r) {
        f([...current]);
        return; // ひとつの組み合わせを試したのでリターン
      }
      // 長さが足りないので組み合わせを順次作って長さ r になるか試す
      for (let i = start; i < ary.length; ++i) {
        current.push(ary[i]);   // i 番目を追加した組み合わせを試す
        helper(i + 1, current); // current.length == r なら f にわたす=>再帰
        current.pop();          // 現在の i は試したので次に
      }
    };
    // [index=ゼロ, array=からっぽ] から呼び出す
    helper(0, []);
  }

  /**
   * 目標ハンドを算出
   * ラストラウンドでのみ呼び出す
   * => 他のラウンドで呼び出す意味は無いし、大半はスタックオーバーフローする
   */
  make_best() {
    if (this.best_target.length !== 0) return;
    let best_pt = -1;
    // 手札とデッキを合成した長さ n 枚の配列から r=5 枚を選ぶすべての組み合わせ
    this.fcomb([...this.hand, ...this.deck], 5, hand => {
      const poker = new Poker(hand);
      if (poker.power > best_pt) {
        best_pt = poker.power;
        this.best_target = hand;
      }
    });
  }

  /**
   * @return {boolean} ラストラウンドで目標ハンドが作れたら true
   */
  is_best() {
    if (this.best_target.length === 0) throw new Error('best_target = []');
    for (const h of this.hand) {
      // まだ完成してないとき
      if (! this.best_target.includes(h)) return false;
    }
    return true;
  }

  /**
   * @return {boolean} パスかどうかを返す
   */
  last_think_pass() {
    this.make_best(); // 計算済みなら再計算は発生しない
    // ベストな手札が完成している = これ以上良い手を作れない => パス
    // 手札が完成していないなら交換
    return this.is_best();
  }

  /**
   * @return {number} 交換するインデックス
   */
  last_think_change() {
    for (const [i, h] of this.hand.entries()) {
      // ベストじゃない手を card と交換
      if (! this.best_target.includes(h)) return i;
    }
    throw new Error(`panic: card=0b${card.toString(2)}`);
  }

  /**
   * Lv2のon_think_pass処理を呼び出す
   * @param {Array<PlayerInfo>}  info   他のプレイヤーの状態(自分を含まない)
   * @param {number}             round  今のラウンド数
   * @param {number}             id     自分の席の番号
   * @return {boolean}           pass なら true
   */
  lv2_think_pass(info, round, id) {
    return super.on_think_pass(info, round, id);
  }
  /**
   * Lv2のon_think_change処理を呼び出す
   * @param {Card} card
   * @param {number} round
   * @return {number} index
   */
  lv2_think_change(card, round) {
    return super.on_think_change(card, round);
  }

  /**
   * パスか交換かを選ぶ
   * @virtual
   * @param {Array<PlayerInfo>}  info   他のプレイヤーの状態(自分を含まない)
   * @param {number}             round  今のラウンド数
   * @param {number}             id     自分の席の番号
   * @return {boolean}           pass なら true
   */
  on_think_pass(info, round, id) {
    // ラストラウンドならベストを出すまで交換しまくる
    if (round === this.round_max) {
      return this.last_think_pass();
    }
    // Lv2を流用
    return this.lv2_think_pass(info, round, id);
  }

  /**
   * @virtual
   * @param {Card} card
   * @param {number} round
   * @return {number}   交換する手札のインデックス
   */
  on_think_change(card, round) {
    // best_target が存在する = ラストラウンドなので手を最強にする
    if (this.best_target.length !== 0) {
      return this.last_think_change();
    }
    // Lv2を流用
    return this.lv2_think_change(card, round);
  }
}

/**
 * @class
 * Lv3 をベースに他のプレイヤーの１手先まで読む
 */
class Lv4 extends Lv3 {
  /**
   * @constructor
   * @param {number} seed
   * @param {number} max   ラウンド数
   * @param {Set<number>} used
   */
  constructor(seed, max, used) {
    super(seed, max, used);
  }

  /**
   * パスか交換かを選ぶ
   * @virtual
   * @param {Array<PlayerInfo>}  info   他のプレイヤーの状態(自分を含まない)
   * @param {number}             round  今のラウンド数
   * @param {number}             id     自分の席の番号
   * @return {boolean}           pass なら true
   */
  on_think_pass(info, round, id) {
    // ラストラウンドならベストを出すまで交換しまくる
    if (round === this.round_max) {
      return this.last_think_pass();
    }
    /*
     * パスしていないプレイヤーは次も交換すると見て１手先読みし、
     * 交換したあとの期待値を見る
     * ただし、ストレート以上は手を変えず次にパスすると予想する
     */
    if (this.get_dl(round) >= 1) {
      const pow = info.map(i => {
        // パス or ストレート以上ならそのパワーで確定
        return i.pass || i.type >= Poker.Straight? i.power:
          this.calc_ev(i.hand, i.deck).reduce((acc, e)=>acc + e, 0);
      });
      const winner = pow.reduce((cnt, ev) => cnt += ev > this.power? 1: 0, 0);
      // 半数以上が自分より強いなら引くべきだが
      if (winner >= info.length / 2) {
        const next = this.calc_ev().reduce((acc, e)=>acc + e, 0);
        const win2 = pow.reduce((cnt, ev) => cnt += ev > next? 1: 0, 0);
        // 次の１手でも敵のほうが強いなら引く意味はない
        if (win2 >= info.length / 2) {
          return this.choice_pass(round); // パス
        } else {
          // でなければ交換
          return this.choice_change(round);
        }
      }
    }
    // Lv3のLv2を流用
    return super.lv2_think_pass(info, round, id);
  }

  // on_think_change は Lv3 を流用
}

