import { COOLER_ALARM_CODE_ROWS } from '../../meta/coolerAlarmCodes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const ManualPage = () => {
  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>냉난방기 에러 코드</CardTitle>
          <CardDescription>
            DDC 레지스터 alarm 값(0=정상, 1 이상=아래 코드). 백엔드 e101 형식은 CH01 → 1 → e101 과 대응합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0 sm:p-6 sm:pt-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-24 text-center'>코드</TableHead>
                <TableHead>설명</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className='bg-muted/40'>
                <TableCell className='text-center font-mono font-medium'>0</TableCell>
                <TableCell>정상 (알람 없음)</TableCell>
              </TableRow>
              {COOLER_ALARM_CODE_ROWS.map(row => (
                <TableRow key={row.code}>
                  <TableCell className='text-center font-mono font-medium'>{row.code}</TableCell>
                  <TableCell>{row.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualPage;
