import React, { useState } from 'react';
import { Character, CombatEnv, TTKResult, DuelResult } from '../types/character';
import { analyzeCharacter, getActiveWeapon, simulateDuel } from '../utils/ttkEngine';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';
import { Zap, Swords, Gauge, Sparkles, Trophy, Crosshair, Users, CheckSquare, Square, Flame } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface ComparisonViewProps {
  selectedChar: Character | null;
  compareChar: Character | null;
  allCharacters?: Character[];
  env: CombatEnv;
  className?: string;
  onUpdateChar?: (updated: Character) => void;
  onSelectChar?: (id: string) => void;
  onToggleCompare?: (id: string) => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  selectedChar,
  compareChar,
  allCharacters = [],
  env,
  className,
  onUpdateChar,
  onSelectChar,
  onToggleCompare
}) => {
  const [visibleSections, setVisibleSections] = useState({
    duel: true,
    ttkCards: true,
    charts: true,
    statsTable: true,
    matrix: true
  });

  const toggleSection = (key: keyof typeof visibleSections) => {
    setVisibleSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!selectedChar) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 font-numeric text-sm">
        분석할 캐릭터를 좌측 목록에서 선택해주세요.
      </div>
    );
  }

  const selWeapon = getActiveWeapon(selectedChar);
  const cmpWeapon = compareChar ? getActiveWeapon(compareChar) : null;

  const resSel: TTKResult = analyzeCharacter(selectedChar, env);
  const resCmp: TTKResult | null = compareChar ? analyzeCharacter(compareChar, env) : null;
  const duelResult: DuelResult | null = (selectedChar && compareChar) ? simulateDuel(selectedChar, compareChar, env) : null;

  // 4단계 TTK 바 차트 데이터 설정 (Figma Dark Palette: #0d99ff & #e5a93c)
  const ttkLabels = ['1. 순수 평타', '2. 스킬1 콤보', '3. 스킬2 콤보', '4. 풀 콤보'];
  const barChartData = {
    labels: ttkLabels,
    datasets: [
      {
        label: `${selectedChar.name} (선택)`,
        data: [resSel.pureTtk, resSel.skill1ComboTtk, resSel.skill2ComboTtk, resSel.fullComboTtk],
        backgroundColor: 'rgba(13, 153, 255, 0.75)',
        borderColor: '#0d99ff',
        borderWidth: 1.5,
        borderRadius: 6
      },
      ...(resCmp && compareChar ? [{
        label: `${compareChar.name} (비교)`,
        data: [resCmp.pureTtk, resCmp.skill1ComboTtk, resCmp.skill2ComboTtk, resCmp.fullComboTtk],
        backgroundColor: 'rgba(229, 169, 60, 0.75)',
        borderColor: '#e5a93c',
        borderWidth: 1.5,
        borderRadius: 6
      }] : [])
    ]
  };

  const barChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e6edf3',
          font: { family: 'Malgun Gothic, sans-serif', size: 12, weight: 'bold' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(24, 24, 27, 0.96)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        titleFont: { family: 'Malgun Gothic, sans-serif' },
        bodyFont: { family: 'Consolas, monospace', size: 12 },
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${Number(context.raw).toFixed(2)}초 (TTK)`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#8b949e', font: { family: 'Malgun Gothic, sans-serif', size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { 
          color: '#8b949e', 
          font: { family: 'Consolas, monospace', size: 11 },
          callback: (val: any) => `${Number(val).toFixed(2)}s`
        },
        title: {
          display: true,
          text: '처치 시간 (0.xx초, 낮을수록 우수)',
          color: '#8b949e',
          font: { size: 11 }
        }
      }
    }
  };

  // 5대 지표 레이더 차트 데이터 설정
  const radarLabels = ['공격 (Offense)', '생존 (Survival)', '기동 (Mobility)', '난이도 (Difficulty)', '유틸 (Utility)'];
  const radarChartData = {
    labels: radarLabels,
    datasets: [
      {
        label: selectedChar.name,
        data: [resSel.radar.offense, resSel.radar.survival, resSel.radar.mobility, resSel.radar.difficulty, resSel.radar.utility],
        backgroundColor: 'rgba(13, 153, 255, 0.2)',
        borderColor: '#0d99ff',
        borderWidth: 2,
        pointBackgroundColor: '#0d99ff',
        pointRadius: 3
      },
      ...(resCmp && compareChar ? [{
        label: compareChar.name,
        data: [resCmp.radar.offense, resCmp.radar.survival, resCmp.radar.mobility, resCmp.radar.difficulty, resCmp.radar.utility],
        backgroundColor: 'rgba(229, 169, 60, 0.2)',
        borderColor: '#e5a93c',
        borderWidth: 2,
        pointBackgroundColor: '#e5a93c',
        pointRadius: 3
      }] : [])
    ]
  };

  const radarChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e6edf3',
          font: { family: 'Malgun Gothic, sans-serif', size: 12, weight: 'bold' }
        }
      }
    },
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: { display: false, stepSize: 2 },
        angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        pointLabels: {
          color: '#e6edf3',
          font: { family: 'Malgun Gothic, sans-serif', size: 11, weight: 'bold' }
        }
      }
    }
  };

  // 세로 2단 행 구조의 완벽한 TTK 카드 (타이틀 잘림 0%, 숫자 겹침 0%)
  const renderTtkCard = (
    title: string,
    valSel: number,
    valCmp: number | undefined,
    desc: string,
    icon: React.ReactNode
  ) => {
    let diffText = '동일';
    let badgeClass = 'text-gray-400 bg-white/[0.04] border border-white/[0.08]';

    if (valCmp !== undefined) {
      const diff = Number((valSel - valCmp).toFixed(2));
      if (diff < 0) {
        diffText = `선택한 유닛이 ${Math.abs(diff).toFixed(2)}초 더 빠름`;
        badgeClass = 'bg-[#0d99ff]/15 text-[#388bfd] border border-[#0d99ff]/30 shadow-sm';
      } else if (diff > 0) {
        diffText = `비교 대상이 ${diff.toFixed(2)}초 더 빠름`;
        badgeClass = 'bg-[#e5a93c]/15 text-[#e5a93c] border border-[#e5a93c]/30 shadow-sm';
      }
    }

    return (
      <div className="p-4 bg-[#161b22] border border-white/10 rounded-xl flex flex-col justify-between shadow-sm min-w-0">
        {/* 상단: 타이틀 단독 행 (글자 잘림 원천 방지) */}
        <div className="flex items-center gap-2 pb-2.5 border-b border-white/5">
          {icon}
          <span className="text-xs font-bold text-gray-100 tracking-wide">
            {title}
          </span>
        </div>

        {/* 본문: 세로 2단 행 구조 (각각 한 줄 전체를 써서 숫자 겹침 원천 방지) */}
        <div className="my-3 space-y-2 bg-black/40 p-2.5 rounded-lg border border-white/5">
          {/* 선택 캐릭터 행 */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              <span className="text-xs text-white font-bold whitespace-nowrap">
                {selectedChar.name}
              </span>
              <span className="text-[10px] text-cyan-400/80 font-normal shrink-0">(선택)</span>
            </div>
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="font-numeric text-lg font-extrabold text-cyan-400">
                {valSel.toFixed(2)}
              </span>
              <span className="text-xs text-gray-400 font-sans">초</span>
            </div>
          </div>

          {/* 비교 대상 캐릭터 행 */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-xs text-white font-bold whitespace-nowrap">
                {compareChar ? compareChar.name : '비교 대상 없음'}
              </span>
              {compareChar && <span className="text-[10px] text-amber-400/80 font-normal shrink-0">(비교)</span>}
            </div>
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="font-numeric text-lg font-extrabold text-amber-400">
                {valCmp !== undefined ? valCmp.toFixed(2) : '-'}
              </span>
              {valCmp !== undefined && <span className="text-xs text-gray-400 font-sans">초</span>}
            </div>
          </div>
        </div>

        {/* 하단: 델타 결과 배지 (전체 너비 활용으로 글자 밖으로 빠져나옴 원천 차단) */}
        {valCmp !== undefined ? (
          <div className={`py-1 px-2.5 rounded text-center text-xs font-bold ${badgeClass}`}>
            {diffText}
          </div>
        ) : (
          <div className="text-[10px] text-gray-500 truncate text-center py-1">
            {desc}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-[#18181b] ${className || 'min-w-0'}`}>
      {/* 1. 상단 뷰 필터 툴바 (피그마 다크 테마: 단일 통일 색상 & 깔끔한 칩) */}
      <div className="bg-[#23232a] border border-white/[0.08] rounded-xl p-2.5 px-3.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-[#0d99ff]" /> 정보 표시 필터:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { key: 'matrix', label: '전체 캐릭터 일람' },
            { key: 'duel', label: '1v1 맞대결 (PvP)' },
            { key: 'ttkCards', label: '4단계 TTK 카드' },
            { key: 'charts', label: '비교 차트 & 레이더' },
            { key: 'statsTable', label: '상세 스탯 대조표' }
          ].map((item) => {
            const isChecked = visibleSections[item.key as keyof typeof visibleSections];
            return (
              <button
                key={item.key}
                onClick={() => toggleSection(item.key as keyof typeof visibleSections)}
                className={`px-3 py-1 rounded-lg border text-xs transition flex items-center gap-1.5 ${
                  isChecked 
                    ? 'bg-[#0d99ff]/15 border-[#0d99ff]/40 text-[#f0f6fc] font-medium shadow-sm' 
                    : 'bg-[#18181b] border-white/[0.08] text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'
                }`}
              >
                {isChecked ? (
                  <CheckSquare className="w-3.5 h-3.5 text-[#0d99ff]" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-gray-500" />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 최상단: 전체 캐릭터 밸런스 매트릭스 (일람표) - 사용자 요청 우선 배치 */}
      {visibleSections.matrix && (
        <div className="bg-[#23232a] rounded-xl border border-white/[0.08] overflow-hidden">
          <div className="p-3.5 border-b border-white/[0.08] bg-[#18181b] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0d99ff]" />
              <span className="text-xs font-bold text-white">
                전체 캐릭터 밸런스 일람표 ({allCharacters.length}명)
              </span>
              <span className="text-[11px] text-gray-400">목록에서 [선택] 및 [비교] 버튼으로 즉시 대시보드 연동</span>
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-3 font-sans">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#0d99ff]/30 border border-[#0d99ff] inline-block" /> 현재 선택
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#e5a93c]/30 border border-[#e5a93c] inline-block" /> 비교 대상
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1c1c22] text-gray-400 font-medium text-[11px] border-b border-white/[0.08] whitespace-nowrap">
                <tr>
                  <th className="py-2.5 px-3">캐릭터 / 포지션</th>
                  <th className="py-2.5 px-3">생존 체급 (HP / 실드 / EHP)</th>
                  <th className="py-2.5 px-3">주무기 (타입 / 대미지 / RPM)</th>
                  <th className="py-2.5 px-3">발당 팰릿</th>
                  <th className="py-2.5 px-3">초당 화력 (DPS)</th>
                  <th className="py-2.5 px-3">평타 TTK ({env.distance}m)</th>
                  <th className="py-2.5 px-3">풀 콤보 TTK</th>
                  <th className="py-2.5 px-3">스킬 화력 (1 / 2)</th>
                  <th className="py-2.5 px-3 text-center">빠른 선택 / 비교</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-numeric whitespace-nowrap">
                {allCharacters.map((c) => {
                  const cStats = analyzeCharacter(c, env);
                  const isSelected = selectedChar.id === c.id;
                  const isCompare = compareChar?.id === c.id;
                  const cWeapon = getActiveWeapon(c);

                  let rowBg = 'hover:bg-white/[0.02]';
                  if (isSelected) rowBg = 'bg-[#0d99ff]/10 border-l-4 border-l-[#0d99ff]';
                  else if (isCompare) rowBg = 'bg-[#e5a93c]/10 border-l-4 border-l-[#e5a93c]';

                  return (
                    <tr key={c.id} className={`${rowBg} transition`}>
                      {/* 캐릭터 / 포지션 */}
                      <td className="py-2.5 px-3 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{c.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] text-gray-300 font-normal">
                            {c.position}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 block truncate max-w-[120px]">
                          {c.weaponName || '-'}
                        </span>
                      </td>

                      {/* 생존 체급 */}
                      <td className="py-2.5 px-3">
                        <span className="text-white font-bold">{c.hp}</span>
                        {c.barrier ? <span className="text-[#388bfd]"> +{c.barrier}</span> : ''}
                        <span className="text-gray-400 text-[11px] block">
                          EHP <b className="text-white">{cStats.effectiveHp}</b>
                        </span>
                      </td>

                      {/* 주무기 */}
                      <td className="py-2.5 px-3 font-sans">
                        <span className="text-white font-bold">{cWeapon.damage} DMG</span>
                        <span className="text-gray-400 text-[11px]"> ({c.weaponType || 'AR'}, {cWeapon.rpm} RPM)</span>
                        <span className="text-[10px] text-gray-400 block font-numeric">
                          장전 {cWeapon.reloadTime}s / 탄창 {cWeapon.magazine}발
                        </span>
                      </td>

                      {/* 발당 팰릿 */}
                      <td className="py-2.5 px-3">
                        {cWeapon.pelletCount > 1 ? (
                          <span className="text-[#388bfd] font-bold px-1.5 py-0.5 rounded bg-[#0d99ff]/15 border border-[#0d99ff]/30">
                            {cWeapon.pelletCount} 팰릿 (총 {cWeapon.damage * cWeapon.pelletCount})
                          </span>
                        ) : (
                          <span className="text-gray-500">1발 (단일)</span>
                        )}
                      </td>

                      {/* 초당 화력 (DPS) */}
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-400 font-bold">{cStats.dps}</span>
                        <span className="text-[10px] text-gray-500 block">순환 {cStats.cycleDps}</span>
                      </td>

                      {/* 평타 TTK */}
                      <td className="py-2.5 px-3">
                        <span className="text-[#388bfd] font-bold">{cStats.pureTtk}s</span>
                        <span className="text-[10px] text-gray-500 block">({cStats.shotsToKillPure}발)</span>
                      </td>

                      {/* 풀 콤보 TTK */}
                      <td className="py-2.5 px-3">
                        <span className="text-purple-300 font-bold">{cStats.fullComboTtk}s</span>
                      </td>

                      {/* 스킬 화력 */}
                      <td className="py-2.5 px-3 text-[11px]">
                        <span className="text-[#388bfd] font-bold">{c.skill1?.damage || 0}</span>
                        <span className="text-gray-500"> / </span>
                        <span className="text-[#e5a93c] font-bold">{c.skill2?.damage || 0}</span>
                      </td>

                      {/* 조작 버튼 */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-sans">
                          <button
                            onClick={() => onSelectChar && onSelectChar(c.id)}
                            disabled={isSelected}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                              isSelected
                                ? 'bg-[#0d99ff]/25 text-[#388bfd] border border-[#0d99ff]/40 cursor-default'
                                : 'bg-white/[0.04] hover:bg-[#0d99ff]/15 hover:text-[#388bfd] text-gray-300 border border-white/[0.08]'
                            }`}
                          >
                            {isSelected ? '선택됨' : '선택'}
                          </button>
                          <button
                            onClick={() => onToggleCompare && onToggleCompare(c.id)}
                            disabled={isSelected}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                              isSelected
                                ? 'opacity-25 cursor-not-allowed bg-white/[0.02] text-gray-600 border border-transparent'
                                : isCompare
                                ? 'bg-[#e5a93c]/25 text-[#e5a93c] border border-[#e5a93c]/40'
                                : 'bg-white/[0.04] hover:bg-[#e5a93c]/15 hover:text-[#e5a93c] text-gray-300 border border-white/[0.08]'
                            }`}
                          >
                            {isCompare ? '비교 해제' : '비교'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. 실전 1v1 맞대결 (PvP 대인전) 시뮬레이션 영역 */}
      {visibleSections.duel && (
        <div className="bg-[#23232a] border border-white/[0.08] rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#0d99ff]/15 text-[#0d99ff]">
                <Flame className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  실전 1v1 맞대결 시뮬레이션 (PvP 대인전)
                  <span className="text-[11px] font-normal text-gray-400">선택 유닛 vs 비교 대상 상호 타격</span>
                </h3>
                <p className="text-[11px] text-gray-400">
                  두 캐릭터가 서로를 표적으로 삼아 각자의 실질 체력(EHP)과 방어율, 사거리 감쇄, 팰릿 수를 상호 적용했을 때의 결투 결과입니다.
                </p>
              </div>
            </div>
            {duelResult && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] text-gray-300 border border-white/[0.08] font-numeric">
                거리 {env.distance}m · 헤드샷 {env.headshotRate}%
              </span>
            )}
          </div>

          {compareChar && duelResult ? (
            <div className="space-y-4">
              {/* 승자 판정 요약 배너 */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
                duelResult.winnerId === selectedChar.id 
                  ? 'bg-[#0d99ff]/10 border-[#0d99ff]/30 text-white'
                  : duelResult.winnerId === compareChar.id
                  ? 'bg-[#e5a93c]/10 border-[#e5a93c]/30 text-white'
                  : 'bg-white/[0.03] border-white/[0.08] text-gray-200'
              }`}>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className={`p-2.5 rounded-xl text-xl shrink-0 ${
                    duelResult.winnerId === selectedChar.id ? 'bg-[#0d99ff]/20 text-[#0d99ff]' : 'bg-[#e5a93c]/20 text-[#e5a93c]'
                  }`}>
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wider">
                        {duelResult.winnerId === 'draw' ? '무승부' : '1v1 결투 승리'}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {duelResult.winnerName}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1">
                      {duelResult.advantageReason}
                    </p>
                  </div>
                </div>

                {/* 우세 시간 및 잔여 체력 */}
                {duelResult.winnerId !== 'draw' && (
                  <div className="flex items-center gap-5 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/[0.08] pt-2 md:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">제압 속도 우세</span>
                      <span className="font-numeric font-bold text-sm text-emerald-400">
                        +{duelResult.timeDiff}초 빠름
                      </span>
                    </div>
                    <div className="text-right min-w-[130px]">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>승자 생존 체력</span>
                        <span className="font-numeric text-white font-bold">{duelResult.winnerRemainingHpRatio}%</span>
                      </div>
                      <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/[0.08]">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            duelResult.winnerId === selectedChar.id ? 'bg-[#0d99ff]' : 'bg-[#e5a93c]'
                          }`}
                          style={{ width: `${duelResult.winnerRemainingHpRatio}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 font-numeric block mt-0.5">
                        잔여 {duelResult.winnerRemainingHp} EHP
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 양측 상호 타격 상세 스탯 (2열 그리드) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 왼쪽: A -> B 공격 */}
                <div className="bg-[#1c1c22] border border-[#0d99ff]/25 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#388bfd] flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5" /> {selectedChar.name}의 공세
                    </span>
                    <span className="text-[10px] text-gray-400">
                      표적: {compareChar.name} (체급 {duelResult.charA.targetEffectiveHp} EHP)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 font-numeric">
                    <div className="bg-white/[0.03] p-2 rounded-lg text-center">
                      <span className="text-[10px] text-gray-400 block">발당 실질 대미지</span>
                      <span className="text-xs font-bold text-white">{duelResult.charA.effectiveBulletDmg}</span>
                      {selWeapon.pelletCount > 1 && (
                        <span className="text-[9px] text-[#388bfd] block font-sans">({selWeapon.pelletCount}팰릿 산탄)</span>
                      )}
                    </div>
                    <div className="bg-white/[0.03] p-2 rounded-lg text-center">
                      <span className="text-[10px] text-gray-400 block">평타 제압 TTK</span>
                      <span className="text-xs font-bold text-[#388bfd]">{duelResult.charA.pureTtk}s</span>
                      <span className="text-[9px] text-gray-500 block">({duelResult.charA.shotsToKill}발 사격)</span>
                    </div>
                    <div className="bg-white/[0.03] p-2 rounded-lg text-center">
                      <span className="text-[10px] text-gray-400 block">풀 콤보 TTK</span>
                      <span className="text-xs font-bold text-[#388bfd]">{duelResult.charA.fullComboTtk}s</span>
                      <span className="text-[9px] text-gray-500 block">(스킬+평타)</span>
                    </div>
                  </div>
                </div>

                {/* 오른쪽: B -> A 공격 */}
                <div className="bg-[#1c1c22] border border-[#e5a93c]/25 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#e5a93c] flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5" /> {compareChar.name}의 공세
                    </span>
                    <span className="text-[10px] text-gray-400">
                      표적: {selectedChar.name} (체급 {duelResult.charB.targetEffectiveHp} EHP)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 font-numeric">
                    <div className="bg-white/[0.03] p-2 rounded-lg text-center">
                      <span className="text-[10px] text-gray-400 block">발당 실질 대미지</span>
                      <span className="text-xs font-bold text-white">{duelResult.charB.effectiveBulletDmg}</span>
                      {cmpWeapon && cmpWeapon.pelletCount > 1 && (
                        <span className="text-[9px] text-[#e5a93c] block font-sans">({cmpWeapon.pelletCount}팰릿 산탄)</span>
                      )}
                    </div>
                    <div className="bg-white/[0.03] p-2 rounded-lg text-center">
                      <span className="text-[10px] text-gray-400 block">평타 제압 TTK</span>
                      <span className="text-xs font-bold text-[#e5a93c]">{duelResult.charB.pureTtk}s</span>
                      <span className="text-[9px] text-gray-500 block">({duelResult.charB.shotsToKill}발 사격)</span>
                    </div>
                    <div className="bg-white/[0.03] p-2 rounded-lg text-center">
                      <span className="text-[10px] text-gray-400 block">풀 콤보 TTK</span>
                      <span className="text-xs font-bold text-[#e5a93c]">{duelResult.charB.fullComboTtk}s</span>
                      <span className="text-[9px] text-gray-500 block">(스킬+평타)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-black/20 rounded-xl border border-dashed border-white/[0.08]">
              <Users className="w-7 h-7 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-300 font-medium">비교 대상 캐릭터가 지정되지 않았습니다.</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                상단 일람표나 좌측 사이드바에서 비교할 캐릭터의 <b>[비교]</b> 버튼을 누르면 실시간 1:1 맞대결 승패와 잔여 체력이 분석됩니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. 4단계 TTK 비교 요약 영역 */}
      {visibleSections.ttkCards && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-sm text-white tracking-wide">
                4단계 TTK 비교 분석 (소수점 0.xx초 기준)
              </h2>
              {/* 선택 캐릭터가 듀얼 무기를 보유한 경우 무기 전환 버튼 */}
              {selectedChar.hasSecondaryWeapon && onUpdateChar && (
                <div className="flex items-center gap-1 bg-[#23232a] p-0.5 rounded-lg border border-[#0d99ff]/30 text-xs">
                  <button
                    onClick={() => onUpdateChar({ ...selectedChar, activeWeaponIndex: 0 })}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                      (selectedChar.activeWeaponIndex || 0) === 0
                        ? 'bg-[#0d99ff]/20 text-[#388bfd] shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    1. {selectedChar.weaponName ? selectedChar.weaponName.slice(0, 6) : '주무기'}
                  </button>
                  <button
                    onClick={() => onUpdateChar({ ...selectedChar, activeWeaponIndex: 1 })}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                      selectedChar.activeWeaponIndex === 1
                        ? 'bg-[#e5a93c]/20 text-[#e5a93c] shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    2. {selectedChar.secondaryWeapon?.name ? selectedChar.secondaryWeapon.name.slice(0, 6) : '보조무기'}
                  </button>
                </div>
              )}
              {/* 비교 대상이 듀얼 무기를 보유한 경우 무기 전환 버튼 */}
              {compareChar?.hasSecondaryWeapon && onUpdateChar && (
                <div className="flex items-center gap-1 bg-[#23232a] p-0.5 rounded-lg border border-[#e5a93c]/30 text-xs">
                  <span className="text-[10px] text-gray-400 px-1 font-sans">비교군:</span>
                  <button
                    onClick={() => onUpdateChar({ ...compareChar, activeWeaponIndex: 0 })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                      (compareChar.activeWeaponIndex || 0) === 0
                        ? 'bg-[#e5a93c]/20 text-[#e5a93c] shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    1번
                  </button>
                  <button
                    onClick={() => onUpdateChar({ ...compareChar, activeWeaponIndex: 1 })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                      compareChar.activeWeaponIndex === 1
                        ? 'bg-[#e5a93c]/20 text-[#e5a93c] shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    2번
                  </button>
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400">
              거리 <b className="text-white font-numeric">{env.distance}m</b> · 헤드샷 <b className="text-[#0d99ff] font-numeric">{env.headshotRate}%</b>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {renderTtkCard('1. 순수 평타 TTK', resSel.pureTtk, resCmp?.pureTtk, '무기 사격만으로 처치', <Gauge className="w-4 h-4 text-[#0d99ff] shrink-0" />)}
            {renderTtkCard('2. 스킬 1 콤보 TTK', resSel.skill1ComboTtk, resCmp?.skill1ComboTtk, '스킬 1 적중 후 잔여 체력 평타', <Zap className="w-4 h-4 text-[#0d99ff] shrink-0" />)}
            {renderTtkCard('3. 스킬 2 콤보 TTK', resSel.skill2ComboTtk, resCmp?.skill2ComboTtk, '스킬 2 적중 후 잔여 체력 평타', <Sparkles className="w-4 h-4 text-[#0d99ff] shrink-0" />)}
            {renderTtkCard('4. 풀 콤보 TTK', resSel.fullComboTtk, resCmp?.fullComboTtk, '스킬 1+2 폭딜 후 잔여 체력 평타', <Swords className="w-4 h-4 text-[#0d99ff] shrink-0" />)}
          </div>
        </div>
      )}

      {/* 5. 차트 영역: 좁은 화면 1열, 넓은 화면 2열 */}
      {visibleSections.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#23232a] p-4 rounded-xl border border-white/[0.08] flex flex-col h-[280px]">
            <span className="text-xs font-bold text-gray-200 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0d99ff]" /> 4단계 TTK 비교 그래프 (낮을수록 우수)
            </span>
            <div className="flex-1 relative">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>

          <div className="bg-[#23232a] p-4 rounded-xl border border-white/[0.08] flex flex-col h-[280px]">
            <span className="text-xs font-bold text-gray-200 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#e5a93c]" /> 5대 전투 밸런스 지표
            </span>
            <div className="flex-1 relative">
              <Radar data={radarChartData} options={radarChartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* 6. 종합 스탯 비교 테이블 */}
      {visibleSections.statsTable && (
        <div className="bg-[#23232a] rounded-xl border border-white/[0.08] overflow-hidden">
          <div className="p-3 border-b border-white/[0.08] bg-[#18181b] flex items-center justify-between">
            <span className="text-xs font-bold text-gray-200">
              상세 스탯 대조표
            </span>
            <div className="flex items-center gap-4 text-xs font-numeric">
              <span className="text-[#388bfd] font-bold">● {selectedChar.name} (선택)</span>
              <span className="text-[#e5a93c] font-bold">● {compareChar ? `${compareChar.name} (비교)` : '비교 대상 없음'}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1c1c22] text-gray-400 font-medium text-[11px] border-b border-white/[0.08]">
                <tr>
                  <th className="py-2.5 px-4">스탯 지표 항목</th>
                  <th className="py-2.5 px-4 text-[#388bfd] font-bold">{selectedChar.name} (선택)</th>
                  <th className="py-2.5 px-4 text-[#e5a93c] font-bold">{compareChar ? compareChar.name : '-'} (비교)</th>
                  <th className="py-2.5 px-4 text-gray-400">격차 (선택 - 비교)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-numeric">
                {/* 생존 관련 */}
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 text-gray-300 font-sans">체력 (HP)</td>
                  <td className="py-2.5 px-4 text-white font-bold">{selectedChar.hp}</td>
                  <td className="py-2.5 px-4 text-white font-bold">{compareChar?.hp ?? '-'}</td>
                  <td className="py-2.5 px-4 text-gray-400">
                    {compareChar ? `${selectedChar.hp - compareChar.hp > 0 ? '+' : ''}${selectedChar.hp - compareChar.hp}` : '-'}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 text-gray-300 font-sans">실드 (보호막)</td>
                  <td className="py-2.5 px-4 text-[#388bfd] font-bold">{selectedChar.barrier || 0}</td>
                  <td className="py-2.5 px-4 text-[#e5a93c] font-bold">{compareChar ? (compareChar.barrier || 0) : '-'}</td>
                  <td className="py-2.5 px-4 text-gray-400">
                    {compareChar ? `${(selectedChar.barrier || 0) - (compareChar.barrier || 0) > 0 ? '+' : ''}${(selectedChar.barrier || 0) - (compareChar.barrier || 0)}` : '-'}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 text-gray-300 font-sans">실질 생존력 (EHP)</td>
                  <td className="py-2.5 px-4 text-white font-bold">{resSel.effectiveHp}</td>
                  <td className="py-2.5 px-4 text-white font-bold">{resCmp?.effectiveHp ?? '-'}</td>
                  <td className="py-2.5 px-4 text-gray-400">
                    {resCmp ? `${resSel.effectiveHp - resCmp.effectiveHp > 0 ? '+' : ''}${resSel.effectiveHp - resCmp.effectiveHp}` : '-'}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 text-gray-300 font-sans">이동 속도</td>
                  <td className="py-2.5 px-4 text-white font-bold">{selectedChar.speed}</td>
                  <td className="py-2.5 px-4 text-white font-bold">{compareChar?.speed ?? '-'}</td>
                  <td className="py-2.5 px-4 text-gray-400">
                    {compareChar ? `${selectedChar.speed - compareChar.speed > 0 ? '+' : ''}${selectedChar.speed - compareChar.speed}` : '-'}
                  </td>
                </tr>

                {/* 무기 화력 관련 */}
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 text-gray-300 font-sans">
                    장착 무기 / 발당 대미지
                  </td>
                  <td className="py-2.5 px-4 text-white font-bold">
                    <div>
                      <span>{selWeapon.damage}</span>
                      {selWeapon.pelletCount > 1 ? (
                        <span className="ml-1.5 text-xs text-[#388bfd] font-normal">
                          × {selWeapon.pelletCount}팰릿 (총 {selWeapon.damage * selWeapon.pelletCount})
                        </span>
                      ) : null}
                    </div>
                    {selectedChar.hasSecondaryWeapon && (
                      <div className="text-[10px] text-gray-400 font-normal">
                        [{selectedChar.activeWeaponIndex === 1 ? '보조무기' : '주무기'}]
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-white font-bold">
                    {cmpWeapon ? (
                      <div>
                        <span>{cmpWeapon.damage}</span>
                        {cmpWeapon.pelletCount > 1 ? (
                          <span className="ml-1.5 text-xs text-[#e5a93c] font-normal">
                            × {cmpWeapon.pelletCount}팰릿 (총 {cmpWeapon.damage * cmpWeapon.pelletCount})
                          </span>
                        ) : null}
                        {compareChar?.hasSecondaryWeapon && (
                          <div className="text-[10px] text-gray-400 font-normal">
                            [{compareChar.activeWeaponIndex === 1 ? '보조무기' : '주무기'}]
                          </div>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-gray-400">
                    {cmpWeapon ? (
                      `${((selWeapon.damage * selWeapon.pelletCount) - (cmpWeapon.damage * cmpWeapon.pelletCount)).toFixed(1)} (총합차)`
                    ) : '-'}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 text-gray-300 font-sans">실질 발당 대미지 ({env.distance}m / 헤드 {env.headshotRate}%)</td>
                  <td className="py-2.5 px-4 text-[#388bfd] font-bold">{resSel.effectiveDmgPerBullet}</td>
                  <td className="py-2.5 px-4 text-[#e5a93c] font-bold">{resCmp?.effectiveDmgPerBullet ?? '-'}</td>
                  <td className="py-2.5 px-4 text-gray-400">
                    {resCmp ? `${(resSel.effectiveDmgPerBullet - resCmp.effectiveDmgPerBullet).toFixed(1)}` : '-'}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 text-gray-300 font-sans">연사력 (RPM)</td>
                  <td className="py-2.5 px-4 text-white font-bold">{selWeapon.rpm}</td>
                  <td className="py-2.5 px-4 text-white font-bold">{cmpWeapon?.rpm ?? '-'}</td>
                  <td className="py-2.5 px-4 text-gray-400">
                    {cmpWeapon ? `${selWeapon.rpm - cmpWeapon.rpm > 0 ? '+' : ''}${selWeapon.rpm - cmpWeapon.rpm}` : '-'}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 text-gray-300 font-sans">장전 시간 / 탄창</td>
                  <td className="py-2.5 px-4 text-gray-300">{selWeapon.reloadTime}s / {selWeapon.magazine}발</td>
                  <td className="py-2.5 px-4 text-gray-300">{cmpWeapon ? `${cmpWeapon.reloadTime}s / ${cmpWeapon.magazine}발` : '-'}</td>
                  <td className="py-2.5 px-4 text-gray-400">-</td>
                </tr>

                {/* 스킬 관련 */}
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 text-gray-300 font-sans">스킬 1 대미지</td>
                  <td className="py-2.5 px-4 text-[#388bfd] font-bold">
                    {selectedChar.skill1 ? `${selectedChar.skill1.damage} (${selectedChar.skill1.name})` : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-[#e5a93c] font-bold">
                    {compareChar?.skill1 ? `${compareChar.skill1.damage} (${compareChar.skill1.name})` : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-gray-400">
                    {compareChar ? `${(selectedChar.skill1?.damage || 0) - (compareChar.skill1?.damage || 0)}` : '-'}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 text-gray-300 font-sans">스킬 2 대미지</td>
                  <td className="py-2.5 px-4 text-[#388bfd] font-bold">
                    {selectedChar.skill2 ? `${selectedChar.skill2.damage} (${selectedChar.skill2.name})` : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-[#e5a93c] font-bold">
                    {compareChar?.skill2 ? `${compareChar.skill2.damage} (${compareChar.skill2.name})` : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-gray-400">
                    {compareChar ? `${(selectedChar.skill2?.damage || 0) - (compareChar.skill2?.damage || 0)}` : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
