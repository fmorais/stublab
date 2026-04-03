export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type RuleSource = 'query' | 'header' | 'body'
export type RuleOperator = 'eq' | 'neq' | 'contains' | 'exists' | 'not_exists'

export interface MatchingRule {
  id: string
  endpointId: string
  source: RuleSource
  field: string
  operator: RuleOperator
  value: string | null
  createdAt: string
}

export interface MatchingRuleInput {
  source: RuleSource
  field: string
  operator: RuleOperator
  value?: string | null
}

export interface Endpoint {
  id: string
  name: string
  method: HttpMethod
  path: string
  active: boolean
  responseStatus: number
  responseBody: string
  responseHeaders: Record<string, string>
  delay: number
  createdAt: string
  updatedAt: string
  matchingRules: MatchingRule[]
}

export interface CreateEndpointInput {
  name: string
  method: HttpMethod
  path: string
  responseStatus: number
  responseBody?: string
  responseHeaders?: Record<string, string>
  delay?: number
  matchingRules?: MatchingRuleInput[]
}

export interface UpdateEndpointInput {
  name?: string
  method?: HttpMethod
  path?: string
  responseStatus?: number
  responseBody?: string
  responseHeaders?: Record<string, string>
  delay?: number
  matchingRules?: MatchingRuleInput[]
}
