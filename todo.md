# AppRankNavi - Project TODO

## Phase 1: Database & Schema
- [x] Create apps table for storing app information
- [x] Create rankings table for storing ranking history
- [x] Create categories table for app categories
- [x] Push database migrations

## Phase 2: Backend API
- [x] Implement Apple RSS Feed API integration
- [x] Create ranking fetch service for 5 countries (JP, US, GB, CN, KR)
- [x] Create tRPC endpoints for rankings list
- [x] Create tRPC endpoints for app details
- [x] Create tRPC endpoints for ranking history
- [x] Implement data caching and optimization

## Phase 3: Frontend UI
- [x] Set up dark theme styling
- [x] Create FilterBar component (date, countries, ranking type, category)
- [x] Create RankingTable component with multi-country comparison
- [x] Implement country flag icons
- [x] Add pagination support
- [x] Create responsive layout

## Phase 4: App Detail Modal
- [x] Create AppDetailModal component
- [x] Implement ranking trend chart (7 days, monthly, yearly)
- [x] Add App Store link and copy link functionality

## Phase 5: LLM Integration
- [x] Implement trend analysis API endpoint
- [x] Implement cross-country comparison API endpoint
- [x] Create analysis UI components
- [x] Add loading states for LLM responses

## Phase 6: Testing & Polish
- [x] Write vitest tests for API endpoints
- [x] Test multi-country comparison workflow
- [x] Verify responsive design
- [x] Final UI polish
