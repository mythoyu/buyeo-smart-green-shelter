import {
  Key,
  UserPlus,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Copy as CopyIcon,
  Users,
  User,
  Globe,
  Crown,
  Building,
  Edit,
  X,
  CheckSquare2,
} from 'lucide-react';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { RightSidebarItem } from '../layout/RightSidebar';
import { toast } from 'sonner';

import { useGetUsers, useGetApiKeys, useCreateUser, useUpdateUser, useDeleteUser } from '../../api/queries';
import { useAuth } from '../../contexts/AuthContext';
import { useRightSidebarContent } from '../../hooks/useRightSidebarContent';
import { type CreateUserRequest, type UpdateUserRequest, type ApiKey } from '../../hooks/useUserManagement';
import { useWebSocket } from '../../hooks/useWebSocket';
import { debugAllEnvironmentVariables } from '../../utils/environment';
import {
  validatePassword,
  getPasswordStrengthColor,
  getPasswordStrengthText,
  getValidationStatusColor,
  getValidationIcon,
} from '../../utils/passwordValidation';
import {
  processUserData,
  matchUserWithApiKey,
  createDefaultApiKey,
  filterUsersByRole,
} from '../../utils/userDataProcessor';
import { PageLoading } from '../common/LoadingPanel';
import { TopLogPanel } from '../common/TopLogPanel';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
} from '../ui';

// 새로운 커스텀 훅들 import

// 데이터 처리 유틸리티 import

// User 타입 정의
interface User {
  id: string;
  username: string;
  name?: string;
  role: 'superuser' | 'user' | 'engineer' | 'ex-user';
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { isConnected } = useWebSocket({});

  // 디버그: 환경변수 확인
  useEffect(() => {
    console.log('🔍 UserManagementPage Debug Start');
    debugAllEnvironmentVariables();
    console.log('🔍 UserManagementPage Debug End');
  }, []);

  // 새로운 React Query 커스텀 훅들 사용
  const { data: usersData, isLoading: usersLoading, error: usersError } = useGetUsers();
  const { data: apiKeysData, isLoading: apiKeysLoading, error: apiKeysError } = useGetApiKeys();

  const users = usersData?.users || [];
  const apiKeys = apiKeysData?.apiKeys || [];

  // 디버깅: 데이터 구조 확인
  console.log('Users data:', users);
  console.log('API Keys data:', apiKeys);

  // 사용자 데이터를 백엔드 응답 구조에 맞게 처리
  const processedUsers = useMemo(() => {
    return users.map(processUserData);
  }, [users]);

  // 새로운 뮤테이션 훅들 사용
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // const [showKey, setShowKey] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  // const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<CreateUserRequest>({
    username: '',
    password: '',
    role: 'ex-user',
  });
  const [newUserApiKey, setNewUserApiKey] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // message 상태는 뮤테이션 훅에서 toast로 처리하므로 제거
  const copyTimeout = useRef<NodeJS.Timeout | null>(null);

  // 사용자 편집 관련 상태
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingUserData, setEditingUserData] = useState<UpdateUserRequest>({});
  const [editingPassword, setEditingPassword] = useState<string>('');
  const [editingApiKey, setEditingApiKey] = useState<string>('');
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);

  // 필터 상태
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // 로딩 및 에러 상태 통합
  const loading = usersLoading || apiKeysLoading;
  const error = usersError?.message || apiKeysError?.message;

  // // 관리자 권한 체크
  // useEffect(() => {
  //   if (!isAdmin) {
  //     setTimeout(() => {
  //       navigate('/dashboard');
  //     }, 2000);
  //     return;
  //   }
  //   return () => {
  //     if (copyTimeout.current) clearTimeout(copyTimeout.current);
  //   };
  // }, [isAdmin, navigate]);

  // 초기 데이터 로딩 성공 메시지는 뮤테이션 훅에서 자동으로 처리됨

  // 디버깅: 삭제 상태 모니터링
  useEffect(() => {
    console.log('deletingUser 상태 변경:', deletingUser);
  }, [deletingUser]);

  // 디버깅: API 키 상태 모니터링
  useEffect(() => {
    console.log('apiKeys 상태 변경:', apiKeys);
  }, [apiKeys]);

  const userNav = [
    { value: 'all', icon: CheckSquare2, label: '전체' },
    { value: 'superuser', icon: Crown, label: '관리자' },
    { value: 'engineer', icon: Building, label: '엔지\n니어' },
    { value: 'user', icon: User, label: '내부' },
    { value: 'ex-user', icon: Globe, label: '외부' },
  ] as const;

  // 핸들러 메모이제이션 (사이드바용)
  const handleOpenCreateUser = useCallback(() => {
    setShowCreateUser(true);
  }, []);

  const handleFilterChange = useCallback(
    (value: string) => {
      setSelectedFilter(value);
    },
    []
  );

  // 사이드바 컨텐츠
  const sidebarContent = useMemo(
    () => (
      <>
        <RightSidebarItem
          icon={UserPlus}
          label='등록'
          onClick={handleOpenCreateUser}
          title={`사용자 등록 (${processedUsers.length}명)`}
        />
        {userNav.map(({ value, icon, label }) => (
          <RightSidebarItem
            key={value}
            icon={icon}
            label={label}
            active={selectedFilter === value}
            onClick={() => handleFilterChange(value)}
            title={label}
          />
        ))}
      </>
    ),
    [selectedFilter, processedUsers.length, handleOpenCreateUser, handleFilterChange]
  );

  // 오른쪽 사이드바 설정
  useRightSidebarContent(sidebarContent, [selectedFilter, processedUsers.length, handleOpenCreateUser, handleFilterChange]);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => {}, 1500);
  };

  // 사용자 편집 시작
  const handleStartEditUser = (user: User) => {
    setEditingUser(user);
    setEditingUserData({
      role: user.role,
    });
    setEditingPassword('');
    setEditingApiKey('');
    setShowEditPassword(false);
  };

  // 사용자 편집 취소
  const handleCancelEditUser = () => {
    setEditingUser(null);
    setEditingUserData({});
    setEditingPassword('');
    setEditingApiKey('');
    setShowEditPassword(false);
  };

  // 사용자 편집 저장
  const handleSaveEditUser = async (user: User) => {
    try {
      // 비밀번호 변경이 있는 경우 검증
      if (editingPassword) {
        const validation = validatePassword(editingPassword);
        if (!validation.isValid) {
          toast.error('비밀번호가 요구사항을 충족하지 않습니다.');
          return;
        }
      }

      // 사용자 정보 업데이트
      const updateData: any = { ...editingUserData };
      if (editingPassword) {
        updateData.password = editingPassword;
      }
      if (editingApiKey) {
        updateData.apiKey = editingApiKey;
      }

      await updateUserMutation.mutateAsync({
        userId: user.id,
        userData: updateData,
      });

      // 편집 모드 종료
      setEditingUser(null);
      setEditingUserData({});
      setEditingPassword('');
      setEditingApiKey('');
      setShowEditPassword(false);

      // 성공 메시지는 뮤테이션 훅에서 자동으로 처리됨
    } catch (e: any) {
      console.error('사용자 업데이트 실패:', e);
      // 에러 메시지는 뮤테이션 훅에서 자동으로 처리됨
    }
  };

  const handleCreateUser = async () => {
    // 비밀번호 검증
    if (newUser.password) {
      const validation = validatePassword(newUser.password);
      if (!validation.isValid) {
        toast.error('비밀번호가 요구사항을 충족하지 않습니다.');
        return;
      }
    }

    try {
      // 사용자 생성
      await createUserMutation.mutateAsync({
        username: newUser.username,
        password: newUser.password,
        role: newUser.role,
        apiKey: newUserApiKey,
      });

      setShowCreateUser(false);
      setNewUser({
        username: '',
        password: '',
        role: 'ex-user',
      });
      setNewUserApiKey('');

      // 성공 메시지는 뮤테이션 훅에서 자동으로 처리됨
    } catch (e: any) {
      console.error('사용자 등록 실패:', e);
      // 에러 메시지는 뮤테이션 훅에서 자동으로 처리됨
    }
  };

  const handleDeleteUser = (userId: string) => {
    console.log('사용자 삭제 다이얼로그 표시:', userId);
    setDeletingUser(userId);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;

    console.log('사용자 삭제 확인:', deletingUser);
    try {
      await deleteUserMutation.mutateAsync(deletingUser);
      // 성공 메시지는 뮤테이션 훅에서 자동으로 처리됨
    } catch (e: any) {
      console.error('사용자 삭제 실패:', e);
      // 에러 메시지는 뮤테이션 훅에서 자동으로 처리됨
    } finally {
      setDeletingUser(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superuser':
        return <Badge className='bg-purple-100 text-purple-700 border-purple-200'>시스템 관리자</Badge>;
      case 'engineer':
        return <Badge className='bg-blue-100 text-blue-700 border-blue-200'>엔지니어</Badge>;
      case 'user':
        return <Badge className='bg-green-100 text-green-700 border-green-200'>내부사용자</Badge>;
      case 'ex-user':
        return <Badge className='bg-orange-100 text-orange-700 border-orange-200'>외부사용자</Badge>;
      default:
        return <Badge className='bg-gray-100 text-gray-700 border-gray-200'>알 수 없음</Badge>;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superuser':
        return <Crown className='h-4 w-4 text-purple-600' />;
      case 'engineer':
        return <Building className='h-4 w-4 text-blue-600' />;
      case 'user':
        return <User className='h-4 w-4 text-green-600' />;
      case 'ex-user':
        return <Globe className='h-4 w-4 text-orange-600' />;
      default:
        return <User className='h-4 w-4 text-gray-600' />;
    }
  };

  if (loading) {
    return <PageLoading text='사용자 정보를 불러오는 중입니다...' />;
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <AlertTriangle className='h-8 w-8 text-red-600' />
          </div>
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            {error.includes('관리자 권한') ? '접근 권한이 없습니다' : '오류가 발생했습니다'}
          </h3>
          <p className='text-gray-600 mb-4'>{error}</p>
          {error.includes('관리자 권한') && <p className='text-sm text-gray-500'>대시보드로 이동합니다...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {/* 로그 패널 */}
      <TopLogPanel isConnected={isConnected} />

      {/* 사용자 카드 목록 */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {filterUsersByRole(processedUsers, selectedFilter)
          .filter((user: User) => {
            // apikeys 필터는 별도로 처리
            if (selectedFilter === 'apikeys') {
              return apiKeys.some((key: ApiKey) => key.username === (user.name || user.username));
            }
            return true;
          })
          .map((user: User, index: number) => {
            // 사용자별 API 키 찾기 (새로운 유틸리티 함수 사용)
            const userApiKey = matchUserWithApiKey(user, apiKeys);
            console.log(`사용자 ${user.username}의 API 키:`, userApiKey);

            // API 키가 없을 경우 기본값 생성
            const displayApiKey = userApiKey || createDefaultApiKey(user);

            // 권한별 hover 색상 결정
            const hoverBgColor =
              user.role === 'superuser'
                ? 'hover:bg-purple-200'
                : user.role === 'engineer'
                ? 'hover:bg-blue-200'
                : user.role === 'user'
                ? 'hover:bg-green-200'
                : 'hover:bg-orange-200';

            return (
              <Card
                key={user.id}
                className={`cursor-pointer ${hoverBgColor} transition-all duration-300`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards',
                }}
              >
                <CardHeader className='pb-3'>
                  <div className='flex items-center space-x-3'>
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        user.role === 'superuser'
                          ? 'bg-purple-100'
                          : user.role === 'engineer'
                          ? 'bg-blue-100'
                          : user.role === 'user'
                          ? 'bg-green-100'
                          : 'bg-orange-100'
                      }`}
                    >
                      {getRoleIcon(user.role)}
                    </div>
                    <CardTitle className='flex items-center space-x-3 flex-1 min-w-0'>
                      <span className='font-semibold text-foreground truncate'>{user.name || user.username}</span>
                      {getRoleBadge(user.role)}
                      <div className='flex items-center gap-2 ml-auto shrink-0'>
                        {editingUser?.id === user.id ? (
                          <>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => handleSaveEditUser(user)}
                              className='hover:bg-accent text-green-600'
                              title='저장'
                            >
                              <CheckCircle className='h-4 w-4' />
                            </Button>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={handleCancelEditUser}
                              className='hover:bg-accent text-red-600'
                              title='취소'
                            >
                              <X className='h-4 w-4' />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => handleStartEditUser(user)}
                              className='hover:bg-accent'
                              title='편집'
                            >
                              <Edit className='h-4 w-4' />
                            </Button>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => handleDeleteUser(user.id)}
                              className={`hover:bg-accent ${
                                currentUser && user.username === currentUser.name
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-red-600'
                              }`}
                              title={
                                currentUser && user.username === currentUser.name ? '본인은 삭제할 수 없습니다' : '삭제'
                              }
                              disabled={!!(currentUser && user.username === currentUser.name)}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className='pt-0'>
                  <div className='flex items-center gap-1 flex-1 min-w-0 text-sm text-muted-foreground'>
                    <Key className='h-3 w-3 shrink-0' />
                    <div className='flex items-center gap-1 flex-1 min-w-0'>
                      <span className='text-xs font-mono bg-background px-2 py-1 rounded border truncate flex-1 min-w-0'>
                        {displayApiKey.key}
                      </span>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => {
                          handleCopy(displayApiKey.key);
                          toast.success('API 키가 클립보드에 복사되었습니다');
                        }}
                        className='hover:bg-accent text-xs px-1 py-1 shrink-0'
                        title='복사'
                      >
                        <CopyIcon className='h-3 w-3' />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* 사용자 등록 모달 (오른쪽 사이드바 z-50보다 위에 표시) */}
      {showCreateUser && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]'>
          <div className='w-full max-w-md'>
            <Card className='bg-white rounded-lg shadow-xl border border-gray-200'>
              <CardHeader>
                <div className='flex flex-col items-center gap-2'>
                  <span className='w-10 h-10 flex items-center justify-center bg-blue-100 rounded-full'>
                    <UserPlus className='w-5 h-5 text-blue-700' />
                  </span>
                  <CardTitle className='text-xl font-bold text-blue-900'>사용자 등록</CardTitle>
                  <p className='text-gray-600 text-sm'>새 사용자 정보를 입력해 주세요</p>
                </div>
              </CardHeader>
              <CardContent className='p-6'>
                <div className='space-y-3'>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='space-y-1'>
                      <Label htmlFor='username' className='block text-xs font-semibold text-gray-700'>
                        사용자명
                      </Label>
                      <Input
                        id='username'
                        value={newUser.username}
                        onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder='사용자명'
                        className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 hover:border-gray-300 dark:hover:border-gray-600 placeholder:text-xs text-sm'
                        disabled={createUserMutation.isPending}
                      />
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <Label htmlFor='role' className='block text-xs font-semibold text-gray-700'>
                      권한
                    </Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: 'superuser' | 'user' | 'engineer' | 'ex-user') =>
                        setNewUser({ ...newUser, role: value })
                      }
                    >
                      <SelectTrigger className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 hover:border-gray-300 dark:hover:border-gray-600 text-sm'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className='z-[70]'>
                        <SelectItem value='superuser'>시스템 관리자 (superuser)</SelectItem>
                        <SelectItem value='engineer'>엔지니어 (engineer)</SelectItem>
                        <SelectItem value='user'>내부사용자 (user)</SelectItem>
                        <SelectItem value='ex-user'>외부사용자 (ex-user)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-1'>
                    <Label htmlFor='password' className='block text-xs font-semibold text-gray-700'>
                      비밀번호
                    </Label>
                    <div className='relative'>
                      <Input
                        id='password'
                        type={showPassword ? 'text' : 'password'}
                        value={newUser.password}
                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder='비밀번호'
                        className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 hover:border-gray-300 dark:hover:border-gray-600 placeholder:text-xs text-sm pr-10'
                        disabled={createUserMutation.isPending}
                      />
                      <span
                        className='absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer'
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className='h-4 w-4 text-gray-500' />
                        ) : (
                          <Eye className='h-4 w-4 text-gray-500' />
                        )}
                      </span>
                    </div>
                    {newUser.password && (
                      <div className='mt-2 space-y-2'>
                        {(() => {
                          const validation = validatePassword(newUser.password);
                          return (
                            <div className='space-y-2'>
                              {/* 비밀번호 강도 표시 */}
                              <div className='flex items-center justify-between'>
                                <span className='text-xs text-gray-600'>비밀번호 강도:</span>
                                <div
                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${getPasswordStrengthColor(
                                    validation.strength
                                  )}`}
                                >
                                  {getPasswordStrengthText(validation.strength)}
                                </div>
                              </div>

                              {/* 상세 검증 결과 */}
                              <div className='space-y-1'>
                                <div
                                  className={`flex items-center text-xs ${getValidationStatusColor(
                                    validation.details.length.valid
                                  )}`}
                                >
                                  <span className='mr-1'>{getValidationIcon(validation.details.length.valid)}</span>
                                  {validation.details.length.message}
                                </div>
                                <div
                                  className={`flex items-center text-xs ${getValidationStatusColor(
                                    validation.details.characterTypes.valid
                                  )}`}
                                >
                                  <span className='mr-1'>
                                    {getValidationIcon(validation.details.characterTypes.valid)}
                                  </span>
                                  {validation.details.characterTypes.message}
                                </div>
                                <div
                                  className={`flex items-center text-xs ${getValidationStatusColor(
                                    validation.details.sequential.valid
                                  )}`}
                                >
                                  <span className='mr-1'>{getValidationIcon(validation.details.sequential.valid)}</span>
                                  {validation.details.sequential.message}
                                </div>
                                <div
                                  className={`flex items-center text-xs ${getValidationStatusColor(
                                    validation.details.repeated.valid
                                  )}`}
                                >
                                  <span className='mr-1'>{getValidationIcon(validation.details.repeated.valid)}</span>
                                  {validation.details.repeated.message}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className='space-y-1'>
                    <Label htmlFor='apiKey' className='block text-xs font-semibold text-gray-700'>
                      API 키
                    </Label>
                    <Input
                      id='apiKey'
                      value={newUserApiKey}
                      onChange={e => setNewUserApiKey(e.target.value)}
                      className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 hover:border-gray-300 dark:hover:border-gray-600 text-sm font-mono'
                      disabled={createUserMutation.isPending}
                    />
                    <p className='text-xs text-gray-500'>사용자 인증에 사용될 API 키를 입력하세요</p>
                  </div>

                  {error && (
                    <div className='bg-red-50 border border-red-200 rounded-lg p-3 animate-shake'>
                      <div className='flex items-center'>
                        <svg
                          className='h-4 w-4 text-red-500 mr-2'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                          />
                        </svg>
                        <div className='text-red-600 text-xs'>{error}</div>
                      </div>
                    </div>
                  )}

                  <div className='flex space-x-3 pt-2'>
                    <Button
                      variant='outline'
                      onClick={() => setShowCreateUser(false)}
                      className='flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 text-sm'
                      disabled={createUserMutation.isPending}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={handleCreateUser}
                      disabled={createUserMutation.isPending || !newUser.username || !newUser.password}
                      className='flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm'
                    >
                      {createUserMutation.isPending ? (
                        <div className='flex items-center justify-center'>
                          <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                          등록 중...
                        </div>
                      ) : (
                        <div className='flex items-center justify-center'>
                          <svg className='h-4 w-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                          </svg>
                          사용자 등록
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 사용자 편집 모달 (오른쪽 사이드바 z-50보다 위에 표시) */}
      {editingUser && (
        <div
          className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]'
          onClick={handleCancelEditUser}
        >
          <div className='w-full max-w-md' onClick={e => e.stopPropagation()}>
            <Card className='bg-white rounded-lg shadow-xl border border-gray-200'>
              <CardHeader>
                <div className='flex flex-col items-center gap-2'>
                  <span className='w-10 h-10 flex items-center justify-center bg-blue-100 rounded-full'>
                    <Edit className='w-5 h-5 text-blue-700' />
                  </span>
                  <CardTitle className='text-xl font-bold text-blue-900'>사용자 정보 수정</CardTitle>
                  <p className='text-gray-600 text-sm'>사용자 정보를 수정해 주세요</p>
                </div>
              </CardHeader>
              <CardContent className='p-6'>
                <div className='space-y-3'>
                  <div className='space-y-1'>
                    <Label htmlFor='edit-username' className='block text-xs font-semibold text-gray-700'>
                      사용자명
                    </Label>
                    <Input
                      id='edit-username'
                      value={editingUser?.username || ''}
                      className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 text-gray-600 text-sm cursor-not-allowed'
                      disabled={true}
                    />
                    <p className='text-xs text-gray-500'>사용자명은 수정할 수 없습니다</p>
                  </div>

                  <div className='space-y-1'>
                    <Label htmlFor='edit-role' className='block text-xs font-semibold text-gray-700'>
                      권한
                    </Label>
                    <Select
                      value={editingUserData.role || editingUser.role}
                      onValueChange={(value: 'superuser' | 'user' | 'engineer' | 'ex-user') =>
                        setEditingUserData({ ...editingUserData, role: value })
                      }
                    >
                      <SelectTrigger className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 hover:border-gray-300 dark:hover:border-gray-600 text-sm'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className='z-[70]'>
                        <SelectItem value='superuser'>시스템 관리자 (superuser)</SelectItem>
                        <SelectItem value='engineer'>엔지니어 (engineer)</SelectItem>
                        <SelectItem value='user'>내부사용자 (user)</SelectItem>
                        <SelectItem value='ex-user'>외부사용자 (ex-user)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 비밀번호 변경 */}
                  <div className='space-y-1'>
                    <div className='flex items-center justify-between'>
                      <Label htmlFor='edit-password' className='block text-xs font-semibold text-gray-700'>
                        비밀번호 변경
                      </Label>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className='text-xs text-blue-600 hover:text-blue-700'
                      >
                        {showEditPassword ? '취소' : '변경'}
                      </Button>
                    </div>
                    {showEditPassword && (
                      <Input
                        id='edit-password'
                        type='password'
                        value={editingPassword}
                        onChange={e => setEditingPassword(e.target.value)}
                        placeholder='새 비밀번호'
                        className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 hover:border-gray-300 dark:hover:border-gray-600 placeholder:text-xs text-sm'
                        disabled={updateUserMutation.isPending}
                      />
                    )}
                    {!showEditPassword && (
                      <p className='text-xs text-gray-500'>비밀번호를 변경하려면 &quot;변경&quot; 버튼을 클릭하세요</p>
                    )}
                  </div>

                  {/* API 키 변경 */}
                  <div className='space-y-1'>
                    <Label htmlFor='edit-apikey' className='block text-xs font-semibold text-gray-700'>
                      API 키 변경
                    </Label>
                    <Input
                      id='edit-apikey'
                      value={editingApiKey}
                      onChange={e => setEditingApiKey(e.target.value)}
                      placeholder='새 API 키'
                      className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 hover:border-gray-300 dark:hover:border-gray-600 placeholder:text-xs text-sm font-mono'
                      disabled={updateUserMutation.isPending}
                    />
                    <p className='text-xs text-gray-500'>새 API 키를 입력하세요 (비워두면 변경하지 않음)</p>
                  </div>

                  <div className='flex space-x-3 pt-2'>
                    <Button
                      variant='outline'
                      onClick={handleCancelEditUser}
                      className='flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 text-sm'
                      disabled={updateUserMutation.isPending}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={() => handleSaveEditUser(editingUser)}
                      disabled={updateUserMutation.isPending}
                      className='flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm'
                    >
                      {updateUserMutation.isPending ? (
                        <div className='flex items-center justify-center'>
                          <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                          수정 중...
                        </div>
                      ) : (
                        <div className='flex items-center justify-center'>
                          <CheckCircle className='h-4 w-4 mr-2' />
                          수정 완료
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 간단한 삭제 확인 다이얼로그 */}
      {deletingUser && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]'>
          <div className='bg-white rounded-lg p-6 shadow-xl border border-gray-200 max-w-md w-full mx-4'>
            <div className='flex flex-col items-center gap-2 mb-6'>
              <span className='w-12 h-12 flex items-center justify-center bg-red-100 rounded-full mb-2'>
                <Trash2 className='w-6 h-6 text-red-600' />
              </span>
              <h3 className='text-xl font-bold text-red-900'>사용자 삭제</h3>
              <p className='text-gray-600 text-sm mt-1 text-center'>
                이 사용자를 삭제하시겠습니까? 관련된 모든 API 키도 함께 삭제됩니다.
              </p>
            </div>

            <div className='flex space-x-3'>
              <Button
                variant='outline'
                onClick={() => setDeletingUser(null)}
                className='flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 text-gray-700 font-medium'
              >
                취소
              </Button>
              <Button
                onClick={handleConfirmDeleteUser}
                className='flex-1 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
              >
                <div className='flex items-center justify-center'>
                  <Trash2 className='h-5 w-5 mr-2' />
                  <span>삭제</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast 알림 */}
    </div>
  );
}
