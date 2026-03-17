import * as XLSX from 'xlsx';

const BLOCK_STARTS = [2, 30, 58, 86, 114, 142];

const FIELD_OFFSETS = {
  fullName: 0,
  nickname: 1,
  country: 2,
  city: 3,
  originCountry: 4,
  languages: 5,
  tribe: 6,
  sequenceNumber: 7,
  warriorName: 8,
  email: 9,
  phone: 10,
  ig: 11,
  li: 12,
  fb: 13,
  otherSocial: 14,
  profession: 15,
  industry: 16,
  funFact: 17,
  supportNeeded: 18,
  supportDetails: 19,
  coreCompetencies: 20,
  valueAdd: 21,
  topGoals: 22,
  biggestLearning: 23,
  favoriteMoment: 24,
  wordsOfEncouragement: 25,
  photo: 26,
  consent: 27,
};

function cleanText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n+ */g, ' ')
    .trim();
}

function cleanMultilineText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitCommaSeparated(value) {
  const items = [];
  let current = '';
  let depth = 0;

  for (const char of value) {
    if (char === '(') {
      depth += 1;
    } else if (char === ')' && depth > 0) {
      depth -= 1;
    }

    if (char === ',' && depth === 0) {
      const item = current.trim();

      if (item) {
        items.push(item);
      }

      current = '';
      continue;
    }

    current += char;
  }

  const item = current.trim();

  if (item) {
    items.push(item);
  }

  return items;
}

function splitList(value) {
  const cleaned = cleanMultilineText(value);

  if (!cleaned) {
    return [];
  }

  return cleaned
    .split('\n')
    .flatMap((line) => splitCommaSeparated(line))
    .map((item) => item.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean);
}

function splitGoals(value) {
  const cleaned = cleanMultilineText(value);

  if (!cleaned) {
    return [];
  }

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines.map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim()).filter(Boolean);
  }

  return cleaned
    .split(/\s+(?=(?:\d+\.|\d+\)|[-*•])\s+)/)
    .map((item) => item.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean);
}

function cleanLink(value) {
  const cleaned = cleanText(value);
  return cleaned || '#';
}

function cleanNumber(value) {
  const cleaned = cleanText(value);
  const match = cleaned.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function getField(row, start, offset) {
  return row[start + offset];
}

function getBlockValue(row, start, fieldName) {
  const offset = FIELD_OFFSETS[fieldName];
  const rawValue = getField(row, start, offset);

  if (fieldName === 'sequenceNumber') {
    return cleanNumber(rawValue);
  }

  if (fieldName === 'supportDetails' || fieldName === 'topGoals') {
    return cleanMultilineText(rawValue);
  }

  return cleanText(rawValue);
}

function getBlock(row, start) {
  return {
    start,
    fullName: getBlockValue(row, start, 'fullName'),
    nickname: getBlockValue(row, start, 'nickname'),
    country: getBlockValue(row, start, 'country'),
    city: getBlockValue(row, start, 'city'),
    originCountry: getBlockValue(row, start, 'originCountry'),
    languages: getBlockValue(row, start, 'languages'),
    tribe: getBlockValue(row, start, 'tribe'),
    sequenceNumber: getBlockValue(row, start, 'sequenceNumber'),
    warriorName: getBlockValue(row, start, 'warriorName'),
    email: getBlockValue(row, start, 'email'),
    phone: getBlockValue(row, start, 'phone'),
    ig: getBlockValue(row, start, 'ig'),
    li: getBlockValue(row, start, 'li'),
    fb: getBlockValue(row, start, 'fb'),
    otherSocial: getBlockValue(row, start, 'otherSocial'),
    profession: getBlockValue(row, start, 'profession'),
    industry: getBlockValue(row, start, 'industry'),
    funFact: getBlockValue(row, start, 'funFact'),
    supportNeeded: getBlockValue(row, start, 'supportNeeded'),
    supportDetails: getBlockValue(row, start, 'supportDetails'),
    coreCompetencies: getBlockValue(row, start, 'coreCompetencies'),
    valueAdd: getBlockValue(row, start, 'valueAdd'),
    topGoals: getBlockValue(row, start, 'topGoals'),
    biggestLearning: getBlockValue(row, start, 'biggestLearning'),
    favoriteMoment: getBlockValue(row, start, 'favoriteMoment'),
    wordsOfEncouragement: getBlockValue(row, start, 'wordsOfEncouragement'),
    photo: getBlockValue(row, start, 'photo'),
    consent: getBlockValue(row, start, 'consent'),
  };
}

function scoreBlock(block) {
  const importantFields = [
    'fullName',
    'nickname',
    'country',
    'city',
    'languages',
    'tribe',
    'warriorName',
    'profession',
    'industry',
    'biggestLearning',
  ];

  return importantFields.reduce((score, fieldName) => {
    return score + (block[fieldName] ? 1 : 0);
  }, 0);
}

function pickPrimaryBlock(blocks) {
  return blocks
    .map((block) => ({ block, score: scoreBlock(block) }))
    .sort((left, right) => right.score - left.score)[0]?.block || null;
}

function pickMergedValue(blocks, primaryBlock, fieldName) {
  const primaryValue = primaryBlock[fieldName];

  if (primaryValue !== '' && primaryValue !== null) {
    return primaryValue;
  }

  for (const block of blocks) {
    const value = block[fieldName];

    if (value !== '' && value !== null) {
      return value;
    }
  }

  return fieldName === 'sequenceNumber' ? null : '';
}

function hasMeaningfulData(blocks) {
  return blocks.some((block) => block.fullName || block.warriorName || block.email || block.phone);
}

function normalizeRow(row, index) {
  const blocks = BLOCK_STARTS.map((start) => getBlock(row, start));

  if (!hasMeaningfulData(blocks)) {
    return null;
  }

  const primaryBlock = pickPrimaryBlock(blocks);

  if (!primaryBlock || !pickMergedValue(blocks, primaryBlock, 'fullName')) {
    return null;
  }

  return {
    id: index + 1,
    fullName: pickMergedValue(blocks, primaryBlock, 'fullName'),
    nickname: pickMergedValue(blocks, primaryBlock, 'nickname'),
    warriorName: pickMergedValue(blocks, primaryBlock, 'warriorName'),
    tribe: pickMergedValue(blocks, primaryBlock, 'tribe'),
    sequenceNumber: pickMergedValue(blocks, primaryBlock, 'sequenceNumber'),
    city: pickMergedValue(blocks, primaryBlock, 'city'),
    country: pickMergedValue(blocks, primaryBlock, 'country'),
    languages: pickMergedValue(blocks, primaryBlock, 'languages'),
    profession: pickMergedValue(blocks, primaryBlock, 'profession'),
    industry: pickMergedValue(blocks, primaryBlock, 'industry'),
    supportNeeded: pickMergedValue(blocks, primaryBlock, 'supportNeeded'),
    supportNeededList: splitList(pickMergedValue(blocks, primaryBlock, 'supportNeeded')),
    supportDetails: pickMergedValue(blocks, primaryBlock, 'supportDetails'),
    coreCompetencies: pickMergedValue(blocks, primaryBlock, 'coreCompetencies'),
    biggestLearning: pickMergedValue(blocks, primaryBlock, 'biggestLearning'),
    favoriteMoment: pickMergedValue(blocks, primaryBlock, 'favoriteMoment'),
    wordsOfEncouragement: pickMergedValue(blocks, primaryBlock, 'wordsOfEncouragement'),
    funFact: pickMergedValue(blocks, primaryBlock, 'funFact'),
    valueAdd: pickMergedValue(blocks, primaryBlock, 'valueAdd'),
    topGoals: pickMergedValue(blocks, primaryBlock, 'topGoals'),
    topGoalsList: splitGoals(pickMergedValue(blocks, primaryBlock, 'topGoals')),
    socials: {
      ig: cleanLink(pickMergedValue(blocks, primaryBlock, 'ig')),
      li: cleanLink(pickMergedValue(blocks, primaryBlock, 'li')),
      fb: cleanLink(pickMergedValue(blocks, primaryBlock, 'fb')),
    },
    photo: cleanLink(pickMergedValue(blocks, primaryBlock, 'photo')),
  };
}

export function convertRows(rows) {
  if (!Array.isArray(rows) || rows.length <= 1) {
    return [];
  }

  return rows
    .slice(1)
    .map((row, index) => normalizeRow(row, index))
    .filter(Boolean)
    .map((record, index) => ({ ...record, id: index + 1 }));
}

export function convertWorkbook(workbook) {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

  return convertRows(rows);
}

export function convertWorkbookArrayBuffer(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    raw: false,
    dense: false,
  });

  return convertWorkbook(workbook);
}