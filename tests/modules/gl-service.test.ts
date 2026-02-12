/**
 * GL Service Tests
 * Tests for the General Ledger business logic layer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GLService } from '../../src/modules/gl/gl-service';
import type { GLAccount, GLJournalEntry, GLJournalLine, GLFiscalPeriod, GLRecurringEntry, GLClosingEntry } from '../../src/modules/gl/gl-service';
import { Collection } from '../../src/core/store/collection';
import { EventBus } from '../../src/core/events/bus';
import { SchemaRegistry } from '../../src/core/schema/registry';
import { LocalStorageAdapter } from '../../src/core/store/local-storage';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createTestService() {
  const adapter = new LocalStorageAdapter();
  const events = new EventBus();
  const schemas = new SchemaRegistry();

  const accounts = new Collection<GLAccount>('gl/account', adapter, schemas, events);
  const journalEntries = new Collection<GLJournalEntry>('gl/journalEntry', adapter, schemas, events);
  const journalLines = new Collection<GLJournalLine>('gl/journalLine', adapter, schemas, events);
  const fiscalPeriods = new Collection<GLFiscalPeriod>('gl/fiscalPeriod', adapter, schemas, events);
  const recurringEntries = new Collection<GLRecurringEntry>('gl/recurringEntry', adapter, schemas, events);
  const closingEntries = new Collection<GLClosingEntry>('gl/closingEntry', adapter, schemas, events);

  const service = new GLService(
    accounts,
    journalEntries,
    journalLines,
    fiscalPeriods,
    recurringEntries,
    closingEntries,
    events,
  );

  return { service, events, adapter };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GLService', () => {
  let service: GLService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // inferNormalBalance
  // ==========================================================================

  describe('inferNormalBalance', () => {
    it('returns debit for asset, expense, costOfRevenue', () => {
      expect(service.inferNormalBalance('asset')).toBe('debit');
      expect(service.inferNormalBalance('expense')).toBe('debit');
      expect(service.inferNormalBalance('costOfRevenue')).toBe('debit');
    });

    it('returns credit for liability, equity, revenue', () => {
      expect(service.inferNormalBalance('liability')).toBe('credit');
      expect(service.inferNormalBalance('equity')).toBe('credit');
      expect(service.inferNormalBalance('revenue')).toBe('credit');
    });
  });

  // ==========================================================================
  // Account Management
  // ==========================================================================

  describe('Account Management', () => {
    it('creates an account with auto-computed fields', async () => {
      const account = await service.createAccount({
        number: '1000',
        name: 'Cash',
        type: 'asset',
      });

      expect(account.number).toBe('1000');
      expect(account.name).toBe('Cash');
      expect(account.type).toBe('asset');
      expect(account.normalBalance).toBe('debit');
      expect(account.isActive).toBe(true);
      expect(account.depth).toBe(0);
      expect(account.path).toBe('1000');
      expect(account.id).toBeTruthy();
    });

    it('creates a child account with correct depth and path', async () => {
      const parent = await service.createAccount({
        number: '1000',
        name: 'Assets',
        type: 'asset',
      });

      const child = await service.createAccount({
        number: '1100',
        name: 'Cash & Equivalents',
        type: 'asset',
        parentId: parent.id,
      });

      expect(child.depth).toBe(1);
      expect(child.path).toBe('1000.1100');
    });

    it('rejects duplicate account numbers', async () => {
      await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' });

      await expect(
        service.createAccount({ number: '1000', name: 'Other Cash', type: 'asset' }),
      ).rejects.toThrow('already exists');
    });

    it('gets an account by ID', async () => {
      const created = await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' });
      const fetched = await service.getAccount(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.number).toBe('1000');
    });

    it('gets an account by number', async () => {
      await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' });
      const fetched = await service.getAccountByNumber('1000');
      expect(fetched).not.toBeNull();
      expect(fetched!.name).toBe('Cash');
    });

    it('lists accounts filtered by type', async () => {
      await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' });
      await service.createAccount({ number: '2000', name: 'Accounts Payable', type: 'liability' });
      await service.createAccount({ number: '1100', name: 'Receivables', type: 'asset' });

      const assets = await service.getAccounts({ type: 'asset' });
      expect(assets).toHaveLength(2);
      expect(assets[0].number).toBe('1000'); // Sorted by number
      expect(assets[1].number).toBe('1100');
    });

    it('builds an account tree', async () => {
      const parent = await service.createAccount({ number: '1000', name: 'Assets', type: 'asset' });
      await service.createAccount({ number: '1100', name: 'Cash', type: 'asset', parentId: parent.id });
      await service.createAccount({ number: '1200', name: 'AR', type: 'asset', parentId: parent.id });
      await service.createAccount({ number: '2000', name: 'Liabilities', type: 'liability' });

      const tree = await service.getAccountTree();
      expect(tree).toHaveLength(2); // 2 root nodes
      const assetNode = tree.find((n) => n.account.number === '1000');
      expect(assetNode).toBeDefined();
      expect(assetNode!.children).toHaveLength(2);
    });

    it('updates an account', async () => {
      const account = await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' });
      const updated = await service.updateAccount(account.id, { name: 'Cash & Bank' });
      expect(updated.name).toBe('Cash & Bank');
    });

    it('prevents deleting an account with journal lines', async () => {
      const cash = await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' });
      const revenue = await service.createAccount({ number: '4000', name: 'Revenue', type: 'revenue' });

      await service.createJournalEntry({
        date: '2026-01-15',
        description: 'Test entry',
        lines: [
          { accountId: cash.id, debit: 100, credit: 0 },
          { accountId: revenue.id, debit: 0, credit: 100 },
        ],
      });

      await expect(service.deleteAccount(cash.id)).rejects.toThrow('referenced by');
    });
  });

  // ==========================================================================
  // Journal Entry Management
  // ==========================================================================

  describe('Journal Entry Management', () => {
    let cashAccount: GLAccount & { id: string };
    let revenueAccount: GLAccount & { id: string };

    beforeEach(async () => {
      cashAccount = await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' }) as GLAccount & { id: string };
      revenueAccount = await service.createAccount({ number: '4000', name: 'Revenue', type: 'revenue' }) as GLAccount & { id: string };
    });

    it('creates a balanced journal entry', async () => {
      const result = await service.createJournalEntry({
        date: '2026-01-15',
        description: 'Cash sale',
        lines: [
          { accountId: cashAccount.id, debit: 500, credit: 0 },
          { accountId: revenueAccount.id, debit: 0, credit: 500 },
        ],
      });

      expect(result.entry.status).toBe('draft');
      expect(result.entry.totalDebit).toBe(500);
      expect(result.entry.totalCredit).toBe(500);
      expect(result.entry.entryNumber).toMatch(/^JE-\d{4}-\d{5}$/);
      expect(result.lines).toHaveLength(2);
      // Denormalized account info
      expect(result.lines[0].accountNumber).toBe('1000');
      expect(result.lines[0].accountName).toBe('Cash');
    });

    it('rejects unbalanced entries', async () => {
      await expect(
        service.createJournalEntry({
          date: '2026-01-15',
          description: 'Unbalanced',
          lines: [
            { accountId: cashAccount.id, debit: 500, credit: 0 },
            { accountId: revenueAccount.id, debit: 0, credit: 400 },
          ],
        }),
      ).rejects.toThrow('out of balance');
    });

    it('rejects entries with fewer than 2 lines', async () => {
      await expect(
        service.createJournalEntry({
          date: '2026-01-15',
          description: 'Too few lines',
          lines: [{ accountId: cashAccount.id, debit: 100, credit: 0 }],
        }),
      ).rejects.toThrow('at least 2 lines');
    });

    it('rejects lines with both debit and credit', async () => {
      await expect(
        service.createJournalEntry({
          date: '2026-01-15',
          description: 'Both debit and credit',
          lines: [
            { accountId: cashAccount.id, debit: 100, credit: 50 },
            { accountId: revenueAccount.id, debit: 0, credit: 50 },
          ],
        }),
      ).rejects.toThrow('cannot have both');
    });

    it('rejects lines referencing inactive accounts', async () => {
      await service.updateAccount(revenueAccount.id, { isActive: false });

      await expect(
        service.createJournalEntry({
          date: '2026-01-15',
          description: 'Inactive account',
          lines: [
            { accountId: cashAccount.id, debit: 100, credit: 0 },
            { accountId: revenueAccount.id, debit: 0, credit: 100 },
          ],
        }),
      ).rejects.toThrow('inactive');
    });

    it('posts a draft journal entry', async () => {
      const { entry } = await service.createJournalEntry({
        date: '2026-01-15',
        description: 'To be posted',
        lines: [
          { accountId: cashAccount.id, debit: 100, credit: 0 },
          { accountId: revenueAccount.id, debit: 0, credit: 100 },
        ],
      });

      const posted = await service.postJournalEntry(entry.id);
      expect(posted.status).toBe('posted');
      expect(posted.postedAt).toBeTruthy();
    });

    it('rejects posting a non-draft entry', async () => {
      const { entry } = await service.createJournalEntry({
        date: '2026-01-15',
        description: 'Already posted',
        lines: [
          { accountId: cashAccount.id, debit: 100, credit: 0 },
          { accountId: revenueAccount.id, debit: 0, credit: 100 },
        ],
      });

      await service.postJournalEntry(entry.id);
      await expect(service.postJournalEntry(entry.id)).rejects.toThrow('draft');
    });

    it('voids a posted entry', async () => {
      const { entry } = await service.createJournalEntry({
        date: '2026-01-15',
        description: 'To be voided',
        lines: [
          { accountId: cashAccount.id, debit: 200, credit: 0 },
          { accountId: revenueAccount.id, debit: 0, credit: 200 },
        ],
      });

      await service.postJournalEntry(entry.id);
      const voided = await service.voidJournalEntry(entry.id, 'Entered in error');
      expect(voided.status).toBe('voided');
      expect(voided.voidReason).toBe('Entered in error');
      expect(voided.voidedAt).toBeTruthy();
    });

    it('gets a journal entry with lines', async () => {
      const { entry } = await service.createJournalEntry({
        date: '2026-01-15',
        description: 'With lines',
        lines: [
          { accountId: cashAccount.id, debit: 100, credit: 0 },
          { accountId: revenueAccount.id, debit: 0, credit: 100 },
        ],
      });

      const result = await service.getJournalEntry(entry.id);
      expect(result).not.toBeNull();
      expect(result!.entry.id).toBe(entry.id);
      expect(result!.lines).toHaveLength(2);
    });

    it('filters journal entries by status', async () => {
      const { entry: draft } = await service.createJournalEntry({
        date: '2026-01-15',
        description: 'Draft entry',
        lines: [
          { accountId: cashAccount.id, debit: 100, credit: 0 },
          { accountId: revenueAccount.id, debit: 0, credit: 100 },
        ],
      });

      const { entry: toPost } = await service.createJournalEntry({
        date: '2026-01-16',
        description: 'Posted entry',
        lines: [
          { accountId: cashAccount.id, debit: 200, credit: 0 },
          { accountId: revenueAccount.id, debit: 0, credit: 200 },
        ],
      });
      await service.postJournalEntry(toPost.id);

      const drafts = await service.getJournalEntries({ status: 'draft' });
      expect(drafts).toHaveLength(1);
      expect(drafts[0].id).toBe(draft.id);

      const posted = await service.getJournalEntries({ status: 'posted' });
      expect(posted).toHaveLength(1);
    });

    it('auto-increments entry numbers', async () => {
      const { entry: first } = await service.createJournalEntry({
        date: '2026-01-15',
        description: 'First',
        lines: [
          { accountId: cashAccount.id, debit: 100, credit: 0 },
          { accountId: revenueAccount.id, debit: 0, credit: 100 },
        ],
      });

      const { entry: second } = await service.createJournalEntry({
        date: '2026-01-16',
        description: 'Second',
        lines: [
          { accountId: cashAccount.id, debit: 200, credit: 0 },
          { accountId: revenueAccount.id, debit: 0, credit: 200 },
        ],
      });

      // Entry numbers should be sequential
      const firstNum = parseInt(first.entryNumber.split('-')[2], 10);
      const secondNum = parseInt(second.entryNumber.split('-')[2], 10);
      expect(secondNum).toBe(firstNum + 1);
    });
  });

  // ==========================================================================
  // Trial Balance & GL Detail
  // ==========================================================================

  describe('Reports', () => {
    let cashId: string;
    let revenueId: string;
    let expenseId: string;

    beforeEach(async () => {
      const cash = await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' });
      const revenue = await service.createAccount({ number: '4000', name: 'Revenue', type: 'revenue' });
      const expense = await service.createAccount({ number: '5000', name: 'Rent Expense', type: 'expense' });
      cashId = cash.id;
      revenueId = revenue.id;
      expenseId = expense.id;

      // Create and post entries
      const { entry: je1 } = await service.createJournalEntry({
        date: '2026-01-15',
        description: 'Cash sale',
        lines: [
          { accountId: cashId, debit: 1000, credit: 0 },
          { accountId: revenueId, debit: 0, credit: 1000 },
        ],
      });
      await service.postJournalEntry(je1.id);

      const { entry: je2 } = await service.createJournalEntry({
        date: '2026-01-20',
        description: 'Pay rent',
        lines: [
          { accountId: expenseId, debit: 500, credit: 0 },
          { accountId: cashId, debit: 0, credit: 500 },
        ],
      });
      await service.postJournalEntry(je2.id);
    });

    it('generates a trial balance', async () => {
      const tb = await service.getTrialBalance();

      expect(tb).toHaveLength(3);

      const cashRow = tb.find((r) => r.accountNumber === '1000');
      expect(cashRow).toBeDefined();
      expect(cashRow!.debit).toBe(1000);
      expect(cashRow!.credit).toBe(500);

      const revenueRow = tb.find((r) => r.accountNumber === '4000');
      expect(revenueRow).toBeDefined();
      expect(revenueRow!.credit).toBe(1000);

      const expenseRow = tb.find((r) => r.accountNumber === '5000');
      expect(expenseRow).toBeDefined();
      expect(expenseRow!.debit).toBe(500);

      // Total debits should equal total credits
      const totalDebit = tb.reduce((s, r) => s + r.debit, 0);
      const totalCredit = tb.reduce((s, r) => s + r.credit, 0);
      expect(totalDebit).toBe(totalCredit);
    });

    it('generates a trial balance filtered by date', async () => {
      const tb = await service.getTrialBalance('2026-01-17');

      // Only the first entry (Jan 15) should be included
      expect(tb).toHaveLength(2); // Cash and Revenue only
      const cashRow = tb.find((r) => r.accountNumber === '1000');
      expect(cashRow!.debit).toBe(1000);
      expect(cashRow!.credit).toBe(0); // No rent payment yet
    });

    it('generates GL detail for an account', async () => {
      const detail = await service.getGLDetail(cashId);

      expect(detail).toHaveLength(2);
      expect(detail[0].debit).toBe(1000);
      expect(detail[0].credit).toBe(0);
      expect(detail[1].debit).toBe(0);
      expect(detail[1].credit).toBe(500);
      expect(detail[1].balance).toBe(500); // 1000 - 500 for debit-normal account
    });

    it('calculates account balance', async () => {
      const cashBalance = await service.getAccountBalance(cashId);
      expect(cashBalance).toBe(500); // 1000 debit - 500 credit

      const revenueBalance = await service.getAccountBalance(revenueId);
      expect(revenueBalance).toBe(1000); // credit-normal: 1000 credit

      const expenseBalance = await service.getAccountBalance(expenseId);
      expect(expenseBalance).toBe(500); // debit-normal: 500 debit
    });
  });

  // ==========================================================================
  // Fiscal Periods
  // ==========================================================================

  describe('Fiscal Periods', () => {
    it('generates 12 monthly periods for a year', async () => {
      const periods = await service.generateFiscalPeriods(2026);
      expect(periods).toHaveLength(12);
      expect(periods[0].name).toContain('January');
      expect(periods[0].year).toBe(2026);
      expect(periods[0].month).toBe(1);
      expect(periods[0].status).toBe('open');
      expect(periods[11].name).toContain('December');
    });

    it('closes a fiscal period', async () => {
      const periods = await service.generateFiscalPeriods(2026);
      const closed = await service.closeFiscalPeriod(periods[0].id);
      expect(closed.status).toBe('closed');
      expect(closed.closedAt).toBeTruthy();
    });

    it('rejects closing a period with draft entries', async () => {
      const periods = await service.generateFiscalPeriods(2026);
      const cash = await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' });
      const rev = await service.createAccount({ number: '4000', name: 'Revenue', type: 'revenue' });

      // Create a draft entry in January
      await service.createJournalEntry({
        date: '2026-01-15',
        description: 'Draft in period',
        lines: [
          { accountId: cash.id, debit: 100, credit: 0 },
          { accountId: rev.id, debit: 0, credit: 100 },
        ],
      });

      await expect(service.closeFiscalPeriod(periods[0].id)).rejects.toThrow('draft');
    });

    it('reopens a closed period', async () => {
      const periods = await service.generateFiscalPeriods(2026);
      await service.closeFiscalPeriod(periods[0].id);
      const reopened = await service.reopenFiscalPeriod(periods[0].id);
      expect(reopened.status).toBe('open');
    });

    it('finds the current period', async () => {
      await service.generateFiscalPeriods(2026);
      const current = await service.getCurrentPeriod();
      expect(current).not.toBeNull();
      expect(current!.year).toBe(2026);
    });
  });

  // ==========================================================================
  // Recurring Entries
  // ==========================================================================

  describe('Recurring Entries', () => {
    let cashId: string;
    let rentId: string;

    beforeEach(async () => {
      const cash = await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' });
      const rent = await service.createAccount({ number: '5100', name: 'Rent', type: 'expense' });
      cashId = cash.id;
      rentId = rent.id;
    });

    it('creates a recurring entry', async () => {
      const recurring = await service.createRecurringEntry({
        name: 'Monthly Rent',
        frequency: 'monthly',
        nextRunDate: '2026-02-01',
        templateLines: [
          { accountId: rentId, debit: 2000, credit: 0 },
          { accountId: cashId, debit: 0, credit: 2000 },
        ],
      });

      expect(recurring.name).toBe('Monthly Rent');
      expect(recurring.frequency).toBe('monthly');
      expect(recurring.isActive).toBe(true);
      expect(recurring.runCount).toBe(0);
    });

    it('executes a recurring entry and creates a JE', async () => {
      const recurring = await service.createRecurringEntry({
        name: 'Monthly Rent',
        frequency: 'monthly',
        nextRunDate: '2026-01-01',
        templateLines: [
          { accountId: rentId, debit: 2000, credit: 0 },
          { accountId: cashId, debit: 0, credit: 2000 },
        ],
      });

      const result = await service.executeRecurringEntry(recurring.id);
      expect(result.entry.description).toContain('Recurring');
      expect(result.entry.totalDebit).toBe(2000);
      expect(result.lines).toHaveLength(2);
    });

    it('computes next run date correctly', () => {
      expect(service.computeNextRunDate('2026-01-15', 'daily')).toBe('2026-01-16');
      expect(service.computeNextRunDate('2026-01-15', 'weekly')).toBe('2026-01-22');
      expect(service.computeNextRunDate('2026-01-15', 'monthly')).toBe('2026-02-15');
      expect(service.computeNextRunDate('2026-01-15', 'quarterly')).toBe('2026-04-15');
      expect(service.computeNextRunDate('2026-01-15', 'yearly')).toBe('2027-01-15');
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits gl.account.created on account creation', async () => {
      let emitted = false;
      events.on('gl.account.created', () => { emitted = true; });

      await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' });
      expect(emitted).toBe(true);
    });

    it('emits gl.journalEntry.created on JE creation', async () => {
      const cash = await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' });
      const rev = await service.createAccount({ number: '4000', name: 'Revenue', type: 'revenue' });

      let emitted = false;
      events.on('gl.journalEntry.created', () => { emitted = true; });

      await service.createJournalEntry({
        date: '2026-01-15',
        description: 'Test',
        lines: [
          { accountId: cash.id, debit: 100, credit: 0 },
          { accountId: rev.id, debit: 0, credit: 100 },
        ],
      });
      expect(emitted).toBe(true);
    });

    it('emits gl.journalEntry.posted on posting', async () => {
      const cash = await service.createAccount({ number: '1000', name: 'Cash', type: 'asset' });
      const rev = await service.createAccount({ number: '4000', name: 'Revenue', type: 'revenue' });

      const { entry } = await service.createJournalEntry({
        date: '2026-01-15',
        description: 'Test',
        lines: [
          { accountId: cash.id, debit: 100, credit: 0 },
          { accountId: rev.id, debit: 0, credit: 100 },
        ],
      });

      let emitted = false;
      events.on('gl.journalEntry.posted', () => { emitted = true; });

      await service.postJournalEntry(entry.id);
      expect(emitted).toBe(true);
    });
  });
});
