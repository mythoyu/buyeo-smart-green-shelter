const path = require('path');

module.exports = {
  content: [
    // 루트 프로젝트의 소스 파일들
    path.join(__dirname, 'src/**/*.{js,ts,jsx,tsx}'),
    // shared 패키지의 컴포넌트들 (사용하는 쪽에서 참조)
    path.join(__dirname, 'packages/shared/components/**/*.{js,ts,jsx,tsx}'),
    path.join(__dirname, 'packages/shared/hooks/**/*.{js,ts,jsx,tsx}'),
    path.join(__dirname, 'packages/shared/lib/**/*.{js,ts,jsx,tsx}'),
  ],
  presets: [require('./packages/shared/tailwind.config.js')],
  theme: {
    extend: {},
  },
  plugins: [],
};
