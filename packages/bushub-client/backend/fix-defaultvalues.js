const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, 'src/data/commands');

// 각 파일별로 누락된 defaultValue 추가
const files = [
  'aircurtain.ts',
  'bench.ts', 
  'door.ts',
  'externalsw.ts',
  'integrated_sensor.ts'
];

files.forEach(fileName => {
  const filePath = path.join(commandsDir, fileName);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 패턴별로 defaultValue 추가
  const patterns = [
    // 시간 관련
    { 
      regex: /(action: { get: 'GET_START_TIME_1_HOUR', set: 'SET_START_TIME_1_HOUR' },\s*)(?!\s*defaultValue)/,
      replacement: "$1    defaultValue: 8,\n  "
    },
    { 
      regex: /(action: { get: 'GET_START_TIME_1_MINUTE', set: 'SET_START_TIME_1_MINUTE' },\s*)(?!\s*defaultValue)/,
      replacement: "$1    defaultValue: 0,\n  "
    },
    { 
      regex: /(action: { get: 'GET_END_TIME_1_HOUR', set: 'SET_END_TIME_1_HOUR' },\s*)(?!\s*defaultValue)/,
      replacement: "$1    defaultValue: 22,\n  "
    },
    { 
      regex: /(action: { get: 'GET_END_TIME_1_MINUTE', set: 'SET_END_TIME_1_MINUTE' },\s*)(?!\s*defaultValue)/,
      replacement: "$1    defaultValue: 0,\n  "
    },
    // 기본 boolean/auto/power
    { 
      regex: /(action: { get: 'GET_AUTO', set: 'SET_AUTO' },\s*)(?!\s*defaultValue)/,
      replacement: "$1    defaultValue: true,\n  "
    },
    { 
      regex: /(action: { get: 'GET_POWER', set: 'SET_POWER' },\s*)(?!\s*defaultValue)/,
      replacement: "$1    defaultValue: false,\n  "
    },
    // speed
    { 
      regex: /(action: { get: 'GET_SPEED', set: 'SET_SPEED' },\s*)(?!\s*defaultValue)/,
      replacement: "$1    defaultValue: 1,\n  "
    }
  ];
  
  patterns.forEach(pattern => {
    content = content.replace(pattern.regex, pattern.replacement);
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${fileName}`);
});

console.log('All files fixed!');
