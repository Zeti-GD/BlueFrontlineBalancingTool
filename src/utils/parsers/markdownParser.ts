import { Character } from '../../types/character';
import { mapRowToCharacter } from './smartMapper';

/**
 * 마크다운 기획서 텍스트에서 캐릭터 스탯과 스킬 정보를 추출하여 Character 객체로 변환
 */
export function parseMarkdownCharacter(markdownText: string, fallbackId: string = 'char'): Character {
  const rowData: Record<string, any> = {
    id: fallbackId,
    name: '',
    position: '스트라이커'
  };

  // 1. 모든 마크다운 테이블 행 (| key | val |) 추출
  const lines = markdownText.split('\n');
  const tableRows: string[][] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim().replace(/\*\*/g, ''));
      if (cells.length >= 2 && !cells.every(c => c.match(/^[-:]+$/))) {
        tableRows.push(cells);
      }
    }
  }

  // 2. 키-값 쌍 스캔
  for (const cells of tableRows) {
    // 3개 열 테이블 (| Idx | 스탯명 | 스탯 값 |) 또는 2개 열 테이블 (| 스탯명 | 값 |)
    if (cells.length >= 3) {
      const key = cells[1].trim();
      const val = cells[2].trim();
      if (key && val && key !== '스탯명') {
        rowData[key] = val;
      }
    } else if (cells.length === 2) {
      const key = cells[0].trim();
      const val = cells[1].trim();
      if (key && val && key !== '항목' && key !== '스탯명') {
        rowData[key] = val;
      }
    }
  }

  // 3. 파일 본문 제목 등에서 캐릭터 이름 보완
  if (!rowData.name || rowData.name === 'N' || rowData.name === '') {
    const nameMatch = markdownText.match(/(?:이름|Character_Name)\s*\|\s*([^\s\|]+)/i) ||
                      markdownText.match(/#+\s*(?:1\.\s*)?([^\n#]+)/);
    if (nameMatch && nameMatch[1]) {
      rowData.name = nameMatch[1].trim();
    } else {
      rowData.name = fallbackId;
    }
  }

  // 4. 스킬 섹션 정밀 검색 (하드보일드 샷, 감전 폭탄, 액티브 스킬 등)
  let skill1Name = rowData.Character_Skill_1 || '스킬 1';
  let skill1Dmg = 0;
  let skill2Name = rowData.Character_Skill_2 || '스킬 2';
  let skill2Dmg = 0;

  // 스킬 피해/폭발 피해/대미지 패턴 검색
  const skillDamageMatches = Array.from(markdownText.matchAll(/(?:폭발 피해|스킬 피해|피해량|대미지|데미지)\s*\|\s*(?:[^\|]+\|\s*)?([0-9\.]+)/gi));
  if (skillDamageMatches.length >= 1) {
    skill1Dmg = parseFloat(skillDamageMatches[0][1]) || 0;
  }
  if (skillDamageMatches.length >= 2) {
    skill2Dmg = parseFloat(skillDamageMatches[1][1]) || 0;
  }

  // 스킬 이름이 없을 경우 본문 헤더 탐색
  const skillHeaders = Array.from(markdownText.matchAll(/##+\s*(?:[A-Z]\.\s*)?(?:액티브\s*스킬\s*\d*[:：]?\s*|스킬\s*\d*[:：]?\s*)([^\n\(]+)/gi));
  if (skillHeaders.length >= 1 && (!skill1Name || skill1Name === '스킬 1' || skill1Name === 'Null')) {
    skill1Name = skillHeaders[0][1].trim();
  }
  if (skillHeaders.length >= 2 && (!skill2Name || skill2Name === '스킬 2' || skill2Name === 'Null')) {
    skill2Name = skillHeaders[1][1].trim();
  }

  rowData.skill1Name = skill1Name;
  rowData.skill1Dmg = skill1Dmg;
  rowData.skill2Name = skill2Name;
  rowData.skill2Dmg = skill2Dmg;

  return mapRowToCharacter(rowData);
}

/**
 * 복수의 마크다운 파일(File 객체 목록)을 일괄 파싱
 */
export async function parseMarkdownFiles(files: File[]): Promise<Character[]> {
  const characters: Character[] = [];

  for (const file of files) {
    if (file.name.endsWith('.md')) {
      const text = await file.text();
      const fallbackId = file.name.replace(/\.md$/i, '');
      const char = parseMarkdownCharacter(text, fallbackId);
      characters.push(char);
    }
  }

  return characters;
}
