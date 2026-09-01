
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(devicePixelRatio || 1, 2);
  let W=0, H=0;

  function resize(){
    W = innerWidth; H = innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  addEventListener('resize', resize);
  resize();

  const LEVELS = [
    {name:'Downtown', time:75, world:1650, theme:'city', goal:'percent', target:0.70, goalText:'Поглоти 70% карты'},
    {name:'Green Park', time:72, world:1750, theme:'park', goal:'type', goalType:'дерево', goalCount:14, goalText:'Поглоти 14 деревьев'},
    {name:'Sunny Beach', time:70, world:1800, theme:'beach', goal:'mass', goalMass:310, goalText:'Набери 310 массы'},
    {name:'Mega Mall', time:67, world:1900, theme:'mall', goal:'count', goalCount:150, goalText:'Поглоти 150 объектов'},
    {name:'Skyline Boss', time:65, world:2000, theme:'city', goal:'percent', target:0.82, goalText:'Поглоти 82% мегаполиса'}
  ];
  const UPGRADE_MAX = 8;
  const SAVE_KEY = 'hole_eater_v8_save';

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function rand(a,b){ return a + Math.random() * (b-a); }
  function choice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function chance(p){ return Math.random() < p; }

  // ---------- Asset loading ----------
  const assetFiles = {
    bench:'assets/bench.png',
    trash_can:'assets/trash_can.png',
    traffic_cone:'assets/traffic_cone.png',
    hydrant:'assets/hydrant.png',
    parking_sign:'assets/parking_sign.png',
    street_lamp:'assets/street_lamp.png',
    cardboard_box:'assets/cardboard_box.png',
    wooden_crate:'assets/wooden_crate.png',
    potted_plant:'assets/potted_plant.png',
    flower_bush:'assets/flower_bush.png',
    round_bush:'assets/round_bush.png',
    umbrella_cart:'assets/umbrella_cart.png',

    coffee_shop:'assets/coffee_shop.png',
    hotdog_shop:'assets/hotdog_shop.png',
    icecream_cart:'assets/icecream_cart.png',
    blue_shop:'assets/blue_shop.png',
    apartment_block:'assets/apartment_block.png',
    street_food_cart:'assets/street_food_cart.png',
    market_kiosk:'assets/market_kiosk.png',
    convenience_store:'assets/convenience_store.png',

    car_blue:'assets/car_blue.png',
    car_red:'assets/car_red.png',
    taxi_yellow:'assets/taxi_yellow.png',
    car_purple:'assets/car_purple.png',
    car_green:'assets/car_green.png',
    van_orange:'assets/van_orange.png',
    box_truck:'assets/box_truck.png',
    scooter_blue:'assets/scooter_blue.png',

    hole_small:'assets/hole_small.png',
    hole_medium:'assets/hole_medium.png',
    hole_large:'assets/hole_large.png',
    turbo_icon:'assets/turbo_icon.png',
    magnet_icon:'assets/magnet_icon.png',
    time_icon:'assets/time_icon.png',
    coin_icon:'assets/coin_icon.png',
    star_icon:'assets/star_icon.png',
    skin_classic:'assets/skin_classic.png',
    skin_neon:'assets/skin_neon.png',
    skin_lava:'assets/skin_lava.png',
  };

  const ASSETS = {};
  const assetPromises = Object.entries(assetFiles).map(([k, src]) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { ASSETS[k] = img; resolve(); };
    img.onerror = () => { console.warn('Не удалось загрузить', src); resolve(); };
    img.src = src;
  }));

  let save = loadSave();
  function loadSave(){
    try{
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      return {
        coins: raw.coins || 0,
        currentLevel: clamp(raw.currentLevel || 0, 0, LEVELS.length - 1),
        unlocked: Math.max(1, Math.min(LEVELS.length, raw.unlocked || 1)),
        skin: ['classic','neon','lava'].includes(raw.skin) ? raw.skin : 'classic',
        upgrades: {
          speed: clamp(raw?.upgrades?.speed || 0, 0, UPGRADE_MAX),
          start: clamp(raw?.upgrades?.start || 0, 0, UPGRADE_MAX),
          suction: clamp(raw?.upgrades?.suction || 0, 0, UPGRADE_MAX)
        }
      };
    } catch(e) {
      return {coins:0,currentLevel:0,unlocked:1,skin:'classic',upgrades:{speed:0,start:0,suction:0}};
    }
  }

  function persist(){ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
  function resetSave(){
    save = {coins:0,currentLevel:0,unlocked:1,skin:'classic',upgrades:{speed:0,start:0,suction:0}};
    persist();
    updateMenu();
  }

  const ui = {
    coinsHud: document.getElementById('coinsHud'),
    levelHud: document.getElementById('levelHud'),
    timeHud: document.getElementById('timeHud'),
    bar: document.getElementById('bar'),
    progressText: document.getElementById('progressText'),
    quest: document.getElementById('quest'),
    combo: document.getElementById('combo'),
    hint: document.getElementById('hint'),
    runCoinsHud: document.getElementById('runCoinsHud'),

    menu: document.getElementById('menu'),
    menuCoins: document.getElementById('menuCoins'),
    menuLevels: document.getElementById('menuLevels'),
    levelName: document.getElementById('levelName'),
    speedMeta: document.getElementById('speedMeta'),
    startMeta: document.getElementById('startMeta'),
    suctionMeta: document.getElementById('suctionMeta'),
    dots: document.getElementById('dots'),
    buySpeed: document.getElementById('buySpeed'),
    buyStart: document.getElementById('buyStart'),
    buySuction: document.getElementById('buySuction'),
    playBtn: document.getElementById('playBtn'),
    resetBtn: document.getElementById('resetBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    skinsBtn: document.getElementById('skinsBtn'),

    shop: document.getElementById('shop'),
    shopBack: document.getElementById('shopBack'),
    shopCoins: document.getElementById('shopCoins'),
    shopBuySpeed: document.getElementById('shopBuySpeed'),
    shopBuyStart: document.getElementById('shopBuyStart'),
    shopBuySuction: document.getElementById('shopBuySuction'),
    shopSpeedLvl: document.getElementById('shopSpeedLvl'),
    shopStartLvl: document.getElementById('shopStartLvl'),
    shopSuctionLvl: document.getElementById('shopSuctionLvl'),
    skinClassic: document.getElementById('skinClassic'),
    skinNeon: document.getElementById('skinNeon'),
    skinLava: document.getElementById('skinLava'),

    end: document.getElementById('end'),
    endBanner: document.getElementById('endBanner'),
    endTitle: document.getElementById('endTitle'),
    endText: document.getElementById('endText'),
    endBadge: document.getElementById('endBadge'),
    endEaten: document.getElementById('endEaten'),
    endCoins: document.getElementById('endCoins'),
    endBase: document.getElementById('endBase'),
    endCoinReward: document.getElementById('endCoinReward'),
    endBonus: document.getElementById('endBonus'),
    endReward: document.getElementById('endReward'),
    nextBtn: document.getElementById('nextBtn'),
    menuBtn: document.getElementById('menuBtn'),

    pauseBtn: document.getElementById('pauseBtn'),
    pause: document.getElementById('pause'),
    resumeBtn: document.getElementById('resumeBtn'),
    restartBtn: document.getElementById('restartBtn'),
    pauseMenuBtn: document.getElementById('pauseMenuBtn'),

    turboChip: document.getElementById('turboChip'),
    turboTime: document.getElementById('turboTime'),
    magnetChip: document.getElementById('magnetChip'),
    magnetTime: document.getElementById('magnetTime'),
    flash: document.getElementById('flash')
  };

  function upgradeCost(type){
    const lvl = save.upgrades[type];
    return 40 + lvl * 30;
  }
  function tryBuy(type){
    const lvl = save.upgrades[type];
    const cost = upgradeCost(type);
    if(lvl >= UPGRADE_MAX || save.coins < cost) return;
    save.coins -= cost;
    save.upgrades[type]++;
    persist();
    updateMenu();
  }

  ui.buySpeed.onclick = () => tryBuy('speed');
  ui.buyStart.onclick = () => tryBuy('start');
  ui.buySuction.onclick = () => tryBuy('suction');
  ui.shopBuySpeed.onclick = () => tryBuy('speed');
  ui.shopBuyStart.onclick = () => tryBuy('start');
  ui.shopBuySuction.onclick = () => tryBuy('suction');

  ui.playBtn.onclick = () => {
    ui.menu.classList.remove('show');
    ui.shop.classList.remove('show');
    startLevel(save.currentLevel);
  };
  ui.resetBtn.onclick = () => { if(confirm('Сбросить весь прогресс?')) resetSave(); };
  ui.settingsBtn.onclick = () => { ui.resetBtn.scrollIntoView({behavior:'smooth',block:'center'}); };
  ui.skinsBtn.onclick = () => { updateMenu(); ui.menu.classList.remove('show'); ui.shop.classList.add('show'); };
  ui.shopBack.onclick = () => { ui.shop.classList.remove('show'); showMenu(); };

  function selectSkin(name){
    save.skin = name;
    persist();
    updateMenu();
  }
  ui.skinClassic.onclick = () => selectSkin('classic');
  ui.skinNeon.onclick = () => selectSkin('neon');
  ui.skinLava.onclick = () => selectSkin('lava');

  ui.menuBtn.onclick = () => { ui.end.classList.remove('show'); showMenu(); };
  ui.pauseBtn.onclick = () => {
    if(!game || game.ended) return;
    game.running = false;
    game.input.active = false;
    ui.pause.classList.add('show');
  };
  ui.resumeBtn.onclick = () => {
    if(!game || game.ended) return;
    ui.pause.classList.remove('show');
    game.running = true;
  };
  ui.restartBtn.onclick = () => {
    if(!game) return;
    const idx = game.levelIndex;
    ui.pause.classList.remove('show');
    startLevel(idx);
  };
  ui.pauseMenuBtn.onclick = () => {
    if(game) game.running = false;
    ui.pause.classList.remove('show');
    showMenu();
  };
  ui.nextBtn.onclick = () => {
    ui.end.classList.remove('show');
    if(game && game.win){
      const nxt = Math.min(LEVELS.length - 1, game.levelIndex + 1);
      save.currentLevel = nxt;
      persist();
      startLevel(nxt);
    } else if(game) {
      startLevel(game.levelIndex);
    }
  };

  function updateMenu(){
    ui.menuCoins.textContent = save.coins;
    ui.shopCoins.textContent = save.coins;
    ui.menuLevels.textContent = `${save.unlocked}/${LEVELS.length}`;
    const lv = LEVELS[save.currentLevel];
    ui.levelName.textContent = `Уровень ${save.currentLevel + 1} — ${lv.name}`;

    ui.speedMeta.textContent = `Ур. ${save.upgrades.speed}`;
    ui.startMeta.textContent = `Ур. ${save.upgrades.start}`;
    ui.suctionMeta.textContent = `Ур. ${save.upgrades.suction}`;
    ui.shopSpeedLvl.textContent = `Уровень ${save.upgrades.speed}`;
    ui.shopStartLvl.textContent = `Уровень ${save.upgrades.start}`;
    ui.shopSuctionLvl.textContent = `Уровень ${save.upgrades.suction}`;

    const speedCost = upgradeCost('speed');
    const startCost = upgradeCost('start');
    const suctionCost = upgradeCost('suction');

    for(const [btn,type,cost] of [[ui.buySpeed,'speed',speedCost],[ui.buyStart,'start',startCost],[ui.buySuction,'suction',suctionCost],[ui.shopBuySpeed,'speed',speedCost],[ui.shopBuyStart,'start',startCost],[ui.shopBuySuction,'suction',suctionCost]]){
      btn.textContent = save.upgrades[type] >= UPGRADE_MAX ? 'MAX' : `${cost} 🪙`;
      btn.disabled = save.upgrades[type] >= UPGRADE_MAX || save.coins < cost;
    }

    ui.dots.innerHTML = '';
    LEVELS.forEach((level, i) => {
      const d = document.createElement('button');
      d.type='button';
      d.className = 'levelNode';
      d.textContent = i+1;
      if(i < save.currentLevel) d.classList.add('done');
      if(i === save.currentLevel) d.classList.add('selected');
      if(i >= save.unlocked){ d.classList.add('locked'); d.disabled=true; }
      d.onclick = () => { save.currentLevel=i; persist(); updateMenu(); if(game){ startLevel(i); game.running=false; } };
      ui.dots.appendChild(d);
    });

    for(const [el,name] of [[ui.skinClassic,'classic'],[ui.skinNeon,'neon'],[ui.skinLava,'lava']]){
      el.classList.toggle('selected', save.skin===name);
      const badge=el.querySelector('.skinState');
      if(badge) badge.textContent = save.skin===name ? 'Используется' : 'Выбрать';
    }
  }
  function showMenu(){ if(game) game.running=false; updateMenu(); ui.shop.classList.remove('show'); ui.menu.classList.add('show'); }
  function hideMenu(){ ui.menu.classList.remove('show'); }

  let game = null;

  function startLevel(index){
    const level = LEVELS[index];
    const world = {w: level.world, h: level.world};
    const startR = 24 + save.upgrades.start * 4;

    game = {
      running: true,
      ended: false,
      win: false,
      levelIndex: index,
      level,
      world,
      cam: {x: world.w/2, y: world.h/2, zoom: 1},
      hole: {x: world.w/2, y: world.h/2, r: startR, targetR: startR, speed: 330 + save.upgrades.speed * 22, mass: save.upgrades.start * 3},
      input: {active: false, sx: 0, sy: 0, cx: 0, cy: 0},
      timeLeft: level.time,
      totalObjects: 0,
      eaten: 0,
      combo: 0,
      comboTimer: 0,
      typeEaten: {},
      particles: [],
      bursts: [],
      floatTexts: [],
      objects: [],
      mapCoins: [],
      powerups: [],
      runCoins: 0,
      turboTime: 0,
      magnetTime: 0,
      shake: 0,
      flash: 0
    };

    createWorld(level);
    ui.hint.style.opacity = 1;
    ui.combo.classList.remove('show');
    updateHud();
  }

  function addParticle(x,y,color,size,life){
    game.particles.push({x,y,vx:rand(-45,45),vy:rand(-65,-10),size,life,max:life,color});
  }

  function addFloatText(x,y,text,color){
    game.floatTexts.push({x,y,text,color,life:.75,max:.75,vy:28});
  }

  function addObj(type,x,y,r,mass,shape,spriteKey,extra={}){
    game.objects.push({
      type, x, y, r, baseR:r, mass, shape, spriteKey,
      alive:true, spin:rand(0,Math.PI*2),
      assetScale: extra.assetScale || 1,
      noRotate: !!extra.noRotate,
      yOffset: extra.yOffset || 0
    });
  }

  function addPowerup(kind, emoji, color, spriteKey, x, y){
    game.powerups.push({
      kind, emoji, color, spriteKey, x, y, r:18, alive:true, pulse:rand(0,Math.PI*2)
    });
  }

  function createWorld(level){
    const t = level.theme;
    const ww = game.world.w, hh = game.world.h;

    const cityProps = ['cardboard_box','wooden_crate','traffic_cone','trash_can','bench','parking_sign','street_lamp','potted_plant','flower_bush'];
    const parkProps = ['bench','potted_plant','flower_bush','round_bush','trash_can','street_lamp','parking_sign'];
    const beachProps = ['umbrella_cart','flower_bush','round_bush','traffic_cone','trash_can','potted_plant'];
    const mallProps = ['trash_can','bench','street_lamp','cardboard_box','wooden_crate','potted_plant'];

    const cityVehicles = ['car_blue','car_red','taxi_yellow','car_purple','car_green','van_orange','box_truck','scooter_blue'];
    const parkVehicles = ['car_blue','car_green','scooter_blue','car_red','taxi_yellow'];
    const beachVehicles = ['scooter_blue','car_blue','car_red','taxi_yellow','car_green'];
    const mallVehicles = ['car_blue','car_red','taxi_yellow','car_purple','van_orange'];

    const cityBuildings = ['coffee_shop','hotdog_shop','blue_shop','market_kiosk','convenience_store','apartment_block'];
    const parkBuildings = ['coffee_shop','market_kiosk','hotdog_shop','convenience_store','apartment_block'];
    const beachBuildings = ['icecream_cart','street_food_cart','market_kiosk','blue_shop','coffee_shop'];
    const mallBuildings = ['blue_shop','market_kiosk','convenience_store','hotdog_shop','coffee_shop'];

    const smallProps = t === 'park' ? parkProps : t === 'beach' ? beachProps : t === 'mall' ? mallProps : cityProps;
    const vehicleSet = t === 'park' ? parkVehicles : t === 'beach' ? beachVehicles : t === 'mall' ? mallVehicles : cityVehicles;
    const buildingSet = t === 'park' ? parkBuildings : t === 'beach' ? beachBuildings : t === 'mall' ? mallBuildings : cityBuildings;

    const smallCount = t === 'mall' ? 72 : t === 'park' ? 68 : 60;
    const vehicleCount = t === 'park' ? 22 : t === 'beach' ? 26 : 34;
    const midCount = t === 'mall' ? 16 : t === 'beach' ? 22 : 20;
    const buildCount = game.levelIndex === 4 ? 18 : 12;

    for(let i=0;i<smallCount;i++){
      const key = choice(smallProps);
      const r = rand(11, 18);
      let type = 'мелочь';
      let mass = 1.9;
      if(['cardboard_box','wooden_crate'].includes(key)){ type = 'ящик'; mass = 2.5; }
      if(['potted_plant','flower_bush','round_bush'].includes(key)){ type = 'дерево'; mass = 2.4; }
      if(key === 'bench'){ type = 'скамейка'; mass = 2.8; }
      if(key === 'street_lamp'){ type = 'мелочь'; mass = 2.2; }
      addObj(type, rand(96, ww-96), rand(96, hh-96), r, mass, 'sprite', key, {assetScale: 0.94, noRotate:true});
    }

    for(let i=0;i<vehicleCount;i++){
      const key = choice(vehicleSet);
      let type = key === 'scooter_blue' ? 'мопед' : 'машина';
      let mass = (key === 'box_truck' || key === 'van_orange') ? 8.6 : (key === 'scooter_blue' ? 4.6 : 6.0);
      addObj(type, rand(126, ww-126), rand(126, hh-126), rand(24, 34), mass, 'sprite', key, {assetScale: 1.02, noRotate:true});
    }

    for(let i=0;i<midCount;i++){
      let key;
      if(t === 'mall') key = choice(['market_kiosk','hotdog_shop','coffee_shop','round_bush']);
      else if(t === 'beach') key = choice(['icecream_cart','street_food_cart','umbrella_cart','round_bush','flower_bush']);
      else if(t === 'park') key = choice(['round_bush','flower_bush','umbrella_cart','market_kiosk']);
      else key = choice(['round_bush','flower_bush','umbrella_cart','market_kiosk']);
      const bigRetail = key.includes('shop') || key.includes('kiosk') || key.includes('cart');
      const type = ['round_bush','flower_bush'].includes(key) ? 'дерево' : 'киоск';
      const mass = bigRetail ? 11.5 : 9.5;
      const scale = bigRetail ? 1.08 : 1.0;
      addObj(type, rand(150, ww-150), rand(150, hh-150), rand(32, 45), mass, 'sprite', key, {assetScale: scale, noRotate:true});
    }

    for(let i=0;i<buildCount;i++){
      const key = choice(buildingSet);
      const mass = key === 'apartment_block' ? 27 : 22.5;
      const baseR = key === 'apartment_block' ? rand(62, 76) : rand(54, 68);
      const scale = key === 'apartment_block' ? 1.26 : 1.18;
      addObj('дом', rand(185, ww-185), rand(185, hh-185), baseR, mass, 'sprite', key, {assetScale: scale, noRotate:true});
    }

    for(let i=0;i<24;i++){
      const a = Math.random() * Math.PI * 2;
      const d = rand(70, 230);
      const key = choice(['traffic_cone','cardboard_box','trash_can','potted_plant','flower_bush']);
      const type = ['potted_plant','flower_bush'].includes(key) ? 'дерево' : (['cardboard_box'].includes(key) ? 'ящик' : 'мелочь');
      addObj(type, game.hole.x + Math.cos(a)*d, game.hole.y + Math.sin(a)*d, rand(11,17), 1.6, 'sprite', key, {assetScale: 0.92, noRotate:true});
    }

    game.totalObjects = game.objects.length;

    const boosts = [
      {kind:'turbo', emoji:'⚡', color:'#ffd32a', spriteKey:'turbo_icon'},
      {kind:'magnet', emoji:'🧲', color:'#70a1ff', spriteKey:'magnet_icon'},
      {kind:'time', emoji:'⏱', color:'#7bed9f', spriteKey:'time_icon'},
      {kind:'turbo', emoji:'⚡', color:'#ffd32a', spriteKey:'turbo_icon'},
      {kind:'magnet', emoji:'🧲', color:'#70a1ff', spriteKey:'magnet_icon'}
    ];
    for(const b of boosts){
      addPowerup(b.kind, b.emoji, b.color, b.spriteKey, rand(170, ww-170), rand(170, hh-170));
    }

    const coinCount = t === 'mall' ? 38 : t === 'beach' ? 34 : t === 'park' ? 30 : 32;
    for(let i=0;i<coinCount;i++){
      game.mapCoins.push({
        x: rand(110, ww-110),
        y: rand(110, hh-110),
        r: 14,
        alive: true,
        pulse: rand(0, Math.PI * 2)
      });
    }
  }



  canvas.addEventListener('pointerdown', e => {
    if(!game || !game.running) return;
    game.input.active = true;
    game.input.sx = game.input.cx = e.clientX;
    game.input.sy = game.input.cy = e.clientY;
    ui.hint.style.opacity = 0;
  });
  canvas.addEventListener('pointermove', e => {
    if(!game || !game.running || !game.input.active) return;
    game.input.cx = e.clientX;
    game.input.cy = e.clientY;
  });
  function releasePointer(){ if(game) game.input.active = false; }
  addEventListener('pointerup', releasePointer);
  addEventListener('pointercancel', releasePointer);

  function getGoalState(){
    if(!game) return {progress:0,current:0,target:1,label:''};
    const lv = game.level;
    if(lv.goal === 'percent'){
      const current = game.eaten / Math.max(1, game.totalObjects);
      return {progress: current / lv.target, current, target:lv.target, label:lv.goalText};
    }
    if(lv.goal === 'type'){
      const current = game.typeEaten[lv.goalType] || 0;
      return {progress: current / lv.goalCount, current, target:lv.goalCount, label:lv.goalText};
    }
    if(lv.goal === 'mass'){
      const current = Math.floor(game.hole.mass);
      return {progress: current / lv.goalMass, current, target:lv.goalMass, label:lv.goalText};
    }
    if(lv.goal === 'count'){
      return {progress: game.eaten / lv.goalCount, current:game.eaten, target:lv.goalCount, label:lv.goalText};
    }
    return {progress:0,current:0,target:1,label:''};
  }
  function goalComplete(){ return getGoalState().progress >= 1; }
  function goalProgressText(){
    const st = getGoalState();
    const lv = game.level;
    if(lv.goal === 'percent') return `${Math.min(100,Math.round(st.progress*100))}%`;
    if(lv.goal === 'mass') return `${Math.floor(st.current)} / ${st.target}`;
    return `${Math.floor(st.current)} / ${st.target}`;
  }

  function updateHud(){
    if(!game) return;
    ui.coinsHud.textContent = save.coins;
    ui.levelHud.textContent = game.levelIndex + 1;
    ui.timeHud.textContent = Math.ceil(game.timeLeft);
    ui.runCoinsHud.textContent = game.runCoins;
    const goal = getGoalState();
    const pct = Math.min(100, Math.max(0, Math.round(goal.progress * 100)));
    ui.bar.style.width = pct + '%';
    ui.progressText.textContent = goalProgressText();
    ui.quest.textContent = `${game.level.goalText} • ${game.level.name}`;

    if(game.turboTime > 0){ ui.turboChip.classList.add('show'); ui.turboTime.textContent = Math.ceil(game.turboTime); }
    else ui.turboChip.classList.remove('show');

    if(game.magnetTime > 0){ ui.magnetChip.classList.add('show'); ui.magnetTime.textContent = Math.ceil(game.magnetTime); }
    else ui.magnetChip.classList.remove('show');
  }

  function finish(win){
    if(!game || game.ended) return;
    game.ended = true;
    game.running = false;
    game.win = win;

    const baseReward = Math.floor(game.eaten * 1.2);
    const coinReward = game.runCoins * 3;
    const bonusReward = win ? (60 + game.levelIndex * 20) : 15;
    const totalReward = baseReward + coinReward + bonusReward;

    save.coins += totalReward;
    if(win && save.unlocked < LEVELS.length && game.levelIndex + 1 >= save.unlocked) save.unlocked++;
    if(win) save.currentLevel = Math.min(LEVELS.length - 1, Math.max(save.currentLevel, game.levelIndex + 1));
    persist();

    ui.end.classList.add('show');
    ui.endTitle.textContent = win ? 'Уровень пройден!' : 'Время вышло';
    ui.endText.textContent = win ? `Цель выполнена: ${game.level.goalText}.` : `Цель не выполнена: ${game.level.goalText}.`;
    ui.endBanner.src = win ? 'assets/ui_victory_banner.png' : 'assets/ui_defeat_banner.png';
    ui.endBadge.textContent = win ? 'Победа' : 'Попытка';
    ui.endBadge.className = 'endBadge ' + (win ? 'win' : 'lose');
    ui.endEaten.textContent = `${game.eaten}/${game.totalObjects}`;
    ui.endCoins.textContent = `${game.runCoins}`;
    ui.endBase.textContent = `${baseReward} 🪙`;
    ui.endCoinReward.textContent = `${coinReward} 🪙`;
    ui.endBonus.textContent = `${bonusReward} 🪙`;
    ui.endReward.textContent = `${totalReward} 🪙`;
    ui.nextBtn.textContent = win ? (game.levelIndex < LEVELS.length - 1 ? 'Следующий уровень' : 'Переиграть финал') : 'Попробовать снова';

    updateHud();
  }

  function update(dt){
    if(!game || !game.running) return;

    game.timeLeft -= dt;
    if(game.timeLeft <= 0){ game.timeLeft = 0; finish(false); }

    if(game.turboTime > 0) game.turboTime = Math.max(0, game.turboTime - dt);
    if(game.magnetTime > 0) game.magnetTime = Math.max(0, game.magnetTime - dt);
    game.shake = Math.max(0, game.shake - dt * 18);
    game.flash = Math.max(0, game.flash - dt * 3.5);
    ui.flash.style.opacity = String(Math.min(.17, game.flash * .12));

    const hole = game.hole;
    const input = game.input;
    const deadZone = 10;
    const maxStick = 90;

    if(input.active){
      let dx = input.cx - input.sx;
      let dy = input.cy - input.sy;
      let len = Math.hypot(dx, dy);
      if(len > maxStick){ dx = dx / len * maxStick; dy = dy / len * maxStick; len = maxStick; }
      if(len > deadZone){
        const power = (len - deadZone) / (maxStick - deadZone);
        const dirX = dx / len;
        const dirY = dy / len;
        const moveSpeed = hole.speed * (game.turboTime > 0 ? 1.55 : 1) * (0.35 + power * 0.65);
        hole.x += dirX * moveSpeed * dt;
        hole.y += dirY * moveSpeed * dt;
      }
    }

    hole.x = clamp(hole.x, hole.r, game.world.w - hole.r);
    hole.y = clamp(hole.y, hole.r, game.world.h - hole.r);
    hole.r += (hole.targetR - hole.r) * Math.min(1, dt * 6);

    const suctionMul = (1 + save.upgrades.suction * 0.14) * (game.magnetTime > 0 ? 2.15 : 1);

    for(const o of game.objects){
      if(!o.alive) continue;
      const dx = hole.x - o.x;
      const dy = hole.y - o.y;
      const d = Math.hypot(dx, dy);
      const canEat = o.baseR <= hole.r * 0.84;

      if(canEat && d < hole.r * (1.45 * suctionMul)){
        const pull = (160 + hole.r*3.4) * dt * (1.12 - Math.min(1, d / (hole.r*1.45*suctionMul)) * 0.62);
        if(d > 0.001){
          o.x += dx / d * pull;
          o.y += dy / d * pull;
        }
        o.r += (Math.max(3, o.baseR * 0.16) - o.r) * Math.min(1, dt * 10);
      } else {
        o.r += (o.baseR - o.r) * Math.min(1, dt * 4);
      }

      if(canEat && d < hole.r * 0.52){
        o.alive = false;
        game.eaten++;
        game.typeEaten[o.type] = (game.typeEaten[o.type] || 0) + 1;
        hole.mass += o.mass;
        hole.targetR = (24 + save.upgrades.start*4) + Math.sqrt(hole.mass) * 4.45;
        hole.speed = 330 + save.upgrades.speed*22 + Math.min(110, hole.mass * 0.16);

        game.bursts.push({
          x:o.x, y:o.y, size:o.baseR * 2.5 * o.assetScale, life:0.32, max:0.32,
          spriteKey:o.spriteKey, spin:rand(-7,7), rot:rand(0, Math.PI*2),
          alpha:1
        });

        const impact = Math.min(9, 1.5 + o.baseR * 0.10);
        game.shake = Math.max(game.shake, impact);
        game.flash = Math.max(game.flash, o.baseR > 30 ? .75 : .28);
        if(navigator.vibrate){
          if(o.baseR > 42) navigator.vibrate(28);
          else if(o.baseR > 20) navigator.vibrate(12);
        }

        game.combo++;
        game.comboTimer = 0.8;
        if(game.combo >= 3){
          ui.combo.textContent = 'COMBO ×' + game.combo;
          ui.combo.classList.add('show');
        }

        const particleColor = o.type === 'дерево' ? '#7bed9f' : o.type === 'машина' ? '#8ec9ff' : '#ffffff';
        for(let i=0;i<9;i++) addParticle(o.x, o.y, particleColor, rand(2,4), rand(.35,.7));
      }
    }

    if(game.comboTimer > 0){
      game.comboTimer -= dt;
      if(game.comboTimer <= 0){ game.combo = 0; ui.combo.classList.remove('show'); }
    }

    game.particles = game.particles.filter(p => (p.life -= dt) > 0);
    for(const p of game.particles){
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 50 * dt;
    }

    for(const c of game.mapCoins){
      if(!c.alive) continue;
      c.pulse += dt * 4.2;
      const dx = hole.x - c.x;
      const dy = hole.y - c.y;
      const d = Math.hypot(dx, dy);
      if(d < hole.r * 1.12 + c.r){
        const pull = (130 + hole.r*2.1) * dt;
        if(d > 0.001){
          c.x += dx / d * pull;
          c.y += dy / d * pull;
        }
      }
      if(d < hole.r * 0.48 + c.r * 0.55){
        c.alive = false;
        game.runCoins++;
        addFloatText(c.x, c.y - 6, '+1 🪙', '#ffe39a');
        for(let i=0;i<7;i++) addParticle(c.x, c.y, '#ffd86f', rand(2,4), rand(.3,.6));
        if(navigator.vibrate) navigator.vibrate(8);
      }
    }

    game.floatTexts = game.floatTexts.filter(t => (t.life -= dt) > 0);
    for(const t of game.floatTexts){
      t.y -= t.vy * dt;
    }

    game.bursts = game.bursts.filter(b => (b.life -= dt) > 0);
    for(const b of game.bursts){
      const t = 1 - b.life / b.max;
      b.x += (hole.x - b.x) * Math.min(1, dt * (8 + t*8));
      b.y += (hole.y - b.y) * Math.min(1, dt * (8 + t*8));
      b.rot += b.spin * dt;
      b.alpha = 1 - t;
    }

    for(const b of game.powerups){
      if(!b.alive) continue;
      b.pulse += dt * 3.2;
      const d = Math.hypot(hole.x - b.x, hole.y - b.y);
      if(d < hole.r + b.r * 0.9){
        b.alive = false;
        if(b.kind === 'turbo') game.turboTime = Math.max(game.turboTime, 8);
        if(b.kind === 'magnet') game.magnetTime = Math.max(game.magnetTime, 9);
        if(b.kind === 'time') game.timeLeft += 10;
        game.flash = 1;
        game.shake = Math.max(game.shake, 5);
        if(navigator.vibrate) navigator.vibrate([18,30,18]);
        for(let i=0;i<16;i++) addParticle(b.x, b.y, b.color, rand(2,5), rand(.4,.8));
      }
    }

    if(goalComplete()) finish(true);

    const desiredZoom = clamp(1.06 - Math.max(0, hole.r - 24) * 0.0048, 0.56, 1.02);
    game.cam.zoom += (desiredZoom - game.cam.zoom) * Math.min(1, dt * 3.5);
    game.cam.x += (hole.x - game.cam.x) * Math.min(1, dt * 5);
    game.cam.y += (hole.y - game.cam.y) * Math.min(1, dt * 5);

    const halfW = W / (2 * game.cam.zoom);
    const halfH = H / (2 * game.cam.zoom);
    const minX = halfW, maxX = game.world.w - halfW;
    const minY = halfH, maxY = game.world.h - halfH;

    if(minX > maxX) game.cam.x = game.world.w / 2;
    else game.cam.x = clamp(game.cam.x, minX, maxX);

    if(minY > maxY) game.cam.y = game.world.h / 2;
    else game.cam.y = clamp(game.cam.y, minY, maxY);

    updateHud();
  }



  function drawImageCentered(img, x, y, size, sizeY=null){
    if(!img) return false;
    const h = sizeY || size;
    const ratio = img.width / img.height;
    let w = size;
    let hh = h;
    if(!sizeY){
      hh = size / ratio;
    }
    ctx.drawImage(img, x - w/2, y - hh/2, w, hh);
    return true;
  }

  function applyWorldTransform(){
    const z = game.cam.zoom;
    const sx = game.shake > 0 ? rand(-game.shake, game.shake) : 0;
    const sy = game.shake > 0 ? rand(-game.shake, game.shake) : 0;
    ctx.setTransform(DPR * z, 0, 0, DPR * z, (W/2 - game.cam.x * z + sx) * DPR, (H/2 - game.cam.y * z + sy) * DPR);
  }

  function drawBackground(){
    const theme = game.level.theme;
    const ww = game.world.w, hh = game.world.h;

    if(theme === 'beach'){
      ctx.fillStyle = '#6fd0fb';
      ctx.fillRect(0, 0, ww, hh * 0.22);
      ctx.fillStyle = '#f4dfad';
      ctx.fillRect(0, hh * 0.22, ww, hh * 0.78);

      ctx.fillStyle = 'rgba(255,255,255,.28)';
      for(let i=0;i<8;i++) ctx.fillRect(0, hh * 0.22 + i*9, ww, 3);

      ctx.fillStyle = 'rgba(255,255,255,.10)';
      for(let x=90;x<ww;x+=190){
        for(let y=hh*0.3;y<hh;y+=180){
          ctx.fillRect(x, y, 60, 24);
        }
      }
    } else if(theme === 'mall') {
      ctx.fillStyle = '#edf2f7';
      ctx.fillRect(0, 0, ww, hh);
      ctx.fillStyle = '#dce3ec';
      for(let x=0;x<ww;x+=160) ctx.fillRect(x, 0, 10, hh);
      for(let y=0;y<hh;y+=160) ctx.fillRect(0, y, ww, 10);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      for(let x=40;x<ww;x+=320){
        ctx.fillRect(x, 70, 220, hh-140);
      }
    } else if(theme === 'park') {
      ctx.fillStyle = '#98db8c';
      ctx.fillRect(0, 0, ww, hh);

      ctx.fillStyle = '#ead9b0';
      for(let x=260;x<ww;x+=520) ctx.fillRect(x, 0, 88, hh);
      for(let y=300;y<hh;y+=520) ctx.fillRect(0, y, ww, 88);

      ctx.fillStyle = 'rgba(80,160,70,.18)';
      for(let i=0;i<32;i++){
        const x = 80 + (i*137)%ww;
        const y = 120 + (i*211)%hh;
        ctx.beginPath();
        ctx.arc(x, y, 38 + (i%4)*12, 0, Math.PI*2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#73bd7e';
      ctx.fillRect(0, 0, ww, hh);
      ctx.fillStyle = '#b0b7c1';
      for(let x=260;x<ww;x+=520) ctx.fillRect(x, 0, 115, hh);
      for(let y=300;y<hh;y+=520) ctx.fillRect(0, y, ww, 115);

      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([20,20]);
      for(let x=317;x<ww;x+=520){
        ctx.beginPath();
        ctx.moveTo(x,0);
        ctx.lineTo(x,hh);
        ctx.stroke();
      }
      for(let y=357;y<hh;y+=520){
        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(ww,y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      ctx.strokeStyle='rgba(255,255,255,.14)';
      ctx.lineWidth=2;
      for(let x=150;x<ww;x+=210){
        for(let y=160;y<hh;y+=210){
          ctx.strokeRect(x,y,90,52);
        }
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,.24)';
    ctx.lineWidth = 8;
    ctx.strokeRect(0,0,ww,hh);
  }



  function drawShadow(x,y,w,h,alpha=.14){
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI*2);
    ctx.fill();
  }

  function drawObject(o){
    if(!o.alive) return;
    const img = ASSETS[o.spriteKey];

    ctx.save();
    ctx.translate(o.x, o.y);
    if(!o.noRotate) ctx.rotate(o.spin * 0.08);

    const drawSize = o.baseR * 2.5 * o.assetScale;
    drawShadow(3, o.baseR*0.58, Math.max(12, drawSize*0.24), Math.max(5, drawSize*0.08), 0.13);

    if(img){
      const ratio = img.height / img.width;
      const w = drawSize;
      const h = drawSize * ratio;
      ctx.drawImage(img, -w/2, -h*0.72 + o.yOffset, w, h);
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, o.r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }



  function drawPowerups(){
    for(const b of game.powerups){
      if(!b.alive) continue;
      const pulse = 1 + Math.sin(b.pulse) * .08;

      ctx.save();
      ctx.translate(b.x,b.y);
      ctx.scale(pulse,pulse);

      drawShadow(3, 18, 22, 8, 0.15);

      const g = ctx.createRadialGradient(0,0,3,0,0,30);
      g.addColorStop(0,b.color);
      g.addColorStop(.55,b.color);
      g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.globalAlpha=.36;
      ctx.fillStyle=g;
      ctx.beginPath();
      ctx.arc(0,0,30,0,Math.PI*2);
      ctx.fill();
      ctx.globalAlpha=1;

      const img = ASSETS[b.spriteKey];
      if(img){
        const size = 60;
        const ratio = img.height / img.width;
        ctx.drawImage(img, -size/2, -size*ratio/2, size, size*ratio);
      } else {
        ctx.fillStyle='rgba(10,16,28,.88)';
        ctx.beginPath();
        ctx.arc(0,0,18,0,Math.PI*2);
        ctx.fill();
        ctx.font='18px system-ui';
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(b.emoji,0,1);
      }
      ctx.restore();
    }
  }

  function drawBursts(){
    for(const b of game.bursts){
      const img = ASSETS[b.spriteKey];
      const t = 1 - b.life / b.max;
      ctx.save();
      ctx.globalAlpha = Math.max(0, b.alpha);
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      const s = b.size * (1 - t*0.72);
      if(img){
        const ratio = img.height / img.width;
        ctx.drawImage(img, -s/2, -(s*ratio)/2, s, s*ratio);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.beginPath();
        ctx.arc(0,0,Math.max(2,s*0.08),0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(){
    for(const p of game.particles){
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloatTexts(){
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px system-ui';
    for(const t of game.floatTexts){
      const a = Math.max(0, t.life / t.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = t.color;
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHole(){
    const hole = game.hole;
    const x = hole.x, y = hole.y, r = hole.r;
    let img;
    if(save.skin === 'neon') img = ASSETS.skin_neon;
    else if(save.skin === 'lava') img = ASSETS.skin_lava;
    else img = r < 45 ? ASSETS.hole_small : (r < 78 ? ASSETS.hole_medium : ASSETS.hole_large);

    const glow = ctx.createRadialGradient(x, y, r*0.25, x, y, r*1.48);
    glow.addColorStop(0,'rgba(0,0,0,0)');
    glow.addColorStop(.62, save.skin==='lava' ? 'rgba(255,80,0,.16)' : 'rgba(90,40,220,.16)');
    glow.addColorStop(1,'rgba(20,16,40,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r*1.48, 0, Math.PI*2);
    ctx.fill();

    if(img){
      const w = r * (save.skin==='classic' ? 2.95 : 3.15);
      const h = w * (img.height / img.width);
      ctx.drawImage(img, x - w/2, y - h/2 + r*0.08, w, h);
    } else {
      ctx.fillStyle = '#14121b';
      ctx.beginPath();
      ctx.ellipse(x, y, r, r*.72, 0, 0, Math.PI*2);
      ctx.fill();
    }
  }


  function drawJoystick(){
    if(!game || !game.input.active) return;
    const baseX = game.input.sx, baseY = game.input.sy;
    let dx = game.input.cx - game.input.sx;
    let dy = game.input.cy - game.input.sy;
    const maxStick = 90;
    const len = Math.hypot(dx,dy);
    if(len > maxStick){ dx = dx / len * maxStick; dy = dy / len * maxStick; }

    ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.arc(baseX, baseY, 42, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(142,240,255,.75)';
    ctx.beginPath();
    ctx.arc(baseX + dx, baseY + dy, 24, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function render(){
    if(!game) return;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.clearRect(0,0,W,H);

    applyWorldTransform();
    drawBackground();

    const visible = game.objects
      .filter(o => o.alive)
      .sort((a,b) => ((a.y + a.baseR) - (b.y + b.baseR)) || (a.baseR - b.baseR));

    drawMapCoins();
    for(const o of visible) drawObject(o);

    drawPowerups();
    drawParticles();
    drawFloatTexts();
    drawBursts();
    drawHole();

    ctx.setTransform(DPR,0,0,DPR,0,0);
    drawJoystick();
  }



  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  Promise.all(assetPromises).then(() => {
    startLevel(save.currentLevel);
    game.running = false;
    updateMenu();
    showMenu();
    requestAnimationFrame(loop);
  });
})();
