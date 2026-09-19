import React, { useState } from 'react';
import { Character } from '../types/character';
import { CheckSquare, Square, X, PlusCircle, Shield, Crosshair, Zap } from 'lucide-react';

interface ImportSelectModalProps {
  importedCharacters: Character[];
  onConfirm: (selected: Character[]) => void;
  onClose: () => void;
}

export const ImportSelectModal: React.FC<ImportSelectModalProps> = ({
  importedCharacters,
  onConfirm,
  onClose
}) => {
  // 기본적으로 모두 체크된 상태로 시작
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(importedCharacters.map(c => c.id))
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(importedCharacters.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    const selectedList = importedCharacters.filter(c => selectedIds.has(c.id));
    onConfirm(selectedList);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#161b22] border border-[rgba(0,242,255,0.3)] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* 모달 헤더 */}
        <div className="p-4 bg-[#0d1117] border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-sm text-[var(--accent-cyan)] flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> 가져온 데이터 유닛 선택
            </h3>
            <p className="text-xs text-[var(--text-dim)] mt-0.5">
              총 {importedCharacters.length}개 유닛 중 등록할 캐릭터를 선택하세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 제어 바: 전체선택/해제 */}
        <div className="px-5 py-2.5 bg-black/20 border-b border-white/5 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition flex items-center gap-1 font-medium"
            >
              <CheckSquare className="w-3.5 h-3.5 text-cyan-400" /> 전체 선택
            </button>
            <button
              onClick={deselectAll}
              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition flex items-center gap-1 font-medium"
            >
              <Square className="w-3.5 h-3.5 text-gray-400" /> 전체 해제
            </button>
          </div>
          <span className="text-[var(--text-dim)]">
            선택됨: <b className="text-[var(--accent-cyan)] font-numeric">{selectedIds.size}</b> / {importedCharacters.length}개
          </span>
        </div>

        {/* 유닛 목록 테이블 */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[var(--text-dim)] pb-2 font-medium">
                <th className="py-2 px-3 w-10 text-center">선택</th>
                <th className="py-2 px-3">이름</th>
                <th className="py-2 px-3">포지션</th>
                <th className="py-2 px-3"><span className="flex items-center gap-1"><Shield className="w-3 h-3 text-green-400" /> HP</span></th>
                <th className="py-2 px-3"><span className="flex items-center gap-1"><Crosshair className="w-3 h-3 text-amber-400" /> 발당대미지</span></th>
                <th className="py-2 px-3">RPM</th>
                <th className="py-2 px-3"><span className="flex items-center gap-1"><Zap className="w-3 h-3 text-purple-400" /> 스킬1 대미지</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {importedCharacters.map((c) => {
                const isChecked = selectedIds.has(c.id);
                return (
                  <tr
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    className={`cursor-pointer transition ${
                      isChecked ? 'bg-cyan-950/20 hover:bg-cyan-950/30' : 'hover:bg-white/[0.02] opacity-60'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // 행 클릭으로 토글
                        className="rounded cursor-pointer accent-[var(--accent-cyan)]"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">{c.name}</td>
                    <td className="py-2.5 px-3 text-gray-400">{c.position}</td>
                    <td className="py-2.5 px-3 font-numeric text-green-400 font-bold">{c.hp}</td>
                    <td className="py-2.5 px-3 font-numeric text-amber-400 font-bold">{c.damage}</td>
                    <td className="py-2.5 px-3 font-numeric text-white">{c.rpm}</td>
                    <td className="py-2.5 px-3 font-numeric text-purple-300">
                      {c.skill1?.damage ? `${c.skill1.damage} (${c.skill1.name})` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 모달 하단 버튼 바 */}
        <div className="p-4 bg-[#0d1117] border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="px-5 py-2 rounded-xl bg-[var(--accent-cyan)] hover:bg-cyan-300 text-black text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,242,255,0.3)]"
          >
            선택한 {selectedIds.size}개 유닛 등록하기
          </button>
        </div>
      </div>
    </div>
  );
};
