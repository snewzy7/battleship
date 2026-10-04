'use strict';

// The Hungry Roommate: context-aware dialogue picker. Pure functions, no DOM.
// Edit LINES freely; selection logic is below it.
(function (root) {
  // Item keys match Battleship.SHIPS[i].key
  const LINES = {
    lobby: [
      "hurry up i'm hungry",
      "stocking up? cute.",
      "put the good stuff somewhere obvious pls",
      "take your time. i'll just wait. hungrily.",
    ],
    start: [
      "i'm just gonna look around real quick",
      "not stealing anything. just looking.",
      "ok where do you keep the good stuff",
      "you restocked right?",
    ],
    // roommate searching your pantry
    rm_miss: [
      "swear you had snacks in here",
      "where are you hiding everything",
      "okay rude",
      "there's literally nothing here",
      "who keeps an empty shelf",
      "this is just a shelf with a can opener on it",
      "hm.",
      "you moved stuff. i can tell.",
    ],
    rm_miss_streak: [
      "did you eat everything already??",
      "ok you're definitely hiding it on purpose",
      "i'm starting to think you don't have snacks",
      "this is a lot of empty shelves for someone who 'just went to trader joe's'",
    ],
    rm_hit: [
      "ohhhh what do we have here",
      "knew you had something over here",
      "there it is",
      "oh hello",
      "found something. not saying what.",
      "you really thought i wouldn't look here",
    ],
    rm_hit_streak: [
      "okay i'm on a roll",
      "this shelf is carrying me",
      "jackpot aisle",
    ],
    rm_hit_item: {
      buldak: ["oh you were hiding the buldak from me??", "is this. is this buldak.", "the carbonara one too. wow."],
      takis: ["wait you had these the whole time?", "the trader joe's takis?? and you said nothing", "chili lime. you absolute hoarder."],
      cfa: ["oh you have sauce", "chick-fil-a sauce just chilling in here", "ok this changes my dinner plans"],
      pbcups: ["peanut butter cups. of course.", "found the emotional support candy", "oh these are so mine"],
      poppi: ["is that a poppi", "raspberry rose. interesting.", "a poppi!! wait how many"],
    },
    rm_sunk_item: {
      buldak: ["making this immediately", "boiling water. don't talk to me.", "the buldak is gone. accept it."],
      takis: ["these are coming to my room", "bag's already open sorry", "taking these for a 'meeting'"],
      cfa: ["yeah i'm keeping this", "this is going in my drawer", "mine now. legally."],
      pbcups: ["these were never safe", "ate two already", "gone. you knew the risk."],
      poppi: ["oh perfect i was thirsty", "this is refreshing. thanks.", "cracked it open. no regrets."],
    },
    rm_sunk: [
      "thanks for this",
      "shouldn't have left it where i could find it",
      "i'll venmo you. probably.",
    ],
    // you searching the roommate's pantry
    you_miss: [
      "yeah nothing there. keep looking i guess",
      "lol",
      "cold.",
      "you're not gonna find it",
      "that's the cereal shelf. we don't talk about the cereal shelf.",
    ],
    you_miss_streak: [
      "you're really bad at this",
      "want a hint? no? ok",
      "this is embarrassing for you",
    ],
    you_hit: [
      "can you stay out of my stuff please",
      "interesting how it's okay when YOU do it",
      "hey.",
      "don't touch that",
      "ok that's mine actually",
      "we're doing this now?",
    ],
    you_hit_streak: [
      "ok stop",
      "you're on a mission huh",
      "i feel targeted",
    ],
    you_hit_item: {
      buldak: ["not the buldak", "leave my noodles alone"],
      takis: ["those are MY takis", "don't you dare"],
      cfa: ["you have your own sauce. i've seen it.", "put the sauce down"],
      pbcups: ["those are for emergencies", "step away from the cups"],
      poppi: ["that's my poppi", "i was saving that"],
    },
    you_sunk: [
      "dude.",
      "give that back",
      "actually unbelievable",
      "wow. ok. wow.",
      "noted.",
    ],
    you_sunk_item: {
      buldak: ["you took the whole pack?? the WHOLE pack", "i was gonna make that tonight"],
      takis: ["you don't even like spicy stuff", "fine. enjoy. i hope they're stale."],
      cfa: ["you're a sauce thief now. cool.", "i'm telling everyone"],
      pbcups: ["share them at least", "those weren't even mine. ok they were."],
      poppi: ["i had ONE", "that was the last one"],
    },
    rm_leading: [
      "should've hidden your snacks better",
      "your pantry is basically mine at this point",
      "i'm winning and i'm not even hungry anymore",
    ],
    you_leading: [
      "this feels unnecessarily personal",
      "i'm starting to think you planned this",
      "ok you're taking this way too seriously",
    ],
    rm_last_item: [
      "ok where's the last thing. i know there's one more.",
      "one more and your pantry is officially mine",
    ],
    you_last_item: [
      "please leave me one thing",
      "if you take my last snack we're not friends",
    ],
    idle: [
      "you good?",
      "take your time i guess",
      "i'm getting hungrier btw",
    ],
    rm_win: [
      "thanks for the groceries",
      "gg. i'm gonna go eat all of this.",
      "you should go shopping. i'm just saying.",
    ],
    you_win: [
      "okay but can i still have a poppi",
      "fine. you win. share?",
      "this isn't over. i know your schedule.",
    ],
  };

  // Shuffled-cursor pools so no line repeats until a pool is exhausted.
  function createRoommate() {
    return { pools: new Map(), rmStreak: { result: null, n: 0 }, youStreak: { result: null, n: 0 } };
  }

  function pick(rm, poolKey, list) {
    if (!list || !list.length) return null;
    let pool = rm.pools.get(poolKey);
    if (!pool || pool.i >= pool.order.length) {
      const order = list.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      pool = { order, i: 0 };
      rm.pools.set(poolKey, pool);
    }
    return list[pool.order[pool.i++]];
  }

  function bump(streak, result) {
    if (streak.result === result) streak.n++;
    else { streak.result = result; streak.n = 1; }
    return streak.n;
  }

  // ev: { actor: 'roommate'|'you', result: 'miss'|'hit'|'sunk', item: key|null,
  //       score: { youGone: n, rmGone: n } }  (gone counts of each side's items)
  // Returns a string or null (silence).
  function react(rm, ev) {
    const isRm = ev.actor === 'roommate';
    const streak = bump(isRm ? rm.rmStreak : rm.youStreak, ev.result);
    const p = isRm ? 'rm' : 'you';
    const chance = x => Math.random() < x;

    if (ev.result === 'sunk') {
      if (isRm && ev.score.youGone === 4) return pick(rm, 'rm_last_item', LINES.rm_last_item);
      if (!isRm && ev.score.rmGone === 4) return pick(rm, 'you_last_item', LINES.you_last_item);
      const lead = ev.score.youGone - ev.score.rmGone;
      if (isRm && lead >= 2 && chance(0.5)) return pick(rm, 'rm_leading', LINES.rm_leading);
      if (!isRm && lead <= -2 && chance(0.5)) return pick(rm, 'you_leading', LINES.you_leading);
      const itemLines = LINES[`${p}_sunk_item`][ev.item];
      if (itemLines && chance(0.75)) return pick(rm, `${p}_sunk_item_${ev.item}`, itemLines);
      return pick(rm, `${p}_sunk`, LINES[`${p}_sunk`]);
    }

    if (ev.result === 'hit') {
      if (streak >= 2 && chance(0.5)) return pick(rm, `${p}_hit_streak`, LINES[`${p}_hit_streak`]);
      const itemLines = LINES[`${p}_hit_item`][ev.item];
      if (itemLines && chance(isRm ? 0.7 : 0.5)) return pick(rm, `${p}_hit_item_${ev.item}`, itemLines);
      return pick(rm, `${p}_hit`, LINES[`${p}_hit`]);
    }

    // miss
    if (streak >= 3 && chance(0.7)) return pick(rm, `${p}_miss_streak`, LINES[`${p}_miss_streak`]);
    if (!isRm && !chance(0.45)) return null;
    return pick(rm, `${p}_miss`, LINES[`${p}_miss`]);
  }

  function line(rm, key) {
    return pick(rm, key, LINES[key]);
  }

  const api = { LINES, createRoommate, react, line };
  root.Roommate = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
