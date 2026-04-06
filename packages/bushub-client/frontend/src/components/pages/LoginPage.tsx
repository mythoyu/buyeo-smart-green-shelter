import { Eye, EyeOff, User, AlertCircle, Leaf } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { useLogin } from '../../api/queries/auth';
import { useApiKey } from '../../contexts/ApiKeyContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  validatePassword,
  getPasswordStrengthColor,
  getPasswordStrengthText,
  getValidationStatusColor,
  getValidationIcon,
} from '../../utils/passwordValidation';
import { nowKstFormatted } from '../../utils/kstDateTime';
import VersionInfo from '../common/VersionInfo';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Alert,
  AlertDescription,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { setIsLoggedIn, setUser } = useAuth();
  const { setApiKey } = useApiKey();

  // React Query mutation 최적화
  const loginMutation = useLogin({
    onSuccess: (response: any) => {
      console.log('🔍 로그인 응답 전체:', response);
      console.log('🔍 사용자 데이터:', response?.data?.user);

      if (response && response.success && response.data) {
        // 로그인 성공 처리
        setIsLoggedIn(true);

        setUser({
          id: response.data.user.id,
          name: response.data.user.username,
          role: response.data.user.role,
        });

        const apiKey = response.data.token || '';
        console.log('설정할 API 키:', apiKey);
        console.log('설정할 사용자 role:', response.data.user.role);
        setApiKey(apiKey);

        toast.success('로그인에 성공했습니다.');
        onLoginSuccess();
      }
    },
    onError: (error: any) => {
      console.error('로그인 오류:', error);
      toast.error(error.message || '로그인 중 오류가 발생했습니다.');
    },
  });

  // React Query 내장 상태 사용
  const { isPending, error, reset } = loginMutation;

  // 로그인 페이지 로드 시 환경 정보 로깅
  useEffect(() => {
    console.log('🔐 LoginPage Mount Debug:', {
      timestamp: nowKstFormatted(),
      userAgent: navigator.userAgent,
      location: window.location.href,
    });
  }, []);

  // 에러 발생 시 아이디 필드에 포커스
  useEffect(() => {
    if (error) {
      document.getElementById('id')?.focus();
    }
  }, [error]);

  // ESC 키로 Tooltip 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && passwordFocused) {
        setPasswordFocused(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [passwordFocused]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    reset(); // 이전 에러 상태 초기화

    // 기본 검증
    if (!id) {
      toast.error('아이디를 입력하세요.');
      return;
    }

    if (!password) {
      toast.error('비밀번호를 입력하세요.');
      return;
    }

    // 비밀번호 검증
    const validation = validatePassword(password);
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }

    // React Query mutation 실행
    loginMutation.mutate({
      username: id,
      password,
    });
  };

  const passwordValidation = password ? validatePassword(password) : null;

  return (
    <div className='min-h-screen login-page flex'>
      {/* 왼쪽 배경 이미지 섹션 */}
      <div className='hidden lg:block flex-1 relative overflow-hidden background-animation'>
        {/* 움직이는 도형들 */}
        <div className='floating-shapes'>
          <div className='shape'></div>
          <div className='shape'></div>
          <div className='shape'></div>
          <div className='shape'></div>
        </div>

        {/* 배경 SVG 애니메이션 */}
        <div className='absolute inset-0 opacity-20'>
          <svg width='100%' height='100%' viewBox='0 0 800 500' fill='none' xmlns='http://www.w3.org/2000/svg'>
            {/* 배경 그라데이션 */}
            <defs>
              <radialGradient id='bgGradient' cx='50%' cy='50%' r='50%'>
                <stop offset='0%' stopColor='rgba(34, 197, 94, 0.1)' />
                <stop offset='100%' stopColor='rgba(34, 197, 94, 0.05)' />
              </radialGradient>
            </defs>
            <rect width='100%' height='100%' fill='url(#bgGradient)' />

            {/* 자연/그린 쉼터 아이콘들 */}
            <g fill='rgba(34, 197, 94, 0.1)'>
              {/* 나무 1 */}
              <g className='shelter-animation'>
                <path
                  d='M100 200 L120 200 L110 160 Z'
                  fill='rgba(34, 197, 94, 0.3)'
                  stroke='rgba(34, 197, 94, 0.5)'
                  strokeWidth='2'
                />
                <rect x='108' y='200' width='4' height='20' fill='rgba(139, 69, 19, 0.4)' />
              </g>

              {/* 나무 2 */}
              <g className='shelter-animation' style={{ animationDelay: '2s' }}>
                <path
                  d='M250 250 L270 250 L260 210 Z'
                  fill='rgba(34, 197, 94, 0.3)'
                  stroke='rgba(34, 197, 94, 0.5)'
                  strokeWidth='2'
                />
                <rect x='258' y='250' width='4' height='20' fill='rgba(139, 69, 19, 0.4)' />
              </g>

              {/* 나무 3 */}
              <g className='shelter-animation' style={{ animationDelay: '4s' }}>
                <path
                  d='M400 180 L420 180 L410 140 Z'
                  fill='rgba(34, 197, 94, 0.3)'
                  stroke='rgba(34, 197, 94, 0.5)'
                  strokeWidth='2'
                />
                <rect x='408' y='180' width='4' height='20' fill='rgba(139, 69, 19, 0.4)' />
              </g>

              {/* 그린 쉼터 건물 */}
              <g className='building-hover'>
                <rect x='300' y='300' width='120' height='80' rx='12' fill='rgba(34, 197, 94, 0.2)' />
                <rect x='310' y='310' width='100' height='60' rx='8' fill='rgba(255, 255, 255, 0.4)' />
                <rect x='320' y='320' width='20' height='40' rx='2' fill='rgba(34, 197, 94, 0.3)' />
                <rect x='350' y='320' width='20' height='40' rx='2' fill='rgba(34, 197, 94, 0.3)' />
                <rect x='380' y='320' width='20' height='40' rx='2' fill='rgba(34, 197, 94, 0.3)' />
                <rect x='410' y='320' width='20' height='40' rx='2' fill='rgba(34, 197, 94, 0.3)' />
                {/* 지붕 - 그린 */}
                <path d='M290 300 L420 300 L355 280 Z' fill='rgba(34, 197, 94, 0.4)' />
              </g>

              {/* 잔디/땅 */}
              <rect x='0' y='400' width='800' height='40' fill='rgba(34, 197, 94, 0.1)' />
              <rect x='0' y='410' width='800' height='20' fill='rgba(34, 197, 94, 0.2)' />
            </g>
          </svg>
        </div>

        {/* 텍스트 오버레이 */}
        <div className='absolute inset-0 flex items-center justify-center z-20 text-white'>
          <div className='text-center fade-in-up w-full max-w-lg px-12'>
            {/* 스마트 그린 쉼터 로고 */}
            <div className='mb-8 shelter-icon-pulse flex justify-center'>
              <svg
                width='80'
                height='80'
                viewBox='0 0 80 80'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                className='logo-svg logo-glow'
              >
                {/* 그린 쉼터 건물 */}
                <rect
                  x='20'
                  y='30'
                  width='40'
                  height='35'
                  rx='4'
                  fill='rgba(255, 255, 255, 0.9)'
                  stroke='rgba(34, 197, 94, 0.8)'
                  strokeWidth='2'
                />
                {/* 지붕 - 그린 */}
                <path
                  d='M15 30 L65 30 L40 15 Z'
                  fill='rgba(34, 197, 94, 0.8)'
                  stroke='rgba(34, 197, 94, 1)'
                  strokeWidth='2'
                />
                {/* 창문들 */}
                <rect
                  x='25'
                  y='40'
                  width='8'
                  height='10'
                  rx='2'
                  fill='rgba(34, 197, 94, 0.6)'
                  className='window-shine'
                />
                <rect
                  x='35'
                  y='40'
                  width='8'
                  height='10'
                  rx='2'
                  fill='rgba(34, 197, 94, 0.6)'
                  className='window-shine'
                />
                <rect
                  x='47'
                  y='40'
                  width='8'
                  height='10'
                  rx='2'
                  fill='rgba(34, 197, 94, 0.6)'
                  className='window-shine'
                />
                {/* 문 */}
                <rect
                  x='32'
                  y='50'
                  width='16'
                  height='15'
                  rx='2'
                  fill='rgba(34, 197, 94, 0.7)'
                />
                {/* 나무 */}
                <path
                  d='M10 50 L15 50 L12.5 40 Z'
                  fill='rgba(34, 197, 94, 0.6)'
                  stroke='rgba(34, 197, 94, 0.8)'
                  strokeWidth='1.5'
                />
                <rect x='12' y='50' width='2' height='8' fill='rgba(139, 69, 19, 0.6)' />
                <path
                  d='M65 50 L70 50 L67.5 40 Z'
                  fill='rgba(34, 197, 94, 0.6)'
                  stroke='rgba(34, 197, 94, 0.8)'
                  strokeWidth='1.5'
                />
                <rect x='67' y='50' width='2' height='8' fill='rgba(139, 69, 19, 0.6)' />
                {/* 잔디 */}
                <rect x='5' y='65' width='70' height='8' fill='rgba(34, 197, 94, 0.3)' />
              </svg>
            </div>

            {/* 메인 타이틀 */}
            <div className='mb-8'>
              <h1 className='text-4xl font-bold mb-3 text-white drop-shadow-lg gradient-text'>
                스마트 그린 쉼터
                <br />
                관리 시스템
              </h1>
              <div className='w-24 h-1 bg-green-300 mx-auto rounded-full mb-4 animate-pulse'></div>
              <p className='text-xl text-green-100 font-medium'>통합 제어 시스템</p>
            </div>

            {/* 기능 카드들 */}
            <div className='grid grid-cols-1 gap-4 w-full'>
              {/* 디바이스 관리 */}
              <div className='function-card bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 group hover:scale-105 hover:shadow-xl'>
                <div className='flex items-center space-x-3'>
                  <div className='w-10 h-10 bg-green-400/30 rounded-lg flex items-center justify-center group-hover:bg-green-400/50 transition-all group-hover:scale-110'>
                    <svg className='w-5 h-5 text-green-200' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                      />
                    </svg>
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-white font-semibold text-sm group-hover:text-green-200 transition-colors'>
                      디바이스 관리
                    </h3>
                    <p className='text-green-200 text-xs group-hover:text-green-100 transition-colors'>
                      조명, 냉난방기, 센서 등 통합 제어
                    </p>
                  </div>
                </div>
              </div>

              {/* 로그 분석 */}
              <div className='function-card bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 group hover:scale-105 hover:shadow-xl'>
                <div className='flex items-center space-x-3'>
                  <div className='w-10 h-10 bg-purple-400/30 rounded-lg flex items-center justify-center group-hover:bg-purple-400/50 transition-all group-hover:scale-110'>
                    <svg className='w-5 h-5 text-purple-200' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-white font-semibold text-sm group-hover:text-purple-200 transition-colors'>
                      로그 분석
                    </h3>
                    <p className='text-green-200 text-xs group-hover:text-green-100 transition-colors'>
                      오류 로그 및 시스템 상태 모니터링
                    </p>
                  </div>
                </div>
              </div>

              {/* 시스템 설정 */}
              <div className='function-card bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 group hover:scale-105 hover:shadow-xl'>
                <div className='flex items-center space-x-3'>
                  <div className='w-10 h-10 bg-orange-400/30 rounded-lg flex items-center justify-center group-hover:bg-orange-400/50 transition-all group-hover:scale-110'>
                    <svg className='w-5 h-5 text-orange-200' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                      />
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                      />
                    </svg>
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-white font-semibold text-sm group-hover:text-orange-200 transition-colors'>
                      시스템 설정
                    </h3>
                    <p className='text-green-200 text-xs group-hover:text-green-100 transition-colors'>
                      환경 설정 및 시스템 구성
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 오른쪽 로그인 폼 섹션 */}
      <div className='w-full flex items-center justify-center px-4 sm:px-8 bg-background lg:flex-1'>
        <div className='w-full max-w-md fade-in-up'>
          {/* 모바일용 헤더 */}
          <div className='lg:hidden text-center m-6'>
            <div className='flex items-center justify-center gap-2 shelter-icon-pulse'>
              <Leaf className='w-8 h-8 text-green-600 dark:text-green-400' />
              <span className='text-2xl font-bold text-foreground'>스마트 그린 쉼터</span>
            </div>
          </div>

          {/* 로그인 카드 */}
          <Card className='w-full max-w-lg'>
            <CardHeader className='text-center'>
              <CardTitle className='text-2xl'>관리자 로그인</CardTitle>
              <p className='text-muted-foreground'>시스템에 접속하세요</p>
              {/* 버전 정보 표시 */}
              <div className='mt-2 flex justify-center'>
                <VersionInfo />
              </div>
            </CardHeader>
            <CardContent className='space-y-6 px-8'>
              <form onSubmit={handleLogin} className='space-y-6'>
                <div className='space-y-2'>
                  <Label htmlFor='id'>아이디</Label>
                  <div className='relative'>
                    <Input
                      id='id'
                      type='text'
                      autoComplete='username'
                      placeholder='아이디를 입력하세요'
                      value={id}
                      onChange={e => setId(e.target.value)}
                      disabled={isPending}
                      className='pr-10'
                    />
                    <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
                      <User className='h-4 w-4 text-muted-foreground' />
                    </div>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='password'>비밀번호</Label>
                  <div className='relative'>
                    <TooltipProvider>
                      <Tooltip open={passwordFocused && !!password && !!passwordValidation}>
                        <TooltipTrigger asChild>
                          <Input
                            id='password'
                            type={showPassword ? 'text' : 'password'}
                            autoComplete='current-password'
                            placeholder='비밀번호를 입력하세요'
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onFocus={() => setPasswordFocused(true)}
                            onBlur={() => setPasswordFocused(false)}
                            disabled={isPending}
                            className='pr-10'
                          />
                        </TooltipTrigger>
                        {password && passwordValidation && (
                          <TooltipContent
                            side='top'
                            className='border border-border bg-popover text-popover-foreground shadow-lg w-72 sm:w-80 p-4 max-w-[calc(100vw-2rem)] text-sm'
                            sideOffset={10}
                            align='center'
                            avoidCollisions={true}
                            collisionPadding={16}
                            onPointerDownOutside={() => setPasswordFocused(false)}
                          >
                            <div className='space-y-3 text-popover-foreground'>
                              {/* 비밀번호 강도 표시 */}
                              <div className='flex items-center justify-between'>
                                <span className='text-sm font-semibold text-muted-foreground'>비밀번호 강도:</span>
                                <Badge
                                  variant='secondary'
                                  className={getPasswordStrengthColor(passwordValidation.strength)}
                                >
                                  {getPasswordStrengthText(passwordValidation.strength)}
                                </Badge>
                              </div>

                              {/* 상세 검증 결과 */}
                              <div className='space-y-2'>
                                <div
                                  className={`flex items-center text-sm ${getValidationStatusColor(
                                    passwordValidation.details.length.valid
                                  )}`}
                                >
                                  <span className='mr-2 flex-shrink-0'>
                                    {getValidationIcon(passwordValidation.details.length.valid)}
                                  </span>
                                  <span className='leading-relaxed'>{passwordValidation.details.length.message}</span>
                                </div>
                                <div
                                  className={`flex items-center text-sm ${getValidationStatusColor(
                                    passwordValidation.details.characterTypes.valid
                                  )}`}
                                >
                                  <span className='mr-2 flex-shrink-0'>
                                    {getValidationIcon(passwordValidation.details.characterTypes.valid)}
                                  </span>
                                  <span className='leading-relaxed'>
                                    {passwordValidation.details.characterTypes.message}
                                  </span>
                                </div>
                                <div
                                  className={`flex items-center text-sm ${getValidationStatusColor(
                                    passwordValidation.details.sequential.valid
                                  )}`}
                                >
                                  <span className='mr-2 flex-shrink-0'>
                                    {getValidationIcon(passwordValidation.details.sequential.valid)}
                                  </span>
                                  <span className='leading-relaxed'>
                                    {passwordValidation.details.sequential.message}
                                  </span>
                                </div>
                                <div
                                  className={`flex items-center text-sm ${getValidationStatusColor(
                                    passwordValidation.details.repeated.valid
                                  )}`}
                                >
                                  <span className='mr-2 flex-shrink-0'>
                                    {getValidationIcon(passwordValidation.details.repeated.valid)}
                                  </span>
                                  <span className='leading-relaxed'>{passwordValidation.details.repeated.message}</span>
                                </div>
                              </div>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <div className='absolute inset-y-0 right-0 flex items-center pr-3'>
                      <button
                        type='button'
                        onClick={() => setShowPassword(!showPassword)}
                        className='text-muted-foreground hover:text-foreground transition-colors'
                      >
                        {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <Alert variant='destructive' className='animate-shake'>
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>{error.message || '로그인 중 오류가 발생했습니다.'}</AlertDescription>
                  </Alert>
                )}

                <Button type='submit' className='w-full' disabled={isPending}>
                  {isPending ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2'></div>
                      로그인 중...
                    </>
                  ) : (
                    <>
                      <svg className='h-4 w-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1'
                        />
                      </svg>
                      로그인
                    </>
                  )}
                </Button>
              </form>

            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toast 알림 */}
    </div>
  );
}
