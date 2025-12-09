module.exports = {
  presets: [require('../../shared/tailwind.config.js')],
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
    './index.html',
    '../../shared/**/*.{ts,tsx,js,jsx,css}',
    '../../shared/components/**/*.{ts,tsx,js,jsx}',
    '../../shared/hooks/**/*.{ts,tsx,js,jsx}',
    '../../shared/lib/**/*.{ts,tsx,js,jsx}',
    '../../shared/globals.css',
  ],
};
