import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Character } from '../../types/character';
import { mapRowToCharacter } from './smartMapper';

/**
 * 엑셀(.xlsx, .xls) 또는 CSV 파일을 읽어서 캐릭터 데이터 목록 반환
 */
export async function parseExcelOrCsvFile(
  file: File,
  customMapping?: Record<string, string>
): Promise<{ characters: Character[]; rawHeaders: string[]; sheetNames: string[] }> {
  const fileName = file.name.toLowerCase();

  // CSV 파일 직접 처리 (더 빠르고 인코딩 호환성 좋음)
  if (fileName.endsWith('.csv')) {
    return parseCsvFile(file, customMapping);
  }

  // 엑셀 파일 (.xlsx, .xls) 처리
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error('엑셀 파일 내에 시트가 존재하지 않습니다.');
  }

  // 기본적으로 첫 번째 시트 파싱
  const firstSheet = workbook.Sheets[sheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

  if (jsonData.length === 0) {
    throw new Error('시트 내에 유효한 데이터 행이 없습니다.');
  }

  const rawHeaders = Object.keys(jsonData[0] || {});
  const characters: Character[] = [];

  for (const row of jsonData) {
    const char = mapRowToCharacter(row, customMapping);
    if (char.name && char.name !== '미확인 유닛') {
      characters.push(char);
    }
  }

  return { characters, rawHeaders, sheetNames };
}

function parseCsvFile(
  file: File,
  customMapping?: Record<string, string>
): Promise<{ characters: Character[]; rawHeaders: string[]; sheetNames: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawHeaders = results.meta.fields || [];
        const characters: Character[] = [];

        for (const row of results.data as Record<string, any>[]) {
          const char = mapRowToCharacter(row, customMapping);
          if (char.name && char.name !== '미확인 유닛') {
            characters.push(char);
          }
        }

        resolve({
          characters,
          rawHeaders,
          sheetNames: [file.name]
        });
      },
      error: (err) => reject(new Error(`CSV 파싱 실패: ${err.message}`))
    });
  });
}
