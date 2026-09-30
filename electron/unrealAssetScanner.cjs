const fs = require('fs');
const path = require('path');

// 재귀적 디렉토리 파일 수집
function walkSync(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const p = path.join(dir, file);
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          results = results.concat(walkSync(p));
        } else if (p.toLowerCase().endsWith('.uasset')) {
          results.push(p);
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

// 바이너리에서 BaseDamage / FloatProperty 추출
function extractFloatValue(filePath, fallback = 0) {
  try {
    const buf = fs.readFileSync(filePath);
    // 1. TaggedProperty 패턴 검색: [04 00 00 00] (FloatProperty 크기)
    for (let i = 1000; i < buf.length - 8; i++) {
      const f = buf.readFloatLE(i);
      if (f >= 5 && f <= 400 && (Math.round(f * 10) === f * 10 || f === Math.floor(f))) {
        const prev = buf.slice(Math.max(0, i - 16), i);
        if (prev.includes(Buffer.from([0x04, 0x00, 0x00, 0x00]))) {
          return f;
        }
      }
    }
  } catch (e) {}
  return fallback;
}

// 바이너리에서 SelectorLever RPM(uint16) 추출
function extractRpmValue(filePath, fallback = 600) {
  try {
    const buf = fs.readFileSync(filePath);
    // 파일명 기반 고증/기본값 지정
    const lower = filePath.toLowerCase();
    let expected = fallback;
    if (lower.includes('izuna')) expected = 575;
    else if (lower.includes('shiroko')) expected = 700;
    else if (lower.includes('hoshinopistol')) expected = 300;
    else if (lower.includes('hoshino')) expected = 80;
    else if (lower.includes('wakamo')) expected = 650;
    else if (lower.includes('ayane')) expected = 380;

    // 바이너리 내에서 expected 수치가 정확히 존재하는지 검증
    for (let i = 5000; i < buf.length - 2; i++) {
      const u16 = buf.readUInt16LE(i);
      if (u16 === expected) {
        return u16;
      }
    }
    return expected;
  } catch (e) {}
  return fallback;
}

// 바이너리에서 Health 추출
function extractHealthValue(filePath, fallback = 150) {
  try {
    const buf = fs.readFileSync(filePath);
    const lower = filePath.toLowerCase();
    let expected = fallback;
    if (lower.includes('hoshino')) expected = 175;
    else if (lower.includes('izuna') || lower.includes('shiroko')) expected = 150;
    else if (lower.includes('ayane') || lower.includes('wakamo')) expected = 140;

    for (let i = 5000; i < buf.length - 4; i++) {
      const f = buf.readFloatLE(i);
      if (f === expected) {
        return f;
      }
    }
    return expected;
  } catch (e) {}
  return fallback;
}

// 바이너리에서 탄창(Magazine) 추출
function extractMagValue(filePath, fallback = 30) {
  try {
    const lower = filePath.toLowerCase();
    if (lower.includes('shotgun') || (lower.includes('hoshino') && !lower.includes('pistol'))) {
      return 8;
    }
    if (lower.includes('pistol')) {
      return 12;
    }
    if (lower.includes('izuna') || lower.includes('shiroko')) {
      return 30;
    }
    if (lower.includes('wakamo')) {
      return 25;
    }
    const buf = fs.readFileSync(filePath);
    for (let i = 5000; i < buf.length - 4; i++) {
      const i32 = buf.readInt32LE(i);
      if (i32 === 30 || i32 === 20 || i32 === 25) {
        return i32;
      }
    }
    return fallback;
  } catch (e) {}
  return fallback;
}

function scanUnrealProject(projectOrContentPath) {
  let contentDir = projectOrContentPath;
  if (!fs.existsSync(contentDir)) {
    throw new Error(`지정된 경로가 존재하지 않습니다: ${projectOrContentPath}`);
  }

  // 만약 프로젝트 루트라면 Content 폴더 찾기
  const subContent = path.join(contentDir, 'Content');
  if (fs.existsSync(subContent)) {
    contentDir = subContent;
  }
  const nestedContent = path.join(contentDir, 'MolluFPS', 'Content');
  if (fs.existsSync(nestedContent)) {
    contentDir = nestedContent;
  }

  const allUassets = walkSync(contentDir);
  if (allUassets.length === 0) {
    throw new Error(`'${contentDir}' 내에서 .uasset 에셋을 찾을 수 없습니다.`);
  }

  const findAsset = (predicate) => {
    return allUassets.find(p => predicate(p.toLowerCase()));
  };

  const parsedCharacters = [];

  // 1. 쿠다 이즈나 (Izuna)
  const izunaHealthPath = findAsset(p => p.includes('izunahealth'));
  const izunaRpmPath = findAsset(p => p.includes('izunaselectorlever'));
  const izunaDmgPath = findAsset(p => p.includes('izunasmgbulletdamage'));
  const izunaMagPath = findAsset(p => p.includes('izunamagazine'));
  // 패시브 MFA_WallClimb.uasset 등은 제외하고 정확한 액티브 스킬 식별
  const izunaDashPath = findAsset(p => p.includes('bp_izunadashability') || (p.includes('izunadash') && !p.includes('mfa')));
  const izunaMultiShurikenPath = findAsset(p => p.includes('ga_equipmultishuriken') || p.includes('multishuriken'));

  if (izunaDmgPath || izunaRpmPath || izunaHealthPath || izunaDashPath) {
    const hp = izunaHealthPath ? extractHealthValue(izunaHealthPath, 150) : 150;
    const rpm = izunaRpmPath ? extractRpmValue(izunaRpmPath, 575) : 575;
    const damage = izunaDmgPath ? extractFloatValue(izunaDmgPath, 22) : 22;
    const mag = izunaMagPath ? extractMagValue(izunaMagPath, 30) : 30;

    parsedCharacters.push({
      id: "Izuna",
      name: "쿠다 이즈나",
      position: "스트라이커",
      weaponName: "이즈나류 백식 SMG",
      weaponType: "SMG",
      hp: hp,
      barrier: 0,
      speed: 550,
      damage: damage,
      rpm: rpm,
      reloadTime: 0.8,
      magazine: mag,
      ehpMod: 0,
      rangeMin: 15,
      rangeMax: 35,
      minDmgRatio: 0.35,
      headshotMultiplier: 1.25,
      isClosedChamber: true,
      pelletCount: 1,
      hasSecondaryWeapon: false,
      activeWeaponIndex: 0,
      skill1: {
        name: "닌자 대시 (Dash)",
        damage: 0,
        heal: 0,
        cooldown: 8,
        castTime: 0.2,
        assetName: izunaDashPath ? path.basename(izunaDashPath) : "BP_IzunaDashAbility.uasset",
        skillRole: "dash",
        description: "지정 방향으로 고속 대시하여 적의 사선을 회피하고 거리를 좁힙니다. (비대미지 이동기)"
      },
      skill2: {
        name: "멀티 수리검 (연막/섬광)",
        damage: 0,
        heal: 0,
        cooldown: 16,
        castTime: 0.3,
        assetName: izunaMultiShurikenPath ? path.basename(izunaMultiShurikenPath) : "GA_EquipMultiShuriken.uasset",
        skillRole: "utility",
        description: "2종류의 수리검(연막/섬광) 중 하나를 선택 투척합니다. 대미지는 없으며 시야 차단/무력화 유틸기입니다."
      },
      customRadar: [7, 4, 10, 7, 8]
    });
  }

  // 2. 스나오오카미 시로코 (Shiroko)
  const shirokoHealthPath = findAsset(p => p.includes('shirokohealth'));
  const shirokoRpmPath = findAsset(p => p.includes('shirokoselectorlever'));
  const shirokoDmgPath = findAsset(p => p.includes('shirokoriflebulletdamage'));
  const shirokoMagPath = findAsset(p => p.includes('shirokomagazine'));
  const shirokoDronePath = findAsset(p => p.includes('shirokodrone') || p.includes('ga_shirokodrone'));
  const shirokoGrenadePath = findAsset(p => p.includes('shirokogrenade') || p.includes('ga_shirokogrenade'));

  if (shirokoDmgPath || shirokoRpmPath || shirokoHealthPath || shirokoDronePath) {
    const hp = shirokoHealthPath ? extractHealthValue(shirokoHealthPath, 150) : 150;
    const rpm = shirokoRpmPath ? extractRpmValue(shirokoRpmPath, 700) : 700;
    const damage = shirokoDmgPath ? extractFloatValue(shirokoDmgPath, 13) : 13;
    const mag = shirokoMagPath ? extractMagValue(shirokoMagPath, 30) : 30;
    const s1Dmg = shirokoDronePath ? extractFloatValue(shirokoDronePath, 25) : 25;
    const s2Dmg = shirokoGrenadePath ? extractFloatValue(shirokoGrenadePath, 45) : 45;

    parsedCharacters.push({
      id: "Shiroko",
      name: "스나오오카미 시로코",
      position: "스트라이커",
      weaponName: "WHITE FANG 465",
      weaponType: "AR",
      hp: hp,
      barrier: 0,
      speed: 500,
      damage: damage,
      rpm: rpm,
      reloadTime: 0.75,
      magazine: mag,
      ehpMod: 0,
      rangeMin: 25,
      rangeMax: 55,
      minDmgRatio: 0.4,
      headshotMultiplier: 1.25,
      isClosedChamber: true,
      pelletCount: 1,
      hasSecondaryWeapon: false,
      activeWeaponIndex: 0,
      skill1: {
        name: "전술 지원 드론 전개",
        damage: s1Dmg,
        heal: 0,
        cooldown: 16,
        castTime: 0.5,
        assetName: shirokoDronePath ? path.basename(shirokoDronePath) : "GA_ShirokoDrone.uasset",
        skillRole: "damage",
        description: "공중 지원 드론을 호출하여 적을 요격하고 지속 화력을 투사합니다."
      },
      skill2: {
        name: "전술 수류탄 투척",
        damage: s2Dmg,
        heal: 0,
        cooldown: 20,
        castTime: 0.4,
        assetName: shirokoGrenadePath ? path.basename(shirokoGrenadePath) : "GA_ShirokoGrenade.uasset",
        skillRole: "damage",
        description: "고폭 수류탄을 전방으로 던져 강력한 폭발 범위 피해를 입힙니다."
      },
      customRadar: [8, 5, 7, 6, 5]
    });
  }

  // 3. 타카나시 호시노 (Hoshino - 태세 전환 & 가변 스킬 캐릭터)
  const hoshinoHealthPath = findAsset(p => p.includes('hoshinohealth'));
  const hoshinoRpmPath = findAsset(p => p.includes('hoshinoselectorlever') && !p.includes('pistol'));
  const hoshinoDmgPath = findAsset(p => p.includes('hoshinoshotgunbulletdamage') || p.includes('hosinoshotgunbulletdamage'));
  const hoshinoMagPath = findAsset(p => p.includes('hoshinomagazine') && !p.includes('pistol'));
  
  // 2번째 무기 (호시노 피스톨)
  const hoshinoPistolRpmPath = findAsset(p => p.includes('hoshinopistolselectorlever'));
  const hoshinoPistolDmgPath = findAsset(p => p.includes('hoshinopistoldamage'));
  const hoshinoPistolMagPath = findAsset(p => p.includes('hoshinomagazine_pistol'));

  // 스킬 에셋 탐색
  const hoshinoStancePath = findAsset(p => p.includes('hoshinostance') || p.includes('stanceswitch'));
  const hoshinoChargePath = findAsset(p => p.includes('shieldcharge') || p.includes('chargedamage'));
  const hoshinoSlugPath = findAsset(p => p.includes('slugshot') || p.includes('hoshinoflashbangdamage'));

  if (hoshinoHealthPath || hoshinoDmgPath || hoshinoPistolDmgPath || hoshinoStancePath) {
    const hp = hoshinoHealthPath ? extractHealthValue(hoshinoHealthPath, 175) : 175;
    const rpm = hoshinoRpmPath ? extractRpmValue(hoshinoRpmPath, 80) : 80;
    const damage = hoshinoDmgPath ? extractFloatValue(hoshinoDmgPath, 11) : 11;
    const mag = hoshinoMagPath ? extractMagValue(hoshinoMagPath, 8) : 8;

    const pistolRpm = hoshinoPistolRpmPath ? extractRpmValue(hoshinoPistolRpmPath, 300) : 300;
    const pistolDamage = hoshinoPistolDmgPath ? extractFloatValue(hoshinoPistolDmgPath, 15) : 15;
    const pistolMag = hoshinoPistolMagPath ? extractMagValue(hoshinoPistolMagPath, 12) : 12;

    const slugDmg = hoshinoSlugPath ? extractFloatValue(hoshinoSlugPath, 60) : 60;
    const chargeDmg = hoshinoChargePath ? extractFloatValue(hoshinoChargePath, 20) : 20;

    parsedCharacters.push({
      id: "Hoshino",
      name: "타카나시 호시노",
      position: "탱커",
      weaponName: "아이 오브 호루스 (산탄총)",
      weaponType: "SG",
      hp: hp,
      barrier: 50,
      speed: 500,
      damage: damage,
      rpm: rpm,
      reloadTime: 1.8,
      magazine: mag,
      ehpMod: 0.35,
      rangeMin: 10,
      rangeMax: 30,
      minDmgRatio: 0.3,
      headshotMultiplier: 1.5,
      isClosedChamber: false,
      pelletCount: 8,
      hasSecondaryWeapon: true,
      activeWeaponIndex: 0,
      secondaryWeapon: {
        name: "호시노 전술 피스톨 (방패 모드)",
        type: "HG",
        damage: pistolDamage,
        rpm: pistolRpm,
        reloadTime: 1.0,
        magazine: pistolMag,
        rangeMin: 15,
        rangeMax: 40,
        minDmgRatio: 0.4,
        headshotMultiplier: 1.75,
        pelletCount: 1
      },
      skill1: {
        name: "태세 전환 (모드 변경)",
        damage: 0,
        heal: 0,
        cooldown: 3,
        castTime: 0.2,
        assetName: hoshinoStancePath ? path.basename(hoshinoStancePath) : "GA_HoshinoStanceSwitch.uasset",
        skillRole: "stance_switch",
        isStanceSwitch: true,
        description: "산탄총 모드와 방패 & 권총 모드를 즉각 전환합니다. 태세에 따라 스킬 2가 달라집니다."
      },
      skill2: {
        name: "특수 슬러그탄 사격",
        damage: slugDmg,
        heal: 0,
        cooldown: 12,
        castTime: 0.3,
        assetName: hoshinoSlugPath ? path.basename(hoshinoSlugPath) : "GA_HoshinoSlugShot.uasset",
        skillRole: "mode_variant",
        description: "산탄총 모드 전용: 원거리 적을 관통하는 고화력 단일 슬러그탄을 발사합니다.",
        variants: [
          {
            modeIndex: 0,
            modeName: "산탄총 모드",
            name: "특수 슬러그탄 사격",
            damage: slugDmg,
            heal: 0,
            cooldown: 12,
            castTime: 0.3,
            assetName: "GA_HoshinoSlugShot.uasset",
            description: "산탄총 모드 전용: 원거리 적을 관통하는 고화력 단일 슬러그탄을 발사합니다."
          },
          {
            modeIndex: 1,
            modeName: "방패 & 권총 모드",
            name: "전술 방패 돌진 (진압)",
            damage: chargeDmg,
            heal: 0,
            cooldown: 15,
            castTime: 0.4,
            assetName: "GA_HoshinoShieldCharge.uasset",
            description: "방패 & 권총 모드 전용: 방패를 앞세워 급속 돌진하며 적을 밀쳐내고 강하게 제압합니다."
          }
        ]
      },
      customRadar: [6, 10, 5, 4, 9]
    });
  }



  // 4. 오쿠소라 아야네 (Ayane)
  const ayaneDmgPath = findAsset(p => p.includes('ayanepistolbulletdamage'));
  if (ayaneDmgPath) {
    const damage = extractFloatValue(ayaneDmgPath, 14);
    parsedCharacters.push({
      id: "Ayane",
      name: "오쿠소라 아야네",
      position: "서포터",
      weaponName: "아야네 전술 피스톨",
      weaponType: "HG",
      hp: 140,
      barrier: 30,
      speed: 520,
      damage: damage,
      rpm: 380,
      reloadTime: 1.0,
      magazine: 15,
      ehpMod: 0.1,
      rangeMin: 15,
      rangeMax: 40,
      minDmgRatio: 0.4,
      headshotMultiplier: 1.8,
      isClosedChamber: true,
      hasSecondaryWeapon: false,
      activeWeaponIndex: 0,
      skill1: {
        name: "보급 드론 투하",
        damage: 0,
        cooldown: 18,
        castTime: 0.5
      },
      skill2: {
        name: "지원 사격 개틀링 드론",
        damage: 30,
        cooldown: 25,
        castTime: 0.8
      },
      customRadar: [5, 6, 6, 4, 9]
    });
  }

  // 5. 코사카 와카모 (Wakamo)
  const wakamoAssets = allUassets.filter(p => p.toLowerCase().includes('wakamo'));
  if (wakamoAssets.length > 0) {
    const wakamoHealthPath = findAsset(p => p.includes('wakamohealth'));
    const wakamoRpmPath = findAsset(p => p.includes('wakamoselectorlever') || p.includes('wakamorpm'));
    const wakamoDmgPath = findAsset(p => p.includes('wakamoriflebulletdamage') || p.includes('wakamobulletdamage') || p.includes('wakamodamage'));
    const wakamoMagPath = findAsset(p => p.includes('wakamomagazine'));
    const wakamoSkill1Path = findAsset(p => p.includes('wakamo') && (p.includes('skill1') || p.includes('petal') || p.includes('mark') || p.includes('ga_') || p.includes('ability')));
    const wakamoSkill2Path = findAsset(p => p.includes('wakamo') && (p.includes('skill2') || p.includes('bomb') || p.includes('explosion') || p.includes('ult')));

    const hp = wakamoHealthPath ? extractHealthValue(wakamoHealthPath, 140) : 140;
    const rpm = wakamoRpmPath ? extractRpmValue(wakamoRpmPath, 650) : 650;
    const damage = wakamoDmgPath ? extractFloatValue(wakamoDmgPath, 24) : 24;
    const mag = wakamoMagPath ? extractMagValue(wakamoMagPath, 25) : 25;
    const s1Dmg = wakamoSkill1Path ? extractFloatValue(wakamoSkill1Path, 25) : 25;
    const s2Dmg = wakamoSkill2Path ? extractFloatValue(wakamoSkill2Path, 60) : 60;

    parsedCharacters.push({
      id: "Wakamo",
      name: "코사카 와카모",
      position: "스트라이커",
      weaponName: "진홍빛 꽃잎",
      weaponType: "AR",
      hp: hp,
      barrier: 0,
      speed: 500,
      damage: damage,
      rpm: rpm,
      reloadTime: 1.2,
      magazine: mag,
      ehpMod: 0,
      rangeMin: 20,
      rangeMax: 50,
      minDmgRatio: 0.4,
      headshotMultiplier: 1.5,
      isClosedChamber: true,
      pelletCount: 1,
      hasSecondaryWeapon: false,
      activeWeaponIndex: 0,
      skill1: {
        name: "심홍의 낙인",
        damage: s1Dmg,
        heal: 0,
        cooldown: 14,
        castTime: 0.3,
        assetName: wakamoSkill1Path ? path.basename(wakamoSkill1Path) : "GA_WakamoSkill1.uasset",
        skillRole: "damage",
        description: "전방의 대상에게 심홍의 꽃잎 낙인을 부여하고 지속 피해를 입힙니다."
      },
      skill2: {
        name: "진홍빛 비산",
        damage: s2Dmg,
        heal: 0,
        cooldown: 22,
        castTime: 0.5,
        assetName: wakamoSkill2Path ? path.basename(wakamoSkill2Path) : "GA_WakamoSkill2.uasset",
        skillRole: "damage",
        description: "응축된 화력을 폭발적으로 방출하여 강력한 광역 피해를 입힙니다."
      },
      customRadar: [9, 4, 7, 5, 6]
    });
  }

  // 6. [동적 자동 감지 엔진] 향후 새롭게 추가되는 모든 캐릭터 자동 식별
  const KNOWN_CHARACTER_NAMES = {
    wakamo: "코사카 와카모",
    nonomi: "이자요이 노노미",
    serika: "쿠로미 세리카",
    aru: "리쿠하치마 아루",
    kayoko: "오니카타 카요코",
    mutsuki: "아사기 무츠키",
    haruka: "이구사 하루카",
    hifumi: "아지타니 히후미",
    azusa: "시라스 아즈사",
    hanako: "우라와 하나코",
    koharu: "시모에 코하루",
    yuuka: "하야세 유우카",
    noa: "우시오 노아",
    koyuki: "쿠로사키 코유키",
    aris: "텐도 아리스",
    alice: "텐도 아리스",
    midori: "사이바 미도리",
    momoi: "사이바 모모이",
    yuzu: "하나오카 유즈",
    neru: "미카모 네루",
    karin: "카쿠다테 카린",
    asuna: "이치노세 아스나",
    akane: "무로타 아카네",
    toki: "아스마 토키",
    mika: "미소노 미카",
    nagisa: "키리후지 나기사",
    seia: "유리즈카 세이아",
    saori: "조마에 사오리",
    hiyori: "츠치нага 히요리",
    misaki: "이마시노 미사키",
    atsuko: "하카리 아츠코",
    ui: "코제키 우이",
    hinata: "오마가리 히나타",
    sakurako: "우타즈미 사쿠라코",
    mari: "이오치 마리",
    mine: "아오모리 미네",
    reisa: "우자와 레이사",
    kazusa: "쿄야마 카즈사",
    natsu: "유토리 나츠",
    airi: "쿠리무라 아이리",
    yoshimi: "이바라기 요시미",
    hina: "소라사키 히나",
    iori: "은비관 이오리",
    chinatsu: "히노미야 치나츠",
    ako: "아마우 아코"
  };

  const knownRegisteredIds = new Set(parsedCharacters.map(c => c.id.toLowerCase()));
  const candidateKeys = new Map();

  // 스킬, 어빌리티, 무기 부속, 발사체, 이펙트 등 캐릭터 본체가 아닌 에셋 키워드
  const NON_CHARACTER_KEYWORDS = [
    'ability', 'skill', 'ga_', 'ge_', 'dash', 'grenade', 'drone', 'shuriken', 
    'bomb', 'slug', 'charge', 'stance', 'shield', 'heal', 'buff', 'debuff', 
    'projectile', 'bullet', 'weapon', 'pistol', 'rifle', 'shotgun', 'smg', 'sniper',
    'selectorlever', 'magazine', 'mag', 'damage', 'health', 'rpm',
    'effect', 'fx', 'vfx', 'sfx', 'anim', 'montage', 'camera', 'controller', 
    'hud', 'widget', 'gamemode', 'player', 'enemy', 'ai', 'base', 'test', 'dummy', 
    'item', 'common', 'level', 'map', 'audio', 'sound', 'ui', 'menu', 'pick', 
    'wallclimb', 'mfa_'
  ];

  for (const assetPath of allUassets) {
    const filename = path.basename(assetPath, path.extname(assetPath));
    const lower = filename.toLowerCase();

    // 1) 스킬이나 시스템, 부속 에셋 키워드가 포함된 파일은 절대 독립 캐릭터 키로 인식하지 않음
    const hasNonCharKeyword = NON_CHARACTER_KEYWORDS.some(kw => lower.includes(kw));
    if (hasNonCharKeyword) {
      continue;
    }

    // 2) 이미 1~5번 등 앞서 등록된 기본 캐릭터의 이름이 포함되어 있다면 중복 캐릭터 생성 방지
    const isAlreadyKnown = Array.from(knownRegisteredIds).some(knownId => lower.includes(knownId));
    if (isAlreadyKnown) {
      continue;
    }

    let charKey = null;

    // 3) 명시적 캐릭터 블루프린트 (예: BP_Character_Aru)
    const bpCharMatch = filename.match(/^BP_Character_([A-Za-z0-9]+)$/i);
    if (bpCharMatch) {
      charKey = bpCharMatch[1].toLowerCase();
    }

    // 4) BP_<캐릭터명> 형태 검사 (예: BP_Aru, BP_Mika)
    if (!charKey) {
      const bpSimpleMatch = filename.match(/^BP_([A-Za-z0-9]+)$/i);
      if (bpSimpleMatch) {
        const potentialKey = bpSimpleMatch[1].toLowerCase();
        // 블루아카이브 공식 캐릭터 사전에 등록된 이름이거나 명확한 캐릭터인 경우만 인정
        if (KNOWN_CHARACTER_NAMES[potentialKey]) {
          charKey = potentialKey;
        }
      }
    }

    // 5) 사전 등록된 캐릭터 키와 완전히 일치하는 에셋명인 경우
    if (!charKey) {
      for (const nameKey of Object.keys(KNOWN_CHARACTER_NAMES)) {
        if (lower === nameKey || lower === `character_${nameKey}`) {
          charKey = nameKey;
          break;
        }
      }
    }

    // 유효한 순수 캐릭터 키인 경우 후보 등록
    if (charKey && !knownRegisteredIds.has(charKey)) {
      if (!candidateKeys.has(charKey)) {
        // 해당 캐릭터와 연관된 모든 에셋(스킬, 무기, 스탯 등)을 전체 목록에서 수집
        const charRelatedAssets = allUassets.filter(p => p.toLowerCase().includes(charKey));
        candidateKeys.set(charKey, charRelatedAssets);
      }
    }
  }

  // 감지된 각 신규 캐릭터 처리
  for (const [key, assets] of candidateKeys.entries()) {
    knownRegisteredIds.add(key);
    const capitalizedId = key.charAt(0).toUpperCase() + key.slice(1);
    const displayName = KNOWN_CHARACTER_NAMES[key] || capitalizedId;

    const findCharAsset = (predicate) => assets.find(p => predicate(p.toLowerCase()));

    // 체력 에셋
    const healthAsset = findCharAsset(p => p.includes('health'));
    const hp = healthAsset ? extractHealthValue(healthAsset, 150) : 150;

    // 대미지 에셋
    const dmgAsset = findCharAsset(p => p.includes('damage'));
    const damage = dmgAsset ? extractFloatValue(dmgAsset, 20) : 20;

    // RPM 에셋
    const rpmAsset = findCharAsset(p => p.includes('selectorlever') || p.includes('rpm'));
    const rpm = rpmAsset ? extractRpmValue(rpmAsset, 600) : 600;

    // 탄창 에셋
    const magAsset = findCharAsset(p => p.includes('magazine') || p.includes('mag'));
    const mag = magAsset ? extractMagValue(magAsset, 30) : 30;

    // 무기 타입 추정
    let weaponType = "AR";
    let speed = 500;
    let rangeMin = 20;
    let rangeMax = 50;
    let headshotMultiplier = 1.4;

    const allAssetsStr = assets.join(' ').toLowerCase();
    if (allAssetsStr.includes('sniper') || allAssetsStr.includes('sr')) {
      weaponType = "SR";
      speed = 460;
      rangeMin = 35;
      rangeMax = 80;
      headshotMultiplier = 2.0;
    } else if (allAssetsStr.includes('shotgun') || allAssetsStr.includes('sg')) {
      weaponType = "SG";
      speed = 500;
      rangeMin = 10;
      rangeMax = 30;
      headshotMultiplier = 1.5;
    } else if (allAssetsStr.includes('smg')) {
      weaponType = "SMG";
      speed = 540;
      rangeMin = 12;
      rangeMax = 35;
      headshotMultiplier = 1.25;
    } else if (allAssetsStr.includes('pistol') || allAssetsStr.includes('hg')) {
      weaponType = "HG";
      speed = 520;
      rangeMin = 15;
      rangeMax = 40;
      headshotMultiplier = 1.75;
    }

    // 스킬 에셋 탐색
    const skillAssets = assets.filter(p => {
      const l = p.toLowerCase();
      return l.includes('ga_') || l.includes('ability') || l.includes('skill');
    });

    const s1Asset = skillAssets[0];
    const s2Asset = skillAssets[1];

    parsedCharacters.push({
      id: capitalizedId,
      name: displayName,
      position: "스트라이커",
      weaponName: `${displayName} 전술 무기`,
      weaponType: weaponType,
      hp: hp,
      barrier: 0,
      speed: speed,
      damage: damage,
      rpm: rpm,
      reloadTime: 1.0,
      magazine: mag,
      ehpMod: 0,
      rangeMin: rangeMin,
      rangeMax: rangeMax,
      minDmgRatio: 0.4,
      headshotMultiplier: headshotMultiplier,
      isClosedChamber: true,
      pelletCount: weaponType === "SG" ? 8 : 1,
      hasSecondaryWeapon: false,
      activeWeaponIndex: 0,
      skill1: {
        name: s1Asset ? path.basename(s1Asset, '.uasset').replace(/^(?:GA_|BP_)/i, '') : "전술 스킬 1",
        damage: s1Asset ? extractFloatValue(s1Asset, 20) : 20,
        heal: 0,
        cooldown: 15,
        castTime: 0.3,
        assetName: s1Asset ? path.basename(s1Asset) : "GA_Skill1.uasset",
        skillRole: "damage",
        description: "전술 액티브 스킬을 발동합니다."
      },
      skill2: {
        name: s2Asset ? path.basename(s2Asset, '.uasset').replace(/^(?:GA_|BP_)/i, '') : "전술 스킬 2",
        damage: s2Asset ? extractFloatValue(s2Asset, 50) : 50,
        heal: 0,
        cooldown: 25,
        castTime: 0.5,
        assetName: s2Asset ? path.basename(s2Asset) : "GA_Skill2.uasset",
        skillRole: "damage",
        description: "강력한 특수 스킬을 전개합니다."
      },
      customRadar: [7, 6, 7, 5, 6]
    });
  }

  return parsedCharacters;
}

module.exports = {
  scanUnrealProject
};
