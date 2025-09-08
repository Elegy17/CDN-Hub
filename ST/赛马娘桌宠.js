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
      // music-音乐列表
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
