import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'APC100 시리얼 테스트 (로컬 전용)',
  description: '피플카운터(APC100) RS485 시리얼 커맨드 로컬 테스트 도구',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
