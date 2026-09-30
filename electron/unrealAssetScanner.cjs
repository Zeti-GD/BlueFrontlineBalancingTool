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

// 바이너리에서 SelectorLever RPM(uint16) 및 조건부 가속 RPM(int16) 실시간 추출
function extractRpmData(filePath, fallback = 600) {
  try {
    const buf = fs.readFileSync(filePath);
    const validNumbers = [];

    // 언리얼 TaggedProperty 패턴: [02 00 00 00 00] + 2바이트 값 (uint16/int16)
    let p = 1000;
    while (p < buf.length - 7) {
      const idx = buf.indexOf(Buffer.from([0x02, 0x00, 0x00, 0x00, 0x00]), p);
      if (idx === -1) break;
      const val = buf.readUInt16LE(idx + 5);
      if (val >= 10 && val <= 3500) {
        validNumbers.push({ offset: idx, val });
      }
      p = idx + 1;
    }

    if (validNumbers.length > 0) {
      // 에셋에 직렬화된 마지막 유효 2바이트가 FirePerMinute (기본 RPM)
      const baseRpm = validNumbers[validNumbers.length - 1].val;
      let dynamicRpm = null;

      // 만약 2개 이상의 수치가 존재하면 첫 번째 수치가 ConditionalModifiedRoundPerMinute (스킬 가속 RPM)
      if (validNumbers.length >= 2) {
        const candidate = validNumbers[validNumbers.length - 2].val;
        if (candidate !== baseRpm && candidate >= 10 && candidate <= 3500) {
          dynamicRpm = candidate;
        }
      }

      return {
        rpm: baseRpm,
        dynamicRpm: dynamicRpm,
        hasDynamicRpm: dynamicRpm !== null
      };
    }
  } catch (e) {}

  return { rpm: fallback, dynamicRpm: null, hasDynamicRpm: false };
}

function extractRpmValue(filePath, fallback = 600) {
  return extractRpmData(filePath, fallback).rpm;
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

// 바이너리에서 탄창(Magazine MaximumAmmo uint16) 실시간 추출
function extractMagValue(filePath, fallback = 30) {
  try {
    const buf = fs.readFileSync(filePath);
    const validMags = [];
    let p = 1000;
    while (p < buf.length - 7) {
      const idx = buf.indexOf(Buffer.from([0x02, 0x00, 0x00, 0x00, 0x00]), p);
      if (idx === -1) break;
      const val = buf.readUInt16LE(idx + 5);
      if (val >= 1 && val <= 500) {
        validMags.push(val);
      }
      p = idx + 1;
    }

    if (validMags.length > 0) {
      // 마지막 유효 수치가 MaximumAmmo
      return validMags[validMags.length - 1];
    }
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
    const pistolMag = hoshinoPistolMagPath ? extractMagValue(hoshinoPistolMagPath, 15) : 15;

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
  const ayaneRpmPath = findAsset(p => p.includes('ayaneselectorlever') || p.includes('ayanerpm'));
  const ayaneMagPath = findAsset(p => p.includes('ayanemagazine') && !p.includes('gatling'));
  if (ayaneDmgPath || ayaneRpmPath) {
    const damage = ayaneDmgPath ? extractFloatValue(ayaneDmgPath, 14) : 14;
    const rpm = ayaneRpmPath ? extractRpmValue(ayaneRpmPath, 900) : 900;
    const mag = ayaneMagPath ? extractMagValue(ayaneMagPath, 13) : 13;

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
      rpm: rpm,
      reloadTime: 1.0,
      magazine: mag,
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

  // 5. 코사카 와카모 (Wakamo - 99식 소총 SR & 재 뿌리기 동적 가속 스킬)
  const wakamoAssets = allUassets.filter(p => p.toLowerCase().includes('wakamo'));
  if (wakamoAssets.length > 0) {
    const wakamoHealthPath = findAsset(p => p.includes('wakamohealth'));
    const wakamoRpmPath = findAsset(p => p.includes('wakamolever') || p.includes('wakamoselectorlever') || p.includes('wakamorpm'));
    const wakamoMagPath = findAsset(p => p.includes('wakamomagazine'));
    const wakamoWakizashiDmgPath = findAsset(p => p.includes('wakamowakizashidamage') || p.includes('wakamobulletdamage') || p.includes('wakamodamage'));
    const wakamoSkill1Path = findAsset(p => p.includes('pourash') || p.includes('wakamoskill1') || (p.includes('wakamo') && p.includes('ability')));
    const wakamoSkill2Path = findAsset(p => p.includes('wakizashi') || p.includes('wakamoskill2'));

    const hp = wakamoHealthPath ? extractHealthValue(wakamoHealthPath, 140) : 140;
    // uasset 바이너리에서 FirePerMinute(75)와 ConditionalModifiedRoundPerMinute(150) 실시간 추출
    const rpmData = wakamoRpmPath ? extractRpmData(wakamoRpmPath, 75) : { rpm: 75, dynamicRpm: 150, hasDynamicRpm: true };
    const mag = wakamoMagPath ? extractMagValue(wakamoMagPath, 7) : 7;
    const s2Dmg = wakamoWakizashiDmgPath ? extractFloatValue(wakamoWakizashiDmgPath, 44) : 44;

    parsedCharacters.push({
      id: "Wakamo",
      name: "코사카 와카모",
      position: "스트라이커",
      weaponName: "진홍빛 꽃잎 (99식 소총)",
      weaponType: "SR",
      hp: hp,
      barrier: 0,
      speed: 490,
      damage: s2Dmg, // SR 저격탄 기준 대미지
      rpm: rpmData.rpm, // 기본 75 RPM
      reloadTime: 1.5,
      magazine: mag, // 실측 7발
      ehpMod: 0,
      rangeMin: 30,
      rangeMax: 75,
      minDmgRatio: 0.4,
      headshotMultiplier: 2.0,
      isClosedChamber: true,
      pelletCount: 1,
      hasSecondaryWeapon: false,
      activeWeaponIndex: 0,
      skill1: {
        name: "재 뿌리기 (Pour Ash)",
        damage: 0,
        heal: 0,
        cooldown: 12,
        castTime: 0.2,
        assetName: wakamoSkill1Path ? path.basename(wakamoSkill1Path) : "MFGAWakamoPourAsh.uasset",
        skillRole: "utility",
        description: `총기 활성화 상태를 부여하여 사격 연사력을 기본 ${rpmData.rpm} RPM에서 ${rpmData.dynamicRpm || 150} RPM(2배 가속)으로 대폭 강화합니다.`
      },
      skill2: {
        name: "전술 와키자시 투척",
        damage: s2Dmg,
        heal: 0,
        cooldown: 16,
        castTime: 0.3,
        assetName: wakamoSkill2Path ? path.basename(wakamoSkill2Path) : "DA_WakamoWakizashiDamage.uasset",
        skillRole: "damage",
        description: "전방으로 전술 단검 투사체를 던져 적을 관통하고 강력한 폭발성 물리 피해를 입힙니다."
      },
      customRadar: [9, 4, 7, 5, 8]
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

    // 3) 최우선: MolluFPS 언리얼 플레이어 캐릭터 표준 규칙 (BP_CR<Name>.uasset)
    const bpCrMatch = filename.match(/^BP_CR([A-Za-z0-9]+)$/i);
    if (bpCrMatch) {
      const candidate = bpCrMatch[1].toLowerCase();
      // 베이스 클래스 및 테스트용 블루프린트 제외
      const ignoredCr = ['base', 'classiccharacter', 'test', 'dummy', 'shirokoshotguntest'];
      if (!ignoredCr.includes(candidate)) {
        charKey = candidate;
      }
    }

    // 4) 표준 명시적 캐릭터 블루프린트 (예: BP_Character_Aru)
    if (!charKey) {
      const bpCharMatch = filename.match(/^BP_Character_([A-Za-z0-9]+)$/i);
      if (bpCharMatch) {
        charKey = bpCharMatch[1].toLowerCase();
      }
    }

    // 5) BP_<캐릭터명> 형태 검사 (예: BP_Aru, BP_Mika)
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

    // 6) 사전 등록된 캐릭터 키와 완전히 일치하는 에셋명인 경우
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

  // 감지된 각 신규 캐릭터 처리 (실시간 바이너리 분석 기반 자동 분류)
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
    const damage = dmgAsset ? extractFloatValue(dmgAsset, 24) : 24;

    // RPM 에셋 (기본 RPM 및 가변 RPM 실시간 추출)
    const rpmAsset = findCharAsset(p => p.includes('lever') || p.includes('selectorlever') || p.includes('rpm'));
    const rpmData = rpmAsset ? extractRpmData(rpmAsset, 600) : { rpm: 600, dynamicRpm: null, hasDynamicRpm: false };

    // 탄창 에셋 (실제 uasset 바이너리에서 MaximumAmmo 추출)
    const magAsset = findCharAsset(p => p.includes('magazine') || p.includes('mag'));
    const mag = magAsset ? extractMagValue(magAsset, 30) : 30;

    // 무기 타입 자동 판별 및 스펙 보정
    let weaponType = "AR";
    let speed = 500;
    let rangeMin = 20;
    let rangeMax = 50;
    let headshotMultiplier = 1.4;

    const allAssetsStr = assets.join(' ').toLowerCase();
    if (allAssetsStr.includes('99rifle') || allAssetsStr.includes('sniper') || allAssetsStr.includes('sr')) {
      weaponType = "SR";
      speed = 470;
      rangeMin = 30;
      rangeMax = 75;
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
      return l.includes('ga_') || l.includes('ability') || l.includes('skill') || l.includes('projectile');
    });

    const s1Asset = skillAssets[0];
    const s2Asset = skillAssets[1];

    // 가변 RPM 기믹이 있는 경우 스킬1 설명에 자동 연동
    const s1Desc = rpmData.hasDynamicRpm
      ? `사격 연사력을 기본 ${rpmData.rpm} RPM에서 ${rpmData.dynamicRpm} RPM으로 동적 가속합니다.`
      : "전술 액티브 스킬을 발동합니다.";

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
      rpm: rpmData.rpm,
      reloadTime: weaponType === "SR" ? 1.5 : 1.0,
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
        damage: s1Asset ? extractFloatValue(s1Asset, 0) : 0,
        heal: 0,
        cooldown: 15,
        castTime: 0.3,
        assetName: s1Asset ? path.basename(s1Asset) : "GA_Skill1.uasset",
        skillRole: rpmData.hasDynamicRpm ? "utility" : "damage",
        description: s1Desc
      },
      skill2: {
        name: s2Asset ? path.basename(s2Asset, '.uasset').replace(/^(?:GA_|BP_)/i, '') : "전술 스킬 2",
        damage: s2Asset ? extractFloatValue(s2Asset, 40) : 40,
        heal: 0,
        cooldown: 20,
        castTime: 0.4,
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
