import React, { useState, useEffect } from 'react';
import { Character, CombatEnv } from './types/character';
import { INITIAL_CHARACTERS } from './data/initialCharacters';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ComparisonView } from './components/ComparisonView';
import { SandboxEditor } from './components/SandboxEditor';
import { Users, BarChart3, Sliders } from 'lucide-react';

export const App: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>(INITIAL_CHARACTERS);
  const [selectedCharId, setSelectedCharId] = useState<string>('Aru');
  const [compareCharId, setCompareCharId] = useState<string | null>('Izuna');
  
  // 패널 토글 상태 (와이드 화면용)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(true);

  // 창 너비 감지 및 컴팩트 모드 탭 상태
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
  const [activeTab, setActiveTab] = useState<'chars' | 'compare' | 'sandbox'>('compare');

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isCompact = windowWidth < 1150;

  const [env, setEnv] = useState<CombatEnv>({
    targetHp: 200,
    targetShield: 0,
    distance: 15,
    headshotRate: 20
  });

  const selectedChar = characters.find(c => c.id === selectedCharId) || characters[0] || null;
  const compareChar = compareCharId ? characters.find(c => c.id === compareCharId) || null : null;

  const handleUpdateChar = (updated: Character) => {
    setCharacters(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleSelectChar = (id: string) => {
    setSelectedCharId(id);
    // 컴팩트 화면에서 캐릭터 선택 시 비교 화면으로 바로 안내
    if (isCompact) {
      setActiveTab('compare');
    }
  };

  const handleToggleCompare = (id: string) => {
    setCompareCharId(prev => prev === id ? null : id);
  };

  const handleDeleteChar = (deleteId: string) => {
    setCharacters(prev => {
      const filtered = prev.filter(c => c.id !== deleteId);
      
      if (selectedCharId === deleteId && filtered.length > 0) {
        setSelectedCharId(filtered[0].id);
      }
      if (compareCharId === deleteId) {
        setCompareCharId(null);
      }

      return filtered;
    });
  };

  const handleResetChar = () => {
    if (!selectedChar) return;
    const initial = INITIAL_CHARACTERS.find(c => c.id === selectedChar.id);
    if (initial) {
      handleUpdateChar({ ...initial });
    }
  };

  const handleResetEnv = () => {
    setEnv({
      targetHp: 200,
      targetShield: 0,
      distance: 15,
      headshotRate: 20
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0c14] overflow-hidden text-[#e6edf3]">
      {/* 상단 네비게이션 & 환경 컨트롤러 */}
      <Header 
        env={env} 
        setEnv={setEnv} 
        totalChars={characters.length} 
        onResetEnv={handleResetEnv}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        isSandboxOpen={isSandboxOpen}
        onToggleSandbox={() => setIsSandboxOpen(prev => !prev)}
        isCompact={isCompact}
      />

      {/* 좁은 화면(창 축소/모바일/분할화면) 전용 상단 탭 전환 네비게이션 */}
      {isCompact && (
        <div className="bg-[#161b22] border-b border-white/10 px-3 py-2 flex items-center justify-around gap-2 z-10 shrink-0">
          <button
            onClick={() => setActiveTab('chars')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'chars'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>캐릭터 목록 ({characters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'compare'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>TTK 비교 분석</span>
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'sandbox'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="truncate">{selectedChar ? `${selectedChar.name} 스탯` : '스탯 조절'}</span>
          </button>
        </div>
      )}

      {/* 메인 뷰포트 영역 */}
      <div className="flex-1 flex overflow-hidden w-full h-full relative">
        {isCompact ? (
          // 컴팩트 모드: 활성화된 탭 화면을 100% 뷰포트에 꽉 차게 렌더링
          <div className="w-full h-full overflow-hidden flex flex-col">
            {activeTab === 'chars' && (
              <Sidebar
                characters={characters}
                setCharacters={setCharacters}
                selectedCharId={selectedCharId}
                onSelectChar={handleSelectChar}
                compareCharId={compareCharId}
                onToggleCompare={handleToggleCompare}
                onDeleteChar={handleDeleteChar}
                className="w-full h-full border-none"
              />
            )}

            {activeTab === 'compare' && (
              <ComparisonView
                selectedChar={selectedChar}
                compareChar={compareChar}
                allCharacters={characters}
                env={env}
                className="w-full h-full"
                onUpdateChar={handleUpdateChar}
                onSelectChar={handleSelectChar}
                onToggleCompare={handleToggleCompare}
              />
            )}

            {activeTab === 'sandbox' && (
              <SandboxEditor
                char={selectedChar}
                onUpdateChar={handleUpdateChar}
                onResetChar={handleResetChar}
                characters={characters}
                className="w-full h-full border-none"
              />
            )}
          </div>
        ) : (
          // 와이드 모드 (≥ 1150px): 3단 컬럼 및 접기/펼치기 지원
          <>
            {isSidebarOpen && (
              <Sidebar
                characters={characters}
                setCharacters={setCharacters}
                selectedCharId={selectedCharId}
                onSelectChar={handleSelectChar}
                compareCharId={compareCharId}
                onToggleCompare={handleToggleCompare}
                onDeleteChar={handleDeleteChar}
              />
            )}

            <ComparisonView
              selectedChar={selectedChar}
              compareChar={compareChar}
              allCharacters={characters}
              env={env}
              className="flex-1 min-w-0"
              onUpdateChar={handleUpdateChar}
              onSelectChar={handleSelectChar}
              onToggleCompare={handleToggleCompare}
            />

            {isSandboxOpen && (
              <SandboxEditor
                char={selectedChar}
                onUpdateChar={handleUpdateChar}
                onResetChar={handleResetChar}
                characters={characters}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
