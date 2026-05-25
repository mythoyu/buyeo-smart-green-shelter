// HTTP_API_SPEC.md 명세 기반 Unit 관련 DTO

export interface UnitSummaryDTO {
  id: string;
  name: string;
}

export interface UnitStatusDTO {
  id: string;
  status: number;
}

export interface UnitDataDTO {
  id: string;
  data: Record<string, any>;
}

export interface UnitErrorDTO {
  id: string;
  errorId: string;
  errorDesc: string;
  errorAt: string;
}
