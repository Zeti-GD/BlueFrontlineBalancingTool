import React from 'react';
import { Character } from '../types/character';
import { Download, RotateCcw, Shield, Crosshair, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';

interface SandboxEditorProps {
  char: Character | null;
  onUpdateChar: (updated: Character) => void;
  onResetChar: () => void;
  characters: Character[];
  className?: string;
}

export const SandboxEditor: React.FC<SandboxEditorProps> = ({
  char,
  onUpdateChar,
  onResetChar,
  characters,
  className
}) => {
  if (!char) {
    return (
      <aside className={`bg-[#18181b] p-4 flex items-center justify-center text-gray-500 text-xs font-numeric ${className || 'w-[340px] min-w-[340px] max-w-[340px] border-l border-white/[0.08] shrink-0'}`}>
        수정할 캐릭터를 좌측에서 선택하세요.
      </aside>
    );
  }

  const handleChange = (field: keyof Character, value: any) => {
    onUpdateChar({
      ...char,
      [field]: value
    });
  };

  const handleSkillChange = (skillKey: 'skill1' | 'skill2', field: 'damage' | 'heal' | 'name', value: any) => {
    onUpdateChar({
      ...char,
      [skillKey]: {
        ...char[skillKey],
        [field]: value
      }
    });
  };

  const [editingWeaponIndex, setEditingWeaponIndex] = React.useState<0 | 1>(0);

  const isSec = editingWeaponIndex === 1 && char.hasSecondaryWeapon && char.secondaryWeapon;
  const currentDamage = isSec ? char.secondaryWeapon!.damage : char.damage;
  const currentRpm = isSec ? char.secondaryWeapon!.rpm : char.rpm;
  const currentReload = isSec ? char.secondaryWeapon!.reloadTime : char.reloadTime;
  const currentMag = isSec ? char.secondaryWeapon!.magazine : char.magazine;
  const currentPellets = isSec ? (char.secondaryWeapon?.pelletCount || 1) : (char.pelletCount || 1);

  const handleWeaponChange = (field: 'damage' | 'rpm' | 'reloadTime' | 'magazine' | 'pelletCount', value: number) => {
    if (editingWeaponIndex === 1 && char.hasSecondaryWeapon && char.secondaryWeapon) {
      onUpdateChar({
        ...char,
        secondaryWeapon: {
          ...char.secondaryWeapon,
          [field]: value
        }
      });
    } else {
      onUpdateChar({
        ...char,
        [field]: value
      });
    }
  };

  const toggleSecondaryWeapon = () => {
    if (char.hasSecondaryWeapon) {
      onUpdateChar({
        ...char,
        hasSecondaryWeapon: false,
        activeWeaponIndex: 0
      });
      setEditingWeaponIndex(0);
    } else {
      onUpdateChar({
        ...char,
        hasSecondaryWeapon: true,
        secondaryWeapon: char.secondaryWeapon || {
          name: "보조 무기",
          type: "HG",
          damage: 15,
          rpm: 300,
          reloadTime: 1.0,
          magazine: 12,
          rangeMin: 15,
          rangeMax: 40,
          minDmgRatio: 0.4,
          headshotMultiplier: 1.75,
          pelletCount: 1
        }
      });
      setEditingWeaponIndex(1);
    }
  };

  // 엑셀 내보내기
  const exportToExcel = () => {
    const exportData = characters.map(c => ({
      'ID': c.id,
      '캐릭터명': c.name,
      '포지션': c.position,
      '체력(HP)': c.hp,
      '실드(보호막)': c.barrier || 0,
      '이동속도': c.speed,
      '피해감소율': c.ehpMod,
      '총알대미지': c.damage,
      '팰릿수': c.pelletCount || 1,
      '총발당대미지': c.damage * (c.pelletCount || 1),
      'RPM': c.rpm,
      '재장전시간': c.reloadTime,
      '탄창': c.magazine,
      '최소사거리': c.rangeMin,
      '최대사거리': c.rangeMax,
      '헤드배율': c.headshotMultiplier,
      '보조무기유무': c.hasSecondaryWeapon ? 'Y' : 'N',
      '보조무기명': c.secondaryWeapon?.name || '',
      '보조무기대미지': c.secondaryWeapon?.damage || 0,
      '스킬1이름': c.skill1?.name || '',
      '스킬1대미지': c.skill1?.damage || 0,
      '스킬1치유량': c.skill1?.heal || 0,
      '스킬2이름': c.skill2?.name || '',
      '스킬2대미지': c.skill2?.damage || 0,
      '스킬2치유량': c.skill2?.heal || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '캐릭터_밸런스_데이터');
    XLSX.writeFile(workbook, `Blue_Frontline_Balance_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // JSON 내보내기
  const exportToJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(characters, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `balance_data_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <aside className={`bg-[#18181b] flex flex-col h-full overflow-hidden select-none ${className || 'w-[340px] min-w-[340px] max-w-[340px] border-l border-white/[0.08] shrink-0'}`}>
      {/* 샌드박스 헤더 */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#23232a]/40 shrink-0">
        <div className="min-w-0 pr-2">
          <span className="text-xs font-bold text-white block truncate">
            {char.name} 스탯 조절
          </span>
          <span className="text-[10px] text-[#0d99ff] block truncate">선택된 캐릭터 실시간 편집</span>
        </div>
        <button
          onClick={onResetChar}
          title="기본값으로 초기화"
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 컨트롤 스크롤 영역 (shrink-0 적용으로 세로 축소 시 찌그러짐 원천 방지) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 본체 생존 체급 (HP, 실드, 이속, 피해감소) */}
        <div className="space-y-3 bg-[#23232a] p-3.5 rounded-xl border border-white/[0.08] shrink-0">
          <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#0d99ff] shrink-0" /> 본체 생존 스탯
          </span>

          {/* 체력 (HP) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">기본 체력 (HP)</span>
              <input
                type="number"
                value={char.hp}
                onChange={(e) => handleChange('hp', Number(e.target.value))}
                className="w-16 bg-black/40 border border-white/[0.08] rounded px-1.5 py-0.5 text-right font-numeric text-white text-xs"
              />
            </div>
            <input
              type="range"
              min="50"
              max="1000"
              value={char.hp}
              onChange={(e) => handleChange('hp', Number(e.target.value))}
              className="w-full accent-[#0d99ff] cursor-pointer"
            />
          </div>

          {/* 실드 (보호막) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">실드 (보호막)</span>
              <input
                type="number"
                value={char.barrier || 0}
                onChange={(e) => handleChange('barrier', Number(e.target.value))}
                className="w-16 bg-black/40 border border-white/[0.08] rounded px-1.5 py-0.5 text-right font-numeric text-[#388bfd] text-xs"
              />
            </div>
            <input
              type="range"
              min="0"
              max="500"
              value={char.barrier || 0}
              onChange={(e) => handleChange('barrier', Number(e.target.value))}
              className="w-full accent-[#0d99ff] cursor-pointer"
            />
          </div>

          {/* 이동 속도 */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">이동 속도</span>
              <input
                type="number"
                value={char.speed}
                onChange={(e) => handleChange('speed', Number(e.target.value))}
                className="w-16 bg-black/40 border border-white/[0.08] rounded px-1.5 py-0.5 text-right font-numeric text-white text-xs"
              />
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              value={char.speed}
              onChange={(e) => handleChange('speed', Number(e.target.value))}
              className="w-full accent-[#0d99ff] cursor-pointer"
            />
          </div>

          {/* 피해 감소율 */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">피해 감소율 (%)</span>
              <span className="font-numeric text-white text-xs font-bold">{Math.round((char.ehpMod || 0) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              value={Math.round((char.ehpMod || 0) * 100)}
              onChange={(e) => handleChange('ehpMod', Number(e.target.value) / 100)}
              className="w-full accent-[#0d99ff] cursor-pointer"
            />
          </div>
        </div>

        {/* 무기 화력 스탯 (듀얼 무기 완벽 지원) */}
        <div className="space-y-3 bg-[#23232a] p-3.5 rounded-xl border border-white/[0.08] shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-[#0d99ff] shrink-0" /> 무기 화력 스탯
            </span>
            <button
              onClick={toggleSecondaryWeapon}
              className={`text-[10px] px-2 py-0.5 rounded border transition ${
                char.hasSecondaryWeapon 
                  ? 'bg-[#e5a93c]/20 text-[#e5a93c] border-[#e5a93c]/40' 
                  : 'bg-white/5 text-gray-400 border-white/[0.08] hover:text-white'
              }`}
            >
              {char.hasSecondaryWeapon ? '2번 무기 ON' : '+ 2번 무기 추가'}
            </button>
          </div>

          {/* 무기 1 / 무기 2 탭 스위처 (2번째 무기가 있을 때) */}
          {char.hasSecondaryWeapon && (
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setEditingWeaponIndex(0)}
                className={`flex-1 py-1 text-[11px] font-bold rounded transition flex items-center justify-center gap-1 ${
                  editingWeaponIndex === 0 
                    ? 'bg-[#0d99ff]/20 text-[#388bfd] border border-[#0d99ff]/40 shadow-sm' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>1. {char.weaponName ? char.weaponName.slice(0, 7) : '주무기 1'}</span>
                {char.activeWeaponIndex !== 1 && <span className="text-[9px] px-1 bg-[#0d99ff]/30 text-[#388bfd] rounded">전투용</span>}
              </button>
              <button
                onClick={() => setEditingWeaponIndex(1)}
                className={`flex-1 py-1 text-[11px] font-bold rounded transition flex items-center justify-center gap-1 ${
                  editingWeaponIndex === 1 
                    ? 'bg-[#e5a93c]/20 text-[#e5a93c] border border-[#e5a93c]/40 shadow-sm' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>2. {char.secondaryWeapon?.name ? char.secondaryWeapon.name.slice(0, 7) : '주무기 2'}</span>
                {char.activeWeaponIndex === 1 && <span className="text-[9px] px-1 bg-[#e5a93c]/30 text-[#e5a93c] rounded">전투용</span>}
              </button>
            </div>
          )}

          {/* 현재 편집 중인 무기를 시뮬레이션용 주무기로 장착(스위칭)하는 버튼 */}
          {char.hasSecondaryWeapon && (
            <div className="flex items-center justify-between text-[11px] px-1">
              <span className="text-gray-400">전투 시뮬레이션 무기:</span>
              <button
                onClick={() => onUpdateChar({ ...char, activeWeaponIndex: editingWeaponIndex })}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                  (char.activeWeaponIndex || 0) === editingWeaponIndex
                    ? 'bg-[#0d99ff]/20 text-[#388bfd] border-[#0d99ff]/40'
                    : 'bg-white/5 text-gray-400 border-white/[0.08] hover:text-white'
                }`}
              >
                {(char.activeWeaponIndex || 0) === editingWeaponIndex ? '✓ 현재 장착됨' : '이 무기로 장착'}
              </button>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">발당 대미지</span>
              <input
                type="number"
                value={currentDamage}
                onChange={(e) => handleWeaponChange('damage', Number(e.target.value))}
                className="w-16 bg-black/40 border border-white/[0.08] rounded px-1.5 py-0.5 text-right font-numeric text-white text-xs"
              />
            </div>
            <input
              type="range"
              min="1"
              max="250"
              value={currentDamage}
              onChange={(e) => handleWeaponChange('damage', Number(e.target.value))}
              className={`w-full cursor-pointer ${isSec ? 'accent-[#e5a93c]' : 'accent-[#0d99ff]'}`}
            />
          </div>

          {/* 발당 팰릿 수 (산탄 발사체 개수 - 샷건 및 다중 발사체) */}
          <div className="space-y-1 bg-black/20 p-2 rounded-lg border border-white/5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-300 font-medium">
                팰릿 수 (산탄체)
                {currentPellets > 1 && (
                  <span className="ml-1.5 text-[10px] text-[#e5a93c] font-bold">
                    (총 {currentDamage * currentPellets} DMG)
                  </span>
                )}
              </span>
              <input
                type="number"
                min="1"
                max="32"
                value={currentPellets}
                onChange={(e) => handleWeaponChange('pelletCount', Math.max(1, Number(e.target.value)))}
                className="w-14 bg-black/50 border border-white/[0.08] rounded px-1.5 py-0.5 text-right font-numeric text-white text-xs"
              />
            </div>
            <input
              type="range"
              min="1"
              max="16"
              value={currentPellets}
              onChange={(e) => handleWeaponChange('pelletCount', Number(e.target.value))}
              className={`w-full cursor-pointer ${isSec ? 'accent-[#e5a93c]' : 'accent-[#0d99ff]'}`}
            />
            <div className="flex justify-between text-[9px] text-gray-500 font-numeric">
              <span>1발 (일반)</span>
              <span>8발 (호시노 SG)</span>
              <span>16발</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">연사력 (RPM)</span>
              <input
                type="number"
                value={currentRpm}
                onChange={(e) => handleWeaponChange('rpm', Number(e.target.value))}
                className="w-16 bg-black/40 border border-white/[0.08] rounded px-1.5 py-0.5 text-right font-numeric text-white text-xs"
              />
            </div>
            <input
              type="range"
              min="20"
              max="1500"
              step="10"
              value={currentRpm}
              onChange={(e) => handleWeaponChange('rpm', Number(e.target.value))}
              className={`w-full cursor-pointer ${isSec ? 'accent-[#e5a93c]' : 'accent-[#0d99ff]'}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-gray-400 block mb-0.5">장전시간(s)</span>
              <input
                type="number"
                step="0.1"
                value={currentReload}
                onChange={(e) => handleWeaponChange('reloadTime', Number(e.target.value))}
                className="w-full bg-black/40 border border-white/[0.08] rounded px-2 py-1 font-numeric text-xs text-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block mb-0.5">탄창(발)</span>
              <input
                type="number"
                value={currentMag}
                onChange={(e) => handleWeaponChange('magazine', Number(e.target.value))}
                className="w-full bg-black/40 border border-white/[0.08] rounded px-2 py-1 font-numeric text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* 액티브 스킬 효과 (대미지 & 힐) */}
        <div className="space-y-4 bg-[#23232a] p-3.5 rounded-xl border border-white/[0.08] shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#0d99ff] shrink-0" /> 액티브 스킬 효과 (대미지 & 힐)
            </span>
          </div>

          {/* 스킬 1 편집 박스 */}
          {(() => {
            const s1Dmg = char.skill1?.damage || 0;
            const s1Heal = char.skill1?.heal || 0;
            const s1TypeBadge = s1Dmg > 0 && s1Heal > 0
              ? { text: '복합 스킬', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' }
              : s1Dmg > 0
              ? { text: '공격 스킬', color: 'text-[#388bfd] bg-[#0d99ff]/10 border-[#0d99ff]/30' }
              : s1Heal > 0
              ? { text: '치유 스킬', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
              : { text: '비대미지 유틸', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };

            return (
              <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate max-w-[120px]">
                    {char.skill1?.name || '스킬 1'}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${s1TypeBadge.color}`}>
                    {s1TypeBadge.text}
                  </span>
                </div>

                {/* 대미지 조절 */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-400">공격 대미지 (DMG)</span>
                    <input
                      type="number"
                      value={s1Dmg}
                      onChange={(e) => handleSkillChange('skill1', 'damage', Number(e.target.value))}
                      className="w-16 bg-black/40 border border-white/[0.08] rounded px-1.5 py-0.5 text-right font-numeric text-[#388bfd] text-xs"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    value={s1Dmg}
                    onChange={(e) => handleSkillChange('skill1', 'damage', Number(e.target.value))}
                    className="w-full accent-[#0d99ff] cursor-pointer"
                  />
                </div>

                {/* 치유량 (힐) 조절 */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-400">치유량 (힐 회복)</span>
                    <input
                      type="number"
                      value={s1Heal}
                      onChange={(e) => handleSkillChange('skill1', 'heal', Number(e.target.value))}
                      className="w-16 bg-black/40 border border-white/[0.08] rounded px-1.5 py-0.5 text-right font-numeric text-emerald-400 text-xs"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    value={s1Heal}
                    onChange={(e) => handleSkillChange('skill1', 'heal', Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            );
          })()}

          {/* 스킬 2 편집 박스 */}
          {(() => {
            const s2Dmg = char.skill2?.damage || 0;
            const s2Heal = char.skill2?.heal || 0;
            const s2TypeBadge = s2Dmg > 0 && s2Heal > 0
              ? { text: '복합 스킬', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' }
              : s2Dmg > 0
              ? { text: '공격 스킬', color: 'text-[#e5a93c] bg-[#e5a93c]/10 border-[#e5a93c]/30' }
              : s2Heal > 0
              ? { text: '치유 스킬', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
              : { text: '비대미지 유틸', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };

            return (
              <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate max-w-[120px]">
                    {char.skill2?.name || '스킬 2'}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${s2TypeBadge.color}`}>
                    {s2TypeBadge.text}
                  </span>
                </div>

                {/* 대미지 조절 */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-400">공격 대미지 (DMG)</span>
                    <input
                      type="number"
                      value={s2Dmg}
                      onChange={(e) => handleSkillChange('skill2', 'damage', Number(e.target.value))}
                      className="w-16 bg-black/40 border border-white/[0.08] rounded px-1.5 py-0.5 text-right font-numeric text-[#e5a93c] text-xs"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    value={s2Dmg}
                    onChange={(e) => handleSkillChange('skill2', 'damage', Number(e.target.value))}
                    className="w-full accent-[#e5a93c] cursor-pointer"
                  />
                </div>

                {/* 치유량 (힐) 조절 */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-400">치유량 (힐 회복)</span>
                    <input
                      type="number"
                      value={s2Heal}
                      onChange={(e) => handleSkillChange('skill2', 'heal', Number(e.target.value))}
                      className="w-16 bg-black/40 border border-white/[0.08] rounded px-1.5 py-0.5 text-right font-numeric text-emerald-400 text-xs"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    value={s2Heal}
                    onChange={(e) => handleSkillChange('skill2', 'heal', Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 내보내기 버튼 (고정 영역) */}
      <div className="p-3.5 border-t border-white/[0.08] bg-[#23232a]/70 space-y-2 shrink-0">
        <button
          onClick={exportToExcel}
          className="w-full py-2 px-3 rounded-lg bg-[#0d99ff] hover:bg-[#0d99ff]/85 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> 엑셀(.xlsx)로 내보내기
        </button>
        <button
          onClick={exportToJson}
          className="w-full py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition"
        >
          <Download className="w-3.5 h-3.5" /> JSON 데이터 내보내기
        </button>
      </div>
    </aside>
  );
};
