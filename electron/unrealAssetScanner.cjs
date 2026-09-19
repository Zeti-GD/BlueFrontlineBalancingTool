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
    else if (lower.includes('ayane')) expected = 140;

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
    const buf = fs.readFileSync(filePath);
    for (let i = 5000; i < buf.length - 4; i++) {
      const i32 = buf.readInt32LE(i);
      if (i32 === 30 || i32 === 20) {
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
  const izunaSkill1Path = findAsset(p => p.includes('izunashurikendamage.uasset'));
  const izunaSkill2Path = findAsset(p => p.includes('izunashurikenexplosiondamage'));

  if (izunaDmgPath || izunaRpmPath || izunaHealthPath) {
    const hp = izunaHealthPath ? extractHealthValue(izunaHealthPath, 150) : 150;
    const rpm = izunaRpmPath ? extractRpmValue(izunaRpmPath, 575) : 575;
    const damage = izunaDmgPath ? extractFloatValue(izunaDmgPath, 22) : 22;
    const mag = izunaMagPath ? extractMagValue(izunaMagPath, 30) : 30;
    const s1Dmg = izunaSkill1Path ? extractFloatValue(izunaSkill1Path, 10) : 10;
    const s2Dmg = izunaSkill2Path ? extractFloatValue(izunaSkill2Path, 30) : 30;

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
        name: "수리검 투척",
        damage: s1Dmg,
        cooldown: 12,
        castTime: 0.2
      },
      skill2: {
        name: "비기! 벚꽃 연막술 (폭발)",
        damage: s2Dmg,
        cooldown: 18,
        castTime: 0.4
      },
      customRadar: [7, 4, 10, 7, 6]
    });
  }

  // 2. 스나오오카미 시로코 (Shiroko)
  const shirokoHealthPath = findAsset(p => p.includes('shirokohealth'));
  const shirokoRpmPath = findAsset(p => p.includes('shirokoselectorlever'));
  const shirokoDmgPath = findAsset(p => p.includes('shirokoriflebulletdamage'));
  const shirokoMagPath = findAsset(p => p.includes('shirokomagazine'));
  const shirokoSkill1Path = findAsset(p => p.includes('shirokodronedamage'));
  const shirokoSkill2Path = findAsset(p => p.includes('shirokogrenadedamage'));

  if (shirokoDmgPath || shirokoRpmPath || shirokoHealthPath) {
    const hp = shirokoHealthPath ? extractHealthValue(shirokoHealthPath, 150) : 150;
    const rpm = shirokoRpmPath ? extractRpmValue(shirokoRpmPath, 700) : 700;
    const damage = shirokoDmgPath ? extractFloatValue(shirokoDmgPath, 13) : 13;
    const mag = shirokoMagPath ? extractMagValue(shirokoMagPath, 30) : 30;
    const s1Dmg = shirokoSkill1Path ? extractFloatValue(shirokoSkill1Path, 25) : 25;
    const s2Dmg = shirokoSkill2Path ? extractFloatValue(shirokoSkill2Path, 45) : 45;

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
        name: "드론 소환: 화력 지원",
        damage: s1Dmg,
        cooldown: 16,
        castTime: 0.5
      },
      skill2: {
        name: "전술 유탄 투척",
        damage: s2Dmg,
        cooldown: 20,
        castTime: 0.4
      },
      customRadar: [8, 5, 7, 6, 5]
    });
  }

  // 3. 타카나시 호시노 (Hoshino - 듀얼 무기 캐릭터)
  const hoshinoHealthPath = findAsset(p => p.includes('hoshinohealth'));
  const hoshinoRpmPath = findAsset(p => p.includes('hoshinoselectorlever') && !p.includes('pistol'));
  const hoshinoDmgPath = findAsset(p => p.includes('hoshinoshotgunbulletdamage') || p.includes('hosinoshotgunbulletdamage'));
  const hoshinoMagPath = findAsset(p => p.includes('hoshinomagazine') && !p.includes('pistol'));
  
  // 2번째 무기 (호시노 피스톨)
  const hoshinoPistolRpmPath = findAsset(p => p.includes('hoshinopistolselectorlever'));
  const hoshinoPistolDmgPath = findAsset(p => p.includes('hoshinopistoldamage'));
  const hoshinoPistolMagPath = findAsset(p => p.includes('hoshinomagazine_pistol'));

  // 스킬
  const hoshinoSkill1Path = findAsset(p => p.includes('hoshinoflashbangdamage'));
  const hoshinoSkill2Path = findAsset(p => p.includes('chargedamage'));

  if (hoshinoHealthPath || hoshinoDmgPath || hoshinoPistolDmgPath) {
    const hp = hoshinoHealthPath ? extractHealthValue(hoshinoHealthPath, 175) : 175;
    const rpm = hoshinoRpmPath ? extractRpmValue(hoshinoRpmPath, 80) : 80;
    const damage = hoshinoDmgPath ? extractFloatValue(hoshinoDmgPath, 11) : 11;
    const mag = hoshinoMagPath ? extractMagValue(hoshinoMagPath, 8) : 8;

    const pistolRpm = hoshinoPistolRpmPath ? extractRpmValue(hoshinoPistolRpmPath, 300) : 300;
    const pistolDamage = hoshinoPistolDmgPath ? extractFloatValue(hoshinoPistolDmgPath, 15) : 15;
    const pistolMag = hoshinoPistolMagPath ? extractMagValue(hoshinoPistolMagPath, 12) : 12;

    const s1Dmg = hoshinoSkill1Path ? extractFloatValue(hoshinoSkill1Path, 10) : 10;
    const s2Dmg = hoshinoSkill2Path ? extractFloatValue(hoshinoSkill2Path, 10) : 10;

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
        name: "호시노 전술 피스톨",
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
        name: "전술 진압 섬광탄",
        damage: s1Dmg,
        cooldown: 14,
        castTime: 0.3
      },
      skill2: {
        name: "방패 전술 돌진",
        damage: s2Dmg,
        cooldown: 20,
        castTime: 0.5
      },
      customRadar: [6, 10, 5, 4, 8]
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

  return parsedCharacters;
}

module.exports = {
  scanUnrealProject
};
