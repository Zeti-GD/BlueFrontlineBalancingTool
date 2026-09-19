import React, { useState, useRef } from 'react';
import { Character } from '../types/character';
import { 
  Link2, 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  GitCompare, 
  CheckCircle2,
  Gamepad2,
  FolderOpen,
  CheckSquare,
  Square
} from 'lucide-react';
import { fetchGoogleSheetCharacters } from '../utils/parsers/googleSheetParser';
import { parseExcelOrCsvFile } from '../utils/parsers/excelParser';
import { parseMarkdownFiles } from '../utils/parsers/markdownParser';
import { ImportSelectModal } from './ImportSelectModal';

interface SidebarProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  selectedCharId: string;
  onSelectChar: (id: string) => void;
  compareCharId: string | null;
  onToggleCompare: (id: string) => void;
  onDeleteChar: (id: string) => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  characters,
  setCharacters,
  selectedCharId,
  onSelectChar,
  compareCharId,
  onToggleCompare,
  onDeleteChar,
  className
}) => {
  const [googleUrl, setGoogleUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [pendingImports, setPendingImports] = useState<Character[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 선택 삭제 모드 및 선택된 ID 목록
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);

  const handleToggleSelectId = (id: string) => {
    setSelectedDeleteIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredChars: Character[]) => {
    if (selectedDeleteIds.length === filteredChars.length) {
      setSelectedDeleteIds([]);
    } else {
      setSelectedDeleteIds(filteredChars.map(c => c.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedDeleteIds.length === 0) return;
    if (confirm(`선택한 ${selectedDeleteIds.length}명의 캐릭터를 삭제하시겠습니까?`)) {
      const idsSet = new Set(selectedDeleteIds);
      setCharacters(prev => {
        const remaining = prev.filter(c => !idsSet.has(c.id));
        if (idsSet.has(selectedCharId)) {
          if (remaining.length > 0) onSelectChar(remaining[0].id);
          else onSelectChar('');
        }
        if (compareCharId && idsSet.has(compareCharId)) {
          onToggleCompare(compareCharId);
        }
        return remaining;
      });
      setSelectedDeleteIds([]);
      setIsSelectMode(false);
    }
  };

  const handleClearAll = () => {
    if (characters.length === 0) return;
    if (confirm(`등록된 전체 캐릭터(${characters.length}명)를 모두 삭제하시겠습니까?`)) {
      setCharacters([]);
      onSelectChar('');
      if (compareCharId) onToggleCompare(compareCharId);
      setSelectedDeleteIds([]);
      setIsSelectMode(false);
    }
  };

  const handleLoadGoogleSheet = async () => {
    if (!googleUrl.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { characters: newChars } = await fetchGoogleSheetCharacters(googleUrl);
      if (newChars.length === 0) {
        throw new Error('시트에서 유효한 캐릭터 데이터를 찾지 못했습니다.');
      }
      setPendingImports(newChars);
      setGoogleUrl('');
    } catch (err: any) {
      setErrorMessage(err.message || '구글 시트 연동 실패');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fileArray = Array.from(files);
      const mdFiles = fileArray.filter(f => f.name.toLowerCase().endsWith('.md'));
      const excelFiles = fileArray.filter(f => 
        f.name.toLowerCase().endsWith('.xlsx') || 
        f.name.toLowerCase().endsWith('.xls') || 
        f.name.toLowerCase().endsWith('.csv')
      );

      let importedChars: Character[] = [];

      if (mdFiles.length > 0) {
        const charsFromMd = await parseMarkdownFiles(mdFiles);
        importedChars = [...importedChars, ...charsFromMd];
      }

      for (const ef of excelFiles) {
        const { characters: charsFromExcel } = await parseExcelOrCsvFile(ef);
        importedChars = [...importedChars, ...charsFromExcel];
      }

      if (importedChars.length === 0) {
        throw new Error('선택한 파일에서 유효한 캐릭터 데이터를 추출하지 못했습니다.');
      }

      setPendingImports(importedChars);
    } catch (err: any) {
      setErrorMessage(err.message || '파일 불러오기 실패');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanUnreal = async (customPath?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let targetDir = customPath || 'D:\\Project_MF\\MolluFPS\\MolluFPS\\Content';
      
      const api = (window as any).electronAPI;
      if (api && api.scanUnrealProject) {
        if (customPath === 'select') {
          const selected = await api.openDirectoryDialog();
          if (!selected) {
            setIsLoading(false);
            return;
          }
          targetDir = selected;
        }

        const res = await api.scanUnrealProject(targetDir);
        if (!res.success) {
          throw new Error(res.error || '언리얼 에셋 스캔에 실패했습니다.');
        }
        if (!res.characters || res.characters.length === 0) {
          throw new Error('프로젝트에서 유효한 캐릭터 에셋을 찾지 못했습니다.');
        }
        setPendingImports(res.characters);
      } else {
        throw new Error('데스크톱 앱 환경(.exe)에서만 언리얼 프로젝트 직접 연동이 지원됩니다.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || '언리얼 에셋 불러오기 실패');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = (selectedList: Character[]) => {
    setCharacters(prev => {
      const existingIds = new Set(selectedList.map(c => c.id));
      const kept = prev.filter(c => !existingIds.has(c.id));
      return [...selectedList, ...kept];
    });

    if (selectedList[0]) onSelectChar(selectedList[0].id);
    if (selectedList[1]) onToggleCompare(selectedList[1].id);

    setPendingImports(null);
  };

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.weaponType && c.weaponType.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <aside className={`bg-[#18181b] flex flex-col h-full overflow-hidden select-none ${className || 'w-[320px] min-w-[320px] max-w-[320px] border-r border-white/[0.08] shrink-0'}`}>
      {pendingImports && (
        <ImportSelectModal
          importedCharacters={pendingImports}
          onConfirm={handleConfirmImport}
          onClose={() => setPendingImports(null)}
        />
      )}

      {/* 데이터 소스 임포트 패널 */}
      <div className="p-4 border-b border-white/[0.08] space-y-3 bg-[#23232a]/40">
        <span className="text-xs font-bold text-gray-300 block">
          데이터 불러오기
        </span>

        {/* 언리얼 엔진 MolluFPS 프로젝트 연동 버튼 */}
        <div className="flex gap-1.5">
          <button
            onClick={() => handleScanUnreal()}
            disabled={isLoading}
            title="MolluFPS/Content 폴더에서 이즈나, 시로코, 호시노(무기 2개) 등 에셋 스탯 자동 추출"
            className="flex-1 py-2 px-3 rounded-lg bg-[#0d99ff] hover:bg-[#0d99ff]/85 border border-[#0d99ff]/50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
          >
            <Gamepad2 className="w-4 h-4 text-white/90" />
            <span>🎮 MolluFPS 에셋 동기화</span>
          </button>
          <button
            onClick={() => handleScanUnreal('select')}
            disabled={isLoading}
            title="다른 언리얼 프로젝트 또는 Content 폴더 직접 지정"
            className="p-2 rounded-lg bg-[#23232a] hover:bg-white/10 border border-white/[0.08] text-gray-300 hover:text-white transition shrink-0"
          >
            <FolderOpen className="w-4 h-4 text-[#0d99ff]" />
          </button>
        </div>

        {/* 구글 시트 URL 입력창 */}
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="구글 스프레드시트 공유 링크..."
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadGoogleSheet()}
                className="w-full bg-[#18181b] border border-white/[0.08] rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#0d99ff]"
              />
            </div>
            <button
              onClick={handleLoadGoogleSheet}
              disabled={isLoading || !googleUrl.trim()}
              className="px-3 py-1.5 rounded-lg bg-[#0d99ff] hover:bg-[#0d99ff]/85 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 flex items-center gap-1"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '연동'}
            </button>
          </div>
        </div>

        {/* 파일 드래그 & 드롭 / 선택 존 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
            isDragging 
              ? 'border-[#0d99ff] bg-[#0d99ff]/10' 
              : 'border-white/[0.08] hover:border-[#0d99ff]/50 bg-[#18181b]/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.md"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
            <UploadCloud className="w-4 h-4 text-[#0d99ff]" />
            <span>파일 드래그 또는 클릭</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="flex items-center gap-1"><FileSpreadsheet className="w-3 h-3 text-gray-400" /> 엑셀/CSV</span>
            <span>•</span>
            <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-gray-400" /> .md 기획서</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="break-all">{errorMessage}</span>
          </div>
        )}
      </div>

      {/* 검색 바 */}
      <div className="p-3 border-b border-white/[0.08]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="캐릭터 이름 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#23232a] border border-white/[0.08] rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#0d99ff]"
          />
        </div>
      </div>

      {/* 캐릭터 목록 상단 관리 툴바 (목록 수, 선택 삭제, 전체 삭제) */}
      <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between bg-[#23232a]/30">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-300">
            목록 ({filteredCharacters.length})
          </span>
          {isSelectMode && selectedDeleteIds.length > 0 && (
            <span className="text-[10px] text-[#0d99ff] font-bold">
              ({selectedDeleteIds.length}개 선택)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isSelectMode ? (
            <>
              <button
                onClick={() => handleSelectAll(filteredCharacters)}
                className="px-2 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-gray-300 transition"
              >
                {selectedDeleteIds.length === filteredCharacters.length && filteredCharacters.length > 0
                  ? '선택 해제'
                  : '전체 선택'}
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedDeleteIds.length === 0}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 transition"
              >
                삭제 ({selectedDeleteIds.length})
              </button>
              <button
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedDeleteIds([]);
                }}
                className="px-1.5 py-0.5 rounded text-[10px] text-gray-400 hover:text-white transition"
              >
                취소
              </button>
            </>
          ) : (
            <>
              {characters.length > 0 && (
                <>
                  <button
                    onClick={() => setIsSelectMode(true)}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-gray-300 border border-white/[0.08] hover:text-white transition"
                  >
                    선택 삭제
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 hover:text-red-400 hover:bg-red-950/20 transition"
                  >
                    전체 삭제
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 캐릭터 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredCharacters.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">
            등록된 캐릭터가 없습니다.
          </div>
        ) : (
          filteredCharacters.map((char) => {
            const isSelected = char.id === selectedCharId;
            const isCompare = char.id === compareCharId;
            const isCheckedForDelete = selectedDeleteIds.includes(char.id);

            return (
              <div
                key={char.id}
                onClick={() => {
                  if (isSelectMode) {
                    handleToggleSelectId(char.id);
                  } else {
                    onSelectChar(char.id);
                  }
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                  isSelectMode && isCheckedForDelete
                    ? 'bg-[#23232a] border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.15)] ring-1 ring-red-500/40'
                    : isSelected
                    ? 'bg-[#23232a] border-[#0d99ff] shadow-[0_0_12px_rgba(13,153,255,0.18)] ring-1 ring-[#0d99ff]/50'
                    : isCompare
                    ? 'bg-[#23232a] border-[#e5a93c] shadow-[0_0_12px_rgba(229,169,60,0.18)] ring-1 ring-[#e5a93c]/50'
                    : 'bg-[#23232a]/60 border-white/[0.08] hover:border-white/20'
                }`}
              >
                {/* 상단 정보 및 뱃지/삭제 */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {/* 선택 삭제 모드 체크박스 */}
                    {isSelectMode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectId(char.id);
                        }}
                        className="text-gray-400 hover:text-white transition shrink-0"
                      >
                        {isCheckedForDelete ? (
                          <CheckSquare className="w-4 h-4 text-red-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    )}

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white tracking-wide">{char.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-gray-400 font-numeric">
                          {char.weaponType || '무기'}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">{char.position}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* 선택됨 뱃지 */}
                    {isSelected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0d99ff]/20 text-[#388bfd] border border-[#0d99ff]/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#0d99ff]" /> 선택됨
                      </span>
                    )}
                    {/* 비교 대상 뱃지 */}
                    {isCompare && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#e5a93c]/20 text-[#e5a93c] border border-[#e5a93c]/40 flex items-center gap-1">
                        <GitCompare className="w-3 h-3 text-[#e5a93c]" /> 비교 대상
                      </span>
                    )}

                    {/* 유닛 삭제 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`'${char.name}' 캐릭터를 삭제하시겠습니까?`)) {
                          onDeleteChar(char.id);
                        }
                      }}
                      title="캐릭터 삭제"
                      className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 핵심 스탯 요약 태그 (HP, 실드, 대미지, RPM) */}
                <div className="grid grid-cols-4 gap-1 text-center py-1.5 bg-black/30 rounded-lg text-xs font-numeric">
                  <div>
                    <span className="text-gray-400 block text-[10px] font-sans">체력</span>
                    <span className="text-white font-bold">{char.hp}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-sans">실드</span>
                    <span className="text-[#388bfd] font-bold">{char.barrier || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-sans">대미지</span>
                    <span className="text-white font-bold">{char.damage}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-sans">RPM</span>
                    <span className="text-white font-bold">{char.rpm}</span>
                  </div>
                </div>

                {/* 하단: 비교하기 버튼 하나로 통일 */}
                <div className="pt-1 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">클릭하여 스탯 편집</span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCompare(char.id);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      isCompare
                        ? 'bg-[#e5a93c] text-black shadow-sm hover:bg-[#e5a93c]/90'
                        : 'bg-white/5 hover:bg-[#e5a93c]/20 text-gray-300 hover:text-[#e5a93c]'
                    }`}
                  >
                    <GitCompare className="w-3 h-3" />
                    {isCompare ? '비교 해제' : '비교하기'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
