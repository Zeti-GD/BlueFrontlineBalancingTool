import { Character } from '../types/character';

export const INITIAL_CHARACTERS: Character[] = [
  {
    id: "Aru",
    name: "리쿠하치마 아루",
    position: "스트라이커",
    weaponName: "와인레드・어드마이어",
    weaponType: "SR",
    hp: 100,
    barrier: 0,
    speed: 550,
    damage: 80,
    rpm: 35,
    reloadTime: 1.5,
    magazine: 10,
    ehpMod: 0.5,
    rangeMin: 40,
    rangeMax: 80,
    minDmgRatio: 0.5,
    headshotMultiplier: 2.5,
    isClosedChamber: true,
    skill1: {
      name: "하드보일드 샷 (폭발탄)",
      damage: 80,
      cooldown: 15,
      castTime: 0.8
    },
    skill2: {
      name: "감전 폭탄",
      damage: 40,
      cooldown: 20,
      castTime: 0.5
    },
    customRadar: [9, 3, 4, 8, 2]
  },
  {
    id: "Izuna",
    name: "쿠다 이즈나",
    position: "스트라이커",
    weaponName: "이즈나류 인법 SMG",
    weaponType: "SMG",
    hp: 100,
    barrier: 0,
    speed: 550,
    damage: 22,
    rpm: 470,
    reloadTime: 0.8,
    magazine: 30,
    ehpMod: 0,
    rangeMin: 15,
    rangeMax: 35,
    minDmgRatio: 0.3,
    headshotMultiplier: 1.8,
    isClosedChamber: true,
    skill1: {
      name: "비기! 벚꽃 연막술",
      damage: 35,
      cooldown: 12,
      castTime: 0.2
    },
    skill2: {
      name: "수리검 연타",
      damage: 55,
      cooldown: 18,
      castTime: 0.4
    },
    customRadar: [6, 4, 10, 7, 6]
  },
  {
    id: "Mina",
    name: "코노에 미나",
    position: "스트라이커",
    weaponName: "현무상회 커스텀 SG",
    weaponType: "SG",
    hp: 250,
    barrier: 0,
    speed: 500,
    damage: 7.5,
    rpm: 300,
    reloadTime: 1.0,
    magazine: 30,
    ehpMod: 0.3,
    rangeMin: 20,
    rangeMax: 45,
    minDmgRatio: 0.4,
    headshotMultiplier: 2.0,
    isClosedChamber: false,
    skill1: {
      name: "제압 사격",
      damage: 50,
      cooldown: 14,
      castTime: 0.5
    },
    skill2: {
      name: "연막 투척",
      damage: 20,
      cooldown: 22,
      castTime: 0.3
    },
    customRadar: [7, 8, 5, 5, 6]
  },
  {
    id: "Serina",
    name: "스미 세리나",
    position: "스페셜",
    weaponName: "구호용 피스톨",
    weaponType: "HG",
    hp: 150,
    barrier: 50,
    speed: 500,
    damage: 6,
    rpm: 500,
    reloadTime: 1.0,
    magazine: 30,
    ehpMod: 0,
    rangeMin: 15,
    rangeMax: 30,
    minDmgRatio: 0.5,
    headshotMultiplier: 1.5,
    isClosedChamber: true,
    skill1: {
      name: "구호 팩 투척",
      damage: 0,
      cooldown: 15,
      castTime: 0.3
    },
    skill2: {
      name: "응급 세척",
      damage: 15,
      cooldown: 25,
      castTime: 0.5
    },
    customRadar: [4, 5, 4, 3, 10]
  },
  {
    id: "Shiroko",
    name: "스나오오카미 시로코",
    position: "스트라이커",
    weaponName: "WHITE FANG 465",
    weaponType: "AR",
    hp: 150,
    barrier: 0,
    speed: 500,
    damage: 13,
    rpm: 730,
    reloadTime: 0.75,
    magazine: 30,
    ehpMod: 0,
    rangeMin: 25,
    rangeMax: 55,
    minDmgRatio: 0.4,
    headshotMultiplier: 2.0,
    isClosedChamber: true,
    skill1: {
      name: "드론 소환: 화력 지원",
      damage: 65,
      cooldown: 16,
      castTime: 0.5
    },
    skill2: {
      name: "유탄 발사",
      damage: 45,
      cooldown: 20,
      castTime: 0.4
    },
    customRadar: [8, 5, 7, 6, 5]
  },
  {
    id: "Hoshino",
    name: "타카나시 호시노",
    position: "탱커",
    weaponName: "아이 오브 호루스 (산탄총)",
    weaponType: "SG",
    hp: 175,
    barrier: 50,
    speed: 500,
    damage: 11,
    rpm: 80,
    reloadTime: 1.8,
    magazine: 8,
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
      damage: 15,
      rpm: 300,
      reloadTime: 1.0,
      magazine: 12,
      rangeMin: 15,
      rangeMax: 40,
      minDmgRatio: 0.4,
      headshotMultiplier: 1.75
    },
    skill1: {
      name: "전술 진압 섬광탄",
      damage: 10,
      cooldown: 14,
      castTime: 0.3
    },
    skill2: {
      name: "방패 돌진 제압",
      damage: 10,
      cooldown: 20,
      castTime: 0.5
    },
    customRadar: [6, 10, 5, 4, 8]
  }
];
