const path = require('path');

/** 루트 기준 레거시 설정. 실제 UI는 `packages/bushub-client/frontend/tailwind.config.js` 사용. */
module.exports = {
  content: [path.join(__dirname, 'src/**/*.{js,ts,jsx,tsx}')],
  theme: {
    extend: {},
  },
  plugins: [],
};
