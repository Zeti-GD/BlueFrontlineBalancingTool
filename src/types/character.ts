export interface SkillInfo {
  name: string;
  damage: number;
  cooldown?: number;
  castTime?: number;
  description?: string;
}

export interface WeaponStats {
  name?: string;
  type?: string;
  damage: number;
  rpm: number;
  reloadTime: number;
  magazine: number;
  rangeMin: number;
  rangeMax: number;
  minDmgRatio: number;
  headshotMultiplier: number;
  pelletCount?: number; // 샷건 팰릿 개수 (기본 1)
}

export interface Character {
  id: string;
  name: string;
  position: string;
  weaponName?: string;
  weaponType?: string;
  
  // 기본 생존 스탯
  hp: number;
  barrier: number; // 실드 (보호막)
  speed: number;
  ehpMod: number; // 피해 감소율 (0 ~ 0.95)

  // 주무기 1 스탯
  damage: number;
  rpm: number;
  reloadTime: number;
  magazine: number;
  rangeMin: number;
  rangeMax: number;
  minDmgRatio: number;
  headshotMultiplier: number;
  isClosedChamber: boolean;
  pelletCount?: number; // 샷건 팰릿 개수 (기본 1)

  // 2번째 무기 (보조무기 / 듀얼 무기 대응)
  hasSecondaryWeapon?: boolean;
  secondaryWeapon?: WeaponStats;
  activeWeaponIndex?: 0 | 1; // 0: 주무기 1, 1: 주무기 2

  // 스킬 정보
  skill1: SkillInfo;
  skill2: SkillInfo;

  customRadar?: [number, number, number, number, number];
}

export interface CombatEnv {
  targetHp: number;     // 기준 적 체력 (기본 200)
  targetShield: number; // 기준 적 실드/보호막 (기본 0, 최대 500)
  distance: number;     // 교전 거리 (m, 기본 15)
  headshotRate: number; // 헤드샷 적중률 (%, 기본 20)
}

export interface TTKResult {
  pureTtk: number;         // 1. 순수 평타 TTK
  skill1ComboTtk: number;  // 2. 스킬 1 콤보 TTK
  skill2ComboTtk: number;  // 3. 스킬 2 콤보 TTK
  fullComboTtk: number;    // 4. 풀 콤보 TTK

  effectiveDmgPerBullet: number;
  shotsToKillPure: number;
  reloadsPure: number;
  
  effectiveHp: number;     // 실질 생존력 (HP + 실드 반영 EHP)
  dps: number;
  cycleDps: number;

  radar: {
    offense: number;
    survival: number;
    mobility: number;
    difficulty: number;
    utility: number;
  };
}

export interface DuelSideStats {
  id: string;
  name: string;
  targetEffectiveHp: number; // 상대방의 EHP
  effectiveBulletDmg: number;
  pureTtk: number;
  fullComboTtk: number;
  shotsToKill: number;
  reloads: number;
  dps: number;
}

export interface DuelResult {
  charA: DuelSideStats;
  charB: DuelSideStats;
  winnerId: string | 'draw';
  winnerName: string;
  timeDiff: number; // 승자가 얼마나 더 빨리 처치하는지 (초)
  winnerRemainingHp: number; // 승자 생존 체력
  winnerRemainingHpRatio: number; // 잔여 체력 백분율 (%)
  advantageReason: string; // 승리 핵심 원인 (화력/체급/사거리 등)
}
