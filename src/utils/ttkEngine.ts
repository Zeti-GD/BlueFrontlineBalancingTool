import { Character, CombatEnv, TTKResult, DuelResult } from '../types/character';

export function getActiveWeapon(char: Character) {
  if (char.activeWeaponIndex === 1 && char.hasSecondaryWeapon && char.secondaryWeapon) {
    return {
      name: char.secondaryWeapon.name,
      type: char.secondaryWeapon.type,
      damage: char.secondaryWeapon.damage,
      rpm: char.secondaryWeapon.rpm,
      reloadTime: char.secondaryWeapon.reloadTime,
      magazine: char.secondaryWeapon.magazine,
      rangeMin: char.secondaryWeapon.rangeMin,
      rangeMax: char.secondaryWeapon.rangeMax,
      minDmgRatio: char.secondaryWeapon.minDmgRatio,
      headshotMultiplier: char.secondaryWeapon.headshotMultiplier,
      isClosedChamber: false,
      pelletCount: char.secondaryWeapon.pelletCount || 1
    };
  }
  return {
    name: char.weaponName || '주무기',
    type: char.weaponType || 'AR',
    damage: char.damage,
    rpm: char.rpm,
    reloadTime: char.reloadTime,
    magazine: char.magazine,
    rangeMin: char.rangeMin,
    rangeMax: char.rangeMax,
    minDmgRatio: char.minDmgRatio,
    headshotMultiplier: char.headshotMultiplier,
    isClosedChamber: char.isClosedChamber,
    pelletCount: char.pelletCount || 1
  };
}

export function getRangedBaseDamage(char: Character, distance: number): number {
  const w = getActiveWeapon(char);
  const pellets = Math.max(1, w.pelletCount || 1);
  const minRange = w.rangeMin || 0;
  const maxRange = Math.max(minRange + 1, w.rangeMax || (minRange + 50));
  const rawType = (w.type || char.weaponType || '').toUpperCase();

  // 총기군별(WeaponType) 현실적 사거리 감쇄 계수
  let effectiveMinRatio = w.minDmgRatio ?? 0.4;
  if (rawType === 'SMG') {
    effectiveMinRatio = Math.min(effectiveMinRatio, 0.2); // SMG는 원거리 최소 20%
  } else if (rawType === 'SG') {
    effectiveMinRatio = Math.min(effectiveMinRatio, 0.15); // 산탄총은 원거리 15%
  } else if (rawType === 'AR') {
    effectiveMinRatio = Math.max(effectiveMinRatio, 0.4); // AR은 원거리에서도 40% 유지
  } else if (rawType === 'SR') {
    effectiveMinRatio = Math.max(effectiveMinRatio, 0.6); // SR은 60% 유지
  }

  if (pellets > 1) {
    // 샷건 (산탄총): 1발당 펠릿(pelletCount) 총합 대미지 및 거리별 탄퍼짐(Spread) 감쇄
    const fullShotDamage = w.damage * pellets;
    if (distance <= (minRange || 10)) {
      return fullShotDamage;
    }
    if (distance >= maxRange) {
      const overFactor = Math.min(1.0, (distance - maxRange) / 20);
      return Math.max(fullShotDamage * 0.05, fullShotDamage * effectiveMinRatio * (1 - overFactor * 0.6));
    }
    const dropFactor = (distance - (minRange || 10)) / (maxRange - (minRange || 10));
    return fullShotDamage * (1 - dropFactor * (1 - effectiveMinRatio));
  }

  // 일반 단일 탄환 무기 (AR, SMG, HG, SR 등)
  if (distance <= minRange) {
    return w.damage;
  }

  if (distance <= maxRange) {
    const dropFactor = (distance - minRange) / (maxRange - minRange);
    return w.damage * (1 - dropFactor * (1 - effectiveMinRatio));
  }

  // 최대 사거리(maxRange) 초과 구간:
  // SMG는 최대 사거리 이후 운동에너지가 급락하여 45m 이상에서는 견제타 수준으로 급감
  if (rawType === 'SMG') {
    const overDistance = distance - maxRange;
    const overDrop = Math.min(1.0, overDistance / 15);
    const baseAtMax = w.damage * effectiveMinRatio;
    return Math.max(w.damage * 0.1, baseAtMax * (1 - overDrop * 0.5));
  }

  return w.damage * effectiveMinRatio;
}

export function getEffectiveDamagePerBullet(char: Character, distance: number, headshotRatePercent: number): number {
  const w = getActiveWeapon(char);
  const baseDmg = getRangedBaseDamage(char, distance);
  const headRate = Math.max(0, Math.min(100, headshotRatePercent)) / 100;
  const headMultiplier = Math.max(1.0, w.headshotMultiplier || 2.0);

  const bodyDmg = baseDmg * (1 - headRate);
  const headDmg = baseDmg * headMultiplier * headRate;
  return Math.max(0.1, bodyDmg + headDmg);
}

export function calculateGunTimeToKill(
  targetHealthTotal: number,
  effectiveBulletDmg: number,
  rpm: number,
  reloadTime: number,
  magSize: number,
  isClosedChamber: boolean = false
): { time: number; shots: number; reloads: number } {
  if (targetHealthTotal <= 0) {
    return { time: 0, shots: 0, reloads: 0 };
  }

  const validRpm = Math.max(1, rpm);
  const effectiveMag = Math.max(1, magSize + (isClosedChamber ? 1 : 0));
  const shots = Math.ceil(targetHealthTotal / effectiveBulletDmg);

  if (shots <= 1) {
    return { time: 0, shots: 1, reloads: 0 };
  }

  const fireIntervalSec = 60 / validRpm;
  const reloads = Math.floor((shots - 1) / effectiveMag);
  const time = (shots - 1) * fireIntervalSec + reloads * reloadTime;

  return {
    time: Number(time.toFixed(2)),
    shots,
    reloads
  };
}

export function analyzeCharacter(char: Character, env: CombatEnv): TTKResult {
  const w = getActiveWeapon(char);
  const effectiveBulletDmg = getEffectiveDamagePerBullet(char, env.distance, env.headshotRate);
  const totalTargetHealth = Math.max(1, (env.targetHp || 200) + (env.targetShield || 0));

  // 1. 순수 평타 TTK (소수점 2자리 0.xx)
  const pureResult = calculateGunTimeToKill(
    totalTargetHealth,
    effectiveBulletDmg,
    w.rpm,
    w.reloadTime,
    w.magazine,
    w.isClosedChamber
  );

  // 2. 스킬 1 콤보 TTK (소수점 2자리 0.xx)
  const skill1Dmg = Math.max(0, char.skill1?.damage || 0);
  const s1CastTime = char.skill1?.castTime || 0;
  const remHpS1 = Math.max(0, totalTargetHealth - skill1Dmg);
  const s1GunTime = remHpS1 > 0 
    ? calculateGunTimeToKill(remHpS1, effectiveBulletDmg, w.rpm, w.reloadTime, w.magazine, w.isClosedChamber).time 
    : 0;
  const skill1ComboTtk = Number((s1CastTime + s1GunTime).toFixed(2));

  // 3. 스킬 2 콤보 TTK (소수점 2자리 0.xx)
  const skill2Dmg = Math.max(0, char.skill2?.damage || 0);
  const s2CastTime = char.skill2?.castTime || 0;
  const remHpS2 = Math.max(0, totalTargetHealth - skill2Dmg);
  const s2GunTime = remHpS2 > 0 
    ? calculateGunTimeToKill(remHpS2, effectiveBulletDmg, w.rpm, w.reloadTime, w.magazine, w.isClosedChamber).time 
    : 0;
  const skill2ComboTtk = Number((s2CastTime + s2GunTime).toFixed(2));

  // 4. 풀 콤보 TTK (소수점 2자리 0.xx)
  const comboDmg = skill1Dmg + skill2Dmg;
  const comboCastTime = s1CastTime + s2CastTime;
  const remHpFull = Math.max(0, totalTargetHealth - comboDmg);
  const fullGunTime = remHpFull > 0
    ? calculateGunTimeToKill(remHpFull, effectiveBulletDmg, w.rpm, w.reloadTime, w.magazine, w.isClosedChamber).time
    : 0;
  const fullComboTtk = Number((comboCastTime + fullGunTime).toFixed(2));

  // 실질 생존력 (EHP)
  const ehpModCapped = Math.min(0.95, Math.max(0, char.ehpMod || 0));
  const effectiveHp = Math.round(((char.hp || 0) + (char.barrier || 0)) / (1 - ehpModCapped));

  // DPS 계산
  const burstDps = Number(((w.rpm / 60) * effectiveBulletDmg).toFixed(1));
  const magTotalDmg = (w.magazine + (w.isClosedChamber ? 1 : 0)) * effectiveBulletDmg;
  const magEmptyTime = (w.magazine / (w.rpm / 60)) + w.reloadTime;
  const cycleDps = Number((magTotalDmg / magEmptyTime).toFixed(1));

  // 레이더 지표 점수 (0 ~ 10 점수 표준화)
  const radar = {
    offense: Number(Math.max(1, Math.min(10, (2.8 - pureResult.time) * 3.2 + (effectiveBulletDmg / 22))).toFixed(1)),
    survival: Number(Math.max(1, Math.min(10, effectiveHp / 45)).toFixed(1)),
    mobility: Number(Math.max(1, Math.min(10, (char.speed || 500) / 75)).toFixed(1)),
    difficulty: Number(Math.max(1, Math.min(10, (char.rpm / 120) + (char.rangeMax / 25))).toFixed(1)),
    utility: Number(Math.max(1, Math.min(10, ((char.barrier || 0) / 30) + (skill1Dmg > 0 ? 3.5 : 1) + (skill2Dmg > 0 ? 3.5 : 1))).toFixed(1))
  };

  if (char.customRadar && char.customRadar.length === 5) {
    radar.offense = char.customRadar[0];
    radar.survival = char.customRadar[1];
    radar.mobility = char.customRadar[2];
    radar.difficulty = char.customRadar[3];
    radar.utility = char.customRadar[4];
  }

  return {
    pureTtk: pureResult.time,
    skill1ComboTtk,
    skill2ComboTtk,
    fullComboTtk,
    effectiveDmgPerBullet: Number(effectiveBulletDmg.toFixed(1)),
    shotsToKillPure: pureResult.shots,
    reloadsPure: pureResult.reloads,
    effectiveHp,
    dps: burstDps,
    cycleDps,
    radar
  };
}

/**
 * 1v1 상호 맞대결 (PvP Duel) 시뮬레이션
 * 캐릭터 A와 B가 서로를 타겟으로 지정하여 각자의 실질 체력(EHP)과 방어율, 거리 감쇄, 팰릿 수를 상호 적용
 */
export function simulateDuel(charA: Character, charB: Character, env: CombatEnv): DuelResult {
  // A의 생존 EHP 및 B의 생존 EHP
  const ehpModA = Math.min(0.95, Math.max(0, charA.ehpMod || 0));
  const ehpModB = Math.min(0.95, Math.max(0, charB.ehpMod || 0));

  const targetEhpB = Math.round(((charB.hp || 0) + (charB.barrier || 0)) / (1 - ehpModB));
  const targetEhpA = Math.round(((charA.hp || 0) + (charA.barrier || 0)) / (1 - ehpModA));

  // A가 B를 공격할 때의 TTK 계산 (B의 EHP가 타겟 HP)
  const envForA: CombatEnv = {
    ...env,
    targetHp: targetEhpB,
    targetShield: 0
  };
  const resA = analyzeCharacter(charA, envForA);

  // B가 A를 공격할 때의 TTK 계산 (A의 EHP가 타겟 HP)
  const envForB: CombatEnv = {
    ...env,
    targetHp: targetEhpA,
    targetShield: 0
  };
  const resB = analyzeCharacter(charB, envForB);

  // 승자 판정 (기본 풀 콤보 TTK 우선 비교, 동일 시 평타 TTK 비교)
  const ttkA = resA.fullComboTtk > 0 ? resA.fullComboTtk : resA.pureTtk;
  const ttkB = resB.fullComboTtk > 0 ? resB.fullComboTtk : resB.pureTtk;

  const timeDiff = Math.abs(ttkA - ttkB);
  let winnerId: string | 'draw' = 'draw';
  let winnerName = '무승부 (동귀어진)';
  let winnerRemainingHp = 0;
  let winnerRemainingHpRatio = 0;
  let advantageReason = '양측 화력과 생존력이 거의 일치하여 동시 타격 가능성이 큽니다.';

  if (timeDiff < 0.05) {
    winnerId = 'draw';
    winnerName = '호각세 (동시 처치)';
  } else if (ttkA < ttkB) {
    winnerId = charA.id;
    winnerName = charA.name;
    // B가 A에게 ttkA 동안 가한 피해량
    const dmgTaken = Math.min(targetEhpA, resB.dps * ttkA);
    winnerRemainingHp = Math.max(0, Math.round(targetEhpA - dmgTaken));
    winnerRemainingHpRatio = Math.round((winnerRemainingHp / targetEhpA) * 100);

    if (timeDiff >= 0.5 && resA.dps > resB.dps * 1.3) {
      advantageReason = `${charA.name}의 압도적인 순간 화력(DPS ${resA.dps})으로 초전 박살`;
    } else if (targetEhpA > targetEhpB * 1.3) {
      advantageReason = `${charA.name}의 단단한 체급(EHP ${targetEhpA})과 실드로 상대 맹공을 버텨내고 승리`;
    } else if (resA.shotsToKillPure < resB.shotsToKillPure) {
      advantageReason = `발당 결정력과 명중 시 타격 피해량 우위로 신속한 제압`;
    } else {
      advantageReason = `0.${Math.round(timeDiff * 100)}초 차이의 근소한 반응/연계 속도 우위`;
    }
  } else {
    winnerId = charB.id;
    winnerName = charB.name;
    // A가 B에게 ttkB 동안 가한 피해량
    const dmgTaken = Math.min(targetEhpB, resA.dps * ttkB);
    winnerRemainingHp = Math.max(0, Math.round(targetEhpB - dmgTaken));
    winnerRemainingHpRatio = Math.round((winnerRemainingHp / targetEhpB) * 100);

    if (timeDiff >= 0.5 && resB.dps > resA.dps * 1.3) {
      advantageReason = `${charB.name}의 강력한 연속 화력(DPS ${resB.dps})으로 신속한 제압`;
    } else if (targetEhpB > targetEhpA * 1.3) {
      advantageReason = `${charB.name}의 우수한 체급(EHP ${targetEhpB})으로 피해를 흡수하며 역전`;
    } else {
      advantageReason = `0.${Math.round(timeDiff * 100)}초 차이의 공격 타이밍 우세`;
    }
  }

  return {
    charA: {
      id: charA.id,
      name: charA.name,
      targetEffectiveHp: targetEhpB,
      effectiveBulletDmg: resA.effectiveDmgPerBullet,
      pureTtk: resA.pureTtk,
      fullComboTtk: resA.fullComboTtk,
      shotsToKill: resA.shotsToKillPure,
      reloads: resA.reloadsPure,
      dps: resA.dps
    },
    charB: {
      id: charB.id,
      name: charB.name,
      targetEffectiveHp: targetEhpA,
      effectiveBulletDmg: resB.effectiveDmgPerBullet,
      pureTtk: resB.pureTtk,
      fullComboTtk: resB.fullComboTtk,
      shotsToKill: resB.shotsToKillPure,
      reloads: resB.reloadsPure,
      dps: resB.dps
    },
    winnerId,
    winnerName,
    timeDiff: Number(timeDiff.toFixed(2)),
    winnerRemainingHp,
    winnerRemainingHpRatio,
    advantageReason
  };
}
