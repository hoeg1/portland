import readline from 'readline';
import { parseArgs, styleText } from 'node:util';

/**
 * @import { Card } from './poker.js';
 */
import { to_suit, to_rank } from "./src/poker.js";

import { VERSION, Portland, Player } from "./src/portland.js";

import Rand from "./src/rand.js";
import { get_lv, LV_MAX } from "./src/lv.js";

// Sleep
// ウェイトは決め打ちしてしまう
const g_speed = 500;

/**
 * await sleep(x) の形で指定されたミリ秒待つだけの関数
 * @param {number} ms
 */
export const sleep = ms => new Promise(res=>setTimeout(res, ms));


/**
 * 全角幅を考慮した padStart / padEnd
 * 幅の判定は「255以上か？」という雑なものだが日本語なら問題なさそう
 * @param {string} str_        パディングする文字列
 * @param {number} target_w    埋める幅
 * @param {string} pad_char    埋める文字: 1文字を想定
 * @param {boolean} [is_end]   padEndにするか
 */
const pad_amb = (str_, target_w, pad_char, is_end=false) => {
  const str = String(str_); // 数値とかかもしれないので変換しておく
  let cur_w = 0;
  // 全角 = 2, 半角 = 1 として幅を計算
  for (let i = 0; i < str.length; ++i) {
    cur_w += str.charCodeAt(i) > 0xff? 2: 1; // 半角かどうか
  }
  // 必要な残り幅を計算
  const fill_w = target_w - cur_w;
  if (fill_w <= 0) return str; // 埋めない
  // パディングする文字幅
  const pad_char_w = pad_char.charCodeAt(0) > 0xff? 2: 1;
  // 指定幅におあさまる回数分だけ繰り返して結合
  const repeat_cnt = Math.trunc( fill_w / pad_char_w );
  const pad = pad_char.repeat(repeat_cnt);
  return is_end? str + pad: pad + str;
};



//////////////////////////////////////////////////////////////////////////////

const COL = ['dim', 'red', 'blue', 'green', 'yellow'];
const SUIT = ['?','h','s','d','c'];
const RANK = ['?','A','2','3','4','5','6','7','8','9','T','J','Q','K'];

/**
 * @param {Card} card
 * @return {string} styleText
 */
const card_to_str = card => {
  const suit = to_suit(card);
  return styleText(COL[suit], /* SUIT[suit]+ */RANK[to_rank(card)]);
};

const TURN_CH = '▶ ';
const PASS_CH = '🅿 ';

/**
 * @param {Portland} port
 * @return {Player}
 */
const get_human = port => port.players.find(x=>x.is_human);

/**
 * 手札を描画
 * @param {Player}    human
 * @param {boolean} is_teban  humanが手番か
 * @param {number}   sel_idx  チェンジ中なら現在の選択中のインデックス
 * @param {Card} change_card  チェンジ中ならめくったカード
 */
const draw_human_hand = (human, is_teban, sel_idx, change_card) => {
  const mk_card = (idx, tcard=0) => {
    const card = (tcard !== 0)? tcard: human.hand[idx];
    const s = to_suit(card);
    const suit = SUIT[ s ];
    const rank = RANK[ to_rank(card) ];
    const sc = COL[ s ];
    const col = idx === sel_idx? 'bold': COL[s];
    const txt = [
      styleText(sc, suit) + styleText(col, '---+'),
      styleText(col, '| ') + styleText(sc, rank) + styleText(col, ' |'),
      styleText(col, '+---') + styleText(sc, suit),
    ];
    return txt;
  };
  const lines = [' ',' ',' '];
  for (let i = 0; i < 5; ++i) {
    if (i < human.hand.length) {
      const txt = mk_card(i);
      lines[0] += txt[0];
      lines[1] += txt[1];
      lines[2] += txt[2];
    } else {
      lines[0] += '     ';
      lines[1] += '     ';
      lines[2] += '     ';
    }
    lines[0] += '  ';
    lines[1] += '  ';
    lines[2] += '  ';
  }
  if (change_card === 0) {
    // deck
    lines[1] += `    [${human.deck.length.toString()}]`;
  } else {
    const k = mk_card(-1, change_card);
    lines[0] += `    ${k[0]}`;
    lines[1] += `    ${k[1]}`;
    lines[2] += `    ${k[2]}`;
  }
  // draw
  const state = is_teban? TURN_CH: human.pass? PASS_CH: '';
  const human_txt = `  ${state}${human.name} ${human.score}pt: ${human.yaku}\n`;
  console.log(human_txt);
  console.log(lines[0]);
  console.log(lines[1]);
  console.log(lines[2]);
};

/**
 * ボードを描画
 * @param {Portland}  port
 * @param {string}    msg
 * @param {boolean}   [is_show_turn]
 */
const redraw = (port, msg, is_show_turn=true) => {
  const teban = port.teban;
  console.clear();
  console.log(` Reiner Knizia's Portland Lv.${port.lv}                                       Round ${port.round_count}/${port.round_max}
  [ ${msg} ]
+--------------------------------------+--------------------------------------+
|                                      |                                      |
|                                      |                                      |
+--------------------------------------+--------------------------------------+
|                                      |                                      |
|                                      |                                      |
+--------------------------------------+--------------------------------------+
|                                      |                                      |
|                                      |                                      |
+--------------------------------------+--------------------------------------+
|                                      |                                      |
|                                      |                                      |
+--------------------------------------+--------------------------------------+
`);
  const pos = {x:2, y:3, cnt:0};
  for (const pl of port.players) {
    if (pl.is_human) continue;
    readline.cursorTo(process.stdout, pos.x, pos.y);
    const state = (is_show_turn && pl === teban)? TURN_CH: pl.pass? PASS_CH: '';
    process.stdout.write(`${state}${pl.name}: ${pl.yaku}`);
    //
    readline.cursorTo(process.stdout, pos.x, pos.y + 1);
    const h_str = pl.hand.reduce((str, c)=>str+card_to_str(c)+' ', '');
    process.stdout.write(`${pl.score}pt   ${h_str}`);
    readline.cursorTo(process.stdout, pos.x + 32, pos.y + 1);
    process.stdout.write(`[${pl.deck.length.toString().padStart(2, ' ')}]`);

    // next
    if (pos.cnt % 2 === 0) {
      pos.x = 41;
    } else {
      pos.x = 2;
      pos.y += 3;
    }
    pos.cnt += 1;
  }
  //
  readline.cursorTo(process.stdout, 0, 16);
};


class Human extends Player {
  constructor(seed, max) {
    super(seed, 'あなた', true, max);
  }
  /** @param {Portland} port */
  set_portland(port) {
    this.portland = port;
  }
  /**
   * @param {Array<PlayerInfo>}  info   他のプレイヤーの状態(自分を含まない)
   * @param {number}             round  今のラウンド数
   * @param {number}             id     自分の席の番号
   *
   * @return {Promise<boolean>}           パスならtrue, 交換ならfalse
   */
  think_pass() {
    return new Promise(resolve => {
      console.log(styleText('dim', '  << パスなら p, 交換するなら c を入力 >>'));
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', key => {
        if (key === '\u0003') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          console.error('強制終了しました');
          process.exit();
        } else if (key === 'p') {
          process.stdin.setRawMode(false);
          process.stdin.removeAllListeners('data')
          process.stdin.pause();
          resolve(true);
        } else if (key === 'c') {
          process.stdin.setRawMode(false);
          process.stdin.removeAllListeners('data')
          process.stdin.pause();
          for (let i = 0; i < 6; ++i) {
            readline.moveCursor(process.stdout, 0, -1);
            readline.clearLine(process.stdout, 0);
          }
          resolve(false);
        }
      });
    });
  }
  /**
   * @param {Card} card
   * @param {number} round
   * @return {Promise<number>}
   */
  think_change(card, _round) {
    return new Promise(resolve => {
      draw_human_hand(this, true, 0, card);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      let sel_idx = 0;
      const update_hand = () => {
        for (let i = 0; i < 5; ++i) {
          readline.moveCursor(process.stdout, 0, -1);
          readline.clearLine(process.stdout, 0);
        }
        draw_human_hand(this, true, sel_idx, card);
      };
      process.stdin.on('data', key => {
        if (key === '\u0003') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          console.error('強制終了しました');
          process.exit();
        } else if (key === 'j' || key === 'l' || key === 'd' || key === 's') {
          sel_idx += 1;
          if (sel_idx >= this.hand.length) sel_idx = 0;
          update_hand();
        } else if (key === 'k' || key === 'h' || key === 'a' || key === 'w') {
          sel_idx -= 1;
          if (sel_idx < 0) sel_idx = this.hand.length - 1;
          update_hand();
        } else if (key === '\r' || key === '\n' || key === 'c') {
          process.stdin.setRawMode(false);
          process.stdin.removeAllListeners('data')
          process.stdin.pause();
          resolve(sel_idx);
        }
      });
    });
  }
}

/**
 * @param {Lv} lv
 */
const add_cpu_method = lv => {
  /**
   * @param {Array<PlayerInfo>}  info   他のプレイヤーの状態(自分を含まない)
   * @param {number}             round  今のラウンド数
   * @param {number}             id     自分の席の番号
   *
   * @return {boolean}           パスならtrue, 交換ならfalse
   */
  lv.think_pass = async (info, round, id) => {
    const pass = lv.on_think_pass(info, round, id);
    if (pass) {
      await sleep(g_speed);
    }
    return pass;
  };
  /**
   * @param {Card} card
   * @param {number} round
   * @return {number}
   */
  lv.think_change = async (card, round) => {
    const idx = lv.on_think_change(card, round);
    await sleep(g_speed);
    return idx;
  };
};

const wait_enter = () => {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  return new Promise(res => {
    rl.question(styleText('dim', '[press Enter]'), () => {
      rl.close();
      res();
    })
  });
};


const game_loop = async (port) => {
  console.clear();
  process.stdin.setEncoding('utf8');
  const human = get_human(port);
  let has_next = true;
  while (has_next) {
    port.round_start();
    redraw(port, `第 ${port.round_count} ラウンド開始`);
    draw_human_hand(human, false, -1, 0);
    await sleep(g_speed);
    let next = true;
    while (next) {
      const teban = port.teban;
      const mes = `${port.teban.name} のターン`;
      redraw(port, mes);
      draw_human_hand(human, teban === human, -1, 0);
      next = await port.play();
      redraw(port, mes, /* is_show_turn */false);
      draw_human_hand(human, false, -1, 0);
      await sleep(g_speed * (next? 1: 2));
    }
    has_next = port.round_end();
    console.log(has_next?
      styleText('yellow', '===== ラウンド終了 ====='):
      styleText('red',    '===== ゲーム終了 ====='));
    let bp = -1;
    let bpl = [];
    for (const pl of port.players) {
      const k = has_next? pl.katen: pl.score;
      if (bp < k) {
        bp = k;
        bpl = [pl];
      } else if (bp === k) {
        bpl.push(pl);
      }
    }
    for (const pl of port.players) {
      const king = bpl.includes(pl)? ' 👑': '   ';
      const sc = `${pl.score.toString().padStart(3, ' ')}pt (+${pl.katen})`;
      console.log(`${king}${pad_amb(pl.name, 16, ' ')}: ${sc}`);
    }
    if (has_next) await wait_enter();
  }
};


//////////////////////////////////////////////////////////////////////////////

const show_version = () => {
  console.log(`Reiner Knizia's Portland  v${VERSION}`);
};

const show_help = () => {
  console.log(`Portland
  --version, -v     バージョンを表示
  --help, -h        このヘルプを表示
  --rule, -r        詳細なルールを表示

  --players, -p N   何人で遊ぶかを指定: N = 2 ~ 9, 規定で N = 5
  --level, -l N     レベルを指定: N = 0(random), 1, 2, 3 or 4
  --five, -f        全５ラウンドで遊ぶ

  --seed, -s N      シードを指定(デバッグ用): N は 16進数で指定可能

[手番のキー入力]
  最初に p or c の２択
  p なら「パス」になり、ラウンド終了まで手番をスキップ
  c を選んだら山札がめくられ、その１枚とどの手札を交換するか選ぶ:
      j, s, l, d ... 選択を右に（枠線が初期色に変わる）
      k, w, h, a ... 選択を左に（枠線が初期色に変わる）
      Enter or c ... 選択を確定

  ※Ctrl+C でアプリを強制終了できる。
`);
};

const show_rule = () => {
  console.log(`[ Reiner Knizia's  Portland ]

　ポートランド はドイツのゲームデザイナー Reiner Knizia 博士が発明したポーカー
ゲームです。
　各プレイヤーはそれぞれ５２枚の「個人の山札」を持ち、そこから５枚の最初の手札
を引いてポーカー役を作ります。あなたは手番ごとに「パス」をするか「交換」を選ぶ
ことができ、交換するなら個人の山札から１枚のカードをめくり、手札の好きな１枚と
交換します。そうして最も強い役を得たプレイヤーが最も良い勝利点を得ます。


●使う道具
　５２枚の普通のトランプを全プレイヤーが１組ずつ持ちます。各プレイヤーはカード
をよく切って、それを「各個人の山札」とします。


●ディール
　全員が各自の山札からいっせいに５枚の手札を目の前に公開します。手札は隠しませ
ん。全員が他人の手札を見ることができます。


●ラウンドのプレイ
　適当に決めたスタートプレイヤーからプレイを始めます。以降、スタートプレイヤー
は直前のラウンドの勝者が務めます。

　手番プレイヤーは次の２択です：

１）「パス」を宣言する（p のキーを入力する）
　パスしたプレイヤーはそのラウンドが終わるまでゲームから抜けます。
　そうして全員が「パス」を選んだら後に説明する得点計算をします。
　山札が無いプレイヤーは自動的にパスしたと扱われます。

２）「チェンジ」する（c のキーを入力する）
　この宣言をしたプレイヤーは自分の山札から１枚をめくり、それを　必ず　自分の手
札の１枚と交換します。

　めくったカードを手札のどれと交換するかは j または k のキー入力で選び、Enter
で確定します。


●得点計算
　各プレイヤーは手札を比較し、全体の中で自分が何位かを決めます。順位は１〜参加
人数までの整数になります。同点だったときの処理は後述します。

　各プレイヤーは自分の順位（ｘ≧１）に応じて次のように得点します：

　　　得点 = ( 参加人数 - 自分の順位ｘ ) × ラウンド数
　　　　　　　　　　　　　　　　　　　　　　　　　　　※最下位は常に０点です！

　全員が得点したら次のラウンドに入り（つまりラウンド数が＋１され）、そのラウン
ドで１位だったプレイヤーから新しいラウンドのプレイを始めます。

　ラウンドは全部で６ラウンドです。６ラウンド終了した時点で累計得点が最多だった
プレイヤーがゲームに勝利します。同点なら、該当する全員の勝ちです。


●タイブレーク
　あるラウンドの終わりに同じ役のプレイヤーが複数出たら、該当するプレイヤーは通
常のポーカーのルールによってタイブレークします。
　つまり：

　１）原則として A>K>Q...4>3>2 というランクの序列があります。

　２）同じ役なら、役を構成する部分のランクを比べて強いほうの勝ちです。
　　　例えば「ＡＡＡ８６」と「ＫＫＫ８６」なら、Ａ＞Ｋ のため「ＡＡＡ８６」の
　　　勝ちです。

　３）役を構成する部分が同じなら、構成しない部分を強い順に見比べます。
　　　例えば「ＡＡＡ８６」と「ＡＡＡ８４」なら、Ａについては同点なので、スリー
　　　カードを構成しない部分「８６」と「８４」を比べます。
　　　強い順で「８」は引き分けですが、続く「６」と「４」では　６＞４　のため、
　　　勝者は「ＡＡＡ８６」です。

　４）上記のタイブレークを経てもなお同点なら引き分けです。
　　　ポーカー役が引き分けのときは、得点は次のようにします：
　　　　例えば２位の役の強さがプレイヤーＡ，Ｂ，Ｃそれぞれ同じだった場合、
　　　　　（２位の点＋３位の点＋４位の点）÷３人　　※端数切り捨て
　　　　をＡ，Ｂ，Ｃの全員が得ます。
　　　５位以降のプレイヤーは５位なら得られたはずの得点を順番に得ます。

　５）さらに、このゲーム独自のタイブレークとして「手札枚数に差がある場合」は：
　　　手札枚数が５枚ではないすべての役は、５枚手札の役に負けます。
　　　同様に、枚数が比較相手より少ないすべての役は相手に負けます。
　　　ストレートやフラッシュを要求する役は手札が５枚のときにだけ有効です。

・次のスタートプレイヤー
　次のラウンドのスタートプレイヤーは前回ラウンドの勝者からですが、１位のプレイ
ヤーが複数いるときは、前のラウンドのスタートプレイヤーから見て席順で最も近いプ
レイヤーが次のスタートプレイヤーになります（そのラウンドのスタートプレイヤーが
最も後回しにされるということです）。


●ヴァリアント：５ラウンド勝負
　ポートランドの基本ルールでは勝負は６ラウンドですが、これを５ラウンド勝負に変
更できます。


●オリジナル・ルールとの相違
　本アプリと Knizia 氏によるオリジナルとでは、以下の点が異なります:

・タイブレークのルール
　オリジナルには同点だったときの処理が書かれていないので、このアプリでは
　　　ゲームファーム: https://gamefarm.jp/rule/portland.html
　のルールを参考に、以下のように実装しました。
　　・同じ手札枚数で同じ点数の役はポーカーのよくあるタイブレークを採用します。
　　　※日本式ポーカーの古いタイブレークにある「スート勝負」は採用していません。
　　・手札枚数に差があるときは枚数が多いほうが 常に 勝ちとします。
　　　４枚手札のフォーカードは５枚手札のブタに負けます。
　　・あるラウンドの１位プレイヤーが複数いる場合は、旧ラウンドのスタートプレイ
　　　ヤーから見て席順で最も近いプレイヤーが新しいスタートプレイヤーです。

・参加人数についてのルール
　オリジナルでは５人までですが、このゲームは論理的には何人でもプレイ可能です。
端末の画面幅を踏まえ、コンソール版は９人、ブラウザ版は８人まで可能にしました。

・ラウンド数についてのルール
　オリジナルは６ラウンドで固定ですが、５ラウンド勝負も面白そうなので選択できる
ようにしました。

・公平性
　作者のこだわりとして、ゲームシステムはあなたにだけ不利な手札を配ったりしない
し、ＣＰＵにだけ有利な手札を配ることもなければＣＰＵらに結託させてあなたを集中
攻撃させるような行為をしません。
　このゲームではルール的にあなたの残り山札が常に既知ですが、各ＣＰＵはカウンテ
ィングこそすれどあなたの山札が具体的にどのような順序かを知ることができません。
　各ＣＰＵは作者が思いつく限りを尽くしてイカサマ不可能になるようプログラムされ
ています。
`);
};

async function start() {
  const { values } = parseArgs({
    options: {
      version: {
        type: 'boolean',
        short: 'v',
      },
      help: {
        type: 'boolean',
        short: 'h',
      },
      rule: {
        type: 'boolean',
        short: 'r',
      },
      //////////////////////////////////////////////////
      players: {
        type: 'string',
        short: 'p',
      },
      level: {
        type: 'string',
        short: 'l',
      },
      five: {
        type: 'boolean',
        short: 'f',
      },
      seed: {
        type: 'string',
        short: 's',
      },
    },
  });
  if (values.version) { show_version(); process.exit() }
  if (values.help)    { show_help();    process.exit() }
  if (values.rule)    { show_rule();    process.exit() }

  const toi = (el, def, safe_range) => {
    if (el === undefined) return def;
    const n = /^0x[0-9a-fA-F]+$/.test(el)? parseInt(el, 16):
      /^(0|[1-9][0-9]*)$/.test(el)? parseInt(el):
      NaN;
    if (n === NaN) {
      throw new Error(`${el} を解釈できません。`);
    }
    if (!safe_range(n)) {
      throw new RangeError(`${el} は範囲外です。`);
    }
    return n;
  };
  const max = values.five? 5: 6;
  const np = toi(values.players, 5, n => n >= 2 && n <= 9);
  const lv = toi(values.level,   1, n => n >= 0 && n <= LV_MAX); // 0 = random
  const seed = toi(values.seed, Math.trunc(Math.random()*123456789)+1, () => true);

  const rand = new Rand(seed);

  const players = [];
  const used = new Set();
  for (let i = 0; i < np - 1; ++i) {
    const LV = lv === 0? rand.rand(LV_MAX) + 1: lv; // 0=>1~LV_MAX
    const cpu = get_lv(LV, rand.next_int(), max, used);
    add_cpu_method( cpu );
    players.push( cpu );
  }
  const human = new Human(rand.next_int(), max);
  players.push(human);

  const port = new Portland(rand.next_int(), players, max);
  port.lv = lv === 0? '?': lv.toString();
  await game_loop(port);
  console.log(styleText('dim', `seed: 0x${rand.seed.toString(16)}`));
  //process.exit();
};

// entry point
await start();



