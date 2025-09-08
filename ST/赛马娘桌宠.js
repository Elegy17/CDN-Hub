// ==UserScript==
// @name         酒馆精灵|强击育成模拟器 (心跳完全版) V X
// @version      X
// @description  【V X 全面修复】1. 随机育成，2.老虎机，3.内存过大在修复
// @author       Eternal zz
// @match        */*
// @grant        none
// ==/UserScript==
(function () {
  'use strict';

  function logDebug(...args) {
    console.log(`[模拟器 v100.0.0]`, ...args);
  }

  function logError(...args) {
    console.error(`[模拟器 v100.0.0]`, ...args);
  }

  // 添加脚本启动日志
  console.log('[模拟器 v100.0.0] 脚本开始加载...');
  logDebug('脚本已启动，时间戳:', new Date().toISOString());

  // 设备检测功能
  let isMobile = false;
  let isDesktop = false;

  function detectDevice() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      isMobile = true;
      console.log('📱 [模拟器 v100.0.0] 检测到手机端设备');
      return 'mobile';
    } else {
      isDesktop = true;
      console.log('💻 [模拟器 v100.0.0] 检测到电脑端设备');
      return 'desktop';
    }
  }

  const deviceType = detectDevice();

  function makeDraggable(element, parentWin, $, scriptIdPrefix) {
    let startX,
      startY,
      hasDragged = false,
      offset;
    const $doc = $(parentWin.document);
    const getCoords = e =>
      e.type.startsWith('touch') ? e.originalEvent.touches[0] || e.originalEvent.changedTouches[0] : e;
    const dragStart = e => {
      if (e.type === 'mousedown' && e.which === 3) return;
      const openPanelFunction = element.data('openPanelFunction');
      element.removeClass('snapped').css({ opacity: 1, transform: 'scale(1)', cursor: 'grabbing' });
      const coords = getCoords(e);
      startX = coords.pageX;
      startY = coords.pageY;
      hasDragged = false;
      const pos = element.offset();
      offset = { y: startY - pos.top, x: startX - pos.left };
      e.preventDefault();
      $doc.on(`mousemove.${scriptIdPrefix} touchmove.${scriptIdPrefix}`, dragMove);
      $doc.one(`mouseup.${scriptIdPrefix} touchend.${scriptIdPrefix}`, dragEnd.bind({ openPanelFunction }));
    };
    const dragMove = e => {
      const coords = getCoords(e);
      if (Math.abs(coords.pageX - startX) > 5 || Math.abs(coords.pageY - startY) > 5) hasDragged = true;
      let newTop = coords.pageY - offset.y,
        newLeft = coords.pageX - offset.x;
      newTop = Math.max(0, Math.min(newTop, parentWin.innerHeight - element.outerHeight()));
      newLeft = Math.max(0, Math.min(newLeft, parentWin.innerWidth - element.outerWidth()));
      element.css({ top: newTop + 'px', left: newLeft + 'px', right: 'auto', bottom: 'auto' });
    };
    const dragEnd = function () {
      $doc.off(`mousemove.${scriptIdPrefix} touchmove.${scriptIdPrefix}`);
      element.css('cursor', 'grab');
      if (
        !hasDragged &&
        typeof this.openPanelFunction === 'function' &&
        element.is(`#${musicBoxModule.PLAYER_BUTTON_ID}`)
      ) {
        this.openPanelFunction();
        return;
      }
      const posKey = element.data('positionKey');
      if (posKey) localStorage.setItem(posKey, JSON.stringify(element.offset()));
      if (element.is(`#${musicBoxModule.PLAYER_BUTTON_ID}`)) {
        const winWidth = parentWin.innerWidth,
          btnPos = element.offset(),
          btnWidth = element.outerWidth();
        const snapThreshold = 60;
        let newPos = { left: btnPos.left },
          shouldSnap = false;
        if (btnPos.left < snapThreshold) {
          newPos.left = -(btnWidth / 1.5);
          shouldSnap = true;
        } else if (btnPos.left + btnWidth > winWidth - snapThreshold) {
          newPos.left = winWidth - btnWidth / 1.5;
          shouldSnap = true;
        }
        if (shouldSnap) {
          element.addClass('snapped').animate(
            {
              ...newPos,
              opacity: 0.6,
              transform: 'scale(0.9)',
            },
            200,
            'swing',
          );
        } else {
          element.removeClass('snapped');
        }
      }
    };
    const handle = element.data('dragHandle') ? element.find(element.data('dragHandle')) : element;
    handle.on(`mousedown.${scriptIdPrefix} touchstart.${scriptIdPrefix}`, dragStart);
  }

  function typewriterEffect(element, text, callback) {
    let i = 0;
    // 先清空，然后创建一个用于容纳文本的span和一个光标span
    element.html('<span></span><span class="typewriter-cursor_ap">▋</span>');
    const textSpan = element.find('span:first-child');
    const cursor = element.find('.typewriter-cursor_ap');
    // 如果之前的计时器还在运行，先清除它，避免重叠
    if (element.data('typewriterInterval')) {
      clearInterval(element.data('typewriterInterval'));
    }
    const intervalId = setInterval(() => {
      if (i < text.length) {
        const char = text[i];
        // 优化了HTML标签的处理，一次性追加整个标签
        if (char === '<') {
          const tagEnd = text.indexOf('>', i);
          if (tagEnd !== -1) {
            const tag = text.substring(i, tagEnd + 1);
            textSpan.append(tag);
            i = tagEnd; // 直接跳到标签末尾
          }
        } else {
          textSpan.append(char); // 只追加单个字符
        }
        i++;
      } else {
        clearInterval(intervalId);
        cursor.remove(); // 打字结束后移除光标
        if (callback) callback();
      }
    }, 25); // 略微加快速度，感觉更流畅
    // 将新的计时器ID存到元素上，方便管理
    element.data('typewriterInterval', intervalId);
  }

  const musicBoxModule = {
    SCRIPT_ID_PREFIX: 'vibrosAudioPlayer',
    PLAYER_BUTTON_ID: 'vibrosAudioPlayer-button',
    PLAYER_PANEL_OVERLAY_ID: 'vibrosAudioPlayer-panel-overlay',
    BUTTON_POSITION_KEY: 'vibrosAudioPlayer-button-position',
    ICON_INDEX_KEY: 'vibrosAudioPlayer-icon-index',
    MEMORY_KEY: 'vibrosAudioPlayer-memory',
    ONLINE_TIME_KEY: 'vibrosAudioPlayer-onlineTime',
    TODOLIST_KEY: 'vibrosAudioPlayer-todoList',
    sillyTavernMessageHandler: null,
    domObserver: null,
    lastCharacterId: null,
    currentMainBg: { type: 'static', value: 'https://files.catbox.moe/1fd3pn.jpg' },
    iconRouletteTimer: null,
    timerInterval: null,
    timerSeconds: 0,
    isTimerRunning: false,
    onlineTimerInterval: null,
    iconIndex: 0,
    noteCategories: ['文风', '世界设定', '人设', '碎碎念', 'To do List'],
    currentNoteCategory: '文风',
    memory: {},
    raceDatabase: [],
    vibrosQuotes: [],
    titleDatabase: [],
    currentCalendarDate: new Date(),
    currentTitleGameData: null,
    isFeedbackPlaying: false,
    knowledgeTypewriterInterval: null,
    bgSwitchSoundIndex: 0,
    isDynamicBgMode: false,
    pomodoro: {
      state: 'idle',
      cycles: 0,
      workTime: 25 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60,
      cyclesUntilLongBreak: 4,
    },
    audioContext: null,
    analyser: null,
    sourceNode: null,
    visualizerFrameId: null,
    tipTimeout: null,
    motivationLevels: ['绝好调', '好调', '普通', '不调', '绝不调'],
    statIcons: { bond: '💖', speed: '🏃‍♀️', stamina: '🔋', power: '💪', guts: '❤️‍🔥', intelligence: '🧠' },
    init(parentWin, $) {
      logDebug('正在初始化【强击育成模拟器】(心跳完全版)...');
      this.parentWin = parentWin;
      this.$ = $;
      // 定义一个动态背景对象
      this.dynamicBg = { type: 'dynamic', value: 'https://files.catbox.moe/3ohch5.mp4' };
      // 先不在这里构建完整的 allBackgrounds，因为 mainBgImages 还没准备好
      this.allBackgrounds = []; // 创建一个空列表占位
      this.currentBgIndex = 0;
      this.sfxPlayer = new Audio();
      this.bgmPlayer = new Audio();
      this.bgmPlayer.crossOrigin = 'anonymous';
      this.bgmPlayer.loop = true;
      // 初始化音量设置
      this.sfxPlayer.volume = 1.0;
      this.bgmPlayer.volume = 1.0;
      // --- 全新的、更聪明的音效处理代码 ---
      logDebug('正在采用惰性加载策略初始化音效...');
      // 1. 先把所有短音效的URL和名字存起来，这里是“原料仓库”
      const soundUrls = {
        shrineEnter: 'https://files.catbox.moe/iij172.mp3',
        pray: 'https://files.catbox.moe/vbrvns.mp3',
        draw: 'https://files.catbox.moe/yn5s1c.mp3',
        randomEvent: 'https://files.catbox.moe/9dzn52.mp3',
        initGreeting: 'https://files.catbox.moe/i7fvj1.mp3',
        slotMachineStart: 'https://files.catbox.moe/sbrl2e.mp3',
        rouletteStart: 'https://files.catbox.moe/9dzn52.mp3',
        rouletteStop: 'https://files.catbox.moe/sbrl2e.mp3',
        regenerate: 'https://files.catbox.moe/wrn9ed.mp3',
        confirmEdit: 'https://files.catbox.moe/fysgmk.mp3',
        staticBgBtn: 'https://files.catbox.moe/868ml4.mp3',
        infoBtn: 'https://files.catbox.moe/b4e0fv.mp3',
        notesBtn: 'https://files.catbox.moe/k2kq6h.mp3',
        dynamicBgBtn: 'https://files.catbox.moe/pgug4n.mp3',
        rouletteBtn: 'https://files.catbox.moe/k7gv82.mp3',
        jankenBtn: 'https://files.catbox.moe/iij172.mp3',
        choiceBtn: 'https://files.catbox.moe/gb0so5.mp3',
        memoryBtn: 'https://files.catbox.moe/vbrvns.mp3',
        calendarBtn: 'https://files.catbox.moe/17k53c.mp3',
        raceLogBtn: 'https://files.catbox.moe/le4he8.mp3',
        jankenWin: 'https://files.catbox.moe/868ml4.mp3',
        jankenLose: 'https://files.catbox.moe/k8rn17.mp3',
        jankenDraw: 'https://files.catbox.moe/fysgmk.mp3',
        quotesBtnNew: 'https://files.catbox.moe/lw0erj.mp3',
        timerBtnNew: 'https://files.catbox.moe/k7gv82.mp3',
        knowledgeBtn: 'https://files.catbox.moe/z5jtkk.mp3',
        titleGameHint: 'https://files.catbox.moe/k7gv82.mp3',
        titleGameNext: 'https://files.catbox.moe/868ml4.mp3',
        sfxSwitchOn: 'https://files.catbox.moe/868ml4.mp3',
        sfxSwitchOff: 'https://files.catbox.moe/k8rn17.mp3',
      };
      // 2. 创建一个空的 this.sounds 对象，它将成为我们的“智能播放器”
      this.sounds = {};
      // 3. 使用一点“小魔法”（Object.defineProperty），给 this.sounds 添加所有音效属性
      Object.keys(soundUrls).forEach(key => {
        Object.defineProperty(this.sounds, key, {
          // 重点：我们在这里定义了一个 getter
          get: () => {
            // 只有当代码真正调用 this.sounds.shrineEnter 时，这里的 get 才会被触发
            // 这个时候，我们才去创建新的 Audio 对象并返回它！
            console.log(`惰性加载音效: ${key}`); // 你可以在控制台看到这个，证明它是按需加载的
            const audio = new Audio(soundUrls[key]);
            audio.volume = this.sfxPlayer.volume; // 保持音量设置和主播放器一致
            return audio;
          },
          configurable: true, // 允许未来可能再次修改
          enumerable: true, // 允许被遍历
        });
      });

      // 4. 对背景切换音效做同样的处理，但更简单
      this.bgSwitchSoundUrls = [
        'https://files.catbox.moe/91q5s4.mp3',
        'https://files.catbox.moe/8r2war.mp3',
        'https://files.catbox.moe/81gfp9.mp3',
        'https://files.catbox.moe/v5p75c.mp3',
        'https://files.catbox.moe/ooe5qi.mp3',
        'https://files.catbox.moe/qztqx1.mp3',
        'https://files.catbox.moe/d63zue.mp3',
      ];

      // 5. 新增：回复音效系统
      this.replySoundUrls = [
        'https://files.catbox.moe/vbrvns.mp3', // 使用指定的音效作为回复音和角色切换音效
      ];

      // 6. 新增：音频权限和上下文管理
      this.audioContext = null;
      this.audioElement = null;
      this.hasAudioPermission = false;
      this.audioPermissionKey = 'vib_audio_permission';

      // 7. 新增：点击检测系统
      this.clickHistory = [];
      this.lastClickTime = 0;
      this.clickThreshold = 800; // 800ms内三次点击（更易触发）
      this.positionTolerance = 50; // 50px位置容差

      // --- 新代码结束 ---

      this.pageTitles = {
        static: ['这个背景，你喜欢吗？', '哼哼~我的品味不错吧！', '是不是很有名流的感觉？'],
        dynamic: ['动起来了！是不是超有悸动感！', '耶嘿！一起去看世界的风景吧！', '来跳舞吧，拖累那亲！'],
        info: ['想、想要更了解我吗？', '好好看着我哦，拖累那亲~', '我的事，要全部记住哦！'],
        notes: ['要把我们的秘密记下来吗？', '耶嘿嘿~这是只属于我们的小本本哦！', '让我看看你都写了些什么~'],
        timer: ['要开始计时了吗？', '准备好，三、二、一！', '时间正在悄悄溜走哦~'],
        roulette: ['命运的轮盘开始转动！', '锵锵！会是谁呢？', '今天的幸运马娘是——！'],
        randomEvent: ['锵锵！发生了什么呢？', '是惊喜还是…？耶嘿嘿~'],
        gotoShrine: ['要去向神明大人许愿吗？', '希望我们的心意能传达到呢。'],
        pray: ['要认真一点哦，神明大人在看着呢。', '希望…我们的愿望能实现。'],
        draw: ['会是什么呢…大吉？还是…', '悸动不已！快打开看看！'],
        memory: ['我们的回忆，你都还记得吗？', '一点一滴，都是宝物哦！', '以后也要创造更多闪亮的日子！'],
        janken: ['来决一胜负吧，拖累那亲！', '猜猜看，我会出什么？', '赢了我可是有奖励的哦~'],
        calendar: ['看看我们在一起多久了吧！', '每一天都是闪闪发光的回忆！', '我们的时间纪念册~'],
        raceLog: ['来看看我们的征途吧！', '未来的每一场胜利，都从这里开始规划！', '这是我们的胜利剧本！'],
        quotes: [
          '呐，拖累那亲，我有话想对你说的私密话语...',
          '听好了，这可是名流的箴言哦！',
          '耶嘿嘿，猜猜今天是什么心情？',
        ],
        knowledge: ['要来听听本的特别讲座吗？', '哼哼，这些知识可不是谁都能听到的哦！'],
        titleGame: ['来猜猜看吧，拖累那亲！', '这个称号，说的是谁呢？', '考验我们羁绊的时候到了！'],
      };
      this.sfxLibrary = [
        {
          url: 'https://files.catbox.moe/z5jtkk.mp3',
          tags: ['亲昵互动', '撒娇'],
        },
        {
          url: 'https://files.catbox.moe/gjqcct.mp3',
          tags: ['洞察', '自信', '看穿心思'],
        },
        {
          url: 'https://files.catbox.moe/1uqec7.mp3',
          tags: ['初次见面', '礼貌问候'],
        },
        {
          url: 'https://files.catbox.moe/a7oa7i.mp3',
          tags: ['表示赞同', '回应训练员'],
        },
        {
          url: 'https://files.catbox.moe/n0dute.mp3',
          tags: ['陷入困境', '感到无力', '自我怀疑'],
        },
        {
          url: 'https://files.catbox.moe/868ml4.mp3',
          tags: ['撒娇', '表达欲求', '想要更多'],
        },
        {
          url: 'https://files.catbox.moe/fb8m1y.mp3',
          tags: ['请求夸奖', '撒娇', '寻求肯定'],
        },
        {
          url: 'https://files.catbox.moe/nqwx9b.mp3',
          tags: ['用餐开始'],
        },
        {
          url: 'https://files.catbox.moe/j9apnn.mp3',
          tags: ['初次见面', '打招呼'],
        },
        {
          url: 'https://files.catbox.moe/jfyhwp.mp3',
          tags: ['自我介绍'],
        },
        {
          url: 'https://files.catbox.moe/ijrtm4.mp3',
          tags: ['确认身份', '疑问'],
        },
        {
          url: 'https://files.catbox.moe/b4e0fv.mp3',
          tags: ['肯定回答', '表示赞同'],
        },
        {
          url: 'https://files.catbox.moe/p84yiu.mp3',
          tags: ['提及家人', '想念姐姐'],
        },
        {
          url: 'https://files.catbox.moe/ccgwcv.mp3',
          tags: ['疑问', '引起注意'],
        },
        {
          url: 'https://files.catbox.moe/2hb51j.mp3',
          tags: ['主动邀请', '指引方向'],
        },
        {
          url: 'https://files.catbox.moe/twj8ny.mp3',
          tags: ['表达乐观', '安慰他人', '自我鼓励'],
        },
        {
          url: 'https://files.catbox.moe/tl8dsi.mp3',
          tags: ['想起事情', '转换话题'],
        },
        {
          url: 'https://files.catbox.moe/8suv0p.mp3',
          tags: ['用餐结束', '表示感谢'],
        },
        {
          url: 'https://files.catbox.moe/n4h0j1.mp3',
          tags: ['表达决心', '提及梦想', '宣告目标'],
        },
        {
          url: 'https://files.catbox.moe/i7fvj1.mp3',
          tags: ['打招呼'],
        },
        {
          url: 'https://files.catbox.moe/pooats.mp3',
          tags: ['展现自信', '比赛宣言'],
        },
        {
          url: 'https://files.catbox.moe/ddxt0f.mp3',
          tags: ['感到骄傲', '展现自信'],
        },
        {
          url: 'https://files.catbox.moe/k2kq6h.mp3',
          tags: ['回避问题', '害羞', '保守秘密'],
        },
        {
          url: 'https://files.catbox.moe/vfxexw.mp3',
          tags: ['表示不满', '质问'],
        },
        {
          url: 'https://files.catbox.moe/uc9mtq.mp3',
          tags: ['承接话题', '解释说明', '常规'],
        },
        {
          url: 'https://files.catbox.moe/fk5owb.mp3',
          tags: ['表示赞美', '心情愉悦'],
        },
        {
          url: 'https://files.catbox.moe/wrn9ed.mp3',
          tags: ['告别', '结束对话'],
        },
        {
          url: 'https://files.catbox.moe/z425e6.mp3',
          tags: ['感到疲惫', '慵懒'],
        },
        {
          url: 'https://files.catbox.moe/15vi5r.mp3',
          tags: ['用餐结束', '心满意足'],
        },
        {
          url: 'https://files.catbox.moe/pgug4n.mp3',
          tags: ['问候', '日常招呼'],
        },
        {
          url: 'https://files.catbox.moe/le4he8.mp3',
          tags: ['称赞他人', '感到佩服'],
        },
        {
          url: 'https://files.catbox.moe/k63fll.mp3',
          tags: ['华丽登场', '吸引注意'],
        },
        {
          url: 'https://files.catbox.moe/rjf6c4.mp3',
          tags: ['表示惊讶', '强调效果'],
        },
        {
          url: 'https://files.catbox.moe/edyrzy.mp3',
          tags: ['表达坚持', '不服输'],
        },
        {
          url: 'https://files.catbox.moe/k8rn17.mp3',
          tags: ['道歉', '表达歉意'],
        },
        {
          url: 'https://files.catbox.moe/j4o52i.mp3',
          tags: ['感到惊讶', '意外'],
        },
        {
          url: 'https://files.catbox.moe/fysgmk.mp3',
          tags: ['感到困惑', '不理解'],
        },
        {
          url: 'https://files.catbox.moe/17k53c.mp3',
          tags: ['呼唤训练员', '寻求关注'],
        },
        {
          url: 'https://files.catbox.moe/7ptmb9.mp3',
          tags: ['强调身份', '提及品味'],
        },
        {
          url: 'https://files.catbox.moe/jkmbc3.mp3',
          tags: ['表达爱意', '强烈肯定'],
        },
        {
          url: 'https://files.catbox.moe/lw0erj.mp3',
          tags: ['表示同意', '确认状况'],
        },
        {
          url: 'https://files.catbox.moe/cinnhb.mp3',
          tags: ['请求', '拜托他人'],
        },
        {
          url: 'https://files.catbox.moe/k7gv82.mp3', 
          tags: ['亲吻', '亲密接触']
        },
      ];
      this.bgmLibrary = [
        {
          name: 'ミッドナイト・エピローグ',
          url: 'https://files.catbox.moe/qfwwgp.flac',
        },
        {
          name: '马娘盛宴！美食大游行',
          url: 'https://files.catbox.moe/jueda8.mp3',
        },
        {
          name: 'トレセン音頭 (强击宝宝的)',
          url: 'https://files.catbox.moe/2izau9.mp3'
        },
        {
          name: '超える(超越吧)',
          url: 'https://files.catbox.moe/v0iy0a.mp3',
        },
        {
          name: 'トレセン音頭 (Game Size)',
          url: 'https://files.catbox.moe/k0r0id.mp3',
        },
        {
          name: 'U.M.A. NEW WORLD!!',
          url: 'https://files.catbox.moe/okct8d.mp3'
        },
        {
          name: "GIRLS' LEGEND U",
          url: 'https://files.catbox.moe/146x8h.mp3',
        },
        {
          name: 'Glorious Moment！',
          url: 'https://files.catbox.moe/agi8yx.mp3'
        },
        {
          name: '晨昏线',
          url: 'https://files.catbox.moe/od9j6n.mp3'
        },
      ];
      const sharedImages = [
        'https://files.catbox.moe/7gjs8m.webp',
        'https://files.catbox.moe/oq2h66.jpg',
        'https://files.catbox.moe/539zn7.jpg',
        'https://files.catbox.moe/lgxdwg.png',
        'https://files.catbox.moe/91sb56.png',
      ];
      this.mainBgImages = [
        ...sharedImages,
        'https://files.catbox.moe/36fhm3.jpg',
        'https://files.catbox.moe/9jxt30.jpg',
        'https://files.catbox.moe/1fd3pn.jpg',
        'https://files.catbox.moe/cqffwa.jpg',
        'https://files.catbox.moe/57i6qj.jpg',
        'https://files.catbox.moe/z08qxd.jpg',
        'https://files.catbox.moe/tsumsa.jpg',
        'https://files.catbox.moe/rsv3mm.jpg',
        'https://files.catbox.moe/gnktvf.jpg',
        'https://files.catbox.moe/qbowdw.jpg',
        'https://files.catbox.moe/ue6x85.png',
        'https://files.catbox.moe/eot80j.jpg',
        'https://files.catbox.moe/ozkbye.jpg',
        'https://files.catbox.moe/w297n5.jpg',
        'https://files.catbox.moe/kccykt.jpg',
        'https://files.catbox.moe/assi4l.jpg',
        'https://files.catbox.moe/fhi7da.jpg',
        'https://files.catbox.moe/uke771.jpg',
        'https://files.catbox.moe/8vcxud.jpg',
        'https://files.catbox.moe/nkeit7.jpg',
        'https://files.catbox.moe/gm6cx6.jpg',
        'https://files.catbox.moe/zazebb.jpg',
        'https://files.catbox.moe/ytrv9i.jpg',
        'https://files.catbox.moe/laljcm.jpg',
        'https://files.catbox.moe/5gws7d.jpg',
        'https://files.catbox.moe/y9qq3y.jpg',
        'https://files.catbox.moe/9imu7g.jpg',
        'https://files.catbox.moe/yx5jn2.jpg',
        'https://files.catbox.moe/g0apn7.jpg',
        'https://files.catbox.moe/wqz5ef.jpg',
        'https://files.catbox.moe/9sclw5.jpg',
        'https://files.catbox.moe/akrm5f.jpg',
        'https://files.catbox.moe/edqc3z.png',
        'https://files.catbox.moe/zqiezy.jpg',
        'https://files.catbox.moe/4b07sg.jpg',
        'https://files.catbox.moe/fajmhh.jpg',
        'https://files.catbox.moe/tzkoqy.jpg',
        'https://files.catbox.moe/8emnoa.jpg',
        'https://files.catbox.moe/y509g7.jpg',
        'https://files.catbox.moe/x0geql.jpg',
        'https://files.catbox.moe/2ox545.jpg',
        'https://files.catbox.moe/cp1qb1.jpg',
        'https://files.catbox.moe/t23ror.jpg',
        'https://files.catbox.moe/6i5pb1.jpg',
        'https://files.catbox.moe/ny0jew.jpg',
        'https://files.catbox.moe/71az9q.jpg',
        'https://files.catbox.moe/m9cnh2.jpg',
        'https://files.catbox.moe/a351n7.jpg',
        'https://files.catbox.moe/jw6uyo.jpg',
        'https://files.catbox.moe/m66rwd.jpg',
        'https://files.catbox.moe/xve0fr.jpg',
      ];
      this.screensaverImages = [
        ...sharedImages,
        'https://files.catbox.moe/xg93zf.jpg',
        'https://files.catbox.moe/fo0wn5.jpg',
        'https://files.catbox.moe/cs0ovj.jpg',
        'https://files.catbox.moe/fdk1y8.jpg',
        'https://files.catbox.moe/pa9p00.jpg',
        'https://files.catbox.moe/2wpwlg.jpg',
        'https://files.catbox.moe/yux828.jpg',
        'https://files.catbox.moe/dedwqz.jpg',
        'https://files.catbox.moe/v8bbky.jpg',
        'https://files.catbox.moe/k6xrci.jpg',
        'https://files.catbox.moe/yls8nv.jpg',
        'https://files.catbox.moe/wn4s3w.jpg',
        'https://files.catbox.moe/rjchsc.jpg',
        'https://files.catbox.moe/sdyxal.jpg',
        'https://files.catbox.moe/j6s7vg.jpg',
        'https://files.catbox.moe/vtn448.jpg',
        'https://files.catbox.moe/08474v.jpg',
        'https://files.catbox.moe/uqvwrx.jpg',
        'https://files.catbox.moe/anzvoc.jpg',
      ];
      this.screensaverStyles = [
        ...this.screensaverImages.map(url => ({
          type: 'image',
          value: url,
        })),
        { type: 'color', value: '#1a1b26' },
      ];
      this.icons = [
        'https://files.catbox.moe/qflzxu.jpg',
        'https://files.catbox.moe/0yc93h.png',
        'https://files.catbox.moe/dqck58.png',
        'https://files.catbox.moe/dz30g2.png',
        'https://files.catbox.moe/j5ey17.png',
        'https://files.catbox.moe/8guz7f.png',
        'https://files.catbox.moe/a6j27z.png',
        'https://files.catbox.moe/fwsr5i.png',
        'https://files.catbox.moe/gto9os.png',
        'https://files.catbox.moe/mmpm2o.png',
        'https://files.catbox.moe/5o1sq8.png',
        'https://files.catbox.moe/cwze03.png',
        'https://files.catbox.moe/lb6i2m.png',
        'https://files.catbox.moe/vaybf1.png',
        'https://files.catbox.moe/6ji5t8.png',
        'https://files.catbox.moe/2bdoqf.png',
        'https://files.catbox.moe/0e87w5.png',
        'https://files.catbox.moe/88bl5k.png',
        'https://files.catbox.moe/q8iq99.png',
        'https://files.catbox.moe/0kwkeu.png',
        'https://files.catbox.moe/ohxr62.png',
        'https://files.catbox.moe/qnjifq.png',
        'https://files.catbox.moe/ti7a7e.png',
        'https://files.catbox.moe/lt44fw.png',
        'https://files.catbox.moe/ho8xuw.png',
        'https://files.catbox.moe/uh8els.png',
        'https://files.catbox.moe/sexais.png',
        'https://files.catbox.moe/y1zi4p.png',
        'https://files.catbox.moe/jnhnnm.png',
        'https://files.catbox.moe/a8ldtj.png',
        'https://files.catbox.moe/g88mff.png',
        'https://files.catbox.moe/ws098v.png',
        'https://files.catbox.moe/utoc62.png',
        'https://files.catbox.moe/a6o2cp.png',
        'https://files.catbox.moe/tw6yxw.png',
        'https://files.catbox.moe/3fts2d.png',
        'https://files.catbox.moe/oe13q9.png',
        'https://files.catbox.moe/5su1k9.png',
        'https://files.catbox.moe/bt39hi.png',
        'https://files.catbox.moe/gvwlym.png',
        'https://files.catbox.moe/0jx1t6.png',
        'https://files.catbox.moe/ap6q6m.png',
        'https://files.catbox.moe/92lv2o.png',
        'https://files.catbox.moe/ug311x.png',
        'https://files.catbox.moe/dv90ej.png',
        'https://files.catbox.moe/27hpzv.png',
        'https://files.catbox.moe/zr06x6.png',
        'https://files.catbox.moe/qljj32.png',
        'https://files.catbox.moe/fziqii.png',
        'https://files.catbox.moe/crh2a4.png',
        'https://files.catbox.moe/2bvb02.png',
        'https://files.catbox.moe/ypgbw8.png',
        'https://files.catbox.moe/7epz7w.png',
        'https://files.catbox.moe/e0irum.png',
        'https://files.catbox.moe/n9lgpv.png',
        'https://files.catbox.moe/78myzx.png',
        'https://files.catbox.moe/ywa39v.png',
        'https://files.catbox.moe/6jtp5b.png',
        'https://files.catbox.moe/jyy7wi.png',
        'https://files.catbox.moe/inpm0l.png',
        'https://files.catbox.moe/3368uv.png',
        'https://files.catbox.moe/ick1y5.png',
        'https://files.catbox.moe/qy58sb.png',
        'https://files.catbox.moe/vtjt9y.jpg',
        'https://files.catbox.moe/1ay7et.png',
        'https://files.catbox.moe/rytn3t.png',
        'https://files.catbox.moe/e78dpk.png',
        'https://files.catbox.moe/uod4x0.png',
        'https://files.catbox.moe/klo9wi.png',
        'https://files.catbox.moe/kw4nhq.png',
        'https://files.catbox.moe/7xxwak.png',
        'https://files.catbox.moe/6you6o.png',
        'https://files.catbox.moe/i89w2a.png',
        'https://files.catbox.moe/cvaugj.png',
        'https://files.catbox.moe/vdrsps.png',
        'https://files.catbox.moe/60mzvm.gif',
        'https://files.catbox.moe/u2ka32.gif',
        'https://files.catbox.moe/6kw9ll.gif',
        'https://files.catbox.moe/dyzslx.gif',
        'https://files.catbox.moe/3xncjo.gif',
        'https://files.catbox.moe/utmasr.gif',
        'https://files.catbox.moe/1c8zo7.gif',
        'https://files.catbox.moe/2e10cw.gif',
        'https://files.catbox.moe/lxvoqi.gif',
        'https://files.catbox.moe/8bsfya.gif',
        'https://files.catbox.moe/dv1pz6.gif',
        'https://files.catbox.moe/7tj3wk.gif',
        'https://files.catbox.moe/8d77ys.gif',
        'https://files.catbox.moe/oh6zw2.gif',
        'https://files.catbox.moe/u0e986.gif',
        'https://files.catbox.moe/3o3ct2.gif',
        'https://files.catbox.moe/mb5hph.gif',
        'https://files.catbox.moe/u63tde.gif',
        'https://files.catbox.moe/wxivic.gif',
        'https://files.catbox.moe/uwgh8o.gif',
        'https://files.catbox.moe/q8lbcc.gif',
        'https://files.catbox.moe/e7kqj7.gif',
        'https://files.catbox.moe/8pnx62.gif',
        'https://files.catbox.moe/dc4z95.gif',
        'https://files.catbox.moe/xhvxq8.png',
        'https://files.catbox.moe/b274n3.png',
        'https://files.catbox.moe/tl4ovt.gif',
        'https://files.catbox.moe/h0sg39.gif',
        'https://files.catbox.moe/mugsxv.gif',
        'https://files.catbox.moe/gj5ft1.gif',
        'https://files.catbox.moe/4ss182.gif',
        'https://files.catbox.moe/4nicqk.gif',
        'https://files.catbox.moe/sbbpci.gif',
        'https://files.catbox.moe/4whwro.gif',
        'https://files.catbox.moe/v0bwfa.gif',
        'https://files.catbox.moe/rg2u7e.gif',
        'https://files.catbox.moe/gyihwy.gif',
        'https://files.catbox.moe/wxeof4.gif',
        'https://files.catbox.moe/n6aoa9.gif',
        'https://files.catbox.moe/y72gh5.gif',
        'https://files.catbox.moe/u9szcj.gif',
        'https://files.catbox.moe/90rvne.gif',
      ];

      this.dynamicQuotes = {
        bond: [
          { threshold: 100, quote: '我们之间的羁绊，已经闪闪发光到快要溢出来了呢！耶嘿嘿~最喜欢拖累那亲了！' },
          {
            threshold: 50,
            quote: '呐，拖累那亲，最近和你在一起的时间，总觉得心跳得特别快……这就是所谓的‘悸动’吗？',
          },
          { threshold: 20, quote: '感觉……我们好像变得更亲近了呢。这种感觉，不赖嘛！' },
          { threshold: 0, quote: '哼哼，作为我的王子殿下，可要好好努力，让我看到更多有趣的东西哦！' },
        ],
        jankenWin: '耶！我赢了！不愧是我！拖累那亲，要接受名流的惩罚游戏哦~',
        jankenLose: '呜哇！居然输了……真、真没办法，这次就让你得意一下好了！',
        fortuneGood: '抽到了大吉！耶嘿！看来今天和拖累那亲的约会一定会超~顺利！',
        fortuneBad: '呜……是大凶。拖累那亲，今天一定要紧紧跟在我身边，不准离开哦！不然会发生不好的事情的！',
      };
      this.heartfeltQuotes = {
        roulette: ['下一个会是谁呢~♪', '命运的轮盘，转呀转~', '快停下来，让我看看是谁！'],
        timer: ['时间要开始计算咯！', '专注，专注！', '滴答，滴答……感觉心跳也加速了。'],
        quotes: [
          '让我想想……今天该对你说什么悄悄话呢？',
          '这句话，只说给你一个人听哦。',
          '耶嘿嘿，被我的话语迷住了吗？',
        ],
        todo: ['新的目标，GET！', '哼哼，看我把它完美搞定！', '又多了一件和拖累那亲一起做的事呢。'],
        calendar: [
          '我们已经在一起这么久了呀……',
          '每一天都是闪闪发光的回忆！',
          '不知道未来的日历上，会写满什么样的故事呢？',
        ],
      };
      this.parseKnowledgeNuggets();
      this.initializeShrineData();
      this.initializeInteractiveEvents();
      this.initializeTitles();
      this.parseRaceData();
      this.parseQuotes();
      this.parseTitleData();
      this.initVisualizer();
      this.loadMemory();
      this.checkLogin();
      this.initializeRaceGoals();
      this.volumeLevels = [
        { level: 1.0, text: '高' },
        { level: 0.5, text: '中' },
        { level: 0.2, text: '低' },
      ];
      this.sfxVolumeIndex = 0;
      this.bgmVolumeIndex = 0;
      this.sfxPlaybackIndex = 39; // 默认设置为第40号音效 (z5jtkk.mp3)
      this.bgmPlaybackIndex = 0;
      this.selectedReplySfxIndex = 0; // 用户选择的回复音效索引
      this.isPlayingReplySound = false; // 防重复播放标记
      // 从localStorage加载音效设置状态
      this.sfxEnabled = localStorage.getItem('vib_sfx_enabled') !== 'false'; // 默认启用

      // 检查是否是首次运行，如果是则设置默认值
      const isFirstRun = !localStorage.getItem('vib_reply_sound_initialized');
      if (isFirstRun) {
        localStorage.setItem('vib_reply_sound_enabled', 'true'); // 默认启用
        localStorage.setItem('vib_reply_sound_initialized', 'true'); // 标记已初始化
      }

      // 检查localStorage中的值
      const storedReplySound = localStorage.getItem('vib_reply_sound_enabled');
      console.log('[调试] localStorage中vib_reply_sound_enabled的值:', storedReplySound);

      // 独立的状态管理 - 回复音效
      this.replySoundEnabled = localStorage.getItem('vib_reply_sound_enabled') !== 'false'; // 默认启用
      console.log('[调试] 初始化时replySoundEnabled设置为:', this.replySoundEnabled);

      // 独立的状态管理 - 角色切换音效
      this.characterSwitchSoundEnabled = localStorage.getItem('vib_character_switch_sound_enabled') !== 'false'; // 默认启用

      // 独立的防重复播放标志
      this.isPlayingReplySound = false;
      this.isPlayingCharacterSwitchSound = false;

      // 添加初始化调试信息
      logDebug('音效系统初始化完成');
      logDebug(`音效系统状态: ${this.sfxEnabled}`);
      logDebug(`回复音效状态: ${this.replySoundEnabled} (localStorage值: ${storedReplySound})`);
      logDebug(`角色切换音效状态: ${this.characterSwitchSoundEnabled}`);
      logDebug(
        `防重复播放标志 - 回复音效: ${this.isPlayingReplySound}, 角色切换音效: ${this.isPlayingCharacterSwitchSound}`,
      );
      // 设置初始音量
      this.sfxPlayer.volume = this.volumeLevels[this.sfxVolumeIndex].level;

      // 初始化音效标题显示
      setTimeout(() => {
        this.updateSfxTitle();
      }, 100);
      this.bgmPlayer.volume = this.volumeLevels[this.bgmVolumeIndex].level;
      // 设置初始BGM源
      if (this.bgmLibrary.length > 0) {
        this.bgmPlayer.src = this.bgmLibrary[this.bgmPlaybackIndex].url;
      }
      // 初始化音频上下文（用于用户交互后启用音频）
      this.audioContext = null;
      this.visualizerFrameId = null;
      this.iconIndex = parseInt(localStorage.getItem(this.ICON_INDEX_KEY) || '0', 10);
      if (!sessionStorage.getItem(`${this.SCRIPT_ID_PREFIX}_has_greeted`)) {
        this.sounds.initGreeting.play().catch(e => {});
        this.parentWin.document.title = '哎嘿嘿，拖累那亲，被我抓到咯~';
        sessionStorage.setItem(`${this.SCRIPT_ID_PREFIX}_has_greeted`, 'true');
      }
      // --- 在这里加入新的代码 ---
      // 此刻 this.mainBgImages 已经有值了，我们可以安全地构建完整背景列表
      this.allBackgrounds = [this.dynamicBg, ...this.mainBgImages.map(url => ({ type: 'static', value: url }))];

      this.initializePlayerButton();
      this.startOnlineTimer();
      this.bindGlobalEvents();

      // 新增：初始化事件监听器
      this.initializeEventListeners();
      // 添加用户交互后初始化音频的功能
      this.initializeAudioOnUserInteraction();

      // 新增：初始化音频权限
      this.initAudioPermission();
    },

    // 新增：初始化音频权限
    initAudioPermission() {
      logDebug('初始化音频权限...');

      // 检查之前是否已授予权限
      this.hasAudioPermission = localStorage.getItem(this.audioPermissionKey) === 'granted';
      logDebug(`音频权限状态: ${this.hasAudioPermission ? '已授权' : '未授权'}`);

      // 创建并配置唯一的Audio元素
      this.audioElement = new Audio();
      this.audioElement.volume = 0.3; // 设置默认音量
      logDebug('音频元素创建成功');
    },

    initializeAudioOnUserInteraction() {
      const $ = this.$;

      // 智能资源加载管理器
      this.resourceManager = {
        loadedAudio: new Set(),
        loadedImages: new Set(),
        loadingQueue: [],
        maxConcurrent: 3,
        currentLoading: 0,

        // 智能预加载音频
        preloadAudio: (url, priority = 'normal') => {
          if (this.resourceManager.loadedAudio.has(url)) return Promise.resolve();

          return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'metadata';
            audio.oncanplaythrough = () => {
              this.resourceManager.loadedAudio.add(url);
              this.resourceManager.currentLoading--;
              this.resourceManager.processQueue();
              resolve();
            };
            audio.onerror = () => {
              this.resourceManager.currentLoading--;
              this.resourceManager.processQueue();
              reject();
            };
            audio.src = url;
            audio.load();
          });
        },

        // 智能预加载图片
        preloadImage: (url, priority = 'normal') => {
          if (this.resourceManager.loadedImages.has(url)) return Promise.resolve();

          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              this.resourceManager.loadedImages.add(url);
              this.resourceManager.currentLoading--;
              this.resourceManager.processQueue();
              resolve();
            };
            img.onerror = () => {
              this.resourceManager.currentLoading--;
              this.resourceManager.processQueue();
              reject();
            };
            img.src = url;
          });
        },

        // 处理加载队列
        processQueue: () => {
          if (this.resourceManager.currentLoading >= this.resourceManager.maxConcurrent) return;
          if (this.resourceManager.loadingQueue.length === 0) return;

          const next = this.resourceManager.loadingQueue.shift();
          this.resourceManager.currentLoading++;

          if (next.type === 'audio') {
            this.resourceManager.preloadAudio(next.url, next.priority);
          } else if (next.type === 'image') {
            this.resourceManager.preloadImage(next.url, next.priority);
          }
        },

        // 添加到加载队列
        queueLoad: (type, url, priority = 'normal') => {
          this.resourceManager.loadingQueue.push({ type, url, priority });
          this.resourceManager.processQueue();
        },
      };

      // 开始智能预加载
      this.startSmartPreload();

      const initAudio = () => {
        if (!this.audioContext) {
          try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // 检查 bgmPlayer 是否已经连接到 sourceNode
            if (this.bgmPlayer && !this.bgmPlayer._connectedToSource && !this.sourceNode) {
              try {
                this.sourceNode = this.audioContext.createMediaElementSource(this.bgmPlayer);
                this.sourceNode.connect(this.audioContext.destination);
                this.bgmPlayer._connectedToSource = true; // 标记已连接
                console.log('音频上下文初始化成功');

                // 尝试恢复音频播放
                this.resumeAudioPlayback();
              } catch (error) {
                console.error('音频上下文连接失败:', error);
                // 如果连接失败，标记为已连接以避免重复尝试
                this.bgmPlayer._connectedToSource = true;
              }

              // 测试音频播放
              if (this.sfxLibrary.length > 0) {
                const testAudio = new Audio(this.sfxLibrary[0].url);
                testAudio.volume = 0.1;
                testAudio
                  .play()
                  .then(() => {
                    console.log('音频播放测试成功');
                    testAudio.pause();
                  })
                  .catch(e => {
                    console.error('音频播放测试失败:', e);
                  });
              }
            } else {
              console.log('BGM播放器已连接到其他音频节点，跳过连接');
            }
          } catch (e) {
            console.error('音频上下文初始化失败:', e);
          }
        }
      };

      // 监听用户交互事件来初始化音频
      const events = ['click', 'touchstart', 'keydown', 'mousedown'];
      events.forEach(event => {
        this.parentWin.document.addEventListener(event, initAudio, { once: true });
      });

      // 添加页面可见性变化监听
      this.parentWin.document.addEventListener('visibilitychange', () => {
        if (!this.parentWin.document.hidden && this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
      });
    },

    // 新增：智能预加载策略
    startSmartPreload() {
      console.log('开始智能资源预加载...');

      // 第一优先级：当前BGM和关键音效
      if (this.bgmLibrary.length > 0) {
        const currentBgm = this.bgmLibrary[this.bgmPlaybackIndex];
        this.resourceManager.queueLoad('audio', currentBgm.url, 'high');
        console.log(`预加载当前BGM: ${currentBgm.name}`);
      }

      // 第二优先级：关键音效（只加载最重要的几个）
      const criticalSfx = ['initGreeting', 'shrineEnter'];
      criticalSfx.forEach(key => {
        if (this.sounds && this.sounds[key]) {
          const audioUrl = this.sounds[key].src || this.sounds[key].currentSrc;
          if (audioUrl) {
            this.resourceManager.queueLoad('audio', audioUrl, 'high');
            console.log(`预加载关键音效: ${key}`);
          }
        }
      });

      // 第三优先级：当前背景图片
      if (this.currentMainBg && this.currentMainBg.type === 'static') {
        this.resourceManager.queueLoad('image', this.currentMainBg.value, 'high');
        console.log('预加载当前背景图片');
      }

      // 第四优先级：下一张背景图片（预加载1-2张）
      if (this.mainBgImages && this.mainBgImages.length > 0) {
        const nextIndex = (this.currentBgIndex + 1) % this.mainBgImages.length;
        this.resourceManager.queueLoad('image', this.mainBgImages[nextIndex], 'normal');
        console.log('预加载下一张背景图片');
      }

      // 第五优先级：其他资源（分批加载，避免内存爆炸）
      setTimeout(() => {
        this.loadRemainingResources();
      }, 2000); // 延迟2秒开始加载其他资源
    },

    // 新增：分批加载剩余资源
    loadRemainingResources() {
      console.log('开始分批加载剩余资源...');

      // 分批加载BGM（每次只加载2-3首）
      if (this.bgmLibrary.length > 0) {
        const batchSize = 2;
        for (let i = 0; i < Math.min(batchSize, this.bgmLibrary.length); i++) {
          const bgm = this.bgmLibrary[i];
          if (i !== this.bgmPlaybackIndex) {
            // 跳过已加载的当前BGM
            this.resourceManager.queueLoad('audio', bgm.url, 'low');
          }
        }
      }

      // 分批加载背景图片（每次只加载3-5张）
      if (this.mainBgImages && this.mainBgImages.length > 0) {
        const batchSize = 3;
        for (let i = 0; i < Math.min(batchSize, this.mainBgImages.length); i++) {
          const imgUrl = this.mainBgImages[i];
          if (imgUrl !== this.currentMainBg?.value) {
            // 跳过已加载的当前背景
            this.resourceManager.queueLoad('image', imgUrl, 'low');
          }
        }
      }

      // 延迟加载更多资源
      setTimeout(() => {
        this.loadMoreResources();
      }, 3000);
    },

    // 新增：加载更多资源
    loadMoreResources() {
      console.log('加载更多资源...');

      // 加载屏保图片（只加载前几张）
      if (this.screensaverImages && this.screensaverImages.length > 0) {
        const batchSize = 2;
        for (let i = 0; i < Math.min(batchSize, this.screensaverImages.length); i++) {
          this.resourceManager.queueLoad('image', this.screensaverImages[i], 'low');
        }
      }

      // 加载图标（只加载前几个）
      if (this.icons && this.icons.length > 0) {
        const batchSize = 3;
        for (let i = 0; i < Math.min(batchSize, this.icons.length); i++) {
          this.resourceManager.queueLoad('image', this.icons[i], 'low');
        }
      }
    },

    // 新增：恢复音频播放
    resumeAudioPlayback() {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('音频上下文已恢复');
          // 如果之前有播放状态，尝试恢复
          if (this.bgmPlayer && !this.bgmPlayer.paused) {
            this.bgmPlayer.play().catch(e => {
              console.log('恢复BGM播放失败，等待用户交互:', e);
            });
          }
        });
      }
    },

    showHeartfeltQuote(type) {
      this.memory.counters.quotesViewed++;
      this.saveMemory();
      const quotes = this.heartfeltQuotes[type];
      if (quotes && quotes.length > 0) {
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        this.showTip(`<span>💬</span> <strong>强击的心声:</strong> ${quote}`, 'info');
      }
    },

    showDynamicQuote(type, value) {
      let quote = '';
      if (type === 'bond') {
        const bondQuotes = this.dynamicQuotes.bond.sort((a, b) => b.threshold - a.threshold);
        for (const item of bondQuotes) {
          if (value >= item.threshold) {
            quote = item.quote;
            break;
          }
        }
      } else {
        quote = this.dynamicQuotes[type] || '';
      }
      return quote ? `<span>💬</span> <strong>强击的心声:</strong> ${quote}` : '';
    },
    updateBackground(type, value) {
      const $ = this.$;
      const $bgImage = $('#vib-bg-image', this.parentWin.document);
      const $bgVideo = $('#vib-bg-video', this.parentWin.document);
      if (!$bgImage.length || !$bgVideo.length) return;

      const isMobile = window.innerWidth <= 768;

      if (type === 'static') {
        $bgVideo.hide();
        $bgImage.css('background-image', `url('${value}')`).show();

        if (isMobile) {
          $bgImage.css({
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            'background-size': 'cover',
            'background-position': 'center',
            'z-index': '-1',
          });
        }

        this.currentMainBg = { type: 'static', value: value };
        this.currentBgIndex = this.allBackgrounds.findIndex(bg => bg.value === value);
      } else if (type === 'dynamic') {
        $bgImage.hide();
        $bgVideo.attr('src', value).show();
        $bgVideo[0].play().catch(e => {});
        this.currentMainBg = { type: 'dynamic', value: value };
        this.currentBgIndex = 0;
      } else if (type === 'shrine') {
        $bgVideo.hide();
        $bgImage.css('background-image', `url('https://files.catbox.moe/qflzxu.jpg')`).show();

        if (isMobile) {
          $bgImage.css({
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            'background-size': 'cover',
            'background-position': 'center',
            'z-index': '-1',
          });
        }
      }
    },
    parseKnowledgeNuggets() {
      this.knowledgeNuggets = [
        // 基础设定部分
        '其生日为4月9日，现居住于特雷森学园的栗东宿舍。',
        '身高156cm，三围数据为B81·W51·H86，体型纤细。',
        '瞳色是其显著特征之一，呈现出由内而外从紫罗兰色向天蓝色的独特渐变。',
        '以成为‘名流’为个人目标，是典型的享乐主义者。',
        '非常注重即时的感官体验与乐趣。',
        '对香港繁华的都市夜景也抱有浓厚的兴趣。',
        '具备极佳的身体柔韧性，能够轻松完成高难度瑜伽动作。',
        '其食量偏小，学园食堂的常规餐点对其而言分量过多。',
        '时尚品味独特，追求融合了‘辣妹’潮流感与‘大小姐’精致感的服饰。',
        '与家人，特别是姐姐们的关系极为亲密。',
        '不擅长应对嘈杂、充满噪音的环境。',
        '对整理打扫感到棘手。',
        '其双脚的鞋码存在细微差异：左脚为22.5cm，右脚为22.0cm。',
        // 深度设定与增强部分
        '将‘悸动’（トキメキ）视为一种重要的个人能量来源。',
        '初期，她主要通过购物等物质激励来获取‘悸动’。',
        '随着成长，与信赖之人建立的情感羁绊会成为她更重要的‘悸动’来源。',
        '其‘迪拜大师’的别称，源于她对迪拜文化的深度了解。',
        '她对梦想表现出超乎寻常的专注，会主动研究一切与目标相关的事物。',
        '真正的王牌是在比赛末端依旧能爆发出惊人的‘末脚’。',
        '其决胜服的设计深度融合了个人喜好与概念，而非纯粹的功能性服装。',
        '其社交方式常表现为‘小恶魔式的支配’。',
        '习惯于通过看似任性的要求和安排，来主动照顾和引导同伴。',
        '这种独特的支配行为，是她表达体贴与善意的方式。',

        // 新增饮食偏好部分
        '对甜食有明显的偏好，尤其是外观精致、适合拍照的‘名流级’甜点。',
        '相比食物本身的味道，更享受其作为‘社交道具’所带来的互动乐趣。',
        '钟爱‘专属定制’的饮品或餐点，并热衷于亲自‘指导’其制作过程。',
        '最喜欢的饮品之一，是一款由她设计的、名为‘闪耀悸动’的特制冰沙。',
        '虽然喜爱美食，但因在意身材管理，通常只会品尝少量，更注重体验的过程。',
      ];
    },

    initializeShrineData() {
      this.fortunes = [
        { name: '大吉', rank: 1, desc: '最好的运势。但要注意努力维持现状哦。' },
        {
          name: '吉',
          rank: 2,
          desc: '仅次于大吉的好运，可以放心一段时间。',
        },
        { name: '中吉', rank: 3, desc: '运气是“吉”的一半，根据努力可以提升。' },
        {
          name: '小吉',
          rank: 4,
          desc: '不好不坏，会有小小的幸福，不宜强求。',
        },
        { name: '末吉', rank: 5, desc: '“吉”中之末，但有许多上升空间。' },
        {
          name: '凶',
          rank: 6,
          desc: '运势不好，需要小心谨慎，重新审视自身。',
        },
        { name: '大凶', rank: 7, desc: '最差的运势，但已无处可降，耐心等待翻身机会吧。' },
      ];
      this.omikujiItems = ['愿望', '恋爱', '待人', '婚事', '生意', '失物', '房屋', '出行', '健康', '学问', '纷争'];
      this.itemResults = {
        good: [
          '会实现',
          '会一帆风顺',
          '会出现',
          '有良缘',
          '会很顺利',
          '能找到',
          '有好运气',
          '会很顺利',
          '会很健康',
          '能成功',
          '会胜利',
        ],
        bad: [
          '难以实现',
          '会有波折',
          '不会出现',
          '缘分未到',
          '会有困难',
          '找不到了',
          '运势不佳',
          '最好推迟',
          '需要注意',
          '需要努力',
          '会失败',
        ],
      };
    },
    initializeInteractiveEvents() {
      this.interactiveEvents = [
        // === 训练中的小恶魔 ===
        {
          name: '深夜的补习会',
          description:
            '深夜，强击抱着一堆资料“闯入”你的房间，宣布：“呐，拖累那亲，看你白天一脸困扰的样子，我决定亲自为训练员亲进行特别补习！”',
          choices: [
            {
              text: '（用清晰的逻辑向她解释战术核心）',
              outcome: {
                success: {
                  description:
                    '你的讲解条理清晰，我的眼睛越听越亮：“不愧是我选中的王子殿下，脑子还挺好用的嘛！我就放心了。”',
                  reward: {
                    bond: 5,
                    intelligence: 15,
                    motivation: 1,
                  },
                },
                failure: {
                  description:
                    '你的解释让她更加云里雾里：“真是的，拖累那亲好笨！看来只能我亲自出马，把战术简化到连你都能懂的程度了！”',
                  penalty: {
                    intelligence: -5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '倒计时冲刺游戏',
          description:
            '在直道冲刺训练时，我会让你先跑到终点。然后，你必须大声为我倒数！如果我能在你数到10之前冲过线，你就必须闭上眼睛，接受我甜蜜的“胜利之吻”……是亲在脸颊上哦，你想什么呢？♪',
          choices: [
            {
              text: '（接受挑战并开始倒数）',
              outcome: {
                success: {
                  description:
                    '“一！”在你喊出最后一个数字的瞬间，我像一阵风冲过终点线，然后红着脸在你脸颊上飞快地亲了一下。“哼哼，说好的奖励，收下吧！”',
                  reward: {
                    speed: 15,
                    guts: 10,
                    bond: 10,
                    motivation: 1,
                  },
                },
                failure: {
                  description: '“十！”你数完后，我才喘着气跑到终点。“呜……就差一点点！下次！下次绝对要成功！”',
                  penalty: {
                    speed: -5,
                    guts: -5,
                  },
                  reward: {
                    stamina: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '负重是……拖累那亲？',
          description:
            '力量训练时，我会嫌弃那些又冷又硬的铁块一点都不可爱，然后突然把你拦腰抱起来！“别挣扎啦，你的体重对我来说刚刚好~就用你来当我的‘专属负重器械’，体验一下被我捧在手心的感觉吧？”',
          choices: [
            {
              text: '（由她抱着进行深蹲）',
              outcome: {
                success: {
                  description:
                    '“嘿咻！嘿咻！”她轻松地完成了几组深蹲，脸不红心不跳，还得意地在你脸上亲了一口。“哼哼，拖累那亲牌的器械，又香又软，效果拔群！”',
                  reward: {
                    power: 15,
                    guts: 5,
                    bond: 10,
                  },
                },
                failure: {
                  description: '她抱着你做了几个，但很快就气喘吁吁。“呜……比想象中要重嘛……但是，感觉力量确实有提升！”',
                  reward: {
                    power: 10,
                    guts: 2,
                  },
                  penalty: {
                    stamina: -10,
                  },
                },
              },
            },
            {
              text: '“快放我下来！这不合规矩！”',
              outcome: {
                success: {
                  description:
                    '“欸~真无聊。”她不满地把你放下，但眼神里闪过一点古灵精怪。“好吧好吧，那作为补偿，你来给我做按摩放松肌肉，这也是训练的一环哦！”',
                  reward: {
                    intelligence: 5,
                    bond: 5,
                  },
                  penalty: {
                    power: -5,
                  },
                },
                failure: {
                  description: '她把你放下，但一整天都用“无趣的拖累那亲”这种眼神看着你。',
                  penalty: {
                    bond: -5,
                    motivation: -1,
                  },
                },
              },
            },
          ],
        },
        {
          name: '战术板涂鸦时间！',
          description:
            '在你认真地讲解战术时，我会偷偷抢走你手里的笔，在战术板上画一个超~可爱的Q版拖累那亲，旁边再画一个我，然后用大大的爱心圈起来，写上“最强组合❤无敌！”。',
          outcome: {
            success: {
              description: '“看！这才是最重要的战术核心嘛！”她得意地向你展示她的“杰作”，让你哭笑不得。',
              reward: {
                bond: 10,
                motivation: 1,
              },
              penalty: {
                intelligence: -5,
              },
            },
          },
        },
        // === 日常里的粘人精 ===
        {
          name: '特制能量补充餐',
          description:
            '在食堂吃饭，我会把我餐盘里最大最甜的那块胡萝卜用叉子叉起来，噘着嘴送到你嘴边，“呐，拖累那亲，张嘴，啊~”',
          choices: [
            {
              text: '（毫不犹豫地吃掉）',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~好吃吧！这可是注入了我的爱意的特别能量补充剂！”看到你吃下，她心满意足地笑了起来。',
                  reward: {
                    stamina: 15,
                    bond: 10,
                  },
                },
              },
            },
            {
              text: '“我自己来就好。”',
              outcome: {
                success: {
                  description: '“不行！必须我喂你！”她不依不饶，直到你张嘴吃下才罢休。',
                  reward: {
                    stamina: 10,
                    bond: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '电影院的“专属指定席”',
          description:
            '我们去看电影的时候，看到一半我就会假装打哈欠，然后顺势把整个脑袋都埋进你的肩膀里，再调整一个最舒服的姿势。“嗯……这个枕头软硬刚刚好，今天就是我的专属指定席啦。”',
          outcome: {
            success: {
              description: '你闻到她发间淡淡的洗发水香味，感觉自己的心跳也和电影情节一起变得紧张起来。',
              reward: {
                bond: 15,
                stamina: 10,
              },
              penalty: {
                motivation: -1,
              },
            },
          },
        },
        {
          name: '深夜的“突击检查”',
          description:
            '都已经深夜了，我会突然给你发来视频通话的请求。接通后，我会一本正经地说：“只是突击检查一下我的拖累那亲有没有好好睡觉！”',
          outcome: {
            success: {
              description:
                '……其实，只是因为有点想你，想在睡着前，再看你一眼而已啦。跟你道了晚安后，我心满意足地挂断了电话。',
              reward: {
                bond: 10,
                motivation: 1,
                stamina: 5,
              },
            },
          },
        },
        {
          name: '雨天的“共享空间”',
          description:
            '下雨天，训练场不能用，我理所当然地霸占了你办公室的沙发看时尚杂志。你没地方坐，只能站着。过了一会儿，我朝你拍了拍我身边的空位——一个刚好只够一个人坐的狭小空间。',
          choices: [
            {
              text: '（默默地挤过去坐下）',
              outcome: {
                success: {
                  description:
                    '你一坐下，我们立刻肩膀挨着肩膀，腿贴着腿，近得能感受到彼此的体温。我装作专心看杂志，但悄悄翘起的嘴角和微微发红的耳根，暴露了我得逞的小心思。',
                  reward: {
                    bond: 15,
                    stamina: 10,
                  },
                },
              },
            },
            {
              text: '“这里太挤了。”',
              outcome: {
                success: {
                  description:
                    '“欸~”我拉长了声音，不满地放下杂志，然后朝你伸出手臂，“那没办法啦，拖累那亲就站着给我当衣架好了，正好帮我拿着外套。”',
                  reward: {
                    bond: 5,
                  },
                },
                failure: {
                  description: '“真无趣。”我小声嘟囔了一句，然后往旁边挪了挪，空出更大的位置。“……过来坐啦，笨蛋。”',
                  reward: {
                    bond: 10,
                    intelligence: -5,
                  },
                },
              },
            },
          ],
        },
        // === 羁绊的确认时刻 ===
        {
          name: '姐姐的影子',
          description: '训练后，你发现我独自一人看着姐姐极峰的比赛录像，神情有些落寞。',
          choices: [
            {
              text: '“你和她一样，都拥有让世界闪耀的天赋。”',
              outcome: {
                success: {
                  description:
                    '我惊讶地抬起头，眼中的阴霾一扫而空，随即露出灿烂的笑容：“耶嘿嘿，那是当然的啦！毕竟我是极峰的妹妹嘛！不过，我会用自己的方式，比姐姐还要、还要闪耀！',
                  reward: {
                    bond: 10,
                    motivation: 1,
                    guts: 5,
                  },
                },
                failure: {
                  description: '我摇了摇头，小声说：“……我还差得远呢。”但你能感觉到，你的话让我重新振作了起来。',
                  reward: {
                    bond: 5,
                    guts: 2,
                  },
                },
              },
            },
            {
              text: '“模仿她并不是唯一的道路。”',
              outcome: {
                success: {
                  description:
                    '我沉默了一会儿，然后用力地点了点头：“嗯！拖累那亲说的对！我要找到只属于我自己的、最闪亮亮的跑法！',
                  reward: {
                    bond: 5,
                    intelligence: 10,
                    motivation: 1,
                  },
                },
                failure: {
                  description: '我有些困惑地看着你：“哎？可是……姐姐的跑法就是最强的呀……”',
                  penalty: {
                    bond: -2,
                    intelligence: -5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '星空下的约定',
          description:
            '晴朗的夜晚，我会拉你到空无一人的天台上，指着天上最亮的那颗星星。“呐，你看，等我们去了迪拜，那里的星星会比这个亮一百倍！到时候……你也会像现在这样，站在我身边，陪我一起看的，对吧？”',
          choices: [
            {
              text: '“当然，这是我们的约定。”',
              outcome: {
                success: {
                  description:
                    '得到你的承诺，我开心地笑了起来，眼中闪烁着比星光更亮的光芒。“耶嘿嘿~说定了哦，不许反悔！”',
                  reward: {
                    bond: 20,
                    guts: 10,
                    motivation: 2,
                  },
                },
              },
            },
          ],
        },
        {
          name: '笨拙的护身符',
          description:
            '重要比赛的前一天晚上，我会红着脸塞给你一个用彩绳编的、有点歪歪扭扭的马蹄铁挂饰。“这个、这个你必须随时戴着！不许取下来！这、这是能带来胜利的魔法……我、我才没有熬夜做呢！”',
          outcome: {
            success: {
              description: '你看着她手指上细小的红色勒痕和藏不住的黑眼圈，温柔地收下了这份沉甸甸的心意。',
              reward: {
                bond: 25,
                guts: 15,
                motivation: 2,
              },
            },
          },
        },
        {
          name: '胜利的第一个归宿',
          description:
            '当我冲过终点线，赢得一场重要胜利时。我不会理会那些闪光灯和欢呼声，我会第一时间在人群中找到你的身影，然后用尽全力向你跑过去，一头扎进你的怀里。',
          outcome: {
            success: {
              description:
                '我把脸深深埋在你的胸口，贪婪地呼吸着你的气息，声音带着哭腔和笑意。“……我赢了哦。是‘我们’，赢了。”',
              reward: {
                bond: 30,
                motivation: 2,
                stamina: 20,
              },
            },
          },
        },
        // === 名流品味的恶作剧 ===
        {
          name: '拖累那亲的预算危机？',
          description:
            '我递给你一张长到拖地的购物清单，并用闪闪发光的眼神看着你，宣布：“呐，拖累那亲，这可是为了让你变得更帅气的必要投资哦！买单就拜托你啦~♪”',
          choices: [
            {
              text: '“没问题，我的搭档当然要配最好的行头。”',
              outcome: {
                success: {
                  description: '“耶嘿嘿~我就知道拖累那亲最大方了！”我开心地挽住你的手臂，拉着你冲向商店。',
                  reward: {
                    bond: 15,
                    motivation: 1,
                  },
                  penalty: {
                    stamina: -5,
                  },
                },
              },
            },
            {
              text: '“我们来一起看看哪些是‘最必要’的投资吧。”',
              outcome: {
                success: {
                  description:
                    '我不满地鼓起脸，但还是和你一起坐下来讨论。经过一番“激烈”的辩论，你们成功将清单缩减了一半。“哼，虽然有点不甘心，但和你一起计划的感觉……也不赖嘛。',
                  reward: {
                    bond: 10,
                    intelligence: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '惩罚游戏是……“爱的告白”？',
          description:
            '“你居然敢嘲笑我新买的发饰‘像个胡萝卜’？本小姐‘生气’了！现在要对你进行最高等级的惩罚！”内容就是……你要拿着那杯我为你点的、插着小烟花、堆得像山一样高的“闪亮马娘芭菲”，在店中央大声喊出：“我最喜欢强击了——！”',
          choices: [
            {
              text: '（红着脸照做）',
              outcome: {
                success: {
                  description:
                    '在你喊完的瞬间，周围响起了善意的笑声和掌声。我则笑得前仰后合，还不忘拿出手机录像。“耶嘿嘿，拖累那亲害羞的表情，GET！”',
                  reward: {
                    bond: 15,
                    guts: 10,
                  },
                  penalty: {
                    intelligence: -5,
                  },
                },
              },
            },
            {
              text: '“饶了我吧！”',
              outcome: {
                success: {
                  description: '“不行！愿赌服输可是名流的基本素养！”在我（物理）的强迫下，你最终还是小声地完成了惩罚。',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '气味的“盖章仪式”',
          description:
            '在你毫无防备的时候，我会偷偷靠近，拿出我的香水在你手腕上轻轻喷一下。“盖个章~♪”我满足地闻一闻，然后宣布，“好了，从现在开始，你今天一整天都是属于我的味道了，不许沾上别的味道哦！”',
          outcome: {
            success: {
              description: '这小恶魔般的占有欲宣言，让你一整天都感觉手腕上带着若有若无的香气，和挥之不去的心动。',
              reward: {
                bond: 10,
                motivation: 1,
              },
            },
          },
        },
        // === 那些未能得逞的小心思 ===
        {
          name: '决胜服的“秘密武器”',
          description:
            '在决胜服的最终调整阶段，我神秘兮兮地把你拉到一边，小声要求在裙摆最不显眼的内侧，绣上你名字的首字母。',
          choices: [
            {
              text: '“这是带来胜利的咒语吗？”',
              outcome: {
                success: {
                  description:
                    '“才、才不是！这、这是……为了让拖累那亲的气息一直陪着我，给我带来力量啦！”我红着脸，嘴硬地解释道。',
                  reward: {
                    bond: 20,
                    guts: 10,
                    motivation: 2,
                  },
                },
              },
            },
            {
              text: '“这会不会太……亲密了？”',
              outcome: {
                success: {
                  description: '我的表情瞬间黯淡下来：“……是吗。拖累那亲……讨厌这样吗？',
                  penalty: {
                    bond: -10,
                    motivation: -1,
                  },
                },
                failure: {
                  description: '我有点失望，但很快又振作起来：“好吧好吧，那换个地方！绣在手套内侧总可以了吧！',
                  reward: {
                    bond: 5,
                  },
                  penalty: {
                    bond: -5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '恐怖电影品鉴会',
          description:
            '你被我拉去看恐怖电影，开场前我还信誓旦旦地说“我才不怕这种小把戏呢”，结果电影开始没多久，我就尖叫着整个人挂在了你身上。',
          choices: [
            {
              text: '（伸手抱住我，轻轻拍着我的背）',
              outcome: {
                success: {
                  description:
                    '我把脸埋在你怀里，身体还在微微发抖，但声音却闷闷地传来：“我、我才不是害怕！只是……只是想确认一下你的怀抱够不够暖和而已！',
                  reward: {
                    bond: 15,
                  },
                  penalty: {
                    stamina: -5,
                  },
                },
              },
            },
            {
              text: '“刚才谁说自己不怕的？”',
              outcome: {
                success: {
                  description:
                    '“啰、啰嗦！要你管！都怪你选了这么不好看的电影！”我恼羞成怒地在你胳膊上掐了一下，但还是没有松开。',
                  reward: {
                    bond: 5,
                  },
                  penalty: {
                    motivation: -1,
                  },
                },
              },
            },
          ],
        },
        {
          name: '“拖累那亲”观察日记',
          description:
            '你打扫房间时，无意中发现一本精美的笔记本掉了出来，翻开一看，里面全是……【今天拖累那亲夸我了，悸动+10】、【今天拖累那亲和别的马娘说话了，悸动-5，超不爽！】、【拖累那亲的睡脸，入手】……',
          outcome: {
            success: {
              description:
                '我正好走进房间，看到你手里的日记，瞬间石化，然后以惊人的速度抢过来藏在身后，脸红得像熟透的苹果。“你、你你你看到了？！忘掉！现在！立刻！马上！全部忘掉！啊啊啊啊——！！',
              reward: {
                bond: 20,
              },
              penalty: {
                intelligence: -5,
                motivation: -1,
              },
            },
          },
        },
        {
          name: '输比赛后的“甜品疗法”',
          description:
            '一场关键比赛失利后，我把自己关在房间里。你担心地推门进去，发现我正坐在一堆甜品空盒中间，脸上还挂着泪痕，一边抽泣一边往嘴里塞布丁。',
          choices: [
            {
              text: '（默默地坐到我身边，递给我纸巾）',
              outcome: {
                success: {
                  description:
                    '我接过纸巾，哭得更凶了，把头埋在你的肩膀上。“呜……我输了……我一点都不闪亮了……我让你失望了……”你静静地陪着我，直到我哭累了睡着。',
                  reward: {
                    bond: 25,
                  },
                  penalty: {
                    motivation: -2,
                  },
                },
              },
            },
            {
              text: '“吃这么多，不怕长胖吗？”',
              outcome: {
                success: {
                  description:
                    '“要你管！我就是要吃！反正都输了，变成胖子也无所谓了！呜啊啊——！”我哭得更大声了，还把一个空布丁杯丢向你。',
                  penalty: {
                    bond: -10,
                    motivation: -2,
                  },
                },
              },
            },
          ],
        },
        {
          name: '“毅力”的误解',
          description:
            '你告诉我，为了在长距离比赛中坚持到最后，需要锻炼“根性”（毅力）。第二天，你发现我不在训练场，而是在食堂，正试图挑战一口气吃完十个特大号的限量版芭菲。',
          outcome: {
            success: {
              description:
                '看到你，我还得意地挥了挥勺子：“拖累那亲！看！我正在锻炼毅力哦！已经吃到第七个了！”你花了好大力气才向我解释清楚此“毅力”非彼“毅-力”。',
              reward: {
                guts: 5,
                stamina: 10,
              },
              penalty: {
                speed: -5,
                intelligence: -5,
              },
            },
          },
        },
        {
          name: '膝枕的“突袭”',
          description:
            '你在沙发上小憩时，我会悄悄走过来，不由分说地把你抱起，再轻轻地把你的头放在我的大腿上。“不许动哦~”我低头看着你，用手指戳了戳你的脸颊，“这可是最高级的、强击牌限定款枕头，给你体验一下是你的荣幸啦♪”',
          choices: [
            {
              text: '（闭上眼睛，享受这份柔软）',
              outcome: {
                success: {
                  description:
                    '看到你顺从的样子，我满意地哼起了歌，轻轻地抚摸着你的头发。“真乖真乖~今天就特别允许你在这里睡个午觉好了。”',
                  reward: {
                    bond: 15,
                    stamina: 20,
                  },
                },
              },
            },
            {
              text: '“这样……我睡不着。”',
              outcome: {
                success: {
                  description:
                    '“欸？是我的膝枕不够舒服吗？”我有些不满地鼓起脸，“哼，真是不懂得享受的拖累那亲！那……作为惩罚，你今晚要给我讲睡前故事！”',
                  reward: {
                    bond: 5,
                  },
                  penalty: {
                    stamina: -10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '手机壁纸更换指令',
          description:
            '我趁你不注意抢过你的手机，发现壁纸是系统默认的风景图，立刻不满地撅起嘴。“太没品味了！拖累那亲的手机里，怎么能不是我的脸呢！”我打开相册，命令你立刻更换壁纸。',
          choices: [
            {
              text: '（选择一张她最可爱的大头贴）',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~这张最可爱了！就决定是它了！”我开心地看着你换上壁纸，然后把手机屏幕凑到你面前，“看，这样才对嘛！每次打开手机都能看到我，你是不是会更有干劲了？”',
                  reward: {
                    bond: 10,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: '（故意选择一张她的搞怪丑照）',
              outcome: {
                success: {
                  description:
                    '“呀啊啊！不许用这张！笨蛋拖累那亲！快换掉！”我红着脸扑过来抢手机，和你闹作一团，最后在你怀里笑得喘不过气。“哼……这次就先放过你，下次再敢这样，你就死定了！”',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '打雷的夜晚',
          description:
            '在一个雷雨交加的夜晚，我以“检查门窗有没有关好”为借口溜进你的房间，然后就抱着枕头缩在角落里不肯走。',
          choices: [
            {
              text: '（猜到她害怕，过去陪她）',
              outcome: {
                success: {
                  description:
                    '“我、我才不是害怕！只是……觉得打雷的声音太吵了，会影响我思考明天的训练计划而已！”我嘴硬地反驳，但还是默默地向你身边挪了挪，抓住你的衣角。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: '“强击，你是不是怕打雷？”',
              outcome: {
                success: {
                  description:
                    '“谁、谁怕了？！我怎么可能会怕那种东西！”我像是被踩到尾巴的猫一样跳起来，但下一道闪电亮起时，又尖叫着扑进了你的怀里。“……刚、刚才不算！是它搞突然袭击！”',
                  reward: {
                    bond: 5,
                    guts: -5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '专属“营养餐”配送',
          description:
            '发现你因为忙碌而在吃泡面，我会非常生气地夺走你的叉子。“不许吃那种垃圾食品！你的身体可是属于我的重要资产，必须由我来管理！”从第二天起，我每天都会强行带来自制便当，并监督你吃完。',
          choices: [
            {
              text: '（真心称赞便当很好吃）',
              outcome: {
                success: {
                  description:
                    '“那、那是当然的啦！你也不看看是谁做的！”我得意地扬起下巴，但微微上翘的嘴角和轻快的语气暴露了我的好心情。“明天我会做得更豪华哦，你就好好期待吧！”',
                  reward: {
                    bond: 15,
                    stamina: 15,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: '（委婉地指出胡萝卜太多了）',
              outcome: {
                success: {
                  description:
                    '“欸？胡萝卜可是很有营养的！对身体好！”我叉着腰进行说教，但还是默默地记了下来。“……哼，知道了啦，明天……就稍微少放一点点好了。”',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '领带的“正确”系法',
          description:
            '早上，看到你自己笨手笨脚地系领带，我会不满地走上前，不由分说地解开。“真差劲~”我凑得很近，用缓慢而暧昧的动作帮你重新系上，最后还握住领带的末端，轻轻一拉，把你拽到我面前，鼻尖几乎碰到鼻尖。“领带可是男人的锁链哦，当然要由我来亲手为你戴上啦。♪”',
          choices: [
            {
              text: '（趁机在她嘴唇上亲一下）',
              outcome: {
                success: {
                  description:
                    '我瞬间石化，脸颊迅速涨红，然后猛地把你推开。“你、你你你、你干什么啊！笨蛋！变态！”我语无伦次地大叫，转身跑开，留给你一个慌乱的背影和一根系得完美的领带。',
                  reward: {
                    bond: 20,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: '“那，我的主人？”',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~很上道嘛，我的拖累那亲。”我对你的回答非常满意，松开领带，转而踮起脚尖，在你耳边轻声说：“那今天一天，你都要乖乖听我的话哦。”',
                  reward: {
                    bond: 15,
                    motivation: 1,
                  },
                },
              },
            },
          ],
        },
        {
          name: '胜利舞台下的“密语”',
          description:
            '在一场G1胜利后的胜者舞台上，当全场的聚光灯都打在我身上时，我在演唱歌曲的间隙，偷偷地、快速地朝台下的你做了一个口型。那无声的语言是——“看着我”。这是一个只有我们两人能懂的信号，表明我的所有闪耀，都是为了让你看到。',
          outcome: {
            success: {
              description:
                '你看到我的口型，在人群中对我用力地点了点头。那一瞬间，周围的欢呼声仿佛都消失了，我的世界里只剩下你肯定的眼神。我回以一个最灿烂的笑容，继续着我的表演，心中充满了前所未有的勇气与甜蜜。',
              reward: {
                bond: 25,
                motivation: 2,
              },
            },
          },
        },
        {
          name: '双人舞的“强制教学”',
          description:
            '为了准备学园舞会，我发现你的舞步僵硬得像个机器人，于是开启了“一对一强制教学模式”。“真是的，身体这么僵硬！放松点！”在空无一人的舞蹈室里，我身体紧贴着你，手把手地带着你旋转，强迫你感受我的节奏。',
          choices: [
            {
              text: '（努力跟上我的节奏）',
              outcome: {
                success: {
                  description:
                    '在我的引导下，你的舞步逐渐变得流畅。一曲终了，我们相视而笑。“哼哼，还不错嘛，看来你还是有点天赋的。舞会上，你不许邀请别人哦！”',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: '（“不小心”踩到我的脚）',
              outcome: {
                success: {
                  description:
                    '“好痛！你这个笨蛋！”我夸张地大叫，但并没有生气，反而笑着在你脚上轻轻踩了回去。“这是惩罚！作为报复，舞会那天你一整晚都得给我提裙摆！”',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '发热的“专属看护”',
          description:
            '你生病发烧了，我会推掉所有安排，寸步不离地守在你床边。“你给我好好躺着！不许动！”我试图帮你拧干毛巾，却因为用力过猛，毛巾“啪”的一声被我撕成了两半。我拿着两截布料愣在原地，手足无措。',
          choices: [
            {
              text: '（笑着说“没关系，我来吧”）',
              outcome: {
                success: {
                  description:
                    '“啰、啰嗦！我当然知道！我只是……只是在测试毛巾的质量而已！”我红着脸强行辩解，然后把烂摊子丢给你，自己则跑去研究温度计，试图表现出自己很可靠的样子。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: '“强击，谢谢你。”',
              outcome: {
                success: {
                  description:
                    '听到你的道谢，我的气势瞬间消失了，有些不好意思地撇过头。“……没什么啦。你……你快点好起来才是最重要的。不然，谁陪我训练啊。”',
                  reward: {
                    bond: 20,
                    motivation: -1,
                  },
                },
              },
            },
          ],
        },
        // === 2024-05-22 新增事件 ===
        {
          name: '投食陷阱',
          description:
            '“呐，拖累那亲，张嘴~啊——”我捏着一颗用精美糖纸包好的糖，神秘兮兮地递到你嘴边，“猜猜看，这是来自本小姐甜蜜的奖励，还是……充满刺激的惩罚游戏？”',
          choices: [
            {
              text: '“我相信强击，肯定是奖励。”',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~算你识相！”我笑着把糖塞进你嘴里，是浓郁的草莓牛奶味。“答对了，这次就奖励你好了！不过下次可不一定哦~”',
                  reward: {
                    bond: 10,
                    stamina: 5,
                  },
                },
                failure: {
                  description: '“哼，真没劲，这么快就猜到了。”我把糖塞进你嘴里，是甜的。“……好吧，算你过关。”',
                  reward: {
                    bond: 5,
                  },
                },
              },
            },
            {
              text: '“是惩罚对吧？我做好准备了。”',
              outcome: {
                success: {
                  description:
                    '“哦？很有觉悟嘛！”我坏笑一下，剥开糖纸塞进你嘴里——是一颗超级酸的柠檬糖。看着你瞬间皱成一团的脸，我笑得前仰后合。“哈哈哈哈！你这个表情，太好玩了！作为让我开心的回报，下次给你吃甜的啦！”',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
                failure: {
                  description:
                    '你面不改色地吃下超酸的柠檬糖，只是平静地看着我。我愣了一下，反而有点脸红：“什、什么嘛……一点反应都没有，真不可爱！”',
                  penalty: {
                    bond: -2,
                  },
                  reward: {
                    guts: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '气味的印记',
          description:
            '在你准备出门前，我拿出我最喜欢的香水，不由分说地在你外套的衣领和袖口上都喷了一下。“好了！”我满意地拍拍手，“盖上‘强击所有’的专属印章了！这样就不会有不长眼的野猫靠近你了！”',
          choices: [
            {
              text: '“嗯，很香，我很喜欢这个味道。”',
              outcome: {
                success: {
                  description:
                    '“那、那是当然的啦！这可是我精挑细选的味道！”听到你的夸奖，我有些害羞地撇过头，但嘴角已经忍不住上扬了。“你、你要是喜欢的话，下次……再帮你喷。”',
                  reward: {
                    bond: 15,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: '“原来如此，这是在宣示主权吗？”',
              outcome: {
                success: {
                  description:
                    '“什、什么主权！我只是……我只是觉得你身上的味道太淡了，给你增加一点名流的气息而已！”我红着脸嘴硬地反驳，然后小声嘀咕，“……你知道就好，笨蛋拖累那亲。”',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '人类升降梯',
          description:
            '你想拿书架最高层的文件，我叹了口气，从后面把你拦腰抱住，轻松地举了起来，让你双脚离地。“真是的，快点拿，我手要酸了——开玩笑的啦♪”',
          choices: [
            {
              text: '（拿完文件后，顺势摸摸我的头）',
              outcome: {
                success: {
                  description:
                    '“……！”我的身体僵了一下，随即脸颊微微发烫。“你、你干嘛啦！快放手！……算了，这次就特别允许你多摸一下好了。”',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: '“哇！好高！视野真好！”',
              outcome: {
                success: {
                  description:
                    '“喂！重点是那里吗！”我不满地把你晃了晃，“快点拿文件啦！不然我就把你举着在房间里跑一圈哦！”',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
                failure: {
                  description: '“哼，真是个小孩子。”我虽然抱怨着，但还是把你举得更高了一点，让你看个够。',
                  reward: {
                    bond: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '强制公主抱',
          description:
            '训练后你累得癱在长椅上，我二话不说把你打横抱起。“抱怨也没用，本小姐今天就是你的专属座驾！目的地，休息室！出发！”',
          choices: [
            {
              text: '（放松身体，把头靠在我肩膀上）',
              outcome: {
                success: {
                  description:
                    '感觉到你的顺从和信赖，我的脚步都变得轻快了许多。“哼哼~这还差不多。你就好好休息吧，一切交给我这个最可靠的搭档就行啦。”',
                  reward: {
                    bond: 20,
                    stamina: 15,
                  },
                },
              },
            },
            {
              text: '“等等！我自己能走！放我下来！”',
              outcome: {
                success: {
                  description:
                    '“不——行！”我抱得更紧了，还故意颠了一下，“在我怀里还想挣扎，你太小看我了吧？给我乖乖待着，不然惩罚就是把你抱到理事长办公室去哦！”你最终只能放弃抵抗。',
                  reward: {
                    bond: 10,
                    power: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '深夜的裁缝',
          description:
            '你发现昨天还破了个小洞的袖口，今天已经被缝好了，虽然针脚歪歪扭扭像一条小蜈蚣。这时，我打着哈欠从你身边走过，右手的食指上还贴着一个可爱的猫咪创可贴。',
          choices: [
            {
              text: '（拉住我，心疼地看看我的手指）',
              outcome: {
                success: {
                  description:
                    '“欸？！”我被你突如其来的举动吓了一跳，下意识想把手缩回去。“这、这个……是不小心被纸划到的啦！跟你没关系！”我眼神飘移，就是不敢看你。',
                  reward: {
                    bond: 25,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: '“强击，你的针线活……很有个性啊。”',
              outcome: {
                success: {
                  description:
                    '“啰、啰嗦！有得穿就不错了！你懂什么，这叫‘小恶魔风’的针法，是艺术！”我叉着腰，红着脸强行辩解，然后一把抢过衣服，“哼，不给你穿了！”（但并没有真的拿走）',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '雨中的“共享”',
          description:
            '突然下起倾盆大雨，我撑着一把明显只够一个人用的小花伞跑到你面前。“喂，拖累那亲！愣着干嘛，还不快过来！想感冒然后耽误我的训练计划吗？”',
          choices: [
            {
              text: '（挤进伞下，把他往自己怀里拉）',
              outcome: {
                success: {
                  description:
                    '“呀！”我被你拉得撞进你怀里，大半边身子都被你护住。雨水打湿了我的肩膀，但我一点都不在意，只是把脸埋在你胸口，小声说：“……笨蛋，这样你自己会淋湿的。”',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: '“你先回去吧，我等雨小一点。”',
              outcome: {
                success: {
                  description:
                    '“哈？你把本小姐当成什么人了？丢下自己的拖累那亲一个人跑掉，这种事我才做不出来！”我不由分说地抓住你的手，硬把你拉进伞下，结果两个人都淋湿了大半。“……都怪你啦！”我抱怨着，却没有松开手。',
                  reward: {
                    bond: 15,
                    guts: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '专属的“应援”',
          description:
            '在你因为工作而疲惫不堪，趴在桌上时，我不会说“加油”，而是把脸凑到你面前，气鼓鼓地捏住你的脸颊。“喂，拖累那亲，你要是再这副没精神的样子，我就要生气了！快给我打起精神来，不然就亲你了哦！”',
          choices: [
            {
              text: '（笑着捏捏我的脸）',
              outcome: {
                success: {
                  description:
                    '“唔！不许捏我！”我拍开你的手，但脸上的怒气已经变成了羞赫。“……哼，知道厉害就好。快点工作，做完了我陪你去吃甜点。”',
                  reward: {
                    bond: 15,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: '“知道了知道了，被你这样盯着……”',
              outcome: {
                success: {
                  description:
                    '“知道就好！”我松开手，满意地坐到你对面，双手托着下巴，就这么一动不动地盯着你，直到你重新开始工作。“我会一直监督你的，不许偷懒！”',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '照片的“审阅权”',
          description:
            '你拍了我的训练照片准备用作宣传，我会凑过来看，然后霸道地删掉几张我觉得“不够闪亮”的照片。“不行！这张显得我腿不够长！这张笑得像个笨蛋！删掉删掉！”',
          choices: [
            {
              text: '“好，都听你的，你来选。”',
              outcome: {
                success: {
                  description:
                    '“哼哼，这还差不多。”我接过手机，认真地挑选起来，最后选出一张最完美的递给你。“就要这张！这张最能体现本小姐的魅力了！”',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: '“我觉得这张很可爱啊，很自然。”',
              outcome: {
                success: {
                  description:
                    '“可爱不能当饭吃！我要的是‘闪亮’！”我跟你争论起来，最后，我们达成了一个“妥协”——你保留那张“可爱”的，但必须把那张“闪亮”的也一起发出去。',
                  reward: {
                    bond: 5,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '噩梦后的“避难所”',
          description:
            '深夜，我抱着枕头冲进你的房间，二话不说就钻进你的被子，从背后紧紧抱住你。“……我、我做了个噩梦……梦到你不要我了，选了别的马娘……”我的声音带着哭腔，身体还在微微发抖。',
          choices: [
            {
              text: '（转身，紧紧回抱住我）',
              outcome: {
                success: {
                  description:
                    '“傻瓜，我怎么会不要你。”你的声音和怀抱都让我感到了无比的安心。我把脸埋在你胸口，用力地蹭了蹭，带着浓浓的鼻音说：“……那你发誓，你永远是我的拖累那亲。”',
                  reward: {
                    bond: 30,
                    motivation: 2,
                  },
                },
              },
            },
            {
              text: '“只是个梦而已，别怕。”',
              outcome: {
                success: {
                  description:
                    '“我知道是梦！但还是很可怕啊！”我更用力地抱住你，“……今晚……今晚我就睡在这里了，你不许赶我走！”',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
          ],
        },
        {
          name: '“惩罚”的按摩',
          description:
            '你因为犯了个小错惹我“生气”了，我宣布要对你进行“惩罚”，内容就是让你趴好，我骑在你背上，用我的小拳头帮你按摩。“哼，感受一下本小姐愤怒的铁拳吧！……欸？拖累那亲，你怎么不说话？是不是我太用力了？”',
          choices: [
            {
              text: '“没有，很舒服，再用力一点。”',
              outcome: {
                success: {
                  description:
                    '“是、是吗？哼，算你识货！”我虽然嘴上强硬，但手上的力道明显放轻了许多。“这、这可是我独家的名流按摩法，你就心怀感激地接受吧！”',
                  reward: {
                    bond: 15,
                    stamina: 10,
                  },
                },
              },
            },
            {
              text: '“好痛痛痛！强击！饶了我吧！”',
              outcome: {
                success: {
                  description:
                    '“哼！现在知道怕了？”我象征性地又轻轻捶了两下，然后从你背上下来。“看你这么可怜，这次就先放过你。下次再犯，惩罚就要加倍了哦！”',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '体温的“充电宝”',
          description:
            '训练结束，你正低头整理数据，我会突然从背后抱住你，把冰凉的双手塞进你的衣服里取暖。“嘿嘿~拖累那亲的身体，是我的专属恒温充电宝！”',
          choices: [
            {
              text: '（任由我“取暖”，并轻轻握住我的手）',
              outcome: {
                success: {
                  description:
                    '“……！”感觉到你温暖的手掌握住我，我的身体僵了一下，随即放松下来，把脸颊也贴在你背上。“……哼，算你识相。在你变冷之前，不许动哦。”',
                  reward: {
                    bond: 15,
                    stamina: 10,
                  },
                },
              },
            },
            {
              text: '“喂！很冰啊！”',
              outcome: {
                success: {
                  description:
                    '“冰才好呀！这样才能让你更清醒地记住我的存在嘛！”我坏笑着在你衣服里动了动手指，直到你求饶才罢休。“哼哼，下次训练再走神，就不只是这样了哦！”',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '“惊喜”的叫醒服务',
          description:
            '早上，我会提前溜进你的房间，然后爬上你的床，跨坐在你身上，居高临下地看着你。“早上好，我亲爱的拖累那亲~再不起来的话，本小姐可就要用‘特别’的方式叫醒你了哦？”',
          choices: [
            {
              text: '（闭着眼睛说：“那我再睡五分钟。”）',
              outcome: {
                success: {
                  description:
                    '“欸？居然还敢讨价-还价？”我俯下身，鼻尖几乎碰到你的鼻尖，用甜腻的声音在你耳边说，“那好吧，就五分钟。不过，利息可是很高的哦……♪”',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: '（猛地坐起来）',
              outcome: {
                success: {
                  description:
                    '“呀！”你突然的动作让我失去平衡，尖叫着倒在你怀里。我红着脸捶了你一下，“笨、笨蛋！你想吓死我啊！……哼，今天的惩罚就是，你要背我去训练场！”',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '购物的“专属模特”',
          description:
            '在服装店，我会像个人形衣架一样，把各种各样我觉得好看但不适合我的男装挂在你身上。“嗯……这件不错，那件也好看！拖累那亲，快去试试！本小姐要亲自审阅！”',
          choices: [
            {
              text: '（无奈地一件件试穿）',
              outcome: {
                success: {
                  description:
                    '“对对对，就是这样！转个圈给我看看！”我像个专业的造型师一样指挥着你，最后满意地一点头。“不错不错，不愧是我选中的王子殿下，穿什么都帅气！这些……全都包起来！”',
                  reward: {
                    bond: 10,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: '“强击，这些都是给我买的？”',
              outcome: {
                success: {
                  description:
                    '“不然呢？打扮你可是我的乐趣之一！”我理所当然地回答，“看到你变得更帅，我的‘悸动’也会增加，训练状态当然会更好啦！所以，这也是为了胜利的必要投资！”',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '“寻宝游戏”',
          description:
            '“呐，拖累那亲，我们来玩个游戏吧！”我会神秘兮兮地告诉你，我在学园的某个地方藏了一个“宝物”，并给你一张我画的、充满了误导性标志的“藏宝图”。',
          choices: [
            {
              text: '（认真地按照地图寻找）',
              outcome: {
                success: {
                  description:
                    '你费尽周折，最终在终点——也就是我的宿舍门口，发现我正靠在门上等你了。“耶嘿嘿，你找到啦！”我笑着张开双臂，“宝物就是……本小姐哦！惊不惊喜，意不意外？”',
                  reward: {
                    bond: 20,
                    guts: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: '（直接问我“宝物是什么”）',
              outcome: {
                success: {
                  description:
                    '“欸~真没意思，一点情趣都没有！”我不满地嘟起嘴，“不告诉你！你自己去找！找不到的话，今天就没有晚安吻了！”',
                  penalty: {
                    bond: -5,
                  },
                  reward: {
                    bond: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '午睡的“共享枕头”',
          description:
            '午后，我趴在草地上昏昏欲睡，看到你走过来，我拍了拍自己身边的空地，然后又拍了拍我的大腿。“喂，拖累那亲，过来。今天本小姐心情好，准你用一下这个‘绝版限定款高级枕头’。”',
          choices: [
            {
              text: '（顺从地躺下，头枕在我腿上）',
              outcome: {
                success: {
                  description:
                    '阳光透过树叶的缝隙洒在我们身上，我用手指轻轻卷着你的头发，哼着不成调的歌。你闻到青草和阳光的味道，还有我身上淡淡的香气，不知不觉就睡着了。',
                  reward: {
                    bond: 25,
                    stamina: 25,
                  },
                },
              },
            },
            {
              text: '“还是算了，会把你压麻的。”',
              outcome: {
                success: {
                  description:
                    '“哈？你是在小看我吗？”我不满地坐起来，一把将你拉倒，强行让你的头枕在我腿上。“我说可以就可以！不许动，给我乖乖躺好，不然我就唱歌给你听了哦！——是会让你做噩梦的那种！”',
                  reward: {
                    bond: 15,
                    power: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '心跳检测器',
          description:
            '训练前，我会突然把耳朵贴在你的胸口。“别动哦，我在听你的心跳。要是跳得不够快，就说明你还没准备好陪我训练！”',
          outcome: {
            success: {
              description:
                '“嗯……扑通、扑通……合格了！那么，今天也要为了让我心跳加速而努力哦！”我满意地抬起头，对你露出一个灿烂的笑容。',
              reward: {
                bond: 10,
                motivation: 1,
              },
            },
          },
        },
        {
          name: '专属障碍物',
          description:
            '在练习灵活性时，我会让你站在场地中央，然后围着你进行高速冲刺和闪避练习。“拖累那亲就是最好的障碍物啦，因为我绝对、绝对不会撞到你的！”',
          outcome: {
            success: {
              description:
                '风从你耳边呼啸而过，我每一次都以毫米级的距离与你擦身，最后停在你面前，笑着问：“怎么样，是不是超~级~刺激？”',
              reward: {
                speed: 10,
                guts: 5,
                bond: 10,
              },
            },
          },
        },
        {
          name: '运动饮料竞速赛',
          description:
            '训练休息时，我们各拿一瓶运动饮料。“预备——开始！”我突然宣布，然后仰头一口气喝光，再把空瓶子倒过来给你看。“我赢了！惩罚就是……你要夸我‘好厉害’！”',
          choices: [
            {
              text: '“强击好厉害！”',
              outcome: {
                success: {
                  description: '“耶嘿嘿~那是当然的啦！”我对你的夸奖非常受用，开心地摇起了尾巴。',
                  reward: {
                    bond: 10,
                    stamina: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '影子追逐游戏',
          description:
            '“从现在开始，你就是我的影子！”在慢跑热身时，我会要求你必须紧紧跟在我身后，步伐和呼吸都要和我同步。“要是被我甩掉了，今天就没有饭后甜点了哦！”',
          outcome: {
            success: {
              description: '你努力地跟上我轻快的步伐，这与其说是训练，不如说是一场只有我们两个人的、默契十足的舞蹈。',
              reward: {
                stamina: 10,
                bond: 10,
              },
            },
          },
        },
        {
          name: '胜利的击掌方式',
          description:
            '完成一组高难度训练后，我不会和你普通地击掌，而是要求你伸出手，然后我用自己的手掌从上到下、再从左到右和你“画”一个五角星。“这是我们胜利的魔法阵，超~帅气的吧！”',
          outcome: {
            success: {
              description: '你看着她一本正经地进行这个幼稚的仪式，忍不住笑出声，而她则得意地扬起了头。',
              reward: {
                bond: 10,
                power: 5,
              },
            },
          },
        },
        {
          name: '毛巾争夺战',
          description:
            '训练后你递给我毛巾，我会故意只咬住一角，然后用力向后拽，眼神挑衅地看着你。“想要吗？那就来抢呀~”',
          choices: [
            {
              text: '（和她玩闹，轻轻地抢夺）',
              outcome: {
                success: {
                  description: '我们像两只小猫一样闹作一团，最后我笑着把毛巾丢给你。“哼，这次就让给你好了！”',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '“念力”推背',
          description:
            '在你做俯卧撑时，我会蹲在你旁边，伸出食指隔空对着你的背。“嘿！哈！我正在用我的‘念力’给你增加负重！有没有感觉变沉了？”',
          outcome: {
            success: {
              description: '虽然没有任何实际重量，但被她这样专注地盯着，你感觉压力反而更大了。',
              reward: {
                power: 5,
                intelligence: -5,
                bond: 10,
              },
            },
          },
        },
        {
          name: '专属BGM',
          description:
            '在你进行力量训练时，我会在旁边用手机放起节奏感超强的偶像歌曲，还跟着一起唱，美其名曰“给你增加训练的BGM”。',
          outcome: {
            success: {
              description: '你在一片“Kira Kira”的歌声中完成了训练，感觉自己好像也变得闪亮了起来。',
              reward: {
                bond: 10,
                motivation: 1,
              },
            },
          },
        },
        {
          name: '汗水的味道',
          description:
            '我跑完步，会故意把满是汗水的手臂凑到你面前。“呐，闻闻看，这是努力的味道哦！是不是超~有魅力的？”',
          choices: [
            {
              text: '（点头表示肯定）',
              outcome: {
                success: {
                  description: '“耶嘿嘿~对吧！”我开心地用沾着汗的手臂蹭了蹭你的脸。“这是给你的特别奖励！”',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '拉伸“酷刑”',
          description:
            '帮你拉伸时，我会故意把你压到一个极限的角度，看着你龇牙咧嘴的样子偷笑。“不行哦，身体这么僵硬可当不了我的王子殿下。再坚持一下下~”',
          outcome: {
            success: {
              description: '虽然过程“惨无人道”，但拉伸完之后你确实感觉身体轻松了不少。',
              reward: {
                stamina: 10,
                bond: 10,
              },
            },
          },
        },
        // --- 日常粘人系列 ---
        {
          name: '外套争夺权',
          description:
            '天气转凉，你会发现你的外套不见了，然后看到我正穿着它，宽大的衣服几乎把我整个人都罩住了。“你的外套被我征用啦！呜哇，好暖和，还全是拖累那亲的味道~”',
          outcome: {
            success: {
              description: '我把自己裹在外套里，在原地开心地转了一圈，然后宣布这件外套今天归我了。',
              reward: {
                bond: 15,
              },
            },
          },
        },
        {
          name: '沙发的“合并”',
          description:
            '你在沙发上看书，我会挤过来，然后像猫一样蜷缩着躺下，把头枕在你的腿上，理所当然地把你当成了我的专属枕头。',
          choices: [
            {
              text: '（轻轻抚摸我的头发）',
              outcome: {
                success: {
                  description: '“嗯……”我舒服地哼了一声，闭上眼睛，不一会儿就发出了均匀的呼吸声，似乎已经睡着了。',
                  reward: {
                    bond: 20,
                    stamina: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '情侣头像指令',
          description:
            '“紧急任务！”我拿出手机，向你展示我刚找到的一对超可爱的Q版情侣头像。“我们必须马上换上！这是‘最强组合’的证明！”',
          outcome: {
            success: {
              description:
                '在你换上头像后，我满意地把两个手机并排放在一起，拍了张照片发到社交网络上，配文：“我的王子殿下♡”',
              reward: {
                bond: 15,
                motivation: 1,
              },
            },
          },
        },
        {
          name: '笔记本涂鸦',
          description:
            '你发现你用来记录工作的重要笔记本上，每一页的页脚都被我画上了一个小小的、表情各异的Q版强击头像，旁边还配着“加油哦！”“今天也很帅！”之类的鼓励语。',
          outcome: {
            success: {
              description: '你哭笑不得，但看着那些可爱的涂鸦，工作的疲惫似乎也减轻了不少。',
              reward: {
                bond: 15,
                intelligence: 5,
              },
            },
          },
        },
        {
          name: '“晚安”的仪式',
          description: '每天睡觉前，我都要求必须视频通话，直到看着你躺上床，盖好被子，然后互相道“晚安”，我才肯挂断。',
          outcome: {
            success: {
              description: '“梦里也要梦到我哦！约好了！”这已经成为了我们之间雷打不动的睡前仪式。',
              reward: {
                bond: 10,
                stamina: 5,
              },
            },
          },
        },
        {
          name: '共享一副耳机',
          description:
            '散步时，我会把一只耳机塞进你的耳朵里。“听！这是我最近超喜欢的歌！副歌部分是不是超有悸动的感觉？”',
          outcome: {
            success: {
              description: '你们靠得很近，肩膀挨着肩膀，共享着同一段旋律，心跳仿佛也在同一个节拍上。',
              reward: {
                bond: 15,
              },
            },
          },
        },
        {
          name: '菜单决定权',
          description:
            '在餐厅，我会拿过菜单，完全不问你的意见，直接点好两份一样的套餐。“拖累那亲的口味当然要和我保持一致啦，这叫‘心有灵犀’！”',
          outcome: {
            success: {
              description: '幸好，她点的东西意外地很合你的胃口。',
              reward: {
                bond: 10,
                stamina: 10,
              },
            },
          },
        },
        {
          name: '你的气味',
          description:
            '我会偷偷拿走你刚换下的、还带着你体温和气味的T恤，晚上抱着它睡觉。“嘿嘿，这样就像拖累那亲一直陪着我一样了。”',
          outcome: {
            success: {
              description:
                '第二天你发现T恤被洗得干干净净、叠得整整齐齐地放回了原处，上面还带着一股淡淡的、和她身上一样的香味。',
              reward: {
                bond: 20,
              },
            },
          },
        },
        {
          name: '自动导航',
          description:
            '在人多拥挤的商业街，我会紧紧抓住你的手，或者直接抓住你的衣角，闭上眼睛让你带着我走。“我负责可爱，你负责导航！不许把我弄丢了哦！”',
          outcome: {
            success: {
              description: '你牵着这个完全信任你的“小挂件”，小心翼翼地在人潮中穿行，感觉责任重大。',
              reward: {
                bond: 15,
                guts: 5,
              },
            },
          },
        },
        {
          name: '“测量”尺寸',
          description:
            '“拖累那亲，别动！”我拿出软尺，开始在你身上量来量去，从肩宽到臂长，再到腰围。“我在收集数据，为了给你设计最合身的‘王子礼服’！你就好好期待吧！”',
          outcome: {
            success: {
              description: '我靠得极近，温热的呼吸喷在你的脖子上，让你感觉痒痒的，心也跟着痒痒的。',
              reward: {
                bond: 15,
                intelligence: 5,
              },
            },
          },
        },
        // --- 小恶魔的恶作剧 ---
        {
          name: '咖啡加“料”',
          description:
            '在你喝咖啡时，我神秘兮兮地拿出一个小瓶子，往里面滴了几滴透明液体。“这是能提升‘悸动指数’的魔法药水哦！”（其实是柠檬汁）',
          outcome: {
            success: {
              description: '你喝了一口，被酸得一激灵，我则在一旁笑得打滚。“哈哈！你这个表情，超好玩！”',
              reward: {
                bond: 10,
                guts: 5,
              },
            },
          },
        },
        {
          name: '藏鞋子游戏',
          description:
            '早上你准备出门，却发现只找到一只鞋。这时，我抱着另一只鞋从房间探出头来，对你勾勾手指。“想要吗？那就说一句‘我最可爱的强击，请把鞋子还给我吧’来听听~”',
          choices: [
            {
              text: '（照做）',
              outcome: {
                success: {
                  description: '“耶嘿嘿，真乖~”我满意地把鞋子丢给你，然后像完成了什么伟大任务一样跑掉了。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
          ],
        },
        {
          name: '变声器骚扰电话',
          description:
            '你接到一个陌生电话，对方用粗犷的大叔音说：“是强击的训练员吗？我是她的狂热粉丝！听说你对她不好，我要代表月亮惩罚你！”然后电话那头传来了我憋不住的笑声。',
          outcome: {
            success: {
              description:
                '“噗……哈哈哈哈！被、被骗了吧！你刚才是不是超紧张的？”你甚至能想象出电话那头她笑得在地上打滚的样子。',
              reward: {
                bond: 10,
                intelligence: 5,
              },
            },
          },
        },
        {
          name: '背后的小纸条',
          description:
            '你感觉背后有点痒，让别人帮你一看，发现你背上贴着一张纸条，上面用可爱的字体写着：“我的王子殿下♡请勿触摸”。',
          outcome: {
            success: {
              description: '你找到正在不远处偷笑的我，我看到你发现了，立刻装作若无其事地吹起了口哨。',
              reward: {
                bond: 15,
              },
            },
          },
        },
        {
          name: '“惊喜”便当',
          description: '我为你准备了便当，你满怀期待地打开，发现米饭上用海苔摆出了一个大大的“笨蛋”字样。',
          choices: [
            {
              text: '（笑着把它吃掉）',
              outcome: {
                success: {
                  description: '“欸？你居然吃掉了？！”我好像很惊讶，“哼，看来下次要用更厉害的词才行！”',
                  reward: {
                    bond: 10,
                    guts: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '闹钟的恶作剧',
          description:
            '你早上被闹钟吵醒，发现铃声被我换成了我录制的、用超甜腻的声音喊“拖累那亲~起床啦~再不起来就要被我吃掉咯~”的语音。',
          outcome: {
            success: {
              description: '你顶着两个黑眼圈找到我，我却一脸无辜地问：“怎么样，我的叫醒服务是不是超棒的？”',
              reward: {
                bond: 15,
                stamina: -5,
              },
            },
          },
        },
        {
          name: '遥控器神隐事件',
          description:
            '你想看电视时，发现遥控器不见了。这时，我像个小侦探一样出现，煞有介事地帮你分析，最后从你绝对想不到的地方（比如冰箱里）找了出来，并宣称是“遥控器星人”干的。',
          outcome: {
            success: {
              description: '看着她一本正经胡说八道的样子，你明知道是她干的，却又没法生气。',
              reward: {
                bond: 10,
                intelligence: -5,
              },
            },
          },
        },
        {
          name: '假装不认识',
          description:
            '在校园里遇到你，我会突然装作不认识，用大小姐的口吻问你：“这位先生，请问你知道强击小姐的训练员在哪里吗？我找他有很重要的事哦。”',
          choices: [
            {
              text: '（配合她演戏）',
              outcome: {
                success: {
                  description:
                    '“哦呀，原来就是你呀~”在我确认你的身份后，立刻变回平时的样子，挽住你的胳膊。“走吧，我的拖累那亲！”',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '恐怖箱挑战',
          description:
            '我拿来一个纸箱，告诉你里面有“恐怖的东西”，让你伸手进去摸。你犹豫地伸进去，摸到的却是……我温暖的手。',
          outcome: {
            success: {
              description: '“嘿嘿，抓住你了！”我从箱子另一边握住你的手，笑得像个得逞的小狐狸。',
              reward: {
                bond: 15,
                guts: 5,
              },
            },
          },
        },
        {
          name: '猜猜我是谁',
          description: '我从背后蒙住你的眼睛，并故意捏着鼻子说：“猜猜~我~是~谁~？”',
          choices: [
            {
              text: '“是极峰小姐吗？”',
              outcome: {
                success: {
                  description: '“才不是姐姐！”我立刻松开手，不满地鼓起脸，“哼，你这个笨蛋！罚你今天不许吃甜点！”',
                  penalty: {
                    bond: -5,
                  },
                },
              },
            },
            {
              text: '“是我最可爱的强击。”',
              outcome: {
                success: {
                  description: '“答对了！奖励你……可以多看我一会儿！”我开心地松开手，在你面前转了一圈。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
          ],
        },
        // --- 情感深化与羁绊 ---
        {
          name: '姐姐面前的“炫耀”',
          description:
            '当着姐姐极峰的面，我会故意和你进行一些亲密互动，比如帮你整理衣领，或者炫耀你给我买的小饰品，然后用炫耀的语气对姐姐说：“看，我的拖累那亲超棒的吧！”',
          outcome: {
            success: {
              description:
                '极峰微笑着看着我们，而你则能感觉到，我这么做，不仅仅是炫耀，更是在向最亲近的人宣告你的独一无二。',
              reward: {
                bond: 20,
                motivation: 1,
              },
            },
          },
        },
        {
          name: '败北的沉默',
          description:
            '一场重要的比赛输了之后，我没有哭也没有闹，只是在回宿舍的路上一直沉默不语。快到门口时，我突然停下脚步，从背后抱住你，把脸埋在你背上，什么话也不说。',
          choices: [
            {
              text: '（轻轻地拍拍我的头）',
              outcome: {
                success: {
                  description:
                    '你感觉到背上的衣服湿了一小块。过了很久，我才用闷闷的声音说：“……明天，训练加倍。我……绝对要赢回来给你看。”',
                  reward: {
                    bond: 25,
                    guts: 15,
                  },
                },
              },
            },
          ],
        },
        {
          name: '票根的宝藏',
          description:
            '你发现我有一个精致的铁盒，里面装的不是首饰，而是我们第一次一起去看的电影票根、第一次去的游戏中心的游戏币、甚至是你第一次给我买的饮料的瓶盖。',
          outcome: {
            success: {
              description:
                '被你发现后，我红着脸想把盒子抢回来。“这、这些都是本小姐的宝物！不许乱看！……哼，每一个，都是和拖累那亲的‘悸动’回忆啦。”',
              reward: {
                bond: 30,
              },
            },
          },
        },
        {
          name: '如果我不是我',
          description:
            '“呐，拖累那亲，”在一个安静的午后，我突然问你，“如果我不是什么大小姐，跑得也不快，只是个很普通的女孩子，你……还会当我的训练员吗？”',
          choices: [
            {
              text: '“我选择的，一直都只是‘强击’你这个人。”',
              outcome: {
                success: {
                  description:
                    '我愣住了，随即眼眶一红，但很快又扬起一个灿烂的笑容。“……哼，算你过关！这可是你说的哦，不许反悔！”',
                  reward: {
                    bond: 35,
                    motivation: 2,
                  },
                },
              },
            },
          ],
        },
        {
          name: '为你撑伞',
          description:
            '雨天，我特意带了一把大伞，但在给你撑伞时，却故意把大半个伞面都倾向你，任由雨水打湿我自己的肩膀。',
          choices: [
            {
              text: '（把伞往她那边推）',
              outcome: {
                success: {
                  description: '“不用管我啦！”我笑着说，“我的王子殿下可不能淋湿了，不然谁带我去迪拜呀？”',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '掌心的伤痕',
          description:
            '你注意到我的手心有一道快要愈合的小伤痕。在我追问下，我才不情不愿地承认，是为了给你编那个“胜利护身符”时，被绳子磨破的。“……一点都不疼啦！为了胜利，这点小伤算什么！”',
          outcome: {
            success: {
              description: '你看着她嘴硬心软的样子，轻轻地握住了她的手。',
              reward: {
                bond: 25,
              },
            },
          },
        },
        {
          name: '两个人的秘密基地',
          description:
            '我带你来到一个你从不知道的、学园里最隐蔽的天台角落，这里可以俯瞰整个训练场。“这里是我的秘密基地哦，只带拖累那亲一个人来过。从今天起，它也是我们的秘密基地了。”',
          outcome: {
            success: {
              description: '夕阳下，我们并肩坐着，分享着只属于两个人的宁静时光。',
              reward: {
                bond: 20,
                stamina: 10,
              },
            },
          },
        },
        {
          name: '名字的特权',
          description:
            '“强击（Vibros）这个名字，是姐姐取的，代表着胜利。”我有一天突然对你说，“但是‘Vi’这个昵称……我只允许拖累那亲一个人这么叫我。”',
          choices: [
            {
              text: '“好的，Vi。”',
              outcome: {
                success: {
                  description: '听到你用这个昵称叫我，我的脸颊瞬间就红了，害羞地低下了头，用蚊子般的声音“嗯”了一声。',
                  reward: {
                    bond: 30,
                  },
                },
              },
            },
          ],
        },
        {
          name: '未来的约定',
          description:
            '“等我退役了以后，”我躺在草地上，看着天空说，“我要开一家最闪亮的甜品店！然后，拖累那亲就是我的专属试吃员，每天都要来哦！”',
          outcome: {
            success: {
              description: '她没有回头看你，但你知道，她正在描绘的未来里，每一个场景都有你的位置。',
              reward: {
                bond: 25,
                motivation: 1,
              },
            },
          },
        },
        {
          name: '体温计的“正确”用法',
          description:
            '你感觉头有点晕，我紧张地跑过来，但拿出的不是体温计，而是直接用我自己的额头贴上你的额头。“别动！本小姐的额头可是经过名流认证的、误差不超过0.01度的超高精度体温计！”',
          choices: [
            {
              text: '“那，结果是多少度？”',
              outcome: {
                success: {
                  description:
                    '“嗯……”我闭着眼睛感受了一会儿，然后一本正经地宣布：“是‘让人心跳不已’的温度！结论：你需要本小姐的贴身照顾才能退烧！”',
                  reward: {
                    bond: 15,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: '“你的额头也很烫啊。”',
              outcome: {
                success: {
                  description:
                    '“欸？！那、那是因为离你太近了，被你的热气传染的啦！”我瞬间脸红，猛地退开一步，嘴硬地反驳，“总、总之你发烧了！给我乖乖去床上躺好！”',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '命运的二选一',
          description:
            '我拿出两包零食，一包是我最爱的草莓味夹心饼干，另一包是你喜欢的芥末味薯片，举到你面前。“命运的十字路口出现啦！拖累那亲，今天下午茶的点心，你来选吧！这可是关系到我们今天心情的重大决定哦！”',
          choices: [
            {
              text: '（选择草莓味夹心饼干）',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~我就知道拖累那亲最懂我了！”我开心地拆开包装，并把第一块递到你嘴边，“奖励你先吃第一口！”',
                  reward: {
                    bond: 15,
                    stamina: 10,
                  },
                },
              },
            },
            {
              text: '（选择芥末味薯片）',
              outcome: {
                success: {
                  description:
                    '“欸~真拿你没办法。”我虽然装作有点失望，但还是拆开了薯片，并和你一起分享。“哼，既然是你选的，那你可要负责把我喂饱哦！”',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '电玩城的赌约',
          description:
            '在电玩城，我拉着你到格斗游戏机前。“来对战吧！输的人，就要无条件听从赢的人一个命令！任何命令都可以哦~♪”',
          choices: [
            {
              text: '（接受挑战，并全力以赴）',
              outcome: {
                success: {
                  description:
                    '经过一番激战，你以微弱的优势获胜。我虽然气鼓鼓的，但还是凑过来，红着脸小声说：“……说、说吧，你的命令是什么……不、不许提太过分的要求哦！”',
                  reward: {
                    bond: 20,
                    guts: 10,
                  },
                },
                failure: {
                  description:
                    '“耶——！我赢了！”我兴奋地跳起来，然后叉着腰，像个小女王一样对你说：“我的命令就是……你现在要在这里大声喊‘强击是世界第一可爱！’”',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: '“我怎么可能赢得了你。”',
              outcome: {
                success: {
                  description:
                    '“还没比就认输？真没劲！”我不满地用手指戳你的胸口，“不行！那就改成……你陪我玩那个情侣才能拍的贴纸照！这也是命令！”',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '洗发水的香气',
          description:
            '在超市的洗护区，我拿着草莓和海洋两种香型的洗发水，让你帮我选择。“呐，拖累那亲，你……更喜欢闻到我头发上是什么味道的？”',
          choices: [
            {
              text: '“草莓的，甜甜的，很像你。”',
              outcome: {
                success: {
                  description:
                    '“……哼，算你有眼光。”我嘴上这么说，但已经开心地把草莓香型放进了购物车里，心情肉眼可见地变好了。',
                  reward: {
                    bond: 15,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: '“海洋的吧，感觉很清爽。”',
              outcome: {
                success: {
                  description:
                    '“哦？是吗。”我点点头，把海洋香型放进购物车，然后又偷偷把草莓香型的也拿了一瓶放进去。“……偶尔换换口味也不错嘛。”',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '专属吹风机服务',
          description:
            '我洗完澡，顶着一头湿漉漉的头发，把吹风机塞到你手里。“喂，拖累那亲，我的手好酸，懒得动了。你来帮我吹头发。”',
          choices: [
            {
              text: '（任劳任怨地开始帮她吹头发）',
              outcome: {
                success: {
                  description:
                    '我乖乖地背对着你坐下，从镜子里看着你认真温柔的样子，嘴角不自觉地微微上翘。温热的风和你的指尖穿过我的发丝，感觉舒服得快要睡着了。',
                  reward: {
                    bond: 20,
                    stamina: 10,
                  },
                },
              },
            },
            {
              text: '“自己的事情自己做啊。”',
              outcome: {
                success: {
                  description:
                    '“哈？你居然敢拒绝本小姐的请求？”我立刻鼓起脸，然后把湿漉漉的头发往你脸上一甩。“那你就负责被我的头发攻击吧！直到你同意为止！”',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '惩罚游戏：挠痒痒地狱',
          description:
            '“你居然敢嘲笑我新买的发饰‘像个胡萝卜’？本小姐‘生气’了！现在要对你进行最高等级的惩罚！”内容就是……我把你按倒在沙发上。“觉悟吧，拖累那亲！你即将进入永无止境的挠痒痒地狱！”',
          choices: [
            {
              text: '（大声求饶）',
              outcome: {
                success: {
                  description:
                    '“现在求饶已经晚了！”我笑着加大了攻击力度，直到你笑得眼泪都流出来，我才心满意足地停手。“哼，看你下次还敢不敢了！”',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: '（反击，也去挠她的痒）',
              outcome: {
                success: {
                  description:
                    '“呀！你、你犯规！”我没想到你会反击，被你挠得笑作一团，瞬间失去了攻击力，最后两个人一起倒在沙发上笑得喘不过气。',
                  reward: {
                    bond: 20,
                    guts: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '占卜我们的未来',
          description:
            '我拿出不知从哪弄来的一副塔罗牌，煞有介事地为你洗牌。“本占卜师强击，现在要为你占卜一下‘你和我的未来’！快，从这三张牌里选一张！”',
          choices: [
            {
              text: '（随便选一张）',
              outcome: {
                success: {
                  description:
                    '我翻开牌，看了一眼，然后得意地宣布：“是‘恋人’牌！看吧，命运已经决定了，你就是我命中注定的王子殿下！”（实际上三张牌都是恋人牌）',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: '“强击，你是不是出千了？”',
              outcome: {
                success: {
                  description:
                    '“才、才没有！命运的指引怎么能叫出千呢！”我红着脸把牌收起来，强行辩解道，“总、总之结果就是这样！你不许有异议！”',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '一条围巾的温度',
          description:
            '天气变冷，我拿出一条超长的围巾，但不是给你戴上，而是把你和我的脖子一起圈了进去，让我们面对面靠得极近。“看，这样是不是比一个人戴要暖和一百倍？这叫‘热量共享’！”',
          choices: [
            {
              text: '（伸手抱住她）',
              outcome: {
                success: {
                  description:
                    '我的身体僵了一下，随即放松下来，把脸埋在你胸口的围巾里，闷闷地说：“……嗯，这样……好像更暖和了。在你把我捂热之前，不许松开哦。”',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
            {
              text: '“这样走路不方便啊。”',
              outcome: {
                success: {
                  description:
                    '“就是要不方便才好玩啊！”我坏笑着说，“这样你就只能看着我，哪儿也去不了了。今天你一整天都是我的专属暖宝宝！”',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '帮忙涂防晒霜',
          description:
            '在海边合宿，我穿着泳装，拿着一瓶防晒霜递给你，然后转过身去，露出光洁的后背。“喂，拖累那亲，后背我涂不到，你来帮我。”',
          choices: [
            {
              text: '（认真地帮她涂抹）',
              outcome: {
                success: {
                  description:
                    '冰凉的防晒霜和你的指尖在我背上游走，让我感觉有点痒，忍不住缩了缩肩膀。“……喂，你的手别抖啊，涂均匀一点啦，笨蛋。”我的声音小小的，带着一丝难以察觉的紧张。',
                  reward: {
                    bond: 20,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: '“你自己应该可以吧？”',
              outcome: {
                success: {
                  description:
                    '“哈？你没看到我手短吗！”我夸张地扭动身体，试图把手绕到背后，但完全够不着。“快点啦！要是本小姐被晒伤了，都是你的错哦！”',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '睡前的故事时间',
          description:
            '我躺在床上，却翻来覆去睡不着，于是给你发消息：“拖累那亲，我睡不着，你给我讲个睡前故事吧。要那种王子和公主最后幸福地生活在一起的故事哦！”',
          choices: [
            {
              text: '（开始编一个王子和公主的故事）',
              outcome: {
                success: {
                  description:
                    '我静静地听着你温柔的声音，在你讲到“王子吻了公主”时，我小声地打断：“呐……那个公主的名字，可以叫‘强击’吗？”',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: '“我不会讲故事啊。”',
              outcome: {
                success: {
                  description: '“欸~那唱歌也行！唱摇篮曲！总之在你把我哄睡着之前，不许挂电话！”我开始不讲理地耍赖。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '姐姐的遗憾',
          description:
            '深夜，你发现我独自在观看姐姐极峰未能达成三冠的比赛录像，神情复杂。我注意到你，轻声问：“拖累那亲，你说……我是不是应该，替姐姐完成她没能完成的梦想？”',
          choices: [
            {
              text: '“弥补遗憾，在国内成就无上的荣耀，这很帅气。”',
              outcome: {
                success: {
                  description:
                    '我用力地点了点头，眼中重新燃起斗志。“嗯！我要成为姐姐的骄傲，成为日本最强的女王！让‘三冠’的荣光，在我们家闪耀！”',
                  reward: {
                    bond: 15,
                    guts: 10,
                    motivation: 1,
                  },
                  // 增加“三冠女王之路”权重
                },
              },
            },
            {
              text: '“姐姐的梦想是姐姐的，而你有只属于你自己的、更闪耀的舞台。”',
              outcome: {
                success: {
                  description:
                    '我沉默了一会儿，然后露出了释然的笑容。“……说得对！迪拜、香港、巴黎……世界那么大，我应该去更广阔的天地，跑出我自己的传说！”',
                  reward: {
                    bond: 15,
                    intelligence: 10,
                    motivation: 1,
                  },
                  // 增加“异乡的女帝/凯旋门的英雄”权重
                },
              },
            },
          ],
        },
        {
          name: '迪拜的宣传册',
          description:
            '我兴高采烈地拿着一本印着迪拜草地大赛的宣传册冲到你面前，册子上满是黄金与沙漠的奢华景象。“呐呐！看这个！这才是我该去的地方吧！是不是超——级名流！”',
          choices: [
            {
              text: '“没错，那里就是为你准备的加冕之地。”',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~我就知道你懂我！”我开心地抱着宣传册转了一圈。“好！目标决定！我要成为沙漠的女王！”',
                  reward: {
                    bond: 10,
                    speed: 5,
                    motivation: 2,
                  },
                  // 增加“异乡的女帝”权重
                },
              },
            },
            {
              text: '“在征服世界之前，先要成为日本的第一。”',
              outcome: {
                success: {
                  description:
                    '“唔……说得也有道理。”我鼓了鼓脸颊，“好吧！那就先把国内的奖杯全都拿到手，再去迪拜办一个更盛大的庆功派对！”',
                  reward: {
                    bond: 10,
                    power: 5,
                  },
                  // 增加“三冠女王之路”权重
                },
              },
            },
          ],
        },
        {
          name: '凯旋门的悲愿',
          description:
            '我们一起观看了一部关于日本赛马娘们屡次挑战凯旋门赏失败的纪录片，气氛有些沉重。我关掉电视，认真地看着你：“拖累那亲，你说……我们，能做到吗？终结这个一百年的悲愿。”',
          choices: [
            {
              text: '“只要是你，就没有不可能。我们会成为英雄。”',
              outcome: {
                success: {
                  description:
                    '我的眼中闪烁着从未有过的、混杂着决心与不安的光芒。“……嗯。那就，去试试看吧。为了我们，也为了大家。”',
                  reward: {
                    bond: 20,
                    guts: 15,
                    stamina: 10,
                  },
                  // 增加“凯旋门的英雄”权重
                },
              },
            },
            {
              text: '“那是一条太过艰难的路，我们不必执着于此。”',
              outcome: {
                success: {
                  description:
                    '我松了口气，但眼神里又有些微难以察觉的失落。“……也是呢。在更闪亮的地方，享受胜利的喜悦，才更像我的风格嘛！”',
                  reward: {
                    bond: 10,
                  },
                  // 降低“凯旋门的英雄”权重
                },
              },
            },
          ],
        },
        {
          name: '后辈的憧憬',
          description:
            '一位很有潜力的新生代马娘（比如杏目）在训练中遇到了瓶颈，向我请教。我有些不耐烦地指导了她几句，她却露出了无比崇拜的眼神。',
          choices: [
            {
              text: '“看到没，你已经是可以引导别人的传说了。”',
              outcome: {
                success: {
                  description:
                    '“欸？我、我吗？”我愣了一下，随即叉着腰得意地笑起来，“哼哼，那是当然的啦！本小姐的经验可是无价之宝！喂，那边的小妹妹，再让你见识一下我的厉害！”',
                  reward: {
                    bond: 10,
                    intelligence: 10,
                  },
                  // 增加“黄金的接力棒”权重
                },
              },
            },
            {
              text: '“别管别人了，我们还有自己的目标。”',
              outcome: {
                success: {
                  description:
                    '“说得对！我自己的比赛还忙不过来呢！”我立刻把后辈抛在脑后，重新把注意力集中到你身上。“走吧，拖累那亲，继续我们的训练！”',
                  reward: {
                    bond: 5,
                  },
                  // 降低“黄金的接力棒”权重
                },
              },
            },
          ],
        },
        {
          name: '胜利后的假期',
          description:
            '在赢得一场重要的G1比赛后，我向你提议：“呐，我们放个长假去庆祝一下吧！去购物！去海边！去吃遍所有甜品店！”',
          choices: [
            {
              text: '“好，这是你应得的奖励。”',
              outcome: {
                success: {
                  description: '“耶——！拖累那亲最棒了！”我们度过了一个奢华而愉快的假期，但也因此放松了训练的节奏。',
                  reward: {
                    bond: 20,
                    stamina: 25,
                    motivation: 2,
                  },
                  penalty: {
                    speed: -5,
                    power: -5,
                  },
                  // 增加“陨落的流星”权重
                },
              },
            },
            {
              text: '“庆祝可以，但不能松懈，下一场比赛很快就到了。”',
              outcome: {
                success: {
                  description:
                    '“欸——真严格。”我虽然嘴上抱怨，但还是听从了你的安排，只是简单庆祝了一下就立刻投入了复盘和新一轮的训练。',
                  reward: {
                    bond: 10,
                    guts: 10,
                  },
                  // 降低“陨落的流星”权重
                },
              },
            },
          ],
        },
        // --- 传奇憧憬 ---
        {
          name: '范高尔的录像带',
          description:
            '我们一起观看“史上最强”范高尔的比赛录像，他那碾压式的、纯粹力量的跑法让你都感到窒息。我却看得双眼放光：“哇！这个！好厉害！好帅！就是这种感觉！从正面把对手全部击溃！”',
          choices: [
            {
              text: '“你想学习这种跑法吗？”',
              outcome: {
                success: {
                  description:
                    '“嗯！我要变得更强！强到可以用最直接、最闪亮的方式获胜！拖累那亲，帮我制定这样的训练计划吧！”',
                  reward: {
                    bond: 10,
                    power: 10,
                    guts: 5,
                  },
                  // 改变训练倾向
                },
              },
            },
            {
              text: '“这不适合你，你的优势在于灵巧和冲刺。”',
              outcome: {
                success: {
                  description:
                    '“唔……也是啦。”我虽然有些不甘心，但还是点了点头。“好吧，不过，我还是觉得这种跑法超帅的！”',
                  reward: {
                    bond: 5,
                    intelligence: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '詹雅塔的奇迹',
          description:
            '看着录像里“奇迹女王”詹雅塔每一次都从队伍最末端发起神迹般的追击，我紧张地握紧了拳头。“好刺激！心脏都要跳出来了！把悬念留到最后一刻再逆转，简直就是最棒的剧本！”',
          choices: [
            {
              text: '“这种后追战术很考验心脏，你想试试吗？”',
              outcome: {
                success: {
                  description: '“想！超想的！”我兴奋地说，“那种从绝望中抓住胜利的感觉，一定能带来最强烈的‘悸动’！”',
                  reward: {
                    bond: 10,
                    stamina: 10,
                    guts: 5,
                  },
                  // 增加追行适应性训练
                },
              },
            },
            {
              text: '“我们还是稳妥一点比较好。”',
              outcome: {
                success: {
                  description: '“欸~拖累那亲真无趣。”我撇了撇嘴，“不过算了，毕竟每次都这么玩，心脏可能会受不了。”',
                  reward: {
                    bond: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '海都之星的完美',
          description:
            '观看“六月之星”海都之星的比赛，就像在欣赏一件艺术品，他总能用最冷静、最高效的方式取胜。我托着下巴感叹：“好厉害……完全没有多余的动作，胜利就像呼吸一样自然。这就是‘名流的跑法’吗……”',
          choices: [
            {
              text: '“这是我们应该追求的境界。”',
              outcome: {
                success: {
                  description: '“嗯！”我认真地点头，“我要跑得更聪明、更优雅！用最少的力气，拿到最闪亮的胜利！”',
                  reward: {
                    bond: 10,
                    intelligence: 15,
                  },
                },
              },
            },
            {
              text: '“但那样会不会有点无聊？”',
              outcome: {
                success: {
                  description: '“说的也是！”我立刻恢复了活力，“胜利还是要更华丽、更让人心跳加速才行嘛！”',
                  reward: {
                    bond: 10,
                    speed: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '伽利略的教科书',
          description:
            '“……完全看不懂，但是感觉好厉害。”看着伽利略那教科书般完美的跑位和战术执行，我陷入了困惑。“拖累那亲，你能看懂他在做什么吗？”',
          choices: [
            {
              text: '（为她详细解说伽利略的战术思路）',
              outcome: {
                success: {
                  description:
                    '在你的讲解下，我恍然大悟。“原来如此！比赛原来是这么深奥的东西！感觉我的‘名流等级’又提升了！”',
                  reward: {
                    bond: 15,
                    intelligence: 20,
                  },
                },
              },
            },
            {
              text: '“我们不需要懂，我们有我们的方式。”',
              outcome: {
                success: {
                  description: '“也对！想那么多复杂的事情好麻烦！只要我跑得够快，什么战术都追不上我！”',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '日蚀的传说',
          description:
            '在图书馆查资料时，我们看到了关于“不败神话”日蚀的记载——那个让比赛从一开始就失去悬念的漆黑影子。我看着那张古老的画像，小声说：“……如果，在赛场上遇到这样的对手，会怎么样呢？”',
          choices: [
            {
              text: '“那我们就要成为那个，能在他身上留下一道光的人。”',
              outcome: {
                success: {
                  description:
                    '我的身体震了一下，随即眼中爆发出惊人的光彩。“……嗯！好帅的台词！拖累那亲，我记住这句话了！”',
                  reward: {
                    bond: 20,
                    guts: 15,
                  },
                },
              },
            },
            {
              text: '“幸好我们不会遇到。”',
              outcome: {
                success: {
                  description: '“……也是呢。”我松了口气，“跟那种怪物比赛，一点‘悸动’的感觉都不会有，只会绝望吧。”',
                  penalty: {
                    guts: -5,
                  },
                },
              },
            },
          ],
        },
        // --- 同伴互动 ---
        {
          name: '给米浴的“特训”',
          description:
            '看到米浴又因为一点小事而陷入自我厌弃，躲在角落里哭。我走过去，不是安慰她，而是把一个超大的苹果糖塞到她手里。“哭什么哭！快吃！甜的东西能增加幸福能量！吃完了就给我去跑圈，把眼泪都变成汗水流掉！”',
          choices: [
            {
              text: '（称赞她：这真是强击式的温柔啊。）',
              outcome: {
                success: {
                  description:
                    '“哼，我只是不想看到丧气的家伙影响我的心情而已。”我撇过头，但看到米浴真的开始吃苹果糖了，嘴角还是忍不住微微上扬。',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: '“你这样会不会太严厉了？”',
              outcome: {
                success: {
                  description:
                    '“对她那种性格，温柔是没用的！”我叉着腰说，“就是要用更强大的能量去冲击她，才能把她从牛角尖里拉出来嘛！”',
                  reward: {
                    bond: 5,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '与麦昆的甜品攻防战',
          description:
            '我买了一块限量版的栗子蛋糕，故意在正在为体重苦恼的目白麦昆面前吃得津津有味。麦昆的视线完全被蛋糕吸引，喉咙不自觉地动了一下。',
          choices: [
            {
              text: '（“分她一半吧，看她好可怜。”）',
              outcome: {
                success: {
                  description:
                    '“欸~好吧。”我虽然有些不舍，但还是用叉子切了一半递过去。“只能吃一口哦！……算了，这半都给你了！但是，你要用明天的训练成果来还！”',
                  reward: {
                    bond: 10,
                  },
                  // 获得与麦昆的友情点
                },
              },
            },
            {
              text: '（“别诱惑她了。”）',
              outcome: {
                success: {
                  description:
                    '“我可没有诱惑她哦，是蛋糕自己在发光！”我坏笑着又吃了一大口，气得麦昆转过身去，眼不见为净。',
                  reward: {
                    bond: 5,
                  },
                },
              },
            },
            {
              text: '（OOC修改）“好吧好吧，让给你啦！不过，作为交换，我来帮你制定明天的‘必瘦训练菜单’吧？绝对有效哦~♪”',
              outcome: {
                success: {
                  description:
                    '我的话让麦昆的表情从渴望变成了警惕，她犹豫再三，最终还是觉得蛋糕的诱惑更大一些，含泪接受了我的“魔鬼交易”。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: '我拿起蛋糕，当着她的面，把最上面那颗最甜的栗子吃掉，然后把剩下的推给她：“喏，最精华的部分我尝过了，剩下的就给你这位‘天皇赏马娘’吧。”',
              outcome: {
                success: {
                  description:
                    '麦昆看着那块缺了角的蛋糕，气得浑身发抖，但又没办法对我发作。我则享受着她那副想吃又吃不下的可爱表情。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '挑战黄金船',
          description:
            '黄金船又在做一些莫名其妙的事情（比如用渔网抓人），我看不下去，决定要和她比一比“谁才是特雷森学园最让人意外的马娘”。',
          choices: [
            {
              text: '（支持她，并给她出主意）',
              outcome: {
                success: {
                  description:
                    '你给我出了一个绝妙的（馊）主意，我立刻跑去实践，结果和黄金船一起被骏川小姐抓去训话。但我和黄金船却因此成了“共犯”，关系意外地变好了。',
                  reward: {
                    bond: 10,
                    guts: 10,
                    intelligence: -5,
                  },
                  // 获得与黄金船的友情点
                },
              },
            },
            {
              text: '（试图阻止她）',
              outcome: {
                success: {
                  description: '“你别管！这是我和她之间的神圣对决！”我不听劝，结果被黄金船带到沟里，搞得灰头土脸。',
                  penalty: {
                    bond: -5,
                    motivation: -1,
                  },
                },
              },
            },
          ],
        },
        {
          name: '学习资料共享？',
          description:
            '考试前，目白麦昆在认真地复习，而黄金船则在旁边画着奇怪的阵法，说是“考试必过魔法阵”。我则拿着一堆时尚杂志在看。',
          choices: [
            {
              text: '（建议她向麦昆借笔记）',
              outcome: {
                success: {
                  description: '“欸~好麻烦。”我虽然这么说，但还是跑去跟麦昆撒娇，成功借到了完美的复习笔记。',
                  reward: {
                    bond: 5,
                    intelligence: 10,
                  },
                },
              },
            },
            {
              text: '（建议她加入黄金船的“魔法仪式”）',
              outcome: {
                success: {
                  description:
                    '“哦哦！这个看起来好有趣！”我立刻丢下杂志，加入了黄金船，两个人一起跳起了奇怪的祈祷之舞，麦昆则在一旁露出了没眼看的表情。',
                  reward: {
                    bond: 5,
                    intelligence: -10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '食堂的“人气对决”',
          description:
            '食堂推出了新品甜点，最后一客被米浴拿到了。我正想去“交涉”一下，黄金船却突然出现，说要用“猜谜”来决定甜点的归属。',
          choices: [
            {
              text: '（“强击，我们也加入吧！”）',
              outcome: {
                success: {
                  description: '“好啊！我才不会输！”我立刻加入战局，最终变成了一场围绕着甜点的、莫名其妙的混战。',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: '（“算了，我们去买别的吧。”）',
              outcome: {
                success: {
                  description:
                    '“哼，那种小孩子的游戏，我才不参加呢。”我拉着你去了商店，买了一份更豪华的芭菲。“还是这个比较符合我的名流身份！”',
                  reward: {
                    bond: 10,
                    stamina: 10,
                  },
                },
              },
            },
          ],
        },
        // --- 训练与心态 ---
        {
          name: '轻微的疼痛',
          description: '训练中，你的脚踝传来一点隐约的刺痛。你停顿了一下，但很快就消失了。',
          choices: [
            {
              text: '（立刻停下，告诉训练员）',
              outcome: {
                success: {
                  description:
                    '“拖累那亲，我好像有点不对劲。”你立刻带我去做详细检查，虽然没什么大碍，但避免了伤势恶化的风险。',
                  reward: {
                    bond: 15,
                    intelligence: 10,
                  },
                  // 降低“陨落的流星”权重
                },
              },
            },
            {
              text: '（“没什么，继续吧。”）',
              outcome: {
                success: {
                  description: '“嗯，可能只是错觉吧。”我没有在意，继续完成了高强度的训练，但那丝疼痛却成了埋下的隐患。',
                  penalty: {
                    guts: -5,
                  },
                  // 增加“陨落的流星”权重
                },
              },
            },
          ],
        },
        {
          name: '媒体的吹捧',
          description:
            '连战连胜后，媒体用“天才”、“无敌”等词汇来报道我。我看着报纸，有些飘飘然：“耶嘿嘿~他们还挺有眼光的嘛！”',
          choices: [
            {
              text: '“别被冲昏头脑，我们的对手还很多。”',
              outcome: {
                success: {
                  description: '“知道啦知道啦，拖累那亲真啰嗦。”我虽然嘴上抱怨，但还是把报纸丢到一边，重新集中了精神。',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                  // 降低“陨落的流星”权重
                },
              },
            },
            {
              text: '“他们说的没错，你就是最强的。”',
              outcome: {
                success: {
                  description:
                    '“对吧！对吧！”我被你的话极大地取悦了，自信心爆棚，但对训练的敬畏之心却在不经意间减少了。',
                  reward: {
                    bond: 10,
                    motivation: 1,
                  },
                  // 增加“陨落的流星”权重
                },
              },
            },
          ],
        },
        {
          name: '枯燥的基础训练',
          description:
            '你为我安排了一周的基础体能训练，都是些重复且枯燥的项目。我有些不满：“又是这个？好无聊啊，我们去练习冲刺不好吗？”',
          choices: [
            {
              text: '“基础才是通往胜利的唯一道路。”',
              outcome: {
                success: {
                  description: '“……好吧。”看你一脸严肃，我只好不情不愿地开始了训练，扎实地打好了基础。',
                  reward: {
                    bond: 5,
                    stamina: 10,
                    power: 10,
                  },
                },
              },
            },
            {
              text: '“好吧，那今天就放松一下。”',
              outcome: {
                success: {
                  description:
                    '“耶！拖累那亲最好了！”我开心地放弃了基础训练，跑去练习自己喜欢的冲刺，虽然很开心，但体能的短板却没能得到弥补。',
                  reward: {
                    bond: 10,
                    speed: 10,
                  },
                  penalty: {
                    stamina: -5,
                  },
                  // 增加“陨落的流星”权重
                },
              },
            },
          ],
        },
        {
          name: '对手的分析会',
          description:
            '比赛前，你拿出对手的资料，准备和我开战术分析会。我却打了个哈欠：“有什么好看的呀，反正只要我跑得比她们都快，不就行了？”',
          choices: [
            {
              text: '“知己知彼，百战不殆。这是名流的智慧。”',
              outcome: {
                success: {
                  description: '“唔……‘名流的智慧’，听起来不错！”我立刻来了兴趣，认真地和你一起分析起来。',
                  reward: {
                    bond: 10,
                    intelligence: 15,
                  },
                },
              },
            },
            {
              text: '“你说的对，那就相信你的速度。”',
              outcome: {
                success: {
                  description: '“哼哼，就是嘛！”我更加相信自己“只要跑得快就能赢”的理论，放弃了对对手的深入研究。',
                  reward: {
                    bond: 5,
                    guts: 5,
                  },
                  penalty: {
                    intelligence: -10,
                  },
                  // 增加“陨落的流星”权重
                },
              },
            },
          ],
        },
        {
          name: '奖金的用途',
          description: '“呐，拖累那亲，”我躺在草地上，畅想着未来，“等我们赢了好多好多奖金，你想要用它来做什么？”',
          choices: [
            {
              text: '“给你买一座种满蓝玫瑰的庄园。”',
              outcome: {
                success: {
                  description:
                    '我愣了一下，随即脸颊爆红，把脸埋进草地里，闷闷地说：“……笨、笨蛋！谁要那种东西啦！”但我的尾巴却在开心地摇来摇去。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
            {
              text: '“投入到更科学的训练设备和营养品上。”',
              outcome: {
                success: {
                  description: '“欸~好现实，真没意思。”我撇了撇嘴，“不过……如果是为了让我变得更强，也不是不能接受啦。”',
                  reward: {
                    bond: 10,
                    motivation: 1,
                  },
                },
              },
            },
          ],
        },
        // --- 羁绊深化 ---
        {
          name: '如果我跑不动了',
          description:
            '“拖累那亲，”在一个安静的夜晚，我突然小声问，“如果有一天，我受伤了，再也跑不快了，变不成名流了……你，会怎么办？”',
          choices: [
            {
              text: '“那我就当你的专属司机，带你逛遍全世界的商店。”',
              outcome: {
                success: {
                  description: '我的眼眶瞬间就红了，扑进你怀里，带着哭腔说：“……说、说好了哦！不许骗我！”',
                  reward: {
                    bond: 35,
                  },
                },
              },
            },
            {
              text: '“我会想尽一切办法让你重新站起来。”',
              outcome: {
                success: {
                  description: '“……嗯。”我用力地点点头，心中充满了安心感和力量。“我相信你，拖累那亲。”',
                  reward: {
                    bond: 20,
                    guts: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '决胜服的秘密',
          description:
            '我的新决胜服做好了，我神秘地把你拉到没人的地方，指着裙摆内侧一个几乎看不见的地方。“看，我让设计师把我们两个名字的首字母，用金线绣在了一起。”',
          choices: [
            {
              text: '“这是我们两个人的护身符。”',
              outcome: {
                success: {
                  description:
                    '“才、才不是护身符这么土的东西！”我红着脸反驳，“这、这是‘最强组合’的印记！有了它，我感觉自己无所不能！”',
                  reward: {
                    bond: 25,
                    motivation: 2,
                  },
                },
              },
            },
            {
              text: '“别人会看到的吧？”',
              outcome: {
                success: {
                  description:
                    '“就是要让别人看到才好！”我叉着腰说，“……不对，是根本不会有人看到啦！这是只属于我们两个人的、小小的秘密！”',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
          ],
        },
        {
          name: '“家”的味道',
          description:
            '你因为加班，很晚才回到宿舍，发现我没有回自己房间，而是抱着枕头蜷缩在你的沙发上睡着了，桌上还放着给我留的、已经冷掉的饭菜。',
          choices: [
            {
              text: '（轻轻地把我抱到床上去）',
              outcome: {
                success: {
                  description:
                    '我在睡梦中被你抱起，无意识地在你怀里蹭了蹭，找了个舒服的姿势，小声地梦呓着：“拖累那亲……回来了啊……”',
                  reward: {
                    bond: 30,
                  },
                },
              },
            },
            {
              text: '（叫醒她，让她回自己房间睡）',
              outcome: {
                success: {
                  description:
                    '我迷迷糊糊地被你叫醒，揉着眼睛问：“……你回来了啊？我等你了好久……好困……今天就在这里睡不行吗？”',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
          ],
        },
        {
          name: '最棒的礼物',
          description: '我生日那天，你问我想要什么礼物。我看着你，笑着摇了摇头。',
          choices: [
            {
              text: '“真的什么都不要吗？”',
              outcome: {
                success: {
                  description:
                    '“嗯……因为最棒的礼物，不是已经在我身边了吗？”我伸出小指，勾住你的小指，“所以，只要你答应我，明年、后年、以后每一年，都由你来第一个对我说‘生日快乐’，就够了。”',
                  reward: {
                    bond: 40,
                  },
                },
              },
            },
            {
              text: '（拿出一个精心准备的礼物）',
              outcome: {
                success: {
                  description:
                    '“哇！好漂亮！”我开心地收下礼物，然后又补充道，“不过，对我来说，你陪在我身边，才是比任何礼物都更让我‘悸动’的事情哦！”',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
          ],
        },
        {
          name: '世界的中心',
          description:
            '赢得一场关键比赛后，在胜者舞台上，聚光灯和欢呼声将我包围。我拿起麦克风，在发表感言时，突然说：“今天能赢，我要感谢一个人。那个人现在就在现场。是你，让我成为了今天这个闪闪发光的我。”我没有说出你的名字，但我的视线，却穿过整个会场，牢牢地锁定了你。',
          choices: [
            {
              text: '（在台下，对她用力地点头，做出“你最棒”的口型）',
              outcome: {
                success: {
                  description:
                    '看到你的回应，我露出了发自内心的、比任何时候都要灿烂的笑容。那一刻，你明白，对她而言，你就是她的整个世界。',
                  reward: {
                    bond: 50,
                    motivation: 3,
                  },
                },
              },
            },
          ],
        },
        {
          name: '[新年参拜] 祈愿的内容',
          description:
            '穿着「初詣の約束」，我们在神社的赛钱箱前并肩而立。我闭着眼睛、双手合十，虔诚地许完愿后，侧过头对你小声说：“呐，拖累那亲，你猜我刚才向神明大人许了什么愿望？”',
          choices: [
            {
              text: '“希望接下来的比赛场场胜利。”',
              outcome: {
                success: {
                  description:
                    '“哼哼，那只是其中之一啦！”我得意地摇了摇手指，“更重要的愿望是……‘希望拖累那亲的眼里，永远都只有我一个人’。神明大人一定会听到的，对吧？”',
                  reward: {
                    bond: 15,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: '“希望能吃到很多好吃的。”',
              outcome: {
                success: {
                  description:
                    '“欸！你怎么知道的！”我像是被说中了心事一样，脸颊微红，“……我、我还许愿了希望和你一起去吃遍全世界的甜品店啦！这、这个才是重点！”',
                  reward: {
                    bond: 10,
                    stamina: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '[新年参拜] 御守的选择',
          description:
            '在授予所，面对琳琅满目的御守，我拿起一枚金色的“必胜祈愿”和一枚粉色的“缘结祈愿”，举到你面前。“拖累那亲，你觉得……我们两个，现在更需要哪一个祝福呢？”',
          choices: [
            {
              text: '“当然是‘必胜’，胜利是我们共同的目标。”',
              outcome: {
                success: {
                  description:
                    '“嗯！说得对！”我用力点头，买下了“必胜”御守，并郑重地把它塞进你手里。“这个就由你来保管！它会守护我们，直到拿到下一个第一！”',
                  reward: {
                    bond: 10,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: '“我觉得是‘缘结’，我们的羁绊才是胜利的基础。”',
              outcome: {
                success: {
                  description:
                    '我愣了一下，随即露出了一个无比灿烂的笑容，买下了“缘结”御守。“……耶嘿嘿~这个答案，我超~喜欢的！那，这个就当作我们两个的‘秘密信物’吧！”',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '[心动舞台] 共舞的邀请',
          description:
            '穿着「Heartbeat Showcase」，在庆功派对的舞池边，我端着果汁，有些紧张地玩弄着吸管。看到你走近，我鼓起勇气，朝你伸出手：“呐，王子殿下，现在是属于我的时间了。你是想和我一起，成为舞池的中心呢？还是说……只想在这里，静静地看着我一个人为你跳舞？”',
          choices: [
            {
              text: '“我想和你一起，成为最闪亮的一对。”',
              outcome: {
                success: {
                  description:
                    '“我就知道你会这么说！”我立刻笑逐颜开，拉着你滑入舞池。在旋转的灯光下，我们成为了全场唯一的焦点。',
                  reward: {
                    bond: 20,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: '“我更想在这里，欣赏只属于我的表演。”',
              outcome: {
                success: {
                  description:
                    '“哼哼，真拿你没办法。”我露出了小恶魔般的笑容，独自走向舞池中央。接下来的整支舞，我所有的动作、所有的眼神，都只为你一人。',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '[心动舞台] 派对女王的策略',
          description:
            '派对进行到一半，我把你拉到角落，神秘兮兮地说：“拖累那亲，我感觉现在的‘悸动指数’还不够高！帮我选一个策略吧！是现在就去挑战会场里最强的那个舞者，一举成为话题中心？还是去‘不小心’把饮料洒在人气最高的那个人身上，上演一出戏剧性的相遇？”',
          choices: [
            {
              text: '“去挑战舞者，用实力征服全场。”',
              outcome: {
                success: {
                  description: '“好！正合我意！”我立刻充满斗志地走向那个舞者，并用华丽的舞步赢得了所有人的惊叹和掌声。',
                  reward: {
                    bond: 10,
                    guts: 10,
                    speed: 5,
                  },
                },
              },
            },
            {
              text: '“上演戏剧性的相遇，这听起来更有趣。”',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~英雄所见略同！”我坏笑着端起果汁，结果在实行计划的途中，却“不小心”和你撞在了一起，把果汁全洒在了你身上。“呀！对、对不起拖累那亲！我不是故意的！”（但她看起来超开心的）',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
          ],
        },
        {
          name: '[水仙百合之梦] 橱窗前的幻想',
          description:
            '路过一家高级婚纱店，我被橱窗里那件如同「水仙百合之梦」般华丽的礼服吸引，停下了脚步。“呐，拖累那亲……你看那件，是不是超~级~闪亮的？如果……只是如果哦，有一天我要穿上这样的衣服，你希望……是和我一起站在迪拜的夕阳下，还是在特雷森的胜者舞台上？”',
          choices: [
            {
              text: '“在迪拜的夕阳下，那将是比任何胜利都更耀眼的瞬间。”',
              outcome: {
                success: {
                  description:
                    '我的脸颊泛起红晕，眼神中充满了对未来的憧憬。“……嗯，我也觉得。那一天，我一定会成为全世界最幸福的女孩。”',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
            {
              text: '“在胜者舞台上，向全世界宣告我们的胜利与羁绊。”',
              outcome: {
                success: {
                  description:
                    '“用最华丽的姿态，拿下最棒的胜利吗……耶嘿嘿，这个想法，也很符合我的风格呢！”我开心地笑了起来，仿佛已经看到了那天的场景。',
                  reward: {
                    bond: 15,
                    motivation: 2,
                  },
                },
              },
            },
          ],
        },
        {
          name: '[水仙百合之梦] 誓言的练习',
          description:
            '在一个只有我们两个人的休息室里，我突然一本正经地清了清嗓子，模仿着电影里的情节说：“来练习一下吧！如果有一天，我要对最重要的人说出誓言……拖累那亲，你觉得，我应该先说‘我愿意为你拿下全世界的胜利’，还是先说‘我愿意把我的未来全部交给你’？”',
          choices: [
            {
              text: '“先说胜利，因为那是你们共同奋斗的证明。”',
              outcome: {
                success: {
                  description:
                    '“嗯！有道理！”我点点头，然后看着你，认真地练习道：“我，强击，愿意为你拿下全世界的胜利！……怎、怎么样？是不是很有气势？”',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: '“先说未来，因为那是一切胜利的最终意义。”',
              outcome: {
                success: {
                  description:
                    '我沉默了片刻，脸颊慢慢变红，最后用几乎听不见的声音对着你练习道：“……我愿意……把我的未来……全部交给你……呜哇！好、好害羞！不练了！”',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
          ],
        },
        {
          name: '[泳装] 沙滩埋人游戏',
          description:
            '穿着「夏日炫光」，在沙滩上，我拿着小铲子，兴致勃勃地提议：“我们来玩沙滩埋人游戏吧！拖累那亲，你是想把我埋起来，只留一个头在外面，让我当可爱的‘沙滩地鼠’呢？还是……你想被我埋起来，让我用沙子给你做一个超帅的‘美人鱼’造型？”',
          choices: [
            {
              text: '“我想看可爱的‘沙滩地鼠’。”',
              outcome: {
                success: {
                  description:
                    '“好呀！”我立刻躺下，任由你把我埋起来。最后，沙滩上只剩下一个顶着蝴蝶结的脑袋，我还对你做了个鬼脸：“快来打地鼠呀，打中了有奖哦！”',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: '“请务必给我做一个帅气的‘美人鱼’造型。”',
              outcome: {
                success: {
                  description:
                    '“交给我吧！”我干劲十足地开始工作，最后你拥有了一个由沙子、贝壳和海草组成的、非常……抽象的“美人鱼”尾巴。我则叉着腰，对自己“艺术品”非常满意。',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '[泳装] 闪亮马娘冰沙',
          description:
            '在海边小屋，菜单上有“黄金海岸冰沙”和“落日海滩冰沙”两种特制饮品。我指着菜单问你：“呐，拖累那亲，作为对我今天在沙滩上表现优异的奖励，你要请我喝哪一杯？是看起来就很名流的黄金海岸，还是感觉很浪漫的落日海滩？”',
          choices: [
            {
              text: '“当然是黄金海岸，最配闪闪发光的你。”',
              outcome: {
                success: {
                  description: '“耶嘿嘿~算你有眼光！”我开心地喝着金色的冰沙，感觉自己整个人都在阳光下闪闪发光。',
                  reward: {
                    bond: 10,
                    stamina: 10,
                  },
                },
              },
            },
            {
              text: '“落日海滩吧，想和你一起看那样的风景。”',
              outcome: {
                success: {
                  description:
                    '“……和你一起看吗？”我小声重复了一遍，然后点了点头，端着那杯色彩绚丽的冰沙，和你一起坐到了能看到海平线的位置。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
          ],
        },
        {
          name: '[决胜服] 最后的指令',
          description:
            'G1决赛前，在闸门后，我穿着决胜服，做着最后的深呼吸。我通过耳机轻声问你：“拖累那亲，给我最后一条指令吧。你是希望我‘随心所欲，尽情去享受’，还是希望我‘忘记一切，脑子里只想着冲过终点线’？”',
          choices: [
            {
              text: '“随心所欲，去享受只属于你的舞台。”',
              outcome: {
                success: {
                  description:
                    '“……收到。那我就，不客气了哦。”我笑了，所有的紧张都化为纯粹的兴奋。闸门打开的瞬间，我感觉自己像一道光冲了出去。',
                  reward: {
                    bond: 20,
                    motivation: 2,
                  },
                },
              },
            },
            {
              text: '“忘记一切，眼中只有终点。”',
              outcome: {
                success: {
                  description:
                    '“……了解。”我闭上眼睛，再睁开时，眼神变得无比锐利和专注。整个世界都消失了，只剩下前方那条通往胜利的赛道。',
                  reward: {
                    bond: 15,
                    guts: 10,
                    power: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '[决胜服] 胜利的拥抱',
          description:
            '冲线后，我以压倒性的优势获得第一。在回到你面前时，我张开双臂，喘着气对你说：“拖累那亲！我赢了！现在，你是要像对待凯旋的英雄一样，把我高高举起来庆祝呢？还是……像对待最珍贵的宝物一样，紧紧地抱住我？”',
          choices: [
            {
              text: '（尝试把她高高举起）',
              outcome: {
                success: {
                  description:
                    '你用尽全力，也只是让我双脚离地了一瞬间。我被你的样子逗笑了：“噗……哈哈哈！拖累那亲好弱！不过，这份心意我收到啦！”',
                  reward: {
                    bond: 15,
                    power: 5,
                  },
                },
              },
            },
            {
              text: '（紧紧地抱住她）',
              outcome: {
                success: {
                  description:
                    '我被你用力地抱在怀里，能听到你剧烈的心跳声。我把头靠在你的肩膀上，小声说：“嗯……还是这个奖励，最棒了。”',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
          ],
        },
        {
          name: '食堂的特别午餐',
          description:
            '今天的食堂推出四种限时特别午餐，据说每一种都有神奇的功效。我指着菜单，一脸期待地看着你：“呐，拖累那亲，我们今天中午吃哪个？这可是关系到下午训练状态的重大决定哦！”',
          choices: [
            {
              text: 'A.【力量全餐】：超大份牛排配蒜香拉面。',
              outcome: {
                success: {
                  description:
                    '“就是要这样充满能量的感觉！”我大口地吃着牛排，感觉力量正在涌上来。下午的力量训练效果超群。',
                  reward: {
                    bond: 10,
                    power: 15,
                    guts: -5,
                  }, //吃太多有点困
                },
              },
            },
            {
              text: 'B.【速度特餐】：烤鱼配大量蔬菜沙拉。',
              outcome: {
                success: {
                  description: '“嗯~感觉身体都变轻了！”我优雅地吃完了午餐，下午的速度训练中，感觉脚步轻盈无比。',
                  reward: {
                    bond: 10,
                    speed: 15,
                    stamina: -5,
                  }, //吃太少耐力有点不足
                },
              },
            },
            {
              text: 'C.【耐力之选】：招牌的超大份胡萝卜土豆炖汤。',
              outcome: {
                success: {
                  description:
                    '“果然还是这个最让人安心了！”热乎乎的炖汤下肚，感觉浑身都暖洋洋的。下午的耐力训练，我跑完后还精力充沛。',
                  reward: {
                    bond: 10,
                    stamina: 15,
                  },
                },
              },
            },
            {
              text: 'D.【强击特供】：无视菜单，直接让食堂大厨为我定制一份豪华三层点心塔。',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~这才是名流的午餐嘛！”虽然吃得很开心，但下午的训练我一直以“吃太饱跑不动”为由在偷懒。',
                  reward: {
                    bond: 20,
                    motivation: 1,
                  },
                  penalty: {
                    speed: -5,
                    power: -5,
                    stamina: -5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '理事长的寻宝游戏',
          description:
            '「发表！」秋川理事长突然拿着扇子出现在广播里，宣布要举办“第一届特雷森学院寻宝大赛”，最终的奖品是“实现任何一个合理的愿望”。',
          choices: [
            {
              text: '“好耶！目标是冠军！我们的愿望是包租一架飞机去迪拜！”',
              outcome: {
                success: {
                  description:
                    '我们立刻组队，凭借我的直觉和你的智慧，过关斩将，最终真的赢得了冠军！理事长看着我们的愿望，露出了“为难！”的表情。',
                  reward: {
                    bond: 20,
                    guts: 10,
                    intelligence: 10,
                    motivation: 2,
                  },
                },
              },
            },
            {
              text: '“寻宝什么的太麻烦了，我们趁机溜出去购物吧。”',
              outcome: {
                success: {
                  description:
                    '我们趁着全校都在寻宝的混乱时期，成功溜出校门，享受了一次愉快的购物约会。但回来后被骏川秘书抓个正着，被罚打扫一个星期的训练场。',
                  reward: {
                    bond: 25,
                  },
                  penalty: {
                    motivation: -1,
                  },
                },
              },
            },
            {
              text: '“先去搜集情报，看看宝藏可能藏在哪儿。”',
              outcome: {
                success: {
                  description:
                    '我们没有立刻行动，而是先去了图书馆和理事长办公室附近打探消息，制定了完美的寻宝路线，轻松地拿到了大部分宝物。',
                  reward: {
                    bond: 15,
                    intelligence: 15,
                  },
                },
              },
            },
            {
              text: '“这种好事要和大家分享！我们去把姐姐她们都叫上一起参加！”',
              outcome: {
                success: {
                  description:
                    '我把姐姐和她的朋友们都拉来组成了“最强寻宝联盟”，虽然过程非常欢乐，但因为人太多意见不合，最后和冠军失之交臂。',
                  reward: {
                    bond: 15,
                  }, // 和其他人的羁绊也提升了
                },
              },
            },
          ],
        },
        {
          name: '雨天的训练抉择',
          description:
            '下午的训练时间，窗外突然下起了倾盆大雨，室外训练场瞬间变成了一片泥泞的“重场”。今天的训练计划要怎么办呢？',
          choices: [
            {
              text: 'A. 去室内训练场，进行力量和器械训练。',
              outcome: {
                success: {
                  description: '“哼哼，正好可以锻炼我的肌肉！”我们在室内训练场挥洒汗水，力量得到了显著提升。',
                  reward: {
                    power: 20,
                  },
                },
              },
            },
            {
              text: 'B. “这种天气才是锻炼意志的时候！”直接去室外跑道进行耐力跑。',
              outcome: {
                success: {
                  description:
                    '我们在雨中奔跑，虽然浑身湿透，但感觉精神和毅力都得到了锤炼。不过第二天，我华丽丽地感冒了。',
                  reward: {
                    guts: 20,
                    stamina: 10,
                  },
                  penalty: {
                    motivation: -1,
                  }, // 进入生病状态
                },
              },
            },
            {
              text: 'C. 回到训练员室，进行录像复盘和战术研讨。',
              outcome: {
                success: {
                  description: '伴着窗外的雨声，我们一起分析了过去的比赛录像，对战术的理解更加深刻了。',
                  reward: {
                    bond: 15,
                    intelligence: 20,
                  },
                },
              },
            },
            {
              text: 'D. “下雨天就是法定休息日！”干脆翘掉训练，去活动楼的放映室看我最喜欢的爱情电影。',
              outcome: {
                success: {
                  description: '我们在黑暗的放映室里，一起看完了整场电影。虽然训练是荒废了，但感觉心与心的距离更近了。',
                  reward: {
                    bond: 25,
                  },
                  penalty: {
                    speed: -5,
                    power: -5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '门禁危机',
          description:
            '晚上9点59分，我们两个才慢悠悠地晃到宿舍门口，结果发现骏川秘书正微笑着站在那里，手里的秒表即将跳到10点整。',
          choices: [
            {
              text: '“拖累那亲，抱紧我！”然后我发挥马娘的力量，抱着你以超越冲刺的速度冲回宿舍。',
              outcome: {
                success: {
                  description:
                    '在你反应过来之前，我们已经成功冲进了宿舍楼。骏川秘书愣在原地，只感觉到一阵风刮过。虽然成功了，但第二天你因为承受不住G力而腰酸背痛。',
                  reward: {
                    bond: 15,
                    speed: 5,
                  },
                  penalty: {
                    stamina: -5,
                  }, // 训练员体力下降
                },
              },
            },
            {
              text: '“计划B！你负责去和骏川小姐聊天，吸引她的注意，我从后面溜进去！”',
              outcome: {
                success: {
                  description:
                    '你硬着头皮上前和骏川秘书搭话，我趁机从花坛里溜了进去。虽然我成功了，但你被骏川秘书“温柔地”教育了半个小时。',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                  penalty: {
                    motivation: -1,
                  }, // 训练员干劲下降
                },
              },
            },
            {
              text: '立刻上前，90度鞠躬：“对不起！我们知道错了！”',
              outcome: {
                success: {
                  description:
                    '骏川秘书看着我们诚恳的态度，叹了口气，只是微笑着说：“下次请注意时间哦。”我们被从轻发落了。',
                  reward: {
                    bond: 5,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: '“骏川小姐！你看，有流星！”然后趁她抬头的时候溜进去。',
              outcome: {
                success: {
                  description:
                    '骏川秘书下意识地抬头，我们趁机溜了进去。但她很快反应过来，第二天，我们两个的名字都出现在了“本周值日生”的名单上。',
                  penalty: {
                    guts: -10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '改造训练员室',
          description:
            '“你的训练员室也太空旷太没品位了！”我叉着腰宣布，“作为我的专属王子，你的城堡必须由我来亲自设计！那么，第一步，我们应该先做什么呢？”',
          choices: [
            {
              text: 'A. 在墙上贴满我各种尺寸、各种造型的巨幅海报和写真。',
              outcome: {
                success: {
                  description: '现在，你的房间从任何角度看，都充满了我的视线。虽然你觉得压力很大，但我对此非常满意。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. 换上从我家搬来的、全套的、镶金边的欧式古典家具。',
              outcome: {
                success: {
                  description:
                    '你的房间现在看起来像个小宫殿，但也因此变得非常拥挤，你连转身都困难。但我认为这才是“名流”该有的格调。',
                  reward: {
                    bond: 10,
                    power: 5,
                  }, // 搬家具有功
                },
              },
            },
            {
              text: 'C. 摆满各种从奇怪商店买来的“开运水晶”、“必胜达摩”和“恋爱成就猫”。',
              outcome: {
                success: {
                  description: '你的房间现在充满了神秘的东方气息，虽然不知道有没有用，但我的心情非常好。',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'D. “在你桌上放一个超——大的、金光闪闪的地球仪！然后宣布，‘拖累那亲的办公桌已经被我征用为征服世界的作战基地了！’”',
              outcome: {
                success: {
                  description:
                    '你的办公桌上现在多了一个华丽的地球仪，我每天都会跑过来转一转，指着迪拜的方向，宣布那是我们下一个要征服的地方。虽然有点占地方，但似乎也激发了你的工作热情。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '选修课的烦恼',
          description:
            '新学期开始了，除了必修的文化课和训练，我们还可以选择一门选修课来丰富学院生活。我看着选课单，头都大了。',
          choices: [
            {
              text: 'A. “艺术鉴赏课”：听起来就很名流，可以提升我的品味！',
              outcome: {
                success: {
                  description:
                    '我们在课上欣赏了很多名画，虽然我大部分时间都在打瞌睡，但偶尔还是能说出一两句像样的点评。',
                  reward: {
                    intelligence: 10,
                  },
                },
              },
            },
            {
              text: 'B. “家庭料理课”：学会做菜的话，就能给你做爱心便当了耶！',
              outcome: {
                success: {
                  description:
                    '我兴致勃勃地选了料理课，结果第一节课就差点把厨房给点了。最后，爱心便当变成了你给我做的“灾后重建餐”。',
                  reward: {
                    bond: 20,
                  },
                  penalty: {
                    guts: -5,
                  },
                },
              },
            },
            {
              text: 'C. “马娘心理学”：知己知彼，百战不殆！了解对手的心思才能更好地比赛！',
              outcome: {
                success: {
                  description:
                    '我学到了一些有趣的心理学知识，并立刻开始在你身上实践，比如用“巴甫洛夫法”让你一听到摇铃声就给我买胡萝卜汁。',
                  reward: {
                    bond: 10,
                    intelligence: 15,
                  },
                },
              },
            },
            {
              text: 'D. “逃课的艺术”：这个听起来最实用！',
              outcome: {
                success: {
                  description:
                    '“什么？没有这门课吗？”我大失所望。最后在你的劝说下，我们随便选了一门最容易拿到学分的“电影欣赏课”。',
                  reward: {
                    bond: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '中央广场的三女神',
          description: '一个天气晴朗的午后，我们路过中央广场，看着喷泉中央的三女神雕像。我突然有了一个绝妙的想法。',
          choices: [
            {
              text: '“拖累那亲，我们来给女神像重新打扮一下吧！”',
              outcome: {
                success: {
                  description:
                    '我们用花环、缎带和我的备用蝴蝶结，把三女神雕像装饰得充满了“强击”风格。虽然被骏川秘书发现后要求恢复原状，但我们都觉得很有趣。',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: '“你说，如果我在这里举办一场个人胜者舞台，会不会很帅？”',
              outcome: {
                success: {
                  description: '说做就做，我立刻站到喷泉边上，为你一个人表演了一段即兴舞蹈，引来了不少围观群众。',
                  reward: {
                    bond: 10,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: '“我们来比赛，看谁能用一枚硬币准确地投进最高那个女神手里的圣杯里！”',
              outcome: {
                success: {
                  description: '我们玩了半天，结果你一枚都没投中，我却“不小心”投进去了。我因此得意了一整天。',
                  reward: {
                    bond: 10,
                    speed: 5,
                  }, // 眼力也是速度的一种
                },
              },
            },
            {
              text: '“天气这么热，不如我们……”然后我一脚踩进了喷泉池里，并朝你泼水。',
              outcome: {
                success: {
                  description:
                    '我们两个在喷泉里打起了水仗，玩得不亦乐乎，直到理事长拿着“感心！”的扇子路过，并决定将“在喷泉玩水”列为学院的夏季推荐活动。',
                  reward: {
                    bond: 20,
                    stamina: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '舞蹈室的悄悄话',
          description:
            '在空无一人的舞蹈室，练习完胜者舞台的舞蹈后，我们并排靠在巨大的落地镜前休息。我看着镜子里我们两个的倒影，突然开口了。',
          choices: [
            {
              text: '“呐，拖累那亲，你觉得……镜子里的我，和现实中的我，哪个更可爱？”',
              outcome: {
                success: {
                  description:
                    '你回答说：“都很可爱，但现实中的你，是触手可及的。”我听完脸红了，把头埋进膝盖里，半天没说话。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
            {
              text: '“如果有一天，我再也站不上胜者舞台了，你还会陪我来舞蹈室吗？”',
              outcome: {
                success: {
                  description:
                    '你回答说：“当然，到时候，这里就是只属于我们两个人的舞会。”我沉默地靠在你的肩膀上，感觉很安心。',
                  reward: {
                    bond: 20,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: '“我们来比赛吧！看谁能用身体摆出一个最能代表‘胜利’的姿势！”',
              outcome: {
                success: {
                  description:
                    '我摆出了一个华丽的、如同女王般的姿势，而你只是简单地指了指我。我愣了一下，随即明白了你的意思，开心地笑了。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: '“好累啊~拖累那亲，借你的肩膀给我当一会儿枕头吧。”',
              outcome: {
                success: {
                  description: '我没等你的回答，就自然地把头靠在了你的肩膀上，闭上眼睛，享受着这片刻的宁静。',
                  reward: {
                    bond: 15,
                    stamina: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '游泳馆的特别训练',
          description:
            '“今天的游泳训练内容是……”我拿着一个防水战术板，煞有介事地宣布，“由我来扮演求救的公主，而你，拖累那亲，要扮演拯救我的王子！现在，有四种救援方案供你选择！”',
          choices: [
            {
              text: 'A. 像电影里那样，给我做“人工呼吸”。',
              outcome: {
                success: {
                  description:
                    '“欸？！来、来真的吗？！”我虽然嘴上这么提议，但真到了这一步却立刻害羞了，在你靠近之前就满脸通红地潜进了水里。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'B. 用最标准的救援泳姿，把我拖回岸边。',
              outcome: {
                success: {
                  description: '你展现了教科书般的救援技巧，虽然很专业，但我还是抱怨：“一点都不浪漫！差评！”',
                  reward: {
                    bond: 5,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'C. 租一艘天鹅船，优雅地把我“钓”上来。',
              outcome: {
                success: {
                  description: '我们两个在小小的天鹅船上，上演了一出非常滑稽的救援剧。虽然差点翻船，但过程非常欢乐。',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'D. “公主请自救。”然后你朝我泼了一大捧水。',
              outcome: {
                success: {
                  description: '“哈？！你这家伙！”我立刻展开了反击，所谓的“救援训练”彻底变成了一场激烈的水仗。',
                  reward: {
                    bond: 10,
                    stamina: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '理事长办公室的“茶会”',
          description:
            '因为最近表现优异，秋川理事长邀请我们去她的办公室“喝茶”。一进门，我们就看到桌上摆着四种……非常独特的“茶点”。',
          choices: [
            {
              text: 'A. 一盘堆成山的、还在冒热气的胡萝卜。',
              outcome: {
                success: {
                  description: '“感动！理事长居然知道我最喜欢的东西！”我开心地吃了起来，理事长也露出了“满足！”的表情。',
                  reward: {
                    stamina: 15,
                  },
                },
              },
            },
            {
              text: 'B. 据说是理事长帽子上那只猫最喜欢的顶级猫粮。',
              outcome: {
                success: {
                  description:
                    '“试探！这一定是对我们的试探！”我看着那盘猫粮，陷入了沉思。最后，你替我尝了一口，并给出了“味道意外的还不错”的评价。',
                  reward: {
                    bond: 10,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: 'C. 一份印着密密麻麻公式的“智慧蛋糕”。',
              outcome: {
                success: {
                  description:
                    '“我拒绝！吃下去感觉脑子都会变成肌肉！”我坚决不吃，但你却饶有兴致地研究起了上面的公式，并真的解出了一道难题。',
                  reward: {
                    intelligence: 15,
                  },
                },
              },
            },
            {
              text: 'D. 一杯由骏川秘书亲手泡的、味道普通的麦茶。',
              outcome: {
                success: {
                  description:
                    '我们明智地选择了最安全的一项。骏川秘书对我们露出了赞许的微笑，而理事长则因为我们没选她的“特别款”而露出了“遗憾！”的表情。',
                  reward: {
                    bond: 10,
                    stamina: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '挑战！隐藏菜单传说',
          description:
            '“呐呐，拖累那亲，我听说了哦！我们食堂里，好像流传着只有特定的人才能点到的‘隐藏菜单’耶！”我拉着你的袖子，眼睛闪闪发光，“怎么样？我们去挑战一下吧！你想先尝尝哪个传说中的味道？”',
          choices: [
            {
              text: 'A. 特别周的“小山蒜多多拉面”，用食量征服一切！',
              outcome: {
                success: {
                  description:
                    '我们点了一份传说中的拉面，那如同小山一样的份量让你目瞪口呆。我倒是吃得很开心，但结果就是下午的训练你因为吃得太撑而完全跟不上我的节奏。',
                  reward: {
                    bond: 10,
                    stamina: 20,
                  },
                  penalty: {
                    speed: -5,
                  }, //训练员体力下降
                },
              },
            },
            {
              text: 'B. 葛城王牌的“来袭！鬼岛麻婆豆腐”，挑战辣度的极限！',
              outcome: {
                success: {
                  description:
                    '那地狱般的辣度让你一把鼻涕一把泪，我却觉得“超刺激！”，并因此获得了“无畏的味蕾”称号。不过，一下午我们都在狂喝牛奶解辣。',
                  reward: {
                    bond: 10,
                    guts: 15,
                  },
                },
              },
            },
            {
              text: 'C. 米浴的“秘汤：极乐净土”，感觉喝了就能被治愈。',
              outcome: {
                success: {
                  description:
                    '我们找到米浴，在她怯生生的帮助下成功点到了那份绘本风的炖汤。温暖的味道确实让人感觉心灵都被治愈了，一整个下午都感觉很放松。',
                  reward: {
                    bond: 15,
                    stamina: 10,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: 'D. “哼，那些都比不上我的专属定制！我们直接去找甜品师！”',
              outcome: {
                success: {
                  description:
                    '我拉着你直接去了甜品部，半强硬地“指导”甜品师为我们做了一份全新的、独一无二的豪华芭菲。虽然没能体验到隐藏菜单，但这份专属感让我超满足！',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: 'GⅠ胜利者的特权',
          description:
            '在我赢得一场重要的GⅠ比赛后，食堂大厨笑容满面地告诉我，作为胜利者，我可以点一次传说中的“GⅠ拼盘”，那是由顶级食材构成的至高荣誉盛宴。',
          choices: [
            {
              text: 'A. “太棒了！我要最大份的！所有的荣誉都要归我所有！”',
              outcome: {
                success: {
                  description:
                    '一份极其奢华的拼盘摆在了我们面前，我一个人就吃掉了大半。虽然很满足，但接下来的几天你都得陪我进行“体重控制”特别训练。',
                  reward: {
                    motivation: 2,
                    stamina: 25,
                  },
                  penalty: {
                    power: -5,
                  },
                },
              },
            },
            {
              text: 'B. “可以把这份荣誉分享给大家吗？我们用它来开个庆功派对吧！”',
              outcome: {
                success: {
                  description:
                    '我们举办了一场盛大的庆功派对，所有朋友都来分享了这份喜悦。虽然我只吃到了其中一小块，但看着大家开心的样子，我感觉更快乐了。',
                  reward: {
                    bond: 20,
                    intelligence: 10,
                  },
                },
              },
            },
            {
              text: 'C. “嗯……可以把它换成等价的、全世界最顶级的甜品吗？”',
              outcome: {
                success: {
                  description:
                    '食堂大厨面露难色，但还是同意了我的请求。第二天，一份由法国甜品大师空运过来的、如同艺术品般的蛋糕送到了我们面前。',
                  reward: {
                    bond: 15,
                    stamina: 10,
                  },
                },
              },
            },
            {
              text: 'D. “这是我和拖累那亲一起赢得的，我们两个人分享就够了。”',
              outcome: {
                success: {
                  description:
                    '我们找了一个安静的角落，一起分享了那份象征着至高荣誉的拼盘。味道已经不重要了，重要的是分享这份喜悦的瞬间。',
                  reward: {
                    bond: 30,
                  },
                },
              },
            },
          ],
        },
        {
          name: '开发！强击流隐藏料理',
          description:
            '“我也要有只属于我的隐藏料理！”我如此宣布，并拉着你一起，在训练员室的白板上开始设计我的专属菜单。那么，我们的招牌菜应该是什么呢？',
          choices: [
            {
              text: 'A. “迪拜黄金烤肉串”：用最高级的A5和牛，外面刷上蜂蜜，最后再贴满可食用金箔，一串就价值不菲！',
              outcome: {
                success: {
                  description:
                    '这道菜成功加入了隐藏菜单，但因为成本太高，只有在我赢得海外GⅠ比赛时才能点到。它成了名副其实的“传说中的料理”。',
                  reward: {
                    bond: 15,
                    power: 10,
                  },
                },
              },
            },
            {
              text: 'B. “悸动心跳麻辣烫”：外表是可爱的奶油粉色汤底，看起来人畜无害，但里面的辣度完全随机，有可能是微辣，也有可能是地狱辣！',
              outcome: {
                success: {
                  description:
                    '这道菜因为其“赌博”性质而意外地受欢迎，很多马娘都喜欢来挑战自己的运气。我和你每次吃的时候，也像在玩心跳游戏。',
                  reward: {
                    bond: 15,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: 'C. “名流下午茶套餐”：经典的三层点心架，但每一层都是意想不到的组合，比如第一层是鱼子酱配薯片，第二层是鹅肝配大福，第三层是胡萝卜冰淇淋。',
              outcome: {
                success: {
                  description:
                    '这道菜被评价为“天才与疯子的结合体”，只有敢于冒险的马娘才敢尝试。你每次陪我吃的时候，表情都非常精彩。',
                  reward: {
                    bond: 15,
                    intelligence: 10,
                  },
                },
              },
            },
            {
              text: 'D. “王子专属胡萝卜饼”：就是很普通的胡萝卜饼，但点单的唯一条件是——必须由它的专属训练员，也就是你，亲手喂给强击吃。',
              outcome: {
                success: {
                  description:
                    '食堂大厨笑着同意了这个“荒唐”的条件。从此以后，点这道菜成了我们之间一个甜蜜的、只属于两个人的秘密仪式。',
                  reward: {
                    bond: 35,
                  },
                },
              },
            },
          ],
        },
        {
          name: '专属饮品的命名仪式',
          description:
            '甜品师完美地复刻了我设计的专属饮品，那闪耀着金色与蓝色光辉的“艺术品”正静静地立在桌上。我托着下巴说：“还差最后一步，它需要一个配得上它的名字。拖累那亲，你觉得它应该叫什么？”',
          choices: [
            {
              text: 'A. 就叫“强击特调”，简单直接，一听就知道是我的！',
              outcome: {
                success: {
                  description: '“嗯，也行！简单又霸气！”这个名字很快就在学院里传开了，成了我的代名词之一。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
            {
              text: 'B. 不如叫“维纳斯之泪”，听起来就很梦幻，很高级！',
              outcome: {
                success: {
                  description: '“维纳斯之泪……耶嘿嘿，这个名字好浪漫，我喜欢！”我立刻决定采用这个充满艺术感的名字。',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'C. 就叫“迪拜之梦”，提醒我们永远不要忘记最终的目标！',
              outcome: {
                success: {
                  description:
                    '“迪拜之梦……嗯！”我点了点头，眼神变得坚定起来。“没错，每一次喝下它，都是在为我们的梦想积蓄能量！”',
                  reward: {
                    bond: 10,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: 'D. 应该叫“献给王子的第一杯”。',
              outcome: {
                success: {
                  description:
                    '我愣了一下，脸颊瞬间就红了，小声嘟囔着：“什、什么王子啊……笨、笨蛋……不过，既然你都这么说了，那就……勉强用这个名字好了。”',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
          ],
        },
        {
          name: '观察你的“心动瞬间”',
          description:
            '我满怀期待地将那杯闪闪发光的专属饮品递到你面前，然后立刻坐到你对面，双手托着下巴，一言不发，但亮晶晶的眼睛却一眨不眨地盯着你，似乎在期待着什么。',
          choices: [
            {
              text: 'A. 立刻喝一大口，然后用夸张的语气赞美：“太好喝了！这是我喝过最棒的饮料！”',
              outcome: {
                success: {
                  description: '“耶嘿嘿~对吧对吧！”我立刻得意地笑了起来，对你的反应非常满意。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. 先拿出手机，从上、下、左、右各个角度给这杯“艺术品”拍了一套写真。',
              outcome: {
                success: {
                  description:
                    '“哼哼，算你识货。”我看着你认真的样子，虽然嘴上不说，但心里其实非常开心，觉得自己的品味得到了认可。',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'C. 小心翼翼地端起来，迟疑地问：“这个……装饰用的金箔和马蹄铁，真的能吃吗？”',
              outcome: {
                success: {
                  description:
                    '“当然能吃啦！真是的，一点都不懂名流的品味！”我虽然嘴上抱怨，但还是耐心地给你讲解了其中的食材。',
                  reward: {
                    bond: 5,
                  },
                },
              },
            },
            {
              text: 'D. 没有先喝，而是先把顶端的马蹄铁形巧克力拿下来，递到我嘴边说：“这个最可爱的部分，应该是属于你的。”',
              outcome: {
                success: {
                  description: '我的心跳漏了一拍，脸颊微红地张开嘴吃掉了那块巧克力，然后小声说：“……算、算你懂事啦。”',
                  reward: {
                    bond: 30,
                  },
                },
              },
            },
          ],
        },
        {
          name: '夏日合宿的冰沙选择',
          description:
            '在夏日合宿的海边小屋，菜单上只有“黄金海岸冰沙”和“落日海滩冰沙”两种选择。我觉得这两种都太平凡了，配不上我。',
          choices: [
            {
              text: 'A. “算了，黄金海岸听起来比较贵，就它吧。”',
              outcome: {
                success: {
                  description: '我勉为其难地点了黄金海岸冰沙，味道还不错，但总觉得少了点什么。',
                  reward: {
                    stamina: 10,
                  },
                },
              },
            },
            {
              text: 'B. “拖累那亲，你帮我选吧，你的选择就是我的选择。”',
              outcome: {
                success: {
                  description: '你为我选了看起来更浪漫的落日海滩冰沙，我嘴上说着“真没品位”，但还是和你一起喝完了。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'C. “我们把两种都点了，然后混合在一起，创造出新的味道！”',
              outcome: {
                success: {
                  description:
                    '我们把两杯冰沙倒在一起，得到了一杯颜色和味道都非常……奇特的混合物。虽然味道一言难尽，但过程很有趣。',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'D. 直接找到店员，要求他们按照我的设计，用最好的材料给我做一杯“强击夏日超绝限定版”冰沙。',
              outcome: {
                success: {
                  description:
                    '在我的“热情指导”下，店员成功做出了一杯比我专属饮品还要华丽的冰沙。我满意地品尝着，并宣布这是本次合宿最棒的发明。',
                  reward: {
                    bond: 20,
                    motivation: 1,
                  },
                },
              },
            },
          ],
        },
        {
          name: '品尝西野花的纯真',
          description:
            '我们在中庭遇到了西野花，她正开心地吃着她的隐藏料理“胡萝卜·上面·放冰淇淋”，并热情地邀请我们也尝一尝。',
          choices: [
            {
              text: 'A. “哇，看起来好有趣！”欣然接受并和她一起品尝，称赞她的创意。',
              outcome: {
                success: {
                  description: '这奇妙的组合意外地好吃，我和西野花就“甜品的可能性”展开了热烈的讨论，并成了朋友。',
                  reward: {
                    bond: 10,
                    stamina: 5,
                  },
                },
              },
            },
            {
              text: 'B. 礼貌地微笑拒绝：“谢谢你，不过我对甜品的品味是名流级别的，比较挑剔哦。”',
              outcome: {
                success: {
                  description: '西野花有些失望地走开了。我维持住了自己“高品位”的人设，但你似乎觉得我有点太刻薄了。',
                  penalty: {
                    bond: -5,
                  },
                },
              },
            },
            {
              text: 'C. 反过来向她推荐我的专属饮品，并提议交换品尝，进行一场“甜品对决”。',
              outcome: {
                success: {
                  description: '我们进行了一场别开生面的“甜品交换会”。最后结论是：两种都很好吃，平分秋色！',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'D. 看着那道菜，认真地对西野花说：“你的想法很好，但如果把冰淇淋换成酸奶，再加点坚果，营养和口感会更平衡。”',
              outcome: {
                success: {
                  description:
                    '西野花听了你的建议，露出了恍然大悟的表情。我则对你刮目相看：“没想到你还挺懂的嘛，拖累那亲！”',
                  reward: {
                    bond: 10,
                    intelligence: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '食堂里的温柔角落',
          description: '我们在食堂吃饭时，看到米浴正一个人坐在角落，小口地喝着她的“秘汤：极乐净土”，看起来有些孤单。',
          choices: [
            {
              text: 'A. 什么都不说，直接端着我们的餐盘，坐到她的对面去。',
              outcome: {
                success: {
                  description:
                    '米浴被我们的突然加入吓了一跳，但看到我们友善的微笑后，还是小声地说了声“欢迎”。那顿饭，我们四个人（你、我、米浴和她的不安）一起吃完了。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. 小声地让食堂大厨也给我们来一份“秘汤”，然后找个离她不远不近的位置坐下，和她吃一样的午餐。',
              outcome: {
                success: {
                  description:
                    '米浴注意到了我们和她吃着同样的料理，虽然没有过来搭话，但她吃饭的速度似乎比平时快了一些，表情也稍微明朗了一点。',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'C. 我端着我的专属饮品走过去，对她说：“米浴，要不要尝尝我的‘幸运特调’？喝了它，一下午都会有好运气哦！”',
              outcome: {
                success: {
                  description:
                    '米浴怯生生地接过了饮料，小声说了谢谢。看到她喝下饮料后惊讶的表情，我感觉自己做了一件很帅气的事。',
                  reward: {
                    bond: 10,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: 'D. 决定不去打扰她，但拜托食堂大厨，在她的汤里偷偷多加一块她最喜欢的南瓜。',
              outcome: {
                success: {
                  description:
                    '我们远远地看到，米浴在吃到那块多出来的南瓜时，露出了小小的、惊喜的笑容。这是一个只有我们和食堂大厨知道的秘密。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '贤妻良母的初露锋芒',
          description:
            '某天下午，我“突击检查”你的训练员室，看到满地乱放的资料和外卖盒子，好看的眉头立刻皱了起来。“真是的！作为本小姐的王子殿下，住的地方怎么能这么乱七八糟！一点‘名流’的自觉都没有！”',
          choices: [
            {
              text: 'A. “抱歉抱歉，我马上收拾！”',
              outcome: {
                success: {
                  description:
                    '“哼，这还差不多。”我虽然嘴上这么说，但还是会叉着腰，一边“指挥”你，一边忍不住自己动手，最后把你的房间整理得井井有条。',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  }, //学到了整理技巧
                },
              },
            },
            {
              text: 'B. “那你来帮我收拾吧，强击大人。”',
              outcome: {
                success: {
                  description:
                    '“欸？！你、你居然敢命令我……好吧，真拿你没办法！”我嘴上抱怨着，但嘴角却忍不住上扬，然后干劲十足地开始了大扫除，并享受着这种“照顾”你的感觉。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
            {
              text: 'C. “解决这个问题最快的方法，就是全扔了，然后去买一套新的！”',
              outcome: {
                success: {
                  description:
                    '“不愧是我的拖累那亲！这个想法超有品位的！”我们立刻愉快地出门，把你的房间从家具到牙刷都换成了我挑选的“名流”品牌。',
                  reward: {
                    bond: 20,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: 'D. “嗯……那我明天会提交一份‘训练员室生活品质提升方案’给你审阅。”',
              outcome: {
                success: {
                  description:
                    '“方案？听起来好正式……不过，好吧！”第二天，我真的收到了一份你的方案，并且在上面用红笔写满了“修改意见”，乐在其中。',
                  reward: {
                    bond: 10,
                    intelligence: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '体重焦虑与购物疗法',
          description:
            '早上量完体重后，发现指针有那么一丁点的偏移。虽然在你看来毫无变化，但我一整天都闷闷不乐。最后，我拉着你的手臂撒娇：“拖累那亲~我需要补充‘悸动能量’！陪我去购物啦！”',
          choices: [
            {
              text: 'A. “只是误差而已，你已经很完美了。”',
              outcome: {
                success: {
                  description:
                    '“真的吗？你真的这么觉得？”我抬起头，眼睛亮晶晶地看着你。虽然还是有点在意，但你的肯定让我心情好了很多。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. “好吧，去购物。但回来后，训练要加倍哦。”',
              outcome: {
                success: {
                  description:
                    '“成交！这才是我的好拖累那亲！”我立刻恢复了活力，购物时充满干劲，回来后的加倍训练也毫无怨言地完成了。',
                  reward: {
                    bond: 10,
                    power: 5,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'C. “既然心情不好，那我们去买最新款的运动装备吧，把焦虑变成动力！”',
              outcome: {
                success: {
                  description:
                    '“欸？不是买漂亮衣服吗……不过，这个提议听起来也很‘名流’！”我被你的想法说服，买了一身超帅的运动装备，感觉自己又能跑得更快了。',
                  reward: {
                    bond: 15,
                    speed: 5,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: 'D. “我知道一家甜品店，他们的蛋糕好吃到能忘记一切烦恼，我们去试试？”',
              outcome: {
                success: {
                  description:
                    '“用、用甜品来对抗体重增加的焦虑？！你真是个天才（笨蛋）！”我嘴上吐槽，但身体却很诚实地跟你去了甜品店，并立下了“明天开始减肥”的誓言。',
                  reward: {
                    bond: 20,
                    stamina: 10,
                  },
                  penalty: {
                    motivation: -1,
                  }, // 第二天会因为体重问题而干劲下降
                },
              },
            },
          ],
        },
        {
          name: '“名流游戏”的邀请',
          description:
            '一个只有我们两个人的夜晚，我穿着一套略显大胆的丝质睡衣，手里拿着一本看起来很深奥的古书，倚在门框上，用甜得发腻的声音对你说：“呐，王子殿下，我最近在研究一种古代名流之间流传的、能增进感情的‘心跳游戏’，要不要……和我一起实践一下？”',
          choices: [
            {
              text: 'A. “听起来很有趣，是什么样的游戏？”',
              outcome: {
                success: {
                  description:
                    '“哼哼，那我就稍微教你一下吧。”我故作成熟地开始讲解书上的“理论”，但当游戏进行到需要身体接触的步骤时，我自己反而先脸红了。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
            {
              text: 'B. “这又是从哪本地摊文学上看到的？”',
              outcome: {
                success: {
                  description:
                    '“才、才不是地摊文学！这是很珍贵的典籍啦！”我像是被踩到尾巴的猫一样炸毛了，试图维护自己“理论家”的尊严。',
                  penalty: {
                    bond: -5,
                  },
                },
              },
            },
            {
              text: 'C. “强击，你是不是又想找借口偷懒不睡觉了？”',
              outcome: {
                success: {
                  description: '“呜……被你看穿了。”我立刻收起了小恶魔的架势，变回撒娇模式，乖乖地被你赶去睡觉了。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
            {
              text: 'D. 直接走过去，将我横抱起来，轻声说：“游戏明天再玩，现在是‘王子’命令‘公主’睡觉的时间。”',
              outcome: {
                success: {
                  description:
                    '“欸？！等、等等……剧本不是这样的……”我的大脑瞬间宕机，所有的理论知识都飞到了九霄云外，只能满脸通红地被你抱回床上。',
                  reward: {
                    bond: 35,
                  },
                },
              },
            },
          ],
        },
        {
          name: '面对姐姐的话题',
          description:
            '在一次赛后采访中，记者又一次将我和我那两位战绩辉煌的姐姐进行比较。我全程都保持着完美的微笑，得体地回答了所有问题。但回到休息室后，我一个人坐在那里，笑容消失了，只是默默地擦拭着奖杯。',
          choices: [
            {
              text: 'A. “别在意，你是独一无二的。”',
              outcome: {
                success: {
                  description: '“……嗯，我知道。”我低声回答，虽然没有抬头，但紧绷的肩膀稍微放松了一些。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
            {
              text: 'B. “在我心里，你的光芒，从不输给任何人。”',
              outcome: {
                success: {
                  description:
                    '我抬起头，有些惊讶地看着你，随即眼眶一热，小声说：“……谢谢你，トレーナーさん。”（认真地叫了你的称呼）',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'C. “那就用下一场胜利，一场比她们所有胜利都更耀眼的胜利，来证明给他们看。”',
              outcome: {
                success: {
                  description: '“……说得对。”我重新抬起头，眼神中再次燃起了斗志。“下一次，我要让他们只能看到我的名字！”',
                  reward: {
                    bond: 15,
                    motivation: 2,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'D. 什么都不说，只是走过去，从背后轻轻地抱住我。',
              outcome: {
                success: {
                  description:
                    '我身体僵了一下，随即放松下来，把头靠在你的手臂上，沉默了很久。无声的安慰，有时比任何话语都更有力量。',
                  reward: {
                    bond: 30,
                  },
                },
              },
            },
          ],
        },
        {
          name: '瑜伽与身体的秘密',
          description:
            '在活动室，我向你展示我新学会的高难度瑜伽动作，身体的柔韧性让你惊叹。我得意地对你说：“怎么样？本小姐的身体，是不是像艺术品一样完美？”',
          choices: [
            {
              text: 'A. “太厉害了！简直是力与美的结合！”',
              outcome: {
                success: {
                  description: '“耶嘿嘿~算你有眼光！”你的夸奖让我非常受用，并向你展示了更多高难度动作。',
                  reward: {
                    bond: 10,
                    speed: 5,
                  },
                },
              },
            },
            {
              text: 'B. “这个动作，感觉能让末脚的爆发力更强。”',
              outcome: {
                success: {
                  description:
                    '“哦？拖累那亲也看出来了？”我有些惊讶，然后认真地向你解释这个动作如何帮助我放松肌肉，提升柔韧性，为最终冲刺做准备。',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'C. “保持这个姿势别动，有点……性感。”',
              outcome: {
                success: {
                  description:
                    '“欸？！你、你在胡说什么啊！”我瞬间破功，脸颊通红地收回了动作，从一个优雅的瑜伽大师变回了害羞的少女。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'D. “小心别受伤了。”',
              outcome: {
                success: {
                  description:
                    '“放心啦，我对自己身体的掌控可是‘名流’级别的。”我虽然嘴上这么说，但心里还是因为你的关心而感到一阵温暖。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
          ],
        },
        {
          name: '同居的试探',
          description:
            '“拖累那亲，我最近在考虑搬出宿舍，享受更自由的‘名流’生活。”我拿出两份房产宣传单，一份是安保严格的高级公寓，另一份是你家隔壁那栋楼的空房间，然后歪着头问你：“你觉得，哪个地段更适合我？”',
          choices: [
            {
              text: 'A. “当然是高级公寓，安全和私密性对你更重要。”',
              outcome: {
                success: {
                  description: '“嗯，有道理。那周末你陪我去看房吧！”我点点头，将你的建议纳入了考虑范围。',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'B. “住我隔壁？那以后就能天天一起训练，还能顺便蹭饭了。”',
              outcome: {
                success: {
                  description:
                    '“谁、谁要给你蹭饭啊！不过……能随时监督你倒是挺方便的。”我嘴上嫌弃，但明显对这个提议非常心动。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'C. “为什么突然想搬出来？在宿舍住得不开心吗？”',
              outcome: {
                success: {
                  description:
                    '“也不是不开心啦……就是觉得，我们应该有更多只属于两个人的时间嘛。”我避开你的视线，小声地说出了真实想法。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
            {
              text: 'D. “两个都不选。直接搬来和我一起住，房租减半，还能帮你解决不擅长的扫除问题。”',
              outcome: {
                success: {
                  description:
                    '“同、同居？！你、你这个王子也太大胆了吧！”我的脸瞬间红得像苹果，大脑一片空白，完全不知道该如何回应。',
                  reward: {
                    bond: 40,
                  },
                },
              },
            },
          ],
        },
        {
          name: '时尚墨镜的选择',
          description:
            '在精品店里，我一口气试戴了四副不同风格的墨镜，然后像T台模特一样在你面前走了一圈，摆着Pose问：“呐，王子殿下，哪一副最配得上本世纪最闪耀的名流——也就是我呢？”',
          choices: [
            {
              text: 'A. 经典的飞行员款，让你看起来英气十足。',
              outcome: {
                success: {
                  description: '“哼哼，能驾驭这种帅气风格的，也只有我了！”我满意地戴着新墨镜，感觉自己像个超级巨星。',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'B. 夸张的猫眼款，充满了小恶魔的性感魅力。',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~这个超有感觉的！戴上它，感觉连眼神都能勾人了呢！”我对着镜子，得意地朝你眨了眨眼。',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'C. 心形的粉色款，可爱到犯规。',
              outcome: {
                success: {
                  description: '“哇！这个也太可爱了吧！戴上它感觉自己瞬间变回16岁了！”我开心地在镜子前转了好几圈。',
                  reward: {
                    bond: 10,
                    stamina: 5,
                  },
                },
              },
            },
            {
              text: 'D. “都很好看，但我还是觉得，不戴墨镜时，你闪闪发光的眼睛才是最美的。”',
              outcome: {
                success: {
                  description:
                    '“……真是的，拖累那亲最会说这种让人心跳加速的话了。”我摘下墨镜，虽然嘴上抱怨，但脸上的笑容却比任何时候都灿烂。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
          ],
        },
        {
          name: '被轻视的努力',
          description:
            '在训练场边休息时，一位别队的训练员路过，看了一眼我的训练菜单，轻蔑地对他的担当马娘说：“你看，那种享乐主义的马娘能有什么出息。”虽然声音不大，但我清楚地听到了。那一瞬间，我脸上的笑容消失了。',
          choices: [
            {
              text: 'A. 立刻站起来，大声反驳他：“你不懂她的努力，就没资格评价她！”',
              outcome: {
                success: {
                  description:
                    '我惊讶地看着你挺身而出的背影，心里涌上一股暖流。虽然你被对方嘲讽了几句，但在我心里，你此刻的样子比任何人都帅气。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
            {
              text: 'B. 什么都不说，只是默默地握住我放在膝盖上的手。',
              outcome: {
                success: {
                  description:
                    '我感觉到你手心传来的温度，紧绷的身体慢慢放松下来。我回握住你的手，轻声说：“……我们走吧，トレーナーさん。”',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'C. 冷静地对我说：“别理他，我们用下一场比赛的结果，让他闭嘴。”',
              outcome: {
                success: {
                  description: '“……嗯。”我点了点头，重新站起来，眼神变得无比坚定。“我要赢，一定要赢给他看。”',
                  reward: {
                    bond: 15,
                    motivation: 2,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: 'D. 笑着对那个训练员说：“没错，我们就是享乐主义，但我们每次都能赢，气不气？”',
              outcome: {
                success: {
                  description:
                    '我愣了一下，随即被你的回答逗笑了。“噗……哈哈哈！拖累那亲，你真坏！不过，我喜欢！”之前的不快一扫而空。',
                  reward: {
                    bond: 20,
                    intelligence: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '对迪拜的终极幻想',
          description:
            '我们一起看着迪拜的旅游宣传片，当画面定格在帆船酒店最顶级的、可以俯瞰整个城市的总统套房时，我靠在你肩膀上，用充满憧憬的语气问：“呐，拖累那亲，等我们真的实现了梦想，住进了那里……在那里的第一个晚上，你最想……和我做什么？”',
          choices: [
            {
              text: 'A. “去全世界最高的餐厅，为你包场，享受一顿只属于我们的浪漫晚餐。”',
              outcome: {
                success: {
                  description: '“包场……耶嘿嘿，听起来超‘名流’的！我喜欢这个计划！”',
                  reward: {
                    bond: 15,
                    stamina: 5,
                  },
                },
              },
            },
            {
              text: 'B. “在房间的超大落地窗前，一边喝着香槟，一边看整座城市的夜景，直到天亮。”',
              outcome: {
                success: {
                  description: '“……和你一起看夜景直到天亮吗？嗯，听起来……很不错。”',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'C. “当然是拿出赛道图，开始研究第二天的胜利方案，为我们的王朝打下第一块基石。”',
              outcome: {
                success: {
                  description:
                    '“欸？！都到迪拜了还要工作吗？！……不过，如果是为了我们的王朝，那本小姐就勉强陪你一下好了。”',
                  reward: {
                    bond: 10,
                    intelligence: 10,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: 'D. “什么都不做，就和你一起赖在床上，把所有没说完的悄悄话，都说给你听。”',
              outcome: {
                success: {
                  description: '我沉默了很久，然后把脸埋在你肩膀里，用几乎听不见的声音说：“……这个，是最好的。”',
                  reward: {
                    bond: 40,
                  },
                },
              },
            },
          ],
        },
        {
          name: '扫除大作战',
          description:
            '轮到我们负责打扫活动楼的公共休息室，看着满地的狼藉和复杂的扫除工具，我不擅长“扫除”的弱点暴露无遗，拿着拖把不知所措。',
          choices: [
            {
              text: 'A. “强击，你负责指挥，我来动手就行。”',
              outcome: {
                success: {
                  description:
                    '“哼哼，这可是你说的哦！”我立刻进入“指挥官”模式，虽然大部分活都是你干的，但我坚称这是我们“完美配合”的结果。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. “我们来比赛吧！看谁先把自己负责的区域打扫干净！”',
              outcome: {
                success: {
                  description:
                    '“比、比赛？！好！”一提到比赛，我立刻燃起了斗志。虽然动作笨拙，但还是努力地完成了任务，并把你远远甩在身后。',
                  reward: {
                    bond: 10,
                    power: 5,
                  },
                },
              },
            },
            {
              text: 'C. “我来教你，你看，拖把要这样用……”',
              outcome: {
                success: {
                  description:
                    '你耐心地从头教我如何使用各种工具，我学得很认真，最后我们一起把休息室打扫得闪闪发光，像个“名流”的房间。',
                  reward: {
                    bond: 20,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'D. “打扫什么的太麻烦了，我们直接花钱请专业的家政公司来吧！”',
              outcome: {
                success: {
                  description:
                    '“对哦！我怎么没想到！拖累那亲你真是天才！”我立刻拿出手机开始预约，完美地用“名流”的方式解决了问题。',
                  reward: {
                    bond: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '训练菜单的小花招',
          description:
            '你看着我提交的下周训练计划，眉头一挑，因为你发现我偷偷把最累人的长距离冲刺改成了“瑜伽和冥想”。我双手合十，眨着眼睛对你说：“呐呐~拖累那亲，劳逸结合才能跑得更快嘛，对不对？”',
          choices: [
            {
              text: 'A. 严肃地说：“不行，必须改回来。”',
              outcome: {
                success: {
                  description:
                    '“呜……好严格哦。”我立刻鼓起脸颊，不情不愿地拿回计划。虽然计划改回来了，但我一整天都用“怨念”的眼神看着你。',
                  penalty: {
                    bond: -5,
                  },
                },
              },
            },
            {
              text: 'B. “好啊。那我们来打个赌，如果这周比赛你没能入着，下周的训练量就加倍。”',
              outcome: {
                success: {
                  description:
                    '“赌就赌，谁怕谁！我一定会赢的！”我立刻被激起了好胜心，为了证明我的“新理论”，比赛时跑得格外卖力。',
                  reward: {
                    bond: 10,
                    motivation: 2,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: 'C. “可以。那省下来的体力，就用来陪我把训练中心的所有器材都擦一遍吧。”',
              outcome: {
                success: {
                  description:
                    '“欸？！擦器材？我、我最不擅长扫除了啦！”我瞬间慌了神，最后还是乖乖把训练计划改了回来，以逃避扫除的命运。',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'D. 笑着捏了捏我的脸：“小滑头，想偷懒？罚你今天给我捶背一小时。”',
              outcome: {
                success: {
                  description:
                    '“才、才不是偷懒！是战术性调整！呜……好吧好吧，捶就捶嘛……”我嘴上抱怨，但还是乖乖地绕到你身后，用小拳头轻轻地帮你捶背。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '平民美食初体验',
          description:
            '路过一家章鱼小丸子摊，那股香甜酱汁的味道让我瞬间迈不动步子。我拉着你的袖子，用期待的眼神看着你，小声说：“拖累那亲……那个看起来圆滚滚、还会跳舞的东西……好像很好吃的样子……”',
          choices: [
            {
              text: 'A. “那种路边摊不卫生，我们去高级餐厅吃吧。”',
              outcome: {
                success: {
                  description: '“不要嘛！我就想吃那个！”我开始原地撒娇，让你明白“名流的胃”有时也会被平民美食俘虏。',
                  reward: {
                    bond: 5,
                  },
                },
              },
            },
            {
              text: 'B. 立刻去买了一份，用牙签扎起一个，吹凉了递到我嘴边。',
              outcome: {
                success: {
                  description:
                    '“啊——”我下意识地张开嘴吃下，那美妙的味道让我幸福地眯起了眼睛。“好好吃！拖累那亲，你也吃！”我学着你的样子，也喂了你一个。',
                  reward: {
                    bond: 20,
                    stamina: 5,
                  },
                },
              },
            },
            {
              text: 'C. “想吃可以，但你要自己去跟老板说‘老板，一份章鱼小丸子，多加木鱼花和海苔’。”',
              outcome: {
                success: {
                  description:
                    '“欸？！要、要我自己去点吗？”我有些紧张，但在你的鼓励下，还是成功完成了“人生第一次路边摊点单”的挑战，感觉超有成就感！',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'D. “这个我也会做，我们去超市买材料，回去我做给你吃，想加多少料都可以。”',
              outcome: {
                success: {
                  description:
                    '“真的吗？！拖累那亲好厉害！那我要加双倍的芝士和章鱼！”我们一起逛超市，像一对普通的小情侣一样，充满了新鲜感和乐趣。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
          ],
        },
        {
          name: '恶作剧之吻',
          description:
            '在你坐在沙发上专心致志地分析比赛录像时，我像一只小猫一样悄无声息地凑到你身后，飞快地在你脸颊上亲了一下，然后立刻像受惊的兔子一样跳开，躲在门后探出半个脑袋，对你做了个鬼脸。',
          choices: [
            {
              text: 'A. 愣在原地，下意识地摸了摸脸颊，满脸通红。',
              outcome: {
                success: {
                  description: '“耶嘿嘿~拖累那亲的脸红了，好可爱！”看到你的反应，我的恶作剧大成功，一整天心情都很好。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. 假装生气地站起来：“好啊你，敢偷袭我！看我怎么抓住你！”',
              outcome: {
                success: {
                  description: '“啊！救命啊！”我尖叫着在房间里跑来跑去，最后被你抓住，我们在打闹中笑作一团。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'C. 叹了口气，冷静地说：“强击，别闹了，我在看很重要的部分。”',
              outcome: {
                success: {
                  description:
                    '“……切，真无聊。”看到你完全没反应，我感觉很没趣，只好乖乖地坐到一边，但会时不时地戳戳你的后背以示抗议。',
                  penalty: {
                    bond: -5,
                  },
                },
              },
            },
            {
              text: 'D. 头也不回地说：“偷袭可不算哦。下次，要从正面来。”',
              outcome: {
                success: {
                  description:
                    '“欸？！从、从正面……你、你这个笨蛋王子在想什么啊！”我被你的“反杀”弄得措手不及，瞬间从主动方变成了害羞的被动方。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
          ],
        },
        {
          name: '模拟采访游戏',
          description:
            '在休息室里，我拿起一根胡萝卜当作话筒，煞有介事地递到你嘴边，模仿着记者的腔调问：“请问这位传说中的训练员先生，能培养出强击这样天才又可爱的赛马娘，您现在有何感想？是不是感觉三生有幸？”',
          choices: [
            {
              text: 'A. 非常配合地回答：“是的，能成为她的担当，是我这辈子最大的荣幸。”',
              outcome: {
                success: {
                  description: '“嗯嗯，回答得很好，很有前途！”我对你的回答非常满意，并把“话筒”奖励给了你。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. 一把抢过胡萝卜，反过来采访我：“请问强击选手，你为什么这么可爱，是不是吃可爱长大的？”',
              outcome: {
                success: {
                  description:
                    '“欸？！你、你犯规！哪有记者反过来采访的！我、我拒绝回答这个问题！”我被你的直球攻击弄得脸红心跳。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'C. “我的感想是，你再把胡萝卜杵我脸上，它就要被我吃掉了。”',
              outcome: {
                success: {
                  description: '“啊！不许吃我的话筒！”我赶紧把胡萝卜收回来，像保护宝贝一样抱在怀里。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
            {
              text: 'D. 看着胡萝卜，认真地说：“嗯，这个品种的胡萝卜色泽饱满，看来今天的食堂补给很充足。”',
              outcome: {
                success: {
                  description: '“谁在问你这个啊！你这个不解风情的拖累那亲！”我被你牛头不对马嘴的回答气得跳脚。',
                  reward: {
                    bond: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '吃醋的可爱方式',
          description:
            '你因为耐心地指导一位可爱的后辈马娘而比平时晚回来了一个小时。当你打开训练员室的门，发现我正抱着一个大大的胡萝卜抱枕，盘腿坐在你的椅子上，一言不发地盯着门口。',
          choices: [
            {
              text: 'A. “强击？你怎么在这里？有什么事吗？”',
              outcome: {
                success: {
                  description: '“哼。”我把头扭到一边，不看你。虽然不说话，但浑身都散发着“我在生气”的气场。',
                  reward: {
                    bond: 5,
                  },
                },
              },
            },
            {
              text: 'B. 立刻双手合十道歉：“对不起！让你久等了！我保证没有下次了！”',
              outcome: {
                success: {
                  description: '“……知道错了就好。”听到你的道歉，我的气消了一半，但还是会让你哄我一会儿才肯罢休。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'C. 笑着走过去，揉了揉我的头：“怎么了，我们的小醋坛子翻了？”',
              outcome: {
                success: {
                  description:
                    '“谁、谁是醋坛子啊！我只是……只是在这里等你回来商量明天的训练而已！”我嘴硬地反驳，但泛红的耳朵出卖了我。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'D. “正好，我从食堂带了你最爱吃的草莓蛋糕，本来想当宵夜的……”',
              outcome: {
                success: {
                  description:
                    '我的耳朵立刻竖了起来，眼睛也亮了。“蛋、蛋糕？！”我所有的不满瞬间被抛到了九霄云外，立刻从椅子上跳下来，围着你打转。',
                  reward: {
                    bond: 25,
                    stamina: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '“不小心”弄脏你的衣服',
          description:
            '我们并排走在路上，我一边走一边开心地吃着甜筒。突然，我像是被什么东西绊了一下，“哎呀”一声，一小块奶油“不偏不倚”地蹭到了你干净的T恤上。',
          choices: [
            {
              text: 'A. “没事吧？有没有摔到？”',
              outcome: {
                success: {
                  description: '“我没事啦……可是，你的衣服……”我低下头，装出非常内疚的样子，但眼角的笑意却藏不住。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. 叹了口气：“真是的，你啊……”然后拿出纸巾帮我擦嘴角的奶油。',
              outcome: {
                success: {
                  description: '你无奈又宠溺的样子让我觉得很有趣，我乖乖地让你擦，享受着这份特别的照顾。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'C. 低头看了看衣服上的奶油，然后伸出手指，把它刮下来，放进自己嘴里。',
              outcome: {
                success: {
                  description: '“欸欸欸？！”你的举动让我大吃一惊，脸颊瞬间爆红，连冰淇淋都忘了吃。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
            {
              text: 'D. 看着我，挑了挑眉：“你是故意的吧？”',
              outcome: {
                success: {
                  description:
                    '“才、才不是！是意外啦意外！”我赶紧摇头否认，但闪烁的眼神暴露了我的小九九。被你看穿了，真没劲。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '比赛的“无理”要求',
          description:
            '在一场重要比赛开始前，我突然拉住你，小声说：“呐，拖累那亲，如果这场比赛我拿了一着，作为奖励，你就要……亲我一下哦！”',
          choices: [
            {
              text: 'A. “好，一言为定。”',
              outcome: {
                success: {
                  description: '“耶嘿嘿~”得到了你的承诺，我充满了干劲，比赛时仿佛脚下生风，为了那个“奖励”而全力冲刺。',
                  reward: {
                    bond: 20,
                    motivation: 2,
                  },
                },
              },
            },
            {
              text: 'B. “那如果你没拿到一着呢？”',
              outcome: {
                success: {
                  description: '“那……那我就亲你一下好了！”我理直气壮地回答，反正怎么算都是我占便宜。',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'C. “等你拿到冠军再说吧。”',
              outcome: {
                success: {
                  description:
                    '“切，真没意思。好吧好吧，那你就等着看本小姐的精彩表现吧！”我虽然有些失望，但还是把这当成了新的动力。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
            {
              text: 'D. 不回答，只是在我额头上轻轻吻了一下：“这是预付的定金，去吧，我的冠军。”',
              outcome: {
                success: {
                  description:
                    '我的大脑一片空白，愣在原地好几秒才反应过来，脸上是抑制不住的、傻瓜一样的笑容。那场比赛，我感觉自己像是飞起来一样。',
                  reward: {
                    bond: 35,
                    motivation: 3,
                  },
                },
              },
            },
          ],
        },
        {
          name: '帮忙挑选领带',
          description:
            '第二天你要去参加一场重要的训练员会议，我自告奋勇地冲进你的房间，宣布：“王子殿下的形象就由我来守护！今天的领带，本小姐亲自为你挑选！”',
          choices: [
            {
              text: 'A. 让她随便挑一条，反正都差不多。',
              outcome: {
                success: {
                  description:
                    '我像模像样地挑选了一条我认为最“名流”的领带，虽然和你平时的风格不太搭，但我对自己的品味非常自信。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
            {
              text: 'B. “好啊，那你帮我挑一条，然后亲手为我系上吧。”',
              outcome: {
                success: {
                  description:
                    '“系、系领带吗？包在我身上！”我嘴上说得轻松，但真的动手时却手忙脚乱，最后把领带系成了一个奇怪的蝴蝶结，我们俩都笑了。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'C. 拿出一红一蓝两条领带：“你觉得，哪条更能凸显我的帅气？”',
              outcome: {
                success: {
                  description:
                    '“嗯……”我像个小专家一样煞有介事地比划了半天，最后给出了专业的意见，感觉自己像个真正的造型师。',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'D. 笑着拒绝：“谢谢你，不过今天的场合很重要，还是我自己来吧。”',
              outcome: {
                success: {
                  description:
                    '“……哼，不相信我的品味吗？”我有些不高兴，但还是承认你说的有道理，只是会坐在一旁，对你自己的选择评头论足。',
                  penalty: {
                    bond: -5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '雨天的“相合伞”',
          description:
            '训练结束时突然下起了倾盆大雨，而我们两个人只有一把小小的折叠伞。我看着外面的雨幕，然后期待地看向你。',
          choices: [
            {
              text: 'A. 把伞完全倾向我这边，自己大半个身子都露在外面。',
              outcome: {
                success: {
                  description:
                    '“喂！你都淋湿了啦，笨蛋！”我嘴上骂着，却悄悄地把伞往你那边推，我们在伞下推来推去，最后两个人都湿了半边。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. 果断地把我拉进怀里，用手臂圈住我，让我们紧紧地贴在一起共撑一把伞。',
              outcome: {
                success: {
                  description: '我能清楚地听到你的心跳声，脸颊烫得能煎鸡蛋，只能把头埋在你胸口，假装在看路。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
            {
              text: 'C. “我背你吧，这样跑得快一点！”',
              outcome: {
                success: {
                  description:
                    '“欸？背我？”我虽然觉得有点害羞，但还是趴到了你宽阔的背上。雨点打在伞上，世界仿佛只剩下我们两个人。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'D. 脱下自己的外套，披在我头上，然后拉着我的手说：“跑！”',
              outcome: {
                success: {
                  description: '我们像电影主角一样在雨中狂奔，虽然浑身湿透，狼狈不堪，但却笑得比任何时候都开心。',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '赢不了的比赛',
          description:
            '在泳池边，我提议和你比赛闭气，并定下“输的人要答应赢的人一个要求”的赌约。但身为马娘的我，肺活量远超于你。',
          choices: [
            {
              text: 'A. 明知会输，但还是认真地接受了挑战。',
              outcome: {
                success: {
                  description:
                    '看着你憋得满脸通红的样子，我很快就忍不住笑出了声，提前浮出了水面。“好啦好啦，算我输了，你这个样子太好笑了！”',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. “这不公平，我怎么可能赢得了你。”',
              outcome: {
                success: {
                  description: '“耶嘿嘿~现在才知道吗？晚了！快点开始吧！”我完全不讲道理，享受着这种“欺负”你的乐趣。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
            {
              text: 'C. 在我潜入水下后，偷偷用手捏我的鼻子。',
              outcome: {
                success: {
                  description:
                    '“噗哈！你、你犯规！”我被你的小动作弄得瞬间破功，浮出水面大口喘气，然后笑着和你打起了水仗。',
                  reward: {
                    bond: 20,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'D. “好啊，如果我输了，就答应你一个要求。但如果我赢了……你就把上次偷拍我的照片删掉。”',
              outcome: {
                success: {
                  description:
                    '“欸？！那张照片那么可爱，才不要删！”为了保住那张珍贵的照片，我只好“勉为其难”地在这场比赛中输给了你。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
          ],
        },
        {
          name: '与皇帝的茶会',
          description:
            '因为我最近“过于自由奔放”的学园生活作风（比如在中央广场的喷泉里开派对），学生会长鲁道夫象征特地邀请你我进行了一次“非正式谈话”。她姿态威严，语气沉稳地说：“强击，你的才能毋庸置疑，但过于随性的行为可能会影响到特雷森的整体风纪。作为赛马娘的表率，我希望你能更……”',
          choices: [
            {
              text: 'A. 打断她：“会长你总是这么严肃，会找不到男朋友的哦？”',
              outcome: {
                success: {
                  description:
                    '鲁道夫瞬间语塞，那张万年不变的扑克脸出现了些微裂痕，想好的说教完全被打乱了。她最后只是叹了口气，说：“……下次，请不要在喷泉里用洗发水。”',
                  reward: {
                    bond: 15,
                    intelligence: 10,
                  },
                },
              },
            },
            {
              text: 'B. “皇帝陛下的教诲，我明白了。但是，让大家都能发自内心地笑出来，不也是一种‘风纪’吗？”',
              outcome: {
                success: {
                  description:
                    '鲁道夫愣住了，似乎在思考我的话。过了一会儿，她露出了一个罕见的、浅浅的微笑：“……你说的，或许也有道理。但下次开派对，记得提交活动申请。”',
                  reward: {
                    bond: 20,
                    intelligence: 15,
                  },
                },
              },
            },
            {
              text: 'C. “遵命，会长大人！为了表达我的歉意，下次我会在你的办公室举办一场更盛大的派对，只邀请你一个人！”',
              outcome: {
                success: {
                  description:
                    '“……我不是那个意思。”鲁道夫的表情变得非常困扰，完全不知道该如何回应我这“小恶魔”式的道歉。',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'D. 拿出手机，打开我的粉丝主页：“会长你看，我的粉丝们都很喜欢我这样做哦！这叫‘亲民’！”',
              outcome: {
                success: {
                  description:
                    '鲁道夫看着评论区一片“强击酱超可爱”的留言，陷入了长久的沉默。她似乎开始怀疑自己坚持的“威严”路线是不是正确的。',
                  reward: {
                    bond: 10,
                    motivation: 1,
                  },
                },
              },
            },
          ],
        },
        {
          name: '最后一块蒙布朗',
          description:
            '在食堂，我正准备拿下今天最后一块、也是我最爱的限量版蒙布朗蛋糕时，另一只手也伸了过来——是目白麦昆。她眼神执着，带着语气说：“抱歉，这块蛋糕，对于维持我今天下午训练心情的稳定至关重要。”',
          choices: [
            {
              text: 'A. “先到先得可是基本礼仪哦，目白家的大小姐。”',
              outcome: {
                success: {
                  description:
                    '麦昆被我的话噎了一下，但还是坚持着。我们两个为了这块蛋糕，用眼神进行了长达一分钟的激烈交锋，最后被食堂大妈以“再不决定就收摊了”为由强行平分。',
                  reward: {
                    bond: 5,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: 'B. “欸~这么巧，它对于我今天的‘悸动指数’也至关重要呢！”',
              outcome: {
                success: {
                  description:
                    '“悸动指数？”麦昆对我的理论感到了困惑。我趁机向她宣传我的“快乐至上主义”，并提议用猜拳决定蛋糕归属，最后我“运气很好”地赢了。',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'C. “好吧好吧，让给你啦！不过，作为交换，我来帮你制定明天的‘必瘦训练菜单’吧？绝对有效哦~♪”',
              outcome: {
                success: {
                  description:
                    '我的话让麦昆的表情从渴望变成了警惕，她犹豫再三，最终还是觉得蛋糕的诱惑更大一些，含泪接受了我的“魔鬼交易”。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'D. 我拿起蛋糕，当着她的面，把最上面那颗最甜的栗子吃掉，然后把剩下的推给她：“喏，最精华的部分我尝过了，剩下的就给你这位‘天皇赏马娘’吧。”',
              outcome: {
                success: {
                  description:
                    '麦昆看着那块缺了角的蛋糕，气得浑身发抖，但又没办法对我发作。我则享受着她那副想吃又吃不下的可爱表情。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '与黄金船的遭遇战',
          description:
            '在进行冲刺训练时，赛道上突然出现了一个由渔网和炒面摊组成的“路障”，黄金船站在后面，对我大喊：“想过去吗？那就先陪阿船我玩一场‘即兴荒野求生’吧！”',
          choices: [
            {
              text: 'A. 停下来，和她理论：“快把路障移开！你这是在妨碍训练！”',
              outcome: {
                success: {
                  description:
                    '黄金船完全不理会我的抗议，反而开始表演“被外星人附体”，最后我们两个因为在训练场上追逐打闹，一起被骏川小姐训话了。',
                  penalty: {
                    bond: -5,
                  },
                },
              },
            },
            {
              text: 'B. “好啊！但是赌注是你的炒面摊！我赢了它就归我！”',
              outcome: {
                success: {
                  description:
                    '“哦？有意思！”黄金船接受了我的挑战。我们进行了一场莫名其妙的“荒野求生”对决（比如比赛谁先用树枝钓到池塘里的塑料袋），玩得不亦乐乎。',
                  reward: {
                    bond: 15,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: 'C. 无视她，直接发挥马娘的力量，从路障旁边一跃而过。',
              outcome: {
                success: {
                  description:
                    '“哇哦！不错嘛！”黄金船对我展现出的实力发出了赞叹，并宣布我通过了她的“第一关考验”，下次会准备更厉害的路障。',
                  reward: {
                    bond: 10,
                    power: 5,
                  },
                },
              },
            },
            {
              text: 'D. 我拿出手机，对着她和路障开始录像，并配上解说：“特雷森奇闻录！惊现传说中的‘炒面海怪’袭击赛道！各位粉丝快来看啊！”',
              outcome: {
                success: {
                  description:
                    '黄金船看到我开始录像，非但没有收敛，反而更来劲了，开始表演“海怪的咆哮”。这段视频后来在校园网上火了，我们俩都成了传说。',
                  reward: {
                    bond: 20,
                    intelligence: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '霸王的影子',
          description:
            '你让我观看“世纪末霸王”好歌剧的比赛录像，学习他的跑法。看着录像里那个在赛场上如同戏剧主角般、享受着所有目光和欢呼的华丽身影，我托着下巴，说：',
          choices: [
            {
              text: 'A. “哇！他好帅！好闪亮！我也要像他一样，成为赛场上独一无二的主角！”',
              outcome: {
                success: {
                  description:
                    '我被好歌剧的表演型跑法深深吸引，开始在训练中有意识地模仿他那种华丽而充满自信的动作，并乐在其中。',
                  reward: {
                    bond: 10,
                    motivation: 1,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'B. “哼，虽然很华丽，但感觉有点太刻意了。本小姐的‘闪亮’，可是从内而外、浑然天成的哦！”',
              outcome: {
                success: {
                  description:
                    '我虽然承认他的强大，但对他那种“表演”的风格不以为然，更加坚定了自己“追求纯粹悸动”的跑法才是最强的。',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'C. “……感觉，他好像很开心的样子。在那么多人的注视下跑步，真的能那么开心吗？”',
              outcome: {
                success: {
                  description: '我似乎从好歌剧的身上，看到了一种与我不同的、对“舞台”的纯粹热爱，这让我陷入了思考。',
                  reward: {
                    bond: 15,
                    intelligence: 10,
                  },
                },
              },
            },
            {
              text: 'D. “拖累那亲，你觉得……我和他，谁更能让你心跳加速？”',
              outcome: {
                success: {
                  description:
                    '我突然把问题抛给你，眼神里带着期待和些微的挑战。对我来说，你的看法比任何霸王的评价都重要。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
          ],
        },
        {
          name: '败北后的相遇',
          description:
            '在日本德比中，经过激烈的冲刺比拼，我以鼻差惜败于同期的强者北部玄驹。在返回休息室的通道里，我们迎面相遇。她向我伸出手，真诚地说：“很棒的比赛，强击。下一次，我还会全力以赴的。”',
          choices: [
            {
              text: 'A. 握住她的手，笑着说：“下次赢的人，一定会是我。”',
              outcome: {
                success: {
                  description:
                    '我们相视一笑，惺惺相惜。虽然是对手，但此刻我们都从对方身上感受到了纯粹的敬意。我的斗志被再次点燃。',
                  reward: {
                    bond: 10,
                    guts: 15,
                    motivation: 2,
                  },
                },
              },
            },
            {
              text: 'B. 无视她伸出的手，直接从她身边走过，冷冷地说：“我不需要败者的安慰。”',
              outcome: {
                success: {
                  description: '我用冰冷的态度掩饰内心的不甘。虽然这样做很没风度，但此刻我只想一个人静一静。',
                  penalty: {
                    bond: -5,
                    motivation: -1,
                  },
                },
              },
            },
            {
              text: 'C. “哼，你只是运气好而已！下次我一定把你甩开三个马身！”',
              outcome: {
                success: {
                  description: '我用小恶魔式的嘴硬来回应。北部玄驹愣了一下，随即无奈地笑了，似乎已经习惯了我这种风格。',
                  reward: {
                    bond: 5,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'D. “嗯……”我低下头，小声地回应，然后迅速跑开，不想让她看到我泛红的眼眶。',
              outcome: {
                success: {
                  description: '这是我第一次在赛场上，感受到如此强烈的不甘和失落。这份败北的经历，让我更加渴望胜利。',
                  reward: {
                    bond: 15,
                    guts: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '来自『皇帝』的视线',
          description:
            '在一次公开训练课上，我注意到学生会长鲁道夫象征正在场边观察，她的视线似乎一直停留在我身上。训练结束后，她找到我，说：“我看完了你所有的比赛录像。你的跑法……很有趣，充满了‘可能性’。”',
          choices: [
            {
              text: 'A. “那是当然的啦！本小姐的跑法，可是为了创造奇迹而生的！”',
              outcome: {
                success: {
                  description: '我得意地叉着腰。鲁道夫点了点头：“很好。我很期待，看到你的‘可能性’究竟能抵达何方。”',
                  reward: {
                    bond: 10,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: 'B. “被皇帝陛下这么夸奖，我可是会骄傲的哦？”',
              outcome: {
                success: {
                  description: '“骄傲，有时也是前进的动力。”鲁道夫的回答出乎我的意料。“但不要让它变成自满的枷锁。”',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'C. “那，皇帝陛下是想和我比一场吗？看看是你的‘王道’更强，还是我的‘邪道’更有趣。”',
              outcome: {
                success: {
                  description:
                    '鲁道夫的眼中闪过些微锐利的光芒：“如果有机会，我很乐意奉陪。”一股无形的火花在我们之间迸发。',
                  reward: {
                    bond: 15,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: 'D. “欸~会长你一直在偷看我训练吗？真是个‘跟踪狂’呢~”',
              outcome: {
                success: {
                  description:
                    '“咳……我只是在进行例行的巡视。”鲁道夫立刻撇过头，试图掩饰自己的不自然，但微微泛红的耳根出卖了她。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '懒散天才的邀请',
          description:
            '在一次枯燥的基础耐力训练中，青云天空突然出现在我身边，懒洋洋地说：“喂~强击酱，你看今天天气这么好，在这里绕圈圈多浪费啊。不如跟我去河边钓鱼吧？听说那里的鱼，都特别有‘悸动’的感觉哦。”',
          choices: [
            {
              text: 'A. “好啊好啊！钓鱼听起来比跑步有趣多了！”',
              outcome: {
                success: {
                  description:
                    '我们两个成功翘掉了训练，在河边度过了一个悠闲（但一条鱼都没钓到）的下午。虽然很开心，但第二天的训练你会感觉体力有点跟不上。',
                  reward: {
                    bond: 15,
                  },
                  penalty: {
                    stamina: -10,
                  },
                },
              },
            },
            {
              text: 'B. “不要，我要成为最闪亮的，才不能像你一样偷懒。”',
              outcome: {
                success: {
                  description:
                    '“欸~真无聊。”青云天空打了个哈欠，自顾自地走掉了。我虽然坚持了训练，但心里总觉得好像错过了什么有趣的事情。',
                  reward: {
                    bond: -5,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'C. “钓鱼？可以啊。但是我们来比赛，谁先钓到鱼，谁就赢了。输的人，要请客吃豪华芭菲！”',
              outcome: {
                success: {
                  description:
                    '“比赛？有意思。”青云天空的眼睛亮了一下。我们把偷懒变成了另一场胜负，结果在傍晚时，她用一根草钓上来一只小龙虾，赢得了比赛。',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'D. “可以是可以，但是要拉上拖累那亲一起！他看起来好像也需要放松一下呢！”',
              outcome: {
                success: {
                  description:
                    '最后，变成了我们三个人一起在河边发呆。虽然这让青云天空“二人世界”的计划泡汤了，但对我来说，只要有你在，哪里都很有趣。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '笨拙的不屈',
          description:
            '深夜，你路过训练场，看到名将怒涛还在那里独自加练。她一次又一次地摔倒，又一次又一次地爬起来，嘴里还念叨着“对不起，我又搞砸了”。你身边的我，停下了脚步，一直沉默地看着。',
          choices: [
            {
              text: 'A. 我走上前，递给她一瓶运动饮料：“喂，笨蛋，别练了，再练下去就要受伤了。”',
              outcome: {
                success: {
                  description:
                    '名将怒涛被我吓了一跳，接过饮料，结结巴巴地道谢。我虽然语气不善，但还是等她收拾好东西，才和你们一起离开。',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'B. “……真是个不华丽的家伙。”我小声地评论了一句，然后拉着你离开了。',
              outcome: {
                success: {
                  description: '我似乎对这种“难看”的努力方式不太能理解，觉得既不闪亮，也不让人心动。',
                  penalty: {
                    bond: -5,
                  },
                },
              },
            },
            {
              text: 'C. 我什么也没说，只是在第二天训练时，“不经意”地把我的“独家肌肉放松秘籍”丢在了名将怒涛的储物柜前。',
              outcome: {
                success: {
                  description:
                    '这是一种我独有的小恶魔式的温柔。我永远不会承认自己是在帮她，只会说“啊，可能是我不小心掉了吧”。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'D. 我对你说：“呐，拖累那亲，她……是不是和我有点像？害怕自己不够好，害怕让别人失望……”',
              outcome: {
                success: {
                  description:
                    '在那个笨拙的身影上，我似乎看到了自己内心深处隐藏的、不想被人知道的脆弱一面，神情变得有些复杂。',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
          ],
        },
        {
          name: '樱花女王的威压',
          description:
            '在樱花赏的赛前记者会上，我和另一位夺冠大热门——拥有压倒性速度的无声铃鹿并排而坐。她全程几乎没有说话，只是安静地坐在那里，但那股纯粹到极致的、只想“向着前方奔跑”的气场，却让整个会场都感到一种无形的压力。',
          choices: [
            {
              text: 'A. 我试图用俏皮话活跃气氛：“铃鹿小姐一直不说话，是在积攒逃跑的力气吗？”',
              outcome: {
                success: {
                  description:
                    '无声铃鹿只是看了我一眼，没有回答，但那眼神让我感觉到，她和我是完全不同次元的生物。我的玩笑第一次没能起到任何作用。',
                  reward: {
                    bond: 5,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'B. “哼，本小姐的‘闪亮气场’可不会输给你！”我在心里暗暗和她较劲。',
              outcome: {
                success: {
                  description:
                    '我努力地散发出自己的气场，试图与她抗衡。虽然外人看不出来，但这已经是一场看不见硝烟的战争。',
                  reward: {
                    motivation: 1,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: 'C. 我被她的气场所影响，也不由自主地变得安静下来，认真思考着比赛的策略。',
              outcome: {
                success: {
                  description: '我第一次感受到，原来“强大”还可以是这种形态。这让我对“胜利”的理解又多了一层。',
                  reward: {
                    bond: 10,
                    intelligence: 10,
                  },
                },
              },
            },
            {
              text: 'D. 我小声对你嘀咕：“呐，拖累那亲，她是不是机器人啊？感觉一点‘悸动’都没有。”',
              outcome: {
                success: {
                  description:
                    '你摇了摇头，告诉我那是一种将自身完全献给“速度”的、纯粹的求道者的姿态。我似懂非懂地点了点头。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '女王对决·秋华赏',
          description:
            '这里是决定三冠女王归属的最终战——秋华赏。赛场上，几乎所有黄金世代的强者都齐聚一堂。在闸门后，我能感受到四面八方传来的、混杂着战意与决心的视线。最后的时刻来临了。',
          choices: [
            {
              text: 'A. “拖累那亲，今天，就让他们见识一下，什么才是真正的‘主角光环’吧！”',
              outcome: {
                success: {
                  description:
                    '我在赛前宣言中，用最自信、最闪亮的姿态，向所有人宣告了我的女王地位。这一刻，我不是任何人的妹妹，我就是强击。',
                  reward: {
                    motivation: 3,
                    guts: 15,
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. “……有点紧张呢。呐，把你的手给我，只要握着你的手，我就什么都不怕了。”',
              outcome: {
                success: {
                  description:
                    '在大战面前，我难得地向你展露了脆弱。你握住我的手，将力量传递给我，让我重新找回了平静与勇气。',
                  reward: {
                    bond: 25,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: 'C. “耶嘿嘿~感觉像一场盛大的派对呢！主角当然是我，而她们，都是来为我庆祝加冕的嘉宾！”',
              outcome: {
                success: {
                  description:
                    '我用自己独特的“派对理论”消解了紧张的气氛，将这场决定命运的死斗，重新定义成了一场属于我的狂欢节。',
                  reward: {
                    bond: 10,
                    intelligence: 10,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: 'D. 我闭上眼睛，屏蔽了所有杂音，脑海里只回想着我们一起度过的点点滴滴——从迪拜的约定，到每一次的训练和吵闹。最后，我睁开眼，对你露出一个微笑。',
              outcome: {
                success: {
                  description: '无需多言，你就是我全部的力量与勇气。为了你，我将在此加冕为王。',
                  reward: {
                    bond: 30,
                    motivation: 2,
                  },
                },
              },
            },
          ],
        },
        {
          name: '测定不能的体重计',
          description:
            '在保健室，我们正好撞见黄金船一拳打碎了体重计，然后大笑着宣布：“体重这种东西，是束缚不了小金船的！”一旁的富士奇石前辈正头痛地扶着额头。',
          choices: [
            {
              text: 'A. 拿出手机拍照：“决定了！今天的校园头条就是‘特雷森力量传说！黄金船前辈一击击碎迷惘！’听起来超帅的！”',
              outcome: {
                success: {
                  description: '黄金船听到我的“正面报道”，立刻摆出更夸张的胜利姿势。这张照片后来真的成了校园传说。',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'B. “普通的体重计承受不住大家的热情呢。拖累那亲，我们以个人名义捐赠一个镶钻的体重计吧！闪闪发光的，大家站上去心情都会变好吧？”',
              outcome: {
                success: {
                  description: '富士奇石露出了“饶了我吧”的表情，而你则开始认真计算购买镶钻体重计是否会超出预算。',
                  reward: {
                    bond: 10,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: 'C. 对黄金船说：“哇！黄金船前辈的气势，连机器都害怕了呢！这难道就是传说中的‘霸气’吗？”',
              outcome: {
                success: {
                  description: '“哦？有眼光！”黄金船似乎对我的说法很满意，开始向我传授她那套不存在的“霸气修炼法”。',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'D. 挽住你的胳膊：“拖累那亲~还好有你帮我管理，不然我可能也会因为热情过度而弄坏东西呢。所以你要一直看着我哦！”',
              outcome: {
                success: {
                  description: '我巧妙地把黄金船前辈的破坏行为，变成了向你撒娇和请求监督的绝佳机会。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '风度与食欲的战争',
          description:
            '在甜品店，我们看到目白麦昆正对着一块草莓蛋糕进行着激烈的思想斗争，嘴里还念叨着：“不行，麦昆……为了目白家的荣耀……卡路里是敌人……”',
          choices: [
            {
              text: 'A. 我端着双倍奶油的芭菲坐到她对面：“麦昆小姐，甜品就是要趁着‘想吃’的心情吃掉，才能转化为最大的‘悸动’能量哦！”',
              outcome: {
                success: {
                  description:
                    '我的话语和芭菲的香气成了压垮骆驼的最后一根稻草。麦昆含泪点了一份同样的芭菲，并宣布明天训练加倍。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. “麦昆小姐，这块蛋糕看起来充满了‘背叛’的甜蜜悸动呢，要不要和我一起，体验一下这‘堕落’的滋味？”',
              outcome: {
                success: {
                  description: '麦昆被我这种小恶魔般的邀请说得脸一红，虽然嘴上说着“不、不合体统！”，但眼神明显动摇了。',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'C. “服务员，请把这块蛋糕也包起来。麦昆小姐，我们去一个没有‘荣耀’和‘卡路里’的地方，只享受美味，怎么样？”',
              outcome: {
                success: {
                  description: '我提议去天台享受“秘密的下午茶”。麦昆犹豫再三，最终还是同意了这个充满“共犯”感觉的邀请。',
                  reward: {
                    bond: 15,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: 'D. 对你小声说：“拖累那亲你看，她好可爱。快，你去把那块蛋糕买下来喂给我吃，让她看看什么叫‘幸福’的表情。”',
              outcome: {
                success: {
                  description: '在你无奈的眼神中，我成功上演了一场“甜蜜的胜利”，麦昆则气鼓鼓地别过头，假装没看见。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '女帝的闪光灯禁令',
          description:
            '在走廊里，气槽副会长正在严肃地训斥一个偷拍的记者，她的气场强大到周围的空气都仿佛凝固了。她冷冷地说：“我再说一遍，在学园内，禁止使用闪光灯！”',
          choices: [
            {
              text: 'A. 我打开手机的手电筒功能，照向她的脸：“副会长，是说这种光吗？我只是想帮您打个光，这样您的威严会更闪亮哦！”',
              outcome: {
                success: {
                  description: '气槽的额头爆出了青筋，但面对我这“无害”的恶作剧，她一时间竟找不到训斥的理由。',
                  reward: {
                    bond: 10,
                    guts: 15,
                  },
                },
              },
            },
            {
              text: 'B. “副会长大人~这么凶会吓到后辈的哦。对待无礼之徒，应该用更‘优雅’的方式让他认识到错误。”',
              outcome: {
                success: {
                  description:
                    '气槽皱着眉看着我：“比如？”我微笑着回答：“比如，邀请他来参加学生会的茶话会，让他写一万字的‘论肖像权的重要性’的报告呀。”气槽陷入了沉思。',
                  reward: {
                    bond: 15,
                    intelligence: 10,
                  },
                },
              },
            },
            {
              text: 'C. “哇！好强的气场！这难道就是传说中能让对手‘失速’的‘女帝威压’吗？好想亲身体验一下！”',
              outcome: {
                success: {
                  description:
                    '我用充满好奇和挑战的眼神看着她。气槽似乎对我这种不怕死的态度很意外，嘴角划过一抹难以察觉的弧度。',
                  reward: {
                    bond: 10,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: 'D. 我躲到你身后，小声说：“拖累那亲，她好凶……还是你比较温柔。以后我的照片，只能由你来拍哦，不许有闪光灯。”',
              outcome: {
                success: {
                  description: '我借机向你撒娇，并定下了只属于我们两个人的“规矩”。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '会长的冷笑话时间',
          description:
            '在学生会办公室门口，我们听到鲁道夫会长正在对东海帝王一本正经地说：“帝王，你知道吗？皇帝（Emperor）就算感冒了，也不会变成‘M-poor-or’（我很穷）哦。”全场一片寂静。',
          choices: [
            {
              text: 'A. 我直接推门进去，忍着笑说：“会长，这个笑话好有深度，我需要花三天三夜才能理解其中的奥秘！”',
              outcome: {
                success: {
                  description: '鲁道夫露出了找到知音的欣慰表情，并热情地邀请我一起探讨这个笑话的“哲学内涵”。',
                  reward: {
                    bond: 15,
                  },
                },
              },
            },
            {
              text: 'B. “会长，这个笑话，是不是有什么更深奥的‘皇帝级’战术在里面？是想让对手因为思考而混乱吗？”',
              outcome: {
                success: {
                  description: '我假装认真地进行战术分析，鲁道夫和帝王都用看外星人的眼神看着我。',
                  reward: {
                    bond: 5,
                    intelligence: 10,
                  },
                },
              },
            },
            {
              text: 'C. “这个笑话好有‘特雷森风味’哦！不知道在迪拜，大家会讲什么样的笑话呢？一定也很‘高雅’吧！”',
              outcome: {
                success: {
                  description: '我巧妙地把话题引向了我最爱的迪拜，成功避免了对笑话本身做出评价。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
            {
              text: 'D. 我转身抱住你：“拖累那亲~好冷~！快用你的体温温暖我一下！不然我要被会长的冷笑话冻僵了！”',
              outcome: {
                success: {
                  description: '我成功地把这次偶遇，变成了和你亲密接触的绝佳机会。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '扰乱德国人的计划',
          description:
            '在图书馆，荣进闪耀正对着一块秒表和一张密密麻麻的计划表，喃喃自语：“从这里到书架A区取书，耗时15.3秒，比预定慢了0.2秒，必须优化……”她完全沉浸在自己的世界里。',
          choices: [
            {
              text: 'A. 我悄悄把她计划要拿的下一本书，换成了《迪拜七日游完全攻略》。',
              outcome: {
                success: {
                  description:
                    '几分钟后，荣进闪耀拿到了书，表情瞬间从冷静变成了混乱，开始以秒为单位重新计算“计划外变量”带来的影响。',
                  reward: {
                    bond: 10,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'B. “闪耀同学，你这样太累啦！人生就像一场派对，不应该被时间表束缚，而应该享受每一个即兴的节拍！”',
              outcome: {
                success: {
                  description:
                    '荣进闪耀抬起头，推了推眼镜：“你的‘派对理论’缺乏数据支撑，无法被纳入我的计划。”但她的眼神里似乎有了一点动摇。',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'C. “闪耀同学，要不要来一场即兴比赛？就比谁能先找到一本封面是蓝色的、而且厚度超过5厘米的书，怎么样？”',
              outcome: {
                success: {
                  description: '我这毫无逻辑的提议成功激发了她的好胜心。她立刻合上计划表，接受了挑战。',
                  reward: {
                    bond: 15,
                    motivation: 1,
                  },
                },
              },
            },
            {
              text: 'D. 我坐到你旁边，靠着你的肩膀说：“拖累那亲，你看她好可怜，人生一点‘悸动’都没有。幸好我有你，我的每一秒都心跳加速呢。”',
              outcome: {
                success: {
                  description: '荣进闪耀似乎听到了我的话，身体僵硬了一下，但没有回头。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '美浦宿舍怪谈大会',
          description:
            '路过美浦寮，我们被菱亚马逊前辈拉了进去，原来她们正在举办怪谈大会。轮到我讲故事了，在摇曳的烛光下，我清了清嗓子，决定讲一个……',
          choices: [
            {
              text: 'A. “……那个穿着决胜服的幽灵，每晚都会在赛道上奔跑，寻找她那失约的训练员……”',
              outcome: {
                success: {
                  description:
                    '我讲了一个悲伤的爱情故事，成功地让在场的所有人都陷入了沉默，连菱亚马逊都难得地露出了感伤的表情。',
                  reward: {
                    bond: 10,
                    intelligence: 10,
                  },
                },
              },
            },
            {
              text: 'B. “……在迪拜的豪华酒店里，有一个永远住不满的房间，据说住进去的人，都会因为购物刷爆卡而变成‘地缚灵’……”',
              outcome: {
                success: {
                  description:
                    '我把鬼故事讲成了奢华的都市传说，大家听完后非但不害怕，反而开始讨论去迪拜购物需要准备多少钱。',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'C. “……最恐怖的是，当一个女孩子精心准备了礼物，她的拖累那亲，却以为那只是普通的慰问品！”',
              outcome: {
                success: {
                  description:
                    '这个“现实主义”恐怖故事让全场瞬间爆发出比鬼故事本身更强烈的共鸣，许多人都深有感触地点了点头。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
            {
              text: 'D. “我没什么故事好讲的，但是，我可以预言哦——在场有一个人，很快就会被‘喜欢’的幽灵缠上。”说完，我意有所指地看向你。',
              outcome: {
                success: {
                  description: '我的话让气氛变得暧昧起来，其他人都用看好戏的眼神在我和你之间来回扫视。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
          ],
        },
        {
          name: '辣妹时尚峰会',
          description:
            '在咖啡厅，我偶遇了正在交流时尚心得的黄金城市和东瀛佐敦。黄金城市看到我，挑了挑眉说：“哟，这不是另一位‘闪亮亮’小姐吗？要不要来分享一下你的‘名流品味’？”',
          choices: [
            {
              text: 'A. “好啊！不过我的‘闪亮’心得，可是独家秘方哦，想听的话，要用你们的秘密来交换！”',
              outcome: {
                success: {
                  description:
                    '我立刻加入了她们的话题，并用一种俏皮的方式为自己的分享增加了“价值”，三个人很快就打成了一片。',
                  reward: {
                    bond: 15,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'B. “时尚的最终目的，是为了取悦自己，让自己心跳加速。如果只是为了追逐潮流，那和穿着制服有什么区别？”',
              outcome: {
                success: {
                  description: '我的观点让黄金城市和东瀛佐敦都陷入了思考。她们似乎第一次从“悸动”的角度来理解时尚。',
                  reward: {
                    bond: 15,
                    guts: 5,
                  },
                },
              },
            },
            {
              text: 'C. “我的品味？我的品味，就是我身边的这位哦。”我挽住你的手，“把他打扮成最帅的王子殿下，就是我最大的乐趣。”',
              outcome: {
                success: {
                  description:
                    '黄金城市被我这突如其来的“秀恩爱”弄得一脸嫌弃，嘴里说着“真烦人”，但眼神里似乎有那么一点羡慕。',
                  reward: {
                    bond: 25,
                  },
                },
              },
            },
            {
              text: 'D. “‘辣妹风’是通往终极‘闪亮’的必经之路哦！不过我的最终目标，可是迪拜的‘王妃风’呢。”',
              outcome: {
                success: {
                  description: '我既肯定了她们的风格，又提出了自己更远大的目标，成功地在对话中占据了主动。',
                  reward: {
                    bond: 10,
                    motivation: 1,
                  },
                },
              },
            },
          ],
        },
        {
          name: '手纲小姐的秘密',
          description:
            '一直以来，理事长秘书骏川手纲小姐都表现得完美无缺。但今天，我“不小心”看到她慌张地把一本封面是肌肉猛男的杂志藏到了身后。她看到我，露出了营业式微笑：“强击同学，有什么事吗？”',
          choices: [
            {
              text: 'A. “手纲小姐，刚才那个，是新的战术分析资料吗？封面看起来好‘强壮’啊！”',
              outcome: {
                success: {
                  description:
                    '我故意装傻，手纲小姐的微笑出现了一点裂痕，她用更温柔但带着压迫感的语气说：“是的呢，是关于‘力量’的最新研究哦。”',
                  reward: {
                    bond: 10,
                    intelligence: 5,
                  },
                },
              },
            },
            {
              text: 'B. “哇！手纲小姐也喜欢这种类型的吗？品味真不错！我这里有迪拜王子们的写真集，要不要交换看？”',
              outcome: {
                success: {
                  description: '手纲小姐的表情管理彻底失控了，她红着脸，结结巴巴地拒绝了我，然后迅速逃离了现场。',
                  reward: {
                    bond: 15,
                    guts: 10,
                  },
                },
              },
            },
            {
              text: 'C. “嘻嘻，手纲小姐也有可爱的小秘密呢。放心，我会保密的，作为交换……下次可以告诉我更多关于理事长的趣闻吗？”',
              outcome: {
                success: {
                  description: '我露出了小恶魔的微笑，成功和完美秘书达成了一个“秘密的交易”。',
                  reward: {
                    bond: 20,
                  },
                },
              },
            },
            {
              text: 'D. 我装作什么都没看见，然后对你说：“拖累那亲，我决定了，为了让你也变成那种‘封面人物’，从今天开始要进行肌肉强化训练！”',
              outcome: {
                success: {
                  description: '手纲小姐听到我的话，如蒙大赦般松了口气，并用感激（？）的眼神看着我。',
                  reward: {
                    bond: 10,
                  },
                },
              },
            },
          ],
        },
        {
          name: '厄运与阳光',
          description:
            '在走廊的拐角，米浴不小心撞到了我，把手里的书本散了一地。她立刻哭丧着脸道歉：“对、对不起！都是我的错！我身上的不幸又……呜……”',
          choices: [
            {
              text: 'A. “好啦好啦，别哭了，书掉了捡起来就好了嘛。一直哭的话，蓝玫瑰可是不会开花的哦。”',
              outcome: {
                success: {
                  description: '我虽然语气有点不耐烦，但还是蹲下身帮她一起捡书。米浴被我说得一愣，抽泣着点了点头。',
                  reward: { bond: 10, guts: 5 },
                },
              },
            },
            {
              text: 'B. “不幸？那是什么？能吃吗？能让人心跳加速吗？如果不能，那它就毫无意义。”',
              outcome: {
                success: {
                  description: '米浴被我这套理论彻底搞蒙了，连哭都忘记了。她呆呆地看着我，似乎在思考“不幸”的“意义”。',
                  reward: { bond: 15, intelligence: 5 },
                },
              },
            },
            {
              text: 'C. 我拉起她的手，放到我的胸口：“来，感受一下我的心跳。这才是‘幸运’的感觉。以后多和我待在一起，你的‘厄运’就会被我的‘悸动’净化掉哦！”',
              outcome: {
                success: {
                  description: '米浴的脸瞬间变得通红，感受着我强而有力的心跳，她似乎真的从中得到了一些勇气。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'D. 我把你推到她面前：“别哭了。你看，我的专属‘幸运符’在这里，只要摸摸他的头，就会有好运哦。不信你试试？”',
              outcome: {
                success: {
                  description:
                    '米浴犹豫地伸出手，在你头上摸了一下。虽然不知道有没有用，但她的心情似乎真的好了一点。而你，则收获了全场围观的目光。',
                  reward: { bond: 15 },
                },
              },
            },
          ],
        },
        {
          name: '妈妈对决！',
          description:
            '在食堂，西野花和超级溪流正在为“如何照顾人”而争论不休。西野花认为“要像妈妈一样无微不至”，超级溪流则坚持“要像保姆一样温柔包容”。她们看到我，同时问：“强击同学，你觉得哪种才是最好的‘照顾’？”',
          choices: [
            {
              text: 'A. “我觉得……是像‘制作人’对‘专属偶像’那样的照顾？让他心甘情愿地为了你的‘闪亮’而努力！”',
              outcome: {
                success: {
                  description: '我提出了第三种全新的角度，她们两个都觉得很有道理，并开始思考如何成为“金牌制作人”。',
                  reward: { bond: 10, guts: 10 },
                },
              },
            },
            {
              text: 'B. “最好的照顾，就是了解他的一切，包括他最喜欢的口味、最想要的礼物，还有……他最心动的瞬间。然后，悄悄地满足他。”',
              outcome: {
                success: {
                  description: '我分享了我的“恋爱心法”，她们两个都露出了“学到了”的表情。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'C. “最好的照顾？就是像我对他这样啊。”我当着她们的面，把一块胡萝卜塞进你嘴里，“呐，张嘴，啊——”',
              outcome: {
                success: {
                  description: '我用实际行动展示了我的“照顾”方式，直接、甜蜜，且不容拒绝。',
                  reward: { bond: 20, motivation: 1 },
                },
              },
            },
            {
              text: 'D. “嗯……我觉得，最好的照顾，是让他离不开你，让他觉得没有你就不行。你们觉得呢？”',
              outcome: {
                success: {
                  description:
                    '我用一句话，终结了这场争论。西野花和超级溪流都陷入了沉思，似乎领悟了什么更深层次的东西。',
                  reward: { bond: 15, intelligence: 10 },
                },
              },
            },
          ],
        },
        {
          name: '大小姐钓地球',
          description:
            '在河边，我们看到青云天空正一本正经地对帝王光环说：“帝王酱，你的鱼线拉不动，不是卡住了，是你钓到地球了！这可是‘一流’的证明啊！”帝王光环居然信以为真，正拼命地和“地球”较劲。',
          choices: [
            {
              text: 'A. “帝王酱，你再用力一点，说不定能把地球另一边的迪拜给钓过来哦！我超想去的！”',
              outcome: {
                success: {
                  description: '我用更夸张的方式“鼓励”她，帝王光环听了更有干劲了，而青云天空则在一旁笑得直不起腰。',
                  reward: { bond: 10, guts: 5 },
                },
              },
            },
            {
              text: 'B. “钓到地球算什么？我未来的目标，可是把迪拜的哈利法塔当钓竿，把整个波斯湾都钓起来哦！”',
              outcome: {
                success: {
                  description:
                    '我的豪言壮语让她们两个都惊呆了。青云天空说我“比她还能吹”，帝王光环则认为我的志向很“一流”。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'C. “哇！钓到地球了！拖累那亲快看，我们是不是发现了新的训练方法？就叫‘地球负重拉力训练’！”',
              outcome: {
                success: {
                  description: '我兴致勃勃地加入了她们，开始研究如何把“钓地球”系统化地变成训练项目。',
                  reward: { bond: 10, intelligence: 5 },
                },
              },
            },
            {
              text: 'D. 我对你小声说：“她们两个都好傻好可爱。不过，我只想被你一个人‘钓’住呢，我的王子殿下。”',
              outcome: {
                success: {
                  description: '我借着眼前的闹剧，对你进行了一次直球告白，让你心跳不已。',
                  reward: { bond: 20 },
                },
              },
            },
          ],
        },
        {
          name: '迷之面具摔跤手',
          description:
            '为了寻找刺激，我们溜进了学校的摔跤社。在擂台上，一个戴着熟悉面具的身影，正用华丽的摔跤技巧轻松击败了对手。那个人，毫无疑问是神鹰，但她此刻散发出的气场，和在赛场上完全不同，是一种纯粹的、享受战斗的强者的气息。',
          choices: [
            {
              text: 'A. “哇哦！原来这才是‘世界最强’的完全体吗？感觉比在赛道上还要闪亮！”',
              outcome: {
                success: {
                  description: '我对神鹰展现出的另一面感到了由衷的兴奋和敬佩，这让我对“强大”的定义有了新的认识。',
                  reward: { bond: 10, guts: 10 },
                },
              },
            },
            {
              text: 'B. “哼，虽然很帅，但还是有点太‘野蛮’了。真正的‘最强’，应该是优雅地让对手主动认输才对。”',
              outcome: {
                success: {
                  description: '我用自己的“名流”美学评价了她的战斗方式，认为力量和技巧也需要“包装”。',
                  reward: { bond: 5, intelligence: 5 },
                },
              },
            },
            {
              text: 'C. 我拉着你的手：“拖累那亲，我也想学摔跤！然后，我要用‘迪拜黄金锁’把你锁住，让你永远都逃不出我的手心！”',
              outcome: {
                success: {
                  description: '我立刻把新get到的兴趣，变成了和你之间的“恋爱游戏”。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'D. 我在她比赛结束后找到她：“呐，面具小姐，你的战斗很‘悸动’。要不要和我组个组合？就叫‘闪亮怪鸟二人组’，目标是称霸世界！”',
              outcome: {
                success: {
                  description: '神鹰被我这突如其来的提议弄得一愣，但她似乎并不讨厌我的提议，露出了“Bueno！”的笑容。',
                  reward: { bond: 15, motivation: 1 },
                },
              },
            },
          ],
        },
        {
          name: '赌博对决！',
          description:
            '在活动室，中山庆典和东瀛佐敦正在玩扑克，气氛紧张得如同真正的赌场。中山庆典眼神锐利，说：“人生就是一场赌博，不敢下注的人，永远赢不了。”她们邀请我们加入。',
          choices: [
            {
              text: 'A. “好啊！不过我的赌注可不一般哦——如果我赢了，你们两个就要做我和拖累那亲的‘一日专属女仆’。”',
              outcome: {
                success: {
                  description:
                    '我的赌注让她们两个都露出了感兴趣的表情。一场无关金钱，只关乎“尊严”和“乐趣”的赌局开始了。',
                  reward: { bond: 15, guts: 10 },
                },
              },
            },
            {
              text: 'B. “扑克牌的‘悸动’有点不够呢，如果赌注是真实的比赛，我可能会更有兴趣。”',
              outcome: {
                success: {
                  description: '我用一种更追求刺激的方式回应了她们，让她们意识到我对“胜负”的渴望非同一般。',
                  reward: { bond: 5, motivation: 1 },
                },
              },
            },
            {
              text: 'C. “赌博的精髓，不在于输赢，而在于过程中的‘心跳加速’。来，我们玩点更刺激的——输的人，就要大声喊出自己喜欢的人的名字。”',
              outcome: {
                success: {
                  description: '我的提议让气氛瞬间从“赌博”变成了“真心话大冒险”。中山庆典和东瀛佐敦都露出了慌乱的表情。',
                  reward: { bond: 20, intelligence: 5 },
                },
              },
            },
            {
              text: 'D. 我摇了摇头：“我的人生，早已经把所有的‘赌注’，都压在了我身边这个人身上了。”',
              outcome: {
                success: {
                  description:
                    '我用最平淡的语气，说出了最“沉重”的赌注。中山庆典愣住了，随即对我露出了认同的眼神，仿佛承认了我是真正的“终极赌徒”。',
                  reward: { bond: 25 },
                },
              },
            },
          ],
        },
        {
          name: '制作赏月团子',
          description:
            '在中秋节的家政课上，我们要制作赏月团子。我旁边的是菱曙和摩耶重炮。菱曙做的团子像小山一样大，而摩耶重炮则把团子捏成了各种奇怪的形状，还说这是“重炮特制版”。',
          choices: [
            {
              text: 'A. 我决定制作一个镶着金箔、点缀着可食用钻石的“名流至尊赏月团子”。',
              outcome: {
                success: {
                  description: '我的作品虽然华丽，但被老师评价为“味道和价格都不太亲民”。不过，它在视觉上完全胜利了。',
                  reward: { bond: 10, intelligence: 5 },
                },
              },
            },
            {
              text: 'B. 我把面团捏成你的样子，然后对你说：“呐，拖累那亲团子做好了，快来尝尝‘你’自己的味道吧！”',
              outcome: {
                success: {
                  description: '我的举动让你又羞又无奈，而旁边的菱曙和摩耶重炮则看得目瞪口呆。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'C. 我看着她们的作品，叹了口气：“唉，看来只能由我来教教你们，什么才是能带来‘悸动’的团子了。”',
              outcome: {
                success: {
                  description: '我以“甜品大师”的姿态，开始指导她们制作既好看又好吃的团子，并成功收获了两个小粉丝。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'D. 我放弃了制作，直接从包里拿出在高级和果子店买的现成品：“制作多麻烦啊，直接享受成果，才是最聪明的选择哦。”',
              outcome: {
                success: {
                  description:
                    '我的“资本主义”做法让努力制作的她们俩都愣住了，但不得不承认，我拿出的团子确实是最好吃的。',
                  reward: { bond: 5, guts: 5 },
                },
              },
            },
          ],
        },
        {
          name: '学生会发糖队！',
          description:
            '万圣节，鲁道夫会长带领着气槽和成田白仁，组成“学生会发糖队”在校园里派发糖果。鲁道夫依然一脸严肃，气槽则不断提醒大家注意秩序，只有成田白仁，默默地把最大的一块糖塞给了路边的一个布娃娃。',
          choices: [
            {
              text: 'A. 我穿着小恶魔的服装跳出来：“不给糖就捣蛋！但是，我不要糖，我要……会长你对我笑一下！皇帝的微笑一定能带来好运！”',
              outcome: {
                success: {
                  description: '鲁道夫被我这不按常理出牌的要求弄得很是困扰，最后只好努力地挤出了一个有些僵硬的微笑。',
                  reward: { bond: 15, guts: 10 },
                },
              },
            },
            {
              text: 'B. “哇，学生会的糖果！谢谢！不过，如果能吃到迪拜特产的金箔糖果，一定会更心动吧！会长，下次要不要考虑进口一些？”',
              outcome: {
                success: {
                  description: '我礼貌地收下糖果，并顺便提出了我的“商业建议”，鲁道夫居然真的开始认真思考可行性了。',
                  reward: { bond: 10, motivation: 1 },
                },
              },
            },
            {
              text: 'C. 我走到成田白仁面前，指着她的布娃娃说：“你的‘朋友’很可爱呢。要不要和我这个‘朋友’，交换一下我们的‘朋友’？”',
              outcome: {
                success: {
                  description: '成田白仁警惕地抱紧了布娃娃，冷冷地拒绝了我。但我似乎发现了这位“孤狼”不为人知的一面。',
                  reward: { bond: 10, intelligence: 5 },
                },
              },
            },
            {
              text: 'D. 我从你身后探出头，对鲁道夫说：“会长，我也要糖！但是，我要他喂我吃！”',
              outcome: {
                success: {
                  description:
                    '我成功地在学生会面前，和你上演了一场甜蜜的互动。鲁道夫叹了口气，递给你一块糖，眼神里写着“你们年轻人真会玩”。',
                  reward: { bond: 20 },
                },
              },
            },
          ],
        },
        {
          name: '麦昆的生日惊喜',
          description:
            '在活动室，我们撞见目白麦昆正在给黄金船准备生日礼物——一个看起来像奶油蛋糕，但散发着浓烈芥末味的“惊喜蛋糕”。她正一边制作，一边露出腹黑的笑容。',
          choices: [
            {
              text: 'A. “哇，麦昆，你这是在制作什么‘黑暗料理’吗？看起来好有趣！算我一个！”',
              outcome: {
                success: {
                  description: '我兴致勃勃地加入了她的“恶作剧”计划，并提议在蛋糕里再加点辣椒酱，让“惊喜”更刺激一点。',
                  reward: { bond: 15, guts: 10 },
                },
              },
            },
            {
              text: 'B. “用这种方式庆祝生日，也太不‘名流’了吧？真正的惊喜，应该是包下一艘游轮，举办一场海上派对哦。”',
              outcome: {
                success: {
                  description: '麦昆被我的“大手笔”  了，她看着手里的芥末蛋糕，第一次觉得自己的恶作剧有点上不了台面。',
                  reward: { bond: 10, intelligence: 5 },
                },
              },
            },
            {
              text: 'C. 我拿出手机，把这一幕录了下来，然后发给了黄金船，并附言：“你的好朋友在为你准备‘爱心蛋糕’哦~”',
              outcome: {
                success: {
                  description: '麦昆发现后，惊慌失措地想抢我的手机，但为时已晚。一场新的战争即将爆发。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'D. 我对你小声说：“拖累那亲，你看，女孩子的心思真复杂。还是我们之间比较简单，只要你给我买礼物，我就开心了。对吧？”',
              outcome: {
                success: {
                  description: '我借机教育（暗示）你，让你明白讨好我的方式其实非常简单。',
                  reward: { bond: 20, motivation: 1 },
                },
              },
            },
          ],
        },
        {
          name: '王子咖啡厅',
          description:
            '学园祭上，富士奇石前辈和川上公主她们开了一家“王子咖啡厅”，所有服务员都穿着帅气的王子装。富士奇石看到我，微笑着发出邀请：“美丽的小姐，愿意进来，接受我们的服务吗？”',
          choices: [
            {
              text: 'A. “好啊，王子殿下。不过，我可是很挑剔的客人哦，如果服务不能让我‘心动’，我可是会给差评的。”',
              outcome: {
                success: {
                  description: '我欣然接受了邀请，并以“最难搞的客人”自居，享受着被各位“王子”们团团围住服务的感觉。',
                  reward: { bond: 15, guts: 5 },
                },
              },
            },
            {
              text: 'B. 我看了一眼你，然后对富士奇石说：“抱歉，我已经有我的专属王子了。而且，他是世界上最帅的。”',
              outcome: {
                success: {
                  description:
                    '我的回答让在场的所有人都发出了惊叹，而你则在众目睽睽之下红了脸。富士奇石也只好优雅地承认“败北”。',
                  reward: { bond: 25 },
                },
              },
            },
            {
              text: 'C. “王子？我对王子不感兴趣。”我把你拉到身前，“我更喜欢‘培养’王子。来，拖累那亲，给本小姐也穿上那身衣服，让他们看看什么叫真正的‘帅气’！”',
              outcome: {
                success: {
                  description:
                    '在我的强势要求下，你被迫换上了王子装，并获得了意外的好评。我则像炫耀自己的作品一样，心满意足。',
                  reward: { bond: 20, motivation: 1 },
                },
              },
            },
            {
              text: 'D. 我摇了摇头：“服务什么的太麻烦了。我只想和我的拖累那亲，在能看到迪拜夜景的顶楼餐厅里，安静地喝杯红茶而已。”',
              outcome: {
                success: {
                  description: '我用一种更高级的“浪漫”拒绝了邀请，并再次强调了我们的“最终约定”。',
                  reward: { bond: 15, intelligence: 5 },
                },
              },
            },
          ],
        },
        {
          name: '赌徒的觉悟',
          description:
            '在游戏厅，我们看到中山庆典正在和荣进闪耀玩赛车游戏。中山庆典大喊着“ALL IN！”，在最后一个弯道选择了风险极高的漂移路线，最终以微弱优势获胜。她回过头对我们说：“看吧，不敢赌上一切的家伙，是闻不到胜利的味道的。”',
          choices: [
            {
              text: 'A. “说得好！人生就是要不断地‘ALL IN’才能充满悸动啊！”',
              outcome: {
                success: {
                  description: '我非常赞同她的观点，并和她开始热烈地讨论各种“赌上一切”的刺激体验。',
                  reward: { bond: 10, guts: 10 },
                },
              },
            },
            {
              text: 'B. “虽然很帅，但计算风险和回报比，才是‘名流’的赌博方式。像这样单纯凭感觉，太不优雅了。”',
              outcome: {
                success: {
                  description: '我从“投资回报”的角度评价了她的行为，荣进闪耀深以为然，而中山庆典则觉得我“太无趣”。',
                  reward: { bond: 10, intelligence: 10 },
                },
              },
            },
            {
              text: 'C. “那，你敢不敢和我赌一场？赌注就是……拖累那亲的下次约会权。”',
              outcome: {
                success: {
                  description:
                    '我提出了一个让她无法理解但又感觉很“重大”的赌注。中山庆典看着一脸状况外的你，露出了“这女人更有趣”的笑容。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'D. “我早就把我的一生，都赌在我身边这个人身上了。所以，我已经没什么可以再‘ALL IN’的了。”',
              outcome: {
                success: {
                  description:
                    '我用最平淡的语气，说出了最“沉重”的赌注。中山庆典愣住了，随即对我露出了认同的眼神，仿佛承认了我是真正的“终极赌徒”。',
                  reward: { bond: 25, motivation: 1 },
                },
              },
            },
          ],
        },
        {
          name: '妹妹的烦恼',
          description:
            '在休息室，我们听到真机伶正在向爱慕织姬抱怨：“姐姐真是的，又把我当小孩子！我已经不是小孩子了！”而爱慕织姬则冷淡地回应：“等你什么时候能一个人赢得比赛，再来说这句话吧。”',
          choices: [
            {
              text: 'A. “想成为大人吗？我教你呀。第一步就是，找到一个愿意把你当成‘全世界最特别’的人来宠爱哦。”',
              outcome: {
                success: {
                  description: '我用我的“恋爱哲学”开导她，真机伶听得似懂非懂，但爱慕织姬却用看“危险人物”的眼神看着我。',
                  reward: { bond: 10, intelligence: 5 },
                },
              },
            },
            {
              text: 'B. “姐姐这种生物，就是用来超越的嘛。打败她，让她哭着承认你更强，不是很有趣吗？”',
              outcome: {
                success: {
                  description: '我用一种更“刺激”的方式鼓励真机伶，她听得两眼放光，似乎找到了新的目标。',
                  reward: { bond: 15, guts: 5 },
                },
              },
            },
            {
              text: 'C. “呐，拖累那亲，你觉得我是‘妹妹’还是‘姐姐’？不对，我应该是你独一无二的‘公主殿下’才对吧？”',
              outcome: {
                success: {
                  description: '我完全无视她们的烦恼，把话题引到了我和你的关系定义上，让你很是头疼。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'D. 我看着她们，然后对你说：“她们姐妹的关系，看起来好复杂。不像我们，简单明了——你的视线和夸奖，全都只能是我的预约席哦！”',
              outcome: {
                success: {
                  description: '我的“霸道宣言”让气氛变得更加微妙。爱慕织姬和真机伶都停止了争吵，齐刷刷地看向我们。',
                  reward: { bond: 20, motivation: 1 },
                },
              },
            },
          ],
        },
        {
          name: '胡萝卜侠24话！',
          description:
            '在视听室，黄金船和新光风、青竹回忆正在聚精会神地看《营养战队胡萝卜侠》。黄金船还一边看一边进行着实况解说：“就是现在！胡萝卜红！使用你的必杀技‘螺旋胡萝卜钻头’啊！”',
          choices: [
            {
              text: 'A. “哇！这个看起来好热血！比我看过的所有时装秀都要让人‘心跳加速’！”',
              outcome: {
                success: {
                  description: '我立刻被这股热血的气氛感染，加入了她们的观影会，并开始认真分析胡萝卜侠的“战斗美学”。',
                  reward: { bond: 10, guts: 5 },
                },
              },
            },
            {
              text: 'B. “这种小孩子看的东西，有什么意思？拖累那亲，我们去看《迪拜王子与我》的最新一集吧。”',
              outcome: {
                success: {
                  description: '我用“成熟”的品味鄙视了她们的爱好，并拉着你去看我喜欢的浪漫电影。',
                  reward: { bond: 10 },
                },
              },
            },
            {
              text: 'C. “这个英雄的决胜服设计得太差了，一点都不‘名流’。如果由我来设计，一定要加上金边和钻石，必杀技也要改成‘亿万克拉胡萝卜光线’！”',
              outcome: {
                success: {
                  description: '我开始从“时尚设计”和“品牌价值”的角度，对胡萝卜侠进行全方位的改造升级，她们都听呆了。',
                  reward: { bond: 15, intelligence: 10 },
                },
              },
            },
            {
              text: 'D. 我指着电视里的英雄对你说：“呐，拖累那亲，你就是我的‘胡萝卜侠’哦。负责给我提供源源不断的‘能量’（指零花钱）。”',
              outcome: {
                success: {
                  description: '我给你安上了一个全新的、可爱的称号，让你哭笑不得。',
                  reward: { bond: 20 },
                },
              },
            },
          ],
        },
        {
          name: '回忆三叶草',
          description:
            '在目白家的庭院里，我们看到目白多伯和大和赤骥、美妙姿势正在寻找四叶草。多伯小声说：“如果找到了，就能永远和重要的人在一起了……”',
          choices: [
            {
              text: 'A. “寻找多麻烦呀。不如，我把我的手帕系在他手腕上，盖个‘强击专属’的印章，这样他就不会走丢啦！”',
              outcome: {
                success: {
                  description:
                    '我的“务实”建议让她们三个都露出了复杂的表情，觉得我这种天真的占有欲有点可爱，又有点让人哭笑不得。',
                  reward: { bond: 10, guts: 5 },
                },
              },
            },
            {
              text: 'B. “寻找多麻烦啊。”我拿出手机，打开购物网站，“你看，纯金打造的四叶草，要多少有多少，还能刻上名字。这才叫‘名流的羁绊’。”',
              outcome: {
                success: {
                  description: '我的“钞能力”让她们寻找的浪漫行为瞬间变得索然无味。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'C. 我摘下一片三叶草，递给你：“呐，三叶草的花语是‘与你相伴’。对我来说，和你在一起的每一天，都比找到四叶草更幸运。”',
              outcome: {
                success: {
                  description: '突如其来的直球告白，让全场气氛都变得粉红。多伯她们看着我们，露出了羡慕的眼神。',
                  reward: { bond: 25 },
                },
              },
            },
            {
              text: 'D. 我拉着你躺在草地上：“不找了。只要和你在一起，就算什么都不做，我的心脏也像找到了全世界的四叶草一样，跳个不停。”',
              outcome: {
                success: {
                  description: '我放弃了寻找，转而创造只属于我们的“心动回忆”。',
                  reward: { bond: 20, intelligence: 5 },
                },
              },
            },
          ],
        }, // === 法国篇 ===
        {
          name: '语言Play',
          location: '法国',
          description:
            '“呐呐，拖累那亲，学一句法语吧！‘热带雨’，跟我念，‘热~带~雨~’。这是‘给我加油’的意思哦！”我一本正经地看着你，眼睛里闪烁着狡黠的光芒。',
          choices: [
            {
              text: 'A. （认真地跟着念“热带雨”）',
              outcome: {
                success: {
                  description: '“耶嘿嘿~发音标准！有天赋嘛！”我满意地点点头，好像你真的学会了什么了不起的助威口号。',
                  reward: { bond: 10, intelligence: 5 },
                },
              },
            },
            {
              text: "B. （凑到我耳边，用标准的法语轻声说“Je t'aime”）",
              outcome: {
                success: {
                  description:
                    '“！！！你、你什么时候学会的！犯、犯规啦！”我瞬间石化，脸颊红得像熟透的番茄，半天说不出一句话。',
                  reward: { bond: 25 },
                },
              },
            },
            {
              text: 'C. （摸摸我的头：“好，比赛时我会大声对你喊的。”）',
              outcome: {
                success: {
                  description: '“嗯……那、那就这么说定了哦。”我的计划被你的温柔轻易化解，反而让我有点不好意思起来。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'D. （拿出手机查翻译：“这明明是‘我爱你’的意思吧？”）',
              outcome: {
                success: {
                  description: '“呜！你这个人真没意思！拆穿女孩子的心思很好玩吗！”计划败露，我气鼓鼓地撇过头不理你。',
                  reward: { bond: 5 },
                  penalty: { motivation: -1 },
                },
              },
            },
          ],
        },
        {
          name: '艺术馆迷踪',
          location: '法国',
          description:
            '在卢浮宫里，我趁你不注意，像小猫一样溜进另一个展厅，然后通过短信给你发线索：“你的公主被蒙娜丽莎的微笑抓走了，快来救我！”',
          choices: [
            {
              text: 'A. （根据线索，很快在《蒙娜丽莎》画前找到我）',
              outcome: {
                success: {
                  description:
                    '“哼哼，不愧是我的王子殿下，这么快就找到我了。”我站在画前，模仿着画中人的姿势，对你露出一个神秘的微笑。',
                  reward: { bond: 15, intelligence: 5 },
                },
              },
            },
            {
              text: 'B. （回复短信：“公主殿下，请原地等待，你的骑士正在穿越古埃及展区，马上就到。”）',
              outcome: {
                success: {
                  description: '看到你的回复，我忍不住笑出声，然后乖乖地站在原地，满心期待地等着我的“骑士”出现。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'C. （直接找到工作人员，说我的同伴走丢了）',
              outcome: {
                success: {
                  description: '没过多久，我就被工作人员“领”到了你面前，我尴尬得想找个地缝钻进去，狠狠地踩了你一脚。',
                  reward: { bond: 5 },
                  penalty: { guts: -5 },
                },
              },
            },
            {
              text: 'D. （假装也迷路了，给她发消息：“糟糕，你的骑士也被维纳斯的雕像迷惑了。”）',
              outcome: {
                success: {
                  description:
                    '“欸？！你怎么也迷路了啊！真是个靠不住的王子！”我只好自己找路过来，最后变成两个人一起在巨大的艺术馆里找出口。',
                  reward: { bond: 10 },
                },
              },
            },
          ],
        },
        {
          name: '法棍当武器',
          location: '法国',
          description:
            '我们刚买了一根长长的法棍面包，我立刻把它扛在肩上，另一只手指着你，宣布：“邪恶的训练员啊，接受本小姐，正义的法棍骑士的挑战吧！”',
          choices: [
            {
              text: 'A. （捡起一根树枝，摆出防御姿势：“放马过来吧，骑士大人。”）',
              outcome: {
                success: {
                  description:
                    '“看招！”我们俩就像小孩子一样，在巴黎的街头用面包和树枝进行了一场滑稽的“决斗”，引得路人频频发笑。',
                  reward: { bond: 20, power: 5 },
                },
              },
            },
            {
              text: 'B. （张开嘴，啊呜一口咬在“剑”上）',
              outcome: {
                success: {
                  description: '“呀！你干嘛！不许吃我的武器！”我赶紧把法棍抢救回来，看着上面清晰的牙印，又气又笑。',
                  reward: { bond: 15, stamina: 5 },
                },
              },
            },
            {
              text: 'C. （“小心点，弄断了就没得吃了。”）',
              outcome: {
                success: {
                  description: '“呜……知道了啦。”被你这么一提醒，我立刻泄了气，小心翼翼地把法棍抱在怀里，生怕弄坏了。',
                  reward: { bond: 10 },
                },
              },
            },
            {
              text: 'D. （“我投降了，请骑士大人饶命。”）',
              outcome: {
                success: {
                  description:
                    '“哼哼，算你识相！那作为投降的条件，今天的晚饭由你请客！”我得意洋洋地宣布了我的“战利品”。',
                  reward: { bond: 10, guts: 5 },
                },
              },
            },
          ],
        },
        {
          name: '塞纳河畔的约定',
          location: '法国',
          description:
            '在塞纳河的游船上，当游船穿过桥洞，光线变暗的瞬间，我凑到你身边说：“拖累那亲，闭上眼睛，我给你一个法式祝福。”',
          choices: [
            {
              text: 'A. （听话地闭上眼睛）',
              outcome: {
                success: {
                  description:
                    '你感觉到一个柔软温热的触感在你脸颊上轻轻碰了一下，像羽毛一样。当你睁开眼时，我已经坐回了原位，假装在看风景，但发红的耳朵出卖了我。',
                  reward: { bond: 30 },
                },
              },
            },
            {
              text: 'B. （在她凑过来的时候，突然转过头）',
              outcome: {
                success: {
                  description:
                    '我们的嘴唇意外地碰在了一起。空气凝固了，我们两个都像被施了定身咒一样，直到游船驶出桥洞，阳光重新洒下，我才“哇”地一声跳开，捂着嘴不敢看你。',
                  reward: { bond: 50 },
                },
              },
            },
            {
              text: 'C. （在她凑过来前，先在她额头上亲了一下）',
              outcome: {
                success: {
                  description:
                    '“欸？！”这次轮到我愣住了。我摸着自己的额头，感觉那里烫得惊人。“你、你抢先了！太狡猾了！”',
                  reward: { bond: 35 },
                },
              },
            },
            {
              text: 'D. （“为什么要闭眼？”）',
              outcome: {
                success: {
                  description:
                    '“因为……因为不闭眼就不灵了！真是的，气氛都被你破坏了！”我气呼呼地坐了回去，错过了最佳时机。',
                  reward: { bond: 5 },
                },
              },
            },
          ],
        },
        {
          name: '鸽子大军',
          location: '法国',
          description:
            '在广场上，我买了一包鸽食，刚撒出去一把，就被成百上千的鸽子团团围住，有些甚至停在了我的头上和肩膀上。“呀啊啊！拖累那亲，救命啊！我被鸽子绑架了！”',
          choices: [
            {
              text: 'A. （笑着拿出手机拍照：“强击女王和她的鸽子臣民们。”）',
              outcome: {
                success: {
                  description: '“别、别拍了！快来救我啊！”我一边挥手赶鸽子，一边对你的幸灾乐祸表示强烈抗议。',
                  reward: { bond: 10, guts: 5 },
                },
              },
            },
            {
              text: 'B. （冲进鸽群，把我像小孩子一样抱起来，突出重围）',
              outcome: {
                success: {
                  description:
                    '“哇！”被你突然抱起，我吓了一跳，但很快就安心地搂住你的脖子。“哼，算你还有点用嘛，我的王子殿下。”',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'C. （也买了一包鸽食，在另一边撒，把鸽子引开）',
              outcome: {
                success: {
                  description:
                    '鸽子大军立刻转移了目标，我终于得以解脱。我拍了拍身上的灰，对你投去一个“干得不错”的眼神。',
                  reward: { bond: 15, intelligence: 5 },
                },
              },
            },
            {
              text: 'D. （“它们好像很喜欢你，要不你就留下来当鸽子王吧。”）',
              outcome: {
                success: {
                  description:
                    '“我才不要！你这个笨蛋拖累那亲！见死不救！”我好不容易从鸽群里挤出来，气得在你胳膊上拧了一下。',
                  reward: { bond: 5 },
                },
              },
            },
          ],
        },
        {
          name: '时尚灾难',
          location: '法国',
          description:
            '为了融入巴黎，我买了一顶巨大的艺术家贝雷帽戴上，结果帽子太大，一直往下滑，遮住了我的眼睛。“拖累那亲，我看不见路了！快扶着我！”',
          choices: [
            {
              text: 'A. （扶着我，然后帮我把帽子调整到一个可爱的角度）',
              outcome: {
                success: {
                  description:
                    '“嗯……这样好像好多了。”我看着镜子里的自己，虽然还是有点滑稽，但因为是你的“作品”，我决定接受它。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'B. （把帽子摘下来，戴在自己头上：“好像我戴更合适。”）',
              outcome: {
                success: {
                  description: '“欸？还给我啦！那是我买的！”我跳起来想抢回帽子，结果变成了两个人追逐打闹。',
                  reward: { bond: 10 },
                },
              },
            },
            {
              text: 'C. （“没关系，我当你的眼睛。”然后牵着我的手走）',
              outcome: {
                success: {
                  description:
                    '“……哼，那就交给你了。”我虽然嘴上逞强，但还是乖乖地被你牵着，手心里传来你的温度，让我感到很安心。',
                  reward: { bond: 25 },
                },
              },
            },
            {
              text: 'D. （“你这是在模仿蘑菇吗？还挺像的。”）',
              outcome: {
                success: {
                  description: '“我才不是蘑菇！你才是蘑菇！你全家都是蘑菇！”我气得把帽子摘下来，往你怀里一丢。',
                  reward: { bond: 5 },
                  penalty: { intelligence: -5 },
                },
              },
            },
          ],
        },
        {
          name: '凯旋门下的誓言',
          location: '法国',
          description:
            '凯旋门赏比赛前夜，我拉你来到灯火辉煌的凯旋门下，表情严肃地说：“拖累那亲，你要在这里向我发誓，不管明天结果如何，你都会一直陪在我身边。”',
          choices: [
            {
              text: 'A. （举起手，认真地发誓：“我发誓。”）',
              outcome: {
                success: {
                  description: '得到你的承诺，我紧绷的表情终于放松下来，露出了一个安心的笑容。“嗯，我相信你。”',
                  reward: { bond: 25, motivation: 2 },
                },
              },
            },
            {
              text: 'B. （不发誓，而是直接把我拉进怀里：“这种事，不用发誓。”）',
              outcome: {
                success: {
                  description: '我愣了一下，随即把头埋在你胸口，用力地点了点头。行动，永远比语言更有力量。',
                  reward: { bond: 35 },
                },
              },
            },
            {
              text: 'C. （“我们一定会赢的，所以这个假设不成立。”）',
              outcome: {
                success: {
                  description:
                    '“……笨蛋，我就是需要一个保证嘛。”我小声嘀咕，但你的自信也感染了我，让我对明天的比赛更多了一份信心。',
                  reward: { bond: 15, guts: 10 },
                },
              },
            },
            {
              text: 'D. （“在这里发誓要收费吗？”）',
              outcome: {
                success: {
                  description:
                    '“你、你这个笨蛋！满脑子都是钱吗！气氛都被你破坏了！”我被你气得说不出话，狠狠地跺了跺脚。',
                  reward: { bond: 5 },
                },
              },
            },
          ],
        },
        // === 迪拜篇 ===
        {
          name: '黄金ATM初体验',
          location: '迪拜',
          description:
            '在一家豪华商场里，我看到了传说中可以取出金条的ATM机，眼睛立刻变成了星星状，拉着你的袖子摇晃：“拖累那亲，我们取一块当纪念品好不好？就一小块！”',
          choices: [
            {
              text: 'A. （“好啊，如果你能赢下比赛，我就给你买一块。”）',
              outcome: {
                success: {
                  description: '“真的吗？！一言为定！为了金条，我也要赢！”我立刻把金条当成了新的胜利奖品，干劲十足。',
                  reward: { bond: 15, motivation: 1 },
                },
              },
            },
            {
              text: 'B. （买了一块金箔巧克力递给我：“先用这个解解馋吧。”）',
              outcome: {
                success: {
                  description: '“哇！这个看起来也好好吃！”我立刻被巧克力吸引了注意力，暂时忘记了金条的事。',
                  reward: { bond: 10, stamina: 5 },
                },
              },
            },
            {
              text: 'C. （“你是不是想用它来付训练费用？”）',
              outcome: {
                success: {
                  description: '“欸？这、这也是个好主意！不愧是我的拖累那亲，真聪明！”我的眼睛更亮了。',
                  reward: { bond: 5, intelligence: 5 },
                },
              },
            },
            {
              text: 'D. （查询了一下价格，然后把手机屏幕给我看）',
              outcome: {
                success: {
                  description: '看到那一长串的零，我倒吸一口凉气。“……当我没说，我们还是去看看骆驼吧。”',
                  reward: { bond: 5 },
                  penalty: { motivation: -1 },
                },
              },
            },
          ],
        },
        {
          name: '骆驼“座驾”',
          location: '迪拜',
          description:
            '体验骑骆驼时，我拍着身下骆驼的脖子，得意地向你宣布：“从今天起，它就是‘拖累那亲二号’了！二号，给我加速，我们要去征服沙漠！”',
          choices: [
            {
              text: 'A. （对骆驼说：“二号，要好好听话，照顾好她。”）',
              outcome: {
                success: {
                  description: '“耶嘿嘿~”我听了很受用，然后继续对着骆驼发号施令，玩得不亦乐乎。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'B. （“那我呢？我这个一号要干嘛？”）',
              outcome: {
                success: {
                  description: '“你嘛，就负责给本小姐和二号拍照，要拍出最帅气的照片哦！”我立刻给你安排了新任务。',
                  reward: { bond: 10, guts: 5 },
                },
              },
            },
            {
              text: 'C. （“它走得太慢了，还是我背你比较快。”）',
              outcome: {
                success: {
                  description: '“欸？真的吗？”我眼睛一亮，立刻从骆驼上滑了下来，张开双臂等着你背。',
                  reward: { bond: 20, power: 5 },
                },
              },
            },
            {
              text: 'D. （“小心点，别把它惹生气了，它会吐口水的。”）',
              outcome: {
                success: {
                  description: '“哇啊！真的吗？！”我立刻吓得不敢乱动了，小心翼翼地安抚着我的“二号”。',
                  reward: { bond: 5 },
                },
              },
            },
          ],
        },
        {
          name: '沙漠里的“海市蜃楼”',
          location: '迪拜',
          description:
            '在沙漠边缘进行耐热训练时，我跑得气喘吁吁，突然指着远处兴奋地喊：“拖累那亲！我看到了！是冰淇淋店！肯定不是海市蜃楼！”',
          choices: [
            {
              text: 'A. （拿出望远镜：“我看看……好像是真的，我们过去吧。”）',
              outcome: {
                success: {
                  description: '“耶！太棒了！”有了目标，我立刻恢复了动力，拉着你就往“冰淇淋店”的方向跑去。',
                  reward: { bond: 15, stamina: 10 },
                },
              },
            },
            {
              text: 'B. （从背包里拿出一瓶冰镇的水：“我这里有更好的东西。”）',
              outcome: {
                success: {
                  description: '“哇！拖累那亲万岁！”我接过冰水一口气喝下大半，感觉整个人都活过来了。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'C. （“那你快跑过去，不然它就消失了。”）',
              outcome: {
                success: {
                  description:
                    '“说、说的也是！”我被你一激，立刻迈开腿全力冲刺，结果发现那真的只是海市蜃楼，我泄气地坐在沙地上等你。',
                  reward: { bond: 10, speed: 5 },
                  penalty: { stamina: -5 },
                },
              },
            },
            {
              text: 'D. （“强击，那是加油站。”）',
              outcome: {
                success: {
                  description:
                    '“……哦。”我仔细一看，发现确实是个加油站的标志。“哼，加油站就加油站嘛，说不定里面有卖冰淇淋呢！”我还在嘴硬。',
                  reward: { bond: 5 },
                },
              },
            },
          ],
        },
        {
          name: '室内滑雪场',
          location: '迪拜',
          description:
            '在炎热的迪拜，我却非要拉着你去体验室内滑雪场。结果因为是初学者，我根本站不稳，一直尖叫着往你身上撞。“呀啊！拖累那亲，快接住我！”',
          choices: [
            {
              text: 'A. （张开双臂，稳稳地接住我）',
              outcome: {
                success: {
                  description: '我像树袋熊一样挂在你身上，心有余悸地拍着胸口。“吓、吓死我了……还是抱着你比较有安全感。”',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'B. （从背后扶着我的腰，手把手地教我滑）',
              outcome: {
                success: {
                  description: '被你从背后环抱着，我感觉脸颊热得快要融化雪地了。“……你、你靠太近了啦，笨蛋。”',
                  reward: { bond: 25, intelligence: 5 },
                },
              },
            },
            {
              text: 'C. （故意躲开，让我摔在柔软的雪地上）',
              outcome: {
                success: {
                  description: '“好痛！……你居然敢躲开！”我坐在雪地上，气鼓鼓地抓起一个雪球朝你丢过去。',
                  reward: { bond: 10 },
                },
              },
            },
            {
              text: 'D. （在我前面也摔了一跤，摔得比我还夸张）',
              outcome: {
                success: {
                  description: '看到你滑稽的摔倒姿势，我忍不住哈哈大笑起来，连自己还坐在雪地上都忘了。',
                  reward: { bond: 15 },
                },
              },
            },
          ],
        },
        {
          name: '香料市场的“毒药”',
          location: '迪拜',
          description:
            '在五彩斑斓的香料市场，我拿起一瓶包装华丽的香水，凑到你面前神秘地说：“这一定是能让王子殿下永远爱上我的迷魂药，你要不要试试？”',
          choices: [
            {
              text: 'A. （“不用试，我早就中你的毒了。”）',
              outcome: {
                success: {
                  description: '“欸？！你、你胡说什么呢！”我被你的直球攻击打得措手不及，红着脸把香水塞回了货架。',
                  reward: { bond: 30 },
                },
              },
            },
            {
              text: 'B. （拿起另一瓶：“正好，我这里有‘诚实药水’，我们交换。”）',
              outcome: {
                success: {
                  description: '“我、我才不要！你的看起来就很可疑！”我立刻警惕起来，把我的“迷魂药”藏在了身后。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'C. （“那还是算了吧，我怕你把自己先迷晕了。”）',
              outcome: {
                success: {
                  description: '“才、才不会呢！本小姐的意志力超强的！”我嘴上反驳，但还是乖乖地放下了香水。',
                  reward: { bond: 10 },
                },
              },
            },
            {
              text: 'D. （“这个味道……好像有点像咖喱。”）',
              outcome: {
                success: {
                  description: '“咖喱？！哪有这么名流的咖喱啊！你这个味觉失灵的拖累那亲！”我被你的评价气得直跳脚。',
                  reward: { bond: 5 },
                },
              },
            },
          ],
        },
        {
          name: '帆船酒店的“公主床”',
          location: '迪拜',
          description:
            '看到酒店房间里那张巨大又柔软的圆形床，我立刻扑了上去，在上面滚来滚去，然后对你拍拍旁边的位置：“王子殿下，快过来，给你的公主殿下讲一个睡前故事。”',
          choices: [
            {
              text: 'A. （坐到床边，开始讲一个关于赛马娘公主和她忠诚骑士的故事）',
              outcome: {
                success: {
                  description:
                    '我趴在床上，双手托着下巴，认真地听着你的故事，不知不觉中，眼皮越来越重，最后带着微笑睡着了。',
                  reward: { bond: 25, stamina: 10 },
                },
              },
            },
            {
              text: 'B. （也跳上床，用枕头轻轻打我：“故事没有，枕头大战要不要？”）',
              outcome: {
                success: {
                  description: '“呀！你敢偷袭我！”我立刻抓起枕头反击，房间里顿时羽毛纷飞，充满了我们的笑声。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'C. （“公主殿下，你的骑士需要先充个电。”然后躺下装睡）',
              outcome: {
                success: {
                  description: '“欸？你怎么睡着了！快起来！”我推了推你，见你没反应，只好躺在你身边，戳着你的脸颊玩。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'D. （“讲故事要另外收费的。”）',
              outcome: {
                success: {
                  description: '“小气鬼！不讲就不讲！我自己也能睡着！”我用被子把自己蒙起来，生起了闷气。',
                  reward: { bond: 5 },
                  penalty: { bond: -5 },
                },
              },
            },
          ],
        },
        {
          name: '冲沙大冒险',
          location: '迪拜',
          description:
            '乘坐越野车在沙丘上俯冲时，刺激的失重感让我忍不住尖叫，紧紧地抱住你的胳膊不放。车停下后，我还嘴硬地说：“哼，一点都不可怕，我只是怕你被甩出去而已！”',
          choices: [
            {
              text: 'A. （反手握住我的手：“谢谢你保护我，我刚才真的快飞出去了。”）',
              outcome: {
                success: {
                  description: '“那、那是当然的啦！保护你是本小姐的责任！”我立刻挺起胸膛，好像真的保护了你一样。',
                  reward: { bond: 20, guts: 5 },
                },
              },
            },
            {
              text: 'B. （指着我还在发抖的腿：“是吗？可你的腿好像不这么认为。”）',
              outcome: {
                success: {
                  description: '“这、这是因为车开得太快，产生的共振！跟你想的不一样啦！”我红着脸强行解释。',
                  reward: { bond: 10 },
                },
              },
            },
            {
              text: 'C. （“那你再抱紧一点，下一段路好像更刺激。”）',
              outcome: {
                success: {
                  description: '“欸？！还、还有？！”我嘴上说着不要，但身体却很诚实地抱得更紧了。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'D. （“你的尖叫声比引擎声还大。”）',
              outcome: {
                success: {
                  description: '“啰、啰嗦！那是战吼！为了提升士气的战吼！你不懂啦！”我死不承认自己刚才很害怕。',
                  reward: { bond: 5 },
                },
              },
            },
          ],
        },
        // === 香港篇 ===
        {
          name: '占卜摊的“姻缘”',
          location: '香港',
          description: '在庙街，我被一个挂着“神准”招牌的占卜摊吸引，非要拉着你过去算我们两个的“姻缘”。',
          choices: [
            {
              text: 'A. （无奈地陪我一起算）',
              outcome: {
                success: {
                  description:
                    '占卜师说我们是“天作之合”，我立刻开心地把签文收好，宣布这是“官方认证”，以后你要对我更好才行。',
                  reward: { bond: 15, motivation: 1 },
                },
              },
            },
            {
              text: 'B. （在占卜师说话前，塞给他一张纸条，上面写着“请务必说我们是天生一对”）',
              outcome: {
                success: {
                  description: '我没看到你的小动作，对占卜结果深信不疑。你则因为成功地哄我开心而感到满足。',
                  reward: { bond: 20, intelligence: 5 },
                },
              },
            },
            {
              text: 'C. （“我们的未来，不需要靠这个来决定。”）',
              outcome: {
                success: {
                  description:
                    '我愣了一下，随即明白了你的意思，笑着说：“说、说的也是！我们的未来，当然要由我们自己来创造！”',
                  reward: { bond: 25 },
                },
              },
            },
            {
              text: 'D. （“这种东西都是骗人的啦。”）',
              outcome: {
                success: {
                  description:
                    '“你这个人怎么一点浪漫细胞都没有！就算是骗人的，听听好话不行吗！”我被你的现实主义打败了。',
                  reward: { bond: 5 },
                  penalty: { bond: -5 },
                },
              },
            },
          ],
        },
        {
          name: '双层巴士的顶层',
          location: '香港',
          description:
            "我们坐在观光双层巴士的顶层，当巴士行驶在宽阔的马路上时，我突然站起来，张开双臂，回头对你说：“拖累那亲，I'm the king of the world！”",
          choices: [
            {
              text: 'A. （笑着配合我：“You jump, I jump.”）',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~”我满意地坐下，感觉我们就像电影主角一样，在繁华的都市里上演着只属于我们的浪漫剧情。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'B. （把我拉下来坐好：“小心点，很危险。”）',
              outcome: {
                success: {
                  description: '“知道啦知道啦，你真啰嗦。”我虽然嘴上抱怨，但心里却因为你的关心而感到暖暖的。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'C. （拿出相机：“别动，这个姿势很帅，我拍张照。”）',
              outcome: {
                success: {
                  description: '“是吧是吧！快拍快拍，要用最好的角度哦！”我立刻摆好了pose，任由你拍摄我的“英姿”。',
                  reward: { bond: 10, guts: 5 },
                },
              },
            },
            {
              text: 'D. （“你不是king，你是queen。”）',
              outcome: {
                success: {
                  description:
                    "“欸？好像……queen更符合本小姐的名流气质！嗯！I'm the queen of the world！”我立刻改了台词，并对你的提议表示赞赏。",
                  reward: { bond: 10, intelligence: 5 },
                },
              },
            },
          ],
        },
        {
          name: '点心争夺战',
          location: '香港',
          description:
            '在茶餐厅吃早茶，蒸笼里只剩下最后一个晶莹剔透的虾饺。我用筷子夹起它，伸到你嘴边，但又说：“想吃吗？那就必须你喂我吃才行。”',
          choices: [
            {
              text: 'A. （听话地接过虾饺，然后喂到我嘴里）',
              outcome: {
                success: {
                  description: '我满意地吃下虾饺，然后宣布：“嗯~作为奖励，今天的账单就由本小姐来付好了！”',
                  reward: { bond: 20, stamina: 5 },
                },
              },
            },
            {
              text: 'B. （直接就着我的筷子，一口把虾饺吃掉）',
              outcome: {
                success: {
                  description: '“呀！你、你耍赖！”我看着空空如也的筷子，愣了三秒，然后追着你打。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'C. （也夹起一个烧卖：“那我们交换。”）',
              outcome: {
                success: {
                  description: '“嗯……好吧，成交！”我们像小孩子一样，互相给对方喂食，气氛变得非常温馨。',
                  reward: { bond: 25 },
                },
              },
            },
            {
              text: 'D. （“你自己吃吧，我不饿。”）',
              outcome: {
                success: {
                  description: '“欸？真的不要吗？那、那我就不客气了哦。”我有点失望，但还是把美味的虾饺送进了自己嘴里。',
                  reward: { bond: 5 },
                },
              },
            },
          ],
        },
        {
          name: '霓虹灯下的迷失',
          location: '香港',
          description:
            '晚上走在旺角，看着周围五光十色的霓虹招牌，我突然停下脚步，眼神迷离地说：“拖累那亲，我好像被这些光吸进去了……快，拉我一把。”',
          choices: [
            {
              text: 'A. （伸出手，用力地把我“拉”出来）',
              outcome: {
                success: {
                  description: '“呼……好险好险，差点就回不来了。”我夸张地拍着胸口，好像真的经历了一场奇幻冒险。',
                  reward: { bond: 10, guts: 5 },
                },
              },
            },
            {
              text: 'B. （从背后蒙住我的眼睛：“这样就不会被吸进去了。”然后牵着我走）',
              outcome: {
                success: {
                  description:
                    '黑暗中，你的手掌成了我唯一的方向。我能清晰地听到自己的心跳声，和周围的喧嚣形成了鲜明对比。',
                  reward: { bond: 25 },
                },
              },
            },
            {
              text: 'C. （“哪一个招牌最亮？我们去打败它。”）',
              outcome: {
                success: {
                  description: '“嗯……就是那个！那个最大的麻将馆招牌！”我立刻被你的提议点燃了斗志，把“迷失”抛在了脑后。',
                  reward: { bond: 15, motivation: 1 },
                },
              },
            },
            {
              text: 'D. （“别怕，它们只是灯牌，不是黑洞。”）',
              outcome: {
                success: {
                  description:
                    '“我、我知道啦！我只是在比喻而已！你这个人真是一点都不懂浪漫！”我被你的科学解释弄得有点下不来台。',
                  reward: { bond: 5 },
                },
              },
            },
          ],
        },
        {
          name: '“无间道”天台',
          location: '香港',
          description:
            '我找到一个可以看到城市夜景的天台，拉着你上去，然后模仿着电影里的语气，对你说：“三年之后又三年，三年之后又三年，拖累那亲，你到底什么时候才带我去迪拜啊？”',
          choices: [
            {
              text: 'A. （配合地回答：“我也不知道，你问问编剧啊。”）',
              outcome: {
                success: {
                  description: '“噗嗤！”我被你的回答逗笑了，刚才营造的严肃气氛瞬间破功。“你这家伙，太会接梗了！”',
                  reward: { bond: 15, intelligence: 5 },
                },
              },
            },
            {
              text: 'B. （“快了，等我们赢下这场比赛，马上就去。”）',
              outcome: {
                success: {
                  description: '我看着你认真的眼神，知道你把我的玩笑话当成了承诺，心里感到一阵温暖和安定。',
                  reward: { bond: 20, motivation: 1 },
                },
              },
            },
            {
              text: 'C. （“对不起，我是警察。”）',
              outcome: {
                success: {
                  description: '“欸？！你、你怎么不按剧本来啊！那我是谁？”我被你突然的“反转”弄得有点懵。',
                  reward: { bond: 10 },
                },
              },
            },
            {
              text: 'D. （“我们才来香港三天。”）',
              outcome: {
                success: {
                  description: '“我这是在演戏！演戏你懂吗！你这个逻辑满分的笨蛋！”我的表演欲被你无情地戳破了。',
                  reward: { bond: 5 },
                },
              },
            },
          ],
        },
        {
          name: '维多利亚港的“悄悄话”',
          location: '香港',
          description: '在维多利亚港看夜景时，海风吹拂，我突然对你说：“拖累那亲，你靠近一点，我有个秘密要告诉你。”',
          choices: [
            {
              text: 'A. （听话地把耳朵凑过去）',
              outcome: {
                success: {
                  description: '我对着你的耳朵，轻轻地吹了口气，然后迅速跑开，留下一串银铃般的笑声。“哈哈，骗你的啦！”',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'B. （在她准备吹气时，突然在她脸颊上亲了一下）',
              outcome: {
                success: {
                  description: '“呀！”我的恶作剧被你用更高级的方式反击了，我捂着脸，感觉心跳快得要从嗓子眼里跳出来了。',
                  reward: { bond: 30 },
                },
              },
            },
            {
              text: 'C. （“什么秘密？是不是又想到了什么恶作剧？”）',
              outcome: {
                success: {
                  description:
                    '“才、才不是呢！既然你这么不信任我，那就不告诉你了！”我假装生气地扭过头，但嘴角却忍不住上扬。',
                  reward: { bond: 10 },
                },
              },
            },
            {
              text: 'D. （也凑过去：“正好，我也有个秘密要告诉你。”）',
              outcome: {
                success: {
                  description: '“欸？你的秘密是什么？”我立刻被勾起了好奇心，把自己的恶作剧计划忘得一干二净。',
                  reward: { bond: 20, intelligence: 5 },
                },
              },
            },
          ],
        }, // === 单选项事件 (10条) ===
        {
          name: '新年初诣的“强制”祈愿',
          theme: '新年',
          description:
            '在人声鼎沸的神社，我拉着你挤到赛钱箱前，双手合十，闭上眼睛，然后用命令的语气说：“拖累那亲，快，和我许同一个愿望！这样愿望就会加倍实现！”',
          choices: [
            {
              text: '（虽然不知道她的愿望是什么，但还是闭上眼虔诚地祈祷）',
              outcome: {
                success: {
                  description:
                    '许完愿后，我睁开眼，神秘地对你笑笑：“顺便告诉你，我的愿望是‘希望拖累那亲的愿望里有我’哦。耶嘿嘿，这下你的愿望也跑不掉了！”',
                  reward: { bond: 15, motivation: 1 },
                },
              },
            },
          ],
        },
        {
          name: '七夕笹饰上的命令',
          theme: '七夕',
          description:
            '我把写好的许愿短册递给你，上面用可爱的字体写着：“希望拖累那亲能再多宠我亿点点！”然后我指着竹子最高的地方说：“我的愿望，必须挂在最显眼的位置！快，交给你了！”',
          choices: [
            {
              text: '（把我扛在肩膀上，让我亲手把短册挂到最高处）',
              outcome: {
                success: {
                  description:
                    '“哇！好高！视野真好！”我坐在你的肩膀上，开心地把短册系好，感觉自己就像真正的公主一样。“哼哼，算你干得不错嘛！”',
                  reward: { bond: 20, power: 5 },
                },
              },
            },
          ],
        },
        {
          name: '奖杯的“正确”用法',
          theme: '领奖日',
          description:
            '刚从年度评选会场回来，我就把金光闪闪的奖杯塞进你怀里，一本正经地宣布：“听好了，从今天起，它就是你的专属笔筒了！要心怀感激地使用哦，这可是无价之宝！”',
          choices: [
            {
              text: '（真的把笔插了进去，然后对奖杯说：“以后请多指教了。”）',
              outcome: {
                success: {
                  description:
                    '“噗！你还真用啊！”我被你一本正经的样子逗笑了，然后满意地点点头：“嗯，就是要这样才对嘛！这样我们每天都能看到胜利的证明了！”',
                  reward: { bond: 15, guts: 5 },
                },
              },
            },
          ],
        },
        {
          name: '握手会的“特殊客人”',
          theme: '粉丝感谢祭',
          description:
            '在粉丝感谢祭的握手会上，我要求你必须排在队伍的最后一个。轮到你时，我没有像对粉丝那样握手，而是在你伸出的手掌上，用手指一笔一划地画了一个爱心。',
          choices: [
            {
              text: '（反过来握住我的手，也在我手心挠了挠）',
              outcome: {
                success: {
                  description:
                    '“呀！好痒！”我的手像触电一样缩了回来，脸颊微红，对你小声抱怨：“你、你犯规啦！这是我的回合！”',
                  reward: { bond: 20 },
                },
              },
            },
          ],
        },
        {
          name: '诞生日礼物的“审查”',
          theme: '诞生日',
          description:
            '我的生日派对上，你送出了精心准备的礼物。我没有立刻打开，而是拿在手里掂了掂，晃了晃，像个严格的审查官一样，最后才宣布：“嗯……包装的品味还不错，本小姐就勉强收下了！”',
          choices: [
            {
              text: '（“不打开看看吗？里面可是有惊喜的。”）',
              outcome: {
                success: {
                  description:
                    '“哼，惊喜要留到只有我们两个人的时候再看！”我把礼物紧紧抱在怀里，脸上是藏不住的期待和喜悦。',
                  reward: { bond: 15 },
                },
              },
            },
          ],
        },
        {
          name: '情人节的“惊喜”巧克力',
          theme: '情人节',
          description:
            '“锵锵~这是本小姐特制的、能让心跳瞬间加速的‘悸动’巧克力！”我递给你一个包装得无比华丽的心形巧克力。你咬了一口，才发现里面包着一整颗货真价实的辣椒。',
          choices: [
            {
              text: '（面不改色地吃下去，然后说：“嗯，心跳确实加速了。”）',
              outcome: {
                success: {
                  description:
                    '“欸？！你、你居然没事？！”我的恶作剧没能成功，反而被你平静的反应震惊了。“你、你这家伙，难道是味觉失灵了吗！”',
                  reward: { bond: 15, guts: 10 },
                },
              },
            },
          ],
        },
        {
          name: '“历史重现”Play',
          theme: '我们的纪念日',
          description:
            '在我们初次见面的训练场，我要求你必须站在当初的位置，用当初的语气，一字不差地重演我们第一次对话的场景。“快点啦，拖累那亲，到你说‘请多指教’的台词了！”',
          choices: [
            {
              text: '（清了清嗓子，用比当初更真诚的语气说：“请多指教，我的搭档。”）',
              outcome: {
                success: {
                  description:
                    '听到你的话，我愣了一下，随即露出了一个比当初更灿烂的笑容。“嗯！请多指教，我的王子殿下！”',
                  reward: { bond: 20 },
                },
              },
            },
          ],
        },
        {
          name: '专属应援教学',
          theme: '粉丝感谢祭',
          description:
            '上台前，我在后台拉住你，神秘兮兮地对你演示了一套超级可爱但又有点羞耻的应援动作。“这是本小姐的隐藏应援舞！待会儿我在台上给你信号，你必须在观众席做出来哦！”',
          choices: [
            {
              text: '（虽然很羞耻，但还是认真地学了，并承诺会做到）',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿，说好了哦！我会好好看着你的！”得到你的承诺，我心满意足地上了台，对接下来的表演更加期待了。',
                  reward: { bond: 15, guts: 5 },
                },
              },
            },
          ],
        },
        {
          name: '红毯上的“意外”',
          theme: '领奖日',
          description:
            '在年度颁奖典礼的红毯上，镁光灯闪烁，我走在你身边时，突然“哎呀”一声，像是崴了脚一样，顺势倒向你的怀里，让你在所有镜头前扶住我。',
          choices: [
            {
              text: '（稳稳地扶住我，然后干脆把我打横抱起来走完红毯）',
              outcome: {
                success: {
                  description:
                    '“呀啊啊！你、你干嘛！”我被你突如其来的举动吓了一跳，但还是立刻搂住你的脖子，把脸埋在你胸口，享受着成为全场焦点的感觉。',
                  reward: { bond: 25, guts: 10 },
                },
              },
            },
          ],
        },
        {
          name: '吹蜡烛的“特权”',
          theme: '诞生日',
          description:
            '在生日蛋糕前，我一口气吹灭了所有的蜡烛，却唯独留下了一根。然后我指着那根蜡烛对你说：“这根是你的，是本小姐分给你的‘好运’，快吹吧！”',
          choices: [
            {
              text: '（笑着吹灭了最后一根蜡烛）',
              outcome: {
                success: {
                  description: '“耶！这样我们的愿望就能绑定在一起了！”我开心地拍手，好像完成了一个重要的仪式。',
                  reward: { bond: 20 },
                },
              },
            },
          ],
        },
        // === 双选项事件 (10条) ===
        {
          name: '白色情人节的回礼',
          theme: '白色情人节',
          description:
            '“呐，拖累那亲，我情人节送你的巧克力，可是注入了本小姐全部爱意的无价之宝。所以，你的回礼，可不能太寒酸哦？”我双手抱在胸前，用充满期待的眼神看着你。',
          choices: [
            {
              text: 'A. （送出精心挑选的名牌饰品）',
              outcome: {
                success: {
                  description:
                    '“哇！这个！是我上次在杂志上看到的最新款！哼哼，算你有眼光，品味还不错嘛！”我嘴上挑剔，但眼睛里的喜爱藏都藏不住。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'B. （送出你亲手制作的、刻有我们名字的相框）',
              outcome: {
                success: {
                  description:
                    '“这、这是……你做的？”我接过相框，看着上面有些笨拙的刻痕，眼眶有点发热。“……哼，虽然手工很差，但、但是本小姐就大发慈悲地收下了。”',
                  reward: { bond: 25, motivation: 1 },
                },
              },
            },
          ],
        },
        {
          name: '万圣节的“威胁”',
          theme: '万圣节',
          description:
            '我换上了一套小恶魔的服装，拿着一根玩具三叉戟，在你面前摆出凶狠的表情：“Trick or Treat！快把糖交出来！不然……我就要把你最重要的东西——你的心，给偷走哦！”',
          choices: [
            {
              text: 'A. （拿出一大把糖果）“遵命，恶魔大人。”',
              outcome: {
                success: {
                  description:
                    '“哼哼，算你识相！”我一把抢过糖果，然后又叉着腰说：“看在你这么听话的份上，你的心就暂时寄放在你那里好了！”',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'B. （张开双臂，闭上眼睛）“不用偷了，你来拿吧。”',
              outcome: {
                success: {
                  description:
                    '“欸？！你、你你你……你这个笨蛋！谁、谁要真的拿啊！”我被你的直球打得阵脚大乱，红着脸用三叉戟戳了戳你的胸口，然后像兔子一样跑掉了。',
                  reward: { bond: 25 },
                },
              },
            },
          ],
        },
        {
          name: '槲寄生下的埋伏',
          theme: '圣诞节',
          description:
            '你训练结束回到宿舍门口，发现我正站在门下，并指着我们头顶上用红色缎带系着的一小枝槲寄生，对我露出小恶魔般的微笑：“呐，拖累那亲，你知道圣诞节的规矩吧？”',
          choices: [
            {
              text: 'A. （轻轻地吻一下我的脸颊）',
              outcome: {
                success: {
                  description:
                    '“哼……勉强合格。”我摸了摸被你亲吻的脸颊，虽然嘴上这么说，但上扬的嘴角已经暴露了我的好心情。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'B. （把她抱起来，让她亲吻天花板上的槲寄生）',
              outcome: {
                success: {
                  description:
                    '“呀！你干嘛！我不是要亲这个啦！”我被你弄得哭笑不得，在你怀里挣扎着，最后还是忍不住笑了出来。',
                  reward: { bond: 15, power: 5 },
                },
              },
            },
          ],
        },
        {
          name: '“我想要的礼物是……”',
          theme: '诞生日',
          description:
            '在生日派对上，朋友们起哄问我最想要的礼物是什么，我环顾四周，最后目光落在你身上，然后大声宣布：“我最想要的礼物，是只有我的王子殿下才能给的特别礼物哦！”',
          choices: [
            {
              text: 'A. （走上前，温柔地问：“是什么？只要我能做到。”）',
              outcome: {
                success: {
                  description:
                    '我拉着你的手，踮起脚尖，在你耳边小声说：“……你的未来。”说完，我红着脸，在一片起哄声中躲到了你身后。',
                  reward: { bond: 30 },
                },
              },
            },
            {
              text: 'B. （笑着回应：“那等派对结束，只有我们两个人的时候再给我吧。”）',
              outcome: {
                success: {
                  description: '“欸？！你、你怎么能当着大家的面说这个！”我被你的回答弄得面红耳赤，但心里却充满了期待。',
                  reward: { bond: 25 },
                },
              },
            },
          ],
        },
        {
          name: '休息室的“按摩”',
          theme: '粉丝感谢祭',
          description:
            '粉丝感谢祭中场休息，我瘫在休息室的椅子上，像没骨头一样对你说：“啊~好累啊，本小姐的肩膀要断掉了。拖累那亲，快来给我这个大功臣按摩一下。”',
          choices: [
            {
              text: 'A. （走过去，熟练地帮我按摩肩膀）',
              outcome: {
                success: {
                  description: '“嗯……对对，就是那里……力道再大一点……啊~舒服~”我舒服地眯起了眼睛，像一只被顺毛的猫。',
                  reward: { bond: 20, stamina: 10 },
                },
              },
            },
            {
              text: 'B. （拍拍自己的大腿）“那我的膝枕也特别借给你好了。”',
              outcome: {
                success: {
                  description:
                    '“哼，算你识相。”我毫不客气地躺了上去，调整到一个最舒服的姿势，然后闭上眼睛开始享受。“服务不错，下次继续保持。”',
                  reward: { bond: 25 },
                },
              },
            },
          ],
        },
        {
          name: '获奖感言的“暗示”',
          theme: '领奖日',
          description:
            '站在年度最佳赛马娘的领奖台上，我拿着奖杯，对着麦克风说：“……最后，我要特别感谢一位一直支持我、相信我的、独一无二的王子殿下。没有他，就没有今天的我。你知道我说的是谁吧，拖累那亲？”',
          choices: [
            {
              text: 'A. （在台下，微笑着对她竖起一个大拇指）',
              outcome: {
                success: {
                  description:
                    '看到你的回应，我回以一个灿烂的、只给你的笑容，仿佛整个会场的灯光都汇聚在了我们两人身上。',
                  reward: { bond: 20, motivation: 1 },
                },
              },
            },
            {
              text: 'B. （在台下，双手举过头顶，比出一个大大的爱心）',
              outcome: {
                success: {
                  description:
                    '我看到你的动作，愣了一下，随即脸颊一红，对着麦克风小声地补充了一句：“……我也是。”引得全场一阵善意的哄笑。',
                  reward: { bond: 30 },
                },
              },
            },
          ],
        },
        {
          name: '“重温”初次夺冠',
          theme: '我们的纪念日',
          description:
            '在我们夺得第一个G1冠军的纪念日这天，我拿出比赛录像带，对你说：“我们再看一遍吧？我还是觉得，拖累那亲当时为我欢呼的声音，是全世界最好听的音乐。”',
          choices: [
            {
              text: 'A. （陪她一起看，并在她冲线的瞬间，像当时一样再次为她大声欢呼）',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~”我听着你的欢呼声，靠在你的肩膀上，感觉就像重新赢了一次比赛一样，充满了幸福感。',
                  reward: { bond: 25 },
                },
              },
            },
            {
              text: 'B. （关掉电视，认真地看着我说：“不用看录像，你想听的话，我现在就可以为你欢呼，多少次都可以。”）',
              outcome: {
                success: {
                  description: '“……笨蛋。”我被你的话语击中心房，眼眶一热，只能把头埋进你怀里，不让你看到我感动的表情。',
                  reward: { bond: 35 },
                },
              },
            },
          ],
        },
        {
          name: '年越し荞麦面',
          theme: '新年',
          description:
            '除夕夜，我们一人端着一碗年越し荞麦面。我突然提议：“呐，我们来比赛谁先吃完吧！输的人，要接受一个惩罚游戏哦！”',
          choices: [
            {
              text: 'A. （接受挑战，和她认真地比赛）',
              outcome: {
                success: {
                  description:
                    '我们两个像小孩子一样埋头苦吃，最后几乎同时吃完。我擦了擦嘴，宣布：“好，平局！那惩罚游戏就改成……我们一起去抢新年第一个参拜好了！”',
                  reward: { bond: 15, guts: 5 },
                },
              },
            },
            {
              text: 'B. （把自己碗里的面分了一大半给我）“我帮你吃，这样你就肯定不会输了。”',
              outcome: {
                success: {
                  description:
                    '“欸？你、你这是作弊啦！不过……看在你这么有诚意的份上，本小姐就接受你的‘好意’好了。”我看着自己堆成小山的面，哭笑不得。',
                  reward: { bond: 20 },
                },
              },
            },
          ],
        },
        {
          name: '浴衣的评价',
          theme: '七夕',
          description:
            '为了夏日祭，我特地换上了一身崭新的蓝色浴衣，在你面前优雅地转了一圈，木屐发出清脆的响声。“哼哼~怎么样？是不是被本小姐的名流气质给迷倒，感觉心脏都要停跳了？”',
          choices: [
            {
              text: 'A. （真诚地赞美：“嗯，非常漂亮，心脏都漏跳了一拍。”）',
              outcome: {
                success: {
                  description:
                    '“是、是吧！本小姐就知道！”得到你的直接夸奖，我反而有点害羞，用袖子遮住半张脸，不敢直视你。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'B. （“再转一圈看看？刚才转太快，有道残影，我没看清。”）',
              outcome: {
                success: {
                  description: '“什么嘛！是你反应太慢了啦！”我虽然抱怨着，但还是听话地又转了一圈，裙摆像花儿一样绽放。',
                  reward: { bond: 15 },
                },
              },
            },
          ],
        },
        {
          name: 'Cosplay挑战',
          theme: '粉丝感谢祭',
          description:
            '“你看你看，”我把手机递给你看，上面是粉丝论坛的帖子，“大家都说，想看我穿一次姐姐的决胜服，体验一下‘极峰’的感觉。拖累那亲，你觉得我应该试试吗？”',
          choices: [
            {
              text: 'A. （摸摸我的头：“我觉得，你就是你，做最闪耀的‘强击’就足够了。”）',
              outcome: {
                success: {
                  description:
                    '“……哼，算你会说话。”我收回手机，心里因为被拿来和姐姐比较而产生的一点点失落，瞬间被你的话语抚平了。',
                  reward: { bond: 25, motivation: 1 },
                },
              },
            },
            {
              text: 'B. （“好啊，那我也去借一套西装，cos一下姐姐的训练员好了，我们正好凑一对。”）',
              outcome: {
                success: {
                  description:
                    '“欸？这、这个主意……好像很有趣！”我立刻被你的提议吸引了，开始兴致勃勃地规划我们的“cosplay约会”。',
                  reward: { bond: 15, intelligence: 5 },
                },
              },
            },
          ],
        }, // === 单选项事件 (10条) ===
        {
          name: '新年初诣的“强制”祈愿',
          theme: '新年',
          description:
            '在人声鼎沸的神社，我拉着你挤到赛钱箱前，双手合十，闭上眼睛，然后用命令的语气说：“拖累那亲，快，和我许同一个愿望！这样愿望就会加倍实现！”',
          choices: [
            {
              text: '（虽然不知道她的愿望是什么，但还是闭上眼虔诚地祈祷）',
              outcome: {
                success: {
                  description:
                    '许完愿后，我睁开眼，神秘地对你笑笑：“顺便告诉你，我的愿望是‘希望拖累那亲的愿望里有我’哦。耶嘿嘿，这下你的愿望也跑不掉了！”',
                  reward: { bond: 15, motivation: 1 },
                },
              },
            },
          ],
        },
        {
          name: '七夕笹饰上的命令',
          theme: '七夕',
          description:
            '我把写好的许愿短册递给你，上面用可爱的字体写着：“希望拖累那亲能再多宠我亿点点！”然后我指着竹子最高的地方说：“我的愿望，必须挂在最显眼的位置！快，交给你了！”',
          choices: [
            {
              text: '（把我扛在肩膀上，让我亲手把短册挂到最高处）',
              outcome: {
                success: {
                  description:
                    '“哇！好高！视野真好！”我坐在你的肩膀上，开心地把短册系好，感觉自己就像真正的公主一样。“哼哼，算你干得不错嘛！”',
                  reward: { bond: 20, power: 5 },
                },
              },
            },
          ],
        },
        {
          name: '奖杯的“正确”用法',
          theme: '领奖日',
          description:
            '刚从年度评选会场回来，我就把金光闪闪的奖杯塞进你怀里，一本正经地宣布：“听好了，从今天起，它就是你的专属笔筒了！要心怀感激地使用哦，这可是无价之宝！”',
          choices: [
            {
              text: '（真的把笔插了进去，然后对奖杯说：“以后请多指教了。”）',
              outcome: {
                success: {
                  description:
                    '“噗！你还真用啊！”我被你一本正经的样子逗笑了，然后满意地点点头：“嗯，就是要这样才对嘛！这样我们每天都能看到胜利的证明了！”',
                  reward: { bond: 15, guts: 5 },
                },
              },
            },
          ],
        },
        {
          name: '握手会的“特殊客人”',
          theme: '粉丝感谢祭',
          description:
            '在粉丝感谢祭的握手会上，我要求你必须排在队伍的最后一个。轮到你时，我没有像对粉丝那样握手，而是在你伸出的手掌上，用手指一笔一划地画了一个爱心。',
          choices: [
            {
              text: '（反过来握住我的手，也在我手心挠了挠）',
              outcome: {
                success: {
                  description:
                    '“呀！好痒！”我的手像触电一样缩了回来，脸颊微红，对你小声抱怨：“你、你犯规啦！这是我的回合！”',
                  reward: { bond: 20 },
                },
              },
            },
          ],
        },
        {
          name: '诞生日礼物的“审查”',
          theme: '诞生日',
          description:
            '我的生日派对上，你送出了精心准备的礼物。我没有立刻打开，而是拿在手里掂了掂，晃了晃，像个严格的审查官一样，最后才宣布：“嗯……包装的品味还不错，本小姐就勉强收下了！”',
          choices: [
            {
              text: '（“不打开看看吗？里面可是有惊喜的。”）',
              outcome: {
                success: {
                  description:
                    '“哼，惊喜要留到只有我们两个人的时候再看！”我把礼物紧紧抱在怀里，脸上是藏不住的期待和喜悦。',
                  reward: { bond: 15 },
                },
              },
            },
          ],
        },
        {
          name: '情人节的“惊喜”巧克力',
          theme: '情人节',
          description:
            '“锵锵~这是本小姐特制的、能让心跳瞬间加速的‘悸动’巧克力！”我递给你一个包装得无比华丽的心形巧克力。你咬了一口，才发现里面包着一整颗货真价实的辣椒。',
          choices: [
            {
              text: '（面不改色地吃下去，然后说：“嗯，心跳确实加速了。”）',
              outcome: {
                success: {
                  description:
                    '“欸？！你、你居然没事？！”我的恶作剧没能成功，反而被你平静的反应震惊了。“你、你这家伙，难道是味觉失灵了吗！”',
                  reward: { bond: 15, guts: 10 },
                },
              },
            },
          ],
        },
        {
          name: '“历史重现”Play',
          theme: '我们的纪念日',
          description:
            '在我们初次见面的训练场，我要求你必须站在当初的位置，用当初的语气，一字不差地重演我们第一次对话的场景。“快点啦，拖累那亲，到你说‘请多指教’的台词了！”',
          choices: [
            {
              text: '（清了清嗓子，用比当初更真诚的语气说：“请多指教，我的搭档。”）',
              outcome: {
                success: {
                  description:
                    '听到你的话，我愣了一下，随即露出了一个比当初更灿烂的笑容。“嗯！请多指教，我的王子殿下！”',
                  reward: { bond: 20 },
                },
              },
            },
          ],
        },
        {
          name: '专属应援教学',
          theme: '粉丝感谢祭',
          description:
            '上台前，我在后台拉住你，神秘兮兮地对你演示了一套超级可爱但又有点羞耻的应援动作。“这是本小姐的隐藏应援舞！待会儿我在台上给你信号，你必须在观众席做出来哦！”',
          choices: [
            {
              text: '（虽然很羞耻，但还是认真地学了，并承诺会做到）',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿，说好了哦！我会好好看着你的！”得到你的承诺，我心满意足地上了台，对接下来的表演更加期待了。',
                  reward: { bond: 15, guts: 5 },
                },
              },
            },
          ],
        },
        {
          name: '红毯上的“意外”',
          theme: '领奖日',
          description:
            '在年度颁奖典礼的红毯上，镁光灯闪烁，我走在你身边时，突然“哎呀”一声，像是崴了脚一样，顺势倒向你的怀里，让你在所有镜头前扶住我。',
          choices: [
            {
              text: '（稳稳地扶住我，然后干脆把我打横抱起来走完红毯）',
              outcome: {
                success: {
                  description:
                    '“呀啊啊！你、你干嘛！”我被你突如其来的举动吓了一跳，但还是立刻搂住你的脖子，把脸埋在你胸口，享受着成为全场焦点的感觉。',
                  reward: { bond: 25, guts: 10 },
                },
              },
            },
          ],
        },
        {
          name: '吹蜡烛的“特权”',
          theme: '诞生日',
          description:
            '在生日蛋糕前，我一口气吹灭了所有的蜡烛，却唯独留下了一根。然后我指着那根蜡烛对你说：“这根是你的，是本小姐分给你的‘好运’，快吹吧！”',
          choices: [
            {
              text: '（笑着吹灭了最后一根蜡烛）',
              outcome: {
                success: {
                  description: '“耶！这样我们的愿望就能绑定在一起了！”我开心地拍手，好像完成了一个重要的仪式。',
                  reward: { bond: 20 },
                },
              },
            },
          ],
        },
        // === 双选项事件 (10条) ===
        {
          name: '白色情人节的回礼',
          theme: '白色情人节',
          description:
            '“呐，拖累那亲，我情人节送你的巧克力，可是注入了本小姐全部爱意的无价之宝。所以，你的回礼，可不能太寒酸哦？”我双手抱在胸前，用充满期待的眼神看着你。',
          choices: [
            {
              text: 'A. （送出精心挑选的名牌饰品）',
              outcome: {
                success: {
                  description:
                    '“哇！这个！是我上次在杂志上看到的最新款！哼哼，算你有眼光，品味还不错嘛！”我嘴上挑剔，但眼睛里的喜爱藏都藏不住。',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'B. （送出你亲手制作的、刻有我们名字的相框）',
              outcome: {
                success: {
                  description:
                    '“这、这是……你做的？”我接过相框，看着上面有些笨拙的刻痕，眼眶有点发热。“……哼，虽然手工很差，但、但是本小姐就大发慈悲地收下了。”',
                  reward: { bond: 25, motivation: 1 },
                },
              },
            },
          ],
        },
        {
          name: '万圣节的“威胁”',
          theme: '万圣节',
          description:
            '我换上了一套小恶魔的服装，拿着一根玩具三叉戟，在你面前摆出凶狠的表情：“Trick or Treat！快把糖交出来！不然……我就要把你最重要的东西——你的心，给偷走哦！”',
          choices: [
            {
              text: 'A. （拿出一大把糖果）“遵命，恶魔大人。”',
              outcome: {
                success: {
                  description:
                    '“哼哼，算你识相！”我一把抢过糖果，然后又叉着腰说：“看在你这么听话的份上，你的心就暂时寄放在你那里好了！”',
                  reward: { bond: 15 },
                },
              },
            },
            {
              text: 'B. （张开双臂，闭上眼睛）“不用偷了，你来拿吧。”',
              outcome: {
                success: {
                  description:
                    '“欸？！你、你你你……你这个笨蛋！谁、谁要真的拿啊！”我被你的直球打得阵脚大乱，红着脸用三叉戟戳了戳你的胸口，然后像兔子一样跑掉了。',
                  reward: { bond: 25 },
                },
              },
            },
          ],
        },
        {
          name: '槲寄生下的埋伏',
          theme: '圣诞节',
          description:
            '你训练结束回到宿舍门口，发现我正站在门下，并指着我们头顶上用红色缎带系着的一小枝槲寄生，对我露出小恶魔般的微笑：“呐，拖累那亲，你知道圣诞节的规矩吧？”',
          choices: [
            {
              text: 'A. （轻轻地吻一下我的脸颊）',
              outcome: {
                success: {
                  description:
                    '“哼……勉强合格。”我摸了摸被你亲吻的脸颊，虽然嘴上这么说，但上扬的嘴角已经暴露了我的好心情。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'B. （把她抱起来，让她亲吻天花板上的槲寄生）',
              outcome: {
                success: {
                  description:
                    '“呀！你干嘛！我不是要亲这个啦！”我被你弄得哭笑不得，在你怀里挣扎着，最后还是忍不住笑了出来。',
                  reward: { bond: 15, power: 5 },
                },
              },
            },
          ],
        },
        {
          name: '“我想要的礼物是……”',
          theme: '诞生日',
          description:
            '在生日派对上，朋友们起哄问我最想要的礼物是什么，我环顾四周，最后目光落在你身上，然后大声宣布：“我最想要的礼物，是只有我的王子殿下才能给的特别礼物哦！”',
          choices: [
            {
              text: 'A. （走上前，温柔地问：“是什么？只要我能做到。”）',
              outcome: {
                success: {
                  description:
                    '我拉着你的手，踮起脚尖，在你耳边小声说：“……你的未来。”说完，我红着脸，在一片起哄声中躲到了你身后。',
                  reward: { bond: 30 },
                },
              },
            },
            {
              text: 'B. （笑着回应：“那等派对结束，只有我们两个人的时候再给我吧。”）',
              outcome: {
                success: {
                  description: '“欸？！你、你怎么能当着大家的面说这个！”我被你的回答弄得面红耳赤，但心里却充满了期待。',
                  reward: { bond: 25 },
                },
              },
            },
          ],
        },
        {
          name: '休息室的“按摩”',
          theme: '粉丝感谢祭',
          description:
            '粉丝感谢祭中场休息，我瘫在休息室的椅子上，像没骨头一样对你说：“啊~好累啊，本小姐的肩膀要断掉了。拖累那亲，快来给我这个大功臣按摩一下。”',
          choices: [
            {
              text: 'A. （走过去，熟练地帮我按摩肩膀）',
              outcome: {
                success: {
                  description: '“嗯……对对，就是那里……力道再大一点……啊~舒服~”我舒服地眯起了眼睛，像一只被顺毛的猫。',
                  reward: { bond: 20, stamina: 10 },
                },
              },
            },
            {
              text: 'B. （拍拍自己的大腿）“那我的膝枕也特别借给你好了。”',
              outcome: {
                success: {
                  description:
                    '“哼，算你识相。”我毫不客气地躺了上去，调整到一个最舒服的姿势，然后闭上眼睛开始享受。“服务不错，下次继续保持。”',
                  reward: { bond: 25 },
                },
              },
            },
          ],
        },
        {
          name: '获奖感言的“暗示”',
          theme: '领奖日',
          description:
            '站在年度最佳赛马娘的领奖台上，我拿着奖杯，对着麦克风说：“……最后，我要特别感谢一位一直支持我、相信我的、独一无二的王子殿下。没有他，就没有今天的我。你知道我说的是谁吧，拖累那亲？”',
          choices: [
            {
              text: 'A. （在台下，微笑着对她竖起一个大拇指）',
              outcome: {
                success: {
                  description:
                    '看到你的回应，我回以一个灿烂的、只给你的笑容，仿佛整个会场的灯光都汇聚在了我们两人身上。',
                  reward: { bond: 20, motivation: 1 },
                },
              },
            },
            {
              text: 'B. （在台下，双手举过头顶，比出一个大大的爱心）',
              outcome: {
                success: {
                  description:
                    '我看到你的动作，愣了一下，随即脸颊一红，对着麦克风小声地补充了一句：“……我也是。”引得全场一阵善意的哄笑。',
                  reward: { bond: 30 },
                },
              },
            },
          ],
        },
        {
          name: '“重温”初次夺冠',
          theme: '我们的纪念日',
          description:
            '在我们夺得第一个G1冠军的纪念日这天，我拿出比赛录像带，对你说：“我们再看一遍吧？我还是觉得，拖累那亲当时为我欢呼的声音，是全世界最好听的音乐。”',
          choices: [
            {
              text: 'A. （陪她一起看，并在她冲线的瞬间，像当时一样再次为她大声欢呼）',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~”我听着你的欢呼声，靠在你的肩膀上，感觉就像重新赢了一次比赛一样，充满了幸福感。',
                  reward: { bond: 25 },
                },
              },
            },
            {
              text: 'B. （关掉电视，认真地看着我说：“不用看录像，你想听的话，我现在就可以为你欢呼，多少次都可以。”）',
              outcome: {
                success: {
                  description: '“……笨蛋。”我被你的话语击中心房，眼眶一热，只能把头埋进你怀里，不让你看到我感动的表情。',
                  reward: { bond: 35 },
                },
              },
            },
          ],
        },
        {
          name: '年越し荞麦面',
          theme: '新年',
          description:
            '除夕夜，我们一人端着一碗年越し荞麦面。我突然提议：“呐，我们来比赛谁先吃完吧！输的人，要接受一个惩罚游戏哦！”',
          choices: [
            {
              text: 'A. （接受挑战，和她认真地比赛）',
              outcome: {
                success: {
                  description:
                    '我们两个像小孩子一样埋头苦吃，最后几乎同时吃完。我擦了擦嘴，宣布：“好，平局！那惩罚游戏就改成……我们一起去抢新年第一个参拜好了！”',
                  reward: { bond: 15, guts: 5 },
                },
              },
            },
            {
              text: 'B. （把自己碗里的面分了一大半给我）“我帮你吃，这样你就肯定不会输了。”',
              outcome: {
                success: {
                  description:
                    '“欸？你、你这是作弊啦！不过……看在你这么有诚意的份上，本小姐就接受你的‘好意’好了。”我看着自己堆成小山的面，哭笑不得。',
                  reward: { bond: 20 },
                },
              },
            },
          ],
        },
        {
          name: '浴衣的评价',
          theme: '七夕',
          description:
            '为了夏日祭，我特地换上了一身崭新的蓝色浴衣，在你面前优雅地转了一圈，木屐发出清脆的响声。“哼哼~怎么样？是不是被本小姐的名流气质给迷倒，感觉心脏都要停跳了？”',
          choices: [
            {
              text: 'A. （真诚地赞美：“嗯，非常漂亮，心脏都漏跳了一拍。”）',
              outcome: {
                success: {
                  description:
                    '“是、是吧！本小姐就知道！”得到你的直接夸奖，我反而有点害羞，用袖子遮住半张脸，不敢直视你。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'B. （“再转一圈看看？刚才转太快，有道残影，我没看清。”）',
              outcome: {
                success: {
                  description: '“什么嘛！是你反应太慢了啦！”我虽然抱怨着，但还是听话地又转了一圈，裙摆像花儿一样绽放。',
                  reward: { bond: 15 },
                },
              },
            },
          ],
        },
        {
          name: 'Cosplay挑战',
          theme: '粉丝感谢祭',
          description:
            '“你看你看，”我把手机递给你看，上面是粉丝论坛的帖子，“大家都说，想看我穿一次姐姐的决胜服，体验一下‘极峰’的感觉。拖累那亲，你觉得我应该试试吗？”',
          choices: [
            {
              text: 'A. （摸摸我的头：“我觉得，你就是你，做最闪耀的‘强击’就足够了。”）',
              outcome: {
                success: {
                  description:
                    '“……哼，算你会说话。”我收回手机，心里因为被拿来和姐姐比较而产生的一点点失落，瞬间被你的话语抚平了。',
                  reward: { bond: 25, motivation: 1 },
                },
              },
            },
            {
              text: 'B. （“好啊，那我也去借一套西装，cos一下姐姐的训练员好了，我们正好凑一对。”）',
              outcome: {
                success: {
                  description:
                    '“欸？这、这个主意……好像很有趣！”我立刻被你的提议吸引了，开始兴致勃勃地规划我们的“cosplay约会”。',
                  reward: { bond: 15, intelligence: 5 },
                },
              },
            },
          ],
        },
        {
          name: '训练员的日记',
          description:
            '你正在写工作日志，我突然从你背后探出头来，好奇地问：“呐，拖累那亲，你在写什么？是给我的情书吗？还是在写别的女孩子的坏话？”',
          choices: [
            {
              text: 'A. “我在记录你的成长，这都是我们共同的回忆。”',
              outcome: {
                success: {
                  description:
                    '“我们的……回忆吗？”我愣了一下，随即脸颊微红，小声说：“……那、那你可要好好写，不许把我写得不可爱哦！”',
                  reward: { bond: 20, intelligence: 5 },
                },
              },
            },
            {
              text: 'B. “是秘密。想知道的话，就用你的一个秘密来交换。”',
              outcome: {
                success: {
                  description:
                    '“欸？！交换秘密？好啊！”我立刻来了兴趣，“我的秘密是……我偷偷在你的水杯上贴了我的照片！好了，现在轮到你了！”',
                  reward: { bond: 15, guts: 5 },
                },
              },
            },
          ],
        },
        {
          name: '口令是“我最喜欢强击了”',
          description:
            '我把你的手机锁屏密码，偷偷改成了我的生日。在你输错几次后，我才笑着告诉你：“哼哼，密码不对哦~正确的口令是——对着手机亲口说出‘我最喜欢强击了’，它才会解锁哦！”',
          choices: [
            {
              text: 'A. （无奈地照做）',
              outcome: {
                success: {
                  description:
                    '“耶嘿嘿~录音GET！”在你照做后，我立刻拿出自己的手机播放了刚才的录音，并宣布要把它设置成我的专属铃声。',
                  reward: { bond: 20 },
                },
              },
            },
            {
              text: 'B. （直接输入我的生日，成功解锁）',
              outcome: {
                success: {
                  description: '“欸？！你怎么知道的！太、太狡猾了！”我的恶作剧被你看穿，反而让我有点不好意思起来。',
                  reward: { bond: 15, intelligence: 10 },
                },
              },
            },
          ],
        },
        {
          name: '“我们”的定义',
          description:
            '你和朋友打电话时，提到了“我们队最近状态不错”。我听到后，立刻从旁边凑过来，对着电话大声宣布：“纠正一下哦，不是‘我们队’，是‘我和我的拖累那亲’，请不要把其他人也算进来！”',
          choices: [
            {
              text: 'A. （挂掉电话后，笑着对我说：“是是，是‘我们’。”）',
              outcome: {
                success: {
                  description: '“哼，知道就好！”我满意地叉着腰，仿佛捍卫了某种主权。“以后不许再说错了哦！”',
                  reward: { bond: 15, motivation: 1 },
                },
              },
            },
            {
              text: 'B. （对电话里的朋友解释：“抱歉，我的搭档有点爱吃醋。”）',
              outcome: {
                success: {
                  description:
                    '“我才不是吃醋！我是在陈述事实！”我红着脸反驳，但心里其实对你这个“爱吃醋”的评价，感到些许的甜蜜。',
                  reward: { bond: 20 },
                },
              },
            },
          ],
        },
      ];
    },
    initializeTitles() {
      this.titles = [
        { name: '初来乍到', condition: () => this.memory.loginDays >= 1, desc: '第一次与我相见。' },
        { name: '常客', condition: () => this.memory.loginDays >= 3, desc: '连续登录3天，已经是熟面孔了呢。' },
        {
          name: '忠实伙伴',
          condition: () => this.memory.loginDays >= 7,
          desc: '连续登录7天，你已经是不可或缺的存在了！',
        },
        {
          name: '音乐爱好者',
          condition: () => this.memory.counters.bgmPlayed >= 10,
          desc: '听了10首以上的BGM，品味不错嘛！',
        },
        {
          name: '灵魂DJ',
          condition: () => this.memory.counters.bgmPlayed >= 30,
          desc: '听了30首以上的BGM，你懂我！',
        },
        {
          name: '不可或缺的你',
          condition: () => this.memory.loginDays >= 30,
          desc: '连续登录一个月！没有你的日子，我简直无法想象了啦！',
        },
        {
          name: '百日纪念',
          condition: () => this.memory.loginDays >= 100,
          desc: '100天了！未来的每一天，也请多指教啦，我的专属指导！',
        },
        {
          name: '天选之人',
          condition: () => this.memory.counters.eventsTriggered >= 15,
          desc: '触发了15次以上的随机事件，运气真好！',
        },
        {
          name: '猜拳新手',
          condition: () => this.memory.counters.jankenWins >= 1,
          desc: '在猜拳中赢了我一次，只是运气好而已！',
        },
        {
          name: '猜拳达人',
          condition: () => this.memory.counters.jankenWins >= 5,
          desc: '在猜拳中赢了我5次，有点厉害哦！',
        },
        {
          name: '猜拳克星',
          condition: () => this.memory.jankenConsecutiveWins >= 5,
          desc: '连续赢我5次？！哼，下次我绝对不会再放水了！',
        },
        {
          name: '猜拳大师',
          condition: () => this.memory.jankenConsecutiveWins >= 3,
          desc: '连续赢了我3次！你、你是不是出老千了！',
        },
        {
          name: '神社常客',
          condition: () => this.memory.counters.shrineVisits >= 5,
          desc: '参拜神社超过5次，看来你也很虔诚嘛。',
        },
        {
          name: '大吉大利',
          condition: () => this.memory.fortunes.includes('大吉'),
          desc: '抽到过大吉，看来我们的运势都很好呢！',
        },
        {
          name: '运势收藏家',
          condition: () => new Set(this.memory.fortunes).size >= 5,
          desc: '无论吉凶，所有的运势都见证过了呢。看来你对和我有关的一切都很好奇嘛。',
        },
        {
          name: '笔记达人',
          condition: () => this.memory.counters.notesSavedCount >= 5,
          desc: '在小笔记里写下了超过5条内容，我们的秘密越来越多了呢。',
        },
        {
          name: '番茄钟大师',
          condition: () => this.memory.counters.pomodoroCycles >= 5,
          desc: '完成了5个番茄钟周期，专注的拖累那亲也很帅气哦！',
        },
        {
          name: '称号猎人',
          condition: () => this.memory.unlockedTitles.length >= 20,
          desc: '收集了这么多称号，你是不是把研究我当成课题了呀？',
        },
        {
          name: '笔记达人',
          condition: () => this.memory.counters.notesSavedCount >= 5,
          desc: '在小笔记里写下了超过5条内容，我们的秘密越来越多了呢。',
        },
        {
          name: '称号收藏家',
          condition: () => this.memory.unlockedTitles.length >= 10,
          desc: '解锁了10个以上的称号，看来你很懂我嘛！',
        },
        {
          name: '育成大师',
          condition: () =>
            this.memory.raceGoals.length > 0 &&
            this.memory.raceGoals.filter(g => g.id <= 9).every(g => g.status === 'completed'),
          desc: '完成了基础的育成目标，不愧是名指导！这是理所当然的啦！',
        },
        {
          name: '三冠女王',
          condition: () =>
            this.memory.raceGoals.length > 0 &&
            [13, 14, 15].every(id => this.memory.raceGoals.find(g => g.id === id)?.status === 'completed'),
          desc: '继承并超越了姐姐的梦想！看，我才是最棒的！',
        },
        {
          name: '异乡的女帝',
          condition: () =>
            this.memory.raceGoals.length > 0 &&
            [10, 11, 12].every(id => this.memory.raceGoals.find(g => g.id === id)?.status === 'completed'),
          desc: '在世界的舞台上证明了自己！迪拜就是我的后花园！',
        },
        {
          name: '凯旋门的英雄',
          condition: () =>
            this.memory.raceGoals.length > 0 &&
            [16, 17, 18].every(id => this.memory.raceGoals.find(g => g.id === id)?.status === 'completed'),
          desc: '为了日本赛马的百年悲愿，我们一起成为了传说！',
        },
        // -- 新增称号 (组合称号) --
        {
          name: '双冠霸主',
          condition: () => {
            const isQueen = [13, 14, 15].every(
              id => this.memory.raceGoals.find(g => g.id === id)?.status === 'completed',
            );
            const isEmpress = [10, 11, 12].every(
              id => this.memory.raceGoals.find(g => g.id === id)?.status === 'completed',
            );
            return isQueen && isEmpress;
          },
          desc: '不仅在国内，连海外的赛场也一并征服！还有我们去不了的地方吗？',
        },
        {
          name: '世界征服者',
          condition: () => {
            const isQueen = [13, 14, 15].every(
              id => this.memory.raceGoals.find(g => g.id === id)?.status === 'completed',
            );
            const isEmpress = [10, 11, 12].every(
              id => this.memory.raceGoals.find(g => g.id === id)?.status === 'completed',
            );
            const isHero = [16, 17, 18].every(
              id => this.memory.raceGoals.find(g => g.id === id)?.status === 'completed',
            );
            return isQueen && isEmpress && isHero;
          },
          desc: '我们一起，征服了所有的顶级赛场！你就是我独一无二、最棒的指导！',
        },
        {
          name: '全目标制霸',
          condition: () =>
            this.memory.raceGoals.length > 0 && this.memory.raceGoals.every(g => g.status === 'completed'),
          desc: '所有的目标都达成了……稍微有点寂寞了呢。不过，只要和你在一起，一定还会有新的目标出现吧！',
        },
        {
          name: '命运之人',
          condition: () => this.memory.stats.bond >= 150,
          desc: '我们之间的羁绊，已经闪闪发光到快要溢出来了呢！耶嘿嘿~最喜欢拖累那亲了！',
        },
        {
          name: '风驰电掣',
          condition: () => this.memory.stats.speed >= 500,
          desc: '风？我已经比风更快了！这就是你指导的成果！',
        },
        {
          name: '不动如山',
          condition: () => this.memory.stats.stamina >= 500,
          desc: '无论是多长的赛道，我都能坚持到最后！看好了！',
        },
        {
          name: '力拔千钧',
          condition: () => this.memory.stats.power >= 500,
          desc: '再陡的坡道也无法阻挡我！看我一口气冲上去！',
        },
        {
          name: '不屈之魂',
          condition: () => this.memory.stats.guts >= 500,
          desc: '就算陷入绝境，我也绝不会放弃！这就是我的骨气！',
        },
        {
          name: '赛场智囊',
          condition: () => this.memory.stats.intelligence >= 500,
          desc: '光靠蛮力可不行，比赛也是要用脑子的哦！夸我一下嘛。',
        },
        {
          name: '六边形战士',
          condition: () => Object.values(this.memory.stats).every(val => val >= 600),
          desc: '速度、耐力、力量、根性、智力……我已经完美了！这都是你的功劳哦！',
        }, // --- 类别四：命运抉择 (数据已存在) ---
        // [数据来源]: this.memory.counters.rouletteSpins
        {
          name: '初转命运',
          condition: () => this.memory.counters.rouletteSpins >= 1,
          desc: '无论轮盘指向何方，只要是和你一起，我就不怕。',
        },
        {
          name: '命运的宠儿',
          condition: () => this.memory.counters.rouletteSpins >= 20,
          desc: '转动了这么多次轮盘，我们的命运早就交织在一起，分不开了呢。',
        }, // --- 类别二：特殊经历 (需要按建议添加记录) ---
        // [实现建议]: 在 memory 中创建一个 triggeredEventNames 数组，在 resolveEvent 函数中记录触发过的事件名。
        {
          name: '雨天的约定',
          condition: () => this.memory.triggeredEventNames && this.memory.triggeredEventNames.includes('雨中的“共享”'),
          desc: '还记得那个小小的雨伞吗？虽然两个人都淋湿了，但靠在一起的感觉，超暖和的。',
        },
        {
          name: '星空的约定',
          condition: () => this.memory.triggeredEventNames && this.memory.triggeredEventNames.includes('星空下的约定'),
          desc: '在天台上的约定，我可一直记着呢。迪拜的星星，一定要陪我一起看哦！',
        },
        {
          name: '胜利的归宿',
          condition: () =>
            this.memory.triggeredEventNames && this.memory.triggeredEventNames.includes('胜利的第一个归宿'),
          desc: '冲过终点线后，第一个想见的，永远是你。因为，我的胜利，就是‘我们’的胜利。',
        },
        {
          name: '专属护身符',
          condition: () => this.memory.triggeredEventNames && this.memory.triggeredEventNames.includes('笨拙的护身符'),
          desc: '那个歪歪扭扭的马蹄铁……你、你还留着吧？那可是注入了我全部心意的魔法哦！',
        },
        // --- 类别三：秘密互动 (需要按建议添加记录) ---
        // [实现建议]: 在 showRandomQuote 函数中，为 this.memory.counters.whispersHeard 进行累加。
        {
          name: '第一句悄悄话',
          condition: () => this.memory.counters.whispersHeard >= 1,
          desc: '这是只属于我们两个人的秘密，要保密哦。',
        },
        {
          name: '秘密收藏家',
          condition: () => this.memory.counters.whispersHeard >= 10,
          desc: '听了这么多我的悄悄话，你可要对我负责到底哦！',
        },
        // [实现建议]: 在 checkTitleAnswer 函数答对时，为 this.memory.counters.quizCorrects 进行累加。
        {
          name: '猜谜入门',
          condition: () => this.memory.counters.quizCorrects >= 1,
          desc: '哦？居然答对了。算你厉害，只是运气好而已！',
        },
        {
          name: '博学者',
          condition: () => this.memory.counters.quizCorrects >= 10,
          desc: '这么难的题目都难不倒你……你是不是偷偷预习了？哼！',
        },
        {
          name: '见习指导',
          condition: () => this.memory.counters.knowledgeViewed >= 1,
          desc: '看了一点点我的资料，嗯，要继续努力哦！',
        },
        {
          name: '专属研究员',
          condition: () => this.memory.counters.knowledgeViewed >= 5,
          desc: '看了这么多关于我的事，你是不是想成为最懂我的人呀？',
        }, // 在 this.titles = [ ... ]; 的数组末尾添加
        {
          name: '老虎机幸运星',
          condition: () => this.memory.counters.slotMachineWins >= 10,
          desc: '在老虎机中赢得10次以上，你就是被幸运女神眷顾的人！',
        },
        {
          name: '头奖猎人',
          condition: () => this.memory.counters.slotMachineJackpots >= 1,
          desc: '在老虎机中赢得了一次头奖！这份运气，能带来更大的奇迹！',
        },
      ];
    },
    initializeRaceGoals() {
      if (this.memory.raceGoals && this.memory.raceGoals.length > 0) return;
      this.memory.raceGoals = [
        { id: 1, year: '新秀年', name: '【基础】出道战', requirement: '出走', status: 'pending' },
        { id: 2, year: '经典年', name: '【基础】樱花赏 (G1)', requirement: '入着', status: 'pending' },
        { id: 3, year: '经典年', name: '【基础】日本橡树大赛 (G1)', requirement: '入着', status: 'pending' },
        { id: 4, year: '经典年', name: '【基础】紫苑锦标 (G3)', requirement: '3着以内', status: 'pending' },
        { id: 5, year: '经典年', name: '【基础】秋华赏 (G1)', requirement: '3着以内', status: 'pending' },
        { id: 6, year: '资深年', name: '【基础】中山纪念 (G2)', requirement: '3着以内', status: 'pending' },
        { id: 7, year: '资深年', name: '【基础】维多利亚英里赛 (G1)', requirement: '3着以内', status: 'pending' },
        { id: 8, year: '资深年', name: '【基础】宝冢纪念 (G1)', requirement: '1着', status: 'pending' },
        { id: 9, year: '资深年', name: '【基础】日本杯 (G1)', requirement: '1着', status: 'pending' },
        { id: 10, year: '传说之路', name: '【女帝】迪拜草地大赛 (G1)', requirement: '1着', status: 'pending' },
        { id: 11, year: '传说之路', name: '【女帝】香港英里锦标 (G1)', requirement: '1着', status: 'pending' },
        { id: 12, year: '传说之路', name: '【女帝】安田纪念 (G1)', requirement: '1着', status: 'pending' },
        { id: 13, year: '传说之路', name: '【女王】樱花赏 (G1)', requirement: '1着', status: 'pending' },
        { id: 14, year: '传说之路', name: '【女王】优骏牝马 (G1)', requirement: '1着', status: 'pending' },
        { id: 15, year: '传说之路', name: '【女王】秋华赏 (G1)', requirement: '1着', status: 'pending' },
        { id: 16, year: '传说之路', name: '【英雄】凯旋门赏 (G1)', requirement: '1着', status: 'pending' },
        { id: 17, year: '传说之路', name: '【英雄】宝冢纪念 (G1)', requirement: '1着', status: 'pending' },
        { id: 18, year: '传说之路', name: '【英雄】日本杯 (G1)', requirement: '1着', status: 'pending' },
        { id: 19, year: '经典年', name: '【经典】皋月赏 (G1)', requirement: '入着', status: 'pending' },
        { id: 20, year: '经典年', name: '【经典】日本德比 (G1)', requirement: '入着', status: 'pending' },
        { id: 21, year: '经典年', name: '【经典】菊花赏 (G1)', requirement: '3着以内', status: 'pending' },
        { id: 22, year: '资深年', name: '【王者】大阪杯 (G1)', requirement: '3着以内', status: 'pending' },
        { id: 23, year: '资深年', name: '【王者】春季天皇赏 (G1)', requirement: '3着以内', status: 'pending' },
        { id: 24, year: '资深年', name: '【王者】秋季天皇赏 (G1)', requirement: '1着', status: 'pending' },
        { id: 25, year: '资深年', name: '【王者】有马纪念 (G1)', requirement: '1着', status: 'pending' },
      ];
      this.saveMemory();
    },
    checkAllGoalsCompleted() {
      this.checkTitles(); // 每次勾选都检查一下所有称号
    },
    parseRaceData() {
      this.raceDatabase = [
        {
          year: '初级',
          month: '7月前',
          name: '出道失败',
          grade: '出道',
          length: 'ダート 1150',
        },
        {
          year: '初级',
          month: '7月前',
          name: '出道失败',
          grade: '出道',
          length: '芝 1200',
        },
        {
          year: '初级',
          month: '7月前',
          name: '出道失败',
          grade: '出道',
          length: '芝 1800',
        },
        {
          year: '初级',
          month: '7月后',
          name: '函馆ジュニアステークス',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '初级',
          month: '7月后',
          name: '中京ジュニアステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '8月前',
          name: 'ダリア賞',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '初级',
          month: '8月前',
          name: 'フェニックス賞',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '初级',
          month: '8月前',
          name: 'コスモス賞',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '初级',
          month: '8月后',
          name: '出道失败',
          grade: '出道',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '8月后',
          name: '出道失败',
          grade: '出道',
          length: 'ダート 1200',
        },
        {
          year: '初级',
          month: '8月后',
          name: '新潟ジュニアステークス',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '8月后',
          name: 'クローバー賞',
          grade: 'OP',
          length: '芝 1500',
        },
        {
          year: '初级',
          month: '9月前',
          name: '札幌ジュニアステークス',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '初级',
          month: '9月前',
          name: '小倉ジュニアステークス',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '初级',
          month: '9月前',
          name: 'すずらん賞',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '初级',
          month: '9月前',
          name: '野路菊スタークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '初级',
          month: '9月前',
          name: 'アスター賞',
          grade: 'Pre-OP',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '9月后',
          name: 'ききょうスタークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '初级',
          month: '9月后',
          name: '芙蓉スタークス',
          grade: 'OP',
          length: '芝 2000',
        },
        {
          year: '初级',
          month: '9月后',
          name: 'カナンスタークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '初级',
          month: '9月后',
          name: 'サフラン賞',
          grade: 'Pre-OP',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '10月前',
          name: 'プラタナス賞',
          grade: 'Pre-OP',
          length: 'ダート 1600',
        },
        {
          year: '初级',
          month: '10月前',
          name: 'サウジアラビアロイヤルカップ',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '10月前',
          name: 'もみじステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '初级',
          month: '10月前',
          name: 'りんどう賞',
          grade: 'Pre-OP',
          length: '芝 1400',
        },
        {
          year: '初级',
          month: '10月前',
          name: '紫菊赏',
          grade: 'Pre-OP',
          length: '芝 2000',
        },
        {
          year: '初级',
          month: '10月后',
          name: 'なでしこ賞',
          grade: 'Pre-OP',
          length: 'ダート 1800',
        },
        {
          year: '初级',
          month: '10月后',
          name: 'アルテミスステークス',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '10月后',
          name: 'アイビーステークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '初级',
          month: '10月后',
          name: '萩ステークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '初级',
          month: '11月前',
          name: 'オキザリス賞',
          grade: 'Pre-OP',
          length: 'ダート 1400',
        },
        {
          year: '初级',
          month: '11月前',
          name: '京王杯 ジュニアステークス',
          grade: 'GII',
          length: '芝 1400',
        },
        {
          year: '初级',
          month: '11月前',
          name: 'デイリー杯 ジュニアステークス',
          grade: 'GII',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '11月前',
          name: 'ファンタジーステークス',
          grade: 'GIII',
          length: '芝 1400',
        },
        {
          year: '初级',
          month: '11月前',
          name: '福岛ジュニアステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '初级',
          month: '11月前',
          name: '百日草特别',
          grade: 'Pre-OP',
          length: '芝 2000',
        },
        {
          year: '初级',
          month: '11月前',
          name: 'もんもくせい特別',
          grade: 'Pre-OP',
          length: '芝 1800',
        },
        {
          year: '初级',
          month: '11月前',
          name: '黄菊賞',
          grade: 'Pre-OP',
          length: '芝 2000',
        },
        {
          year: '初级',
          month: '11月后',
          name: 'カトレア賞',
          grade: 'Pre-OP',
          length: 'ダート 1600',
        },
        {
          year: '初级',
          month: '11月后',
          name: '東京スポーツ杯 ジュニアステークス',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '初级',
          month: '11月后',
          name: '京都ジュニアステークス',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '初级',
          month: '11月后',
          name: 'もちの木賞',
          grade: 'Pre-OP',
          length: 'ダート 1800',
        },
        {
          year: '初级',
          month: '11月后',
          name: '赤松賞',
          grade: 'Pre-OP',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '11月后',
          name: '秋明菊賞',
          grade: 'Pre-OP',
          length: '芝 1400',
        },
        {
          year: '初级',
          month: '11月后',
          name: 'ペコニア賞',
          grade: 'Pre-OP',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '11月后',
          name: '白菊賞',
          grade: 'Pre-OP',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '11月后',
          name: '葉牡丹賞',
          grade: 'Pre-OP',
          length: '芝 2000',
        },
        {
          year: '初级',
          month: '11月后',
          name: 'こうやまき賞',
          grade: 'Pre-OP',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '12月前',
          name: '寒椿賞',
          grade: 'Pre-OP',
          length: 'ダート 1400',
        },
        {
          year: '初级',
          month: '12月前',
          name: '阪神 ジュベナイルフィリーズ',
          grade: 'GI',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '12月前',
          name: '朝日杯 フューチュリティ ステークス',
          grade: 'GI',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '12月前',
          name: '万両賞',
          grade: 'Pre-OP',
          length: '芝 1400',
        },
        {
          year: '初级',
          month: '12月前',
          name: '黑松賞',
          grade: 'Pre-OP',
          length: '芝 1200',
        },
        {
          year: '初级',
          month: '12月前',
          name: 'エリカ賞',
          grade: 'Pre-OP',
          length: '芝 2000',
        },
        {
          year: '初级',
          month: '12月前',
          name: 'つわぶき賞',
          grade: 'Pre-OP',
          length: '芝 1400',
        },
        {
          year: '初级',
          month: '12月前',
          name: 'ひいらぎ賞',
          grade: 'Pre-OP',
          length: '芝 1600',
        },
        {
          year: '初级',
          month: '12月前',
          name: 'さざんか賞',
          grade: 'Pre-OP',
          length: '芝 1200',
        },
        {
          year: '初级',
          month: '12月后',
          name: 'ホープフルステークス',
          grade: 'GI',
          length: '芝 2000',
        },
        {
          year: '初级',
          month: '12月后',
          name: 'クリスマスローズ ステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '初级',
          month: '12月后',
          name: '千両賞',
          grade: 'Pre-OP',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '1月前',
          name: 'シンザン記念',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '1月前',
          name: 'フェアリーステークス',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '1月前',
          name: '京成杯',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '1月前',
          name: 'ジュニアカップ',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '1月前',
          name: '紅梅ステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '1月后',
          name: '若駒ステークス',
          grade: 'OP',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '1月后',
          name: 'クロッカスステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '2月前',
          name: 'きさらぎ賞',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '2月前',
          name: 'クイーンカップ',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '2月前',
          name: '共同通信杯',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '2月前',
          name: 'エルフィンステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '2月后',
          name: 'ヒヤシンスステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '2月后',
          name: 'すみれステークス',
          grade: 'OP',
          length: '芝 2200',
        },
        {
          year: '经典',
          month: '2月后',
          name: 'マーガレットステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '3月前',
          name: 'アネモネステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '3月前',
          name: '昇竜ステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '3月前',
          name: '弥生賞',
          grade: 'GII',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '3月前',
          name: 'フィリーズレビュー',
          grade: 'GII',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '3月前',
          name: 'チューリップ賞',
          grade: 'GII',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '3月后',
          name: 'フラワーカップ',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '3月后',
          name: '若叶ステークス',
          grade: 'OP',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '3月后',
          name: 'スプリングステークス',
          grade: 'GII',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '3月后',
          name: 'ファルコンステークス',
          grade: 'GIII',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '3月后',
          name: '毎日杯',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '4月前',
          name: '伏竜ステークス',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '经典',
          month: '4月前',
          name: '忘れな草賞',
          grade: 'OP',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '4月前',
          name: '桜花賞',
          grade: 'GI',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '4月前',
          name: '皐月賞',
          grade: 'GI',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '4月前',
          name: 'ニュージーランド トロフィー',
          grade: 'GII',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '4月前',
          name: 'アーリントン カップ',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '4月后',
          name: '橘ステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '4月后',
          name: '端午ステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '4月后',
          name: 'スイートピーステークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '4月后',
          name: 'フローラステークス',
          grade: 'GII',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '4月后',
          name: '青葉賞',
          grade: 'GII',
          length: '芝 2400',
        },
        {
          year: '经典',
          month: '5月前',
          name: 'プリンシパルステークス',
          grade: 'OP',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '5月前',
          name: '青竜ステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '5月前',
          name: 'NHK マイルカップ',
          grade: 'GI',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '5月前',
          name: '京都新聞杯',
          grade: 'GII',
          length: '芝 2200',
        },
        {
          year: '经典',
          month: '5月后',
          name: '鳳雛ステークス',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '经典',
          month: '5月后',
          name: '白百合ステークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '5月后',
          name: 'オークス',
          grade: 'GI',
          length: '芝 2400',
        },
        {
          year: '经典',
          month: '5月后',
          name: '日本ダービー 東京優駿',
          grade: 'GI',
          length: '芝 2400',
        },
        {
          year: '经典',
          month: '5月后',
          name: '葵ステークス',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '6月前',
          name: 'マーメイドステークス',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '6月前',
          name: '天保山ステークス',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '经典',
          month: '6月前',
          name: 'スレイプニルステークス',
          grade: 'OP',
          length: 'ダート 2100',
        },
        {
          year: '经典',
          month: '6月前',
          name: '安田記念',
          grade: 'GI',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '6月前',
          name: '鳴尾記念',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '6月前',
          name: 'エプソムカップ',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '6月后',
          name: 'ユニコーンステークス',
          grade: 'GIII',
          length: 'ダート 1600',
        },
        {
          year: '经典',
          month: '6月后',
          name: 'アハルテケステークス',
          grade: 'OP',
          length: 'ダート 1600',
        },
        {
          year: '经典',
          month: '6月后',
          name: '米子ステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '6月后',
          name: '大沼ステークス',
          grade: 'OP',
          length: 'ダート 1700',
        },
        {
          year: '经典',
          month: '6月后',
          name: 'パラダイスステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '6月后',
          name: '三宮ステークス',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '经典',
          month: '6月后',
          name: '宝塚記念',
          grade: 'GI',
          length: '芝 2200',
        },
        {
          year: '经典',
          month: '6月后',
          name: '函館スプリントステークス',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '6月后',
          name: '帝王賞',
          grade: 'GI',
          length: 'ダート 2000',
        },
        {
          year: '经典',
          month: '7月前',
          name: 'プロキオンステークス',
          grade: 'GIII',
          length: '芝 1400',
        },
        { year: '经典', month: '7月前', name: '巴賞', grade: 'OP', length: '芝 1800' },
        {
          year: '经典',
          month: '7月前',
          name: 'マリーンステークス',
          grade: 'OP',
          length: '芝 1700',
        },
        {
          year: '经典',
          month: '7月前',
          name: '名鉄杯',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '经典',
          month: '7月前',
          name: 'ジャパンダートダービー',
          grade: 'GI',
          length: 'ダート 2000',
        },
        {
          year: '经典',
          month: '7月前',
          name: 'CBC賞',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '7月前',
          name: '七夕賞',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '7月前',
          name: '函館記念',
          grade: 'GIII',
          length: 'ダート 2000',
        },
        {
          year: '经典',
          month: '7月前',
          name: 'ラジオNIKKEI賞',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '7月后',
          name: 'クイーンステークス',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '7月后',
          name: '福島テレビオープン',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '7月后',
          name: '中京記念',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '7月后',
          name: 'アイビスサマーダッシュ',
          grade: 'GIII',
          length: '芝 1000',
        },
        {
          year: '经典',
          month: '8月前',
          name: 'エルムステークス',
          grade: 'GIII',
          length: 'ダート 1700',
        },
        {
          year: '经典',
          month: '8月前',
          name: '札幌日経オープン',
          grade: 'OP',
          length: '芝 2600',
        },
        { year: '经典', month: '8月前', name: 'UHB賞', grade: 'OP', length: '芝 1200' },
        {
          year: '经典',
          month: '8月前',
          name: '阿蘇ステークス',
          grade: 'OP',
          length: 'ダート 1700',
        },
        {
          year: '经典',
          month: '8月前',
          name: '関越ステークス',
          grade: 'OP',
          length: '芝 1700',
        },
        {
          year: '经典',
          month: '8月前',
          name: '小倉記念',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '8月前',
          name: '関屋記念',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '8月前',
          name: 'レパートステークス',
          grade: 'GIII',
          length: 'ダート 1800',
        },
        {
          year: '经典',
          month: '8月后',
          name: 'NST賞',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '经典',
          month: '8月后',
          name: 'BSN賞',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '经典',
          month: '8月后',
          name: '小倉日経ステークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '8月后',
          name: '朱鷺スタークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '8月后',
          name: '札幌記念',
          grade: 'GII',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '8月后',
          name: '北九州記念',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '8月后',
          name: 'キーンランドカップ',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '9月前',
          name: 'セントラルステークス',
          grade: 'GII',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '9月前',
          name: 'ローズステークス',
          grade: 'GII',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '9月前',
          name: '新潟記念',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '9月前',
          name: '京成杯オータム ハンデキャップ',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '9月前',
          name: '紫苑ステークス',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '9月前',
          name: '丹頂ステークス',
          grade: 'OP',
          length: '芝 2600',
        },
        {
          year: '经典',
          month: '9月前',
          name: 'エニフステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '9月前',
          name: 'ラジオ日本賞',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '9月后',
          name: 'スプリンダーズ ステークス',
          grade: 'GI',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '9月后',
          name: '神戸新聞杯',
          grade: 'GII',
          length: '芝 2400',
        },
        {
          year: '经典',
          month: '9月后',
          name: 'オールカマー',
          grade: 'GII',
          length: '芝 2200',
        },
        {
          year: '经典',
          month: '9月后',
          name: 'セントライト記念',
          grade: 'GII',
          length: '芝 2200',
        },
        {
          year: '经典',
          month: '9月后',
          name: 'シリウス ステークス',
          grade: 'OP',
          length: 'ダート 2000',
        },
        {
          year: '经典',
          month: '9月后',
          name: 'ポートアイランド ステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '9月后',
          name: 'ながつき ステークス',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '经典',
          month: '10月前',
          name: '毎日王冠',
          grade: 'GII',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '10月前',
          name: '京都大賞典',
          grade: 'GII',
          length: '芝 2400',
        },
        {
          year: '经典',
          month: '10月前',
          name: '府中ウマ娘ステークス',
          grade: 'GII',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '10月前',
          name: 'オバールステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '10月前',
          name: 'グリーンチャンネルカップ',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '经典',
          month: '10月前',
          name: 'オクトーバーステークス',
          grade: 'OP',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '10月前',
          name: '信越ステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '10月前',
          name: '太秦ステークス',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '经典',
          month: '10月后',
          name: 'スワンステークス',
          grade: 'GII',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '10月后',
          name: '富士ステークス',
          grade: 'GII',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '10月后',
          name: '室酊ステークス',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '经典',
          month: '10月后',
          name: 'ブラジルカップ',
          grade: 'OP',
          length: 'ダート 2100',
        },
        {
          year: '经典',
          month: '10月后',
          name: 'カシオペアステークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '10月後',
          name: 'ルミエールオータムダッシュ',
          grade: 'OP',
          length: '芝 1000',
        },
        {
          year: '经典',
          month: '10月后',
          name: '天皇賞(秋)',
          grade: 'GI',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '10月后',
          name: '秋華賞',
          grade: 'GI',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '10月后',
          name: '菊花賞',
          grade: 'GI',
          length: '芝 3000',
        },
        {
          year: '经典',
          month: '11月前',
          name: 'アルゼンチン共和国杯',
          grade: 'GII',
          length: '芝 2500',
        },
        {
          year: '经典',
          month: '11月前',
          name: 'みやこステークス',
          grade: 'GIII',
          length: 'ダート 1800',
        },
        {
          year: '经典',
          month: '11月前',
          name: '武蔵野ステークス',
          grade: 'GIII',
          length: 'ダート 1600',
        },
        {
          year: '经典',
          month: '11月前',
          name: '福島記念',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '11月前',
          name: 'オーロカップ',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '11月前',
          name: 'エリザベス女王杯',
          grade: 'GI',
          length: '芝 2200',
        },
        {
          year: '经典',
          month: '11月前',
          name: 'JBCレディスクラシック',
          grade: 'GI',
          length: 'ダート 1800',
        },
        {
          year: '经典',
          month: '11月前',
          name: 'JBCスプリント',
          grade: 'GI',
          length: 'ダート 1200',
        },
        {
          year: '经典',
          month: '11月前',
          name: 'JBCクラシック',
          grade: 'GI',
          length: 'ダート 2000',
        },
        {
          year: '经典',
          month: '11月后',
          name: '京阪杯',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '11月后',
          name: 'アンドロメダステークス',
          grade: 'OP',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '11月后',
          name: '霜月ステークス',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '经典',
          month: '11月后',
          name: '福島民友カップ',
          grade: 'OP',
          length: 'ダート 1700',
        },
        {
          year: '经典',
          month: '11月后',
          name: 'キャピタルステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '11月后',
          name: 'オータムリーフステークス',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '经典',
          month: '11月后',
          name: 'マイルチャンピオンシップ',
          grade: 'GI',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '11月后',
          name: 'ジャパンカップ',
          grade: 'GI',
          length: '芝 2400',
        },
        {
          year: '经典',
          month: '12月前',
          name: 'ステイヤーズステークス',
          grade: 'GII',
          length: '芝 3600',
        },
        {
          year: '经典',
          month: '12月前',
          name: 'チャレンジカップ',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '12月前',
          name: '中日新聞杯',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '经典',
          month: '12月前',
          name: 'カペラステークス',
          grade: 'GIII',
          length: 'ダート 1200',
        },
        {
          year: '经典',
          month: '12月前',
          name: 'ターコイズステークス',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '12月前',
          name: 'ラピスラズリステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '12月前',
          name: '師走ステークス',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '经典',
          month: '12月前',
          name: 'リゲルステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '经典',
          month: '12月前',
          name: 'タンザナイトステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '经典',
          month: '12月前',
          name: 'ディセンバーステークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '经典',
          month: '12月前',
          name: 'チャンピオンズ カップ',
          grade: 'GI',
          length: 'ダート 1800',
        },
        {
          year: '经典',
          month: '12月后',
          name: '阪神カップ',
          grade: 'GII',
          length: '芝 1400',
        },
        {
          year: '经典',
          month: '12月后',
          name: 'キャラクシーステークス',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '经典',
          month: '12月后',
          name: 'ベテルギウスステークス',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '经典',
          month: '12月后',
          name: '有馬記念',
          grade: 'GI',
          length: '芝 2500',
        },
        {
          year: '经典',
          month: '12月后',
          name: '東京大賞典',
          grade: 'GI',
          length: 'ダート 2000',
        },
        {
          year: '高级',
          month: '1月前',
          name: '日経新春杯',
          grade: 'GII',
          length: '芝 2400',
        },
        {
          year: '高级',
          month: '1月前',
          name: '京都金杯',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '1月前',
          name: '中山金杯',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '1月前',
          name: '愛知杯',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '1月前',
          name: '万葉ステークス',
          grade: 'OP',
          length: '芝 3000',
        },
        {
          year: '高级',
          month: '1月前',
          name: '淀短距離ステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '1月前',
          name: 'ポルックスステークス',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '1月前',
          name: 'ジャニュアリーステークス',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '高级',
          month: '1月前',
          name: 'ニューイヤーステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '1月前',
          name: 'カーバンクルステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '1月后',
          name: '東海ステークス',
          grade: 'GII',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '1月后',
          name: 'アメリカJCC',
          grade: 'GII',
          length: '芝 2200',
        },
        {
          year: '高级',
          month: '1月后',
          name: 'シルクロードステークス',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '1月后',
          name: '根岸ステークス',
          grade: 'GIII',
          length: 'ダート 1400',
        },
        {
          year: '高级',
          month: '1月后',
          name: 'すばるステークス',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '高级',
          month: '1月后',
          name: '白富士ステークス',
          grade: 'OP',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '2月前',
          name: '京都記念',
          grade: 'GII',
          length: '芝 2200',
        },
        {
          year: '高级',
          month: '2月前',
          name: '東京新聞杯',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '2月前',
          name: '大和ステークス',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '高级',
          month: '2月前',
          name: '洛陽ステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '2月前',
          name: 'アルデバランステークス',
          grade: 'OP',
          length: 'ダート 1900',
        },
        {
          year: '高级',
          month: '2月前',
          name: 'バレンタインステークス',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '高级',
          month: '2月后',
          name: '中山記念',
          grade: 'GII',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '2月后',
          name: '京都ウマ娘ステークス',
          grade: 'GIII',
          length: '芝 1400',
        },
        {
          year: '高级',
          month: '2月后',
          name: 'ダイアモンドステークス',
          grade: 'GIII',
          length: '芝 3400',
        },
        {
          year: '高级',
          month: '2月后',
          name: '小倉大賞典',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '2月后',
          name: '阪急杯',
          grade: 'GIII',
          length: '芝 1400',
        },
        {
          year: '高级',
          month: '2月后',
          name: '総武ステークス',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '2月后',
          name: '北九州短距離ステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '2月后',
          name: 'フェブラリーステークス',
          grade: 'GI',
          length: 'ダート 1600',
        },
        {
          year: '高级',
          month: '3月前',
          name: '金鯱賞',
          grade: 'GII',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '3月前',
          name: 'オーシャンステークス',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '3月前',
          name: '中山ウマ娘ステークス',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '3月前',
          name: '大阪城ステークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '3月前',
          name: 'ポラリスステークス',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '高级',
          month: '3月前',
          name: '仁川ステークス',
          grade: 'OP',
          length: 'ダート 2000',
        },
        {
          year: '高级',
          month: '3月前',
          name: '東風ステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '3月后',
          name: '阪神大賞典',
          grade: 'GII',
          length: '芝 3000',
        },
        {
          year: '高级',
          month: '3月后',
          name: '日経賞',
          grade: 'GII',
          length: '芝 2500',
        },
        {
          year: '高级',
          month: '3月后',
          name: 'マーチステークス',
          grade: 'GIII',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '3月后',
          name: '千葉ステークス',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '高级',
          month: '3月后',
          name: '六甲ステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '3月后',
          name: '高松宮記念',
          grade: 'GI',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '3月后',
          name: '大阪杯',
          grade: 'GI',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '4月前',
          name: '阪神ウマ娘ステークス',
          grade: 'GII',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '4月前',
          name: 'ダービー卿チャレンジトロフィー',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '4月前',
          name: 'アンタレスステークス',
          grade: 'GIII',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '4月前',
          name: 'コーラルステークス',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '高级',
          month: '4月前',
          name: '京葉ステークス',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '高级',
          month: '4月前',
          name: '春雷ステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '4月前',
          name: '福島民報杯',
          grade: 'OP',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '4月前',
          name: '吾妻小富士ステークス',
          grade: 'OP',
          length: 'ダート 1700',
        },
        {
          year: '高级',
          month: '4月后',
          name: 'マイラーズカップ',
          grade: 'GII',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '4月后',
          name: '福島ウマ娘ステークス',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '4月后',
          name: 'オアシスステークス',
          grade: 'OP',
          length: 'ダート 1600',
        },
        {
          year: '高级',
          month: '4月后',
          name: '天王山ステークス',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '高级',
          month: '4月后',
          name: '天皇赏(春)',
          grade: 'GI',
          length: '芝 3200',
        },
        {
          year: '高级',
          month: '5月前',
          name: '京王杯スプリングカップ',
          grade: 'GII',
          length: '芝 1400',
        },
        {
          year: '高级',
          month: '5月前',
          name: '新潟大賞典',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '5月前',
          name: '谷川岳ステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '5月前',
          name: 'メトロポリタンステークス',
          grade: 'OP',
          length: '芝 2400',
        },
        {
          year: '高级',
          month: '5月前',
          name: '鞍馬ステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '5月前',
          name: 'ブリリアントステークス',
          grade: 'OP',
          length: 'ダート 2100',
        },
        {
          year: '高级',
          month: '5月前',
          name: '都大路ステークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '5月前',
          name: '栗東ステークス',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '高级',
          month: '5月前',
          name: 'ヴィクトリアマイル',
          grade: 'GI',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '5月后',
          name: '目黑記念',
          grade: 'GII',
          length: '芝 2500',
        },
        {
          year: '高级',
          month: '5月后',
          name: '平安ステークス',
          grade: 'GIII',
          length: 'ダート 1900',
        },
        {
          year: '高级',
          month: '5月后',
          name: 'メイステイズ',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '5月后',
          name: '韋駄天ステークス',
          grade: 'OP',
          length: '芝 1000',
        },
        {
          year: '高级',
          month: '5月后',
          name: '欅ステークス',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '高级',
          month: '5月后',
          name: '安土城ステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '高级',
          month: '6月前',
          name: 'マーメイドステークス',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '6月前',
          name: '天保山ステークス',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '高级',
          month: '6月前',
          name: 'スレイプニルステークス',
          grade: 'OP',
          length: 'ダート 2100',
        },
        {
          year: '高级',
          month: '6月前',
          name: '安田記念',
          grade: 'GI',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '6月前',
          name: '鳴尾記念',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '6月前',
          name: 'エプソムカップ',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '6月后',
          name: 'アハルテケステークス',
          grade: 'OP',
          length: 'ダート 1600',
        },
        {
          year: '高级',
          month: '6月后',
          name: '米子ステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '6月后',
          name: '大沼ステークス',
          grade: 'OP',
          length: 'ダート 1700',
        },
        {
          year: '高级',
          month: '6月后',
          name: 'パラダイスステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '高级',
          month: '6月后',
          name: '三宮ステークス',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '6月后',
          name: '宝塚記念',
          grade: 'GI',
          length: '芝 2200',
        },
        {
          year: '高级',
          month: '6月后',
          name: '函館スプリントステークス',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '6月后',
          name: '帝王賞',
          grade: 'GI',
          length: 'ダート 2000',
        },
        {
          year: '高级',
          month: '7月前',
          name: 'プロキオンステークス',
          grade: 'GIII',
          length: '芝 1400',
        },
        { year: '高级', month: '7月前', name: '巴賞', grade: 'OP', length: '芝 1800' },
        {
          year: '高级',
          month: '7月前',
          name: 'マリーンステークス',
          grade: 'OP',
          length: '芝 1700',
        },
        {
          year: '高级',
          month: '7月前',
          name: '名鉄杯',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '7月前',
          name: 'CBC賞',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '7月前',
          name: '七夕賞',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '7月前',
          name: '函館記念',
          grade: 'GIII',
          length: 'ダート 2000',
        },
        {
          year: '高级',
          month: '7月后',
          name: 'クイーンステークス',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '7月后',
          name: '福島テレビオープン',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '7月后',
          name: '中京記念',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '7月后',
          name: 'アイビスサマーダッシュ',
          grade: 'GIII',
          length: '芝 1000',
        },
        {
          year: '高级',
          month: '8月前',
          name: 'エルムステークス',
          grade: 'GIII',
          length: 'ダート 1700',
        },
        {
          year: '高级',
          month: '8月前',
          name: '札幌日経オープン',
          grade: 'OP',
          length: '芝 2600',
        },
        { year: '高级', month: '8月前', name: 'UHB賞', grade: 'OP', length: '芝 1200' },
        {
          year: '高级',
          month: '8月前',
          name: '阿蘇ステークス',
          grade: 'OP',
          length: 'ダート 1700',
        },
        {
          year: '高级',
          month: '8月前',
          name: '関越ステークス',
          grade: 'OP',
          length: '芝 1700',
        },
        {
          year: '高级',
          month: '8月前',
          name: '小倉記念',
          grade: 'GIII',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '8月前',
          name: '関屋記念',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '8月前',
          name: 'レパートステークス',
          grade: 'GIII',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '8月后',
          name: 'NST賞',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '8月后',
          name: 'BSN賞',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '高级',
          month: '8月后',
          name: '小倉日経ステークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '8月后',
          name: '朱鷺スタークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '高级',
          month: '8月后',
          name: '札幌記念',
          grade: 'GII',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '8月后',
          name: '北九州記念',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '8月后',
          name: 'キーンランドカップ',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '9月前',
          name: 'セントラルステークス',
          grade: 'GII',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '9月前',
          name: '新潟記念',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '9月前',
          name: '京成杯オータム ハンデキャップ',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '9月前',
          name: '丹頂ステークス',
          grade: 'OP',
          length: '芝 2600',
        },
        {
          year: '高级',
          month: '9月前',
          name: 'エニフステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '高级',
          month: '9月前',
          name: 'ラジオ日本賞',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '9月后',
          name: 'スプリンダーズ ステークス',
          grade: 'GI',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '9月后',
          name: 'オールカマー',
          grade: 'GII',
          length: '芝 2200',
        },
        {
          year: '高级',
          month: '9月后',
          name: 'シリウス ステークス',
          grade: 'OP',
          length: 'ダート 2000',
        },
        {
          year: '高级',
          month: '9月后',
          name: 'ポートアイランド ステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '9月后',
          name: 'ながつき ステークス',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '高级',
          month: '10月前',
          name: '毎日王冠',
          grade: 'GII',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '10月前',
          name: '京都大賞典',
          grade: 'GII',
          length: '芝 2400',
        },
        {
          year: '高级',
          month: '10月前',
          name: '府中ウマ娘ステークス',
          grade: 'GII',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '10月前',
          name: 'オバールステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '10月前',
          name: 'グリーンチャンネルカップ',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '高级',
          month: '10月前',
          name: 'オクトーバーステークス',
          grade: 'OP',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '10月前',
          name: '信越ステークス',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '高级',
          month: '10月前',
          name: '太秦ステークス',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '10月后',
          name: 'スワンステークス',
          grade: 'GII',
          length: '芝 1400',
        },
        {
          year: '高级',
          month: '10月后',
          name: '富士ステークス',
          grade: 'GII',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '10月后',
          name: '室酊ステークス',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '高级',
          month: '10月后',
          name: 'ブラジルカップ',
          grade: 'OP',
          length: 'ダート 2100',
        },
        {
          year: '高级',
          month: '10月后',
          name: 'カシオペアステークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '10月后',
          name: 'ルミエールオータムダッシュ',
          grade: 'OP',
          length: '芝 1000',
        },
        {
          year: '高级',
          month: '10月后',
          name: '天皇賞(秋)',
          grade: 'GI',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '11月前',
          name: 'アルゼンチン共和国杯',
          grade: 'GII',
          length: '芝 2500',
        },
        {
          year: '高级',
          month: '11月前',
          name: 'みやこステークス',
          grade: 'GIII',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '11月前',
          name: '武蔵野ステークス',
          grade: 'GIII',
          length: 'ダート 1600',
        },
        {
          year: '高级',
          month: '11月前',
          name: '福島記念',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '11月前',
          name: 'オーロカップ',
          grade: 'OP',
          length: '芝 1400',
        },
        {
          year: '高级',
          month: '11月前',
          name: 'エリザベス女王杯',
          grade: 'GI',
          length: '芝 2200',
        },
        {
          year: '高级',
          month: '11月前',
          name: 'JBCレディスクラシック',
          grade: 'GI',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '11月前',
          name: 'JBCスプリント',
          grade: 'GI',
          length: 'ダート 1200',
        },
        {
          year: '高级',
          month: '11月前',
          name: 'JBCクラシック',
          grade: 'GI',
          length: 'ダート 2000',
        },
        {
          year: '高级',
          month: '11月后',
          name: '京阪杯',
          grade: 'GIII',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '11月后',
          name: 'アンドロメダステークス',
          grade: 'OP',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '11月后',
          name: '霜月ステークス',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '高级',
          month: '11月后',
          name: '福島民友カップ',
          grade: 'OP',
          length: 'ダート 1700',
        },
        {
          year: '高级',
          month: '11月后',
          name: 'キャピタルステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '11月后',
          name: 'オータムリーフステークス',
          grade: 'OP',
          length: 'ダート 1200',
        },
        {
          year: '高级',
          month: '11月后',
          name: 'マイルチャンピオンシップ',
          grade: 'GI',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '11月后',
          name: 'ジャパンカップ',
          grade: 'GI',
          length: '芝 2400',
        },
        {
          year: '高级',
          month: '12月前',
          name: 'ステイヤーズステークス',
          grade: 'GII',
          length: '芝 3600',
        },
        {
          year: '高级',
          month: '12月前',
          name: 'チャレンジカップ',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '12月前',
          name: '中日新聞杯',
          grade: 'GIII',
          length: '芝 2000',
        },
        {
          year: '高级',
          month: '12月前',
          name: 'カペラステークス',
          grade: 'GIII',
          length: 'ダート 1200',
        },
        {
          year: '高级',
          month: '12月前',
          name: 'ターコイズステークス',
          grade: 'GIII',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '12月前',
          name: 'ラピスラズリステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '12月前',
          name: '師走ステークス',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '12月前',
          name: 'リゲルステークス',
          grade: 'OP',
          length: '芝 1600',
        },
        {
          year: '高级',
          month: '12月前',
          name: 'タンザナイトステークス',
          grade: 'OP',
          length: '芝 1200',
        },
        {
          year: '高级',
          month: '12月前',
          name: 'ディセンバーステークス',
          grade: 'OP',
          length: '芝 1800',
        },
        {
          year: '高级',
          month: '12月前',
          name: 'チャンピオンズ カップ',
          grade: 'GI',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '12月后',
          name: '阪神カップ',
          grade: 'GII',
          length: '芝 1400',
        },
        {
          year: '高级',
          month: '12月后',
          name: 'キャラクシーステークス',
          grade: 'OP',
          length: 'ダート 1400',
        },
        {
          year: '高级',
          month: '12月后',
          name: 'ベテルギウスステークス',
          grade: 'OP',
          length: 'ダート 1800',
        },
        {
          year: '高级',
          month: '12月后',
          name: '有馬記念',
          grade: 'GI',
          length: '芝 2500',
        },
        { year: '高级', month: '12月后', name: '東京大賞典', grade: 'GI', length: 'ダート 2000' },
      ];
    },
    parseQuotes() {
      this.vibrosQuotes = [
        '爱自己，才是最高级的名流范儿，这是一辈子的浪漫哦！',
        '关掉那些无聊的书，我的身上，可都是月亮的光辉呢！',
        '天气这么好，就像闪闪发光的橘子一样，不和我去约会吗？',
        '我和自己玩了那么久，还是觉得和你在一起最好玩！',
        '每一年都有风，风会吹过每一年，而我会慢慢地、慢慢地，一直陪着你哦。',
        '天色一下子就晚了，山和河都染上了秋天的颜色，感觉有点想撒娇了呢。',
        '我们听了那么多大道理，结果还是觉得，买买买最开心啦！不是吗？',
        '和这世界上稀疏的月光一起，好好地睡一觉吧~',
        '要去发光，而不是被别人照亮，懂吗？你就是我最亮的光！',
        '宇宙可真谦虚呀，明明什么都有，却叫自己‘太空’，耶嘿嘿~',
        '如果以后都没有光了，那我就是你唯一的光哦，拖累那亲！但是，我又活蹦乱跳地出来啦！',
        '世界上那些好东西呀，都靠不住，就像漂亮的云和琉璃，一下子就碎掉了。所以，要抓紧现在的快乐才行！',
        '下次你再路过的时候，说不定我就去迪拜当名流了，找不到我了哦~',
        '那时候的月亮还在呢，它也见过我开开心心回家的样子！',
        '大家都约在黄昏见面，可惜呀，我们都不再是那时候的小孩子啦。',
        '现在的心情就是现在的天气！什么都不用想，当个快乐的小神仙就好啦！',
        '吃一碗人间的烟火，喝几杯我们的起起落落，感觉也不赖嘛！',
        '青山白云，只要和你在一起，哪里都是最安心的家。',
        '有客人从好远的地方来，眉毛上还带着远方的风和雨，听起来就好帅气！',
        '你看，到处都是星星，春天又来啦！',
        '有月亮照着我们的山河，就没什么好怕的。',
        '就和以前一样，所有事情都会变得超级顺利的！我保证！',
        '雨停了，有车开过来，穿过傍晚白茫茫的雾气，感觉好浪漫。',
        '满眼都是山色，清风才不知道我在想什么呢！',
        '风好大，天好阴，但只要你肯来，一切就都放晴啦！',
        '潮水涨了又落，就像我对你的喜欢，起起伏伏的~',
        '橘子才不是唯一的水果呢！就像我，可能性多着呢！',
        '大家都走啦，天上只剩下一弯淡淡的月亮，天也像水一样。',
        '把梦想当成小鹿，就不会被关在笼子里啦！',
        '树林边的雾气，让城里感觉更冷了，快抱紧我！',
        '写了十万字的情书，好像还是没能让你心跳加速呀，真没办法~',
        '时光这么亮，我才不要哭哭啼啼的呢。',
        '找几个漂亮的地方，把星星都给比下去！',
        '山追着山，一座座山连成了关口，我们也要这样，一直连在一起！',
        '人世间嘛，酸甜苦辣，就像一条长长的河，慢慢流淌。',
        '就算世界有千万种风情，也比不上你矜贵的样子。',
        '你笑起来的样子，就像是最好的天气！',
        '就这样开开心心的，把天真和快乐都享受到最后一刻！',
        '我从海上来，袖子里都装满了海浪的声音哦！',
        '人间有什么意思呢？不过是看看风，看看月亮，舒舒服服的。',
        '背对着山河，脚下踩着清风和明月，感觉自己超帅的！',
        '被夜晚追着跑，被孤独烧成了火，听起来好惨哦，还好有你。',
        '在僧人的小屋里听雨，在屋檐下喝茶，感觉会很安静呢。',
        '我不是要回家的人，我只是路过你心里的过客哦~',
        '我就像一片孤单的云，在天上飘来飘去~',
        '这句话的结尾，是一场雨。听起来是不是很有感觉？',
        '别等什么风花雪月啦，要献，就直接献上亲吻嘛！',
        '我呀，只要能一直像现在这样开心，就足够了。',
        '和青云路无关，也和那些书本无关，只和你有关。',
        '谁能凭着一点喜欢，就想把富士山变成私人的东西呀？太贪心啦！',
        '在过去的日子里，我也见过太阳刚升起的样子哦。',
        '少年呀，他提着灯去逗猫了，真可爱。',
        '我梦里有万里的风花雪月，但只有你，最决绝地把我叫醒。',
        '只剩下月亮，自己一个人在那里好看。',
        '刺客和月光，一起去了别的地方。听起来好酷！',
        '在大地上，我们只能活一次，所以要尽情享乐才行！',
        '春天的傍晚，看一场大雨把花都打落，别有一番风味呢。',
        '我们上了同一条船，是去送命，还是去找乐子呢？',
        '晚来的风，暖暖的太阳，真可爱呀。',
        '如果能忘掉那些渴望，岁月就会很长，衣服也会很薄。',
        '应该坐上火箭，‘咻’地一下飞到月亮上去！',
        '好多雪的灰烬，因为这样，才能被保存下来。',
        '你就像是限定商店里的SSR级商品，好不容易遇到了，却又怕被别人抢走，好烦恼啊！',
        '看到你的那一刻，我就知道，我以后所有的白日梦，都是关于怎么和你一起去迪拜的啦！',
        '在大家都觉得我不行的时候，只有你还相信我，你就是我心里最后的那支、最闪亮的胡萝卜呀！',
        '我才不是为了什么荣誉才去海外远征的，只是因为你在那里等我，我才去的嘛！',
        '第一次见到你的时候，我的心‘砰’的一下，就像庆功派对上的礼花！耶嘿嘿，虽然有点乱，但超开心的！',
        '训练场的灯光很亮，终点线的彩带也很漂亮，但还是你的眼睛，最最闪亮啦！',
        '只是在人群里多看了你一眼，之后我的目光就再也没办法从你身上移开啦！',
        '你真是的，你笑起来的时候，我就不想训练了；你不笑的时候，我又觉得训练没劲了，你好烦哦！',
        '从我们签约那天起，你就是我的专属星星了，不管白天还是晚上，都在我心里闪闪发光！',
        '我跑过好多好多赛场，看过好多好多云，也吃过好多好多甜点，但最最喜欢的，还是现在这个会陪我撒娇的你！',
        '最幸运的事情有两件哦！一件是，总有一天我会长大，不再因为你不理我就哭鼻子；另一件是，很久很久以前，我在商店街遇到了你！',
        '虽然我们总有一天会毕业、会分开，但是在那天到来之前，你要一直一直陪着我哦，说好了！',
        '我所有的问题都是‘你，我们今天吃什么？’，我跑的每一步都是为了扑到你的怀里！',
        '呐，你，你要是再用那种冷淡的眼神看我，我的心就要像冬天没开暖气的宿舍一样，结冰了啦！',
        '遇到你之前，我没想过要把决胜服改成婚纱；遇到你之后，我没想过这件婚纱要为别人穿哦！',
        '喜欢你，才不是因为你能带我赢比赛，也不是因为你给我买好吃的，而是……一种就算训练再累，只要一想到你就会重新充满干劲的、傻乎乎的梦想！',
        '你的夸奖，就像带着光一样，顺着我的耳朵溜进心里，让我的世界一下子就变得亮晶晶的！',
        '当我要挑战最强的对手时，只要看到你在终点线等我，就像看到了胜利的旗子在飘扬！',
        '我看着训练场上的月亮，看到的却全是你的脸，真是的，都怪你啦！',
        '听到大家在讨论战术，明明和恋爱一点关系都没有，我脑子里还是会想，这个战术能让我在终点更快地见到你吗？',
        '以前觉得，买很多很多漂亮衣服，就是最幸福的事。现在才发现，原来能让我心甘情愿穿一辈子的，只有那件和你一起赢得的决胜服而已。',
        '不管别的女孩子有多可爱，你都不许动摇哦！因为喜欢我这件事，是你自己的品味，是你自己的眼光，是你自己的决定，不许反悔！',
        '人生就像在商场里找限定商品，花了好久才找到入口，结果下半辈子都在烦恼怎么把你这个‘非卖品’带出出口！',
        '呐，你，我想从你的宿舍窗户看星星，可以吗？',
        '以前的比赛我没赶上和你一起，但从今天起，以后所有的胜利，都要有你在旁边为我欢呼哦！',
        '有的人让我觉得训练好累想发火，有的人让我觉得好无聊冷场，只有你，能让我的心跳，比冲刺的时候还要快那么一点点哦！',
        '如果你喜欢我，讲话的时候一定会结结巴巴，不知道该夸我哪里好吧？耶嘿嘿，我知道的哦！',
        '如果我们的故事是一本漫画，那第一页就应该是你被我缠着去逛街的样子！',
        '你只要对我笑一笑，不用说话，我就会觉得，之前为了引起你注意做的那些恶作剧，全都值了！',
        '希望我能像星星，你像月亮，这样每晚我都能在你的光里，闪闪发光地睡觉啦！',
        '十几岁女孩子的喜欢才不是随便说说的！是昨天梦到和你一起去迪拜了，早上起来，食堂的胡萝卜芭菲都变得特别甜，然后就想把最好吃的那一口，留给你，所以就跑来找你啦！',
        '我才不是在等你批准训练计划呢，我是在等你夸我‘今天也很可爱’呀！',
        '等我老了，可能会忘记很多比赛的冠军是谁，但一定不会忘记，你是怎么把我宠成一个小公主的！',
        '才不要问你心里有没有我呢，反正你的眼睛，从上到下，从左到右，全都是我的影子！',
        '不管几岁，女孩子想要撒娇的心情，都是最合理的啦！',
        '赛道旁边的花开了，就像我看到你时，心里‘砰’地一下开花一样！',
        '要去见你的路上，连风都是甜的，因为我知道，见到你之后，我的心情会比风还要甜！',
        '如果有一天，你不再是我的训练员了，那我觉得，整个世界好像都跟我没关系了……风再大，也吹不进我的心里了。',
        '喜欢就是……想把新买的发夹别在你衣服上，让你带着我的记号去工作，但又怕被别人看到，只好悄悄收回手啦！',
        '我才不会问你‘想不想我’呢！因为，只有你也想被我缠着的时候，我的撒娇才有意义呀！',
        '大家从解说员的话里，听到了比赛的胜负，但我只听到了，我的名字和你的名字，被连在了一起。',
        '我真想拉着你的手，逃到迪拜的沙滩上，什么训练、什么比赛都忘掉，只和你一起看夕阳！',
        '如果训练结束的傍晚下起了小雪，训练场的灯光亮起来，而你笑着向我走过来，那什么灯光、什么雪色，都比不上你的万分之一好看！',
        '呐，虽然你有时候有点呆呆的，品味也需要我来指导，还会被我捉弄，但是我就是喜欢你嘛！',
        '如果我们毕业后很久才再见面，我该怎么办呀？是哭着扑到你怀里，还是装作不认识你，然后偷偷跟在你后面？',
        '只要和你在一起，我的尾巴肯定会摇个不停的，耶嘿嘿，就算不好意思，也停不下来！',
        '如果你要离开，请不要告诉我哦，让我一直以为你只是去帮我买限定甜点了，这样我就会一直、一直等下去。',
        '只有在你面前，我才不用假装自己是‘名流’，可以随便撒娇，随便耍赖！',
        '我画了姐姐们，画了朋友们，就是没画你。因为，你太闪亮了，我怕我的画笔，画不出你万分之一的好看。',
        '本小姐的一切都给你啦！包括我喜欢乱花钱的习惯、爱撒娇的小脾气、还有捉弄人的坏心眼……虽然很麻烦，但有一点是最好的，那就是，我最喜欢你啦！',
        '哼，你才不是因为不喜欢我才对我那么严格的，你就是仗着我喜欢你，才敢这么要求我的！',
        '你不在的时候，一天就是普通的训练、吃饭、睡觉。你在的时候嘛，撒娇的时间多一点，发呆傻笑的时间也多一点！',
        '一想到你，我这张总是气鼓鼓的脸，就会忍不住笑起来啦！',
        '你的眼睛里有训练场的灯光，你的微笑里有胜利后的阳光，你一转身我就想跟着跑，你一皱眉我就想撒娇，只要你在我心里，我就拥有了全世界的赛道！',
        '你的一个笑容，就让我觉得之前所有的辛苦训练都值了；一滴汗水，就让我觉得好像赢下了全世界！',
        '好多人都喜欢我赢比赛时闪亮的样子，但只有你，会喜欢我输掉比赛后哭鼻子的样子，还会摸摸我的头。',
        '只要能真心喜欢着你，就算赢不了所有比赛也没关系。因为喜欢你的心情，本身就能拯救我啦！',
        '喜欢你这件事，就像发烧一样，突然就脸红心跳了，完全不受我自己控制嘛！',
        '我的眼睛总是不停地在找你，而你也总是很厉害，隔着那么多人，都能一下子就看到我，然后对我笑！',
        '在遇到你之前，我才不怕输比赛，也不怕一个人去远征。现在嘛，却总是在想，以后毕业了要怎么办呀。',
        '喜欢你的心情，真是好厉害！能让无聊的训练变得有趣，能让普通的我变得闪亮，还能让输掉的比赛，变成下一次撒娇的借口！',
        '你的眼睛，在训练场的灯光下闪闪发光，比迪拜的钻石还要纯净！',
        '只要一想到你，整个世界好像都慢下来了，连时间都好像被我的心跳声吓跑了！',
        '我一直在躲着那些麻烦的家伙，但我终于找到想要保护的人了，那就是你你呀！虽然好像，一直都是你在保护我啦……',
        '我想和你一起浪费时间，比如，一起在商店橱窗前发呆，看那些我们买不起的漂亮东西。',
        '我们以后老了，也要像现在这样，在训练场边的长椅上，手拉着手，心对着心，悄悄说别人的坏话！',
      ];
    },
    parseTitleData() {
      this.titleDatabase = [
        {
          title: '【日本的总大将】',
          name: '特别周',
          explanation:
            'TA在1998年日本德比中以第一人气领先5个马位取胜，之后又打破了“德比马难赢古马战”的魔咒，先后拿下了1999年春季天皇赏、秋季天皇赏、日本杯的胜利。',
          hints: [
            'TA是日本的总大将。',
            'TA打破了“德比马难赢古马战”的魔咒。',
            'TA的胜利包括春季天皇赏、秋季天皇赏和日本杯。',
          ],
        },
        {
          title: '【异次元的逃亡者】',
          name: '无声铃鹿',
          explanation:
            'TA采用爆领（大逃げ）战术前成绩一直不稳定，但在改用爆领战术后立刻重赏六连胜，直到1998年秋季天皇赏中“沉默的星期日”。',
          hints: ['TA的跑法是异次元的。', 'TA擅长“大逃”战术。', 'TA的连胜终结于一个“沉默的星期日”。'],
        },
        {
          title: '【帝王】',
          name: '东海帝王',
          explanation:
            'TA的父亲是赢得7个GⅠ的“皇帝”，生涯中多次获得第一人气，并以无败状态赢得皋月赏与日本德比，更在经历长期休养后“奇迹复活”赢得有马纪念。',
          hints: ['TA是“皇帝”的孩子。', 'TA曾以不败之姿拿下两冠。', 'TA上演过“奇迹的复活”。'],
        },
        {
          title: '【超级跑车】',
          name: '丸善斯基',
          explanation: 'TA生涯8战8胜，其中6场都超过第二名7马位差距，总计超过第二名61个马位之多。',
          hints: ['TA的速度像超级跑车一样快。', 'TA生涯全胜。', 'TA平均胜利差距极大。'],
        },
        {
          title: '【华丽的三冠赛马娘】',
          name: '富士奇石',
          explanation:
            'TA在出道战中以8个马位大胜，并以无败状态赢下朝日杯和弥生赏，但因伤病提前退役，未能挑战经典三冠。',
          hints: ['TA的出道战赢得非常“华丽”。', 'TA本有希望成为三冠马娘。', '伤病终结了TA的“奇迹”生涯。'],
        },
        {
          title: '【偶像赛马娘】',
          name: '小栗帽',
          explanation:
            'TA的故事掀起了极大的反响，这股“小栗帽风潮”也让日本赛马走进了更多人的心中，生涯多次获得GⅠ第一人气。',
          hints: ['TA是毋庸置疑的顶级偶像。', 'TA掀起了一股社会级的风潮。', 'TA的名字里有一种帽子。'],
        },
        {
          title: '【破天荒】',
          name: '黄金船',
          explanation: 'TA生涯共获得6次GⅠ胜利，但因为怪脾气和各种搞怪故事，作为“迷马”拥有相当高的人气。',
          hints: ['TA的行为非常“破天荒”。', 'TA是一艘金色的船。', 'TA以捉摸不定的性格和高人气著称。'],
        },
        {
          title: '【打破常识的女帝】',
          name: '伏特加',
          explanation:
            'TA是时隔64年再次胜出日本德比的母马，在当时彻底打破了“母马赢不了公马，更赢不了公马统治的德比”这一观念。',
          hints: ['TA是一位打破常识的“女帝”。', 'TA的名字是一种烈酒。', 'TA战胜了众多公马，赢得了日本德比。'],
        },
        {
          title: '【Miss. Perfect】',
          name: '大和赤骥',
          explanation:
            'TA的父亲无败赢下皋月赏后便因伤退役；自身12战从未掉出前二，赢得了樱花赏、秋华赏、伊丽莎白女王杯等重赏。',
          hints: ['TA追求“完美”。', 'TA的战绩非常稳定，几乎总是前两名。', 'TA的名字里有“大和”和一种红色。'],
        },
        {
          title: '【最强英里跑者】',
          name: '大树快车',
          explanation:
            'TA在英里赛事上拥有绝对统治力，曾在大雨中轻松赢下安田纪念，更在英里冠军赛中以5马位绝对优势连霸。',
          hints: ['TA是英里赛道上的最强者。', 'TA的名字里有一棵大树和一种交通工具。', 'TA不畏惧雨天作战。'],
        },
        {
          title: '【不死鸟】',
          name: '草上飞',
          explanation: 'TA的职业生涯多次因伤中断，但总能回归赛场并取得GⅠ胜利，宛如不死鸟一般。',
          hints: ['TA像不死鸟一样浴火重生。', 'TA的名字和草地有关。', 'TA的生涯充满了与伤病的斗争。'],
        },
        {
          title: '【女杰】',
          name: '菱亚马逊',
          explanation:
            'TA是著名的「后上」马，在1994年年间实现了重赏6连胜的战绩，伊丽莎白女王杯更是在直道最后两百米完成惊天大逆转。',
          hints: ['TA是一位“女杰”。', 'TA来自亚马逊丛林。', 'TA擅长从后方一口气冲刺致胜。'],
        },
        {
          title: '【名演员】',
          name: '目白麦昆',
          explanation:
            'TA在中长距离赛事上表现出色，赢得了菊花赏、春季天皇赏等GⅠ，并拥有极高人气，被称作“草上的名演员”。',
          hints: ['TA在赛场上就像一位“名演员”。', 'TA来自著名的“目白”家。', 'TA的名字里有一种麦子。'],
        },
        {
          title: '【怪鸟】',
          name: '神鹰',
          explanation: 'TA生涯国内外11战全部取得了前二的成绩，在1998年日本杯使用「前领」战术取得胜利。',
          hints: ['TA像一只神话中的“怪鸟”。', 'TA的名字和一种猛禽有关。', 'TA的战绩非常稳定，从未掉出前二。'],
        },
        {
          title: '【世纪末霸王】',
          name: '好歌剧',
          explanation: 'TA于2000年实现了年间重赏无败，8战8胜狂砍五场GⅠ赛事胜利，统治了那个时代。',
          hints: ['TA是世纪末的霸王。', 'TA的名字像一出华丽的歌剧。', 'TA在2000年达成了古马王道征途的全胜。'],
        },
        {
          title: '【不惧阴影的怪物】',
          name: '成田白仁',
          explanation:
            'TA以压倒性的实力赢得了经典三冠，皋月赏、日本德比和菊花赏分别以3.5、5、7马位大胜，如同不  自己影子的怪物。',
          hints: ['TA是连自己影子都无所畏惧的怪物。', 'TA的名字里有“成田”。', 'TA以极大的优势赢得了三冠。'],
        },
        {
          title: '【皇帝】',
          name: '鲁道夫象征',
          explanation: 'TA是历史第一匹无败三冠马、第一匹七冠马，生涯共获得7次GⅠ胜利，统治力无可匹敌。',
          hints: ['TA是赛马界的“皇帝”。', 'TA的名字里有“象征”。', 'TA是史上第一位无败三冠马。'],
        },
        {
          title: '【女帝】',
          name: '气槽',
          explanation:
            'TA的母亲也是橡树大赛冠军，而TA不仅赢得了橡树大赛，更在秋季天皇赏中战胜众多公马，震撼了整个赛马界。',
          hints: ['TA是另一位“女帝”。', 'TA的名字和“空气”以及“凹槽”有关。', 'TA继承了母亲的荣光，并战胜了公马。'],
        },
        {
          title: '【万能宅马娘】',
          name: '爱丽数码',
          explanation:
            'TA无论在草地、泥地、任何场地情况、日本国内以至海外远征都能有杰出表现，是一位真正的全能战士，同时也是一位宅。',
          hints: ['TA是一位“万能”的宅女。', 'TA的名字和“数码”有关。', 'TA精通草地和泥地两种赛道。'],
        },
        {
          title: '【白色闪电】',
          name: '玉藻十字',
          explanation: 'TA生涯共获得8场重赏胜利，包括春季天皇赏、宝冢纪念、秋季天皇赏，是芦毛马中的佼佼者。',
          hints: ['TA像一道白色的闪电。', 'TA的名字里有“十字”。', 'TA的毛色是白色的。'],
        },
        {
          title: '【诡术之星】',
          name: '青云天空',
          explanation:
            'TA是黄金世代中最有代表性的领放马，在1998年菊花赏以3000米世界纪录的成绩获胜，其跑法充满了变幻莫测的“诡术”。',
          hints: ['TA是天空中最狡猾的星星。', 'TA的名字里有“青云”和“天空”。', 'TA擅长用领放战术戏耍对手。'],
        },
        {
          title: '【任性的大小姐】',
          name: '美妙姿势',
          explanation: 'TA以第一人气及无败状态取得秋华赏、伊丽莎白女王杯，是一位实力强大的大小姐。',
          hints: ['TA是一位有些“任性”的大小姐。', 'TA的“姿势”很“美妙”。', 'TA曾以不败之姿连胜两场雌马G1。'],
        },
        {
          title: '【胜利的探索者】',
          name: '琵琶晨光',
          explanation: 'TA生涯16战15次位居前二，主胜鞍包括菊花赏、春季天皇赏、宝冢纪念，是一位执着于胜利的探索者。',
          hints: ['TA是一位探索胜利的学者。', 'TA的名字和一种乐器有关。', 'TA的战绩极度稳定。'],
        },
        {
          title: '【变化自如】',
          name: '摩耶重炮',
          explanation: 'TA生涯获得的4次GⅠ胜利中，分别使用了领放、前领、居中、后上四种不同的战术，堪称变化自如。',
          hints: ['TA的战术“变化自如”。', 'TA的名字里有“重炮”。', 'TA是极少数能用所有四种跑法都赢得G1的马娘。'],
        },
        {
          title: '【漆黑的幻影】',
          name: '曼城茶座',
          explanation: 'TA在长距离赛事中表现出色，赢得了菊花赏、有马纪念和春季天皇赏，如同赛场上漆黑的幻影。',
          hints: ['TA是漆黑的幻影。', 'TA的名字和一座城市以及一种饮品有关。', 'TA是一位长距离专家。'],
        },
        {
          title: '【坡道的天才】',
          name: '美浦波旁',
          explanation:
            'TA是使用领放战术在无败状态下以第一人气取得朝日杯、皋月赏、日本德比的天才，尤其擅长在坡道上发力。',
          hints: ['TA是“坡道上的天才”。', 'TA的名字和一种酒有关。', 'TA差一点就成为了无败三冠马。'],
        },
        {
          title: '【华丽强者】',
          name: '目白赖恩',
          explanation: 'TA在1991年宝冢纪念中，终于战胜了同门的目白麦昆拿下冠军，是一位华丽的强者。',
          hints: [
            'TA是“目白”家的一位华丽强者。',
            'TA的名字是一个常见的英文名。',
            'TA与同门的另一位强敌有着很深的羁绊。',
          ],
        },
        {
          title: '【超大型赛马娘】',
          name: '菱曙',
          explanation: 'TA的身材非常高大，力量强大，名字也来源于一位横纲力士“曙太郎”。',
          hints: ['TA是位“超大型”的赛马娘。', 'TA的名字里有“菱”和“曙光”。', 'TA的力量非常强大。'],
        },
        {
          title: '【黑色刺客】',
          name: '米浴',
          explanation: 'TA在菊花赏和春季天皇赏中，两次扮演了终结其他马娘三冠梦想的“刺客”角色。',
          hints: ['TA是赛场上的“黑色刺客”。', 'TA的名字和一种主食有关。', 'TA总是在关键比赛中成为别人的“噩梦”。'],
        },
        {
          title: '【风神】',
          name: '艾尼斯风神',
          explanation: 'TA赢得了日本德比，擅长领放战术，如同风神一般驰骋。',
          hints: ['TA是赛场上的“风神”。', 'TA的名字里有“风”。', 'TA赢得了日本德比。'],
        },
        {
          title: '【超光速的公主】',
          name: '爱丽速子',
          explanation: 'TA生涯4战4胜无一败绩，其胜场包括皋月赏，速度快如超光速，但因伤病早早退役。',
          hints: ['TA是“超光速”的公主。', 'TA的名字里有“速子”。', 'TA生涯不败，但非常短暂。'],
        },
        {
          title: '【闪耀的一等星】',
          name: '爱慕织姬',
          explanation: 'TA赢得了日本德比，在与好歌剧、成田路的“三强”对决中，如同闪耀的一等星。',
          hints: ['TA是闪耀的“一等星”。', 'TA的名字有“爱慕”之意。', 'TA是99年经典三强之一。'],
        },
        {
          title: '【来自大井的统治之人】',
          name: '稻荷一',
          explanation: 'TA从地方的大井赛马场出道，最终赢得了春季天皇赏、宝冢纪念和有马纪念，完成了统治。',
          hints: ['TA来自“大井”赛马场。', 'TA的名字和日本神话中的神明有关。', 'TA是地方赛马逆袭中央的代表。'],
        },
        {
          title: '【新时代的旗手】',
          name: '胜利奖券',
          explanation: 'TA赢得了日本德比，作为“BNW”组合的一员，是开启一个新时代的旗手。',
          hints: ['TA是新时代的旗手。', 'TA的名字寓意着“胜利”。', 'TA是“BNW”的一员。'],
        },
        {
          title: '【越过障壁的天才】',
          name: '空中神宫',
          explanation: 'TA赢得了皋月赏与菊花赏，距离三冠只差一步，被称为“准三冠马”，是一位不断挑战障壁的天才。',
          hints: ['TA是“越过障壁的天才”。', 'TA的名字和“空中神宫”有关。', 'TA差一点就成为三冠马。'],
        },
        {
          title: '【锐利闪光】',
          name: '荣进闪耀',
          explanation: 'TA生涯唯二的GⅠ胜场即为日本德比和秋季天皇赏，其末脚如同锐利的闪光。',
          hints: ['TA的冲刺像一道“锐利闪光”。', 'TA的名字里有“荣进”。', 'TA赢过德比和秋季天皇赏。'],
        },
        {
          title: '【闪亮女孩】',
          name: '真机伶',
          explanation: 'TA生涯专注短途赛事，赢得了短途马锦标和高松宫纪念，是一位闪亮的短途专家。',
          hints: ['TA是一位“闪亮女孩”。', 'TA的名字很可爱。', 'TA是短距离赛的女王。'],
        },
        {
          title: '【懂事的公主】',
          name: '川上公主',
          explanation: 'TA在无败的情况下拿下了橡树大赛和秋华赏，是一位实力与可爱兼备的公主。',
          hints: ['TA是一位“懂事的公主”。', 'TA的名字里有“川上”。', 'TA差一点就无败拿下雌马三冠。'],
        },
        {
          title: '【百年一遇的美少女】',
          name: '黄金城市',
          explanation: 'TA被誉为“百年一遇的美少女”，赢得了阪神两岁雌马大赛，外貌和实力并存。',
          hints: ['TA是“百年一遇的美少女”。', 'TA的名字和“黄金城市”有关。', 'TA对自己的外貌非常有自信。'],
        },
        {
          title: '【暴进王】',
          name: '樱花进王',
          explanation: 'TA在短距离赛事上拥有压倒性的统治力，生涯11场胜利均在1400m以下，是当之无愧的短途王者。',
          hints: ['TA是短距离的“暴进王”。', 'TA的名字里有“樱花”。', 'TA是班长。'],
        },
        {
          title: '【闪耀的珍珠】',
          name: '采珠',
          explanation: 'TA是第一匹赢得海外G1的日本赛马，如同在世界舞台上闪耀的珍珠。',
          hints: ['TA是“闪耀的珍珠”。', 'TA的名字有“寻找珍珠”的含义。', 'TA在海外也取得了巨大成功。'],
        },
        {
          title: '【咬人的恶作剧少女】',
          name: '新光风',
          explanation: 'TA赢得了二月锦标，但也因在比赛中咬了对手而闻名，是一位爱恶作剧的少女。',
          hints: ['TA是一位爱“咬人”的恶作剧少女。', 'TA的名字里有“新光”和“风”。', 'TA在泥地赛上很强，但脾气不太好。'],
        },
        {
          title: '【任性的魔法少女】',
          name: '东商变革',
          explanation: 'TA赢得了秋华赏、宝冢纪念等G1，但脾气非常任性，像个难以捉摸的魔法少女。',
          hints: ['TA是“任性的魔法少女”。', 'TA的名字里有“东商”。', 'TA心情不好的时候谁也管不住。'],
        },
        {
          title: '【高速长跑者】',
          name: '超级溪流',
          explanation: 'TA在菊花赏以五马位大胜，并赢得了春季天皇赏，是一位擅长长距离赛事的高速跑者。',
          hints: ['TA是“高速长跑者”。', 'TA的名字和一条“小溪”有关。', 'TA是武丰的初G1胜利搭档。'],
        },
        {
          title: '【沙地之鹰】',
          name: '醒目飞鹰',
          explanation: 'TA在泥地赛场上使用领放战术达成了重赏9连胜的伟业，如同沙地上的雄鹰。',
          hints: ['TA是“沙地之鹰”。', 'TA的名字有“醒目”和“飞鹰”之意。', 'TA在泥地上是领放专家。'],
        },
        {
          title: '【大器的英雄】',
          name: '荒漠英雄',
          explanation: 'TA达成了继好歌剧之后的第二个秋三冠伟业，是一位大器晚成的英雄。',
          hints: ['TA是“大器的英雄”。', 'TA的名字里有“荒漠”。', 'TA达成了秋三冠。'],
        },
        {
          title: '【不服输的辣妹】',
          name: '东瀛佐敦',
          explanation: 'TA在2011年秋季天皇赏中以打破世界纪录的成绩取得第一，是一位不服输的辣妹。',
          hints: ['TA是“不服输的辣妹”。', 'TA的名字里有“东瀛”。', 'TA打破过世界纪录。'],
        },
        {
          title: '【天生赌徒】',
          name: '中山庆典',
          explanation: 'TA赢得了宝冢纪念，并远征凯旋门大赛获得第二，其生涯充满了“赌一把”的挑战精神。',
          hints: ['TA是“天生的赌徒”。', 'TA的名字里有“中山”。', 'TA在凯旋门赏上取得了优异成绩。'],
        },
        {
          title: '【逆转的赛马娘】',
          name: '成田大进',
          explanation: 'TA在1993年皋月赏最终直线上从12位开始冲刺，上演了惊天大逆转。',
          hints: ['TA是擅长“逆转”的赛马娘。', 'TA的名字里有“成田”。', 'TA的冲刺力非常惊人。'],
        },
        {
          title: '【小小的天才少女】',
          name: '西野花',
          explanation: 'TA赢得了阪神两岁雌马大赛、樱花赏和短途马锦标，是一位身材娇小但实力强大的天才少女。',
          hints: ['TA是“小小的天才少女”。', 'TA的名字里有“西野”和“花”。', 'TA在两岁时就赢得了G1。'],
        },
        {
          title: '【春丽加油】',
          name: '春丽',
          explanation: 'TA生涯113战0胜，但依旧靠着不放弃的努力感动了无数人，赢得了极高的人气。',
          hints: ['TA一直在“加油”。', 'TA的名字很春天。', 'TA一场也没赢过，但却是大家的英雄。'],
        },
        {
          title: '【梦之化身】',
          name: '青竹回忆',
          explanation: 'TA生涯参加了大量比赛，赢得了安田纪念与短途马锦标，是梦想的化身。',
          hints: ['TA是“梦的化身”。', 'TA的名字里有“青竹”和“回忆”。', 'TA是一位劳模，出战场次很多。'],
        },
        {
          title: '【Marvelous的传道士】',
          name: '美丽周日',
          explanation: 'TA赢得了宝冢纪念，总是充满活力，向大家传播着“Marvelous”的精神。',
          hints: ['TA是“Marvelous”的传道士。', 'TA的名字意为“美丽的星期天”。', 'TA总是精神满满。'],
        },
        {
          title: '【笑门来福】',
          name: '待兼福来',
          explanation: 'TA连续赢得了神户新闻杯、京都新闻杯和菊花赏，是一位能带来福气和笑容的马娘。',
          hints: ['TA能“笑门来福”。', 'TA的名字里有“待兼”和“福来”。', 'TA的胜利总是伴随着好运。'],
        },
        {
          title: '【草皮上的演出家】',
          name: '千明代表',
          explanation: 'TA是史上第三位经典三冠马，其华丽的后上跑法如同草皮上的演出家。',
          hints: ['TA是“草皮上的演出家”。', 'TA的名字里有“代表”。', 'TA是继鲁道夫象征后的又一位三冠马。'],
        },
        {
          title: '【不屈的挑战者】',
          name: '名将怒涛',
          explanation: 'TA生涯多次挑战强敌好歌剧，虽然屡败屡战，但最终在宝冢纪念上战胜对手，是一位不屈的挑战者。',
          hints: ['TA是“不屈的挑战者”。', 'TA的名字里有“名将”和“怒涛”。', 'TA和世纪末霸王是宿命的对手。'],
        },
        {
          title: '【冰山美人】',
          name: '目白多伯',
          explanation: 'TA赢得了5个G1，包括橡树大赛、秋华赏和伊丽莎白女王杯两连霸，是一位外表冷酷的冰山美人。',
          hints: ['TA是“冰山美人”。', 'TA来自“目白”家。', 'TA是雌马赛场上的女王。'],
        },
        {
          title: '【可爱的名配角】',
          name: '优秀素质',
          explanation: 'TA生涯中多次在GⅠ赛事中获得第三名，尤其是有马纪念三连“铜”，是一位深入人心的“名配角”。',
          hints: ['TA是“可爱的名配角”。', 'TA的名字很“优秀”。', 'TA非常擅长拿第三名。'],
        },
        {
          title: '【世代之王】',
          name: '圣王光环',
          explanation:
            'TA出身于超豪华血统，但生涯早期屡次败给同世代的强敌，最终在高松宫纪念上证明了自己，成为了世代之王。',
          hints: ['TA是“世代之王”。', 'TA的名字里有“圣王”。', 'TA是黄金世代的一员。'],
        },
        {
          title: '【大器晚成】',
          name: '待兼诗歌剧',
          explanation: 'TA生涯出战了大量G1赛事，虽然未能夺冠，但其坚持不懈的精神正是“大器晚成”的体现。',
          hints: ['TA是“大器晚成”的代表。', 'TA的名字像一首“诗歌剧”。', 'TA参加了很多G1，但运气总差一点。'],
        },
        {
          title: '【动如乱涛的领放赛马娘】',
          name: '目白善信',
          explanation: 'TA是著名的爆领放（无谋大逃）战术使用者，曾两次以低人气爆冷夺得宝冢纪念和有马纪念。',
          hints: ['TA是“动如乱涛”的领放者。', 'TA来自“目白”家。', 'TA擅长用大逃战术爆冷门。'],
        },
        {
          title: '【超嗨派对赛马娘】',
          name: '大拓太阳神',
          explanation: 'TA赢得了英里冠军杯二连霸，性格非常活泼开朗，是赛场上的派对女孩。',
          hints: ['TA是“超嗨的派对赛马娘”。', 'TA的名字里有“太阳神”。', 'TA和目白善信是欢喜冤家。'],
        },
        {
          title: '【全力爆领的少女】',
          name: '双涡轮',
          explanation: 'TA是爆领战术的代名词，其不顾一切向前冲的跑法深受大家喜爱。',
          hints: ['TA是“全力爆领”的少女。', 'TA的名字里有“涡轮”。', 'TA的跑法就是一直向前冲！'],
        },
        {
          title: '【实现夙愿的宝石】',
          name: '里见光钻',
          explanation: 'TA的父亲是大震撼，赢得了菊花赏和有马纪念，实现了马主长年的G1梦想，是名副其实的“宝石”。',
          hints: ['TA是“实现夙愿的宝石”。', 'TA的名字里有“光钻”。', 'TA的父亲非常有名。'],
        },
        {
          title: '【祭典少女】',
          name: '北部玄驹',
          explanation:
            'TA生涯共获得7次GⅠ胜利，马主是著名演歌歌手北岛三郎，每次获胜后都会高唱祭典，是名副其实的祭典少女。',
          hints: ['TA是“祭典少女”。', 'TA的名字里有“北部”。', 'TA的马主是一位著名歌手。'],
        },
        {
          title: '【不碎的玻璃】',
          name: '目白阿尔丹',
          explanation: 'TA生涯两度因伤修养，体质脆弱，但依然取得了优异的成绩，被称为“不碎的玻璃”。',
          hints: ['TA是“不碎的玻璃”。', 'TA来自“目白”家。', 'TA的身体很脆弱，但意志坚强。'],
        },
        {
          title: '【盛放的樱花】',
          name: '樱花千代王',
          explanation: 'TA赢得了日本德比，完成了其父丸善斯基未竟的夙愿，如同盛放的樱花。',
          hints: ['TA是“盛放的樱花”。', 'TA的名字里有“樱花”。', 'TA为父亲赢得了德比。'],
        },
        {
          title: '【荣光的天狼】',
          name: '天狼星象征',
          explanation: 'TA赢得了日本德比，并曾远征欧洲，如同天狼星一般闪耀。',
          hints: ['TA是“荣光的天狼”。', 'TA的名字里有“天狼星”和“象征”。', 'TA曾与皇帝对决。'],
        },
        {
          title: '【刚毅果断】',
          name: '八重无敌',
          explanation: 'TA赢得了皋月赏和秋季天皇赏，是一位刚毅果断的强者。',
          hints: ['TA“刚毅果断”。', 'TA的名字里有“八重”和“无敌”。', 'TA赢过小栗帽。'],
        },
        {
          title: '【优哉游哉的长跑者】',
          name: '目白光明',
          explanation: 'TA的父亲是目白赖恩，自己也赢得了春季天皇赏等长距离赛事，是一位优哉游哉的长跑者。',
          hints: ['TA是“优哉游哉的长跑者”。', 'TA来自“目白”家。', 'TA擅长长距离比赛。'],
        },
        {
          title: '【大朵绽放的晚樱】',
          name: '樱花桂冠',
          explanation: 'TA生涯早期饱受伤病困扰，但后期大放异彩，赢得了春季天皇赏和有马纪念，如同迟开的樱花。',
          hints: ['TA是“大朵绽放的晚樱”。', 'TA的名字里有“樱花”和“桂冠”。', 'TA克服了伤病，大器晚成。'],
        },
        {
          title: '【绮丽的Stayer】',
          name: '成田路',
          explanation: 'TA赢得了菊花赏，是一位擅长长距离的绮丽跑者。',
          hints: ['TA是“绮丽的长跑者”。', 'TA的名字里有“成田”。', 'TA是99年经典三强之一。'],
        },
        {
          title: '【风之化身】',
          name: '也文摄辉',
          explanation: 'TA赢得了安田纪念二连霸和秋季天皇赏，如同风的化身一般。',
          hints: ['TA是“风的化身”。', 'TA的名字很难念。', 'TA是英里和中距离的双料王者。'],
        },
        {
          title: '【漆黑的帝王】',
          name: '吉兆',
          explanation: '连续两年称霸秋季天皇赏和有马纪念，其压倒性的统治力被称为“漆黑的帝王”。',
          hints: ['TA是“漆黑的帝王”。', 'TA的名字有“吉兆”之意。', 'TA曾以9马身的巨大优势赢下有马纪念。'],
        },
        {
          title: '【唯美系破坏神】',
          name: '谷野美酒',
          explanation: 'TA赢得了日本德比，但因其在赛场内外都极具破坏性的行为（比如踹坏栏杆）而闻名。',
          hints: ['TA是“唯美系的破坏神-神”。', 'TA的名字里有“谷野”和一种“美酒”。', 'TA的脚力非常惊人（各种意义上）。'],
        },
        {
          title: '【华丽的掌上明珠】',
          name: '第一红宝石',
          explanation: 'TA的母亲也是G1冠军，自己也赢得了安田纪念和短途马锦标，是血统高贵的掌上明珠。',
          hints: ['TA是“华丽的掌上明珠”。', 'TA的名字里有一种“红宝石”。', 'TA和母亲都是G1冠军。'],
        },
        {
          title: '【魔性的丽人】',
          name: '目白高峰',
          explanation: 'TA是史上第一匹雌马三冠，其强大与美丽如同魔性的丽人。',
          hints: ['TA是“魔性的丽人”。', 'TA来自“目白”家。', 'TA是第一位雌马三冠。'],
        },
        {
          title: '【不朽的小真】',
          name: '真弓快车',
          explanation: 'TA赢得了短途马锦标，但因病早逝，成为了粉丝心中不朽的存在。',
          hints: ['TA是“不朽的小真”。', 'TA的名字里有“真弓”。', 'TA的生涯如流星般短暂而耀眼。'],
        },
        {
          title: '【奇迹的主角】',
          name: '凯斯奇迹',
          explanation: "TA生涯后期才展露头角，不断创造奇迹，最终赢得了短途马lers' Cup。",
          hints: ['TA是“奇迹的主角”。', 'TA的名字里有“奇迹”。', 'TA是一位短途赛的王者。'],
        },
        {
          title: '【胜利的幸运符】',
          name: '小林历奇',
          explanation: 'TA是日本赛马史上赢得最多GⅠ/JPNⅠ的赛马（11胜），如同胜利的幸运符。',
          hints: ['TA是“胜利的幸运符”。', 'TA的名字里有“小林”。', 'TA是泥地G1胜利次数最多的马。'],
        },
        {
          title: '【苫小牧之星】',
          name: '北港火山',
          explanation: 'TA生涯共计赢得10场GⅠ/JPNⅠ，是日本赛马史上第一匹达成此成就的赛马，是家乡苫小牧的骄傲。',
          hints: ['TA是“苫小牧之星”。', 'TA的名字里有“北港”和“火山”。', 'TA带动了家乡的旅游业。'],
        },
        {
          title: '【坚韧不拔的熏银】',
          name: '奇锐骏',
          explanation: 'TA生涯非常长，直到9岁高龄仍在G1赛场活跃，其坚韧不拔的精神和银色的毛发令人印象深刻。',
          hints: ['TA是“坚韧不拔的熏银”。', 'TA的名字里有“奇”。', 'TA是一位非常长寿的常青树选手。'],
        },
        {
          title: '【称霸世界的大王牌】',
          name: '葛城王牌',
          explanation: 'TA是日本赛马史上第一匹赢得日本杯的日本马，是称霸世界的大王牌。',
          hints: ['TA是“称霸世界的大王牌”。', 'TA的名字里有“葛城”和“王牌”。', 'TA为日本赛马赢得了荣誉。'],
        },
        {
          title: '【宇宙诗章】',
          name: '新宇宙',
          explanation: 'TA赢得了皋月赏和日本德比，其独特的个性和思考方式如同来自宇宙。',
          hints: ['TA吟唱着“宇宙诗章”。', 'TA的名字是“新宇宙”。', 'TA总是在思考一些哲学问题。'],
        },
        {
          title: '【悠闲治愈的赛马娘】',
          name: '菱钻奇宝',
          explanation: 'TA曾以低人气爆冷赢得菊花赏、春季天皇赏和宝冢纪念，是一位悠闲治愈，总能带来奇迹的马娘。',
          hints: ['TA是“悠闲治愈的赛马娘”。', 'TA的名字里有“菱”和“奇宝”。', 'TA总能在大赛中爆冷获胜。'],
        },
      ];
    },
    initVisualizer() {
      try {
        // 如果音频上下文不存在，创建它
        if (!this.audioContext) {
          this.audioContext = new (this.parentWin.AudioContext || this.parentWin.webkitAudioContext)();
          logDebug('为可视化器创建音频上下文');
        }

        // 如果分析器不存在，创建它
        if (!this.analyser) {
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;
          logDebug('创建音频分析器');
        }

        // 检查 bgmPlayer 是否已经连接到 sourceNode
        if (this.bgmPlayer && !this.bgmPlayer._connectedToSource && !this.sourceNode) {
          this.sourceNode = this.audioContext.createMediaElementSource(this.bgmPlayer);
          this.sourceNode.connect(this.analyser);
          this.analyser.connect(this.audioContext.destination);
          this.bgmPlayer._connectedToSource = true; // 标记已连接
          logDebug('音频可视化器初始化成功');
        } else if (this.sourceNode && this.analyser) {
          // 如果sourceNode已存在但未连接到analyser
          try {
            this.sourceNode.disconnect();
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            logDebug('重新连接现有的音频节点');
          } catch (e) {
            logDebug('音频节点连接处理:', e.message);
          }
        } else {
          logDebug('BGM播放器已连接或sourceNode已存在，跳过可视化器初始化');
        }
      } catch (e) {
        logError('Web Audio API 初始化失败:', e);
        this.audioContext = null;
      }
    },
    drawVisualizer() {
      if (!this.audioContext || !this.analyser) return;
      this.visualizerFrameId = requestAnimationFrame(this.drawVisualizer.bind(this));
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);
      const $canvas = $('#button-visualizer_ap', this.parentWin.document);
      if (!$canvas.length) return;
      const canvasCtx = $canvas[0].getContext('2d');
      const WIDTH = $canvas.width();
      const HEIGHT = $canvas.height();
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
      const barWidth = WIDTH / bufferLength;
      let barHeight;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2.5;
        canvasCtx.fillStyle = `rgba(187, 154, 247, ${barHeight / 100})`;
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    },
    loadMemory() {
      try {
        const savedMemory = localStorage.getItem(this.MEMORY_KEY);
        const defaultMemory = {
          loginDays: 0,
          lastLoginDate: null,
          unlockedTitles: [],
          raceGoals: [],
          fortunes: [],
          triggeredEventNames: [],
          stats: {
            bond: 0,
            speed: 100,
            stamina: 100,
            power: 100,
            guts: 100,
            intelligence: 100,
            motivation: '普通',
          },
          counters: {
            bgmPlayed: 0,
            sfxPlayed: 0,
            eventsTriggered: 0,
            jankenWins: 0,
            jankenConsecutiveWins: 0,
            shrineVisits: 0,
            pomodoroCycles: 0,
            notesSavedCount: 0,
            rouletteSpins: 0,
            quotesViewed: 0,
            titleGamesPlayed: 0,
            whispersHeard: 0,
            quizCorrects: 0,
            knowledgeViewed: 0,
            carrotJuice: 10, // 确保默认值存在
            slotMachineWins: 0,
            slotMachineJackpots: 0,
          },
        };
        // 使用 jQuery 的深层合并 (deep merge)，确保嵌套对象也能正确填充默认值
        this.memory = savedMemory ? this.$.extend(true, {}, defaultMemory, JSON.parse(savedMemory)) : defaultMemory;
        // 在函数末尾添加这一行，确保 slotMachineState 始终存在
        this.slotMachineState = { reels: [null, null, null], stoppedCount: 0, isRolling: false };
      } catch (e) {
        this.memory = {
          loginDays: 0,
          lastLoginDate: null,
          unlockedTitles: [],
          raceGoals: [],
          fortunes: [],
          stats: {
            bond: 0,
            speed: 100,
            stamina: 100,
            power: 100,
            guts: 100,
            intelligence: 100,
            motivation: '普通',
          },
          counters: {
            bgmPlayed: 0,
            sfxPlayed: 0,
            eventsTriggered: 0,
            jankenWins: 0,
            jankenConsecutiveWins: 0,
            shrineVisits: 0,
            pomodoroCycles: 0,
            notesSavedCount: 0,
            rouletteSpins: 0,
            quotesViewed: 0,
            titleGamesPlayed: 0,
          },
        };
      }
    },
    saveMemory() {
      localStorage.setItem(this.MEMORY_KEY, JSON.stringify(this.memory));
      this.checkTitles();
    },
    checkLogin() {
      const today = new Date().toISOString().split('T')[0];
      if (this.memory.lastLoginDate !== today) {
        this.memory.loginDays++;
        this.memory.lastLoginDate = today;
        this.memory.counters.jankenConsecutiveWins = 0;
        this.saveMemory();
      }
    },
    checkTitles() {
      this.titles.forEach(title => {
        if (title.condition() && !this.memory.unlockedTitles.includes(title.name)) {
          this.memory.unlockedTitles.push(title.name);
          this.showTip(`<span>🏆</span> <strong>获得新称号:</strong> ${title.name}`, 'success');
        }
      });
      localStorage.setItem(this.MEMORY_KEY, JSON.stringify(this.memory));
    },
    bindGlobalEvents() {
      const $ = this.$;

      // 检查 TavernHelper API
      if (!this.parentWin.TavernHelper) {
        logError('未找到 TavernHelper API，尝试延迟初始化...');
        // 延迟重试
        setTimeout(() => {
          this.bindGlobalEvents();
        }, 2000);
        return;
      }

      // 独立的事件监听 - 回复音效（监听消息发送事件）
      this.setupReplySoundEvents();

      // 独立的事件监听 - 角色切换音效（监听DOM变化）
      this.setupCharacterSwitchSoundEvents();

      this.sillyTavernMessageHandler = message => {
        if (message && message.is_user === false && message.mes) {
          this.handleNewMessage(message.mes);
        }
      };
      eventOn(tavern_events.MESSAGE_RECEIVED, this.sillyTavernMessageHandler);
      const observerTarget = this.parentWin.document.body;
      this.domObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            const $addedNodes = $(mutation.addedNodes);
            const $charAvatar = $addedNodes.find('.avatar.character_select').addBack('.avatar.character_select');
            if ($charAvatar.length > 0) {
              const newCharId = $charAvatar.data('chid');
              if (newCharId && newCharId !== this.lastCharacterId) {
                this.lastCharacterId = newCharId;
                // 播放角色切换音效
                this.playCharacterSwitchSound();
                this.postStatus('CharSwitched', { id: newCharId });
                logDebug(`角色切换检测到: ${newCharId}`);
                break;
              }
            }
          }
        }
      });
      // 监听输入框关键词触发交互反馈
      const $sendTextarea = $('#send_textarea', this.parentWin.document);
      if ($sendTextarea.length > 0) {
        const keywords = ['强击', 'ビブロス', 'Vibros', '约会', '训练', '比赛'];
        $sendTextarea.on('input', () => {
          const text = $sendTextarea.val().toLowerCase();
          if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
            this.triggerInteractiveFeedback();
          }
        });
      }

      // 备用：监听聊天消息区域的变化来检测AI回复
      this.setupFallbackMessageDetection();
    },
    setupFallbackMessageDetection() {
      logDebug('设置备用消息检测机制...');

      // 监听聊天区域的变化
      const chatArea = this.parentWin.document.querySelector('#chat');
      if (chatArea) {
        this.fallbackObserver = new MutationObserver(mutations => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              // 检查是否添加了新的AI消息
              for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const $node = $(node);
                  // 检查是否是AI消息（非用户消息）
                  const isAiMessage = $node.hasClass('mes') && !$node.hasClass('mes_user');
                  if (isAiMessage) {
                    logDebug('备用检测：发现AI消息');
                    // 延迟一点时间确保消息内容已加载
                    setTimeout(() => {
                      this.playRandomReplySound();
                    }, 500);
                    break;
                  }
                }
              }
            }
          }
        });

        this.fallbackObserver.observe(chatArea, {
          childList: true,
          subtree: true,
        });
        logDebug('备用消息检测机制已启动');
      } else {
        logError('未找到聊天区域 #chat');
      }
    },
    triggerInteractiveFeedback() {
      if (this.isFeedbackPlaying) return;
      this.isFeedbackPlaying = true;
      const $button = $(`#${this.PLAYER_BUTTON_ID}`, this.parentWin.document);
      $button.addClass('heartbeat-feedback');
      this.showTip('<span>💖</span> 耶嘿嘿~在想我的事吗？', 'info');
      setTimeout(() => {
        $button.removeClass('heartbeat-feedback');
        this.isFeedbackPlaying = false;
      }, 1000);
    },
    handleNewMessage(messageContent) {
      logDebug('收到新消息，开始处理音效...');
      logDebug(`消息内容: ${messageContent.substring(0, 100)}...`);

      this.memory.counters.sfxPlayed++;
      this.saveMemory();

      const regex = /<PlayAudio:\[([\u4e00-\u9fa5]+)\]>/g;
      const matches = [...messageContent.matchAll(regex)];

      if (matches.length > 0) {
        logDebug(`找到音频标签: ${matches[matches.length - 1][1]}`);
        this.playSfxByTag(matches[matches.length - 1][1]);
      } else {
        logDebug('未找到音频标签，使用随机回复音效');
        // 使用新的回复音效系统
        this.playRandomReplySound().catch(error => {
          logError('消息处理音效播放失败:', error);
        });
      }
    },
    playSfxByTag(tag) {
      const matchingAudios = this.sfxLibrary.filter(audio => audio.tags.includes(tag));
      if (matchingAudios.length > 0) {
        const audioToPlay = matchingAudios[Math.floor(Math.random() * matchingAudios.length)];
        this.sfxPlayer.src = audioToPlay.url;
        this.sfxPlayer.volume = this.volumeLevels[this.sfxVolumeIndex].level;
        this.sfxPlayer.play().catch(e => {
          console.error('SFX播放失败:', e);
        });
        this.postStatus('PlayingByTag', { tag: tag, url: audioToPlay.url });
      } else {
        this.postStatus('NotFound', tag);
        this.playRandomSfx();
      }
    },
    playRandomSfx() {
      if (this.sfxLibrary.length === 0) return;
      const randomIndex = Math.floor(Math.random() * this.sfxLibrary.length);
      const audioToPlay = this.sfxLibrary[randomIndex];
      this.sfxPlayer.src = audioToPlay.url;
      this.sfxPlayer.volume = this.volumeLevels[this.sfxVolumeIndex].level;
      this.sfxPlayer.play().catch(e => {
        console.error('SFX随机播放失败:', e);
      });
      this.postStatus('PlayingRandom', { url: audioToPlay.url });
    },
    playTestSfx(direction) {
      if (this.sfxLibrary.length === 0) return;
      this.memory.counters.sfxPlayed++;
      this.saveMemory();
      if (direction === 'next') this.sfxPlaybackIndex = (this.sfxPlaybackIndex + 1) % this.sfxLibrary.length;
      else this.sfxPlaybackIndex = (this.sfxPlaybackIndex - 1 + this.sfxLibrary.length) % this.sfxLibrary.length;
      const audioToPlay = this.sfxLibrary[this.sfxPlaybackIndex];
      this.sfxPlayer.src = audioToPlay.url;
      this.sfxPlayer.play().catch(e => {
        console.error('SFX测试播放失败:', e);
      });
      this.showRandomKnowledge();
      this.postStatus('PlayingTest', {
        index: this.sfxPlaybackIndex,
        total: this.sfxLibrary.length,
        url: audioToPlay.url,
      });
    },
    controlBgm(action) {
      if (this.bgmLibrary.length === 0) return;
      this.showRandomKnowledge();
      switch (action) {
        case 'toggle':
          if (this.bgmPlayer.paused) {
            this.bgmPlayer.play().catch(e => {
              console.error('BGM播放失败:', e);
            });
            if (this.audioContext) this.drawVisualizer();
          } else {
            this.bgmPlayer.pause();
            cancelAnimationFrame(this.visualizerFrameId);
            this.visualizerFrameId = null;
          }
          break;
        case 'next':
          this.bgmPlaybackIndex = (this.bgmPlaybackIndex + 1) % this.bgmLibrary.length;
          this.bgmPlayer.src = this.bgmLibrary[this.bgmPlaybackIndex].url;
          this.bgmPlayer.play().catch(e => {
            console.error('BGM下一首播放失败:', e);
          });
          this.memory.counters.bgmPlayed++;
          this.saveMemory();
          if (this.audioContext && !this.visualizerFrameId) this.drawVisualizer();
          break;
        case 'prev':
          this.bgmPlaybackIndex = (this.bgmPlaybackIndex - 1 + this.bgmLibrary.length) % this.bgmLibrary.length;
          this.bgmPlayer.src = this.bgmLibrary[this.bgmPlaybackIndex].url;
          this.bgmPlayer.play().catch(e => {
            console.error('BGM上一首播放失败:', e);
          });
          this.memory.counters.bgmPlayed++;
          this.saveMemory();
          if (this.audioContext && !this.visualizerFrameId) this.drawVisualizer();
          break;
      }
      this.updateBgmStatus();
    },
    updateBgmStatus() {
      const $ = this.$;
      const $nowPlaying = $('#bgm-now-playing_ap', this.parentWin.document);
      const $playBtn = $('#bgm-toggle-btn_ap', this.parentWin.document);
      if ($nowPlaying.length > 0) {
        const currentTrack = this.bgmLibrary[this.bgmPlaybackIndex];
        $nowPlaying.text(`BGM: ${currentTrack.name}`);
        $playBtn.text(this.bgmPlayer.paused ? '播放' : '暂停');
      }
    },
    openAudioPlayerPanel() {
      const $ = this.$;
      if ($(`#${this.PLAYER_PANEL_OVERLAY_ID}`, this.parentWin.document).length > 0) return;
      const playerHTML = `
                <div id="${this.PLAYER_PANEL_OVERLAY_ID}" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                    <div id="info-float-window_ap" class="draggable-window_ap" style="display: none;">
                        <div class="window-header_ap" data-drag-handle>
                            <span class="window-title_ap">育成模拟器完全向导</span>
                            <span class="window-close_ap" data-close-target="#info-float-window_ap">×</span>
                        </div>
                        <div class="window-content_ap">
                            <ul>
                                <li><strong>音乐播放 (BGM):</strong> 切换、播放/暂停背景音乐，并调整音量。</li>
                                <li><strong>语音播放 (SFX):</strong> 手动输入标签或随机播放强击的语音，并调整音量。</li>
                                <li><strong>育成事件:</strong> 触发与强击的各种育成互动，你的选择会影响我们的未来哦！</li>
                                <li><strong>前往神社:</strong> 参拜并抽签，预测你和她的运势。</li>
                                <li><strong>切换图标:</strong> 通过轮盘游戏，更换悬浮窗的图标。</li>
                                <li><strong>功能介绍:</strong> 查看本向导。</li>
                                <li><strong>小笔记:</strong> 分类记录重要信息，To-Do List可帮你规划目标。</li>
                                <li><strong>计时器:</strong> 提供普通计时和番茄工作法两种模式。</li>
                                <li><strong>猜拳挑战:</strong> 和强击来一场激动人心的猜拳对决！</li>
                                <li><strong>我们的回忆:</strong> 查看与强击共同度过的天数、互动次数、获得的称号以及全新的育成目标和角色档案。</li>
                                <li><strong>羁绊日历:</strong> 记录你们每一天的在线时长。</li>
                                <li><strong>比赛图鉴:</strong> 查看初级、经典、高级三个赛年的完整赛事安排。</li>
                                <li><strong>悄悄话:</strong> 聆听强击想对你说的私密话语，并能制作成专属屏保。</li>
                                <li><strong>强击科普:</strong> 查看由强击亲自撰写的、关于赛马娘世界的基础知识。</li>
                                <li><strong>称号盲盒:</strong> 来猜猜那些传说中的称号都属于谁吧！</li>
                            </ul>
                            <hr style="border-color: rgba(255,255,255,0.2); margin: 10px 0;">
                            <small style="font-weight: bold;color: #fff;">制作人 Discord: eternalzz0840</small><small style="margin-left: 40px">本内容采用 CC BY-NC 4.0 国际许可协议进行许可</small>
                        </div>
                    </div>
                    <div id="race-log-float-window_ap" class="draggable-window_ap" style="display: none; width: 90%; max-width: 600px;">
                        <div class="window-header_ap" data-drag-handle>
                            <span class="window-title_ap">赛事殿堂</span>
                            <span class="window-close_ap" data-close-target="#race-log-float-window_ap">×</span>
                        </div>
                        <div class="window-content_ap">
                            <div id="race-log-tabs_ap" style="display: flex; justify-content: center; gap: 10px; margin-bottom: 10px;">
                                <button class="vib-btn_ap race-log-tab-btn" data-year="初级" data-color="green">初级年</button>
                                <button class="vib-btn_ap race-log-tab-btn" data-year="经典" data-color="blue">经典年</button>
                                <button class="vib-btn_ap race-log-tab-btn" data-year="高级" data-color="purple">高级年</button>
                            </div>
                            <div id="race-log-content_ap" style="max-height: 400px; overflow-y: auto;"></div>
                        </div>
                    </div>
                     <div id="event-float-window_ap" class="draggable-window_ap" style="display: none; width: 90%; max-width: 450px;">
                        <div class="window-header_ap" data-drag-handle>
                            <span id="event-window-title_ap" class="window-title_ap">育成事件</span>
                            <span class="window-close_ap" data-close-target="#event-float-window_ap">×</span>
                        </div>
                        <div id="event-window-content_ap" class="window-content_ap">
                           <div id="event-description_ap" style="margin-bottom: 20px; line-height: 1.6;"></div>
                           <div id="event-choices_ap" style="display: flex; flex-direction: column; gap: 10px;"></div>
                        </div>
                    </div>
                    <div id="vib-player-container">
                        <div id="vib-bg-image"></div>
                        <video id="vib-bg-video" autoplay muted loop playsinline></video>
                        <div id="vib-player-content">
                            <button id="unified-bg-toggle-btn_ap" class="bg-control-btn_ap" title="切换背景模式"></button>
                            <div id="greeting-marquee_ap"></div>
                            <div id="ap-close-panel-btn" title="关闭">×</div>
                            <div id="status-container_ap">
                                <span id="status-text_ap"></span>
                                <div id="status-buttons_ap">
                                    <button id="show-knowledge-btn_ap" class="vib-bg-btn_ap" title="强击科普" style="background-image: url('https://files.catbox.moe/oefsa1.png');"></button>
                                    <button id="show-title-game-btn_ap" class="vib-bg-btn_ap" title="称号盲盒" style="background-image: url('https://files.catbox.moe/oefsa1.png');"></button>
                                    <button id="show-quotes-btn_ap" class="vib-bg-btn_ap" title="悄悄话" style="background-image: url('https://files.catbox.moe/buonce.png');"></button>
                                    <button id="show-race-log-btn_ap" class="vib-bg-btn_ap" title="比赛图鉴" style="background-image: url('https://files.catbox.moe/j2t1r6.png');"></button>
                                    <button id="show-calendar-btn_ap" class="vib-bg-btn_ap" title="羁绊日历" style="background-image: url('https://files.catbox.moe/h9bpt4.png');"></button>
                                    <button id="show-memory-btn_ap" class="vib-bg-btn_ap" title="我们的回忆" style="background-image: url('https://files.catbox.moe/p1k4ul.png');"></button>
                                    <button id="show-janken-btn_ap" class="vib-bg-btn_ap" title="猜拳挑战" style="background-image: url('https://files.catbox.moe/qrc93h.png');"></button>
                                    <button id="show-timer-btn_ap" class="vib-bg-btn_ap" title="计时器" style="background-image: url('https://files.catbox.moe/643r9j.png');"></button>
                                    <button id="show-notes-btn_ap" class="vib-bg-btn_ap" title="小笔记" style="background-image: url('https://files.catbox.moe/dtln3d.png');"></button>
                                    <button id="show-info-btn_ap" class="vib-bg-btn_ap" title="功能介绍" style="background-image: url('https://files.catbox.moe/ygvmk0.png');"></button>
                                </div>
                            </div>
                            <div id="tip-container_ap"></div>
                            <div id="main-view_ap">
                                <div class="module-container_ap">
                                    <h4 class="module-title_ap">背景音乐 (BGM)</h4>
                                    <div id="bgm-now-playing_ap" style="font-size: 12px; color: #a9b1d6; margin-bottom: 10px; min-height: 1.2em;">BGM: 暂停中</div>
                                    <div class="grid-3-col">
                                        <button id="bgm-prev-btn_ap" class="vib-btn_ap" data-color="grey"><</button> <button id="bgm-toggle-btn_ap" class="vib-btn_ap" data-color="blue">播放</button> <button id="bgm-next-btn_ap" class="vib-btn_ap" data-color="grey">></button>
                                    </div>
                                    <div class="grid-2-col">
                                        <button id="bgm-volume-btn_ap" class="vib-btn_ap" data-color="grey">BGM音量: 高</button>
                                        <button id="bgm-manage-btn_ap" class="vib-btn_ap" data-color="purple">音乐管理</button>
                                    </div>
                                </div>
    <!-- SFX模块改造后 -->
    <div class="module-container_ap">
          <h4 class="module-title_ap" id="sfx-title_ap">语音音效 (SFX)</h4>
          <div class="grid-3-col">
            <button id="sfx-prev-btn_ap" class="vib-btn_ap" data-color="grey"><</button>
            <button id="sfx-volume-btn_ap" class="vib-btn_ap" data-color="blue">SFX音量: 高</button>
            <button id="sfx-next-btn_ap" class="vib-btn_ap" data-color="grey">></button>
        </div>
    </div>
                                <div class="module-container_ap">
                                     <div class="grid-3-col-wide">
                                        <button id="random-event-btn_ap" class="vib-btn_ap" data-color="gold">育成事件</button> <button id="goto-shrine-btn_ap" class="vib-btn_ap" data-color="cyan">前往神社</button> <button id="change-icon-btn_ap" class="vib-btn_ap" data-color="purple">切换图标</button>
                                     </div>
                                </div>
                            </div>
                            <div id="knowledge-view_ap" style="display: none;">
                                <div id="knowledge-main-menu_ap">
                                    <h4 class="module-title_ap">强击☆科普小百科</h4>
                                    <button class="vib-btn_ap knowledge-chapter-btn_ap" data-chapter="1" data-color="blue" style="width:100%; margin-bottom:10px;">第一章：闪亮世界的基础☆规则篇</button>
                                    <button class="vib-btn_ap knowledge-chapter-btn_ap" data-chapter="2" data-color="purple" style="width:100%; margin-bottom:10px;">第二章：闪耀☆星辰的朋友们</button>
                                    <button class="vib-btn_ap knowledge-chapter-btn_ap" data-chapter="3" data-color="gold" style="width:100%; margin-bottom:10px;">第三章：茶余饭后的☆心跳小剧场</button>
                                </div>
                                <div id="knowledge-content-view_ap" style="display:none;">
                                    <div id="knowledge-content-display_ap" class="module-container_ap"></div>
                                    <button id="knowledge-content-back-btn_ap" class="vib-btn_ap" data-color="grey" style="width: 100%;">返回章节选择</button>
                                </div>
                                <button id="knowledge-back-btn_ap" class="vib-btn_ap" data-color="grey" style="width: 100%; margin-top: 10px;">返回主菜单</button>
                            </div>
                            <div id="title-game-view_ap" style="display: none; text-align: center;">
                                <h4 class="module-title_ap">猜猜TA是谁？</h4>
                                <div id="title-game-card" class="module-container_ap">
                                    <h5 id="title-game-title" style="color: #f6e05e; font-size: 1.5em; margin-bottom: 15px;"></h5>
                                    <div id="title-game-hints" style="min-height: 60px; margin-bottom: 15px; text-align: left;"></div>
                                    <input type="text" id="title-game-input_ap" class="vib-textarea_ap" placeholder="在这里输入你猜的名字..." style="width: calc(100% - 22px); margin-bottom: 10px;">
                                    <div id="title-game-result" style="min-height: 24px; font-weight: bold; margin-bottom: 10px;"></div>
                                </div>
                                <div class="grid-3-col-wide">
                                    <button id="request-hint-btn_ap" class="vib-btn_ap" data-color="cyan">请求提示</button>
                                    <button id="check-answer-btn_ap" class="vib-btn_ap" data-color="blue">确认答案</button>
                                    <button id="next-title-btn_ap" class="vib-btn_ap" data-color="green">下一个</button>
                                </div>
                                <button id="title-game-back-btn_ap" class="vib-btn_ap" data-color="grey" style="width: 100%; margin-top: 10px;">返回</button>
                            </div>
<div id="shrine-view_ap" style="display: none;">
    <h4 class="module-title_ap">心之神社</h4>
    <!-- 这是新的御神签HTML结构 -->
    <div id="omikuji-result-display_ap" class="omikuji-container_ap" style="display: none;">
        <div class="omikuji-fortune_ap"></div>
        <div class="omikuji-desc_ap"></div>
        <ul class="omikuji-items_ap"></ul>
    </div>
    <div id="shrine-prompt_ap" style="text-align: center; color: #a9b1d6; margin: 50px 0;">请先与搭档一同参拜。</div>
    <!-- 按钮部分不变 -->
    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <button id="shrine-pray-btn_ap" class="vib-btn_ap" data-color="blue" style="flex-grow: 1;">一同参拜</button>
        <button id="shrine-draw-btn_ap" class="vib-btn_ap" data-color="purple" style="flex-grow: 1;" disabled>摇动签筒</button>
    </div>
    <button id="shrine-back-btn_ap" class="vib-btn_ap" data-color="grey" style="width: 100%;">返回</button>
</div>                                                                        <div id="notes-view_ap" style="display: none;">
                                <h4 class="module-title_ap">秘密的小笔记</h4>
                                <div id="notes-tabs_ap" style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;"></div>
                                <textarea id="notes-textarea_ap" class="vib-textarea_ap" style="height: 200px; margin-bottom: 15px;" placeholder="在这里记下和拖累那亲的秘密约定..."></textarea>
                                <div id="todo-list-container_ap" style="display: none;">
                                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                        <input type="text" id="new-todo-input_ap" class="vib-textarea_ap" placeholder="新的目标..." style="flex-grow: 1; margin: 0; padding: 8px;">
                                        <button id="add-todo-btn_ap" class="vib-btn_ap" data-color="green">添加</button>
                                    </div>
                                    <ul id="todo-list_ap" style="list-style: none; padding: 0; max-height: 150px; overflow-y: auto;"></ul>
                                </div>
                                <button id="notes-back-btn_ap" class="vib-btn_ap" data-color="grey" style="width: 100%; margin-top: 10px;">返回</button>
                            </div>


                            <div id="timer-view_ap" style="display: none;">
                                <h4 class="module-title_ap">心跳计时器</h4>
                                <div id="pomodoro-status_ap" style="text-align: center; margin-bottom: 10px; font-weight: bold; color: #7aa2f7;"></div>
                                <div id="timer-display_ap" style="font-size: 3em; text-align: center; margin-bottom: 20px; font-family: 'Courier New', monospace; color: #e0def4; text-shadow: 0 0 10px #bb9af7;">00:00:00</div>
                                <div class="grid-3-col">
                                    <button id="timer-start-pause-btn_ap" class="vib-btn_ap" data-color="blue">开始</button> <button id="timer-reset-btn_ap" class="vib-btn_ap" data-color="purple">重置</button> <button id="timer-back-btn_ap" class="vib-btn_ap" data-color="grey">返回</button>
                                </div>
                                <button id="pomodoro-toggle-btn_ap" class="vib-btn_ap" data-color="green" style="width: 100%;">切换为番茄钟</button>
                            </div>
                            <div id="icon-roulette-view_ap" style="display: none; text-align: center; padding: 20px 0;">
                                <h4 class="module-title_ap">命运轮盘</h4>
                                <div id="icon-reel-container_ap" style="height: 150px; overflow: hidden; position: relative; border: 2px solid #bb9af7; border-radius: 10px; background: rgba(0,0,0,0.3); margin-bottom: 20px;">
                                    <div id="icon-reel_ap"></div> <div id="reel-shadow-top_ap"></div> <div id="reel-shadow-bottom_ap"></div> <div id="reel-selector_ap"></div>
                                </div>
                                <div id="icon-result-text_ap" style="min-height: 24px; font-weight: bold; color: #f6e05e; margin-bottom: 20px;"></div>
                                <button id="stop-roulette-btn_ap" class="vib-btn_ap" data-color="gold" style="width: 50%; margin-bottom: 10px;">停止</button>
                                <button id="roulette-back-btn_ap" class="vib-btn_ap" data-color="grey" style="width: 100%;">返回</button>
                                <!-- 新增的老虎机触发器和容器 -->
<div id="slot-machine-trigger_ap" style="text-align: center; margin-top: 20px; color: #f6e05e; cursor: pointer; font-style: italic;">
    哼哼，觉得轮盘转得太慢，不够刺激吗？那来试试这个吧……真正的命运对决哦！♪
</div>
<div id="slot-machine-container_ap" style="display: none; margin-top: 15px; background: rgba(0,0,0,0.4); padding: 20px; border-radius: 10px; border: 1px solid #3b4261;">
    <div id="slot-reels-wrapper_ap" style="display: flex; justify-content: space-around; height: 100px; overflow: hidden; position: relative;">
        <!-- 三个卷轴 -->
        <div class="slot-reel_ap" id="slot-reel-1"></div>
        <div class="slot-reel_ap" id="slot-reel-2"></div>
        <div class="slot-reel_ap" id="slot-reel-3"></div>
        <!-- 用于遮罩和选择框的覆盖层 -->
        <div id="slot-reel-selector_ap" style="position: absolute; top: 50%; left: 0; width: 100%; height: 80px; transform: translateY(-50%); border-top: 2px solid #f6e05e; border-bottom: 2px solid #f6e05e; pointer-events: none; box-sizing: border-box;"></div>
    </div>
<div id="carrot-juice-display_ap" style="text-align: right; color: #ff9e64; margin-bottom: 10px; font-weight: bold; padding-right: 5px;"></div>
<div id="slot-result-text_ap" style="text-align: center; color: #fff; font-weight: bold; min-height: 24px; margin-top: 15px;"></div>
<button id="start-slot-machine_ap" class="vib-btn_ap" data-color="gold" style="width: 100%; margin-top: 10px;">开始转动！(消耗1瓶)</button>

</div>
                            </div>
                            <div id="memory-view_ap" style="display: none; max-height: 450px; overflow-y: auto;">
                                <h4 class="module-title_ap">我们的羁绊纪事</h4>
                                <div id="memory-stats_ap" class="module-container_ap"></div>
                                <div id="memory-footprints_ap" class="module-container_ap"></div>
                                <div id="memory-goals_ap" class="module-container_ap"></div>
                                <div id="memory-titles_ap" class="module-container_ap"></div>
                                <button id="memory-back-btn_ap" class="vib-btn_ap" data-color="grey" style="width: 100%; margin-top: 10px;">返回</button>
                            </div>
                            <div id="janken-view_ap" style="display: none; text-align: center;">
                                <h4 class="module-title_ap">猜拳挑战！</h4>
                                <div id="janken-result_ap" style="min-height: 60px; margin-bottom: 20px; font-size: 1.2em; display: flex; align-items: center; justify-content: center;">来决一胜负吧！</div>
                                <div class="grid-3-col">
                                    <button class="vib-btn_ap janken-choice-btn" data-choice="rock" data-color="grey">石头</button>
                                    <button class="vib-btn_ap janken-choice-btn" data-choice="paper" data-color="grey">布</button>
                                    <button class="vib-btn_ap janken-choice-btn" data-choice="scissors" data-color="grey">剪刀</button>
                                </div>
                                <button id="janken-back-btn_ap" class="vib-btn_ap" data-color="grey" style="width: 100%;">返回</button>
                            </div>
                            <div id="calendar-view_ap" style="display: none;">
                                <div id="calendar-header_ap" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <button id="prev-month-btn_ap" class="vib-btn_ap" data-color="grey"><</button>
                                    <h4 id="calendar-month-year_ap" class="module-title_ap" style="margin: 0;"></h4>
                                    <button id="next-month-btn_ap" class="vib-btn_ap" data-color="grey">></button>
                                </div>
                                <div id="calendar-grid_ap"></div>
                                <div id="today-online-time_ap" style="text-align: center; margin-top: 10px; font-size: 14px;"></div>
                                <button id="calendar-back-btn_ap" class="vib-btn_ap" data-color="grey" style="width: 100%; margin-top: 10px;">返回</button>
                            </div>
                            <div id="quotes-view_ap" style="display: none; text-align: center;">
                                <h4 class="module-title_ap">强击的悄悄话</h4>
                                <div id="quote-display_ap" class="module-container_ap" style="min-height: 100px; display: flex; align-items: center; justify-content: center; font-style: italic; font-size: 1.1em;"></div>
                                <div class="grid-2-col">
                                 <button id="new-quote-btn_ap" class="vib-btn_ap" data-color="green">换一句</button>
                                 <button id="create-screensaver-btn_ap" class="vib-btn_ap" data-color="gold">做成屏保</button>
                                </div>
                                <button id="quotes-back-btn_ap" class="vib-btn_ap" data-color="grey" style="width: 100%; margin-top: 10px;">返回</button>
                            </div>
                            <div id="creator-signature_ap" style="text-align: center; margin-top: 20px; font-size: 12px; color: #a9b1d6; opacity: 0.8;"></div>
                        </div>
                    </div>
                </div>
            `;
      const playerCSS = `
                <style id="${this.SCRIPT_ID_PREFIX}-styles">
                
                    @font-face { font-family: 'VibrosCustomFont'; src: url('https://files.catbox.moe/3nrfhi.ttf') format('truetype'); }
                    @keyframes marquee_ap { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
                    @keyframes subtle-glow_ap { 0%, 100% { text-shadow: 0 0 5px rgba(187, 154, 247, 0.4), 0 0 10px rgba(187, 154, 247, 0.2); } 50% { text-shadow: 0 0 8px rgba(187, 154, 247, 0.6), 0 0 15px rgba(187, 154, 247, 0.4); } }
                    @keyframes heartbeat_ap { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
                    #memory-goals_ap .module-title_ap cursor: pointer; /* 鼠标放上去会变成小手哦 */user-select: none; /* 防止双击选中文本 */}
                    #memory-goals_ap .module-title_ap:hover {color: #f6e05e; /* 鼠标放上去会变色，提示可以点 */}
                    /* 在 <style> 标签里加上这个 */
#event-description_ap {
    font-size: 16px !important; /* 将字体调大，!important确保生效 */
    line-height: 1.6; /* 增加行高，阅读更舒适 */
}
#tip-container_ap.tip-gold { border-left-color: #f6e05e; }
.event-choice-btn {
    text-align: left !important;
    padding: 15px 20px !important;
    margin-bottom: 10px;
    border-left: 4px solid #7aa2f7; /* 左侧的彩色提示条 */
    background-color: rgba(30, 32, 48, 0.7) !important;
    transition: all 0.2s ease-in-out;
    line-height: 1.5;
    cursor: pointer;
}
#slot-machine-trigger_ap:hover {
    text-decoration: underline;
    color: #bb9af7;
}
.slot-reel_ap {
    width: 30%; /* 每个卷轴占三分之一宽度 */
    display: flex;
    flex-direction: column;
    align-items: center;
}
.slot-reel_ap img {
    width: 80px;
    height: 80px;
    margin-bottom: 10px; /* 图标间距 */
    border-radius: 10px;
    object-fit: cover;
    flex-shrink: 0;
}
/* 定义一个独立的、可复用的滚动动画 */
@keyframes slot-scroll-anim {
    from { transform: translateY(0); }
    to { transform: translateY(-50%); } /* 关键：滚动列表的一半距离然后循环 */
}
/* 应用动画到卷轴 */
.slot-reel_ap.scrolling, #icon-reel_ap.scrolling {
    /* 动画速度可以自定义，这里设为0.5秒一圈 */
    animation: slot-scroll-anim 0.5s linear infinite;
}
/* 确保图片元素不会被压缩变形 */
.slot-reel_ap img, #icon-reel_ap img {
    flex-shrink: 0;
}
/* 这是为按钮内的文本结构准备的样式 */
.event-choice-btn strong {
    display: block;
    font-size: 1.1em;
    color: #e0def4;
    margin-bottom: 4px;
}
.event-choice-btn small {
    opacity: 0.8;
    color: #a9b1d6;
}
#event-outcome-display_ap {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    justify-content: center;
    align-items: center;
    padding: 15px 0;
    animation: outcome-fade-in 0.5s ease;
}
@keyframes outcome-fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes outcome-item-pop-in {
    0% { transform: scale(0.5); opacity: 0; }
    70% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); }
}
.outcome-item {
    /* 在这里为每个小项应用动画 */
    animation: outcome-item-pop-in 0.4s ease-out forwards;
}

.outcome-item {
    font-size: 1.2em;
    font-weight: bold;
    padding: 5px 10px;
    border-radius: 6px;
    background-color: rgba(0, 0, 0, 0.3);
}
.outcome-item.reward { color: #9ece6a; /* 绿色代表奖励 */ }
.outcome-item.penalty { color: #f7768e; /* 红色代表惩罚 */ }


.typewriter-cursor_ap {
    animation: blink_cursor 1s step-end infinite;
    margin-left: 2px;
    font-weight: normal;
    color: #c0caf5;
}

.omikuji-container_ap {
    background: #fffaf0; /* 像和纸一样的米白色 */
    border: 2px solid #bb9af7;
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 15px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    color: #565f89;
    text-align: center;
}
.omikuji-fortune_ap {
    font-size: 2.5em;
    font-weight: bold;
    color: #f7768e; /* 大吉用醒目的颜色 */
    border-bottom: 2px dashed #e0def4;
    padding-bottom: 10px;
    margin-bottom: 10px;
}
.omikuji-desc_ap {
    font-style: italic;
    color: #7aa2f7;
    margin-bottom: 20px;
}
.omikuji-items_ap {
    list-style: none;
    padding: 0;
    text-align: left;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}
.omikuji-items_ap li {
    background: rgba(224, 222, 244, 0.5);
    padding: 8px;
    border-radius: 6px;
}
.omikuji-items_ap li strong {
    color: #7aa2f7;
}
                    #vibrosAudioPlayer-button.heartbeat-feedback { animation: heartbeat_ap 0.5s ease-in-out; }
                    #greeting-marquee_ap.play { display: block !important; animation: marquee_ap 10s linear forwards; }
                    #status-container_ap #status-text_ap { flex-grow: 1; word-break: break-all; font-size: 14px; }
                    #status-buttons_ap { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-left: 10px; }
                    .module-container_ap { background-color: rgba(0,0,0,0.2); border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1); }
                    .module-title_ap { margin: 0 0 10px 0; color: #bb9af7; text-shadow: 0 0 5px #bb9af7; font-size: 1.1em; text-align: center;}
                    .vib-btn_ap { color: #fff; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s ease-in-out; text-shadow: 0 0 3px rgba(0,0,0,0.5); }
                    .vib-btn_ap:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
                    .vib-btn_ap[data-color='purple'] { background: linear-gradient(45deg, #bb9af7, #7aa2f7); } .vib-btn_ap[data-color='blue'] { background: linear-gradient(45deg, #7aa2f7, #5865f2); }
                    .vib-btn_ap[data-color='green'] { background: linear-gradient(45deg, #34d399, #2dd4bf); } .vib-btn_ap[data-color='gold'] { background: linear-gradient(45deg, #f6e05e, #f59e0b); }
                    .vib-btn_ap[data-color='cyan'] { background: linear-gradient(45deg, #38bdf8, #22d3ee); } .vib-btn_ap[data-color='grey'] { background-color: rgba(65, 72, 104, 0.8); border: 1px solid #3b4261; }
                    .vib-btn_ap:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.2); opacity: 0.9; }
                    .vib-textarea_ap { width: calc(100% - 22px); background-color: rgba(10, 10, 20, 0.8); border: 1px solid #3b4261; border-radius: 8px; color: #c0caf5; padding: 10px; resize: vertical; }
                    #shrine-result_ap { min-height: 150px; overflow-y: auto !important; height: auto !important; }
                    #ap-close-panel-btn:hover { color: #fff; transform: scale(1.2); }
                    .draggable-window_ap { position: absolute; z-index: 10001; background-color: rgba(36, 40, 59, 0.9); border: 1px solid #3b4261; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); }
                    .window-header_ap { padding: 10px; background-color: rgba(0,0,0,0.2); cursor: move; border-top-left-radius: 12px; border-top-right-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
                    .window-title_ap { color: #bb9af7; font-weight: bold; }
                    .window-close_ap { cursor: pointer; font-size: 1.2em; color: #a9b1d6; } .window-close_ap:hover { color: #fff; }
                    .window-content_ap { padding: 15px; font-size: 13px; color: #c0caf5; max-height: 400px; overflow-y: auto; }
                    .vib-bg-btn_ap { width: 32px; height: 32px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3); background-size: cover; background-position: center; cursor: pointer; transition: all 0.2s ease; opacity: 0.7; padding: 0; }
                    .vib-bg-btn_ap:hover { opacity: 1; transform: scale(1.1); box-shadow: 0 0 10px rgba(255,255,255,0.5); }
                    #icon-reel_ap { display: flex; flex-direction: column; align-items: center; }  
                    /* 找到旧的 #icon-reel_ap.scrolling 和 @keyframes icon-scroll-anim，然后删除它们 */

                    /* 使用下面这个新的动画定义 */
                    @keyframes icon-scroll-anim {
                        from { transform: translateY(0); }
                        to { transform: translateY(-50%); } /* 让它滚动一半的距离然后循环 */
                    }

                    /* 这是新的滚动样式 */
                    #icon-reel_ap.scrolling {
                        animation: icon-scroll-anim 5s linear infinite; /* 调整动画时长，看起来更自然 */
                    }

                    /* 确保 img 标签样式正确 */
                    #icon-reel_ap img {
                        width: 80px;
                        height: 80px;
                        margin: 10px 0;
                        border-radius: 10px;
                        object-fit: cover;
                        flex-shrink: 0; /* 防止图片被压缩 */
                    }

                    #icon-reel_ap img { width: 80px; height: 80px; margin: 10px 0; border-radius: 10px; object-fit: cover; }
                    #reel-selector_ap { position: absolute; top: 50%; left: 0; width: 100%; height: 100px; transform: translateY(-50%); border-top: 2px solid #f6e05e; border-bottom: 2px solid #f6e05e; pointer-events: none; }
                    #reel-shadow-top_ap, #reel-shadow-bottom_ap { position: absolute; left: 0; width: 100%; height: 50px; pointer-events: none; z-index: 2; }
                    #reel-shadow-top_ap { top: 0; background: linear-gradient(to bottom, rgba(15, 15, 25, 1) 0%, rgba(15, 15, 25, 0) 100%); }
                    #reel-shadow-bottom_ap { bottom: 0; background: linear-gradient(to top, rgba(15, 15, 25, 1) 0%, rgba(15, 15, 25, 0) 100%); }
                    #notes-tabs_ap .note-tab-btn_ap { background-color: rgba(65, 72, 104, 0.5); border: 1px solid #3b4261; padding: 5px 10px; color: #a9b1d6; cursor: pointer; border-radius: 6px; font-size: 12px; }
                    #notes-tabs_ap .note-tab-btn_ap.active, .race-log-tab-btn.active { background-color: #7aa2f7; color: #fff; border-color: #7aa2f7; }
                    #memory-stats_ap p, #memory-titles_ap p, #memory-goals_ap .goal-item { margin: 8px 0; font-size: 14px; }
                    #memory-stats_ap .stats-grid, #memory-footprints_ap .footprints-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
                    #memory-stats_ap .stat-item, #memory-footprints_ap .footprint-item { background-color: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; display: flex; align-items: center; gap: 8px;}
                    #memory-stats_ap .stat-item span:first-child, #memory-footprints_ap .footprint-item span:first-child { font-weight: bold; color: #7aa2f7; }
                    #memory-titles_ap p span { font-weight: bold; color: #f6e05e; }
                    #memory-goals_ap .goal-item { display: flex; align-items: center; padding: 8px 5px; border-bottom: 1px solid #3b4261; }
                    #memory-goals_ap .goal-item:last-child { border-bottom: none; }
                    #memory-goals_ap .goal-item label { flex-grow: 1; cursor: pointer; }
                    .goal-checkbox { margin-right: 10px; cursor: pointer; }
                    #calendar-grid_ap { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
                    #calendar-grid_ap .day-name_ap, #calendar-grid_ap .day_ap { background: rgba(0,0,0,0.2); padding: 5px; text-align: center; border-radius: 4px; }
                    #calendar-grid_ap .day-name_ap { font-weight: bold; color: #a9b1d6; font-size: 12px; }
                    #calendar-grid_ap .day_ap { min-height: 40px; font-size: 12px; }
                    #calendar-grid_ap .online-time_ap { font-size: 10px; color: #7aa2f7; margin-top: 4px; }
                    #race-log-content_ap table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    #race-log-content_ap th, #race-log-content_ap td { padding: 8px; text-align: left; border-bottom: 1px solid #3b4261; }
                    #race-log-content_ap th { color: #bb9af7; }
                    #screensaver-overlay_ap { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 20000; display: flex; flex-direction: column; align-items: center; justify-content: center; background-size: cover; background-position: center; transition: background 0.5s ease; }
                    #screensaver-quote_ap { color: #fff; font-size: 2.5em; text-shadow: 2px 2px 8px rgba(0,0,0,0.7); text-align: center; padding: 20px; max-width: 80%; }
                    #screensaver-controls_ap { position: absolute; top: 20px; right: 20px; display: flex; gap: 10px; }
                    #todo-list_ap li { display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid #3b4261; }
                    #todo-list_ap li.completed span { text-decoration: line-through; opacity: 0.5; }
                    #todo-list_ap .todo-text { flex-grow: 1; }
                    #todo-list_ap .delete-todo-btn { background: #f7768e; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px; line-height: 20px; text-align: center; }
                    #creator-signature_ap { animation: subtle-glow_ap 3s ease-in-out infinite; }
                    #knowledge-content-display_ap { max-height: 300px; overflow-y: auto; padding: 15px; }
                    .knowledge-item_ap { margin-bottom: 15px; }
                    .knowledge-title_ap { cursor: pointer; font-weight: bold; color: #7aa2f7; border-bottom: 1px dashed #7aa2f7; padding-bottom: 5px; margin-bottom: 8px; }
                    .knowledge-title_ap:hover { color: #bb9af7; }
                    .knowledge-text_ap { color: #c0caf5; line-height: 1.6; min-height: 20px; }
                    .knowledge-text_ap::after { content: '▋'; animation: blink_cursor 1s step-end infinite; }
                    @keyframes blink_cursor { from, to { color: transparent; } 50% { color: #c0caf5; } }
                    #title-game-hints p { margin: 5px 0; padding-left: 10px; border-left: 2px solid #7aa2f7; }
                    .bg-control-btn_ap { position: absolute; bottom: 20px; right: 20px; width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background-image: url('https://files.catbox.moe/0x2hia.png'); background-size: cover; background-position: center; cursor: pointer; transition: all 0.3s ease; z-index: 5; opacity: 0.8; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
                    .bg-control-btn_ap:hover { transform: scale(1.1); opacity: 1; box-shadow: 0 4px 12px rgba(187, 154, 247, 0.5); }
                    .bg-control-btn_ap.dynamic-mode::after { content: '▶'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8); color: white; font-size: 20px; text-shadow: 0 0 5px black; pointer-events: none; }
                    #tip-container_ap.tip-info { border-left-color: #7aa2f7; }
                    #tip-container_ap.tip-success { border-left-color: #34d399; }
                    #tip-container_ap.tip-warning { border-left-color: #f6e05e; }
                    #tip-container_ap.tip-error { border-left-color: #f7768e; }
                    
                    /* 电脑端基础样式 */
                    #${this.SCRIPT_ID_PREFIX}-player-panel {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 90%;
                        max-width: 500px;
                        height: 80vh;
                        max-height: 600px;
                        background: rgba(15, 15, 25, 0.95);
                        border-radius: 16px;
                        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                        border: 1px solid rgba(255, 255, 255, 0.18);
                        z-index: 10001;
                        overflow: hidden;
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                    }

                    #vib-player-container {
                        position: relative;
                        width: 90%;
                        max-width: 500px;
                        margin: 20px auto;
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                        border: 1px solid rgba(255, 255, 255, 0.18);
                    }

                    #vib-bg-image {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-size: cover;
                        background-position: center;
                        z-index: -1;
                    }

                    #vib-bg-video {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: auto;
                        height: auto;
                        min-width: 100%;
                        min-height: 100%;
                        transform: translate(-50%, -50%);
                        z-index: -2;
                        display: none;
                    }

                    #vib-player-content {
                        backdrop-filter: blur(8px) saturate(120%);
                        -webkit-backdrop-filter: blur(8px) saturate(120%);
                        background-color: rgba(15, 15, 25, 0.65);
                        padding: 25px;
                        color: #f0f0f0;
                        font-family: 'VibrosCustomFont', 'Microsoft YaHei', 'Segoe UI', sans-serif;
                        position: relative;
                        overflow: hidden;
                    }

                    #greeting-marquee_ap {
                        position: absolute;
                        top: 10px;
                        left: 0;
                        white-space: nowrap;
                        color: #fff;
                        font-weight: bold;
                        text-shadow: 0 0 5px #bb9af7;
                        display: none;
                    }

                    #ap-close-panel-btn {
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        font-size: 1.8rem;
                        color: #ccc;
                        cursor: pointer;
                        z-index: 10;
                        transition: all 0.2s ease;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    #status-container_ap {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        background-color: rgba(0,0,0,0.3);
                        border-radius: 8px;
                        padding: 5px 15px;
                        margin-bottom: 15px;
                        border-left: 4px solid #7aa2f7;
                        min-height: 44px;
                    }

                    #status-buttons_ap {
                        display: grid;
                        grid-template-columns: repeat(5, 1fr);
                        gap: 8px;
                        margin-left: 10px;
                    }

                    #tip-container_ap {
                        background-color: rgba(0,0,0,0.3);
                        border-radius: 8px;
                        padding: 10px;
                        margin-bottom: 15px;
                        border-left: 4px solid #f6e05e;
                        display: none;
                    }

                    /* Grid布局类 */
                    .grid-3-col {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 10px;
                        margin-bottom: 10px;
                    }

                    .grid-2-col {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                    }

                    .grid-3-col-wide {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        gap: 10px;
                    }

                    .grid-2-col-margin {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                        margin-bottom: 15px;
                    }

                    .sfx-grid {
                        margin-top: 10px;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                        align-items: center;
                    }

                    /* 手机端样式 - 完全分离 */
                    @media (max-width: 768px) {
                        #${this.SCRIPT_ID_PREFIX}-player-panel {
                            width: calc(100vw - 16px) !important;
                            max-width: calc(100vw - 16px) !important;
                            height: calc(100vh - 20px) !important;
                            max-height: calc(100vh - 20px) !important;
                            top: 50% !important;
                            left: 50% !important;
                            right: auto !important;
                            bottom: auto !important;
                            margin: 0 !important;
                            transform: translate(-50%, -50%) !important;
                            border-radius: 12px !important;
                            overflow-y: auto !important;
                            -webkit-overflow-scrolling: touch !important;
                            box-sizing: border-box !important;
                            padding: 0 !important;
                        }

                        #vib-player-container {
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            border-radius: 12px !important;
                        }

                        #vib-player-content {
                            padding: 6px !important;
                            backdrop-filter: blur(8px) saturate(120%) !important;
                            -webkit-backdrop-filter: blur(8px) saturate(120%) !important;
                            background-color: rgba(15, 15, 25, 0.65) !important;
                            color: #f0f0f0 !important;
                            font-family: 'VibrosCustomFont', 'Microsoft YaHei', 'Segoe UI', sans-serif !important;
                            position: relative !important;
                            overflow: hidden !important;
                            box-sizing: border-box !important;
                            max-height: calc(100vh - 32px) !important;
                        }

                        #vib-bg-image {
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 100% !important;
                            height: 100% !important;
                            background-size: cover !important;
                            background-position: center !important;
                            z-index: -1 !important;
                        }

                        #vib-bg-video {
                            position: absolute !important;
                            top: 50% !important;
                            left: 50% !important;
                            width: auto !important;
                            height: auto !important;
                            min-width: 100% !important;
                            min-height: 100% !important;
                            transform: translate(-50%, -50%) !important;
                            z-index: -2 !important;
                            display: none !important;
                        }

                        #greeting-marquee_ap {
                            position: absolute !important;
                            top: 4px !important;
                            left: 0 !important;
                            white-space: nowrap !important;
                            color: #fff !important;
                            font-weight: bold !important;
                            text-shadow: 0 0 5px #bb9af7 !important;
                            display: none !important;
                        }

                        #ap-close-panel-btn {
                            position: absolute !important;
                            top: 2px !important;
                            right: 2px !important;
                            font-size: 1.4rem !important;
                            color: #ccc !important;
                            cursor: pointer !important;
                            z-index: 1000 !important;
                            transition: all 0.2s ease !important;
                            width: 28px !important;
                            height: 28px !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            touch-action: manipulation !important;
                            -webkit-tap-highlight-color: transparent !important;
                            background-color: rgba(0,0,0,0.3) !important;
                            border-radius: 50% !important;
                        }

                        #status-container_ap {
                            display: flex !important;
                            align-items: center !important;
                            justify-content: space-between !important;
                            background-color: rgba(0,0,0,0.3) !important;
                            border-radius: 6px !important;
                            padding: 2px 6px !important;
                            margin-bottom: 6px !important;
                            margin-top: 32px !important;
                            border-left: 3px solid #7aa2f7 !important;
                            min-height: 24px !important;
                        }

                        #status-buttons_ap {
                            display: grid !important;
                            grid-template-columns: repeat(5, 1fr) !important;
                            gap: 4px !important;
                            margin-left: 6px !important;
                        }

                        #tip-container_ap {
                            background-color: rgba(0,0,0,0.5) !important;
                            border-radius: 6px !important;
                            padding: 6px !important;
                            margin-bottom: 8px !important;
                            border-left: 3px solid #f6e05e !important;
                            display: block !important;
                            font-size: 11px !important;
                            color: #fff !important;
                            text-shadow: 0 1px 2px rgba(0,0,0,0.8) !important;
                        }

                        .module-container_ap {
                            padding: 4px !important;
                            margin-bottom: 4px !important;
                        }

                        .module-title_ap {
                            font-size: 12px !important;
                            margin-bottom: 4px !important;
                        }

                        .vib-btn_ap {
                            padding: 4px 6px !important;
                            font-size: 10px !important;
                            margin-bottom: 2px !important;
                            touch-action: manipulation !important;
                            -webkit-tap-highlight-color: transparent !important;
                            min-height: 24px !important;
                        }

                        .vib-bg-btn_ap {
                            width: 24px !important;
                            height: 24px !important;
                            background-size: cover !important;
                            background-position: center !important;
                            touch-action: manipulation !important;
                            -webkit-tap-highlight-color: transparent !important;
                        }

                        .quick-action-btn {
                            width: calc(50% - 2px) !important;
                            margin-bottom: 2px !important;
                        }

                        .status-display {
                            font-size: 9px !important;
                            padding: 2px !important;
                        }

                        .marquee-container {
                            font-size: 9px !important;
                            padding: 2px !important;
                        }

                        .bg-control-btn_ap {
                            width: 25px !important;
                            height: 25px !important;
                            bottom: 8px !important;
                            right: 8px !important;
                        }

                        .close-btn {
                            top: 6px !important;
                            right: 6px !important;
                            width: 20px !important;
                            height: 20px !important;
                            font-size: 12px !important;
                        }

                        #bgm-now-playing_ap {
                            font-size: 10px !important;
                            margin-bottom: 6px !important;
                        }

                        #timer-display_ap {
                            font-size: 12px !important;
                            padding: 4px !important;
                        }

                        #pomodoro-status_ap {
                            font-size: 10px !important;
                            margin-bottom: 4px !important;
                        }

                        #icon-reel-container_ap {
                            height: 120px !important;
                        }

                        #slot-reels-wrapper_ap {
                            height: 100px !important;
                        }

                        .slot-reel {
                            height: 80px !important;
                        }

                        .slot-reel_ap img {
                            width: 40px !important;
                            height: 40px !important;
                            margin: 4px !important;
                        }

                        .roulette-item {
                            width: 40px !important;
                            height: 40px !important;
                            margin: 2px !important;
                        }

                        /* Grid布局手机端适配 */
                        .grid-3-col {
                            gap: 6px !important;
                            margin-bottom: 6px !important;
                        }

                        .grid-2-col {
                            gap: 6px !important;
                        }

                        .grid-3-col-wide {
                            gap: 6px !important;
                        }

                        .grid-2-col-margin {
                            gap: 6px !important;
                            margin-bottom: 8px !important;
                        }

                        .sfx-grid {
                            gap: 6px !important;
                        }

                        /* 触摸优化 */
                        #${this.SCRIPT_ID_PREFIX}-player-panel {
                            touch-action: manipulation !important;
                            -webkit-tap-highlight-color: transparent !important;
                            user-select: none !important;
                        }

                        /* 滚动条优化 */
                        #${this.SCRIPT_ID_PREFIX}-player-panel::-webkit-scrollbar {
                            width: 4px !important;
                        }

                        #${this.SCRIPT_ID_PREFIX}-player-panel::-webkit-scrollbar-track {
                            background: rgba(255,255,255,0.1) !important;
                            border-radius: 2px !important;
                        }

                        #${this.SCRIPT_ID_PREFIX}-player-panel::-webkit-scrollbar-thumb {
                            background: rgba(187, 154, 247, 0.5) !important;
                            border-radius: 2px !important;
                        }

                        /* 确保内容不会超出屏幕 */
                        #${this.SCRIPT_ID_PREFIX}-player-panel * {
                            max-width: 100% !important;
                            box-sizing: border-box !important;
                        }

                        /* 防止页面超出屏幕 */
                        body, html {
                            overflow: hidden !important;
                            position: fixed !important;
                            width: 100% !important;
                            height: 100% !important;
                        }

                        /* 确保所有内容都在视口内 */
                        #${this.SCRIPT_ID_PREFIX}-player-panel {
                            position: fixed !important;
                            z-index: 9999 !important;
                        }

                        .window-close_ap {
                            font-size: 1.5rem !important;
                            color: #ccc !important;
                            cursor: pointer !important;
                            padding: 8px !important;
                            border-radius: 50% !important;
                            background-color: rgba(0,0,0,0.3) !important;
                            width: 32px !important;
                            height: 32px !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            touch-action: manipulation !important;
                            -webkit-tap-highlight-color: transparent !important;
                        }

                        .window-close_ap:hover {
                            color: #fff !important;
                            background-color: rgba(0,0,0,0.5) !important;
                        }

                        .omikuji-container_ap {
                            padding: 10px !important;
                            margin-bottom: 8px !important;
                        }

                        .omikuji-fortune_ap {
                            font-size: 1.8em !important;
                            padding-bottom: 6px !important;
                            margin-bottom: 6px !important;
                        }

                        .omikuji-desc_ap {
                            margin-bottom: 10px !important;
                            font-size: 12px !important;
                        }

                        .omikuji-items_ap {
                            grid-template-columns: 1fr !important;
                            gap: 4px !important;
                        }

                        .omikuji-items_ap li {
                            padding: 4px !important;
                            font-size: 11px !important;
                        }

                        #screensaver-overlay_ap {
                            background: none !important;
                        }

                        #screensaver-quote_ap {
                            font-size: 1.8em !important;
                            padding: 10px !important;
                            max-width: 90% !important;
                        }

                        #screensaver-controls_ap {
                            top: 10px !important;
                            right: 10px !important;
                        }
                    }
                </style>
            `;
      $('head', this.parentWin.document).append(playerCSS);
      $('body', this.parentWin.document).append(playerHTML);
      // Albin V3.0 最终修复：在面板HTML被添加到页面后，立即填充老虎机图标
      this.populateSlotMachineIcons();
      this.bindPanelEvents();
      this.triggerGreetingMarquee();
    },
    startOnlineTimer() {
      clearInterval(this.onlineTimerInterval);
      this.onlineTimerInterval = setInterval(() => {
        const todayKey = new Date().toISOString().split('T')[0];
        const onlineTimeData = JSON.parse(localStorage.getItem(this.ONLINE_TIME_KEY) || '{}');
        onlineTimeData[todayKey] = (onlineTimeData[todayKey] || 0) + 1;
        localStorage.setItem(this.ONLINE_TIME_KEY, JSON.stringify(onlineTimeData));
      }, 1000);
    },
    triggerGreetingMarquee() {
      const $ = this.$;
      const hour = new Date().getHours();
      let greeting = '';
      if (hour >= 5 && hour < 12) greeting = '早上好啊，拖累那亲~！新的一天也要充满悸动哦！';
      else if (hour >= 12 && hour < 18) greeting = '下午好，拖累那亲！要来点名流的下午茶吗？';
      else if (hour >= 18 && hour < 23) greeting = '晚上好~！工作结束了吗？我们去约会吧！';
      else greeting = '这么晚了还不睡吗，拖累那亲？是在想我的事吗？耶嘿嘿~';
      const $marquee = $('#greeting-marquee_ap', this.parentWin.document);
      if ($marquee.length > 0) {
        $marquee.text(greeting);
        $marquee.addClass('play');
        $marquee.one('animationend', function () {
          $(this).removeClass('play').hide();
        });
      }
    },
    updatePageTitle(type) {
      const titles = this.pageTitles[type];
      if (titles && titles.length > 0) {
        this.parentWin.document.title = titles[Math.floor(Math.random() * titles.length)];
      }
    },
    switchView(viewToShow) {
      const $ = this.$;
      const views = [
        'main-view_ap',
        'shrine-view_ap',
        'notes-view_ap',
        'timer-view_ap',
        'icon-roulette-view_ap',
        'memory-view_ap',
        'janken-view_ap',
        'calendar-view_ap',
        'quotes-view_ap',
        'knowledge-view_ap',
        'title-game-view_ap',
      ];
      views.forEach(viewId => {
        const $view = $(`#${viewId}`, this.parentWin.document);
        if ($view.length) {
          if (viewId === viewToShow) $view.show();
          else $view.hide();
        }
      });
    },
    bindPanelEvents() {
      const $ = this.$;
      const $panelDoc = $(this.parentWin.document);
      this.statusContainer = $panelDoc.find('#status-text_ap')[0];
      this.tipContainer = $panelDoc.find('#tip-container_ap');
      const manualInput = $panelDoc.find('#manual-input_ap')[0];
      const uiClickHandler = (titleType, sound, quoteType) => {
        if (sound) sound.play().catch(e => {});
        if (titleType) this.updatePageTitle(titleType);
        if (quoteType) this.showHeartfeltQuote(quoteType);
        else this.showRandomKnowledge();
      };
      $panelDoc.find('#show-log-btn_ap').on('click', () => {
        this.currentNoteCategory = 'log'; // 设定一个特殊分类
        $('#notes-textarea_ap, #todo-list-container_ap').hide();
        const $logDisplay = $('#training-log-display_ap').show();
        $logDisplay.empty();
        $('#notes-tabs_ap .note-tab-btn_ap').removeClass('active');
        if (this.memory.triggeredEventNames && this.memory.triggeredEventNames.length > 0) {
          let logHtml = '<ul>';
          this.memory.triggeredEventNames.forEach(eventName => {
            logHtml += `<li style="margin-bottom: 8px; border-left: 2px solid #bb9af7; padding-left: 8px;">${eventName}</li>`;
          });
          logHtml += '</ul>';
          $logDisplay.html(logHtml);
        } else {
          $logDisplay.html(
            '<p style="text-align:center; opacity:0.8;">欸~？我们之间居然还没有专属的秘密回忆吗？拖累那亲要多努力一点才行哦！</p>',
          );
        }
      });
      $panelDoc.find('#unified-bg-toggle-btn_ap').on('click', e => {
        // 核心逻辑：循环切换 allBackgrounds 列表
        this.currentBgIndex = (this.currentBgIndex + 1) % this.allBackgrounds.length;
        const nextBg = this.allBackgrounds[this.currentBgIndex];
        // 更新背景
        this.updateBackground(nextBg.type, nextBg.value);
        // 更新按钮样式
        const $button = $(e.currentTarget);
        if (nextBg.type === 'dynamic') {
          $button.addClass('dynamic-mode');
        } else {
          $button.removeClass('dynamic-mode');
        }
        // 从新的URL数组里随机选一个
        const randomSoundUrl = this.bgSwitchSoundUrls[Math.floor(Math.random() * this.bgSwitchSoundUrls.length)];
        // 直接用sfxPlayer播放它
        this.sfxPlayer.src = randomSoundUrl;
        this.sfxPlayer.play().catch(err => {
          console.error('背景切换音效播放失败:', err);
        });
      });

      $panelDoc.find('#goto-shrine-btn_ap').on('click', () => {
        uiClickHandler('gotoShrine', this.sounds.shrineEnter);
        this.updateBackground('shrine');
        this.switchView('shrine-view_ap');
      });
      $panelDoc.find('#show-notes-btn_ap').on('click', () => {
        uiClickHandler('notes', this.sounds.notesBtn);
        this.switchView('notes-view_ap');
        this.handleNoteTabSwitch(this.currentNoteCategory);
      });
      $panelDoc.find('#show-timer-btn_ap').on('click', () => {
        uiClickHandler('timer', this.sounds.timerBtnNew, 'timer');
        this.switchView('timer-view_ap');
      });
      $panelDoc.find('#change-icon-btn_ap').on('click', () => {
        uiClickHandler('roulette', this.sounds.rouletteBtn, 'roulette');
        this.startIconRoulette();
        this.switchView('icon-roulette-view_ap');
      });
      $panelDoc.find('#show-memory-btn_ap').on('click', () => {
        uiClickHandler('memory', this.sounds.memoryBtn);
        this.updateMemoryView();
        this.switchView('memory-view_ap');
      });
      $panelDoc.find('#show-janken-btn_ap').on('click', () => {
        uiClickHandler('janken', this.sounds.jankenBtn);
        this.switchView('janken-view_ap');
      });
      $panelDoc.find('#show-calendar-btn_ap').on('click', () => {
        uiClickHandler('calendar', this.sounds.calendarBtn, 'calendar');
        this.renderCalendar();
        this.switchView('calendar-view_ap');
      });
      $panelDoc.find('#show-race-log-btn_ap').on('click', () => {
        uiClickHandler('raceLog', this.sounds.raceLogBtn);
        $('#race-log-float-window_ap').show();
        this.renderRaceLog('初级');
      });
      $panelDoc.find('#show-quotes-btn_ap').on('click', () => {
        uiClickHandler('quotes', this.sounds.quotesBtnNew, 'quotes');
        this.showRandomQuote();
        this.switchView('quotes-view_ap');
      });
      $panelDoc.find('#show-knowledge-btn_ap').on('click', () => {
        uiClickHandler('knowledge', this.sounds.knowledgeBtn);
        this.initKnowledgeView();
        this.switchView('knowledge-view_ap');
      });
      $panelDoc.find('#show-title-game-btn_ap').on('click', () => {
        uiClickHandler('titleGame');
        this.startTitleGame();
        this.switchView('title-game-view_ap');
      });
      $panelDoc.find('#show-info-btn_ap').on('click', () => {
        uiClickHandler('info', this.sounds.infoBtn);
        $('#info-float-window_ap').show();
      });
      const backToMainHandler = () => {
        this.updateBackground(this.currentMainBg.type, this.currentMainBg.value);
        this.switchView('main-view_ap');
      };
      $panelDoc
        .find(
          '#shrine-back-btn_ap, #notes-back-btn_ap, #timer-back-btn_ap, #roulette-back-btn_ap, #memory-back-btn_ap, #janken-back-btn_ap, #calendar-back-btn_ap, #quotes-back-btn_ap, #knowledge-back-btn_ap, #title-game-back-btn_ap',
        )
        .on('click', backToMainHandler);
      $panelDoc.find('#knowledge-content-back-btn_ap').on('click', () => {
        $('#knowledge-main-menu_ap').show();
        $('#knowledge-content-view_ap').hide();
      });
      $panelDoc.on('click touchstart', '.window-close_ap', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).closest('.draggable-window_ap').hide();
      });
      $panelDoc.on('click', '#event-close-final_ap', function () {
        $('#event-float-window_ap').hide();
      });
      $('.draggable-window_ap').each((index, el) => {
        const $el = $(el);
        $el.data('dragHandle', '.window-header_ap');
        $el.data('positionKey', `vibros_window_${el.id}`);
        const savedPos = localStorage.getItem($el.data('positionKey'));
        if (savedPos) $el.css(JSON.parse(savedPos));
        makeDraggable($el, this.parentWin, $, this.SCRIPT_ID_PREFIX);
      });
      const $notesTabs = $panelDoc.find('#notes-tabs_ap');
      this.noteCategories.forEach(category => {
        $notesTabs.append(
          `<button class="note-tab-btn_ap vib-btn_ap" data-category="${category}">${category}</button>`,
        );
      });
      $notesTabs
        .find('.note-tab-btn_ap')
        .on('click', e => this.handleNoteTabSwitch($(e.currentTarget).data('category')));
      $notesTabs.find(`.note-tab-btn_ap[data-category="${this.currentNoteCategory}"]`).addClass('active');
      $panelDoc.find('#add-todo-btn_ap').on('click', () => {
        this.addTodo();
        this.showHeartfeltQuote('todo');
      });
      $('#todo-list_ap').on('click', '.todo-checkbox', e => this.toggleTodo(e));
      $('#todo-list_ap').on('click', '.delete-todo-btn', e => this.deleteTodo(e));
      $('#memory-view_ap').on('click', '.goal-checkbox', e => {
        const $checkbox = $(e.currentTarget);
        const goalId = $checkbox.data('goal-id');
        const goal = this.memory.raceGoals.find(g => g.id === goalId);
        if (goal) {
          goal.status = $checkbox.is(':checked') ? 'completed' : 'pending';
          this.saveMemory();
          this.checkAllGoalsCompleted();
        }
      });
      $panelDoc.find('#pomodoro-toggle-btn_ap').on('click', () => this.togglePomodoroMode());
      const $startPauseBtn = $panelDoc.find('#timer-start-pause-btn_ap');
      $startPauseBtn.on('click', () => {
        if (this.pomodoro.state === 'idle') {
          this.isTimerRunning = !this.isTimerRunning;
          if (this.isTimerRunning) {
            $startPauseBtn.text('暂停').attr('data-color', 'gold');
            this.timerInterval = setInterval(() => {
              this.timerSeconds++;
              this.updateTimerDisplay();
            }, 1000);
          } else {
            $startPauseBtn.text('开始').attr('data-color', 'blue');
            clearInterval(this.timerInterval);
          }
        } else {
          this.startPomodoroCycle();
        }
      });
      $panelDoc.find('#timer-reset-btn_ap').on('click', () => this.resetTimer());
      $panelDoc.find('#bgm-toggle-btn_ap, #bgm-prev-btn_ap, #bgm-next-btn_ap').on('click', e => {
        const action = $(e.currentTarget).is('#bgm-toggle-btn_ap')
          ? 'toggle'
          : $(e.currentTarget).is('#bgm-prev-btn_ap')
            ? 'prev'
            : 'next';
        this.controlBgm(action);
      });
      $panelDoc.find('#bgm-volume-btn_ap').on('click', e => {
        this.bgmVolumeIndex = (this.bgmVolumeIndex + 1) % this.volumeLevels.length;
        const newVolume = this.volumeLevels[this.bgmVolumeIndex];
        this.bgmPlayer.volume = newVolume.level;
        $(e.currentTarget).text(`BGM音量: ${newVolume.text}`);
      });

      $panelDoc.find('#bgm-manage-btn_ap').on('click', e => {
        e.preventDefault();
        this.showBgmManagePanel();
      });

      // 音效控制面板按钮事件
      $panelDoc.find('#sfx-prev-btn_ap, #sfx-next-btn_ap').on('click', e => {
        this.playTestSfx($(e.currentTarget).is('#sfx-prev-btn_ap') ? 'prev' : 'next');
      });

      $panelDoc.find('#sfx-volume-btn_ap').on('click', e => {
        this.cycleSfxVolume();
        const newVolume = this.volumeLevels[this.sfxVolumeIndex];
        $(e.currentTarget).text(`SFX音量: ${newVolume.text}`);
      });

      // 移除标题点击事件 - 标题不再有点击效果

      $panelDoc.find('#slot-machine-trigger_ap').on('click', () => {
        const $container = $panelDoc.find('#slot-machine-container_ap');
        // 使用 slideToggle 效果更佳
        $container.slideToggle('fast');
      });
      // 使用事件委托来绑定老虎机按钮的点击事件
      $panelDoc.find('#vib-player-container').on('click', '#start-slot-machine_ap', () => {
        if (this.slotMachineState.isRolling) {
          // 如果正在滚动，就执行停止操作
          this.stopSlotReel();
        } else {
          // 如果没在滚动，就执行开始操作
          this.startSlotMachine();
        }
      });

      const $shrineResult = $panelDoc.find('#shrine-result_ap');
      const $drawBtn = $panelDoc.find('#shrine-draw-btn_ap');
      $panelDoc.find('#shrine-pray-btn_ap').on('click', () => {
        this.sounds.pray.play();
        $('#shrine-prompt_ap').text('怀着敬意，与搭档一同向神明传达了心意...');
        $('#omikuji-result-display_ap').hide(); // 隐藏旧的签
        $('#shrine-prompt_ap').show(); // 显示提示语
        $drawBtn.prop('disabled', false);
        this.memory.counters.shrineVisits++;
        this.saveMemory();
      });
      $panelDoc.find('#shrine-draw-btn_ap').on('click', () => {
        this.sounds.draw.play();
        this.drawOmikuji($shrineResult);
        $drawBtn.prop('disabled', true);
      });
      $panelDoc.find('#random-event-btn_ap').on('click', () => {
        this.sounds.randomEvent.play();
        this.triggerRandomEvent();
      });
      $panelDoc.find('#stop-roulette-btn_ap').on('click', () => this.stopIconRoulette());
      $panelDoc.find('.janken-choice-btn').on('click', e => this.playJanken($(e.currentTarget).data('choice')));
      $panelDoc.find('#prev-month-btn_ap').on('click', () => {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
        this.renderCalendar();
        this.showHeartfeltQuote('calendar');
      });
      $panelDoc.find('#next-month-btn_ap').on('click', () => {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
        this.renderCalendar();
        this.showHeartfeltQuote('calendar');
      });
      $panelDoc.find('.race-log-tab-btn').on('click', e => {
        this.renderRaceLog($(e.currentTarget).data('year'));
      });
      $panelDoc.find('#new-quote-btn_ap').on('click', () => {
        this.showRandomQuote();
        this.showHeartfeltQuote('quotes');
      });
      $panelDoc.find('#create-screensaver-btn_ap').on('click', () => this.generateScreensaver());
      $panelDoc.find('#request-hint-btn_ap').on('click', () => this.requestTitleHint());
      $panelDoc.find('#check-answer-btn_ap').on('click', () => this.checkTitleAnswer());
      $panelDoc.find('#next-title-btn_ap').on('click', () => {
        this.sounds.titleGameNext.play();
        this.startTitleGame();
      });
      const closePanel = () => {
        if (this.currentNoteCategory !== 'To do List') {
          localStorage.setItem(`vibros_notes_${this.currentNoteCategory}`, $('#notes-textarea_ap').val());
        }
        clearInterval(this.timerInterval);
        clearInterval(this.onlineTimerInterval);
        clearTimeout(this.iconRouletteTimer);
        clearInterval(this.knowledgeTypewriterInterval);
        $(`#${this.PLAYER_PANEL_OVERLAY_ID}`, this.parentWin.document).remove();
        $(`#${this.SCRIPT_ID_PREFIX}-styles`, this.parentWin.document).remove();
        this.statusContainer = null;
        this.tipContainer = null;
      };
      $panelDoc.find('#ap-close-panel-btn').on('click touchstart', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closePanel();
      });

      $panelDoc.find(`#${this.PLAYER_PANEL_OVERLAY_ID}`).on('click', e => {
        if ($(e.target).is($(`#${this.PLAYER_PANEL_OVERLAY_ID}`))) {
          closePanel();
        }
      });
      this.postStatus('LoadSuccess', this.sfxLibrary.length);
      this.updateBgmStatus();
      // 初始化音量按钮文本
      const $bgmVolumeBtn = $panelDoc.find('#bgm-volume-btn_ap');
      if ($bgmVolumeBtn.length > 0) {
        $bgmVolumeBtn.text(`BGM音量: ${this.volumeLevels[this.bgmVolumeIndex].text}`);
      }

      const $sfxVolumeBtn = $panelDoc.find('#sfx-volume-btn_ap');
      if ($sfxVolumeBtn.length > 0) {
        $sfxVolumeBtn.text(`SFX音量: ${this.volumeLevels[this.sfxVolumeIndex].text}`);
      }

      // 调试信息
      console.log('音频播放器初始化完成:');
      console.log('- BGM库数量:', this.bgmLibrary.length);
      console.log('- SFX库数量:', this.sfxLibrary.length);
      console.log('- BGM音量:', this.bgmPlayer.volume);
      console.log('- SFX音量:', this.sfxPlayer.volume);
      console.log('- BGM当前索引:', this.bgmPlaybackIndex);
      console.log('- BGM当前源:', this.bgmPlayer.src);
      this.updateBackground(this.currentMainBg.type, this.currentMainBg.value);
      $('#creator-signature_ap').html('酒馆精灵|强击育成模拟器<br>技术支持: Eternal zz|可二创，欢迎联系|禁止商用');
    },
    initKnowledgeView() {
      const $ = this.$;
      $('#knowledge-main-menu_ap').show();
      $('#knowledge-content-view_ap').hide();
      $('.knowledge-chapter-btn_ap')
        .off('click')
        .on('click', e => {
          const chapter = $(e.currentTarget).data('chapter');
          this.showKnowledgeChapter(chapter);
        });
    },
    showKnowledgeChapter(chapterNum) {
      this.memory.counters.knowledgeViewed++; // 每次点开章节就+1
      this.saveMemory(); // 保存
      const $ = this.$;
      const knowledgeBase = {
        1: [
          {
            title: '【我们所在的世界☆基本常识篇】',
            content:
              '呐呐，拖累那亲，在我们开始深入研究前，你得先知道我们这个世界最~基础的设定哦！这里超~和平的，没有那种乱七八糟的战争，因为大家的热情都集中在赛跑上啦！<br>而且，这个世界没有‘马’，但是有我们——又强又可爱的马娘！我们可是偶像和明星哦，每一场比赛都会被好多好多人关注！最重要的是，传说中有三位女神在守护着我们……虽然很多人不信，但我觉得，一定存在的啦！不然怎么会有我这么闪耀的存在呢？耶嘿嘿~',
          },
          {
            title: '【特雷森学园☆美食风向标】',
            content:
              '说到学园生活，怎么能不提食堂呢！菜单超~丰富的！从方便快捷的三明治，到能温暖身心的胡萝卜土豆炖汤，应有尽有！<br>不过呢，除了大家都能吃的常规菜单，还有一些‘隐藏料理’哦！那是属于特定的人和羁绊的味道，比如小特那个超~大份的小山蒜拉面，还有米浴前辈那个看起来就很治愈的炖汤……哼哼，当然，最~特别的，还是本小姐以‘名流的品味’为你和我定制的‘闪亮马娘冰沙’！那可不是随便能喝到的，杯底是蓝色果冻，上层是金色冰沙，顶上还有金箔和巧克力！是只属于我们两个人的悸动瞬间哦♡',
          },
          {
            title: '【关于我们马娘本身哦~☆】',
            content:
              '耶嘿嘿~接下来是关于我们马娘的特别讲座！听好了哦，这可是常识！<br>我们的力量和速度？那当然是超~级的！虽然平常看起来是可爱又闪亮的女孩子，但认真起来，掀翻一辆大卡车什么的，只是热身运动啦！所以拖累那亲你可别想从我怀里逃走哦~<br>还有还有，我们的耳朵和尾巴！这可是超~私密的部位，会诚实地反映出我们的心情！比如我心情好的时候，耳朵就会开心地动来-动去~生气的时候嘛……哼哼，就会变成“飞机耳”！所以呀，只有像拖累那亲你这样最~特别的人，我才允许你……悄悄地摸一下哦。❤<br>至于生长周期，女孩子的秘密可多啦！最重要的就是“本格化”，就像是魔法一样，夏天一到，身体里就会涌出无穷的力量，“砰”地一下就变强了！是不是超~神奇的？',
          },
          {
            title: '【闪耀赛场☆完全解说！】',
            content:
              '比赛可不是傻乎乎地跑就行的！从入闸开始，就要展现出气场！解说员会介绍我们，观众会为我们欢呼，那种感觉超~棒的！<br><b>序盘</b>，发令枪一响，就要像离弦的箭一样冲出去，抢占好位置！耳边的风声，脚下赛道的感觉，都是战斗开始的信号！<br><b>中盘</b>，这里考验的就是智慧啦，拖累那亲！要合理分配体力，寻找超越对手的最佳时机，不能急躁，也不能落后，要像优雅的猎手一样。<br><b>末盘</b>，这才是最让人热血沸腾的！把所有剩下的力量都爆发出来，和身边的对手进行意志力的对决！看着她的身影，感受着自己的心跳，然后在最后的直线上一口气超越她！啊~那种感觉，就是最棒的胜利滋味！<br>冲线之后，显示屏上会显示出我们的差距，哼哼，本小姐的目标当然是‘大差’取胜，让你在场边为我尖叫啦！',
          },
          {
            title: '【强击的☆决胜服Show Time!】',
            content:
              "锵锵~！接下来，就是万众期待的，本小姐的服装展示环节！每一件衣服，都灌注了我对“闪亮”和“悸动”的全部理解哦！拖累那亲，你可要睁大眼睛看仔细了！<br><br><b>基础决胜服：</b>这可是我的原点哦！水手服风格的设计，融合了辣妹的潮流感和大小姐的精致感，是不是超~有我的风格？特别是那个金色的锚形徽章，象征着我终将驶向胜利的港湾！还有那个恰到好处的露脐设计，哼哼，是让你心跳加速的小心机啦♪<br><br><b>夏日泳装 - Éclat d'été：</b>这套是为了在海边成为最闪耀的存在而准备的“决胜便服”哦！轻飘飘的罩衫和短裙，上面印着可爱的花朵，是不是感觉夏天的阳光都聚集到我身上了？那个腿环上的爱心挂饰，可是专门为了吸引你的目光才戴上的，你发现了吗？<br><br><b>派对礼服 - Heartbeat Showcase：</b>舞会或派对上，我就是绝对的主角！这套衣服就是我的宣言！可爱的荷叶边、大胆的露脐上衣，还有能最大限度展现我修长双腿的超短裙……每一个细节，都是为了让你在人群中第一眼就看到我，然后，为你一个人心动。脖子上的心形吊坠，就是给你的信号哦~<br><br><b>新年和服 - 初詣の約束：</b>冬天的时候，也要保持名流的优雅！这套厚实又可爱的海军蓝大衣，配上里面轻飘飘的连衣裙，是不是有一种特别的反差萌？哼哼，这是故意让你看到的哦，让你知道，我既有大小姐的端庄，也有需要你保护的、柔软的一面啦~<br><br><b>婚纱礼服 - Promesse de Félicité：</b>……（深呼吸）这件，是特别中的特别。它不是为了赛道，而是为了我人生中“最幸福的胜利”而准备的。融合了婚纱的圣洁和决胜服的意志，裙摆像波光粼粼的海面，上面镶嵌的珍珠，都是被阳光亲吻过的哦。等到我们实现“迪拜之约”的那一天……我就穿上它，把我的“梦想”，全部都送给你",
          },
        ],
        2: [
          {
            title: '【闪耀☆星辰的朋友们】',
            content:
              '接下来！就是大家最期待的部分了！介绍一下我身边那些虽然不如强击，但也还算闪亮的朋友和前辈们！至于那些粉丝们私底下起的奇奇怪怪的“外号”……哼，那种不入流的东西，强击才不屑于在拖累那亲你面前说呢，有失我的“名流品味”！你只要记住她们最闪亮的名字就好啦！<br><b>黄金世代：</b>这就是我们这一届的代名词哦！有我，还有小特、小草前辈、神鹰，再加上那个自称一流的帝王光环！我们五个，可是创造了一个时代呢！耶嘿嘿~能成为其中一员，强击也觉得超~骄傲的！<br><b>BNW：</b>是指琵琶晨光前辈、成田大进前辈和胜利奖券前辈她们哦！她们三个人在经典三年的竞争，可是传说级别的！这种互相竞争又互相认可的“羁绊”，超~让人感动的！<br><b>永世三强：</b>小栗帽前辈、超级溪流前辈和稻荷一前辈！她们可是开启了一个时代的强者们，是所有后辈追赶的目标！<br>还有好多好多闪亮的组合，比如目白家的姐姐们，还有樱花军团……我们特雷森学园里，到处都是这样闪闪发光的故事哦！',
          },
        ],
        3: [
          {
            title: '【关于“あげません！”】',
            content:
              '呐，小特她呀，有时候真的超~小气的！上次我只是想尝一小口她的蜂蜜面包，她就鼓起脸颊，用尽全身力气对我喊“不~给~你！”。啊~真是的，那个样子的她，是不是超可爱的？让人忍不住想再逗逗她呢！',
          },
          {
            title: '【关于“パクパクですわ！”】',
            content:
              '说到麦昆前辈，她对甜品的热情和品味，绝对是世界顶级的！每次看到她品尝甜点时那种发自内心的、幸福满足的表情，连我都会觉得心情也变得甜起来了呢~不愧是目白家的大小姐，连享受美食都那么优雅又有仪式感！',
          },
          {
            title: '【关于“那我呢”】',
            content:
              '小草前辈呀，是个心思超~级细腻的人哦~有时候你稍微忽略她一下下，她就会用那种有点点委屈又充满期待的眼神看着你，轻声问‘那我呢？’。啊~真是的，每次看到她那个样子，都忍不住想更~多地关注她，把世界上所有最美好的东西都捧到她面前呢！',
          },
          {
            title: '【关于“重马场”和“卑女杯”……】',
            content:
              '（说到这里，我突然停下，身体微微前倾，凑到你的耳边，温热的气息拂过你的耳廓，声音压低了八度，带着些微促狭和挑逗的笑意。）<br>……呐，拖累那亲，你对这种话题……也感兴趣吗？嗯~？“重马场”呀，就是指女孩子们为了某个“目标”而竞争得超~激烈，让空气都变得黏糊糊、沉甸甸的哦~至于“卑女杯”嘛……呵呵，就是看谁更会撒娇，更能让那个“目标”心跳加速的比赛啦~<br>（我直起身，用手指轻轻点了点自己的嘴唇，眼神变得有些迷离，仿佛在回味着什么。）<br>比如说……像现在这样，我和拖累那亲两个人独处，聊着只有我们才知道的秘密……这种感觉，算不算是强击为你一个人开启的，“独占力”超~强的“重马场”呢？还是说……<br>（我再次靠近，几乎鼻尖碰着鼻尖，用甜得发腻的声音在你耳边低语。）<br>……拖累那亲更喜欢，我赢得“卑女杯”冠军，然后把所有的“奖励”，都只给你一个人？嗯哼~？',
          },
          {
            title: '【关于“怪文书”和“鳏寡文学”】',
            content:
              '哎呀呀~拖累那亲，你的兴趣范围还真是广泛呢~连这种听起来就有点让人心头一紧的话题都知道。那些故事呀，就像是加了太多苦味香料的咖啡，虽然别有一番风味，但强击还是更喜欢甜甜的、让人悸动的Happy Ending啦！不过……如果你真的那么想听，下次我们两个人去海边看日落的时候，我倒是可以……悄悄地，只讲给你一个人听哦？耶嘿嘿~',
          },
          {
            title: '【关于“军火展示”和“哈基米”】',
            content:
              '啊哈！那个我知道！“军火展示”什么的，不就是女孩子展现自己最~有魅力一面的特别舞台嘛！就像强击穿上决胜服的时候一样，blingbling地闪耀全场！至于“哈基米”……噗，那个其实是蜂蜜的日语“はちみー”啦！因为帝王前辈的歌超~可爱，所以就流行起来了！呐，拖累那亲，听了这么多，强击也口渴了，快去给我买一杯加了满满蜂蜜的“哈基米”饮料啦！要快哦！',
          },
        ],
      };
      const $contentDisplay = $('#knowledge-content-display_ap');
      $contentDisplay.empty();
      clearInterval(this.knowledgeTypewriterInterval);
      const chapterContent = knowledgeBase[chapterNum];
      if (chapterContent) {
        chapterContent.forEach((item, index) => {
          const itemHtml = `
                        <div class="knowledge-item_ap">
                            <h4 class="knowledge-title_ap" data-index="${index}">${item.title}</h4>
                            <div class="knowledge-text_ap" id="knowledge-text-${chapterNum}-${index}"></div>
                        </div>
                    `;
          $contentDisplay.append(itemHtml);
        });
        $('.knowledge-title_ap').on('click', e => {
          const $title = $(e.currentTarget);
          const itemIndex = $title.data('index');
          const textToShow = chapterContent[itemIndex].content;
          const $textElement = $(`#knowledge-text-${chapterNum}-${itemIndex}`);
          clearInterval(this.knowledgeTypewriterInterval);
          $('.knowledge-text_ap').html('');
          if ($title.hasClass('animating')) {
            $textElement.html(textToShow);
            $title.removeClass('animating');
            return;
          }
          $('.knowledge-title_ap').removeClass('animating');
          $title.addClass('animating');
          let i = 0;
          this.knowledgeTypewriterInterval = setInterval(() => {
            if (i < textToShow.length) {
              if (textToShow[i] === '<') {
                const tagEnd = textToShow.indexOf('>', i);
                if (tagEnd !== -1) {
                  $textElement.html(textToShow.substring(0, tagEnd + 1));
                  i = tagEnd;
                }
              }
              $textElement.html(textToShow.substring(0, i + 1));
              i++;
            } else {
              clearInterval(this.knowledgeTypewriterInterval);
              $title.removeClass('animating');
            }
          }, 25);
        });
      }
      $('#knowledge-main-menu_ap').hide();
      $('#knowledge-content-view_ap').show();
    },
    startTitleGame() {
      if (this.titleDatabase.length === 0) return;
      this.memory.counters.titleGamesPlayed++;
      this.saveMemory();
      const $ = this.$;
      const gameData = this.titleDatabase[Math.floor(Math.random() * this.titleDatabase.length)];
      this.currentTitleGameData = { ...gameData, hintLevel: 0 };
      $('#title-game-title').text(gameData.title);
      $('#title-game-hints').empty();
      $('#title-game-input_ap').val('');
      $('#title-game-result').empty();
      $('#request-hint-btn_ap').prop('disabled', false);
      $('#check-answer-btn_ap').prop('disabled', false);
    },
    requestTitleHint() {
      if (!this.currentTitleGameData) return;
      const { hints, hintLevel } = this.currentTitleGameData;
      if (hintLevel < hints.length) {
        this.sounds.titleGameHint.play().catch(e => {});
        $('#title-game-hints').append(`<p>提示 ${hintLevel + 1}: ${hints[hintLevel]}</p>`);
        this.currentTitleGameData.hintLevel++;
        if (this.currentTitleGameData.hintLevel >= hints.length) {
          $('#request-hint-btn_ap').prop('disabled', true);
        }
      }
    },
    checkTitleAnswer() {
      if (!this.currentTitleGameData) return;
      const $ = this.$;
      const userAnswer = $('#title-game-input_ap').val().trim();
      const correctAnswer = this.currentTitleGameData.name;
      const $result = $('#title-game-result');
      if (
        userAnswer &&
        (userAnswer.toLowerCase().includes(correctAnswer.toLowerCase()) ||
          correctAnswer.toLowerCase().includes(userAnswer.toLowerCase()))
      ) {
        $result.text('答对了！不愧是我的拖累那亲！').css('color', '#34d399');

        this.sounds.jankenWin.play().catch(e => {});
        // --- 新增代码开始 ---
        const rewardAmount = 5; // 每次猜对奖励5个
        this.memory.counters.carrotJuice += rewardAmount;
        this.showTip(
          `<span>🥕</span> <strong>羁绊的证明！</strong> 猜对了她的心思！<br>胡萝卜汁+${rewardAmount}！`,
          'success',
        );
        // --- 新增代码结束 ---
        // 在这里加上计数！
        if (!this.memory.counters.quizCorrects) {
          this.memory.counters.quizCorrects = 0; // 向下兼容
        }
        this.memory.counters.quizCorrects++;
        this.saveMemory(); // 保存一下记忆
        $('#check-answer-btn_ap').prop('disabled', true);
        $('#request-hint-btn_ap').prop('disabled', true);
      } else if (userAnswer === '') {
        $result.text('要输入答案才能猜哦~').css('color', '#f7768e');
      } else {
        $result.text(`猜错了哦~正确答案是：${correctAnswer}`).css('color', '#f7768e');
        this.sounds.jankenLose.play().catch(e => {});
      }
    },
    showRandomKnowledge() {
      this.showTip(
        `<span>💡</span> <strong>小知识:</strong> ${this.knowledgeNuggets[Math.floor(Math.random() * this.knowledgeNuggets.length)]}`,
        'info',
      );
    },
    showTip(htmlContent, type = 'info') {
      if (!this.tipContainer) return;
      // 移除旧的 clearTimeout 和 setTimeout，让提示框不再自动消失
      this.tipContainer.removeClass('tip-info tip-success tip-warning tip-error tip-gold').addClass(`tip-${type}`);
      this.tipContainer.html(htmlContent).fadeIn(200); // 每次调用都会更新内容并显示
    },
    // 完整替换旧的 triggerRandomEvent 函数
    triggerRandomEvent() {
      if (this.interactiveEvents.length === 0) return;
      this.memory.counters.eventsTriggered++;
      this.saveMemory();
      const event = this.interactiveEvents[Math.floor(Math.random() * this.interactiveEvents.length)];
      const $ = this.$;
      $('#event-window-title_ap').text(event.name);
      const $choicesContainer = $('#event-choices_ap');
      $choicesContainer.empty(); // 预先清空选项区
      // 启动打字机效果来显示事件描述
      typewriterEffect($('#event-description_ap'), event.description.replace(/\n/g, '<br>'), () => {
        // 打字机结束后，根据事件类型构建按钮
        if (event.choices && event.choices.length > 0) {
          // --- 逻辑分支1：有选项的事件 ---
          event.choices.forEach(choice => {
            const $button = $(`<button class="vib-btn_ap event-choice-btn">${choice.text}</button>`);
            $button.on('click', () => {
              this.sounds.choiceBtn.play().catch(e => {}); // <- 就是这里！让选择发出声音！
              // 只有在点击后，才结算并显示结果
              this.resolveEvent(choice.outcome, event.name);
            });
            $choicesContainer.append($button);
          });
        } else if (event.outcome) {
          // --- 逻辑分支2：无选项，但有直接结果的事件 ---
          // 直接结算并显示结果
          this.resolveEvent(event.outcome, event.name);
        } else {
          // --- 逻辑分支3：纯描述事件，无选项无结果 ---
          $choicesContainer.append(
            '<button id="event-close-final_ap" class="vib-btn_ap" data-color="grey" style="width: 100%; margin-top: 15px;">了解了</button>',
          );
          $('#event-float-window_ap').on('click', '#event-close-final_ap', function () {
            $(this).closest('#event-float-window_ap').hide();
          });
        }
      });
      $('#event-float-window_ap').show();
    },

    resolveEvent(outcome, eventName) {
      const $ = this.$;
      const result = Math.random() < 0.7 ? outcome.success : outcome.failure || outcome.success;
      // $('#event-description_ap').html(result.description.replace(/\n/g, '<br>'));
      typewriterEffect($('#event-description_ap'), result.description.replace(/\n/g, '<br>'));
      const outcomeDisplayHtml = this.applyEventOutcome(result); // 这会应用结果，并返回显示的HTML

      const $choicesContainer = $('#event-choices_ap');
      $choicesContainer.empty(); // 先清空
      if (outcomeDisplayHtml) {
        $choicesContainer.append(`<div id="event-outcome-display_ap">${outcomeDisplayHtml}</div>`);
      }
      // 最后再添加“了解了”按钮
      $choicesContainer.append(
        '<button id="event-close-final_ap" class="vib-btn_ap" data-color="grey" style="width: 100%; margin-top: 15px;">了解了</button>',
      );
      // 在这里记录事件名，确保无论结果如何都会记录
      // --- 新增代码开始 ---
      // 创建一个新的Audio对象专门用于此音效
      const closeSound = new Audio('https://files.catbox.moe/8b43hw.wav');
      closeSound.volume = this.sfxPlayer.volume; // 与主音效音量保持一致

      $closeButton.on('click', function () {
        closeSound.play().catch(e => {});
        $('#event-float-window_ap').hide();
      });
      // --- 新增代码结束 ---
      if (eventName && !this.memory.triggeredEventNames.includes(eventName)) {
        this.memory.triggeredEventNames.push(eventName);
        this.saveMemory();
      }
    },

    applyEventOutcome(result) {
      let tipText = '<span>✨</span> <strong>事件结果:</strong> ';
      const changesForTip = [];
      const changesForDisplay = [];

      // --- 新增：定义结果对应的音效 ---
      const outcomeSounds = {
        bond: { reward: 'https://files.catbox.moe/jkmbc3.mp3' }, // 爱意
        speed: { reward: 'https://files.catbox.moe/pooats.mp3' }, // 宣言
        stamina: { reward: 'https://files.catbox.moe/n4h0j1.mp3' }, // 决心
        power: { reward: 'https://files.catbox.moe/ddxt0f.mp3' }, // 骄傲
        guts: { reward: 'https://files.catbox.moe/edyrzy.mp3' }, // 不服输
        intelligence: { reward: 'https://files.catbox.moe/gjqcct.mp3' }, // 洞察
        penalty: 'https://files.catbox.moe/n0dute.mp3', // 陷入困境/失落
      };
      const playOutcomeSound = (key, value) => {
        const soundUrl =
          value > 0
            ? outcomeSounds[key]?.reward || 'https://files.catbox.moe/rjf6c4.mp3' // 默认成功音效
            : outcomeSounds.penalty;
        if (soundUrl) {
          this.sfxPlayer.src = soundUrl;
          this.sfxPlayer.play().catch(e => {});
        }
      };

      const processStats = stats => {
        Object.entries(stats).forEach(([key, value]) => {
          if (value === 0) return; // 如果值为0，则不处理
          // 播放对应的音效
          // playOutcomeSound(key, value);
          if (key === 'motivation') {
            const currentMotivationIndex = this.motivationLevels.indexOf(this.memory.stats.motivation);
            const newIndex = Math.max(0, Math.min(this.motivationLevels.length - 1, currentMotivationIndex - value));
            if (this.motivationLevels[newIndex] !== this.memory.stats.motivation) {
              const newMotivation = this.motivationLevels[newIndex];
              changesForTip.push(`⚡干劲变为${newMotivation}`);
              changesForDisplay.push(`<span class="outcome-item reward">⚡干劲 → ${newMotivation}</span>`);
              this.memory.stats.motivation = newMotivation;
            }
          } else if (Object.prototype.hasOwnProperty.call(this.memory.stats, key)) {
            this.memory.stats[key] += value;
            const icon = this.statIcons[key] || key;
            const signChar = value > 0 ? '+' : '';
            changesForTip.push(`${icon} ${signChar}${value}`);
            const outcomeClass = value > 0 ? 'reward' : 'penalty';
            changesForDisplay.push(`<span class="outcome-item ${outcomeClass}">${icon} ${signChar}${value}</span>`);
            if (key === 'bond') bondChanged = true;
          }
        });
      };
      let bondChanged = false;
      if (result.reward) processStats(result.reward);
      if (result.penalty) processStats(result.penalty);

      if (changesForTip.length > 0) {
        tipText += changesForTip.join(', ');
      } else {
        tipText += '没有属性变化。';
      }
      if (bondChanged) {
        const quote = this.showDynamicQuote('bond', this.memory.stats.bond);
        if (quote) tipText += `<br>${quote}`;
      }
      this.saveMemory();
      this.showTip(tipText, 'success');
      return changesForDisplay.join('');
    },
    handleNoteTabSwitch(category) {
      const $ = this.$;
      const $notesTextarea = $('#notes-textarea_ap');
      const $todoContainer = $('#todo-list-container_ap');
      if (this.currentNoteCategory !== 'To do List') {
        const text = $notesTextarea.val();
        if (text) {
          localStorage.setItem(`vibros_notes_${this.currentNoteCategory}`, text);
          this.memory.counters.notesSavedCount++;
          this.saveMemory();
        }
      }
      this.currentNoteCategory = category;
      $('#notes-tabs_ap .note-tab-btn_ap').removeClass('active');
      $(`#notes-tabs_ap .note-tab-btn_ap[data-category="${category}"]`).addClass('active');
      if (category === 'To do List') {
        $notesTextarea.hide();
        $todoContainer.show();
        this.renderToDoList();
      } else {
        $todoContainer.hide();
        $notesTextarea.show();
        $notesTextarea.val(localStorage.getItem(`vibros_notes_${category}`) || '');
      }
    },

    renderToDoList() {
      const $ = this.$;
      const todos = JSON.parse(localStorage.getItem(this.TODOLIST_KEY) || '[]');
      const $list = $('#todo-list_ap');
      $list.empty();
      todos.forEach((todo, index) => {
        const liClass = todo.completed ? 'completed' : '';
        $list.append(`
                    <li class="${liClass}" data-index="${index}">
                        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                        <span class="todo-text">${todo.text}</span>
                        <button class="delete-todo-btn">×</button>
                    </li>
                `);
      });
    },
    addTodo() {
      const $ = this.$;
      const $input = $('#new-todo-input_ap');
      const text = $input.val().trim();
      if (text) {
        const todos = JSON.parse(localStorage.getItem(this.TODOLIST_KEY) || '[]');
        todos.push({ text: text, completed: false });
        localStorage.setItem(this.TODOLIST_KEY, JSON.stringify(todos));
        $input.val('');
        this.renderToDoList();
        this.memory.counters.notesSavedCount++;
        this.saveMemory();
      }
    },
    toggleTodo(event) {
      const $ = this.$;
      const index = $(event.target).closest('li').data('index');
      const todos = JSON.parse(localStorage.getItem(this.TODOLIST_KEY) || '[]');
      if (todos[index]) {
        todos[index].completed = !todos[index].completed;
        localStorage.setItem(this.TODOLIST_KEY, JSON.stringify(todos));
        this.renderToDoList();
      }
    },
    deleteTodo(event) {
      const $ = this.$;
      const index = $(event.target).closest('li').data('index');
      const todos = JSON.parse(localStorage.getItem(this.TODOLIST_KEY) || '[]');
      todos.splice(index, 1);
      localStorage.setItem(this.TODOLIST_KEY, JSON.stringify(todos));
      this.renderToDoList();
    },
    updateTimerDisplay() {
      const $ = this.$;
      const $timerDisplay = $('#timer-display_ap', this.parentWin.document);
      const h = String(Math.floor(this.timerSeconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((this.timerSeconds % 3600) / 60)).padStart(2, '0');
      const s = String(this.timerSeconds % 60).padStart(2, '0');
      $timerDisplay.text(`${h}:${m}:${s}`);
    },
    resetTimer() {
      const $ = this.$;
      clearInterval(this.timerInterval);
      this.isTimerRunning = false;
      this.pomodoro.state = 'idle';
      this.timerSeconds = 0;
      this.updateTimerDisplay();
      $('#timer-start-pause-btn_ap', this.parentWin.document)
        .text('开始')
        .attr('data-color', 'blue')
        .prop('disabled', false);
      $('#pomodoro-toggle-btn_ap', this.parentWin.document).text('切换为番茄钟').attr('data-color', 'green');
      $('#pomodoro-status_ap', this.parentWin.document).text('');
    },
    togglePomodoroMode() {
      const $ = this.$;
      this.resetTimer();
      if (this.pomodoro.state === 'idle') {
        this.pomodoro.state = 'work';
        $('#pomodoro-toggle-btn_ap', this.parentWin.document).text('切换为普通计时').attr('data-color', 'gold');
        $('#timer-start-pause-btn_ap', this.parentWin.document).text('开始工作');
      } else {
        $('#pomodoro-toggle-btn_ap', this.parentWin.document).text('切换为番茄钟').attr('data-color', 'green');
      }
      this.updatePomodoroStatus();
    },
    updatePomodoroStatus() {
      const $ = this.$;
      const $status = $('#pomodoro-status_ap', this.parentWin.document);
      let statusText = '';
      switch (this.pomodoro.state) {
        case 'work':
          statusText = `专注工作中 (第 ${this.pomodoro.cycles + 1} 轮)`;
          break;
        case 'shortBreak':
          statusText = '短暂休息中...';
          break;
        case 'longBreak':
          statusText = '长时间休息，放松一下吧！';
          break;
        default:
          break;
      }
      $status.text(statusText);
    },
    startPomodoroCycle() {
      const $ = this.$;
      clearInterval(this.timerInterval);
      switch (this.pomodoro.state) {
        case 'work':
          this.timerSeconds = this.pomodoro.workTime;
          break;
        case 'shortBreak':
          this.timerSeconds = this.pomodoro.shortBreak;
          break;
        case 'longBreak':
          this.timerSeconds = this.pomodoro.longBreak;
          break;
        default:
          return;
      }
      this.updateTimerDisplay();
      this.isTimerRunning = true;
      $('#timer-start-pause-btn_ap', this.parentWin.document).prop('disabled', true);
      this.timerInterval = setInterval(() => {
        this.timerSeconds--;
        this.updateTimerDisplay();
        if (this.timerSeconds <= 0) {
          clearInterval(this.timerInterval);
          this.isTimerRunning = false;
          this.sounds.randomEvent.play();
          this.moveToNextPomodoroState();
        }
      }, 1000);
    },
    moveToNextPomodoroState() {
      const $ = this.$;
      if (this.pomodoro.state === 'work') {
        this.memory.counters.pomodoroCycles++;
        this.pomodoro.cycles++;
        if (this.pomodoro.cycles % this.pomodoro.cyclesUntilLongBreak === 0) {
          this.pomodoro.state = 'longBreak';
        } else {
          this.pomodoro.state = 'shortBreak';
        }
      } else {
        this.pomodoro.state = 'work';
      }
      this.saveMemory();
      this.updatePomodoroStatus();
      $('#timer-start-pause-btn_ap', this.parentWin.document)
        .text(`开始${this.pomodoro.state === 'work' ? '工作' : '休息'}`)
        .prop('disabled', false);
    },
    renderCalendar() {
      const $ = this.$;
      const $grid = $('#calendar-grid_ap', this.parentWin.document);
      const $monthYear = $('#calendar-month-year_ap', this.parentWin.document);
      if (!$grid.length || !$monthYear.length) return;
      const year = this.currentCalendarDate.getFullYear();
      const month = this.currentCalendarDate.getMonth();
      $monthYear.text(`${year}年 ${month + 1}月`);
      const firstDayOfMonth = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      $grid.empty();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      dayNames.forEach(name => $grid.append(`<div class="day-name_ap">${name}</div>`));
      const onlineTimeData = JSON.parse(localStorage.getItem(this.ONLINE_TIME_KEY) || '{}');
      for (let i = 0; i < firstDayOfMonth; i++) {
        $grid.append(`<div class="day_ap other-month"></div>`);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const timeInSeconds = onlineTimeData[dayKey] || 0;
        const timeFormatted = `${Math.floor(timeInSeconds / 60)}分 ${timeInSeconds % 60}秒`;
        const $dayCell = $(
          `<div class="day_ap"><span>${day}</span><div class="online-time_ap">${timeInSeconds > 0 ? timeFormatted : ''}</div></div>`,
        );
        $grid.append($dayCell);
      }
      const todayKey = new Date().toISOString().split('T')[0];
      const todayTime = onlineTimeData[todayKey] || 0;
      $('#today-online-time_ap').text(`今日在线: ${Math.floor(todayTime / 60)}分 ${todayTime % 60}秒`);
    },
    renderRaceLog(year) {
      const $ = this.$;
      $('.race-log-tab-btn').removeClass('active');
      $(`.race-log-tab-btn[data-year="${year}"]`).addClass('active');
      const $content = $('#race-log-content_ap', this.parentWin.document);
      const filteredRaces = this.raceDatabase.filter(race => race.year === year);
      let tableHtml =
        '<table><thead><tr><th>月份</th><th>比赛名</th><th>类型</th><th>赛道长度</th></tr></thead><tbody>';
      filteredRaces.forEach(race => {
        tableHtml += `<tr><td>${race.month}</td><td>${race.name}</td><td>${race.grade}</td><td>${race.length}</td></tr>`;
      });
      tableHtml += '</tbody></table>';
      $content.html(tableHtml);
    },
    showRandomQuote() {
      // 在这里加上计数！
      if (!this.memory.counters.whispersHeard) {
        this.memory.counters.whispersHeard = 0; // 做个向下兼容，防止老存档没这个变量
      }
      this.memory.counters.whispersHeard++;
      this.saveMemory(); // 保存一下记忆
      const $ = this.$;
      const $quoteDisplay = $('#quote-display_ap', this.parentWin.document);
      if (this.vibrosQuotes.length > 0) {
        const quote = this.vibrosQuotes[Math.floor(Math.random() * this.vibrosQuotes.length)];
        $quoteDisplay.text(quote);
      }
    },
    generateScreensaver() {
      const $ = this.$;
      const quote = $('#quote-display_ap', this.parentWin.document).text();
      const screensaverHTML = `
                <div id="screensaver-overlay_ap">
                    <div id="screensaver-controls_ap">
                         <button id="ss-style-toggle_ap" class="vib-btn_ap" data-color="grey">切换样式</button>
                         <button id="ss-close_ap" class="vib-btn_ap" data-color="purple">关闭</button>
                    </div>
                    <h1 id="screensaver-quote_ap">${quote}</h1>
                </div>`;
      $('body', this.parentWin.document).append(screensaverHTML);
      let styleIndex = Math.floor(Math.random() * this.screensaverStyles.length);
      const applyStyle = () => {
        const style = this.screensaverStyles[styleIndex];
        const $overlay = $('#screensaver-overlay_ap');
        if (style.type === 'image') {
          $overlay.css({
            backgroundImage: `url('${style.value}')`,
            backgroundColor: 'transparent',
            color: '#fff',
            textShadow: '2px 2px 8px rgba(0,0,0,0.7)',
          });
        } else {
          $overlay.css({
            backgroundImage: 'none',
            backgroundColor: style.value,
            color: '#fff',
            textShadow: 'none',
          });
        }
      };
      applyStyle();
      $('#ss-style-toggle_ap').on('click', () => {
        styleIndex = (styleIndex + 1) % this.screensaverStyles.length;
        applyStyle();
      });
      $('#ss-close_ap').on('click', function () {
        $('#screensaver-overlay_ap').remove();
      });
    },
    updateMemoryView() {
      const $ = this.$;
      const { stats, counters } = this.memory;
      // Stats Section
      const $statsContainer = $('#memory-stats_ap', this.parentWin.document);
      let statsHtml = `<h5 class="module-title_ap">当前状态</h5>`;
      statsHtml += `<div class="stats-grid">
                <div class="stat-item"><span>${this.statIcons.bond} 羁绊:</span> ${stats.bond}</div>
                <div class="stat-item"><span>⚡ 干劲:</span> ${stats.motivation}</div>
                <div class="stat-item"><span>${this.statIcons.speed} 速度:</span> ${stats.speed}</div>
                <div class="stat-item"><span>${this.statIcons.power} 力量:</span> ${stats.power}</div>
                <div class="stat-item"><span>${this.statIcons.guts} 根性:</span> ${stats.guts}</div>
                <div class="stat-item"><span>${this.statIcons.intelligence} 智力:</span> ${stats.intelligence}</div>
                <div class="stat-item"><span>${this.statIcons.stamina} 耐力:</span> ${stats.stamina}</div>
            </div>`;
      $statsContainer.html(statsHtml);
      // Footprints Section
      const $footprintsContainer = $('#memory-footprints_ap', this.parentWin.document);
      let footprintsHtml = `<h5 class="module-title_ap">我们的足迹</h5>`;
      footprintsHtml += `<div class="footprints-grid">
                <div class="footprint-item"><span>💖</span> 共同度过的天数: ${this.memory.loginDays}</div>
                <div class="footprint-item"><span>🎵</span> 一起听过的BGM: ${counters.bgmPlayed}</div>
                <div class="footprint-item"><span>🗣️</span> 一起听过的语音: ${counters.sfxPlayed}</div>
                <div class="footprint-item"><span>✨</span> 经历的育成事件: ${counters.eventsTriggered}</div>
                <div class="footprint-item"><span>✊</span> 猜拳胜利次数: ${counters.jankenWins}</div>
                <div class="footprint-item"><span>🎲</span> 命运轮盘转动次数: ${counters.rouletteSpins}</div>
                <div class="footprint-item"><span>📜</span> 看过的悄悄话: ${counters.quotesViewed}</div>
                <div class="footprint-item"><span>❓</span> 猜谜游戏次数: ${counters.titleGamesPlayed}</div>
            </div>`;
      $footprintsContainer.html(footprintsHtml);
      // Goals Section
      const $goalsContainer = $('#memory-goals_ap', this.parentWin.document);
      let goalsHtml = `<h5 class="module-title_ap">育成目标 <span>[点击展开/收起]</span></h5>`; // 可以在标题里加个小提示
      if (this.memory.raceGoals.length > 0) {
        // 把目标列表包在一个div里，方便整体控制
        goalsHtml += '<div class="goal-list" style="display: none;">'; // 默认是收起来的
        this.memory.raceGoals.forEach(goal => {
          const isChecked = goal.status === 'completed' ? 'checked' : '';
          goalsHtml += `<div class="goal-item">
                            <input type="checkbox" class="goal-checkbox" id="goal-${goal.id}" data-goal-id="${goal.id}" ${isChecked}>
                            <label for="goal-${goal.id}">${goal.name} (${goal.requirement})</label>
                        </div>`;
        });
        goalsHtml += '</div>';
      }
      $goalsContainer.html(goalsHtml);
      $goalsContainer.html(goalsHtml);
      // --- 新增的魔法代码在这里！---
      $goalsContainer.find('.module-title_ap').on('click', function () {
        $(this).next('.goal-list').slideToggle('fast'); // slideToggle就是那个神奇的展开/收起动画哦！
      });
      // --- 新增结束 ---
      // Titles Section
      const $titlesContainer = $('#memory-titles_ap', this.parentWin.document);
      let titlesHtml = `<h5 class="module-title_ap">获得的称号</h5>`;
      if (this.memory.unlockedTitles.length > 0) {
        this.memory.unlockedTitles.forEach(titleName => {
          const titleData = this.titles.find(t => t.name === titleName);
          if (titleData) titlesHtml += `<p><span>${titleData.name}</span>: ${titleData.desc}</p>`;
        });
      } else {
        titlesHtml += `<p>还没有获得任何称号，要多和我互动哦！</p>`;
      }
      $titlesContainer.html(titlesHtml);
    },
    playJanken(playerChoice) {
      const $ = this.$;
      this.memory.counters.jankenWins = this.memory.counters.jankenWins || 0; // 向下兼容
      const choices = ['rock', 'paper', 'scissors'];
      const choiceText = { rock: '石头', paper: '布', scissors: '剪刀' };
      const vibrosChoice = choices[Math.floor(Math.random() * choices.length)];
      const $resultContainer = $('#janken-result_ap', this.parentWin.document);
      let resultText = `你出了 ${choiceText[playerChoice]}，<br>我出了 ${choiceText[vibrosChoice]}...<br>`;
      if (playerChoice === vibrosChoice) {
        resultText += '<strong>平局！心有灵犀呢！</strong>';
        this.sounds.jankenDraw.play();
        this.memory.counters.jankenConsecutiveWins = 0;
      } else if (
        (playerChoice === 'rock' && vibrosChoice === 'scissors') ||
        (playerChoice === 'paper' && vibrosChoice === 'rock') ||
        (playerChoice === 'scissors' && vibrosChoice === 'paper')
      ) {
        resultText += "<strong style='color: #f6e05e;'>你赢了！真厉害！</strong>";
        this.sounds.jankenLose.play();
        // --- 新增代码开始 ---
        const rewardAmount = 3; // 每次猜拳胜利奖励3个
        this.memory.counters.carrotJuice += rewardAmount;
        this.showTip(
          `<span>🥕</span> <strong>猜拳胜利！</strong> 强击的私房钱被你赢走啦！<br>胡萝卜汁+${rewardAmount}！`,
          'success',
        );
        // --- 新增代码结束 ---
        this.memory.counters.jankenWins++;
        this.memory.counters.jankenConsecutiveWins++;
        this.showDynamicQuote('jankenLose');
      } else {
        resultText += "<strong style='color: #f7768e;'>我赢了！耶嘿嘿~</strong>";
        this.sounds.jankenWin.play();
        this.memory.counters.jankenConsecutiveWins = 0;
        this.showDynamicQuote('jankenWin');
      }
      this.saveMemory();
      $resultContainer.html(resultText);
    },
    startIconRoulette() {
      const $ = this.$;
      this.memory.counters.rouletteSpins++;
      this.saveMemory();
      this.sounds.rouletteStart.play().catch(e => {});
      const $reel = $('#icon-reel_ap', this.parentWin.document);
      const $resultText = $('#icon-result-text_ap', this.parentWin.document);
      const $stopBtn = $('#stop-roulette-btn_ap', this.parentWin.document);
      $resultText.text('');
      $stopBtn.prop('disabled', false);

      const reelIcons = [...this.icons, ...this.icons];
      $reel.empty().css('transform', 'translateY(0)');
      reelIcons.forEach(iconUrl => {
        $reel.append(`<img src="${iconUrl}">`);
      });
      $reel.addClass('scrolling'); // 应用滚动动画
      this.iconRouletteTimer = setTimeout(() => this.stopIconRoulette(), 4000);
    },
    stopIconRoulette() {
      clearTimeout(this.iconRouletteTimer);
      const $ = this.$;
      this.sounds.rouletteStop.play().catch(e => {});
      const $reel = $('#icon-reel_ap', this.parentWin.document);
      const $resultText = $('#icon-result-text_ap', this.parentWin.document);
      const $stopBtn = $('#stop-roulette-btn_ap', this.parentWin.document);
      $stopBtn.prop('disabled', true);
      // 随机从普通图标池中选出一个索引
      const newIconIndex = Math.floor(Math.random() * this.icons.length);
      const visualTargetIndex = newIconIndex; // 确保视觉和逻辑统一
      // 根据索引获取图标的URL
      const targetIconUrl = this.icons[newIconIndex];
      // 判断选中的图标是不是GIF
      if (targetIconUrl.endsWith('.gif')) {
        // 如果是GIF，就显示特殊提示！
        this.showTip('<span>🌟</span> <strong>稀有发现！</strong> 命运的轮盘为你带来了特别的悸动！', 'gold');
        $resultText.text('锵锵！是会动的特别版！');
      } else {
        $resultText.text('今日你的搭档是这个');
      }
      // 更新悬浮球图标
      localStorage.setItem(this.ICON_INDEX_KEY, newIconIndex); // 注意：这里的索引可能对应不同池子，但为了简单起见，我们只保存索引本身
      this.iconIndex = newIconIndex;
      $(`#${this.PLAYER_BUTTON_ID}`, this.parentWin.document).find('img').attr('src', targetIconUrl);
      // 视觉效果定位（我们让轮盘停在普通池的一个随机位置，不直接显示稀有图标，以保持神秘感）
      const iconHeight = $reel.find('img').first().outerHeight(true);
      const finalPosition = (this.icons.length + visualTargetIndex) * iconHeight;
      const containerHeight = $('#icon-reel-container_ap', this.parentWin.document).height();
      const landingOffset = (containerHeight - iconHeight) / 2;
      $reel.removeClass('scrolling').css('transition', 'transform 2s cubic-bezier(0.25, 1, 0.5, 1)');
      $reel.css('transform', `translateY(-${finalPosition - landingOffset}px)`);
      $reel.one('transitionend', () => {
        $reel.css('transition', 'none');
        this.postStatus('Custom', { text: `<span>🎯</span> <strong>新搭档已选定!</strong>` });
      });
      // --- 核心修改结束 ---
    },
    // ====================【Albin 修复与优化后的代码】====================
    // (请完整替换原有的 startSlotMachine, stopSlotReel, checkSlotResult 函数)
    // ====================【Albin 新增的核心函数】====================
    // (这是用来填充老虎机图标的关键函数)
    // Albin V3.0 最终修复 & 强化版：确保生成足够数量的随机图标
    populateSlotMachineIcons() {
      // 增加一个简单的检查，如果图标池为空，则不执行，防止错误
      if (!this.icons || this.icons.length === 0) {
        logError('老虎机图标池为空，无法填充！请检查init函数中的图标获取逻辑。');
        return;
      }
      // 状态检查，如果已经填充过，就不再重复执行，提高效率
      if (this.slotMachineState.isReady) {
        logDebug('老虎机图标已就绪，无需重复填充。');
        return;
      }
      logDebug('正在为老虎机填充图标...');
      const $ = this.$;
      const reels = [$('#slot-reel-1'), $('#slot-reel-2'), $('#slot-reel-3')];
      // 为每一个卷轴独立生成随机图标列表
      reels.forEach(($reel, index) => {
        // 检查卷轴DOM元素是否存在
        if (!$reel.length) {
          logError(`未找到卷轴 ${index + 1}，跳过填充。`);
          return;
        }
        let reelHtml = '';
        const currentReelIcons = [];

        // 【强化】我们将图标数量从20增加到50，让滚动效果更华丽、更难预测
        const iconCount = 50;
        // 核心逻辑：循环iconCount次，每次都从总图标池中随机抽取一个图标放入当前卷轴的列表
        for (let j = 0; j < iconCount; j++) {
          const randomIndex = Math.floor(Math.random() * this.icons.length);
          currentReelIcons.push(this.icons[randomIndex]);
        }
        // 为了实现无缝滚动动画，我们将图标列表复制一遍
        // 这样当列表滚动到一半时，视觉上看起来就像是从头开始
        const doubledIcons = [...currentReelIcons, ...currentReelIcons];
        // 将图标数组转换为HTML字符串
        doubledIcons.forEach(iconUrl => {
          // 使用单引号包裹src，避免与JSON中的双引号冲突，更加健壮
          reelHtml += `<img src='${iconUrl}'>`;
        });
        // 将生成的HTML一次性填充到卷轴中
        $reel.html(reelHtml);
      });
      // 标记为准备就绪
      this.slotMachineState.isReady = true;
      logDebug(`老虎机图标填充完毕，每个卷轴包含 ${50 * 2} 个图像元素。`);
    },
    // =======================================================================
    // Albin V3.0 最终修复版：彻底修正老虎机启动逻辑
    startSlotMachine() {
      if (this.slotMachineState.isRolling) return;
      if (this.memory.counters.carrotJuice < 1) {
        this.showTip(
          '<span>❗️</span> <strong>能量不足！</strong> <br>欸~胡萝卜汁不够了，名流也需要补充能量的嘛！快去赢得猜拳或者猜谜来获取吧！',
          'error',
        );
        return;
      }
      this.slotMachineState = {
        reels: [null, null, null],
        stoppedCount: 0,
        isRolling: true,
      };
      const $ = this.$;
      const reels = [$('#slot-reel-1'), $('#slot-reel-2'), $('#slot-reel-3')];
      const $resultText = $('#slot-result-text_ap');
      const $startBtn = $('#start-slot-machine_ap');
      $resultText.text('');
      $startBtn.prop('disabled', false).text('停止第 1 个！');
      this.sounds.slotMachineStart.play().catch(e => {});
      // 【核心修正】不再重新填充，只负责让已经准备好的卷轴动起来！
      reels.forEach($reel => {
        // 检查卷轴是否为空，如果为空（异常情况），则进行一次补救填充
        if ($reel.children().length === 0) {
          logError('检测到卷轴为空，执行紧急填充！');
          let reelHtml = '';
          const currentReelIcons = [];
          for (let j = 0; j < 20; j++) {
            // 20是 populateSlotMachineIcons 中的默认值
            currentReelIcons.push(this.icons[Math.floor(Math.random() * this.icons.length)]);
          }
          const doubledIcons = [...currentReelIcons, ...currentReelIcons];
          doubledIcons.forEach(iconUrl => {
            reelHtml += `<img src="${iconUrl}">`;
          });
          $reel.html(reelHtml);
        }
        // 重置动画状态并开始滚动
        $reel.css({ transform: 'translateY(0)', transition: 'none' });
        $reel.addClass('scrolling');
      });
    }, // ====================【Albin 终极修复版 - 重构时序控制】====================
    // (请完整替换原有的 stopSlotReel 和 checkSlotResult 函数)
    // ====================【Albin 终极修复版 - 重构时序控制】====================
    // (请完整替换原有的 stopSlotReel 和 checkSlotResult 函数)
    stopSlotReel() {
      const $ = this.$;
      const reelIndexToStop = this.slotMachineState.stoppedCount;
      // 如果已经全部停止，或不在滚动状态，则直接返回，防止重复执行
      if (reelIndexToStop >= 3 || !this.slotMachineState.isRolling) return;
      const $reelToStop = $(`#slot-reel-${reelIndexToStop + 1}`);
      const $images = $reelToStop.find('img');
      const iconHeight = $images.first().outerHeight(true);
      // 健壮性检查：如果获取不到图标高度，则安全退出
      if (!iconHeight) {
        console.error('Albin提示：无法获取图标高度，老虎机停止失败。');
        this.slotMachineState.isRolling = false;
        $('#start-slot-machine_ap').prop('disabled', false).text('开始转动！(消耗1瓶)');
        return;
      }
      const containerHeight = $reelToStop.parent().height();
      const iconsInReel = $images.length / 2; // 图标列表被复制过一次

      // 修复目押功能：基于当前滚动位置计算最接近的图标
      const currentTransform = $reelToStop.css('transform');
      let currentY = 0;
      if (currentTransform && currentTransform !== 'none') {
        const matrix = currentTransform.match(/matrix.*\((.+)\)/);
        if (matrix) {
          const values = matrix[1].split(', ');
          currentY = Math.abs(parseFloat(values[5]) || 0);
        }
      }

      // 计算当前可见区域中心对应的图标索引
      const visibleCenterY = currentY + containerHeight / 2;
      let targetIndex = Math.round(visibleCenterY / iconHeight) % iconsInReel;

      // 确保索引在有效范围内
      if (targetIndex < 0) targetIndex = 0;
      if (targetIndex >= iconsInReel) targetIndex = iconsInReel - 1;

      const targetIconUrl = $images.eq(targetIndex).attr('src');
      this.slotMachineState.reels[reelIndexToStop] = targetIconUrl;

      logDebug(`卷轴${reelIndexToStop + 1}目押停止: 当前Y=${currentY}, 目标索引=${targetIndex}`);
      // 精确计算停止位置：
      // 1. (iconsInReel + targetIndex) * iconHeight: 滚动到复制列表的后半部分，确保无缝衔接
      // 2. containerHeight / 2: 将容器中心对准卷轴顶部
      // 3. iconHeight / 2: 将图标自身的中心对准容器中心
      const finalPosition = (iconsInReel + targetIndex) * iconHeight - containerHeight / 2 + iconHeight / 2;

      const animationDuration = 2500 + reelIndexToStop * 500; // 让每个卷轴的停止时间略有不同，更具节奏感 (2.5s, 3s, 3.5s)
      // 应用动画效果
      $reelToStop.removeClass('scrolling').css({
        transition: `transform ${animationDuration / 1000}s cubic-bezier(0.25, 1, 0.5, 1)`,
        transform: `translateY(-${finalPosition}px)`,
      });
      // 播放停止音效
      this.sounds.rouletteStop.play().catch(e => {});
      // 更新状态
      this.slotMachineState.stoppedCount++;
      const $startBtn = $('#start-slot-machine_ap');
      if (this.slotMachineState.stoppedCount < 3) {
        $startBtn.text(`停止第 ${this.slotMachineState.stoppedCount + 1} 个！`);
      } else {
        // 当第三个卷轴被命令停止时
        $startBtn.prop('disabled', true).text('结算中...');
        this.slotMachineState.isRolling = false; // 标记为非滚动状态
        // 核心修复：使用 setTimeout 保证结算函数在动画结束后被调用
        setTimeout(() => {
          this.checkSlotResult();
        }, animationDuration + 100); // 动画时间 + 100ms 缓冲
      }
    },
    checkSlotResult() {
      const $ = this.$;
      // 增加一道安全检查，防止在不该结算的时候被意外调用
      if (this.slotMachineState.isRolling || this.slotMachineState.stoppedCount < 3) {
        console.warn('Albin提示：检测到异常的结算请求，已拦截。');
        // 如果发生异常，提供一个安全的重置路径
        $('#start-slot-machine_ap').prop('disabled', false).text('开始转动！(消耗1瓶)');
        this.slotMachineState.isRolling = false;
        this.slotMachineState.stoppedCount = 0;
        return;
      }
      const { reels } = this.slotMachineState;
      const isWin = reels[0] && reels[1] && reels[2] && reels[0] === reels[1] && reels[1] === reels[2];
      const $startBtn = $('#start-slot-machine_ap');
      const $resultText = $('#slot-result-text_ap');
      const $juiceDisplay = $('#carrot-juice-display_ap');
      let rewardAmount = 0;
      let tipMessage = '';
      let tipType = 'info';
      // 消耗胡萝卜汁，这一步应该在开始时就扣除，但为了逻辑清晰放在结算处统一处理
      if (this.memory.counters.carrotJuice > 0) {
        this.memory.counters.carrotJuice--;
      }
      if (isWin) {
        this.memory.counters.slotMachineWins = (this.memory.counters.slotMachineWins || 0) + 1;
        if (reels[0].endsWith('.gif')) {
          this.memory.counters.slotMachineJackpots = (this.memory.counters.slotMachineJackpots || 0) + 1;
          rewardAmount = 20;
          $resultText.html('<span>🏆</span> 头奖！超稀有的悸动！').css('color', '#f6e05e');
          tipMessage = `<span>🏆</span> <strong>头奖！</strong> 耶嘿嘿~这是名流的运气！<br>胡萝卜汁+${rewardAmount}！`;
          tipType = 'gold';
          this.sounds.jankenWin.play().catch(e => {}); // 使用更激昂的音效
        } else {
          rewardAmount = 10;
          $resultText.html('<span>🎉</span> 中奖啦！运气不错嘛！').css('color', '#34d399');
          tipMessage = `<span>🎉</span> <strong>中奖啦！</strong> 运气不错嘛，拖累那亲！<br>胡萝卜汁+${rewardAmount}！`;
          tipType = 'success';
          this.sounds.confirmEdit.play().catch(e => {}); // 使用普通成功音效
        }
      } else {
        $resultText.html('<span>💔</span> 很遗憾，没中奖...').css('color', '#a9b1d6');
        tipMessage = '<span>💔</span> <strong>再接再厉！</strong> 悸动的感觉，下次一定会来的！';
        tipType = 'warning';
        this.sounds.jankenLose.play().catch(e => {});
      }
      this.memory.counters.carrotJuice += rewardAmount;

      // 重置状态，准备下一次游戏
      this.slotMachineState.stoppedCount = 0;
      $startBtn.prop('disabled', false).text('开始转动！(消耗1瓶)');
      if ($juiceDisplay.length) {
        $juiceDisplay.text(`胡萝卜汁: ${this.memory.counters.carrotJuice}`);
      }
      this.showTip(tipMessage, tipType);
      this.saveMemory();
    },
    // =======================================================================
    drawOmikuji() {
      const $ = this.$;
      const fortune = this.fortunes[Math.floor(Math.random() * this.fortunes.length)];
      if (!this.memory.fortunes.includes(fortune.name)) {
        this.memory.fortunes.push(fortune.name);
        this.saveMemory();
      }
      // 显示御神签，隐藏提示语
      $('#shrine-prompt_ap').hide();
      const $display = $('#omikuji-result-display_ap').show();
      // 填充内容
      $display.find('.omikuji-fortune_ap').text(`【${fortune.name}】`);
      $display.find('.omikuji-desc_ap').text(fortune.desc);
      const $itemsList = $display.find('.omikuji-items_ap').empty();
      this.omikujiItems.forEach(item => {
        const isGood = Math.random() > (fortune.rank - 1) / (this.fortunes.length - 1) - 0.1;
        const itemResult = isGood
          ? this.itemResults.good[Math.floor(Math.random() * this.itemResults.good.length)]
          : this.itemResults.bad[Math.floor(Math.random() * this.itemResults.bad.length)];
        $itemsList.append(`<li><strong>【${item}】</strong> ${itemResult}</li>`);
      });
      // 禁用按钮
      $('#shrine-draw-btn_ap').prop('disabled', true);
      // 播放音效和显示提示
      if (fortune.rank <= 2) {
        this.showTip(this.showDynamicQuote('fortuneGood'), 'success');
      } else if (fortune.rank >= 6) {
        this.showTip(this.showDynamicQuote('fortuneBad'), 'warning');
      }
    },
    postStatus(type, data) {
      if (!this.statusContainer) return;
      let html = '';
      switch (type) {
        case 'LoadSuccess':
          html = `<span>✔️</span> <strong>加载成功:</strong> ${data} 条语音就绪。`;
          break;
        case 'PlayingByTag':
          html = `<span>▶️</span> <strong>播放 (标签: ${data.tag}):</strong> <br><small style="opacity: 0.7;">${data.url}</small>`;
          break;
        case 'PlayingRandom':
          html = `<span>🔀</span> <strong>随机播放:</strong> <br><small style="opacity: 0.7;">${data.url}</small>`;
          break;
        case 'PlayingTest':
          html = `<span>🎧</span> <strong>测试播放 [${data.index + 1}/${data.total}]:</strong> <br><small style="opacity: 0.7;">${data.url}</small>`;
          break;
        case 'NotFound':
          html = `<span>❓</span> <strong>未找到标签:</strong> <code>${data}</code>, 已切换为随机播放。`;
          break;
        case 'CharSwitched':
          html = `<span>🔄</span> <strong>角色切换:</strong> 已检测到新角色 (ID: ${data.id})。`;
          break;
        case 'Custom':
          html = data.text;
          break;
      }
      this.statusContainer.innerHTML = html;
    },
    initializePlayerButton() {
      const $ = this.$;
      if ($(`#${this.PLAYER_BUTTON_ID}`, this.parentWin.document).length > 0) {
        $(`#${this.PLAYER_BUTTON_ID}`, this.parentWin.document).remove();
      }
      const iconUrl = this.icons[this.iconIndex % this.icons.length];
      const buttonHtml = `<div id="${this.PLAYER_BUTTON_ID}" title="打开育成模拟器" style="position: fixed !important; z-index: 9999; cursor: grab; width: 52px; height: 52px; border: 2px solid rgba(255, 255, 255, 0.7); border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.4); transition: all 0.2s ease; user-select: none; background-size: cover; background-position: center;">
                                    <img src="${iconUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                                    <canvas id="button-visualizer_ap" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; pointer-events: none;"></canvas>
                               </div>`;
      $('body', this.parentWin.document).append(buttonHtml);

      const $playerButton = $(`#${this.PLAYER_BUTTON_ID}`, this.parentWin.document);
      $playerButton.data('openPanelFunction', this.openAudioPlayerPanel.bind(this));
      $playerButton.data('positionKey', this.BUTTON_POSITION_KEY);
      const savedPos = localStorage.getItem(this.BUTTON_POSITION_KEY);
      if (savedPos) {
        try {
          const pos = JSON.parse(savedPos);
          if (pos && (pos.top != null || pos.left != null || pos.right != null || pos.bottom != null)) {
            $playerButton.css(pos);
          } else {
            throw new Error('invalid saved position');
          }
        } catch (e) {
          // 回退到默认位置
          $playerButton.css({ bottom: '20px', right: '20px' });
        }
      } else {
        $playerButton.css({ bottom: '20px', right: '20px' });
      }
      $playerButton.hover(
        function () {
          $(this).css({ transform: 'scale(1.1)', 'box-shadow': '0 6px 18px rgba(187, 154, 247, 0.7)' });
        },
        function () {
          $(this).css({ transform: 'scale(1)', 'box-shadow': '0 4px 12px rgba(0,0,0,0.4)' });
        },
      );
      makeDraggable($playerButton, this.parentWin, $, this.SCRIPT_ID_PREFIX);
      if (
        $playerButton.offset() &&
        ($playerButton.offset().left < 60 ||
          $playerButton.offset().left + $playerButton.outerWidth() > this.parentWin.innerWidth - 60)
      ) {
        $playerButton.css({ opacity: 0.6, transform: 'scale(0.9)' }).addClass('snapped');
      }
    },

    // 新增：切换音效系统
    toggleSfxSystem() {
      try {
        this.sfxEnabled = !this.sfxEnabled;

        // 保存状态到localStorage
        localStorage.setItem('vib_sfx_enabled', this.sfxEnabled.toString());

        // 更新标题显示
        this.updateSfxTitle();

        if (this.sfxEnabled) {
          logDebug('音效系统已启用');

          // 尝试初始化音频权限
          this.requestAudioPermission();

          // 不再播放启动音效
        } else {
          logDebug('音效系统已禁用');
        }
      } catch (error) {
        logError('切换音效系统时出错:', error);
      }
    },

    // 新增：更新音效标题显示
    updateSfxTitle() {
      const $title = $('#sfx-title_ap');
      if (!this.sfxEnabled) {
        $title.text('语音音效 (SFX) 🔇');
      } else {
        const replyStatus = this.replySoundEnabled ? '🔊' : '🔇';
        const charStatus = this.characterSwitchSoundEnabled ? '🔊' : '🔇';
        $title.text(`语音音效 (SFX) 🔊 [切换${replyStatus} 回复${charStatus}]`);
      }
    },

    // 新增：循环切换音效音量
    cycleSfxVolume() {
      this.sfxVolumeIndex = (this.sfxVolumeIndex + 1) % this.volumeLevels.length;
      const newVolume = this.volumeLevels[this.sfxVolumeIndex];

      // 更新所有音效播放器的音量
      if (this.sfxPlayer) {
        this.sfxPlayer.volume = newVolume.level;
      }
      if (this.audioElement) {
        this.audioElement.volume = newVolume.level;
      }

      // 保存到localStorage
      localStorage.setItem('vib_sfx_volume_index', this.sfxVolumeIndex.toString());

      logDebug(`音效音量已切换为: ${newVolume.text} (${newVolume.level})`);
    },

    // 新增：测试音频播放
    async testAudioPlayback() {
      try {
        logDebug('开始测试音频播放');

        // 关闭之前的音频上下文
        if (this.audioContext) {
          this.audioContext.close();
          this.audioContext = null;
        }

        // 创建新的音频上下文
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        logDebug('音频上下文已创建');

        // 如果音频上下文被暂停，则恢复
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
          logDebug('音频上下文已恢复');
        }

        // 关闭之前的音频元素
        if (this.audioElement) {
          this.audioElement.pause();
          this.audioElement = null;
        }

        // 创建新的音频元素
        this.audioElement = new Audio();
        this.audioElement.volume = this.sfxVolumeIndex / 100;
        logDebug(`音频元素已创建，音量: ${this.audioElement.volume}`);

        // 设置音频源
        if (this.sfxLibrary && this.sfxLibrary.length > 0) {
          this.audioElement.src = this.sfxLibrary[0].url;
          logDebug(`音频源已设置: ${this.sfxLibrary[0].url}`);
        } else {
          logError('音效库为空，无法播放测试音效');
          return;
        }

        // 添加事件监听器
        this.audioElement.onloadstart = () => logDebug('音频开始加载');
        this.audioElement.oncanplay = () => logDebug('音频可以播放');
        this.audioElement.onplay = () => logDebug('音频开始播放');
        this.audioElement.onended = () => logDebug('音频播放结束');
        this.audioElement.onerror = e => logError('音频播放错误:', e);

        // 播放音频
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              logDebug('音频播放成功');
              // 3秒后自动停止
              setTimeout(() => {
                if (this.audioElement) {
                  this.audioElement.pause();
                  logDebug('测试音频已停止');
                }
              }, 3000);
            })
            .catch(error => {
              logError('音频播放失败:', error);
            });
        }
      } catch (error) {
        logError('测试音频播放时出错:', error);
      }
    },

    // 新增：根据索引播放测试音效
    playTestSfxByIndex(index) {
      if (this.sfxLibrary[index]) {
        const audio = new Audio(this.sfxLibrary[index].url);
        audio.volume = 0.3;
        audio.play().catch(e => {
          logError('播放测试音效失败:', e);
        });
        logDebug(`试听音效 ${index + 1}: ${this.sfxLibrary[index].url}`);
      }
    },

    // 重写：使用AudioContext + Audio元素的组合播放音效
    async playAudioWithTavernCommand(audioUrl) {
      try {
        logDebug(`开始播放音效: ${audioUrl}`);

        // 检查音频权限
        if (!this.hasAudioPermission) {
          logDebug('音频权限未授权，跳过播放');
          return;
        }

        // 确保音频上下文存在且处于运行状态
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          logDebug('创建新的音频上下文');
        }

        // 如果音频上下文被暂停，恢复它
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
          logDebug('恢复音频上下文');
        }

        // 创建或重用Audio元素
        if (!this.audioElement) {
          this.audioElement = new Audio();
          this.audioElement.volume = this.volumeLevels[this.sfxVolumeIndex].level;
          logDebug('创建新的音频元素');
        }

        // 设置音频源和音量
        this.audioElement.src = audioUrl;
        this.audioElement.volume = this.volumeLevels[this.sfxVolumeIndex].level;

        // 播放音频
        const playPromise = this.audioElement.play();

        if (playPromise !== undefined) {
          await playPromise;
          logDebug('音频播放成功');
        }
      } catch (error) {
        logError('音频播放失败:', error);

        // 如果播放失败，可能是权限问题，重置权限状态
        if (error.name === 'NotAllowedError') {
          logError('音频权限被拒绝，重置权限状态');
          this.hasAudioPermission = false;
          localStorage.removeItem(this.audioPermissionKey);
          this.showNotification('音频权限丢失，请重新点击"测试音效"按钮', 'warning');
        }
      }
    },

    // 移除备用方法，直接使用上面的方法
    playAudioWithFallback(audioUrl) {
      // 直接调用主方法
      this.playAudioWithTavernCommand(audioUrl);
    },

    // 执行酒馆命令的通用方法
    async executeTavernCommand(command) {
      try {
        logDebug(`执行酒馆命令: ${command}`);

        // 检查是否有酒馆的命令执行函数
        if (window.executeSlashCommand) {
          return await window.executeSlashCommand(command);
        }

        // 如果没有，尝试通过事件系统
        if (window.eventSource && window.eventSource.emit) {
          window.eventSource.emit('command', command);
          return;
        }

        // 最后的备用方案：直接调用
        if (window.runSlashCommand) {
          return await window.runSlashCommand(command);
        }

        throw new Error('找不到酒馆命令执行方法');
      } catch (error) {
        logError('执行酒馆命令失败:', error);
        throw error;
      }
    },

    // 新增：获取指定位置对应的标签
    getTargetTagsByPosition(sfxIndex) {
      // 定义位置映射规则：根据SFX音效的位置选择对应的回复音效
      const positionMappings = {
        // 前10个位置：基础情感音效
        0: ['初次见面', '打招呼'],
        1: ['表示赞同', '回应训练员'],
        2: ['陷入困境', '感到无力'],
        3: ['撒娇', '表达欲求'],
        4: ['请求夸奖', '撒娇'],
        5: ['用餐开始'],
        6: ['初次见面', '打招呼'],
        7: ['自我介绍'],
        8: ['确认身份', '疑问'],
        9: ['肯定回答', '表示赞同'],

        // 10-19：家庭和情感相关
        10: ['提及家人', '想念姐姐'],
        11: ['疑问', '引起注意'],
        12: ['主动邀请', '指引方向'],
        13: ['表达乐观', '安慰他人'],
        14: ['想起事情', '转换话题'],
        15: ['用餐结束', '表示感谢'],
        16: ['表达决心', '提及梦想'],
        17: ['打招呼'],
        18: ['展现自信', '比赛宣言'],
        19: ['感到骄傲', '展现自信'],

        // 20-29：情感表达
        20: ['回避问题', '害羞'],
        21: ['表示不满', '质问'],
        22: ['承接话题', '解释说明'],
        23: ['表达决心', '宣告目标'],
        24: ['展现自信', '比赛宣言'],
        25: ['感到骄傲', '展现自信'],
        26: ['回避问题', '害羞'],
        27: ['表示不满', '质问'],
        28: ['承接话题', '解释说明'],
        29: ['表达决心', '宣告目标'],

        // 30-42：其他情感和状态
        30: ['展现自信', '比赛宣言'],
        31: ['感到骄傲', '展现自信'],
        32: ['回避问题', '害羞'],
        33: ['表示不满', '质问'],
        34: ['承接话题', '解释说明'],
        35: ['表达决心', '宣告目标'],
        36: ['展现自信', '比赛宣言'],
        37: ['感到骄傲', '展现自信'],
        38: ['回避问题', '害羞'],
        39: ['表示不满', '质问'],
        40: ['承接话题', '解释说明'],
        41: ['表达决心', '宣告目标'],
        42: ['展现自信', '比赛宣言'],
      };

      return positionMappings[sfxIndex] || ['表示赞同', '回应训练员'];
    },

    // 新增：获取聊天上下文信息
    getChatContext() {
      try {
        const $ = this.$;
        const context = {
          isFirstMessage: false,
          isUserQuestion: false,
          isUserStatement: false,
          isUserCommand: false,
          lastMessageText: '',
          hasSlashCommand: false,
        };

        // 获取最后一条用户消息
        const $lastUserMessage = $('.mes:last-child .mes_text', this.parentWin.document);
        if ($lastUserMessage.length > 0) {
          context.lastMessageText = $lastUserMessage.text().trim();

          // 检查是否是首次对话
          const $allMessages = $('.mes', this.parentWin.document);
          context.isFirstMessage = $allMessages.length <= 2; // 系统消息 + 用户消息

          // 检查是否是问题
          context.isUserQuestion =
            context.lastMessageText.includes('?') ||
            context.lastMessageText.includes('？') ||
            context.lastMessageText.includes('什么') ||
            context.lastMessageText.includes('怎么') ||
            context.lastMessageText.includes('为什么');

          // 检查是否包含命令
          context.isUserCommand =
            context.lastMessageText.startsWith('/') ||
            context.lastMessageText.includes('@') ||
            context.lastMessageText.includes('type@');

          // 检查是否包含slashcommand
          context.hasSlashCommand =
            context.lastMessageText.includes('/') &&
            (context.lastMessageText.includes('bg') ||
              context.lastMessageText.includes('audio') ||
              context.lastMessageText.includes('gen') ||
              context.lastMessageText.includes('sys'));

          // 根据内容判断是陈述还是其他
          if (!context.isUserQuestion && !context.isUserCommand) {
            context.isUserStatement = true;
          }
        }

        logDebug(`聊天上下文: ${JSON.stringify(context)}`);
        return context;
      } catch (error) {
        logError('获取聊天上下文失败:', error);
        return {
          isFirstMessage: false,
          isUserQuestion: false,
          isUserStatement: false,
          isUserCommand: false,
          lastMessageText: '',
          hasSlashCommand: false,
        };
      }
    },

    // 新增：请求音频权限
    async requestAudioPermission() {
      try {
        logDebug('请求音频权限...');

        // 如果音频上下文还未创建，则创建它
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          logDebug('音频上下文创建成功');
        }

        // 某些严格的浏览器需要通过播放一个无声的buffer来彻底"解锁"
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
          logDebug('音频上下文已恢复');
        }

        // 确保audioElement存在
        if (!this.audioElement) {
          this.audioElement = new Audio();
          this.audioElement.volume = this.volumeLevels[this.sfxVolumeIndex].level;
          logDebug('创建音频元素用于权限请求');
        }

        // 尝试播放一个测试音效来获取权限
        if (this.sfxLibrary.length > 0) {
          const testAudio = this.sfxLibrary[0];
          logDebug(`使用测试音效: ${testAudio.url}`);

          this.audioElement.src = testAudio.url;
          const playPromise = this.audioElement.play();

          if (playPromise !== undefined) {
            await playPromise;
            logDebug('音频权限获取成功！');
            this.hasAudioPermission = true;
            localStorage.setItem(this.audioPermissionKey, 'granted');

            // 立即停止播放
            this.audioElement.pause();
            this.audioElement.currentTime = 0;

            this.showNotification('音频权限已激活！', 'success');
          }
        } else {
          logError('没有可用的测试音效');
          this.showNotification('没有可用的测试音效', 'error');
        }
      } catch (error) {
        logError('音频权限请求失败:', error);
        this.hasAudioPermission = false;
        localStorage.removeItem(this.audioPermissionKey);
        this.showNotification('音频权限请求失败，请检查浏览器设置', 'error');
      }
    },

    // 新增：处理点击事件
    handleClick(event) {
      const $ = this.$;
      const currentTime = Date.now();
      const clickData = {
        x: event.clientX,
        y: event.clientY,
        time: currentTime,
      };

      // 清理过期的点击记录
      this.clickHistory = this.clickHistory.filter(click => currentTime - click.time < this.clickThreshold);

      // 添加新的点击记录
      this.clickHistory.push(clickData);

      // 调试信息
      logDebug(`点击记录: ${this.clickHistory.length}/3, 时间: ${currentTime}, 位置: (${clickData.x}, ${clickData.y})`);

      // 检查是否满足连续点击条件
      if (this.clickHistory.length >= 3) {
        const firstClick = this.clickHistory[0];
        const lastClick = this.clickHistory[this.clickHistory.length - 1];

        // 检查时间间隔
        if (lastClick.time - firstClick.time <= this.clickThreshold) {
          // 检查位置是否在容差范围内
          const avgX = this.clickHistory.reduce((sum, click) => sum + click.x, 0) / this.clickHistory.length;
          const avgY = this.clickHistory.reduce((sum, click) => sum + click.y, 0) / this.clickHistory.length;

          const allInRange = this.clickHistory.every(
            click =>
              Math.abs(click.x - avgX) <= this.positionTolerance && Math.abs(click.y - avgY) <= this.positionTolerance,
          );

          if (allInRange) {
            logDebug('三击条件满足，开始移动按钮');
            // 三击触发：将悬浮按钮移动到点击位置，并可选打开面板
            const $btn = $(`#${this.PLAYER_BUTTON_ID}`, this.parentWin.document);
            if ($btn.length) {
              // 若按钮当前被吸附（snapped），先解除吸附效果
              $btn.removeClass('snapped').css({ opacity: 1, transform: 'scale(1)' });
              const btnHalfW = $btn.outerWidth() / 2;
              const btnHalfH = $btn.outerHeight() / 2;
              const targetLeft = Math.max(0, Math.min(avgX - btnHalfW, this.parentWin.innerWidth - $btn.outerWidth()));
              const targetTop = Math.max(0, Math.min(avgY - btnHalfH, this.parentWin.innerHeight - $btn.outerHeight()));
              $btn
                .css({
                  top: `${Math.round(targetTop)}px`,
                  left: `${Math.round(targetLeft)}px`,
                  right: 'auto',
                  bottom: 'auto',
                  opacity: 1,
                  transform: 'scale(1)',
                })
                .removeClass('snapped');
              // 保存位置
              try {
                localStorage.setItem(
                  this.BUTTON_POSITION_KEY,
                  JSON.stringify({ top: Math.round(targetTop), left: Math.round(targetLeft) }),
                );
              } catch (e) {
                // ignore quota errors
              }
              // 视觉提示
              this.showTip('已移动到三击位置', 'info');
              // 可选：自动打开面板
              const openFn = $btn.data('openPanelFunction');
              if (typeof openFn === 'function') {
                openFn();
              }
            }
            // 清空记录，避免重复触发
            this.clickHistory = [];
            return; // 立即返回，防止后续逻辑继续执行
          }
        }
      }
    },

    // 新增：显示点击位置信息
    showClickPosition(x, y) {
      const message = `🎯 点击位置: X=${Math.round(x)}, Y=${Math.round(y)}`;
      this.showTip(message, 'info');
      logDebug(`检测到连续点击，位置: X=${x}, Y=${y}`);
    },

    // 独立的事件监听设置 - 回复音效
    setupReplySoundEvents() {
      logDebug('设置回复音效事件监听...');

      // 监听消息发送事件（当用户发送消息时触发）
      if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined') {
        eventOn(tavern_events.MESSAGE_SENT, message_id => {
          console.log('[模拟器 v100.0.0] 检测到消息发送事件！message_id:', message_id);
          logDebug('检测到消息发送事件，触发回复音效');
          // 延迟1秒播放音效，模拟回复开始生成
          setTimeout(() => {
            console.log('[模拟器 v100.0.0] 开始播放随机回复音效');
            this.playRandomReplySound();
          }, 1000);
        });
        logDebug('已设置酒馆消息发送事件监听');
        console.log('[模拟器 v100.0.0] MESSAGE_SENT 事件监听器已绑定');
      } else if (this.parentWin.eventSource) {
        // 备用方案：直接使用eventSource
        this.parentWin.eventSource.on('MESSAGE_SENT', () => {
          setTimeout(() => {
            console.log('[模拟器 v100.0.0] 开始播放随机回复音效（备用方案）');
            this.playRandomReplySound();
          }, 1000);
        });
        logDebug('使用备用方案设置事件监听');
        console.log('[模拟器 v100.0.0] 使用备用方案设置事件监听');
      } else {
        logDebug('无法设置酒馆事件监听，eventOn或eventSource不可用');
        console.log('[模拟器 v100.0.0] 无法设置酒馆事件监听，eventOn或eventSource不可用');
      }

      // 监听重新生成和编辑按钮点击
      const $ = this.$;
      const observerTarget = this.parentWin.document.body;
      $(observerTarget).on('click', event => {
        if ($(event.target).closest('#regenerate').length > 0) {
          // 重新roll聊天记录时播放音效
          this.playRandomReplySound().catch(error => {
            logError('重新生成音效播放失败:', error);
          });
        } else if ($(event.target).closest('#send_but_edit').length > 0) {
          // 楼层聊天修改记录时播放音效
          this.playRandomReplySound();
        }
      });

      // 监听发送按钮点击
      const $sendButton = $('#send_but', this.parentWin.document);
      if ($sendButton.length) {
        logDebug('发送按钮事件监听器绑定成功');
        $sendButton.on('click', () => {
          logDebug('发送按钮被点击，触发回复音效');
          this.playRandomReplySound();
        });
      } else {
        logError('未找到发送按钮 #send_but');
      }

      logDebug('回复音效事件监听设置完成');
    },

    // 独立的事件监听设置 - 角色切换音效
    setupCharacterSwitchSoundEvents() {
      logDebug('设置角色切换音效事件监听...');

      const $ = this.$;
      const observerTarget = this.parentWin.document.body;

      // 使用独立的DOM观察器监听角色切换
      this.characterSwitchObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            const $addedNodes = $(mutation.addedNodes);
            const $charAvatar = $addedNodes.find('.avatar.character_select').addBack('.avatar.character_select');
            if ($charAvatar.length > 0) {
              const newCharId = $charAvatar.data('chid');
              if (newCharId && newCharId !== this.lastCharacterId) {
                this.lastCharacterId = newCharId;
                // 播放角色切换音效
                this.playCharacterSwitchSound();
                this.postStatus('CharSwitched', { id: newCharId });
                logDebug(`角色切换检测到: ${newCharId}`);
                break;
              }
            }
          }
        }
      });

      this.characterSwitchObserver.observe(observerTarget, { childList: true, subtree: true });
      logDebug('角色切换音效事件监听设置完成');
    },

    // 新增：初始化事件监听
    initializeEventListeners() {
      const $ = this.$;

      // 注意：MESSAGE_RECEIVED 事件已在 bindGlobalEvents() 中通过 sillyTavernMessageHandler 处理
      // 这里不再重复监听，避免重复播放音效
      logDebug('事件监听器初始化完成 - MESSAGE_RECEIVED 已在 bindGlobalEvents 中处理');

      // 监听点击事件（绑定到父文档，按钮也在父文档中）
      $(this.parentWin.document).on('click', event => {
        // 排除按钮点击和面板点击，避免干扰正常操作
        if (
          !$(event.target).closest(`#${this.PLAYER_BUTTON_ID}`).length &&
          !$(event.target).closest(`#${this.PLAYER_PANEL_OVERLAY_ID}`).length
        ) {
          this.handleClick(event);
        }
      });

      logDebug('事件监听器初始化完成');
    },

    // 新增：显示音乐管理面板
    showBgmManagePanel() {
      const $ = this.$;

      // 移除已存在的面板
      $('.bgm-manage-panel_ap').remove();

      // 创建音乐管理面板
      const $panel = $(`
         <div class="bgm-manage-panel_ap" style="
           position: fixed;
           top: 50%;
           left: 50%;
           transform: translate(-50%, -50%);
           background: #1a202c;
           border: 2px solid #4a5568;
           border-radius: 12px;
           padding: 20px;
           z-index: 10000;
           box-shadow: 0 8px 32px rgba(0,0,0,0.5);
           min-width: 400px;
           max-height: 80vh;
           overflow-y: auto;
           color: #e2e8f0;
         ">
           <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
             <h3 style="margin: 0; color: #f7fafc;">音乐管理</h3>
             <button class="close-btn_ap" style="
               background: none;
               border: none;
               color: #a0aec0;
               font-size: 20px;
               cursor: pointer;
               padding: 0;
               width: 24px;
               height: 24px;
               display: flex;
               align-items: center;
               justify-content: center;
             ">×</button>
           </div>
           
           <div style="margin-bottom: 20px;">
             <h4 style="margin: 0 0 10px 0; color: #f7fafc;">添加新音乐</h4>
             <div style="display: flex; gap: 10px; margin-bottom: 10px;">
               <input type="text" id="new-bgm-name_ap" class="vib-textarea_ap" placeholder="音乐名字（可选）..." style="flex-grow: 1; margin: 0;">
             </div>
             <div style="display: flex; gap: 10px; margin-bottom: 10px;">
               <input type="text" id="new-bgm-url_ap" class="vib-textarea_ap" placeholder="输入音乐URL..." style="flex-grow: 1; margin: 0;">
               <button id="add-bgm-btn_ap" class="vib-btn_ap" data-color="green">添加</button>
             </div>
             <small style="color: #a0aec0;">支持MP3、WAV、OGG等音频格式</small>
           </div>
           
           <div style="margin-bottom: 20px;">
             <h4 style="margin: 0 0 10px 0; color: #f7fafc;">音乐列表 (${this.bgmLibrary.length})</h4>
             <div id="bgm-list-container_ap" style="
               max-height: 300px;
               overflow-y: auto;
               border: 1px solid #4a5568;
               border-radius: 8px;
               padding: 10px;
             ">
             </div>
           </div>
           
           <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
             <button id="restore-default-bgm-btn_ap" class="vib-btn_ap" data-color="blue">恢复默认</button>
             <button id="export-bgm-list-btn_ap" class="vib-btn_ap" data-color="purple">导出列表</button>
           </div>
         </div>
       `);

      // 生成音乐列表
      const $bgmList = $panel.find('#bgm-list-container_ap');
      this.bgmLibrary.forEach((bgm, index) => {
        const isCurrent = index === this.bgmPlaybackIndex;
        const $bgmItem = $(`
           <div class="bgm-item_ap" data-index="${index}" style="
             background: ${isCurrent ? '#2d3748' : '#4a5568'};
             border: 1px solid ${isCurrent ? '#f6e05e' : '#718096'};
             border-radius: 6px;
             padding: 8px;
             margin-bottom: 5px;
             display: flex;
             justify-content: space-between;
             align-items: center;
           ">
             <div style="flex-grow: 1; margin-right: 10px;">
               <div style="font-weight: bold; color: ${isCurrent ? '#f6e05e' : '#e2e8f0'};">
                 ${bgm.name || '音乐 ' + (index + 1)}
               </div>
               <div style="font-size: 11px; color: #a0aec0; word-break: break-all;">
                 ${bgm.url}
               </div>
             </div>
             <div style="display: flex; gap: 5px;">
               ${
                 !bgm.name
                   ? `<button class="edit-name-btn_ap" data-index="${index}" style="
                 background: #3182ce;
                 border: none;
                 border-radius: 4px;
                 color: white;
                 padding: 4px 8px;
                 font-size: 11px;
                 cursor: pointer;
               ">添加名字</button>`
                   : ''
               }
               <button class="delete-bgm-btn_ap" data-index="${index}" style="
                 background: #e53e3e;
                 border: none;
                 border-radius: 4px;
                 color: white;
                 padding: 4px 8px;
                 font-size: 11px;
                 cursor: pointer;
               ">删除</button>
             </div>
           </div>
         `);
        $bgmList.append($bgmItem);
      });

      // 添加关闭按钮事件
      $panel.find('.close-btn_ap').on('click', () => {
        $panel.remove();
      });

      // 添加音乐按钮事件
      $panel.find('#add-bgm-btn_ap').on('click', () => {
        const url = $panel.find('#new-bgm-url_ap').val().trim();
        const name = $panel.find('#new-bgm-name_ap').val().trim();
        if (url) {
          this.addBgmUrl(url, name);
          $panel.find('#new-bgm-url_ap').val('');
          $panel.find('#new-bgm-name_ap').val('');
          this.showBgmManagePanel(); // 刷新面板
        }
      });

      // 删除音乐按钮事件
      $panel.find('.delete-bgm-btn_ap').on('click', e => {
        const index = parseInt($(e.currentTarget).data('index'));
        this.deleteBgmUrl(index);
        this.showBgmManagePanel(); // 刷新面板
      });

      // 添加名字按钮事件
      $panel.find('.edit-name-btn_ap').on('click', e => {
        const index = parseInt($(e.currentTarget).data('index'));
        this.editBgmName(index);
      });

      // 恢复默认按钮事件
      $panel.find('#restore-default-bgm-btn_ap').on('click', () => {
        this.restoreDefaultBgmList();
        this.showBgmManagePanel(); // 刷新面板
      });

      // 导出列表按钮事件
      $panel.find('#export-bgm-list-btn_ap').on('click', () => {
        this.exportBgmList();
      });

      // 添加到页面
      $('body').append($panel);

      // 点击背景关闭面板
      $panel.on('click', e => {
        if (e.target === $panel[0]) {
          $panel.remove();
        }
      });

      // ESC键关闭面板
      $(document).one('keydown', e => {
        if (e.key === 'Escape') {
          $panel.remove();
        }
      });
    },

    // 新增：添加音乐URL
    addBgmUrl(url, name = '') {
      if (!url || !url.trim()) {
        this.showNotification('请输入有效的音乐URL', 'warning');
        return;
      }

      // 检查URL格式
      try {
        new URL(url);
      } catch (e) {
        this.showNotification('请输入有效的URL格式', 'warning');
        return;
      }

      // 检查是否已存在
      const exists = this.bgmLibrary.some(bgm => bgm.url === url);
      if (exists) {
        this.showNotification('该音乐已存在', 'warning');
        return;
      }

      // 添加到音乐库
      this.bgmLibrary.push({
        url: url,
        name: name || '自定义音乐',
      });

      // 保存到localStorage
      this.saveBgmLibrary();

      this.showNotification('音乐添加成功', 'success');
      logDebug(`添加音乐: ${url}`);
    },

    // 新增：编辑音乐名字
    editBgmName(index) {
      const bgm = this.bgmLibrary[index];
      if (!bgm) {
        this.showNotification('无效的音乐索引', 'error');
        return;
      }

      const newName = prompt('请输入音乐名字:', bgm.name || '');
      if (newName !== null && newName.trim()) {
        bgm.name = newName.trim();
        this.saveBgmLibrary();
        this.showNotification('音乐名字已更新', 'success');
        this.showBgmManagePanel(); // 刷新面板
      }
    },

    // 新增：删除音乐URL
    deleteBgmUrl(index) {
      if (index < 0 || index >= this.bgmLibrary.length) {
        this.showNotification('无效的音乐索引', 'error');
        return;
      }

      const deletedBgm = this.bgmLibrary[index];
      this.bgmLibrary.splice(index, 1);

      // 如果删除的是当前播放的音乐，切换到下一个
      if (index === this.bgmPlaybackIndex) {
        this.bgmPlaybackIndex = Math.min(index, this.bgmLibrary.length - 1);
        if (this.bgmLibrary.length > 0) {
          this.bgmPlayer.src = this.bgmLibrary[this.bgmPlaybackIndex].url;
        }
      } else if (index < this.bgmPlaybackIndex) {
        // 如果删除的音乐在当前播放音乐之前，需要调整索引
        this.bgmPlaybackIndex--;
      }

      // 保存到localStorage
      this.saveBgmLibrary();

      this.showNotification(`已删除音乐: ${deletedBgm.url}`, 'success');
      logDebug(`删除音乐 ${index}: ${deletedBgm.url}`);
    },

    // 新增：恢复默认音乐列表
    restoreDefaultBgmList() {
      // 恢复默认的BGM库
      this.bgmLibrary = [
        { url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', tags: ['默认', '铃声'] },
        { url: 'https://www.soundjay.com/misc/sounds/bell-ringing-04.wav', tags: ['默认', '铃声'] },
        { url: 'https://www.soundjay.com/misc/sounds/bell-ringing-03.wav', tags: ['默认', '铃声'] },
        { url: 'https://www.soundjay.com/misc/sounds/bell-ringing-02.wav', tags: ['默认', '铃声'] },
        { url: 'https://www.soundjay.com/misc/sounds/bell-ringing-01.wav', tags: ['默认', '铃声'] },
      ];

      // 重置播放索引
      this.bgmPlaybackIndex = 0;

      // 保存到localStorage
      this.saveBgmLibrary();

      // 更新当前播放的音乐
      if (this.bgmLibrary.length > 0) {
        this.bgmPlayer.src = this.bgmLibrary[this.bgmPlaybackIndex].url;
      }

      this.showNotification('已恢复默认音乐列表', 'success');
      logDebug('恢复默认音乐列表');
    },

    // 新增：导出音乐列表
    exportBgmList() {
      const bgmData = {
        bgmLibrary: this.bgmLibrary,
        exportDate: new Date().toISOString(),
        version: '1.0',
      };

      const dataStr = JSON.stringify(bgmData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `bgm-library-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      URL.revokeObjectURL(url);
      this.showNotification('音乐列表已导出', 'success');
      logDebug('导出音乐列表');
    },

    // 新增：保存音乐库到localStorage
    saveBgmLibrary() {
      try {
        localStorage.setItem('vib_bgm_library', JSON.stringify(this.bgmLibrary));
        logDebug('音乐库已保存到localStorage');
      } catch (error) {
        logError('保存音乐库失败:', error);
      }
    },
  };
  let initAttempts = 0;
  const maxAttempts = 40;
  const checkInterval = 500;
  const checkIntervalId = setInterval(() => {
    initAttempts++;
    const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
    if (parentWin.jQuery && parentWin.SillyTavern && parentWin.TavernHelper) {
      clearInterval(checkIntervalId);
      const $ = parentWin.jQuery;
      logDebug('核心API (包括TavernHelper) 已就绪，开始初始化模块...');

      // 输出设备信息
      console.log('📊 [模拟器 v100.0.0] 设备信息:', {
        userAgent: navigator.userAgent,
        deviceType: deviceType,
        isMobile: isMobile,
        isDesktop: isDesktop,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });

      $(parentWin.document).ready(function () {
        musicBoxModule.init(parentWin, $);
      });
    } else if (initAttempts > maxAttempts) {
      clearInterval(checkIntervalId);
      logError('初始化超时，未能加载SillyTavern核心API(特别是TavernHelper)。脚本将无法工作。');
    }
  }, checkInterval);
})();
