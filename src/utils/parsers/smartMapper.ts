import { Character } from '../../types/character';

// 동의어 사전 매핑 테이블 (소문자 및 특수문자 제거 후 비교)
export const STAT_SYNONYMS: Record<string, string[]> = {
  id: ['id', 'characterid', 'charid', '캐릭터id', '코드', 'idx', '식별자'],
  name: ['name', 'charactername', 'charname', '캐릭터명', '이름', '캐릭터이름'],
  position: ['position', 'characterposition', 'pos', '포지션', '역할', '직군', '클래스'],
  hp: ['hp', 'characterhp', 'health', '체력', '생명력', '기본hp', '최대체력'],
  barrier: ['barrier', 'characterbarrier', 'shield', '보호막', '실드', '방어막'],
  speed: ['speed', 'characterspeed', 'spd', '이속', '이동속도', '이동', '기동력'],
  ehpMod: ['ehpmod', 'damagereduction', 'damagered', '피해감소', '피해감소율', '방어율', '방어력'],
  
  damage: ['damage', 'dmg', 'atk', '공격력', '데미지', '대미지', '총알데미지', '총알대미지', '탄환피해', '발당위력'],
  rpm: ['rpm', 'firerate', 'fire_rate', '연사속도', '연사력', '발사속도', '분당발사수'],
  reloadTime: ['reloadtime', 'reload_time', 'rel', '재장전시간', '장전시간', '재장전', '장전'],
  magazine: ['magazine', 'magazinesize', 'magazine_size', 'mag', '탄창', '장탄수', '탄약수', '탄창용량'],
  rangeMin: ['rangemin', 'range_min', '최소사거리', '유효사거리', '최소거리'],
  rangeMax: ['rangemax', 'range_max', '최대사거리', '한계사거리', '최대거리'],
  minDmgRatio: ['mindmgratio', 'min_dmg_ratio', '최소대미지비율', '최소피해비율', '거리감쇄최소치'],
  headshotMultiplier: ['headshotmultiplier', 'headshot_multiplier', 'headmul', '헤드배율', '헤드샷배율', '치명타배율'],
  
  skill1Name: ['skill1', 'skill_1', 'characterskill1', '스킬1', '스킬1이름', '액티브1'],
  skill1Dmg: ['skill1damage', 'skill1dmg', 'skill_1_damage', '스킬1대미지', '스킬1데미지', '스킬1피해', '폭발피해', '스킬1위력'],
  skill2Name: ['skill2', 'skill_2', 'characterskill2', '스킬2', '스킬2이름', '액티브2'],
  skill2Dmg: ['skill2damage', 'skill2dmg', 'skill_2_damage', '스킬2대미지', '스킬2데미지', '스킬2피해', '스킬2위력']
};

/**
 * 문자열을 비교하기 쉽게 정규화 (공백, 밑줄, 하이픈 제거 및 소문자 변환)
 */
export function normalizeKey(key: string): string {
  return String(key).toLowerCase().replace(/[\s_\-\.\(\)\[\]]/g, '');
}

/**
 * 원본 객체의 키 목록 중에서 특정 타겟 스탯에 매칭되는 가장 유력한 키 탐색
 */
export function findMatchingKey(targetStat: string, availableKeys: string[]): string | null {
  const synonyms = STAT_SYNONYMS[targetStat] || [targetStat];
  const normalizedKeys = availableKeys.map(k => ({ original: k, normalized: normalizeKey(k) }));

  for (const syn of synonyms) {
    const normSyn = normalizeKey(syn);
    const match = normalizedKeys.find(k => k.normalized === normSyn || k.normalized.includes(normSyn));
    if (match) {
      return match.original;
    }
  }
  return null;
}

/**
 * 임의의 키-값 행(Row) 데이터를 표준 Character 모델 객체로 매핑
 */
export function mapRowToCharacter(row: Record<string, any>, customMapping?: Record<string, string>): Character {
  const keys = Object.keys(row);

  const getKeyVal = (targetStat: string, defaultVal: any = 0) => {
    // 1. 사용자 커스텀 수동 매핑 확인
    if (customMapping && customMapping[targetStat] && row[customMapping[targetStat]] !== undefined) {
      const v = row[customMapping[targetStat]];
      return typeof defaultVal === 'number' ? parseNumber(v, defaultVal) : String(v || defaultVal);
    }
    // 2. 스마트 동의어 사전 매핑
    const matchedKey = findMatchingKey(targetStat, keys);
    if (matchedKey && row[matchedKey] !== undefined) {
      const v = row[matchedKey];
      return typeof defaultVal === 'number' ? parseNumber(v, defaultVal) : String(v || defaultVal);
    }
    return defaultVal;
  };

  const id = String(getKeyVal('id', `char_${Date.now()}_${Math.floor(Math.random() * 1000)}`)).trim();
  const name = String(getKeyVal('name', id || '미확인 유닛')).trim();
  const position = String(getKeyVal('position', '스트라이커')).trim();

  const hp = getKeyVal('hp', 100);
  const barrier = getKeyVal('barrier', 0);
  const speed = getKeyVal('speed', 500);
  let ehpMod = getKeyVal('ehpMod', 0);
  // 피해감소율이 50 등 퍼센트(%)로 들어왔을 경우 0.5로 정규화
  if (ehpMod > 1) ehpMod = ehpMod / 100;

  const damage = getKeyVal('damage', 20);
  const rpm = getKeyVal('rpm', 300);
  const reloadTime = getKeyVal('reloadTime', 1.0);
  const magazine = getKeyVal('magazine', 30);
  const rangeMin = getKeyVal('rangeMin', 20);
  const rangeMax = getKeyVal('rangeMax', 50);
  let minDmgRatio = getKeyVal('minDmgRatio', 0.4);
  if (minDmgRatio > 1) minDmgRatio = minDmgRatio / 100;
  const headshotMultiplier = getKeyVal('headshotMultiplier', 2.0);

  const skill1Name = String(getKeyVal('skill1Name', '스킬 1')).trim();
  const skill1Dmg = getKeyVal('skill1Dmg', 0);

  const skill2Name = String(getKeyVal('skill2Name', '스킬 2')).trim();
  const skill2Dmg = getKeyVal('skill2Dmg', 0);

  return {
    id,
    name,
    position,
    hp,
    barrier,
    speed,
    ehpMod,
    damage,
    rpm,
    reloadTime,
    magazine,
    rangeMin,
    rangeMax,
    minDmgRatio,
    headshotMultiplier,
    isClosedChamber: true,
    skill1: {
      name: skill1Name,
      damage: skill1Dmg,
      castTime: 0
    },
    skill2: {
      name: skill2Name,
      damage: skill2Dmg,
      castTime: 0
    }
  };
}

function parseNumber(val: any, fallback: number = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (!val) return fallback;
  const cleaned = String(val).replace(/[^0-9\.\-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}
