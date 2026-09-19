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

export function getActiveSkill2(char: Character) {
  if (char.skill2?.variants && char.skill2.variants.length > 0) {
    const activeIdx = char.activeWeaponIndex || 0;
    const variant = char.skill2.variants.find(v => v.modeIndex === activeIdx) || char.skill2.variants[0];
    return {
      ...char.skill2,
      name: variant.name,
      damage: variant.damage,
      heal: variant.heal,
      cooldown: variant.cooldown ?? char.skill2.cooldown,
      castTime: variant.castTime ?? char.skill2.castTime,
      description: variant.description ?? char.skill2.description,
      assetName: variant.assetName ?? char.skill2.assetName
    };
  }
  return char.skill2;
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

export function getSkillType(skill?: { damage?: number; heal?: number }): 'damage' | 'heal' | 'hybrid' | 'utility' {
  const dmg = Math.max(0, skill?.damage || 0);
  const heal = Math.max(0, skill?.heal || 0);
  if (dmg > 0 && heal > 0) return 'hybrid';
  if (dmg > 0) return 'damage';
  if (heal > 0) return 'heal';
  return 'utility';
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

  const skill1Dmg = Math.max(0, char.skill1?.damage || 0);
  const skill1Heal = Math.max(0, char.skill1?.heal || 0);
  const s1CastTime = char.skill1?.castTime || 0;
  const s1Type = getSkillType(char.skill1);

  const activeS2 = getActiveSkill2(char);
  const skill2Dmg = Math.max(0, activeS2?.damage || 0);
  const skill2Heal = Math.max(0, activeS2?.heal || 0);
  const s2CastTime = activeS2?.castTime || 0;
  const s2Type = getSkillType(activeS2);

  const hasDamageSkill1 = skill1Dmg > 0;
  const hasDamageSkill2 = skill2Dmg > 0;
  const hasAnyDamageSkill = hasDamageSkill1 || hasDamageSkill2;
  const totalSelfHeal = skill1Heal + skill2Heal;

  // 2. 스킬 1 콤보 TTK: 대미지 스킬일 때만 콤보 계산, 유틸/힐 스킬이면 순수 평타 유지 (지연 왜곡 방지)
  let skill1ComboTtk = pureResult.time;
  if (hasDamageSkill1) {
    const remHpS1 = Math.max(0, totalTargetHealth - skill1Dmg);
    const s1GunTime = remHpS1 > 0 
      ? calculateGunTimeToKill(remHpS1, effectiveBulletDmg, w.rpm, w.reloadTime, w.magazine, w.isClosedChamber).time 
      : 0;
    skill1ComboTtk = Number((s1CastTime + s1GunTime).toFixed(2));
  }

  // 3. 스킬 2 콤보 TTK: 대미지 스킬일 때만 콤보 계산, 유틸/힐 스킬이면 순수 평타 유지
  let skill2ComboTtk = pureResult.time;
  if (hasDamageSkill2) {
    const remHpS2 = Math.max(0, totalTargetHealth - skill2Dmg);
    const s2GunTime = remHpS2 > 0 
      ? calculateGunTimeToKill(remHpS2, effectiveBulletDmg, w.rpm, w.reloadTime, w.magazine, w.isClosedChamber).time 
      : 0;
    skill2ComboTtk = Number((s2CastTime + s2GunTime).toFixed(2));
  }

  // 4. 풀 콤보 TTK:
  // - 둘 다 비대미지 스킬이면 순수 평타 TTK 유지
  // - 스킬 1만 대미지 스킬이면 스킬 1 콤보 TTK 적용
  // - 스킬 2만 대미지 스킬이면 스킬 2 콤보 TTK 적용
  // - 둘 다 대미지 스킬이면 둘 다 합산한 풀 콤보 TTK 적용
  let fullComboTtk = pureResult.time;
  if (hasDamageSkill1 && hasDamageSkill2) {
    const comboDmg = skill1Dmg + skill2Dmg;
    const comboCastTime = s1CastTime + s2CastTime;
    const remHpFull = Math.max(0, totalTargetHealth - comboDmg);
    const fullGunTime = remHpFull > 0
      ? calculateGunTimeToKill(remHpFull, effectiveBulletDmg, w.rpm, w.reloadTime, w.magazine, w.isClosedChamber).time
      : 0;
    fullComboTtk = Number((comboCastTime + fullGunTime).toFixed(2));
  } else if (hasDamageSkill1) {
    fullComboTtk = skill1ComboTtk;
  } else if (hasDamageSkill2) {
    fullComboTtk = skill2ComboTtk;
  }

  // 5. 실질 교전 TTK: 대미지 스킬이 있으면 최적 콤보 TTK, 없으면 순수 평타 TTK
  const effectiveCombatTtk = hasAnyDamageSkill ? fullComboTtk : pureResult.time;

  // 실질 생존력 (EHP)
  const ehpModCapped = Math.min(0.95, Math.max(0, char.ehpMod || 0));
  const effectiveHp = Math.round(((char.hp || 0) + (char.barrier || 0)) / (1 - ehpModCapped));

  // DPS 계산
  const burstDps = Number(((w.rpm / 60) * effectiveBulletDmg).toFixed(1));
  const magTotalDmg = (w.magazine + (w.isClosedChamber ? 1 : 0)) * effectiveBulletDmg;
  const magEmptyTime = (w.magazine / (w.rpm / 60)) + w.reloadTime;
  const cycleDps = Number((magTotalDmg / magEmptyTime).toFixed(1));

  // 레이더 지표 점수 (0 ~ 10 점수 표준화) - 치유량(heal)과 유틸기 가산 반영
  const radar = {
    offense: Number(Math.max(1, Math.min(10, (2.8 - pureResult.time) * 3.2 + (effectiveBulletDmg / 22) + (hasAnyDamageSkill ? 0.5 : 0))).toFixed(1)),
    survival: Number(Math.max(1, Math.min(10, (effectiveHp + totalSelfHeal * 1.2) / 45)).toFixed(1)),
    mobility: Number(Math.max(1, Math.min(10, (char.speed || 500) / 75 + (s1Type === 'utility' ? 1.0 : 0))).toFixed(1)),
    difficulty: Number(Math.max(1, Math.min(10, (char.rpm / 120) + (char.rangeMax / 25))).toFixed(1)),
    utility: Number(Math.max(1, Math.min(10, ((char.barrier || 0) / 30) + (totalSelfHeal / 25) + (s1Type !== 'damage' ? 2.5 : 1) + (s2Type !== 'damage' ? 2.5 : 1))).toFixed(1))
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
    effectiveCombatTtk,
    skill1Type: s1Type,
    skill2Type: s2Type,
    hasAnyDamageSkill,
    totalSelfHeal,
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
 * 캐릭터 A와 B가 서로를 타겟으로 지정하여 각자의 실질 체력(EHP)과 자가 치유량(Heal), 방어율, 거리 감쇄, 팰릿 수를 상호 적용
 * 대미지 스킬을 보유한 대상만 스킬 콤보 TTK로 공격하고, 미보유 대상은 순수 평타 TTK로 공정하게 결투 진행
 */
export function simulateDuel(charA: Character, charB: Character, env: CombatEnv): DuelResult {
  // A의 생존 EHP 및 자가 치유 합산 실질 방어선
  const ehpModA = Math.min(0.95, Math.max(0, charA.ehpMod || 0));
  const ehpModB = Math.min(0.95, Math.max(0, charB.ehpMod || 0));

  const s2A = getActiveSkill2(charA);
  const s2B = getActiveSkill2(charB);
  const healA = Math.max(0, charA.skill1?.heal || 0) + Math.max(0, s2A?.heal || 0);
  const healB = Math.max(0, charB.skill1?.heal || 0) + Math.max(0, s2B?.heal || 0);

  // 상대방이 꺾어야 하는 총 유효 체급 (체력 + 실드 + 힐량 반영)
  const targetEhpB = Math.round(((charB.hp || 0) + (charB.barrier || 0) + healB) / (1 - ehpModB));
  const targetEhpA = Math.round(((charA.hp || 0) + (charA.barrier || 0) + healA) / (1 - ehpModA));

  // A가 B를 공격할 때의 TTK 계산 (B의 실질 EHP가 타겟 HP)
  const envForA: CombatEnv = {
    ...env,
    targetHp: targetEhpB,
    targetShield: 0
  };
  const resA = analyzeCharacter(charA, envForA);

  // B가 A를 공격할 때의 TTK 계산 (A의 실질 EHP가 타겟 HP)
  const envForB: CombatEnv = {
    ...env,
    targetHp: targetEhpA,
    targetShield: 0
  };
  const resB = analyzeCharacter(charB, envForB);

  // 공정 비교: 각 캐릭터가 보유한 유효 공격 수단의 실질 교전 TTK로 승패 판정
  const ttkA = resA.effectiveCombatTtk;
  const ttkB = resB.effectiveCombatTtk;

  const timeDiff = Math.abs(ttkA - ttkB);
  let winnerId: string | 'draw' = 'draw';
  let winnerName = '무승부 (동귀어진)';
  let winnerRemainingHp = 0;
  let winnerRemainingHpRatio = 0;
  let advantageReason = '양측 화력과 생존력이 거의 일치하여 동시 타격 가능성이 큽니다.';

  // 공격 방식 라벨 결정
  const getMethodLabel = (res: TTKResult) => {
    if (!res.hasAnyDamageSkill) return '순수 평타 (비대미지 스킬군)';
    if (res.skill1Type === 'damage' && res.skill2Type === 'damage') return '풀 콤보 (스킬 1+2)';
    if (res.skill1Type === 'damage') return '스킬 1 콤보';
    return '스킬 2 콤보';
  };

  const methodA = getMethodLabel(resA);
  const methodB = getMethodLabel(resB);

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

    if (healA > 0 && targetEhpA > targetEhpB) {
      advantageReason = `${charA.name}의 치유력(힐 +${healA})과 탄탄한 유지력으로 상대 화력을 흡수하고 승리`;
    } else if (resA.hasAnyDamageSkill && !resB.hasAnyDamageSkill && timeDiff >= 0.3) {
      advantageReason = `${charA.name}의 강력한 액티브 스킬 콤보로 선제 결정타를 입혀 제압`;
    } else if (timeDiff >= 0.5 && resA.dps > resB.dps * 1.25) {
      advantageReason = `${charA.name}의 압도적인 지속 화력(DPS ${resA.dps})으로 초전 박살`;
    } else if (targetEhpA > targetEhpB * 1.25) {
      advantageReason = `${charA.name}의 단단한 체급(EHP ${targetEhpA})과 실드로 공격을 버텨내고 승리`;
    } else {
      advantageReason = `0.${Math.round(timeDiff * 100)}초 차이의 신속한 공격 연계 속도 우위`;
    }
  } else {
    winnerId = charB.id;
    winnerName = charB.name;
    // A가 B에게 ttkB 동안 가한 피해량
    const dmgTaken = Math.min(targetEhpB, resA.dps * ttkB);
    winnerRemainingHp = Math.max(0, Math.round(targetEhpB - dmgTaken));
    winnerRemainingHpRatio = Math.round((winnerRemainingHp / targetEhpB) * 100);

    if (healB > 0 && targetEhpB > targetEhpA) {
      advantageReason = `${charB.name}의 치유력(힐 +${healB})과 자가 회복력으로 공세를 버텨내며 역전`;
    } else if (resB.hasAnyDamageSkill && !resA.hasAnyDamageSkill && timeDiff >= 0.3) {
      advantageReason = `${charB.name}의 스킬 폭딜 콤보가 적중하여 신속 제압`;
    } else if (timeDiff >= 0.5 && resB.dps > resA.dps * 1.25) {
      advantageReason = `${charB.name}의 강력한 지속 화력(DPS ${resB.dps})으로 제압`;
    } else if (targetEhpB > targetEhpA * 1.25) {
      advantageReason = `${charB.name}의 우수한 체급(EHP ${targetEhpB})으로 피해를 흡수하며 승리`;
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
      effectiveCombatTtk: ttkA,
      attackMethod: methodA,
      hasDamageSkill: resA.hasAnyDamageSkill,
      totalHeal: healA,
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
      effectiveCombatTtk: ttkB,
      attackMethod: methodB,
      hasDamageSkill: resB.hasAnyDamageSkill,
      totalHeal: healB,
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
