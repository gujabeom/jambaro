/*
 * 잼바로 실행기 - "홈 화면에 추가" 안내 배너
 * index.html의 </body> 바로 위에 <script src="install-banner.js"></script> 한 줄만 넣으면 동작합니다.
 *
 *  - 안드로이드(크롬·삼성인터넷): [홈 화면에 추가] 버튼 → 바로 설치 창
 *  - 아이폰·아이패드: 공유 버튼 → '홈 화면에 추가' 그림 안내
 *  - 카카오톡 등 앱 안 브라우저: 바깥 브라우저로 열도록 안내 (앱 안에서는 홈 화면 추가가 안 됨)
 *  - 이미 홈 화면 아이콘으로 실행 중이거나, PC에서 접속하면 표시하지 않음
 *  - [하루 안보기] [1주일 안보기] 지원
 *  - 다른 버튼에서 다시 띄우려면: jambaroShowInstall()
 */
(function () {
  'use strict';

  var KEY = 'jambaro-install-hide-until';
  var DAY = 24 * 60 * 60 * 1000;
  var ua = navigator.userAgent || '';

  // ── 서비스 워커 등록 (오프라인 대비·안드로이드 설치 조건) ──
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  // ── 환경 판별 ──
  var isStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/.test(ua);
  var isMobile = isIOS || isAndroid;
  var isKakao = /KAKAOTALK/i.test(ua);
  var isOtherInApp = /NAVER|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|BAND/i.test(ua);

  function hiddenNow() {
    try { return Date.now() < Number(localStorage.getItem(KEY) || 0); } catch (e) { return false; }
  }
  function hideFor(ms) {
    try { localStorage.setItem(KEY, String(Date.now() + ms)); } catch (e) {}
  }

  // ── 스타일 ──
  var css =
    '#jb-install{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:99999;' +
    'max-width:480px;margin:0 auto;background:#fff;color:#222;border-radius:20px;padding:20px 18px 16px;' +
    'box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:var(--f-body,system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif);' +
    'animation:jb-up .35s ease-out;line-height:1.45}' +
    '@keyframes jb-up{from{transform:translateY(120%);opacity:0}to{transform:none;opacity:1}}' +
    '#jb-install .jb-top{display:flex;gap:14px;align-items:center}' +
    '#jb-install .jb-icon{width:60px;height:60px;border-radius:14px;flex:none}' +
    '#jb-install .jb-title{font-size:20px;font-weight:800;margin:0}' +
    '#jb-install .jb-desc{font-size:17px;margin:12px 0 0;word-break:keep-all}' +
    '#jb-install .jb-desc b{color:#d6205c}' +
    '#jb-install .jb-ico{display:inline-block;vertical-align:-5px;width:24px;height:24px}' +
    '#jb-install .jb-main{display:block;width:100%;margin-top:14px;padding:14px;border:0;border-radius:14px;' +
    'background:#d6205c;color:#fff;font-size:19px;font-weight:800;cursor:pointer}' +
    '#jb-install .jb-sub{display:flex;gap:8px;margin-top:12px}' +
    '#jb-install .jb-sub button{flex:1;padding:10px;border:0;border-radius:10px;background:#f1f1f3;color:#555;font-size:15px;cursor:pointer}' +
    '#jb-install .jb-x{position:absolute;top:8px;right:10px;width:40px;height:40px;border:0;background:none;font-size:26px;color:#999;cursor:pointer}' +
    '#jb-install .jb-arrow{text-align:center;font-size:30px;color:#d6205c;margin-top:4px;animation:jb-bob 1s infinite alternate}' +
    '@keyframes jb-bob{to{transform:translateY(6px)}}' +
    '@media (prefers-color-scheme:dark){#jb-install{background:#2a2a2e;color:#eee}#jb-install .jb-sub button{background:#3a3a40;color:#ccc}}';

  // 아이폰 공유 버튼 모양 (사각형 + 위 화살표)
  var shareSvg =
    '<svg class="jb-ico" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  var plusSvg =
    '<svg class="jb-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';

  var deferredPrompt = null;
  var box = null;

  function remove() { if (box) { box.remove(); box = null; } }

  function render(mode) {
    remove();
    if (!document.getElementById('jb-install-style')) {
      var st = document.createElement('style');
      st.id = 'jb-install-style';
      st.textContent = css;
      document.head.appendChild(st);
    }

    var body = '', mainBtn = '', arrow = '';
    if (mode === 'kakao') {
      body = '카카오톡 안에서는 홈 화면에 추가할 수 없어요.<br>아래 버튼을 눌러 <b>인터넷 앱으로 열어</b> 주세요.';
      mainBtn = '<button class="jb-main" data-act="kakao">인터넷 앱으로 열기</button>';
    } else if (mode === 'inapp') {
      body = '지금 앱 안에서 열려 있어요.<br>오른쪽 위 <b>⋮ 또는 ⋯ 메뉴</b>에서<br><b>\'다른 브라우저로 열기\'</b>를 눌러 주세요.';
    } else if (mode === 'android-prompt') {
      body = '버튼 한 번이면 <b>홈 화면에 잼바로 아이콘</b>이 생겨요.<br>다음부터는 아이콘만 누르면 바로 시작!';
      mainBtn = '<button class="jb-main" data-act="install">홈 화면에 추가하기</button>';
    } else if (mode === 'android-manual') {
      body = '오른쪽 위 <b>⋮ 메뉴</b>를 누르고<br><b>\'홈 화면에 추가\'</b>를 눌러 주세요.';
    } else if (mode === 'ios') {
      body = '① 화면 아래 ' + shareSvg + ' <b>공유 버튼</b>을 누르세요.<br>' +
             '<small>(안 보이면 <b>⋯</b> 버튼을 먼저 누르세요)</small><br>' +
             '② ' + plusSvg + ' <b>\'홈 화면에 추가\'</b>를 누르세요.';
      arrow = '<div class="jb-arrow">⬇</div>';
    }

    box = document.createElement('div');
    box.id = 'jb-install';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', '홈 화면에 추가 안내');
    box.innerHTML =
      '<button class="jb-x" data-act="close" aria-label="닫기">×</button>' +
      '<div class="jb-top"><img class="jb-icon" src="icons/icon-180.png" alt="">' +
      '<p class="jb-title">잼바로를 앱처럼 써 보세요!</p></div>' +
      '<p class="jb-desc">' + body + '</p>' + mainBtn +
      '<div class="jb-sub"><button data-act="day">하루 안보기</button><button data-act="week">1주일 안보기</button></div>' +
      arrow;

    box.addEventListener('click', function (e) {
      var act = e.target.closest('[data-act]');
      if (!act) return;
      act = act.getAttribute('data-act');
      if (act === 'close') remove();
      else if (act === 'day') { hideFor(DAY); remove(); }
      else if (act === 'week') { hideFor(7 * DAY); remove(); }
      else if (act === 'kakao') {
        location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
      } else if (act === 'install' && deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () { deferredPrompt = null; remove(); });
      }
    });
    document.body.appendChild(box);
  }

  function pickMode() {
    if (isKakao) return 'kakao';
    if (isOtherInApp) return 'inapp';
    if (isIOS) return 'ios';
    if (isAndroid) return deferredPrompt ? 'android-prompt' : 'android-manual';
    return null;
  }

  // 다른 버튼(예: 메뉴의 "홈 화면에 추가")에서 직접 띄우기
  window.jambaroShowInstall = function () {
    if (isStandalone) { alert('이미 홈 화면 아이콘으로 실행 중이에요.'); return; }
    var m = pickMode();
    if (m) render(m);
    else alert('휴대폰에서 접속하면 홈 화면에 추가할 수 있어요.');
  };

  // 안드로이드: 브라우저가 "설치 가능"이라고 알려주면 저장해 둠
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (box && document.querySelector('#jb-install') && pickMode() === 'android-prompt') render('android-prompt');
  });
  window.addEventListener('appinstalled', function () { hideFor(3650 * DAY); remove(); });

  // ── 자동 표시 ──
  if (isStandalone || !isMobile || hiddenNow()) return;
  window.addEventListener('load', function () {
    // 안드로이드는 설치 신호가 올 시간을 잠깐 기다림
    setTimeout(function () { var m = pickMode(); if (m) render(m); }, isAndroid ? 2500 : 1200);
  });
})();
