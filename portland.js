"use strict";

import {
  Pile,
  calc_poker,
  pt2str,
  think_avg,
  remove_tie,
  POKER,
} from "./poker.js";


// 配列を混ぜる
export const shuffle_array = function( ary ) {
  for (let i = ary.length - 1; i > 0; --i) {
    const r = Math.floor( Math.random() * (i + 1) );
    [ary[i], ary[r]] = [ary[r], ary[i]];
  }
  return ary;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class Player {
  constructor(name, id, sakusen=[], kiai=0) {
    this.name = name;
    this.id = id;
    this.is_player = id == 0;
    this.sakusen = sakusen;
    this.kiai = kiai;
    //
    this.konjo = 1.5 + Math.random(); // 1.5 ~ 2.5
    this.S = sakusen[0] / this.konjo;
    //
    this.pile = new Pile();
    this.cur_card = null;
    this.vp = 0;
    this.yaku = 0;
    this.passed = false;
    this.res = false;
    this.tos = null;
    //
    this.make_box();
  }

  make_box() {
    this.name_view = document.createElement('span');
    this.name_view.innerText = this.name;
    this.name_view.setAttribute('class', 'ib_name');
    this.name_view.setAttribute('disabled', true);
    this.info_view = document.createElement('span');
    this.info_view.setAttribute('class', 'ib_info');
    this.info_view.innerText = "0vp stock 47";
    this.state_view = document.createElement('span');
    this.state_view.setAttribute('class', 'ib_state');
    this.state_view.setAttribute('disabled', true);
    const info_box = document.createElement('span');
    info_box.appendChild(this.name_view);
    info_box.appendChild(this.info_view);
    info_box.appendChild(this.state_view);
    info_box.setAttribute('class', 'ib_box');
    // box
    this.box = document.createElement('div');
    this.box.setAttribute('class', this.is_player? 'player_box': 'ai_box');
    this.box.appendChild(info_box);
    // 手札を入れる場所
    const hand_div = document.createElement('div');
    hand_div.setAttribute('class', this.is_player? 'player_hand': 'ai_hand');
    this.box.appendChild(hand_div);
    // 山札の周り
    const change = document.createElement('div');
    change.setAttribute('class', this.is_player? 'player_change': 'ai_change');
    hand_div.appendChild(change);
    // 山札
    if (this.is_player) {
      this.pile_view = document.createElement('button');
      this.pile_view.setAttribute('class', 'player_card card_back');
      this.pile_view.setAttribute('disabled', true);
      this.pile_view.addEventListener('click', () => {
        this.on_click('pile', 0);
      });
    } else {
      this.pile_view = document.createElement('div');
      this.pile_view.setAttribute('class', 'ai_card');
      this.pile_view.setAttribute('disabled', true);
    }
    change.appendChild(this.pile_view);
    // 手札５枚
    this.hand_view = [];
    for (let i = 0; i < 5; ++i) {
      const card = document.createElement(this.is_player? 'button': 'div');
      card.setAttribute('class', this.is_player? 'player_card': 'ai_card');
      hand_div.appendChild(card);
      this.hand_view.push(card);
      if (this.is_player) {
        card.addEventListener('click', () => {
          this.on_click('hand', i);
        });
      }
    }
    // 役の表示
    if (this.is_player) {
      // ボタン類
      const pb = document.createElement('div');
      pb.setAttribute('class', 'pass_or_pt');
      this.box.appendChild(pb);
      this.pass_button = document.createElement('button');
      this.pass_button.setAttribute('class', 'pass_button');
      this.pass_button.setAttribute('disabled', true);
      this.pass_button.innerText = "PASS";
      this.pass_button.addEventListener('click', () => {
        this.on_click('pass', 0);
      });
      pb.appendChild(this.pass_button);
      this.yaku_text = document.createElement('span');
      this.yaku_text.setAttribute('class', 'player_yaku');
      pb.appendChild(this.yaku_text);
    } else {
      this.yaku_text = document.createElement('div');
      this.yaku_text.setAttribute('class', 'ai_yaku');
      hand_div.appendChild(this.yaku_text);
    }
  }

  // 0-3にスートを対応付けしてカードを表示
  make_card(card) {
    const suit = ['club', 'diamond', 'heart', 'spade'];
    const rank = ['Ａ','２','３','４','５','６','７','８','９','10','Ｊ','Ｑ','Ｋ'];
    const c = document.createElement('div');
    c.setAttribute('class', `suit_${ suit[ card.suit ] }`);
    c.innerText = rank[ card.rank ];
    return c;
  }

  // 役を表示
  redraw_yaku() {
    if (this.hand.length != 0) {
      this.yaku = calc_poker( this.hand );
    } else {
      this.yaku = 0;
    }
    this.yaku_text.innerText = pt2str( this.yaku );
  }

  toString() {
    const suit = ['♣', '♦', '♥', '♠'];
    const rank = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let str = this.name + ': ';
    for (const h of this.hand) {
      str += suit[ h.suit ] + rank[ h.rank ] + ' ';
    }
    return str + '- ' + pt2str( this.yaku );
  }

  // 得点を再表示
  redraw_info_box() {
    this.info_view.innerText = ` ${this.vp}vp stock ${this.pile.length}`;
  }

  // 各ラウンドの最初に呼ばれる
  // カードを５枚引き、状態を初期化する
  init_round() {
    this.hand = [];
    for (let i = 0; i < 5; ++i) {
      if (this.pile.is_empty()) break;
      this.hand[i] = this.pile.deal();
    }
    // 再描画 => カードは存在しないかも
    for (let i = 0; i < 5; ++i) {
      if (i < this.hand.length) {
        if (this.hand_view[i].lastChild)
          this.hand_view[i].removeChild(this.hand_view[i].lastChild);
        this.hand_view[i].appendChild( this.make_card( this.hand[i] ) );
      } else {
        if (this.hand_view[i].lastChild)
          this.hand_view[i].removeChild(this.hand_view[i].lastChild);
        this.hand_view[i].setAttribute('class',
          (this.is_player? 'player_card': 'ai_card') + ' empty');
      }
      // とりま押せなくする
      if (this.is_player) {
        this.hand_view[i].setAttribute('disabled', 'disabled');
      }
    }
    // 強制 pass
    if (this.hand.length != 0) {
      this.passed = false;
      if (this.is_player)
        this.pass_button.setAttribute('disabled', 'disabled');
      this.state_view.setAttribute('disabled', 'disabled');
    } else {
      this.pass();
      if (!this.is_player)
        this.pile_view.setAttribute('disabled', 'disabled');
    }
    // 役とvp
    this.redraw_yaku();
    this.redraw_info_box();
  }

  pass() {
    this.passed = true;
    if (this.is_player) {
      this.pass_button.setAttribute('disabled', 'disabled');
      this.pile_view.setAttribute('disabled', 'disabled');
    }
    this.state_view.removeAttribute('disabled'); // PASS を表示
  }

  // 山札からカードを引いて表示する
  get_pile() {
    if (this.pile.is_empty()) throw new Error('empty');
    this.cur_card = this.pile.deal();
    if (this.is_player) {
      this.pile_view.removeAttribute('class');
      this.pile_view.setAttribute('class', 'player_card');
      // もう押せない
      this.pile_view.setAttribute('disabled', 'disabled');
      this.pass_button.setAttribute('disabled', 'disabled');
      // 置く先を押せるようにする
      for (const h of this.hand_view) {
        h.removeAttribute('disabled');
      }
    } else {
      this.pile_view.removeAttribute('disabled');
      this.pile_view.removeAttribute('class');
      this.pile_view.setAttribute('class', 'ai_card');
    }
    this.redraw_info_box();
    this.pile_view.appendChild( this.make_card( this.cur_card ) );
  }

  // 山から引いたカードを置く
  put(idx) {
    if (this.cur_card == null) throw new Error('山からカードを引いてない');
    // 山札を消す
    this.pile_view.removeChild( this.pile_view.lastChild );
    this.pile_view.setAttribute('disabled', 'disabled');
    this.pile_view.removeAttribute('class');
    if (this.pile.is_empty()) {
      this.pile_view.setAttribute('class', (this.is_player? 'player_card': 'ai_card') + ' empty');
    } else {
      if (this.is_player) {
        this.pile_view.setAttribute('class', 'player_card card_back');
      } else {
        this.pile_view.setAttribute('class', 'ai_card');
        this.pile_view.setAttribute('disabled', 'disabled');
      }
    }
    // 置く
    this.hand[idx] = this.cur_card;
    if (this.hand_view[idx].lastChild)
      this.hand_view[idx].removeChild(this.hand_view[idx].lastChild);
    this.hand_view[idx].appendChild( this.make_card( this.cur_card ) );
    this.cur_card = null;
    if (this.is_player) {
      for (const h of this.hand_view) {
        h.setAttribute('disabled', 'disabled');
      }
      this.pass_button.setAttribute('disabled', 'disabled');
    }
    // 役を再計算
    this.redraw_yaku();
  }


  // 手番になったとき => pass したら呼ばれない
  async on_turn(round, pi, vp) {
    if (this.passed) throw new Error('passしてるのに呼ばれた');
    this.res = true;
    this.name_view.removeAttribute('disabled'); // 三角を表示
    if (this.is_player) {
      // 山を引くかパスか
      if (!this.pile.is_empty())
        this.pile_view.removeAttribute('disabled');
      this.pass_button.removeAttribute('disabled');
      while (this.res) {
        await sleep(1);
      }
    } else {
      if (this.pile.is_empty()) {
        this.pass();
      } else {
        if (this.think_pass(round, pi, vp)) {
          this.pass();
          await sleep(500);
        } else {
          this.get_pile();
          await sleep(500);
          const idx = this.think_put();
          this.put(idx);
        }
      }
    }
    this.name_view.setAttribute('disabled', 'disabled'); // 三角を消す
  }

  // 押されたとき
  // kind ... pile or hand or pass
  // idx ... 押された手札のインデックス
  on_click(kind, idx) {
    if (this.res == false) {
      console.log(kind, idx);
      return;
    }
    switch (kind) {
      case 'pile':
        this.get_pile();
        break;
      case 'pass':
        this.pass();
        this.res = false;
        break;
      case 'hand':
        this.put(idx);
        this.res = false;
        break;
    }
  }

  // 思考ルーチン
  // まずはパスするか引くかを決める
  think_pass(round, pi, vp) {
    const N = pi.length;
    const data = pi[this.id];
    const enemy = [];
    for (let i = 0; i < N; ++i) {
      if (i == this.id) continue;
      const win = pi[i].yaku > data.yaku;
      if (win || (!pi[i].pass && pi[i].avg.length != 0)) {
        enemy.push({
          win: win,
          dat: pi[i]}
        );
      }
    }
    // 他が全員自分より弱く、パス済みばかりならパス
    if (enemy.length == 0) {
      this.shift_sakusen(round);
      return true;
    }
    // 自分より強いか、まだパスしていないやつがいる
    // しかし straight, flush, full house なら手を壊すから引かない
    const yak = remove_tie(this.yaku);
    if (yak == POKER.STRAIGHT || yak == POKER.FLUSH || yak == POKER.FULL_HOUSE) {
      this.shift_sakusen(round);
      return true; // pass
    }
    // ラウンド６なら引くしかねえ
    if (round == 6) {
      return false; // 引く
    }
    // ラウンド６じゃなく、まだ作戦上引ける余地があるなら
    // とりま自分の期待値を計算
    const my_kitai = this.get_kitai(pi[this.id].avg);
    if (this.sakusen[round] != 0) {
      // 山札に余裕があって、手札が改善しそうなら or 自分が最下位なら引く
      if (this.S >= this.sakusen[round]
        || (my_kitai > remove_tie(this.yaku) || vp[this.id].vp == 0)) {
        this.sakusen[ round ] -= 1; // 次の余裕を無くす
        return false; // 引く
      }
    } else {
      // 作戦上、引いてはいけないが……
      if (round == 6) throw new Error('round = 6');
      if (this.sakusen[ round + 1 ] != 0 && vp[this.id].vp == 0) {
        let winner = 0;
        for (const e of enemy) {
          const kitai = e.dat.pass?
            remove_tie(e.dat.yaku): this.get_kitai(e.dat.avg);
          if (kitai > my_kitai) winner += 1;
        }
        const avg = winner / enemy.length;
        if (avg < this.kiai) {
          this.sakusen[ round + 1 ] -= 1; // 次の余裕を無くす
          return false; // 引く
        }
      }
    }
    // 諦める
    this.shift_sakusen(round);
    return true;
  }

  get_kitai(lst) {
    let kitai = 0.0;
    if (lst.length == 0) return 0;
    for (const aa of lst) {
      for (const a of aa) {
        kitai += a.type * a.avg;
      }
    }
    return kitai / lst.length;
  }

  shift_sakusen(round) {
    const cur_saku = this.sakusen[ round ];
    if (round < 6) {
      this.sakusen[ round + 1 ] += cur_saku;
      this.S = this.sakusen[ round + 1] / this.konjo;
    } else {
      this.S = this.sakusen[ 5 ] + cur_saku;
    }
  }

  // 置くことに決めた
  // TODO: ラストラウンド等で、どのカードを潰すか確率計算させたい
  think_put() {
    if (this.cur_card == null) throw new Error('cur_card = null');
    if (this.hand.length != 5) throw new Error('hand.len != 5');
    let best_idx = 0;
    let best = -100;
    for (let i = 0; i < 5; ++i) {
      const tmp = this.hand[i];
      this.hand[i] = this.cur_card;
      const score = calc_poker(this.hand);
      if (score > best) {
        best = score;
        best_idx = i;
      }
      this.hand[i] = tmp;
    }
    return best_idx;
  }
}

class PortlandView {
  constructor(players) {
    this.N = players.length;
    this.players = players;
    this.msg = document.getElementById('msg_box');
    this.create_table();
  }
  mes(str) {
    this.msg.innerText = str;
  }
  async msg_alert(str, after = null) {
    const but = document.createElement('button');
    but.innerText = str;
    this.mes('');
    this.msg.appendChild(but);
    let flag = true;
    but.onclick = () => {
      this.msg.removeChild(but);
      if (after != null) this.msg.innerText = after;
      flag = false;
    };
    while (flag) {
      await sleep(1);
    }
    if (after != null) await sleep(500);
  }
  round_begin() {
    for (let i = 0; i < this.N; ++i) {
      this.players[ i ].init_round();
    }
  }
  is_end() {
    for (let i = 0; i < this.N; ++i) {
      if (!this.players[i].passed) return false;
    }
    return true;
  }
  // 同点なら同じ順位の一番下になるように並べる
  get_vp(round) {
    const lst = [];
    for (let i = 0; i < this.N; ++i) {
      lst.push({
        idx: i,
        pt: this.players[i].yaku,
        jun: 0,
        vp: 0,
      });
    }
    lst.sort((a,b) => b.pt - a.pt);
    let cur_jun = this.N;
    let cur_pt = lst[ this.N - 1 ].pt;
    for (let i = this.N - 1; i >= 0; --i) {
      if (lst[i].pt != cur_pt) {
        cur_jun = i + 1;
        cur_pt = lst[i].pt;
      }
      lst[i].jun = cur_jun;
      lst[i].vp = (this.N - cur_jun) * round;
    }
    lst.sort((a,b) => a.idx - b.idx);
    return lst;
  }
  async play_loop() {
    this.round_begin();
    this.mes('Please Wait');
    const pi = [];
    for (let i = 0; i < this.N; ++i) {
      pi.push({
        pass: false,
        pile: this.players[ i ].pile,
        yaku: this.players[ i ].yaku,
        vp: this.players[ i ].vp,
        avg: think_avg(this.players[ i ].hand, this.players[ i ].pile)
      });
      await sleep(1);
      this.msg.innerText += '.';
    }
    let turn = Math.trunc(Math.random() * this.N);
    this.mes('第 1 ラウンド');
    for (let round = 1; round <= 6; ++round) {
      if (round == 6) this.mes('ラストラウンド');
      else this.mes(`第 ${round} ラウンド開始`);
      await sleep(1000);
      while (true) {
        const cur_turn = this.players[ turn ];
        // 手札があって、パスしていないヒトだけ
        if (cur_turn.hand.length != 0 && !cur_turn.passed) {
          this.mes(`第 ${round} ラウンド: ${this.players[ turn ].name} の手番です`);
          await cur_turn.on_turn(round, pi, this.get_vp(round));
          // update
          pi[turn].pass = cur_turn.passed;
          if (!cur_turn.passed) {
            pi[turn].yaku = cur_turn.yaku;
            pi[turn].avg = think_avg(cur_turn.hand, cur_turn.pile);
          }
        }
        if (this.is_end()) break;
        turn += 1;
        if (turn == this.N) turn = 0;
      }
      // vp
      const lst = this.get_vp(round);
      await this.msg_alert(`第 ${round} ラウンド終了——${this.players[0].name}は ${lst[0].jun}位, +${lst[0].vp}vp${round!=0?' (Click to Next Round)':''}`, round == 6? null: '次のラウンドに進みます');
      for (let i = 0; i < this.N; ++i) {
        this.players[i].vp += lst[i].vp;
        pi[i].vp = this.players[i].vp;
        this.players[i].redraw_info_box();
      }
      this.add_table(round, lst);
      this.add_log(round);
      // next round
      if (round < 6) {
        await sleep(1000);
        this.round_begin();
      }
    } // end for
    this.add_total();
    await this.msg_alert('ゲーム終了 (Click to Next Game)');
    // new game
    location.reload();
  }
  create_table() {
    this.table = document.createElement('table');
    const tr = document.createElement('tr');
    for (let i = 0; i < this.N + 1; ++i) {
      const th = document.createElement('th');
      if (i >= 1) th.innerText = i + '位';
      else th.innerText = "R";
      tr.appendChild(th);
    }
    this.table.appendChild(tr);
  }
  add_table(round, vp) {
    vp.sort((a,b)=>a.jun - b.jun);
    const tr = document.createElement('tr');
    for (let i = 0; i < this.N + 1; ++i) {
      if (i == 0) {
        const th = document.createElement('th');
        th.innerText = round;
        tr.appendChild(th);
      } else {
        const td = document.createElement('td');
        const a = vp[ i - 1 ];
        td.innerText = this.players[a.idx].name;
        tr.appendChild(td);
      }
    }
    this.table.appendChild(tr);
    if (round == 1) document.getElementById('score_sheet').appendChild(this.table);
  }
  add_total() {
    const s = [];
    for (let i = 0; i < this.N; ++i) {
      s.push({
        vp: this.players[i].vp,
        idx: i,
      });
    }
    s.sort((a, b) => b.vp - a.vp);
    const tr = document.createElement('tr');
    const tr2 = document.createElement('tr');
    for (let i = 0; i < this.N + 1; ++i) {
      if (i == 0) {
        const th = document.createElement('th');
        th.innerText = 'T';
        tr.appendChild(th);
        const th2 = document.createElement('th');
        tr2.appendChild(th2);
      } else {
        const th = document.createElement('th');
        th.innerText = this.players[ s[i - 1].idx ].name;
        tr.appendChild(th);
        const td2 = document.createElement('td');
        td2.setAttribute('class', 'sum');
        td2.innerText = s[i - 1].vp + 'pt';
        tr2.appendChild(td2);
      }
    }
    this.table.appendChild(tr);
    this.table.appendChild(tr2);
  }
  add_log(round) {
    let str = '<p>$Round: ' + round + '</p>';
    for (const p of this.players) {
      str += `<p>${p.toString()}</p>`;
    }
    str += '<br>';
    const log = document.getElementById('game_log');
    log.innerHTML += str;
    if (round == 1) {
      log.style.display = 'block';
    }
  }
}

const on_start_button = () => {
  const game_space = document.getElementById('game_space');
  game_space.style.visibility = 'hidden';
  // 2人以上
  const n_players = document.getElementById('n_players').selectedIndex + 1;
  const ai_space = document.getElementById('ai_space');
  const player_space = document.getElementById('player_space');
  // player
  const players = [ new Player('あなた', 0) ];
  player_space.appendChild( players[0].box );
  // com
  const kosei = [ // max 22
    ["アリス", [1, 2, 3, 4, 5,   7]], // 15...7
    ["ボビー", [3, 3, 3, 3, 3,   7]], // 15...7
    ["クリス", [2, 2, 3, 4, 6,   5]], // 17...5
    ["デレク", [2, 3, 4, 5, 6,   2]], // 20...2
    ["エリス", [3, 3, 3, 4, 4,   5]], // 17...5
    ["ファズ", [2, 3, 3, 4, 5,   5]], // 17...5
    ["ギーグ", [2, 2, 4, 4, 5,   5]], // 17...5
    ["ハンス", [2, 2, 3, 6, 6,   3]], // 19...3
    ["イリス", [2, 2, 2, 4, 6,   6]], // 16...6
    ["ジェイ", [2, 2, 4, 4, 4,   6]], // 16...6
    ["ケイト", [2, 3, 3, 4, 6,   4]], // 18...4
    ["ルース", [2, 2, 2, 4, 7,   5]], // 17...5
    ["ムース", [1, 2, 2, 4, 8,   5]], // 17...5
    ["ネイト", [1, 2, 2, 3, 7,   7]], // 15...7
    ["オーク", [1, 2, 2, 5, 7,   5]], // 17...5
    ["ピート", [1, 2, 2, 6, 7,   4]], // 18...4
    ["クイズ", [3, 1, 3, 5, 7,   3]], // 19...3
    ["ラッタ", [2, 2, 4, 6, 7,   1]], // 21...1
  ];
  const kx = 0.1; // 気合計算の起点 => TODO 現状、ほぼ意味がない値
  const kiai_base = kx + Math.random() * kx; // AIの気風、勢い kx < ? < 2kx
  shuffle_array( kosei );
  for (let i = 0; i < n_players; ++i) {
    const k = kosei.pop();
    const kiai = (1.0 / n_players) - (kiai_base / 2.0) + (Math.random() * kiai_base);
    // 名前, ID, 作戦, 気合
    const com = new Player(k[0], i + 1, k[1], kiai);
    ai_space.appendChild(com.box);
    players.push(com);
  }
  // start
  const pv = new PortlandView(players);
  pv.play_loop();
};

window.onload = function() {
  document.getElementById("start_button").addEventListener('click', on_start_button);
};

