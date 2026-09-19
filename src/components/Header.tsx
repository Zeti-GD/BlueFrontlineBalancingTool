import React from 'react';
import { CombatEnv } from '../types/character';
import { RefreshCw, Activity, PanelLeft, PanelRight } from 'lucide-react';

interface HeaderProps {
  env: CombatEnv;
  setEnv: React.Dispatch<React.SetStateAction<CombatEnv>>;
  totalChars: number;
  onResetEnv: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isSandboxOpen?: boolean;
  onToggleSandbox?: () => void;
  isCompact?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  env, 
  setEnv, 
  totalChars, 
  onResetEnv,
  isSidebarOpen = true,
  onToggleSidebar,
  isSandboxOpen = true,
  onToggleSandbox,
  isCompact = false
}) => {
  if (isCompact) {
    // 좁은 화면 (컴팩트 모드): 상단 로고 + 2열 2행(2x2) 완벽 반응형 그리드
    return (
      <header className="bg-[#0d1117] border-b border-white/10 p-3 flex flex-col gap-2.5 z-20 shrink-0 select-none">
        {/* 컴팩트 상단 줄: 로고 + 초기화 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#161b22] border border-cyan-500/40 flex items-center justify-center shadow-sm">
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white tracking-wide">
                  Blue Frontline
                </span>
                <span className="text-[9px] font-numeric px-1 py-0.2 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-gray-400">밸런스 & TTK 시뮬레이터 ({totalChars}명)</p>
            </div>
          </div>

          <button
            onClick={onResetEnv}
            title="전투 환경 기본값으로 초기화 (HP 200, 실드 0, 15m, 20%)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-medium transition border border-white/10"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            <span>초기화</span>
          </button>
        </div>

        {/* 전투 환경 조절 바 (교전 거리 & 헤드샷율 2열 1행) */}
        <div className="w-full bg-[#23232a] p-2.5 rounded-xl border border-white/[0.08] grid grid-cols-2 gap-x-3">
          {/* 1. 교전 거리 (m) */}
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-gray-400">교전 거리</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={env.distance}
                  onChange={(e) => setEnv(prev => ({ ...prev, distance: Number(e.target.value) }))}
                  className="w-10 bg-black/40 border border-white/10 rounded px-1 py-0.5 text-right font-numeric text-white text-[10px]"
                />
                <span className="text-gray-500 text-[10px]">m</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={env.distance}
              onChange={(e) => setEnv(prev => ({ ...prev, distance: Number(e.target.value) }))}
              className="w-full cursor-pointer accent-[#0d99ff]"
            />
          </div>

          {/* 2. 헤드샷 적중률 (%) */}
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-gray-400">헤드샷율</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={env.headshotRate}
                  onChange={(e) => setEnv(prev => ({ ...prev, headshotRate: Number(e.target.value) }))}
                  className="w-10 bg-black/40 border border-white/10 rounded px-1 py-0.5 text-right font-numeric text-white text-[10px]"
                />
                <span className="text-gray-500 text-[10px]">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={env.headshotRate}
              onChange={(e) => setEnv(prev => ({ ...prev, headshotRate: Number(e.target.value) }))}
              className="w-full cursor-pointer accent-[#0d99ff]"
            />
          </div>
        </div>
      </header>
    );
  }

  // 와이드 모드 (≥ 1150px): 가로 1행 풀 패널
  return (
    <header className="h-16 bg-[#18181b] border-b border-white/[0.08] px-5 flex items-center justify-between gap-4 z-20 shrink-0 select-none">
      {/* 로고 & 좌측 패널 토글 */}
      <div className="flex items-center gap-3 shrink-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "캐릭터 목록 패널 접기" : "캐릭터 목록 패널 펼치기"}
            className={`p-2 rounded-lg border transition ${
              isSidebarOpen 
                ? 'bg-[#0d99ff]/15 text-[#0d99ff] border-[#0d99ff]/30 hover:bg-[#0d99ff]/25' 
                : 'bg-[#23232a] text-gray-400 border-white/[0.08] hover:text-white hover:bg-white/5'
            }`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <div className="w-9 h-9 rounded-xl bg-[#23232a] border border-[#0d99ff]/30 flex items-center justify-center shadow-sm">
          <Activity className="w-5 h-5 text-[#0d99ff]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-white tracking-wide">
              Blue Frontline
            </span>
            <span className="text-[10px] font-numeric px-1.5 py-0.5 rounded bg-[#0d99ff]/20 text-[#388bfd] border border-[#0d99ff]/30">
              Balancing Tool
            </span>
          </div>
          <p className="text-xs text-gray-400">게임 밸런스 및 대인전 TTK 분석기 ({totalChars}명)</p>
        </div>
      </div>

      {/* 실시간 전투 환경 설정 바 (와이드 가로: 교전 거리 & 헤드샷율) */}
      <div className="flex items-center gap-4 bg-[#23232a] px-4 py-1.5 rounded-xl border border-white/[0.08] shrink-0">
        {/* 교전 거리 */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center text-xs gap-3">
            <span className="text-gray-400">교전 거리</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max="100"
                value={env.distance}
                onChange={(e) => setEnv(prev => ({ ...prev, distance: Number(e.target.value) }))}
                className="w-12 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-right font-numeric text-white text-xs"
              />
              <span className="font-numeric font-bold text-white text-xs">m</span>
            </div>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={env.distance}
            onChange={(e) => setEnv(prev => ({ ...prev, distance: Number(e.target.value) }))}
            className="w-24 cursor-pointer mt-1 accent-[#0d99ff]"
          />
        </div>

        <div className="w-px h-7 bg-white/10" />

        {/* 헤드샷 적중률 */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center text-xs gap-3">
            <span className="text-gray-400">헤드샷율</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={env.headshotRate}
                onChange={(e) => setEnv(prev => ({ ...prev, headshotRate: Number(e.target.value) }))}
                className="w-12 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-right font-numeric text-white text-xs"
              />
              <span className="font-numeric font-bold text-white text-xs">%</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={env.headshotRate}
            onChange={(e) => setEnv(prev => ({ ...prev, headshotRate: Number(e.target.value) }))}
            className="w-24 cursor-pointer mt-1 accent-[#0d99ff]"
          />
        </div>

        {/* 기본값 초기화 버튼 */}
        <button
          onClick={onResetEnv}
          title="환경 기본값으로 초기화 (15m, 20%)"
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {onToggleSandbox && (
          <>
            <div className="w-px h-7 bg-white/10 shrink-0" />
            <button
              onClick={onToggleSandbox}
              title={isSandboxOpen ? "스탯 조절 패널 접기" : "스탯 조절 패널 펼치기"}
              className={`p-2 rounded-lg border transition shrink-0 ${
                isSandboxOpen 
                  ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30 hover:bg-cyan-900/50' 
                  : 'bg-[#161b22] text-gray-400 border-white/10 hover:text-white hover:bg-white/5'
              }`}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
};
