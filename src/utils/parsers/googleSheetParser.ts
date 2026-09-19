import Papa from 'papaparse';
import { Character } from '../../types/character';
import { mapRowToCharacter } from './smartMapper';

/**
 * 구글 스프레드시트 URL에서 Sheet ID 및 GID 추출
 */
export function extractGoogleSheetCsvUrl(url: string): string {
  const cleanUrl = url.trim();
  
  // 이미 CSV 내보내기 URL인 경우
  if (cleanUrl.includes('output=csv') || cleanUrl.includes('export?format=csv') || cleanUrl.includes('gviz/tq?tqx=out:csv')) {
    return cleanUrl;
  }

  // 표준 구글 스프레드시트 URL 형식: /d/SPREADSHEET_ID/edit
  const match = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match || !match[1]) {
    throw new Error('올바른 구글 스프레드시트 URL 형식이 아닙니다. (/spreadsheets/d/... 형태 필요)');
  }

  const sheetId = match[1];
  
  // 특정 시트 gid가 있는지 확인
  const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/);
  const gidParam = gidMatch && gidMatch[1] ? `&gid=${gidMatch[1]}` : '';

  // Google Visualization API CSV 다운로드 엔드포인트
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`;
}

/**
 * 구글 스프레드시트 URL로부터 캐릭터 목록 추출
 */
export async function fetchGoogleSheetCharacters(
  url: string,
  customMapping?: Record<string, string>
): Promise<{ characters: Character[]; rawHeaders: string[] }> {
  const csvUrl = extractGoogleSheetCsvUrl(url);

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`구글 시트 데이터를 가져올 수 없습니다 (상태코드: ${response.status}). 스프레드시트가 '링크가 있는 모든 사용자에게 공개'되어 있는지 확인해주세요.`);
  }

  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors && results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(`CSV 파싱 실패: ${results.errors[0].message}`));
          return;
        }

        const rawHeaders = results.meta.fields || [];
        const characters: Character[] = [];

        for (const row of results.data as Record<string, any>[]) {
          // 이름이나 ID가 비어있는 빈 행 제외
          const char = mapRowToCharacter(row, customMapping);
          if (char.name && char.name !== '미확인 유닛') {
            characters.push(char);
          }
        }

        resolve({ characters, rawHeaders });
      },
      error: (error: any) => reject(error)
    });
  });
}
