// ─── Demo Mode Flag ────────────────────────────────────────────────────────────
// Set DEMO_MODE_DEFAULT to false to use real API endpoints
export const DEMO_MODE_DEFAULT = true

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const DEMO_USERS = [
  {
    id: 'user-1',
    email: 'admin@tdbank.com',
    password: 'admin123',
    name: 'Alex Johnson',
    role: 'super_admin',
    is_admin: true,
    project_access: null,
    is_active: true,
  },
  {
    id: 'user-4',
    email: 'projectadmin@tdbank.com',
    password: 'admin456',
    name: 'Jamie Lee',
    role: 'admin',
    is_admin: true,
    project_access: [],
    is_active: true,
  },
  {
    id: 'user-2',
    email: 'user@tdbank.com',
    password: 'test123',
    name: 'Sarah Chen',
    role: 'user',
    is_admin: false,
    project_access: ['proj-1', 'proj-2'],
    is_active: true,
  },
  {
    id: 'user-3',
    email: 'qa@tdbank.com',
    password: 'qa123',
    name: 'Michael Torres',
    role: 'user',
    is_admin: false,
    project_access: ['proj-1'],
    is_active: true,
  },
]

// ─── Projects ──────────────────────────────────────────────────────────────────
export const DEMO_PROJECTS = [
  {
    id: 'proj-1',
    name: 'TD Digital Banking',
    domain_tag: 'Payments',
    jira_project_key: 'TDB',
    member_count: 12,
    created_at: '2024-09-01T10:00:00Z',
    created_by: 'user-1',
  },
  {
    id: 'proj-2',
    name: 'TD Wealth Management',
    domain_tag: 'Accounts',
    jira_project_key: 'TDW',
    member_count: 8,
    created_at: '2024-10-15T10:00:00Z',
    created_by: 'user-4',
  },
  {
    id: 'proj-3',
    name: 'TD Retail Banking',
    domain_tag: 'Lending',
    jira_project_key: 'TDR',
    member_count: 15,
    created_at: '2024-11-20T10:00:00Z',
    created_by: 'user-1',
  },
]

// ─── Project Members ───────────────────────────────────────────────────────────
// Maps projectId → array of { user_id, project_role: 'admin' | 'member' }
export const DEMO_PROJECT_MEMBERS = {
  'proj-1': [
    { user_id: 'user-1', project_role: 'admin' },
    { user_id: 'user-4', project_role: 'admin' },
    { user_id: 'user-2', project_role: 'member' },
  ],
  'proj-2': [
    { user_id: 'user-1', project_role: 'admin' },
    { user_id: 'user-4', project_role: 'admin' },
    { user_id: 'user-2', project_role: 'member' },
  ],
  'proj-3': [
    { user_id: 'user-1', project_role: 'admin' },
    { user_id: 'user-3', project_role: 'member' },
  ],
}

// ─── Recent Jobs ───────────────────────────────────────────────────────────────
export const DEMO_RECENT_JOBS = [
  { id: 'job-1', type: 'tosca-convert', status: 'COMPLETE', submitted: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), user: 'Alex Johnson', user_id: 'user-1', project_id: 'proj-1' },
  { id: 'job-2', type: 'test-gen', status: 'RUNNING', submitted: new Date(Date.now() - 25 * 60 * 1000).toISOString(), user: 'Sarah Chen', user_id: 'user-2', project_id: 'proj-1' },
  { id: 'job-3', type: 'rca', status: 'FAILED', submitted: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), user: 'Michael Torres', user_id: 'user-3', project_id: 'proj-1' },
  { id: 'job-4', type: 'impact', status: 'COMPLETE', submitted: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), user: 'Alex Johnson', user_id: 'user-1', project_id: 'proj-1' },
  { id: 'job-5', type: 'regression', status: 'QUEUED', submitted: new Date(Date.now() - 5 * 60 * 1000).toISOString(), user: 'Sarah Chen', user_id: 'user-2', project_id: 'proj-1' },
  { id: 'job-6', type: 'tosca-convert', status: 'COMPLETE', submitted: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), user: 'Alex Johnson', user_id: 'user-1', project_id: 'proj-2' },
  { id: 'job-7', type: 'impact', status: 'COMPLETE', submitted: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(), user: 'Sarah Chen', user_id: 'user-2', project_id: 'proj-2' },
]

// ─── Tosca Module ──────────────────────────────────────────────────────────────
export const DEMO_TOSCA_ORIGINAL = `<?xml version="1.0" encoding="UTF-8"?>
<TestCase Name="TC_PaymentTransfer_ValidAccount">
  <TestStep Name="LaunchBrowser" ActionMode="Navigate"
    Value="https://tdbank.com/digital/transfers"/>
  <TestStep Name="EnterFromAccount" ActionMode="Input"
    Value="1234-5678-9012" Target="from-account-field"/>
  <TestStep Name="EnterToAccount" ActionMode="Input"
    Value="9876-5432-1098" Target="to-account-field"/>
  <TestStep Name="EnterAmount" ActionMode="Input"
    Value="250.00" Target="amount-field"/>
  <TestStep Name="SelectCurrency" ActionMode="Select"
    Value="CAD" Target="currency-dropdown"/>
  <TestStep Name="AddMemo" ActionMode="Input"
    Value="Rent payment" Target="memo-field"/>
  <TestStep Name="ClickSubmit" ActionMode="Click"
    Target="submit-transfer-btn"/>
  <TestStep Name="VerifyConfirmation" ActionMode="Verify"
    Value="Transfer Successful" Target="confirmation-banner"/>
</TestCase>`

export const DEMO_TOSCA_GENERATED = `import { test, expect } from '@playwright/test'

test('TC_PaymentTransfer_ValidAccount', async ({ page }) => {
  // Step 1: Launch Browser
  await page.goto('https://tdbank.com/digital/transfers')

  // Step 2: Enter From Account
  await page.fill('[data-testid="from-account-field"]', '1234-5678-9012')

  // Step 3: Enter To Account
  await page.fill('[data-testid="to-account-field"]', '9876-5432-1098')

  // Step 4: Enter Amount
  await page.fill('[data-testid="amount-field"]', '250.00')

  // Step 5: Select Currency (⚠ LOW CONFIDENCE — Tosca Select may not map 1:1)
  await page.selectOption('[data-testid="currency-dropdown"]', 'CAD')

  // Step 6: Add Memo
  await page.fill('[data-testid="memo-field"]', 'Rent payment')

  // Step 7: Click Submit
  await page.click('[data-testid="submit-transfer-btn"]')

  // Step 8: Verify Confirmation
  await expect(page.getByText('Transfer Successful')).toBeVisible()
})`

export const DEMO_TOSCA_QUALITY = {
  total_steps: 8,
  converted: 8,
  low_confidence: 1,
  compilation_status: 'PASSED',
  warnings: ['Step 5 (SelectCurrency): Tosca Select ActionMode may require custom attribute mapping for React components'],
}

// ─── Test Generation Module ────────────────────────────────────────────────────
export const DEMO_JIRA_STORY = {
  id: 'TDB-1482',
  title: 'Interac e-Transfer: Add international transfer fee validation',
  acceptance_criteria: [
    'AC1: Fee calculation displayed before confirmation for amounts > $100 CAD',
    'AC2: Fee waived for Platinum account holders (account type = PLT)',
    'AC3: User can cancel transfer after seeing fees without penalty',
    'AC4: Error displayed if transfer amount exceeds daily limit ($10,000 CAD)',
    'AC5: Fee breakdown shows base fee (1.5%) + FX markup (0.5%) separately',
  ],
}

export const DEMO_TESTGEN_FEATURE = `Feature: Interac e-Transfer International Fee Validation
  As a TD Digital Banking user
  I want to see applicable fees before confirming an international transfer
  So I can make an informed decision

  Background:
    Given I am logged in as a TD Digital Banking user
    And I navigate to the Transfers section

  @smoke @P1
  Scenario: Fee displayed for transfers over $100 CAD
    Given my account balance is greater than $200 CAD
    When I initiate an international transfer of $150.00 CAD
    Then I should see a fee breakdown showing:
      | Fee Type   | Amount    |
      | Base Fee   | $2.25 CAD |
      | FX Markup  | $0.75 CAD |
      | Total Fee  | $3.00 CAD |
    And the "Confirm Transfer" button should be enabled

  @regression @P1
  Scenario: Fee waived for Platinum account holders
    Given I hold a Platinum (PLT) account
    When I initiate an international transfer of $500.00 CAD
    Then the fee breakdown should show:
      | Fee Type   | Amount    |
      | Base Fee   | $0.00 CAD |
      | FX Markup  | $0.00 CAD |
      | Total Fee  | $0.00 CAD |
    And I should see "Fee waived - Platinum benefit applied"

  @P2
  Scenario: Cancel transfer after fee display
    Given I see the fee breakdown for a $200.00 transfer
    When I click "Cancel Transfer"
    Then no transfer should be initiated
    And my account balance should remain unchanged

  @boundary @P1
  Scenario Outline: Daily limit validation
    When I attempt an international transfer of <amount> CAD
    Then I should see <expected_message>

    Examples:
      | amount    | expected_message                       |
      | 9999.99   | fee breakdown                          |
      | 10000.00  | "Daily transfer limit reached"         |
      | 10000.01  | "Amount exceeds daily limit of $10,000"|
      | 0.01      | "Minimum transfer amount is $1.00"     |`

export const DEMO_TESTGEN_DATA = [
  { id: 1, scenario: 'Fee above threshold', amount: '150.00', account_type: 'STD', expected_fee: '3.00', expected_result: 'Fee shown' },
  { id: 2, scenario: 'Fee waived - Platinum', amount: '500.00', account_type: 'PLT', expected_fee: '0.00', expected_result: 'Fee waived' },
  { id: 3, scenario: 'At daily limit', amount: '10000.00', account_type: 'STD', expected_fee: 'N/A', expected_result: 'Limit error' },
  { id: 4, scenario: 'Over daily limit', amount: '10000.01', account_type: 'STD', expected_fee: 'N/A', expected_result: 'Limit error' },
  { id: 5, scenario: 'Below minimum', amount: '0.01', account_type: 'STD', expected_fee: 'N/A', expected_result: 'Min error' },
]

export const DEMO_COVERAGE_GAPS = [
  { ac: 'AC1', description: 'Fee calculation displayed before confirmation', covered: true },
  { ac: 'AC2', description: 'Fee waived for Platinum account holders', covered: true },
  { ac: 'AC3', description: 'User can cancel transfer after seeing fees', covered: true },
  { ac: 'AC4', description: 'Error displayed if exceeds daily limit', covered: true },
  { ac: 'AC5', description: 'Fee breakdown shows base fee + FX markup separately', covered: false },
]

// ─── RCA Module ────────────────────────────────────────────────────────────────
export const DEMO_RCA_RESULT = {
  classification: 'CODE_DEFECT',
  confidence: 87,
  pipeline_run_id: 'PRN-2025-01-28-14392',
  service: 'payment-processor-service',
  root_cause: `A NullPointerException is thrown in PaymentProcessor.processTransaction() at line 234 when handling international transfers with missing intermediary bank codes. The transaction object's intermediaryBic field is null for transfers routed through correspondent banks that were added after the March 2024 schema migration. The validation layer was not updated to handle this new SWIFT field.`,
  fix_actions: [
    { priority: 'P1', action: 'Add null check for intermediaryBic field in PaymentProcessor.processTransaction()', owner: 'payments-team' },
    { priority: 'P1', action: 'Backfill intermediaryBic for all correspondent banks added post-March 2024', owner: 'data-team' },
    { priority: 'P2', action: 'Add integration test covering international transfers via correspondent banks', owner: 'qa-team' },
    { priority: 'P3', action: 'Update schema migration scripts to include validation for new SWIFT fields', owner: 'platform-team' },
  ],
  jira_created: 'TDB-1509',
  log_events: [
    { timestamp: '2025-01-28T14:39:12Z', level: 'ERROR', message: 'NullPointerException: Cannot read field "intermediaryBic" because "transaction.correspondent" is null', trace: 'at com.tdbank.payments.PaymentProcessor.processTransaction(PaymentProcessor.java:234)\n  at com.tdbank.payments.TransferService.execute(TransferService.java:89)\n  at com.tdbank.api.TransferController.initiateTransfer(TransferController.java:156)' },
    { timestamp: '2025-01-28T14:39:11Z', level: 'WARN', message: 'Correspondent bank lookup returned null for BIC: NWBKGB2L', trace: null },
    { timestamp: '2025-01-28T14:39:10Z', level: 'INFO', message: 'Processing international transfer TXN-89234 to account GB29NWBK60161331926819', trace: null },
  ],
  metrics_data: [
    { time: '14:30', error_rate: 0.1 },
    { time: '14:33', error_rate: 0.2 },
    { time: '14:36', error_rate: 1.8 },
    { time: '14:39', error_rate: 4.2 },
    { time: '14:42', error_rate: 3.9 },
    { time: '14:45', error_rate: 2.1 },
    { time: '14:48', error_rate: 0.8 },
  ],
  failed_tests: [
    { name: 'TC_InternationalTransfer_CorrespondentBank_001', failure: 'NPE in processTransaction', suite: 'TDB-PAYMENTS-E2E' },
    { name: 'TC_InternationalTransfer_SWIFT_BIC_002', failure: 'NPE in processTransaction', suite: 'TDB-PAYMENTS-E2E' },
    { name: 'TC_Transfer_GBP_Destination_003', failure: 'Transaction processing error', suite: 'TDB-FX-SUITE' },
  ],
}

// ─── Impact Analysis Module ────────────────────────────────────────────────────
export const DEMO_IMPACT_RESULT = {
  commit_sha: 'a3f9e2c',
  repository: 'td-digital-banking/payment-processor',
  risk_level: 'HIGH',
  direct_tests: 23,
  indirect_tests: 47,
  total_recommended: 70,
  full_suite: 98,
  reduction_pct: 28.6,
  test_plan: [
    { id: 't1', name: 'TC_PaymentProcessor_Core_001', score: 0.98, reason: 'DIRECT', last_run: '2025-01-27', selected: true },
    { id: 't2', name: 'TC_InternationalTransfer_SWIFT_001', score: 0.95, reason: 'DIRECT', last_run: '2025-01-27', selected: true },
    { id: 't3', name: 'TC_Transfer_FeeCalculation_001', score: 0.92, reason: 'DIRECT', last_run: '2025-01-25', selected: true },
    { id: 't4', name: 'TC_AccountBalance_Update_001', score: 0.78, reason: 'INDIRECT', last_run: '2025-01-26', selected: true },
    { id: 't5', name: 'TC_AuditLog_Transaction_001', score: 0.65, reason: 'INDIRECT', last_run: '2025-01-24', selected: true },
    { id: 't6', name: 'TC_Notification_Transfer_001', score: 0.61, reason: 'INDIRECT', last_run: '2025-01-23', selected: true },
    { id: 't7', name: 'TC_UserProfile_Settings_001', score: 0.12, reason: 'MODULE', last_run: '2025-01-20', selected: false },
    { id: 't8', name: 'TC_LoginFlow_Basic_001', score: 0.08, reason: 'MODULE', last_run: '2025-01-20', selected: false },
  ],
  donut_data: [
    { name: 'Direct', value: 23, color: '#007A33' },
    { name: 'Indirect', value: 47, color: '#C8E6D5' },
    { name: 'Excluded', value: 28, color: '#6B7280' },
  ],
  coverage_gaps: [
    { file: 'src/main/java/com/tdbank/payments/CorrespondentBankCache.java', risk: 'HIGH', lines_uncovered: 45, assessment: 'New correspondent bank caching logic has no test coverage' },
    { file: 'src/main/java/com/tdbank/payments/FXRateProvider.java', risk: 'MEDIUM', lines_uncovered: 12, assessment: 'FX rate fallback paths not covered by existing tests' },
  ],
}

// ─── Regression Optimization Module ───────────────────────────────────────────
export const DEMO_REGRESSION_RESULT = {
  suite: 'TDB-FULL-REGRESSION',
  original_count: 1358,
  optimized_count: 891,
  reduction_pct: 34.4,
  coverage_preserved: 91.2,
  score_distribution: [
    { range: '0-20', count: 187 },
    { range: '21-40', count: 124 },
    { range: '41-60', count: 201 },
    { range: '61-80', count: 389 },
    { range: '81-100', count: 457 },
  ],
  tests: [
    { id: 'r1', name: 'TC_PaymentTransfer_HappyPath', score: 0.97, flakiness: 0.02, defect_links: ['TDB-1489', 'TDB-1501'], decision: 'INCLUDE', rationale: 'High-coverage path through critical payment flow. Recent defect history indicates active area.' },
    { id: 'r2', name: 'TC_AccountSummary_MultiAccount', score: 0.88, flakiness: 0.05, defect_links: ['TDB-1477'], decision: 'INCLUDE', rationale: 'Core account display logic. Moderate flakiness from data setup issues (addressable).' },
    { id: 'r3', name: 'TC_Login_Standard', score: 0.82, flakiness: 0.01, defect_links: [], decision: 'INCLUDE', rationale: 'Foundational smoke test. Low flakiness, high stability.' },
    { id: 'r4', name: 'TC_Transfer_DuplicateDetection', score: 0.71, flakiness: 0.18, defect_links: [], decision: 'FLAKY', rationale: 'High flakiness score due to timing issues in duplicate detection window. Recommend fix before including.' },
    { id: 'r5', name: 'TC_Statement_Download_PDF', score: 0.45, flakiness: 0.03, defect_links: [], decision: 'INCLUDE', rationale: 'Moderate coverage, low risk change proximity.' },
    { id: 'r6', name: 'TC_UserPreferences_ThemeToggle', score: 0.12, flakiness: 0.02, defect_links: [], decision: 'EXCLUDE', rationale: 'UI preference test with no connection to changed code paths. Low risk.' },
    { id: 'r7', name: 'TC_HelpCenter_Search', score: 0.08, flakiness: 0.01, defect_links: [], decision: 'EXCLUDE', rationale: 'Static content test, not affected by payment processor changes.' },
  ],
  flaky_tests: [
    { name: 'TC_Transfer_DuplicateDetection', flakiness: 0.18, trend: [5, 8, 12, 15, 18, 16, 19, 18, 22, 18] },
    { name: 'TC_BillPay_ScheduledDate', flakiness: 0.14, trend: [10, 11, 13, 14, 12, 15, 14, 16, 14, 14] },
    { name: 'TC_ETransfer_RequestMoney', flakiness: 0.11, trend: [8, 9, 10, 11, 12, 11, 11, 10, 12, 11] },
  ],
  executive_summary: `Release risk assessment for sprint 2025-04: The optimized regression suite reduces execution time by approximately 34% (1358 to 891 tests) while preserving 91.2% code coverage. The 3 identified flaky tests have been excluded to improve pipeline reliability. HIGH risk changes in PaymentProcessor require the 23 directly mapped test cases to be run as a priority suite. Recommended: execute full optimized suite in UAT, priority suite only in staging for CI feedback loops.`,
}

// ─── Chatbot Responses ─────────────────────────────────────────────────────────
export const DEMO_CHAT_RESPONSES = {
  default: `I'm QGenie's AI assistant. I can help you understand test results, explain failures, suggest fixes, and answer questions about your QA pipeline. What would you like to know?`,
  locator: `The Playwright locator \`page.selectOption('[data-testid="currency-dropdown"]', 'CAD')\` may need adjustment. If the dropdown is a custom React component rather than a native \`<select>\`, you may need to: (1) \`page.click('[data-testid="currency-dropdown"]')\` to open it, then (2) \`page.getByRole('option', { name: 'CAD' }).click()\` to select the value. Check the DOM structure in your app to confirm.`,
  rca: `The root cause is a **NullPointerException** in PaymentProcessor. Here's what happened:\n\n1. A new correspondent bank was added post-March 2024 schema migration\n2. The \`intermediaryBic\` field was introduced but not backfilled for all banks\n3. When a transfer routes through this bank, the null check is missing at line 234\n\nFix: Add \`if (transaction.getCorrespondent() != null)\` before accessing \`intermediaryBic\`. This is a P1 fix.`,
  indirect: `The 47 indirect tests are included because they exercise code paths sharing components with the changed PaymentProcessor:\n\n- **AccountBalance.update()** is called after every successful transaction\n- **AuditLog.record()** is triggered by the payment event system\n- **Notification.send()** listens on the payment event bus\n\nAll three had risk scores > 0.6 via call graph analysis, hence their inclusion in the recommended suite.`,
  flaky: `TC_Transfer_DuplicateDetection is flagged FLAKY due to an 18% failure rate over 30 days. Root cause: a race condition in the detection window — the test asserts within 200ms but detection can take up to 350ms under load.\n\nFix: Add an explicit wait:\n\`\`\`typescript\nawait expect(page.locator('[data-testid="duplicate-warning"]')).toBeVisible({ timeout: 500 })\n\`\`\``,
  edge_cases: `The current scenarios cover the main happy path and boundary values but are missing:\n\n1. **Concurrent transfer scenario** — what if two transfers are initiated simultaneously?\n2. **Network timeout during fee calculation** — what error is shown?\n3. **Currency mismatch** — initiating a CAD transfer to a USD-only account\n4. **Session expiry** — user leaves fee review screen for >15 minutes\n\nWould you like me to generate additional scenarios for any of these?`,
  coverage: `Based on the current feature file, AC5 ("Fee breakdown shows base fee + FX markup separately") is partially covered — there are assertions on individual fee values but no explicit test verifying both are displayed as separate line items in the UI. Consider adding:\n\n\`\`\`gherkin\nThen I should see "Base Fee" as a separate line item\nAnd I should see "FX Markup" as a separate line item\n\`\`\``,
}

export const DEMO_JTMF_SUITES = [
  { id: 'TDB-FULL', name: 'TDB Full Regression (1358 tests)', project: 'TD Digital Banking' },
  { id: 'TDB-SMOKE', name: 'TDB Smoke Suite (42 tests)', project: 'TD Digital Banking' },
  { id: 'TDB-PAYMENTS', name: 'TDB Payments E2E (234 tests)', project: 'TD Digital Banking' },
  { id: 'TDW-FULL', name: 'TDW Full Regression (892 tests)', project: 'TD Wealth Management' },
  { id: 'TDR-LENDING', name: 'TDR Lending Suite (445 tests)', project: 'TD Retail Banking' },
]
