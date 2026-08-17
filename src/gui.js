import Rand from "./rand.js";

import {
  to_rank,
  to_suit,
} from "./poker.js";

import { Player, Portland } from "./portland.js";

import { get_lv, LV_MAX } from "./lv.js";

// ウェイトは直で書いてしまう
const g_speed = 750;

/**
 * await sleep(x) の形で指定されたミリ秒待つだけの関数
 * @param {number} ms
 */
export const sleep = ms => new Promise(res=>setTimeout(res, ms));

// number なデータ Card 型をLSPに教える
/**
 * @import { Card } from './poker.js';
 */

const PASS_CH = '🅿';
const TURN_CH = '▶';

const FACE=['r1','r2','r3','r4','r5','r6','r7','r8','r9','r10','r11','r12','r13',
  's1','s2','s3','s4'];

class Human extends Player {
  constructor(seed, max) {
    super(seed, 'あなた', true, max);
  }
  state_with_path() {
    // 手札を再描画するようなタイミングについて
    const mes = document.getElementById('player_msg');
    mes.textContent =
      `${this.pass? PASS_CH+' ':''}${this.name} (${this.score}pt) - ${this.yaku}`;
    if (this.pass) {
      document.getElementById('pass_but').disabled = true;
    }
  }

  /**
   * @virtual
   * Player クラスで change_hand されたとき呼び出される。
   * @param {number} idx 交換された手札の位置
   * @param {Card} card  交換したカード
   */
  update_card(idx, card) {
    this.cards[idx].classList.remove(...FACE);
    this.cards[idx].classList.add(`r${to_rank(card)}`, `s${to_suit(card)}`);
    this.cards[5].textContent = this.deck.length;
    // パスしているかを再描画する
    this.state_with_path();
  }

  show_hand() {
    // すべての手札を再描画するようなタイミング = 全カードを再描画したときについて
    for (let i = 0; i < 5; ++i) {
      this.cards[i].classList.remove(...FACE, 'bk');
      if (i < this.hand.length) {
        const card = this.hand[i];
        this.cards[i].style.visibility = 'visible';
        this.cards[i].classList.add(`r${to_rank(card)}`, `s${to_suit(card)}`);
      } else {
        // 手札が５枚以下のとき、剰余の手札を見た目的に隠す
        this.cards[i].style.visibility = 'hidden';
      }
    }
  }

  /**
   * 見た目のたたき台を生成する
   */
  make_gui() {
    this.cards = [];
    const pa = document.getElementById('player_area');
    for (let i = 0; i < 6; ++i) {
      const c = document.createElement('span');
      c.classList.add('bk');
      if (i === 5) {
        c.classList.add('ma');
      } else {
        c.index_num = i;
      }
      pa.appendChild(c);
      this.cards.push(c);
    }
  }

  /**
   * @virtual
   * ラウンド最初の５枚を引いたとき
   */
  on_init_hand() {
    this.show_hand(); // 全カードを再描画
    this.state_with_path();
    this.cards[5].textContent = this.deck.length;
  }

  /**
   * パスか交換かを選ぶ
   * @return {Promise}           パスならtrue, 交換ならfalse
   */
  think_pass() {
    return new Promise(resolve => {
      const mes = document.getElementById('player_msg');
      mes.textContent = `${TURN_CH} ${this.name} (${this.score}pt) - ${this.yaku}`;
      const pass = document.getElementById('pass_but');
      pass.disabled = false;
      const pass_evt = () => {
        mes.textContent = `${PASS_CH} ${this.name} (${this.score}pt) - ${this.yaku}`;
        pass.disabled = true;
        pass.removeEventListener('click', pass_evt);
        this.cards[5].classList.remove('click-ok');
        this.cards[5].removeEventListener('click', change_evt);
        //
        resolve(true);
      };
      const change_evt = () => {
        if (this.deck.length === 0) return;
        pass.disabled = true;
        pass.removeEventListener('click', pass_evt);
        this.cards[5].classList.remove('click-ok');
        this.cards[5].removeEventListener('click', change_evt);
        //
        resolve(false);
      };
      pass.addEventListener('click', pass_evt);
      // デッキがゼロなら自動的にパス扱いになる
      this.cards[5].classList.add('click-ok');
      this.cards[5].addEventListener('click', change_evt);
    });
  }

  /**
   * 交換するカードを選ぶ
   * @param {Card} card
   * @param {number} round
   * @return {Promise}           パスならtrue, 交換ならfalse
   */
  think_change(card, _round) {
    return new Promise(resolve => {
      const sr = [`s${to_suit(card)}`, `r${to_rank(card)}`];
      this.cards[5].textContent = '';
      this.cards[5].classList.remove('bk');
      this.cards[5].classList.add(...sr);
      const evt = e => {
        this.cards[5].classList.remove(...sr);
        this.cards[5].classList.add('bk');
        for (let i = 0; i < this.hand.length; ++i) {
          this.cards[i].classList.remove('click-ok');
          this.cards[i].removeEventListener('click', evt);
        }
        resolve(e.target.index_num);
      };
      for (let i = 0; i < this.hand.length; ++i) {
        this.cards[i].classList.add('click-ok');
        this.cards[i].addEventListener('click', evt);
      }
    });
  }
}

/**
 * 任意のLvに対しGUIで必要なインターフェイスを設定する
 * @param {Lv} lv
 */
const add_cpu_method = lv => {
  lv.update_card = (idx, card) => {
    lv.cards[idx].classList.remove('bk');
    lv.cards[idx].classList.add(`r${to_rank(card)}`, `s${to_suit(card)}`);
    lv.p1.textContent = `${lv.pass? PASS_CH+' ':''}${lv.name} (${lv.score}pt)`;
    lv.p2.textContent = `${lv.yaku} [${lv.deck.length}]`;
  };

  lv.show_hand = () => {
    for (let i = 0; i < 5; ++i) {
      lv.cards[i].classList.remove(...FACE, 'bk');
      if (i < lv.hand.length) {
        const card = lv.hand[i];
        lv.cards[i].style.visibility = 'visible';
        lv.cards[i].classList.add(`r${to_rank(card)}`, `s${to_suit(card)}`);
      } else {
        lv.cards[i].style.visibility = 'hidden';
      }
    }
  };

  lv.make_gui = () => {
    lv.cards = [];
    const ca = document.getElementById('cpu_area');
    //
    const ci = document.createElement('div');
    ci.classList.add('cpu-info');
    lv.p1 = document.createElement('p');
    lv.p2 = document.createElement('p');
    lv.p2.classList.add('info-r');
    ci.appendChild(lv.p1);
    ci.appendChild(lv.p2);
    ca.appendChild(ci);

    const div = document.createElement('div');
    const p = document.createElement('p');
    lv.cards = [];
    for (let i = 0; i < 5; ++i) {
      const c = document.createElement('span');
      c.classList.add('bk');
      p.appendChild(c);
      lv.cards.push(c);
    }
    div.appendChild(p);
    ca.appendChild(div);
  };

  lv.on_init_hand = () => {
    lv.show_hand();
    lv.p1.textContent = `${lv.pass?PASS_CH+' ':''}${lv.name} (${lv.score}pt)`;
    lv.p2.textContent = `${lv.yaku} [${lv.deck.length}]`;
  };

  /**
   * 任意のLvに対して「手を決めろ」と迫られたとき
   * @param {Array<PlayerInfo>}  info   他のプレイヤーの状態(自分を含まない)
   * @param {number}             round  今のラウンド数
   * @param {number}             id     自分の席の番号
   *
   * @return {Promise<boolean>}           パスならtrue, 交換ならfalse
   */
  lv.think_pass = async (info, round, id) => {
    lv.p1.textContent = `${TURN_CH} ${lv.name} (${lv.score}pt)`;
    const pass = lv.on_think_pass(info, round, id);
    if (pass) {
      await sleep(g_speed);
      lv.p1.textContent = `${PASS_CH} ${lv.name} (${lv.score}pt)`;
    } else {
      await sleep(g_speed / 2);
    }
    return pass;
  };

  /**
   * 任意のLvに対して「card を手札のどの index と交換するか決めろ」と迫られたとき
   * @param {Card} card      判断のための「交換するカード値」
   * @param {number} round   判断のための「今のラウンド数」
   * @return {Promise<number>} index
   */
  lv.think_change = async (card, round) => {
    const idx = lv.on_think_change(card, round);
    lv.cards[idx].classList.remove(...FACE);
    lv.cards[idx].classList.add('bk');
    await sleep(g_speed / 2);
    return idx;
  };
};

const show_round = (round, max) => {
  document.getElementById('tit_h1').textContent = `Portland ${round}/${max}ʀ`;
};

const hide_round = () => {
  document.getElementById('tit_h1').textContent = 'Portland';
};

const remove_gui = () => {
  document.getElementById('player_area').textContent = '';
  document.getElementById('cpu_area').textContent = '';
};


/**
 * @param {Portland} pl
 */
const game_loop = async (pl) => {
  let has_next = true;
  while (has_next) {
    pl.round_start();
    show_round(pl.round_count, pl.round_max);
    while (await pl.play());
    has_next = pl.round_end();
    const king = pl.players.reduce((cur, p) => {
      const pt = has_next? p.katen: p.score;
      return pt > cur? pt: cur;
    }, -1);
    let winner_str = 'ゲーム終了！\n勝者:\n';
    for (const p of pl.players) {
      const kk = has_next? p.katen === king: p.score === king;
      const txt = `${kk?'👑':''}${p.name} ${p.score}pt (+${p.katen})`;
      if (p.score === king) winner_str += `👑 ${p.name}\n`;
      if (p.is_human) {
        const mes = document.getElementById('player_msg');
        mes.textContent = has_next?
          `第 ${pl.round_count - 1}ʀ 終了: ${txt} - ${p.yaku}`:
          `ゲーム終了: ${txt} - ${p.yaku}`;
      } else {
        p.p1.textContent = txt;
      }
    }

    if (!has_next) {
      // 再描画に猶予をもたせる
      setTimeout(() => alert(winner_str), 30);
    }

    const pass = document.getElementById('pass_but');
    pass.classList.remove('pass-but');
    pass.classList.add('next-mode');
    pass.textContent = has_next? "NEXT": "New Game";
    pass.disabled = false;
    await new Promise(resolve => {
      const ev = ()=>{
        pass.removeEventListener('click', ev);
        pass.classList.remove('next-mode');
        pass.classList.add('pass-but');
        pass.textContent = 'PASS';
        resolve();
      };
      pass.addEventListener('click', ev);
    });
  }
  hide_round();
  remove_gui();
}

const game_start = async () => {
  const game_id = new Rand();
  const max = document.getElementById('enable5').checked? 5: 6;
  const lv = parseInt(document.getElementById('lv_sel').value);
  const np = parseInt(document.getElementById('np_sel').value);
  console.log('seed:',game_id.seed, 'lv:',lv===0?'random':lv);
  //
  const players = [];
  const used = new Set();
  for (let i = 0; i < np - 1; ++i) {
    const LV = lv === 0? game_id.rand(LV_MAX) + 1: lv; // 0 => 1 ~ LV_MAX
    const cpu = get_lv(LV, game_id.next_int(), max, used);
    add_cpu_method(cpu);
    players.push( cpu );
  }
  const human = new Human(game_id.next_int(), max);
  players.push( human );
  for (const pl of players) {
    pl.make_gui();
  }
  //
  document.getElementById('game_box').hidden = false;
  document.getElementById('setup_box').hidden = true;
  await game_loop(new Portland(game_id.next_int(), players, max));
  document.getElementById('game_box').hidden = true;
  document.getElementById('setup_box').hidden = false;
};

window.onload = () => {
  document.getElementById('start_but').addEventListener('click', game_start);
};

