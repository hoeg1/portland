export const VERSION = '1.0.0';

import Rand from './rand.js';

import {
  Poker,
  make_card,
} from './poker.js';


// number なデータ Card 型をLSPに教える
/**
 * @import { Card } from './poker.js';
 */


/**
 * 思考用のデータ
 * @typedef {Object} PlayerInfo
 *
 * @property {number}      id    プレイヤーの席番号 = 親クラスのインデックス位置
 * @property {string}      name  プレイヤーの名前（GUI表示用）
 * @property {score}       score プレイヤーの現在スコア
 * @property {boolean}     pass  プレイヤーがパスしているか
 *
 * @property {Array<Card>} hand  プレイヤーの手札
 * @property {Array<Card>} deck  プレイヤーの残りデッキ（混ぜているので順序は不明）
 * @property {number}      type  プレイヤーの現在の役。タイブレーク無視。
 * @property {number}      power プレイヤーの（タイを考慮した）手札の強さ
 */


export class Player extends Rand {
  /**
   * @constructor
   *
   * @param {number} seed
   * @param {string} name
   * @param {boolean} is_human
   * @param {number}  max ラウンドの最大数: 5 or 6
   *
   *
   * @property {string}         name      プレイヤーの名前
   * @property {boolean}        is_human  人間が操作するプレイヤーか
   * @property {number}         round_max ラウンドの最大数
   *
   * @property {number}         type      手札の役
   * @property {string}         yaku      役の文字列表現（英語）
   * @property {number}         power     タイブレを考慮した手札の強さ
   *
   * @property {number}         _score    累計得点
   * @property {Array<number>}  history   各ラウンドでの追加点のリスト
   *
   * @property {boolean}        pass      パスしているか
   * @property {Array<Card>}    deck      個人の山札
   * @property {Array<Card>}    hand      現在の手札
   */
  constructor(seed, name, is_human, max) {
    super(seed);
    this.name     = name;
    this.is_human = is_human;
    this.round_max = max;
    //
    this._score  = 0;
    this.history = []; // 各ラウンドの得点履歴
    //
    this.pass = false;
    //
    this.deck = [];
    for (let suit = 1; suit <= 4; ++suit) {
      for (let rank = 1; rank <= 13; ++rank) {
        this.deck.push( make_card(suit, rank) );
      }
    }
    this.shuffle(this.deck);
    this.hand = [];
  }

  /**
   * 得点を加算＆記録する
   * @param {number} pt
   */
  add_score(pt) {
    this.history.push( pt ); // ラウンドごとの得点を記録
    // 累計得点を記録
    this._score += pt;
  }

  /**
   * @return {number}  累計得点を返す
   */
  get score() { return this._score; }

  /**
   * このラウンド or 直前のラウンドでこのプレイヤーが得た得点
   * @return {number}
   */
  get katen() {
    return this.history.length === 0? 0: this.history[ this.history.length - 1 ];
  }

  /**
   * 最初の５枚を引く & パス状態をリセット
   */
  init_hand() {
    this.hand = [];
    const max = Math.min(5, this.deck.length);
    for (let i = 0; i < max; ++i) {
      this.hand.push( this.deck.pop() );
    }
    this.calc_power();
    // パス状態をリセット
    this.pass = this.deck.length === 0;
    // virtual
    this.on_init_hand();
  }

  /**
   * 外部から手の役とパワーを見られるようにする
   * 手札が変わるたび呼び出すようにする
   */
  calc_power() {
    const p = new Poker(this.hand);
    this.type  = p.type;
    this.power = p.power;
    this.yaku  = p.toString(); // 役の英語表現
  }

  /**
   * 手札の del_idx 番目を card にする
   * @param {number} del_idx
   * @param {Card}   card
   */
  change_hand(del_idx, card) {
    this.hand[del_idx] = card;
    this.calc_power();
    this.update_card(del_idx, card);
  }

  /**
   * パスか交換かを選ぶ
   * @virtual
   * @param {Array<PlayerInfo>}  info   他のプレイヤーの状態(自分を含まない)
   * @param {number}             round  今のラウンド数
   * @param {number}             id     自分の席の番号
   *
   * @return {Promise<boolean>}  パスならtrue, 交換ならfalse
   */
  async think_pass(_info, _round, _id) {
    return new Promise(resolve => {
      if (this.deck.length >= 1) {
        // false を返したら自動で this.deck.pop() される
        resolve(this.rand(2) === 0);
      } else {
        resolve(true);
      }
    });
  }

  /**
   * think_pass で false を返したら自動でデッキがポップされ 1 枚渡される
   * @virtual
   * @param {Card} card     めくられたカード
   * @param {number} round  ラウンド数
   *
   * @return {Promise<number>} そのカードを挿入する位置
   */
  async think_change(_card, round) {
    return new Promise(resolve => {
      resolve(this.rand(this.hand.length));
    });
  }

  /**
   * @virtual
   * 最初の手札が配られたとき呼ばれる
   */
  on_init_hand() {
  }

  /**
   * @virtual
   * @param {number} idx  交換されたインデックス
   * @param {Card}   card 交換したカード
   */
  update_card(idx, card) {
  }
}


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


export class Portland extends Rand {
  /**
   * ゲームのルールを管理する。
   *
   * do {
   *   round_start();
   *   while ( await play() );
   * } while ( round_end() );
   *
   * のように呼び出す。
   *
   * @param {number}            seed          このゲームのシード
   * @param {Array<Player>}     players       プレイヤの配列
   * @param {number}            [rounds]      最大ラウンド数: 6 or 5 を想定
   *
   * @property {Array<Player>}  players       参加するプレイヤー
   * @property {number}         np            参加人数 = players.length
   * @property {number}         round_max     最大ラウンド数
   *
   * @property {number}         round_count   現在までのラウンド数（最低でも１）
   * @property {number}         turn          現在の手番の index
   * @property {Player}         start_player  このラウンドの最初の手番
   */
  constructor(seed, players, rounds=6) {
    super(seed);
    this.players   = players;
    this.np        = players.length;
    this.round_max = rounds;
    //
    this.round_count = 1;
    this.turn = this.rand(this.np);
    this.start_player = this.players[ this.turn ];
  }

  /**
   * 手番プレイヤーに他のプレイヤーの状態を教えるためのデータを作る。
   * @return {Array<PlayerInfo>}  自分自身の情報は無用なので含まない
   */
  make_player_info() {
    const lst = [];
    for (let i = 0; i < this.np; ++i) {
      if (i === this.turn) continue;
      const pl = this.players[i];
      lst.push({
        id: i,
        name: pl.name,
        score: pl.score,
        pass: pl.pass,
        hand: [...pl.hand],
        deck: this.shuffle([...pl.hand]),
        type: pl.type,
        power: pl.power,
      });
    }
    return lst;
  }

  /**
   * 現在の手番プレイヤーを返す
   * @return {Player}
   */
  get teban() { return this.players[ this.turn ]; }


  /**
   * 全プレイヤーに最初の５枚を引かせる
   */
  round_start() {
    for (const pl of this.players) {
      pl.init_hand(); // ついでに pl.pass = false; される
    }
  }

  /**
   * 手番の think_pass を呼び出す
   * @return {Promise<boolean>} ラウンド終了ならfalse
   */
  async play() {
    const teban = this.teban;
    if (teban.pass) {
      // 前回トップが手札５枚以下になった場合、パスなのに手番が来る可能性がある
      const all_pass = this.turn_next();
      return !all_pass;
    }
    const pi = this.make_player_info();
    const pass = await teban.think_pass(pi,
      this.round_count, this.round_max, this.turn);
    if (pass) {
      teban.pass = true;
    } else {
      if (teban.deck.length >= 1) {
        const card = teban.deck.pop();
        const idx = await teban.think_change(card, this.round_count);
        if (idx >= teban.hand.length || idx < 0)
          throw new RangeError(`idx = ${idx}`);
        // 交換
        if (teban.deck.length === 0) teban.pass = true;
        teban.change_hand(idx, card);
      } else {
        throw new Error('deck is empty');
      }
    }
    //
    const all_pass = this.turn_next();
    // この手番以外全員パスで、この手番もさっきパスした = 全員パスした
    if (all_pass && teban.pass) {
      return false;
    }
    return true;
  }

  /**
   * 次の手番を計算
   * @return {boolean} 今の手番以外全員パスなら true
   */
  turn_next() {
    for (let turn = this.turn + 1; turn !== this.turn; ++turn) {
      if (turn === this.np) {
        if (this.turn === 0) break;
        turn = 0;
      }
      const p = this.players[ turn ];
      if (p.deck.length >= 1 && !p.pass) {
        // パスしていない手番をみつけた
        this.turn = turn;
        return false;
      }
    }
    return true;
  }

  /**
   * ラウンドが終わったときに呼ぶ
   * @return {boolean} ゲーム終了ならfalse
   */
  round_end() {
    // pp = Array<Array<player>>
    const pp = this.players.map(pl=>({sc:pl.power, pl:pl})).sort((a,b)=>b.sc-a.sc).
      reduce((obj, p)=>{
        if (obj.same !== p.sc) {
          obj.same = p.sc;
          obj.lst.push([ p.pl ]);
        } else {
          // 同点は多重配列に入れる
          obj.lst[ obj.lst.length - 1 ].push(p.pl);
        }
        return obj;
      }, {same:-1, lst:[]}).lst;
    //////////////////////
    // 得点を与える
    let pt = this.np; // 最初に -1 されるから np でよい
    for (const p of pp) {
      let k = 0;
      for (let i = 0; i < p.length; ++i) {
        pt -= 1;                      // 同点が複数いたら pt は減るし
        k += (pt * this.round_count); // k にその順位であれば取れた得点が加算
      }
      k = Math.trunc(k / p.length); // 同点が複数いたら合計を折半
      for (const pl of p) {
        pl.add_score(k); // 得点させる
      }
    }
    ////////////////////////////////////////////////////
    // ラウンドを進める
    this.round_count += 1;
    if (this.round_count > this.round_max) {
      return false;
    }
    // 続行
    this.calc_start_player(pp[0]);
    return true;
  }

  /**
   * top (リスト) から次のスタートプレイヤーを算出
   * @param {Array<Player>} top  1位だったプレイヤーのリスト（複数いるかもしれない）
   */
  calc_start_player(top) {
    //////////////
    if (top.length >= 2) {
      // 1位が複数
      // => 前回のスタートプレイヤーから席順で最も近い: ゲームファーム推奨ルール
      const sp = this.start_player;
      const si = this.players.findIndex(p => p === sp);
      // 座席の離れ具合を計算
      const diff = pl => {
        if (pl === sp) return 999; // 前回の sp は除外
        let s = this.players.findIndex(p => p === pl);
        if (s === -1) throw new Error('panic! s:idx = -1');
        let cnt = 0;
        while (true) {
          s += 1;
          cnt += 1;
          if (s >= this.np) s = 0;
          if (s === si) {
            return { cnt: cnt, idx: s };
          }
        }
        // unreachable
      };
      let bp = 9999;
      let bpl = null;
      let bpi = -1;
      for (const p of top) {
        const d = diff(p);
        // 距離が最も近いのを採用
        if (d.cnt < bp) {
          bp  = d.cnt;
          bpl = p;
          bpi = d.idx;
        }
      }
      this.start_player = bpl;
      this.turn = bpi;
    } else {
      // 1位がひとりだけ
      this.start_player = top[0];
      this.turn = this.players.findIndex(p => p === top[0]);
    }
    if (this.turn === -1) throw new Error('panic! this.turn === -1');
  }
}


